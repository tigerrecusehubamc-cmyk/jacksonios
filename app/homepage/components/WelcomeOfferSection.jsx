"use client";
import React, { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getWelcomeBonusTasks } from "@/lib/api";
import { onWelcomeBonusComplete } from "@/lib/adjustService";
import { WelcomeOffer } from "../../../components/WelcomeOffer";
import { QuestCard } from "../../../components/QuestCard";

const WelcomeOfferSection = () => {
    const { token } = useAuth();
    const [bonusTasksData, setBonusTasksData] = useState(null);
    const [error, setError] = useState(null);
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const containerRef = useRef(null);
    const pollingIntervalRef = useRef(null);
    const welcomeBonusFiredRef = useRef(false); // fire onWelcomeBonusComplete only once

    // Map API response to QuestCard expected format
    const mapApiResponseToGames = (apiData) => {
        if (!apiData || !apiData.games) return null;

        const mappedGames = apiData.games.map((game) => {
            // Map bonusTasks to goals format
            const goals = game.bonusTasks.map((task) => ({
                goal_id: task.taskId,
                text: task.name || task.description || `Task ${task.order}`,
                title: task.name || task.description || `Task ${task.order}`,
                completed: task.isCompleted,
                isUnlocked: task.isUnlocked,
                order: task.order,
                isExpired: task.isExpired,
                completionDeadline: task.completionDeadline,
                timeRemaining: task.timeRemaining, // in milliseconds from API
                reward: task.reward,
                rewardEligible: task.rewardEligible,
                rewardAwarded: task.rewardAwarded,
            }));

            return {
                gameId: game.gameId,
                title: game.gameTitle,
                details: {
                    name: game.gameTitle,
                },
                square_image: game.gameImage,
                image: game.gameImage,
                // Use first task's completion deadline or calculate from unlock time
                quest_end_time: game.bonusTasks[0]?.completionDeadline || null,
                // Default rewards (100 coins + 20 XP per task)
                coins: 100,
                xp: 20,
                goals: goals,
                // Store original API data for reference
                _apiData: {
                    gameStatus: game.gameStatus,
                    minimumEventThreshold: game.minimumEventThreshold,
                    completionDeadlineHours: game.completionDeadlineHours,
                    userProgress: game.userProgress,
                },
            };
        });

        return {
            games: mappedGames,
            rewards: apiData.rewards,
            userBalance: apiData.userBalance,
        };
    };

    // Load cached data immediately on mount
    useEffect(() => {
        const CACHE_KEY = "welcomeBonusTasks";
        try {
            const cached = localStorage.getItem(CACHE_KEY);
            if (cached) {
                const cacheData = JSON.parse(cached);
                const mapped = mapApiResponseToGames(cacheData.data);
                if (mapped) {
                    setBonusTasksData(mapped);
                }
            }
        } catch (err) {
            console.warn("Failed to load cached welcome bonus tasks:", err);
        }
    }, []);

    // Fetch welcome bonus tasks from API (background, non-blocking)
    const fetchBonusTasks = useCallback(async (isBackground = false) => {
        if (!token) return;

        try {
            // Don't set loading state for background refreshes
            if (!isBackground) {
                setError(null);
            }

            const response = await getWelcomeBonusTasks(token);

            if (response.success && response.data) {
                // Cache the response
                const CACHE_KEY = "welcomeBonusTasks";
                const cacheData = {
                    data: response.data,
                    timestamp: Date.now(),
                };
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
                } catch (err) {
                    console.warn("Failed to cache welcome bonus tasks:", err);
                }

                // Map and update state
                const mapped = mapApiResponseToGames(response.data);
                if (mapped) {
                    setBonusTasksData(mapped);
                    setError(null);
                    // Fire Adjust event when all welcome bonus tasks are complete (once per session)
                    if (!welcomeBonusFiredRef.current && mapped.games.length > 0) {
                        const allDone = mapped.games.every(g => g.goals.every(goal => goal.completed));
                        if (allDone) {
                            welcomeBonusFiredRef.current = true;
                            onWelcomeBonusComplete();
                        }
                    }
                } else {
                    setBonusTasksData({ games: [], rewards: null, userBalance: null });
                }
            } else {
                if (!isBackground) {
                    setError(response.error || "Failed to fetch bonus tasks");
                }
                setBonusTasksData(prev => prev || { games: [], rewards: null, userBalance: null });
            }
        } catch (err) {
            console.error("Error fetching welcome bonus tasks:", err);
            if (!isBackground) {
                setError(err.message || "Failed to fetch bonus tasks");
            }
            setBonusTasksData(prev => prev || { games: [], rewards: null, userBalance: null });
        }
    }, [token]);

    // Initial fetch and setup polling
    useEffect(() => {
        if (!token) return;

        // Initial fetch (non-blocking, uses cache if available)
        fetchBonusTasks(false);

        // Set up background polling every 30 seconds to auto-update when tasks complete
        pollingIntervalRef.current = setInterval(() => {
            fetchBonusTasks(true); // Background refresh
        }, 30000); // 30 seconds

        // Cleanup interval on unmount or token change
        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
            }
        };
    }, [token, fetchBonusTasks]);

    // OPTIMIZED: Memoize expensive calculations
    const gameData = useMemo(() => {
        const hasDownloadedGames = bonusTasksData?.games && Array.isArray(bonusTasksData.games) && bonusTasksData.games.length > 0;
        const allGames = hasDownloadedGames ? bonusTasksData.games : [];

        return {
            hasDownloadedGames,
            allGames,
            isLoading: false, // No loading state - show cached data immediately
        };
    }, [bonusTasksData]);

    // Handle touch events for swipe functionality
    const handleTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const handleTouchMove = (e) => {
        setTouchEnd(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = () => {
        if (!touchStart || !touchEnd) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > 50;
        const isRightSwipe = distance < -50;

        if (isLeftSwipe && currentCardIndex < gameData.allGames.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
        }
        if (isRightSwipe && currentCardIndex > 0) {
            setCurrentCardIndex(prev => prev - 1);
        }
    };

    // Reset card index when games change
    useEffect(() => {
        setCurrentCardIndex(0);
    }, [gameData.allGames.length]);

    // Show error state if needed (silent, don't block UI)
    if (error) {
        console.warn("Welcome bonus tasks error:", error);
    }

    return (
        <div className="flex flex-col items-start gap-4 relative w-full">
            <div className="flex w-full items-center ml-[5.5px] justify-between ">
                <p className="text-[#F4F3FC] [font-family:'Poppins',Helvetica] font-semibold text-[19px] tracking-[0] leading-[normal] text-nowrap ">
                    💸💸Fast Fun, Real Rewards!💸💸
                </p>
            </div>

            {/* Conditional Rendering with Swipeable Cards */}
            <div className="relative w-full overflow-visible">
                {/* Show cached data immediately, no loading spinner */}
                {gameData.hasDownloadedGames ? (
                    <div className="relative">
                        {/* Swipeable Quest Cards */}
                        <div
                            ref={containerRef}
                            className="relative w-full flex items-center justify-center"
                            onTouchStart={handleTouchStart}
                            onTouchMove={handleTouchMove}
                            onTouchEnd={handleTouchEnd}
                        >
                            <QuestCard game={gameData.allGames[currentCardIndex]} />
                        </div>

                        {/* Card Navigation Indicators */}
                        {gameData.allGames.length > 1 && (
                            <div className="flex justify-center items-center gap-2 mt-4">
                                <button
                                    onClick={() => setCurrentCardIndex(prev => Math.max(0, prev - 1))}
                                    disabled={currentCardIndex === 0}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${currentCardIndex === 0
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-purple-600 text-white hover:bg-purple-700'
                                        }`}
                                >
                                    ← Prev
                                </button>

                                {/* Dots indicator */}
                                <div className="flex gap-1">
                                    {gameData.allGames.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentCardIndex(index)}
                                            className={`w-2 h-2 rounded-full transition-all duration-200 ${index === currentCardIndex
                                                ? 'bg-purple-500 scale-125'
                                                : 'bg-gray-400 hover:bg-gray-300'
                                                }`}
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={() => setCurrentCardIndex(prev => Math.min(gameData.allGames.length - 1, prev + 1))}
                                    disabled={currentCardIndex === gameData.allGames.length - 1}
                                    className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${currentCardIndex === gameData.allGames.length - 1
                                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                        : 'bg-purple-600 text-white hover:bg-purple-700'
                                        }`}
                                >
                                    Next →
                                </button>
                            </div>
                        )}

                        {/* Card Counter */}
                        {gameData.allGames.length > 1 && (
                            <div className="text-center mt-2">
                                <span className="text-sm text-gray-400 [font-family:'Poppins',Helvetica]">
                                    {currentCardIndex + 1} of {gameData.allGames.length} games
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <WelcomeOffer />
                )}
            </div>
        </div>
    );
};

export default WelcomeOfferSection;
