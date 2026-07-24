import { transcodeToHLSWithCUDA} from "./process_video.js"

transcodeToHLSWithCUDA('./input/video2.mp4', './output')
  .then((result) => console.log(`HLS generated at: ${result}`))
  .catch((err) => console.error(`Error: ${err.message}`));
