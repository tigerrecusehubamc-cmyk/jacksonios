import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { RulesModal } from "./RulesModal";
import sessionManager from "@/lib/sessionManager";
import { normalizeGameGoals, getSdkProvider } from "@/lib/gameDataNormalizer";

export const LevelsSection = ({ game, selectedTier, onTierChange, onSessionUpdate, claimedBatches = [], isDownloadedGame = false }) => {
    const [processedGoals, setProcessedGoals] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sessionCoins, setSessionCoins] = useState(0);
    const [sessionXP, setSessionXP] = useState(0);
    const [isClaimed, setIsClaimed] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);
    const [showRulesModal, setShowRulesModal] = useState(false);

    const [claiming, setClaiming] = useState(false);
    const [milestoneLevel, setMilestoneLevel] = useState(3); // Configurable milestone - Complete 3 tasks to claim
    const [isGameDownloaded, setIsGameDownloaded] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [unlockNextBatch, setUnlockNextBatch] = useState(false);

    const dispatch = useDispatch();
    const router = useRouter();

    // Get user progress from Redux store
    const { userData, userDataStatus } = useSelector((state) => state.games);

    // Generate session ID when game is downloaded
    const generateSessionId = () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `session_${timestamp}_${random}`;
    };

    // Handle tier selection
    const handleTierSelect = (tier) => {
        setShowDropdown(false);
        onTierChange(tier);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (showDropdown && !event.target.closest('.dropdown-container')) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showDropdown]);

    // Check if milestone is reached after each set of three completed tasks (3, 6, 9, ...)
    const checkMilestoneReached = () => {
        const unlockedLevels = processedGoals.filter(goal => !goal.isLocked);
        const completedUnlockedCount = unlockedLevels.filter(g => g.isCompleted).length;


        const milestoneReached = completedUnlockedCount > 0 && (completedUnlockedCount % milestoneLevel === 0);


        return milestoneReached;
    };

    // Notify parent component when session data changes
    useEffect(() => {
        if (onSessionUpdate && game) {
            // Calculate completed tasks count for progression rules
            // IMPORTANT: Count completed UNLOCKED tasks only for batch-based progression
            const unlockedGoals = processedGoals.filter(g => !g.isLocked);
            const completedUnlockedTasksCount = unlockedGoals.filter(g => g.isCompleted).length;

            // Get taskProgression rules for batch calculation
            const taskProgression = game?.taskProgression || null;
            const hasProgressionRule = taskProgression?.hasProgressionRule || false;
            const firstBatchSize = taskProgression?.firstBatchSize || 0;
            const nextBatchSize = taskProgression?.nextBatchSize || 0;

            onSessionUpdate({
                sessionCoins,
                sessionXP,
                isClaimed,
                isGameDownloaded,
                isMilestoneReached: checkMilestoneReached(),
                completedTasksCount: completedUnlockedTasksCount, // Use completed UNLOCKED tasks only
                taskProgression: {
                    hasProgressionRule,
                    firstBatchSize,
                    nextBatchSize,
                    processedGoals // Pass processed goals to calculate batches
                }
            });
        }
    }, [sessionCoins, sessionXP, isClaimed, isGameDownloaded, processedGoals, game]);

    // Process game goals from API with real-time progress tracking
    useEffect(() => {
        const processGameData = () => {
            setIsLoading(true);
            setError(null);

            // Check if we have game data
            if (!game) {
                setIsLoading(false);
                return;
            }

            // Use normalizer to get goals/events for both besitos and bitlab
            const goalsToUse = normalizeGameGoals(game) || game.goals || [];
            const provider = getSdkProvider(game);
            const isBitLab = provider === 'bitlab';

            console.log('🎯 LevelsSection - Processing goals:', {
                provider,
                rawGoals: game?.besitosRawData?.goals,
                rawEvents: game?.besitosRawData?.events,
                normalizedGoals: goalsToUse,
                goalsCount: goalsToUse.length,
                firstGoal: goalsToUse[0] ? {
                    id: goalsToUse[0].id,
                    goal_id: goalsToUse[0].goal_id,
                    name: goalsToUse[0].name,
                    text: goalsToUse[0].text,
                    title: goalsToUse[0].title,
                    completed: goalsToUse[0].completed,
                    type: goalsToUse[0].type,
                    goal_type: goalsToUse[0].goal_type,
                    section: goalsToUse[0].section
                } : null
            });

            // Get taskProgression rules for unlocking tasks
            const taskProgression = game?.taskProgression || null;
            const hasProgressionRule = taskProgression?.hasProgressionRule || false;
            const firstBatchSize = taskProgression?.firstBatchSize || 0;
            const nextBatchSize = taskProgression?.nextBatchSize || 0;
            const completedTasks = taskProgression?.completedTasks || 0;
            const canUnlockNextTasks = taskProgression?.canUnlockNextTasks || false;
            const thresholdReached = taskProgression?.thresholdReached || false;

            // Check if we have goals
            if (!goalsToUse || goalsToUse.length === 0) {
                setError('No goals available for this game');
                setIsLoading(false);
                return;
            }

            try {
                // Process goals with ACTUAL API data (completed, failed, days_left) - from besitosRawData
                const allGoals = goalsToUse.map((goal, index) => {
                    // Debug log for first few goals
                    if (index < 3) {
                        console.log(`🔍 [Goal ${index}] Raw data:`, {
                            id: goal.id,
                            goal_id: goal.goal_id,
                            name: goal.name,
                            text: goal.text,
                            title: goal.title,
                            completed: goal.completed,
                            failed: goal.failed,
                            status: goal.status,
                            type: goal.type,
                            goal_type: goal.goal_type,
                            section: goal.section
                        });
                    }

                    // Use actual completion status from API - handle both boolean and string values
                    const isCompleted = goal.completed === true || goal.completed === 'true' || goal.status === 'completed' || goal.status === 'success';
                    const isFailed = goal.failed === true || goal.failed === 'true' || goal.status === 'failed' || goal.status === 'expired';
                    const isLinear = goal.goal_type === 'linear' || goal.type === 'linear';
                    const isNonLinear = goal.goal_type === 'non-linear' || goal.type === 'non-linear' || goal.type === 'turbo' || goal.type === 'flat';

                    // Check if expired based on days_left
                    const isExpired = goal.days_left !== null && goal.days_left <= 0 && !isCompleted;
                    const isPending = !isCompleted && !isFailed && !isExpired;

                    // Progressive unlocking based on taskProgression rules
                    // PRIORITY: Use progression data from API if available (for downloaded games)
                    // Otherwise, calculate based on taskProgression rules
                    const isLocked = (() => {
                        console.log(`[Debug] Checking lock status for goal: "${goal.text || goal.name || goal.title}" (Batch: ${goal.progression?.batchNumber})`);

                        // BitLab: use API progression lock state as source of truth (each event has progression.isLocked / isUnlocked)
                        if (isBitLab && goal.progression && (typeof goal.progression.isLocked === 'boolean' || typeof goal.progression.isUnlocked === 'boolean')) {
                            const apiLocked = goal.progression.isLocked === true;
                            console.log('[Debug] BitLab: Using API progression.isLocked:', apiLocked, 'for', goal.name || goal.text);
                            return apiLocked;
                        }
                        // Non-BitLab or no progression: use progression from API when available (e.g. downloaded Besitos)
                        if (goal.progression && typeof goal.progression.isLocked === 'boolean') {
                            const taskBatchNumber = goal.progression.batchNumber;
                            if (taskBatchNumber && claimedBatches.length > 0) {
                                const maxClaimedBatch = Math.max(...claimedBatches);
                                const nextbatch = userData?.nextbatch || 1;
                                const shouldBeLocked = taskBatchNumber > maxClaimedBatch + nextbatch;
                                return shouldBeLocked;
                            }
                            return goal.progression.isLocked;
                        }
                        // BitLab without per-goal progression: use batch rule if available, else sequential unlock
                        if (isBitLab) {
                            if (hasProgressionRule && firstBatchSize > 0) {
                                // Use batch-based taskProgression rules (fall through to logic below)
                                console.log('[Debug] BitLab: Using taskProgression batch rules (firstBatchSize, nextBatchSize).');
                            } else {
                                // No batch rule: unlock by event order (all prior events completed)
                                const myNum = goal.event_number ?? goal.position ?? index + 1;
                                const priorGoals = goalsToUse.filter(g => (g.event_number ?? g.position ?? 999) < myNum);
                                const allPriorCompleted = priorGoals.length === 0 || priorGoals.every(p => p.completed === true || p.status === 'completed');
                                return !allPriorCompleted;
                            }
                        }

                        console.log('[Debug] Using fallback progression logic.');
                        // Fallback: Calculate based on taskProgression rules (for games without progression data)
                        if (!hasProgressionRule || firstBatchSize === 0) {
                            const blockIndex = Math.floor(index / 3); // 0-based block
                            if (blockIndex === 0) {
                                console.log('[Debug] Fallback: First block, unlocked.');
                                return false;
                            }
                            const prevBlockStart = (blockIndex - 1) * 3;
                            const prevBlockEnd = prevBlockStart + 3;
                            const previousBlockGoals = goalsToUse.slice(prevBlockStart, prevBlockEnd);
                            const previousBlockCompleted = previousBlockGoals.every(prevGoal => prevGoal.completed === true || prevGoal.status === 'completed');

                            console.log(`[Debug] Fallback: Block ${blockIndex}. Previous block completed: ${previousBlockCompleted}`);
                            return !previousBlockCompleted;
                        }

                        // Use taskProgression rules
                        if (index < firstBatchSize) {
                            console.log(`[Debug] Task index ${index} is within firstBatchSize ${firstBatchSize}, unlocked.`);
                            return false;
                        }

                        const batchNumber = Math.floor((index - firstBatchSize) / nextBatchSize) + 1;
                        for (let b = 0; b < batchNumber; b++) {
                            let batchStart, batchEnd;
                            if (b === 0) {
                                batchStart = 0;
                                batchEnd = firstBatchSize;
                            } else {
                                batchStart = firstBatchSize + (b - 1) * nextBatchSize;
                                batchEnd = Math.min(batchStart + nextBatchSize, goalsToUse.length);
                            }
                            const batchGoals = goalsToUse.slice(batchStart, batchEnd);
                            const batchCompleted = batchGoals.every(g => g.completed === true || g.status === 'completed');

                            if (b === batchNumber - 1) {
                                const result = !(batchCompleted && (canUnlockNextTasks || thresholdReached));
                                console.log(`[Debug] Task in batch ${batchNumber}. Predecessor batch ${b} completed: ${batchCompleted}. canUnlock: ${canUnlockNextTasks}, threshold: ${thresholdReached}. Locked: ${result}`);
                                return result;
                            }
                            if (!batchCompleted) {
                                console.log(`[Debug] Task in batch ${batchNumber}. Previous batch ${b} not completed. Locked.`);
                                return true;
                            }
                        }

                        const finalResult = !(canUnlockNextTasks || thresholdReached || unlockNextBatch);
                        console.log(`[Debug] Final check. canUnlock: ${canUnlockNextTasks}, threshold: ${thresholdReached}, unlockNextBatch: ${unlockNextBatch}. Locked: ${finalResult}`);
                        return finalResult;
                    })();

                    // Determine task status
                    let taskStatus = 'pending';
                    if (isCompleted) taskStatus = 'completed';
                    else if (isFailed) taskStatus = 'failed';
                    else if (isExpired) taskStatus = 'expired';
                    else if (isPending) taskStatus = 'pending';

                    // Coins: use promised_points (goal.amount) per task for both BitLab and Besitos
                    const goalAmount = parseFloat(goal.amount || goal.points || 0) || 0;
                    const coinReward = isCompleted ? goalAmount : 0;

                    // XP: BitLab = baseXP (1st task), baseXP*multiplier (2nd), ... Ensure baseXP >= 1 so XP always updates when tasks complete
                    const xpConfig = game?.xpRewardConfig || game?.bitlabsRawData?.xpRewardConfig || game?.besitosRawData?.xpRewardConfig || { baseXP: 1, multiplier: 1 };
                    const baseXP = Math.max(1, Number(xpConfig.baseXP) || 1);
                    const multiplier = Number(xpConfig.multiplier) || 1;
                    const xpIndex = index;
                    const calculatedXP = Math.round((baseXP * Math.pow(multiplier, xpIndex)) * 100) / 100;
                    const xpReward = isCompleted ? calculatedXP : 0;

                    // Format time limit
                    let timeLimit = 'No limit';
                    if (goal.days_left !== null) {
                        if (goal.days_left <= 0) {
                            timeLimit = 'Expired';
                        } else if (goal.days_left === 1) {
                            timeLimit = '1 day left';
                        } else {
                            timeLimit = `${goal.days_left} days left`;
                        }
                    }

                    // Determine gradient based on status and type
                    let gradient;
                    if (isLocked) {
                        gradient = "bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)]";
                    } else if (isCompleted) {
                        gradient = "bg-[linear-gradient(180deg,rgba(19,200,116,0.6)_0%,rgba(34,150,87,0.6)_100%)]"; // Green for completed
                    } else if (isFailed || isExpired) {
                        gradient = "bg-[linear-gradient(180deg,rgba(200,19,19,0.4)_0%,rgba(150,34,34,0.4)_100%)]"; // Red for failed/expired
                    } else if (isNonLinear) {
                        gradient = "bg-[linear-gradient(180deg,rgba(255,193,7,0.6)_0%,rgba(255,152,0,0.6)_100%)]"; // Orange for turbo
                    } else {
                        gradient = getGradientForLevel(index + 1);
                    }

                    return {
                        id: index + 1,
                        title: goal.text || goal.name || goal.title || `Task ${index + 1}`,
                        timeLimit,
                        reward: (goal.amount != null && goal.amount !== '' ? String(goal.amount) : (goal.points != null && goal.points !== '' ? String(goal.points) : '0')),
                        points: `+${calculatedXP}`,
                        gradient,
                        goalId: goal.goal_id || goal.id || goal.uuid || goal.hash,
                        section: goal.section || (goal.type === 'turbo' || goal.type === 'non-linear' ? 'turbo' : 'linear'),
                        isCompleted,
                        isFailed,
                        isLocked,
                        isTurbo: isNonLinear,
                        isExpired,
                        taskStatus,
                        progress: isCompleted ? 100 : 0,
                        maxProgress: 100,
                        vectorLeft: getVectorLeft(index),
                        vectorRight: getVectorRight(index),
                        pic: getPicIcon(index),
                        rewardImage: "/dollor.png",
                        coinReward,
                        xpReward,
                        taskType: getTaskType(goal.section),
                        levelBadge: getLevelBadge(index + 1),
                        // Store API fields for reference
                        days_left: goal.days_left,
                        completed_datetime: goal.completed_datetime,
                        expires_at: goal.expires_at,
                        expire_datetime: goal.expire_datetime
                    };
                });

                // Calculate session totals from COMPLETED goals only
                const totalCoins = allGoals
                    .filter(g => g.isCompleted)
                    .reduce((sum, g) => sum + g.coinReward, 0);

                const totalXP = allGoals
                    .filter(g => g.isCompleted)
                    .reduce((sum, g) => sum + g.xpReward, 0);

                setSessionCoins(totalCoins);
                setSessionXP(totalXP);
                setProcessedGoals(allGoals);
                setIsLoading(false);

                // Set game as downloaded if any goals are completed
                const hasProgress = allGoals.some(g => g.isCompleted);
                if (hasProgress) {
                    setIsGameDownloaded(true);

                    // Track task completion in session
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
                    if (userId) {
                        const activeSession = sessionManager.getActiveSessionForGame(game.id, userId);
                        if (activeSession) {
                            // Track completed tasks
                            allGoals.filter(g => g.isCompleted).forEach(goal => {
                                sessionManager.updateSessionActivity(activeSession.id, {
                                    type: 'task_completed',
                                    taskCompleted: goal.goalId,
                                    milestoneReached: goal.id === milestoneLevel ? 'milestone_reached' : null
                                });
                            });

                            // Update session with current progress
                            sessionManager.updateSessionActivity(activeSession.id, {
                                sessionCoins: totalCoins,
                                sessionXP: totalXP,
                                type: 'progress_update'
                            });
                        }
                    }
                }

            } catch (err) {
                setError('Failed to load game levels');
                setIsLoading(false);
            }
        };

        processGameData();
    }, [game, userData, unlockNextBatch, claimedBatches]);

    // Helper functions for styling
    const getGradientForLevel = (level) => {
        const gradients = [
            "bg-[linear-gradient(180deg,rgba(220,195,34,1)_0%,rgba(80,50,146,0.7)_100%)]", // Yellow gradient for "Install The Game"
            "bg-[linear-gradient(180deg,rgba(255,0,217,0.4)_0%,rgba(113,106,231,0.4)_100%)]", // Pink gradient
            "bg-[linear-gradient(180deg,rgba(255,0,247,0.4)_0%,rgba(113,106,231,0.4)_100%)]", // Purple gradient
            "bg-[linear-gradient(180deg,rgba(255,0,217,0.4)_0%,rgba(113,106,231,0.4)_100%)]", // Pink gradient
            "bg-[linear-gradient(180deg,rgba(255,0,238,0.4)_0%,rgba(113,106,231,0.4)_100%)]", // Purple gradient
            "bg-[linear-gradient(180deg,rgba(19,200,116,1)_0%,rgba(87,34,150,1)_100%)]" // Green gradient for turbo
        ];
        return gradients[(level - 1) % gradients.length];
    };

    const getVectorLeft = (index) => {
        const vectors = [
            "/assets/animaapp/ABnBdu2U/img/vector-4235.svg",
            "/assets/animaapp/ABnBdu2U/img/vector-4235-1.svg",
            "/assets/animaapp/ABnBdu2U/img/vector-4235-2.svg",
            "/assets/animaapp/ABnBdu2U/img/vector-4235-3.svg",
            "/assets/animaapp/ABnBdu2U/img/vector-4235-4.svg"
        ];
        return vectors[index % vectors.length];
    };

    const getVectorRight = (index) => {
        const vectors = [
            "/assets/animaapp/ABnBdu2U/img/vector-4234.svg",
            "/assets/animaapp/ABnBdu2U/img/vector-4234-1.svg",
            "/assets/animaapp/ABnBdu2U/img/vector-4234-2.svg",
            "/assets/animaapp/ABnBdu2U/img/vector-4234-3.svg",
            "/assets/animaapp/ABnBdu2U/img/vector-4234-4.svg"
        ];
        return vectors[index % vectors.length];
    };

    const getPicIcon = (index) => {
        const pics = [
            "/assets/animaapp/ABnBdu2U/img/pic.svg",
            "/assets/animaapp/ABnBdu2U/img/pic-1.svg",
            "/assets/animaapp/ABnBdu2U/img/pic-2.svg",
            "/assets/animaapp/ABnBdu2U/img/pic-3.svg",
            "/assets/animaapp/ABnBdu2U/img/pic-4.svg"
        ];
        return pics[index % pics.length];
    };

    // Task type color coding
    const getTaskType = (section) => {
        const taskTypes = {
            'linear': { color: 'bg-blue-500', label: 'Goal' },
            'turbo': { color: 'bg-green-500', label: 'Turbo' },
            'bonus': { color: 'bg-yellow-500', label: 'Bonus' },
            'install': { color: 'bg-orange-500', label: 'Install' },
            'daily': { color: 'bg-purple-500', label: 'Daily' }
        };
        return taskTypes[section] || { color: 'bg-gray-500', label: 'Task' };
    };

    // Level badge styling
    const getLevelBadge = (level) => {
        if (level >= 1 && level <= 10) return { color: 'bg-blue-500', text: 'text-blue-500' };
        if (level >= 11 && level <= 20) return { color: 'bg-green-500', text: 'text-green-500' };
        if (level >= 21 && level <= 30) return { color: 'bg-yellow-500', text: 'text-yellow-500' };
        return { color: 'bg-gray-500', text: 'text-gray-500' };
    };

    // Use the checkMilestoneReached function defined above
    const isMilestoneReached = checkMilestoneReached;

    // Handle Start Playing button
    const handleStartPlaying = () => {
        if (game?.url) {
            window.open(game.url, '_blank');
            setIsGameDownloaded(true);

            // Track game download in session
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
            if (userId) {
                const activeSession = sessionManager.getActiveSessionForGame(game.id, userId);
                if (activeSession) {
                    sessionManager.updateSessionActivity(activeSession.id, {
                        type: 'game_downloaded',
                        milestoneReached: 'game_downloaded'
                    });
                }
            }
        } else {
            alert('Game link not available. Please try again later.');
        }
    };

    // Handle End & Claim Rewards
    const handleClaimRewards = async () => {
        if (!isMilestoneReached() || isClaimed) return;

        setClaiming(true);
        try {
            // Call backend API to claim rewards
            const response = await fetch('https://rewardsuatapi.hireagent.co/api/claim-rewards', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    gameId: game?.id,
                    userId: userData?.user_id,
                    sessionId: sessionId || generateSessionId(),
                    coins: sessionCoins,
                    xp: sessionXP
                })
            });

            const result = await response.json();

            if (result.success) {
                setIsClaimed(true);
                setShowClaimModal(false);

                // Update claimedBatches dynamically
                const updatedClaimedBatches = [...claimedBatches, result.data.totalBatchesClaimed];
                setUnlockNextBatch(true);

                // Trigger re-evaluation of processedGoals
                setProcessedGoals((prevGoals) => {
                    return prevGoals.map((goal) => {
                        if (goal.progression && goal.progression.batchNumber === result.data.totalBatchesClaimed + 1) {
                            return { ...goal, isLocked: false };
                        }
                        return goal;
                    });
                });

                alert(`Your rewards have been added to your wallet! +${result.data.totalCoinsClaimed} coins, +${result.data.totalXPClaimed} XP`);
            } else {
                throw new Error(result.message || 'Failed to claim rewards');
            }

        } catch (error) {
            alert('Failed to claim rewards. Please try again.');
        } finally {
            setClaiming(false);
        }
    };

    // Filter goals into active and locked lists based on the 'isLocked' property
    const activeLevels = processedGoals.filter(goal => !goal.isLocked);
    const lockedLevels = processedGoals.filter(goal => goal.isLocked);

    // Calculate dynamic line heights to connect from first card to last card
    const calculateLineHeight = (cardCount, isLocked = false) => {
        if (cardCount === 0) return 0;
        if (cardCount === 1) return 120; // Single card height + buffer

        // More generous calculation to account for variable card heights
        // Assume average card height of ~100px + 16px gap = 116px between centers
        const estimatedCardHeight = 100;
        const gapBetweenCards = 16;
        const distanceBetweenCircles = (cardCount - 1) * (estimatedCardHeight + gapBetweenCards);

        // Add generous buffer to ensure line extends well past the last circle
        const buffer = isLocked ? 150 : 100; // Extra buffer for locked tasks
        return distanceBetweenCircles + estimatedCardHeight + buffer;
    };

    const activeLineHeight = calculateLineHeight(activeLevels.length, false);
    const lockedLineHeight = calculateLineHeight(lockedLevels.length, true);





    return (
        <div className="w-[375px] h-auto   mt-3 mb-3  px-2 flex flex-col">
            {/* Header Section */}
            <div className="flex w-[375px] h-11 items-center justify-between pt-2 pb-5 px-6">
                <div className="font-semibold text-[#f4f3fc] text-[20px]">
                    Levels
                </div>
                <div className="relative dropdown-container">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="flex w-[90px] items-center justify-center gap-1 rounded-[10px] border border-solid border-[#363636] px-2 py-1 hover:bg-gray-800 transition-colors cursor-pointer"
                    >
                        <div className="font-regular text-white text-[14px]">
                            {selectedTier || 'Junior'}
                        </div>
                        <img
                            className={`w-[12.19px] h-[12.19px] transition-transform ${showDropdown ? 'rotate-180' : ''}`}
                            alt="Arrow back ios new"
                            src="/assets/animaapp/ABnBdu2U/img/arrow-back-ios-new-2x.png"
                        />
                    </button>

                    {/* Dropdown Menu */}
                    {showDropdown && (
                        <div className="absolute top-full right-0 mt-1 w-[90px] bg-black border border-[#363636] rounded-[10px] shadow-lg z-50">
                            <button
                                onClick={() => handleTierSelect('Junior')}
                                className={`w-full px-3 py-2 text-left text-[14px] hover:bg-gray-800 transition-colors first:rounded-t-[10px] ${selectedTier === 'Junior' ? 'text-white bg-gray-700' : 'text-gray-300'
                                    }`}
                            >
                                Junior
                            </button>
                            <button
                                onClick={() => handleTierSelect('Mid')}
                                className={`w-full px-3 py-2 text-left text-[14px] hover:bg-gray-800 transition-colors ${selectedTier === 'Mid' ? 'text-white bg-gray-700' : 'text-gray-300'
                                    }`}
                            >
                                Mid
                            </button>
                            <button
                                onClick={() => handleTierSelect('Senior')}
                                className={`w-full px-3 py-2 text-left text-[14px] hover:bg-gray-800 transition-colors last:rounded-b-[10px] ${selectedTier === 'Senior' ? 'text-white bg-gray-700' : 'text-gray-300'
                                    }`}
                            >
                                Senior
                            </button>
                        </div>
                    )}
                </div>
            </div>


            {/* Progress Summary */}
            {isGameDownloaded && (
                <div className="px-5 mt-4 space-y-3">
                    {/* Overall Progress Stats */}
                    <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 rounded-lg p-4 border border-purple-500/30">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-white text-sm font-semibold">📊 Your Progress</span>
                            <span className="text-green-400 text-xs font-medium">
                                {processedGoals.filter(g => g.isCompleted).length} / {processedGoals.length} Goals
                            </span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3 mb-2">
                            <div
                                className="bg-gradient-to-r from-green-400 to-blue-500 h-3 rounded-full transition-all duration-500"
                                style={{ width: `${(processedGoals.filter(g => g.isCompleted).length / processedGoals.length) * 100}%` }}
                            ></div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 mt-3">
                            <div className="text-center">
                                <div className="text-green-400 text-xs font-semibold">{processedGoals.filter(g => g.isCompleted).length}</div>
                                <div className="text-gray-400 text-[10px]">Completed</div>
                            </div>
                            <div className="text-center">
                                <div className="text-orange-400 text-xs font-semibold">{processedGoals.filter(g => g.isExpired).length}</div>
                                <div className="text-gray-400 text-[10px]">Expired</div>
                            </div>
                            <div className="text-center">
                                <div className="text-blue-400 text-xs font-semibold">{processedGoals.filter(g => g.taskStatus === 'pending').length}</div>
                                <div className="text-gray-400 text-[10px]">Pending</div>
                            </div>
                        </div>
                    </div>

                    {/* Earnings Summary */}
                    <div className=" mb-6 grid grid-cols-2 gap-3">
                        <div className="bg-gradient-to-br from-yellow-900/40 to-orange-900/40 rounded-lg p-3 border border-yellow-500/30">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-yellow-400 text-lg">💰</span>
                                <span className="text-white text-xs font-medium">Earned</span>
                            </div>
                            <div className="text-yellow-300 text-xl font-bold">${sessionCoins.toFixed(2)}</div>
                            <div className="text-gray-400 text-[10px] mt-1">Total Coins</div>
                        </div>

                        <div className="bg-gradient-to-br from-blue-900/40 to-indigo-900/40 rounded-lg p-3 border border-blue-500/30">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-blue-400 text-lg">⭐</span>
                                <span className="text-white text-xs font-medium">Earned</span>
                            </div>
                            <div className="text-blue-300 text-xl font-bold">{sessionXP}</div>
                            <div className="text-gray-400 text-[10px] mt-1">Total XP</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Active Levels */}
            <div className="relative flex flex-col gap-4 px-5">
                {/* Progress Line - Dynamic Height - Connects first to last card */}
                {activeLevels.length > 0 && (
                    <div
                        className="absolute left-[38px] top-6 z-0"
                        style={{
                            width: '2px',
                            height: `${activeLineHeight}px`
                        }}
                        title={`Active Line: ${activeLevels.length} cards, ${activeLineHeight}px height`}
                    >
                        {/* Pure CSS Line - No Image */}
                        <div
                            className="w-full h-full"
                            style={{
                                background: '#2f344a',
                                borderRadius: '1px'
                            }}
                        />
                    </div>
                )}

                {activeLevels.map((level, index) => (
                    <div key={level.id} className="flex items-center gap-3 w-full relative z-10">
                        {/* Level Number Circle with Status Indicator */}
                        <div className={`flex w-[38px] h-[38px] items-center justify-center rounded-full flex-shrink-0 relative ${level.isCompleted ? 'bg-green-600' :
                            level.isFailed || level.isExpired ? 'bg-red-600/50' :
                                'bg-[#2f344a]'
                            }`}>
                            {level.isCompleted ? (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            ) : level.isFailed || level.isExpired ? (
                                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            ) : (
                                <div className="font-semibold text-[#f4f3fc] text-[12px]">
                                    {level.id}
                                </div>
                            )}
                        </div>

                        {/* Level Card */}
                        <div className={`w-[256px] min-h-[75px] relative rounded-[10px] ${level.gradient} flex flex-col justify-between p-2 pb-2 ${isClaimed ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} ${level.isCompleted ? 'ring-2 ring-green-400' : ''}`}>
                            {/* Status Badge */}
                            {(level.isCompleted || level.isFailed || level.isExpired || level.isTurbo) && (
                                <div className="absolute -top-2 -right-2 z-10">
                                    {level.isCompleted && (
                                        <div className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                                            <span>✓</span>
                                        </div>
                                    )}
                                    {level.isFailed && (
                                        <div className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                                            <span>✗</span>
                                        </div>
                                    )}
                                    {level.isExpired && !level.isFailed && (
                                        <div className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                                            <span>⏱</span>
                                        </div>
                                    )}
                                    {level.isTurbo && !level.isCompleted && !level.isFailed && (
                                        <div className="bg-yellow-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg flex items-center gap-0.5">
                                            <span>⚡</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Top Row: Title and Reward */}
                            <div className="flex justify-between items-start gap-2 mb-1.5">
                                <div className="flex-1 min-w-0">
                                    <div className="font-normal text-[#f4f3fc] text-[13px] leading-tight line-clamp-2 pr-1">
                                        {level.title}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <div className={`font-semibold text-[15px] ${level.isCompleted ? 'text-yellow-300' : 'text-white'}`}>
                                        {level.reward}
                                    </div>
                                    <img
                                        className="w-[19px] h-[20px]"
                                        alt="Reward Icon"
                                        src={level.rewardImage}
                                    />
                                </div>
                            </div>

                            {/* Time Limit Row */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <img
                                        className="w-[14px] h-[14px] flex-shrink-0"
                                        alt="Clock"
                                        src="/assets/animaapp/ABnBdu2U/img/clock-10.svg"
                                    />
                                    <span className={`font-normal text-[11px] ${level.isExpired ? 'text-red-300 font-semibold' :
                                        level.days_left && level.days_left <= 3 ? 'text-orange-300 font-medium' :
                                            'text-[#f4f3fc]'
                                        }`}>
                                        {level.timeLimit}
                                    </span>
                                </div>

                                {/* Completion Status Indicator */}
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-gray-400">Completed:</span>
                                    <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${level.isCompleted
                                        ? 'bg-green-500 text-white'
                                        : level.isFailed
                                            ? 'bg-red-500 text-white'
                                            : level.isExpired
                                                ? 'bg-orange-500 text-white'
                                                : 'bg-gray-500 text-white'
                                        }`}>
                                        {level.isCompleted ? 'TRUE' : 'FALSE'}
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Row: XP Bonus */}
                            <div className="flex justify-center">
                                <div className="w-[89px] h-[22px]  top-2 relative">
                                    <div className="absolute top-0 left-[18px] w-[52px] h-[22px] bg-[#201f59] rounded-t-[4px] shadow-[0px_0px_4px_#fef47e33]" />
                                    <img className="absolute top-0.5 left-0 w-[19px] h-5" alt="Vector Left" src={level.vectorLeft} />
                                    <img className="absolute top-[3px] left-[70px] w-[18px] h-[19px]" alt="Vector Right" src={level.vectorRight} />
                                    <div className="absolute top-0 left-[18px] w-[52px] h-[22px] flex items-center justify-center space-x-1">
                                        <span className="font-medium text-white text-[13px]">{level.points}</span>
                                        <img className="w-4 h-[13px]" alt="XP Icon" src={level.pic} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Arrow between levels */}
                        {index < activeLevels.length - 1 && (
                            <div className="absolute top-[120px] left-[6.9px] z-20">
                                <img
                                    className="w-[23px] h-[23px]"
                                    alt="Arrow back ios new"
                                    src="/assets/animaapp/ABnBdu2U/img/arrow-back-ios-new-3-2x.png"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>
            {/* Claim Rewards Button */}
            {/* FIX: Claim Rewards Button - Aligned with the level layout structure */}
            <div className="flex w-full items-start gap-3 px-5 ">
                {/* Spacer to align with level cards, matches width of the level number circle */}
                <div className="w-[38px] flex-shrink-0" />

                {/* Container for the button, matches width of level cards */}
                <div className="w-[256px] relative rounded-[10px] flex items-center justify-center">
                    <div
                        className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded-[10px] shadow-[0px_4px_4px_#00000040] 
                             bg-[linear-gradient(141deg,#F4BB40_0%,#FBEA8D_80%,#F7CE46_98%,#F4BB40_100%)]
                        transition-all duration-200
                        ${isClaimed ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:scale-[1.02]'}`}
                    >
                        <p className="flex-1 text-center text-[10px] sm:text-xs md:text-sm font-semibold text-black [text-shadow:0px_2px_2px_#00000040] font-[Poppins] leading-tight">
                            Reach Here To Claim Your Rewards
                        </p>

                        <button
                            onClick={() => setShowRulesModal(true)}
                            disabled={isClaimed}
                            className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 bg-[#716ae7] rounded-full flex-shrink-0
                            hover:bg-[#5a52d4] transition-colors duration-200 
                            ${isClaimed ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                        >
                            <span className="text-white text-sm sm:text-base font-bold leading-none">﹖</span>
                        </button>
                    </div>
                </div>
            </div>


            {/* End & Claim Rewards Button - Hidden but functionality preserved */}
            <div className="hidden">
                <button
                    onClick={() => setShowClaimModal(true)}
                    disabled={!isMilestoneReached() || isClaimed || claiming}
                    className={`w-full h-12 rounded-lg font-semibold text-sm transition-all duration-200 ${isClaimed
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        : isMilestoneReached()
                            ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 shadow-lg'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {claiming ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Claiming Rewards...
                        </div>
                    ) : isClaimed ? (
                        '✅ Rewards Claimed'
                    ) : isMilestoneReached() ? (
                        '🎁 End & Claim Rewards'
                    ) : (
                        `Complete ${milestoneLevel} levels to unlock`
                    )}
                </button>
            </div>

            {/* Locked Levels */}
            <div className="relative flex flex-col gap-4 px-5 mt-6">
                {/* Progress Line for Locked Levels - Dynamic Height - Connects first to last card */}
                {lockedLevels.length > 0 && (
                    <div
                        className="absolute left-[38px] top-6 z-0 bg-[#2f344a] "
                        style={{
                            width: '2px',
                            height: `${lockedLineHeight}px`
                        }}
                        title={`Locked Line: ${lockedLevels.length} cards, ${lockedLineHeight}px height`}
                    >
                        {/* Pure CSS Line - No Image */}
                        <div
                            className="w-full h-full"
                            style={{
                                background: '#2f344a',
                                borderRadius: '1px'
                            }}
                        />
                    </div>
                )}

                {lockedLevels.map((level, index) => (
                    <div key={`locked-${index}`} className="flex items-center gap-3 w-full relative z-10">
                        <div className="flex w-[38px] h-[38px] items-center justify-center bg-[#2f344a] rounded-full flex-shrink-0 relative">
                            <div className="font-semibold text-[#f4f3fc] text-[12px]">
                                {level.id}
                            </div>
                            {/* Lock overlay */}
                            <div className="absolute inset-0 bg-[#d6d6d680] rounded-full flex items-center justify-center">
                                <img
                                    className="w-[28px] h-[28px]"
                                    alt="Lock Icon"
                                    src="/assets/animaapp/ABnBdu2U/img/image-3943-3-2x.png"
                                    loading="eager"
                                    decoding="async"
                                    width={28}
                                    height={28}
                                />
                            </div>
                        </div>

                        <div className={`w-[256px] min-h-[75px] relative rounded-[10px] ${level.gradient} flex flex-col justify-between p-2 pb-2 ${isClaimed ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                            {/* Real task content in background - same as active tasks */}
                            {/* Top Row: Title and Reward */}
                            <div className="flex justify-between items-start gap-2 mb-1.5">
                                <div className="flex-1 min-w-0">
                                    <div className="font-normal text-[#f4f3fc] text-[13px] leading-tight line-clamp-2 pr-1">
                                        {level.title}
                                    </div>
                                </div>

                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <div className="font-semibold text-[15px] text-white">
                                        {level.reward}
                                    </div>
                                    <img
                                        className="w-[19px] h-[20px]"
                                        alt="Reward Icon"
                                        src={level.rewardImage}
                                    />
                                </div>
                            </div>

                            {/* Time Limit Row */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-1.5">
                                    <img
                                        className="w-[14px] h-[14px] flex-shrink-0"
                                        alt="Clock"
                                        src="/assets/animaapp/ABnBdu2U/img/clock-10.svg"
                                    />
                                    <span className="font-normal text-[11px] text-[#f4f3fc]">
                                        {level.timeLimit}
                                    </span>
                                </div>
                            </div>

                            {/* Bottom Row: XP Bonus */}
                            <div className="flex justify-center">
                                <div className="w-[89px] h-[22px] top-2 relative">
                                    <div className="absolute top-0 left-[18px] w-[52px] h-[22px] bg-[#201f59] rounded-t-[4px] shadow-[0px_0px_4px_#fef47e33]" />
                                    <img className="absolute top-0.5 left-0 w-[19px] h-5" alt="Vector Left" src={level.vectorLeft} />
                                    <img className="absolute top-[3px] left-[70px] w-[18px] h-[19px]" alt="Vector Right" src={level.vectorRight} />
                                    <div className="absolute top-0 left-[18px] w-[52px] h-[22px] flex items-center justify-center space-x-1">
                                        <span className="font-medium text-white text-[13px]">{level.points}</span>
                                        <img className="w-4 h-[13px]" alt="XP Icon" src={level.pic} />
                                    </div>
                                </div>
                            </div>

                            {/* Lock overlay - slightly transparent */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[10px] bg-[#292929e6] p-2 pointer-events-none">
                                <p className="w-[220px] text-center font-semibold text-white text-sm">
                                    Unlock level by completing the above tasks
                                </p>
                            </div>
                        </div>

                        {/* Arrow between locked levels */}
                        {index < lockedLevels.length - 1 && (
                            <div className="absolute top-[120px] left-[6.9px] z-20">
                                <img
                                    className="w-[23px] h-[23px]"
                                    alt="Arrow back ios new"
                                    src="/assets/animaapp/ABnBdu2U/img/arrow-back-ios-new-3-2x.png"
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* End & Claim Rewards Button - Hidden but functionality preserved */}
            <div className="hidden">
                <button
                    onClick={() => setShowClaimModal(true)}
                    disabled={!isMilestoneReached() || isClaimed || claiming}
                    className={`w-full h-12 rounded-lg font-semibold text-sm transition-all duration-200 ${isClaimed
                        ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        : isMilestoneReached()
                            ? 'bg-gradient-to-r from-green-500 to-blue-500 text-white hover:from-green-600 hover:to-blue-600 shadow-lg'
                            : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        }`}
                >
                    {claiming ? (
                        <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Claiming Rewards...
                        </div>
                    ) : isClaimed ? (
                        '✅ Rewards Claimed'
                    ) : isMilestoneReached() ? (
                        '🎁 End & Claim Rewards'
                    ) : (
                        `Complete ${milestoneLevel} levels to unlock`
                    )}
                </button>
            </div>



            {/* Tooltip Modal */}
            {showTooltip && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-3">🎯 Milestone Information</h3>
                        <p className="text-gray-600 text-sm mb-4">
                            Once you reach this level, you'll be eligible to end this session and transfer your collected coins and XP to your wallet. After claiming, you won't be able to return to this game's reward flow. Choose wisely.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowTooltip(false)}
                                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Got it
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Claim Confirmation Modal */}
            {showClaimModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
                        <h3 className="text-lg font-bold text-gray-800 mb-3">🎁 Claim Your Rewards</h3>
                        <div className="bg-gray-100 rounded-lg p-4 mb-4">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Coins Earned:</span>
                                <span className="font-bold text-yellow-600">🎁 {sessionCoins}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">XP Earned:</span>
                                <span className="font-bold text-blue-600">⭐ {sessionXP}</span>
                            </div>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">
                            Once you claim these rewards, they will be added to your wallet and this game session will be locked. You won't be able to earn more rewards from this game.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowClaimModal(false)}
                                className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleClaimRewards}
                                disabled={claiming}
                                className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
                            >
                                {claiming ? 'Claiming...' : 'Claim Rewards'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rules Modal — rendered via portal so it always centres over the full screen */}
            <RulesModal
                isVisible={showRulesModal}
                onClose={() => setShowRulesModal(false)}
            />
        </div>
    );
};
