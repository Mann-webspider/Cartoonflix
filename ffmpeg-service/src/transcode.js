const express = require('express');
const multer = require('multer');
const { transcodeToHLSWithCUDA } = require('./ffmpeg/process_video');
const { uploadToS3 } = require('./s3/upload');
const path = require('path');
const fs = require('fs');

const router = express.Router();
const upload = multer({ dest: 'uploads/' }); // Temporary upload directory

router.post('/transcode', upload.single('video'), async (req, res) => {
  const inputPath = req.file.path;
  const outputDir = path.join(__dirname, '../uploads/hls-output');
  const bucket = process.env.AWS_S3_BUCKET; // Replace with your bucket name
  const key = `videos/${req.file.originalname}.m3u8`;

  try {
    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Transcode the video to HLS
    let hlsPath;
    try {
      
     hlsPath = await transcodeToHLSWithCUDA(inputPath, outputDir);
    } catch (error) {
      console.log(error);
      
    }

    // Upload to S3
    // const s3Url = await uploadToS3(bucket, key, hlsPath);

    // Clean up temporary files
    // fs.unlinkSync(inputPath);

    res.json({ success: true, hlsUrl: s3Url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
