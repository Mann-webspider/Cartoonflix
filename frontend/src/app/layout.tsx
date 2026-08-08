import type { Metadata } from "next";
import "@fontsource-variable/archivo";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "CartoonFlix admin",
  description: "Local content pipeline for the CartoonFlix library.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // The admin is a working tool used at a desk in daylight, so it stays
    // light — unlike the viewer, which is watched in a dim room at night.
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
