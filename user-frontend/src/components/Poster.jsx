import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

function Poster({movies,category}) {
  return (
    <section className="lg:px-12 lg:py-8 px-4 py-4">
    <h2 className="text-2xl font-bold text-white mb-4">{category}</h2>
    <div className="flex gap-6 overflow-x-auto no-scrollbar scroll-smooth ">
      {movies.map(
        (movie, index) => (
          <Link href={`/view/${movie.video_id}` } className='w-32 lg:w-48' key={index}>
          <div key={index} className="space-y-2  p-4">

            <div className='aspect-[2/3] w-32  lg:w-48 rounded-lg hover:ring  hover:ring-purple-500 transition duration-300'>

            <img  src={movie.poster_url} className='object-cover  rounded-lg '/>
            </div>
            <h3 className="text-white font-medium truncate">{movie.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Movie</span>
              <span>•</span>
              <span>1h32m</span>
            </div>
          </div>
          </Link>
        ),
      )}
    </div>
  </section>
  )
}

export default Poster