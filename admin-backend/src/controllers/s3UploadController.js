const AWS = require('aws-sdk');
const mongoose = require('mongoose');

// Load environment variables
require('dotenv').config();

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

// Create S3 instance
const s3 = new AWS.S3();

const generatePresignedUrl = async (req, res) => {
  const { fileName, fileType ,prefix} = req.body;
  
 
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_ORIGINAL,
    Key: `${prefix}/${fileName}`,
    Expires: 5*60, // URL valid for 3 min
    ContentType: fileType,
  };

  try {
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    res.json({ uploadUrl ,prefix});
  } catch (error) {
    console.error('Error generating pre-signed URL:', error);
    res.status(500).json({ error: 'Failed to generate pre-signed URL' });
  }
};

module.exports = { generatePresignedUrl };
