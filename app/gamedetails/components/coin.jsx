import React, { useState, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { CoinInfoModal } from "./CoinInfoModal";
import { OptInModal } from "./OptInModal";
import { transferGameEarnings, getBatchStatus } from "../../../lib/api";
import { fetchWalletTransactions, fetchFullWalletTransactions } from "@/lib/redux/slice/walletTransactionsSlice";
import { normalizeGameTitle } from "@/lib/gameDataNormalizer";


export const Coin = ({
    game,
    sessionCoins = 0,
    sessionXP = 0,
    completedTasksCount = 0,
    taskProgression = null,
    isClaimed = false,
    isMilestoneReached = false,
    onClaimRewards
}) => {
    // Component state
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [showClaimWarning, setShowClaimWarning] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [locallyClaimed, setLocallyClaimed] = useState(false);
    const [showOptInModal, setShowOptInModal] = useState(false);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [claimedCoins, setClaimedCoins] = useState(0);
    const [claimedXP, setClaimedXP] = useState(0);
    const [errorMessage, setErrorMessage] = useState("");
    const [claimedGroups, setClaimedGroups] = useState(0); // Track how many groups have been claimed
    const claimModalRef = useRef(null); // Ref for claim warning modal
    const successModalRef = useRef(null); // Ref for success modal
    const errorModalRef = useRef(null); // Ref for error modal

    // Get authentication data from AuthContext
    const { token } = useAuth();
    const router = useRouter();
    const dispatch = useDispatch();

    /**
     * Build batches from processed goals using backend progression rules:
     * - First batch size = firstBatchSize (or 3 if rule missing)
     * - Next batches size = nextBatchSize (or same as first / 3 fallback)
     *
     * IMPORTANT: Rewards are NOT hardcoded. We sum the actual per-task rewards:
     * - coins: `goal.coinReward`
     * - xp: `goal.xpReward`
     */
    const batchData = useMemo(() => {
        const processedGoals = Array.isArray(taskProgression?.processedGoals)
            ? taskProgression.processedGoals
            : [];

        const hasProgressionRule = !!taskProgression?.hasProgressionRule;
        const firstBatchSize = Number(taskProgression?.firstBatchSize || 0);
        const nextBatchSize = Number(taskProgression?.nextBatchSize || 0);

        const fallbackFirst = 3;
        const effectiveFirstBatchSize = hasProgressionRule && firstBatchSize > 0 ? firstBatchSize : fallbackFirst;
        const effectiveNextBatchSize = hasProgressionRule && nextBatchSize > 0 ? nextBatchSize : effectiveFirstBatchSize;

        const batches = [];
        let idx = 0;

        // First batch
        if (effectiveFirstBatchSize > 0) {
            const goals = processedGoals.slice(idx, idx + effectiveFirstBatchSize);
            if (goals.length > 0) {
                batches.push({ size: effectiveFirstBatchSize, goals });
            }
            idx += effectiveFirstBatchSize;
        }

        // Subsequent batches
        while (idx < processedGoals.length && effectiveNextBatchSize > 0) {
            const goals = processedGoals.slice(idx, idx + effectiveNextBatchSize);
            if (goals.length === 0) break;
            batches.push({ size: effectiveNextBatchSize, goals });
            idx += effectiveNextBatchSize;
        }

        // Compute completion sequentially (only full batches count)
        let completedBatches = 0;
        let currentBatchProgress = 0; // how many completed (unlocked) tasks in the current batch
        let currentBatchTarget = effectiveFirstBatchSize;

        for (let b = 0; b < batches.length; b++) {
            const batch = batches[b];
            const unlockedInBatch = batch.goals.filter(g => !g?.isLocked);
            const completedUnlockedInBatch = unlockedInBatch.filter(g => g?.isCompleted).length;
            const isFullBatch = batch.goals.length === batch.size;
            const batchAllUnlocked = unlockedInBatch.length === batch.size;
            const batchCompleted = isFullBatch && batchAllUnlocked && completedUnlockedInBatch === batch.size;

            if (batchCompleted) {
                completedBatches += 1;
            } else {
                // If some tasks are still locked, progress is capped by unlocked count
                currentBatchProgress = completedUnlockedInBatch;
                currentBatchTarget = batch.size;
                break;
            }

            // If all existing batches are completed, the next target is the next batch size
            const next = batches[b + 1];
            if (next) {
                const nextUnlocked = next.goals.filter(g => !g?.isLocked);
                currentBatchProgress = nextUnlocked.filter(g => g?.isCompleted).length;
                currentBatchTarget = next.size;
            } else {
                // No next batch built yet; keep target consistent with rules
                currentBatchProgress = 0;
                currentBatchTarget = b === 0 ? effectiveNextBatchSize : effectiveNextBatchSize;
            }
        }

        const sumRewards = (goals) => {
            return goals.reduce(
                (acc, g) => {
                    const c = Number(g?.coinReward || 0);
                    const x = Number(g?.xpReward || 0);
                    return { coins: acc.coins + c, xp: acc.xp + x };
                },
                { coins: 0, xp: 0 }
            );
        };

        // Earned totals should be based on completed goals (locked goals shouldn't normally be completed,
        // but we include all for correctness)
        const totalEarned = sumRewards(processedGoals.filter(g => g?.isCompleted));

        // Overall totals for progress bar. Prefer API rewards.coins / rewards.xp everywhere (all UI sections + game details)
        const rawData = game?.besitosRawData || game || {};
        const rewardsCoins = game?.rewards?.coins ?? game?.rewards?.gold;
        const rewardsXP = game?.rewards?.xp;
        const isBitLab = game?.sdkProvider === 'bitlab' || game?.bitlabsRawData != null || rawData.total_points != null || game?.total_points != null || (rawData.events?.length && rawData.events[0]?.promised_points !== undefined) || (game?.bitlabsRawData?.events?.length > 0);
        const totalPossibleCoins = (rewardsCoins != null && Number(rewardsCoins) >= 0)
            ? Number(rewardsCoins)
            : isBitLab && (rawData.total_points != null || game?.total_points != null)
                ? Number(rawData.total_points ?? game?.total_points ?? 0)
                : processedGoals.reduce((sum, g) => {
                    const v = Number(g?.reward ?? g?.coinReward ?? 0);
                    return sum + (Number.isFinite(v) ? v : 0);
                }, 0);

        const xpConfig = game?.xpRewardConfig || rawData?.xpRewardConfig || { baseXP: 1, multiplier: 1 };
        const baseXP = Number(xpConfig.baseXP || 1);
        const multiplier = Number(xpConfig.multiplier || 1);
        const totalPossibleXP = (rewardsXP != null && Number(rewardsXP) >= 0)
            ? Number(rewardsXP)
            : processedGoals.reduce((sum, _g, index) => {
                const xp = Math.round((baseXP * Math.pow(multiplier, index)) * 100) / 100;
                return sum + (Number.isFinite(xp) ? xp : 0);
            }, 0);

        // Rewards for each FULL completed batch (sequential)
        const completedBatchRewards = [];
        for (let b = 0; b < completedBatches; b++) {
            completedBatchRewards.push(sumRewards(batches[b]?.goals || []));
        }

        return {
            batches,
            completedBatches,
            completedBatchRewards,
            totalEarnedCoins: Math.round(totalEarned.coins * 100) / 100,
            totalEarnedXP: Math.round(totalEarned.xp * 100) / 100,
            totalPossibleCoins: Math.round(totalPossibleCoins * 100) / 100,
            totalPossibleXP: Math.round(totalPossibleXP * 100) / 100,
            currentBatchProgress,
            currentBatchTarget
        };
    }, [taskProgression, game]);

    // How many FULL batches are claimable now (excluding already claimed batches)
    const claimableBatches = useMemo(() => {
        return Math.max(0, batchData.completedBatches - claimedGroups);
    }, [batchData.completedBatches, claimedGroups]);

    // Sum rewards for the claimable (completed but unclaimed) batches
    const claimableRewards = useMemo(() => {
        if (claimableBatches <= 0) return { coins: 0, xp: 0 };
        const start = claimedGroups;
        const end = claimedGroups + claimableBatches;
        const slice = batchData.completedBatchRewards.slice(start, end);
        const totals = slice.reduce(
            (acc, r) => ({ coins: acc.coins + (r?.coins || 0), xp: acc.xp + (r?.xp || 0) }),
            { coins: 0, xp: 0 }
        );
        return {
            coins: Math.round(totals.coins * 100) / 100,
            xp: Math.round(totals.xp * 100) / 100
        };
    }, [batchData.completedBatchRewards, claimableBatches, claimedGroups]);

    // Fetch batch status from backend on mount and when gameId changes
    useEffect(() => {
        const fetchBatchStatus = async () => {
            if (!game?.id || !token) return;

            try {
                const response = await getBatchStatus(game.id, token);
                if (response.success && response.data) {
                    // Set claimedGroups based on backend data
                    const claimedBatches = response.data.claimedBatches || [];
                    setClaimedGroups(claimedBatches.length);
                }
            } catch (error) {
                // Silently fail - user can still claim, we just won't know previous claims
                console.error('Failed to fetch batch status:', error);
            }
        };

        fetchBatchStatus();
    }, [game?.id, token]);

    // Reset locallyClaimed when new groups become available (after user completes more tasks)
    // This ensures UI shows new available rewards instead of old claimed values
    useEffect(() => {
        // If new tasks are completed (completedTasksCount increased) and there are available groups,
        // reset the claimed state to show new available rewards
        const newAvailableGroups = Math.max(0, batchData.completedBatches - claimedGroups);

        if (newAvailableGroups > 0 && locallyClaimed) {
            // New groups are available, reset claimed state to show new available rewards
            setLocallyClaimed(false);
        }
    }, [batchData.completedBatches, claimedGroups, locallyClaimed]);

    // Progress bar should reflect TOTAL earned coins / TOTAL possible coins for this game (all goals)
    const overallCoinProgressPercentage = batchData.totalPossibleCoins > 0
        ? (batchData.totalEarnedCoins / batchData.totalPossibleCoins) * 100
        : 0;

    const finalProgressPercentage = Math.max(0, Math.min(100, overallCoinProgressPercentage));

    /**
     * Get simple user-friendly error message
     * @param {string} errorMessage - The original error message from backend
     * @returns {string} - Simple user-friendly error message
     */
    const getUserFriendlyErrorMessage = (errorMessage) => {
        return "🎯 Complete the milestone first! You need to reach the required level to claim your rewards.";
    };

    /**
     * Handle "End & Claim Rewards" button click
     * AC-12: Triggers reward transfer and session lock
     * Protection against multiple clicks
     */
    const handleClaimClick = () => {
        // Check if there are available groups to claim
        if (claimableBatches === 0) {
            // Calculate remaining tasks needed for next group
            const remainingTasks = Math.max(0, batchData.currentBatchTarget - batchData.currentBatchProgress);
            const errorMsg = remainingTasks > 0
                ? `🎯 Complete ${remainingTasks} more task${remainingTasks > 1 ? 's' : ''} to unlock your next reward group!`
                : "🎯 Complete more tasks to unlock your next reward group!";
            setErrorMessage(errorMsg);
            return;
        }

        if (claiming) {
            return;
        }

        // Show warning modal before claiming (AC-10)
        setShowClaimWarning(true);
    };

    const handleConfirmClaim = async () => {
        // Check if there are available groups to claim
        if (claimableBatches === 0) {
            setShowClaimWarning(false);
            return;
        }

        if (claiming) {
            return;
        }

        if (!game?.id) {
            alert('Game information is missing. Cannot claim rewards.');
            setShowClaimWarning(false);
            return;
        }

        // Set claiming immediately to prevent duplicate calls
        setClaiming(true);

        try {
            // Get user token from AuthContext
            if (!token) {
                throw new Error('User not authenticated');
            }

            // Calculate starting batch number (1-indexed: first batch is 1, second is 2, etc.)
            const startingBatchNumber = claimedGroups + 1;
            const gameTitle = normalizeGameTitle(game);

            // Prepare earning data for API call with batch fields for backend integration
            const earningData = {
                gameId: game.id,
                coins: claimableRewards.coins,
                xp: claimableRewards.xp,
                reason: `Game session completion - ${gameTitle} - ${claimableBatches} batch${claimableBatches > 1 ? 'es' : ''} claimed`,
                batchNumber: startingBatchNumber,  // Starting batch number (1-indexed)
                batchesClaimed: claimableBatches,  // How many batches being claimed
                gameTitle: gameTitle                // Game title for backend tracking
            };

            // Prefer parent-provided claim handler which also locks session
            // Pass the claim data so parent can handle progressive group claims
            if (typeof onClaimRewards === 'function') {
                await onClaimRewards({
                    coins: claimableRewards.coins,
                    xp: claimableRewards.xp,
                    groups: claimableBatches,
                    batchNumber: startingBatchNumber  // Pass batch number to parent
                });
            } else {
                // Fallback to direct transfer if parent handler not provided
                const response = await transferGameEarnings(earningData, token);
                if (response.success === false) {
                    // Use the user-friendly error message function for API responses too
                    const userFriendlyError = getUserFriendlyErrorMessage(response.error || 'Failed to transfer earnings');
                    throw new Error(userFriendlyError);
                }
            }

            // Only update state after successful claim
            setLocallyClaimed(true);
            setClaimedCoins(claimableRewards.coins);
            setClaimedXP(claimableRewards.xp);

            // Update claimed groups count - this prevents claiming the same groups again
            setClaimedGroups(prev => prev + claimableBatches);

            // Refresh batch status from backend to ensure sync
            try {
                if (game?.id && token) {
                    const batchStatusResponse = await getBatchStatus(game.id, token);
                    if (batchStatusResponse.success && batchStatusResponse.data) {
                        const claimedBatches = batchStatusResponse.data.claimedBatches || [];
                        setClaimedGroups(claimedBatches.length);
                    }
                }
            } catch (batchError) {
                // Don't throw error - reward was still claimed successfully
                console.error('Failed to refresh batch status:', batchError);
            }

            // Refresh transaction history immediately after reward claim
            try {
                await Promise.all([
                    dispatch(fetchWalletTransactions({ token, limit: 5 })),
                    dispatch(fetchFullWalletTransactions({ token, page: 1, limit: 20, type: "all" }))
                ]);
            } catch (transactionError) {
                // Don't throw error - reward was still claimed successfully
            }

            // Show success message with better UI
            setShowSuccessMessage(true);

            // Auto-hide success message after 5 seconds
            setTimeout(() => {
                setShowSuccessMessage(false);
            }, 5000);
        } catch (error) {
            const errorMessage = typeof error === 'string'
                ? error
                : error?.message || error?.error || error?.toString() || '';
            const userFriendlyError = getUserFriendlyErrorMessage(errorMessage);
            setErrorMessage(userFriendlyError);
            // Reset locallyClaimed since the claim failed - user can try again
            // Only reset if we had set it (meaning this was a new claim attempt that failed)
        } finally {
            setClaiming(false);
            setShowClaimWarning(false);
        }
    };

    return (
        <section
            className={`flex flex-col w-[341px] h-[227px] items-start gap-2.5 mt-4 relative bg-[#1a1a1a] rounded-2xl overflow-hidden ${isClaimed ? 'opacity-50' : ''}`}
            data-model-id="3212:8259"
            role="region"
            aria-label="My Coins Progress Card"
        >
            <div className="relative self-stretch w-full h-[227px] rounded-2xl border border-solid border-[#616161]">
                <button
                    onClick={handleClaimClick}
                    disabled={claimableBatches === 0 || claiming}
                    className={`
                        absolute bottom-4 left-4 right-12 h-10 flex items-center justify-center rounded-lg overflow-hidden 
                        transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black
                        ${claimableBatches === 0 || claiming
                            ? 'bg-gray-600 cursor-not-allowed opacity-50'
                            : 'bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] hover:opacity-90 cursor-pointer'
                        }
                    `}
                    aria-label="Claim available rewards"
                    title={
                        claimableBatches === 0
                            ? `Complete ${Math.max(0, batchData.currentBatchTarget - batchData.currentBatchProgress)} more task${Math.max(0, batchData.currentBatchTarget - batchData.currentBatchProgress) !== 1 ? 's' : ''} to unlock rewards`
                            : claiming ? 'Claiming rewards...' :
                                `Click to claim ${claimableBatches} batch${claimableBatches > 1 ? 'es' : ''} (${claimableRewards.coins.toFixed(2)} coins + ${claimableRewards.xp} XP)`
                    }
                >
                    <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-sm text-center tracking-[0] leading-[normal]">
                        {claiming ? (
                            <div className="flex items-center justify-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Claiming...
                            </div>
                        ) :
                            claimableBatches === 0 ? '🔒 Claim Rewards Now' :
                                `🎉 Claim ${claimableBatches} Batch${claimableBatches > 1 ? 'es' : ''}!`}
                    </span>
                </button>

                <div
                    className="flex items-center justify-center gap-2 absolute top-[62%] left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                    role="status"
                    aria-label="Progress status"
                >
                    <span className={`[font-family:'Poppins',Helvetica] font-bold text-[15px] tracking-[0] leading-[17px] whitespace-nowrap transition-all duration-500 ${locallyClaimed ? 'text-green-400' : 'text-white'
                        }`}>
                        {locallyClaimed ? claimedCoins.toFixed(2) : claimableRewards.coins.toFixed(2)}
                    </span>

                    <img
                        className="w-[18px] h-[18px] object-contain flex-shrink-0"
                        alt="Coin icon"
                        src="/dollor.png" />

                    <span className={`[font-family:'Poppins',Helvetica] font-bold text-[15px] tracking-[0] leading-[17px] whitespace-nowrap transition-all duration-500 ${locallyClaimed ? 'text-green-400' : 'text-white'
                        }`}>
                        and {locallyClaimed ? claimedXP : claimableRewards.xp}
                    </span>

                    <img
                        className="w-[18px] h-[18px] object-contain flex-shrink-0"
                        alt="Level icon"
                        src="/assets/animaapp/WucpRujl/img/pic.svg"
                    />
                </div>

                {/* --- **MODIFIED** Progress Bar --- */}
                {/* MODIFIED: Increased left and right padding to shorten the bar's length */}
                <div className="absolute top-[90px] left-6 mt-2 right-6">
                    <div
                        className="relative w-full"
                        role="progressbar"
                        aria-valuenow={batchData.totalEarnedCoins}
                        aria-valuemin={0}
                        aria-valuemax={batchData.totalPossibleCoins}
                        aria-label={`Overall Progress: ${batchData.totalEarnedCoins.toFixed(2)} of ${batchData.totalPossibleCoins.toFixed(2)} coins earned.`}
                    >

                        <div className="w-full h-4 bg-[#373737] rounded-full border border-gray-700">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-[#25D42D] to-[#9DEF0F] transition-all duration-500 ease-out"
                                style={{ width: `${finalProgressPercentage}%` }}
                            />
                        </div>


                        <div
                            className="absolute top-1/2 w-7 h-7 rounded-full bg-[#25D42D] flex items-center justify-center transition-all duration-500 ease-out"
                            style={{
                                left: `${finalProgressPercentage}%`,
                                transform: 'translate(-50%, -50%)'
                            }}
                        >

                            <div className="w-4 h-4 bg-white rounded-full" />
                        </div>
                    </div>
                </div>
                {/* --- End of Modified Progress Bar --- */}

                <button
                    onClick={() => {
                        setShowOptInModal(true);
                    }}
                    className="absolute bottom-5 right-2 w-8 h-8 flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-black rounded-full"
                    aria-label="Information"
                >
                    <img
                        alt="Information icon"
                        src="/assets/animaapp/WucpRujl/img/frame-1000005263.svg"
                        className="w-6 h-6"
                        loading="eager"
                        decoding="async"
                        width={24}
                        height={24}
                    />
                </button>

                <header className="flex flex-col items-start gap-2 absolute top-4 left-4 right-4">
                    <div className="flex items-center justify-between w-full">
                        <h1 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[-0.37px] leading-[27.2px] whitespace-nowrap">
                            {'My Coins'}
                        </h1>

                        <div
                            className="flex items-center gap-2"
                            role="status"
                            aria-label={`Total earned coins: ${batchData.totalEarnedCoins.toFixed(2)}`}
                        >
                            <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-lg tracking-[0] leading-5 whitespace-nowrap">
                                {batchData.totalEarnedCoins.toFixed(2)}
                            </span>

                            <img
                                className="w-[22px] h-[23px] object-contain"
                                alt="Coin icon"
                                src="/assets/animaapp/WucpRujl/img/image-3938-2x.png"
                            />
                        </div>
                    </div>

                    {/* AC-08: Status message based on claim state */}
                    <div className="w-full">
                        <p className={`[font-family:'Poppins',Helvetica] font-normal text-sm tracking-[0.02px] leading-[normal] transition-all duration-500 ${isClaimed ? 'text-green-400' : 'text-[#ffffff99]'
                            }`}>
                            {locallyClaimed
                                ? `✅ Successfully claimed ${claimedCoins.toFixed(2)} coins and ${claimedXP} XP!`
                                : claimableBatches > 0
                                    ? `🎉 Ready to claim ${claimableRewards.coins.toFixed(2)} + ${claimableRewards.xp} XP from ${claimableBatches} batch${claimableBatches > 1 ? 'es' : ''}!`
                                    : sessionCoins > 0
                                        ? `💰 Complete ${Math.max(0, batchData.currentBatchTarget - batchData.currentBatchProgress)} more tasks to unlock the next batch reward!`
                                        : '*Complete level 3 to claim your reward.'}
                        </p>

                        {/* Progress indicator when coins are available but milestone not reached */}
                        {!locallyClaimed && sessionCoins > 0 && (
                            <div className="mt-2 space-y-2">
                                {/* <div className="flex items-center gap-2">
                                    <div
                                        className="flex-1 bg-gray-600 rounded-full h-1.5 overflow-hidden cursor-help"
                                        title={`Task Progress: ${rewardData.nextGroupProgress}/${rewardData.nextGroupTarget} tasks in current group`}
                                    >
                                        <div
                                            className="bg-gradient-to-r from-blue-400 to-purple-400 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${(rewardData.nextGroupProgress / rewardData.nextGroupTarget) * 100}%` }}
                                        />
                                    </div>
                                    <span
                                        className="text-xs text-blue-400 font-medium cursor-help"
                                        title={`${rewardData.nextGroupTarget - rewardData.nextGroupProgress} more tasks needed for next reward group`}
                                    >
                                        {rewardData.nextGroupProgress}/{rewardData.nextGroupTarget}
                                    </span>
                                </div> */}

                                {/* Reward Progress */}
                                {/* <div className="flex items-center gap-2">
                                    <div
                                        className="flex-1 bg-gray-600 rounded-full h-1.5 overflow-hidden cursor-help"
                                        title={`Reward Progress: ${availableCoins.toFixed(2)} earned`}
                                    >
                                        <div
                                            className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full rounded-full transition-all duration-500"
                                            style={{ width: `${availableGroups > 0 ? 100 : 0}%` }}
                                        />
                                    </div>
                                    <span
                                        className="text-xs text-yellow-400 font-medium cursor-help"
                                        title={`Current rewards: ${availableCoins.toFixed(2)}`}
                                    >
                                        {availableCoins.toFixed(2)}
                                    </span>
                                </div> */}
                            </div>
                        )}
                    </div>
                </header>
            </div>

            {showClaimWarning && typeof document !== 'undefined' && document.body && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
                    style={{ zIndex: 999999 }}
                    onClick={() => setShowClaimWarning(false)}
                >
                    <div
                        ref={claimModalRef}
                        className="bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-gray-800 shadow-2xl max-w-sm w-full p-6"
                        role="dialog"
                        aria-labelledby="claim-modal-title"
                        aria-describedby="claim-modal-description"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 id="claim-modal-title" className="text-xl font-bold text-white mb-3">⚠️ Claim Your Rewards?</h3>
                        <div id="claim-modal-description" className="space-y-3 mb-6">
                            <p className="text-gray-300 text-sm">
                                You're about to claim your session rewards:
                            </p>
                            <div className="bg-gradient-to-r from-yellow-500/10 to-blue-500/10 rounded-lg p-4 border border-yellow-500/20">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400">Coins:</span>
                                    <span className="font-bold text-yellow-400 text-lg">{claimableRewards.coins.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-gray-400">XP:</span>
                                    <span className="font-bold text-blue-400 text-lg">{claimableRewards.xp}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-400">Available Batches:</span>
                                    <span className="font-bold text-green-400 text-sm">{claimableBatches} batch{claimableBatches > 1 ? 'es' : ''}</span>
                                </div>
                            </div>
                            <p className="text-orange-400 text-sm font-medium">
                                ⚠️ Once you reach this level, you'll be eligible to end this session and transfer your collected coins and XP to your wallet.
                            </p>
                            <p className="text-red-400 text-sm font-medium">
                                🔒 After claiming, you won't be able to return to this game's reward flow. Choose wisely.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowClaimWarning(false)}
                                className="flex-1 py-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-semibold transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmClaim}
                                disabled={claiming}
                                className="flex-1 py-3 rounded-lg bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold transition-colors disabled:opacity-50"
                            >
                                {claiming ? (
                                    <div className="flex items-center justify-center">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Claiming...
                                    </div>
                                ) : 'Confirm Claim'}
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* AC-15: Help Tooltip Modal */}
            <CoinInfoModal
                isVisible={showInfoModal}
                onClose={() => setShowInfoModal(false)}
            />

            {/* Opt-In/Opt-Out Information Modal */}
            <OptInModal
                isVisible={showOptInModal}
                onClose={() => {
                    setShowOptInModal(false);
                }}
                sessionData={{ sessionCoins, sessionXP }}
                game={game}
            />

            {/* Success Message Modal - portaled to body so it stays on top */}
            {showSuccessMessage && typeof document !== 'undefined' && document.body && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
                    style={{ zIndex: 999999 }}
                    onClick={() => setShowSuccessMessage(false)}
                >
                    <div
                        ref={successModalRef}
                        className="bg-gradient-to-br from-green-900 to-green-800 rounded-2xl border border-green-600 shadow-2xl max-w-sm w-full p-6 animate-bounce"
                        role="dialog"
                        aria-labelledby="success-modal-title"
                        aria-describedby="success-modal-description"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 id="success-modal-title" className="text-2xl font-bold text-white mb-2">🎉 Rewards Claimed!</h3>
                            <div id="success-modal-description" className="bg-green-600/20 rounded-lg p-4 mb-4 border border-green-500/30">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-green-200">Coins Earned:</span>
                                    <span className="font-bold text-yellow-300 text-lg">{claimedCoins.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-green-200">XP Earned:</span>
                                    <span className="font-bold text-blue-300 text-lg">{claimedXP}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-green-200">Groups Claimed:</span>
                                    <span className="font-bold text-green-300 text-sm">{claimableBatches} batch{claimableBatches > 1 ? 'es' : ''}</span>
                                </div>
                            </div>
                            <p className="text-green-200 text-sm mb-4">
                                Your rewards have been successfully transferred to your wallet!
                            </p>
                            <button
                                onClick={() => setShowSuccessMessage(false)}
                                className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
                            >
                                Awesome! 🚀
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Error Message Modal - portaled to body so it stays on top */}
            {errorMessage && typeof document !== 'undefined' && document.body && createPortal(
                <div
                    className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 overflow-y-auto"
                    style={{ zIndex: 999999 }}
                    onClick={() => setErrorMessage("")}
                >
                    <div
                        ref={errorModalRef}
                        className="bg-gradient-to-br from-red-900 to-red-800 rounded-2xl border border-red-600 shadow-2xl max-w-sm w-full p-6 animate-pulse"
                        role="dialog"
                        aria-labelledby="error-modal-title"
                        aria-describedby="error-modal-description"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z" />
                                </svg>
                            </div>
                            <h3 id="error-modal-title" className="text-xl font-bold text-white mb-2">⚠️ Error</h3>
                            <div id="error-modal-description" className="bg-red-600/20 rounded-lg p-4 mb-4 border border-red-500/30">
                                <p className="text-red-100 text-sm leading-relaxed">{errorMessage}</p>
                            </div>
                            <div className="space-y-2">

                                <button
                                    onClick={() => setErrorMessage("")}
                                    className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors"
                                >
                                    Got it! 👍
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </section>
    );
};