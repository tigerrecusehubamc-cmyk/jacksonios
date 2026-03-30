"use client";

import React, { useCallback, useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DailyRewardsSection } from "./DailyRewardsSection";
import { WeeklyCalendarSection } from "./WeeklyCalendarSection";
import { LoadingSpinner } from "./LoadingSpinner";
import { MemoizedButton, MemoizedImage } from "./PerformanceWrapper";
import { useDailyRewards } from "../hooks/useDailyRewards";
import { NotificationService } from "../services/notificationService";
import { MissedDayRecovery } from "./MissedDayRecovery";
import { UserFriendlyModal } from "./UserFriendlyModal";

const DailyReward = () => {
    const router = useRouter();
    const {
        weekData,
        loading,
        error,
        successMessage,
        currentWeekStart,
        isNavigating,
        isCurrentWeek,
        isFutureWeek,
        fetchWeekData,
        goToPreviousWeek,
        goToNextWeek,
        handleRewardClaim,
        clearError,
        clearSuccessMessage
    } = useDailyRewards();

    const [showRecoveryModal, setShowRecoveryModal] = useState(false);

    // Handle back navigation
    const handleBackNavigation = useCallback(() => {
        router.back();
    }, [router]);

    // Load initial data silently in background
    useEffect(() => {
        fetchWeekData();

        // Setup notifications
        NotificationService.requestPermission();
        NotificationService.scheduleDailyNotification();
    }, [fetchWeekData]);

    // Handle missed day recovery
    const handleMissedDayRecovery = useCallback(async (method) => {
        try {
            // API call to recover missed day
            const token = localStorage.getItem("authToken");
            const response = await fetch("https://rewardsuatapi.hireagent.co/api/daily-rewards/recover", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ method }),
            });

            const data = await response.json();

            if (data.success) {
                await fetchWeekData();
                showSuccess("🎉 Missed day recovered! Your streak continues!");
            } else {
                throw new Error(data.error || "Failed to recover missed day");
            }
        } catch (err) {
            // Recovery failed
            showError(err.message || "Failed to recover missed day");
            throw err;
        }
    }, [fetchWeekData]);

    // Memoized week key display
    const weekKeyDisplay = useMemo(() => {
        if (!weekData?.weekKey) return 'Loading...';
        return weekData.weekKey;
    }, [weekData?.weekKey]);

    // Show content immediately with fallback data if needed
    if (!weekData) {
        // Show skeleton or cached data while loading
        return (
            <div className="relative w-full min-h-screen bg-black max-w-sm mx-auto flex flex-col items-center">
                {/* Header */}
                <div className="flex flex-col w-full items-start gap-2 px-5 py-4 absolute top-[40px] left-0">
                    <div className="flex items-center gap-4 relative self-stretch w-full flex-[0_0_auto] rounded-[32px]">
                        <MemoizedButton
                            className="relative w-6 h-6"
                            ariaLabel="Go back"
                            onClick={handleBackNavigation}
                        >
                            <MemoizedImage
                                className="w-full h-full"
                                alt="Arrow back ios new"
                                src="https://c.animaapp.com/ciot1lOr/img/arrow-back-ios-new-1@2x.png"
                            />
                        </MemoizedButton>

                        <h1 className="relative w-[255px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-5">
                            Daily Reward
                        </h1>
                    </div>
                </div>

                {/* Week Navigation */}
                <div className="flex w-[335px] items-center gap-4 absolute top-[100px] left-5 rounded-[32px]">
                    <MemoizedButton
                        className="relative w-4 h-4 disabled:opacity-50"
                        ariaLabel="Previous week"
                        onClick={goToPreviousWeek}
                        disabled={isNavigating}
                    >
                        <MemoizedImage
                            className="w-full h-full"
                            alt="Arrow back ios new"
                            src="https://c.animaapp.com/ciot1lOr/img/arrow-back-ios-new-1@2x.png"
                        />
                    </MemoizedButton>

                    <div className="relative w-[255px] [font-family:'Poppins',Helvetica] font-semibold text-white text-sm text-center tracking-[0] leading-5">
                        Loading...
                    </div>

                    <MemoizedButton
                        className="relative w-4 h-4 disabled:opacity-50"
                        ariaLabel="Next week"
                        onClick={goToNextWeek}
                        disabled={isNavigating}
                    >
                        <MemoizedImage
                            className="w-full h-full"
                            alt="Arrow back ios new"
                            src="https://c.animaapp.com/ciot1lOr/img/arrow-back-ios-new-2@2x.png"
                        />
                    </MemoizedButton>
                </div>

                {/* App Version */}
                <div className="absolute top-[12px]  mb-3 left-4 [font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
                    App Version: V0.0.1
                </div>

                {/* Skeleton Content */}
                <div className="flex flex-col w-[335px] items-start gap-4 absolute top-[247px] left-[calc(50.00%_-_168px)] overflow-x-scroll pb-8">
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
                        <div className="bg-gray-600 h-2 rounded-full w-1/3"></div>
                    </div>

                    {/* Skeleton reward cards */}
                    <div className="grid grid-cols-2 gap-4 w-full">
                        {[1, 2, 3, 4, 5, 6].map((day) => (
                            <div key={day} className="w-40 h-[170px] bg-gray-800 rounded-[21.82px] animate-pulse">
                                <div className="p-4">
                                    <div className="h-4 bg-gray-600 rounded mb-2"></div>
                                    <div className="h-20 bg-gray-600 rounded mb-4"></div>
                                    <div className="h-8 bg-gray-600 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full min-h-screen bg-black max-w-sm mx-auto flex flex-col items-center">
            {/* Header */}
            <div className="flex flex-col w-full items-start gap-2 px-4 py-4 mt-[36px]">
                <div className="flex items-center gap-4 relative self-stretch w-full flex-[0_0_auto] rounded-[32px]">
                    <MemoizedButton
                        className="relative w-6 h-6"
                        ariaLabel="Go back"
                        onClick={handleBackNavigation}
                    >
                        <MemoizedImage
                            className="w-full h-full"
                            alt="Arrow back ios new"
                            src="https://c.animaapp.com/ciot1lOr/img/arrow-back-ios-new-1@2x.png"
                        />
                    </MemoizedButton>

                    <h1 className="relative w-[255px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-5">
                        Daily Reward
                    </h1>
                </div>
            </div>

            {/* Week Navigation */}
            <div className="flex w-full max-w-[335px] items-center gap-4 px-4 py-4 rounded-[32px]">
                <MemoizedButton
                    className="relative w-4 h-4 disabled:opacity-50"
                    ariaLabel="Previous week"
                    onClick={goToPreviousWeek}
                    disabled={isNavigating}
                >
                    <MemoizedImage
                        className="w-full h-full mt-1"
                        alt="Arrow back ios new"
                        src="https://c.animaapp.com/ciot1lOr/img/arrow-back-ios-new-1@2x.png"
                    />
                </MemoizedButton>

                <div className="relative w-[255px] [font-family:'Poppins',Helvetica] font-semibold text-white text-sm text-center tracking-[0] leading-5">
                    {weekKeyDisplay}
                </div>

                <MemoizedButton
                    className="relative w-4 h-4 disabled:opacity-50"
                    ariaLabel="Next week"
                    onClick={goToNextWeek}
                    disabled={isNavigating}
                >
                    <MemoizedImage
                        className="w-full h-full rotate-180"
                        alt="Arrow forward ios new bg-white text-white"
                        src="https://c.animaapp.com/ciot1lOr/img/arrow-back-ios-new-1@2x.png"
                    />
                </MemoizedButton>
            </div>

            {/* App Version */}
            <div className="absolute top-[8px] left-5 [font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
                App Version: V0.0.1
            </div>



            {/* Components */}
            <WeeklyCalendarSection
                weekData={weekData}
                currentWeekStart={currentWeekStart}
            />
            <DailyRewardsSection
                weekData={weekData}
                isCurrentWeek={isCurrentWeek}
                isFutureWeek={isFutureWeek}
                onClaimReward={handleRewardClaim}
            />



            {/* Missed Day Recovery Modal */}
            <MissedDayRecovery
                isVisible={showRecoveryModal}
                onRecover={handleMissedDayRecovery}
                onClose={() => setShowRecoveryModal(false)}
            />

            {/* Success Modal */}
            <UserFriendlyModal
                isVisible={!!successMessage}
                onClose={clearSuccessMessage}
                title="Reward Claimed!"
                showCloseButton={true}
                autoClose={true}
                autoCloseDelay={5000}
            >
                <div className="text-center">
                    <div className="text-green-500 text-4xl mb-3">🎉</div>
                    <div className="text-white text-sm mb-2 font-medium">{successMessage}</div>
                    <div className="text-gray-300 text-xs">
                        Next reward will be available tomorrow!
                    </div>
                </div>
            </UserFriendlyModal>

            {/* Error Modal */}
            <UserFriendlyModal
                isVisible={!!error}
                onClose={clearError}
                title="Error"
                showCloseButton={true}
                autoClose={true}
                autoCloseDelay={3000}
            >
                <div className="text-center">
                    <div className="text-red-500 text-4xl mb-3">⚠️</div>
                    <div className="text-white text-sm">{error}</div>
                </div>
            </UserFriendlyModal>

        </div>
    );
};

export default DailyReward;