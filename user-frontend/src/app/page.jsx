import {getMovieList} from "./actions"
import Navbar from "@/components/Navbar";
import Carousoul from "@/components/Carousoul";
import MovieList2 from "@/components/MovieList2";

import CategoryList from "@/components/CategoryList";

export default async function Home() {
  const {data} = await getMovieList()
  
  
  
  return (
    < >
    

    {/* navbar */}
    <Navbar/>
    {/* carousol */}
    <Carousoul/>
    {/* trending list  */}
    
    
    <MovieList2 data={data} isLandscape={true} category={"Favourite"}/>
    <MovieList2 data={data} isLandscape={false} category={"Trending"}/>
    <CategoryList/>

  
      
    </>
  );
}
