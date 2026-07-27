const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: process.env.AWS_REGION });

// Presign a PUT for the raw bucket. Key convention `<contentId>/<fileName>` lets
// the transcode orchestrator derive the contentId from the S3 event.
const generatePresignedUrl = async (req, res) => {
  const { fileName, fileType, contentId } = req.body;
  if (!fileName || !contentId) {
    return res.status(400).json({ error: "fileName and contentId are required" });
  }

  const key = `${contentId}/${fileName}`;
  try {
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.RAW_BUCKET,
        Key: key,
        ContentType: fileType,
      }),
      { expiresIn: 300 }
    );
    res.json({ uploadUrl, key });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
};

module.exports = { generatePresignedUrl };
