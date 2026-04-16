"use client";
import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAppLovinAds } from '@/hooks/useAppLovinAds';
import { Capacitor } from '@capacitor/core';
import MockAdOverlay from '../../games/components/MockAdOverlay';

const WatchAdCard = ({
    className = "",
    onClick,
    onAdComplete
}) => {
    // State management
    const [isAdAvailable, setIsAdAvailable] = useState(true);
    const [isWatchingAd, setIsWatchingAd] = useState(false);
    const [cooldownRemaining, setCooldownRemaining] = useState(0); // in minutes
    const [error, setError] = useState(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [rewardCoins, setRewardCoins] = useState(50);
    const [xpAmount, setXpAmount] = useState(5);
    const [cooldownHours, setCooldownHours] = useState(4);

    // API Configuration
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://rewardsuatapi.hireagent.co";

    // AppLovin MAX integration
    const {
        isInitialized,
        isLoading: isAdLoading,
        isAdReady,
        isShowingAd,
        error: adError,
        showAd,
        loadAd,
        clearError: clearAdError,
        lastReward
    } = useAppLovinAds();

    // Track whether the user is currently trying to load/show an ad (prevents showing
    // "Loading..." UI during background preloads after an ad completes)
    const [isAdActionInProgress, setIsAdActionInProgress] = useState(false);

    // Guard: track which reward has already been claimed to prevent duplicate API calls.
    // lastReward is never reset by the hook, so without this guard every isWatchingAd
    // state change would re-fire claimAdReward with the same stale reward object.
    const claimedRewardRef = useRef(null);

    // Check if running on web (not native)
    const isWeb = !Capacitor.isNativePlatform();
    // Web-only: visual mock overlay (native uses real fullscreen activity)
    const [showMockAd, setShowMockAd] = useState(false);

    useEffect(() => {
        checkAdAvailability();
        const interval = setInterval(() => {
            checkAdAvailability();
        }, 60000); // 60 seconds

        return () => clearInterval(interval);
    }, []);

    /**
     * Sync AppLovin ad error with component error state
     */
    useEffect(() => {
        if (adError) {
            setError(adError);
        }
    }, [adError]);

    /**
     * Sync AppLovin ad showing state with component state
     */
    useEffect(() => {
        setIsWatchingAd(isShowingAd);
        // Only show the mock overlay in web builds
        if (isWeb) setShowMockAd(!!isShowingAd);
    }, [isShowingAd, isWeb]);

    /**
     * Handle reward from last ad completion.
     * claimedRewardRef guards against duplicate claims: lastReward is never reset
     * by the hook, so we only process each unique reward object once.
     */
    useEffect(() => {
        if (lastReward && !isWatchingAd && claimedRewardRef.current !== lastReward) {
            claimedRewardRef.current = lastReward;
            console.log('[WatchAdCard] 💰 Processing lastReward from hook:', lastReward);

            // Call the claim API to process the reward
            claimAdReward(lastReward);
        }
    }, [lastReward, isWatchingAd]);

    /**
     * Claim ad reward via API
     */
    const claimAdReward = async (rewardData) => {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('x-auth-token');
            // Get user data from localStorage to extract the correct userId
            const userData = localStorage.getItem('user');
            let userId = 'unknown_user';

            if (userData) {
                try {
                    const parsedUser = JSON.parse(userData);
                    userId = parsedUser._id || 'unknown_user';
                } catch (e) {
                    console.warn('Failed to parse user data from localStorage:', e);
                }
            }

            // Fallback to direct userId if user object doesn't exist
            if (userId === 'unknown_user') {
                userId = localStorage.getItem('userId') || 'unknown_user';
            }

            if (!token) {
                throw new Error('Authentication required. Please log in.');
            }

            console.log('[WatchAdCard] 📤 Claiming reward via API:', rewardData);

            const response = await fetch(`${BASE_URL}/api/account-overview/ad-reward/claim`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userId: userId,
                    rewardAmount: rewardData.coins || rewardCoins,
                    ads: {
                        provider: "applovin",
                        adId: rewardData.adId || `ad_${Date.now()}`,
                        adType: "rewarded"
                    }
                })
            });

            if (response.ok) {
                const result = await response.json();
                console.log('[WatchAdCard] ✅ Reward claimed successfully:', result);

                // Store last watched time
                const now = Date.now();
                localStorage.setItem('lastBoosterAdWatched', now.toString());
                console.log('[WatchAdCard] 💾 Stored last watched time:', new Date(now).toISOString());

                // Use message from API response
                setSuccessMessage(result.message || 'Reward claimed successfully!');

                // Update state
                setIsAdAvailable(false);
                setCooldownRemaining(cooldownHours * 60);
                setShowSuccessMessage(true);
                console.log('[WatchAdCard] 📈 State updated from API response:', {
                    isAdAvailable: false,
                    cooldownRemaining: cooldownHours * 60,
                    showSuccessMessage: true,
                });

                // Call completion callback with actual reward
                if (onAdComplete) {
                    const completionData = {
                        coins: rewardData.coins || rewardCoins,
                        xp: rewardData.xp || xpAmount,
                        success: true,
                        ...rewardData
                    };
                    console.log('[WatchAdCard] 📞 Calling onAdComplete callback:', completionData);
                    onAdComplete(completionData);
                }

                // Hide success message after 3 seconds
                setTimeout(() => {
                    setShowSuccessMessage(false);
                    console.log('[WatchAdCard] 📈 State updated: showSuccessMessage=false');
                }, 3000);

            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to claim reward');
            }
        } catch (error) {
            console.error('[WatchAdCard] ❌ Error claiming reward:', error);
            setError(error.message || 'Failed to claim reward. Please try again.');

            // Clear error after 5 seconds
            setTimeout(() => {
                setError(null);
            }, 5000);
        } finally {
            // Stop showing any loading UI after the claim attempt
            setIsAdActionInProgress(false);
        }
    };

    const checkAdAvailability = async () => {
        try {
            const token = localStorage.getItem('authToken') || localStorage.getItem('x-auth-token');

            if (!token) {
                // Fallback to localStorage if no token
                checkLocalStorageAvailability();
                return;
            }

            const response = await fetch(`${BASE_URL}/api/account-overview/ad-reward/cooldown`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'x-auth-token': token,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                const { cooldownHours, rewardCoins, isAvailable, nextRewardAt } = result.data;

                // Update state with API data
                setCooldownHours(cooldownHours);
                setRewardCoins(rewardCoins);

                if (isAvailable) {
                    setIsAdAvailable(true);
                    setCooldownRemaining(0);
                } else {
                    setIsAdAvailable(false);
                    // Calculate remaining time from nextRewardAt
                    const nextRewardTime = new Date(nextRewardAt).getTime();
                    const currentTime = Date.now();
                    const remainingMs = nextRewardTime - currentTime;
                    const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
                    setCooldownRemaining(Math.max(0, remainingMinutes));
                }
            } else {
                // Fallback to localStorage if API fails
                checkLocalStorageAvailability();
            }
        } catch (error) {
            // Fallback to localStorage if API fails
            checkLocalStorageAvailability();
        }
    };

    const checkLocalStorageAvailability = () => {
        const lastWatchedTime = localStorage.getItem('lastBoosterAdWatched');

        if (lastWatchedTime) {
            const timeDiff = Date.now() - parseInt(lastWatchedTime);
            const cooldownPeriod = cooldownHours * 60 * 60 * 1000; // Convert to milliseconds

            if (timeDiff < cooldownPeriod) {
                setIsAdAvailable(false);
                const remainingMs = cooldownPeriod - timeDiff;
                const remainingMinutes = Math.ceil(remainingMs / (60 * 1000));
                setCooldownRemaining(remainingMinutes);
            } else {
                setIsAdAvailable(true);
                setCooldownRemaining(0);
            }
        } else {
            setIsAdAvailable(true);
            setCooldownRemaining(0);
        }
    };

    /**
     * Format cooldown time for display
     */
    const formatCooldownTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hours > 0) {
            return `${hours}h ${mins}m`;
        }
        return `${mins}m`;
    };

    /**
     * Handle ad watch click
     * Integrates with AppLovin MAX SDK and backend API
     */
    const handleAdClick = async (e) => {
        console.log('[WatchAdCard] 👆 User clicked "Watch Ad" button');
        e.stopPropagation();
        setIsAdActionInProgress(true);

        // Check if ad is available (cooldown)
        console.log('[WatchAdCard] 🔍 Checking ad availability...');
        console.log('[WatchAdCard] 📋 Availability state:', {
            isAdAvailable,
            cooldownRemaining,
            isWatchingAd,
            isShowingAd,
            isAdReady,
            isInitialized,
        });

        if (!isAdAvailable) {
            const errorMsg = 'Ad is not available yet. Please wait for cooldown to expire.';
            console.warn('[WatchAdCard] ⚠️ Ad not available (cooldown):', errorMsg);
            setError(errorMsg);
            setTimeout(() => setError(null), 3000);
            setIsAdActionInProgress(false);
            return;
        }

        if (isWatchingAd || isShowingAd) {
            console.warn('[WatchAdCard] ⚠️ Ad already showing, ignoring click');
            setIsAdActionInProgress(false);
            return;
        }

        // Custom onClick handler
        if (onClick) {
            console.log('[WatchAdCard] 📞 Calling custom onClick handler...');
            onClick(e);
        }

        setError(null);
        clearAdError();
        console.log('[WatchAdCard] 📈 State updated: error cleared');

        try {
            // Check if SDK is initialized
            console.log('[WatchAdCard] 🔍 Checking SDK initialization...');
            if (!isInitialized) {
                const errorMsg = 'Ad system is initializing. Please wait a moment and try again.';
                console.warn('[WatchAdCard] ⚠️ SDK not initialized:', errorMsg);
                setError(errorMsg);
                setTimeout(() => setError(null), 5000);
                setIsAdActionInProgress(false);
                return;
            }

            // Check if ad is ready, if not try to load it
            console.log('[WatchAdCard] 🔍 Checking ad ready state...');
            if (!isAdReady) {
                // Don't show a red "error" banner while loading; the spinner overlay handles UX.
                console.log('[WatchAdCard] ⚠️ Ad not ready, loading...');
                setError(null);

                // Try to load ad
                console.log('[WatchAdCard] 📥 Calling loadAd()...');
                const loadSuccess = await loadAd();
                console.log('[WatchAdCard] 📊 Load result:', loadSuccess);
                if (!loadSuccess) {
                    throw new Error('Failed to load ad. Please try again.');
                }
                console.log('[WatchAdCard] ✅ Ad loaded successfully');
            } else {
                console.log('[WatchAdCard] ✅ Ad is ready to show');
            }

            // Show the ad using AppLovin MAX SDK
            // The mock overlay will be shown automatically via useEffect when isShowingAd becomes true
            console.log('[WatchAdCard] 🎬 Calling showAd()...');
            const reward = await showAd({
                onReward: (rewardData) => {
                    // Reward callback - handled by useEffect watching lastReward
                    console.log('[WatchAdCard] 💰 Reward received in callback:', rewardData);
                    console.log('[WatchAdCard] 📊 Reward details:', {
                        coins: rewardData?.coins,
                        xp: rewardData?.xp,
                        success: rewardData?.success,
                    });
                },
                onError: (errorMsg) => {
                    console.error('[WatchAdCard] ❌ Error in showAd callback:', errorMsg);
                    setError(errorMsg || 'Failed to show ad. Please try again.');
                    setTimeout(() => setError(null), 5000);
                    // Close mock ad on error (web only)
                    if (isWeb) setShowMockAd(false);
                    setIsWatchingAd(false);
                    setIsAdActionInProgress(false);
                    console.log('[WatchAdCard] 📈 State updated: mock ad closed, isWatchingAd=false');
                }
            });

            console.log('[WatchAdCard] 📊 showAd() returned:', reward);

            // If reward is returned directly (not via callback), process it
            if (reward) {
                console.log('[WatchAdCard] 💰 Processing reward:', reward);

                // Store last watched time
                const now = Date.now();
                localStorage.setItem('lastBoosterAdWatched', now.toString());
                console.log('[WatchAdCard] 💾 Stored last watched time:', new Date(now).toISOString());

                // Update state
                setIsAdAvailable(false);
                setCooldownRemaining(cooldownHours * 60);
                setShowSuccessMessage(true);
                console.log('[WatchAdCard] 📈 State updated:', {
                    isAdAvailable: false,
                    cooldownRemaining: cooldownHours * 60,
                    showSuccessMessage: true,
                });

                // Call completion callback
                if (onAdComplete) {
                    const completionData = {
                        coins: reward.coins || rewardCoins,
                        xp: reward.xp || xpAmount,
                        success: true,
                        ...reward
                    };
                    console.log('[WatchAdCard] 📞 Calling onAdComplete callback:', completionData);
                    onAdComplete(completionData);
                }

                // Hide success message after 3 seconds
                setTimeout(() => {
                    setShowSuccessMessage(false);
                    console.log('[WatchAdCard] 📈 State updated: showSuccessMessage=false');
                }, 3000);

                // Stop showing loading UI after the ad flow completes
                setIsAdActionInProgress(false);
                console.log('[WatchAdCard] ✅ Ad watch process complete');
            } else {
                console.warn('[WatchAdCard] ⚠️ No reward returned from showAd()');
                // If the ad was closed / no reward, stop loading UI
                setIsAdActionInProgress(false);
            }

        } catch (error) {
            // Ad watch failed
            const errorMsg = error.message || 'Failed to process ad. Please try again.';
            console.error('[WatchAdCard] ❌ Ad error:', error);
            console.error('[WatchAdCard] 🐛 Error details:', {
                message: error?.message,
                stack: error?.stack,
                name: error?.name,
            });
            setError(errorMsg);
            console.log('[WatchAdCard] 📈 State updated: error set');

            // Clear error after 5 seconds
            setTimeout(() => {
                setError(null);
                clearAdError();
                setIsAdActionInProgress(false);
                console.log('[WatchAdCard] 📈 State updated: error cleared');
            }, 5000);
        }
    };

    /**
     * Handle mock ad completion (for web browsers)
     * This is called when user clicks "Claim Reward" after watching the full ad
     */
    const handleMockAdComplete = () => {
        // The actual reward processing happens in the showAd promise
        // This just closes the overlay
        setShowMockAd(false);
        setIsWatchingAd(false);
    };

    /**
     * Handle mock ad close (for web browsers)
     * This is called when user closes the ad before completion
     */
    const handleMockAdClose = () => {
        setShowMockAd(false);
        setIsWatchingAd(false);
        setError('Ad was closed. Please watch the full ad to earn rewards.');
        setTimeout(() => setError(null), 5000);
    };

    /**
     * Render the component
     */
    return (
        <>
            {/* Web-only mock overlay (native uses real fullscreen ads) */}
            {isWeb && (
                <MockAdOverlay
                    isVisible={showMockAd}
                    onComplete={handleMockAdComplete}
                    onClose={handleMockAdClose}
                    duration={15}
                />
            )}

            <div className="relative w-full max-w-[335px] mx-auto mb-1">
                <div
                    className={`relative w-full h-[100px] bg-[#360875] rounded-[10px] overflow-hidden ${isAdAvailable && !isWatchingAd ? 'cursor-pointer hover:shadow-lg hover:shadow-purple-500/50' : 'cursor-not-allowed'
                        } transition-all duration-200 ${className}`}
                    onClick={handleAdClick}
                >
                    <div className="relative h-[99px] top-px bg-[url(/assets/animaapp/3mn7waJw/img/clip-path-group-3-2x.png)] bg-[length:100%_100%] bg-no-repeat bg-center">
                        {/* Content Section */}
                        <div className="flex flex-col w-[205px] h-12 items-start absolute top-[25px] left-[116px]">
                            <div className="flex flex-col items-start pt-0 pb-2 px-0 relative self-stretch w-full flex-[0_0_auto] mt-[2.4px]">
                                <p className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-normal text-white text-sm tracking-[0] leading-4 whitespace-nowrap">
                                    {isAdAvailable && !isWatchingAd ? 'Watch an ad to get' : 'Next ad available in'}
                                </p>

                                {/* Reward Display or Cooldown */}
                                {isAdAvailable && !isWatchingAd ? (
                                    <div className="flex items-center gap-1">
                                        <span className="relative w-fit ml-[-0.50px] [text-shadow:0px_4px_8px_#1a002f40] [-webkit-text-stroke:0.5px_transparent] [-webkit-background-clip:text] bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(245,245,245,1)_100%)] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] [font-family:'Poppins',Helvetica] font-semibold text-transparent text-[28px] tracking-[0] leading-8 whitespace-nowrap">
                                            {rewardCoins}
                                        </span>
                                        <Image
                                            className="w-[34px] h-[30px] mb-[2px] object-contain"
                                            alt="Coins"
                                            src="/dollor.png"
                                            width={34}
                                            height={30}
                                            loading="eager"
                                            decoding="async"
                                            priority
                                        />
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-1">
                                        <span className="relative w-fit ml-[-0.50px] [text-shadow:0px_4px_8px_#1a002f40] [-webkit-text-stroke:0.5px_transparent] [-webkit-background-clip:text] bg-[linear-gradient(180deg,rgba(255,255,255,1)_0%,rgba(245,245,245,1)_100%)] bg-clip-text [-webkit-text-fill-color:transparent] [text-fill-color:transparent] [font-family:'Poppins',Helvetica] font-semibold text-transparent text-[24px] tracking-[0] leading-8 whitespace-nowrap">
                                            {formatCooldownTime(cooldownRemaining)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Left Icon/Image */}
                        <Image
                            className="absolute w-[85px] h-[85px] top-[9px] left-[11px] object-cover"
                            alt="Watch Ad"
                            src="/assets/animaapp/3mn7waJw/img/image-3941-2x.png"
                            width={85}
                            height={85}
                            loading="eager"
                            decoding="async"
                            priority
                        />

                        {/* Loading Overlay */}
                        {((isWatchingAd || isShowingAd) || (isAdActionInProgress && (isAdLoading || !isAdReady))) && (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-white text-sm font-medium [font-family:'Poppins',Helvetica] drop-shadow-lg">
                                        {isShowingAd
                                            ? 'Watching Ad...'
                                            : (isAdLoading ? 'Loading Ad...' : 'Preparing Ad...')}
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Success Message */}
                {showSuccessMessage && (
                    <div className="mt-2 bg-gradient-to-r from-[#4bba56] to-[#2a8a3e] rounded-lg p-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-white text-sm font-medium [font-family:'Poppins',Helvetica]">
                                {successMessage}
                            </p>
                        </div>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="mt-2 bg-red-600 rounded-lg p-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-white text-sm font-medium [font-family:'Poppins',Helvetica]">
                                {error}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default WatchAdCard;