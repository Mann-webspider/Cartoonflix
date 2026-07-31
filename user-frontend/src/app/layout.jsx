import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "CartoonFlix",
  description: "A minimalist streaming home for animated films and series.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-bg text-text">
        <Navbar />
        <main>{children}</main>
        <footer className="border-t border-border mt-20 py-8 text-center text-sm text-muted">
          CartoonFlix — a portfolio streaming platform.
        </footer>
      </body>
    </html>
  );
}
