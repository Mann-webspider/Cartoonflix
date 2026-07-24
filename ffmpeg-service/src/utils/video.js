const { default: axios } = require("axios");
const { transcodeToHLSWithCUDA, ensureDirExists } = require("../ffmpeg/process_video");
const { downloadFromS3 } = require("../s3/download");
const { uploadToS3Optimized, uploadWithRetry } = require("../s3/upload");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const processVideo = async (queueData, outputDir, prefix) => {
  const inputFilePath = "./temp/input.mp4";
  ensureDirExists(path.dirname(inputFilePath));

  try {
    const { bucket, keys, contentId } = queueData;

    console.log("Step 1: Downloading video from S3...");
    await downloadFromS3(bucket, keys.Key, inputFilePath);

    console.log("Step 2: Transcoding video to HLS...");
    const hlsUrls = await transcodeToHLSWithCUDA(inputFilePath, outputDir);

    console.log("Step 3: Uploading transcoded files to S3...");
    const masterUrl = await uploadToS3Optimized("cartoonflix", outputDir, prefix);
  

    console.log("Step 4: Updating database...");
    await axios.put(`${process.env.BACKEND_URL}/api/v1/admin/content/${contentId}`, {
      video_url: `${process.env.AWS_CLOUDFRONY_URL}/${prefix}/master.m3u8`,
      isReady: true,
      status: "ready",
    });

    console.log("Job processed successfully:", {
      video_url: `${process.env.AWS_CLOUDFRONY_URL}/${prefix}/master.m3u8`,
    });
  } catch (error) {
    console.error("Error processing job:", error);
    throw error;
  } 
};

module.exports = { processVideo };
