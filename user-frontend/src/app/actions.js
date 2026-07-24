import { promises as fs } from "fs";
import path from "path";

const filePath = path.join(
  process.cwd(),
  "src",
  "streamingContents.json"
);

async function getMovieList() {
  try {
    const file = await fs.readFile(filePath, "utf8");
    return JSON.parse(file);
  } catch (error) {
    console.error("Error fetching movie list:", error);
    return null;
  }
}

async function getMovieByVideoId(videoId) {
  try {
    const file = await fs.readFile(filePath, "utf8");
    const movies = JSON.parse(file);

    const movie = movies?.data?.find(
      (m) => m.video_id === Number(videoId)
    );

    if (!movie) {
      throw new Error("Movie not found");
    }

    return movie;
  } catch (error) {
    console.error("Error fetching movie:", error);
    return null;
  }
}

export { getMovieList, getMovieByVideoId };
