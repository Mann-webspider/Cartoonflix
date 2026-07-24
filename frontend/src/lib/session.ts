"use server"
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const sessionKey = "secret";
const key = new TextEncoder().encode(sessionKey);

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10s")
    .sign(key);
}

export async function decrypt(input: any) {
    const {payload} = await jwtVerify(input,key,{algorithms:["HS256"]});
    return payload
  }


export async function getSession() {
  const session = cookies().get("session")?.value;
  if (!session) return null;
  return JSON.parse(atob(session.split(".")[1]));
}


export async function setSession(user:JSON){
    const expires = new Date(Date.now() + 1000 *60 *10 ) // 1 day
    const session = await encrypt(user)

    cookies().set("session",session,{httpOnly:true,expires})
}

export async function logout(){
    cookies().set('session','',{expires:new Date(0)});
}

export async function updateSession(request:NextRequest){
const session = request.cookies.get("session")?.value
if(!session) return

const res = NextResponse.next()
res.cookies.set("session",session,{httpOnly:true,expires:new Date(Date.now() + 10 * 1000)})
}