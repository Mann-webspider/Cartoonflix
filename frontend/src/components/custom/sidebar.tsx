"use client"
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Play, SquarePlay } from "lucide-react";
import {sidebarLinks} from "../../lib/sidebarlinks"

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
export default function Sidebar() {
    const router = useRouter()
    const pathName = usePathname()
    return (
        <div className="bg-slate-300 dark:bg-black rounded h-[100%] grid col-span-2 max-lg:col-span-3 md:col-span-2">
            <div className="flex flex-col justify-start my-16 mx-4 max-lg:mx-1 items-center">

            <ul className="w-full gap-4 flex flex-col">
                {sidebarLinks.map((link)=>{
                    const isActive = (pathName.includes(link.route) && link.route.length > 6) || pathName === link.route
                    return(

                        <li key={link.label}><Link className={`w-full flex justify-center text-md font-medium gap-4 py-6 px-4 rounded-xl   ${isActive?"bg-primary text-primary-foreground":""}`} id={link.label}  href={link.route}> {link.icons} <p className="max-lg:hidden">{link.label}</p></Link></li>
                    )
})}
                
            </ul>
            </div>
        </div>
    );
}