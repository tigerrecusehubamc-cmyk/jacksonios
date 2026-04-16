import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import { fetchGamesBySection } from '@/lib/redux/slice/gameSlice'
import { store } from '@/lib/redux/store'
import { normalizeGameImages, normalizeGameTitle, normalizeGameAmount, getTotalPromisedPoints } from '@/lib/gameDataNormalizer'

const EMPTY_ARRAY = [];

const formatNumber = (num) => {
    if (num === null || num === undefined) return "0";
    const numValue = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
    if (isNaN(numValue)) return "0";
    return numValue.toLocaleString();
};

const Leadership = () => {
    const router = useRouter();
    const dispatch = useDispatch();

    const sectionName = "Leadership";
    const CACHE_STALE_MS = 5 * 60 * 1000;
    const FOCUS_REFRESH_STALE_MS = 2 * 60 * 1000;

    // FIX: select only this section's data so re-renders only happen when "Leadership" changes,
    // not every time Swipe / MostPlayed / Highest Earning etc. update their Redux state
    const sectionGames = useSelector((state) => state.games.gamesBySection[sectionName] ?? EMPTY_ARRAY);
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

    // Return to app (focus): one discover call only if cache older than 2 min.
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

    const leadershipGames = sectionGames.slice(0, 2);

    // Handle game click - navigate to game details
    const handleGameClick = (game) => {
        // Clear Redux state BEFORE navigation to prevent showing old data
        dispatch({ type: 'games/clearCurrentGameDetails' });

        // Store full game data including besitosRawData in localStorage
        try {
            localStorage.setItem('selectedGameData', JSON.stringify(game));
        } catch (error) {
            // Failed to store game data
        }

        // Use provider gameId (BitLabs/Besitos) for get-game-by-id API; fallback to id/_id
        const gameId = game.gameId || game.details?.id || game.id || game._id;
        router.push(`/gamedetails?gameId=${gameId}&source=leadership`);
    };

    // Show loading skeleton only when loading AND no cached data (show cache first when present)
    const hasCachedData = leadershipGames.length > 0;
    if (sectionStatus === "loading" && !hasCachedData) {
        return (
            <section className="flex flex-col w-full max-w-[332px] items-start gap-2.5 mx-auto px-2 sm:px-0">
                <h3 className="font-semibold text-white text-base w-full mb-2">Leadership</h3>
                <div
                    className={`flex items-start sm:items-center gap-3 sm:gap-[15px] w-full overflow-x-auto pb-2 justify-center`}
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {[1, 2].map((i) => (
                        <div key={i} className="relative flex-shrink-0 w-[155px] sm:w-[155px] h-auto min-h-[274px] animate-pulse">
                            <div className="w-full h-[185px] bg-gray-700 rounded-[16px]"></div>
                            <div className="mt-3 space-y-2">
                                <div className="w-24 h-4 bg-gray-700 rounded"></div>
                                <div className="w-full max-w-[140px] h-[37px] bg-gray-700 rounded-[10px]"></div>
                                <div className="flex gap-2">
                                    <div className="w-16 h-[29px] bg-gray-700 rounded-[10px]"></div>
                                    <div className="w-16 h-[29px] bg-gray-700 rounded-[10px]"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    // Show message if no games available
    if (leadershipGames.length === 0) {
        return (
            <section className="flex flex-col w-full max-w-[335px] items-start gap-2.5 mx-auto">
                <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-lg mb-2">
                    Leadership
                </h3>
                <div className="flex items-center justify-center w-full h-26">
                    <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-sm text-center">
                        No games available at the moment
                    </p>
                </div>
            </section>
        );
    }
    return (
        <section className="flex flex-col w-full max-w-[330px] items-start gap-2.5 mx-auto px-2 sm:px-0">
            {/* JACK_58: Ensure heading is present and styled */}
            <h3 className="font-semibold text-white text-base w-full">Leadership</h3>

            <div
                className={`flex items-start sm:items-center gap-3 sm:gap-[15px] w-full overflow-x-hidden pb-2 ${leadershipGames.length === 1 ? 'justify-center' : leadershipGames.length === 2 ? 'justify-start sm:justify-center' : 'justify-start'
                    }`}
            >
                {leadershipGames.map((game, index) => {
                    const images = normalizeGameImages(game);
                    const displayImage = images.square_image || images.icon || game.images?.icon || game.icon || game.square_image || game.image || '/assets/animaapp/DfFsihWg/img/image-3930-2x.png';
                    const displayTitle = normalizeGameTitle(game);

                    // Coins and total XP from tasks (single source: getTotalPromisedPoints)
                    const amount = normalizeGameAmount(game);
                    const coinAmount = game.rewards?.coins ?? game.rewards?.gold ?? amount ?? 0;
                    const raw = typeof coinAmount === 'number' ? coinAmount : (typeof coinAmount === 'string' ? parseFloat(coinAmount.replace('$', '').replace(/,/g, '')) || 0 : 0);
                    const coins = Number.isFinite(raw) ? (raw === Math.round(raw) ? Math.round(raw) : Math.round(raw * 100) / 100) : 0;
                    const { totalXP } = getTotalPromisedPoints(game);
                    const totalXPDisplay = Number.isFinite(totalXP) ? Math.floor(totalXP) : 0;

                    return (
                        <article
                            key={game._id || game.id || game.gameId || `game-${index}`}
                            className="relative flex-shrink-0 w-[155px] sm:w-[155px] h-auto min-h-[275px] cursor-pointer hover:scale-105 transition-all duration-200"
                            onClick={() => handleGameClick(game)}
                        >
                            <div
                                className="relative w-full h-[180px] bg-cover bg-center rounded-[16px] overflow-hidden"
                                style={{
                                    backgroundImage: `url(${displayImage})`,
                                }}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                            </div>

                            <div className="flex flex-col w-full gap-2 mt-3">
                                <div className="flex flex-col gap-1.5 w-full">
                                    {/* Game Name - Match Highest Earning Games style */}
                                    <h4 className="[font-family:'Poppins',Helvetica] font-bold text-white text-sm sm:text-base leading-tight break-words w-full">
                                        {(() => {
                                            const title = displayTitle;
                                            // Remove "Android" text from the title
                                            return title
                                                .replace(/\s*Android\s*/gi, '') // Removes "Android"
                                                .replace(/-/g, ' ')             // Replaces all hyphens with a space
                                                .trim();
                                        })()}
                                    </h4>

                                    {/* Genre - Match Highest Earning Games style */}
                                    <h4 className="[font-family:'Poppins',Helvetica] mb-2 mt-[2px] font-light text-white text-[11px] sm:text-[12px] leading-tight break-words">
                                        {(() => {
                                            // Safely extract category name from game object
                                            if (!game) return '(Game)';

                                            const categoryName =
                                                game.besitosRawData?.categories?.[0]?.name ||
                                                game.details?.category ||
                                                (game.categories && game.categories.length > 0
                                                    ? (typeof game.categories[0] === 'object'
                                                        ? game.categories[0].name || 'Game'
                                                        : game.categories[0])
                                                    : 'Game');

                                            return `(${categoryName})`;
                                        })()}
                                    </h4>

                                    {/* Stats - Match Highest Earning Games alignment and style */}
                                    <div className="flex gap-2 flex-wrap" role="list" aria-label="Game statistics">
                                        <div className="flex items-center justify-center min-w-fit h-[29px] px-2 rounded-[10px] bg-[linear-gradient(180deg,rgba(158,173,247,0.6)_0%,rgba(113,106,231,0.6)_100%)] relative">
                                            <span className="[font-family:'Poppins',Helvetica] font-medium text-white text-xs sm:text-sm leading-5 whitespace-nowrap">
                                                {formatNumber(coins)}
                                            </span>
                                            <img
                                                className="w-4 h-4 ml-1 flex-shrink-0"
                                                alt="Coin"
                                                src="/assets/animaapp/3btkjiTJ/img/image-3937-2x.png"
                                                loading="eager"
                                                decoding="async"
                                                width="16"
                                                height="16"
                                            />
                                        </div>
                                        <div className="flex items-center justify-center min-w-fit h-[29px] px-2 rounded-[10px] bg-[linear-gradient(180deg,rgba(158,173,247,0.6)_0%,rgba(113,106,231,0.6)_100%)] relative">
                                            <span className="[font-family:'Poppins',Helvetica] font-medium text-white text-xs sm:text-sm leading-5 whitespace-nowrap">
                                                {formatNumber(totalXPDisplay)}
                                            </span>
                                            <img
                                                className="w-4 h-4 ml-1 flex-shrink-0"
                                                alt="XP"
                                                src="/assets/animaapp/3btkjiTJ/img/pic.svg"
                                                loading="eager"
                                                decoding="async"
                                                width="16"
                                                height="16"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                })}
            </div>
        </section>
    )
}

export default Leadership
