const crypto = require('crypto');

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

// A Mongo ObjectId is 24 hex characters: a 4-byte timestamp followed by 8
// random bytes. Building it here keeps mongoose — a server-side ODM — out of
// the browser bundle just to mint an id.
function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16).padStart(8, "0");
  const random = globalThis.crypto.getRandomValues(new Uint8Array(8));
  const suffix = Array.from(random, (b) => b.toString(16).padStart(2, "0")).join("");
  return timestamp + suffix;
}

module.exports = {generateMovieId,generateObjectId}
