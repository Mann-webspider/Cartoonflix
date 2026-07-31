"use client"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
          Card,
          CardContent,
          CardDescription,
          CardHeader,
          CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createUserRegisterForm } from "../actions"
import { useToast } from "@/components/ui/use-toast"
export default function Page() {
    const { toast } = useToast()
    const handleRegister = async (formData:FormData)=>{
        const result = await createUserRegisterForm(formData);
        if(result.error){
            toast({title:result.error,variant:"destructive"})
            return
        }
        toast({title:result.message,variant:"success"})
        console.log(result);
    }
    return (
        <div className="h-screen">
            <div className="container flex justify-center items-center h-screen">

        
        
            <Card className="mx-auto max-w-sm">
              <CardHeader>
                <CardTitle className="text-xl">Sign Up</CardTitle>
                <CardDescription>
                  Enter your information to create an account
                </CardDescription>
              </CardHeader>
              <form action={handleRegister}>

              <CardContent>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="first-name">Username</Label>
                      <Input id="first-name" name="username" placeholder="Max" required />
                    </div>
                
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      name="email"
                      placeholder="m@example.com"
                      required
                      />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" name="password" />
                  </div>
                  <Button type="submit" className="w-full">
                    Create an account
                  </Button>
                  
                </div>
                <div className="mt-4 text-center text-sm">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="underline">
                    Login
                  </Link>
                </div>
              </CardContent>
                      </form>
            </Card>
          
                      </div>
        </div>
    );
}