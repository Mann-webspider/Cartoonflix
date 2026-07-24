import fs from "node:fs";
import path from "node:path";
import "dotenv/config";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import pLimit from "p-limit";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  requestHandler: new NodeHttpHandler({
    connectionTimeout: 30000, // Timeout in ms
    maxConcurrentStreams: 50, // Reduce concurrency if too high
  }),
});

// ---------------------------------------------------------------------------------------------




const uploadToS3Optimized = async (bucketName, folderPath, prefix, concurrency = 5) => {
  const limit = pLimit(concurrency);
  let uploadedFiles = 0;
  const totalFiles = fs.readdirSync(folderPath, { withFileTypes: true }).length;

  const uploadFile = async (filePath, key) => {
    try {
      const fileStream = fs.createReadStream(filePath);
      const contentType = filePath.endsWith(".ts")
        ? "video/mp2t"
        : filePath.endsWith(".m3u8")
        ? "application/x-mpegURL"
        : "application/octet-stream";

      // console.log(`Uploading: ${key}`);
      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: fileStream,
          ContentType: contentType,
        })
      );
      fs.unlinkSync(filePath); // delete file after uploading
      uploadedFiles++;
      // console.log(`Uploaded ${uploadedFiles}/${totalFiles}: ${key}`);
    } catch (error) {
      console.error(`Error uploading ${key}: ${error.message}`);
    }
  };

  const traverseDirectory = async (dirPath, currentPrefix) => {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const itemKey = path.join(currentPrefix, item).replace(/\\/g, "/");

      if (fs.statSync(itemPath).isDirectory()) {
        console.log(`Creating placeholder for directory: ${itemKey}`);
        await client.send(
          new PutObjectCommand({
            Bucket: bucketName,
            Key: `${itemKey}/`,
            Body: "",
          })
        );
        await traverseDirectory(itemPath, itemKey);
      } else {
        await limit(() =>
          uploadWithRetry(() => uploadFile(itemPath, itemKey))
        );
      }
    }
  };

  await traverseDirectory(folderPath, prefix);
  console.log("All files uploaded successfully.");
};




// ---------------------------------------------------------------------------------------------
const uploadToS3 = async (bucketName, folderPath, prefix, maxConcurrency = 10) => {
  try {
    console.time("req_time");
    console.log(`Uploading all files and directories from ${folderPath} to S3`);


    const uploadQueue = []; // Queue to store promises for uploads

    const uploadFile = async (filePath, fileKey) => {
      const fileStream = fs.createReadStream(filePath);
      const contentType = filePath.endsWith(".ts")
        ? "video/mp2t"
        : filePath.endsWith(".m3u8")
        ? "application/x-mpegURL"
        : "application/octet-stream";

      console.log(`Uploading file: ${fileKey}`);
      await client.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: fileKey,
          Body: fileStream,
          ContentType: contentType,
        })
      );

      // Delete the file locally after successful upload
      fs.unlinkSync(filePath);
    };

    const uploadDirectory = async (currentPath, currentPrefix) => {
      const items = fs.readdirSync(currentPath);

      const tasks = items.map(async (item) => {
        const itemPath = path.join(currentPath, item);
        const itemKey = path.join(currentPrefix, item).replace(/\\/g, "/");

        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
          // Add the directory itself as a placeholder in S3
          console.log(`Uploading directory: ${itemKey}`);
          await client.send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: itemKey, // S3 interprets keys ending with "/" as folders
              Body: "", // Empty body for directories
            })
          );

          // Recursively process the directory
          await uploadDirectory(itemPath, itemKey);
        } else {
          // Add file upload to the queue
          uploadQueue.push(() => uploadFile(itemPath, itemKey));
        }
      });

      await Promise.all(tasks); // Process directory contents
    };

    // Start uploading with limited concurrency
    await uploadDirectory(folderPath, prefix);

    console.log(`Starting parallel uploads with max concurrency: ${maxConcurrency}`);
    const runUploads = async () => {
      const activeUploads = Array.from({ length: maxConcurrency }).map(async () => {
        while (uploadQueue.length > 0) {
          const uploadTask = uploadQueue.shift(); // Fetch a task from the queue
          if (uploadTask) await uploadTask();
        }
      });

      await Promise.all(activeUploads); // Wait for all uploads to finish
    };

    await runUploads(); // Trigger parallel uploads
    console.log(`Successfully uploaded all files and directories to S3.`);
    console.timeEnd("req_time");
  } catch (error) {
    console.error("Error uploading to S3:", error);
  }
};



const uploadToS3WithLimit = async (bucketName, folderPath, prefix, concurrency = 5) => {
  const limit = pLimit(concurrency);

  const uploadPromises = [];
  const uploadDirectory = async (currentPath, currentPrefix) => {
    const items = fs.readdirSync(currentPath);

    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const itemKey = path.join(currentPrefix, item).replace(/\\/g, "/");

      const stats = fs.statSync(itemPath);
      if (stats.isDirectory()) {
        console.log(`Uploading directory: ${itemKey}`);
        uploadPromises.push(
          limit(() =>
            client.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: itemKey,
                Body: "",
              })
            )
          )
        );

        await uploadDirectory(itemPath, itemKey);
      } else {
        const fileStream = fs.createReadStream(itemPath);
        const contentType = item.endsWith(".ts")
          ? "video/mp2t"
          : item.endsWith(".m3u8")
          ? "application/x-mpegURL"
          : "application/octet-stream";

        console.log(`Uploading file: ${itemKey}`);
        uploadPromises.push(
          limit(() =>
            client.send(
              new PutObjectCommand({
                Bucket: bucketName,
                Key: itemKey,
                Body: fileStream,
                ContentType: contentType,
              })
            )
          )
        );
      }
    }
  };

  await uploadDirectory(folderPath, prefix);

  // Wait for all uploads to complete
  await Promise.all(uploadPromises);
  console.log("All uploads completed.");
};



const uploadWithRetry = async (uploadFn, retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await uploadFn();
    } catch (error) {
      if (attempt < retries && error.Code === "RequestTimeout") {
        console.log(`Retrying upload (Attempt ${attempt})...`);
        await new Promise((res) => setTimeout(res, delay * attempt)); // Exponential backoff
      } else {
        throw error;
      }
    }
  }
};


export  {uploadToS3,uploadToS3WithLimit,uploadToS3Optimized,uploadWithRetry};

