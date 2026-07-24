const crypto = require('crypto');
const mongoose = require("mongoose")
function generateMovieId(movieName, category) {
  const cleanedName = movieName.toLowerCase().replace(/[^a-z0-9]/g, '_'); 

  let baseId;
  switch (category) {
    case "movie":
      baseId = 60000;
      break;
    case "series":
      baseId = 40000;
      break;
    default:
      throw new Error(`Invalid category: ${category}`);
  }

  const hash = crypto.createHash('sha1').update(cleanedName).digest('hex');
  const hashValue = parseInt(hash, 16) % 10000; 
  const uniqueId = baseId + hashValue;

  return uniqueId;
}

function generateObjectId(){
  return new mongoose.Types.ObjectId
}


module.exports = {generateMovieId,generateObjectId}