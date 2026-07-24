import { promises as fs } from "fs";
import path from "path";

const filePath = path.join(
  process.cwd(),
  "src",
  "streamingContents.json"
);

export async function getMovieByVideoId(videoId) {
  try {
    const file = await fs.readFile(filePath, "utf8");
    const movies = JSON.parse(file);

    const movie = movies?.data?.find(
      (m) => m.video_id === Number(videoId)
    );

    if (!movie) return null;

    return movie;
  } catch (error) {
    console.error("Error fetching movie:", error);
    return null;
  }
}
