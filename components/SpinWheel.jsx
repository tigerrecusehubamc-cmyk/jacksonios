import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { getSpinConfig, getSpinStatus, performSpin, redeemSpinReward } from "@/lib/api";
import { onSpinnerUse } from "@/lib/adjustService";
import { incrementAndGet } from "@/lib/adjustCounters";
import { useDispatch, useSelector } from "react-redux";
import { fetchWalletScreen, fetchWalletTransactions, fetchFullWalletTransactions } from "@/lib/redux/slice/walletTransactionsSlice";
import { fetchProfileStats, fetchUserProfile } from "@/lib/redux/slice/profileSlice";
import { useAppLovinAds } from "@/hooks/useAppLovinAds";
import { Capacitor } from "@capacitor/core";
import MockAdOverlay from "@/app/games/components/MockAdOverlay";

// Dedupe spin config/status requests (e.g. React Strict Mode double-mount, rapid navigation)
const SPIN_DATA_CACHE_MS = 2500;
let cachedSpinDataPromise = null;
let cachedSpinDataTime = 0;

function fetchSpinDataOnce(token, forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && cachedSpinDataPromise && (now - cachedSpinDataTime) < SPIN_DATA_CACHE_MS) {
        return cachedSpinDataPromise;
    }
    if (forceRefresh) cachedSpinDataPromise = null;
    cachedSpinDataPromise = Promise.all([
        getSpinConfig(token),
        getSpinStatus(token),
    ]).then(([configResponse, statusResponse]) => ({ configResponse, statusResponse }));
    cachedSpinDataTime = now;
    cachedSpinDataPromise.then(() => {
        setTimeout(() => { cachedSpinDataPromise = null; }, SPIN_DATA_CACHE_MS);
    });
    return cachedSpinDataPromise;
}

export default function SpinWheel() {
    const { token } = useAuth();
    const dispatch = useDispatch();
    const [isSpinning, setIsSpinning] = useState(false);

    // VIP status from Redux (same pattern as VipBanner)
    const vipStatus = useSelector((state) => state.profile.vipStatus);
    const vipData = useMemo(() => {
        const isVipActive = vipStatus?.data?.isActive && vipStatus?.data?.currentTier && vipStatus?.data?.currentTier !== "Free";
        const currentTier = vipStatus?.data?.currentTier;

        return {
            isVipActive,
            currentTier
        };
    }, [vipStatus]);
    // Start as false (optimistic) — show "PUSH TO SPIN" immediately.
    // API confirms state in background; button corrects silently if needed.
    // This eliminates the "LOADING..." flash for every navigation.
    const [isLoading, setIsLoading] = useState(false);
    const [spins, setSpins] = useState(0);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState("");
    const [coins, setCoins] = useState(0);
    const [pendingReward, setPendingReward] = useState(() => {
        if (typeof window !== 'undefined') {
            return parseInt(localStorage.getItem('spinWheel_pendingReward') || '0');
        }
        return 0;
    });
    const [pendingSpinId, setPendingSpinId] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('spinWheel_pendingSpinId') || null;
        }
        return null;
    });
    const [isAdWatched, setIsAdWatched] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('spinWheel_isAdWatched') === 'true';
        }
        return false;
    });
    const [spinReward, setSpinReward] = useState(null); // Store reward details: { amount, type, coinsEarned, xpEarned }
    const [appVersion] = useState("V0.0.1");
    const [dailySpinsUsed, setDailySpinsUsed] = useState(0);
    const [maxDailySpins, setMaxDailySpins] = useState(5);
    // Optimistic: assume user can spin until API says otherwise
    const [canSpin, setCanSpin] = useState(true);
    // Tracks whether the real spin count has arrived from the API
    const [spinsLoaded, setSpinsLoaded] = useState(false);
    const [spinConfig, setSpinConfig] = useState(null);
    const [spinStatus, setSpinStatus] = useState(null);
    const [error, setError] = useState(null);
    const [cooldownRemaining, setCooldownRemaining] = useState(0); // Cooldown in minutes
    const [isRedeeming, setIsRedeeming] = useState(false);
    const isWeb = !Capacitor.isNativePlatform();
    const [showMockAd, setShowMockAd] = useState(false);

    // Normalize reward type values from backend (various possible values)
    const normalizeRewardType = (type) => {
        if (!type) return 'coins';
        const t = String(type).toLowerCase();
        if (t.includes('xp') || t.includes('exp') || t.includes('experience')) return 'xp';
        if (t.includes('coin') || t.includes('coins') || t.includes('dollar') || t.includes('cash')) return 'coins';
        return t === 'xp' ? 'xp' : 'coins';
    };

    // AppLovin MAX rewarded ads hook (shared with WatchAdCard)
    const {
        isInitialized,
        isLoading: isAdLoading,
        isAdReady,
        isShowingAd,
        error: adError,
        showAd,
        loadAd,
        clearError: clearAdError,
        platformInfo,
    } = useAppLovinAds();

    // Audio ref for sound effects
    const audioRef = useRef(null);

    // Load spin config and status on mount
    useEffect(() => {
        if (token) {
            loadSpinData();
        }
    }, [token]);

    // Handle pending reward ad loading on mount – non-VIP only (VIP never sees ads)
    useEffect(() => {
        if (vipData.isVipActive) return;
        if (token && isInitialized && pendingReward > 0 && pendingSpinId && !isAdReady && !isAdLoading && !isShowingAd) {
            console.log("[SpinWheel] 🔄 Component mounted with pending reward, ensuring ad is loaded");
            const timer = setTimeout(async () => {
                try {
                    await loadAd();
                    console.log("[SpinWheel] ✅ Ad loaded for pending reward on mount");
                } catch (error) {
                    console.log("[SpinWheel] ⚠️ Failed to load ad for pending reward on mount:", error.message);
                }
            }, 1000); // Small delay to ensure everything is initialized

            return () => clearTimeout(timer);
        }
    }, [vipData.isVipActive, token, isInitialized, pendingReward, pendingSpinId, isAdReady, isAdLoading, isShowingAd, loadAd]);

    // Countdown timer for cooldown — ticks every 60 s (minute-based display)
    useEffect(() => {
        if (cooldownRemaining > 0) {
            const interval = setInterval(() => {
                setCooldownRemaining((prev) => {
                    if (prev <= 1) {
                        // Cooldown finished, reload status
                        if (token) {
                            loadSpinData(true);
                        }
                        return 0;
                    }
                    return prev - 1; // Decrement by 1 minute
                });
            }, 60000); // Update every 60 seconds

            return () => clearInterval(interval);
        }
    }, [cooldownRemaining, token]);

    // Sync ad error into local error state
    useEffect(() => {
        if (adError) {
            setError(adError);
        }
    }, [adError]);

    // Log platform info once for debugging native vs web behavior
    useEffect(() => {
        console.log("[SpinWheel] 🧩 Platform debug:", {
            isWeb,
            isNativePlatform: Capacitor.isNativePlatform?.(),
        });
    }, [isWeb]);

    // Handle page visibility changes to fix navigation issues – non-VIP only (VIP never loads ads)
    useEffect(() => {
        if (vipData.isVipActive || !isInitialized || !token) return;

        const handleVisibilityChange = async () => {
            if (!document.hidden && pendingReward > 0 && pendingSpinId && !isAdReady && !isAdLoading && !isShowingAd) {
                console.log("[SpinWheel] 📱 Page became visible, refreshing ad state");
                try {
                    await loadAd();
                } catch (error) {
                    console.log("[SpinWheel] ⚠️ Visibility change refresh failed:", error.message);
                }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [vipData.isVipActive, isInitialized, token, pendingReward, pendingSpinId, isAdReady, isAdLoading, isShowingAd, loadAd]);

    // Persist pending reward state to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('spinWheel_pendingReward', pendingReward.toString());
        }
    }, [pendingReward]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('spinWheel_pendingSpinId', pendingSpinId || '');
        }
    }, [pendingSpinId]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('spinWheel_isAdWatched', isAdWatched.toString());
        }
    }, [isAdWatched]);

    // Sync AppLovin ad showing state with mock overlay on web
    useEffect(() => {
        if (isWeb && isShowingAd) {
            setShowMockAd(true);
        } else if (isWeb && !isShowingAd && showMockAd) {
            setShowMockAd(false);
        }
    }, [isShowingAd, isWeb, showMockAd]);

    // Periodic ad state refresh – non-VIP only (VIP never loads or shows ads)
    useEffect(() => {
        if (vipData.isVipActive || !isInitialized || !token) return;

        const refreshInterval = setInterval(async () => {
            if (pendingReward > 0 && pendingSpinId && !isAdReady && !isAdLoading && !isShowingAd) {
                console.log("[SpinWheel] 🔄 Periodic ad state refresh triggered");
                try {
                    await loadAd();
                } catch (error) {
                    console.log("[SpinWheel] ⚠️ Periodic refresh failed:", error.message);
                }
            }
        }, 5000); // Check every 5 seconds

        return () => clearInterval(refreshInterval);
    }, [vipData.isVipActive, isInitialized, token, pendingReward, pendingSpinId, isAdReady, isAdLoading, isShowingAd, loadAd]);

    const handleMockAdComplete = () => {
        setShowMockAd(false);
    };

    const handleMockAdClose = () => {
        setShowMockAd(false);
        setError("Ad was closed. Please watch the full ad to earn rewards.");
        setTimeout(() => setError(null), 5000);
    };

    const loadSpinData = async (forceRefresh = false) => {
        if (!token) return;

        // Only show the loading state when explicitly refreshing (e.g. after a spin).
        // On the initial background load we leave the button in its optimistic state
        // ("PUSH TO SPIN") so the user never sees a "LOADING..." flash on navigation.
        if (forceRefresh) setIsLoading(true);
        setError(null);

        // Validate pending reward from previous session
        if (pendingReward > 0 && pendingSpinId) {
            console.log("[SpinWheel] 🔍 Validating pending reward from previous session:", {
                pendingReward,
                pendingSpinId,
                isAdWatched
            });

            // If ad was already watched in previous session, clear the pending state
            if (isAdWatched) {
                console.log("[SpinWheel] 🧹 Ad was already watched in previous session, clearing pending state");
                clearPendingReward();
            }
        }

        try {
            // Load config and status (deduped on mount; forceRefresh after spin/redeem)
            const { configResponse, statusResponse } = await fetchSpinDataOnce(token, forceRefresh);

            if (configResponse.success && configResponse.data) {
                const config = configResponse.data;
                setSpinConfig(config);
                setMaxDailySpins(config.config?.maxSpinsPerDay || 5);
            }

            if (statusResponse.success && statusResponse.data) {
                const status = statusResponse.data;
                const rawRemainingSpins = Number(status.remainingSpins ?? 0);
                const remainingSpins = Number.isFinite(rawRemainingSpins) ? Math.max(0, rawRemainingSpins) : 0;
                const dailyLimit = Number(status.dailyLimit ?? 5);

                setSpinStatus(status);
                setCanSpin(status.canSpin || false);
                setSpins(remainingSpins);
                setSpinsLoaded(true);
                setDailySpinsUsed(Math.max(0, (dailyLimit || 5) - remainingSpins));
                // cooldownRemaining is in milliseconds — convert to whole minutes
                setCooldownRemaining(Math.floor((status.cooldownRemaining || 0) / 60000));
            }
        } catch (err) {
            setError(err.message || "Failed to load spin data");
        } finally {
            setIsLoading(false);
        }
    };

    // Function to play sound effect
    const playSpinSound = () => {
        try {
            if (audioRef.current) {
                audioRef.current.currentTime = 0; // Reset to beginning
                audioRef.current.play().catch(() => {
                    // Audio play failed - silently handle
                });
            }
        } catch (error) {
            // Sound effect error - silently handle
        }
    };

    const handleSpin = async () => {
        console.log("[SpinWheel] ▶ handleSpin() called");
        if (!token) {
            setError("Please log in to spin");
            setShowResult(true);
            setResult("❌ Please log in to spin");
            setTimeout(() => setShowResult(false), 5000);
            return;
        }

        // Check if already spinning - prevent multiple clicks
        if (isSpinning) {
            return;
        }

        try {
            // Play sound effect when user clicks spin
            playSpinSound();

            console.log("[SpinWheel] 🔄 Starting spin. Current state:", {
                spins,
                canSpin,
                cooldownRemaining,
            });

            setIsSpinning(true);
            setShowResult(false);
            setPendingReward(0);
            setPendingSpinId(null);
            setIsAdWatched(false);
            setError(null);
            setSpinReward(null); // Clear previous reward

            // Call API to perform spin - always call API, even if no spins left
            // Backend will return error message if no spins available
            console.log("[SpinWheel] 🌐 Calling performSpin API...");
            const spinResponse = await performSpin(token);
            console.log("[SpinWheel] 📥 performSpin response:", spinResponse);

            if (spinResponse.success && spinResponse.data) {
                const spinData = spinResponse.data;
                console.log("[SpinWheel] 📊 Spin data:", spinData);

                // Wait for animation to complete (3 seconds)
                setTimeout(() => {
                    setIsSpinning(false);

                    // Check spin status according to backend documentation:
                    // - status: "completed" = Free spin mode, rewards already credited
                    // - status: "pending" = Ad-based mode, requires redemption
                    const isPending = spinData.status === "pending";
                    const isCompleted = spinData.status === "completed";
                    console.log("[SpinWheel] 📊 Spin status flags:", {
                        status: spinData.status,
                        isPending,
                        isCompleted,
                    });

                    if (spinData.reward) {
                        const rewardAmount = spinData.reward.amount || 0;
                        const rewardType = spinData.reward.type || "coins";
                        const vipMultiplier = spinData.vipMultiplier || 1;
                        const finalReward = Math.floor(rewardAmount * vipMultiplier);

                        // Store reward details for display in modal - use same amount as pendingReward
                        setSpinReward({
                            amount: finalReward,
                            type: normalizeRewardType(rewardType),
                            coinsEarned: spinData.coinsEarned || 0,
                            xpEarned: spinData.xpEarned || 0,
                            rewardName: spinData.reward.name || `${finalReward} ${normalizeRewardType(rewardType) === "coins" ? "Coins" : "XP"}`
                        });

                        if (isPending && spinData.spinId) {
                            // Ad-based spin: Store pending reward for manual redemption
                            // User must tap the "Redeem" button to watch ad and claim
                            console.log("[SpinWheel] 🎯 Pending ad-based spin detected. Storing pending reward & spinId", {
                                finalReward,
                                baseReward: rewardAmount,
                                spinId: spinData.spinId,
                            });
                            setPendingReward(rewardAmount); // Store base amount for redemption
                            setPendingSpinId(spinData.spinId);
                        } else if (isCompleted) {
                            // Free spin: Reward already credited, no redemption needed
                            // Only clear pending ad state, keep spinReward for modal display
                            setPendingReward(0);
                            setPendingSpinId(null);
                            setIsAdWatched(false);

                            // Refresh wallet and XP balance from response
                            if (spinData.newBalance !== undefined) {
                                setCoins(spinData.newBalance);
                            }

                            // Refresh Redux store with updated balance/XP
                            if (token) {
                                dispatch(fetchWalletScreen({ token, force: true }));
                                dispatch(fetchUserProfile({ token, force: true }));
                                dispatch(fetchProfileStats({ token, force: true }));
                                dispatch(fetchWalletTransactions({ token, force: true }));
                                dispatch(fetchFullWalletTransactions({ token, page: 1, force: true }));
                            }
                        } else {
                            // No reward or unknown status
                            clearPendingReward();
                        }
                    } else {
                        console.log("[SpinWheel] ⚠️ No reward in spinData.reward. Clearing pending state.");
                        clearPendingReward();
                    }

                    // ONLY display the message from backend API
                    const backendMessage = spinData.message || spinResponse.message || "Spin completed";
                    setResult(backendMessage);
                    setShowResult(true);

                    // Reload status to update remaining spins
                    loadSpinData(true);

                    // Hide result after 5 seconds
                    setTimeout(() => {
                        setShowResult(false);
                    }, 5000);
                }, 3000);
            } else {
                // Handle backend error response - ONLY show backend message
                const backendMessage = spinResponse.message || spinResponse.error || "Spin failed";
                console.warn("[SpinWheel] ❌ Spin failed with backend message:", backendMessage);
                setIsSpinning(false);

                // ONLY display the message from backend API (no hardcoded text)
                setResult(backendMessage);
                setShowResult(true);

                // Reload status to update remaining spins
                loadSpinData(true);

                // Hide result after 5 seconds
                setTimeout(() => {
                    setShowResult(false);
                }, 5000);
            }
        } catch (err) {
            setIsSpinning(false);

            // Extract error message from API error - ONLY use backend message from api.js:33
            // The ApiError is thrown at api.js:33 with the backend message
            // ApiError structure: { message: "Not eligible for this spin wheel", status: 403, body: {...} }
            let errorMessage = err.message || "Failed to spin. Please try again.";
            console.error("[SpinWheel] ❌ Exception during spin:", {
                message: err?.message,
                stack: err?.stack,
                name: err?.name,
            });

            // The error message from api.js:33 is already in err.message
            // This is the message that should be displayed: "Not eligible for this spin wheel"
            // ONLY display the message from backend API (no hardcoded additions)
            setResult(errorMessage);
            setShowResult(true);

            // Reload status
            loadSpinData(true);

            // Hide result after 5 seconds
            setTimeout(() => {
                setShowResult(false);
            }, 5000);
        }
    };

    const handleWatchToRedeem = async (retryCount = 0) => {
        console.log("[SpinWheel] ▶ handleWatchToRedeem() called", {
            tokenPresent: !!token,
            pendingReward,
            pendingSpinId,
            isInitialized,
            isAdReady,
            isShowingAd,
            retryCount,
            isVipActive: vipData.isVipActive,
            currentTier: vipData.currentTier,
        });

        if (!token) {
            setError("Please log in to redeem");
            return;
        }

        if (!(pendingReward > 0 && pendingSpinId)) {
            setResult("❌ No pending reward to redeem!");
            setShowResult(true);
            setTimeout(() => setShowResult(false), 3000);
            return;
        }

        // VIP users get ad-free reward claiming
        if (vipData.isVipActive) {
            console.log("[SpinWheel] 🎯 VIP user detected - skipping ads for reward claiming");
            try {
                setIsRedeeming(true);
                setError(null);

                // Direct redemption without ads for VIP users
                console.log("[SpinWheel] 🌐 Calling redeemSpinReward API for VIP user...", {
                    pendingSpinId,
                    pendingReward,
                });
                const redeemResponse = await redeemSpinReward(pendingSpinId, token);
                console.log("[SpinWheel] 📥 redeemSpinReward response (VIP):", redeemResponse);

                if (redeemResponse.success && redeemResponse.data) {
                    const redeemData = redeemResponse.data;

                    // Track spinner use milestone (Adjust) — counter seeded from server at login
                    try { onSpinnerUse(incrementAndGet("spin")); } catch { /* never block spin flow */ }

                    // Update spinReward with the actual credited amount from redemption
                    if (spinReward && redeemData.reward) {
                        setSpinReward(prev => ({
                            ...prev,
                            type: normalizeRewardType(prev?.type),
                            coinsEarned: redeemData.coinsEarned || prev.coinsEarned,
                            xpEarned: redeemData.xpEarned || prev.xpEarned,
                            amount: redeemData.reward || pendingReward
                        }));
                    }

                    // Update coins with new balance
                    if (redeemData.newBalance !== undefined) {
                        setCoins(redeemData.newBalance);
                    }

                    // Refresh Redux store with updated balance/XP
                    if (token) {
                        dispatch(fetchWalletScreen({ token, force: true }));
                        dispatch(fetchUserProfile({ token, force: true }));
                        dispatch(fetchProfileStats({ token, force: true }));
                        dispatch(fetchWalletTransactions({ token, force: true }));
                        dispatch(fetchFullWalletTransactions({ token, page: 1, force: true }));
                    }

                    setIsAdWatched(true);
                    const formattedTier = vipData.currentTier?.charAt(0).toUpperCase() + vipData.currentTier?.slice(1).toLowerCase();
                    setResult(
                        `✅ ${redeemData.reward || pendingReward}💰 added to your wallet!\n\n🎉 VIP ${formattedTier} Reward claimed instantly!`
                    );
                    setShowResult(true);

                    // Clear pending reward and spin ID
                    clearPendingReward();

                    // Reload status to update balance
                    loadSpinData(true);

                    // Hide result after 3 seconds
                    setTimeout(() => {
                        setShowResult(false);
                    }, 3000);
                } else {
                    throw new Error(redeemResponse.error || "VIP redemption failed");
                }
            } catch (err) {
                console.error("[SpinWheel] ❌ VIP redemption error:", err);
                const finalMessage = err.message || "Failed to claim VIP reward. Please try again.";
                setError(finalMessage);
                setResult(`❌ ${finalMessage}`);
                setShowResult(true);
                setTimeout(() => setShowResult(false), 5000);
            } finally {
                setIsRedeeming(false);
            }
            return;
        }

        // Check if ad SDK is initialized
        if (!isInitialized) {
            console.log("[SpinWheel] ⚠️ Ad SDK not initialized, trying to initialize first...");
            setError("Initializing ad system...");
            try {
                // Short wait for hook to finish initializing (reduced from 2s so reward credits faster)
                await new Promise(resolve => setTimeout(resolve, 800));
                if (!isInitialized) {
                    throw new Error("Ad SDK failed to initialize");
                }
            } catch (initError) {
                console.error("[SpinWheel] ❌ SDK initialization failed:", initError);
                setError("Ad system not available. Please try again.");
                setResult("❌ Ad system initialization failed");
                setShowResult(true);
                setTimeout(() => setShowResult(false), 3000);
                return;
            }
        }

        // Force reload ad if not ready (fixes navigation issue)
        if (!isAdReady) {
            console.log("[SpinWheel] 🔄 Ad not ready, forcing reload to fix navigation issue...");
            try {
                const reloadResult = await loadAd();
                console.log("[SpinWheel] 📊 Forced reload result:", reloadResult);
                if (!reloadResult) {
                    setError("Failed to reload ad. Please try again.");
                    setResult("❌ Ad reload failed");
                    setShowResult(true);
                    setTimeout(() => setShowResult(false), 3000);
                    return;
                }
                // Brief wait for ad state to update (reduced so reward credits faster)
                await new Promise(resolve => setTimeout(resolve, 250));
            } catch (reloadError) {
                console.error("[SpinWheel] ❌ Ad reload failed:", reloadError);
                setError("Ad reload failed. Please try again.");
                setResult(`❌ Ad reload failed: ${reloadError.message}`);
                setShowResult(true);
                setTimeout(() => setShowResult(false), 3000);
                return;
            }
        }

        try {
            setIsRedeeming(true);
            setError(null);
            clearAdError();

            // Always behave like WatchAdCard: load an ad, then show it, then redeem
            console.log("[SpinWheel] 🌐 Starting ad load before redeem...");
            console.log("[SpinWheel] 📋 Ad system state:", {
                isInitialized,
                isAdReady,
                isAdLoading,
                adError,
            });

            let loaded = false;

            try {
                loaded = await loadAd();
                console.log("[SpinWheel] 📊 loadAd() result:", loaded);

                // If load completed but ad still not ready, short wait for state update (reduced for faster credit)
                if (loaded && !isAdReady) {
                    console.log("[SpinWheel] ⏳ Ad loaded but not ready, waiting for state update...");
                    await new Promise(resolve => setTimeout(resolve, 400));

                    if (!isAdReady) {
                        console.log("[SpinWheel] ⚠️ Ad still not ready after delay, forcing retry");
                        const retryLoad = await loadAd();
                        if (!retryLoad) {
                            throw new Error("Ad failed to become ready after retry");
                        }
                        await new Promise(resolve => setTimeout(resolve, 250));
                    }
                }
            } catch (loadError) {
                console.error("[SpinWheel] ❌ Ad load failed:", loadError);

                // Check if it's a timeout or network error
                if (loadError.message && (
                    loadError.message.includes('timeout') ||
                    loadError.message.includes('network') ||
                    loadError.message.includes('connection') ||
                    loadError.message.includes('socket')
                )) {
                    console.log("[SpinWheel] 🔄 Ad load timeout detected, attempting direct reward credit...");

                    // For load timeout errors, credit the reward directly without showing ad
                    try {
                        const directCreditResponse = await redeemSpinReward(pendingSpinId, token);
                        if (directCreditResponse.success) {
                            console.log("[SpinWheel] ✅ Direct reward credit successful (ad load timeout)");
                            setResult(`✅ ${pendingReward}💰 added to your wallet! (Ad unavailable - reward credited directly)`);
                            setShowResult(true);

                            // Update state and refresh
                            setCoins(directCreditResponse.data?.newBalance || coins);
                            dispatch(fetchWalletScreen({ token, force: true }));
                            dispatch(fetchUserProfile({ token, force: true }));
                            dispatch(fetchProfileStats({ token, force: true }));
                            dispatch(fetchWalletTransactions({ token, force: true }));
                            dispatch(fetchFullWalletTransactions({ token, page: 1, force: true }));

                            setPendingReward(0);
                            setPendingSpinId(null);
                            setIsAdWatched(true);
                            loadSpinData(true);

                            setTimeout(() => setShowResult(false), 5000);
                            setIsRedeeming(false);
                            return;
                        }
                    } catch (directCreditError) {
                        console.error("[SpinWheel] ❌ Direct reward credit failed:", directCreditError);
                        // Fall through to general error handling
                    }
                }

                // For other load errors or if direct credit failed
                const errorMsg = loadError.message || 'Unknown ad load error';
                console.error("[SpinWheel] ❌ Ad load error details:", {
                    message: errorMsg,
                    name: loadError.name,
                    stack: loadError.stack,
                });
                throw new Error(`Ad load failed: ${errorMsg}`);
            }

            if (!loaded) {
                setIsRedeeming(false);
                const errorMsg = "Failed to load ad. This could be due to network issues or ad availability. Please try again in a moment.";
                setError(errorMsg);
                setResult(errorMsg);
                setShowResult(true);
                setTimeout(() => setShowResult(false), 5000);
                return;
            }

            console.log("[SpinWheel] 🎬 Calling showAd() before redeem...");
            let adReward = null;

            try {
                adReward = await showAd({
                    onReward: (rewardData) => {
                        console.log("[SpinWheel] 💰 Rewarded ad completed (onReward):", rewardData);
                    },
                    onError: (errorMsg) => {
                        console.error("[SpinWheel] ❌ Error while showing rewarded ad:", errorMsg);
                        // Don't set error here as it might conflict with timeout handling
                        // The promise rejection will handle error display
                    },
                });
            } catch (adError) {
                console.error("[SpinWheel] ❌ Ad display failed:", adError);

                // Check if it's a timeout error and provide fallback
                if (adError.message && (
                    adError.message.includes('timeout') ||
                    adError.message.includes('network') ||
                    adError.message.includes('connection')
                )) {
                    console.log("[SpinWheel] 🔄 Ad timeout detected, attempting fallback reward credit...");

                    // For timeout errors, still try to credit the reward after a short delay
                    // This ensures users get their rewards even if ads fail due to network issues
                    setTimeout(async () => {
                        try {
                            const fallbackResponse = await redeemSpinReward(pendingSpinId, token);
                            if (fallbackResponse.success) {
                                console.log("[SpinWheel] ✅ Fallback reward credit successful");
                                setResult(`✅ ${pendingReward}💰 added to your wallet! (Ad timeout - reward credited automatically)`);
                                setShowResult(true);

                                // Update state and refresh
                                setCoins(fallbackResponse.data?.newBalance || coins);
                                dispatch(fetchWalletScreen({ token, force: true }));
                                dispatch(fetchUserProfile({ token, force: true }));
                                dispatch(fetchProfileStats({ token, force: true }));
                                dispatch(fetchWalletTransactions({ token, force: true }));
                                dispatch(fetchFullWalletTransactions({ token, page: 1, force: true }));

                                setPendingReward(0);
                                setPendingSpinId(null);
                                setIsAdWatched(true);
                                loadSpinData(true);

                                setTimeout(() => setShowResult(false), 5000);
                            }
                        } catch (fallbackError) {
                            console.error("[SpinWheel] ❌ Fallback reward credit failed:", fallbackError);
                            setError("Ad failed and reward credit failed. Please try again.");
                            setResult(`❌ Ad timeout and credit failed: ${fallbackError.message}`);
                            setShowResult(true);
                            setTimeout(() => setShowResult(false), 5000);
                        }
                    }, 1000); // 1 second delay before fallback attempt

                    setIsRedeeming(false);
                    return;
                }

                // For other ad errors, don't proceed with redemption
                throw adError;
            }

            console.log("[SpinWheel] 📊 showAd() returned:", adReward);
            if (!adReward) {
                // Ad was closed or failed; do not redeem
                console.warn("[SpinWheel] ⚠️ No ad reward returned, skipping redeem");
                setIsRedeeming(false);
                return;
            }

            console.log("[SpinWheel] ✅ Ad completed successfully, proceeding with reward redemption");

            // Credit reward immediately after ad (single API call – no extra delay)
            console.log("[SpinWheel] 🌐 Calling redeemSpinReward API...", {
                pendingSpinId,
                pendingReward,
            });
            const redeemResponse = await redeemSpinReward(pendingSpinId, token);
            console.log("[SpinWheel] 📥 redeemSpinReward response:", redeemResponse);

            if (redeemResponse.success && redeemResponse.data) {
                const redeemData = redeemResponse.data;

                // Update spinReward with the actual credited amount from redemption
                if (spinReward && redeemData.reward) {
                    setSpinReward(prev => ({
                        ...prev,
                        type: normalizeRewardType(prev?.type),
                        coinsEarned: redeemData.coinsEarned || prev.coinsEarned,
                        xpEarned: redeemData.xpEarned || prev.xpEarned,
                        amount: redeemData.reward || pendingReward
                    }));
                }

                if (redeemData.newBalance !== undefined) {
                    setCoins(redeemData.newBalance);
                }

                setIsAdWatched(true);
                setResult(
                    `✅ ${redeemData.reward || pendingReward}💰 added to your wallet!\n\n${redeemData.message || "Reward claimed successfully!"}`
                );
                setShowResult(true);
                clearPendingReward();

                // Refresh wallet/XP in background so UI shows credit immediately
                if (token) {
                    dispatch(fetchWalletScreen({ token, force: true }));
                    dispatch(fetchUserProfile({ token, force: true }));
                    dispatch(fetchProfileStats({ token, force: true }));
                    dispatch(fetchWalletTransactions({ token, force: true }));
                    dispatch(fetchFullWalletTransactions({ token, page: 1, force: true }));
                }
                loadSpinData(true);

                // Hide result after 3 seconds
                setTimeout(() => {
                    setShowResult(false);
                }, 3000);
            } else {
                throw new Error(redeemResponse.error || "Redemption failed");
            }
        } catch (err) {
            console.error("[SpinWheel] ❌ Error in handleWatchToRedeem:", err);

            // Check if it's a timeout or network error and we should retry
            const isRetryableError = err.message && (
                err.message.includes('timeout') ||
                err.message.includes('network') ||
                err.message.includes('connection') ||
                err.message.includes('socket')
            );

            if (isRetryableError && retryCount < 2) {
                // Retry up to 2 times for network/timeout errors
                console.log(`[SpinWheel] 🔄 Retrying ad redemption due to network error (attempt ${retryCount + 1}/3):`, err.message);

                setResult(`⚠️ Network issue, retrying... (${retryCount + 1}/3)`);
                setShowResult(true);
                setTimeout(() => setShowResult(false), 2000);

                // Wait before retrying with progressive delay
                setTimeout(() => {
                    handleWatchToRedeem(retryCount + 1);
                }, 2000 + (retryCount * 1000)); // 2s, 3s delay
                return;
            }

            // For final error after retries or non-retryable errors
            const finalMessage = (retryCount >= 2 && isRetryableError)
                ? `Failed after 3 attempts: ${err.message}. Please check your internet connection.`
                : err.message || "Failed to redeem reward. Please try again.";

            setError(finalMessage);
            setResult(`❌ ${finalMessage}`);
            setShowResult(true);
            setTimeout(() => setShowResult(false), 5000);
        } finally {
            if (retryCount === 0) { // Only set loading to false on initial call
                setIsRedeeming(false);
            }
        }
    };

    const handleBackToWallet = () => {
        // In a real app, this would navigate to the wallet screen
    };

    const clearPendingReward = () => {
        setPendingReward(0);
        setPendingSpinId(null);
        setIsAdWatched(false);
        setSpinReward(null);
    };

    const handleBackNavigation = () => {
        // Back navigation handler
    };

    // Human-friendly unit to show in small loading / pending messages
    const pendingUnit = spinReward ? (normalizeRewardType(spinReward.type) === 'xp' ? 'XP' : 'coins') : 'coins';

    return (
        <div
            className="relative w-full h-[620px] bg-black overflow-hidden"
            data-model-id="3721:8597"
        >
            {/* Web-only mock overlay (native uses real fullscreen ads) */}
            {isWeb && (
                <MockAdOverlay
                    isVisible={showMockAd}
                    onComplete={handleMockAdComplete}
                    onClose={handleMockAdClose}
                    duration={15}
                />
            )}

            {/* Overlay debug 'Watch to Redeem' button to ensure clicks are captured above the image */}
            {pendingReward > 0 && pendingSpinId && !isAdWatched && (
                <button
                    type="button"
                    onClick={() => {
                        console.log("[SpinWheel] ▶ Overlay 'Watch to Redeem' clicked (transparent hit area)", {
                            pendingReward,
                            pendingSpinId,
                            isAdWatched,
                            isRedeeming,
                            isShowingAd,
                            isAdLoading,
                        });
                        if (!isRedeeming && !isShowingAd && !isAdLoading) {
                            handleWatchToRedeem();
                        }
                    }}
                    className="absolute z-50 left-1/2 -translate-x-1/2 bottom-28 w-[260px] h-[60px] bg-transparent border-none outline-none"
                    style={{ pointerEvents: "auto" }}
                    aria-label="Watch to Redeem"
                >
                    {/* Invisible hit area over the image */}
                </button>
            )}

            {/* Spin Count Display at Top */}
            <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-30">
                <motion.div
                    className="flex flex-col items-center gap-1 px-4 py-2 bg-gradient-to-br from-[#FFD700] via-[#FFA500] to-[#B8860B] rounded-full shadow-[0_4px_15px_rgba(255,215,0,0.5)] border-2 border-[#FFD700]"
                    animate={isSpinning ? {
                        scale: [1, 1.1, 1],
                        boxShadow: [
                            "0 4px 15px rgba(255,215,0,0.5)",
                            "0 8px 25px rgba(255,215,0,0.8)",
                            "0 4px 15px rgba(255,215,0,0.5)"
                        ]
                    } : {
                        scale: [1, 1.05, 1]
                    }}
                    transition={isSpinning ? {
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    } : {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                >
                    <motion.span
                        className="text-[#2C1810] text-2xl font-black tracking-tight"
                        style={{
                            fontFamily: 'Arial Black, sans-serif',
                            fontWeight: 900,
                            textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                        }}
                        animate={isSpinning ? {
                            scale: [1, 1.2, 1],
                            color: ["#2C1810", "#FFD700", "#2C1810"]
                        } : {}}
                        transition={isSpinning ? {
                            duration: 0.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        } : {}}
                    >
                        {!spinsLoaded ? "🪙" : spins}
                    </motion.span>
                    <span
                        className="text-[#2C1810] text-xs font-bold tracking-wide"
                        style={{
                            fontFamily: 'Arial Black, sans-serif',
                            fontWeight: 700,
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                        }}
                    >
                        SPINS
                    </span>
                </motion.div>
            </div>

            {/* 3D Animated Border for Slot Machine - COMMENTED OUT: White transparent overlay over PUSH TO SPIN button */}
            {/*
            <div className="absolute top-[20px] left-0 w-full h-[563px] z-20 pointer-events-none">
                <div className="relative w-full h-full">
                    <div className="absolute inset-0 rounded-[20px] border-[4px] border-gradient-to-br from-yellow-400 via-orange-500 to-red-700 shadow-[0_0_40px_10px_rgba(255,140,0,0.25),0_8px_32px_0_rgba(0,0,0,0.5)]"
                        style={{
                            boxShadow: `
                                0 0 32px 8px rgba(255, 200, 80, 0.25),
                                0 0 0 6px rgba(255, 180, 60, 0.10) inset,
                                0 8px 32px 0 rgba(0,0,0,0.5)
                            `,
                            borderImage: "linear-gradient(120deg, #FFD700 10%, #FF9800 40%, #B45309 90%) 1"
                        }}
                    ></div>
                    {["top-0 left-0", "top-0 right-0", "bottom-0 left-0", "bottom-0 right-0"].map((pos, idx) => (
                        <span
                            key={pos}
                            className={`absolute ${pos} w-8 h-8 pointer-events-none`}
                        >
                            <span
                                className="block w-full h-full rounded-full bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 opacity-70 blur-[6px] animate-pulse"
                                style={{
                                    animationDelay: `${idx * 0.3}s`,
                                    filter: "drop-shadow(0 0 16px #FFD700) drop-shadow(0 0 32px #FF9800)"
                                }}
                            ></span>
                        </span>
                    ))}
                    {[
                        { className: "top-0 left-8 right-8 h-2", deg: 0 },
                        { className: "bottom-0 left-8 right-8 h-2", deg: 180 },
                        { className: "left-0 top-8 bottom-8 w-2", deg: 270 },
                        { className: "right-0 top-8 bottom-8 w-2", deg: 90 }
                    ].map((side, idx) => (
                        <span
                            key={side.className}
                            className={`absolute ${side.className} pointer-events-none`}
                        >
                            <span
                                className="block w-full h-full rounded-full bg-gradient-to-r from-yellow-200 via-orange-400 to-red-500 opacity-60 blur-[2px] animate-border-glow"
                                style={{
                                    animationDelay: `${idx * 0.2}s`,
                                    background: side.deg % 180 === 0
                                        ? "linear-gradient(90deg, #FFD700 0%, #FF9800 60%, #B45309 100%)"
                                        : "linear-gradient(180deg, #FFD700 0%, #FF9800 60%, #B45309 100%)"
                                }}
                            ></span>
                        </span>
                    ))}
                </div>
                <style jsx>{`
                    @keyframes border-glow {
                        0%, 100% { opacity: 0.7; filter: blur(2px) brightness(1.1);}
                        50% { opacity: 1; filter: blur(6px) brightness(1.4);}
                    }
                    .animate-border-glow {
                        animation: border-glow 2.2s ease-in-out infinite;
                    }
                `}</style>
            </div>
            */}


            <div className="absolute top-[20px] left-0 w-full h-[563px] aspect-[0.68] z-10">
                <img
                    className="w-full h-full object-cover transition-transform duration-300"
                    alt="Spin wheel slot machine"
                    src="/spinwheel.png"
                />

                {/* Slot Machine Display Overlay - "2 SPINS" with Coins */}
                <div className="absolute top-[52%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                    {/* Side lights and main frame container */}
                    <div className="relative flex items-center">

                        {/* Left side lights with animation */}
                        <div className="flex flex-col gap-0.5 mr-1">
                            {[...Array(4)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-2 h-2 bg-gradient-to-br from-[#FFA500] to-[#FF8C00] rounded-full shadow-[0_0_4px_rgba(255,165,0,0.8)]"
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.7, 1, 0.7],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                    }}
                                />
                            ))}
                        </div>

                        {/* Main slot machine frame with 3D effects */}
                        <motion.div
                            className="relative bg-gradient-to-b from-[#8B4513] via-[#6B3410] to-[#4A2511] rounded-xl p-[3px] shadow-[0_8px_25px_rgba(0,0,0,0.8),0_4px_12px_rgba(0,0,0,0.6)]"
                            whileHover={{
                                scale: 1.02,
                                rotateY: 5,
                                rotateX: 2,
                            }}
                            whileTap={{
                                scale: 0.98,
                                rotateY: -2,
                            }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                            {/* Inner brown display area with 3D depth */}
                            <div className="relative bg-gradient-to-b from-[#D2B48C] via-[#BC9A6A] to-[#A0522D] rounded-lg p-[4px] shadow-[inset_0_3px_8px_rgba(0,0,0,0.3),inset_0_-1px_2px_rgba(255,255,255,0.1)]">
                                {/* Three panel slots container */}
                                <div className="flex items-stretch gap-0 rounded-md overflow-hidden">

                                    {/* Left Coin Panel with 3D animation */}
                                    <motion.div
                                        className="flex items-center justify-center w-[60px] h-[95px] bg-gradient-to-b from-[#DEB887] via-[#D2B48C] to-[#BC9A6A] border-r-[1px] border-[#8B4513]"
                                        whileHover={{ scale: 1.05 }}
                                        animate={isSpinning ? {
                                            rotateY: [0, 10, -10, 10, 0],
                                            scale: [1, 1.05, 1.08, 1.05, 1]
                                        } : {}}
                                        transition={isSpinning ? { duration: 3, ease: "easeOut" } : { type: "spring", stiffness: 400 }}
                                    >
                                        {/* Coin Image */}
                                        <motion.div
                                            className="relative w-[35px] h-[35px]"
                                            animate={isSpinning ? {
                                                rotateY: [0, 1800, 3600],
                                                rotateZ: [0, 720, 1440],
                                                rotateX: [0, 360, 720],
                                                scale: [1, 1.3, 1.1, 1.3, 1.15, 1],
                                                y: [0, -15, -10, -15, -5, 0]
                                            } : {
                                                rotateY: [0, 360],
                                                scale: [1, 1.05, 1],
                                                y: [0, -1, 0]
                                            }}
                                            transition={isSpinning ? {
                                                duration: 3,
                                                ease: [0.43, 0.13, 0.23, 0.96],
                                                times: [0, 0.5, 0.7, 0.85, 0.95, 1]
                                            } : {
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        >
                                            <img
                                                src="/dollor.png"
                                                alt="Coin"
                                                className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(255,215,0,0.6)]"
                                                style={{
                                                    filter: isSpinning ? 'drop-shadow(0 0 20px rgba(255,215,0,1)) drop-shadow(0 0 35px rgba(255,165,0,0.9)) brightness(1.5) blur(0.3px)' : 'drop-shadow(0 0 6px rgba(255,215,0,0.6))'
                                                }}
                                            />
                                        </motion.div>
                                    </motion.div>

                                    {/* Center Panel - Coin Image Only */}
                                    <motion.div
                                        className="flex items-center justify-center w-[75px] h-[95px] bg-gradient-to-b from-[#DEB887] via-[#D2B48C] to-[#BC9A6A] border-r-[1px] border-[#8B4513] relative overflow-hidden"
                                        animate={isSpinning ? {
                                            boxShadow: [
                                                "inset 0 0 0 rgba(255,215,0,0)",
                                                "inset 0 0 40px rgba(255,215,0,1)",
                                                "inset 0 0 30px rgba(255,165,0,0.8)",
                                                "inset 0 0 40px rgba(255,215,0,1)",
                                                "inset 0 0 0 rgba(255,215,0,0)"
                                            ],
                                            scale: [1, 1.12, 1.08, 1.12, 1.05, 1],
                                            rotateZ: [0, 8, -8, 5, 0]
                                        } : {
                                            boxShadow: [
                                                "inset 0 0 0 rgba(255,215,0,0)",
                                                "inset 0 0 20px rgba(255,215,0,0.3)",
                                                "inset 0 0 0 rgba(255,215,0,0)"
                                            ]
                                        }}
                                        transition={isSpinning ? {
                                            duration: 3,
                                            ease: [0.43, 0.13, 0.23, 0.96],
                                            times: [0, 0.3, 0.6, 0.8, 1]
                                        } : {
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }}
                                    >
                                        {/* Coin Image in Center */}
                                        <motion.div
                                            className="relative w-[45px] h-[45px]"
                                            animate={isSpinning ? {
                                                rotateY: [0, 2160, 4320],
                                                rotateX: [0, 1080, 2160],
                                                rotateZ: [0, 540, 1080],
                                                scale: [1, 1.4, 1.2, 1.4, 1.2, 1],
                                                y: [0, -20, -15, -20, -10, 0]
                                            } : {
                                                rotateY: [0, 360],
                                                scale: [1, 1.1, 1],
                                                y: [0, -2, 0]
                                            }}
                                            transition={isSpinning ? {
                                                duration: 3,
                                                ease: [0.43, 0.13, 0.23, 0.96],
                                                times: [0, 0.4, 0.6, 0.8, 0.9, 1]
                                            } : {
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        >
                                            <img
                                                src="/dollor.png"
                                                alt="Coin"
                                                className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(255,215,0,0.6)]"
                                                style={{
                                                    filter: isSpinning ? 'drop-shadow(0 0 20px rgba(255,215,0,1)) drop-shadow(0 0 35px rgba(255,165,0,0.9)) brightness(1.5) blur(0.3px)' : 'drop-shadow(0 0 6px rgba(255,215,0,0.6))'
                                                }}
                                            />
                                        </motion.div>
                                    </motion.div>

                                    {/* Right Coin Panel with 3D animation */}
                                    <motion.div
                                        className="flex items-center justify-center w-[60px] h-[95px] bg-gradient-to-b from-[#DEB887] via-[#D2B48C] to-[#BC9A6A]"
                                        whileHover={{ scale: 1.05 }}
                                        animate={isSpinning ? {
                                            rotateY: [0, -10, 10, -10, 0],
                                            scale: [1, 1.05, 1.08, 1.05, 1]
                                        } : {}}
                                        transition={isSpinning ? { duration: 3, ease: "easeOut", delay: 0.1 } : { type: "spring", stiffness: 400 }}
                                    >
                                        {/* Coin Image */}
                                        <motion.div
                                            className="relative w-[35px] h-[35px]"
                                            animate={isSpinning ? {
                                                rotateY: [0, -1800, -3600],
                                                rotateZ: [0, -720, -1440],
                                                rotateX: [0, -360, -720],
                                                scale: [1, 1.3, 1.1, 1.3, 1.15, 1],
                                                y: [0, -15, -10, -15, -5, 0]
                                            } : {
                                                rotateY: [0, -360],
                                                scale: [1, 1.05, 1],
                                                y: [0, 1, 0]
                                            }}
                                            transition={isSpinning ? {
                                                duration: 3,
                                                ease: [0.43, 0.13, 0.23, 0.96],
                                                times: [0, 0.5, 0.7, 0.85, 0.95, 1],
                                                delay: 0.1
                                            } : {
                                                duration: 4,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        >
                                            <img
                                                src="/dollor.png"
                                                alt="Coin"
                                                className="w-full h-full object-contain drop-shadow-[0_4px_8px_rgba(255,215,0,0.6)]"
                                                style={{
                                                    filter: isSpinning ? 'drop-shadow(0 0 20px rgba(255,215,0,1)) drop-shadow(0 0 35px rgba(255,165,0,0.9)) brightness(1.5) blur(0.3px)' : 'drop-shadow(0 0 6px rgba(255,215,0,0.6))'
                                                }}
                                            />
                                        </motion.div>
                                    </motion.div>

                                </div>

                                {/* Sparkle effects during spinning */}
                                {isSpinning && (
                                    <>
                                        {/* Left sparkles */}
                                        <motion.div
                                            className="absolute top-2 left-2 w-2 h-2 bg-yellow-400 rounded-full"
                                            animate={{
                                                scale: [0, 1, 0],
                                                opacity: [0, 1, 0],
                                                y: [0, -20, -40],
                                                x: [0, -10, -20]
                                            }}
                                            transition={{
                                                duration: 1,
                                                delay: 0,
                                                repeat: 3,
                                                ease: "easeOut"
                                            }}
                                        />
                                        <motion.div
                                            className="absolute top-4 left-4 w-1 h-1 bg-orange-400 rounded-full"
                                            animate={{
                                                scale: [0, 1, 0],
                                                opacity: [0, 1, 0],
                                                y: [0, -15, -30],
                                                x: [0, 5, 10]
                                            }}
                                            transition={{
                                                duration: 1,
                                                delay: 0.3,
                                                repeat: 3,
                                                ease: "easeOut"
                                            }}
                                        />

                                        {/* Right sparkles */}
                                        <motion.div
                                            className="absolute top-2 right-2 w-2 h-2 bg-yellow-400 rounded-full"
                                            animate={{
                                                scale: [0, 1, 0],
                                                opacity: [0, 1, 0],
                                                y: [0, -20, -40],
                                                x: [0, 10, 20]
                                            }}
                                            transition={{
                                                duration: 1,
                                                delay: 0.2,
                                                repeat: 3,
                                                ease: "easeOut"
                                            }}
                                        />
                                        <motion.div
                                            className="absolute top-4 right-4 w-1 h-1 bg-orange-400 rounded-full"
                                            animate={{
                                                scale: [0, 1, 0],
                                                opacity: [0, 1, 0],
                                                y: [0, -15, -30],
                                                x: [0, -5, -10]
                                            }}
                                            transition={{
                                                duration: 1,
                                                delay: 0.5,
                                                repeat: 3,
                                                ease: "easeOut"
                                            }}
                                        />

                                        {/* Center sparkles */}
                                        <motion.div
                                            className="absolute top-1/2 left-1/2 w-1 h-1 bg-yellow-300 rounded-full"
                                            animate={{
                                                scale: [0, 1.5, 0],
                                                opacity: [0, 1, 0],
                                                y: [0, -10, -20],
                                                x: [0, 0, 0]
                                            }}
                                            transition={{
                                                duration: 1,
                                                delay: 0.1,
                                                repeat: 3,
                                                ease: "easeOut"
                                            }}
                                        />
                                    </>
                                )}
                            </div>
                        </motion.div>

                        {/* Right side lights with animation */}
                        <div className="flex flex-col gap-0.5 ml-1">
                            {[...Array(4)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="w-2 h-2 bg-gradient-to-br from-[#FFA500] to-[#FF8C00] rounded-full shadow-[0_0_4px_rgba(255,165,0,0.8)]"
                                    animate={{
                                        scale: [1, 1.2, 1],
                                        opacity: [0.7, 1, 0.7],
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        delay: i * 0.2,
                                    }}
                                />
                            ))}
                        </div>

                    </div>
                </div>

                {/* PUSH TO SPIN Button Overlay */}
                <div className="absolute top-[67%] left-1/2  mr-2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                    <motion.button
                        onClick={handleSpin}
                        disabled={!spinsLoaded || (isSpinning && !showResult) || cooldownRemaining > 0 || !canSpin || isLoading}
                        className={`w-[200px] h-12 text-white text-lg font-bold px-4 rounded-lg border-2 whitespace-nowrap flex items-center justify-center bg-gradient-to-b from-red-600 to-red-800 border-red-900 shadow-[0_8px_0px_#8f1a1a,inset_0_2px_4px_rgba(255,255,255,0.4)] ${!spinsLoaded || (isSpinning && !showResult) || cooldownRemaining > 0 || !canSpin || isLoading
                            ? 'cursor-not-allowed pointer-events-none'
                            : ''
                            }`}
                        whileHover={!spinsLoaded || (isSpinning && !showResult) || cooldownRemaining > 0 || !canSpin || isLoading ? {} : { scale: 1.02 }}
                        whileTap={!spinsLoaded || (isSpinning && !showResult) || cooldownRemaining > 0 || !canSpin || isLoading ? {} : {
                            scale: 0.98,
                            y: 4,
                            boxShadow: '0 4px 0px #8f1a1a, inset 0 2px 4px rgba(255,255,255,0.4)'
                        }}
                    >
                        {isSpinning ? "SPINNING..." : cooldownRemaining > 0 ? `Wait ${Math.floor(cooldownRemaining)} minute${Math.floor(cooldownRemaining) !== 1 ? 's' : ''}` : !canSpin && spinsLoaded ? "No Spins Available" : "PUSH TO SPIN"}
                    </motion.button>
                </div>
            </div>

            <button
                onClick={() => {
                    console.log("[SpinWheel] ▶ Watch to Redeem button clicked (transparent main button)", {
                        pendingReward,
                        pendingSpinId,
                        isAdWatched,
                        isRedeeming,
                        isShowingAd,
                        isAdLoading,
                    });
                    handleWatchToRedeem();
                }}
                disabled={pendingReward === 0 || !pendingSpinId || isAdWatched || isRedeeming || isShowingAd || isAdLoading}
                className={`top-[480px] left-1/2 -translate-x-1/2 w-[260px] h-[60px] rounded-[12.97px] overflow-hidden flex absolute items-center justify-center cursor-pointer transition-all ${pendingReward > 0 && pendingSpinId && !isAdWatched && !isRedeeming && !isShowingAd && !isAdLoading
                    ? 'bg-transparent'
                    : 'bg-transparent cursor-not-allowed opacity-50'
                    }`}
                aria-label="Watch ad to redeem reward"
            >
                {/* No visible text or background – this is a transparent hit area over the image */}
            </button>

            {/* Inline loading indicator for transparent Watch to Redeem button */}
            {(isRedeeming || isAdLoading || isShowingAd) && pendingReward > 0 && pendingSpinId && !isAdWatched && (
                <div className="absolute left-1/2 -translate-x-1/2 top-[454px] z-40 flex items-center gap-2 px-3 py-1 rounded-full bg-black/70 border border-yellow-300/70">
                    <div className="w-4 h-4 border-2 border-yellow-300 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-medium text-yellow-100 [font-family:'Poppins',Helvetica]">
                        {error && error.includes('retrying')
                            ? `Retrying ad connection...`
                            : `Loading ad to redeem ${pendingReward} ${pendingUnit}…`
                        }
                    </span>
                </div>
            )}

            {/* Header with App Version and Back Button */}


            {/* Pending Reward Indicator */}
            {/* {pendingReward > 0 && (
                <div className="absolute  left-1/2 transform -translate-x-1/2 z-40">
                    <div className="bg-yellow-500 text-black px-4 py-2 rounded-full shadow-lg animate-pulse">
                        <div className="text-sm font-bold">🎉 {pendingReward}💰 Pending!</div>
                        <div className="text-xs">Watch ad to redeem</div>
                    </div>
            </div>
            )} */}

            {/* Error Display */}
            {error && (
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-900/90 text-white px-4 py-2 rounded-lg shadow-lg max-w-sm">
                    <p className="text-sm font-medium">{error}</p>
                    <button
                        onClick={() => setError(null)}
                        className="mt-2 text-xs underline"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Result Modal */}
            {showResult && (
                <motion.div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    <motion.div
                        className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-3xl p-5 mx-4 text-center shadow-2xl border-2 border-[#8f4d1e] max-w-sm relative overflow-hidden"
                        initial={{ scale: 0.8, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: 50 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                            duration: 0.5
                        }}
                    >
                        {/* Animated background particles */}
                        <div className="absolute inset-0 overflow-hidden">
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                                    animate={{
                                        x: [0, Math.random() * 200 - 100],
                                        y: [0, Math.random() * 200 - 100],
                                        scale: [0, 1, 0],
                                        opacity: [0, 1, 0]
                                    }}
                                    transition={{
                                        duration: 2,
                                        delay: i * 0.2,
                                        repeat: Infinity,
                                        repeatDelay: 3
                                    }}
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        top: `${Math.random() * 100}%`
                                    }}
                                />
                            ))}
                        </div>

                        {/* Main content */}
                        <div className="relative z-10">
                            {/* Animated emoji with coin/XP icons for congratulations */}
                            <motion.div
                                className="text-5xl mb-3"
                                animate={{
                                    scale: [1, 1.2, 1],
                                    rotate: [0, 5, -5, 0]
                                }}
                                transition={{
                                    duration: 0.6,
                                    repeat: (spinReward && spinReward.amount > 0) || result.includes("🎉") ? 3 : 0,
                                    ease: "easeInOut"
                                }}
                            >
                                {(spinReward && spinReward.amount > 0) || result.includes("🎉") ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <span className="text-4xl">🎉</span>
                                        <motion.div
                                            animate={{
                                                rotate: [0, 360],
                                                scale: [1, 1.1, 1]
                                            }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                ease: "easeInOut"
                                            }}
                                        >
                                            {spinReward && normalizeRewardType(spinReward.type) === "xp" ? (
                                                <span className="text-4xl">⭐</span>
                                            ) : (
                                                <img
                                                    src="/dollor.png"
                                                    alt="Coin"
                                                    className="w-7 h-7"
                                                />
                                            )}
                                        </motion.div>
                                    </div>
                                ) : result.includes("🚫") || result.toLowerCase().includes("error") || result.toLowerCase().includes("failed") ? (
                                    <span className="text-4xl">🚫</span>
                                ) : (
                                    <span className="text-4xl">😔</span>
                                )}
                            </motion.div>

                            {/* Display reward breakdown: XP and Coins earned - hidden when pending (ad not yet watched) */}
                            {spinReward && spinReward.amount > 0 && !(pendingReward > 0 && pendingSpinId) && (
                                <motion.div
                                    className="mb-4"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: 0.1, duration: 0.3 }}
                                >
                                    <div className="flex items-center justify-center gap-6">
                                        {/* XP Earned */}
                                        <div className="flex items-center gap-2">
                                            <img
                                                src="/xp.svg"
                                                alt="XP"
                                                className="w-6 h-6 drop-shadow-[0_0_4px_rgba(255,215,0,0.6)]"
                                            />
                                            <span className="text-lg font-bold text-yellow-300">
                                                {spinReward.xpEarned}
                                            </span>
                                        </div>

                                        {/* Coins Earned */}
                                        <div className="flex items-center gap-2">
                                            <img
                                                src="/dollor.png"
                                                alt="Coin"
                                                className="w-6 h-6 drop-shadow-[0_0_4px_rgba(255,215,0,0.6)]"
                                            />
                                            <span className="text-lg font-bold text-yellow-300">
                                                {spinReward.coinsEarned}
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Display ONLY the backend message - hidden when pending (ad not yet watched) */}
                            {!(pendingReward > 0 && pendingSpinId) && (
                                <motion.div
                                    className="text-base text-gray-300 mb-3 leading-snug whitespace-pre-line text-center px-4"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.4 }}
                                >
                                    {result}
                                </motion.div>
                            )}

                            {/* Pending reward indicator */}
                            {pendingReward > 0 && (
                                <motion.div
                                    className="bg-gradient-to-r from-yellow-900/30 to-orange-800/20 rounded-xl p-3 border border-yellow-600/50"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        scale: [1, 1.02, 1]
                                    }}
                                    transition={{
                                        delay: 0.5,
                                        duration: 0.4,
                                        scale: {
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "easeInOut"
                                        }
                                    }}
                                >
                                    <div className="flex items-center justify-center gap-2">
                                        {spinReward && normalizeRewardType(spinReward.type) === 'xp' ? (
                                            <img
                                                src="/xp.svg"
                                                alt="XP"
                                                className="w-4 h-4"
                                            />
                                        ) : (
                                            <img
                                                src="/dollor.png"
                                                alt="Coin"
                                                className="w-4 h-4"
                                            />
                                        )}
                                        <span className="text-yellow-400 font-bold text-xs">
                                            {pendingReward} {pendingUnit} pending
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-[10px] mt-0.5">
                                        Watch ad to redeem
                                    </p>
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}

            {/* Audio element for sound effects */}
            <audio
                ref={audioRef}
                preload="auto"
                src="/spinning-coin-on-table-352448.mp3"
            />

        </div>
    );
}
