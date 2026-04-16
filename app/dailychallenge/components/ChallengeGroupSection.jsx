import React from "react";
import Image from "next/image";
import { useSelector } from "react-redux";

export const ChallengeGroupSection = ({ streak }) => {
    // Read-only — DailyChallenge.jsx owns all fetchBonusDays dispatches
    const {
        bonusDays: bonusDaysData,
        bonusDaysStatus,
    } = useSelector((state) => state.dailyChallenge || {});

    // Extract bonus days array and current streak from Redux state
    const bonusDays = bonusDaysData?.bonusDays || [];
    const apiCurrentStreak = bonusDaysData?.currentStreak || null;

    // Generate milestones dynamically from bonus days - only use API data, no fallbacks
    const generateMilestones = () => {

        // Only use bonus days from API - no fallback to streak prop
        if (bonusDays.length > 0) {
            // Calculate positions dynamically based on number of bonus days
            const positions = bonusDays.length === 3
                ? ["7.35%", "50%", "92.65%"]  // Spread evenly for 3 milestones
                : bonusDays.length === 4
                    ? ["7.35%", "31.76%", "56.17%", "80.58%"]
                    : bonusDays.length === 5
                        ? ["7.35%", "31.76%", "56.17%", "80.58%", "90%"]
                        : bonusDays.map((_, index) => `${((index + 1) / (bonusDays.length + 1)) * 100}%`);

            const milestones = bonusDays.map((bonusDay, index) => {
                // Use direct coins and xp fields from simplified API response
                const coins = bonusDay.coins || 0;
                const xp = bonusDay.xp || 0;
                const rewardType = bonusDay.rewardType || null;

                const milestone = {
                    value: bonusDay.dayNumber,
                    leftPosition: positions[index] || `${((index + 1) / (bonusDays.length + 1)) * 100}%`,
                    isReached: bonusDay.isReached || false,
                    coins: coins,
                    xp: xp,
                    rewardType: rewardType,
                };
                return milestone;
            });
            return milestones;
        }
        return [];
    };

    const milestones = generateMilestones();

    // Only use current streak from API response - no fallback to streak prop
    const currentStreak = apiCurrentStreak !== null ? apiCurrentStreak : 0;

    // Calculate min and max milestone for progress calculation - only from API data
    const minMilestone = milestones.length > 0
        ? Math.min(...milestones.map(m => m.value))
        : 0;
    const maxMilestone = milestones.length > 0
        ? Math.max(...milestones.map(m => m.value))
        : 0;

    // Use API's progressPercentage directly — MUST NOT compute from currentStreak.
    // currentStreak can be > 0 even when today is not completed, in which case the
    // API returns progressPercentage: 0 and the bar must show 0% (TC-PB-01).
    let progressPercentage = 0;
    if (milestones.length > 0) {
        const sortedMilestones = [...milestones].sort((a, b) => a.value - b.value);
        const allReached = sortedMilestones.every(m => m.isReached);

        if (allReached) {
            progressPercentage = 100;
        } else {
            const firstUnreachedIdx = sortedMilestones.findIndex(m => !m.isReached);
            const firstUnreached = sortedMilestones[firstUnreachedIdx];
            const prevMilestone = firstUnreachedIdx > 0 ? sortedMilestones[firstUnreachedIdx - 1] : null;

            const bonusDay = bonusDays.find(b => b.dayNumber === firstUnreached.value);
            const apiProgress = bonusDay?.progressPercentage ?? 0;

            const targetVisual = parseFloat(firstUnreached.leftPosition);
            const startVisual = prevMilestone ? parseFloat(prevMilestone.leftPosition) : 0;

            progressPercentage = startVisual + (apiProgress / 100) * (targetVisual - startVisual);
        }

        progressPercentage = Math.max(0, Math.min(100, progressPercentage));
    }

    // Only show loading if we have NO cached data at all
    // This allows showing cached data immediately while refreshing in background
    const hasCachedData = bonusDaysData && bonusDays.length > 0;
    const isLoading = !hasCachedData && bonusDaysStatus === "loading";

    // Don't render if still loading (and no cache) or no milestones available
    if (isLoading || milestones.length === 0) {
        return null;
    }

    return (
        <section
            className="w-full max-w-[340px] h-[30px] flex mx-auto"
            role="region"
            aria-label="Challenge progress milestones"
        >
            <div className="flex-1 w-full relative">
                {/* Progress bar background - using RewardProgress design */}
                <div className="absolute w-full h-[25px] top-0 left-0">
                    <div className="relative w-full h-[25px]">
                        {/* Progress bar background - lighter colors */}
                        <div className="absolute w-full h-full rounded-full overflow-hidden ring-1 ring-[#a68b4a] bg-gradient-to-r from-[#6b5424] to-[#8b7332] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-1px_0_rgba(0,0,0,0.25)]"></div>

                        {/* Progress bar fill */}
                        <div
                            className="absolute h-full rounded-full bg-gradient-to-r from-[#ffd700] via-[#ffed4e] to-[#f4d03f] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                            style={{
                                width: `${progressPercentage}%`,
                            }}
                        ></div>

                        {/* Milestone indicators with treasure chests and rewards */}
                        {milestones.map((milestone, index) => {
                            const isCompleted = milestone.isReached;
                            const containerWidth = 340; // Max width of container
                            const position = parseFloat(milestone.leftPosition) / 100 * containerWidth; // Convert percentage to pixels
                            const isLastMilestone = index === milestones.length - 1;

                            // Green treasure chest images (for all except last)
                            const greenChestImages = [
                                "/assets/animaapp/b23YVSTi/img/2211-w030-n003-510b-p1-510--converted--02-2-2x.png", // Small green chest
                                "/assets/animaapp/b23YVSTi/img/2211-w030-n003-510b-p1-510--converted--02-3-2x.png", // Medium green chest
                                "/assets/animaapp/b23YVSTi/img/2211-w030-n003-510b-p1-510--converted--02-4-2x.png", // Large green chest
                            ];

                            // Golden treasure chest image (for last milestone) - use tesurebox.png
                            const goldenChestImage = "/tesurebox.png";

                            // Use golden chest for last milestone, green for others
                            const imageUrl = isLastMilestone
                                ? goldenChestImage
                                : greenChestImages[Math.min(index, greenChestImages.length - 1)];

                            // Calculate chest size based on index (progressive sizing)
                            // Last milestone (golden) should be same size as medium green chest
                            const chestSizes = [
                                { width: "31px", height: "35px" },
                                { width: "37px", height: "47px" },
                                { width: "55px", height: "58px" },
                            ];

                            // Use larger size for golden chest (last milestone)
                            const chestSize = isLastMilestone
                                ? { width: "55px", height: "58px" } // Larger size for golden
                                : (chestSizes[Math.min(index, chestSizes.length - 1)] || chestSizes[0]);

                            return (
                                <React.Fragment key={index}>
                                    {/* Reward image above milestone */}
                                    {imageUrl && (
                                        <img
                                            className="absolute"
                                            style={{
                                                // Align above the day number circle - adjust for golden chest size
                                                top: isLastMilestone ? "-64px" : (index === 0 ? "-40px" : index === 1 ? "-54px" : "-56px"),
                                                // Center the chest above the day number circle (15px is half of 30px circle)
                                                left: `${position - parseFloat(chestSize.width) / 2}px`,
                                                width: chestSize.width,
                                                height: chestSize.height,
                                                zIndex: isLastMilestone ? 15 : 10, // Higher z-index for golden treasure
                                                opacity: isCompleted ? 1 : 0.6, // Dim if not reached
                                                transform: 'translateX(0)', // Ensure proper centering
                                            }}
                                            alt={`Reward ${index + 1} - Day ${milestone.value} ${isLastMilestone ? '(Golden)' : '(Green)'}`}
                                            src={imageUrl}
                                            loading="eager"
                                            decoding="async"
                                            onError={(e) => {
                                                // Fallback to default chest image if custom image fails
                                                e.target.src = isLastMilestone
                                                    ? goldenChestImage
                                                    : greenChestImages[Math.min(index, greenChestImages.length - 1)];
                                            }}
                                        />
                                    )}

                                    {/* Milestone indicator circle with day number */}
                                    <div
                                        className="absolute w-[30px] h-[30px] top-[-3px] rounded-full border-2 flex items-center justify-center"
                                        style={{
                                            left: `${position - 15}px`, // Better centering to match chest positioning
                                            backgroundColor: isCompleted ? '#ffd700' : '#6b5424',
                                            borderColor: isCompleted ? '#b8860b' : '#a68b4a', // Match progress bar track border color
                                            zIndex: 5, // Ensure indicators are above progress bar
                                        }}
                                    >
                                        <div className="[font-family:'Poppins',Helvetica] font-semibold text-[14px] tracking-[0.02px] leading-[normal]"
                                            style={{
                                                color: isCompleted ? '#815c23' : '#ffffff'
                                            }}>
                                            {milestone.value}
                                        </div>
                                    </div>

                                    {/* Reward value below circle - white text with coin and xp images (vertical layout) */}
                                    {(milestone.coins > 0 || milestone.xp > 0) && (
                                        <div
                                            className="absolute top-[32px] flex flex-col items-center justify-center gap-0.5"
                                            style={{
                                                left: `${position - 20}px`,
                                                width: "40px",
                                                zIndex: 5,
                                            }}
                                        >
                                            {milestone.coins > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="[font-family:'Poppins',Helvetica] font-semibold text-[12px] tracking-[0.02px] leading-[normal] text-white">
                                                        {milestone.coins}
                                                    </span>
                                                    <Image
                                                        src="/dollor.png"
                                                        alt="Coins"
                                                        width={14}
                                                        height={14}
                                                        className="inline-block"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                </div>
                                            )}
                                            {milestone.xp > 0 && (
                                                <div className="flex items-center gap-1">
                                                    <span className="[font-family:'Poppins',Helvetica] font-semibold text-[12px] tracking-[0.02px] leading-[normal] text-white">
                                                        {milestone.xp}
                                                    </span>
                                                    <Image
                                                        src="/xp.svg"
                                                        alt="XP"
                                                        width={14}
                                                        height={14}
                                                        className="inline-block"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </div>
                </div>
            </div>
        </section>
    );
};
