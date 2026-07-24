import {
    Avatar,
    AvatarFallback,
    AvatarImage,
  } from "@/components/ui/avatar"
export default function Navbar() {
    return (
        <div className=" border-b text-accent-foreground h-16  rounded flex  justify-between px-12 items-center">
      <div className="logo text-2xl text-foreground font-semibold uppercase">cartoonflix</div>
      <div className="avatar">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
      </div>
    </div>
    );
}