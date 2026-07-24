import { uploadToS3Optimized, uploadWithRetry } from "../s3/upload.js";

async function main(){
    const masterUrl = await uploadToS3Optimized("cartoonflix", "temp/output", "movie/movie_52416"); 
}
main()