"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { getAllNonGameOffers, getBitlabsSurveys } from "@/lib/api";
import {
    dealsCache,
    dealsCacheTimestamp,
    DEALS_CACHE_TTL,
    setDealsCache,
} from "@/lib/dealsCache";

const TABS = ["All", "Shopping", "Cashback", "Surveys"];

const DealsPage = () => {
    const router = useRouter();
    const { token } = useAuth();

    const [activeTab, setActiveTab] = useState("All");
    const [allOffers, setAllOffers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Ref so fetchAllDeals can read latest "has data" without being recreated on every data change
    const hasLocalDataRef = useRef(false);
    // Prevent concurrent fetches (e.g. mount + focus firing simultaneously)
    const isFetchingRef = useRef(false);

    useEffect(() => {
        hasLocalDataRef.current = allOffers.length > 0;
    }, [allOffers]);

    const handleBack = () => {
        router.back();
    };

    // Shared fetcher that can run with or without UI loading state
    const fetchAllDeals = useCallback(
        async ({ background = false } = {}) => {
            if (!token) return;
            if (isFetchingRef.current) {
                console.log("[DEBUG-DEALS] fetchAllDeals called but already fetching — skipping | background:", background);
                return;
            }
            console.log("[DEBUG-DEALS] fetchAllDeals called | background:", background, "| at:", new Date().toISOString());
            isFetchingRef.current = true;

            const shouldShowLoader = !background && !hasLocalDataRef.current;

            try {
                if (shouldShowLoader) {
                    setLoading(true);
                    setError(null);
                }

                const [nonGameRes, surveyRes] = await Promise.all([
                    getAllNonGameOffers({}, token),
                    getBitlabsSurveys({ page: 1 }, token),
                ]);

                const nonGameOffers = (nonGameRes?.success && Array.isArray(nonGameRes.data)) ? nonGameRes.data : [];
                const surveyOffers = (surveyRes?.success && Array.isArray(surveyRes.data)) ? surveyRes.data : [];

                const combined = [...nonGameOffers, ...surveyOffers];
                setAllOffers(combined);

                // Update shared cache for future visits
                setDealsCache({ allOffers: combined });
            } catch {
                if (!background) {
                    setError("Failed to load deals. Please try again later.");
                }
            } finally {
                if (shouldShowLoader) {
                    setLoading(false);
                }
                isFetchingRef.current = false;
            }
        },
        [token] // stable — hasLocalData read via ref, not as a dep
    );

    // Initial load with stale-while-revalidate: show any cached data instantly,
    // then always refresh in background. Only show loader if no cache exists after waiting.
    useEffect(() => {
        if (!token) return;

        const checkCacheAndLoad = () => {
            const hasAnyCache = dealsCache && dealsCache.allOffers && dealsCache.allOffers.length > 0;

            if (hasAnyCache) {
                // Show cached deals immediately (even if stale)
                setAllOffers(dealsCache.allOffers);

                // Always refresh in background to get fresh data
                fetchAllDeals({ background: true });
            } else {
                // No cached data at all – show loader until API responds
                fetchAllDeals({ background: false });
            }
        };

        // Check immediately
        const hasImmediateCache = dealsCache && dealsCache.allOffers && dealsCache.allOffers.length > 0;

        if (hasImmediateCache) {
            checkCacheAndLoad();
        } else {
            // Wait up to 2 seconds for AuthContext prefetching to complete
            const timeoutId = setTimeout(() => {
                checkCacheAndLoad();
            }, 2000);

            // Also check every 100ms for cache availability
            const intervalId = setInterval(() => {
                const hasCacheNow = dealsCache && dealsCache.allOffers && dealsCache.allOffers.length > 0;
                if (hasCacheNow) {
                    clearTimeout(timeoutId);
                    clearInterval(intervalId);
                    checkCacheAndLoad();
                }
            }, 100);

            // Cleanup
            return () => {
                clearTimeout(timeoutId);
                clearInterval(intervalId);
            };
        }
    }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

    // Background refresh when app gains focus / becomes visible
    useEffect(() => {
        if (!token) return;

        const handleFocus = () => {
            console.log("[DEBUG-DEALS] focus event fired — calling fetchAllDeals(background) at", new Date().toISOString());
            fetchAllDeals({ background: true });
        };

        const handleVisibilityChange = () => {
            if (!document.hidden) {
                console.log("[DEBUG-DEALS] visibilitychange (visible) — calling fetchAllDeals(background) at", new Date().toISOString());
                fetchAllDeals({ background: true });
            }
        };

        window.addEventListener("focus", handleFocus);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [token, fetchAllDeals]); // fetchAllDeals is now stable (only changes when token changes)

    // Helpers to extract display data
    const getNonGameImage = (offer, fallback) => offer?.thumbnail || fallback;

    const getNonGameTitle = (offer) => offer?.title || "Offer";

    const getNonGameDescription = (offer) =>
        offer?.description ||
        (offer?.estimatedTime ? `Estimated time: ${offer.estimatedTime} min` : "Complete this offer to earn rewards.");

    // Combine data based on active tab
    const buildKey = (prefix, entity, index) => {
        // Prefer truly unique identifiers from backend first
        const rawId =
            entity?.externalId ||
            entity?._id ||
            entity?.offerId ||
            entity?.surveyId ||
            entity?.id ||
            entity?.click_url ||
            entity?.clickUrl ||
            index;

        return `${prefix}-${String(rawId)}`;
    };

    // Handle click
    const handleDealClick = (deal) => {
        const clickUrl = deal.raw?.clickUrl || null;
        if (clickUrl) {
            window.open(clickUrl, "_blank", "noopener,noreferrer");
        }
    };

    const dealsToShow = useMemo(() => {
        const fallbackImg = "https://static.bitlabs.ai/categories/other.svg";

        const cards = allOffers.map((offer, index) => ({
            id: buildKey(offer.offerType || "offer", offer, index),
            type: offer.offerType || "other",
            title: getNonGameTitle(offer),
            description: getNonGameDescription(offer),
            image: getNonGameImage(offer, fallbackImg),
            raw: offer,
        }));

        if (activeTab === "Shopping") return cards.filter((c) => c.type === "shopping");
        if (activeTab === "Cashback") return cards.filter((c) => c.type === "cashback");
        if (activeTab === "Surveys") return cards.filter((c) => c.type === "survey");

        // "All" tab: every offer regardless of type
        return cards;
    }, [activeTab, allOffers]);

    return (
        <div className="relative w-full min-h-screen bg-black max-w-sm mx-auto flex flex-col items-center text-white">
            {/* App version text */}
            <div className="absolute top-[12px] left-4 [font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
                App Version: V0.0.1
            </div>

            {/* Header */}
            <div className="flex flex-col w-full items-start gap-2 px-4 py-4 mt-[40px]">
                <div className="flex items-center gap-4 w-full rounded-[32px]">
                    <button
                        type="button"
                        aria-label="Go back"
                        onClick={handleBack}
                        className="relative w-6 h-6 flex items-center justify-center"
                    >
                        <img
                            src="/assets/animaapp/ciot1lOr/img/arrow-back-ios-new-1-2x.png"
                            alt="Back"
                            className="w-full h-full"
                        />
                    </button>

                    <h1 className="relative [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-5">
                        Deals
                    </h1>
                </div>
            </div>

            {/* Tabs */}
            <div className="w-full px-4 mt-1">
                <div className="flex flex-row items-center gap-2">
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab;
                        return (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`px-3 py-1 rounded-[8px] text-[12px] [font-family:'Poppins',Helvetica] leading-[14px] tracking-[0] ${isActive
                                    ? "bg-[#7046D7] text-white"
                                    : "bg-[#1E1E1E] text-[#A4A4A4]"
                                    }`}
                            >
                                {tab}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Deals list */}
            <div className="w-full flex-1 px-4 pt-4 pb-6 overflow-y-auto scrollbar-hide">
                {loading && (
                    <div className="w-full flex flex-col gap-3">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div
                                key={idx}
                                className="w-full bg-[#111111] border border-[#333333] rounded-[16px] px-3 py-3 flex flex-row gap-3 animate-pulse"
                            >
                                <div className="flex-shrink-0">
                                    <div className="w-[84px] h-[70px] rounded-[12px] bg-[#1E1E1E]" />
                                </div>
                                <div className="flex flex-col justify-between flex-1 gap-2">
                                    <div className="h-4 bg-[#1E1E1E] rounded" />
                                    <div className="h-3 bg-[#1E1E1E] rounded" />
                                    <div className="h-3 bg-[#1E1E1E] rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!loading && error && (
                    <div className="w-full text-center text-xs text-red-400 mt-4 px-4">
                        {error}
                    </div>
                )}

                {!loading && !error && dealsToShow.length === 0 && (
                    <div className="w-full text-center text-xs text-[#A4A4A4] mt-4 px-4">
                        No deals available right now. Please check back later.
                    </div>
                )}

                {!loading && !error && dealsToShow.length > 0 && (
                    <div className="flex flex-col gap-3">
                        {dealsToShow.map((deal) => (
                            <article
                                key={deal.id}
                                className="w-full bg-[#111111] border border-[#333333] rounded-[16px] px-3 py-3 flex flex-row gap-3 cursor-pointer"
                                onClick={() => handleDealClick(deal)}
                            >
                                <div className="flex-shrink-0">
                                    <div className="w-[84px] h-[112px] rounded-[12px] overflow-hidden bg-[#1E1E1E] flex items-center justify-center">
                                        <img
                                            src={deal.image}
                                            alt={deal.title}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = "https://static.bitlabs.ai/categories/other.svg";
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col justify-between flex-1">
                                    <div>
                                        <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-[16px] leading-[16px] tracking-[0] text-white mb-1">
                                            {deal.title}
                                        </h2>
                                        <p className="[font-family:'Poppins',Helvetica] font-normal text-[13px] leading-[13px] tracking-[0] text-[#D4D4D4]">
                                            {deal.description}
                                        </p>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
            <section className=" ">
                <div className="w-full max-w-[335px]  mb-10 sm:max-w-[375px] mx-auto">
                    <div className="w-full p-4 sm:p-6 rounded-lg bg-[linear-gradient(to_right,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0.1)_50%,rgba(0,0,0,0.9)_100%)] shadow-lg border border-white/20">
                        <div className="flex flex-col justify-start gap-2">
                            <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-[#f4f3fc] text-[14px] sm:text-[14px] ">
                                Disclaimer
                            </h2>
                            <p className="[font-family:'Poppins',Helvetica] font-light text-[#FFFFFF] text-[13px] sm:text-base text-start leading-5 sm:leading-6">
                                Points ar for loyalty use only and do not reflect real-world currency
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default DealsPage;

