const path = require("node:path");
const { spawn } = require("node:child_process");

const FFMPEG_SERVICE_DIR =
  process.env.FFMPEG_SERVICE_DIR || path.resolve(__dirname, "../../../ffmpeg-service");

const MEDIA_ROOT = process.env.MEDIA_ROOT || path.resolve(__dirname, "../../../media");

/**
 * Local transcode jobs are ephemeral and single-machine, so they live in
 * process memory. Only terminal outcomes reach MongoDB — writing a progress
 * percentage to Atlas several times a second would burn the free tier's write
 * budget to tell one browser tab something it forgets on refresh anyway.
 *
 * ponytail: in-memory means progress is lost if admin-backend restarts
 * mid-transcode. Move to a jobs collection if ingest ever runs unattended.
 */
const jobs = new Map();

/** Storage key for one playable item — must match ffmpeg-service's slugFor(). */
const slugFor = ({ contentId, season, episode }) =>
  season && episode ? `${contentId}/s${season}e${episode}` : String(contentId);

const jobDir = (slug) => path.join(MEDIA_ROOT, ...slug.split("/"));

const getJob = (slug) => jobs.get(slug) || null;

const listJobs = () => [...jobs.values()];

/**
 * Spawn the ffmpeg-service CLI for one source file and track its progress.
 *
 * The CLI runs as a child process rather than an import: it is an ESM package
 * and this API is CommonJS, and a crashing ffmpeg then takes down a subprocess
 * instead of the admin server.
 *
 * @returns {object} the job record, updated in place as the child reports
 */
const startIngest = ({ slug, contentId, sourcePath, thumbnails, ladder }) => {
  const existing = jobs.get(slug);
  if (existing?.status === "running") return existing;

  const job = {
    slug,
    contentId,
    status: "running",
    stage: "probe",
    percent: 0,
    error: null,
    manifest: null,
    startedAt: new Date().toISOString(),
  };
  jobs.set(slug, job);

  const args = ["src/cli.js", "ingest", "--source", sourcePath, "--content", contentId, "--json"];
  const [, seasonEpisode] = slug.split("/");
  if (seasonEpisode) {
    const [, season, episode] = seasonEpisode.match(/^s(\d+)e(\d+)$/) || [];
    if (season) args.push("--season", season, "--episode", episode);
  }
  if (thumbnails) args.push("--thumbs", String(thumbnails));
  // Passed as an argv entry rather than through a shell, so the JSON needs no
  // quoting and cannot be re-parsed by a shell on the way.
  if (ladder?.length) args.push("--ladder", JSON.stringify(ladder));

  const child = spawn(process.execPath, args, {
    cwd: FFMPEG_SERVICE_DIR,
    env: { ...process.env, MEDIA_ROOT },
  });

  let pending = "";
  child.stdout.on("data", (chunk) => {
    pending += chunk.toString();
    const lines = pending.split("\n");
    pending = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.trim()) continue;
      let event;
      try {
        event = JSON.parse(line);
      } catch {
        continue; // stray non-JSON output is not worth failing a transcode over
      }
      if (event.type === "progress") {
        job.stage = event.stage;
        job.percent = event.percent;
      } else if (event.type === "done") {
        job.manifest = event.manifest;
      } else if (event.type === "error") {
        job.error = event.message;
      }
    }
  });

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk.toString()).slice(-4096);
  });

  child.on("error", (err) => {
    job.status = "failed";
    job.error = err.message;
  });

  child.on("close", (code) => {
    if (code === 0 && job.manifest) {
      job.status = "done";
      job.percent = 100;
    } else {
      job.status = "failed";
      job.error = job.error || stderr.trim() || `transcode exited ${code}`;
    }
    job.finishedAt = new Date().toISOString();
  });

  return job;
};

/** Append the season/episode flags a slug implies, if any. */
const appendEpisodeFlags = (args, slug) => {
  const [, seasonEpisode] = slug.split("/");
  if (!seasonEpisode) return args;
  const [, season, episode] = seasonEpisode.match(/^s(\d+)e(\d+)$/) || [];
  if (season) args.push("--season", season, "--episode", episode);
  return args;
};

/**
 * Run a short CLI command and resolve with the last JSON event it printed.
 * Publishing and subtitle conversion both finish in seconds with the admin
 * waiting on the result, so unlike a transcode neither is tracked as a job.
 */
const runCli = (args) =>
  new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd: FFMPEG_SERVICE_DIR,
      env: { ...process.env, MEDIA_ROOT },
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (c) => (stdout += c.toString()));
    child.stderr.on("data", (c) => (stderr = (stderr + c.toString()).slice(-4096)));
    child.on("error", reject);
    child.on("close", (code) => {
      const event = stdout
        .split("\n")
        .filter((line) => line.trim())
        .map((line) => {
          try {
            return JSON.parse(line);
          } catch {
            return null;
          }
        })
        .findLast(Boolean);

      if (code === 0 && event && event.type !== "error") return resolve(event);
      reject(new Error(event?.message || stderr.trim() || `${args[1]} exited ${code}`));
    });
  });

const runPublish = ({ slug, contentId, poster, thumbnail }) => {
  const args = appendEpisodeFlags(
    ["src/cli.js", "publish", "--content", contentId, "--json"],
    slug
  );
  if (poster) args.push("--poster", poster);
  if (thumbnail) args.push("--thumbnail", thumbnail);
  return runCli(args);
};

/**
 * Predict the published size of a source at the given settings.
 *
 * Takes tens of seconds rather than milliseconds — it really does encode short
 * samples — so it is a deliberate button in the UI, not something that fires
 * while an operator drags a slider.
 */
const runEstimate = ({ sourcePath, ladder }) => {
  const args = ["src/cli.js", "estimate", "--source", sourcePath, "--json"];
  if (ladder?.length) args.push("--ladder", JSON.stringify(ladder));
  return runCli(args);
};

/** Convert an uploaded sidecar to WebVTT and record it on the job's manifest. */
const runSubtitleConvert = ({ slug, contentId, filePath, language, label }) => {
  const args = appendEpisodeFlags(
    ["src/cli.js", "subtitle", "--content", contentId, "--file", filePath, "--language", language, "--json"],
    slug
  );
  if (label) args.push("--label", label);
  return runCli(args);
};

module.exports = {
  MEDIA_ROOT,
  slugFor,
  jobDir,
  getJob,
  listJobs,
  startIngest,
  runEstimate,
  runPublish,
  runSubtitleConvert,
};
