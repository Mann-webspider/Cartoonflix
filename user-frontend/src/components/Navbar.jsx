import Image from "next/image";
import Link from "next/link"
import { Menu, Search } from "lucide-react"
import React from "react";
import logo from "../../public/logo/fontbolt.png"
import Songlist from "./Songlist";
function Navbar() {
  return (
    <header className="flex items-center gap-4 p-4 bg-[#1C122B]">
        <button className="text-gray-400 hover:text-white">
          <Menu className="h-6 w-6" />
        </button>
        <Link href="/" className="text-white text-xl font-bold">
          <Image src={logo} width={200} height={100}/>
        </Link>
        <div className="relative flex-1 max-w-xs">
          <input
            type="search"
            placeholder="Search"
            className="w-full bg-gray-700/50 rounded px-4 py-1.5 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
          <Songlist/>
        <div className="h-8 w-8 rounded-full bg-gray-400" />
      </header>

  );
}

export default Navbar;
