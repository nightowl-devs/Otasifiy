"use client";

import { SearchIcon } from "lucide-react";

export function SearchBar() {
  return (
    <div className="flex items-center justify-center py-1.5 px-2 rounded-md transition-all duration-150 shadow-md shadow-black backdrop-blur-2xl  bg-zinc-900 border border-zinc-800 active:ring-1 ring-zinc-700 focus-within:ring-1">
      <input
        type="text"
        className="bg-transparent outline-none focus:ring-0 w-80"
        placeholder="Search..."
      />
      <div className="bg-zinc-800 p-1.5 items-center justify-center flex rounded-md">
        <SearchIcon size={16} className="text-zinc-400" />
      </div>
    </div>
  );
}
