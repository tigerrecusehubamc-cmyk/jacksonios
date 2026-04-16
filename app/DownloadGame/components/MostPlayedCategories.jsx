"use client";
import React from "react";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { fetchMostPlayedScreenGames } from "@/lib/redux/slice/gameSlice";
import { useAuth } from "@/contexts/AuthContext";
import { getUserFromLocalStorage } from "@/lib/utils";
import { normalizeGameImages, normalizeGameTitle, normalizeGameCategory, normalizeGameAmount, normalizeGameGoals, normalizeGameUrl, getTotalPromisedPoints } from "@/lib/gameDataNormalizer";
import GameItemCard from "./GameItemCard";
import WatchAdCard from "./WatchAdCard";

const CACHE_STALE_MS = 5 * 60 * 1000;
const FOCUS_REFRESH_STALE_MS = 2 * 60 * 1000;

export const MostPlayedCategories = ({ searchQuery = "", showSearch = false }) => {
    const dispatch = useDispatch();
    const router = useRouter();
    const { token } = useAuth();

    const { mostPlayedScreenGames, mostPlayedScreenStatus, mostPlayedScreenError, mostPlayedScreenCacheTimestamp } = useSelector((state) => state.games);

    // One fetch only on mount — same pattern as MostPlayedGames / GameCard.
    // Empty deps [] ensures this runs exactly once; guards prevent redundant API calls.
    React.useEffect(() => {
        const user = typeof window !== "undefined" ? getUserFromLocalStorage() : null;
        const hasFreshCache = mostPlayedScreenGames?.length && mostPlayedScreenCacheTimestamp && (Date.now() - mostPlayedScreenCacheTimestamp < CACHE_STALE_MS);
        if (hasFreshCache || mostPlayedScreenStatus === "loading" || mostPlayedScreenStatus === "failed") return;
        dispatch(fetchMostPlayedScreenGames({
            user: user || null,
            page: 1,
            limit: 50
        }));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Return to app (focus): refetch only if cache older than 2 min. User from localStorage.
    React.useEffect(() => {
        const handleRefreshIfStale = () => {
            const state = require("@/lib/redux/store").store.getState();
            const ts = state.games.mostPlayedScreenCacheTimestamp;
            const isStale = !ts || Date.now() - ts > FOCUS_REFRESH_STALE_MS;
            if (!isStale) return;
            const user = typeof window !== "undefined" ? getUserFromLocalStorage() : null;
            dispatch(fetchMostPlayedScreenGames({
                user: user || null,
                page: 1,
                limit: 50,
                force: true,
                background: true
            }));
        };
        const handleFocus = () => handleRefreshIfStale();
        const handleVisibility = () => {
            if (!document.hidden) handleRefreshIfStale();
        };
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [dispatch]);




    // Process games from API into the same format - using normalizer for both besitos and bitlab
    const processGames = (games) => {
        return games.map((game, index) => {
            // Normalize game data for both besitos and bitlab
            const images = normalizeGameImages(game);
            const title = normalizeGameTitle(game);
            const category = normalizeGameCategory(game);
            const amount = normalizeGameAmount(game);
            const url = normalizeGameUrl(game);

            // Clean game name - remove platform suffix after "-"
            const cleanGameName = title.split(' - ')[0].trim();

            // Prefer API rewards.coins / rewards.gold everywhere (map on every UI section)
            const coinAmount = game.rewards?.coins ?? game.rewards?.gold ?? amount ?? 0;
            const raw = typeof coinAmount === 'number' ? coinAmount : (typeof coinAmount === 'string' ? parseFloat(coinAmount.replace('$', '')) || 0 : 0);
            const amountValue = Number.isFinite(raw) ? (raw === Math.round(raw) ? raw : Math.round(raw * 100) / 100) : 0;
            const { totalXP } = getTotalPromisedPoints(game);
            const xpValue = Number.isFinite(totalXP) ? Math.floor(totalXP) : 0;

            return {
                id: game._id || game.id || game.gameId,
                name: cleanGameName,
                genre: category,
                // Use normalized images
                image: images.square_image || images.icon || game.images?.banner || game.images?.large_image || game.details?.square_image || game.details?.image || "/assets/animaapp/DfFsihWg/img/image-3930-2x.png",
                overlayImage: images.icon || images.square_image || game.details?.image || game.details?.square_image,
                amount: amountValue, // Coins without $ sign
                xp: xpValue, // Total XP from tasks (getTotalPromisedPoints)
                coinIcon: "/dollor.png",
                picIcon: "/xp.svg",
                // Use normalized images for background
                backgroundImage: images.large_image || images.banner || images.icon || game.images?.banner || game.details?.large_image || game.details?.image,
                // Use normalized url for download
                downloadUrl: url || game.details?.downloadUrl,
                // Store full game data including besitosRawData
                fullData: game,
            };
        });
    };

    // Categorize games by earning amount
    const categorizeGamesByEarning = (games) => {
        const processedGames = processGames(games);

        // Sort games by earning amount (highest to lowest)
        const sortedGames = processedGames.sort((a, b) => {
            const amountA = parseFloat(a.amount) || 0;
            const amountB = parseFloat(b.amount) || 0;
            return amountB - amountA;
        });

        // Calculate threshold for categorization
        const totalGames = sortedGames.length;
        const highestEarningCount = Math.ceil(totalGames * 0.4); // Top 40% as highest earning
        const mediumEarningCount = Math.ceil(totalGames * 0.3); // Next 30% as medium earning
        const lowEarningCount = totalGames - highestEarningCount - mediumEarningCount; // Remaining as low earning

        const highestEarningGames = sortedGames.slice(0, highestEarningCount);
        const mediumEarningGames = sortedGames.slice(highestEarningCount, highestEarningCount + mediumEarningCount);
        const lowEarningGames = sortedGames.slice(highestEarningCount + mediumEarningCount, highestEarningCount + mediumEarningCount + lowEarningCount);

        return {
            highestEarning: highestEarningGames,
            mediumEarning: mediumEarningGames,
            lowEarning: lowEarningGames
        };
    };

    // Handle click on game - navigate to game details with full data
    // Matches the pattern used in Swipe, Highest Earning, TaskListSection, and other sections
    const handleGameClick = React.useCallback((game) => {
        if (!game || !game.fullData) {
            // Game or fullData is missing
            return;
        }

        const fullGame = game.fullData;

        // Clear Redux state BEFORE navigation to prevent showing old data
        dispatch({ type: 'games/clearCurrentGameDetails' });

        // Store full game data including besitosRawData in localStorage for details page
        // This matches the pattern used in Swipe, Highest Earning, TaskListSection, etc.
        try {
            localStorage.setItem('selectedGameData', JSON.stringify(fullGame));
        } catch (error) {
            // Failed to store game data
        }

        // Use provider gameId (BitLabs/Besitos) for get-game-by-id API; fallback to id/_id
        const gameId = fullGame.gameId || fullGame.details?.id || fullGame.id || fullGame._id;
        router.push(`/gamedetails?gameId=${gameId}&source=mostPlayedScreen`);
    }, [router, dispatch]);

    const filterGamesBySearch = (games, query) => {
        if (!query || query.trim() === "") return games;
        const searchTerm = query.toLowerCase().trim();
        return games.filter(game =>
            game.name.toLowerCase().includes(searchTerm) ||
            game.genre.toLowerCase().includes(searchTerm)
        );
    };

    // Get categorized games
    const categorizedGames = React.useMemo(() => {
        if (mostPlayedScreenGames && mostPlayedScreenGames.length > 0) {
            return categorizeGamesByEarning(mostPlayedScreenGames);
        }
        return { highestEarning: [], mediumEarning: [], lowEarning: [] };
    }, [mostPlayedScreenGames]);

    // Apply search filters to all categories
    const filteredHighestEarning = filterGamesBySearch(categorizedGames.highestEarning, searchQuery);
    const filteredMediumEarning = filterGamesBySearch(categorizedGames.mediumEarning, searchQuery);
    const filteredLowEarning = filterGamesBySearch(categorizedGames.lowEarning, searchQuery);

    return (
        <div className={`flex flex-col max-w-[335px] w-full mx-auto items-start gap-8 relative animate-fade-in ${showSearch ? 'top-[180px]' : 'top-[130px]'}`}>

            {/* ==================== HIGHEST EARNING GAMES SECTION ==================== */}
            <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
                <div className="flex flex-col w-full items-start gap-[49px] relative flex-[0_0_auto]">
                    <div className="flex w-full items-center justify-between">
                        <div className="inline-flex items-center gap-0.5 relative flex-[0_0_auto]">
                            <div className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-medium text-white text-base tracking-[0] leading-[normal]">
                                Highest Earning Games
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col w-full items-start gap-2.5 px-0 py-2.5 relative flex-[0_0_auto] overflow-y-scroll">
                    {mostPlayedScreenStatus === "failed" ? (
                        <div className="text-red-400 text-center py-4 w-full">
                            <p>Failed to load games</p>
                            <button
                                onClick={() => {
                                    dispatch(fetchMostPlayedScreenGames({
                                        user: getUserFromLocalStorage() || null,
                                        page: 1,
                                        limit: 50
                                    }));
                                }}
                                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredHighestEarning.length > 0 ? (
                        filteredHighestEarning.map((game) => (
                            <GameItemCard
                                key={game.id}
                                game={game}
                                isEmpty={false}
                                onClick={() => handleGameClick(game)}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center w-full py-8 px-4">
                            <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-base text-center">
                                No games available at the moment
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ==================== WATCH AD SECTION ==================== */}
            <WatchAdCard xpAmount={5} />

            {/* ==================== MEDIUM EARNING GAMES SECTION ==================== */}
            <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
                <div className="flex flex-col w-full items-start gap-[49px] relative flex-[0_0_auto]">
                    <div className="flex w-full items-center justify-between">
                        <div className="inline-flex items-center gap-0.5 relative flex-[0_0_auto]">
                            <div className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-medium text-white text-base tracking-[0] leading-[normal]">
                                Medium Earning Games
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col w-full items-start gap-2.5 px-0 py-2.5 relative flex-[0_0_auto] overflow-y-scroll">
                    {mostPlayedScreenStatus === "failed" ? (
                        <div className="text-red-400 text-center py-4 w-full">
                            <p>Failed to load games</p>
                            <button
                                onClick={() => {
                                    dispatch(fetchMostPlayedScreenGames({
                                        user: getUserFromLocalStorage() || null,
                                        page: 1,
                                        limit: 50
                                    }));
                                }}
                                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredMediumEarning.length > 0 ? (
                        filteredMediumEarning.map((game) => (
                            <GameItemCard
                                key={game.id}
                                game={game}
                                isEmpty={false}
                                onClick={() => handleGameClick(game)}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center w-full py-8 px-4">
                            <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-base text-center">
                                No games available at the moment
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* ==================== LOW EARNING GAMES SECTION ==================== */}
            <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
                <div className="flex flex-col w-full items-start gap-[49px] relative flex-[0_0_auto]">
                    <div className="flex w-full items-center justify-between">
                        <div className="inline-flex items-center gap-0.5 relative flex-[0_0_auto]">
                            <div className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-medium text-white text-base tracking-[0] leading-[normal]">
                                Low Earning Games
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col w-full items-start gap-2.5 px-0 py-2.5 relative flex-[0_0_auto] overflow-y-scroll">
                    {mostPlayedScreenStatus === "failed" ? (
                        <div className="text-red-400 text-center py-4 w-full">
                            <p>Failed to load games</p>
                            <button
                                onClick={() => {
                                    dispatch(fetchMostPlayedScreenGames({
                                        user: getUserFromLocalStorage() || null,
                                        page: 1,
                                        limit: 50
                                    }));
                                }}
                                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                            >
                                Retry
                            </button>
                        </div>
                    ) : filteredLowEarning.length > 0 ? (
                        filteredLowEarning.map((game) => (
                            <GameItemCard
                                key={game.id}
                                game={game}
                                isEmpty={false}
                                onClick={() => handleGameClick(game)}
                            />
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center w-full py-8 px-4">
                            <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-base text-center">
                                No games available at the moment
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Extra spacing to ensure content isn't hidden behind navigation */}

        </div>
    );
};
