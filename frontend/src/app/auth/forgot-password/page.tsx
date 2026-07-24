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
import { createUserResetForm } from "../actions";
import { useToast } from "@/components/ui/use-toast";
import { sendResetEmail } from "../emailSender";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Page() {
  const [btn, setBtn] = useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();
  const handleUserReset = async (event: React.FormEvent<HTMLFormElement>) => {
    // prevent from default action 
    event.preventDefault();
    setBtn(true);

    // collect form from html 
    const form = event.currentTarget
    const formData = new FormData(form);

    // calling actions to validate form data and send it to backend
    const result = await createUserResetForm(formData);

    // after recieving data it checks if there is an error or not if there then engage error toast
    if (result.error) {
      setBtn(false);
      toast({ title: result.error, variant: "destructive" });
      return;
    }

    // if the backend data status is successful then send forget password email to its user email
    await sendResetEmail(result.email, result.user_id).then((data) => {
        setBtn(false);
        toast({ title: result.message, variant: "success" });
    });
    router.push("/auth/login")
  };
  return (
    <div className={` h-screen`}>
      <div className={`container  flex items-center justify-center h-screen`}>
        <Card className={`mx-auto max-w-sm`}>
          <CardHeader>
            <CardTitle className="text-2xl">Forgot Password</CardTitle>
            <CardDescription>
              Enter your email below to reset your password
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleUserReset}>
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
                {btn ? (
                  <Button disabled>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait
                  </Button>
                ) : (
                  <Button type="submit" className="w-full" >
                    Reset
                  </Button>
                )}
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
