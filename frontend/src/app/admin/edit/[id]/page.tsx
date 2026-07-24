
import {  useRef, useState } from "react";

import DynamicForm from "@/components/custom/DynamicForm";
import PreviewDisplay from "@/components/custom/PreviewDisplay";
import {getMovieEdit} from "./actions"




export default async function Page({params}: { params: { id: string } }) {
    const initialData = await getMovieEdit(params.id)
    console.log(initialData.data);
    
    
  return(<div className="flex w-screen ">
  <DynamicForm initialData={initialData.data} isEdit={true}/>
  <PreviewDisplay data={initialData.data}/>
  </div>)
}
