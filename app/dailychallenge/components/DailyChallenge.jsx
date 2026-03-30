import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getDailyChallengeCalendar } from "@/lib/api";
import { useDispatch, useSelector } from "react-redux";
import { useAuth } from "../../../contexts/AuthContext";
import {
    fetchCalendar,
    fetchToday,
    fetchBonusDays,
    setModalOpen,
    clearError
} from "../../../lib/redux/slice/dailyChallengeSlice";
import { BannerSection } from "./BannerSection";
import { ChallengeGroupSection } from "./ChallengeGroupSection";
import { ChallengeModal } from "./ChallengeModal";

export const DailyChallenge = () => {
    const router = useRouter();
    // Redux state and dispatch
    const dispatch = useDispatch();
    const { token } = useAuth() || {};
    const {
        calendar,
        today,
        streak,
        calendarStatus,
        todayStatus,
        bonusDaysStatus,
        bonusDaysCacheTimestamp,
        modalOpen,
        error
    } = useSelector((state) => state.dailyChallenge || {});

    const [pullRefreshState, setPullRefreshState] = useState('idle'); // 'idle', 'pulling', 'refreshing'
    const [pullDistance, setPullDistance] = useState(0);
    const touchStartY = useRef(0);
    const isPulling = useRef(false);

    const [isMonthLoading, setIsMonthLoading] = useState(false);
    const [pendingCalendar, setPendingCalendar] = useState(null);
    const [showCompletedModal, setShowCompletedModal] = useState(false);
    const calendarCacheRef = useRef({});
    const isLoading = calendarStatus === "loading" || todayStatus === "loading" || isMonthLoading;

    // Handle pull-to-refresh
    const handleTouchStart = (e) => {
        if (window.scrollY === 0 && !isLoading) {
            touchStartY.current = e.touches[0].clientY;
            isPulling.current = true;
        }
    };

    const handleTouchMove = (e) => {
        if (!isPulling.current || isLoading) return;

        const currentY = e.touches[0].clientY;
        const distance = currentY - touchStartY.current;

        if (distance > 0) {
            e.preventDefault();
            const pullDistance = Math.min(distance * 0.5, 80); // Max pull distance of 80px
            setPullDistance(pullDistance);

            if (pullDistance > 50) {
                setPullRefreshState('pulling');
            }
        }
    };

    const handleTouchEnd = () => {
        if (!isPulling.current) return;

        isPulling.current = false;

        if (pullDistance > 50) {
            setPullRefreshState('refreshing');
            handleRefresh();

            // Reset after animation
            setTimeout(() => {
                setPullRefreshState('idle');
                setPullDistance(0);
            }, 1000);
        } else {
            setPullRefreshState('idle');
            setPullDistance(0);
        }
    };

    // Fetch all data on component mount — calendar, today, and bonus days (progress bar)
    useEffect(() => {
        if (!token) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const CACHE_STALE_MS = 5 * 60 * 1000;

        if (calendarStatus === "idle") {
            dispatch(fetchCalendar({ year, month, token }));
        }
        if (todayStatus === "idle") {
            dispatch(fetchToday({ token }));
        }
        // fetchBonusDays is owned here — ChallengeGroupSection only reads Redux, never dispatches
        const hasFreshBonus = bonusDaysCacheTimestamp && Date.now() - bonusDaysCacheTimestamp < CACHE_STALE_MS;
        if (!hasFreshBonus && bonusDaysStatus !== "loading") {
            dispatch(fetchBonusDays({ token }));
        }
    }, [dispatch, token]); // Only depend on dispatch and token to prevent infinite loops

    // Listen for global challenge update events
    useEffect(() => {
        const handleChallengeUpdate = () => {
            handleRefresh();
        };

        window.addEventListener('dailyChallengeUpdate', handleChallengeUpdate);
        return () => window.removeEventListener('dailyChallengeUpdate', handleChallengeUpdate);
    }, [token]); // Include token in dependency to ensure handleRefresh has latest token

    // Keep local loading true during month navigation until calendar request settles
    useEffect(() => {
        if (calendarStatus === "loading") {
            setIsMonthLoading(true);
        } else {
            setIsMonthLoading(false);
            setPendingCalendar(null);
        }
    }, [calendarStatus]);

    // Cache the loaded calendar keyed by "year-month" for instant reuse
    useEffect(() => {
        if (calendar && calendarStatus === "succeeded" && typeof calendar.year === 'number' && typeof calendar.month === 'number') {
            const key = `${calendar.year}-${calendar.month}`;
            calendarCacheRef.current[key] = calendar;
        }
    }, [calendar, calendarStatus]);

    // Prefetch adjacent months via API (no UI swap) to have data ready before click
    useEffect(() => {
        if (!token) return;
        const baseYear = calendar?.year ?? new Date().getFullYear();
        const baseMonth = calendar?.month ?? new Date().getMonth();
        const base = new Date(baseYear, baseMonth, 1);
        const prev = new Date(base);
        prev.setMonth(prev.getMonth() - 1);
        const next = new Date(base);
        next.setMonth(next.getMonth() + 1);

        const tasks = [
            { y: prev.getFullYear(), m: prev.getMonth() },
            { y: next.getFullYear(), m: next.getMonth() },
        ];

        tasks.forEach(async ({ y, m }) => {
            const cacheKey = `${y}-${m}`;
            if (calendarCacheRef.current[cacheKey]) return;
            try {
                const resp = await getDailyChallengeCalendar(y, m, token);
                if (resp?.success && resp.data) {
                    calendarCacheRef.current[cacheKey] = resp.data;
                }
            } catch (_e) {
                // ignore prefetch errors
            }
        });
    }, [token, calendar?.year, calendar?.month]);

    const generateSkeletonCalendar = (year, month) => {
        try {
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            // Show only the month label during preview to avoid confusing placeholder years
            const monthName = firstDay.toLocaleString('en-US', { month: 'long' }).toUpperCase();

            const startWeekday = firstDay.getDay(); // 0-6 (Sun-Sat)
            const daysInMonth = lastDay.getDate();

            const calendarDays = new Array(42).fill(null).map((_, index) => {
                const dayOffset = index - startWeekday + 1; // day numbers start at 1
                const inCurrent = dayOffset >= 1 && dayOffset <= daysInMonth;
                const dateObj = new Date(year, month, inCurrent ? dayOffset : 1);
                return {
                    day: inCurrent ? String(dayOffset) : "",
                    isToday: false,
                    isCompleted: false,
                    isMissed: false,
                    isLocked: !inCurrent,
                    isClickable: false,
                    isFuture: !inCurrent && index > startWeekday + daysInMonth - 1,
                    isPast: !inCurrent && index < startWeekday,
                    isCurrentMonth: inCurrent,
                    isPrevMonth: !inCurrent && index < startWeekday,
                    isNextMonth: !inCurrent && index > startWeekday + daysInMonth - 1,
                    challenge: null,
                    progress: null,
                    isMilestone: false,
                    date: dateObj.toISOString(),
                    dayOfWeek: index % 7,
                };
            });

            return {
                year,
                month,
                monthName,
                calendarDays,
                streak: calendar?.streak || { current: 0 },
            };
        } catch (e) {
            return { monthName: "", calendarDays: [] };
        }
    };

    // Handle month navigation
    const handlePreviousMonth = () => {
        if (isMonthLoading || calendarStatus === "loading") return;
        if (!token) return;

        const currentDate = new Date(calendar?.year || new Date().getFullYear(), calendar?.month || new Date().getMonth());
        const previousMonth = new Date(currentDate);
        previousMonth.setMonth(previousMonth.getMonth() - 1);

        setIsMonthLoading(true);
        {
            const key = `${previousMonth.getFullYear()}-${previousMonth.getMonth()}`;
            const cached = calendarCacheRef.current[key];
            setPendingCalendar(cached || generateSkeletonCalendar(previousMonth.getFullYear(), previousMonth.getMonth()));
        }
        dispatch(fetchCalendar({
            year: previousMonth.getFullYear(),
            month: previousMonth.getMonth(),
            token
        }));
    };

    const handleNextMonth = () => {
        if (isMonthLoading || calendarStatus === "loading") return;
        if (!token) return;

        const currentDate = new Date(calendar?.year || new Date().getFullYear(), calendar?.month || new Date().getMonth());
        const nextMonth = new Date(currentDate);
        nextMonth.setMonth(nextMonth.getMonth() + 1);

        setIsMonthLoading(true);
        {
            const key = `${nextMonth.getFullYear()}-${nextMonth.getMonth()}`;
            const cached = calendarCacheRef.current[key];
            setPendingCalendar(cached || generateSkeletonCalendar(nextMonth.getFullYear(), nextMonth.getMonth()));
        }
        dispatch(fetchCalendar({
            year: nextMonth.getFullYear(),
            month: nextMonth.getMonth(),
            token
        }));
    };

    // Handle refresh - force refresh calendar, today, and bonus days together
    const handleRefresh = () => {
        if (!token) return;

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        dispatch(fetchCalendar({ year, month, token, force: true }));
        dispatch(fetchToday({ token, force: true }));
        dispatch(fetchBonusDays({ token, force: true }));
    };

    // Handle today click - navigate to current month and open today's challenge
    const handleTodayClick = () => {
        if (isMonthLoading || calendarStatus === "loading") return;
        if (!token) return;

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        // Check if we're already on the current month
        const isCurrentMonth = calendar?.year === currentYear && calendar?.month === currentMonth;

        if (!isCurrentMonth) {
            setIsMonthLoading(true);
            {
                const key = `${currentYear}-${currentMonth}`;
                const cached = calendarCacheRef.current[key];
                setPendingCalendar(cached || generateSkeletonCalendar(currentYear, currentMonth));
            }
            dispatch(fetchCalendar({
                year: currentYear,
                month: currentMonth,
                token
            }));
        } else {
            // Already on current month, open today's challenge modal
            if (today?.hasChallenge) {
                const isCompleted = today?.progress?.status === "completed" || today?.completed === true;
                if (isCompleted) {
                    setShowCompletedModal(true);
                } else {
                    dispatch(setModalOpen(true));
                }
            } else {
                // Show message that no challenge is available today
                alert("No challenge available for today. Check back tomorrow!");
            }
        }
    };

    // Generate streak indicators dynamically based on streak data
    const generateStreakIndicators = () => {
        if (!streak?.current) return [];
        const indicators = [];
        const positions = ["64px", "148px", "190px", "233px", "276px", "318px"];
        for (let i = 0; i < 6; i++) {
            const hasStreak = i < Math.floor(streak.current / 5);
            indicators.push({
                left: positions[i],
                top: "527px",
                // image: hasStreak
                //     ? "https://c.animaapp.com/b23YVSTi/img/image-3943-7@2x.png"
                //     : "https://c.animaapp.com/b23YVSTi/img/image-3943-6@2x.png",
                hasStreak,
            });
        }
        return indicators;
    };

    const streakIndicators = generateStreakIndicators();

    // Generate treasure chests dynamically based on milestone progress
    const generateTreasureChests = () => {
        if (!streak?.milestones) return [];

        const chests = [];
        const positions = [
            { left: "43px", top: "calc(50.00%_-_247px)", width: "31px", height: "35px" },
            { left: "123px", top: "calc(50.00%_-_259px)", width: "37px", height: "47px" },
            { left: "203px", top: "calc(50.00%_-_270px)", width: "55px", height: "58px" },
        ];

        const images = [
            "https://c.animaapp.com/b23YVSTi/img/2211-w030-n003-510b-p1-510--converted--02-2@2x.png",
            "https://c.animaapp.com/b23YVSTi/img/2211-w030-n003-510b-p1-510--converted--02-3@2x.png",
            "https://c.animaapp.com/b23YVSTi/img/2211-w030-n003-510b-p1-510--converted--02-4@2x.png",
        ];

        streak.milestones.forEach((milestone, index) => {
            if (index < positions.length) {
                const isUnlocked = streak.current >= milestone;
                chests.push({
                    ...positions[index],
                    src: images[index],
                    isUnlocked,
                    milestone,
                });
            }
        });

        return chests;
    };

    const treasureChests = generateTreasureChests();

    // Generate coin badges dynamically based on today's challenge rewards
    const generateCoinBadges = () => {
        // If no challenge today, don't show badges
        if (!today?.hasChallenge) return [];

        const badges = [];
        const positions = ["56.80%", "84.53%"];
        const images = [
            "https://c.animaapp.com/b23YVSTi/img/ellipse-35-1.svg",
            "https://c.animaapp.com/b23YVSTi/img/ellipse-35-2.svg",
        ];

        // Get actual rewards from challenge data
        // Only use challenge data if rewards are not available
        const coins = today?.rewards?.coins ?? today?.challenge?.coinReward;
        const xp = today?.rewards?.xp ?? today?.challenge?.xpReward;

        // Only show badges if we have actual reward values from challenge
        // Don't show default placeholder values (50 and 100) when there's no actual challenge reward data
        const hasActualCoinReward = today?.rewards?.coins !== undefined || today?.challenge?.coinReward !== undefined;
        const hasActualXpReward = today?.rewards?.xp !== undefined || today?.challenge?.xpReward !== undefined;

        // Show coin badge only if we have actual reward data (not just defaults)
        if (hasActualCoinReward && coins !== undefined && coins !== null && coins > 0) {
            badges.push({
                left: positions[0],
                value: coins.toString(),
                bgImage: images[0],
            });
        }

        // Show XP badge only if we have actual reward data (not just defaults)
        if (hasActualXpReward && xp !== undefined && xp !== null && xp > 0) {
            badges.push({
                left: positions[1],
                value: xp.toString(),
                bgImage: images[1],
            });
        }

        return badges;
    };

    const coinBadges = generateCoinBadges();


    return (
        <div
            className="relative w-full min-h-screen bg-black flex flex-col items-center"
            data-model-id="3291:8378"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Pull-to-refresh indicator */}
            {(pullRefreshState === 'pulling' || pullRefreshState === 'refreshing') && (
                <div
                    className="absolute top-0 left-0 right-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-all duration-300"
                    style={{
                        height: pullDistance,
                        transform: `translateY(${pullRefreshState === 'refreshing' ? 0 : -pullDistance}px)`
                    }}
                >
                    <div className="flex items-center gap-2 text-white">
                        <svg
                            className={`w-5 h-5 ${pullRefreshState === 'refreshing' ? 'animate-spin' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                        <span className="text-sm font-medium">
                            {pullRefreshState === 'refreshing' ? 'Refreshing...' : 'Pull to refresh'}
                        </span>
                    </div>
                </div>
            )}
            <div className="absolute top-[8px] left-7 [font-family:'Poppins',Helvetica] font-light text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
                App Version: V0.0.1
            </div>

            {/* Removed status bar */}

            <header className="flex flex-col w-full max-w-[375px] items-start gap-2 px-5 py-3 mt-[36px]">
                <nav className="items-center gap-4 self-stretch w-full rounded-[32px] flex relative flex-[0_0_auto]">
                    <button aria-label="Go back" onClick={() => router.back()}>
                        <img
                            className="relative w-6 h-6"
                            alt="Arrow back ios new"
                            src="https://c.animaapp.com/b23YVSTi/img/arrow-back-ios-new@2x.png"
                        />
                    </button>

                    <h1 className="relative flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-5">
                        Daily Challenge
                    </h1>

                    <button
                        onClick={handleRefresh}
                        disabled={isLoading}
                        className={`relative w-6 h-6 transition-opacity ${isLoading ? 'opacity-50' : 'hover:opacity-80'}`}
                        aria-label="Refresh challenges"
                        title="Refresh challenges"
                    >
                        <svg
                            className={`w-6 h-6 ${isLoading ? 'animate-spin text-gray-400' : 'text-white'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                        </svg>
                    </button>
                </nav>
            </header>

            {/* Progress bar - always below heading */}
            <div className="w-full max-w-[375px] px-4 pb-1 mt-[8vh] mb-2">
                <ChallengeGroupSection streak={streak} />
            </div>

            <div className="flex-1 w-full max-w-[375px] flex flex-col items-center justify-start px-4 pt-8 ">
                {isLoading && !pendingCalendar ? (
                    <section className="flex flex-col w-full max-w-[335px] h-[343px]  items-center gap-2.5">
                        <article className="relative w-full max-w-[335px] h-[343px] rounded-[17.96px] border border-gray-700/40 bg-gray-900 animate-pulse" />
                    </section>
                ) : (
                    <BannerSection
                        calendar={pendingCalendar || calendar}
                        today={today}
                        onDayClick={(dayData) => {
                            if (dayData.isToday) {
                                if (today?.hasChallenge) {
                                    const isCompleted = today?.progress?.status === "completed" || today?.completed === true;
                                    if (isCompleted) {
                                        setShowCompletedModal(true);
                                    } else {
                                        dispatch(setModalOpen(true));
                                    }
                                } else {
                                    alert("No challenge available for today. Check back tomorrow!");
                                }
                            }
                        }}
                        onPreviousMonth={handlePreviousMonth}
                        onNextMonth={handleNextMonth}
                        onTodayClick={handleTodayClick}
                        isDisabled={isMonthLoading}
                    />
                )}

                {/* Bottom button - directly below calendar */}
                <div className="w-full max-w-[375px] px-4 pb-2 mt-8">
                    <button
                        className={`relative w-full h-12 rounded-[12.97px] overflow-hidden transition-transform duration-150 scale-100 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 shadow-lg border-2 border-white/20 ${isLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'} bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)]`}
                        style={{
                            boxShadow: '0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                            transform: 'translateZ(10px)',
                            transformStyle: 'preserve-3d'
                        }}
                        onClick={isLoading ? undefined : handleTodayClick}
                        aria-label="Check Daily Challenge"
                        type="button"
                        disabled={isLoading}
                    >
                        <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-base text-center tracking-[0] leading-[normal] whitespace-nowrap">
                            {isLoading ? 'Loading…' : 'Check Daily Challenge'}
                        </span>
                    </button>
                </div>
            </div>

            <div className="top-[566px] left-16 absolute w-3 h-3">

            </div>

            {/* {streakIndicators.map((indicator, index) => (
                <div
                    key={index}
                    style={{ top: indicator.top, left: indicator.left }}
                    className="absolute w-3 h-3"
                >
                    <img
                        className="absolute top-px left-px w-2.5 h-2.5 aspect-[1] object-cover"
                        alt="Streak indicator"
                        src={indicator.image}
                    />
                    <div className="absolute top-0 left-0 w-3 h-3 bg-[#d6d6d680] rounded-md" />
                </div>
            ))} */}

            {coinBadges.map((badge, index) => {
                // Hide text if it's "40", "50", "90", or "100" as requested by user
                // These are the numbers that appear below the chest icons in light color
                const shouldHideText = badge.value === "40" || badge.value === "50" || badge.value === "90" || badge.value === "100";

                // Hide entire badge (text and background circle) if value is "200" or "130"
                const shouldHideBadge = badge.value === "200" || badge.value === "130";

                // Don't render the badge at all if it should be hidden
                if (shouldHideBadge) {
                    return null;
                }

                // return (
                //     <div
                //         key={index}
                //         className="absolute w-[8.54%] h-[3.63%] top-[24.63%] opacity-50"
                //         style={{ left: badge.left }}
                //     >
                //         <div className="absolute w-[30px] h-[29px] top-0 left-0 flex">
                //             <div
                //                 className="flex-1 w-[30.03px] bg-[100%_100%]"
                //                 style={{ backgroundImage: `url(${badge.bgImage})` }}
                //             >
                //                 <div className="relative w-[50.00%] h-[46.43%] top-[27.62%] left-[25.00%] overflow-hidden">
                //                     <img
                //                         className="absolute w-full h-full top-[-477406.21%] left-[99394.81%]"
                //                         alt="Coin icon"
                //                         src="/img/vector.png"
                //                     />
                //                 </div>
                //             </div>
                //         </div>
                //         {/* Hide numbers 40, 50, 90, and 100 that appear below chest icons */}
                //         {!shouldHideText && (
                //             <div className="absolute w-[59.33%] h-[74.01%] top-[13.72%] left-[19.56%] [font-family:'Poppins',Helvetica] font-semibold text-[#815c23] text-[14.9px] tracking-[0.02px] leading-[normal]">
                //                 {badge.value}
                //             </div>
                //         )}
                //     </div>
                // );
            })}




            {/* Already Completed Modal */}
            {showCompletedModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 rounded-lg p-6 w-full max-w-sm border border-gray-700">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">
                                {today?.challenge?.title || today?.challenge?.gameName || "Spin the Wheel"}
                            </h2>
                            <button
                                onClick={() => setShowCompletedModal(false)}
                                className="text-gray-400 hover:text-white text-2xl"
                            >
                                ×
                            </button>
                        </div>
                        <div className="flex flex-col items-center gap-3 py-4">
                            <span className="text-4xl">✅</span>
                            <p className="text-white text-base font-semibold text-center">
                                {today?.challenge?.type === "spin" ? "Spin Completed!" : "Challenge Completed!"}
                            </p>
                            <p className="text-gray-400 text-sm text-center">
                                You've already completed today's challenge. Come back tomorrow!
                            </p>
                        </div>
                        <button
                            onClick={() => setShowCompletedModal(false)}
                            className="w-full mt-2 py-3 rounded-lg bg-gradient-to-b from-[#9EADF7] to-[#716AE7] text-white font-semibold text-sm"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}

            {/* Challenge Modal */}
            <ChallengeModal
                isOpen={modalOpen}
                onClose={() => dispatch(setModalOpen(false))}
                today={today}
                onStartChallenge={() => {
                }}
            />

            {/* Error Display */}
            {error && (
                <div className="fixed top-4 left-4 right-4 bg-red-500/90 text-white p-3 rounded-lg z-50">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Error: {error}</span>
                        <button
                            onClick={() => dispatch(clearError())}
                            className="text-white hover:text-gray-200"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};
