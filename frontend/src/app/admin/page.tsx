import { DataTableDemo } from "@/components/custom/dataTable";
import { getMoviesMetadata } from "./actions";

export default async function Page({params}:{params:{adminId:string}}) {
    const movieData = await getMoviesMetadata()
    
    return (
        


        <div className=" bg-background text-foreground rounded col-span-10   ">
            <div className="container">

            <DataTableDemo data={movieData}/>
            </div>
            </div>
        
    );
}