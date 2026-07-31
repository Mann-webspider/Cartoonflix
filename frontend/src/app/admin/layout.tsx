import Navbar from "@/components/custom/navbar";
import Sidebar from "@/components/custom/sidebar";
import AuthGuard from "@/components/custom/AuthGuard";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex h-svh flex-col">
      <Navbar />
      <div className="grid flex-1 grid-cols-12 overflow-hidden">
        <Sidebar />
        <div className="col-span-10 overflow-y-auto p-8 max-lg:col-span-9">
          <AuthGuard>{children}</AuthGuard>
        </div>
      </div>
    </section>
  );
}
