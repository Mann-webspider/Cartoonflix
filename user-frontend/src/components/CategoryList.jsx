import Image from "next/image";
import Link from "next/link";
import React from "react";
import doreamon from "@/../public/images/category/doreamon.png";
import tom from "@/../public/images/category/tom.png";
import shinchan from "@/../public/images/category/shinchan.png";
function CategoryList() {
  let categories = [{ id: "doreamon", color: "from-blue-600/50", img: doreamon },{ id: "tom", color: "#FFB266", img: tom },{ id: "shinchan", color: "#FE3964", img: shinchan }];
  return (
    <section className="px-4 py-8">
      <h2 className="text-2xl font-bold text-white mb-6">Categories</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
      {categories.map((val)=>(
        <Link
          href="#"
          className="relative aspect-[2/1] rounded-lg overflow-hidden transition-transform hover:scale-105 hover:shadow-[0_0_20px_rgba(0,157,220,0.5)]"
        >
          <Image
            src={val.img}
            alt={val.id}
            className="object-contain w-full h-full"
          />
          <div className={`absolute inset-0 bg-gradient-to-t from-blue-500/50 to-transparent z-[-1]`} />
        </Link>
      ))}
        
      </div>
    </section>
  );
}

export default CategoryList;
