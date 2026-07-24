


import React from 'react';
import MovieCard from './MovieCard';
import Link from 'next/link';


const MoviesList =async ({data}) => {
   
  
    
 

  return (<div className="m-12 gap-6 flex-grow">

    <h1 className='text-3xl font-medium'>Trending</h1>
    <div className='flex gap-6'>
      {/* <button onClick={loadMovies}>Load Movies</button> */}
      {data.map((movie) => (
        <Link href={`/view/${movie.video_id}`}>

        <MovieCard movie={movie} key={movie.video_id}/>
        </Link>
      ))}
    </div>
  </div>
  );
};

export default MoviesList;
