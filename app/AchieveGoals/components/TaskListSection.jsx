"use client";
import React, { useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fetchGamesBySection } from "@/lib/redux/slice/gameSlice";
import { store } from "@/lib/redux/store";
import {
    normalizeGameImages,
    normalizeGameTitle,
    normalizeGameCategory,
    normalizeGameAmount,
    getTotalPromisedPoints,
} from "@/lib/gameDataNormalizer";

const RecommendationCard = ({ card, onCardClick }) => {
    return (
        <article
            className="flex flex-col w-[158px] rounded-md overflow-hidden shadow-lg cursor-pointer hover:scale-105 transition-all duration-200"
            onClick={() => onCardClick(card)}
        >
            <div className="relative w-full min-h-[158px] flex items-center justify-center bg-gray-800">
                <Image
                    className="object-contain w-full max-w-[158px]"
                    alt="Game promotion"
                    src={card.image || '/placeholder.png'}
                    width={158}
                    height={158}
                    sizes="158px"
                    loading="lazy"
                    decoding="async"
                    style={{
                        height: 'auto',
                        maxHeight: '158px'
                    }}
                />
            </div>
            <div className="flex flex-col h-[60px] p-2  bg-[linear-gradient(180deg,rgba(81,98,182,0.9)_0%,rgba(63,56,184,0.9)_100%)]">

                <div className="flex flex-col mt-auto">
                    <div className="flex items-center mb-1 gap-1">
                        <p className="[font-family:'Poppins',Helvetica] font-medium text-white text-[14px]">Earn upto {card.earnings || "100"}</p>
                        <Image
                            className="w-[18px] h-[19px]"
                            alt="Coin"
                            src="/dollor.png"
                            width={18}
                            height={19}
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                    <div className="flex items-center gap-1">
                        <p className="[font-family:'Poppins',Helvetica] font-medium text-white text-[14px]">and {card.xpPoints || "50"}</p>
                        <Image
                            className="w-[21px] h-[16px]"
                            alt="Reward icon"
                            src="/xp.svg"
                            width={21}
                            height={16}
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                </div>
            </div>
        </article>
    );
};

const EMPTY_ARRAY = [];

export const TaskListSection = () => {
    const router = useRouter();
    const dispatch = useDispatch();

    const sectionKey = "Cash Coach Recommendation";
    const CACHE_STALE_MS = 5 * 60 * 1000;   // 5 min - match slice TTL
    const FOCUS_REFRESH_STALE_MS = 2 * 60 * 1000; // 2 min - only refetch on focus if older

    // Section-specific selectors — only re-render when this section's data changes
    const sectionGames = useSelector((state) => state.games.gamesBySection[sectionKey] ?? EMPTY_ARRAY);
    const sectionStatus = useSelector((state) => state.games.gamesBySectionStatus[sectionKey] ?? "idle");
    const sectionTimestamp = useSelector((state) => state.games.gamesBySectionTimestamp[sectionKey]);
    const { details: userProfile } = useSelector((state) => state.profile);
    // Stable user ID avoids re-triggering the effect on every profile data refresh
    const userId = userProfile?._id || userProfile?.id;
    const userProfileRef = useRef(userProfile);
    userProfileRef.current = userProfile;

    // One discover call only on mount — same pattern as MostPlayedGames / GameCard.
    // Empty deps [] ensures this runs exactly once; guards prevent redundant API calls.
    useEffect(() => {
        const hasFreshCache = sectionTimestamp != null && Date.now() - sectionTimestamp < CACHE_STALE_MS;
        if (hasFreshCache || sectionStatus === "loading" || sectionStatus === "failed") return;
        dispatch(fetchGamesBySection({
            uiSection: sectionKey,
            user: userProfileRef.current,
            page: 1,
            limit: 10
        }));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Return to app (focus): one discover call only if cache older than 2 min. Same as HighestEarningGame.
    useEffect(() => {
        const handleRefreshIfStale = () => {
            const state = store.getState();
            const ts = state.games.gamesBySectionTimestamp?.[sectionKey];
            const isStale = !ts || Date.now() - ts > FOCUS_REFRESH_STALE_MS;
            if (!isStale) return;
            const user = state.profile.details;
            dispatch(fetchGamesBySection({
                uiSection: sectionKey,
                user: user || null,
                page: 1,
                limit: 10,
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
    }, [dispatch, sectionKey]);

    // Map the new API data to component format - using normalizer for both besitos and bitlab
    const recommendationCards = Array.isArray(sectionGames)
        ? sectionGames.map((game) => {
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

            return {
                id: game.gameId || game.details?.id || game._id || game.id,
                title: title,
                category: category,
                image: images.square_image || images.icon || game.images?.icon || game.images?.banner,
                earnings: earnings, // Now shows coins without $ sign
                xpPoints, // Total XP from tasks (getTotalPromisedPoints)
                fullGameData: game // Store full game including besitosRawData
            };
        })
        : [];

    // Handle game click - navigate to game details
    const handleGameClick = useCallback((game) => {
        // Clear Redux state BEFORE navigation to prevent showing old data
        dispatch({ type: 'games/clearCurrentGameDetails' });

        // Store full game data including besitosRawData in localStorage
        const fullGame = game.fullGameData || game;
        if (fullGame) {
            try {
                localStorage.setItem('selectedGameData', JSON.stringify(fullGame));
            } catch (error) {
                // Failed to store game data
            }
        }

        // Use provider gameId (BitLabs/Besitos) for get-game-by-id API; fallback to id/_id
        const gameId = game.gameId || game.details?.id || game.id || game._id;
        router.push(`/gamedetails?gameId=${gameId}&source=cashCoach`);
    }, [router, dispatch]);


    // Show loading state only if games are loading AND we have no cached data
    // With stale-while-revalidate, we show cached data immediately, so loading only shows on first load
    if (sectionStatus === 'loading' && sectionGames.length === 0) {
        return (
            <section className="flex flex-col justify-center items-center gap-2 w-full min-w-0 max-w-full">
                <header>
                    <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[20px]">
                        💸💸Recommendations💸💸
                    </h2>
                </header>
                <div className="flex items-start justify-center gap-3 self-stretch flex-wrap min-w-0 max-w-full">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex flex-col w-[158px] rounded-md overflow-hidden shadow-lg animate-pulse">
                            <div className="w-full min-h-[158px] bg-gray-700"></div>
                            <div className="h-[71px] bg-gray-700"></div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    return (
        <section className="flex flex-col justify-center items-center gap-2 w-full min-w-0 max-w-full">
            <header>
                <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[20px]">
                    💸💸Recommendations💸💸
                </h2>
            </header>
            <div className="flex items-start justify-center gap-3 self-stretch flex-wrap min-w-0 max-w-full">
                {recommendationCards.length > 0 ? (
                    recommendationCards.slice(0, 2).map((card) => (
                        <RecommendationCard
                            key={card.id}
                            card={card}
                            onCardClick={handleGameClick}
                        />
                    ))
                ) : (
                    <div className="w-full flex flex-col items-center justify-center py-6 px-4">
                        {/* <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-lg mb-2 text-center">
                            Gaming - Cash Coach Recommendation
                        </h3> */}
                        <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-sm text-center">
                            No games available at the moment
                        </p>
                    </div>
                )}
            </div>
        </section>
    );
};