"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useAuth } from "@/contexts/AuthContext";
import { fetchSurveys } from "@/lib/redux/slice/surveysSlice";
import SurveyGameCard from "./SurveyGameCard";

export const SurveyListSection = ({ onSurveyClick }) => {
    const { token } = useAuth();
    const dispatch = useDispatch();
    const [activesIndex, setActivesIndex] = useState(0);
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const HORIZONTALS_SPREAD = 120;
    const MIN_SWIPE_DISTANCE = 50;

    // Get surveys from Redux store
    const { surveys, status, error } = useSelector((state) => state.surveys);

    // Fetch surveys on mount and when token changes
    useEffect(() => {
        if (!token) return;

        // Fetch surveys (will use cache if available) - fetch more than 3 for the list page
        dispatch(fetchSurveys({ token, params: { limit: 50 } }));
    }, [token, dispatch]);

    // Refresh surveys in background when app comes to foreground (admin might have updated)
    useEffect(() => {
        if (!token) return;

        const handleFocus = () => {
            console.log("🔄 [SurveyListSection] App focused - refreshing surveys to get admin updates");
            dispatch(fetchSurveys({ token, force: true, background: true, params: { limit: 50 } }));
        };

        // Listen for window focus (app comes to foreground)
        window.addEventListener("focus", handleFocus);

        // Also listen for visibility change (tab/app visibility)
        const handleVisibilityChange = () => {
            if (!document.hidden && token) {
                console.log("🔄 [SurveyListSection] App visible - refreshing surveys to get admin updates");
                dispatch(fetchSurveys({ token, force: true, background: true, params: { limit: 50 } }));
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("focus", handleFocus);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [token, dispatch]);
    const handleSurveyClick = (survey) => {
        console.log('Survey clicked:', survey.title);
        // Directly redirect to clickUrl from survey response
        if (survey.clickUrl) {
            // Open in new tab/window
            window.open(survey.clickUrl, '_blank', 'noopener,noreferrer');
        } else {
            console.error('❌ Survey has no clickUrl');
        }
    };

    // Show error state (only if we have an error and no surveys)
    if (status === "failed" && (!surveys || surveys.length === 0)) {
        return (
            <div className="flex flex-col max-w-[335px] w-full mx-auto items-start gap-8 relative animate-fade-in top-[130px]">
                <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
                    <div className="flex flex-col w-full items-start gap-[49px] relative flex-[0_0_auto]">
                        <div className="flex w-full items-center justify-between">
                            <div className="inline-flex items-center gap-0.5 relative flex-[0_0_auto]">
                                <svg className="relative w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-medium text-white text-base tracking-[0] leading-[normal]">
                                    Available Surveys
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col w-full items-start gap-2.5 px-0 py-2.5 relative flex-[0_0_auto] overflow-y-scroll">
                        <p className="text-gray-400 text-sm">
                            {error || "No surveys available at the moment"}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Show empty state if no surveys but not loading/error
    if (!surveys || surveys.length === 0) {
        return (
            <div className="flex flex-col max-w-[335px] w-full mx-auto items-start gap-8 relative animate-fade-in top-[130px]">
                <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
                    <div className="flex flex-col w-full items-start gap-[49px] relative flex-[0_0_auto]">
                        <div className="flex w-full items-center justify-between">
                            <div className="inline-flex items-center gap-0.5 relative flex-[0_0_auto]">
                                <svg className="relative w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <div className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-medium text-white text-base tracking-[0] leading-[normal]">
                                    Available Surveys
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col w-full items-start gap-2.5 px-0 py-2.5 relative flex-[0_0_auto] overflow-y-scroll">
                        <p className="text-gray-400 text-lg">
                            No surveys available at the moment
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col max-w-[335px] w-full mx-auto items-start gap-8 relative animate-fade-in top-[130px]">
            <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
                <div className="flex flex-col w-full items-start gap-[49px] relative flex-[0_0_auto]">
                    <div className="flex w-full items-center justify-between">
                        <div className="inline-flex items-center gap-0.5 relative flex-[0_0_auto]">
                            <svg className="relative w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-medium text-white text-base tracking-[0] leading-[normal]">
                                Available Surveys
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col w-full items-start gap-4 px-0 py-2.5 relative flex-[0_0_auto] overflow-y-scroll">
                    {surveys.length > 0 ? surveys.map((survey, index) => {
                        return (
                            <SurveyGameCard
                                key={survey.id || survey.surveyId || index}
                                survey={survey}
                                onStart={() => handleSurveyClick(survey)}
                            />
                        );
                    }) : (
                        <SurveyGameCard />
                    )}
                </div>
            </div>

            {/* Extra spacing to ensure content isn't hidden behind navigation */}
            <div className="h-[6px]"></div>
        </div>
    );
};

