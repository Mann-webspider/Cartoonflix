const fs = require("node:fs");
const path = require("node:path");
const { pipeline } = require("node:stream/promises");
const Content = require("../models/contentModel");
const {
  slugFor,
  jobDir,
  getJob,
  startIngest,
  getPublishProgress,
  runPublish,
  runSubtitleConvert,
} = require("../ingest/jobs");

const ALLOWED_SOURCE_EXTENSIONS = new Set([
  ".mp4",
  ".mkv",
  ".mov",
  ".avi",
  ".webm",
  ".m4v",
  ".mpg",
  ".mpeg",
  ".wmv",
  ".flv",
  ".ts",
]);

/**
 * Read the episode coordinates from a request. They arrive as query params on
 * uploads (which have a binary body) and in the body elsewhere, so accept both.
 */
const coordinates = (req) => {
  const source = { ...req.query, ...req.body };
  const season = Number(source.season) || undefined;
  const episode = Number(source.episode) || undefined;
  const contentId = req.params.id;
  return { contentId, season, episode, slug: slugFor({ contentId, season, episode }) };
};

const findSourceFile = (slug) => {
  const dir = jobDir(slug);
  if (!fs.existsSync(dir)) return null;
  const name = fs.readdirSync(dir).find((file) => file.startsWith("source."));
  return name ? path.join(dir, name) : null;
};

/**
 * Stream an uploaded video straight to disk.
 *
 * The body is piped rather than buffered because sources run to several GB —
 * and because this server only ever listens on localhost, the upload never
 * leaves the machine.
 */
exports.uploadSource = async (req, res) => {
  try {
    const { slug } = coordinates(req);
    const fileName = String(req.query.filename || "");
    const extension = path.extname(fileName).toLowerCase();

    if (!ALLOWED_SOURCE_EXTENSIONS.has(extension)) {
      return res.status(400).json({
        error: `Unsupported source type "${extension || fileName}". Allowed: ${[...ALLOWED_SOURCE_EXTENSIONS].join(", ")}`,
      });
    }

    const dir = jobDir(slug);
    fs.mkdirSync(dir, { recursive: true });

    // Re-uploading replaces the previous source rather than leaving two files
    // named source.* for the pipeline to choose between.
    for (const existing of fs.readdirSync(dir).filter((f) => f.startsWith("source."))) {
      fs.rmSync(path.join(dir, existing));
    }

    const destination = path.join(dir, `source${extension}`);
    await pipeline(req, fs.createWriteStream(destination));

    res.status(201).json({
      slug,
      source: path.basename(destination),
      sizeBytes: fs.statSync(destination).size,
    });
  } catch (err) {
    console.error("uploadSource failed:", err);
    res.status(500).json({ error: "Failed to store the uploaded source" });
  }
};

const SUBTITLE_EXTENSIONS = new Set([".srt", ".vtt", ".ass", ".ssa", ".sub"]);

/**
 * Accept a sidecar subtitle file and convert it to WebVTT.
 *
 * Plenty of sources carry no embedded tracks — an mp4 rip usually has none,
 * while the subtitles sit in a separate file beside it. The converted track
 * joins the job's manifest, so the next publish uploads it with everything
 * else rather than needing its own upload path.
 */
exports.uploadSubtitle = async (req, res) => {
  try {
    const { contentId, slug } = coordinates(req);
    const fileName = String(req.query.filename || "");
    const extension = path.extname(fileName).toLowerCase();
    const language = String(req.query.language || "").trim();

    if (!SUBTITLE_EXTENSIONS.has(extension)) {
      return res.status(400).json({
        error: `Unsupported subtitle type "${extension || fileName}". Allowed: ${[...SUBTITLE_EXTENSIONS].join(", ")}`,
      });
    }
    if (!language) {
      return res.status(400).json({ error: "A language code is required (for example: en)" });
    }
    if (!fs.existsSync(path.join(jobDir(slug), "manifest.json"))) {
      return res.status(400).json({ error: "Transcode this item before adding subtitles" });
    }

    // Held next to the job so a failed conversion leaves something to inspect.
    const uploadDir = path.join(jobDir(slug), "subs-src");
    fs.mkdirSync(uploadDir, { recursive: true });
    const destination = path.join(uploadDir, `${Date.now()}${extension}`);
    await pipeline(req, fs.createWriteStream(destination));

    const { track } = await runSubtitleConvert({
      slug,
      contentId,
      filePath: destination,
      language,
      label: req.query.label ? String(req.query.label) : undefined,
    });

    res.status(201).json({ track });
  } catch (err) {
    console.error("uploadSubtitle failed:", err);
    res.status(500).json({ error: err.message || "Failed to add the subtitle track" });
  }
};

/** Kick off the local transcode for an already-uploaded source. */
exports.startIngest = async (req, res) => {
  try {
    const { contentId, slug } = coordinates(req);

    const content = await Content.findById(contentId);
    if (!content) return res.status(404).json({ error: "Content not found — save the details first" });

    const sourcePath = findSourceFile(slug);
    if (!sourcePath) return res.status(400).json({ error: "No source uploaded for this item yet" });

    const job = startIngest({
      slug,
      contentId,
      sourcePath,
      thumbnails: Number(req.body?.thumbnails) || undefined,
    });

    await Content.findByIdAndUpdate(contentId, { status: "processing", isReady: false });
    res.status(202).json({ job });
  } catch (err) {
    console.error("startIngest failed:", err);
    res.status(500).json({ error: "Failed to start the transcode" });
  }
};

/**
 * Report progress for one item. A finished job that this process did not run —
 * after a restart, say — is recovered from the manifest on disk.
 */
exports.getIngestStatus = (req, res) => {
  const { slug } = coordinates(req);
  // Carried on the job so one poll answers both questions: how the transcode
  // went, and how far the upload that follows it has got.
  const publish = getPublishProgress(slug);

  const job = getJob(slug);
  if (job) return res.json({ job: { ...job, publish } });

  const manifestPath = path.join(jobDir(slug), "manifest.json");
  if (!fs.existsSync(manifestPath)) return res.json({ job: null });

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  res.json({
    job: { slug, status: "done", stage: "thumbnails", percent: 100, manifest, publish },
  });
};

/**
 * Merge one episode into a series document, replacing it if that season and
 * episode already exist.
 *
 * Read-modify-save beats positional array updates here: one admin on one
 * machine means no write contention, and the intent stays legible.
 */
const upsertEpisode = (exports.upsertEpisode = (content, season, episode, fields) => {
  let seasonDoc = content.seasons.find((s) => s.season_number === season);
  if (!seasonDoc) {
    content.seasons.push({ season_number: season, episodes: [] });
    seasonDoc = content.seasons[content.seasons.length - 1];
  }

  const existing = seasonDoc.episodes.find((e) => e.episode_number === episode);
  if (existing) Object.assign(existing, fields);
  else seasonDoc.episodes.push({ episode_number: episode, ...fields });

  seasonDoc.episodes.sort((a, b) => a.episode_number - b.episode_number);
  content.seasons.sort((a, b) => a.season_number - b.season_number);
});

/**
 * Upload a finished local job to S3 and record where it landed.
 *
 * This is the only step that touches the cloud, and it is deliberately separate
 * from transcoding so the admin can review the extracted stills and choose a
 * poster before anything is published.
 */
exports.publishIngest = async (req, res) => {
  try {
    const { contentId, season, episode, slug } = coordinates(req);
    const { poster, thumbnail, title, description } = req.body || {};

    const content = await Content.findById(contentId);
    if (!content) return res.status(404).json({ error: "Content not found" });

    const result = await runPublish({ slug, contentId, poster, thumbnail });
    const isEpisode = Boolean(season && episode);

    if (isEpisode) {
      upsertEpisode(content, season, episode, {
        title: title || `Episode ${episode}`,
        description: description || "",
        video_url: result.videoUrl,
        thumbnail_url: result.thumbnailUrl || result.posterUrl,
        duration_seconds: result.durationSec,
        subtitles: result.subtitles || [],
        status: "ready",
      });
      // A series is ready once it has at least one playable episode.
      content.status = "ready";
      content.isReady = true;
      if (result.posterUrl && !content.poster_url) content.poster_url = result.posterUrl;
    } else {
      content.video_url = result.videoUrl;
      content.duration_seconds = result.durationSec;
      content.subtitles = result.subtitles || [];
      content.status = "ready";
      content.isReady = true;
      if (result.posterUrl) content.poster_url = result.posterUrl;
      if (result.thumbnailUrl) content.thumbnail_url = result.thumbnailUrl;
    }

    await content.save();
    res.json({ message: "Published", content, ...result });
  } catch (err) {
    console.error("publishIngest failed:", err);
    res.status(500).json({ error: err.message || "Failed to publish" });
  }
};
