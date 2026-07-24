import Image from "next/image";
import Link from "next/link";
import react from "react";

function MovieCard({ movie, isLandscape = true }) {
  return (
    <>
      <div className="flex flex-col gap-2 w-80 font-regular  ">
        {isLandscape ? (
          <div>

          <Image
            src={movie.thumbnail_url}
            alt={movie.title}
            width={720}
            height={360}
            className=" aspect-video rounded-lg"
          />
          <h2 className="text-gray-300 w-[30ch] text-lg truncate">
          
            {movie.title}
        </h2>
          </div>
        ) : (
          <div>

          <Image
            src={movie.poster_url}
            alt={movie.title}
            width={200}
            height={240}
            className=" aspect-auto rounded-lg"
          />
          <h2 className="text-gray-300 w-[20ch] text-lg truncate">
         
            {movie.title}
        </h2>
          </div>
        )}
        
      </div>
    </>
  );
}

export default MovieCard;
