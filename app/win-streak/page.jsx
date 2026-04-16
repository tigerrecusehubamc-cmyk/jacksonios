"use client";
import React, { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSelector, useDispatch } from "react-redux";
import { onStreakMilestone } from "@/lib/adjustService";
import { Capacitor } from "@capacitor/core";
import { fetchStreakStatus } from "@/lib/redux/slice/streakSlice";
// import { getStreakHistory, getStreakLeaderboard } from "@/lib/api"; // commented — /api/streak/status now provides all data
import { TitleSection } from "./components/TitleSection";
import { ProgressSection } from "./components/ProgressSection";
import { RewardModal } from "./components/RewardModal";
import { InfoModal } from "./components/InfoModal";
import { HomeIndicator } from "@/components/HomeIndicator";
import { useAppLovinAds } from "@/hooks/useAppLovinAds";
import MockAdOverlay from "@/app/games/components/MockAdOverlay";

/**
 * 30-Day Win Streak Page
 * 
 * Main page component for the 30-day streak feature that:
 * - Displays streak progress with visual tree
 * - Shows completed days and milestones
 * - Handles reward claiming on milestones
 * - Manages streak resets and fallbacks
 * 
 * @component
 */
export default function WinStreakPage() {
    const router = useRouter();
    const dispatch = useDispatch();

    // Get data from Redux store — all from /api/streak/status
    const {
        currentStreak,
        completedDays,
        streakHistory,
        streakTree,
        rewards,
        progress,
        nextMilestone,
        daysRemaining,
        status,
        error: streakError,
    } = useSelector((state) => state.streak);

    // Local state for modals only
    const [showRewardModal, setShowRewardModal] = useState(false);
    const [showInfoModal, setShowInfoModal] = useState(false);
    const [rewardData, setRewardData] = useState(null);
    // const [leaderboard, setLeaderboard] = useState([]); // commented — not used
    // const [milestones, setMilestones] = useState([]); // commented — using streakTree from /api/streak/status

    // Ref for scrollable container
    const scrollContainerRef = useRef(null);
    const retryCountRef = useRef(0); // max 3 silent retries on failure
    const firedStreakMilestonesRef = useRef(new Set()); // prevent re-firing on re-fetch

    // Ads — same pattern as ChallengeModal
    const isWeb = !Capacitor.isNativePlatform();
    const [showMockAd, setShowMockAd] = useState(false);
    const watchAdShownRef = useRef(false); // prevent showing ad more than once per page visit

    const {
        isShowingAd,
        showAd,
        loadAd,
        clearError: clearAdError,
    } = useAppLovinAds();

    // Preload critical images for faster display
    useEffect(() => {
        const criticalImages = [
            "/tree.png",
            "/treasure.png",
            "/dollor.png",
            "/xp.svg",
            "/assets/animaapp/1RFP1hGC/img/image-4016-2x.png",
            "/assets/animaapp/1RFP1hGC/img/image-3996-2x.png",
            "/assets/animaapp/1RFP1hGC/img/close.svg",
            "/assets/animaapp/1RFP1hGC/img/vector-349.svg",
            "/assets/animaapp/1RFP1hGC/img/vector-350.svg",
            "/assets/animaapp/1RFP1hGC/img/vector-351.svg",
            "/assets/animaapp/1RFP1hGC/img/vector-352.svg"
        ];

        criticalImages.forEach((src) => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'image';
            link.href = src;
            link.fetchPriority = 'high';
            if (src.startsWith('http')) {
                link.crossOrigin = 'anonymous';
            }
            document.head.appendChild(link);
        });

        // Also preload using Image objects for immediate caching
        criticalImages.forEach((src) => {
            const img = new Image();
            img.src = src;
            if (src.startsWith('http')) {
                img.crossOrigin = 'anonymous';
            }
        });

        // Cleanup function to remove preload links on unmount
        return () => {
            document.querySelectorAll('link[rel="preload"][href*="tree.png"], link[rel="preload"][href*="treasure.png"], link[rel="preload"][href*="dollor.png"], link[rel="preload"][href*="xp.svg"], link[rel="preload"][href*="animaapp.com"]').forEach(link => link.remove());
        };
    }, []);

    // Fetch fresh data once every time the page is visited — show cached data immediately while loading
    // On failure: silently retry once after 3 seconds without showing error screen
    useEffect(() => {
        dispatch(fetchStreakStatus());
    }, []);

    useEffect(() => {
        if (status !== 'failed') return;
        if (retryCountRef.current >= 3) return; // stop after 3 retries
        retryCountRef.current += 1;
        const retryTimer = setTimeout(() => {
            dispatch(fetchStreakStatus());
        }, 3000);
        return () => clearTimeout(retryTimer);
    }, [status]);

    // commented — history/leaderboard no longer needed, /api/streak/status provides all data
    // useEffect(() => {
    //     if (status === 'succeeded' && currentStreak !== undefined) {
    //         loadAdditionalData();
    //     }
    // }, [status, currentStreak]);

    // Scroll to bottom when page loads/navigates
    useEffect(() => {
        // Wait for content to render, then scroll to bottom
        const scrollToBottom = () => {
            if (scrollContainerRef.current) {
                // Use setTimeout to ensure content is rendered
                setTimeout(() => {
                    if (scrollContainerRef.current) {
                        // Scroll to absolute bottom - use maximum scrollable position
                        const scrollHeight = scrollContainerRef.current.scrollHeight;
                        // Scroll to the absolute maximum position
                        scrollContainerRef.current.scrollTo({
                            top: scrollHeight, // Scroll to absolute bottom
                            behavior: 'smooth'
                        });
                    }
                }, 500); // Increased timeout to ensure all content is fully rendered
            }
        };

        // Scroll when component mounts
        scrollToBottom();

        // Also scroll when data is loaded
        if (status === 'succeeded') {
            scrollToBottom();
        }
    }, [status]);

    // Sync AppLovin showing state → mock overlay on web (same pattern as ChallengeModal)
    useEffect(() => {
        if (isWeb && isShowingAd) {
            setShowMockAd(true);
        } else if (isWeb && !isShowingAd && showMockAd) {
            setShowMockAd(false);
        }
    }, [isWeb, isShowingAd, showMockAd]);

    // Auto-trigger watch_ad when the LAST completed streak day is a milestone with claimMode === 'watch_ad'
    // currentStreak = last completed day number. If it lands exactly on a milestone day
    // that requires watch_ad, show the ad. Previous milestones are never re-triggered
    // because currentStreak only equals one day at a time.
    useEffect(() => {
        if (!currentStreak || !streakTree || streakTree.length === 0) return;
        if (watchAdShownRef.current) return; // only once per page visit

        const lastDay = streakTree.find(item => item.day === currentStreak);
        if (!lastDay) return;
        if (!lastDay.isMilestone || lastDay.claimMode !== 'watch_ad') return;

        watchAdShownRef.current = true;
        (async () => {
            clearAdError();
            const loaded = await loadAd();
            if (!loaded) return;
            await showAd({
                onReward: () => {
                    dispatch(fetchStreakStatus());
                },
                onError: () => {},
            });
        })();
    }, [currentStreak, streakTree]);

    // commented — replaced by /api/streak/status which returns streakTree + rewards directly
    // const loadAdditionalData = async () => { ... };
    // const getRewardFromMilestones = (day) => { ... };

    // Check for milestone rewards using streakTree from /api/streak/status
    useEffect(() => {
        if (!streakTree || streakTree.length === 0) return;
        const reachedItem = streakTree.find(
            item => item.isMilestone && item.isCompleted && item.rewards?.length > 0
        );
        if (reachedItem && !firedStreakMilestonesRef.current.has(reachedItem.day)) {
            firedStreakMilestonesRef.current.add(reachedItem.day);
            onStreakMilestone(reachedItem.day);
            const coins = reachedItem.rewards.find(r => r.type === 'coins')?.value || 0;
            const xp = reachedItem.rewards.find(r => r.type === 'xp')?.value || 0;
            setRewardData({ milestone: reachedItem.day, coins, xp, badge: `Day ${reachedItem.day} Champion!` });
            setShowRewardModal(true);
        }
    }, [streakTree]);

    // Build streak tree directly from /api/streak/status streakTree array
    const generateStreakTree = React.useMemo(() => {
        if (!streakTree || streakTree.length === 0) {
            // No data yet — return 30 empty days
            return Array.from({ length: 30 }, (_, i) => ({
                day: i + 1,
                isCompleted: false,
                isCurrent: false,
                isMilestone: [7, 14, 21, 30].includes(i + 1),
                reward: null,
            }));
        }
        return streakTree.map(item => {
            const coins = item.rewards?.find(r => r.type === 'coins')?.value || 0;
            const xp = item.rewards?.find(r => r.type === 'xp')?.value || 0;
            return {
                day: item.day,
                isCompleted: item.isCompleted,
                isCurrent: item.isCurrent,
                isMilestone: item.isMilestone,
                reward: item.isMilestone && (coins > 0 || xp > 0) ? { coins, xp } : null,
            };
        });
    }, [streakTree]);

    // Generate rewards data from /api/streak/status rewards[] array
    const generateRewards = () => {
        return (rewards || []).map(item => {
            const coins = item.rewards?.find(r => r.type === 'coins')?.value || 0;
            const xp = item.rewards?.find(r => r.type === 'xp')?.value || 0;
            return {
                day: item.day,
                isReached: item.isReached,
                isNext: item.isNext,
                reward: { coins, xp, badge: `Day ${item.day} Champion!` },
            };
        });
    };

    // Handle close button
    const handleClose = () => {
        router.back();
    };

    // Handle info icon tap
    const handleInfoClick = () => {
        setShowInfoModal(true);
    };

    // Handle reward modal close
    const handleRewardClaim = () => {
        setShowRewardModal(false);
        setRewardData(null);
    };

    // Handle mock ad complete/close (web only)
    const handleMockAdComplete = () => setShowMockAd(false);
    const handleMockAdClose = () => setShowMockAd(false);

    // Handle refresh
    const handleRefresh = () => {
        dispatch(fetchStreakStatus());
    };

    // Show loading state only if no data is available and we're loading
    // Only show full-screen loader on very first load (no cached data at all)
    if (status === 'loading' && streakTree.length === 0) {
        return (
            <div className="relative w-full min-h-screen bg-gradient-to-b from-gray-900 to-black overflow-hidden flex items-center justify-center">
                <div className="text-white text-center">
                    <div className="text-lg mb-2">🔄</div>
                    <div className="text-sm">Loading streak information...</div>
                </div>
            </div>
        );
    }

    // Only show full-screen error if there is no cached data at all
    // If cached streakTree exists, show it silently and retry in background
    if (status === 'failed' && streakError && streakTree.length === 0) {
        return (
            <div className="relative w-full min-h-screen bg-gradient-to-b from-gray-900 to-black overflow-hidden flex items-center justify-center">
                <div className="text-center p-4">
                    <div className="text-red-400 text-lg mb-4">❌</div>
                    <div className="text-white text-sm mb-4">{streakError}</div>
                    <button
                        onClick={handleRefresh}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        🔄 Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            {/* Background Overlay */}
            <div className="absolute inset-0  backdrop-blur-[5px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(5px)_brightness(100%)]" />

            {/* Main Content */}
            <div className="relative w-full max-w-[375px] mx-auto h-full flex flex-col">
                {/* Scrollable Content - everything scrolls together */}
                <div ref={scrollContainerRef} className="flex-1 relative overflow-y-auto">
                    {/* Header - scrolls with ladder */}
                    <div className="bg-gradient-to-b from-gray-900 to-transparent">
                        <TitleSection
                            currentStreak={currentStreak || 0}
                            onClose={handleClose}
                            onInfoClick={handleInfoClick}
                        />
                    </div>

                    {/* Ladder Section - scrolls with header */}
                    <ProgressSection
                        streakData={{
                            currentStreak,
                            completedDays,
                            streakTree: generateStreakTree,
                            rewards: generateRewards()
                        }}
                        streakHistory={streakHistory}
                        leaderboard={[]}
                        onRefresh={handleRefresh}
                    />

                    {/* Bottom Spacing - Increased for more scroll space */}
                    <div className="h-20">
                        <HomeIndicator />
                    </div>
                </div>
            </div>

            {/* Reward Modal */}
            {/* {showRewardModal && rewardData && (
                <RewardModal
                    isVisible={showRewardModal}
                    milestone={rewardData.milestone}
                    coins={rewardData.coins}
                    xp={rewardData.xp}
                    badge={rewardData.badge}
                    onClose={handleRewardClaim}
                />
            )} */}

            {/* Info Modal */}
            <InfoModal
                isVisible={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                milestones={[]}
            />

            {/* Mock Ad Overlay — web only, mirrors ChallengeModal pattern */}
            {isWeb && (
                <MockAdOverlay
                    isVisible={showMockAd}
                    onComplete={handleMockAdComplete}
                    onClose={handleMockAdClose}
                    duration={15}
                />
            )}
        </div>
    );
}
