"use client"
import { redirect} from "next/navigation";
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createAdminLoginForm } from "../../actions";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { getSession } from "@/lib/session";
import { useRouter } from "next/navigation";



export default function Page({params}: { params: { adminId: string } }) {
    const { toast } = useToast()
    const router = useRouter()
    const adminAction = async (formData:FormData)=>{
        const result = await createAdminLoginForm(formData);
        if(result.error){
            toast({title:result.error,variant:"destructive"})
            return
        }
        toast({title:result.message,variant:"success"})
        router.replace(`/admin`)
        // redirect(`/admin`)
    }
    //  change poikl-ujmnhy-rfvgdce to your admin Id whatever you wants
    // it will only allow with correct adminId otherwise it will redirect to user loginpage
    if(params.adminId != "poikl-ujmnhy-rfvgdce"){
        redirect("/auth/login")
    }
    
    return (
        <div className={` h-screen`}>
          <div className={`container  flex items-center justify-center h-screen`}>

            <Card className="w-full max-w-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Admin Login</CardTitle>
                <CardDescription>
                  Enter your email below to login to your account.
                </CardDescription>
              </CardHeader>
                <form action={adminAction}>
              <CardContent className="grid gap-4">

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" name="email" placeholder="m@example.com" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" name="password" min={6} max={21} required />
                </div>
                <div className="mt-4 text-center text-sm">
              Don&apos;t have an account?{" "}
              <Link href="/auth/signup" className="underline">
                Sign up
              </Link>
            </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Sign in</Button>
              </CardFooter>
            </form>
            </Card>
          
        
          </div>
        </div>
    );
}