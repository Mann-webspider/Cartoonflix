import { z } from "zod";
import axios from "axios"
import {generateMovieId} from "@/lib/generateCode.js"
const movieMetadataForm = z
  .object({
    _id:z.string().optional(),
    title:z.string(),
    description:z.string(),
    type:z.enum(['movie',"series"]),
    releaseDate:z.string().optional(),
    genres:z.string().array(),
    tags:z.string().array(),
    video_id:z.number().optional(),
    keyUrl:z.string().optional().default(""),
    keyType:z.string().optional(),
    isPublish:z.boolean().default(false).optional(),
    deleted:z.boolean().default(false).optional(),
  })
  
const createMovieMetadataForm = async (formData ,genre,tag,videoS3Url) => {
    const rawFormData = {
      _id:formData.id,
      title: formData.title,
      description: formData.description,
      type:formData.type,
      releaseDate:formData.releaseDate,
      genres: genre,
      tags:tag, 
      video_id: generateMovieId(formData.title,formData.type),
      
      keyUrl:videoS3Url['key'],
      keyType:videoS3Url['keyType'],
      isPublish:formData.isPublish,
      deleted:formData.isDeleted,
    };
    
    console.log(rawFormData);
    
    try {
    const validate = movieMetadataForm.safeParse(rawFormData);
    if (!validate.success) {
      console.log(validate.error.issues[0].message);
    }
    
    
    
      const data = await axios.post("http://localhost:5000/api/v1/admin/content",validate.data,{
          
          
          headers:{
              "Content-type":"application/json"
          },
          cache:"no-cache"
        })
        
      const res =await data.data
      if(data.status != 201 ){
          throw new Error(res.message)
      }
      
      return res
  
        
    } catch (error) {
      return {error:error.message};
      
    }
    
  };
  export const handleMovieMetadata = async (formData,genre,tag,videoS3Url) => {
    
    
    const result = await createMovieMetadataForm(formData, genre,tag,videoS3Url);
    console.log(result);

    // if(result.error){
    //     toast({title:result.error,variant:"destructive"})
    //     return
    // }
    // toast({title:result.message,variant:"success"})
  };

  export const handleMovieUpdate= async (formData,genre,tag)=>{
    const rawFormData = {
      
      title: formData.target['title'].value,
      description: formData.target['description'].value,
      type:formData.target['type'].value,
      genres: genre,
      tags:tag,
      releaseDate:formData.target["date"].value,
      isPublish:formData.target['isPublish'].checked,
      deleted:formData.target['isDeleted'].checked,
    };
    console.log(formData.target["date"].value);
    
    try {
      const validate = movieMetadataForm.safeParse(rawFormData);
      if (!validate.success) {
        console.log(validate.error.issues[0].message);
      }
      
      
        let id = formData.target['id'].value
        const {data} = await axios.put(`http://localhost:5000/api/v1/admin/content/${id}`,validate.data,{
            
            
            headers:{
                "Content-type":"application/json"
            },
            cache:"no-cache"
          })
          console.log(data);
          
        const res =await data.content
        if(data.status != 201 ){
            throw new Error(data.message)
        }
        
        return res
    
          
      } catch (error) {
        return {error:error.message};
        
      }

  }

  export const uploadToS3 = async (files,prefix,setProgress,type) => {
    try {
      const uploadPromises = files.map(async (file) => {
        const response = await axios.post(
          "http://localhost:5000/api/v1/admin/presigned-url",
          {
            
            
             fileName: file.name, fileType: file.type ,prefix
          }
        );
  
        const { uploadUrl } = await response.data;
  
        const uploadResponse = await axios.put(uploadUrl,file, {
          
          headers: { "Content-Type": file.type ,ContentEncoding: 'base64'},
          
          onUploadProgress: (progressEvent) => {
            if (setProgress) {
              const progress = Math.round(
                (progressEvent.loaded / progressEvent.total) * 100
              );
              setProgress(progress);
            }
          },
        });
  
        // const type = file.type === "video/mp4" || file.type === "video/x-matroska"? "movie" : "thumbnail";
        return { ["key"]: uploadUrl.split("?")[0],
          keyType:type
         };
      });
  
      const uploadResults = await Promise.all(uploadPromises);
      const presign = uploadResults.reduce((acc, result) => ({ ...acc, ...result }), {});
  
      return presign; 
    } catch (e) {
      console.log("error in upload", e);
      return {}; // Return an empty object in case of an error
    }
  };
