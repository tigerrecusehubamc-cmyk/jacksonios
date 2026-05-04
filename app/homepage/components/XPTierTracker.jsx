"use client";
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { XPPointsModal } from "../../../components/XPPointsModal";
import { useWalletUpdates } from "@/hooks/useWalletUpdates";
import { getXPTierProgressBar } from "@/lib/api";
import { onXPLevelReached } from "@/lib/adjustService";

// XP from walletScreen (https://rewardsuatapi.hireagent.co/api/wallet-screen) -> xp.current
const XPTierTracker = ({ stats, token }) => {
    const [isXPModalOpen, setIsXPModalOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const buttonRef = useRef(null);
    const prevTierNameRef = useRef(null); // tracks last known tier to detect upgrades
    const walletScreen = useSelector((state) => state.walletTransactions.walletScreen);
    const { realTimeXP } = useWalletUpdates(token);
    const xpCurrent = walletScreen?.xp?.current ?? realTimeXP ?? 0;

    // Cache key for localStorage
    const CACHE_KEY = 'xpTierProgressBar';
    const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

    // Load cached data synchronously on component initialization (before first render)
    const [xpTierData, setXPTierData] = useState(() => {
        if (typeof window === 'undefined') return null;

        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                const cacheAge = Date.now() - (parsed.timestamp || 0);

                // Use cache if it's fresh (< 5 minutes) or stale (show while refreshing)
                if (parsed.data) {
                    return parsed.data;
                }
            }
        } catch (err) {
            // Failed to load cache - silently handle
        }
        return null;
    });

    // Initialize prevTierNameRef from cached data so we don't fire on first load
    useEffect(() => {
        if (xpTierData?.currentTier?.name) {
            prevTierNameRef.current = xpTierData.currentTier.name;
        }
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Fire onXPLevelReached when tier upgrades to mid or senior (never on first load)
    const detectTierUpgrade = (newData) => {
        const newTierName = newData?.currentTier?.name || "";
        const prevTierName = prevTierNameRef.current;
        if (prevTierName && newTierName && prevTierName !== newTierName) {
            const lower = newTierName.toLowerCase();
            if (lower.includes("mid")) onXPLevelReached("mid");
            else if (lower.includes("senior")) onXPLevelReached("senior");
        }
        prevTierNameRef.current = newTierName;
    };

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isXPModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isXPModalOpen]);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isXPModalOpen) {
                setIsAnimating(false);
                setTimeout(() => {
                    setIsXPModalOpen(false);
                }, 500);
            }
        };
        if (isXPModalOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isXPModalOpen]);

    // Fetch fresh data immediately if no cache exists, otherwise fetch in background
    useEffect(() => {
        if (!token) return;

        // Check cache validity
        let shouldFetch = false;
        let hasValidCache = false;

        try {
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                const cacheAge = Date.now() - (parsed.timestamp || 0);
                hasValidCache = cacheAge < CACHE_TTL;
                shouldFetch = !hasValidCache; // Fetch if cache is expired
            } else {
                shouldFetch = true; // No cache, fetch immediately
            }
        } catch (err) {
            // Failed to read cache, fetch fresh data
            shouldFetch = true;
        }

        const fetchData = async () => {
            try {
                const response = await getXPTierProgressBar(token);

                if (response.success && response.data) {
                    detectTierUpgrade(response.data);
                    // Update cache and state silently
                    const cacheData = {
                        data: response.data,
                        timestamp: Date.now(),
                    };
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                    } catch (err) {
                        // Failed to save cache - silently handle
                    }
                    setXPTierData(response.data);
                }
            } catch (err) {
                // Failed to fetch fresh data (non-blocking) - silently handle
            }
        };

        if (shouldFetch) {
            // If cache is expired or doesn't exist, fetch immediately
            fetchData();
        }
        // If we have valid cache, don't fetch - use cached data
        // Background refresh will happen on window focus or when cache expires
    }, [token]); // Only depend on token, not xpTierData

    // Refresh when app comes to foreground (similar to profile)
    useEffect(() => {
        if (!token) return;

        const handleFocus = async () => {
            // Check if cache is still fresh (less than 1 minute old) - skip refresh if so
            try {
                const cachedData = localStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const parsed = JSON.parse(cachedData);
                    const cacheAge = Date.now() - (parsed.timestamp || 0);
                    // If cache is less than 1 minute old, skip refresh
                    if (cacheAge < 60 * 1000) {
                        return;
                    }
                }
            } catch (err) {
                // Failed to read cache, proceed with refresh
            }

            try {
                const response = await getXPTierProgressBar(token);
                if (response.success && response.data) {
                    detectTierUpgrade(response.data);
                    const cacheData = {
                        data: response.data,
                        timestamp: Date.now(),
                    };
                    try {
                        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                    } catch (err) {
                        // Failed to save cache - silently handle
                    }
                    setXPTierData(response.data);
                }
            } catch (err) {
                // Failed to refresh on focus - silently handle
            }
        };

        window.addEventListener("focus", handleFocus);
        return () => {
            window.removeEventListener("focus", handleFocus);
        };
    }, [token]);

    // OPTIMIZED: Memoize progress data from API response; xp.current from walletScreen
    const progressData = useMemo(() => {
        // Use API data if available, otherwise fallback to stats prop
        if (xpTierData) {
            const currentXP = (xpCurrent !== null && xpCurrent !== undefined) ? xpCurrent : (xpTierData.currentXP || 0);
            const totalXPFromProfile = undefined; // walletScreen.xp has no total — use xpTierData tiers instead
            const currentTier = xpTierData.currentTier || null;
            const tiers = xpTierData.tiers || [];

            // Progress bar dimensions (288px is the usable width)
            const BAR_WIDTH = 288;
            // Label positions on the bar (relative to the 288px width)
            const JUNIOR_POS = 0;
            const MID_LEVEL_POS = 114;
            const SENIOR_POS = 259;

            let progressBarStart = 0; // Start position of progress bar fill
            let progressBarWidth = 0; // Width of progress bar fill
            let indicatorPosition = 0; // Position of the indicator circle
            let totalXP = 1000;

            if (currentTier && tiers.length > 0) {
                if (totalXPFromProfile != null && totalXPFromProfile > 0) {
                    totalXP = totalXPFromProfile;
                } else {
                    const maxTier = tiers.reduce((max, tier) =>
                        (tier.xpMax > (max?.xpMax || 0)) ? tier : max, tiers[0]
                    );
                    totalXP = maxTier.xpMax || currentTier.xpMax || 1000;
                }

                const tierName = currentTier.name || "";
                const tierRange = currentTier.xpMax - currentTier.xpMin;

                // Find tier boundaries
                const juniorTier = tiers.find(t => t.name === "Junior" || t.name?.toLowerCase() === "junior");
                const midTier = tiers.find(t => t.name === "Middle" || t.name === "Mid-level" || t.name?.toLowerCase() === "middle" || t.name?.toLowerCase() === "mid-level");
                const seniorTier = tiers.find(t => t.name === "Senior" || t.name?.toLowerCase() === "senior");

                // Calculate progress within current tier (0-100%)
                // If user has fallen below tier minimum, show progress based on tier XP value
                const adjustedXP = Math.max(currentXP, currentTier.xpMin);
                const tierProgress = tierRange > 0
                    ? Math.min(Math.max((adjustedXP - currentTier.xpMin) / tierRange, 0), 1)
                    : 0;

                // Determine bar position and width based on tier
                if (tierName === "Junior" || tierName.toLowerCase() === "junior") {
                    // Junior tier: Show progress between Junior and Mid-level labels
                    progressBarStart = JUNIOR_POS;
                    const segmentWidth = MID_LEVEL_POS - JUNIOR_POS; // 114px
                    progressBarWidth = segmentWidth * tierProgress;
                    indicatorPosition = JUNIOR_POS + progressBarWidth;
                } else if (tierName === "Middle" || tierName === "Mid-level" || tierName.toLowerCase() === "middle" || tierName.toLowerCase() === "mid-level") {
                    // Middle tier: Start from Junior, cover Junior segment completely, then fill Mid segment based on progress
                    progressBarStart = JUNIOR_POS;
                    const juniorSegmentWidth = MID_LEVEL_POS - JUNIOR_POS; // 114px (Junior segment)
                    const midSegmentWidth = SENIOR_POS - MID_LEVEL_POS; // 145px (Mid segment)
                    // Fill junior segment completely + mid segment based on progress
                    progressBarWidth = juniorSegmentWidth + (midSegmentWidth * tierProgress);
                    indicatorPosition = JUNIOR_POS + progressBarWidth;
                } else if (tierName === "Senior" || tierName.toLowerCase() === "senior") {
                    // Senior tier: Start from Junior, cover Junior and Mid segments completely, then fill Senior segment based on progress
                    progressBarStart = JUNIOR_POS;
                    const juniorSegmentWidth = MID_LEVEL_POS - JUNIOR_POS; // 114px (Junior segment)
                    const midSegmentWidth = SENIOR_POS - MID_LEVEL_POS; // 145px (Mid segment)
                    const seniorSegmentWidth = BAR_WIDTH - SENIOR_POS; // 29px (Senior segment to end)
                    // Fill junior and mid segments completely + senior segment based on progress
                    progressBarWidth = juniorSegmentWidth + midSegmentWidth + (seniorSegmentWidth * tierProgress);
                    indicatorPosition = JUNIOR_POS + progressBarWidth;
                } else {
                    // Fallback: Show progress from start
                    progressBarStart = 0;
                    progressBarWidth = BAR_WIDTH * tierProgress;
                    indicatorPosition = progressBarWidth;
                }

                // Ensure values are within bounds
                progressBarWidth = Math.min(progressBarWidth, BAR_WIDTH - progressBarStart);
                indicatorPosition = Math.max(0, Math.min(indicatorPosition, BAR_WIDTH - 6));
            } else {
                totalXP = totalXPFromProfile ?? currentTier?.xpMax ?? xpTierData.totalXP ?? 1000;
                const progressPercentage = totalXP > 0 ? Math.min((currentXP / totalXP) * 100, 100) : 0;
                progressBarStart = 0;
                progressBarWidth = (BAR_WIDTH * progressPercentage) / 100;
                indicatorPosition = progressBarWidth;
            }

            return {
                title: xpTierData.title || "You're off to a great start!",
                currentXP: currentXP,
                totalXP: totalXP,
                levels: xpTierData.levels || ["Junior"],
                progressPercentage: 0, // Not used anymore, kept for compatibility
                currentTier: currentTier,
                tiers: tiers,
                // New properties for tier-based progress bar
                progressBarStart: progressBarStart,
                progressBarWidth: progressBarWidth,
                indicatorPosition: indicatorPosition,
            };
        }

        // Fallback to stats prop or walletScreen xp if xpTierData not loaded yet
        const currentXp = (xpCurrent !== null && xpCurrent !== undefined) ? xpCurrent : (stats?.currentXP ?? 0);
        const totalXpGoal = 1000;
        const progressPercentage = Math.min((currentXp / totalXpGoal) * 100, 100);
        const BAR_WIDTH = 288;
        const progressBarWidth = (BAR_WIDTH * progressPercentage) / 100;

        return {
            title: "You're off to a great start!",
            currentXP: currentXp,
            totalXP: totalXpGoal,
            levels: ["Junior"],
            progressPercentage: progressPercentage,
            currentTier: null,
            tiers: [],
            progressBarStart: 0,
            progressBarWidth: progressBarWidth,
            indicatorPosition: progressBarWidth,
        };
    }, [xpTierData, stats?.currentXP, xpCurrent]);

    // OPTIMIZED: Memoize event handler with smooth animation
    const handleModalOpen = useCallback(() => {
        setIsXPModalOpen(true);
        // Small delay to ensure DOM is updated before animation starts
        setTimeout(() => {
            setIsAnimating(true);
        }, 100);
    }, []);

    const handleModalClose = useCallback(() => {
        setIsAnimating(false);
        // Delay closing to allow animation to complete
        setTimeout(() => {
            setIsXPModalOpen(false);
        }, 500);
    }, []);

    const toggleExpanded = useCallback(() => {
        setIsExpanded(!isExpanded);
    }, [isExpanded]);

    return (
        <div
            className="flex flex-col items-center relative"
            data-model-id="4001:7762"
        >
            <section className={`relative w-[335px] bg-black rounded-[10px] border border-solid border-neutral-700 transition-all duration-300 overflow-hidden ${isExpanded ? "h-[620px]" : "h-[160px]"}`}>
                <div className="absolute w-[304px] h-6 top-[84px] left-3.5">
                    <div className="relative w-full h-6">
                        {/* Progress bar background */}
                        <div className="absolute w-full h-[19px] top-0.5 left-0 bg-[#373737] rounded-[32px] border-4 border-solid border-[#ffffff33]" />

                        {/* Progress bar fill - positioned based on current tier */}
                        <div
                            className="absolute h-[11px] top-1.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-[32px]"
                            style={{
                                left: `${1 + (progressData.progressBarStart || 0)}px`,
                                width: `${Math.max(0, Math.min(progressData.progressBarWidth || 0, 288 - (progressData.progressBarStart || 0)))}px`,
                            }}
                        />

                        {/* Current progress indicator - moves along with progress */}
                        <div
                            className="absolute w-6 h-6 top-0 bg-white rounded-full border-5 border-[#FFD700] z-10"
                            style={{
                                left: `${Math.max(0, Math.min(1 + (progressData.indicatorPosition || 0) - 6, 288 - 6))}px`,
                            }}
                        />

                        {/* Right side circle - positioned at end of current tier segment */}
                        {(() => {
                            const tierName = progressData.currentTier?.name || "";
                            let endPosition = 288 - 6; // Default to end (Senior position)

                            if (tierName === "Junior" || tierName.toLowerCase() === "junior") {
                                // Junior tier: circle at Mid-level position (114px)
                                endPosition = 114 - 6;
                            } else if (tierName === "Middle" || tierName === "Mid-level" || tierName.toLowerCase() === "middle" || tierName.toLowerCase() === "mid-level") {
                                // Middle tier: circle at Senior position (259px)
                                endPosition = 259 - 6;
                            } else if (tierName === "Senior" || tierName.toLowerCase() === "senior") {
                                // Senior tier: circle at end (288px)
                                endPosition = 288 - 6;
                            }

                            // return (
                            //     <div
                            //         className="absolute w-6 h-6 top-0 bg-white rounded-full border-5 border-[#FFD700] z-10"
                            //         style={{
                            //             left: `${Math.max(0, Math.min(endPosition, 288 - 6))}px`,
                            //         }}
                            //     />
                            // );
                        })()}

                    </div>
                </div>

                <h2 className="absolute w-[210px] h-6 top-4 left-[62px] [font-family:'Poppins',Helvetica] font-semibold text-white text-base tracking-[0] leading-6">
                    {progressData.title}
                </h2>

                <button
                    ref={buttonRef}
                    className="absolute w-10 h-8 top-[15px] left-4 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={handleModalOpen}
                    aria-label="Open XP Points information"
                >
                    <img
                        className="w-full h-full"
                        alt="XP icon"
                        src="/assets/animaapp/mHRmJGe1/img/pic.svg"
                        loading="eager"
                        decoding="async"
                        width="40"
                        height="32"
                    />
                </button>

                <div className="absolute w-[153px] h-[21px] top-[113px] left-[18px] flex items-center">
                    <div className="font-medium text-[#d2d2d2] leading-[normal] [font-family:'Poppins',Helvetica] text-sm tracking-[0]">
                        {progressData.currentXP}
                    </div>

                    <img
                        className="w-5 h-[18px] mx-1"
                        alt="XP points icon"
                        src="/assets/animaapp/mHRmJGe1/img/pic-1.svg"
                        loading="eager"
                        decoding="async"
                        width="20"
                        height="18"
                    />

                    <div className="font-medium text-[#dddddd] leading-[normal] [font-family:'Poppins',Helvetica] text-sm tracking-[0]">
                        out of {progressData.totalXP.toLocaleString()}
                    </div>
                </div>

                {/* Double Down Arrow Button */}
                <button
                    className="absolute top-[138px] left-1/2 -translate-x-1/2 cursor-pointer hover:opacity-80 transition-opacity flex flex-col items-center justify-center z-10"
                    onClick={toggleExpanded}
                    aria-label="Toggle XP Points details"
                >
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        className={`text-white transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
                    >
                        <path
                            d="M7 10L12 15L17 10"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        <path
                            d="M7 5L12 10L17 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                </button>

                <nav className="absolute w-[303px] h-[15px] top-[63px] left-4">
                    {["Junior", "Mid-level", "Senior"].map((level, index) => {
                        const positions = ["left-0", "left-[114px]", "left-[259px]"];

                        return (
                            <div
                                key={level}
                                className={`h-3.5 font-light text-[#FFFFFF] leading-[14px] whitespace-nowrap absolute -top-px [font-family:'Poppins',Helvetica] text-[13px] tracking-[0] ${positions[index] || "left-0"}`}
                            >
                                {level}
                            </div>
                        );
                    })}
                </nav>

                {/* Expanded content - Inline like WelcomeOffer */}
                {isExpanded && (
                    <div className="absolute w-full top-[160px] left-0 bg-black rounded-[0px_0px_10px_10px] px-4 pt-4 pb-10 animate-fade-in -mt-2">
                        <div className="relative">
                            {/* Decorative Stars */}
                            <img
                                className="absolute w-3 h-3 top-[35px] right-[15%] pointer-events-none opacity-60 z-0"
                                alt=""
                                src="/assets/animaapp/rTwEmiCB/img/vector-2.svg"
                                aria-hidden="true"
                                loading="eager"
                                decoding="async"
                                width="12"
                                height="12"
                            />
                            <img
                                className="absolute w-3 h-3 top-[95px] left-[10px] pointer-events-none opacity-60 z-0"
                                alt=""
                                src="/assets/animaapp/rTwEmiCB/img/vector-2.svg"
                                aria-hidden="true"
                                loading="eager"
                                decoding="async"
                                width="12"
                                height="12"
                            />
                            <img
                                className="absolute w-3 h-3 top-[170px] right-[15%] pointer-events-none opacity-60 z-0"
                                alt=""
                                src="/assets/animaapp/rTwEmiCB/img/vector-2.svg"
                                aria-hidden="true"
                                loading="eager"
                                decoding="async"
                                width="12"
                                height="12"
                            />
                            <img
                                className="absolute w-3 h-3 top-[42px] left-[12px] pointer-events-none opacity-60 z-0"
                                alt=""
                                src="/assets/animaapp/rTwEmiCB/img/vector-5.svg"
                                aria-hidden="true"
                                loading="eager"
                                decoding="async"
                                width="12"
                                height="12"
                            />
                            <img
                                className="absolute w-3 h-3 top-[80px] right-[12px] pointer-events-none opacity-60 z-0"
                                alt=""
                                src="/assets/animaapp/rTwEmiCB/img/vector-7.svg"
                                aria-hidden="true"
                                loading="eager"
                                decoding="async"
                                width="12"
                                height="12"
                            />
                            <img
                                className="absolute w-3 h-3 top-[28px] left-[28%] pointer-events-none opacity-60 z-0"
                                alt=""
                                src="/assets/animaapp/rTwEmiCB/img/vector-8.svg"
                                aria-hidden="true"
                                loading="eager"
                                decoding="async"
                                width="12"
                                height="12"
                            />

                            {/* Main Logo */}
                            <div className="flex justify-center mb-3 mt-1">
                                <img
                                    className="w-[90px] h-[78px]"
                                    alt="XP Points Logo"
                                    src="/assets/animaapp/rTwEmiCB/img/pic.svg"
                                    loading="eager"
                                    decoding="async"
                                    width="90"
                                    height="78"
                                />
                            </div>

                            {/* Header Section */}
                            <header className="flex flex-col items-center mb-4">
                                <div className="flex items-center gap-1.5">
                                    <h1
                                        className="text-white [font-family:'Poppins',Helvetica] font-bold text-[24px] tracking-[0] leading-6 whitespace-nowrap"
                                    >
                                        XP Points
                                    </h1>
                                    <img
                                        className="w-[14px] h-[14px]"
                                        alt=""
                                        src="/assets/animaapp/rTwEmiCB/img/vector-8.svg"
                                        aria-hidden="true"
                                        loading="eager"
                                        decoding="async"
                                        width="14"
                                        height="14"
                                    />
                                </div>
                            </header>

                            {/* Description */}
                            <div className="mb-5">
                                <p className="w-full [font-family:'Poppins',Helvetica] font-light text-white text-xs text-center tracking-[0] leading-4 px-2">
                                    Play more, level up, and multiply your rewards with XP Points.
                                </p>
                            </div>

                            {/* Levels Section */}
                            <section className="flex flex-col w-full items-start gap-2 mb-5">
                                <div className="flex items-center justify-around gap-2.5 pt-0 pb-2 px-0 w-full border-b [border-bottom-style:solid] border-[#383838]">
                                    <h2 className="flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-xs text-center tracking-[0] leading-4">
                                        Levels
                                    </h2>
                                </div>

                                <div className="flex items-start justify-between w-full gap-1">
                                    {(progressData.tiers && progressData.tiers.length > 0
                                        ? progressData.tiers.map((tier) => ({
                                            name: tier.name,
                                            reward: tier.reward || `${tier.multiplier}x`,
                                            width: tier.name === "Junior" ? "80px" : tier.name === "Mid-level" ? "55px" : "58px"
                                        }))
                                        : [
                                            { name: "Junior", reward: "Reward:", width: "80px" },
                                            { name: "Mid-level", reward: "1.2x", width: "55px" },
                                            { name: "Senior", reward: "1.5x", width: "58px" }
                                        ]
                                    ).map((level, index) => (
                                        <div key={index} className="inline-flex flex-col items-start gap-0.5">
                                            <div className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[13px] tracking-[0] leading-[normal]">
                                                {level.name}
                                            </div>
                                            <div className="flex items-center">
                                                <div
                                                    className="h-[24px] rounded-[16px] bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex items-center justify-between px-1.5"
                                                    style={{ width: level.width }}
                                                >
                                                    <div className="[font-family:'Poppins',Helvetica] font-medium text-white text-[13px] tracking-[0] leading-[14px] whitespace-nowrap">
                                                        {level.reward}
                                                    </div>
                                                    <img
                                                        className="w-[14px] h-[15px] mb-0.5 object-contain"
                                                        alt=""
                                                        src="/dollor.png"
                                                        aria-hidden="true"
                                                        loading="eager"
                                                        decoding="async"
                                                        width="14"
                                                        height="15"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Example Section */}
                            <section className="flex flex-col w-full items-start gap-2 mb-4">
                                <div className="flex items-center gap-2.5 pt-0 pb-2 px-0 w-full border-b [border-bottom-style:solid] border-[#383838]">
                                    <h2 className="flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-xs text-center tracking-[0] leading-4">
                                        Example
                                    </h2>
                                </div>

                                <p className="w-full [font-family:'Poppins',Helvetica] font-light text-white text-xs text-center tracking-[0] leading-4 mb-3 px-1">
                                    If you&apos;re playing game say &quot;Fortnite&quot; &amp; the task is
                                    complete 5 levels of the game. Here&apos;s how XP Points benefits you
                                </p>

                                <div className="flex items-start justify-between w-full gap-1">
                                    {(progressData.tiers && progressData.tiers.length > 0
                                        ? progressData.tiers.map((tier) => {
                                            // Map tier names to example points: Junior=5, Mid-level=10, Senior=15
                                            const getExamplePoints = (tierName) => {
                                                if (tierName === "Junior") return "5";
                                                if (tierName === "Mid-level" || tierName === "Middle") return "10";
                                                if (tierName === "Senior") return "15";
                                                return tier.examplePoints?.toString() || "5";
                                            };
                                            return {
                                                name: tier.name,
                                                points: getExamplePoints(tier.name),
                                                width: tier.name === "Junior" ? "42px" : tier.name === "Mid-level" ? "75px" : "48px"
                                            };
                                        })
                                        : [
                                            { name: "Junior", points: "5", width: "42px" },
                                            { name: "Mid-level", points: "10", width: "75px" },
                                            { name: "Senior", points: "15", width: "48px" },
                                        ]
                                    ).map((item, index) => (
                                        <div
                                            key={index}
                                            className="flex flex-col items-start gap-0.5"
                                            style={{ width: item.width }}
                                        >
                                            <div className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[13px] tracking-[0] leading-[normal]">
                                                {item.name}
                                            </div>
                                            <div className="flex items-center">
                                                <div
                                                    className="h-6 rounded-[16px] bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex items-center justify-center px-1"
                                                    style={{ width: item.width }}
                                                >
                                                    <div className="[font-family:'Poppins',Helvetica] font-medium text-white text-[13px] tracking-[0] leading-[14px] flex items-center gap-[3px] whitespace-nowrap">
                                                        <span>{item.points}</span>
                                                        <img
                                                            className="w-[12px] h-[12px] mb-0.5 object-contain"
                                                            alt=""
                                                            src="/dollor.png"
                                                            aria-hidden="true"
                                                            loading="eager"
                                                            decoding="async"
                                                            width="12"
                                                            height="12"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                )}
            </section>

            {/* Custom Dropdown Modal - Fixed to top of screen (for info icon) */}
            {isXPModalOpen && (
                <>
                    {/* Backdrop/Overlay */}
                    <div
                        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
                        onClick={handleModalClose}
                        style={{
                            opacity: isAnimating ? 1 : 0,
                        }}
                    />

                    {/* Modal Container - Fixed at top */}
                    <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-12 sm:pt-16 md:pt-20 lg:pt-24">
                        <div
                            className={`xp-modal-content w-[90%] max-w-[300px] sm:max-w-[320px] md:max-w-[340px] bg-black rounded-[20px] border border-solid border-[#ffffff80] bg-[linear-gradient(0deg,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_100%)] overflow-hidden transform transition-all duration-500 ease-out max-h-[85vh] overflow-y-auto ${isAnimating
                                ? 'translate-y-0 opacity-100 scale-100'
                                : '-translate-y-full opacity-0 scale-95'
                                }`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Content */}
                            <div className="relative p-4 sm:p-5 md:p-6">
                                {/* Decorative Stars - Responsive and Fixed */}
                                <img
                                    className="absolute w-3 h-3 sm:w-4 sm:h-4 top-[35px] sm:top-[40px] right-[15%] sm:right-[20%] pointer-events-none opacity-60 z-0"
                                    alt=""
                                    src="/assets/animaapp/rTwEmiCB/img/vector-2.svg"
                                    aria-hidden="true"
                                    loading="eager"
                                    decoding="async"
                                    width="16"
                                    height="16"
                                />
                                <img
                                    className="absolute w-3 h-3 sm:w-4 sm:h-4 top-[95px] sm:top-[105px] left-[10px] sm:left-[15px] pointer-events-none opacity-60 z-0"
                                    alt=""
                                    src="/assets/animaapp/rTwEmiCB/img/vector-2.svg"
                                    aria-hidden="true"
                                    loading="eager"
                                    decoding="async"
                                    width="16"
                                    height="16"
                                />
                                <img
                                    className="absolute w-3 h-3 sm:w-4 sm:h-4 top-[170px] sm:top-[190px] right-[15%] sm:right-[20%] pointer-events-none opacity-60 z-0"
                                    alt=""
                                    src="/assets/animaapp/rTwEmiCB/img/vector-2.svg"
                                    aria-hidden="true"
                                    loading="eager"
                                    decoding="async"
                                    width="16"
                                    height="16"
                                />
                                <img
                                    className="absolute w-3 h-3 sm:w-4 sm:h-4 top-[42px] sm:top-[48px] left-[12px] sm:left-[15px] pointer-events-none opacity-60 z-0"
                                    alt=""
                                    src="/assets/animaapp/rTwEmiCB/img/vector-5.svg"
                                    aria-hidden="true"
                                    loading="eager"
                                    decoding="async"
                                    width="16"
                                    height="16"
                                />
                                <img
                                    className="absolute w-3 h-3 sm:w-4 sm:h-4 top-[80px] sm:top-[90px] right-[12px] sm:right-[15px] pointer-events-none opacity-60 z-0"
                                    alt=""
                                    src="/assets/animaapp/rTwEmiCB/img/vector-7.svg"
                                    aria-hidden="true"
                                    loading="eager"
                                    decoding="async"
                                    width="16"
                                    height="16"
                                />
                                <img
                                    className="absolute w-3 h-3 sm:w-4 sm:h-4 top-[28px] sm:top-[32px] left-[28%] sm:left-[30%] pointer-events-none opacity-60 z-0"
                                    alt=""
                                    src="/assets/animaapp/rTwEmiCB/img/vector-8.svg"
                                    aria-hidden="true"
                                    loading="eager"
                                    decoding="async"
                                    width="16"
                                    height="16"
                                />

                                {/* Close Button - Responsive */}
                                <button
                                    className="absolute w-[24px] h-[24px] sm:w-[28px] sm:h-[28px] top-3 right-3 sm:top-4 sm:right-4 cursor-pointer hover:opacity-80 transition-opacity z-10"
                                    aria-label="Close dialog"
                                    type="button"
                                    onClick={handleModalClose}
                                >
                                    <img alt="Close" src="/assets/animaapp/rTwEmiCB/img/close.svg" className="w-full h-full" loading="eager" decoding="async" width="24" height="24" />
                                </button>

                                {/* Main Logo - Smaller and Responsive */}
                                <div className="flex justify-center mb-3 sm:mb-4 mt-1 sm:mt-2">
                                    <img
                                        className="w-[90px] h-[78px] sm:w-[100px] sm:h-[86px] md:w-[110px] md:h-[95px]"
                                        alt="XP Points Logo"
                                        src="/assets/animaapp/rTwEmiCB/img/pic.svg"
                                        loading="eager"
                                        decoding="async"
                                        width="110"
                                        height="95"
                                    />
                                </div>

                                {/* Header Section - Responsive */}
                                <header className="flex flex-col items-center mb-4 sm:mb-5">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                        <h1
                                            className="text-white [font-family:'Poppins',Helvetica] font-bold text-[24px] sm:text-[28px] md:text-[30px] tracking-[0] leading-6 sm:leading-7 whitespace-nowrap"
                                        >
                                            XP Points
                                        </h1>
                                        <img
                                            className="w-[14px] h-[14px] sm:w-[16px] sm:h-[16px]"
                                            alt=""
                                            src="/assets/animaapp/rTwEmiCB/img/vector-8.svg"
                                            aria-hidden="true"
                                            loading="eager"
                                            decoding="async"
                                            width="16"
                                            height="16"
                                        />
                                    </div>
                                </header>

                                {/* Description - Responsive */}
                                <div className="mb-5 sm:mb-6">
                                    <p className="w-full [font-family:'Poppins',Helvetica] font-light text-white text-xs sm:text-sm text-center tracking-[0] leading-4 sm:leading-5 px-2 sm:px-4">
                                        Play more, level up, and multiply your rewards with XP Points.
                                    </p>
                                </div>

                                {/* Levels Section - Responsive */}
                                <section className="flex flex-col w-full items-start gap-2 sm:gap-3 mb-5 sm:mb-6">
                                    <div className="flex items-center justify-around gap-2.5 pt-0 pb-2 sm:pb-3 px-0 w-full border-b [border-bottom-style:solid] border-[#383838]">
                                        <h2 className="flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-xs sm:text-sm text-center tracking-[0] leading-4 sm:leading-5">
                                            Levels
                                        </h2>
                                    </div>

                                    <div className="flex items-start justify-between w-full gap-1 sm:gap-2">
                                        {(progressData.tiers && progressData.tiers.length > 0
                                            ? progressData.tiers.map((tier) => ({
                                                name: tier.name,
                                                reward: tier.reward || `${tier.multiplier}x`,
                                                width: tier.name === "Junior" ? "80px" : tier.name === "Mid-level" ? "55px" : "58px",
                                                smWidth: tier.name === "Junior" ? "85px" : tier.name === "Mid-level" ? "58px" : "62px",
                                                mdWidth: tier.name === "Junior" ? "90px" : tier.name === "Mid-level" ? "61px" : "66px"
                                            }))
                                            : [
                                                { name: "Junior", reward: "Reward:", width: "80px", smWidth: "85px", mdWidth: "90px" },
                                                { name: "Mid-level", reward: "1.2x", width: "55px", smWidth: "58px", mdWidth: "61px" },
                                                { name: "Senior", reward: "1.5x", width: "58px", smWidth: "62px", mdWidth: "66px" }
                                            ]
                                        ).map((level, index) => (
                                            <div key={index} className="inline-flex flex-col items-start gap-0.5 sm:gap-1">
                                                <div className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[13px] sm:text-[14px] md:text-[15px] tracking-[0] leading-[normal]">
                                                    {level.name}
                                                </div>
                                                <div className="flex items-center">
                                                    <div
                                                        className="h-[24px] sm:h-[26px] md:h-[28.52px] rounded-[16px] sm:rounded-[18px] md:rounded-[19.01px] bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex items-center justify-between px-1.5 sm:px-2"
                                                        style={{ width: level.width }}
                                                    >
                                                        <div className="[font-family:'Poppins',Helvetica] font-medium text-white text-[13px] sm:text-[14px] md:text-[15.6px] tracking-[0] leading-[14px] sm:leading-[15px] md:leading-[16.9px] whitespace-nowrap">
                                                            {level.reward}
                                                        </div>
                                                        <img
                                                            className="w-[14px] h-[15px] sm:w-[16px] sm:h-[17px] md:w-[18px] md:h-[19px] mb-0.5 sm:mb-1 object-contain"
                                                            alt=""
                                                            src="/dollor.png"
                                                            aria-hidden="true"
                                                            loading="eager"
                                                            decoding="async"
                                                            width="18"
                                                            height="19"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Example Section - Responsive */}
                                <section className="flex flex-col w-full items-start gap-2 sm:gap-3">
                                    <div className="flex items-center gap-2.5 pt-0 pb-2 sm:pb-3 px-0 w-full border-b [border-bottom-style:solid] border-[#383838]">
                                        <h2 className="flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-xs sm:text-sm text-center tracking-[0] leading-4 sm:leading-5">
                                            Example
                                        </h2>
                                    </div>

                                    <p className="w-full [font-family:'Poppins',Helvetica] font-light text-white text-xs sm:text-sm text-center tracking-[0] leading-4 sm:leading-5 mb-3 sm:mb-4 px-1 sm:px-2">
                                        If you&apos;re playing game say &quot;Fortnite&quot; &amp; the task is
                                        complete 5 levels of the game. Here&apos;s how XP Points benefits you
                                    </p>

                                    <div className="flex items-start justify-between w-full gap-1 sm:gap-2">
                                        {(progressData.tiers && progressData.tiers.length > 0
                                            ? progressData.tiers.map((tier) => {
                                                // Map tier names to example points: Junior=5, Mid-level=10, Senior=15
                                                const getExamplePoints = (tierName) => {
                                                    if (tierName === "Junior") return "5";
                                                    if (tierName === "Mid-level" || tierName === "Middle") return "10";
                                                    if (tierName === "Senior") return "15";
                                                    return tier.examplePoints?.toString() || "5";
                                                };
                                                return {
                                                    name: tier.name,
                                                    points: getExamplePoints(tier.name),
                                                    width: tier.name === "Junior" ? "42px" : tier.name === "Mid-level" ? "75px" : "48px",
                                                    smWidth: tier.name === "Junior" ? "45px" : tier.name === "Mid-level" ? "82px" : "51px",
                                                    mdWidth: tier.name === "Junior" ? "49px" : tier.name === "Mid-level" ? "90px" : "54px"
                                                };
                                            })
                                            : [
                                                { name: "Junior", points: "5", width: "42px", smWidth: "45px", mdWidth: "49px" },
                                                { name: "Mid-level", points: "10", width: "75px", smWidth: "82px", mdWidth: "90px" },
                                                { name: "Senior", points: "15", width: "48px", smWidth: "51px", mdWidth: "54px" },
                                            ]
                                        ).map((item, index) => (
                                            <div
                                                key={index}
                                                className="flex flex-col items-start gap-0.5 sm:gap-1"
                                                style={{ width: item.width }}
                                            >
                                                <div className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[13px] sm:text-[14px] md:text-[15px] tracking-[0] leading-[normal]">
                                                    {item.name}
                                                </div>
                                                <div className="flex items-center">
                                                    <div
                                                        className="h-6 sm:h-[26px] md:h-7 rounded-[16px] sm:rounded-[17px] md:rounded-[18.64px] bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex items-center justify-center px-1 sm:px-1.5"
                                                        style={{ width: item.width }}
                                                    >
                                                        <div className="[font-family:'Poppins',Helvetica] font-medium text-white text-[13px] sm:text-[14px] md:text-[15.3px] tracking-[0] leading-[14px] sm:leading-[15px] md:leading-[16.5px] flex items-center gap-[3px] sm:gap-[4px] whitespace-nowrap">
                                                            <span>{item.points}</span>
                                                            <img
                                                                className="w-[12px] h-[12px] sm:w-[14px] sm:h-[14px] md:w-[16px] md:h-[16px] mb-0.5 sm:mb-1 object-contain"
                                                                alt=""
                                                                src="/dollor.png"
                                                                aria-hidden="true"
                                                                loading="eager"
                                                                decoding="async"
                                                                width="16"
                                                                height="16"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                </section>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default XPTierTracker;
