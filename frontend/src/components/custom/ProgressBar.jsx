"use client";

import React from "react";

export default function ProgressBar({ progress }) {
  return (
    <div className="w-full bg-gray-300 rounded-full h-4">
      <div
        className={`bg-black text-white text-xs font-medium flex  items-center text-center p-0.5 leading-none rounded-full h-4 `}
        style={{ width: `${progress}%` }}
      >
      </div>
        <span className={`text-black font-bold text-md `}>{progress} %</span>
    </div>
  );
}
