"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUserLoginForm } from "../actions";
import { useToast } from "@/components/ui/use-toast";

export default function Page() {
    const { toast } = useToast()
    const handleUserLogin = async (formData:FormData)=>{
        const result = await createUserLoginForm(formData);
        if(result.error){
            toast({title:result.error,variant:"destructive"})
            return
        }
        toast({title:result.message,variant:"success"})
        console.log(result);
    }
  return (
    <div className={` h-screen`}>
      <div className={`container  flex items-center justify-center h-screen`}>
        <Card className={`mx-auto max-w-sm`}>
          <CardHeader>
            <CardTitle className="text-2xl">Login</CardTitle>
            <CardDescription>
              Enter your email below to login to your account
            </CardDescription>
          </CardHeader>
          <form action={handleUserLogin}>

          <CardContent>
            <div className="grid gap-4">
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
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/auth/forgot-password"
                    className="ml-auto inline-block text-sm underline"
                    >
                    Forgot your password?
                  </Link>
                </div>
                <Input id="password" type="password" name="password" required />
              </div>
              <Button type="submit" className="w-full">
                Login
              </Button>
              
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="underline">
                Sign up
              </Link>
            </div>
          </CardContent>
        </form>
        </Card>
      </div>
    </div>
  );
}
