const { checkVideoCode } = require('./checkVideoCode'); 

async function main() {
  const videoId = 69776; 
  const isVideoIdExists = await checkVideoCode(videoId); 

  console.log(isVideoIdExists); // This will log true or false
}

main();