"use client";
import Image from 'next/image';
import React from "react";

// Matches logic from Wallet/Components/MyEarningCard for accurate level & progress calculation
export default function Earnings({ xpCurrent = 0, xpLevel, coinBalance = 0 }) {
    // Level calculation based purely on total XP for consistency
    const xpPerLevel = 100; // XP needed per level

    // Calculate actual level based on total XP (do NOT rely on xpLevel prop for progress bar display)
    const calculatedLevel = Math.floor(xpCurrent / xpPerLevel) + 1;
    const actualLevel = Math.max(calculatedLevel, 1);

    // XP progress within current level
    const xpInCurrentLevel = xpCurrent % xpPerLevel;
    const nextLevel = actualLevel + 1;
    const xpNeededForNextLevel = xpPerLevel;
    const progressWidth = Math.min(Math.max((xpInCurrentLevel / xpNeededForNextLevel) * 100, 0), 100);

    return (
        <section className="flex flex-col items-center gap-2.5 w-full">
            <div className="flex justify-center w-full">
                <div className="relative w-[335px]">
                    <div
                        className="relative h-[134px] rounded-[12px] pt-30 overflow-hidden"
                        style={{
                            backgroundImage: "url(/bgearning.png)",
                            backgroundSize: "cover",
                        }}
                    >
                        <div className="absolute top-[10px] mt-3 ml-5 max-w-[280px]">
                            <div className="text-[#FFFFFF] text-[14px]">My Earnings</div>
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="font-semibold text-white text-2xl truncate">{coinBalance}</div>
                                <Image
                                    width={23}
                                    height={24}
                                    alt="Coin"
                                    src="/dollor.png"
                                    className="flex-shrink-0"
                                    loading="eager"
                                    decoding="async"
                                    priority
                                />
                            </div>
                        </div>

                        <div className="absolute top-[39px] mt-1 left-[103px] flex items-center ml-3 gap-2">
                            <div className="font-semibold text-white text-2xl">{xpCurrent}</div>
                            <Image
                                width={26}
                                height={21}
                                alt="XP"
                                src="/xp.svg"
                                loading="eager"
                                decoding="async"
                                priority
                            />
                        </div>

                        <div className="absolute w-[205px] h-[37px] top-[78px] left-4">
                            <div className="relative w-[178px] h-[37px]">
                                {/* Progress bar background */}
                                <div className="absolute w-[178px] h-[37px] top-0 left-0 rounded-full bg-gradient-to-r from-yellow-200/30 via-yellow-100/40 to-yellow-200/30 backdrop-blur-sm shadow-inner overflow-hidden">
                                    {/* Progress yellow fill */}
                                    <div
                                        className="absolute top-0 left-0 h-[37px] bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#f4d03f] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] transition-all duration-700 ease-out rounded-full"
                                        style={{ width: `${progressWidth}%` }}
                                    />
                                    {/* Level badge overlay */}
                                    <Image
                                        width={29}
                                        height={30}
                                        className="absolute top-1 left-[3px] z-10"
                                        alt="Level badge"
                                        src="/dot.svg"
                                        loading="eager"
                                        decoding="async"
                                        priority
                                    />
                                    <div className="absolute top-[8px] left-[14px] font-semibold text-[#815c23] text-[14.9px] z-10">
                                        {actualLevel}
                                    </div>
                                </div>
                            </div>

                            <p className="absolute top-[9px] text-center left-[74px] font-semibold text-xs">
                                <span className="text-[#685512] text-[14.9px]">
                                    {xpInCurrentLevel}
                                </span>
                                <span className="text-[#8d741b80] text-[14.9px]">/{xpNeededForNextLevel}</span>
                            </p>

                            <div className="absolute top-[3px] left-[146px] opacity-50">
                                <div className="relative w-[30px] h-[32px]">
                                    <div className="absolute w-[30px] h-[32px] top-0 left-0">
                                        <div
                                            className="h-[32px]"
                                            style={{
                                                backgroundImage: "url(/dot.svg)",
                                                backgroundSize: "cover",
                                            }}
                                        />
                                    </div>
                                    <div className="absolute top-[4px] left-[10px] font-semibold text-[#815c23] text-[14.9px]">
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
                                priority
                            />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}