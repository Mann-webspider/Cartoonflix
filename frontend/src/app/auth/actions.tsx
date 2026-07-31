"use server";


import { setSession } from "@/lib/session";
import { z } from "zod";


const adminLoginSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email")
      .includes("@", { message: "@ is not included" })
      .toLowerCase(),
    password: z.string().min(6).max(21),
    mastermind: z.enum(["admin"]).default("admin"),
  })
  .required();

const userLoginSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email")
      .includes("@", { message: "@ is not included" }),
    password: z.string().min(6).max(21),
    mastermind: z.string().default("user"),
  })
  .required();

  const userResetSchema = z
  .object({
    email: z
      .string()
      .email("Invalid email")
      .includes("@", { message: "@ is not included" }),
    
    mastermind: z.string().default("user"),
  })
  .required();

  const userPasswordResetSchema = z
  .object({
    password: z
      .string(),
    confirmPassword: z.string(),
    userId: z.string()
  }).refine((data) => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirm"],
    });



const userRegisterSchema = z
  .object({
    username: z.string({
      required_error: "username is required",
      invalid_type_error: "Name must be a string",
    }),
    
    email: z
      .string()
      .email("Invalid email")
      .includes("@", { message: "@ is not included" }),
    password: z.string().min(6).max(21),
    mastermind: z.string().default("user"),
  })
  .required();

export const createAdminLoginForm = async (formData: FormData) => {
  const rawFormData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  try {
  const validate = adminLoginSchema.safeParse(rawFormData);
  if (!validate.success) {
    console.log(validate.error.issues[0].message);
  }
  
    const data = await fetch("http://127.0.0.1:5000/admin/login",{
        method:"POST",
        body:JSON.stringify(validate.data),
        headers:{
            "Content-type":"application/json"
        },
        cache:"no-cache"
      })
      
    const res =await data.json()
    if(data.status != 200){
        throw new Error(res.message)
    }
    setSession(res)
    return res
      
  } catch (error:any) {
    return {error:error.message};
    
  }
  
};

export const createUserLoginForm = async (formData: FormData) => {
  const rawFormData = {
    email: formData.get("email"),
    password: formData.get("password"),
    mastermind: "user",
  };
  const validate = userLoginSchema.safeParse(rawFormData);
  // WIP do something if error comes up
  if (!validate.success) {
    console.log(validate.error.issues[0].message);
  }
  
  try {
    const data = await fetch("http://127.0.0.1:5000/users/login",{
        method:"POST",
        body:JSON.stringify(validate.data),
        headers:{
            "Content-type":"application/json"
        }
      })
      const res =await data.json()
    if(data.status != 200){
        throw new Error(res.message)
    }
    setSession(res)
    return res
  } catch (error:any) {
    return {error:error.message};
    
  }
  
};


export const createUserResetForm = async (formData: FormData) => {
  const rawFormData = {
    email: formData.get("email"),
    mastermind: "user",
  };
  const validate = userResetSchema.safeParse(rawFormData);
  // WIP do something if error comes up
  if (!validate.success) {
    console.log(validate.error.issues[0].message);
  }
  
  try {
    const data = await fetch("http://127.0.0.1:5000/users/reset-email",{
        method:"POST",
        body:JSON.stringify(validate.data),
        headers:{
            "Content-type":"application/json"
        }
      })
      const res =await data.json()
    if(data.status != 200){
        throw new Error(res.message)
    }
    
    return res
  } catch (error:any) {
    return {error:error.message};
    
  }
};

export const createUserPasswordResetForm = async (formData: FormData,userId:string) => {
  const rawFormData = {
    password: formData.get("password"),
    confirmPassword: formData.get('confirmPassword'),
    userId:userId
  };
  const validate = userPasswordResetSchema.safeParse(rawFormData);
  // WIP do something if error comes up
  if (!validate.success) {
    console.log(validate.error.issues[0].message);
  }
  
  try {
    const data = await fetch("http://127.0.0.1:5000/users/reset-password",{
        method:"POST",
        body:JSON.stringify(validate.data),
        headers:{
            "Content-type":"application/json"
        }
      })
      const res =await data.json()
    if(data.status != 200){
        throw new Error(res.message)
    }
    
    return res
  } catch (error:any) {
    return {error:error.message};
    
  }
};

export const createUserRegisterForm = async (formData: FormData) => {
  const rawFormData = {
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
    mastermind: "user",
  };
  const validate = userRegisterSchema.safeParse(rawFormData);
  // WIP do something if error comes up
  if (!validate.success) {
    console.log(validate.error.issues[0].message);
  }

try {
    const data = await fetch("http://127.0.0.1:5000/users/register",{
        method:"POST",
        body:JSON.stringify(validate.data),
        headers:{
            "Content-type":"application/json"
        }
      })
    const res =await data.json()
    if(data.status != 201){
        throw new Error(res.message)
        return
    }
    setSession(res)
    return res
  } catch (error:any) {
    return {error:error.message};
    
  }

  
};
