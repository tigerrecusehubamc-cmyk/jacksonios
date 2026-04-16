"use client";
import React, { useState } from "react";
import Image from "next/image";
import { AccountOverviewSection } from "./components/AccountOverviewSection";
import { GameListSection } from "./components/GameListSection";
import { HomeIndicator } from "../../components/HomeIndicator";

export default function GamesPage() {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchClick = () => {
    setShowSearch(!showSearch);
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement search logic here
    // Search logic would be implemented here
  };
  return (
    <div className="flex justify-center ">
      <div
        className="relative overflow-x-hidden w-full min-h-screen bg-black pb-48 mx-auto"
        data-model-id="289:1500"
      >
        {/* App version */}
        <div className="absolute top-[8px] left-5 font-normal text-[#A4A4A4] text-[10px] leading-3 z-10 [font-family:'Poppins',Helvetica]">
          App Version: V0.0.1
        </div>

        <div className="flex flex-col w-full justify-center items-start gap-2 px-5 py- absolute top-[34px] left-0">
          <div className="flex h-12 items-center justify-between w-full max-w-sm mx-auto rounded-[32px]">
            <h1 className="font-semibold text-white text-xl tracking-[0] leading-5 [font-family:'Poppins',Helvetica] flex-1">
              My Games
            </h1>

            <button
              onClick={handleSearchClick}
              className="w-12 h-12 cursor-pointer hover:opacity-80 transition-opacity duration-200 flex items-center justify-center flex-shrink-0 ml-4"
              aria-label="Search games"
            >
              <Image
                className="w-12 h-12"
                alt="Search"
                src="/assets/animaapp/3mn7waJw/img/search.svg"
                width={48}
                height={48}
                loading="eager"
                decoding="async"
                priority
              />
            </button>
          </div>

          {/* Search Input Field */}
          {showSearch && (
            <div className="w-full max-w-sm mx-auto mt-2 animate-in slide-in-from-top-2 duration-200">
              <form onSubmit={handleSearchSubmit} className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Search games..."
                  className="w-full h-12 px-4 pr-12 bg-[#2a2a2a] border border-[#4d4d4d] rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent [font-family:'Poppins',Helvetica]"
                  autoFocus
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                  aria-label="Submit search"
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </form>
            </div>
          )}
        </div>

        <GameListSection searchQuery={searchQuery} showSearch={showSearch} />
        <AccountOverviewSection />

        <HomeIndicator activeTab="games" />
      </div>
    </div>
  );
}