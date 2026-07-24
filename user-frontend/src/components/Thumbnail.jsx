'use client'
import Image from 'next/image'
import Link from 'next/link'
import React from 'react'

function Thumbnail({movies,category}) {
  
  
  return (
     
     <section className="lg:px-12 lg:py-8 px-4 py-4">
     <h2 className="text-2xl font-bold text-white mb-4">{category}</h2>
     <div className="flex overflow-auto no-scrollbar   gap-2 lg:gap-6">
       {movies.map((movie, index) => (
        <Link href={`/view/${movie.video_id}`} key={index}>

         <div key={index} className="space-y-2  p-2 lg:p-4">
           <div className='aspect-video w-64 lg:w-96  rounded-lg hover:ring  hover:ring-purple-500 transition duration-300' >

           <img src={movie.thumbnail_url} className='rounded-lg object-cover ' alt={movie.title}/>
           </div>
           <h3 className="text-white font-medium">{movie.title}</h3>
           <div className="flex items-center gap-2 text-sm text-gray-400">
             <span>Movie</span>
             <span>•</span>
             <span>1h32m</span>
           </div>
         </div>
        </Link>
       ))}
     </div>
   </section>
 
  )
}

export default Thumbnail