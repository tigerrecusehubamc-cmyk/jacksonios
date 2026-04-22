"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { MemoizedButton, MemoizedImage } from "./PerformanceWrapper";
import { TimerBadge } from "./TimerBadge";
import { MissedDayIndicator } from "./MissedDayIndicator";
import { StreakProgressBar } from "./StreakProgressBar";
import { BigRewardAnimation } from "./BigRewardAnimation";

export const DailyRewardsSection = ({ weekData, isCurrentWeek, isFutureWeek, onClaimReward }) => {
    const [error, setError] = useState(null);
    const [showBigRewardAnimation, setShowBigRewardAnimation] = useState(false);
    const [claimingDay, setClaimingDay] = useState(null);
    const [locallyClaimedDays, setLocallyClaimedDays] = useState(new Set()); // Track locally claimed days to disable button immediately

    // Memoized reward configuration
    const getRewardConfig = useCallback((status, dayNumber, isBigRewardEligible = false) => {
        const configs = {
            claimed: {
                bgColor: "bg-[linear-gradient(180deg,rgba(18,24,60,1)_0%,rgba(18,24,60,1)_100%)]",
                buttonBg: "bg-[#2a2f50]",
                buttonText: "CLAIMED",
                buttonTextColor: "text-[#8b92de]",
                image: "/assets/animaapp/ciot1lOr/img/2211-w030-n003-510b-p1-510--converted--02-1-3-2x.png"
            },
            claimable: {
                bgColor: "bg-[linear-gradient(180deg,rgba(18,24,60,1)_0%,rgba(18,24,60,1)_100%)]",
                buttonBg: "bg-[linear-gradient(331deg,rgba(237,131,0,1)_0%,rgba(237,166,0,1)_100%)]",
                buttonText: "CLAIM NOW",
                buttonTextColor: "text-white",
                image: dayNumber === 7 && isBigRewardEligible
                    ? "/treasure-chest.png" // Big reward chest
                    : "/assets/animaapp/ciot1lOr/img/2211-w030-n003-510b-p1-510--converted--02-1-3-2x.png"
            },
            missed: {
                bgColor: "bg-[linear-gradient(180deg,rgba(18,24,60,1)_0%,rgba(18,24,60,1)_100%)]",
                buttonBg: "bg-[#2a2f50]",
                buttonText: "UNCLAIMED",
                buttonTextColor: "text-[#8b92de]",
                image: "/assets/animaapp/ciot1lOr/img/2211-w030-n003-510b-p1-510--converted--02-1-3-2x.png"
            },
            locked: {
                bgColor: "bg-[linear-gradient(180deg,rgba(18,24,60,1)_0%,rgba(18,24,60,1)_100%)]",
                buttonBg: "bg-[linear-gradient(331deg,rgba(237,131,0,1)_0%,rgba(237,166,0,1)_100%)]",
                buttonText: "LOCKED",
                buttonTextColor: "text-[#ffffff66]",
                image: "/assets/animaapp/ciot1lOr/img/2211-w030-n003-510b-p1-510--converted--02-2-1-2x.png"
            }
        };

        return configs[status] || {
            bgColor: "bg-[#1b1b1b]",
            buttonBg: "bg-[#ef890f4c]",
            buttonText: "LOCKED",
            buttonTextColor: "text-[#ffffff66]",
            image: "/assets/animaapp/ciot1lOr/img/2211-w030-n003-510b-p1-510--converted--02-2-1-2x.png"
        };
    }, []);

    // Check if big reward is eligible (AC5 & AC7: Big reward only if days 1-6 were all claimed)
    const isBigRewardEligible = useMemo(() => {
        if (!weekData) return false;

        // For current week: check if all PAST days 1-6 were claimed (don't check future days)
        if (isCurrentWeek) {
            const today = new Date();
            today.setHours(0, 0, 0, 0); // Reset to start of day for accurate comparison
            const weekStart = new Date(weekData.weekStart);

            // Check if all PAST days 1-6 were claimed (only check days that have already passed)
            for (let dayNum = 1; dayNum < 7; dayNum++) {
                const dayData = weekData.days.find(day => day.dayNumber === dayNum);
                if (dayData) {
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(dayDate.getDate() + (dayNum - 1));
                    dayDate.setHours(0, 0, 0, 0);

                    // Only check PAST days (days that have already occurred)
                    // Future days should not affect big reward eligibility
                    if (dayDate < today) {
                        // This is a past day - it must be claimed
                        if (dayData.status !== 'claimed' && !locallyClaimedDays.has(dayNum)) {
                            return false; // Big reward cancelled due to missed past day
                        }

                        // If it's marked as missed, big reward is cancelled
                        if (dayData.status === 'missed') {
                            return false; // Big reward cancelled due to missed day
                        }
                    }
                    // If dayDate >= today, it's a future day - don't check it
                }
            }

            // If we reach here, all past days 1-6 were claimed
            return true;
        }

        // For previous weeks: check if all days 1-6 were claimed
        if (!isCurrentWeek && !isFutureWeek) {
            // Check if all days 1-6 were claimed in previous week
            for (let dayNum = 1; dayNum < 7; dayNum++) {
                const dayData = weekData.days.find(day => day.dayNumber === dayNum);
                if (dayData && dayData.status !== 'claimed') {
                    return false; // Big reward cancelled due to missed day
                }
            }
            return true; // All days 1-6 were claimed
        }

        // For other weeks, use backend field
        return weekData.bigRewardEligible === true;
    }, [weekData, isCurrentWeek, isFutureWeek, locallyClaimedDays]);

    // Check if reward should be locked based on countdown
    const shouldLockReward = useCallback((dayData) => {
        // For future weeks: all rewards should be locked
        if (isFutureWeek) {
            return true;
        }

        // For current week: don't apply locking logic, use actual API status
        if (isCurrentWeek) {
            return false; // Don't override status for current week
        }

        // For previous weeks: apply locking logic if needed
        if (weekData?.countdown && weekData.countdown > 0) {
            const currentDay = weekData.todayDayNumber || 1;
            return dayData.dayNumber > currentDay;
        }
        return false;
    }, [weekData, isFutureWeek, isCurrentWeek]);

    // Check if reward should be marked as missed
    const shouldMarkAsMissed = useCallback((dayData) => {
        // Special case: Day 7 can always be claimed if API says it's claimable
        // Users should be able to claim normal reward even if big reward is missed
        if (dayData.dayNumber === 7 && dayData.status === 'claimable') {
            return false; // Allow claiming day 7 normal reward
        }

        // For future weeks: all rewards should be locked (not missed, just locked)
        if (isFutureWeek) {
            return false; // Future weeks show as locked, not missed
        }

        // For current week: don't apply missed logic, use actual API status
        if (isCurrentWeek) {
            return false; // Don't override status for current week
        }

        // For previous weeks: if status is claimable, mark as missed
        if (!isCurrentWeek && !isFutureWeek && dayData.status === 'claimable') {
            return true;
        }

        return false;
    }, [isCurrentWeek, isFutureWeek, weekData]);

    // Memoized data transformation
    const transformRewardData = useCallback((dayData) => {
        try {
            let effectiveStatus = dayData.status;
            let isMissed = false;
            let isLocked = false;

            // ✅ CHECK ACTIVE FLAG FIRST - If day is inactive, force locked status
            if (dayData.active === false) {
                effectiveStatus = 'locked';
                isLocked = true;

                const config = getRewardConfig('locked', dayData.dayNumber, isBigRewardEligible);

                return {
                    day: dayData.dayNumber,
                    calendarDay: dayData.dayNumber,
                    status: 'locked',
                    originalStatus: dayData.status,
                    coins: 0, // No rewards for inactive days
                    xp: 0,
                    originalCoins: 0,
                    originalXp: 0,
                    multiplier: 1,
                    claimedAt: null,
                    nextUnlockTime: null,
                    isLocked: true,
                    isMissed: false,
                    isFutureWeek: false,
                    isInactive: true, // Flag to indicate this day is administratively disabled
                    ...config
                };
            }

            // For future weeks: force all rewards to be locked
            if (isFutureWeek) {
                effectiveStatus = 'locked';
                isLocked = true;
            }
            // For current week: implement specific logic based on documentation
            else if (isCurrentWeek) {
                const today = new Date();
                const weekStart = new Date(weekData.weekStart);
                const dayDate = new Date(weekStart);
                dayDate.setDate(dayDate.getDate() + (dayData.dayNumber - 1));

                // Check if this is today using API's todayDayNumber (more reliable than date comparison)
                const isTodayByAPI = weekData.todayDayNumber === dayData.dayNumber;

                // Check if this is today using date comparison
                const isToday = dayDate.toDateString() === today.toDateString();

                // Check if this is a past day
                const isPastDay = dayDate < today;

                // Check if this is a future day
                const isFutureDay = dayDate > today;

                // Special handling for day 7: Allow claiming normal reward even if big reward is missed
                if (dayData.dayNumber === 7) {
                    // Day 7 can be claimed if API says it's claimable, regardless of big reward eligibility
                    if (dayData.status === 'claimable') {
                        effectiveStatus = 'claimable'; // Allow claiming normal reward
                    } else if (dayData.status === 'claimed') {
                        effectiveStatus = 'claimed'; // Show "CLAIMED"
                    } else if (dayData.status === 'missed') {
                        effectiveStatus = 'missed'; // Show "UNCLAIMED"
                        isMissed = true;
                    } else {
                        effectiveStatus = dayData.status; // Use API status
                    }
                }
                // AC2: Current day should show "CLAIM NOW" only if user logs in
                // Use API's todayDayNumber as primary check, fallback to date comparison
                else if ((isTodayByAPI || isToday) && dayData.status === 'claimable') {
                    effectiveStatus = 'claimable'; // Show "CLAIM NOW"
                }
                // AC3: Once claimed, days should update to show "CLAIMED"
                else if (dayData.status === 'claimed') {
                    effectiveStatus = 'claimed'; // Show "CLAIMED"
                }
                // AC4: Missed logins should show "UNCLAIMED" with red cross
                // Don't mark as missed if it's today according to API, even if date comparison says it's past
                else if (dayData.status === 'missed' || (isPastDay && dayData.status === 'claimable' && !isTodayByAPI)) {
                    effectiveStatus = 'missed'; // Show "UNCLAIMED" with red cross
                    isMissed = true;
                }
                // Future days should be locked
                else if (isFutureDay || dayData.status === 'locked') {
                    effectiveStatus = 'locked'; // Show "LOCKED"
                    isLocked = true;
                }
                // Default to API status
                else {
                    effectiveStatus = dayData.status;
                }
            }
            // For previous weeks: apply missed logic
            else {
                const shouldBeMissed = shouldMarkAsMissed(dayData);
                const shouldBeLocked = shouldLockReward(dayData);

                // Special handling for day 7 in previous weeks
                if (dayData.dayNumber === 7) {
                    // Day 7 can be claimed if API says it's claimable, regardless of big reward eligibility
                    // Users can claim normal reward even if big reward is missed
                    if (dayData.status === 'claimable') {
                        effectiveStatus = 'claimable'; // Allow claiming normal reward
                    } else if (dayData.status === 'claimed') {
                        effectiveStatus = 'claimed';
                    } else if (dayData.status === 'missed') {
                        effectiveStatus = 'missed';
                        isMissed = true;
                    } else {
                        effectiveStatus = dayData.status; // Use API status
                    }
                } else {
                    if (shouldBeMissed) {
                        effectiveStatus = 'missed';
                        isMissed = true;
                    } else if (shouldBeLocked) {
                        effectiveStatus = 'locked';
                        isLocked = true;
                    }
                }
            }

            const config = getRewardConfig(effectiveStatus, dayData.dayNumber, isBigRewardEligible);

            // Calculate next unlock time
            const calculateNextUnlockTime = () => {
                const today = new Date();

                // If reward is claimed, calculate next daily reward (24 hours from claim time)
                if (effectiveStatus === 'claimed' && dayData.claimedAt) {
                    const claimedAt = new Date(dayData.claimedAt);
                    const nextRewardTime = new Date(claimedAt.getTime() + 24 * 60 * 60 * 1000); // 24 hours from claim

                    // Only show timer if next reward is in the future
                    if (nextRewardTime > today) {
                        return nextRewardTime;
                    }
                }

                // Use backend countdown if available
                if (weekData?.countdown && weekData.countdown > 0) {
                    const weekStart = new Date(weekData.weekStart);
                    const dayDate = new Date(weekStart);
                    dayDate.setDate(dayDate.getDate() + (dayData.dayNumber - 1));

                    // If this is a future day, calculate when it unlocks
                    if (dayDate > today) {
                        // Calculate time until this day unlocks
                        const timeUntilUnlock = dayDate.getTime() - today.getTime();
                        return new Date(today.getTime() + timeUntilUnlock);
                    }
                }

                return null;
            };

            // Apply weekly multiplier if available (from API response)
            const weeklyMultiplier = weekData?.weeklyMultiplier || weekData?.multiplier || 1;
            const displayCoins = dayData.rewardCoins ? (dayData.rewardCoins * weeklyMultiplier) : (dayData.coins * weeklyMultiplier);
            const displayXp = dayData.rewardXp ? (dayData.rewardXp * weeklyMultiplier) : (dayData.xp * weeklyMultiplier);

            // V3 API: dayNumber is always 1-7 (user-relative), no calculation needed!
            // V2 API: Had complex logic for first week vs subsequent weeks
            // V3 simplification: Just use dayNumber directly
            const displayDayNumber = dayData.dayNumber;

            return {
                day: displayDayNumber, // Always 1-7 in V3
                calendarDay: dayData.dayNumber, // Same as day in V3
                status: effectiveStatus,
                originalStatus: dayData.status,
                coins: displayCoins, // Apply multiplier to displayed coins
                xp: displayXp, // Apply multiplier to displayed XP
                originalCoins: dayData.coins || dayData.rewardCoins || 0,
                originalXp: dayData.xp || dayData.rewardXp || 0,
                multiplier: weeklyMultiplier,
                claimedAt: dayData.claimedAt,
                nextUnlockTime: calculateNextUnlockTime(),
                isLocked: isLocked || isFutureWeek,
                isMissed: isMissed,
                isFutureWeek: isFutureWeek,
                ...config
            };
        } catch (err) {
            setError(err.message);
            return null;
        }
    }, [getRewardConfig, isBigRewardEligible, weekData, shouldLockReward, shouldMarkAsMissed, isFutureWeek, isCurrentWeek]);

    // Sync locally claimed days with actual API data when weekData updates
    useEffect(() => {
        if (weekData?.days && Array.isArray(weekData.days)) {
            const actuallyClaimedDays = new Set();
            weekData.days.forEach(day => {
                if (day.status === 'claimed') {
                    actuallyClaimedDays.add(day.dayNumber);
                }
            });
            // Update to sync with API data (this ensures buttons stay disabled after refresh)
            setLocallyClaimedDays(prev => {
                // Merge with existing locally claimed to preserve immediate disable on click
                const merged = new Set(actuallyClaimedDays);
                prev.forEach(day => merged.add(day));
                return merged;
            });
        }
    }, [weekData?.days?.map(d => `${d.dayNumber}-${d.status}`).join(',')]);

    // Memoized reward data
    const dailyRewards = useMemo(() => {
        if (!weekData || !weekData.days || !Array.isArray(weekData.days)) {
            return [];
        }
        // V3 API: No hidden days, all 7 days are always returned
        // V2 API: Had to filter out hidden days
        return weekData.days
            .map(transformRewardData)
            .filter(Boolean);
    }, [weekData, transformRewardData]);

    // Memoized grid days (Days 1-6)
    const gridDays = useMemo(() => {
        return dailyRewards.slice(0, 6);
    }, [dailyRewards]);

    // Memoized day 7 data
    const day7Data = useMemo(() => {
        return dailyRewards.length >= 7 ? dailyRewards[6] : null;
    }, [dailyRewards]);

    // Calculate which day should show the timer (only ONE day should show timer)
    // Use API data to determine which day should show the countdown timer
    const nextUnlockableDay = useMemo(() => {
        if (!isCurrentWeek || isFutureWeek || !weekData?.days || !Array.isArray(weekData.days)) {
            return null;
        }

        // Only show timer if we have countdown data from API
        const hasCountdownData = weekData?.countdown && weekData.countdown > 0;
        if (!hasCountdownData) return null;

        const today = new Date();
        const weekStart = new Date(weekData.weekStart);
        const todayDayNumber = weekData.todayDayNumber;

        // Find the last claimed day (not claimable - claimable days don't need timer)
        let lastClaimedDay = 0;
        for (let dayNum = 1; dayNum <= 7; dayNum++) {
            const dayData = weekData.days.find(day => day.dayNumber === dayNum);
            if (dayData && dayData.status === 'claimed') {
                lastClaimedDay = dayNum;
            }
        }

        // Logic: Show timer on the next claimable day AFTER a claimed day
        // This shows countdown for when the next claimable reward will be available
        if (lastClaimedDay > 0) {
            // Find the next claimable day after the last claimed day
            for (let dayNum = lastClaimedDay + 1; dayNum <= 7; dayNum++) {
                const dayData = weekData.days.find(day => day.dayNumber === dayNum);
                if (dayData && dayData.status === 'claimable') {
                    // Show timer on this claimable day with countdown
                    // The countdown shows when this claimable day becomes available (or when next day unlocks)
                    return dayNum;
                }
            }
        }

        // If no claimed day, check if there's a claimable day that's NOT today
        // Don't show timer on today's claimable day
        for (let dayNum = 1; dayNum <= 7; dayNum++) {
            const dayData = weekData.days.find(day => day.dayNumber === dayNum);
            if (dayData && dayData.status === 'claimable' && dayNum !== todayDayNumber) {
                // Show timer on claimable days that are not today
                return dayNum;
            }
        }

        // If no claimable day found, show timer on next locked day
        const nextLockedDay = lastClaimedDay > 0 ? lastClaimedDay + 1 : 1;
        if (nextLockedDay <= 7) {
            const nextDayData = weekData.days.find(day => day.dayNumber === nextLockedDay);
            if (nextDayData && nextDayData.status === 'locked') {
                return nextLockedDay;
            }
        }

        return null;
    }, [isCurrentWeek, isFutureWeek, weekData]);

    // Handle big reward animation (AC7: Only if days 1-6 were all claimed)
    const handleBigRewardAnimation = useCallback(() => {
        if (isBigRewardEligible && day7Data?.status === 'claimable') {
            setShowBigRewardAnimation(true);
        }
    }, [isBigRewardEligible, day7Data]);

    // Check for missed days
    const hasMissedDays = useMemo(() => {
        if (!weekData || !weekData.days) return false;
        return weekData.days.some(day => day.status === 'missed');
    }, [weekData]);

    // Handle claim click with error handling
    const handleClaimClick = useCallback(async (dayNumber) => {
        try {
            if (dayNumber >= 1 && dayNumber <= 7) {
                // Check if viewing future week
                if (isFutureWeek) {
                    setError("Future weeks are locked. You can only claim rewards from the current week.");
                    return;
                }

                const rewardData = weekData?.days?.find(day => day.dayNumber === dayNumber);

                // ✅ CHECK IF DAY IS INACTIVE
                if (rewardData && rewardData.active === false) {
                    setError("This reward is currently unavailable. Please contact support.");
                    return;
                }

                // Special case: Day 7 can be claimed for normal reward even if big reward is missed
                // Allow claiming if API says it's claimable, regardless of big reward eligibility
                const isDay7 = dayNumber === 7;
                const canClaimDay7 = isDay7 && rewardData?.status === 'claimable';

                // Check if this reward should be marked as missed (skip check for claimable day 7)
                if (rewardData && !canClaimDay7 && shouldMarkAsMissed(rewardData)) {
                    setError("This reward is no longer available. You missed the claim window.");
                    return;
                }

                // Check if this reward is locked
                if (rewardData && shouldLockReward(rewardData)) {
                    setError("This reward is locked. Please wait for the countdown to expire.");
                    return;
                }

                // Check if already claimed locally (prevent double-click)
                if (locallyClaimedDays.has(dayNumber)) {
                    setError("This reward has already been claimed.");
                    return;
                }

                // Set claiming state and mark as locally claimed immediately to disable button
                setClaimingDay(dayNumber);
                setLocallyClaimedDays(prev => new Set(prev).add(dayNumber));
                setError(null);

                try {
                    await onClaimReward(dayNumber);

                    // Clear any previous errors on success
                    setError(null);

                    // Trigger big reward animation if claiming day 7 and eligible
                    if (dayNumber === 7 && isBigRewardEligible) {
                        handleBigRewardAnimation();
                    }
                } catch (claimError) {
                    // Only set error if claim actually failed
                    setError(claimError.message || "Failed to claim reward");
                    setClaimingDay(null);
                    // Remove from locally claimed if claim failed
                    setLocallyClaimedDays(prev => {
                        const newSet = new Set(prev);
                        newSet.delete(dayNumber);
                        return newSet;
                    });
                } finally {
                    // Clear claiming state after a short delay to show the transition
                    // Only if not already cleared by error handler
                    setTimeout(() => {
                        setClaimingDay((prev) => prev === dayNumber ? null : prev);
                    }, 200);
                }
            }
        } catch (err) {
            setError(err.message);
            setClaimingDay(null);
        }
    }, [onClaimReward, isBigRewardEligible, handleBigRewardAnimation, weekData, shouldLockReward, shouldMarkAsMissed, isFutureWeek]);

    // Memoized reward card component
    const renderRewardCard = useCallback((reward) => {
        if (!reward) return null;

        return (
            <div
                key={reward.day}
                className={`relative w-40 h-[170px] rounded-[21.82px] overflow-hidden ${reward.bgColor} ${reward.status === 'claimable' && !reward.isLocked && !reward.isMissed && !reward.isFutureWeek ? 'shadow-[0_0_20px_rgba(168,85,247,0.6),0_0_10px_rgba(168,85,247,0.4)]' : ''}`}
            >
                {/* Timer Badge - Show on next claimable day after claimed day, or on locked days */}
                {/* Don't show timer on today's claimable day - it's ready now */}
                {isCurrentWeek && !isFutureWeek && nextUnlockableDay === reward.day && weekData?.countdown && weekData.countdown > 0 && reward.day !== weekData.todayDayNumber && (
                    <TimerBadge
                        nextUnlockTime={null}
                        isClaimed={reward.status === 'claimed'}
                        countdown={weekData.countdown}
                    />
                )}

                {/* Missed Day Indicator - Red cross for missed days (AC4) */}
                {/* Commented out X button - UX improvement: Remove big X; mark unclaimed as "missed" and use consistent iconography */}
                {/* <MissedDayIndicator isMissed={reward.status === 'missed'} /> */}

                <MemoizedImage
                    className="absolute top-[calc(50.00%_-_62px)] left-[calc(50.00%_-_73px)] w-[147px] h-[102px] object-cover"
                    alt={`Day ${reward.day} reward`}
                    src={reward.image}
                    loading="eager"
                    decoding="async"
                    width="147"
                    height="102"
                />

                <div className="absolute top-[calc(50.00%_-_86px)] left-0 w-[166px] h-[35px] flex justify-center bg-[#ffffff1a]">
                    <div
                        className="mt-[12.5px] h-[19px] [font-family:'Poppins',Helvetica] font-semibold text-white text-[12.5px] text-center tracking-[0] leading-[normal] whitespace-nowrap"
                    >
                        DAY {reward.day}
                    </div>
                </div>

                <MemoizedButton
                    onClick={() => handleClaimClick(reward.calendarDay || reward.day)}
                    disabled={reward.status !== 'claimable' || reward.isLocked || reward.isMissed || reward.isFutureWeek || claimingDay === (reward.calendarDay || reward.day) || locallyClaimedDays.has(reward.calendarDay || reward.day) || reward.status === 'claimed'}
                    className={`w-[166px] ${reward.buttonBg} absolute top-[126px] left-0 h-11 rounded-[0px_0px_3.13px_3.13px] overflow-hidden ${reward.status === 'claimable' && !reward.isLocked && !reward.isMissed && !reward.isFutureWeek && !locallyClaimedDays.has(reward.calendarDay || reward.day) && reward.status !== 'claimed'
                        ? 'cursor-pointer'
                        : 'cursor-not-allowed opacity-75'
                        }`}
                    ariaLabel={`Claim reward for day ${reward.day}`}
                >
                    <img
                        className="absolute w-[166px] h-11 top-0 left-0"
                        alt="Clip path group"
                        src="/assets/animaapp/ciot1lOr/img/clip-path-group-5-2x.png"
                        loading="eager"
                        decoding="async"
                        width="166"
                        height="44"
                    />

                    <div
                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 [font-family:'Poppins',Helvetica] font-medium ${reward.buttonTextColor} text-sm tracking-[0] leading-[18.8px] whitespace-nowrap text-center flex items-center gap-2 justify-center`}
                    >
                        {claimingDay === reward.day ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Claiming...</span>
                            </>
                        ) : (
                            reward.buttonText
                        )}
                    </div>
                </MemoizedButton>
            </div>
        );
    }, [handleClaimClick, claimingDay, nextUnlockableDay, isCurrentWeek, isFutureWeek, weekData?.countdown]);

    // Handle missing or invalid data
    if (!weekData || !weekData.days || !Array.isArray(weekData.days)) {
        return (
            <section className="flex flex-col w-full max-w-[335px] items-center gap-5 px-4 py-4">
                <div className="w-full h-[170px] bg-gray-800 rounded-[21.82px] flex items-center justify-center">
                    <div className="text-white text-center">
                        <div className="text-lg mb-2">⚠️</div>
                        <div className="text-sm">No reward data available</div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section
            className="flex flex-col w-full max-w-[335px] items-center gap-4 px-4 py-4 pb-12"
            aria-label="Daily Rewards"
        >
            {/* Streak Progress Bar */}
            <StreakProgressBar weekData={weekData} />
            {/* Row 1: Day 1, Day 2 */}
            <div className="grid grid-cols-2 gap-4 w-full">
                <div className="flex justify-center">
                    {gridDays[0] ? renderRewardCard(gridDays[0]) : (
                        <div className="w-40 h-[170px] bg-gray-800 rounded-[21.82px] flex items-center justify-center text-white">
                            Day 1
                        </div>
                    )}
                </div>
                <div className="flex justify-center">
                    {gridDays[1] ? renderRewardCard(gridDays[1]) : (
                        <div className="w-40 h-[170px] bg-gray-800 rounded-[21.82px] flex items-center justify-center text-white">
                            Day 2
                        </div>
                    )}
                </div>
            </div>

            {/* Row 2: Day 3, Day 4 */}
            <div className="grid grid-cols-2 gap-4 w-full">
                <div className="flex justify-center">
                    {gridDays[2] ? renderRewardCard(gridDays[2]) : (
                        <div className="w-40 h-[170px] bg-gray-800 rounded-[21.82px] flex items-center justify-center text-white">
                            Day 3
                        </div>
                    )}
                </div>
                <div className="flex justify-center">
                    {gridDays[3] ? renderRewardCard(gridDays[3]) : (
                        <div className="w-40 h-[170px] bg-gray-800 rounded-[21.82px] flex items-center justify-center text-white">
                            Day 4
                        </div>
                    )}
                </div>
            </div>

            {/* Row 3: Day 5, Day 6 */}
            <div className="grid grid-cols-2 gap-4 w-full">
                <div className="flex justify-center">
                    {gridDays[4] ? renderRewardCard(gridDays[4]) : (
                        <div className="w-40 h-[170px] bg-gray-800 rounded-[21.82px] flex items-center justify-center text-white">
                            Day 5
                        </div>
                    )}
                </div>
                <div className="flex justify-center">
                    {gridDays[5] ? renderRewardCard(gridDays[5]) : (
                        <div className="w-40 h-[170px] bg-gray-800 rounded-[21.82px] flex items-center justify-center text-white">
                            Day 6
                        </div>
                    )}
                </div>
            </div>

            {/* Day 7 Big Reward */}
            {day7Data && (
                <article className={`relative w-full max-w-[335px] h-[170px] rounded-[21.82px] overflow-hidden mb-6 ${day7Data.status === 'claimed'
                    ? "bg-[linear-gradient(180deg,rgba(18,24,60,1)_0%,rgba(18,24,60,1)_100%)]"
                    : day7Data.status === 'missed'
                        ? "bg-[linear-gradient(180deg,rgba(18,24,60,1)_0%,rgba(18,24,60,1)_100%)]"
                        : "bg-[linear-gradient(180deg,rgba(18,24,60,1)_0%,rgba(18,24,60,1)_100%)]"
                    }`}>

                    {/* Timer Badge - Show on Day 7 if it's the next unlockable day, use API countdown directly */}
                    {/* Don't show timer if Day 7 is today's claimable day */}
                    {isCurrentWeek && !isFutureWeek && nextUnlockableDay === 7 && weekData?.countdown && weekData.countdown > 0 && 7 !== weekData.todayDayNumber && (
                        <TimerBadge
                            nextUnlockTime={null}
                            isClaimed={day7Data.status === 'claimed'}
                            countdown={weekData.countdown}
                        />
                    )}

                    {/* Display different content based on week type and bigRewardEligible */}
                    {isFutureWeek ? (
                        // Future Week - Show only golden treasure box
                        <div className="absolute top-[calc(50.00%_-_50px)] left-1/2 transform -translate-x-1/2 w-[136px] h-[88px] flex items-center justify-center">
                            <MemoizedImage
                                className="w-[92.41px] h-[92.41px] object-cover"
                                alt="Future week treasure reward"
                                src="/assets/animaapp/ciot1lOr/img/png-clipart-buried-treasure-treasure-miscellaneous-treasure-tran-2x.png"
                                loading="eager"
                                decoding="async"
                                width="92"
                                height="92"
                            />
                        </div>
                    ) : isBigRewardEligible ? (
                        // Big Reward Eligible - Show single golden chest (centered, moved down)
                        <div className="absolute top-[calc(50.00%_-_50px)] left-1/2 -translate-x-1/2 w-[136px] h-[88px] flex items-center justify-center">
                            <MemoizedImage
                                className="w-[92.41px] h-[92.41px] object-cover"
                                alt="Big treasure reward"
                                src="/assets/animaapp/ciot1lOr/img/png-clipart-buried-treasure-treasure-miscellaneous-treasure-tran-2x.png"
                                loading="eager"
                                decoding="async"
                                width="92"
                                height="92"
                            />
                        </div>
                    ) : (
                        // Big Reward NOT Eligible - Show golden chest (X button commented out for UX improvement)
                        <div className="absolute top-[calc(50.00%_-_58px)] left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-4 w-full max-w-[320px] px-2">
                            {/* Golden chest - X overlay commented out */}
                            <div className="relative w-[96px] h-[96px] flex-shrink-0 flex items-center justify-center">
                                <MemoizedImage
                                    className="w-full h-full object-contain"
                                    alt="Cancelled big reward"
                                    src="/assets/animaapp/ciot1lOr/img/png-clipart-buried-treasure-treasure-miscellaneous-treasure-tran-2x.png"
                                    loading="lazy"
                                />
                                {/* Red X overlay with custom SVG - COMMENTED OUT for UX improvement */}
                                {/* <div className="absolute inset-0 flex items-center justify-center">
                                    <svg width="44" height="33" viewBox="0 0 44 33" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[44px] h-[33px]">
                                        <g filter="url(#filter0_dd_2035_6990)">
                                            <path d="M3.03229 2.47884C3.09565 1.64458 3.79104 1 4.62769 1H41.2295C42.1609 1 42.8955 1.79244 42.8249 2.72117L40.9234 27.7594C40.86 28.5937 40.1646 29.2383 39.328 29.2383H2.72612C1.79473 29.2383 1.06018 28.4458 1.13072 27.5171L3.03229 2.47884Z" fill="#E6311F" />
                                            <path d="M41.2295 0.700195C42.3355 0.700195 43.2078 1.64128 43.124 2.74414L41.2227 27.7822C41.1474 28.7728 40.3216 29.538 39.3281 29.5381H2.72656C1.62053 29.5381 0.748273 28.597 0.832031 27.4941L2.7334 2.45605C2.80868 1.46542 3.63443 0.700195 4.62793 0.700195H41.2295Z" stroke="black" strokeWidth="0.6" />
                                        </g>
                                        <mask id="mask0_2035_6990" style={{ maskType: "alpha" }} maskUnits="userSpaceOnUse" x="1" y="1" width="42" height="29">
                                            <path d="M3.03229 2.47884C3.09565 1.64458 3.79104 1 4.62769 1H41.2295C42.1609 1 42.8955 1.79244 42.8249 2.72117L40.9234 27.7594C40.86 28.5937 40.1646 29.2383 39.328 29.2383H2.72612C1.79473 29.2383 1.06018 28.4458 1.13072 27.5171L3.03229 2.47884Z" fill="#343B50" />
                                        </mask>
                                        <g mask="url(#mask0_2035_6990)">
                                            <rect x="-0.384766" y="-5.10156" width="46.7078" height="8.21338" fill="#FF7B7B" />
                                            <rect x="-0.357178" y="26.4492" width="46.7078" height="8.21338" fill="#CD0034" />
                                        </g>
                                        <path d="M20.3813 6.62207C20.461 6.62357 20.5371 6.65648 20.5923 6.71387L24.438 10.7119L28.7222 7.31152L28.772 7.2793C28.8249 7.25229 28.885 7.24071 28.9448 7.24805C29.0246 7.25783 29.097 7.29963 29.146 7.36328L32.48 11.6992C32.5756 11.8236 32.5596 12.0007 32.4429 12.1055L28.8608 15.3096L32.2925 18.8779C32.3498 18.9375 32.3805 19.0181 32.3765 19.1006C32.3724 19.1832 32.3339 19.2608 32.271 19.3145L27.3022 23.5498C27.1808 23.6533 26.9989 23.6441 26.8892 23.5283L23.5806 20.0332L20.103 23.1445C19.9818 23.2529 19.7957 23.2452 19.6841 23.127L15.2495 18.4248C15.1919 18.3637 15.1624 18.281 15.1685 18.1973C15.1745 18.1135 15.215 18.0356 15.2808 17.9834L18.9116 15.0996L15.562 11.5605C15.4489 11.441 15.4533 11.2529 15.5718 11.1387L20.1675 6.70605C20.2248 6.65082 20.3018 6.62063 20.3813 6.62207Z" fill="black" stroke="black" strokeWidth="0.6" strokeLinejoin="round" />
                                        <path d="M15.1855 11.3297V10.1859C15.1855 10.1307 15.2303 10.0859 15.2855 10.0859H16.1559C16.2111 10.0859 16.2559 10.1307 16.2559 10.1859V11.3297C16.2559 11.3849 16.2111 11.4297 16.1559 11.4297H15.2855C15.2303 11.4297 15.1855 11.3849 15.1855 11.3297Z" fill="black" />
                                        <path d="M14.8682 18.1969V16.9828C14.8682 16.9276 14.9129 16.8828 14.9682 16.8828H15.8385C15.8937 16.8828 15.9385 16.9276 15.9385 16.9828V18.1969C15.9385 18.2521 15.8937 18.2969 15.8385 18.2969H14.9682C14.9129 18.2969 14.8682 18.2521 14.8682 18.1969Z" fill="black" />
                                        <path d="M31.7734 11.8531V10.6391C31.7734 10.5838 31.8182 10.5391 31.8734 10.5391H32.7437C32.799 10.5391 32.8438 10.5838 32.8438 10.6391V11.8531C32.8438 11.9084 32.799 11.9531 32.7437 11.9531H31.8734C31.8182 11.9531 31.7734 11.9084 31.7734 11.8531Z" fill="black" />
                                        <path d="M31.603 19.0875V17.8734C31.603 17.8182 31.6478 17.7734 31.703 17.7734H32.5733C32.6286 17.7734 32.6733 17.8182 32.6733 17.8734V19.0875C32.6733 19.1427 32.6286 19.1875 32.5733 19.1875H31.703C31.6478 19.1875 31.603 19.1427 31.603 19.0875Z" fill="black" />
                                        <mask id="path-11-outside-1_2035_6990" maskUnits="userSpaceOnUse" x="14.4673" y="4.67188" width="19" height="18" fill="black">
                                            <rect fill="white" x="14.4673" y="4.67188" width="19" height="18" />
                                            <path d="M24.4106 9.86621L28.9077 6.2959L32.2427 10.6318L28.4282 14.043L32.0767 17.8359L27.1069 22.0713L23.5981 18.3643L19.9019 21.6719L15.4673 16.9688L19.355 13.8809L15.7798 10.1045L20.3755 5.67188L24.4106 9.86621Z" />
                                        </mask>
                                        <path d="M24.4106 9.86621L28.9077 6.2959L32.2427 10.6318L28.4282 14.043L32.0767 17.8359L27.1069 22.0713L23.5981 18.3643L19.9019 21.6719L15.4673 16.9688L19.355 13.8809L15.7798 10.1045L20.3755 5.67188L24.4106 9.86621Z" fill="white" />
                                        <path d="M24.4106 9.86621L23.9783 10.2822C24.1927 10.5051 24.5415 10.5285 24.7837 10.3361L24.4106 9.86621ZM28.9077 6.2959L29.3833 5.9301C29.2853 5.80269 29.1403 5.71993 28.9808 5.70036C28.8212 5.68079 28.6605 5.72605 28.5346 5.82599L28.9077 6.2959ZM32.2427 10.6318L32.6426 11.0791C32.8768 10.8697 32.9098 10.5151 32.7183 10.266L32.2427 10.6318ZM28.4282 14.043L28.0283 13.5957C27.9068 13.7043 27.8348 13.8576 27.8286 14.0204C27.8225 14.1832 27.8829 14.3415 27.9958 14.4589L28.4282 14.043ZM32.0767 17.8359L32.4658 18.2926C32.5917 18.1853 32.6677 18.0308 32.6759 17.8656C32.6841 17.7004 32.6237 17.5392 32.5091 17.42L32.0767 17.8359ZM27.1069 22.0713L26.6712 22.4837C26.8906 22.7156 27.2532 22.735 27.4961 22.528L27.1069 22.0713ZM23.5981 18.3643L24.0339 17.9518C23.8106 17.7159 23.4401 17.7005 23.198 17.9171L23.5981 18.3643ZM19.9019 21.6719L19.4653 22.0835C19.6885 22.3202 20.0596 22.3359 20.302 22.119L19.9019 21.6719ZM15.4673 16.9688L15.0941 16.4989C14.9626 16.6034 14.8809 16.7582 14.8688 16.9257C14.8568 17.0933 14.9155 17.2582 15.0307 17.3804L15.4673 16.9688ZM19.355 13.8809L19.7282 14.3507C19.8598 14.2461 19.9416 14.091 19.9535 13.9233C19.9654 13.7555 19.9063 13.5905 19.7907 13.4684L19.355 13.8809ZM15.7798 10.1045L15.3633 9.67263C15.1263 9.90117 15.1178 10.2779 15.3441 10.517L15.7798 10.1045ZM20.3755 5.67188L20.8079 5.2559C20.6975 5.14112 20.5459 5.07496 20.3867 5.07198C20.2275 5.069 20.0736 5.12945 19.959 5.24002L20.3755 5.67188ZM24.4106 9.86621L24.7837 10.3361L29.2808 6.76581L28.9077 6.2959L28.5346 5.82599L24.0376 9.3963L24.4106 9.86621ZM28.9077 6.2959L28.4321 6.6617L31.7671 10.9976L32.2427 10.6318L32.7183 10.266L29.3833 5.9301L28.9077 6.2959ZM32.2427 10.6318L31.8427 10.1846L28.0283 13.5957L28.4282 14.043L28.8282 14.4902L32.6426 11.0791L32.2427 10.6318ZM28.4282 14.043L27.9958 14.4589L31.6442 18.2519L32.0767 17.8359L32.5091 17.42L28.8606 13.627L28.4282 14.043ZM32.0767 17.8359L31.6875 17.3793L26.7178 21.6146L27.1069 22.0713L27.4961 22.528L32.4658 18.2926L32.0767 17.8359ZM27.1069 22.0713L27.5427 21.6588L24.0339 17.9518L23.5981 18.3643L23.1624 18.7767L26.6712 22.4837L27.1069 22.0713ZM23.5981 18.3643L23.198 17.9171L19.5018 21.2248L19.9019 21.6719L20.302 22.119L23.9982 18.8114L23.5981 18.3643ZM19.9019 21.6719L20.3384 21.2603L15.9038 16.5571L15.4673 16.9688L15.0307 17.3804L19.4653 22.0835L19.9019 21.6719ZM15.4673 16.9688L15.8405 17.4386L19.7282 14.3507L19.355 13.8809L18.9818 13.411L15.0941 16.4989L15.4673 16.9688ZM19.355 13.8809L19.7907 13.4684L16.2155 9.69199L15.7798 10.1045L15.3441 10.517L18.9193 14.2934L19.355 13.8809ZM15.7798 10.1045L16.1963 10.5363L20.792 6.10373L20.3755 5.67188L19.959 5.24002L15.3633 9.67263L15.7798 10.1045ZM20.3755 5.67188L19.9431 6.08785L23.9783 10.2822L24.4106 9.86621L24.843 9.45023L20.8079 5.2559L20.3755 5.67188Z" fill="black" mask="url(#path-11-outside-1_2035_6990)" />
                                        <defs>
                                            <filter id="filter0_dd_2035_6990" x="0.525879" y="0.398438" width="43.1038" height="31.9414" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
                                                <feFlood floodOpacity="0" result="BackgroundImageFix" />
                                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                                <feOffset dx="0.2" dy="2.5" />
                                                <feComposite in2="hardAlpha" operator="out" />
                                                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0" />
                                                <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_2035_6990" />
                                                <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha" />
                                                <feOffset dy="0.6" />
                                                <feComposite in2="hardAlpha" operator="out" />
                                                <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" />
                                                <feBlend mode="normal" in2="effect1_dropShadow_2035_6990" result="effect2_dropShadow_2035_6990" />
                                                <feBlend mode="normal" in="SourceGraphic" in2="effect2_dropShadow_2035_6990" result="shape" />
                                            </filter>
                                        </defs>
                                    </svg>
                                </div> */}
                            </div>

                            {/* Better looking arrow */}
                            <div className="flex items-center justify-center flex-shrink-0">
                                <svg className="w-16 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                            </div>

                            {/* Normal green chest - no background */}
                            <div className="w-[96px] h-[96px] flex-shrink-0 flex items-center justify-center">
                                <MemoizedImage
                                    className="w-full h-full object-contain"
                                    alt="Normal reward"
                                    src="/assets/animaapp/ciot1lOr/img/2211-w030-n003-510b-p1-510--converted--02-1-3-2x.png"
                                    loading="lazy"
                                />
                            </div>
                        </div>
                    )}

                    <div className="absolute top-[calc(50.00%_-_86px)] left-0 w-full h-[35px] flex justify-center bg-[#ffffff1a]">
                        <p className="w-auto px-4 ml-[1.0px] mt-[12.5px] h-[19px] [font-family:'Poppins',Helvetica] font-semibold text-white text-[12.5px] text-center tracking-[0] leading-[normal]">
                            {isFutureWeek ? "DAY 7 (Big Reward!)" : isBigRewardEligible ? "DAY 7 (Big Reward!)" : "DAY 7 (Big Reward Cancelled)"}
                        </p>
                    </div>

                    <MemoizedImage
                        className="absolute top-[calc(50.00%_-_28px)] left-[-789px] w-[55px] h-[55px] aspect-[1] object-cover"
                        alt=""
                        src="/assets/animaapp/ciot1lOr/img/image-3943-2x.png"
                        loading="lazy"
                    />

                    <MemoizedButton
                        onClick={() => handleClaimClick(7)}
                        disabled={day7Data.status !== 'claimable' || day7Data.isMissed || day7Data.isFutureWeek || claimingDay === 7 || locallyClaimedDays.has(7) || day7Data.status === 'claimed'}
                        className={`w-full ${day7Data.status === 'claimed'
                            ? "bg-[#2a2f50]"
                            : day7Data.status === 'missed'
                                ? "bg-[#2a2f50]"
                                : day7Data.status === 'claimable'
                                    ? "bg-[linear-gradient(331deg,rgba(237,131,0,1)_0%,rgba(237,166,0,1)_100%)]"
                                    : "bg-[#ef890f4c]"
                            } absolute top-[126px] left-0 h-11 rounded-[0px_0px_3.13px_3.13px] overflow-hidden ${day7Data.status === 'claimable' && !day7Data.isMissed && !day7Data.isFutureWeek && claimingDay !== 7 && !locallyClaimedDays.has(7) && day7Data.status !== 'claimed'
                                ? 'cursor-pointer'
                                : 'cursor-not-allowed opacity-75'
                            }`}
                        ariaLabel="Claim day 7 reward"
                    >
                        <img
                            className="absolute w-full h-11 top-0 left-0"
                            alt="Clip path group"
                            src="/assets/animaapp/ciot1lOr/img/clip-path-group-6-2x.png"
                        />

                        <div className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${day7Data.status === 'claimed'
                            ? "text-[#8b92de]"
                            : day7Data.status === 'missed' || day7Data.isMissed
                                ? "text-[#8b92de]"
                                : day7Data.status === 'claimable'
                                    ? "text-white"
                                    : "text-[#ffffff66]"
                            } text-[15.6px] [font-family:'Poppins',Helvetica] font-medium tracking-[0] leading-[18.8px] whitespace-nowrap text-center flex items-center gap-2 justify-center ${day7Data.status === 'claimable' && !day7Data.isMissed && !day7Data.isFutureWeek ? 'opacity-100' : 'opacity-40'
                            }`}>
                            {claimingDay === 7 ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Claiming...</span>
                                </>
                            ) : (
                                day7Data.status === 'claimed'
                                    ? (!isBigRewardEligible ? 'NORMAL REWARD CLAIMED' : 'CLAIMED')
                                    : day7Data.status === 'missed' || day7Data.isMissed
                                        ? 'UNCLAIMED'
                                        : day7Data.status === 'claimable' && !day7Data.isFutureWeek
                                            ? 'CLAIM NOW'
                                            : 'LOCKED'
                            )}
                        </div>
                    </MemoizedButton>
                </article>
            )}

            {/* Big Reward Animation */}
            <BigRewardAnimation
                isEligible={showBigRewardAnimation}
                onAnimationComplete={() => setShowBigRewardAnimation(false)}
            />
            <section className=" ">
                <div className="w-full max-w-[335px] sm:max-w-[375px] mx-auto">
                    <div className="w-full p-4 sm:p-6 rounded-lg bg-[linear-gradient(to_right,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0.1)_50%,rgba(0,0,0,0.9)_100%)] shadow-lg border border-white/20">
                        <div className="flex flex-col justify-start gap-2">
                            <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-[#f4f3fc] text-[14px] sm:text-[14px] ">
                                Disclaimer
                            </h2>
                            <p className="[font-family:'Poppins',Helvetica] font-light text-[#FFFFFF] text-[13px] sm:text-base text-start leading-5 sm:leading-6">
                                Points ar for loyalty use only and do not reflect real-world currency
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            {/* Error Modal */}
            {error && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-black border border-gray-600 rounded-lg p-6 max-w-sm mx-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-white text-lg font-semibold">Error</h3>
                            <button
                                onClick={() => setError(null)}
                                className="text-white hover:text-gray-400 text-xl transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                        <p className="text-red-500 text-sm">{error}</p>
                    </div>
                </div>
            )}
        </section>
    );
};