import Navbar from "@/components/custom/navbar";
import Sidebar from "@/components/custom/sidebar";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="h-svh  flex flex-col ">
        <Navbar/>      
        <div className="grid grid-cols-12  h-full ">
          <Sidebar/>
          {children}
        </div>
      
    </section>
  );
}
