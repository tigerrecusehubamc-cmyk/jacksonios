"use client";
import React from "react";
import Image from "next/image";

/**
 * TitleSection Component
 * 
 * Displays the header section of the 30-Day Win Streak screen with:
 * - Rotating badge with current streak day
 * - Close button for navigation
 * - Motivational tagline
 * - Info button for help
 * 
 * @param {number} currentStreak - Current streak day (1-30)
 * @param {function} onClose - Handler for close button
 * @param {function} onInfoClick - Handler for info icon
 */
export const TitleSection = ({ currentStreak = 1, onClose, onInfoClick }) => {
    return (
        <section className="flex flex-col w-full max-w-[375px] fixed top-0 left-0 right-0 mx-auto items-start gap-1 pt-2 pb-0 px-0 z-10 bg-black">
            <header className="flex items-start justify-between pl-[90px] pr-4 pt-1 pb-0 relative self-stretch w-full flex-[0_0_auto]">
                {/* Rotating Badge with Streak Day */}
                <div
                    className="relative w-[43.69px] h-[150.24px] mt-[-53.27px] mb-[-53.27px] -rotate-90"
                    role="img"
                    aria-label={`${currentStreak} days win streak badge`}
                >
                    {/* Background Vectors */}
                    <img
                        className="absolute w-[256.04%] h-[20.65%] top-[40.18%] left-[-92.51%] rotate-90"
                        alt=""
                        src="/assets/animaapp/1RFP1hGC/img/vector-352.svg"
                        role="presentation"
                        loading="eager"
                        decoding="async"
                    />

                    <img
                        className="absolute w-[345.60%] h-[20.63%] top-[41.93%] left-[-128.87%] rotate-90"
                        alt=""
                        src="/assets/animaapp/1RFP1hGC/img/vector-351.svg"
                        role="presentation"
                        loading="eager"
                        decoding="async"
                    />

                    {/* Day Number Badge */}
                    <div className="absolute w-[80.16%] h-[29.08%] top-[-4.51%] left-[12.21%] rotate-90">
                        <img
                            className="absolute w-[90.18%] h-[95.03%] top-[-3.14%] left-0 -rotate-90"
                            alt=""
                            src="/assets/animaapp/1RFP1hGC/img/vector-349.svg"
                            role="presentation"
                            loading="eager"
                            decoding="async"
                        />

                        <img
                            className="absolute w-[95.13%] h-[105.03%] top-[-2%] left-[-3.62%] -rotate-90"
                            alt=""
                            src="/assets/animaapp/1RFP1hGC/img/vector-350.svg"
                            role="presentation"
                            loading="eager"
                            decoding="async"
                        />

                        {/* Current Streak Day Number */}
                        <div className="w-[82.80%] h-[66.37%] top-[21.25%] left-0 rotate-[-4.00deg] [text-shadow:0px_2px_0px_#000000] [-webkit-text-stroke:1px_#000000] [font-family:'Lilita_One',Helvetica] text-[#e9fb53] text-[25px] text-center tracking-[-0.50px] leading-[normal] absolute font-normal whitespace-nowrap rounded-full flex items-center justify-center transition-all duration-300 hover:scale-105">
                            30
                        </div>
                    </div>

                    {/* "DAYS WIN STREAK" Text */}
                    <div className="absolute w-[254.05%] text-yellow-400 h-[10.65%] mb-10 top-[45%] rotate-[88.00deg] [text-shadow:0px_1px_0px_#000000] [-webkit-text-stroke:0.5px_#000000] [font-family:'Lilita_One',Helvetica] font-normal text-sm text-center tracking-[-0.28px] leading-[normal] whitespace-nowrap transition-all duration-500 hover:scale-105">
                        DAYS WIN STREAK
                    </div>
                </div>

                {/* Close Button */}
                <button
                    type="button"
                    onClick={onClose}
                    className="relative flex-[0_0_auto] cursor-pointer hover:opacity-80 transition-opacity duration-200 p-2 rounded-lg hover:bg-white/10"
                    aria-label="Close streak information"
                >
                    <img
                        className="relative flex-[0_0_auto] w-6 h-6"
                        alt="Close"
                        src="/assets/animaapp/1RFP1hGC/img/close.svg"
                        loading="eager"
                        decoding="async"
                        width="24"
                        height="24"
                    />
                </button>
            </header>

            {/* Motivational Banner */}
            <div className="flex h-[83.85px] items-center justify-around gap-3 px-4 py-0 relative self-stretch w-full">
                <img
                    className="relative w-[305px] h-[73.86px] ml-[-1.00px] mt-1 mr-[-1.00px] aspect-[4.13]"
                    alt="Reach levels without falling down! The higher you reach, the cooler reward you will get."
                    src="/assets/animaapp/1RFP1hGC/img/image-3996-2x.png"
                    loading="eager"
                    decoding="async"
                    width="305"
                    height="74"
                />

                {/* Info Button */}
                <button
                    onClick={onInfoClick}
                    className="absolute top-8.5 right-10 w-8 h-8 flex items-center justify-center  rounded-full cursor-pointer  transition-all duration-200"
                    aria-label="Show streak information"
                >
                    <span className="text-white text-lg font-bold">ℹ️</span>
                </button>
            </div>
        </section>
    );
};

