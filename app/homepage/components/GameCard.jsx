"use client";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchGamesBySection } from "@/lib/redux/slice/gameSlice";
import { useRouter } from "next/navigation";
import { handleGameDownload } from "@/lib/gameDownloadUtils";
import { useVipStatus } from "@/hooks/useVipStatus";
import { trackUndoUsage, getUndoUsage } from "@/lib/api";
import { normalizeGameImages, normalizeGameTitle, normalizeGameDescription, normalizeGameCategory, normalizeGameAmount, getTotalPromisedPoints } from "@/lib/gameDataNormalizer";

const EMPTY_ARRAY = [];

const UNDO_LIMITS = { Free: 1, Bronze: 6, Platinum: 12, Gold: 8 };

const GameCard = ({ onClose: onCloseProp }) => {
    const dispatch = useDispatch();
    const router = useRouter();

    // Get data for "Swipe" section. Same fetch pattern as HighestEarningGame; user from localStorage (no profile).
    const sectionName = "Swipe";
    const CACHE_STALE_MS = 5 * 60 * 1000;
    const FOCUS_REFRESH_STALE_MS = 2 * 60 * 1000;
    const swipeGames = useSelector((state) => state.games.gamesBySection[sectionName] ?? EMPTY_ARRAY);
    const swipeStatus = useSelector((state) => state.games.gamesBySectionStatus[sectionName] ?? "idle");
    const sectionTimestamp = useSelector((state) => state.games.gamesBySectionTimestamp[sectionName]);
    const inProgressGames = useSelector((state) => state.games.inProgressGames ?? EMPTY_ARRAY);
    const { details: userProfile } = useSelector((state) => state.profile);
    const { currentTier } = useVipStatus();
    const [showTooltip, setShowTooltip] = useState(false);
    const [currentGameIndex, setCurrentGameIndex] = useState(0);
    const [undoCount, setUndoCount] = useState(0);
    const [showVIPModal, setShowVIPModal] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [swipeHistory, setSwipeHistory] = useState([]);
    const [maxUndoLimit, setMaxUndoLimit] = useState(1);
    const [isUnlimitedUndo, setIsUnlimitedUndo] = useState(false);
    const [showLastCardModal, setShowLastCardModal] = useState(false);
    const [isLastCardReached, setIsLastCardReached] = useState(false);
    const [showLastCard, setShowLastCard] = useState(false);
    const [showLoopNotification, setShowLoopNotification] = useState(false);
    const [isLoopMode, setIsLoopMode] = useState(false);
    const tooltipRef = useRef(null);
    const cardRef = useRef(null);
    const undoLoadedRef = useRef(false);
    const [swipeDirection, setSwipeDirection] = useState(null);
    const [startX, setStartX] = useState(0);
    const [currentX, setCurrentX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [imageLoading, setImageLoading] = useState(true);
    const [imageError, setImageError] = useState(false);

    // OPTIMIZED: Memoize event handlers to prevent recreation
    const toggleTooltip = useCallback(() => {
        setShowTooltip(!showTooltip);
    }, [showTooltip]);

    const getUserId = useCallback(() => {
        return localStorage.getItem('userId') || 'default_user_id';
    }, []);

    // Load undo count on mount: backend is source of truth, localStorage is fallback
    useEffect(() => {
        const loadUndoCount = async () => {
            // Load swipe history from localStorage immediately (no backend equivalent)
            const savedSwipeHistory = localStorage.getItem('gameCard_swipeHistory');
            if (savedSwipeHistory) {
                try {
                    const parsed = JSON.parse(savedSwipeHistory);
                    setSwipeHistory(parsed);
                } catch (_) {
                    setSwipeHistory([]);
                }
            }

            // Try to get the authoritative undo count from backend
            try {
                const token = localStorage.getItem('authToken');
                const res = await getUndoUsage(token);
                if (res?.success && res?.data) {
                    if (res.data.unlimited === true) {
                        // No games downloaded yet — unlimited undo/swipe
                        setIsUnlimitedUndo(true);
                        console.log('[GameCard][Init] Unlimited undo mode (no games downloaded yet)');
                    } else if (res.data.undoCount != null) {
                        const serverCount = res.data.undoCount;
                        setUndoCount(serverCount);
                        localStorage.setItem('gameCard_undoCount', serverCount.toString());
                        console.log(`[GameCard][Init] undoCount from backend: ${serverCount}`);
                    } else {
                        throw new Error('no data');
                    }
                } else {
                    throw new Error('no data');
                }
            } catch (_) {
                // Fallback to localStorage if API fails
                const savedUndoCount = localStorage.getItem('gameCard_undoCount');
                const countToSet = savedUndoCount ? parseInt(savedUndoCount, 10) : 0;
                setUndoCount(countToSet);
                console.log(`[GameCard][Init] undoCount from localStorage fallback: ${countToSet}`);
            } finally {
                undoLoadedRef.current = true;
            }
        };

        loadUndoCount();
    }, []); // runs once on mount only

    // Update undo limit when VIP tier changes — does NOT touch undoCount
    useEffect(() => {
        const tier = currentTier
            ? currentTier.charAt(0).toUpperCase() + currentTier.slice(1).toLowerCase()
            : 'Free';
        const limit = UNDO_LIMITS[tier] ?? 1;
        setMaxUndoLimit(limit);
        console.log(`[GameCard][VIP] Tier detected: "${currentTier}" → normalized: "${tier}" → maxUndoLimit set to ${limit}`);
    }, [currentTier]);

    // Save undo count to localStorage — only after initial load to avoid overwriting saved value
    useEffect(() => {
        if (!undoLoadedRef.current) return;
        localStorage.setItem('gameCard_undoCount', undoCount.toString());
        console.log(`[GameCard][Save] undoCount saved to localStorage: ${undoCount}`);
    }, [undoCount]);

    // Save swipe history to localStorage (always — including empty so cleared state persists)
    useEffect(() => {
        localStorage.setItem('gameCard_swipeHistory', JSON.stringify(swipeHistory));
    }, [swipeHistory]);

    // SIMPLE LOGIC: No need for complex state synchronization

    // OPTIMIZED: Memoize swipe preference logging to prevent recreation
    const logSwipePreference = useCallback((gameId, action, gameData) => {
        const preference = {
            gameId,
            action, // 'like' or 'reject'
            timestamp: new Date().toISOString(),
            gameData: {
                title: gameData?.title,
                category: gameData?.category,
                genre: gameData?.genre
            }
        };

        // Save to localStorage for persistence
        try {
            const existingPreferences = JSON.parse(localStorage.getItem('gamePreferences') || '[]');
            existingPreferences.push(preference);
            localStorage.setItem('gamePreferences', JSON.stringify(existingPreferences));
        } catch (error) {
            // Failed to save swipe preference - silently handle
        }
    }, []);

    // OPTIMIZED: Memoize swipe handlers to prevent recreation
    const handleSwipeLeft = useCallback(() => {
        const currentGame = swipeGames[currentGameIndex];

        // Check if this is the last card
        if (currentGameIndex >= swipeGames.length - 1) {
            // FIXED: Allow unlimited swiping - no undo limit check for swiping
            if (!isLoopMode) {
                // Show friendly notification for first time reaching last card
                setShowLoopNotification(true);
                setTimeout(() => {
                    setShowLoopNotification(false);
                    setIsLoopMode(true);
                }, 2000);
                return;
            } else {
                // In loop mode, start from beginning - always allow
                setCurrentGameIndex(0);
                return;
            }
        }

        // Normal swipe for non-last cards
        if (currentGame) {
            // Log rejection for recommendation algorithm
            logSwipePreference(currentGame._id || currentGame.id, 'reject', currentGame);

            // Add to swipe history for undo functionality
            setSwipeHistory(prev => [...prev, {
                gameIndex: currentGameIndex,
                action: 'left',
                game: currentGame,
                timestamp: Date.now()
            }]);
        }

        // SIMPLE LOGIC: No need to change user type during swiping

        setCurrentGameIndex(currentGameIndex + 1);
    }, [currentGameIndex, swipeGames, isLoopMode, logSwipePreference]);


    const handleSwipeRight = useCallback(() => {
        const currentGame = swipeGames[currentGameIndex];
        if (currentGame) {
            // Log like for recommendation algorithm
            logSwipePreference(currentGame._id || currentGame.id, 'like', currentGame);

            // Add to swipe history for undo functionality
            setSwipeHistory(prev => [...prev, {
                gameIndex: currentGameIndex,
                action: 'right',
                game: currentGame,
                timestamp: Date.now()
            }]);

            // Navigate to game details page
            // Clear Redux state BEFORE navigation to prevent showing old data
            dispatch({ type: 'games/clearCurrentGameDetails' });

            // Store full game data including besitosRawData in localStorage
            try {
                localStorage.setItem('selectedGameData', JSON.stringify(currentGame));
            } catch (error) {
                // Failed to store game data - silently handle
            }

            // Use provider gameId (BitLabs/Besitos) for get-game-by-id API; fallback to id/_id
            const gameId = currentGame.gameId || currentGame.details?.id || currentGame.id || currentGame._id;
            router.push(`/gamedetails?gameId=${gameId}&source=swipe`);
        }
    }, [currentGameIndex, swipeGames, logSwipePreference, router]);

    const handleUndo = useCallback(() => {
        const canUndo = isUnlimitedUndo || undoCount < maxUndoLimit;
        console.log(`[GameCard][Undo] Attempted — unlimited: ${isUnlimitedUndo}, tier: "${currentTier || 'Free'}", used: ${undoCount}/${maxUndoLimit}, canUndo: ${canUndo}, historyLength: ${swipeHistory.length}`, { currentTier, maxUndoLimit, undoCount });

        if (canUndo) {
            if (swipeHistory.length > 0) {
                const lastSwipe = swipeHistory[swipeHistory.length - 1];
                console.log(`[GameCard][Undo] Restoring game at index ${lastSwipe.gameIndex} (title: "${lastSwipe.game?.title || 'unknown'}")`);
                setCurrentGameIndex(lastSwipe.gameIndex);
                setSwipeHistory(prev => prev.slice(0, -1));

                if (isLastCardReached) {
                    setIsLastCardReached(false);
                    setShowLastCard(false);
                }
            } else if (currentGameIndex > 0) {
                console.log(`[GameCard][Undo] No history — falling back to index ${currentGameIndex - 1}`);
                setCurrentGameIndex(currentGameIndex - 1);
            } else {
                console.log('[GameCard][Undo] Nothing to undo — no history and at first card');
            }

            if (!isUnlimitedUndo) {
                const newUndoCount = undoCount + 1;
                setUndoCount(newUndoCount);
                console.log(`[GameCard][Undo] Success — undoCount now ${newUndoCount}/${maxUndoLimit}`);

                // Track undo usage in backend (fire-and-forget)
                const restoredGame = swipeHistory.length > 0 ? swipeHistory[swipeHistory.length - 1]?.game : null;
                trackUndoUsage(
                    {
                        gameId: restoredGame?._id || restoredGame?.id || restoredGame?.gameId || null,
                        gameTitle: restoredGame?.title || null,
                        undoCount: newUndoCount,
                        maxUndoLimit: maxUndoLimit,
                        tier: currentTier
                            ? currentTier.charAt(0).toUpperCase() + currentTier.slice(1).toLowerCase()
                            : 'Free',
                        restoredFromIndex: currentGameIndex,
                    },
                    typeof window !== "undefined" ? localStorage.getItem("authToken") : null,
                ).catch((err) => console.warn('[GameCard][Undo] trackUndoUsage failed (non-critical):', err));
            } else {
                console.log('[GameCard][Undo] Success (unlimited mode — no count tracked)');
            }
        } else {
            console.log(`[GameCard][Undo] Limit reached (${undoCount}/${maxUndoLimit}) — showing VIP upgrade modal`);
            setShowVIPModal(true);
        }
    }, [isUnlimitedUndo, maxUndoLimit, undoCount, swipeHistory, isLastCardReached, currentGameIndex, currentTier]);

    const handleDownload = useCallback(async () => {
        const currentGame = swipeGames[currentGameIndex];
        if (currentGame) {
            try {
                // Use besitosRawData URL if available
                const downloadUrl = currentGame.besitosRawData?.url || currentGame.url || currentGame.details?.downloadUrl;
                const gameToDownload = downloadUrl ? { ...currentGame, url: downloadUrl } : currentGame;

                // FIXED: Download game without affecting undo state
                await handleGameDownload(gameToDownload);
            } catch (error) {
                // Fallback to direct URL opening - use besitosRawData URL first
                const downloadUrl = currentGame.besitosRawData?.url || currentGame.url;
                if (downloadUrl) {
                    window.open(downloadUrl, '_blank');
                }
            }
        }
    }, [currentGameIndex, swipeGames, undoCount, swipeHistory.length]);

    const handleClose = useCallback(() => {
        // If in loop mode, go back to last game instead of closing
        if (isLoopMode && swipeHistory.length > 0) {
            const lastSwipe = swipeHistory[swipeHistory.length - 1];
            setCurrentGameIndex(lastSwipe.gameIndex);
            setSwipeHistory(prev => prev.slice(0, -1));
            setIsLoopMode(false);
        } else {
            setIsVisible(false);
            if (onCloseProp) {
                onCloseProp();
            }
        }
    }, [isLoopMode, swipeHistory, onCloseProp]);

    // FIXED: Add function to clear undo state only when explicitly needed
    const clearUndoState = useCallback(() => {
        setUndoCount(0);
        setSwipeHistory([]);
        localStorage.removeItem('gameCard_undoCount');
        localStorage.removeItem('gameCard_swipeHistory');
    }, []);

    const handleFinish = () => {
        setShowLastCardModal(false);
        setIsVisible(false);
        if (onCloseProp) {
            onCloseProp();
        }
    };

    const handleGotIt = () => {
        setShowLastCardModal(false);
        // Keep the card visible and show the last card where user left off
        setIsLastCardReached(false);
    };

    const handleReject = () => {
        handleSwipeLeft(); // Same as swipe left - skip current game and show next
    };

    // X button: skip to next available game only — no loop, no undo history
    const handleXButton = useCallback(() => {
        console.log(`[GameCard][X] Pressed — currentIndex: ${currentGameIndex}, total: ${swipeGames.length}`);
        if (currentGameIndex >= swipeGames.length - 1) {
            console.log('[GameCard][X] Already at last game — nothing to do');
            return;
        }
        console.log(`[GameCard][X] Moving to index ${currentGameIndex + 1} (NO undo history entry added)`);
        setCurrentGameIndex(currentGameIndex + 1);
    }, [currentGameIndex, swipeGames]);

    const handleVIPUpgrade = () => {
        setShowVIPModal(false);
        if (typeof window !== "undefined") sessionStorage.setItem("buySubscriptionFrom", "/homepage");
        router.push('/BuySubscription');
    };


    // Handle game card click - navigate to game details (same as right swipe)
    const handleGameCardClick = () => {
        handleSwipeRight(); // Same as right swipe - open game details
    };

    const handleStart = (clientX) => {
        setStartX(clientX);
        setCurrentX(clientX);
        setIsDragging(true);
    };

    const handleMove = (clientX) => {
        if (isDragging) {
            setCurrentX(clientX);
            const diff = clientX - startX;
            if (Math.abs(diff) > 50) {
                setSwipeDirection(diff > 0 ? 'right' : 'left');
            }
        }
    };

    const handleEnd = () => {
        if (isDragging) {
            const diff = currentX - startX;
            if (Math.abs(diff) > 100) {
                if (diff > 0) {
                    handleSwipeRight(); // Right swipe = Game details page
                } else {
                    handleSwipeLeft(); // Left swipe = Next game
                }
            }
            setIsDragging(false);
            setSwipeDirection(null);
        }
    };

    // One discover call only on mount. Guard loading/failed to prevent unnecessary calls.
    useEffect(() => {
        const hasFreshCache = sectionTimestamp != null && Date.now() - sectionTimestamp < CACHE_STALE_MS;
        if (hasFreshCache || swipeStatus === "loading" || swipeStatus === "failed") return;
        dispatch(fetchGamesBySection({
            uiSection: sectionName,
            user: userProfile,
            page: 1,
            limit: 10
        }));
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Return to app (focus): one discover call only if cache older than 2 min. User from localStorage.
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

    // Data for action buttons
    const actionButtons = [
        {
            id: 1,
            src: "/assets/animaapp/DfFsihWg/img/group-2-2x.png",
            alt: "Close",
            position: "left-0",
            onClick: handleXButton,
        },
        {
            id: 2,
            src: "/assets/animaapp/DfFsihWg/img/group-4-2x.png",
            alt: "Undo",
            position: "left-24",
            label: {
                current: isUnlimitedUndo ? '∞' : Math.max(0, maxUndoLimit - undoCount),
                total: isUnlimitedUndo ? '∞' : maxUndoLimit,
            },
            onClick: handleUndo,
        },
        {
            id: 3,
            src: "/assets/animaapp/DfFsihWg/img/group-3-2x.png",
            alt: "Download",
            position: "left-48",
            onClick: handleDownload,
        },
        // {
        //     id: 4,
        //     src: "/assets/animaapp/DfFsihWg/img/group-2-2x.png",
        //     alt: "Reject",
        //     position: "left-72",
        //     onClick: handleReject,
        // },
    ];

    const LabelBackground = () => (
        <div className="w-[51px] h-[22px] bg-[#F1B24A] rounded-[4px] flex items-center justify-center">
            {/* Empty div for proper sizing */}
        </div>
    );

    // This component now takes `current` and `total` props to display dynamic text.
    const UndoActionLabel = ({ current, total }) => (
        <div className="relative w-[51px] h-[22px] flex items-center justify-center">
            {/* The background is placed first */}
            <LabelBackground />
            {/* The dynamic text is centered properly */}
            <p className="absolute inset-0 flex items-center justify-center text-white text-[12px] font-normal [font-family:'Poppins',Helvetica] whitespace-nowrap leading-none">
                {current === '∞' ? '∞' : `${current}/${total}`} left
            </p>
        </div>
    );

    // OPTIMIZED: Memoize current game data to prevent recalculation
    const currentGame = useMemo(() => {
        return swipeGames[currentGameIndex];
    }, [swipeGames, currentGameIndex]);

    // Calculate coins and total XP for current game (normalizer prefers API rewards.coins / rewards.xp)
    const currentGameRewards = useMemo(() => {
        if (!currentGame) return { coins: 0, totalXP: 0 };
        try {
            const { totalCoins, totalXP } = getTotalPromisedPoints(currentGame);
            const coins = typeof totalCoins === "number" ? totalCoins : (parseFloat(totalCoins) || 0);
            const xp = typeof totalXP === "number" ? totalXP : (parseFloat(totalXP) || 0);
            return { coins, totalXP: xp };
        } catch (e) {
            const coinAmount = currentGame.rewards?.coins ?? currentGame.rewards?.gold ?? currentGame.besitosRawData?.amount ?? currentGame.amount ?? 0;
            const coins = typeof coinAmount === "number" ? coinAmount : (parseFloat(String(coinAmount).replace("$", "")) || 0);
            const xp = currentGame.rewards?.xp ?? 0;
            return { coins, totalXP: typeof xp === "number" ? xp : (parseFloat(xp) || 0) };
        }
    }, [currentGame]);

    const formatCoins = (n) => (Number(n) === Math.round(Number(n)) ? String(Math.round(Number(n))) : Number(n).toFixed(2));
    const formatXP = (n) => String(Math.round(Number(n)) || 0);


    // OPTIMIZED: Memoize game data processing with image optimization - using normalizer for both besitos and bitlab
    const gameData = useMemo(() => {
        if (!currentGame) return null;

        // Normalize game data for both besitos and bitlab
        const images = normalizeGameImages(currentGame);
        const title = normalizeGameTitle(currentGame);
        const description = normalizeGameDescription(currentGame);
        const category = normalizeGameCategory(currentGame);
        const amount = normalizeGameAmount(currentGame);

        // OPTIMIZED: Prioritize smaller images for faster loading
        const getOptimizedImage = () => {
            const imageSources = [
                images.square_image,
                images.icon,
                images.banner,
                images.large_image,
                currentGame?.images?.square_image,
                currentGame?.images?.banner,
                currentGame?.images?.large_image,
                currentGame?.image,
                currentGame?.square_image,
                currentGame?.details?.image
            ];

            return imageSources.find(src => src && src.trim() !== '') || '/game.png';
        };

        return {
            title: title,
            image: getOptimizedImage(),
            description: description,
            category: category,
            genre: category,
            id: currentGame._id || currentGame.id || currentGame.gameId,
            amount: amount,
            fullGameData: currentGame // Store full game including besitosRawData
        };
    }, [currentGame]);

    // OPTIMIZED: Preload next game image for smoother transitions
    useEffect(() => {
        if (swipeGames && swipeGames.length > 1) {
            const nextGameIndex = (currentGameIndex + 1) % swipeGames.length;
            const nextGame = swipeGames[nextGameIndex];

            if (nextGame) {
                const nextImage = nextGame.images?.square_image || nextGame.images?.banner || nextGame.image;
                if (nextImage) {
                    const img = new Image();
                    img.src = nextImage;
                }
            }
        }
    }, [currentGameIndex, swipeGames]);

    // OPTIMIZED: Reset image loading state when game changes
    useEffect(() => {
        setImageLoading(true);
        setImageError(false);
    }, [currentGameIndex]);

    // Show last card if user clicked "Got it"
    if (showLastCard && isLastCardReached) {
        return (
            <main className="relative flex flex-col items-center w-full max-w-[335px] mx-auto min-h-[549px]" data-model-id="2035:14588">
                {/* Last card display */}
                <article className="relative w-full max-w-[335px] h-[429px] flex-shrink-0 rounded-[12px_12px_0px_0px] overflow-hidden shadow-[0px_27.92px_39.88px_#4d0d3399] bg-[linear-gradient(180deg,rgba(95,14,58,1)_0%,rgba(16,8,25,1)_100%)]">
                    <section className="absolute left-1/2 -translate-x-1/2 w-[400px] max-w-[120%] h-[303px] top-[90px]">
                        {/* REMOVED: Image loading state for better Android UX */}
                        <img
                            className="absolute w-[400px] max-w-full h-[344px] top-[-2px] aspect-[1] object-cover"
                            alt={`${gameData?.title || 'Game'} artwork`}
                            src={gameData?.image || "/assets/animaapp/DfFsihWg/img/image-3930-2x.png"}
                            loading="eager"
                            decoding="async"
                            onLoad={() => setImageLoading(false)}
                            onError={(e) => {
                                setImageError(true);
                                setImageLoading(false);
                                e.target.src = "/assets/animaapp/DfFsihWg/img/image-3930-2x.png";
                            }}
                        />
                        <div className="absolute w-[210px] min-h-[40px] max-h-[60px] top-[30px] left-11 flex items-center justify-center px-2 py-1" style={{ minWidth: '180px', maxWidth: '210px' }}>
                            <span
                                className="[font-family:'Poppins',Helvetica] font-bold text-black text-lg text-center break-words hyphens-auto"
                                style={{
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    display: '-webkit-box',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: '1.3',
                                    letterSpacing: '0.01em',
                                    textShadow: '0 1px 2px rgba(255, 255, 255, 0.8)'
                                }}
                            >
                                {(currentGame?.name || currentGame?.details?.name || currentGame?.title || "Game").split(' - ')[0]}
                            </span>
                        </div>
                    </section>

                    {/* Header message */}
                    <header className="absolute w-full h-[88px] -top-0.5 left-0 right-0">
                        <div className="relative w-full h-[87px] top-px bg-[#442a3b] rounded-[10px_10px_0px_0px]">
                            <p
                                className="absolute w-[calc(100%-30px)] max-w-[304px] left-[15px] top-3.5 [font-family:'Poppins',Helvetica] font-normal text-white text-base text-center tracking-[0] leading-[1.4] break-words hyphens-auto"
                                style={{
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    minHeight: '60px',
                                    padding: '8px 4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                Your last game recommendation
                            </p>
                        </div>
                    </header>
                </article>

                {/* Footer */}
                <footer className="relative w-full flex-shrink-0 rounded-[0px_0px_10px_10px] overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex items-start px-3 py-3">
                    <div className="flex flex-col text-white [font-family:'Poppins',Helvetica] flex-1 min-w-0 gap-1 pr-10">
                        {/* Line 1: Game Name */}
                        <div className="flex items-start w-full min-w-0">
                            <h3
                                className="font-bold text-base leading-[1.3] text-white break-words hyphens-auto w-full"
                                style={{
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    display: '-webkit-box',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    lineHeight: '1.3',
                                    letterSpacing: '0.01em',
                                    textAlign: 'left',
                                }}
                            >
                                {(() => {
                                    const gameName = currentGame?.details?.name || currentGame?.title || gameData?.title || "Game";
                                    const cleanGameName = gameName.split(' - ')[0].split(':')[0].trim();
                                    return cleanGameName;
                                })()}
                            </h3>
                        </div>
                        {/* Line 2: Complete task and earn */}
                        <div className="flex items-center text-sm leading-[1.4]">
                            <span className="text-white/90 font-normal">Complete task and earn</span>
                        </div>
                        {/* Line 3: Coins and XP points */}
                        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm leading-[1.4]">
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="font-semibold text-white whitespace-nowrap">{formatCoins(currentGameRewards.coins)}</span>
                                <img
                                    className="w-5 h-5 flex-shrink-0"
                                    alt="Coin icon"
                                    src="/dollor.png"
                                    loading="eager"
                                    decoding="async"
                                    width="20"
                                    height="20"
                                />
                            </div>
                            <span className="text-white/90 font-medium flex-shrink-0">&</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                <span className="font-semibold text-white whitespace-nowrap">{formatXP(currentGameRewards.totalXP)}</span>
                                <img
                                    className="w-5 h-5 flex-shrink-0"
                                    alt="XP icon"
                                    src="/xp.svg"
                                    loading="eager"
                                    decoding="async"
                                    width="20"
                                    height="20"
                                />
                            </div>
                            <span className="text-white/90 font-medium">points</span>
                        </div>
                    </div>

                    <button
                        onClick={toggleTooltip}
                        className="absolute w-8 h-8 top-2 right-[-4px] z-20 cursor-pointer hover:opacity-80 transition-opacity duration-200 rounded-tl-lg rounded-bl-lg overflow-hidden flex items-center justify-center"
                        aria-label="More information"
                    >
                        <svg width="24" height="24" viewBox="0 0 33 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M0 0L25 0C29.4183 0 33 3.58172 33 8V34H8C3.58172 34 0 30.4183 0 26L0 0Z" fill="#6E6069" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M26.8949 16.8292C26.8949 19.7148 25.7823 22.4821 23.802 24.5225C21.8216 26.5629 19.1356 27.7092 16.3349 27.7092C13.5342 27.7092 10.8482 26.5629 8.86786 24.5225C6.88747 22.4821 5.7749 19.7148 5.7749 16.8292C5.7749 13.9437 6.88747 11.1763 8.86786 9.1359C10.8482 7.0955 13.5342 5.94922 16.3349 5.94922C19.1356 5.94922 21.8216 7.0955 23.802 9.1359C25.7823 11.1763 26.8949 13.9437 26.8949 16.8292ZM17.6549 11.3892C17.6549 11.7499 17.5158 12.0958 17.2683 12.3509C17.0207 12.6059 16.685 12.7492 16.3349 12.7492C15.9848 12.7492 15.6491 12.6059 15.4015 12.3509C15.154 12.0958 15.0149 11.7499 15.0149 11.3892C15.0149 11.0285 15.154 10.6826 15.4015 10.4276C15.6491 10.1725 15.9848 10.0292 16.3349 10.0292C16.685 10.0292 17.0207 10.1725 17.2683 10.4276C17.5158 10.6826 17.6549 11.0285 17.6549 11.3892ZM15.0149 15.4692C14.6648 15.4692 14.3291 15.6125 14.0815 15.8676C13.834 16.1226 13.6949 16.4685 13.6949 16.8292C13.6949 17.1899 13.834 17.5358 14.0815 17.7909C14.3291 18.0459 14.6648 18.1892 15.0149 18.1892V22.2692C15.0149 22.6299 15.154 22.9758 15.4015 23.2309C15.6491 23.4859 15.9848 23.6292 16.3349 23.6292H17.6549C18.005 23.6292 18.3407 23.4859 18.5883 23.2309C18.8358 22.9758 18.9749 22.6299 18.9749 22.2692C18.9749 21.9085 18.8358 21.5626 18.5883 21.3076C18.3407 21.0525 18.005 20.9092 17.6549 20.9092V16.8292C17.6549 16.4685 17.5158 16.1226 17.2683 15.8676C17.0207 15.6125 16.685 15.4692 16.3349 15.4692H15.0149Z" fill="white" fillOpacity="0.6" />
                        </svg>
                    </button>
                </footer>

                {/* Action buttons - close only */}
                <section className="flex flex-row justify-center items-center w-full py-4 flex-shrink-0" aria-label="Action buttons">
                    <button
                        className="relative w-[62px] h-[62px] flex-shrink-0 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-full"
                        aria-label="Close"
                        onClick={handleClose}
                    >
                        <img className="w-full h-full" alt="Close" src="/assets/animaapp/DfFsihWg/img/group-2-2x.png" loading="eager" decoding="async" width="62" height="62" />
                    </button>
                </section>

                {showTooltip && (
                    <div
                        ref={tooltipRef}
                        className="absolute top-[472px] right-[-8px] z-50 w-[320px] max-w-[calc(100vw-2rem)] bg-black/95 backdrop-blur-sm rounded-[12px] px-4 py-3 shadow-2xl border border-gray-600/50 animate-fade-in"
                    >
                        <div className="text-white font-medium text-sm [font-family:'Poppins',Helvetica] leading-normal">
                            <div className="text-center text-gray-200">
                                This is your last game recommendation. Click to explore it or use the close button to finish.
                            </div>
                        </div>
                        <div className="absolute top-[-8px] right-[25px] w-4 h-4 bg-black/95 border-t border-l border-gray-600/50 transform rotate-45"></div>
                    </div>
                )}
            </main>
        );
    }


    if (!isVisible) {
        return null;
    }

    // Show empty state if no games available - same compact height pattern as NonGameOffersSection / SurveysSection
    if (!swipeGames || swipeGames.length === 0) {
        return (
            <div className="w-full max-w-[335px] mx-auto min-h-[5rem] flex items-center justify-center">
                <div className="flex flex-col items-center justify-center py-6 px-4">
                    <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-xl mb-2 text-center">
                        Swipe
                    </h2>
                    <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-base text-center">
                        No games available at the moment                    </p>
                </div>
            </div>
        );
    }

    return (
        <main
            className="relative flex flex-col items-center w-full max-w-[335px] mx-auto animate-fade-in min-h-[549px]"
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: 549 }}
            data-model-id="2035:14588"
        >
            {/* Main game card */}
            <article
                ref={cardRef}
                className="relative w-full max-w-[335px] h-[429px] rounded-[12px_12px_0px_0px] cursor-grab active:cursor-grabbing"
                onMouseDown={(e) => handleStart(e.clientX)}
                onMouseMove={(e) => handleMove(e.clientX)}
                onMouseUp={handleEnd}
                onMouseLeave={handleEnd}
                onTouchStart={(e) => handleStart(e.touches[0].clientX)}
                onTouchMove={(e) => handleMove(e.touches[0].clientX)}
                onTouchEnd={handleEnd}
                style={{
                    flex: '0 0 429px',
                    minHeight: 429,
                    transform: isDragging ? `translateX(${currentX - startX}px)` : 'translateX(0)',
                    transition: isDragging ? 'none' : 'transform 0.3s ease-out'
                }}
            >

                {/* Main card container */}
                <div
                    className="absolute inset-0 w-full h-full rounded-[12px_12px_0px_0px] overflow-hidden shadow-[0px_27.92px_39.88px_#4d0d3399] bg-[linear-gradient(180deg,rgba(95,14,58,1)_0%,rgba(16,8,25,1)_100%)] cursor-pointer hover:opacity-95 transition-opacity duration-200"
                    onClick={handleGameCardClick}
                >
                    <section className="absolute left-1/2 -translate-x-1/2 w-[400px] max-w-[120%] h-[303px] top-[90px]">
                        {/* REMOVED: Image loading state for better Android UX */}
                        <img
                            className="absolute w-[400px] max-w-full h-[344px] top-[-2px] object-cover"
                            alt={`${gameData?.title || 'Game'} artwork`}
                            src={gameData?.image || "/assets/animaapp/DfFsihWg/img/image-3930-2x.png"}
                            loading="eager"
                            decoding="async"
                            onLoad={() => setImageLoading(false)}
                            onError={(e) => {
                                setImageError(true);
                                setImageLoading(false);
                                e.target.src = "/assets/animaapp/DfFsihWg/img/image-3930-2x.png";
                            }}
                        />
                        {/* <div className="absolute w-[210px] h-10 top-[30px] left-11 flex items-center justify-center">
                            <span className="[font-family:'Poppins',Helvetica] font-bold text-black text-lg text-center">
                                {(currentGame.name || currentGame.title || "Game").split(' - ')[0]}

                            </span>
                        </div> */}
                    </section>

                    {/* Header message */}
                    <header className="absolute w-full h-[88px] -top-0.5 left-0 right-0">
                        <div className={`relative w-full h-[87px] top-px rounded-[10px_10px_0px_0px] ${isLoopMode ? 'bg-gradient-to-r from-purple-600/80 to-pink-600/80' : 'bg-[#442a3b]'}`}>
                            <p
                                className="absolute w-[calc(100%-30px)] max-w-[304px] left-[15px] top-3.5 [font-family:'Poppins',Helvetica] font-normal text-white text-base text-center tracking-[0] leading-[1.4] break-words hyphens-auto"
                                style={{
                                    wordBreak: 'break-word',
                                    overflowWrap: 'break-word',
                                    minHeight: '60px',
                                    padding: '8px 4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexDirection: 'column',
                                    gap: '4px'
                                }}
                            >
                                {isLoopMode ? (
                                    <>
                                        🔄 Loop Mode: Keep swiping to see more games!
                                        <br />
                                        <span className="text-sm opacity-80">Tap X to return to your last game</span>
                                    </>
                                ) : (
                                    <>
                                        Please start downloading games from below suggestions &amp;
                                        start earning now!
                                    </>
                                )}
                            </p>
                        </div>
                    </header>
                </div>
            </article>
            <>
                <div className="flex flex-col flex-shrink-0 w-full max-w-[335px] items-center" style={{ flex: '0 0 auto' }}>
                    <footer className="relative w-full rounded-[0px_0px_10px_10px] overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex items-start px-3 py-3" style={{ flex: '0 0 auto' }}>
                        <div className="flex flex-col text-white [font-family:'Poppins',Helvetica] flex-1 min-w-0 gap-1 pr-10">
                            {/* Line 1: Game Name */}
                            <div className="flex items-start w-full min-w-0">
                                <h3
                                    className="font-bold text-base leading-[1.3] text-white break-words hyphens-auto w-full"
                                    style={{
                                        wordBreak: 'break-word',
                                        overflowWrap: 'break-word',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        display: '-webkit-box',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        lineHeight: '1.3',
                                        letterSpacing: '0.01em',
                                        textAlign: 'left',
                                    }}
                                >
                                    {(() => {
                                        const gameName = currentGame?.details?.name || currentGame?.title || gameData?.title || "Game";
                                        const cleanGameName = gameName.split(' - ')[0].split(':')[0].trim();
                                        return cleanGameName;
                                    })()}
                                </h3>
                            </div>
                            {/* Line 2: Complete task and earn */}
                            <div className="flex items-center text-sm leading-[1.4]">
                                <span className="text-white/90 font-normal">Complete task and earn</span>
                            </div>
                            {/* Line 3: Coins and XP points */}
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-sm leading-[1.4]">
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="font-semibold text-white whitespace-nowrap">{formatCoins(currentGameRewards.coins)}</span>
                                    <img
                                        className="w-5 h-5 flex-shrink-0"
                                        alt="Coin icon"
                                        src="/dollor.png"
                                        loading="eager"
                                        decoding="async"
                                        width="20"
                                        height="20"
                                    />
                                </div>
                                <span className="text-white/70 font-medium flex-shrink-0">&</span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <span className="font-semibold text-white whitespace-nowrap">{formatXP(currentGameRewards.totalXP)}</span>
                                    <img
                                        className="w-5 h-5 flex-shrink-0"
                                        alt="XP icon"
                                        src="/xp.svg"
                                        loading="eager"
                                        decoding="async"
                                        width="20"
                                        height="20"
                                    />
                                </div>
                                <span className="text-white/90 font-medium">points</span>
                            </div>
                        </div>

                        <button
                            onClick={toggleTooltip}
                            className="absolute w-8 h-8 top-2 right-[-4px] z-20 cursor-pointer hover:opacity-80 transition-opacity duration-200 rounded-tl-lg rounded-bl-lg overflow-hidden flex items-center justify-center"
                            aria-label="More information"
                        >
                            <svg width="24" height="24" viewBox="0 0 33 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 0L25 0C29.4183 0 33 3.58172 33 8V34H8C3.58172 34 0 30.4183 0 26L0 0Z" fill="#6E6069" />
                                <path fillRule="evenodd" clipRule="evenodd" d="M26.8949 16.8292C26.8949 19.7148 25.7823 22.4821 23.802 24.5225C21.8216 26.5629 19.1356 27.7092 16.3349 27.7092C13.5342 27.7092 10.8482 26.5629 8.86786 24.5225C6.88747 22.4821 5.7749 19.7148 5.7749 16.8292C5.7749 13.9437 6.88747 11.1763 8.86786 9.1359C10.8482 7.0955 13.5342 5.94922 16.3349 5.94922C19.1356 5.94922 21.8216 7.0955 23.802 9.1359C25.7823 11.1763 26.8949 13.9437 26.8949 16.8292ZM17.6549 11.3892C17.6549 11.7499 17.5158 12.0958 17.2683 12.3509C17.0207 12.6059 16.685 12.7492 16.3349 12.7492C15.9848 12.7492 15.6491 12.6059 15.4015 12.3509C15.154 12.0958 15.0149 11.7499 15.0149 11.3892C15.0149 11.0285 15.154 10.6826 15.4015 10.4276C15.6491 10.1725 15.9848 10.0292 16.3349 10.0292C16.685 10.0292 17.0207 10.1725 17.2683 10.4276C17.5158 10.6826 17.6549 11.0285 17.6549 11.3892ZM15.0149 15.4692C14.6648 15.4692 14.3291 15.6125 14.0815 15.8676C13.834 16.1226 13.6949 16.4685 13.6949 16.8292C13.6949 17.1899 13.834 17.5358 14.0815 17.7909C14.3291 18.0459 14.6648 18.1892 15.0149 18.1892V22.2692C15.0149 22.6299 15.154 22.9758 15.4015 23.2309C15.6491 23.4859 15.9848 23.6292 16.3349 23.6292H17.6549C18.005 23.6292 18.3407 23.4859 18.5883 23.2309C18.8358 22.9758 18.9749 22.6299 18.9749 22.2692C18.9749 21.9085 18.8358 21.5626 18.5883 21.3076C18.3407 21.0525 18.005 20.9092 17.6549 20.9092V16.8292C17.6549 16.4685 17.5158 16.1226 17.2683 15.8676C17.0207 15.6125 16.685 15.4692 16.3349 15.4692H15.0149Z" fill="white" fillOpacity="0.6" />
                            </svg>
                        </button>
                    </footer>

                    {/* Action buttons section - flex row, min-height so Android doesn't collapse */}
                    <section
                        className="flex flex-row justify-center items-center gap-6 w-full py-4 flex-shrink-0 min-h-[90px]"
                        aria-label="Action buttons"
                        style={{ flex: '0 0 auto' }}
                    >
                        {actionButtons.map((button) => (
                            <button
                                key={button.id}
                                className="relative w-[62px] h-[62px] flex-shrink-0 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-full"
                                aria-label={button.alt}
                                onClick={button.onClick}
                            >
                                <img className="w-full h-full" alt={button.alt} src={button.src} loading="eager" decoding="async" width="62" height="62" />

                                {/* Conditionally render the label if `hasLabel` is true */}
                                {button.label && (
                                    <div className="absolute bottom-[-18px] left-1/2 -translate-x-1/2 z-10 flex items-center justify-center">
                                        <UndoActionLabel
                                            current={button.label.current}
                                            total={button.label.total} />
                                    </div>
                                )}
                            </button>
                        ))}
                    </section>
                </div>

                {showTooltip && (
                    <div
                        ref={tooltipRef}
                        className="absolute top-[472px] right-[-8px] z-50 w-[320px] max-w-[calc(100vw-2rem)] bg-black/95 backdrop-blur-sm rounded-[12px] px-4 py-3 shadow-2xl border border-gray-600/50 animate-fade-in"
                    >
                        <div className="text-white font-medium text-sm [font-family:'Poppins',Helvetica] leading-normal">
                            <div className="text-center text-gray-200">
                                {isUnlimitedUndo
                                    ? 'You have unlimited undos! Download a game to activate tier-based limits.'
                                    : `You have ${Math.max(0, maxUndoLimit - undoCount)} undo attempt${maxUndoLimit - undoCount !== 1 ? 's' : ''} remaining.`}
                            </div>
                            <div className="text-center text-gray-400 text-xs mt-2">
                                {isUnlimitedUndo
                                    ? 'Unlimited swipes & undos'
                                    : `${currentTier || 'Free'} plan: ${maxUndoLimit} undo${maxUndoLimit !== 1 ? 's' : ''}`}
                            </div>
                        </div>
                        <div className="absolute top-[-8px] right-[25px] w-4 h-4 bg-black/95 border-t border-l border-gray-600/50 transform rotate-45"></div>
                    </div>
                )}

                {/* VIP Modal */}
                {showVIPModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-black rounded-lg p-6 max-w-sm mx-4 border border-gray-600">
                            <h3 className="text-lg font-bold text-white mb-4">Upgrade Your Plan</h3>
                            <p className="text-white mb-6 text-center">
                                You've used all {maxUndoLimit} undo attempt{maxUndoLimit !== 1 ? 's' : ''} on your {currentTier || 'Free'} plan. Upgrade to get more undos: Bronze (6), Gold (8), Platinum (12).
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowVIPModal(false)}
                                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 font-medium [font-family:'Poppins',Helvetica] text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleVIPUpgrade}
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium [font-family:'Poppins',Helvetica] text-sm"
                                >
                                    Upgrade Plan
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Loop Notification */}
                {showLoopNotification && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 max-w-sm mx-4 border border-purple-400 shadow-2xl animate-pulse">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                                    <span className="text-3xl">🔄</span>
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Great! You've seen all games!</h3>
                                <p className="text-white/90 mb-4 text-sm">
                                    Now you can continue swiping to see games again in a loop. Keep exploring! 🎮
                                </p>
                                <div className="w-full bg-white/20 rounded-full h-2">
                                    <div className="bg-white h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* Last Card Modal */}
                {showLastCardModal && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-black rounded-lg p-6 max-w-sm mx-4 border border-gray-600">
                            <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                                    <span className="text-2xl">🎮</span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-2">Last Game!</h3>
                                <p className="text-gray-300 mb-6 text-sm">
                                    This is your last game recommendation. Swipe right to explore it or use the close button to finish.
                                </p>
                                <div className="flex flex-col gap-3">
                                    <button
                                        onClick={handleGotIt}
                                        className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 font-medium [font-family:'Poppins',Helvetica] text-sm"
                                    >
                                        Got it! Show me the last card
                                    </button>

                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        </main>
    );
};

export default GameCard;
