"use client";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDispatch, useSelector } from "react-redux";
import { fetchNonGameOffers } from "@/lib/redux/slice/surveysSlice";
import { onNonGamingOfferComplete } from "@/lib/adjustService";
import { incrementAndGet } from "@/lib/adjustCounters";

const NonGameOffersSection = ({ skipFetch = false }) => {
    const { token } = useAuth();
    const dispatch = useDispatch();
    const [activesIndex, setActivesIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [isSwiping, setIsSwiping] = useState(false);
    const MIN_SWIPE_DISTANCE = 50;
    const HORIZONTAL_SPREAD = 120;

    // Get non-game offers from Redux store (same pattern as SurveysSection)
    const { nonGameOffers, nonGameOffersStatus, nonGameOffersError, nonGameOffersCacheTimestamp } = useSelector((state) => state.surveys);

    const CACHE_STALE_MS = 3 * 60 * 1000;       // 3 min - fresh cache (skip fetch on mount if newer)
    const FOCUS_REFRESH_STALE_MS = 1 * 60 * 1000; // 1 min - refetch on focus when cache older than this

    // One fetch only on mount / token change.
    // Reads state directly from store (not render closure) to avoid the race condition
    // where AuthContext dispatches at the same time this component mounts — both would
    // read status="idle" from their render snapshots and double-dispatch.
    useEffect(() => {
        if (!token || skipFetch) return;

        // Read CURRENT store state (not stale render closure) to see if AuthContext already dispatched
        const currentState = require("@/lib/redux/store").store.getState().surveys;
        const { nonGameOffers: currentOffers, nonGameOffersCacheTimestamp: currentTs, nonGameOffersStatus: currentStatus } = currentState;

        const hasFreshCache = currentOffers?.length && currentTs && (Date.now() - currentTs < CACHE_STALE_MS);
        if (hasFreshCache || currentStatus === "loading" || currentStatus === "failed") return;
        dispatch(fetchNonGameOffers({ token, offerType: "cashback_shopping" }));
    }, [token, skipFetch]); // eslint-disable-line react-hooks/exhaustive-deps

    // Return to app (focus): refresh only if cache older than 1 min
    useEffect(() => {
        if (!token) return;

        const handleRefreshIfStale = () => {
            const state = require("@/lib/redux/store").store.getState();
            const ts = state.surveys.nonGameOffersCacheTimestamp;
            const isStale = !ts || Date.now() - ts > FOCUS_REFRESH_STALE_MS;
            if (!isStale) return;
            dispatch(fetchNonGameOffers({ token, force: true, background: true, offerType: "cashback_shopping" }));
        };

        // Check if user is returning from a non-gaming offer — fire completion event
        const checkOfferReturn = () => {
            try {
                const offerId = localStorage.getItem("adjust_nongame_offer_opened");
                if (offerId) {
                    localStorage.removeItem("adjust_nongame_offer_opened");
                    // counter seeded from server at login — survives reinstalls
                    onNonGamingOfferComplete(incrementAndGet("nongameOffer"));
                }
            } catch { }
        };

        const handleFocus = () => { checkOfferReturn(); handleRefreshIfStale(); };
        const handleVisibility = () => {
            if (!document.hidden) { checkOfferReturn(); handleRefreshIfStale(); }
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibility);
        };
    }, [token, dispatch]);

    // Reset active index when offers change
    useEffect(() => {
        if (nonGameOffers && nonGameOffers.length > 0) {
            setActivesIndex(0);
        }
    }, [nonGameOffers?.length]);

    const totalsCards = nonGameOffers?.length || 0;

    const getOfferLink = (offer) => offer?.clickUrl || null;

    const handleOfferClick = (offer) => {
        const clickUrl = getOfferLink(offer);

        if (clickUrl) {
            // Flag that an offer was opened — completion event fires when user returns
            try {
                localStorage.setItem("adjust_nongame_offer_opened", offer.id || offer.externalId || "1");
            } catch { }
            window.open(clickUrl, '_blank', 'noopener,noreferrer');
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

        if (isLeftSwipe && nonGameOffers && nonGameOffers.length > 0) {
            setIsAnimating(true);
            setActivesIndex((prev) => (prev + 1) % nonGameOffers.length);
            setTimeout(() => setIsAnimating(false), 400);
        }
        if (isRightSwipe && nonGameOffers && nonGameOffers.length > 0) {
            setIsAnimating(true);
            setActivesIndex((prev) => (prev - 1 + nonGameOffers.length) % nonGameOffers.length);
            setTimeout(() => setIsAnimating(false), 400);
        }

        // Reset swipe flag after handling gesture
        setIsSwiping(false);
    };

    // Format title with line break (matching NonGamingOffers)
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

    // Get reward display based on offer type
    const isCashback = (offer) => offer?.offerType === "cashback";

    const isShopping = (offer) => offer?.offerType === "shopping";

    // Format reward number for display (e.g. 15000 -> "15,000")
    const formatRewardNumber = (num) => {
        const n = Number(num);
        if (Number.isNaN(n) || n === 0) return "0";
        return n >= 1000 ? n.toLocaleString() : String(n);
    };

    const getOfferName = (offer) => offer?.title || "Offer";

    const getRewardDisplay = (offer) => offer?.userRewardCoins ?? offer?.coinReward ?? 0;

    const getTimeDisplay = (offer) => offer?.estimatedTime ? `${offer.estimatedTime}m` : "1m";

    // REMOVED: Loading state - always show content immediately (stale-while-revalidate pattern)
    // Background fetching happens automatically without blocking UI

    return (
        <div className={`w-[335px] mx-auto flex flex-col items-center ${nonGameOffers?.length ? 'h-[275px]' : 'min-h-20'}`}>
            <div className="w-full h-[24px] px-4 mb-2.5 mr-4">
                <h2 className="font-['Poppins',Helvetica] text-[16px] font-semibold leading-normal tracking-[0] text-[#FFFFFF]">
                    Non Gaming Offers
                </h2>
            </div>

            {/* Card viewport - 240px when offers exist, compact height when empty */}
            <div
                className={`relative w-full overflow-hidden ${nonGameOffers?.length ? 'h-[240px]' : 'min-h-20'}`}
                style={{ perspective: '1000px' }}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {nonGameOffers && nonGameOffers.length > 0 ? nonGameOffers.map((offer, index) => {
                    // Get offer image
                    const offerImage = offer.thumbnail || "https://static.bitlabs.ai/categories/other.svg";

                    // Get coins and XP (prefer user-facing rewards)
                    const coins = offer.userRewardCoins ?? offer.coinReward ?? 0;
                    const xp = offer.userRewardXP ?? 0;
                    const rewardDisplay = getRewardDisplay(offer);
                    const timeDisplay = getTimeDisplay(offer);

                    // Get offer name/title by type
                    const offerName = getOfferName(offer);

                    // Get circular transform - middle card bigger
                    const circularTransform = getCardTransform(index, nonGameOffers.length);

                    const cardStyle = {
                        ...circularTransform,
                        transition: isAnimating ? 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)' : 'all 0.3s ease-out',
                        position: 'absolute',
                        top: 0,
                        left: '50%',
                    };

                    return (
                        <article
                            key={offer.id || offer.externalId || index}
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
                                    handleOfferClick(offer);
                                }
                            }}
                        >
                            {/* Card content - decreased height to fit image and footer: w-[168px] h-[238px] */}
                            <div className="relative h-[234px] w-[168px]">
                                {/* Background container */}
                                <div className="absolute flex justify-center items-start inset-0 bg-gradient-to-br from-gray-800 to-gray-900 rounded-[15px] overflow-hidden">
                                    {/* Offer Image Section - full width to contain image */}
                                    <div className="relative w-full h-[174px] overflow-hidden">
                                        <img
                                            className="w-full h-full object-cover rounded-t-[10px]"
                                            src={offerImage}
                                            alt={offer.title || "Offer"}
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
                                    <div className="absolute bottom-0 h-[63px] w-full bg-gradient-to-b from-[#9EADF7]/50 to-[#716AE7]/50 rounded-b-[6px] flex items-center justify-center backdrop-blur-sm">
                                        <div className="text-center font-['Poppins',Helvetica] text-base font-semibold leading-5 tracking-[0] text-white px-2 line-clamp-2 overflow-hidden text-ellipsis break-words w-full">
                                            {formatTitle(offerName)}
                                        </div>
                                    </div>

                                    {/* Earn button - show when offer has coins or XP (shopping always; cashback when rewards set) */}
                                    {(coins > 0 || xp > 0) && (
                                        <div
                                            className="absolute top-[128px] left-1/2 flex flex-wrap items-center justify-center gap-0.5 px-1.5 py-1 min-h-[29px] w-[140px] -translate-x-1/2 rounded-[10px] bg-gradient-to-b from-[#9EADF7] to-[#716AE7] cursor-pointer hover:opacity-90 transition-opacity leading-none"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOfferClick(offer);
                                            }}
                                        >
                                            <span className="font-['Poppins',Helvetica] text-[12px] font-medium leading-none tracking-[0] text-white">
                                                Earn upto
                                            </span>
                                            {coins > 0 && (
                                                <>
                                                    <span className="font-['Poppins',Helvetica] text-[12px] font-semibold leading-none text-white">
                                                        {String(coins)}
                                                    </span>
                                                    <img
                                                        className="w-3.5 h-3.5 object-contain flex-shrink-0"
                                                        alt="Coin icon"
                                                        src="/dollor.png"
                                                        loading="eager"
                                                        decoding="async"
                                                        width="14"
                                                        height="14"
                                                    />
                                                </>
                                            )}
                                            {xp > 0 && (
                                                <>
                                                    {coins > 0 && (
                                                        <span className="text-white text-[12px] leading-none">&</span>
                                                    )}
                                                    <span className="font-['Poppins',Helvetica] text-[12px] font-semibold leading-none text-white">
                                                        {formatRewardNumber(xp)}
                                                    </span>
                                                    <img
                                                        className="w-3.5 h-3.5 object-contain flex-shrink-0"
                                                        alt="XP icon"
                                                        src="/xp.svg"
                                                        loading="eager"
                                                        decoding="async"
                                                        width="14"
                                                        height="14"
                                                        onError={(e) => {
                                                            e.target.style.display = 'none';
                                                        }}
                                                    />
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </article>
                    );
                }) : (
                    <div className="w-full min-h-[5rem] flex items-center justify-center">
                        <div className="flex flex-col items-center justify-center py-6 px-4">
                            <h4 className="[font-family:'Poppins',Helvetica] font-semibold text-[#F4F3FC] text-[14px] text-center mb-2">
                                No Offers Available
                            </h4>
                            <p className="[font-family:'Poppins',Helvetica] font-normal text-white text-[12px] text-center opacity-90">
                                Check back later for new opportunities!
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NonGameOffersSection;

