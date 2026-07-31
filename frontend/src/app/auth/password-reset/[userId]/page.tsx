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
import { createUserPasswordResetForm } from "../../actions";
import { useToast } from "@/components/ui/use-toast";

export default function Page({params}:{params:{userId :string}}) {
  
    const { toast } = useToast()
    const handleUserPasswordReset = async (formData:FormData)=>{
        const result = await createUserPasswordResetForm(formData,params.userId);
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
            <CardTitle className="text-2xl">New Password</CardTitle>
            <CardDescription>
              Enter your New password below to reset your password
            </CardDescription>
          </CardHeader>
          <form action={handleUserPasswordReset}>

          <CardContent>
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                 
                  required
                  />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="password">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="text"
                  name="confirmPassword"
                  required
                  />
              </div>
              
              
              <Button type="submit" className="w-full">
                Reset
              </Button>
              
            </div>
            <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="underline">
                Sign up
              </Link>
              
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
