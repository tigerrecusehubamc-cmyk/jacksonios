"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { HomeIndicator } from "@/components/HomeIndicator";
import {
    getWalkathonStatus,
    joinWalkathon,
    syncWalkathonSteps,
    getWalkathonProgress,
    claimWalkathonReward,
    getWalkathonLeaderboard,
    getWalkathonRank,
} from "@/lib/api";
import { WalkathonHeader } from "./components/WalkathonHeader";
import { CircularProgressTracker } from "./components/CircularProgressTracker";
import { RewardTiersSection } from "./components/RewardTiersSection";
import { HealthKitIntegration } from "./components/HealthKitIntegration";
import { LeaderboardSection } from "./components/LeaderboardSection";
import { ActionButtons } from "./components/ActionButtons";
import { MilestoneCelebration } from "./components/MilestoneCelebration";
import { TabNavigation } from "./components/TabNavigation";

/**
 * Walkathon Page
 * Main page for step-based challenge with XP rewards
 */
export default function WalkathonPage() {
    const { token, user } = useAuth();
    const router = useRouter();

    // State management - loading starts as false since we use cached data
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isEligible, setIsEligible] = useState(false);
    const [isJoined, setIsJoined] = useState(false);
    const [isJoining, setIsJoining] = useState(false);
    const [isClaiming, setIsClaiming] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Walkathon data
    const [walkathon, setWalkathon] = useState(null);
    const [progress, setProgress] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(null);
    const [newMilestones, setNewMilestones] = useState([]);
    
    // Tab state
    const [activeTab, setActiveTab] = useState("milestones");

    // Tab change handler - inline switch (no page navigation)
    const handleTabChange = useCallback((tabId) => {
        setActiveTab(tabId);
    }, []);

    // Debug logging helper - useCallback to prevent recreation
    const logWalkathon = useCallback((label, data) => {
        console.log(`[🚶 WALKATHON] ${label}`, data);
    }, []);

    // Log component mount/unmount
    useEffect(() => {
        logWalkathon("Component Mounted", { token: !!token, user: user?.id || "N/A" });
        return () => {
            logWalkathon("Component Unmounted", {});
        };
    }, [logWalkathon, token, user?.id]);

    // Load walkathon status
    const loadWalkathonStatus = useCallback(async () => {
        if (!token) {
            logWalkathon("Status Load Skipped", { reason: "No token" });
            return;
        }

        try {
            logWalkathon("Loading Status", { timestamp: new Date().toISOString() });
            // Don't set loading=true - we use cached data, so don't show loading state
            setError(null);

            const response = await getWalkathonStatus(token);
            logWalkathon("Status API Response", { response });

            // Check if API returned an error
            if (response.success === false) {
                logWalkathon("❌ API Error Response", {
                    success: response.success,
                    error: response.error,
                    message: response.message,
                    status: response.status,
                    body: response.body,
                    troubleshooting: [
                        "Check backend logs for errors",
                        "Verify API endpoint is working",
                        "Check authentication token is valid"
                    ]
                });

                console.error("Walkathon API error:", response);
                setIsEligible(false);
                setError(response.error || response.message || "Failed to load walkathon status.");
                setLoading(false);
                return;
            }

            // Backend returns { success: true, data: {...} }
            if (response.success && response.data) {
                const { data } = response;

                logWalkathon("📥 Full Status Response Structure", {
                    hasSuccess: response.success,
                    hasData: !!response.data,
                    dataKeys: Object.keys(data || {}),
                    hasActiveWalkathon: data.hasActiveWalkathon
                });

                if (data.hasActiveWalkathon) {
                    logWalkathon("✅ Active Walkathon Found", {
                        walkathonId: data.walkathon?.id,
                        walkathonTitle: data.walkathon?.title,
                        eligibility: data.eligibility?.isEligible
                    });

                    setIsEligible(data.eligibility?.isEligible || false);
                    setWalkathon(data.walkathon);

                    // Check if user has progress (has joined)
                    const hasProgress = data.userProgress && data.userProgress.hasProgress;
                    setIsJoined(hasProgress);
                    
                    if (hasProgress) {
                        logWalkathon("User Has Progress", {
                            totalSteps: data.userProgress.progress?.totalSteps,
                            milestonesReached: data.userProgress.progress?.milestonesReached?.length || 0
                        });

                        setProgress(data.userProgress.progress);
                        setUserRank(data.userProgress.userRank);
                        setTimeRemaining(data.userProgress.timeRemaining);
                    } else {
                        logWalkathon("User Not Joined Yet", {});
                    }

                    // Save to cache
                    try {
                        const cacheData = {
                            data: {
                                walkathon: data.walkathon,
                                progress: data.userProgress?.progress || null,
                                leaderboard: [],
                                userRank: data.userProgress?.userRank || null,
                                timeRemaining: data.userProgress?.timeRemaining || null,
                                isJoined: hasProgress,
                                isEligible: data.eligibility?.isEligible || false,
                            },
                            cacheTime: Date.now(),
                        };
                        localStorage.setItem("walkathon_cache", JSON.stringify(cacheData));
                    } catch (_e) {}

                    // Load leaderboard
                    await loadLeaderboard();
                    
                    // If joined, load fresh progress
                    if (hasProgress) {
                        await loadProgress();
                    }
                } else {
                    logWalkathon("❌ No Active Walkathon", {
                        hasActiveWalkathon: data.hasActiveWalkathon,
                        message: data.message,
                        eligibility: data.eligibility
                    });

                    setIsEligible(false);
                    setError(data.message || data.eligibility?.reason || "No active walkathon found.");
                }
            } else {
                logWalkathon("❌ Unexpected Response Structure", {
                    hasSuccess: response?.success,
                    hasData: !!response?.data
                });
                setIsEligible(false);
                setError("Invalid response from server.");
            }
        } catch (err) {
            console.error("Error loading walkathon status:", err);
            setError(err.message || "Failed to load walkathon.");
            setIsEligible(false);
        }
    }, [token, logWalkathon]);

    // Load user progress
    const loadProgress = useCallback(async () => {
        if (!token) {
            logWalkathon("Progress Load Skipped", { reason: "No token" });
            return;
        }

        try {
            logWalkathon("Loading Progress", { timestamp: new Date().toISOString() });
            const response = await getWalkathonProgress(token);
            logWalkathon("Progress API Response", { response });

            if (response.success && response.data) {
                const { data } = response;

                if (data.hasProgress) {
                    logWalkathon("Progress Updated", {
                        totalSteps: data.progress?.totalSteps || data.progress?.totalStepsCompleted || 0,
                        milestonesReached: data.progress?.milestonesReached?.length || 0
                    });

                    setProgress(data.progress);
                    setUserRank(data.userRank);
                    setTimeRemaining(data.timeRemaining);
                    // Don't set isJoined here - let handleJoin control it

                    // Save progress to cache
                    try {
                        const cached = localStorage.getItem("walkathon_cache");
                        if (cached) {
                            const parsed = JSON.parse(cached);
                            if (parsed?.data) {
                                parsed.data.progress = data.progress;
                                parsed.data.userRank = data.userRank;
                                parsed.data.timeRemaining = data.timeRemaining;
                                parsed.data.isJoined = true;
                                parsed.cacheTime = Date.now();
                                localStorage.setItem("walkathon_cache", JSON.stringify(parsed));
                            }
                        }
                    } catch (_e) {}
                } else {
                    logWalkathon("No Progress Found", { userNotJoined: true });
                    setIsJoined(false);
                }
            }
        } catch (err) {
            logWalkathon("Progress Load Error", { error: err.message });
            if (err.message?.includes("not joined") || err.message?.includes("not found")) {
                setIsJoined(false);
            }
        }
    }, [token, logWalkathon]);

    // Load leaderboard
    const loadLeaderboard = useCallback(async () => {
        if (!token) {
            logWalkathon("Leaderboard Load Skipped", { reason: "No token" });
            return;
        }

        try {
            logWalkathon("Loading Leaderboard", { timestamp: new Date().toISOString() });
            const response = await getWalkathonLeaderboard(token);
            logWalkathon("Leaderboard API Response", { response });

            if (response.success && response.data) {
                const { data } = response;

                logWalkathon("Leaderboard Updated", {
                    totalParticipants: data.totalParticipants,
                    leaderboardEntries: data.leaderboard?.length || 0
                });

                setLeaderboard(data.leaderboard || []);

                // Update walkathon total participants if available
                if (data.totalParticipants !== undefined && walkathon) {
                    setWalkathon(prev => prev ? {
                        ...prev,
                        totalParticipants: data.totalParticipants
                    } : null);
                }

                // Save leaderboard to cache
                try {
                    const cached = localStorage.getItem("walkathon_cache");
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        if (parsed?.data) {
                            parsed.data.leaderboard = data.leaderboard || [];
                            parsed.data.totalParticipants = data.totalParticipants;
                            parsed.cacheTime = Date.now();
                            localStorage.setItem("walkathon_cache", JSON.stringify(parsed));
                        }
                    }
                } catch (_e) {}
            }
        } catch (err) {
            logWalkathon("Leaderboard Load Error", { error: err.message });
        }
    }, [token, logWalkathon, walkathon]);

    // Join walkathon handler
    const handleJoin = useCallback(async () => {
        if (!token) {
            logWalkathon("Join Skipped", { reason: "No token" });
            return;
        }
        if (isJoining) {
            logWalkathon("Join Skipped", { reason: "Already joining" });
            return;
        }

        try {
            logWalkathon("Joining Walkathon", { timestamp: new Date().toISOString() });
            setIsJoining(true);
            setError(null);
            setLoading(true); // Show loading state while all data loads

            const response = await joinWalkathon(token);
            logWalkathon("Join API Response", { response });

            if (response.success === false) {
                const errorMessage = response.error || response.message || response.body?.error || "Failed to join walkathon";
                logWalkathon("Join Failed", {
                    message: errorMessage,
                    status: response.status,
                    body: response.body
                });
                setError(errorMessage);
                setLoading(false);
                return;
            }

            if (response.success && response.data) {
                const { data } = response;

                if (data.success) {
                    logWalkathon("Join Success, Loading All Data", {
                        totalSteps: data.progress?.totalSteps || 0,
                        message: data.message
                    });

                    // Clear cache to force fresh fetch
                    localStorage.removeItem("walkathon_cache");
                    
                    // Load all data first before showing joined state
                    await loadProgress();
                    await loadLeaderboard();
                    
                    // Now set joined = true after all data is loaded
                    setIsJoined(true);
                    setLoading(false);
                    logWalkathon("Join Complete - All Data Loaded, Showing Main Screen", {});
                } else {
                    logWalkathon("Join Failed", { message: data.message });
                    setError(data.message || "Failed to join walkathon");
                    setLoading(false);
                }
            }
        } catch (err) {
            logWalkathon("Join Error", { error: err.message });
            setError(err.message || "Failed to join walkathon");
            setLoading(false);
        } finally {
            setIsJoining(false);
        }
    }, [token, isJoining, logWalkathon, loadProgress, loadLeaderboard]);

    // Sync steps from HealthKit
    const handleStepsSynced = useCallback(async (stepData) => {
        if (!token) {
            logWalkathon("Sync Skipped", { reason: "No token" });
            return;
        }
        if (!isJoined) {
            logWalkathon("Sync Skipped", { reason: "User not joined" });
            return;
        }

        try {
            logWalkathon("Syncing Steps", {
                steps: stepData.steps,
                date: stepData.date,
                source: stepData.source
            });

            setIsSyncing(true);
            setError(null);

            const response = await syncWalkathonSteps(stepData, token);
            logWalkathon("Sync API Response", { response });

            if (response.success === false) {
                const errorMessage = response.error || response.message || response.body?.error || "Failed to sync steps";
                logWalkathon("Sync Failed", {
                    message: errorMessage,
                    status: response.status,
                    body: response.body
                });
                setError(errorMessage);
                return response;
            }

            if (response.success && response.data) {
                const { data } = response;

                if (data.success) {
                    logWalkathon("Sync Success", {
                        newTotalSteps: data.progress?.totalSteps || data.progress?.totalStepsCompleted || 0,
                        newMilestonesCount: data.newMilestones?.length || 0
                    });

                    setProgress(data.progress);

                    // Show milestone celebration if new milestones reached
                    if (data.newMilestones && data.newMilestones.length > 0) {
                        logWalkathon("🎉 New Milestones Reached", {
                            milestones: data.newMilestones,
                            count: data.newMilestones.length
                        });
                        setNewMilestones(data.newMilestones);
                    }

                    // Clear cache and reload
                    localStorage.removeItem("walkathon_cache");
                    await loadProgress();
                    await loadLeaderboard();
                    return response;
                } else {
                    logWalkathon("Sync Failed", { message: data.message });
                    setError(data.message || "Failed to sync steps");
                    return response;
                }
            }

            return response;
        } catch (err) {
            logWalkathon("Sync Error", { error: err.message });
            setError(err.message || "Failed to sync steps");
            throw err;
        } finally {
            setIsSyncing(false);
        }
    }, [token, isJoined, logWalkathon, loadProgress, loadLeaderboard]);

    // Claim reward for a milestone
    const handleClaimReward = useCallback(async (milestone) => {
        if (!token) {
            logWalkathon("Claim Skipped", { reason: "No token" });
            return;
        }
        if (isClaiming) {
            logWalkathon("Claim Skipped", { reason: "Already claiming" });
            return;
        }

        try {
            logWalkathon("Claiming Reward", {
                milestone: typeof milestone === 'number' ? milestone : milestone.stepMilestone || milestone
            });

            setIsClaiming(true);
            setError(null);

            const response = await claimWalkathonReward(milestone, token);
            logWalkathon("Claim API Response", { response });

            if (response.success && response.data) {
                const { data } = response;

                if (data.success) {
                    logWalkathon("✅ Reward Claimed Successfully", {
                        reward: data.reward,
                        xpReward: data.reward?.xpReward || 0
                    });

                    // Clear cache and reload
                    localStorage.removeItem("walkathon_cache");
                    await loadProgress();
                    await loadLeaderboard();
                } else {
                    logWalkathon("Claim Failed", { message: data.message });
                    setError(data.message || "Failed to claim reward");
                }
            }
        } catch (err) {
            logWalkathon("Claim Error", { error: err.message });
            setError(err.message || "Failed to claim reward");
        } finally {
            setIsClaiming(false);
        }
    }, [token, isClaiming, logWalkathon, loadProgress, loadLeaderboard]);

    // Claim all available rewards
    const handleClaimAll = useCallback(async () => {
        if (!progress?.availableRewards || progress.availableRewards.length === 0) {
            return;
        }

        for (const reward of progress.availableRewards) {
            await handleClaimReward(reward.stepMilestone);
        }
    }, [progress, handleClaimReward]);

    // View full leaderboard (disabled - showing inline now)
    const handleViewFullLeaderboard = useCallback(() => {
        // Navigation disabled - leaderboard shown inline
    }, []);

    // Load from localStorage cache immediately for instant display (stale-while-revalidate)
    useEffect(() => {
        try {
            const CACHE_KEY = "walkathon_cache";
            const cachedData = localStorage.getItem(CACHE_KEY);
            if (cachedData) {
                const parsed = JSON.parse(cachedData);
                const cacheAge = Date.now() - (parsed.cacheTime || 0);
                const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

                if (parsed.data && cacheAge < CACHE_TTL * 2) {
                    const { walkathon: cachedWalkathon, progress: cachedProgress, leaderboard: cachedLeaderboard, userRank: cachedRank, timeRemaining: cachedTime, isJoined: cachedJoined, isEligible: cachedEligible } = parsed.data;
                    
                    if (cachedWalkathon) setWalkathon(cachedWalkathon);
                    if (cachedProgress) setProgress(cachedProgress);
                    if (cachedLeaderboard) setLeaderboard(cachedLeaderboard);
                    if (cachedRank) setUserRank(cachedRank);
                    if (cachedTime) setTimeRemaining(cachedTime);
                    if (cachedJoined !== undefined) setIsJoined(cachedJoined);
                    if (cachedEligible !== undefined) setIsEligible(cachedEligible);
                    
                    logWalkathon("Loaded from cache", { cacheAge, cachedWalkathon: !!cachedWalkathon });
                }
            }
        } catch (err) {
            // Cache load failed - continue with API fetch
        }
    }, [logWalkathon]);

    // Initialize - load data on mount
    useEffect(() => {
        if (token) {
            logWalkathon("Initializing Walkathon Page", { token: !!token });
            loadWalkathonStatus();
        } else {
            logWalkathon("Initialization Skipped", { reason: "No token" });
        }
    }, [token, loadWalkathonStatus, logWalkathon]);

    // Auto-refresh disabled - using cache system instead for instant load
    // Data refreshes when user performs actions or on app focus

    // Calculate level from progress
    const getCurrentLevel = useCallback(() => {
        if (!progress) return { level: 1, progress: 0, max: 3 };

        const claimedCount = Array.isArray(progress.rewardsClaimed)
            ? progress.rewardsClaimed.length
            : 0;

        const level = Math.floor(claimedCount / 3) + 1;
        const levelProgress = claimedCount % 3;
        return { level, progress: levelProgress, max: 3 };
    }, [progress]);

    const levelInfo = getCurrentLevel();

    // Log render state changes - stable hook at bottom
    useEffect(() => {
        logWalkathon("Render State", {
            loading,
            isEligible,
            isJoined,
            isJoining,
            isClaiming,
            isSyncing,
            hasWalkathon: !!walkathon,
            hasProgress: !!progress,
            totalSteps: progress?.totalSteps || progress?.totalStepsCompleted || 0,
            leaderboardCount: leaderboard.length,
            userRank
        });
    }, [loading, isEligible, isJoined, isJoining, isClaiming, isSyncing, walkathon, progress, leaderboard.length, userRank, logWalkathon]);

    // Loading state - show skeleton on initial load or while joining
    if ((loading && !walkathon) || isJoining) {
        return (
            <div className="relative w-full min-h-screen bg-black pb-[150px]">
                <WalkathonHeader title="Walkathon" />
                <div className="flex flex-col w-full max-w-[375px] mx-auto items-center gap-6 pt-20 px-0">
                    {/* Walking Animation */}
                    <div className="relative w-40 h-40 flex items-center justify-center">
                        {/* Footsteps animation */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <motion.div
                                    key={i}
                                    className="absolute"
                                    style={{
                                        left: `${50 + Math.cos((i * 72) * Math.PI / 180) * 40}%`,
                                        top: `${50 + Math.sin((i * 72) * Math.PI / 180) * 40}%`,
                                    }}
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ 
                                        scale: [0, 1.2, 1],
                                        opacity: [0, 1, 0.7]
                                    }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                        delay: i * 0.3,
                                        ease: "easeOut"
                                    }}
                                >
                                    <span className="text-2xl">👣</span>
                                </motion.div>
                            ))}
                        </div>
                        
                        {/* Center walking person */}
                        <motion.div
                            animate={{ 
                                y: [0, -8, 0],
                                scale: [1, 1.05, 1]
                            }}
                            transition={{
                                duration: 1.2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="text-6xl z-10"
                        >
                            🚶
                        </motion.div>
                    </div>

                    {/* Loading text with step counter animation */}
                    <motion.div
                        className="text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <p className="text-white font-semibold text-lg mb-2">
                            {isJoining ? "Joining Walkathon..." : "Loading..."}
                        </p>
                        <motion.p
                            className="text-orange-400 text-sm"
                            animate={{ opacity: [0.5, 1, 0.5] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        >
                            👟 Getting your steps ready
                        </motion.p>
                    </motion.div>

                    {/* Animated step counter */}
                    <motion.div
                        className="flex items-center gap-2 text-gray-400 text-xs"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        {[1, 2, 3].map((_, i) => (
                            <motion.div
                                key={i}
                                className="w-2 h-2 bg-orange-500 rounded-full"
                                animate={{ 
                                    scale: [1, 1.5, 1],
                                    opacity: [0.3, 1, 0.3]
                                }}
                                transition={{
                                    duration: 1,
                                    repeat: Infinity,
                                    delay: i * 0.3
                                }}
                            />
                        ))}
                    </motion.div>
                </div>
                <HomeIndicator activeTab="home" />
            </div>
        );
    }

    // Error or not eligible state
    if (error || !isEligible || !walkathon) {
        return (
            <div className="relative w-full min-h-screen bg-black pb-[150px]">
                <WalkathonHeader title="Walkathon" />
                <div className="flex flex-col items-center justify-center px-4 py-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center"
                    >
                        <div className="text-6xl mb-4">🚶</div>
                        <h2 className="text-white text-2xl font-bold mb-2">
                            {error ? " Walkathon" : "Not Available"}
                        </h2>
                        <p className="text-gray-400 text-sm mb-6">
                            {error ||
                                "Walkathon is not currently available or you're not eligible."}
                        </p>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => router.back()}
                            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg"
                        >
                            Go Back
                        </motion.button>
                    </motion.div>
                </div>
                <HomeIndicator activeTab="home" />
            </div>
        );
    }

    // Extract progress data
    const milestonesReached = Array.isArray(progress?.milestonesReached)
        ? progress.milestonesReached
        : [];
    const rewardsClaimed = Array.isArray(progress?.rewardsClaimed)
        ? progress.rewardsClaimed.map(r => typeof r === 'object' ? r.milestone : r)
        : [];
    const availableRewards = Array.isArray(progress?.availableRewards)
        ? progress.availableRewards
        : [];
    const rewardTiers = Array.isArray(walkathon?.rewardTiers)
        ? walkathon.rewardTiers
        : [];
    const totalSteps = progress?.totalSteps || progress?.totalStepsCompleted || 0;
    const nextMilestone = progress?.nextMilestone || null;
    const progressPercentage = progress?.progressPercentage || 0;

    return (
        <div className="relative w-full min-h-screen bg-black pb-[150px] animate-fade-in">
            <div className="flex flex-col w-full max-w-[375px] mx-auto items-center gap-6 pt-4 px-0">
                {/* Header */}
                <WalkathonHeader title={walkathon.title || "Walkathon Challenge"} />

                {/* Error Message */}
                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="w-full px-4"
                        >
                            <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-3">
                                <p className="text-red-400 text-sm">{error}</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Walkathon Description */}
                {walkathon.description && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full px-4"
                    >
                        <p className="text-gray-300 text-sm text-center">
                            {walkathon.description}
                        </p>
                    </motion.div>
                )}

                {/* Time Remaining */}
                {timeRemaining && !timeRemaining.isExpired && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="w-full px-4"
                    >
                        <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-3 text-center">
                            <p className="text-orange-400 text-sm font-semibold">
                                {timeRemaining.days}d {timeRemaining.hours}h{" "}
                                {timeRemaining.minutes}m remaining
                            </p>
                        </div>
                    </motion.div>
                )}

                {/* HealthKit Integration */}
                <HealthKitIntegration
                    onStepsSynced={handleStepsSynced}
                    token={token}
                    onError={setError}
                    isJoined={isJoined}
                />

                {/* Circular Progress Tracker */}
                {isJoined && (
                    <CircularProgressTracker
                        totalSteps={totalSteps}
                        currentLevel={levelInfo.level}
                        levelProgress={levelInfo.progress}
                        levelMax={levelInfo.max}
                        nextMilestone={nextMilestone}
                        milestones={rewardTiers}
                        rewardsClaimed={rewardsClaimed}
                        progressPercentage={progressPercentage}
                    />
                )}

                {/* Action Buttons */}
                <ActionButtons
                    isJoined={isJoined}
                    hasAvailableRewards={availableRewards.length > 0}
                    availableRewards={availableRewards}
                    onJoin={handleJoin}
                    onClaimAll={handleClaimAll}
                    isJoining={isJoining}
                    isClaiming={isClaiming}
                    nextMilestone={nextMilestone}
                    totalSteps={totalSteps}
                />

                {/* Tab Navigation - inline switch */}
                {isJoined && (
                    <TabNavigation
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                )}

                {/* Tab Content - inline switching */}
                <div className="w-full">
                    {activeTab === "milestones" ? (
                        <RewardTiersSection
                            rewardTiers={rewardTiers}
                            milestonesReached={milestonesReached}
                            rewardsClaimed={rewardsClaimed}
                            onClaimReward={handleClaimReward}
                            isClaiming={isClaiming}
                            showHeader={true}
                        />
                    ) : (
                        <LeaderboardSection
                            leaderboard={leaderboard}
                            userRank={userRank}
                            totalParticipants={walkathon?.totalParticipants || 0}
                            onViewFullLeaderboard={handleViewFullLeaderboard}
                            weekKey={walkathon?.weekKey || ""}
                            showHeader={true}
                        />
                    )}
                </div>
            </div>

            {/* Milestone Celebration Modal */}
            <MilestoneCelebration
                milestones={newMilestones}
                onClose={() => setNewMilestones([])}
            />

            <HomeIndicator activeTab="home" />
        </div>
    );
}
