import { consumeMessages } from "./consumer.js";
import {
  transcodeToHLSWithCUDA,
  ensureDirExists,
} from "./ffmpeg/process_video.js"; // Your FFmpeg logic
import {uploadToS3} from "./s3/upload.js";
import { downloadFromS3 } from "./s3/download.js";
import axios from "axios"; // Import axios for HTTP requests
import { processImage } from "./utils/thumbnail.js";
import { processVideo } from "./utils/video.js";
import 'dotenv/config'
import { getFileTypeFromUrl } from "./utils/checkType.js";

const outputDir = "./temp/output";
ensureDirExists(outputDir);

const uploadAndUpdate = async (outputDir,prefix) => {
  // Step 3: Upload transcoded files to S3
  const masterUrl = await uploadToS3(
    "cartoonflix",
    outputDir,
    prefix
  );
  
  

  // Step 4: Update database
  const { data } = await axios.put(
    `${process.env.BACKEND_URL}/api/v1/admin/content/${contentId}`,
    {
      video_url: `${process.env.AWS_CLOUDFRONY_URL}/${prefix}/master.m3u8`,
      
      status: "ready",
    }
  );
  
  console.log("Job processed successfully:", data);
};

const processJob = async (job,channel) => {
  try{

    const { bucket, keys, contentId ,video_id,type} = job;
    let prefix = `${type}/${type}_${video_id}`
    if(getFileTypeFromUrl(keys.Key)=="movie"){
      processVideo(job,outputDir,prefix);
    }else{
      processImage(bucket,keys.Key,contentId,prefix, keys.keyType)
    }
    channel.ack(JSON.stringify(job));
  }catch(error){
    channel.nack(JSON.stringify(job));
    throw error
  }
};

const startWorker = async () => {
  try {
    
    consumeMessages("video_transcoding", async (msg, channel) => {
      const job = JSON.parse(msg.content);
      console.log("Processing job:", job);

      try {
        
        await processJob(job,channel);
        // Acknowledge message after successful processing
      } catch (error) {
        console.error("Error processing job:", error);
        // channel.nack(msg); // Nack message on error to requeue it
      }
    });
  } catch (error) {
    console.error("Error starting worker:", error);
  }
};

startWorker().catch(console.error);
