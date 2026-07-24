const getFileTypeFromUrl = (url) => {
    const extension = url.split('.').pop(); // Get the part after the last dot
    let type;
  
    switch (extension) {
      case "mp4":
      case "mkv":
        type = "movie";
        break;
      case "png":
      case "jpg":
      case "jpeg":
      case "avif":
        type = "thumbnail";
        break;
      case "webp":
        type = "poster";
        break;
      default:
        type = "unknown";
    }
  
    return type;
  };
  
module.exports={getFileTypeFromUrl}