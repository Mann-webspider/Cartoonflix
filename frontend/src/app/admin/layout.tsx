import Navbar from "@/components/custom/navbar";
import Sidebar from "@/components/custom/sidebar";

import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Layout({
  children,
  
}: {
  children: React.ReactNode;
  
}) {
  // const session:any = await getSession()
  //   if( !session && session?.role != "admin" ){
  //       redirect("/auth/login/poikl-ujmnhy-rfvgdc")
  //   }
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
