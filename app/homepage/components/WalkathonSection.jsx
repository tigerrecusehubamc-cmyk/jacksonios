"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { getWalkathonStatus } from "@/lib/api";

/**
 * Walkathon Preview Section
 * Displays on homepage - tapping redirects to full Walkathon screen
 * Only shows if user is eligible
 */
const WalkathonSection = () => {
    const router = useRouter();
    const { token } = useAuth();
    const [isEligible, setIsEligible] = useState(false);
    const [walkathon, setWalkathon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [userProgress, setUserProgress] = useState(null);
    const [showInfo, setShowInfo] = useState(false);

    // Load walkathon status to check eligibility
    useEffect(() => {
        const loadWalkathonStatus = async () => {
            if (!token) {
                setLoading(false);
                return;
            }

            try {
                const response = await getWalkathonStatus(token);

                if (response.success && response.data) {
                    const { data } = response;

                    // Check multiple possible response structures
                    const hasActiveWalkathon = data.hasActiveWalkathon || data.isActive || data.active;
                    const isEligible = data.eligibility?.isEligible !== false; // Default to true if not specified

                    if (hasActiveWalkathon) {
                        setIsEligible(true);
                        setWalkathon(data.walkathon || data);

                        // Set user progress if they've joined
                        if (data.userProgress) {
                            if (data.userProgress.hasProgress || data.userProgress.progress) {
                                setUserProgress(data.userProgress.progress || data.userProgress);
                            }
                        } else if (data.progress) {
                            setUserProgress(data.progress);
                        }
                    } else {
                        // Still show if eligible but no active walkathon (might show upcoming)
                        if (isEligible) {
                            setIsEligible(true);
                            setWalkathon(data.walkathon || data);
                        } else {
                            setIsEligible(false);
                        }
                    }
                } else {
                    // If API fails or returns error, still show component with default data
                    setIsEligible(true);
                    setWalkathon({
                        title: "Walkathon Challenge",
                        description: "Complete step goals to earn XP rewards!"
                    });
                    console.warn("[WalkathonSection] API response not in expected format, showing default");
                }
            } catch (err) {
                console.error("[WalkathonSection] Error loading walkathon status:", err);
                // Still show component even on error - let user access walkathon page
                setIsEligible(true);
                setWalkathon({
                    title: "Walkathon Challenge",
                    description: "Complete step goals to earn XP rewards!"
                });
            } finally {
                setLoading(false);
            }
        };

        loadWalkathonStatus();
    }, [token]);

    // Handle click to navigate to Walkathon page
    const handleWalkathonClick = useCallback(() => {
        router.push('/Walkathon');
    }, [router]);

    // Memoize display data
    const displayData = useMemo(() => {
        const totalSteps = userProgress?.totalSteps || userProgress?.totalStepsCompleted || 0;
        const milestonesReached = userProgress?.milestonesReached?.length || 0;
        const hasProgress = !!userProgress;
        const isJoined = hasProgress;

        return {
            totalSteps,
            milestonesReached,
            hasProgress,
            isJoined,
            title: walkathon?.title || "Walkathon Challenge",
            description: walkathon?.description || "Complete step goals to earn XP rewards!"
        };
    }, [userProgress, walkathon]);

    // Don't show while loading - but show after loading completes (even if no walkathon data)
    if (loading) {
        return null;
    }

    // Always show the section if we have token (allows access to walkathon page)
    // Only hide if explicitly not eligible AND no walkathon data
    if (!isEligible && !walkathon && token) {
        return null;
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col w-full max-w-[375px] mx-auto items-center gap-2.5 relative"
        >
            <section
                className="flex flex-col w-[335px] h-40 items-start gap-2.5 relative"
                data-model-id="2035:19088"
                aria-label="Walkathon promotion card"
            >
                <article
                    className="relative w-[334px] h-40 rounded-[20px] overflow-hidden bg-[linear-gradient(51deg,rgba(41,147,171,1)_0%,rgba(41,82,171,1)_100%)] cursor-pointer hover:opacity-95 transition-opacity duration-200"
                    onClick={handleWalkathonClick}
                >
                    <img
                        className="absolute w-[44.31%] top-[calc(50.00%_-_99px)] left-[62.57%] h-44 aspect-[0.84]"
                        alt="Person walking with colorful sneakers"
                        src="https://c.animaapp.com/SDZlvEPf/img/image-207-1@2x.png"
                    />

                    <header className="top-4 w-[146px] h-[54px] absolute left-5">
                        <p className="top-7 font-normal text-sm absolute left-px [font-family:'Poppins',Helvetica] text-white tracking-[0] leading-6 whitespace-nowrap">
                            <span className="[font-family:'Poppins',Helvetica] font-normal text-white text-sm tracking-[0] leading-6">
                                Walk And Get
                            </span>

                            <span className="font-semibold"> 2x</span>

                            <span className="[font-family:'Poppins',Helvetica] font-normal text-white text-sm tracking-[0] leading-6">
                                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Points
                            </span>
                        </p>

                        <img
                            className="absolute top-7 left-[115px] w-7 h-[22px]"
                            alt="XP points icon"
                            src="https://c.animaapp.com/SDZlvEPf/img/pic.svg"
                        />

                        <img
                            className="absolute top-[70px] left-[45px] w-[22px] h-[18px]"
                            alt="XP bonus icon"
                            src="https://c.animaapp.com/SDZlvEPf/img/pic-1.svg"
                        />

                        <h1 className="top-px font-semibold text-xl absolute left-px [font-family:'Poppins',Helvetica] text-white tracking-[0] leading-6 whitespace-nowrap">
                            Walkathon
                        </h1>
                    </header>

                    <button
                        className="inline-flex items-start gap-2.5 px-3.5 py-2 top-[110px] bg-[#1b4e84] rounded-xl absolute left-5 cursor-pointer hover:bg-[#2a5d96] transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#1b4e84]"
                        type="button"
                        aria-label="Link Apple Health to track your steps"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleWalkathonClick();
                        }}
                    >
                        <span className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-white text-[13px] tracking-[0] leading-[normal]">
                            Link Apple Health
                        </span>
                    </button>

                    <p className="absolute top-[68px] left-5 w-[230px] [font-family:'Poppins',Helvetica] font-normal text-white text-sm tracking-[0] leading-[18px]">
                        Track your steps to collect
                        <br />
                        bonus
                    </p>

                    <button
                        className="absolute top-px left-[299px] w-9 h-9 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent rounded-full"
                        type="button"
                        aria-label="More information about Walkathon"
                        aria-expanded={showInfo}
                        aria-controls="walkathon-info-popover"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowInfo((current) => !current);
                        }}
                    >
                        <img
                            className="w-full h-full"
                            alt=""
                            src="https://c.animaapp.com/SDZlvEPf/img/informationcircle.svg"
                        />
                    </button>

                    {showInfo && (
                        <div
                            id="walkathon-info-popover"
                            role="dialog"
                            aria-label="About Walkathon"
                            className="absolute z-20 top-9 right-3 left-3 rounded-xl border border-white/20 bg-[#102f57]/95 p-3 text-sm text-white shadow-xl backdrop-blur"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="font-semibold">How Walkathon works</p>
                            <p className="mt-1 text-xs leading-5 text-white/85">
                                {displayData.description} Link Apple Health to track eligible steps and view your milestones.
                            </p>
                            <button
                                type="button"
                                className="mt-2 text-xs font-semibold text-[#c9d5ff]"
                                onClick={() => setShowInfo(false)}
                            >
                                Close
                            </button>
                        </div>
                    )}
                </article>
            </section>
        </motion.div>
    );
};

export default WalkathonSection;


