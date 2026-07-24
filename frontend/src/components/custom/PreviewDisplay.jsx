import { Label } from "@radix-ui/react-label";
import Image from "next/image";
import React from "react";
import Video from "next-video";
import Player from "next-video/player";

function PreviewDisplay({ data }) {
  return (
    <div className="p-12 flex-col   w-full">
      <div className=" w-fit">
        <Label>Movie</Label>
        <Video
          src={data.video_url}
          width={720}
          height={480}
          poster={data.thumbnail_url}
         
        >
          <Image
            src={data.thumbnail_url}
            slot="poster"
            alt={data.title}
            width={720}
            height={480}
          ></Image>
        </Video>

        {/* <Player
          src={data.video_url}
          poster={data.thumbnail_url}
          width={720}
          height={480}
        /> */}
      </div>
      <div className="flex gap-12">
        <div>
          <Label>Movie Thumbnail</Label>
          <Image
            src={data.thumbnail_url}
            width={480}
            height={360}
            alt={data.title}
          ></Image>
        </div>
        <div>
          <Label>Movie poster</Label>
          <Image
            src={data.poster_url}
            width={360}
            height={240}
            alt={data.title}
          ></Image>
        </div>
      </div>
    </div>
  );
}

export default PreviewDisplay;
