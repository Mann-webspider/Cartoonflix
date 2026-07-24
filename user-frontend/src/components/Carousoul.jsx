import React from 'react'

function Carousoul() {
  return (
    <section className="relative ">
        <div className=" w-full h-[70vh] bg-cover   bg-[url('https://d1nb9xnp3todvf.cloudfront.net/movie/movie_62720/thumbnail_720.webp')] bg-center">
          <div className="absolute bottom-0 left-0 right-0  px-16 py-16 bg-gradient-to-t from-[#1F1B24] to-transparent">
            <h1 className="text-4xl font-bold text-white mb-4">Movie Title</h1>
            <p className="text-gray-300 max-w-2xl mb-6">
              Lorem ipsum dolor sit amet consectetur adipiscing elit Ut et massa mi. Aliquam in hendrerit urna.
              Pellentesque sit amet sapien fringilla, mattis ligula consectetur, ultrices mauris. Maecenas vitae mattis
              tellus. Nullam quis imperdiet augue..
            </p>
            <button className="bg-white text-black px-6 py-2 rounded-full font-medium hover:bg-gray-200 transition-colors">
              Watch Now
            </button>
          </div>
        </div>
      </section>
  )
}

export default Carousoul