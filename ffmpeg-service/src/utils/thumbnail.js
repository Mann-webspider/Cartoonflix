const sharp = require("sharp");
const { downloadFromS3 } = require("../s3/download");
const { uploadToS3 } = require("../s3/upload");
const { default: axios } = require("axios");
const { ensureDirExists } = require("../ffmpeg/process_video");
require("dotenv").config();

async function processImage(bucket, imageKey, contentId, prefix, type) {
  try {
    const filePath = `./temp/${type}_original.jpg`;
    const outputPath = `./temp/${type}`;
    ensureDirExists(outputPath);

    // Step 1: Download image from S3
    await downloadFromS3(bucket, imageKey, filePath);

    // Step 2: Resize image based on type
    let finalPath;
    if (type === "thumbnail") {
      finalPath=`${outputPath}/thumbnail_720.webp`
      await resizeImage(filePath, finalPath, {
        width: 1280,
        height: 720,
      });
    } else if (type === "poster") {
      finalPath=`${outputPath}/poster_1080.webp`
      await resizeImage(filePath, finalPath, {
        width: 720,
        height: 1080,
      });
    } else {
      throw new Error("Invalid type. Supported types: thumbnail, poster.");
    }

    // Step 3: Upload resized image to S3
    const imageUrl = await uploadToS3(
      process.env.AWS_S3_BUCKET,
      outputPath,
      prefix
    );

    // Step 4: Update database with the new URL
    const { data } = await axios.put(
      `${process.env.BACKEND_URL}/api/v1/admin/content/${contentId}`,
      {
        [`${type}_url`]: `${process.env.AWS_CLOUDFRONY_URL}/${prefix}/${type}_${type==="thumbnail"?"720":"1080"}.webp`,
      }
    );

    console.log(`${type} processed successfully!`, data);
  } catch (e) {
    console.error(`Error processing ${type}:`, e);
  }
}

async function resizeImage(inputPath, outputPath, { width, height }) {
  try {
    await sharp(inputPath)
      .resize(width, height)
      .toFile(outputPath);
    console.log(`Image resized: ${outputPath}`);
  } catch (err) {
    console.error("Error resizing image:", err);
  }
}

module.exports = { processImage };