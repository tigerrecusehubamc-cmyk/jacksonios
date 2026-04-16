"use client";
import Image from 'next/image';
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useWalletUpdates } from "@/hooks/useWalletUpdates";

export default function MyEarningCard({ token }) {
    const router = useRouter();
    const [showTooltip, setShowTooltip] = useState(false);
    const tooltipRef = useRef(null);

    // Use custom hook for real-time wallet updates
    const { realTimeBalance, realTimeXP, realTimeLevel } = useWalletUpdates(token);

    const handleWalletClick = () => {
        router.push("/Wallet");
    };

    // Use real-time data from the hook
    const coinBalance = realTimeBalance;
    const xpCurrent = realTimeXP;
    const xpLevel = realTimeLevel;

    // Calculate XP progress based on documentation requirements
    const xpPerLevel = 100; // XP needed per level (from documentation)

    // Calculate actual level based on total XP (not relying on API level)
    const calculatedLevel = Math.floor(xpCurrent / xpPerLevel) + 1;
    const actualLevel = Math.max(calculatedLevel, 1); // Ensure minimum level 1

    // Calculate XP progress within current level
    const xpInCurrentLevel = xpCurrent % xpPerLevel; // XP within current level (0-99)
    const nextLevel = actualLevel + 1;
    const xpNeededForNextLevel = xpPerLevel; // Always 100 XP needed for next level

    // Calculate progress percentage for dynamic bar
    const progressWidth = Math.min(Math.max((xpInCurrentLevel / xpNeededForNextLevel) * 100, 0), 100);

    const toggleTooltip = () => {
        setShowTooltip(!showTooltip);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside tooltip and not on the info icon button
            const clickedButton = event.target.closest('button[aria-label="More information"]');
            if (
                tooltipRef.current &&
                !tooltipRef.current.contains(event.target) &&
                !clickedButton
            ) {
                setShowTooltip(false);
            }
        };

        if (showTooltip) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showTooltip]);


    return (
        <section className="flex flex-col items-center justify-center gap-2.5 w-full">
            <div className="flex justify-center w-full">
                <div className="relative w-[335px]">
                    {/* Tooltip - Same style and position as 30 Day Streak */}
                    {showTooltip && (
                        <div
                            ref={tooltipRef}
                            className="absolute top-[37px] right-[-3px] z-50 w-[320px] bg-black/95 backdrop-blur-sm rounded-[12px] px-4 pt-3 pb-2 shadow-2xl border border-gray-600/50 animate-fade-in"
                        >
                            <div className="text-white font-medium text-sm [font-family:'Poppins',Helvetica] leading-normal">
                                <div className="text-[#95f2ec] font-semibold mb-1 text-center">
                                    My Earnings
                                </div>
                                <div className="text-center text-gray-200">
                                    Earn XP by completing game tasks. Tier upgrades unlock special features.
                                </div>
                            </div>
                            {/* Arrow pointing up to the info icon */}
                            <div className="absolute top-[-8px] right-[25px] w-4 h-4 bg-black/95 border-t border-l border-gray-600/50 transform rotate-45"></div>
                        </div>
                    )}
                    <div
                        className="relative h-[134px] rounded-[12px] pt-10 overflow-hidden"
                        style={{
                            backgroundImage:
                                "url(/bgearning.png)",
                            backgroundSize: "cover",
                            backgroundColor: "rgba(255, 255, 255, 0.08)",
                            backgroundBlendMode: "lighten",
                            opacity: 0.85,
                        }}
                    >
                        {/* Info icon for tooltip - smaller size similar to RaceSection */}
                        <button
                            onClick={toggleTooltip}
                            className="absolute w-6 h-6 top-[3.5px] right-[3px] z-20 cursor-pointer hover:opacity-90 transition-opacity duration-200 rounded-md rounded-tr-2xl overflow-hidden flex items-center justify-center"
                            aria-label="More information"
                            style={{
                                background: '#6BB5E8',
                            }}
                        >
                            <svg width="14" height="14" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="9" cy="9" r="7.5" fill="white" />
                                <text x="9" y="13" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="bold" fill="#6BB5E8" textAnchor="middle">i</text>
                            </svg>
                        </button>

                        <div className="absolute top-[10px] mt-3 ml-5 max-w-[280px]">
                            <div className="text-[#FFFFFF] text-[14px]">My Earnings</div>
                            <button
                                onClick={handleWalletClick}
                                className="flex items-center gap-1.5 min-w-0 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                                type="button"
                                aria-label="Go to Wallet"
                            >
                                <div className="font-semibold text-white text-xl truncate">
                                    {coinBalance}
                                </div>
                                <Image
                                    width={21}
                                    height={19}
                                    alt="Coin"
                                    src="/dollor.png"
                                    className="flex-shrink-0 -ml-1"
                                    priority
                                    loading="eager"
                                />
                            </button>
                        </div>

                        <div className="absolute top-[39px] mt-1 left-[118px] flex ml-1 items-center gap-2">
                            <div className="font-semibold text-white text-xl">
                                {xpCurrent}
                            </div>
                            <Image
                                width={24}
                                height={19}
                                alt="XP"
                                src="/xp.svg"
                                priority
                                loading="eager"
                                className="flex-shrink-0 -ml-1"
                            />
                        </div>

                        <div className="absolute w-[205px] h-[37px] top-[78px] left-4">
                            <div className="relative w-[178px] h-[37px]">
                                <div className="absolute w-[178px] h-[37px] top-0 left-0 rounded-full bg-gradient-to-r from-yellow-200/30 via-yellow-100/40 to-yellow-200/30 backdrop-blur-sm shadow-inner overflow-hidden">
                                    <div
                                        className="absolute top-0  left-0 h-[37px] bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#f4d03f] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-700 ease-out rounded-full"
                                        style={{
                                            width: `${progressWidth}%`
                                        }}
                                    />
                                    <div className="absolute top-1 left-[3px] z-10 w-[29px] h-[30px] flex items-center justify-center">
                                        <Image
                                            width={29}
                                            height={30}
                                            className="absolute top-0 left-0"
                                            alt="Level badge"
                                            src="/dot.svg"
                                            priority
                                            loading="eager"
                                        />
                                        <div className="relative font-semibold text-[#815c23] text-[14.9px] z-10">
                                            {actualLevel}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <p className="absolute top-[9px] text-center left-[74px] font-semibold text-xs">
                                <span className="text-[#685512]  text-[14.9px]">
                                    {xpInCurrentLevel}
                                </span>
                                <span className="text-[#8d741b80] text-[14.9px] ">/{xpNeededForNextLevel}</span>
                            </p>

                            <div className="absolute top-[3px] left-[146px] opacity-50">
                                <div className="relative w-[30px] h-[32px] flex items-center justify-center">
                                    <div
                                        className="absolute w-[30px] h-[32px] top-0 left-0"
                                        style={{
                                            backgroundImage:
                                                "url(/dot.svg)",
                                            backgroundSize: "cover",
                                        }}
                                    />
                                    <div className="relative font-semibold text-[#815c23] text-[14.9px] z-10">
                                        {nextLevel}
                                    </div>
                                </div>
                            </div>

                            <Image
                                width={13}
                                height={12}
                                className="absolute top-[13px] left-[56px]"
                                alt="Vector"
                                src="/assets/animaapp/V1uc3arn/img/vector.svg"
                                loading="eager"
                                decoding="async"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}