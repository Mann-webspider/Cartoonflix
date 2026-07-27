# Transcode worker — runs as a one-shot Fargate task (and locally via the CLI).
FROM node:20-bookworm-slim

# System ffmpeg (CPU/libx264). GPU/NVENC is used automatically when available
# on the host (local runs); Fargate has no GPU so it falls back to libx264.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates \
 && rm -rf /var/lib/apt/lists/*

ENV FFMPEG_PATH=/usr/bin/ffmpeg
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY src ./src

# Job parameters arrive as env vars (RAW_BUCKET, HLS_BUCKET, RAW_KEY, CONTENT_ID,
# CLOUDFRONT_DOMAIN). The process exits 0 on success, 1 on failure.
CMD ["node", "src/worker.js"]
