"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setCookie } from "cookies-next";
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
import { useToast } from "@/components/ui/use-toast";
import { API_BASE, TOKEN_COOKIE, USER_COOKIE } from "@/lib/config";

export default function Page() {
  const { toast } = useToast();
  const router = useRouter();

  const handleRegister = async (formData: FormData) => {
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("username"),
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Sign up failed");
      setCookie(TOKEN_COOKIE, data.token);
      setCookie(USER_COOKIE, JSON.stringify(data.user));
      toast({ title: "Account created", variant: "success" });
      router.push("/admin");
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="h-screen">
      <div className="container flex justify-center items-center h-screen">
        <Card className="mx-auto max-w-sm">
          <CardHeader>
            <CardTitle className="text-xl">Sign Up</CardTitle>
            <CardDescription>Enter your information to create an account</CardDescription>
          </CardHeader>
          <form action={handleRegister}>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="first-name">Username</Label>
                  <Input id="first-name" name="username" placeholder="Max" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" name="email" placeholder="m@example.com" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" name="password" required />
                </div>
                <Button type="submit" className="w-full">Create an account</Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Already have an account?{" "}
                <Link href="/auth/login" className="underline">Login</Link>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
