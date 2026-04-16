import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import { Capacitor } from "@capacitor/core";
import {
    selectGame,
    startTodayChallenge,
    completeTodayChallenge,
    fetchCalendar,
    fetchToday,
    fetchBonusDays
} from "../../../lib/redux/slice/dailyChallengeSlice";
import { SimpleSpinWheel } from "./SimpleSpinWheel";
import { spinForChallenge } from "../../../lib/api";
import { onDailyChallengeComplete } from "../../../lib/adjustService";
import { incrementAndGet } from "../../../lib/adjustCounters";
import { useAppLovinAds } from "@/hooks/useAppLovinAds";
import MockAdOverlay from "@/app/games/components/MockAdOverlay";
import {
    fetchWalletScreen,
    fetchWalletTransactions,
    fetchFullWalletTransactions,
} from "../../../lib/redux/slice/walletTransactionsSlice";
import { fetchProfileStats } from "../../../lib/redux/slice/profileSlice";

export const ChallengeModal = ({
    isOpen,
    onClose,
    today,
    onStartChallenge
}) => {
    const dispatch = useDispatch();
    const router = useRouter();
    const { user, token } = useAuth();
    const [countdown, setCountdown] = useState("");
    const [selectedGameId, setSelectedGameId] = useState(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [isStarting, setIsStarting] = useState(false);
    const [isCompleting, setIsCompleting] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [timeUntilClaimable, setTimeUntilClaimable] = useState(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [challengeStartTime, setChallengeStartTime] = useState(null);
    const [timeLimitCountdown, setTimeLimitCountdown] = useState(null);
    const [showCompletionSuccess, setShowCompletionSuccess] = useState(false);
    const [spinSuccess, setSpinSuccess] = useState(false);
    // Local error state for completion/claim handlers (prevents setError is not defined)
    const [error, setError] = useState(null);
    const [isShowingAdForClaim, setIsShowingAdForClaim] = useState(false);
    const isWeb = !Capacitor.isNativePlatform();
    const [showMockAd, setShowMockAd] = useState(false);

    // VIP status from Redux (same pattern as SpinWheel and VipBanner)
    const vipStatus = useSelector((state) => state.profile.vipStatus);
    const vipData = useMemo(() => {
        const isVipActive = vipStatus?.data?.isActive && vipStatus?.data?.currentTier && vipStatus?.data?.currentTier !== "Free";
        const currentTier = vipStatus?.data?.currentTier;

        return {
            isVipActive,
            currentTier
        };
    }, [vipStatus]);

    const getEffectiveToken = () => token || localStorage.getItem('authToken');

    const runRewardedAdGateIfManual = async (contextLabel = "complete") => {
        const claimType = today?.challenge?.claimType || today?.challenge?.claim_type;
        const isManualClaim = claimType === "manual";
        console.log("[ChallengeModal] 🔐 Ad gate check:", { contextLabel, claimType, isManualClaim, isVipActive: vipData.isVipActive, currentTier: vipData.currentTier });

        if (!isManualClaim) return true;

        // VIP users get ad-free reward claiming
        if (vipData.isVipActive) {
            console.log("[ChallengeModal] 🎯 VIP user detected - skipping ads for reward claiming");
            return true;
        }

        // Block until ad finishes (or fails)
        setIsShowingAdForClaim(true);
        setError(null);
        clearAdError();

        console.log(`[ChallengeModal] 🎬 Manual claim: loading ad before ${contextLabel}...`);
        const loaded = await loadAd();
        console.log(`[ChallengeModal] 📊 loadAd() result (${contextLabel}):`, loaded);
        if (!loaded) {
            setIsShowingAdForClaim(false);
            return false;
        }

        console.log(`[ChallengeModal] 🎬 Manual claim: showing ad before ${contextLabel}...`);
        const adReward = await showAd({
            onReward: (rewardData) => {
                console.log(`[ChallengeModal] 💰 Rewarded ad completed before ${contextLabel}:`, rewardData);
            },
            onError: (errorMsg) => {
                console.error(`[ChallengeModal] ❌ Rewarded ad error before ${contextLabel}:`, errorMsg);
                setError(errorMsg || "Failed to show ad. Please try again.");
            },
        });
        console.log(`[ChallengeModal] 📊 showAd() result (${contextLabel}):`, adReward);

        setIsShowingAdForClaim(false);
        return !!adReward;
    };

    const completeChallengeFlow = async ({ auto = false } = {}) => {
        if (isCompleting) {
            console.log("[ChallengeModal] ⏭️ completeChallengeFlow skipped: already completing");
            return;
        }

        const effectiveToken = getEffectiveToken();
        console.log("[ChallengeModal] ▶ completeChallengeFlow()", {
            auto,
            effectiveTokenPresent: !!effectiveToken,
            type: today?.challenge?.type,
            claimType: today?.challenge?.claimType || today?.challenge?.claim_type,
        });

        try {
            setIsCompleting(true);
            setError(null);

            // For spin challenges, ensure spin was successful (skip check when auto=true — we're only called with auto after a successful spin)
            if (today?.challenge?.type === "spin" && !auto && !spinSuccess) {
                alert("Please spin the wheel successfully before marking as complete.");
                setIsCompleting(false);
                return;
            }

            // IMPORTANT: For manual claim, FORCE ad first, and do not proceed unless ad completes
            const adOk = await runRewardedAdGateIfManual("complete");
            if (!adOk) {
                console.warn("[ChallengeModal] ⚠️ Manual claim ad not completed; skipping complete API");
                setIsCompleting(false);
                return;
            }

            console.log("[ChallengeModal] 🌐 Dispatching completeTodayChallenge...");
            const result = await dispatch(
                completeTodayChallenge({
                    challengeId: today?.challenge?.id,
                    token: effectiveToken,
                })
            );
            console.log("[ChallengeModal] 📥 completeTodayChallenge result:", result);

            if (!result.type.includes("fulfilled")) {
                const errorMessage =
                    result.payload || result.error || "Failed to complete challenge. Please try again.";
                alert(errorMessage);
                return;
            }

            // Track daily challenge completion milestone (Adjust) — counter seeded from server at login
            try { onDailyChallengeComplete(incrementAndGet("challenge"), today?.challenge?.id); } catch { /* never block completion flow */ }

            const now = new Date();
            const year = now.getFullYear();
            const month = now.getMonth();

            await Promise.all([
                dispatch(fetchCalendar({ year, month, token: effectiveToken, force: true })),
                dispatch(fetchToday({ token: effectiveToken, force: true })),
                dispatch(fetchBonusDays({ token: effectiveToken, force: true })),
            ]);

            // Fire wallet + transaction refresh in background — non-blocking, UI shows success immediately
            Promise.all([
                dispatch(fetchWalletScreen({ token: effectiveToken, force: true })),
                dispatch(fetchProfileStats({ token: effectiveToken, force: true })),
                dispatch(fetchWalletTransactions({ token: effectiveToken, limit: 5, background: true })),
                dispatch(fetchFullWalletTransactions({ token: effectiveToken, page: 1, limit: 20, type: "all", background: true })),
            ]).catch(() => {});

            setShowCompletionSuccess(true);
        } catch (e) {
            const errorMessage =
                e?.message || e?.payload || e?.error || "An unexpected error occurred. Please try again.";
            console.error("[ChallengeModal] ❌ completeChallengeFlow error:", e);
            alert(errorMessage);
        } finally {
            setIsCompleting(false);
        }
    };

    // AppLovin MAX rewarded ads hook (shared with WatchAdCard / SpinWheel)
    const {
        isInitialized,
        isLoading: isAdLoading,
        isAdReady,
        isShowingAd,
        error: adError,
        showAd,
        loadAd,
        clearError: clearAdError,
    } = useAppLovinAds();

    // Sync ad error to local error if needed
    useEffect(() => {
        if (adError) {
            setError(adError);
        }
    }, [adError]);

    // Log platform info once for debugging native vs web behavior
    useEffect(() => {
        console.log("[ChallengeModal] 🧩 Platform debug:", {
            isWeb,
            isNativePlatform: Capacitor.isNativePlatform?.(),
        });
    }, [isWeb]);

    // Sync AppLovin ad showing state with mock overlay on web
    useEffect(() => {
        if (isWeb && isShowingAd) {
            setShowMockAd(true);
        } else if (isWeb && !isShowingAd && showMockAd) {
            setShowMockAd(false);
        }
    }, [isWeb, isShowingAd, showMockAd]);

    const handleMockAdComplete = () => {
        setShowMockAd(false);
    };

    const handleMockAdClose = () => {
        setShowMockAd(false);
        setError("Ad was closed. Please watch the full ad to claim rewards.");
        setTimeout(() => setError(null), 5000);
    };

    // Modal state changes tracked internally

    // Calculate countdown timer for challenge expiration
    useEffect(() => {
        if (!today?.countdown) {
            setCountdown("");
            return;
        }

        const updateCountdown = () => {
            const now = new Date();
            let endTime = null;

            // Priority 1: Use endsAt (most accurate - absolute time)
            if (today.countdown.endsAt) {
                endTime = new Date(today.countdown.endsAt);
            }
            // Priority 2: Use timeRemaining (relative time from when data was fetched)
            else if (today.countdown.timeRemaining) {
                // Calculate end time from timeRemaining
                // Note: This is less accurate as it's based on when the data was fetched
                endTime = new Date(now.getTime() + today.countdown.timeRemaining);
            }
            // Priority 3: Fallback to formatted (static, won't update)
            else if (today.countdown.formatted) {
                setCountdown(today.countdown.formatted);
                return;
            }
            else {
                setCountdown("");
                return;
            }

            // Calculate difference
            const diff = endTime - now;

            if (diff <= 0) {
                setCountdown("Challenge expired");
                return;
            }

            // Calculate hours, minutes, seconds
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);

            // Format and set countdown
            const formatted = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            setCountdown(formatted);
        };

        // Initial update
        updateCountdown();

        // Update every second for live countdown
        const interval = setInterval(updateCountdown, 1000);

        return () => clearInterval(interval);
    }, [today?.countdown]);

    // Track challenge start time and calculate time limit countdown
    useEffect(() => {
        if (today?.progress?.startedAt && !today?.progress?.isCompleted) {
            const startedAt = new Date(today.progress.startedAt);
            setChallengeStartTime(startedAt);
        } else if (today?.progress?.isCompleted) {
            setChallengeStartTime(null);
            setTimeLimitCountdown(null);
        }
    }, [today?.progress?.startedAt, today?.progress?.isCompleted]);

    // Calculate countdown for time limit (e.g., 3 minutes)
    useEffect(() => {
        if (!challengeStartTime || !today?.challenge?.requirements?.timeLimit) {
            setTimeLimitCountdown(null);
            return;
        }

        const updateTimeLimitCountdown = () => {
            const now = new Date();
            const timeLimitMinutes = today.challenge.requirements.timeLimit;
            const timeLimitMs = timeLimitMinutes * 60 * 1000; // Convert minutes to milliseconds
            const elapsed = now - challengeStartTime;
            const remaining = timeLimitMs - elapsed;

            if (remaining <= 0) {
                setTimeLimitCountdown(null); // Time limit reached
                return;
            }

            // Calculate minutes and seconds
            const minutes = Math.floor(remaining / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            setTimeLimitCountdown({
                minutes,
                seconds,
                formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
                totalSeconds: Math.floor(remaining / 1000)
            });
        };

        // Initial update
        updateTimeLimitCountdown();

        // Update every second
        const interval = setInterval(updateTimeLimitCountdown, 1000);

        return () => clearInterval(interval);
    }, [challengeStartTime, today?.challenge?.requirements?.timeLimit]);

    // Calculate time until rewards can be claimed (10 minutes from start)
    useEffect(() => {
        // Skip wait timer for spin challenges - they can claim immediately
        if (today?.challenge?.type === 'spin') {
            setTimeUntilClaimable(null);
            return;
        }

        // Only show countdown if challenge is completed but rewards can't be claimed yet
        if (!today?.progress?.isCompleted || !today?.progress?.startedAt) {
            setTimeUntilClaimable(null);
            return;
        }

        const updateTimeUntilClaimable = () => {
            // Use server time if available (more accurate), otherwise use client time
            const serverTime = today?.countdown?.serverTime
                ? new Date(today.countdown.serverTime)
                : new Date();
            const now = new Date();
            const startedAt = new Date(today.progress.startedAt);

            // Calculate time difference using server time if available
            const timeDiff = serverTime - startedAt;
            const timeLimitMs = 10 * 60 * 1000; // 10 minutes in milliseconds
            const remaining = timeLimitMs - timeDiff;

            if (remaining <= 0) {
                setTimeUntilClaimable(null); // Time limit passed, can claim
                return;
            }

            // Calculate minutes and seconds
            const minutes = Math.floor(remaining / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

            setTimeUntilClaimable({
                minutes,
                seconds,
                formatted: `${minutes}:${seconds.toString().padStart(2, '0')}`,
                canClaim: false
            });
        };

        // Initial update
        updateTimeUntilClaimable();

        // Update every second for live countdown
        const interval = setInterval(updateTimeUntilClaimable, 1000);

        return () => clearInterval(interval);
    }, [today?.progress?.isCompleted, today?.progress?.startedAt, today?.countdown?.serverTime, today?.challenge?.type]);

    // User already completed today's challenge and claimed (or nothing left to do) – show message only, no buttons (must be before any early return to satisfy rules of hooks)
    const alreadyCompletedNoActions = useMemo(() => {
        if (!today?.progress?.isCompleted) return false;
        const rewardTransferred = today?.progress?.rewardTransferred === true || today?.rewardTransferred === true;
        const noActionsLeft = !today?.actions?.canClaimRewards && !today?.actions?.canComplete && !today?.actions?.canPlay && !today?.actions?.canSpin;
        if (rewardTransferred) return true;
        if (!noActionsLeft) return false;
        if (today?.challenge?.type !== 'spin' && today?.progress?.startedAt && today?.countdown?.serverTime) {
            const elapsed = new Date(today.countdown.serverTime) - new Date(today.progress.startedAt);
            if (elapsed < 10 * 60 * 1000) return false;
        }
        return true;
    }, [today?.progress?.isCompleted, today?.progress?.rewardTransferred, today?.progress?.startedAt, today?.rewardTransferred, today?.countdown?.serverTime, today?.challenge?.type, today?.actions?.canClaimRewards, today?.actions?.canComplete, today?.actions?.canPlay, today?.actions?.canSpin]);

    if (!isOpen) return null;

    // Handle case when no challenge is available
    if (!today?.hasChallenge) {
        return (
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <div
                    className="bg-black/95 backdrop-blur-sm rounded-[12px] px-4 py-3 w-full max-w-sm shadow-2xl border border-gray-600/50 relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-center">
                        <div className="text-white font-medium text-sm [font-family:'Poppins',Helvetica] leading-normal mb-4">
                            No challenge available for today you can select the list of game by clicking below button
                        </div>
                        <button
                            onClick={() => {
                                router.push('/Race/ListGame');
                            }}
                            className="relative w-full h-12 rounded-[12.97px] overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] transition-transform duration-150 scale-100 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 shadow-lg border-2 border-white/20"
                            style={{
                                boxShadow: '0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                                transform: 'translateZ(10px)',
                                transformStyle: 'preserve-3d'
                            }}
                        >
                            <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-base text-center tracking-[0] leading-[normal] whitespace-nowrap">
                                Select Game
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const handleSelectGame = async (gameId) => {
        try {
            setIsSelecting(true);
            const result = await dispatch(selectGame({ gameId, token: localStorage.getItem('authToken') }));
            setSelectedGameId(gameId);
        } catch (error) {
            // Failed to select game
        } finally {
            setIsSelecting(false);
        }
    };

    const handleStartChallenge = async () => {
        try {
            setIsStarting(true);
            const result = await dispatch(startTodayChallenge({ token: localStorage.getItem('authToken') }));

            // IMPORTANT: Track when challenge started for 10-minute validation
            // If API doesn't return startedAt, we set it locally
            if (result.type.includes('fulfilled')) {
                // Set local start time immediately
                setChallengeStartTime(new Date());
                // Refresh today's data to get updated progress with startedAt and actions
                await dispatch(fetchToday({ token: localStorage.getItem('authToken') }));
            }

            // Check for deep link in game object
            let deepLink = result.payload?.game?.deepLink;
            if (deepLink) {
                // Append user ID to deep link for Besitos tracking
                if (user?._id || user?.id) {
                    const userId = user._id || user.id;
                    // Check if URL already has partner_user_id parameter
                    if (deepLink.includes('partner_user_id=')) {
                        // Append user ID to existing parameter
                        deepLink = deepLink + userId;
                    } else {
                        // Add partner_user_id parameter
                        const separator = deepLink.includes('?') ? '&' : '?';
                        deepLink = `${deepLink}${separator}partner_user_id=${userId}`;
                    }
                }
                // Open the game deep link
                window.open(deepLink, '_blank');
            }
            onStartChallenge();
        } catch (error) {
            // Failed to start challenge
        } finally {
            setIsStarting(false);
        }
    };

    const handleCompleteChallenge = async () => {
        // Wrapper around the single source-of-truth completion flow
        await completeChallengeFlow({ auto: false });
    };

    // Handle claim rewards - with time-based validation (no ad here; ad is now on complete for manual claims)
    const handleClaimRewards = async () => {
        console.log("[ChallengeModal] ▶ handleClaimRewards() called", {
            isCompleted: today?.progress?.isCompleted,
            startedAt: today?.progress?.startedAt,
            canClaimRewards: today?.actions?.canClaimRewards,
        });

        // VALIDATION: Check if challenge is completed
        if (!today?.progress?.isCompleted) {
            alert("Please complete the challenge first before claiming rewards.");
            return;
        }

        // VALIDATION: Check if 10 minutes have passed since start
        if (today?.progress?.startedAt) {
            const now = new Date();
            const startedAt = new Date(today.progress.startedAt);
            const timeLimitMs = 10 * 60 * 1000; // 10 minutes
            const elapsed = now - startedAt;

            if (elapsed < timeLimitMs) {
                const remaining = timeLimitMs - elapsed;
                const minutes = Math.floor(remaining / (1000 * 60));
                const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
                alert(`Please wait ${minutes} minute(s) and ${seconds} second(s) before claiming rewards.`);
                return;
            }
        }

        // VALIDATION: Check if API allows claiming
        if (!today?.actions?.canClaimRewards) {
            alert("Rewards are not available to claim yet. Please try again later.");
            return;
        }

        try {
            setIsClaiming(true);
            setError(null);
            clearAdError();

            // Use completeChallenge to claim rewards (it handles both completion and claiming)
            console.log("[ChallengeModal] 🌐 Dispatching completeTodayChallenge for claim...");
            const result = await dispatch(completeTodayChallenge({
                challengeId: today?.challenge?.id,
                token: token
            }));
            console.log("[ChallengeModal] 📥 completeTodayChallenge result (claim):", result);

            // Check if claim was successful
            if (result.type.includes('fulfilled')) {
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                await Promise.all([
                    dispatch(fetchCalendar({ year, month, token, force: true })),
                    dispatch(fetchToday({ token, force: true })),
                    dispatch(fetchBonusDays({ token, force: true })),
                ]);

                // Fire wallet + transaction refresh in background — non-blocking
                Promise.all([
                    dispatch(fetchWalletScreen({ token, force: true })),
                    dispatch(fetchProfileStats({ token, force: true })),
                    dispatch(fetchWalletTransactions({ token, limit: 5, background: true })),
                    dispatch(fetchFullWalletTransactions({ token, page: 1, limit: 20, type: "all", background: true })),
                ]).catch(() => {});
            }

            onClose();
        } catch (error) {
            // Failed to claim rewards
            console.error("[ChallengeModal] ❌ Error while claiming rewards:", error);
            alert("Failed to claim rewards. Please try again.");
        } finally {
            setIsClaiming(false);
            setIsShowingAdForClaim(false);
        }
    };

    // Calculate if rewards can be claimed (all conditions must be met)
    const canClaimRewardsNow = () => {
        // Condition 1: Challenge must be completed
        if (!today?.progress?.isCompleted) {
            return false;
        }

        // For spin challenges, skip the 10-minute wait - allow immediate claiming
        if (today?.challenge?.type === 'spin') {
            // Only check if API allows claiming
            return today?.actions?.canClaimRewards || false;
        }

        // Condition 2: 10 minutes must have passed since start (for non-spin challenges)
        if (today?.progress?.startedAt) {
            // Use server time if available (more accurate), otherwise use client time
            const serverTime = today?.countdown?.serverTime
                ? new Date(today.countdown.serverTime)
                : new Date();
            const startedAt = new Date(today.progress.startedAt);
            const timeLimitMs = 10 * 60 * 1000; // 10 minutes
            const elapsed = serverTime - startedAt;

            if (elapsed < timeLimitMs) {
                return false;
            }
        } else {
            // If startedAt is not set, cannot claim (challenge not started properly)
            return false;
        }

        // Condition 3: API must allow claiming
        if (!today?.actions?.canClaimRewards) {
            return false;
        }

        return true;
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            {/* Web-only mock overlay (native uses real fullscreen ads) */}
            {isWeb && (
                <MockAdOverlay
                    isVisible={showMockAd}
                    onComplete={handleMockAdComplete}
                    onClose={handleMockAdClose}
                    duration={15}
                />
            )}

            <div className="bg-gray-900 rounded-lg p-6 w-full max-w-sm border border-gray-700 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Today's Challenge</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl"
                    >
                        ×
                    </button>
                </div>

                {/* Daily Reward Countdown - Simple red text at top */}
                {today?.countdown && (
                    <div className="mb-4 text-center">
                        <div className="text-red-500 text-base font-medium">
                            {countdown || today.countdown.formatted || today.countdown.timeRemainingLabel}
                        </div>
                    </div>
                )}

                {/* Challenge Image */}
                {(today?.challenge?.mediaUrl || today?.challenge?.game?.iconUrl) && (
                    <div className="mb-4 flex justify-center">
                        <img
                            src={today.challenge.mediaUrl || today.challenge.game?.iconUrl}
                            alt={today.challenge.title || "Challenge"}
                            className="w-full h-48 object-cover rounded-lg border border-gray-700"
                            loading="eager"
                            decoding="async"
                            width="384"
                            height="192"
                            onError={(e) => {
                                e.target.style.display = 'none';
                            }}
                        />
                    </div>
                )}

                {/* Game Name - Plain white text after image */}
                {(today?.challenge?.gameName || today?.challenge?.game?.name) && (
                    <div className="mb-4">
                        <div className="text-white text-base">
                            {(today.challenge.gameName || today.challenge.game?.name || '').split(' - ')[0]}
                        </div>
                    </div>
                )}

                {/* Challenge Title */}
                {/* {today?.challenge?.title && (
                    <div className="mb-3">
                        <div className="text-white text-lg font-bold">{today.challenge.title}</div>
                    </div>
                )} */}

                {/* Challenge Description */}
                {/* {today?.challenge?.description && (
                    <div className="mb-4">
                        <div className="text-gray-300 text-sm leading-relaxed">
                            {today.challenge.description}
                        </div>
                    </div>
                )} */}

                {/* Challenge Type */}
                {today?.challenge?.type && (
                    <div className="mb-3 p-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                        <div className="text-blue-200 text-xs font-medium mb-1">Type</div>
                        <div className="text-blue-100 text-sm font-semibold">
                            {today.challenge.typeLabel || today.challenge.type}
                        </div>
                    </div>
                )}

                {/* Rewards Section */}
                {/* {(today?.rewards || today?.challenge) && (
                    <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                        <div className="text-yellow-200 text-sm font-medium mb-2">Rewards</div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-yellow-100 text-sm">Coins:</span>
                                <span className="text-yellow-100 text-sm font-bold">
                                    {today?.rewards?.coins || today?.challenge?.coinReward || 0}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-yellow-100 text-sm">XP:</span>
                                <span className="text-yellow-100 text-sm font-bold">
                                    {today?.rewards?.xp || today?.challenge?.xpReward || 0}
                                </span>
                            </div>
                        </div>
                    </div>
                )} */}

                {/* Game Name */}
                {/* {(today?.challenge?.gameName || today?.challenge?.game?.name) && (
                    <div className="mb-3 p-2 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <div className="text-green-200 text-xs font-medium mb-1">Game</div>
                        <div className="text-green-100 text-sm font-semibold">
                            {today.challenge.gameName || today.challenge.game?.name}
                        </div>
                    </div>
                )} */}

                {/* Time Limit - Hide for spin challenges */}
                {today?.challenge?.requirements?.timeLimit && today?.challenge?.type !== 'spin' && (
                    <div className="mb-3 p-2 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                        <div className="text-purple-200 text-xs font-medium mb-1">Time Limit</div>
                        <div className="text-purple-100 text-sm font-semibold">
                            {today.challenge.requirements.timeLimit} {today.challenge.requirements.timeLimit === 1 ? 'minute' : 'minutes'}
                        </div>
                    </div>
                )}

                {/* Daily Reward Countdown */}
                {/* {today?.countdown && (
                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <div className="text-red-200 text-sm font-medium mb-1">Daily Reward Countdown</div>
                        <div className="text-red-100 text-lg font-bold font-mono mb-1">
                            {countdown || today.countdown.formatted || today.countdown.timeRemainingLabel}
                        </div>
                        {today.countdown.timeRemainingLabel && (
                            <div className="text-red-200 text-xs">
                                {today.countdown.timeRemainingLabel}
                            </div>
                        )}
                    </div>
                )} */}

                {/* Instructions */}
                {today?.challenge?.instructions && (
                    <div className="mb-4">
                        <div className="text-gray-400 text-xs italic">
                            {today.challenge.instructions}
                        </div>
                    </div>
                )}

                {/* Spin Wheel for "spin" type challenges */}
                {today?.challenge?.type === 'spin' && (
                    <div className="mb-4 p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-lg">
                        <div className="text-center mb-2">
                            <div className="text-purple-200 text-sm font-medium mb-1">
                                {today?.actions?.spinLabel || 'Spin the Wheel'}
                            </div>
                            {today?.hints?.showHint && today?.hints?.hintText && (
                                <div className="text-purple-300 text-xs mt-1">
                                    {today.hints.hintText}
                                </div>
                            )}
                        </div>
                        {today?.actions?.canSpin && !today?.progress?.isCompleted && (
                            <SimpleSpinWheel
                                token={token}
                                onSpinComplete={async (spinWasSuccessful) => {
                                    setIsSpinning(false);

                                    if (spinWasSuccessful) {
                                        setSpinSuccess(true);
                                        // For spin challenges, start the challenge but don't auto-complete — let user click "Mark as Complete"
                                        try {
                                            setIsStarting(true);
                                            const result = await dispatch(startTodayChallenge({ token: localStorage.getItem('authToken') }));

                                            if (result.type.includes('fulfilled')) {
                                                setChallengeStartTime(new Date());
                                                // Force refresh so "Mark as Complete" button appears
                                                await dispatch(fetchToday({ token: localStorage.getItem('authToken'), force: true }));
                                                // Do NOT auto-call completeChallengeFlow — user must click "Mark as Complete"
                                                // so they can watch the ad (if required) and then complete.
                                            }
                                        } catch (error) {
                                            // Failed to start challenge
                                        } finally {
                                            setIsStarting(false);
                                        }
                                    } else {
                                        setSpinSuccess(false);
                                        alert("Spin was not successful. Please try spinning again.");
                                    }
                                }}
                                onSpinStart={() => {
                                    setIsSpinning(true);
                                    setSpinSuccess(false);
                                }}
                                onSpinSuccess={(spinResult) => {
                                    // Spin API successful
                                }}
                                onSpinError={(error) => {
                                    // Spin API error
                                }}
                                isSpinning={isSpinning}
                                disabled={isStarting || isSpinning || !today?.actions?.canSpin}
                            />
                        )}
                        {today?.progress?.isCompleted && (
                            <div className="text-center py-4">
                                <div className="text-green-400 text-sm font-medium mb-2">
                                    ✅ Spin Completed!
                                </div>
                                <div className="text-gray-300 text-xs">
                                    Challenge completed successfully
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Game Selection */}
                {/* {!today?.selectedGame && (
                    <div className="mb-4">
                        <div className="text-white text-sm font-medium mb-2">Select a Game:</div>
                        <div className="space-y-2">
                            {today?.availableGames?.map((game) => (
                                <button
                                    key={game.id}
                                    onClick={isSelecting ? undefined : () => handleSelectGame(game.id)}
                                    disabled={isSelecting}
                                    className={`w-full p-3 rounded-lg text-left transition-colors ${isSelecting ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-800 hover:bg-gray-700'}`}
                                >
                                    <div className="text-white font-medium">{game.name}</div>
                                    <div className="text-gray-400 text-sm">{game.description}</div>
                                </button>
                            ))}
                        </div>
                    </div>
                )} */}

                {/* Selected Game */}
                {today?.selectedGame && (
                    <div className="mb-4 p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                        <div className="text-green-200 text-sm font-medium mb-1">Selected Game:</div>
                        <div className="text-green-100 font-medium">{today.selectedGame.name}</div>
                    </div>
                )}

                {/* Progress Status */}
                {/* {today?.progress && (
                    <div className="mb-4">
                        <div className="text-white text-sm font-medium mb-2">Progress:</div>
                        <div className="text-gray-300 text-sm">
                            Status: <span className="capitalize">{today.progress.status}</span>
                        </div>
                        {today.progress.rewardsEarned && (
                            <div className="text-green-400 text-sm mt-1">
                                Rewards Earned: {today.progress.rewardsEarned.coins} coins, {today.progress.rewardsEarned.xp} XP
                            </div>
                        )}
                    </div>
                )} */}

                {/* Time Until Claimable Warning - Hide for spin challenges */}
                {today?.progress?.isCompleted && today?.progress?.startedAt && timeUntilClaimable && today?.challenge?.type !== 'spin' && (
                    <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                        <div className="text-yellow-200 text-sm font-medium mb-1">⏳ Rewards Available In:</div>
                        <div className="text-yellow-100 text-lg font-bold font-mono">{timeUntilClaimable.formatted}</div>
                        <div className="text-yellow-200 text-xs mt-1">Please wait 10 minutes from when you started the challenge</div>
                    </div>
                )}

                {/* Rewards Info */}
                {(today?.rewards || today?.challenge) && (
                    <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                        <div className="text-yellow-200 text-sm font-medium mb-1">Rewards:</div>
                        <div className="text-yellow-100 text-sm">
                            {today?.rewards?.coins || today?.challenge?.coinReward || 0} coins, {today?.rewards?.xp || today?.challenge?.xpReward || 0} XP
                        </div>
                    </div>
                )}

                {/* Success Message after completion */}
                {showCompletionSuccess && (
                    <div className="mb-4 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
                        <div className="text-center">
                            <div className="text-green-400 text-lg font-bold mb-2">
                                ✅ Challenge Completed Successfully!
                            </div>
                            <div className="text-green-200 text-sm mb-3">
                                Your rewards will be credited within a few minutes.
                            </div>
                            <button
                                onClick={() => {
                                    setShowCompletionSuccess(false);
                                    onClose();
                                }}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Already completed today – friendly message only, no buttons */}
                {!showCompletionSuccess && alreadyCompletedNoActions && (
                    <div className="mt-4 p-4 bg-green-500/20 border border-green-500/40 rounded-lg">
                        <p className="text-green-200 text-center text-sm font-medium">
                            You’ve already completed today’s challenge. Great job! Come back tomorrow for a new one.
                        </p>
                    </div>
                )}

                {/* Action Buttons - Flow: Start → Mark as Complete → Claim Rewards */}
                {!showCompletionSuccess && !alreadyCompletedNoActions && (
                    <div className="flex gap-3 mt-4">
                        {/* Step 1: Claim Rewards (if completed and 10 minutes passed) – hide when user already claimed */}
                        {canClaimRewardsNow() && !today?.progress?.rewardTransferred && !today?.rewardTransferred ? (
                            <button
                                onClick={isClaiming ? undefined : handleClaimRewards}
                                disabled={isClaiming || isShowingAdForClaim}
                                className={`flex-1 py-3 text-white rounded-lg font-medium transition-colors ${isClaiming || isShowingAdForClaim
                                    ? 'bg-green-500 cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-700'
                                    }`}
                            >
                                {isShowingAdForClaim
                                    ? 'Watching Ad...'
                                    : isClaiming
                                        ? 'Claiming Rewards...'
                                        : '🎁 Claim Rewards'}
                            </button>
                        ) : today?.progress?.isCompleted && today?.progress?.startedAt && timeUntilClaimable && today?.challenge?.type !== 'spin' ? (
                            <button
                                disabled
                                className="flex-1 py-3 bg-gray-600 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                            >
                                ⏳ Wait {timeUntilClaimable.formatted} to Claim
                            </button>
                        ) : today?.progress?.isCompleted && !canClaimRewardsNow() && today?.challenge?.type !== 'spin' ? (
                            <button
                                disabled
                                className="flex-1 py-3 bg-gray-600 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                            >
                                {timeUntilClaimable
                                    ? `⏳ Wait ${timeUntilClaimable.formatted} to Claim`
                                    : '⏳ Please wait 10 minutes to claim rewards'}
                            </button>
                        ) : timeLimitCountdown && challengeStartTime && !today?.progress?.isCompleted && today?.challenge?.type !== 'spin' ? (
                            // Show time limit countdown when challenge is started but not completed (not for spin challenges)
                            <div className="flex-1 py-3 text-center">
                                <div className="text-red-500 text-lg font-bold font-mono">
                                    {timeLimitCountdown.formatted}
                                </div>
                                <div className="text-gray-400 text-xs mt-1">
                                    Complete the challenge to continue
                                </div>
                            </div>
                        ) : (today?.actions?.canComplete || (today?.progress?.startedAt && !today?.progress?.isCompleted)) ? (
                            // Step 2: Mark as Complete (after starting the challenge)
                            <button
                                onClick={isCompleting ? undefined : handleCompleteChallenge}
                                disabled={isCompleting}
                                className={`flex-1 py-3 text-white rounded-lg font-medium transition-colors ${isCompleting ? 'bg-blue-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                            >
                                {isCompleting ? 'Completing…' : '✅ Mark as Complete'}
                            </button>
                        ) : today?.challenge?.type === 'spin' && today?.actions?.canSpin && !today?.progress?.isCompleted ? (
                            // For spin challenges, the spin wheel is shown above
                            <div className="flex-1 py-3 text-center text-gray-400 text-sm">
                                Spin the wheel above to start
                            </div>
                        ) : today?.actions?.canPlay && today?.challenge?.type !== 'spin' ? (
                            // Step 0: Start/Play Now (initial state)
                            <button
                                onClick={isStarting ? undefined : handleStartChallenge}
                                disabled={isStarting}
                                className={`flex-1 py-3 text-white rounded-lg font-medium transition-colors ${isStarting ? 'bg-purple-500 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                            >
                                {isStarting ? 'Opening…' : today?.actions?.primaryActionLabel || '🚀 Play Now'}
                            </button>
                        ) : today?.challenge?.type === 'spin' && !today?.actions?.canSpin ? (
                            <button
                                disabled
                                className="flex-1 py-3 bg-gray-600 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                            >
                                Spin Not Available
                            </button>
                        ) : today?.actions?.canSelectGame ? (
                            <button
                                disabled
                                className="flex-1 py-3 bg-gray-600 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                            >
                                Select Game First
                            </button>
                        ) : (
                            <button
                                disabled
                                className="flex-1 py-3 bg-gray-600 text-gray-400 rounded-lg font-medium cursor-not-allowed"
                            >
                                Not Available
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
