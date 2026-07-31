const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const s3 = new S3Client({ region: process.env.AWS_REGION });

// Presign a PUT upload.
//  - kind "video" (default) -> RAW bucket, key `<contentId>/<file>`. Landing an
//    object here triggers the transcode pipeline via the S3 event.
//  - kind "image" (poster/thumbnail) -> HLS bucket under `posters/<contentId>/<file>`,
//    served publicly by CloudFront (no transcode). Returns a public URL.
const generatePresignedUrl = async (req, res) => {
  const { fileName, fileType, contentId, kind = "video" } = req.body;
  if (!fileName || !contentId) {
    return res.status(400).json({ error: "fileName and contentId are required" });
  }

  const isImage = kind === "image";
  const bucket = isImage ? process.env.HLS_BUCKET : process.env.RAW_BUCKET;
  const key = isImage ? `posters/${contentId}/${fileName}` : `${contentId}/${fileName}`;

  try {
    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: fileType }),
      { expiresIn: 300 }
    );
    const publicUrl =
      isImage && process.env.CLOUDFRONT_DOMAIN
        ? `https://${process.env.CLOUDFRONT_DOMAIN}/${key}`
        : undefined;
    res.json({ uploadUrl, key, publicUrl });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate presigned URL" });
  }
};

module.exports = { generatePresignedUrl };
