"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

const StreakSection = () => {
    const router = useRouter();
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipRef = useRef(null);

    // OPTIMIZED: Memoize selector to prevent unnecessary re-renders
    const currentStreak = useSelector((state) => state.streak.currentStreak);

    // OPTIMIZED: Memoize event handlers
    const toggleTooltip = useCallback(() => {
        setShowTooltip(!showTooltip);
    }, [showTooltip]);

    const handleBannerClick = useCallback(() => {
        router.push('/win-streak');
    }, [router]);

    // OPTIMIZED: Memoize streak data calculations
    const streakData = useMemo(() => {
        const hasStreak = currentStreak > 0;
        const dayText = hasStreak ? `Day ${currentStreak} of 30` : '30 Days Streak';
        const statusText = hasStreak ? 'Keep it up! 🔥' : 'if you play game daily';
        const titleText = hasStreak ? 'Great Progress!' : 'Exciting Rewards';

        return {
            hasStreak,
            dayText,
            statusText,
            titleText
        };
    }, [currentStreak]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
                setShowTooltip(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div className="flex flex-col w-full items-start relative -mb-4">
            <div
                className="h-[111px] rounded-[20px] overflow-hidden bg-[linear-gradient(64deg,rgba(41,138,171,1)_0%,rgba(41,171,162,1)_100%)] relative w-full cursor-pointer hover:scale-[1.02] transition-transform duration-200 active:scale-[0.98]">
                <div
                    onClick={handleBannerClick}
                    className="relative w-[285px] h-[207px] top-[-73px] left-5">
                    <div className="top-[88px] left-0 font-medium absolute [font-family:'Poppins',Helvetica] text-white text-base tracking-[0] leading-6 whitespace-nowrap">
                        {streakData.dayText}
                    </div>
                    <div className="absolute top-[141px] left-0 [font-family:'Poppins',Helvetica] font-medium text-white text-base tracking-[0] leading-6 whitespace-nowrap">
                        {streakData.statusText}
                    </div>
                    <div className="absolute w-[285px] h-[207px] top-0 left-0">
                        <div className="top-[114px] left-0 text-[#b3ffac] absolute [font-family:'Poppins',Helvetica] font-semibold text-[26px] tracking-[0] leading-6 whitespace-nowrap">
                            {streakData.titleText}
                        </div>
                        <img
                            className="absolute w-[66px] h-[207px] top-0 left-[219px] aspect-[0.32]"
                            alt="Image"
                            src="/assets/animaapp/xCaMzUYh/img/image-3995-2x.png"
                            loading="eager"
                            decoding="async"
                            width="66"
                            height="207"
                        />
                    </div>
                </div>

                <button
                    onClick={toggleTooltip}
                    className="absolute w-8 h-8 top-[-4px] right-[-3px] z-20 cursor-pointer hover:opacity-80 transition-opacity duration-200 rounded-tr-lg rounded-bl-lg overflow-hidden flex items-center justify-center"
                    aria-label="More information"
                >
                    <svg width="24" height="24" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 0L28 0C32.4183 0 36 3.58172 36 8V36H8C3.58172 36 0 32.4183 0 28L0 0Z" fill="#1D8E87" />
                        <path fillRule="evenodd" clipRule="evenodd" d="M29.52 18.0005C29.52 21.0558 28.3063 23.9859 26.1459 26.1463C23.9854 28.3068 21.0553 29.5205 18 29.5205C14.9447 29.5205 12.0145 28.3068 9.85411 26.1463C7.69369 23.9859 6.47998 21.0558 6.47998 18.0005C6.47998 14.9452 7.69369 12.015 9.85411 9.8546C12.0145 7.69418 14.9447 6.48047 18 6.48047C21.0553 6.48047 23.9854 7.69418 26.1459 9.8546C28.3063 12.015 29.52 14.9452 29.52 18.0005ZM19.44 12.2405C19.44 12.6224 19.2883 12.9886 19.0182 13.2587C18.7482 13.5288 18.3819 13.6805 18 13.6805C17.6181 13.6805 17.2518 13.5288 16.9817 13.2587C16.7117 12.9886 16.56 12.6224 16.56 12.2405C16.56 11.8586 16.7117 11.4923 16.9817 11.2222C17.2518 10.9522 17.6181 10.8005 18 10.8005C18.3819 10.8005 18.7482 10.9522 19.0182 11.2222C19.2883 11.4923 19.44 11.8586 19.44 12.2405ZM16.56 16.5605C16.1781 16.5605 15.8118 16.7122 15.5417 16.9822C15.2717 17.2523 15.12 17.6186 15.12 18.0005C15.12 18.3824 15.2717 18.7486 15.5417 19.0187C15.8118 19.2888 16.1781 19.4405 16.56 19.4405V23.7605C16.56 24.1424 16.7117 24.5086 16.9817 24.7787C17.2518 25.0488 17.6181 25.2005 18 25.2005H19.44C19.8219 25.2005 20.1882 25.0488 20.4582 24.7787C20.7283 24.5086 20.88 24.1424 20.88 23.7605C20.88 23.3786 20.7283 23.0123 20.4582 22.7422C20.1882 22.4722 19.8219 22.3205 19.44 22.3205V18.0005C19.44 17.6186 19.2883 17.2523 19.0182 16.9822C18.7482 16.7122 18.3819 16.5605 18 16.5605H16.56Z" fill="white" fillOpacity="0.7" />
                    </svg>
                </button>
            </div>

            {showTooltip && (
                <div
                    ref={tooltipRef}
                    className="absolute top-[34px] -right-[7px] z-50 w-[340px] bg-black/95 backdrop-blur-sm rounded-[12px] px-4 pt-3 pb-2 shadow-2xl border border-gray-600/50 animate-fade-in"
                >
                    <div className="text-white font-medium text-sm [font-family:'Poppins',Helvetica] leading-normal">
                        <div className="text-[#95f2ec] font-semibold mb-1 text-center">
                            30 Days Streak
                        </div>
                        <div className="text-center text-gray-200">
                            Complete at least 1 task per day to climb. Missing a day resets you to the last milestone.
                        </div>
                    </div>
                    <div className="absolute top-[-8px] right-[25px] w-4 h-4 bg-black/95 border-t border-l border-gray-600/50 transform rotate-45"></div>
                </div>
            )}
        </div>
    );
};

export default StreakSection;
