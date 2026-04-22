"use client";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { fetchGamesBySection } from "@/lib/redux/slice/gameSlice";
// Removed getAgeGroupFromProfile and getGenderFromProfile - now passing user object directly

const RecommendationCard = React.memo(({ card, onCardClick }) => {
    const [imageError, setImageError] = useState(false);

    const handleImageError = useCallback(() => {
        setImageError(true);
    }, []);

    // Pre-compute image source for better performance - use API image
    const imageSrc = card.image || card.backgroundImage || '/game.png';

    return (
        <article
            className="flex flex-col w-[158px] rounded-xl overflow-hidden shadow-lg cursor-pointer hover:scale-105 transition-all duration-200"
            onClick={() => onCardClick(card)}
        >
            <div className="relative w-full h-[158px] flex items-center justify-center bg-black/20 overflow-hidden">
                {!imageError ? (
                    <Image
                        className="object-cover w-full h-full"
                        alt={card.title || "Game promotion"}
                        src={imageSrc}
                        width={158}
                        height={158}
                        sizes="158px"
                        priority
                        loading="eager"
                        decoding="async"
                        onError={handleImageError}
                    />
                ) : (
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                        <div className="text-center text-white">
                            <div className="w-12 h-12 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center">
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-sm font-medium">{card.title || 'Game'}</p>
                        </div>
                    </div>
                )}
            </div>
            <div className="flex flex-col h-[60px] w-[158px] px-2 pt-2 pb-3 bg-[linear-gradient(180deg,rgba(81,98,182,0.9)_0%,rgba(63,56,184,0.9)_100%)] rounded-b-xl">

                <div className="flex flex-col mt-auto gap-0.5">
                    <div className="flex items-center gap-1 min-w-0">
                        <p className="[font-family:'Poppins',Helvetica] font-medium text-white text-[14px] whitespace-nowrap">Earn upto {card.earnings || "100"}</p>
                        <Image
                            className="w-[18px] h-[19px] flex-shrink-0"
                            alt="Coin"
                            src="/dollor.png"
                            width={18}
                            height={19}
                            priority
                            loading="eager"
                            decoding="async"
                            unoptimized
                        />
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                        <p className="[font-family:'Poppins',Helvetica] font-medium text-white text-[14px] whitespace-nowrap">and {card.xpPoints || "50"}</p>
                        <Image
                            className="w-[21px] h-[16px] flex-shrink-0"
                            alt="Reward icon"
                            src="/xp.svg"
                            width={21}
                            height={16}
                            priority
                            loading="eager"
                            decoding="async"
                            unoptimized
                        />
                    </div>
                </div>
            </div>
        </article>
    );
});

export const ListGame = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const dispatch = useDispatch();
    const [currentScaleClass, setCurrentScaleClass] = useState("scale-100");
    const [loadingTimeout, setLoadingTimeout] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    // Check if user came from race banner
    const fromRace = searchParams.get('fromRace') === 'true';

    // Handle clicks outside tooltip
    const tooltipRef = useRef(null);
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

    // Use both API games and downloaded games
    const { gamesBySection, gamesBySectionStatus, inProgressGames, availableUiSections } = useSelector((state) => state.games);
    const { details: userProfile } = useSelector((state) => state.profile);

    // Get all games from ALL sections, not just "Swipe"
    const allSectionGames = useMemo(() => {
        const games = [];
        if (gamesBySection && typeof gamesBySection === 'object') {
            // Iterate through all sections and collect all games
            Object.keys(gamesBySection).forEach(sectionName => {
                const sectionGames = gamesBySection[sectionName];
                if (Array.isArray(sectionGames) && sectionGames.length > 0) {
                    games.push(...sectionGames);
                }
            });
        }
        return games;
    }, [gamesBySection]);

    // Check if we have any games loaded
    const hasAnyGames = allSectionGames.length > 0;
    const anySectionStatus = Object.values(gamesBySectionStatus || {}).some(status => status === 'loading');

    // Optimized: Pre-compute games data with both API games and downloaded games
    const recommendationCards = useMemo(() => {
        const allGames = [];

        // Add API games from ALL sections (not downloaded) - using besitosRawData
        if (allSectionGames && allSectionGames.length > 0) {
            // Use a Set to track unique game IDs to avoid duplicates
            const seenGameIds = new Set();
            const apiGames = allSectionGames
                .filter(game => {
                    const gameId = game.id || game._id || game.gameId;
                    if (!gameId || seenGameIds.has(gameId)) {
                        return false; // Skip duplicates
                    }
                    seenGameIds.add(gameId);
                    return true;
                })
                .map((game, index) => {
                    // Use normalizer for both besitos and bitlab
                    const { normalizeGameImages, normalizeGameTitle, normalizeGameCategory, normalizeGameAmount, getTotalPromisedPoints } = require('@/lib/gameDataNormalizer');
                    const images = normalizeGameImages(game);
                    const title = normalizeGameTitle(game);
                    const category = normalizeGameCategory(game);
                    const amount = normalizeGameAmount(game);

                    // Prefer API rewards.coins / rewards.gold everywhere
                    const coinAmount = game.rewards?.coins ?? game.rewards?.gold ?? amount ?? 0;
                    const raw = typeof coinAmount === 'number' ? coinAmount : (typeof coinAmount === 'string' ? parseFloat(String(coinAmount).replace('$', '')) || 0 : 0);
                    const earnings = Number.isFinite(raw) ? (raw === Math.round(raw) ? String(Math.round(raw)) : (Math.round(raw * 100) / 100).toString()) : '0';
                    const { totalXP } = getTotalPromisedPoints(game);
                    const xpPoints = Number.isFinite(totalXP) ? Math.floor(totalXP).toString() : '0';

                    const apiGameId = game.gameId || game.details?.id || game.id || game._id;
                    return {
                        id: apiGameId || `api-game-${index}`,
                        originalId: apiGameId,
                        title: title,
                        category: category,
                        // Use normalized images
                        image: images.square_image || images.icon || game.image || game.square_image || game.background_image || game.icon || game.thumbnail || game.logo || game.banner,
                        backgroundImage: images.large_image || images.banner || images.square_image || images.icon || game.image || game.square_image || game.background_image || game.icon || game.thumbnail || game.logo || game.banner,
                        earnings: earnings, // Real coins without $ sign
                        xpPoints, // Total XP from tasks (getTotalPromisedPoints)
                        isDownloaded: false,
                        source: 'api',
                        fullData: game // Store full game including besitosRawData
                    };
                });
            allGames.push(...apiGames);
        }

        // Add downloaded games
        if (inProgressGames && inProgressGames.length > 0) {
            const downloadedGames = inProgressGames.map((game, index) => {
                // Prefer API rewards.coins / rewards.gold
                const coinAmount = game.rewards?.coins ?? game.rewards?.gold ?? game.amount ?? 0;
                const raw = typeof coinAmount === 'number' ? coinAmount : (typeof coinAmount === 'string' ? parseFloat(String(coinAmount).replace('$', '')) || 0 : 0);
                const earnings = Number.isFinite(raw) ? (raw === Math.round(raw) ? String(Math.round(raw)) : (Math.round(raw * 100) / 100).toString()) : '0';
                let xpPoints = '0';
                try {
                    const { getTotalPromisedPoints } = require('@/lib/gameDataNormalizer');
                    const { totalXP } = getTotalPromisedPoints(game);
                    xpPoints = Number.isFinite(totalXP) ? Math.floor(totalXP).toString() : '0';
                } catch (_) { }

                return {
                    id: game.id || game._id || `downloaded-game-${index}`,
                    originalId: game.id || game._id,
                    title: game.title || game.name || 'Downloaded Game',
                    category: game.categories?.[0]?.name || 'Action',
                    image: game.square_image || game.large_image || game.image,
                    backgroundImage: game.large_image || game.image,
                    earnings: earnings, // Real coins without $ sign
                    xpPoints, // Total XP from tasks (getTotalPromisedPoints)
                    isDownloaded: true,
                    source: 'downloaded',
                    fullData: game // Store full game data for navigation
                };
            });
            allGames.push(...downloadedGames);
        }


        return allGames;
    }, [allSectionGames, inProgressGames, gamesBySection]);

    // Optimized: Memoized game click handler
    const handleGameClick = useCallback((game) => {

        // If user came from race banner, redirect to race screen
        if (fromRace) {
            router.push('/Race');
            return;
        }

        // Clear Redux state BEFORE navigation to prevent showing old data
        dispatch({ type: 'games/clearCurrentGameDetails' });

        // Clear Redux state BEFORE navigation
        dispatch({ type: 'games/clearCurrentGameDetails' });

        if (game.isDownloaded && game.fullData) {
            // For downloaded games, use localStorage method
            try {
                localStorage.setItem('selectedGameData', JSON.stringify(game.fullData));
            } catch (error) {
                // Failed to store game data
            }
            router.push(`/gamedetails?gameId=${game.originalId}&source=race`);
        } else {
            // For API games, store full data including besitosRawData
            if (game.fullData) {
                try {
                    localStorage.setItem('selectedGameData', JSON.stringify(game.fullData));
                } catch (error) {
                    // Failed to store game data
                }
            }

            const gameId = game.originalId || game.id;
            if (!gameId) {
                return;
            }
            router.push(`/gamedetails?gameId=${gameId}&source=race`);
        }
    }, [router, dispatch, fromRace]);

    // Handle race button click
    const handleRaceButtonClick = useCallback(() => {
        router.push('/Race');
    }, [router]);



    // Reuse existing game data from homepage - no need to fetch again
    // The games are already loaded in the homepage GameCard component
    // This prevents duplicate API calls and improves performance

    // Fetch games from multiple sections if not already loaded
    useEffect(() => {
        if (!userProfile) return;

        // Use available sections from Redux if available, otherwise use common sections
        const sectionsToFetch = availableUiSections && availableUiSections.length > 0
            ? availableUiSections
            : ["Swipe", "Most Played", "Cash Coach Recommendation", "New Games", "Trending"];

        // Fetch games from sections that don't have games loaded yet
        sectionsToFetch.forEach(section => {
            const sectionGames = gamesBySection?.[section] || [];
            const sectionStatus = gamesBySectionStatus?.[section] || "idle";

            // Only fetch if section is idle and has no games
            if (sectionStatus === 'idle' && sectionGames.length === 0) {

                dispatch(fetchGamesBySection({
                    uiSection: section,
                    user: userProfile,
                    page: 1,
                    limit: 50
                }));
            }
        });
    }, [dispatch, gamesBySection, gamesBySectionStatus, availableUiSections, userProfile]);

    // Refresh games in background after showing cached data (to get admin updates)
    // Do this in background without blocking UI - show cached data immediately
    useEffect(() => {
        if (!userProfile) return;

        // Use available sections from Redux if available, otherwise use common sections
        const sectionsToRefresh = availableUiSections && availableUiSections.length > 0
            ? availableUiSections
            : ["Swipe", "Most Played", "Cash Coach Recommendation", "New Games", "Trending"];

        // Use setTimeout to refresh in background after showing cached data
        // This ensures smooth UX - cached data shows immediately, fresh data loads in background
        const refreshTimer = setTimeout(() => {
            sectionsToRefresh.forEach(section => {
                dispatch(fetchGamesBySection({
                    uiSection: section,
                    user: userProfile,
                    page: 1,
                    limit: 50,
                    force: true,
                    background: true
                }));
            });
        }, 100); // Small delay to let cached data render first

        return () => clearTimeout(refreshTimer);
    }, [dispatch, availableUiSections, userProfile]);

    // Refresh games in background when app comes to foreground (admin might have updated)
    useEffect(() => {
        if (!userProfile) return;

        // Use available sections from Redux if available, otherwise use common sections
        const sectionsToRefresh = availableUiSections && availableUiSections.length > 0
            ? availableUiSections
            : ["Swipe", "Most Played", "Cash Coach Recommendation", "New Games", "Trending"];

        const handleFocus = () => {
            sectionsToRefresh.forEach(section => {
                dispatch(fetchGamesBySection({
                    uiSection: section,
                    user: userProfile,
                    page: 1,
                    limit: 50,
                    force: true,
                    background: true
                }));
            });
        };

        window.addEventListener("focus", handleFocus);

        const handleVisibilityChange = () => {
            if (!document.hidden && userProfile) {
                sectionsToRefresh.forEach(section => {
                    dispatch(fetchGamesBySection({
                        uiSection: section,
                        user: userProfile,
                        page: 1,
                        limit: 50,
                        force: true,
                        background: true
                    }));
                });
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [dispatch, availableUiSections, userProfile]);

    // Loading timeout handling
    useEffect(() => {
        if (anySectionStatus) {
            const timeout = setTimeout(() => {
                setLoadingTimeout(true);
            }, 10000); // 10 second timeout

            return () => clearTimeout(timeout);
        } else {
            setLoadingTimeout(false);
        }
    }, [anySectionStatus]);

    // REMOVED: Enhanced loading state for better Android UX - show content immediately
    // Games will load in background without blocking UI

    // REMOVED: Error state handling for better Android UX - show content immediately
    // Users can still interact with the app even if games fail to load

    return (
        <section className="relative w-full min-h-screen bg-black max-w-sm mx-auto flex flex-col items-center">
            {/* App Version */}
            <div className="absolute top-[8px] left-8 [font-family:'Poppins',Helvetica] font-light text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
                App Version: V0.0.1
            </div>

            {/* Header */}
            <div className="flex flex-col w-full items-start gap-2 pl-7 pr-4 py-4 mt-[34px]">
                <div className="flex items-center gap-4 relative self-stretch w-full flex-[0_0_auto] rounded-[32px]">
                    <button
                        aria-label="Go back"
                        className="flex items-center justify-center w-6 h-6 flex-shrink-0"
                        onClick={() => {
                            router.back();
                        }}
                    >
                        <svg
                            className="w-6 h-6 text-white cursor-pointer transition-transform duration-150 active:scale-95"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                        >
                            <path
                                d="M15 18L9 12L15 6"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </button>

                    <h1 className="flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-5">
                        Select Game
                    </h1>
                    <div className="relative" ref={tooltipRef}>
                        <button
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="cursor-pointer hover:opacity-80 transition-opacity duration-200"
                            aria-label="More information"
                        >
                            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M19.2 9.6C19.2 12.1461 18.1886 14.5879 16.3882 16.3882C14.5879 18.1886 12.1461 19.2 9.6 19.2C7.05392 19.2 4.61212 18.1886 2.81178 16.3882C1.01143 14.5879 0 12.1461 0 9.6C0 7.05392 1.01143 4.61212 2.81178 2.81178C4.61212 1.01143 7.05392 0 9.6 0C12.1461 0 14.5879 1.01143 16.3882 2.81178C18.1886 4.61212 19.2 7.05392 19.2 9.6ZM10.8 4.8C10.8 5.11826 10.6736 5.42348 10.4485 5.64853C10.2235 5.87357 9.91826 6 9.6 6C9.28174 6 8.97652 5.87357 8.75147 5.64853C8.52643 5.42348 8.4 5.11826 8.4 4.8C8.4 4.48174 8.52643 4.17652 8.75147 3.95147C8.97652 3.72643 9.28174 3.6 9.6 3.6C9.91826 3.6 10.2235 3.72643 10.4485 3.95147C10.6736 4.17652 10.8 4.48174 10.8 4.8ZM8.4 8.4C8.08174 8.4 7.77652 8.52643 7.55147 8.75147C7.32643 8.97652 7.2 9.28174 7.2 9.6C7.2 9.91826 7.32643 10.2235 7.55147 10.4485C7.77652 10.6736 8.08174 10.8 8.4 10.8V14.4C8.4 14.7183 8.52643 15.0235 8.75147 15.2485C8.97652 15.4736 9.28174 15.6 9.6 15.6H10.8C11.1183 15.6 11.4235 15.4736 11.6485 15.2485C11.8736 15.0235 12 14.7183 12 14.4C12 14.0817 11.8736 13.7765 11.6485 13.5515C11.4235 13.3264 11.1183 13.2 10.8 13.2V9.6C10.8 9.28174 10.6736 8.97652 10.4485 8.75147C10.2235 8.52643 9.91826 8.4 9.6 8.4H8.4Z" fill="#8B92DF" />
                            </svg>
                        </button>


                    </div>
                </div>
            </div>

            {/* Game Grid - Centered with proper spacing, scrollable to show all games */}
            <div className="w-full max-w-[335px] mx-auto px-4 mt-2 mb-12 pb-4">
                {recommendationCards.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                        {recommendationCards.map((card) => (
                            <div key={card.id} className="flex flex-col">
                                <RecommendationCard
                                    card={card}
                                    onCardClick={handleGameClick}
                                    showRaceButton={false}
                                    onRaceClick={handleRaceButtonClick}
                                />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-base text-center">
                            No game available at this moment
                        </p>
                    </div>
                )}
            </div>
            {showTooltip && (
                <div className="absolute top-[80px] right-2 z-50 w-[300px] bg-black/95 backdrop-blur-sm rounded-[12px] px-4 pt-3 pb-2 shadow-2xl border border-gray-600/50 animate-fade-in">
                    <div className="text-white font-medium text-sm [font-family:'Poppins',Helvetica] leading-normal">
                        <div className="text-center text-gray-200">
                            These rewards are for engagement. Points are redeemable for in-app loyalty benefits and follow the same
                        </div>
                    </div>
                    <div className="absolute top-[-8px] right-4 w-4 h-4 bg-black/95 border-t border-l border-gray-600/50 transform rotate-45"></div>
                </div>
            )}
        </section>
    );
};