'use client'
import { getMovieByVideoId } from "./actions.js";
async function test() {
    const movie = await getMovieByVideoId(66256);
    console.log(movie);
    
} 
test()