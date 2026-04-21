"use client";
import React, { useMemo, useEffect, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import { fetchGamesBySection } from '@/lib/redux/slice/gameSlice'
import { normalizeGameImages, normalizeGameTitle, normalizeGameCategory, normalizeGameDescription } from '@/lib/gameDataNormalizer'

const EMPTY_ARRAY = [];

export const Frame = () => {
    const router = useRouter();
    const dispatch = useDispatch();

    const sectionName = "Gametips";
    const CACHE_STALE_MS = 5 * 60 * 1000;
    const FOCUS_REFRESH_STALE_MS = 2 * 60 * 1000;

    const gameTipsGames = useSelector((state) => state.games.gamesBySection[sectionName] ?? EMPTY_ARRAY);
    const gameTipsStatus = useSelector((state) => state.games.gamesBySectionStatus[sectionName] ?? "idle");
    const sectionTimestamp = useSelector((state) => state.games.gamesBySectionTimestamp[sectionName]);
    const { details: userProfile } = useSelector((state) => state.profile);

    // Mount: fetch only if cache is stale and not already loading/failed
    useEffect(() => {
        const hasFreshCache = sectionTimestamp != null && Date.now() - sectionTimestamp < CACHE_STALE_MS;
        if (hasFreshCache || gameTipsStatus === "loading" || gameTipsStatus === "failed") return;
        dispatch(fetchGamesBySection({
            uiSection: sectionName,
            user: userProfile,
            page: 1,
            limit: 10,
        }));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Focus/visibility: refresh only when cache is older than FOCUS_REFRESH_STALE_MS
    useEffect(() => {
        const handleRefreshIfStale = () => {
            const state = require("@/lib/redux/store").store.getState();
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
                background: true,
            }));
        };
        const handleFocus = () => handleRefreshIfStale();
        const handleVisibility = () => { if (!document.hidden) handleRefreshIfStale(); };
        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibility);
        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [dispatch, sectionName]);

    // Normalize game data using same normalizers as MostPlayedGames
    const gameTips = useMemo(() => {
        return gameTipsGames.slice(0, 2).map((game, index) => {
            const images = normalizeGameImages(game);
            const title = normalizeGameTitle(game);
            const category = normalizeGameCategory(game);

            const getOptimizedImage = () => {
                const candidates = [
                    images.large_image,
                    images.banner,
                    images.square_image,
                    images.icon,
                    game.details?.large_image,
                    game.details?.banner,
                    game.details?.square_image,
                    game.images?.large_image,
                    game.images?.banner,
                    game.images?.square_image,
                    game.images?.icon,
                    game.large_image,
                    game.banner,
                    game.square_image,
                    game.image,
                ];
                for (const candidate of candidates) {
                    if (candidate && typeof candidate === 'string' && candidate.trim() !== '' && candidate !== 'null' && candidate !== 'undefined') {
                        return candidate;
                    }
                }
                return '/placeholder-game.png';
            };

            const rawData = game.besitosRawData || {};
            const description =
                rawData.description ||
                game.details?.description ||
                game.description ||
                "Discover an amazing gaming experience";

            return {
                id: game._id || game.id || `game-tip-${index}`,
                title,
                description,
                image: getOptimizedImage(),
                imageType: index === 0 ? "bg" : "img",
                category,
                game,
            };
        });
    }, [gameTipsGames]);

    const handleGameClick = useCallback((game) => {
        const gameTitle = (() => {
            const title = game?.title || game?.details?.name || game?.name || 'Game';
            return title
                .replace(/\s*Android\s*/gi, '')
                .replace(/-/g, ' ')
                .split(' - ')[0]
                .trim();
        })();

        const normalizedImages = normalizeGameImages(game);
        const gameImage = normalizedImages.large_image || normalizedImages.banner || normalizedImages.square_image || normalizedImages.icon || '';
        const gameCategory = game.details?.category || (game.categories && game.categories.length > 0
            ? (typeof game.categories[0] === 'object' ? game.categories[0].name || 'Casual' : game.categories[0])
            : 'Casual');
        const gameDescription = normalizeGameDescription(game);
        router.push(`/game-tips-details?title=${encodeURIComponent(gameTitle)}&image=${encodeURIComponent(gameImage)}&category=${encodeURIComponent(gameCategory)}&description=${encodeURIComponent(gameDescription)}`);
    }, [router]);

    const isLoading = gameTipsStatus === 'loading';
    const hasNoData = gameTips.length === 0 && (gameTipsStatus === 'succeeded' || gameTipsStatus === 'failed');

    if (isLoading) {
        return (
            <section
                className="inline-flex flex-col items-start gap-2.5 relative"
                data-model-id="2035:19059"
                aria-labelledby="game-tips-heading"
            >
                <header className="flex items-center justify-around gap-[49px] relative self-stretch w-full flex-[0_0_auto]">
                    <h1
                        id="game-tips-heading"
                        className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-[normal]"
                    >
                        🧩 Game Tips ⛳
                    </h1>
                </header>
                <div className="flex items-start gap-5 pt-0 pb-2.5 px-5 relative self-stretch w-full">
                    {[1, 2].map((i) => (
                        <div key={i} className="flex flex-col w-[158px] rounded-md overflow-hidden shadow-lg animate-pulse">
                            <div className="w-[158px] h-[120px] bg-gray-700"></div>
                            <div className="h-[111px] bg-gray-700"></div>
                        </div>
                    ))}
                </div>
            </section>
        );
    }

    if (hasNoData) {
        return (
            <section
                className="inline-flex flex-col items-start gap-2.5 relative"
                data-model-id="2035:19059"
                aria-labelledby="game-tips-heading"
            >
                <header className="flex items-center justify-around gap-[49px] relative self-stretch w-full flex-[0_0_auto]">
                    <h1
                        id="game-tips-heading"
                        className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-[normal]"
                    >
                        🧩 Game Tips ⛳
                    </h1>
                </header>
                <div className="flex h-[229px] items-start gap-5 pt-0 pb-2.5 px-5 relative self-stretch w-full">
                    <p className="text-gray-400 text-sm">No game tips available</p>
                </div>
            </section>
        );
    }

    return (
        <section
            className="inline-flex flex-col items-start gap-2.5 relative"
            data-model-id="2035:19059"
            aria-labelledby="game-tips-heading"
        >
            <header className="flex items-center justify-around gap-[49px] relative self-stretch w-full flex-[0_0_auto]">
                <h1
                    id="game-tips-heading"
                    className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-[normal]"
                >
                    🧩 Game Tips ⛳
                </h1>
            </header>
            <div className="flex items-start gap-5 pt-0 pb-2.5 px-5 relative self-stretch w-full">
                {gameTips.map((tip) => (
                    <article
                        key={tip.id}
                        className="flex flex-col w-[158px] rounded-[12px] overflow-hidden shadow-lg cursor-pointer hover:scale-105 transition-all duration-200 bg-black"
                        onClick={() => handleGameClick(tip.game)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleGameClick(tip.game);
                            }
                        }}
                        aria-label={`View tips for ${tip.title}`}
                    >
                        {/* Image Section */}
                        <div className="relative w-[158px] h-[120px] flex-shrink-0">
                            <img
                                className="absolute inset-0 w-full h-full object-cover"
                                alt={tip.title}
                                src={tip.image}
                                loading="lazy"
                                decoding="async"
                                onError={(e) => { e.target.src = '/placeholder-game.png'; }}
                            />
                        </div>

                        {/* Content Section */}
                        <div className="flex flex-col h-[111px] p-2.5 bg-[linear-gradient(180deg,rgba(81,98,182,0.4)_0%,rgba(63,56,184,0.4)_100%)] flex-shrink-0">
                            <div className="flex flex-col gap-1 flex-1">
                                <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-sm leading-tight line-clamp-1 mb-0.5">
                                    {tip.title}
                                </h2>
                                <p className="[font-family:'Poppins',Helvetica] font-light text-white text-[12px] leading-[1.4] line-clamp-3 flex-1">
                                    {tip.description}
                                </p>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); handleGameClick(tip.game); }}
                                    className="[font-family:'Poppins',Helvetica] font-semibold text-[#9eadf7] text-xs leading-4 hover:text-[#b8c5ff] transition-colors mt-auto"
                                    aria-label={`Read more about ${tip.title}`}
                                >
                                    More...
                                </a>
                            </div>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
};
