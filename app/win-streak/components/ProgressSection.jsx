"use client";
import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
// import { getDailyActivityStats } from "@/lib/api"; // commented — /api/streak/status now provides currentStreak

/**
 * ProgressSection Component
 * 
 * Displays the vertical scrollable streak tree with:
 * - 30 day ladder numbered 1-30 from bottom to top
 * - Visual progress indicators based on API data
 * - Completed day checkmarks
 * - Milestone reward badges
 * - Path decoration images
 * - Uses daily activity stats API to track user activity streak
 * 
 * @param {object} streakData - Complete streak data from API
 * @param {array} streakHistory - Streak history data
 * @param {array} leaderboard - Leaderboard data
 * @param {function} onRefresh - Refresh handler 
 */
export const ProgressSection = ({
    streakData = null,
    streakHistory = [],
    leaderboard = [],
    onRefresh = () => { }
}) => {
    const scrollContainerRef = useRef(null);
    // const [activityStats, setActivityStats] = useState(null); // commented — using streakData.currentStreak from /api/streak/status
    // const [activityLoading, setActivityLoading] = useState(false); // commented
    const hasScrolledRef = useRef(false);

    // currentStreak comes directly from /api/streak/status via Redux
    const currentStreak = streakData?.currentStreak || 0;
    const streakTree = streakData?.streakTree || [];
    const rewards = streakData?.rewards || [];
    const progress = streakData?.progress || { current: 0, target: 7, percentage: 0 };


    // Check if day is completed using API data
    const isDayCompleted = (day) => {
        const dayData = streakTree.find(d => d.day === day);
        return dayData?.isCompleted || false;
    };

    // Check if day is current day
    const isCurrentDay = (day) => {
        const dayData = streakTree.find(d => d.day === day);
        return dayData?.isCurrent || false;
    };

    // Get the next day to start (when currentStreak is 0)
    const getNextDayToStart = () => {
        if (currentStreak === 0) {
            return 1; // Start from day 1
        }
        return currentStreak + 1; // Next day after current streak
    };

    // Check if day is milestone
    const isMilestoneDay = (day) => {
        const dayData = streakTree.find(d => d.day === day);
        return dayData?.isMilestone || false;
    };

    // Get reward for milestone day
    const getMilestoneReward = (day) => {
        const dayData = streakTree.find(d => d.day === day);
        return dayData?.reward || null;
    };

    // Check if day should show chest box (special milestone days)
    // Days are now 1-indexed (1-30)
    // Milestone days: 7, 14, 21, 30
    const shouldShowChestBox = (day) => {
        return [7, 14, 21, 30].includes(day);
    };

    // Get the appropriate icon for each day
    const getDayIcon = (day) => {
        if (shouldShowChestBox(day)) {
            return {
                type: 'chest',
                src: '/assets/animaapp/b23YVSTi/img/2211-w030-n003-510b-p1-510--converted--02-2-2x.png', // Using the actual treasure chest from ChallengeGroupSection
                alt: 'Treasure Chest'
            };
        } else {
            return {
                type: 'leaf',
                src: '/assets/animaapp/1RFP1hGC/img/image-4016-2x.png', // Using the actual leaf icon from decorative images
                alt: 'Leaf with Tick'
            };
        }
    };

    // Calculate vertical offset for each day to align circles with green parts on branch
    const getCircleOffset = (day) => {
        // Green parts are positioned on the branch image itself
        // Days are now 1-indexed (1-30)
        // Day 1 should start from the bottom green part on the branch
        // Adjust offsets to align circles with green parts on branch
        if (day === 1) {
            return 245; // Day 1 starts from bottom green part
        } else if (day === 2) {
            return 235; // Day 2 starts from bottom green part - reduced by 10px more
        } else if (day === 3) {
            return 230; // Day 3 - reduced by 10px more
        } else if (day === 4) {
            return 210; // Day 4 - moved upward by 10px
        } else if (day === 5) {
            return 200; // Day 5 - moved upward a little more (5px)
        } else if (day === 6) {
            return 188; // Day 6 - moved upward by 5px
        } else if (day === 7) {
            return 174; // Day 7 - reduced by 10px more
        } else if (day <= 9) {
            return 148; // Days 8-9 - reduced by 10px more
        } else if (day <= 11) {
            return 120; // Days 10-11
        } else if (day === 12) {
            return 112; // Day 12 - reduced by 10px more
        } else if (day === 13) {
            return 96; // Day 13
        } else if (day === 14) {
            return 80; // Day 14 - moved upward by 50px to fix overlap with day 13
        } else if (day === 15) {
            return 70; // Day 15 - moved upward by 30px
        } else if (day === 16) {
            return 60; // Day 16 - moved upward by 30px
        } else if (day === 17) {
            return 40; // Day 17 - moved upward by 30px
        } else if (day <= 19) {
            return 20; // Days 18-19
        } else if (day === 20) {
            return 6; // Day 20 - reduced by 10px more
        } else if (day === 21) {
            return -22; // Day 21 - moved down a little
        } else if (day === 22) {
            return -24; // Day 22 - moved upward by 10px
        } else if (day <= 24) {
            return -50; // Days 23-24 - reduced by 10px more
        } else if (day === 25) {
            return -60; // Day 25 - moved upward a little
        } else if (day === 26) {
            return -80; // Day 26 - reduced by 10px more
        } else if (day === 27) {
            return -90; // Day 27 - moved upward a little
        } else if (day === 28) {
            return -100; // Day 28 - reduced by 10px more
        } else if (day === 29) {
            return -120; // Day 29 - reduced by 10px more
        } else if (day === 30) {
            return -114; // Day 30 - reduced by 10px more
        }
    };

    // Generate all 30 days (Day 1 to Day 30) with proper spacing to match tree branch
    // Days are now 1-indexed: Day 1 at bottom, Day 30 at top
    // Memoized for performance - only recalculate when streakTree changes
    const allDays = useMemo(() => {
        const days = [];
        const startTop = 2637; // Start position for Day 1 at bottom
        const spacing = 87; // Space between days to fit tree branch

        // Generate Days 1-30 (Day 1 at bottom, Day 30 at top)
        for (let day = 1; day <= 30; day++) {
            // Day 1 at bottom (highest top value), Day 30 at top (lowest top value)
            // This ensures numbering starts from bottom: Day 1 is at the bottom, Day 30 at the top
            const top = startTop - ((day - 1) * spacing);

            days.push({
                day: day,
                top: top,
                left: 140, // Centered for mobile
                isCompleted: isDayCompleted(day),
                isCurrent: isCurrentDay(day),
                isMilestone: isMilestoneDay(day),
                reward: getMilestoneReward(day)
            });
        }
        return days;
    }, [streakTree]);

    // Preload images for faster display - optimized with link preload and early loading
    useEffect(() => {
        // Add link preload tags for critical images (browser-level preloading)
        const imageUrls = [
            { url: "/tree.png", as: "image" },
            { url: "/assets/animaapp/1RFP1hGC/img/image-4016-2x.png", as: "image" },
            { url: "/assets/animaapp/b23YVSTi/img/2211-w030-n003-510b-p1-510--converted--02-2-2x.png", as: "image" }
        ];

        imageUrls.forEach(({ url, as }) => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = as;
            link.href = url;
            link.fetchPriority = 'high';
            if (url.startsWith('http')) {
                link.crossOrigin = 'anonymous';
            }
            document.head.appendChild(link);
        });

        // Also preload using Image objects for immediate caching
        const treeImage = new Image();
        treeImage.src = "/tree.png";
        treeImage.fetchPriority = 'high';

        const leafImage = new Image();
        leafImage.src = "/assets/animaapp/1RFP1hGC/img/image-4016-2x.png";
        leafImage.crossOrigin = 'anonymous';
        leafImage.fetchPriority = 'high';

        const chestImage = new Image();
        chestImage.src = "/assets/animaapp/b23YVSTi/img/2211-w030-n003-510b-p1-510--converted--02-2-2x.png";
        chestImage.crossOrigin = 'anonymous';
        chestImage.fetchPriority = 'high';

        // Cleanup function to remove link tags when component unmounts
        return () => {
            document.querySelectorAll('link[rel="preload"][href*="tree.png"], link[rel="preload"][href*="animaapp.com"]').forEach(link => link.remove());
            document.querySelectorAll('link[rel="preconnect"][href*="animaapp.com"]').forEach(link => link.remove());
        };
    }, []);

    // commented — /api/streak/status already returns currentStreak, no need for separate activity stats call
    // useEffect(() => { fetchActivityStats(); }, []);

    // Auto-scroll to bottom of screen once when navigating to /win-streak
    useEffect(() => {
        if (scrollContainerRef.current && !hasScrolledRef.current) {
            // Small delay to ensure DOM is fully rendered
            const timer = setTimeout(() => {
                if (scrollContainerRef.current && !hasScrolledRef.current) {
                    // Scroll to the bottom of the screen smoothly
                    const scrollHeight = scrollContainerRef.current.scrollHeight;
                    const clientHeight = scrollContainerRef.current.clientHeight;
                    const scrollTo = scrollHeight - clientHeight;

                    scrollContainerRef.current.scrollTo({
                        top: scrollTo,
                        behavior: 'smooth'
                    });

                    // Mark as scrolled to prevent multiple scrolls
                    hasScrolledRef.current = true;
                }
            }, 100); // Small delay to ensure DOM is ready

            return () => clearTimeout(timer);
        }
    }, []); // Run once on mount only

    // Decorative images removed - only small icons next to each day number will be shown

    // Path images (vines) - connected seamlessly to make one long vertical image
    // Each image is scaled to width 85px, with height auto
    // Overlapping significantly (100px spacing) to ensure seamless connection and hide seams
    // Added extra images at the top to accommodate circle 30
    // Memoized for performance - static data doesn't need recalculation
    const pathImages = useMemo(() => {
        const images = [];
        const imageSpacing = 100; // Reduced spacing for better overlap
        const totalImages = 30; // Increased to cover full height including circle 30
        const startOffset = -200; // Start from negative to accommodate circle 30 at top

        for (let i = 0; i < totalImages; i++) {
            images.push({
                src: "/tree.png",
                top: startOffset + (i * imageSpacing),
                left: 55
            });
        }
        return images;
    }, []);

    return (
        <section
            ref={scrollContainerRef}
            className="w-full max-w-[375px] scrollbar-hide pt-[184px]"
            aria-label="Progress tracker"
        >
            <div className="w-full flex justify-center relative px-4 pt-0 ladder-3d" style={{ height: '2940px' }}>
                {/* Loading state handled by page.jsx Redux status */}

                {/* No Data State */}
                {streakData && streakTree.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-white bg-black/50 rounded-lg p-6">
                            <div className="text-4xl mb-4">🌱</div>
                            <div className="text-lg font-semibold mb-2">Start Your Streak Journey!</div>
                            <div className="text-sm text-gray-300 mb-4">Complete daily challenges to build your streak</div>
                            <button
                                onClick={onRefresh}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg"
                            >
                                🔄 Refresh
                            </button>
                        </div>
                    </div>
                )}

                {/* Path Images (Vines) */}
                {pathImages.map((image, index) => (
                    <img
                        key={`path-${index}`}
                        className="absolute pointer-events-none block"
                        style={{
                            top: `${image.top}px`,
                            left: image.left !== undefined ? `${image.left}px` : '0',
                            width: '85px',
                            height: 'auto',
                            display: 'block',
                            margin: 0,
                            padding: 0,
                            lineHeight: 0,
                            verticalAlign: 'top',
                            imageRendering: 'auto',
                            objectFit: 'cover',
                            objectPosition: 'center',
                            mixBlendMode: 'normal',
                        }}
                        alt=""
                        src={image.src}
                        loading={index < 10 ? "eager" : "lazy"}
                        decoding="async"
                        fetchPriority={index < 5 ? "high" : index < 10 ? "auto" : "low"}
                    />
                ))}

                {/* Connecting Lines - Fill gaps between path segments */}
                {/* <div className="absolute left-[140px] top-[100px] w-1 h-[1500px] bg-gradient-to-b from-green-600 via-green-500 to-green-400 opacity-60 z-5"></div> */}

                {/* Background Overlay to Hide Unused Tree/Stream Elements Below Day 1 */}
                {/* Day 1 position: top = 2600px, circle at 2600 + 100 = 2700px */}
                {/* <div
                    className="absolute w-full bg-black z-40"
                    style={{
                        top: `${2600 + 100 + 45 + 10}px`, // Below Day 1 circle with 10px margin
                        left: 0,
                        height: '80px', // Decreased height
                    }}
                ></div> */}

                {/* Decorative Images Removed - Only small icons next to day numbers are shown */}

                {/* All 30 Circles (Day 1-30) - Generated from API data */}
                {allDays.map((dayData) => (
                    <div key={dayData.day}>
                        {/* Day Circle - Dynamic Yellow Background with Green Border */}

                        <div
                            className={`absolute w-[45px] h-[45px] rounded-full z-40 flex items-center justify-center transform transition-all duration-300 ease-out hover:scale-110 day-circle-3d cursor-pointer bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-500 shadow-[0_8px_16px_rgba(251,191,36,0.4),0_4px_8px_rgba(245,158,11,0.3),inset_0_2px_4px_rgba(255,255,255,0.3)] border-2 border-green-500 hover:shadow-[0_12px_24px_rgba(251,191,36,0.6),0_6px_12px_rgba(245,158,11,0.4),inset_0_2px_4px_rgba(255,255,255,0.4)]`}
                            style={{
                                top: `${dayData.top + getCircleOffset(dayData.day)}px`,
                                left: `80px`,
                                animation: dayData.isCurrent ? 'circleMotion 2.5s ease-in-out infinite' : dayData.isCompleted ? 'circleMotion 3s ease-in-out infinite' : 'circleMotion 4s ease-in-out infinite'
                            }}
                        >
                            <div className="w-7 h-7 flex items-center justify-center [-webkit-text-stroke:1px_#1a1a1a] [font-family:'Passion_One',Helvetica] text-2xl tracking-[0] leading-none font-bold text-black z-30 drop-shadow-lg">
                                {dayData.day}
                            </div>
                        </div>



                        {/* Day Icons - Show leaves progressively based on current streak */}
                        {/* Only show leaf if day is within current streak range OR is a milestone day */}
                        {/* Uses activity stats to track user activity streak */}
                        {(dayData.day <= currentStreak || [7, 14, 21, 30].includes(dayData.day)) && (
                            <div
                                className="absolute flex items-center z-30 transform transition-all duration-300 hover:scale-110"
                                style={{
                                    top: `${dayData.top + getCircleOffset(dayData.day) - 38 - (dayData.day === 28 || dayData.day === 29 ? 15 : 0)}px`, // Aligned with circle position, moved up more
                                    left: `${[7, 14, 21, 30].includes(dayData.day) ? '120px' : '120px'}` // Move milestone days slightly left
                                }}
                            >
                                {/* Show leaf with treasure box for milestone days (7, 14, 21, 30) */}
                                {shouldShowChestBox(dayData.day) ? (
                                    <div className="relative group">
                                        {/* Leaf background - natural proportions - increased size */}
                                        <img
                                            className="w-[140px] h-[100px] object-contain drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                                            src="/assets/animaapp/1RFP1hGC/img/image-4016-2x.png"
                                            alt="Leaf with Treasure Box"
                                            style={{ aspectRatio: 'auto' }}
                                            loading="eager"
                                            decoding="async"
                                            fetchPriority="high"
                                        />
                                        {/* Treasure box overlay on the leaf - better proportioned - increased size */}
                                        <img
                                            className="absolute -top-6 left-1  w-[138px] h-[120px] object-contain transition-transform duration-300 group-hover:scale-110 drop-shadow-md z-10"
                                            src="/treasure.png"
                                            alt="Treasure Chest"
                                            style={{ imageRendering: 'crisp-edges', willChange: 'transform' }}
                                            loading="eager"
                                            decoding="async"
                                            fetchPriority="high"
                                        />
                                        {/* Show reward amount for milestone days - Coins and XP */}
                                        {dayData.reward && (
                                            <div className="absolute -top-1 -right-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full px-2 py-1 shadow-lg border-2 border-yellow-600 transform transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl z-20 flex items-center gap-1">
                                                <>
                                                    <span className="text-xs font-bold text-black">{dayData.reward.coins}</span>
                                                    <img className="w-3 h-3" alt="coin" src="/dollor.png" />
                                                </>
                                                <>
                                                    <span className="text-xs font-bold text-black">{dayData.reward.xp}</span>
                                                    <img className="w-3 h-3" alt="XP" src="/xp.svg" onError={(e) => { e.target.src = "/xp.png"; }} />
                                                </>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Regular leaf for other days within streak range - increased size */
                                    <div className="relative group">
                                        <img
                                            className="w-[150px] h-[80px] drop-shadow-lg transition-transform duration-300 group-hover:scale-105"
                                            src="/assets/animaapp/1RFP1hGC/img/image-4016-2x.png"
                                            alt="Leaf with Tick"
                                            loading="eager"
                                            decoding="async"
                                        />
                                        {/* Show "Next" indicator for the current day
                                        {dayData.isCurrent && !dayData.isCompleted && (
                                            <div className="absolute -top-2 -right-2 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full px-2 py-1 shadow-lg">
                                                <span className="text-xs font-bold text-white">Next</span>
                                            </div>
                                        )} */}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 8px 16px rgba(59, 130, 246, 0.4), 0 4px 8px rgba(37, 99, 235, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 12px 24px rgba(59, 130, 246, 0.6), 0 6px 12px rgba(37, 99, 235, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4);
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-3px);
          }
        }
        
        @keyframes glow {
          0%, 100% {
            box-shadow: 0 8px 16px rgba(251, 191, 36, 0.5), 0 4px 8px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.4);
          }
          50% {
            box-shadow: 0 12px 24px rgba(251, 191, 36, 0.7), 0 6px 12px rgba(245, 158, 11, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.5);
          }
        }
        
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-2px);
          }
        }
        
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        
        @keyframes circleMotion {
          0%, 100% {
            transform: translateY(0px) scale(1);
            box-shadow: 0 8px 16px rgba(251, 191, 36, 0.4), 0 4px 8px rgba(245, 158, 11, 0.3), inset 0 2px 4px rgba(255, 255, 255, 0.3);
            border-color: rgb(34, 197, 94);
          }
          25% {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 10px 20px rgba(251, 191, 36, 0.5), 0 5px 10px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.35);
            border-color: rgb(74, 222, 128);
          }
          50% {
            transform: translateY(-4px) scale(1.05);
            box-shadow: 0 12px 24px rgba(251, 191, 36, 0.6), 0 6px 12px rgba(245, 158, 11, 0.5), inset 0 2px 4px rgba(255, 255, 255, 0.4);
            border-color: rgb(96, 230, 153);
          }
          75% {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 10px 20px rgba(251, 191, 36, 0.5), 0 5px 10px rgba(245, 158, 11, 0.4), inset 0 2px 4px rgba(255, 255, 255, 0.35);
            border-color: rgb(74, 222, 128);
          }
        }
        
        .ladder-3d {
          perspective: 1000px;
          transform-style: preserve-3d;
        }
        
        .day-circle-3d {
          transform-style: preserve-3d;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .day-circle-3d:hover {
          transform: translateZ(10px) rotateX(5deg) rotateY(5deg);
        }
      `}</style>
        </section>
    );
};

