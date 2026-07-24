"use server";

import axios from "axios";
import { log } from "console";
import { z } from "zod";

const movieMetadataForm = z.object({
  title: z.string(),
  description: z.string(),
  type: z.string(),
  video_url: z.string().optional(),
  thumbnail_url: z.string().optional(),
  genres: z.string().array(),
});

export const createMovieMetadataForm = async (formData: any, genre: any) => {
  const rawFormData = {
    title: formData.target["title"].value,
    description: formData.target["description"].value,
    type: formData.target["type"].value,

    genres: genre,
  };
  console.log(rawFormData);
  return rawFormData;
  // try {
  // const validate = movieMetadataForm.safeParse(rawFormData);
  // if (!validate.success) {
  //   console.log(validate.error.issues[0].message);
  // }
  // console.log(validate.data);

  //   const data = await fetch("http://127.0.0.1:5000/media/add",{
  //       method:"POST",
  //       body:JSON.stringify(validate.data),
  //       headers:{
  //           "Content-type":"application/json"
  //       },
  //       cache:"no-cache"
  //     })

  //   const res =await data.json()
  //   if(data.status != 200 ){
  //       throw new Error(res.message)
  //   }

  //   return res

  // } catch (error:any) {
  //   return {error:error.message};

  // }
};

export const getMoviesMetadata = async () => {
  try {
    const data = await fetch("http://localhost:5000/api/v1/admin/content?archive=false", {
      method: "GET",

      cache: "no-cache",
    });

    const res = await data.json();
    if (data.status != 200) {
      throw new Error(res.message);
    }

    return res.content;
  } catch (error: any) {
    return { error: error.message };
  }
};

