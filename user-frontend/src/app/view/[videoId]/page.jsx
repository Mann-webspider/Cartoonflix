import { getMovieByVideoId } from "./actions";
import VideoPlayer from "./VideoPlayer";
import "./style.css";

export default async function Page({ params }) {
  const { videoId } = params;

  const movie = await getMovieByVideoId(videoId);

  if (!movie) {
    return (
      <p className="text-white text-center mt-10">
        Movie not found
      </p>
    );
  }

  return (
    <section className="container mx-auto">
      <div className="w-full h-screen flex-col justify-around my-8">
        {/* Client Component */}
        <VideoPlayer movie={movie} videoId={videoId} />

        {/* Movie Info */}
        <div
          id="description"
          className="flex-cols xl:w-2/4 h-fit my-6 mx-4 text-gray-400 mr-12 xl:tracking-wider"
        >
          <p className="font-semibold xl:text-3xl text-xl text-gray-300 pb-6">
            {movie.title}
          </p>

          <p className="w-full text-md xl:text-lg leading-6">
            {movie.description}
          </p>

          <p className="pt-8 leading-7">Type: {movie.type}</p>
          <p className="leading-7">Duration: {movie.duration}</p>

          <p className="leading-7">
            Genres:{" "}
            <span className="underline underline-offset-8 capitalize">
              {Array.isArray(movie.genres)
                ? movie.genres.join(" - ")
                : "N/A"}
            </span>
          </p>
        </div>
      </div>
    </section>
  );
}
