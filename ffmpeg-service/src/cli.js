/**
 * Local media pipeline entrypoint.
 *
 *   node src/cli.js ingest   --source ./movie.mp4 --content <id> [--season 1 --episode 2] [--thumbs 10]
 *   node src/cli.js subtitle --content <id> --file ./subs.srt --language en [--label English]
 *   node src/cli.js publish  --content <id> [--season 1 --episode 2] [--poster 003.jpg] [--thumbnail 005.jpg]
 *
 * `ingest` transcodes to `media/<slug>/` and touches nothing remote.
 * `publish` uploads that directory to S3 and prints the resulting URLs.
 *
 * With `--json`, progress and the result are written to stdout as NDJSON. That
 * is the mode admin-backend runs, which is why this file — not a shared import —
 * is the single implementation of the pipeline: a child process keeps the
 * CommonJS API and this ESM package from having to agree on a module system.
 */
import path from "node:path";
import { ingest, slugFor, readManifest, writeManifest, jobDir } from "./pipeline.js";
import { publish } from "./publish.js";
import { convertSidecar } from "./transcode/subtitles.js";

const argv = process.argv.slice(2);
const command = argv[0];

const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : undefined;
};
const has = (name) => argv.includes(`--${name}`);

const asJson = has("json");
const emit = (event) => {
  if (asJson) console.log(JSON.stringify(event));
  else if (event.type === "progress") process.stderr.write(`\r${event.stage} ${event.percent}%   `);
  else console.log(JSON.stringify(event, null, 2));
};

const requireFlag = (name) => {
  const value = flag(name);
  if (!value) throw new Error(`--${name} is required`);
  return value;
};

const slugFromFlags = () =>
  slugFor({
    contentId: requireFlag("content"),
    season: flag("season") && Number(flag("season")),
    episode: flag("episode") && Number(flag("episode")),
  });

const commands = {
  async ingest() {
    const slug = slugFromFlags();
    const manifest = await ingest({
      sourcePath: requireFlag("source"),
      slug,
      thumbnailCount: flag("thumbs") ? Number(flag("thumbs")) : undefined,
      onProgress: ({ stage, percent }) => emit({ type: "progress", stage, percent }),
    });
    if (!asJson) process.stderr.write("\n");
    emit({ type: "done", manifest });
  },

  /**
   * Convert an uploaded sidecar file to WebVTT and add it to the job's
   * manifest, so the next publish uploads it with everything else.
   */
  async subtitle() {
    const slug = slugFromFlags();
    const manifest = readManifest(slug);
    if (!manifest) throw new Error(`No ingested job at media/${slug} — transcode it first`);

    const track = await convertSidecar(requireFlag("file"), path.join(jobDir(slug), "subs"), {
      language: requireFlag("language"),
      label: flag("label"),
    });

    manifest.subtitles = [...(manifest.subtitles ?? []), track];
    writeManifest(slug, manifest);
    emit({ type: "subtitle", track });
  },

  async publish() {
    const contentId = requireFlag("content");
    const slug = slugFromFlags();
    if (!readManifest(slug)) throw new Error(`No ingested job at media/${slug} — run ingest first`);

    const result = await publish({
      slug,
      contentId,
      hlsBucket: process.env.HLS_BUCKET,
      cloudfrontDomain: process.env.CLOUDFRONT_DOMAIN,
      poster: flag("poster"),
      thumbnail: flag("thumbnail"),
      onProgress: ({ percent }) => emit({ type: "progress", stage: "publish", percent }),
    });
    if (!asJson) process.stderr.write("\n");
    emit({ type: "published", ...result });
  },
};

const main = async () => {
  const run = commands[command];
  if (!run) {
    console.error("Usage: node src/cli.js <ingest|subtitle|publish> --content <id> [...]");
    process.exit(2);
  }
  await run();
};

main().catch((err) => {
  emit({ type: "error", message: err.message });
  process.exit(1);
});
