"use client";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { useWalletUpdates } from "@/hooks/useWalletUpdates";

export const RaceModal = ({ isOpen, isAnimating, onClose, token }) => {
    if (!isOpen) return null;

    const { realTimeXP } = useWalletUpdates(token);
    const { walletScreen } = useSelector((state) => state.walletTransactions);
    const xpCurrent = realTimeXP !== null && realTimeXP !== undefined ? realTimeXP : (walletScreen?.xp?.current || 0);

    // Get XP tier data from Redux
    const { xpTierData } = useSelector((state) => state.profile) || {};
    const tiers = xpTierData?.tiers || [];

    const progressData = useMemo(() => {
        const currentPoints = xpCurrent || 0;

        // 1. GET RANGES DYNAMICALLY FROM ADMIN TIERS (Avoids hardcoding issues)
        // We find the max values from the 'tiers' array provided by the backend
        const juniorTier = tiers.find(t => t.name?.toLowerCase().includes("junior")) || { xpMax: 1000 };
        const midTier = tiers.find(t => t.name?.toLowerCase().includes("mid") || t.name?.toLowerCase().includes("middle")) || { xpMax: 4099 };
        const seniorTier = tiers.find(t => t.name?.toLowerCase().includes("senior")) || { xpMax: 8000 };

        const JUNIOR_MAX = juniorTier.xpMax;
        const MIDDLE_MAX = midTier.xpMax; // This will now correctly be 4099
        const SENIOR_MAX = seniorTier.xpMax;

        // 2. DEFINE VISUAL MILESTONE POSITIONS
        const JUNIOR_POS = 0;   // Start of bar
        const MID_POS = 50;     // "Mid-level" label position (50%)
        const SENIOR_POS = 100; // "Senior" label position (100%)
        const END_POS = 100;    // End of bar (100%)

        let visualProgress = 0;
        let achievementText = "You're a Junior!";

        // 3. DYNAMIC CALCULATION PER TIER
        if (currentPoints <= JUNIOR_MAX) {
            const segmentProgress = currentPoints / JUNIOR_MAX;
            visualProgress = JUNIOR_POS + (segmentProgress * (MID_POS - JUNIOR_POS));
            achievementText = "Work towards Mid-level rewards!";
        }
        else if (currentPoints <= MIDDLE_MAX) {
            const segmentProgress = (currentPoints - JUNIOR_MAX) / (MIDDLE_MAX - JUNIOR_MAX);
            visualProgress = MID_POS + (segmentProgress * (SENIOR_POS - MID_POS));
            achievementText = "You discovered Mid-level feature";
        }
        else {
            const segmentProgress = (currentPoints - MIDDLE_MAX) / (SENIOR_MAX - MIDDLE_MAX);
            visualProgress = SENIOR_POS + (segmentProgress * (END_POS - SENIOR_POS));
            achievementText = "You've unlocked Senior features!";
        }

        return {
            currentPoints,
            maxPoints: SENIOR_MAX,
            visualProgress: Math.min(visualProgress, 100),
            achievementText,
            labels: { junior: JUNIOR_POS, mid: MID_POS, senior: SENIOR_POS }
        };
    }, [xpCurrent, tiers]); // Added 'tiers' as a dependency

    return (
        <>
            <div
                className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
                onClick={onClose}
                style={{ opacity: isAnimating ? 1 : 0 }}
            />

            <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-12 sm:pt-16 md:pt-20 lg:pt-24">
                <div
                    className={`w-[90%] max-w-[310px] bg-black rounded-[20px] border border-solid border-[#ffffff80] bg-[linear-gradient(0deg,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_100%)] overflow-hidden transform transition-all duration-500 ease-out ${isAnimating ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-full opacity-0 scale-95'}`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="relative p-5">
                        <button className="absolute w-6 h-6 top-4 right-4 z-10" onClick={onClose}>
                            <img alt="Close" src="/assets/animaapp/b76V1iGo/img/close.svg" />
                        </button>

                        <div className="flex justify-center mb-2 mt-1">
                            <img className="w-[85px] h-[74px]" alt="XP icon" src="/assets/animaapp/b76V1iGo/img/pic.svg" />
                        </div>

                        <header className="flex flex-col items-center mb-3">
                            <div className="flex items-center gap-1.5">
                                <h1 className="text-white font-bold text-[22px]">XP Points</h1>
                                <img className="w-[14px] h-[14px]" alt="" src="/assets/animaapp/b76V1iGo/img/vector-8.svg" />
                            </div>
                        </header>

                        <div className="mb-4">
                            <p className="text-white text-[11px] text-center font-light leading-4 px-2">
                                Compete and win extra XP. You currently have <span className="font-semibold text-[#ffb568]">{progressData.currentPoints.toLocaleString()}</span> XP out of <span className="font-semibold text-[#ffb568]">{progressData.maxPoints.toLocaleString()}</span> XP.
                            </p>
                        </div>

                        <section className="flex flex-col w-full items-center gap-3">
                            <img className="w-[42px] h-[45px]" alt="Unlock icon" src="/assets/animaapp/b76V1iGo/img/image-3966-2x.png" />
                            <div className="border-b border-[#383838] w-full pb-2">
                                <div className="text-[#ffb568] font-semibold text-[11px] text-center uppercase tracking-wider">{progressData.achievementText}</div>
                            </div>

                            <div className="w-full relative h-4 text-white text-[10px] font-medium px-1">
                                <span className="absolute left-0">Junior</span>
                                <span className="absolute -translate-x-1/2" style={{ left: `${progressData.labels.mid}%` }}>Mid-level</span>
                                <span className="absolute -translate-x-1/2" style={{ left: `${progressData.labels.senior}%` }}>Senior</span>
                            </div>

                            <div className="w-full h-6 relative flex items-center">
                                <div className="w-full h-[16px] bg-[#2a2a2a] rounded-full border-[3px] border-white/10 overflow-hidden relative">
                                    <div
                                        className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-r-full transition-all duration-700 ease-out"
                                        style={{ width: `${progressData.visualProgress}%` }}
                                    />
                                </div>

                                <div
                                    className="absolute w-6 h-6 z-10 transition-all duration-700 ease-out -translate-x-1/2"
                                    style={{ left: `${progressData.visualProgress}%` }}
                                >
                                    <div className="w-full h-full bg-white rounded-full border-[5px] border-[#FFD700] shadow-md" />
                                </div>
                            </div>

                            <div className="flex items-center gap-1 mt-1">
                                <span className="text-[#d2d2d2] text-xs font-bold">{progressData.currentPoints.toLocaleString()}</span>
                                <img className="w-4 h-[14px]" alt="XP icon" src="/assets/animaapp/b76V1iGo/img/pic-1.svg" />
                                <span className="text-[#888] text-[11px]">out of {progressData.maxPoints.toLocaleString()}</span>
                            </div>
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
};

export default RaceModal;