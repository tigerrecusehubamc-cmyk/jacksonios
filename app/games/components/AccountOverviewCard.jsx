"use client";
import React, { useEffect, useState } from 'react'
import Image from 'next/image'
import { useSelector, useDispatch } from 'react-redux'
import { fetchAccountOverview, claimAccountReward, updateAccountProgress, loadAccountOverviewFromCache, accountOverviewCacheKey } from '@/lib/redux/slice/accountOverviewSlice'
import ProgressSection from './ProgressSection'

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const AccountOverviewCard = ({ userStats = null, className = "" }) => {
    const dispatch = useDispatch();
    const { data: accountData, status, error } = useSelector((state) => state.accountOverview);
    const [isClient, setIsClient] = useState(false);

    // Load from localStorage cache immediately so we show real data without blocking (like GameListSection)
    useEffect(() => {
        setIsClient(true);
    }, []);
    useEffect(() => {
        if (!isClient || typeof window === 'undefined') return;
        const token = localStorage.getItem('authToken') || localStorage.getItem('x-auth-token');
        if (!token) return;
        try {
            const raw = localStorage.getItem(accountOverviewCacheKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                const cacheAge = Date.now() - (parsed.timestamp || 0);
                if (parsed.data && cacheAge < CACHE_TTL * 2) {
                    dispatch(loadAccountOverviewFromCache({
                        data: parsed.data,
                        timestamp: parsed.timestamp,
                    }));
                }
            }
        } catch (e) {
            // ignore
        }
        // Fetch fresh data on every navigation to this screen (background so cached data shows immediately)
        dispatch(fetchAccountOverview({ force: false, background: true }));
    }, [isClient, dispatch]);

    // Loading and error states from Redux
    const isLoading = status === 'loading';
    const hasError = status === 'failed';

    /**
     * Format number with commas
     */
    const formatNumber = (num) => {
        return num.toLocaleString();
    };

    /**
     * Calculate progress percentage
     */
    const calculateProgressPercentage = (current, target) => {
        if (target === 0) return 0;
        return Math.min((current / target) * 100, 100);
    };

    // Use dynamic data from API response
    const totalCoins = accountData?.totalEarnings?.coins || 0;
    const totalXP = accountData?.totalEarnings?.xp || 0;
    const gamesPlayed = accountData?.progress?.gamesPlayed?.current || 0;
    const gamesTarget = accountData?.progress?.gamesPlayed?.target || 0;
    const coinsEarned = accountData?.progress?.coinsEarned?.current || 0;
    const coinsTarget = accountData?.progress?.coinsEarned?.target || 0;
    const challengesCompleted = accountData?.progress?.challengesCompleted?.current || 0;
    const challengesTarget = accountData?.progress?.challengesCompleted?.target || 0;

    if (isLoading) {
        return (
            <div className={`flex flex-col w-[335px] max-h-[479px] items-start gap-[16px] relative mx-auto ${className}`}>
                <div className="w-[334px] h-[479px] rounded-[20px] overflow-hidden bg-[linear-gradient(103deg,rgba(121,32,207,1)_0%,rgba(205,73,153,1)_80%)] relative flex items-center justify-center">
                    <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                        <span className="text-white font-semibold">Loading account overview...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (hasError) {
        return (
            <div className={`flex flex-col w-[335px] max-h-[479px] items-start gap-[16px] relative mx-auto ${className}`}>
                <div className="w-[334px] h-[479px] rounded-[20px] overflow-hidden bg-red-900/20 border border-red-500 relative flex items-center justify-center">
                    <div className="text-center p-4">
                        <p className="text-red-400 font-semibold mb-2">Error loading account overview</p>
                        <p className="text-red-300 text-sm mb-4">{error}</p>
                        <button
                            onClick={() => dispatch(fetchAccountOverview())}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex flex-col w-[335px] max-h-[479px] items-start justify-center gap-[16px] relative mx-auto ${className}`}>
            <div className="flex flex-col items-start gap-2.5 self-stretch w-full relative">
                <div className="w-[334px] h-[479px] rounded-[20px] overflow-hidden bg-[linear-gradient(103deg,rgba(121,32,207,1)_0%,rgba(205,73,153,1)_80%)] relative overflow-x-hidden">
                    <div className="relative w-full h-[479px]">
                        <div className="absolute w-full h-[91px] top-0 left-0">
                            <div className="top-8 left-20 font-bold text-xl leading-6 absolute [font-family:'Poppins',Helvetica] text-[#FFFFFF] tracking-[0] whitespace-nowrap">
                                My Account Overview
                            </div>
                            <Image
                                className="absolute w-[55px] h-[55px] top-4 left-4"
                                alt="Group"
                                src="/assets/animaapp/3mn7waJw/img/group-4-2x.png"
                                width={55}
                                height={55}
                            />
                        </div>

                        {/* Content Background */}
                        <div className="absolute w-full h-[356px] top-[123px] left-0 bg-[#982fbb] rounded-[0px_0px_20px_20px]" />

                        {/* Progress Sections - Dynamic values from backend */}
                        <ProgressSection
                            title={`${gamesPlayed}/${gamesTarget} Games Played`}
                            progress={calculateProgressPercentage(gamesPlayed, gamesTarget)}
                            mainValue={`${accountData?.rewardBadges?.[0]?.reward?.coins || 0}`}
                            bonusValue={`${accountData?.rewardBadges?.[0]?.reward?.xp || 0}`}
                            top="top-[138px]"
                            showBorder={true}
                        />

                        <ProgressSection
                            title={`${coinsEarned}/${coinsTarget} Coins Earned (Daily)`}
                            progress={calculateProgressPercentage(coinsEarned, coinsTarget)}
                            mainValue={`${accountData?.rewardBadges?.[1]?.reward?.coins || 0}`}
                            bonusValue={`${accountData?.rewardBadges?.[1]?.reward?.xp || 0}`}
                            top="top-[253px]"
                            showBorder={true}
                        />

                        <ProgressSection
                            title={`${challengesCompleted}/${challengesTarget} Challenges Finished `}
                            progress={calculateProgressPercentage(challengesCompleted, challengesTarget)}
                            mainValue={`${accountData?.rewardBadges?.[2]?.reward?.coins || 0}`}
                            bonusValue={`${accountData?.rewardBadges?.[2]?.reward?.xp || 0}`}
                            top="top-[368px]"
                            showBorder={false}
                        />

                        {/* Header Background */}
                        <div className="absolute w-full h-12 top-[78px] left-0 bg-[#80279e]" />

                        {/* Total Earnings Section - Responsive */}
                        <div className="absolute top-[78px] left-0 w-full h-12 flex items-center justify-between px-4 bg-[#80279e]">
                            <div className="[font-family:'Poppins',Helvetica] font-normal text-[#FFFFFF] text-[14px] sm:text-[16px] tracking-[0] leading-6 whitespace-nowrap">
                                Total Earnings:
                            </div>

                            {/* Earnings Badges - Responsive */}
                            <div className="flex items-center gap-2 sm:gap-3">
                                {/* Coins Badge */}
                                <div className="flex items-center h-[30px] px-2 sm:px-3 rounded-3xl bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)]">
                                    <div className="flex items-center gap-1">
                                        <div className="font-semibold text-[14px] sm:text-[18px] leading-[normal] [font-family:'Poppins',Helvetica] text-[#FFFFFF] tracking-[0]">
                                            {formatNumber(totalCoins)}
                                        </div>
                                        <Image
                                            className="w-[18px] h-[18px] sm:w-[23px] sm:h-[23px]"
                                            alt="Coin"
                                            src="/assets/animaapp/3mn7waJw/img/image-3937-4-2x.png"
                                            width={20}
                                            height={20}
                                        />
                                    </div>
                                </div>

                                {/* XP Badge */}
                                <div className="flex items-center h-[30px] px-2 sm:px-3 rounded-3xl bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)]">
                                    <div className="flex items-center gap-1">
                                        <div className="font-semibold text-[14px] sm:text-[18px] leading-[normal] [font-family:'Poppins',Helvetica] text-[#FFFFFF] tracking-[0]">
                                            {formatNumber(totalXP)}
                                        </div>
                                        <Image
                                            className="w-[18px] h-[18px] sm:w-[23px] sm:h-[18px]"
                                            alt="XP"
                                            src="/assets/animaapp/3mn7waJw/img/pic-7.svg"
                                            width={18}
                                            height={18}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AccountOverviewCard