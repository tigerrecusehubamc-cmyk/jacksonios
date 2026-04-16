
"use client";
import React, { useEffect, useState, Suspense, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter, useSearchParams } from "next/navigation";

// Component imports
import { DailyChallenge } from "./dailychallange";
import { ActionButtonSection } from "./components/ActionButtonSection";
import { InstructionsTextSection } from "./components/InstructionsTextSection";
import { LevelsSection } from "./components/LevelsSection";
import { Coin } from "./components/coin";
import { Breakdown } from "./components/Breakdown";
import { HomeIndicator } from "@/components/HomeIndicator";
import { SessionStatus } from "./components/SessionStatus";
import { LoadingOverlay } from "@/components/AndroidOptimizedLoader";
import { normalizeGameImages, normalizeGameTitle, normalizeGameDescription, normalizeGameGoals, normalizeGameUrl, normalizeGameAmount, getSdkProvider, getTotalPromisedPoints } from "@/lib/gameDataNormalizer";

// Optimized Image Component for Android - using normalizer for both besitos and bitlab
const OptimizedGameImage = ({ game, isLoaded, onLoad, onError, className }) => {
    // Use normalizer to get images for both besitos and bitlab
    const images = normalizeGameImages(game);
    const provider = getSdkProvider(game);
    const imageUrl = images.large_image || images.banner || images.square_image || images.icon ||
        game?.images?.large_image || game?.large_image || game?.image || game?.square_image || game?.images?.banner;

    const displayTitle = normalizeGameTitle(game);

    if (!imageUrl) return null;

    return (
        <img
            className={`w-full max-w-[335px] object-contain rounded-lg transition-opacity duration-300 game-image image-fade-in ${className || ''}`}
            alt={`${displayTitle} banner`}
            src={imageUrl}
            onLoad={onLoad}
            onError={onError}
            style={{
                opacity: isLoaded ? 1 : 0,
                maxHeight: 'none',
                height: 'auto'
            }}
            loading="eager" // Load immediately for better UX
            decoding="async" // Decode asynchronously for better performance
        />
    );
};

import { useAuth } from "@/contexts/AuthContext";

// Utility imports
import { handleGameDownload, getUserId } from "@/lib/gameDownloadUtils";
import sessionManager from "@/lib/sessionManager";
import { transferGameEarnings, getBatchStatus } from "@/lib/api";
import { fetchGameById, fetchUserData } from "@/lib/redux/slice/gameSlice";
import { fetchWalletTransactions, fetchFullWalletTransactions } from "@/lib/redux/slice/walletTransactionsSlice";
import { onGameDownload } from "@/lib/adjustService";
import { incrementAndGet } from "@/lib/adjustCounters";

/**
 * Game Details Page - Main content component
 * Displays comprehensive game information, progress tracking, and reward management
 */
function GameDetailsContent() {
    // Authentication
    const { token } = useAuth();
    const userId = getUserId();

    // Navigation and routing
    const router = useRouter();
    const dispatch = useDispatch();
    const searchParams = useSearchParams();
    const gameId = searchParams.get('gameId') || searchParams.get('id');

    // Redux state management
    const {
        offers,
        offersStatus,
        currentGameDetails,
        gameDetailsStatus,
        inProgressGames,
        userData,
        userDataStatus
    } = useSelector((state) => state.games);

    // Component state
    const [selectedGame, setSelectedGame] = useState(null);
    const [loadedFromLocalStorage, setLoadedFromLocalStorage] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true); // Track initial loading state

    // Capitalize tier name (junior -> Junior, senior -> Senior, mid -> Mid)
    const capitalizeTier = (tier) => {
        if (!tier) return 'Junior';
        return tier.charAt(0).toUpperCase() + tier.slice(1);
    };

    // Initialize selectedTier - will be updated when displayGame or userData is available
    const [selectedTier, setSelectedTier] = useState('Junior');
    const [isGameInstalled, setIsGameInstalled] = useState(false);
    const [sessionData, setSessionData] = useState({
        sessionCoins: 0,
        sessionXP: 0,
        isClaimed: false,
        isGameDownloaded: false,
        isMilestoneReached: false, // Track actual milestone status
        completedTasksCount: 0, // Track number of completed unlocked tasks for progression rules
        taskProgression: null // Task progression rules from backend
    });
    const [currentSession, setCurrentSession] = useState(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [claimedBatches, setClaimedBatches] = useState([]);

    // Scroll to top when navigating to game details page
    useEffect(() => {
        // Scroll to top on mount and when gameId changes
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
        // Also try scrolling the document element for better compatibility
        if (document.documentElement) {
            document.documentElement.scrollTop = 0;
        }
        if (document.body) {
            document.body.scrollTop = 0;
        }
    }, [gameId]);

    // Determine if user navigated from "Games" screen (My Games/downloaded list)
    // Games screen does NOT send a "source" query param, while other flows (swipe, mostPlayed, etc.) do.
    const source = searchParams.get('source');
    const isFromGamesScreen = !source && loadedFromLocalStorage;


    // Load game data - handle both downloaded games (localStorage) and API games
    useEffect(() => {
        const loadGameData = async () => {
            // Priority 1: Check localStorage for downloaded games (from "My Games" section)
            const storedGameData = localStorage.getItem('selectedGameData');
            if (storedGameData) {
                try {
                    const parsedGame = JSON.parse(storedGameData);

                    setSelectedGame(parsedGame);
                    setLoadedFromLocalStorage(true);
                    setIsDataLoaded(true);
                    setIsInitialLoading(false); // Stop initial loading
                    await initializeSession(parsedGame);

                    // Ensure userData is loaded for userXpTier (for downloaded games)
                    // userData contains userXpTier from getUserData API
                    if (!userData || userDataStatus === 'idle') {
                        const userId = getUserId();
                        const token = localStorage.getItem('authToken');
                        if (userId && token) {
                            dispatch(fetchUserData({ userId, token }));
                        }
                    }

                    // Clean up localStorage after loading
                    localStorage.removeItem('selectedGameData');
                    return;
                } catch (error) {
                    localStorage.removeItem('selectedGameData');
                }
            }

            // Priority 2: Fetch from API if no localStorage data
            // Uses stale-while-revalidate: shows cached data immediately, fetches fresh if needed
            if (gameId && !loadedFromLocalStorage) {
                // Don't clear Redux state - stale-while-revalidate will handle cache
                // This ensures cached data shows immediately if available
                dispatch(fetchGameById({ gameId }));
            } else if (!gameId) {
                // No gameId provided, stop loading
                setIsInitialLoading(false);
            }
        };

        loadGameData();
    }, [dispatch, gameId]);

    // Refresh game details in background after showing cached data (to get admin updates)
    // Do this in background without blocking UI - show cached data immediately
    useEffect(() => {
        if (!gameId || loadedFromLocalStorage) return;

        // Use setTimeout to refresh in background after showing cached data
        // This ensures smooth UX - cached data shows immediately, fresh data loads in background
        const refreshTimer = setTimeout(() => {
            dispatch(fetchGameById({ gameId, force: true, background: true }));
        }, 100); // Small delay to let cached data render first

        return () => clearTimeout(refreshTimer);
    }, [dispatch, gameId, loadedFromLocalStorage]);

    // Refresh game details in background when app comes to foreground (admin might have updated)
    useEffect(() => {
        if (!gameId || loadedFromLocalStorage) return;

        const handleFocus = () => {
            dispatch(fetchGameById({ gameId, force: true, background: true }));
        };

        window.addEventListener("focus", handleFocus);

        const handleVisibilityChange = () => {
            if (!document.hidden && gameId && !loadedFromLocalStorage) {
                dispatch(fetchGameById({ gameId, force: true, background: true }));
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [dispatch, gameId, loadedFromLocalStorage]);

    // Handle game details from new API
    useEffect(() => {
        if (currentGameDetails && gameDetailsStatus === 'succeeded') {
            // Get the fetched game ID (check multiple possible fields including nested gameDetails)
            const fetchedGameId = currentGameDetails.id || currentGameDetails._id || currentGameDetails.gameId || currentGameDetails.gameDetails?.id;
            // Check if the fetched game matches the requested gameId
            // Check all possible ID fields: _id, id, gameId, and nested gameDetails.id
            const isCorrectGame = gameId && (
                fetchedGameId === gameId ||
                fetchedGameId?.toString() === gameId?.toString() ||
                currentGameDetails.gameId === gameId ||
                currentGameDetails.gameId?.toString() === gameId?.toString() ||
                currentGameDetails._id === gameId ||
                currentGameDetails._id?.toString() === gameId?.toString() ||
                currentGameDetails.gameDetails?.id === gameId ||
                currentGameDetails.gameDetails?.id?.toString() === gameId?.toString()
            );

            // If we already loaded from localStorage, don't overwrite to avoid flicker/race
            // Only set game if we haven't loaded from localStorage AND we don't have a selected game yet
            // Trust the API response if it succeeded - the API should return the correct game
            // Only check gameId match if gameId is provided, otherwise trust the API
            if (!loadedFromLocalStorage && !selectedGame) {
                setSelectedGame(currentGameDetails);
                setIsDataLoaded(true);
                setIsInitialLoading(false); // Stop initial loading
                initializeSession(currentGameDetails);
            }
        } else if (gameDetailsStatus === 'failed') {
            setIsInitialLoading(false); // Stop loading on error
        } else if (gameDetailsStatus === 'loading') {
            // Loading state
        } else if (gameDetailsStatus === 'succeeded' && !currentGameDetails) {
            // API succeeded but no game data - this shouldn't happen, but clear loading anyway
            setIsInitialLoading(false);
        }
    }, [currentGameDetails, gameDetailsStatus, gameId, loadedFromLocalStorage, selectedGame]);

    // Use fresh API data (Redux state cleared before navigation)
    // Normalize game data by merging gameDetails into root level for easier access
    const rawGame = selectedGame || currentGameDetails;

    const displayGame = useMemo(() => {
        if (!rawGame) return null;

        // Use normalizer to get correct values for both besitos and bitlab

        // Use besitosRawData if available; else use rawGame (e.g. BitLabs offer from localStorage)
        const rawData = rawGame.besitosRawData || rawGame;
        const provider = getSdkProvider(rawGame);

        // Get normalized values using the normalizer (handles both besitos and bitlab)
        const normalizedImages = normalizeGameImages(rawGame);
        const normalizedTitle = normalizeGameTitle(rawGame);
        const normalizedDescription = normalizeGameDescription(rawGame);
        const normalizedGoals = normalizeGameGoals(rawGame);
        const normalizedUrl = normalizeGameUrl(rawGame);
        const normalizedAmount = normalizeGameAmount(rawGame);

        // Get category - handle bitlab categories differently
        const normalizedCategory = (() => {
            if (provider === 'bitlab') {
                // Bitlab: categories is an array of strings or objects with id and name
                const categories = rawData.categories || [];
                if (categories.length > 0) {
                    const first = categories[0];
                    return typeof first === 'string' ? first : (first?.name || first);
                }
            }
            // Besitos: categories array of objects with name property
            return rawData.categories?.[0]?.name || rawGame.gameDetails?.category || rawGame.category || rawGame.metadata?.genre || 'Game';
        })();

        // Total coins/XP for BitLab = sum of all promised_points; for Besitos use existing logic
        const totalPromised = getTotalPromisedPoints(rawGame);

        // If game has nested gameDetails, merge it with root properties
        // Priority: normalized values > besitosRawData > gameDetails > root properties
        if (rawGame.gameDetails || rawData.id || rawData.title) {
            const normalized = {
                ...rawGame,
                ...rawGame.gameDetails,
                // Use normalized values first (highest priority - handles both besitos and bitlab)
                // Keep root-level properties that might be important
                _id: rawGame._id,
                gameId: rawGame.gameId || rawData.id || rawGame.gameDetails?.id,
                title: normalizedTitle,
                // Use normalized goals (handles bitlab events -> goals conversion)
                goals: normalizedGoals,
                points: rawData.points || rawGame.gameDetails?.points || rawGame.points,
                // Use normalized images (handles bitlab creatives/images structure)
                image: normalizedImages.icon || normalizedImages.square_image || rawGame.gameDetails?.image || rawGame.image,
                square_image: normalizedImages.square_image || rawGame.gameDetails?.square_image || rawGame.square_image,
                large_image: normalizedImages.large_image || rawGame.gameDetails?.large_image || rawGame.large_image,
                banner: normalizedImages.banner,
                // Use normalized amount (handles bitlab payout summation)
                amount: normalizedAmount || rawGame.gameDetails?.amount || rawGame.amount,
                cpi: rawData.cpi || rawGame.gameDetails?.cpi || rawGame.cpi,
                // Use normalized category
                category: normalizedCategory,
                // Keep rewards from root level (they're already there)
                rewards: rawGame.rewards || rawGame.gameDetails?.rewards,
                // Keep xpRewardConfig for XP calculation
                xpRewardConfig: rawGame.xpRewardConfig || { baseXP: 1, multiplier: 1 },
                // Keep besitosRawData for full access
                besitosRawData: rawGame.besitosRawData || rawData,
                // Keep gameDetails for backward compatibility
                gameDetails: rawGame.gameDetails,
                // Use normalized description
                description: normalizedDescription,
                // Use normalized URL (handles bitlab clickUrl/click_url/deepLink)
                url: normalizedUrl || rawGame.gameDetails?.downloadUrl,
                // Keep bundle_id from besitosRawData
                bundle_id: rawData.bundle_id || rawGame.bundle_id,
                // Keep taskProgression and userXpTier
                taskProgression: rawGame.taskProgression || null,
                userXpTier: rawGame.userXpTier || null,
                // Store sdkProvider for easy access
                sdkProvider: provider,
                totalPromisedCoins: totalPromised.totalCoins,
                totalPromisedXP: totalPromised.totalXP
            };

            return normalized;
        }

        // If no gameDetails, still use normalized values
        if (rawData.id || rawData.title) {
            return {
                ...rawGame,
                // Use normalized values
                title: normalizedTitle,
                image: normalizedImages.icon || normalizedImages.square_image || rawGame.image,
                square_image: normalizedImages.square_image || rawGame.square_image,
                large_image: normalizedImages.large_image || rawGame.large_image,
                banner: normalizedImages.banner,
                amount: normalizedAmount || rawGame.amount,
                description: normalizedDescription,
                goals: normalizedGoals,
                points: rawData.points || rawGame.points,
                category: normalizedCategory,
                url: normalizedUrl || rawGame.url,
                bundle_id: rawData.bundle_id || rawGame.bundle_id,
                // Keep rewards and xpRewardConfig
                rewards: rawGame.rewards,
                xpRewardConfig: rawGame.xpRewardConfig || { baseXP: 1, multiplier: 1 },
                // Keep taskProgression and userXpTier
                taskProgression: rawGame.taskProgression || null,
                userXpTier: rawGame.userXpTier || null,
                besitosRawData: rawGame.besitosRawData || rawData,
                sdkProvider: provider,
                totalPromisedCoins: totalPromised.totalCoins,
                totalPromisedXP: totalPromised.totalXP
            };
        }

        return { ...rawGame, totalPromisedCoins: totalPromised.totalCoins, totalPromisedXP: totalPromised.totalXP };
    }, [rawGame]);

    // Update selectedTier based on userXpTier from displayGame or userData
    // Priority: displayGame.userXpTier (from game discovery API) > userData.userXpTier (from getUserData API)
    useEffect(() => {
        const tier = displayGame?.userXpTier || userData?.userXpTier || null;
        if (tier) {
            const capitalizedTier = capitalizeTier(tier);
            setSelectedTier(capitalizedTier);
        }
    }, [displayGame?.userXpTier, userData?.userXpTier]);

    // Preload game image to prevent delay - use normalizer for both besitos and bitlab
    useEffect(() => {
        if (displayGame) {
            // Use normalizer to get images for both besitos and bitlab
            const images = normalizeGameImages(displayGame);
            const imageUrl = images.large_image || images.banner || images.square_image || images.icon ||
                displayGame.images?.large_image || displayGame.large_image || displayGame.image ||
                displayGame.square_image || displayGame.images?.banner;
            if (imageUrl) {
                setIsImageLoaded(false);
                setImageError(false);

                const img = new Image();
                img.onload = () => {
                    setIsImageLoaded(true);
                };
                img.onerror = () => {
                    setImageError(true);
                    setIsImageLoaded(false);
                };
                img.src = imageUrl;
            }
        }
    }, [displayGame]);

    // Initialize session for the game
    const initializeSession = async (game) => {
        if (!game || (!game.id && !game._id)) return;

        try {
            // Get user ID
            const getUserId = () => {
                try {
                    const userData = localStorage.getItem('user');
                    if (userData) {
                        const user = JSON.parse(userData);
                        return user._id || user.id;
                    }
                } catch (error) {
                    // Error getting user ID
                }
                return null;
            };

            const userId = getUserId();
            if (!userId) {
                return;
            }

            // Use the correct game ID (either id or _id from new API)
            const gameIdForSession = game.id || game._id;

            // Check for existing active session
            const existingSession = sessionManager.getActiveSessionForGame(gameIdForSession, userId);
            if (existingSession) {
                setCurrentSession(existingSession);

                // Validate existing session
                const isValid = await sessionManager.validateSession(existingSession.id);
                if (!isValid) {
                    const newSessionId = sessionManager.createSession(gameIdForSession, userId, game);
                    const newSession = sessionManager.getSession(newSessionId);
                    setCurrentSession(newSession);
                }
            } else {
                // Create new session
                const rawData = game?.besitosRawData || {};
                const sessionId = sessionManager.createSession(gameIdForSession, userId, game);
                const session = sessionManager.getSession(sessionId);
                setCurrentSession(session);
            }
        } catch (error) {
            // Error initializing session
        }
    };


    // Refresh user data when page regains focus (after user downloads game).
    // Stale check: only refetch if last fetch was more than 2 minutes ago to prevent
    // multiple simultaneous calls that freeze the Android WebView.
    useEffect(() => {
        const STALE_MS = 2 * 60 * 1000;
        const handleVisibilityChange = () => {
            if (document.hidden) return;
            const userId = getUserId();
            const token = localStorage.getItem('authToken');
            if (!userId || !token) return;
            const lastFetch = localStorage.getItem(`userData_lastFetch_${userId}`);
            const isStale = !lastFetch || Date.now() - parseInt(lastFetch, 10) > STALE_MS;
            if (!isStale) return;
            localStorage.setItem(`userData_lastFetch_${userId}`, String(Date.now()));
            dispatch(fetchUserData({ userId, token, force: true, background: true }));
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [dispatch]);

    // Check game installation status - Check if game is in downloaded games list
    useEffect(() => {
        if (!displayGame) {
            setIsGameInstalled(false);
            return;
        }

        // Get the current game ID (handle both id and _id formats)
        const currentGameId = displayGame.id || displayGame._id;

        if (!currentGameId) {
            setIsGameInstalled(false);
            return;
        }

        // Check if the game is in the inProgressGames (downloaded games) array
        const isDownloaded = inProgressGames && inProgressGames.some(game => {
            const gameId = game.id || game._id;
            return gameId === currentGameId || gameId?.toString() === currentGameId?.toString();
        });

        setIsGameInstalled(isDownloaded || false);
    }, [displayGame, inProgressGames]);

    // Fetch batch status when game is loaded
    useEffect(() => {
        const fetchBatchStatus = async () => {
            if (!displayGame?.id || !userId) return;

            try {
                const response = await getBatchStatus(displayGame.id, token); // Pass token for authenticated request
                if (response.success && response.data) {
                    setClaimedBatches(response.data.claimedBatches || []);
                }
            } catch (error) {
                console.error('Failed to fetch batch status:', error);
                // Don't set error state - user can still use the app
            }
        };

        fetchBatchStatus();
    }, [displayGame?.id, userId, token]);

    // Event handlers
    const handleBack = () => router.back();

    const handleGameAction = async () => {
        if (displayGame || selectedGame) {
            // Use displayGame (which has besitosRawData merged) or selectedGame
            const gameToDownload = displayGame || selectedGame;
            try {
                // Use normalizer to get correct URL for both besitos and bitlab
                const downloadUrl = normalizeGameUrl(gameToDownload) || gameToDownload?.url || gameToDownload?.details?.downloadUrl;
                const gameWithUrl = downloadUrl ? { ...gameToDownload, url: downloadUrl } : gameToDownload;

                await handleGameDownload(gameWithUrl);

                // Track game download milestone (Adjust) — counter seeded from server at login
                try { onGameDownload(incrementAndGet("gameDownload")); } catch { /* never block download flow */ }

                // Refresh downloaded games list after a short delay to allow server to update
                // This ensures the button updates to "Start Playing" after download
                setTimeout(() => {
                    const userId = getUserId();
                    const token = localStorage.getItem('authToken');
                    if (userId && token) {
                        dispatch(fetchUserData({ userId, token }));
                    }
                }, 2000); // Wait 2 seconds for server to process download
            } catch (error) {
                // Game action failed
            }
        }
    };

    const handleTierChange = (tier) => setSelectedTier(tier);

    const handleSessionUpdate = (data) => {
        setSessionData(data);

        // Update session manager with new data
        if (currentSession) {
            sessionManager.updateSessionActivity(currentSession.id, {
                sessionCoins: data.sessionCoins,
                sessionXP: data.sessionXP,
                type: 'progress_update'
            });
        }
    };

    const handleDailyChallenge = () => {
        router.push(`/gamedetails/dailychallange?gameId=${gameId}`);
    };

    // Handle reward claiming with session lock
    // Accepts optional coins/XP to claim specific amounts (for progressive group claims)
    const handleClaimRewards = async (claimData = {}) => {
        // If no session exists, try to create one before claiming
        let sessionToUse = currentSession;
        if (!sessionToUse) {
            try {
                // Get user ID
                const getUserId = () => {
                    try {
                        const userData = localStorage.getItem('user');
                        if (userData) {
                            const user = JSON.parse(userData);
                            return user._id || user.id;
                        }
                    } catch (error) {
                        // Error getting user ID
                    }
                    return null;
                };

                const userId = getUserId();
                const gameIdForSession = displayGame?.id || displayGame?._id;

                if (userId && gameIdForSession) {
                    // Try to get existing session first
                    const existingSession = sessionManager.getActiveSessionForGame(gameIdForSession, userId);
                    if (existingSession) {
                        sessionToUse = existingSession;
                        setCurrentSession(existingSession);
                    } else {
                        // Create new session if none exists
                        await initializeSession(displayGame);
                        // Wait a bit for session to be set
                        await new Promise(resolve => setTimeout(resolve, 200));
                        // Try to get the session again after initialization
                        const newSession = sessionManager.getActiveSessionForGame(gameIdForSession, userId);
                        if (newSession) {
                            sessionToUse = newSession;
                            setCurrentSession(newSession);
                        } else {
                            throw new Error('No active session found. Please refresh the page.');
                        }
                    }
                } else {
                    throw new Error('No active session found. Please refresh the page.');
                }
            } catch (error) {
                throw error;
            }
        }

        if (!sessionToUse) {
            throw new Error('No active session found. Please refresh the page.');
        }

        // Use provided coins/XP if available, otherwise use session totals
        const coinsToClaim = claimData.coins !== undefined ? claimData.coins : sessionData.sessionCoins;
        const xpToClaim = claimData.xp !== undefined ? claimData.xp : sessionData.sessionXP;

        try {
            // Get token for API call
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error('User not authenticated');
            }

            const gameTitle = displayGame?.besitosRawData?.title || displayGame?.title || 'Unknown Game';
            const gameId = displayGame?.id || displayGame?._id || displayGame?.gameId;

            // Call transferGameEarnings API with batch fields (backend now handles session state)
            const transferResult = await transferGameEarnings({
                gameId: gameId,
                coins: coinsToClaim,
                xp: xpToClaim,
                reason: `Game session completion - ${gameTitle}${claimData.groups ? ` - ${claimData.groups} batch${claimData.groups > 1 ? 'es' : ''} claimed` : ''}`,
                // Batch fields for backend integration
                batchNumber: claimData.batchNumber,  // Starting batch number (1-indexed)
                batchesClaimed: claimData.groups || 1,  // Number of batches being claimed
                gameTitle: gameTitle
            }, token);

            if (transferResult.success === false) {
                throw new Error(transferResult.error || 'Failed to transfer earnings');
            }

            // Note: Backend now handles session state tracking via batch claims
            // No need for separate claimSessionRewards call

            // Update local state - only mark as fully claimed if claiming all rewards
            // Otherwise, keep session active for remaining rewards
            const isFullyClaimed = claimData.coins === undefined || coinsToClaim >= sessionData.sessionCoins;

            // Adjust: track game earnings (no per-batch event — download events tracked separately)
            // Game download milestone events are fired from the download button handler
            setSessionData(prev => ({
                ...prev,
                isClaimed: isFullyClaimed,
                // Update session totals if claiming partial amounts
                sessionCoins: isFullyClaimed ? prev.sessionCoins : Math.max(0, prev.sessionCoins - coinsToClaim),
                sessionXP: isFullyClaimed ? prev.sessionXP : Math.max(0, prev.sessionXP - xpToClaim)
            }));

            // End the session only if fully claimed
            if (isFullyClaimed) {
                sessionManager.endSession(sessionToUse.id, 'claimed', {
                    coins: coinsToClaim,
                    xp: xpToClaim,
                    isClaimed: true
                });
            }

            // Refresh transaction history immediately after reward claim
            try {
                const token = localStorage.getItem('authToken');
                if (token) {
                    await Promise.all([
                        dispatch(fetchWalletTransactions({ token, limit: 5 })),
                        dispatch(fetchFullWalletTransactions({ token, page: 1, limit: 20, type: "all" }))
                    ]);
                }
            } catch (transactionError) {
                // Don't throw error - reward was still claimed successfully
            }

            // Refresh batch status to update claimedBatches and unlock next tasks
            try {
                if (displayGame?.id) {
                    const batchStatusResponse = await getBatchStatus(displayGame.id, token);
                    if (batchStatusResponse.success && batchStatusResponse.data) {
                        setClaimedBatches(batchStatusResponse.data.claimedBatches || []);
                    }
                }
            } catch (batchError) {
                // Don't throw error - reward was still claimed successfully
                console.error('Failed to refresh batch status:', batchError);
            }

            // Refresh game data to force re-render of levels
            if (gameId) {
                dispatch(fetchGameById({ gameId, force: true }));
            }

            // Show success message
            alert(`✅ Rewards claimed!\n💰 $${coinsToClaim.toFixed(2)} Coins\n⭐ ${xpToClaim} XP${isFullyClaimed ? '\n\nSession ended successfully.' : '\n\nYou can continue earning more rewards!'}`);
        } catch (error) {
            throw error;
        }
    };

    // Show skeleton loader for initial loading or when API is loading
    const hasGameData = !!displayGame;
    const hasLocalStorageData = loadedFromLocalStorage || (typeof window !== 'undefined' && !!localStorage.getItem('selectedGameData'));
    const isLoading = isInitialLoading || (gameId && !hasGameData && !hasLocalStorageData && (gameDetailsStatus === 'loading' || gameDetailsStatus === 'idle'));

    if (isLoading) {
        return (
            <div className="flex flex-col overflow-x-hidden overflow-y-auto w-full min-h-screen items-center justify-start px-4 pb-3 pt-1 bg-black max-w-[390px] mx-auto loading-container android-optimized">
                {/* App Version */}
                <div className="w-full max-w-[375px] px-3  mb-3 ml-2 pt-2">
                    <div className="[font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3">
                        App Version: {process.env.NEXT_PUBLIC_APP_VERSION || "V0.1.0"}
                    </div>
                </div>

                {/* Header Skeleton */}
                <div className="flex w-[375px] items-center gap-6 px-4 py-4 relative">
                    <div
                        className="w-6 h-6 bg-gray-800 rounded-full animate-pulse"
                        style={{
                            animation: 'pulse 1.5s ease-in-out infinite',
                            transform: 'translateZ(0)',
                            willChange: 'opacity'
                        }}
                    />
                    <div
                        className="flex-1 h-6 bg-gray-800 rounded animate-pulse"
                        style={{
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: '0.2s',
                            transform: 'translateZ(0)',
                            willChange: 'opacity'
                        }}
                    />
                </div>

                {/* Game Image Skeleton */}
                <div className="flex w-[375px] items-center justify-center px-4 relative mt-4">
                    <div
                        className="w-[335px] h-[164px] bg-gray-800 rounded-lg animate-pulse"
                        style={{
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: '0.4s',
                            transform: 'translateZ(0)',
                            willChange: 'opacity'
                        }}
                    />
                </div>

                {/* Game Info Skeleton */}
                <div className="w-full max-w-[375px] mt-6 space-y-3">
                    <div
                        className="h-8 bg-gray-800 rounded animate-pulse w-3/4"
                        style={{
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: '0.6s',
                            transform: 'translateZ(0)',
                            willChange: 'opacity'
                        }}
                    />
                    <div
                        className="h-4 bg-gray-800 rounded animate-pulse w-1/2"
                        style={{
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: '0.8s',
                            transform: 'translateZ(0)',
                            willChange: 'opacity'
                        }}
                    />
                    <div className="flex gap-2 mt-4">
                        <div
                            className="h-10 bg-gray-800 rounded animate-pulse w-24"
                            style={{
                                animation: 'pulse 1.5s ease-in-out infinite',
                                animationDelay: '1.0s',
                                transform: 'translateZ(0)',
                                willChange: 'opacity'
                            }}
                        />
                        <div
                            className="h-10 bg-gray-800 rounded animate-pulse w-24"
                            style={{
                                animation: 'pulse 1.5s ease-in-out infinite',
                                animationDelay: '1.2s',
                                transform: 'translateZ(0)',
                                willChange: 'opacity'
                            }}
                        />
                    </div>
                </div>

                {/* Reward Summary Skeleton */}
                <div className="flex w-[280px] items-center justify-center relative mt-6">
                    <div
                        className="flex flex-row items-center justify-center gap-2 bg-gray-800 rounded-[10px] py-2 w-full h-12 animate-pulse"
                        style={{
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: '1.4s',
                            transform: 'translateZ(0)',
                            willChange: 'opacity'
                        }}
                    />
                </div>

                {/* Description Skeleton */}
                <div className="w-full max-w-[375px] mt-6 space-y-2">
                    <div
                        className="h-4 bg-gray-800 rounded animate-pulse w-full"
                        style={{
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: '1.6s',
                            transform: 'translateZ(0)',
                            willChange: 'opacity'
                        }}
                    />
                    <div
                        className="h-4 bg-gray-800 rounded animate-pulse w-5/6"
                        style={{
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: '1.8s',
                            transform: 'translateZ(0)',
                            willChange: 'opacity'
                        }}
                    />
                    <div
                        className="h-4 bg-gray-800 rounded animate-pulse w-4/6"
                        style={{
                            animation: 'pulse 1.5s ease-in-out infinite',
                            animationDelay: '2.0s',
                            transform: 'translateZ(0)',
                            willChange: 'opacity'
                        }}
                    />
                </div>

                {/* Loading indicator */}

            </div>
        );
    }

    // Error state - game not found
    if (!displayGame) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-black animate-fade-in">
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                    <h2 className="text-white text-xl font-semibold mb-2">Game not found</h2>
                    <p className="text-gray-400 text-sm mb-2">Game ID: {gameId || 'No ID provided'}</p>
                    <p className="text-gray-400 text-sm">Status: {gameDetailsStatus || 'Unknown'}</p>
                </div>
                <button
                    onClick={handleBack}
                    className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                    Go Back
                </button>
            </div>
        );
    }

    return (
        <LoadingOverlay
            isLoading={!isDataLoaded && !isInitialLoading}
            message="Loading game details..."
            className="w-full h-full"
        >
            <div
                className="flex flex-col overflow-x-hidden overflow-y-auto w-full min-h-screen items-center justify-start px-4 pb-2 pt-1 bg-black max-w-[390px] mx-auto transition-all duration-300 ease-in-out animate-fade-in android-optimized"
            >
                {/* App Version */}
                <div className="w-full max-w-[375px] px-3 ml-2 mb-3 pt-2">
                    <div className="[font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3">
                        App Version: {process.env.NEXT_PUBLIC_APP_VERSION || "V0.1.0"}
                    </div>
                </div>

                {/* Header */}
                <div className="flex w-[375px] items-center gap-6  px-2 py-4 relative ">
                    <button
                        onClick={handleBack}
                        className="flex  justify-center items-center w-8 h-8 rounded-full transition-colors hover:bg-gray-800"
                    >
                        <svg className="w-6 h-6 mt-[3px] text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex items-center flex-1 min-w-0">
                        <h1 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[18px] tracking-[0] leading-[normal] line-clamp-2 break-words">
                            {(displayGame?.title || 'Game Details').split(' - ')[0]
                                .split(':')[0]}
                        </h1>
                    </div>

                    <div className="w-8 h-8" /> {/* Spacer for centering */}
                </div>

                {/* Game Banner */}
                {(displayGame?.large_image || displayGame?.images?.large_image || displayGame?.square_image || displayGame?.image || displayGame?.images?.banner) && (
                    <div className="flex w-[375px] items-center justify-center px-4 relative">
                        {/* Image Skeleton - Show while loading */}
                        {!isImageLoaded && !imageError && (
                            <div
                                className="w-full max-w-[335px] min-h-[200px] bg-gray-800 rounded-lg animate-pulse shadow-[100px] shadow-blue"
                                style={{
                                    animation: 'pulse 1.5s ease-in-out infinite',
                                    transform: 'translateZ(0)',
                                    willChange: 'opacity'
                                }}
                            />
                        )}

                        {/* Actual Image - Show when loaded */}
                        {!imageError && (
                            <OptimizedGameImage
                                game={displayGame}
                                isLoaded={isImageLoaded}
                                onLoad={() => setIsImageLoaded(true)}
                                onError={() => setImageError(true)}
                                // We pass the shadow classes as a prop
                                className="shadow-[0_14px_50px_-2px_rgba(113,106,231,0.5)]"
                            />
                        )}

                        {/* Error State - Show if image fails to load */}
                        {imageError && (
                            <div className="w-[335px] h-[200px] bg-gray-800 rounded-lg flex items-center justify-center shadow-lg shadow-white/30">
                                <div className="text-center">
                                    <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-gray-500 text-sm">Image unavailable</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Game Info */}
                <div className="flex flex-col w-[375px] items-start justify-center mt-6 px-6 py-2 relative">
                    <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[18px] leading-[1.3] line-clamp-2 break-words w-full">
                        {(displayGame?.title || displayGame?.name || displayGame?.details?.name || 'Game Title')
                            .split(' - ')[0]
                            .split(':')[0]}
                    </h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="[font-family:'Poppins',Helvetica] font-regular text-[#f4f3fc] text-[13px]">
                            {displayGame?.category || displayGame?.details?.category || 'Casual'}
                        </span>
                        {displayGame?.userXpTier && (
                            <>
                                <span className="text-[#f4f3fc] text-[13px]">•</span>
                                <span className="[font-family:'Poppins',Helvetica] font-medium text-[#A4A4A4] text-[13px] capitalize">
                                    {displayGame.userXpTier} Tier
                                </span>
                            </>
                        )}
                    </div>
                    <div className="flex w-full items-center justify-center mt-3 relative">
                        <div className="flex flex-row items-center justify-center gap-1.5 bg-[linear-gradient(180deg,rgba(158,173,247,0.6)_0%,rgba(113,106,231,0.6)_100%)] rounded-[10px] py-1.5 px-2.5 w-full">
                            <span className="[font-family:'Poppins',Helvetica] font-medium text-white text-[14px] flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <span className="whitespace-nowrap text-[14px] font-medium">Earn up to</span>
                                <span className="flex items-center gap-0.5 whitespace-nowrap">
                                    <span className="font-semibold text-[14px] whitespace-nowrap">
                                        {(() => {
                                            const n = displayGame?.totalPromisedCoins ?? displayGame?.rewards?.coins ?? displayGame?.rewards?.gold ?? displayGame?.besitosRawData?.amount ?? displayGame?.amount ?? 0;
                                            const num = Number(n);
                                            return Number.isFinite(num) ? (num === Math.round(num) ? String(Math.round(num)) : num.toFixed(2)) : '0';
                                        })()}
                                    </span>
                                    <img
                                        className="w-[20px] h-[19px] object-contain flex-shrink-0"
                                        alt="Coin icon"
                                        src="/dollor.png"
                                    />
                                </span>
                                <span className="whitespace-nowrap">and</span>
                                <span className="flex items-center gap-0.5 whitespace-nowrap">
                                    <span className="font-semibold text-[14px] whitespace-nowrap">
                                        {(() => {
                                            const n = displayGame?.totalPromisedXP ?? displayGame?.rewards?.xp ?? 0;
                                            const num = Number(n);
                                            return Number.isFinite(num) ? String(Math.round(num)) : '0';
                                        })()}
                                    </span>
                                    <img
                                        className="w-[19px]  mb-[2px] h-[20px] object-contain flex-shrink-0"
                                        alt="XP icon"
                                        src="/assets/animaapp/ltgoa7L3/img/pic-7.svg"
                                    />
                                </span>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Reward Summary */}

                {/* Main Content Sections */}
                <div className="animate-fade-in">
                    <InstructionsTextSection game={displayGame} />
                </div>

                {/* <div className="animate-fade-in">
                    <ActionButtonSection
                        game={displayGame}
                        isInstalled={isGameInstalled}
                        onGameAction={handleGameAction}
                    />
                </div> */}

                <div className="animate-fade-in">
                    <LevelsSection
                        game={displayGame}
                        selectedTier={selectedTier}
                        onTierChange={handleTierChange}
                        onSessionUpdate={handleSessionUpdate}
                        claimedBatches={claimedBatches}
                        isDownloadedGame={loadedFromLocalStorage}
                    />
                </div>

                <div className="animate-fade-in">
                    <Coin
                        game={displayGame}
                        sessionCoins={sessionData.sessionCoins}
                        sessionXP={sessionData.sessionXP}
                        completedTasksCount={sessionData.completedTasksCount || 0}
                        taskProgression={sessionData.taskProgression}
                        isClaimed={sessionData.isClaimed}
                        isMilestoneReached={sessionData.isMilestoneReached}
                        onClaimRewards={handleClaimRewards}
                    />
                </div>

                <div className="animate-fade-in">
                    <Breakdown
                        game={displayGame}
                        sessionCoins={sessionData.sessionCoins}
                        sessionXP={sessionData.sessionXP}
                    />
                </div>

                <div className="animate-fade-in mb-2">
                    <DailyChallenge
                        game={displayGame}
                        onChallengeClick={handleDailyChallenge}
                    />
                </div>

                {/* Session Status Component */}
                {/* <SessionStatus
                    game={selectedGame}
                    currentSession={currentSession}
                /> */}

                {/* Add bottom padding for fixed ActionButtonSection */}
                <div className="h-20"></div>

            </div>

            {/* Fixed Action Button - Outside scrolling container */}
            <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-black/95 backdrop-blur-sm border-t border-gray-800/50 safe-area-inset-bottom animate-fade-in">
                <ActionButtonSection
                    game={displayGame}
                    isInstalled={isGameInstalled}
                    onGameAction={handleGameAction}
                />
            </div>
        </LoadingOverlay>
    );
}


export default function GameDetailsPage() {
    return (
        <Suspense fallback={
            <div className="w-full min-h-screen bg-black flex justify-center items-center">
                <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-white animate-spin" />
                <p className="text-white text-lg font-medium mt-4">Loading game details...</p>
            </div>
        }>
            <GameDetailsContent />
        </Suspense>
    );
}