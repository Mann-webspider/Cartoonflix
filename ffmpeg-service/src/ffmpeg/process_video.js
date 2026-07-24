import ffmpeg from "fluent-ffmpeg";
import path from "path";
import fs from "node:fs";

// Helper function to create directories
export const ensureDirExists = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

/**
 * Transcode a video to HLS with multiple resolutions, using CUDA acceleration.
 * @param {string} inputPath - Path to the input video file.
 * @param {string} outputDir - Path to the output directory.
 */
export const transcodeToHLSWithCUDA = async (inputPath, outputDir) => {
  ensureDirExists(outputDir);

  const resolutions = [
    { name: "480p", width: 854, height: 480, bandwidth: 500000 },
    { name: "720p", width: 1280, height: 720, bandwidth: 900000 },
    { name: "1080p", width: 1920, height: 1080, bandwidth: 1300000 },
  ];

  const transcodePromises = resolutions.map(({ name, width, height, bandwidth }) => {
    return new Promise((resolve, reject) => {
      const resolutionDir = path.join(outputDir, name);
      ensureDirExists(resolutionDir);

      const outputFileName = `${resolutionDir}/${name}.m3u8`;
      const segmentFileName = `${name}_%03d.ts`;

      console.log(`Starting HLS conversion for ${name}...`);
      ffmpeg(inputPath)
        .outputOptions([
          `-c:v h264_nvenc`,
          `-b:v ${bandwidth}`,
          `-c:a aac`,
          `-b:a 128k`,
          "-preset:v p5",
          `-vf scale=${width}:${height}`,
          `-f hls`,
          `-hls_time 10`,
          `-hls_list_size 0`,
          `-hls_segment_filename ${resolutionDir}/${segmentFileName}`,
        ])
        .output(outputFileName)
        .on("end", () => {
          console.log(`HLS conversion done for ${name}`);
          resolve({ name, outputFileName });
        })
        .on("error", (err) => {
          console.error(`Error during HLS conversion for ${name}:`, err);
          reject(err);
        })
        .run();
    });
  });

  // Wait for all resolutions to finish
  const variantPlaylists = await Promise.all(transcodePromises);

  // Generate master playlist
  const masterPlaylistPath = path.join(outputDir, "master.m3u8");
  const masterPlaylistContent = variantPlaylists
    .map(
      ({ name, outputFileName }) =>
        `#EXT-X-STREAM-INF:BANDWIDTH=${resolutions.find(r => r.name === name).bandwidth},RESOLUTION=${resolutions.find(r => r.name === name).width}x${resolutions.find(r => r.name === name).height}\n${name}/${path.basename(outputFileName)}`
    )
    .join("\n");

  fs.writeFileSync(masterPlaylistPath, `#EXTM3U\n${masterPlaylistContent}`);
  console.log("Master playlist generated.");

  return masterPlaylistPath;
};
