'use client'
import React, { useEffect, useState,useRef  } from "react";
import "./css/Songlist.css"
import Image from "next/image";

// const songs = [
//     {
//       id: "tom",
//       src: "/songs/Tom.mp3", // Change this to your actual song path
//       image: "/images/tom.png" // Change this to your actual image path
//     },
//     {
//       id: "doreamon",
//       src: "/songs/doreamon.mp3",
//       image: "/images/doreamon.png"
//     },
//     // {
//     //   id: "shinchan",
//     //   src: "/songs/mickey.mp3",
//     //   image: "/images/mickey.jpg"
//     // }
//   ];
function Songlist() {
    const songs = [
        {
          id: "tom",
          src: "/songs/Tom.mp3", // Change this to your actual song path
          image: "/images/tom.png" // Change this to your actual image path
        },
        {
          id: "doreamon",
          src: "/songs/doreamon.mp3",
          image: "/images/doreamon.png"
        },
        {
          id: "stop",
          src: "!",
          image: "/images/shinchan.png"
          
        }
      ];
      const [currentSong, setCurrentSong] = useState(songs[0].src);
      const audioRef = useRef(null);
    
      useEffect(() => {
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        if (currentSong == "!") {
            audioRef.current.pause();
            return
          }
        audioRef.current.src = currentSong;
        audioRef.current.loop = true;
        audioRef.current.volume= 0.15;
        audioRef.current.play();
    
        return () => {
          if (audioRef.current) {
            audioRef.current.pause();
          }
        };
      }, [currentSong]);

  return (
    <div>
    <div className="container">
      <div className="line"></div>
      {songs.map((song) => (
        <label key={song.id} className="label" htmlFor={song.id}>
          <input
            id={song.id}
            type="radio"
            name="bgSong"
            onChange={() => setCurrentSong(song.src)}
            defaultChecked={song.id === "tom"}
          />
          <div className="button">
            <Image src={song.image} width={64} height={64} alt={song.id} className=" object-contain" />
          </div>
        </label>
      ))}
    </div>
  </div>
  );
}

export default Songlist;
