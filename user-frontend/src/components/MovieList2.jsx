import React from 'react'
import Thumbnail from './Thumbnail'
import Poster from './Poster'

function MovieList2({isLandscape = true,data,category}) {
    
    
  return (
    
      <section >
        {isLandscape?<Thumbnail movies={data} category={category}/>:<Poster movies={data} category={category}/>}
      </section>
  )
}

export default MovieList2