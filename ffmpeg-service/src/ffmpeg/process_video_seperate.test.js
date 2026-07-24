const { seperateAudioFromVideo } = require('./process_video');
const videoPath = './input/video2.mp4';
const outputPath = './output';
seperateAudioFromVideo(videoPath, outputPath)
  .then((audioFilePath) => {
    console.log(`Audio file extracted: ${audioFilePath}`);
  })
  .catch((err) => {
    console.error(`Error extracting audio: ${err.message}`);
  });
