const Content = require("../models/contentModel");

async function checkVideoCode(videoId) {
  try {
    const content = await Content.find({ video_id: videoId });
    if (!content) {
      return false;
    }
    return true;
  } catch (error) {
    console.log(error);
    
  }
}
module.exports= {checkVideoCode}
