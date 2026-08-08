const Content = require("../models/contentModel");

// Create content metadata. The video itself is uploaded separately via a
// presigned URL; the S3 upload event then drives transcoding. Returns the new
// id so the client can presign the upload under `<id>/<filename>`.
exports.addContent = async (req, res) => {
  try {
    const { _id, ...rest } = req.body;
    let content;
    if (_id) {
      // Idempotent upsert so the client can create the doc before/while
      // uploading movie + poster + thumbnail under the same id.
      content = await Content.findByIdAndUpdate(
        _id,
        { $set: rest, $setOnInsert: { status: "pending", isReady: false } },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
    } else {
      content = await Content.create({ ...rest, status: "pending", isReady: false });
    }
    res.status(201).json({ id: content._id, content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create content" });
  }
};

// List content (active by default, ?archive=true for soft-deleted).
exports.getContent = async (req, res) => {
  try {
    const deleted = req.query.archive === "true";
    const content = await Content.find({ deleted });
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get content" });
  }
};

exports.getSingleContent = async (req, res) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ error: "Content not found" });
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get content" });
  }
};

exports.getContentbyType = async (req, res) => {
  try {
    const content = await Content.find({ type: req.params.type });
    res.json({ content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to get content" });
  }
};

// Update content (also used by the transcode completion path to set video_url + ready).
exports.updateContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!content) return res.status(404).json({ error: "Content not found" });
    res.json({ message: "Content updated", content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update content" });
  }
};

/**
 * Merge one season's episode metadata into a series.
 *
 * Used when seeding a season from TMDB. It merges rather than replaces on
 * purpose: an episode that has already been transcoded keeps its video_url,
 * duration, subtitles and status, and only its descriptive fields are
 * refreshed. Sending the whole seasons array through updateContent would
 * silently drop published episodes.
 */
const mergeSeason = (exports.mergeSeason = (content, payload) => {
  const { season_number, title, description, poster_url, air_date, episodes = [] } = payload;

  let season = content.seasons.find((s) => s.season_number === season_number);
  if (!season) {
    content.seasons.push({ season_number, episodes: [] });
    season = content.seasons[content.seasons.length - 1];
  }

  Object.assign(season, {
    title: title ?? season.title,
    description: description ?? season.description,
    poster_url: poster_url ?? season.poster_url,
    air_date: air_date ?? season.air_date,
  });

  for (const incoming of episodes) {
    const existing = season.episodes.find((e) => e.episode_number === incoming.episode_number);
    if (!existing) {
      season.episodes.push({ ...incoming, status: "pending" });
      continue;
    }
    // Descriptive fields refresh; anything the pipeline produced stands. A
    // re-seed from TMDB must never cost an episode its published video.
    existing.title = incoming.title ?? existing.title;
    existing.description = incoming.description ?? existing.description;
    existing.air_date = incoming.air_date ?? existing.air_date;
    if (!existing.thumbnail_url) existing.thumbnail_url = incoming.thumbnail_url;
    if (!existing.duration_seconds) existing.duration_seconds = incoming.duration_seconds;
  }

  season.episodes.sort((a, b) => a.episode_number - b.episode_number);
  content.seasons.sort((a, b) => a.season_number - b.season_number);
  return content;
});

exports.upsertSeason = async (req, res) => {
  try {
    if (!req.body?.season_number) {
      return res.status(400).json({ error: "season_number is required" });
    }

    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ error: "Content not found" });
    if (content.type !== "series") {
      return res.status(400).json({ error: "Only a series can have seasons" });
    }

    mergeSeason(content, req.body);
    await content.save();
    res.json({ message: "Season saved", content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to save season" });
  }
};

/** Remove a season, and with it every episode's metadata. */
exports.deleteSeason = async (req, res) => {
  try {
    const seasonNumber = Number(req.params.seasonNumber);
    const content = await Content.findById(req.params.id);
    if (!content) return res.status(404).json({ error: "Content not found" });

    content.seasons = content.seasons.filter((s) => s.season_number !== seasonNumber);
    await content.save();
    res.json({ message: "Season removed", content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove season" });
  }
};

// Soft delete.
exports.deleteContent = async (req, res) => {
  try {
    const content = await Content.findByIdAndUpdate(
      req.params.id,
      { deleted: true, isPublish: false },
      { new: true }
    );
    if (!content) return res.status(404).json({ error: "Content not found" });
    res.json({ message: "Content deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete content" });
  }
};
