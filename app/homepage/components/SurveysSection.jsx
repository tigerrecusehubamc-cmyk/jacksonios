"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { fetchSurveys } from "@/lib/redux/slice/surveysSlice";
import { onSurveyComplete } from "@/lib/adjustService";
import { incrementAndGet } from "@/lib/adjustCounters";

const SurveysSection = () => {
    const { token } = useAuth();
    const dispatch = useDispatch();
    const [activesIndex, setActivesIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSwiping, setIsSwiping] = useState(false);
    const MIN_SWIPE_DISTANCE = 50;
    const HORIZONTAL_SPREAD = 120;

    // Get surveys from Redux store (same pattern as HighestEarningGame / TaskListSection)
    const { surveys, status, error, cacheTimestamp } = useSelector((state) => state.surveys);

    const CACHE_STALE_MS = 3 * 60 * 1000;       // 3 min - fresh cache (skip fetch on mount if newer)
    const FOCUS_REFRESH_STALE_MS = 1 * 60 * 1000; // 1 min - refetch on focus when cache older than this

    // One fetch only on mount / token change. Guard failed to prevent infinite loop.
    useEffect(() => {
        if (!token) return;

        const hasFreshCache = surveys?.length && cacheTimestamp && (Date.now() - cacheTimestamp < CACHE_STALE_MS);
        if (hasFreshCache || status === "loading" || status === "failed") return;
        dispatch(fetchSurveys({ token }));
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    // Return to app (focus): refresh only if cache older than 1 min
    useEffect(() => {
        if (!token) return;

        const handleRefreshIfStale = () => {
            const state = require("@/lib/redux/store").store.getState();
            const ts = state.surveys.cacheTimestamp;
            const existing = state.surveys.surveys;
            const isStale = !ts || Date.now() - ts > FOCUS_REFRESH_STALE_MS;
            if (!isStale) return;
            dispatch(fetchSurveys({ token, force: true, background: true }));
        };

        // Check if user is returning from a survey — fire completion event once per survey opened
        const checkSurveyReturn = () => {
            try {
                const surveyId = localStorage.getItem("adjust_survey_opened");
                if (surveyId) {
                    localStorage.removeItem("adjust_survey_opened");
                    // counter seeded from server at login — survives reinstalls
                    onSurveyComplete(incrementAndGet("survey"), surveyId);
                }
            } catch { }
        };

        const handleFocus = () => { checkSurveyReturn(); handleRefreshIfStale(); };
        const handleVisibility = () => {
            if (!document.hidden) { checkSurveyReturn(); handleRefreshIfStale(); }
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [token, dispatch]);

    // Reset active index when surveys change
    useEffect(() => {
        if (surveys && surveys.length > 0) {
            setActivesIndex(0);
        }
    }, [surveys?.length]);

    const totalsCards = surveys?.length || 0;

    const handleSurveyClick = (survey) => {
        // Directly redirect to clickUrl from survey response
        if (survey.clickUrl) {
            // Flag that a survey was opened — completion event fires when user returns
            try {
                localStorage.setItem("adjust_survey_opened", survey.id || survey.surveyId || "1");
            } catch { }
            window.open(survey.clickUrl, '_blank', 'noopener,noreferrer');
        }
    };

    // Touch handlers for circular swipe
    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
        setIsSwiping(false);
    };

    const onTouchMove = (e) => {
        const currentX = e.targetTouches[0].clientX;
        setTouchEnd(currentX);

        // Mark as swiping when there is meaningful horizontal movement
        if (touchStart !== null) {
            const distance = Math.abs(touchStart - currentX);
            if (distance > 5 && !isSwiping) {
                setIsSwiping(true);
            }
        }
    };

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd || isAnimating) return;

        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > MIN_SWIPE_DISTANCE;
        const isRightSwipe = distance < -MIN_SWIPE_DISTANCE;

        if (isLeftSwipe && surveys && surveys.length > 0) {
            setIsAnimating(true);
            setActivesIndex((prev) => (prev + 1) % surveys.length);
            setTimeout(() => setIsAnimating(false), 400);
        }
        if (isRightSwipe && surveys && surveys.length > 0) {
            setIsAnimating(true);
            setActivesIndex((prev) => (prev - 1 + surveys.length) % surveys.length);
            setTimeout(() => setIsAnimating(false), 400);
        }

        // Reset swipe flag after handling gesture
        setIsSwiping(false);
    };

    // Format title with line break (matching NonGameOffersSection)
    const formatTitle = (title) => {
        if (!title) return '';
        const words = title.split(' ');
        if (words.length <= 1) return title;
        const lastWord = words.pop();
        return <>{words.join(' ')}<br />{lastWord}</>;
    };

    // Circular rotation calculation - middle card bigger for user-friendliness
    const getCardTransform = (index, totalCards) => {
        const currentIndex = activesIndex;
        let offset = index - currentIndex;

        // Handle circular wrapping for smooth rotation
        if (offset > totalCards / 2) {
            offset = offset - totalCards;
        } else if (offset < -totalCards / 2) {
            offset = offset + totalCards;
        }

        // Calculate circular position with 3D effect
        const angle = (offset * 50) * (Math.PI / 180); // 50 degrees per card for smoother curve
        const radius = 70; // Circular radius
        const x = Math.sin(angle) * radius;

        // Middle card (offset 0) is bigger, side cards are slightly smaller
        const scale = offset === 0 ? 1.0 : 0.85;
        const opacity = offset === 0 ? 1 : Math.max(0.6, 1 - Math.abs(offset) * 0.3);

        return {
            transform: `translateX(calc(-50% + ${x}px)) scale(${scale})`,
            opacity: opacity,
            zIndex: totalCards - Math.abs(offset),
        };
    };


    // REMOVED: Loading state - always show content immediately (stale-while-revalidate pattern)
    // Background fetching happens automatically without blocking UI

    return (
        <div className={`w-[335px] mx-auto mt-1 flex flex-col items-center ${surveys?.length ? 'h-[275px]' : 'min-h-20'}`}>
            <div className="w-full h-[24px] px-4 mb-2.5 mr-4">
                <h2 className="font-['Poppins',Helvetica] text-[16px] font-semibold leading-normal tracking-[0] text-[#FFFFFF]">
                    Get Paid to do Surveys
                </h2>
            </div>

            {/* Card viewport - 240px when surveys exist, compact when empty */}
            <div
                className={`relative w-full overflow-hidden ${surveys?.length ? 'h-[240px]' : 'min-h-20'}`}
                style={{ perspective: '1000px' }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {surveys && surveys.length > 0 ? surveys.map((survey, index) => {
                    // Get survey image
                    const surveyImage = survey.thumbnail || "https://static.bitlabs.ai/categories/other.svg";

                    // Get coins and XP
                    const coins = survey.userRewardCoins ?? survey.coinReward ?? 0;
                    const xp = survey.userRewardXP ?? 0;

                    // Get survey title
                    const surveyTitle = survey.title || "Survey";

                    // Get estimated time in user-friendly format
                    const estimatedTime = survey.estimatedTime || survey.reward?.estimatedTime || 0;

                    // Get circular transform - all cards same size
                    const circularTransform = getCardTransform(index, surveys.length);

                    const cardStyle = {
                        ...circularTransform,
                        transition: isAnimating ? 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'all 0.3s ease-out',
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                    };

                    return (
                        <article
                            key={survey.id || survey.surveyId || index}
                            className="absolute top-0 left-1/2 cursor-pointer"
                            style={cardStyle}
                            onClick={() => {
                                // If this interaction was a swipe, do not redirect
                                if (isSwiping) {
                                    return;
                                }
                                if (index !== activesIndex) {
                                    setIsAnimating(true);
                                    setActivesIndex(index);
                                    setTimeout(() => setIsAnimating(false), 400);
                                } else {
                                    handleSurveyClick(survey);
                                }
                            }}
                        >
                            {/* Card content - decreased height to fit image and footer: w-[168px] h-[238px] */}
                            <div className="relative h-[234px] w-[168px]">
                                {/* Background container */}
                                <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 rounded-[15px] overflow-hidden">
                                    {/* Survey Image Section - full width to contain image */}
                                    <div className="relative w-full h-[174px] overflow-hidden">
                                        <img
                                            className="w-full h-full object-contain rounded-t-[10px]"
                                            src={surveyImage}
                                            alt={surveyTitle}
                                            style={{ imageRendering: 'crisp-edges' }}
                                            loading="eager"
                                            decoding="async"
                                            width="168"
                                            height="174"
                                            onError={(e) => {
                                                e.target.src = "https://static.bitlabs.ai/categories/other.svg";
                                            }}
                                        />
                                    </div>

                                    {/* Bottom gradient section - increased height by 2px: h-[52px] - faded to differentiate from Earn button */}
                                    <div className="absolute bottom-0 h-[63px] w-full bg-gradient-to-b from-[#9EADF7]/50 to-[#716AE7]/50 rounded-b-[6px] flex flex-col items-center justify-center py-1 backdrop-blur-sm">
                                        <div className="text-center font-['Poppins',Helvetica] text-base font-semibold leading-4 tracking-[0] text-white px-2 line-clamp-2 overflow-hidden text-ellipsis break-words w-full">
                                            {formatTitle(surveyTitle)}
                                        </div>
                                        {estimatedTime > 0 && (
                                            <div className="text-center font-['Poppins',Helvetica] text-[11px] font-medium leading-3 tracking-[0] text-white/90 mt-0.5">
                                                {estimatedTime} min
                                            </div>
                                        )}
                                    </div>

                                    {/* Earn button - moved down slightly: top-[110px] min-h-[29px] w-[140px] */}
                                    <div
                                        className="absolute top-[128px] left-1/2 flex flex-wrap items-center justify-center gap-0.5 px-1.5 py-1 min-h-[29px] w-[140px] -translate-x-1/2 rounded-[10px] bg-gradient-to-b from-[#9EADF7] to-[#716AE7] cursor-pointer hover:opacity-90 transition-opacity leading-none"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleSurveyClick(survey);
                                        }}
                                    >
                                        <span className="font-['Poppins',Helvetica] text-[10px] font-medium leading-none tracking-[0] text-white">
                                            Earn upto
                                        </span>
                                        {coins > 0 && (
                                            <>
                                                <span className="font-['Poppins',Helvetica] text-[10px] font-semibold leading-none text-white">
                                                    {String(coins)}
                                                </span>
                                                <img
                                                    className="w-3 h-3 object-contain flex-shrink-0"
                                                    alt="Coin icon"
                                                    src="/dollor.png"
                                                    loading="eager"
                                                    decoding="async"
                                                    width="12"
                                                    height="12"
                                                />
                                            </>
                                        )}
                                        {xp > 0 && (
                                            <>
                                                {coins > 0 && (
                                                    <span className="text-white text-[10px] leading-none">&</span>
                                                )}
                                                <span className="font-['Poppins',Helvetica] text-[10px] font-semibold leading-none text-white">
                                                    {String(xp)}
                                                </span>
                                                <img
                                                    className="w-3 h-3 object-contain flex-shrink-0"
                                                    alt="XP icon"
                                                    src="/xp.svg"
                                                    loading="eager"
                                                    decoding="async"
                                                    width="12"
                                                    height="12"
                                                    onError={(e) => {
                                                        e.target.style.display = 'none';
                                                    }}
                                                />
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </article>
                    );
                }) : (
                    <div className="w-full min-h-[5rem] flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center py-6 px-4">
                            <h4 className="[font-family:'Poppins',Helvetica] font-semibold text-[#F4F3FC] text-[14px] text-center mb-2">
                                No Surveys Available
                            </h4>
                            <p className="[font-family:'Poppins',Helvetica] font-normal text-white text-[12px] text-center opacity-90">
                                Check back later for new survey opportunities!
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SurveysSection;
