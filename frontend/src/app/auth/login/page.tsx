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

  const handleUserLogin = async (formData: FormData) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-type": "application/json" },
        body: JSON.stringify({
          email: formData.get("email"),
          password: formData.get("password"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Login failed");
      setCookie(TOKEN_COOKIE, data.token);
      setCookie(USER_COOKIE, JSON.stringify(data.user));
      toast({ title: "Logged in", variant: "success" });
      router.push("/admin");
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" });
    }
  };

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
                  <Input id="email" type="email" name="email" placeholder="m@example.com" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" name="password" required />
                </div>
                <Button type="submit" className="w-full">Login</Button>
              </div>
              <div className="mt-4 text-center text-sm">
                Don&apos;t have an account?{" "}
                <Link href="/auth/signup" className="underline">Sign up</Link>
              </div>
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
