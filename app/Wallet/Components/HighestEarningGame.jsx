"use client";
import Image from "next/image";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { handleGameDownload } from "@/lib/gameDownloadUtils";
import { fetchGamesBySection } from "@/lib/redux/slice/gameSlice";
import { store } from "@/lib/redux/store";
import { normalizeGameImages, normalizeGameTitle, normalizeGameCategory, normalizeGameAmount, getTotalPromisedPoints } from "@/lib/gameDataNormalizer";

const EMPTY_ARRAY = [];

const SCALE_CONFIG = [
    { minWidth: 0, scaleClass: "scale-90" },
    { minWidth: 320, scaleClass: "scale-90" },
    { minWidth: 375, scaleClass: "scale-100" },
    { minWidth: 480, scaleClass: "scale-125" },
    { minWidth: 640, scaleClass: "scale-120" },
    { minWidth: 768, scaleClass: "scale-150" },
    { minWidth: 1024, scaleClass: "scale-175" },
    { minWidth: 1280, scaleClass: "scale-200" },
    { minWidth: 1536, scaleClass: "scale-225" },
];
export const HighestEarningGame = () => {
    const router = useRouter();
    const dispatch = useDispatch();
    const [currentScaleClass, setCurrentScaleClass] = useState("scale-100");

    const sectionName = "Highest Earning";
    const CACHE_STALE_MS = 5 * 60 * 1000;
    const FOCUS_REFRESH_STALE_MS = 2 * 60 * 1000;

    // FIX: select only this section's data so re-renders only happen when "Highest Earning" changes,
    // not every time Swipe / MostPlayed / Leadership etc. update their Redux state
    const highestEarningGames = useSelector((state) => state.games.gamesBySection[sectionName] ?? EMPTY_ARRAY);
    const sectionStatus = useSelector((state) => state.games.gamesBySectionStatus[sectionName] || "idle");
    const sectionTimestamp = useSelector((state) => state.games.gamesBySectionTimestamp[sectionName]);
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
            uiSection: sectionName,
            user: userProfileRef.current,
            page: 1,
            limit: 10
        }));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Return to app (focus): one discover call only if cache older than 2 min. Same pattern as MostPlayedGames / GameCard.
    useEffect(() => {
        const handleRefreshIfStale = () => {
            const state = store.getState();
            const ts = state.games.gamesBySectionTimestamp[sectionName];
            const isStale = !ts || Date.now() - ts > FOCUS_REFRESH_STALE_MS;
            if (!isStale) return;
            const user = state.profile.details;
            dispatch(fetchGamesBySection({
                uiSection: sectionName,
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
    }, [dispatch, sectionName]);

    // Map the new API data to component format - using normalizer for both besitos and bitlab
    const processedGames = highestEarningGames?.slice(0, 2).map((game) => {
        const images = normalizeGameImages(game);
        const title = normalizeGameTitle(game);
        const category = normalizeGameCategory(game);
        const amount = normalizeGameAmount(game);

        // Prefer API rewards.coins / rewards.gold everywhere
        const coinAmount = game.rewards?.coins ?? game.rewards?.gold ?? amount ?? 0;
        const raw = typeof coinAmount === 'number' ? coinAmount : (typeof coinAmount === 'string' ? parseFloat(String(coinAmount).replace('$', '')) || 0 : 0);
        const earnings = Number.isFinite(raw) ? (raw === Math.round(raw) ? String(Math.round(raw)) : (Math.round(raw * 100) / 100).toString()) : '0';
        const { totalXP } = getTotalPromisedPoints(game);
        const totalXPDisplay = Number.isFinite(totalXP) ? Math.floor(totalXP) : 0;

        return {
            id: game.gameId || game.details?.id || game._id || game.id,
            title: title,
            category: category,
            image: images.square_image || images.icon || game.images?.banner || game.images?.large_image || game.image || game.square_image,
            earnings: earnings, // Now shows coins without $ sign
            totalXP: totalXPDisplay, // Total XP from tasks (getTotalPromisedPoints)
            fullGameData: game // Store full game including besitosRawData
        };
    }) || [];

    // Handle game click - navigate to game details
    const handleGameClick = (game) => {
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
        const gameId = fullGame?.gameId || fullGame?.details?.id || fullGame?.id || fullGame?._id;
        router.push(`/gamedetails?gameId=${gameId}&source=highestEarning`);
    };

    const getScaleClass = useCallback((width) => {
        for (let i = SCALE_CONFIG.length - 1; i >= 0; i--) {
            if (width >= SCALE_CONFIG[i].minWidth) {
                return SCALE_CONFIG[i].scaleClass;
            }
        }
        return "scale-100";
    }, []);

    useEffect(() => {
        const updateScale = () => {
            setCurrentScaleClass(getScaleClass(window.innerWidth));
        };
        updateScale();
    }, [getScaleClass]);

    // REMOVED: Loading state for better Android UX - show content immediately
    // Games will load in background without blocking UI
    return (
        <div
            className={`flex justify-between   items-center transition-transform p-4  duration-200 ease-in-out`}

        >
            <section className="flex flex-col w-full max-w-[335px] justify-center items-start gap-2.5 mx-auto ">
                <h3 className="font-semibold text-[#F4F3FC]  text-start text-[16px] opacity-[100%]">Highest Earning Games</h3>
                <div
                    className="flex items-center gap-[10px] w-full overflow-x-auto pb-0 scrollbar-hide"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    <div className="flex items-center gap-[10px]">
                        {processedGames.length > 0 ? processedGames.map((game) => (
                            <article key={game.id} className="relative w-[155px] min-h-[320px] flex-shrink-0 cursor-pointer hover:scale-105 transition-all duration-200" onClick={() => handleGameClick(game)}>
                                <div className="relative w-full h-[180px] rounded-[20px] overflow-hidden bg-gray-800">
                                    <img
                                        className="w-full h-full object-cover rounded-[20px]"
                                        src={game.image || game.square_image || '/assets/animaapp/DfFsihWg/img/image-3930-2x.png'}
                                        alt={game.title || 'Game Image'}
                                        loading="eager"
                                        decoding="async"
                                        width={155}
                                        height={180}
                                    />
                                </div>

                                <div className="flex flex-col w-full gap-2 mt-3">
                                    <div className="flex flex-col gap-0.5">
                                        <h4 className="font-semibold text-[#FFFFFF] text-[16px] leading-tight">
                                            {String(game.title || 'Game').split(' - ')[0]}
                                        </h4>
                                        <div className="text-[#FFFFFF] font-normal text-[13px] opacity-80">{String(game.category || 'Action')}</div>

                                        <div
                                            className="relative w-full min-h-[60px] rounded-[10px] overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,0.6)_0%,rgba(113,106,231,0.6)_100%)] p-2.5 flex flex-col gap-1"
                                            data-model-id="2255:6425"
                                            role="banner"
                                            aria-label="Earn rewards banner"
                                        >
                                            <div className="flex items-center  gap-1.5 flex-nowrap">
                                                <span className="[font-family:'Poppins',Helvetica] font-medium text-white text-sm tracking-[0] leading-normal whitespace-nowrap">
                                                    Earn upto
                                                </span>
                                                <span className="[font-family:'Poppins',Helvetica] font-medium text-white text-sm tracking-[0] leading-normal whitespace-nowrap">
                                                    {String(game.earnings || '0')}
                                                </span>
                                                <img
                                                    className="w-[16px] h-[16px] object-contain flex-shrink-0"
                                                    alt="Coin icon"
                                                    src="/dollor.png"
                                                    loading="eager"
                                                    decoding="async"
                                                    width={16}
                                                    height={16}
                                                />
                                            </div>

                                            <div className="flex items-center gap-1.5 flex-nowrap">
                                                <span className="[font-family:'Poppins',Helvetica] font-medium text-white text-sm tracking-[0] leading-normal whitespace-nowrap">
                                                    and
                                                </span>
                                                <span className="[font-family:'Poppins',Helvetica] font-medium text-white text-sm tracking-[0] leading-normal whitespace-nowrap">
                                                    {String(game.totalXP || 0)}
                                                </span>
                                                <img
                                                    className="w-4 h-4 object-contain flex-shrink-0 -mt-0.5"
                                                    alt="XP points icon"
                                                    src="/xp.svg"
                                                    loading="eager"
                                                    decoding="async"
                                                    width={16}
                                                    height={16}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </article>
                        )) : (
                            <div className="w-full flex flex-col items-center justify-center py-6 px-4">

                                <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-sm text-center">
                                    No games available at the moment
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    )
}
