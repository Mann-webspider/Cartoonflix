import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "node:fs";
import { pipeline } from "stream";
import { promisify } from "util";
import "dotenv/config";
const pipelineAsync = promisify(pipeline);

/**
 * Download an object from S3 and save it to a local file.
 * @param {string} bucketName - The S3 bucket name.
 * @param {string} key - The S3 object key.
 * @param {string} destinationPath - The local path to save the file.
 */
export const downloadFromS3 = async (bucketName, key, destinationPath) => {
  
  
  const client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  }); 
  try {
    console.log(`Downloading ${key} from bucket ${bucketName}`);

    const command = new GetObjectCommand({ Bucket: bucketName, Key: key, });
    const response = await client.send(command);

    // Stream the response body to a file
    const writeStream = fs.createWriteStream(destinationPath);
    await pipelineAsync(response.Body, writeStream);

    console.log(`File downloaded successfully to ${destinationPath}`);
  } catch (error) {
    if (error.name === "NoSuchKey") {
      console.error(`No such key: ${key} in bucket ${bucketName}`);
    } else if (error.name === "S3ServiceException") {
      console.error(`S3 error: ${error.name} - ${error.message}`);
    } else {
      console.error("Unexpected error:", error);
      throw error; // Re-throw unexpected errors
    }
  }
};
