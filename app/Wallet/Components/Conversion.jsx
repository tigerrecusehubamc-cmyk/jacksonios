"use client";
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSelector } from "react-redux";
import { useAppLovinAds } from '@/hooks/useAppLovinAds';
import { Capacitor } from '@capacitor/core';
import MockAdOverlay from '@/app/games/components/MockAdOverlay';
import { getConversionSettings } from "../../../lib/api";


const SCALE_CONFIG = [
    { minWidth: 0, scaleClass: "scale-90" },
    { minWidth: 320, scaleClass: "scale-90" },
    { minWidth: 375, scaleClass: "scale-100" },
    { minWidth: 480, scaleClass: "scale-125" },
    { minWidth: 640, scaleClass: "scale-120" },
    { minWidth: 768, scaleClass: "scale-150" },
    { minWidth: 1024, scaleClass: "scale-175" },
    { minWidth: 1280, scaleClass: "scale-200" },
    { minWidth: 1536, scaleClass: "scale-225" },
];


// Simple 5-Minute Timer Modal
const SimpleTimerModal = ({ onClose, timeLeft }) => {
    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return (
        <div className="fixed inset-0 bg-black/90 flex flex-col justify-center items-center z-50 p-4">
            <div className="bg-black rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl border-2 border-white/20">
                {/* Header */}
                <div className="text-center mb-6">
                    <h2 className="text-white text-2xl font-bold mb-2">Please Wait</h2>
                    <p className="text-white/80 text-sm">5 minutes to see conversion rate</p>
                </div>

                {/* Timer */}
                <div className="text-center mb-6">
                    <div className="text-5xl font-bold text-white mb-2 font-mono">
                        {formatTime(timeLeft)}
                    </div>
                    <div className="text-white/60 text-sm">Time Remaining</div>
                </div>

                {/* Message */}
                <div className="text-center mb-6">
                    <p className="text-white text-base leading-relaxed">
                        Please wait 5 minutes to see the conversion rate and how much you get.
                    </p>
                </div>

                {/* Got it Button */}
                <button
                    onClick={onClose}
                    className="w-full bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] text-white  cursor-pointer font-bold py-3 px-6 rounded-lg hover:bg-gray-200 transition-colors duration-200"
                >
                    Got it
                </button>
            </div>
        </div>
    );
};

export const Conversion = () => {
    // VIP/subscription: same pattern as SpinWheel — subscribers skip ads
    const vipStatus = useSelector((state) => state.profile.vipStatus);
    const vipData = useMemo(() => {
        const isVipActive = vipStatus?.data?.isActive && vipStatus?.data?.currentTier && vipStatus?.data?.currentTier !== "Free";
        return { isVipActive };
    }, [vipStatus]);

    // AppLovin MAX integration (used only when !vipData.isVipActive)
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

    // State Management - Separate states for different flows
    const [conversionAmount, setConversionAmount] = useState("?");
    const [coinAmount, setCoinAmount] = useState("0"); // Editable coin input
    const [currentScaleClass, setCurrentScaleClass] = useState("scale-100");

    // Independent flow states
    const [timerFlowState, setTimerFlowState] = useState("idle"); // 'idle', 'running'
    const [adFlowState, setAdFlowState] = useState("idle"); // 'idle', 'loading', 'watching', 'completed'

    const [timeLeft, setTimeLeft] = useState(5 * 60); // 5 minutes in seconds
    const timerRef = useRef(null);
    const resetResultRef = useRef(null);
    const [error, setError] = useState(null);
    const [conversionSettings, setConversionSettings] = useState(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);

    // Check if running on web (not native)
    const isWeb = !Capacitor.isNativePlatform();
    const [showMockAd, setShowMockAd] = useState(false);

    const resetConversionResult = useCallback(() => {
        setConversionAmount("?");
    }, []);

    // Calculate conversion based on fetched settings
    const calculateConversion = useCallback(() => {
        const userAmount = parseFloat(coinAmount) || 0;
        let conversionRate = 0.10; // default fallback

        if (conversionSettings && conversionSettings.conversionRules && conversionSettings.conversionRules.length > 0) {
            const rule = conversionSettings.conversionRules[0];
            if (rule.coinsPerUnit && rule.currencyAmount) {
                conversionRate = rule.currencyAmount / rule.coinsPerUnit;
            }
        } else if (conversionSettings && conversionSettings.defaultRule && conversionSettings.defaultRule.coinsPerDollar) {
            conversionRate = 1 / conversionSettings.defaultRule.coinsPerDollar;
        }

        setConversionAmount((userAmount * conversionRate).toFixed(2));

        // Show result for at least 10 seconds, then reset everything
        if (resetResultRef.current) clearTimeout(resetResultRef.current);
        resetResultRef.current = setTimeout(() => {
            resetConversionResult();
            // Reset all flow states to idle after conversion display
            setTimerFlowState("idle");
            setAdFlowState("idle");
            setError(null);
            clearAdError();
        }, 10000); // 10 seconds
    }, [coinAmount, conversionSettings, resetConversionResult]);

    // --- Simple Flow Handlers ---

    // Handle Convert in 5:00 - Show timer modal (Independent flow)
    const handleScheduledConvert = async () => {
        // Allow interrupting other flows
        if (timerRef.current) clearInterval(timerRef.current);
        if (resetResultRef.current) clearTimeout(resetResultRef.current);
        resetConversionResult();
        setError(null);
        clearAdError();
        setAdFlowState("idle"); // Reset ad flow if it was active

        setTimerFlowState("running");
        setTimeLeft(5 * 60); // 5 minutes (300 seconds)

        // Fetch conversion settings in the background
        setIsLoadingSettings(true);
        try {
            const settings = await getConversionSettings();
            setConversionSettings(settings.data);
        } catch {
            // Fallback to default
            setConversionSettings({
                conversionRules: [{
                    coinsPerUnit: 20,
                    currencyAmount: 1
                }],
                defaultRule: {
                    coinsPerDollar: 20
                }
            });
        } finally {
            setIsLoadingSettings(false);
        }

        timerRef.current = setInterval(() => {
            setTimeLeft((prevTime) => {
                if (prevTime <= 1) {
                    clearInterval(timerRef.current);
                    // Timer completed - settings are already loaded (fetched before timer started)
                    calculateConversion();
                    setTimerFlowState("idle");
                    return 0;
                }
                return prevTime - 1;
            });
        }, 1000);
    };

    // Handle Convert Now - VIP: no ad, show conversion; non-VIP: show ad first, then conversion (same logic as SpinWheel)
    const handleConvertNow = async () => {

        // Allow interrupting other flows
        if (timerRef.current) clearInterval(timerRef.current);
        if (resetResultRef.current) clearTimeout(resetResultRef.current);
        resetConversionResult();
        setError(null);
        clearAdError();
        setTimerFlowState("idle");
        setAdFlowState("loading");

        // Fetch conversion settings (both VIP and non-VIP)
        setIsLoadingSettings(true);
        try {
            const settings = await getConversionSettings();
            setConversionSettings(settings.data);
        } catch {
            setConversionSettings({
                conversionRules: [{ coinsPerUnit: 20, currencyAmount: 1 }],
                defaultRule: { coinsPerDollar: 20 }
            });
        } finally {
            setIsLoadingSettings(false);
        }

        // Subscribers skip ads — wait for settings to load first
        if (vipData.isVipActive) {
            setAdFlowState("loading");
            setConversionAmount("...");
            return;
        }

        try {
            if (!isInitialized) {
                const errorMsg = 'Ad system is initializing. Please wait a moment and try again.';
                setError(errorMsg);
                setTimeout(() => setError(null), 5000);
                setAdFlowState("idle");
                return;
            }

            if (!isAdReady) {
                const loadSuccess = await loadAd();
                if (!loadSuccess) {
                    throw new Error('Failed to load ad. Please try again.');
                }
            }

            setAdFlowState("watching");

            await showAd({
                onReward: () => {
                    setAdFlowState("loading");
                    setConversionAmount("...");
                },
                onError: (errorMsg) => {
                    setError(errorMsg || 'Failed to show ad. Please try again.');
                    setTimeout(() => setError(null), 5000);
                    if (isWeb) setShowMockAd(false);
                    setAdFlowState("idle");
                }
            });
        } catch (error) {
            const errorMsg = error.message || 'Failed to process ad. Please try again.';
            setError(errorMsg);
            setTimeout(() => {
                setError(null);
                clearAdError();
            }, 5000);
            setAdFlowState("idle");
        }
    };


    // Handle mock ad completion (for web browsers)
    const handleMockAdComplete = () => {
        setShowMockAd(false);
        if (adFlowState === "watching") {
            setAdFlowState("completed");
            calculateConversion();
        }
    };

    // Handle mock ad close (for web browsers)
    const handleMockAdClose = () => {
        setShowMockAd(false);
        setAdFlowState("idle");
        setError('Ad was closed. Please watch the full ad to see conversion.');
        setTimeout(() => setError(null), 5000);
    };

    // Sync AppLovin ad showing state
    useEffect(() => {
        if (isShowingAd) {
            setAdFlowState("watching");
            if (isWeb) setShowMockAd(true);
        } else if (adFlowState === "watching" && !isShowingAd) {
            // Ad finished showing, but we wait for the reward callback to complete
            if (isWeb) setShowMockAd(false);
        }
    }, [isShowingAd, isWeb, adFlowState]);

    // Handle ad completion - this is now handled in the onReward callback
    // No need for this effect anymore since we handle completion in handleConvertNow

    // Sync ad error with component error
    useEffect(() => {
        if (adError) {
            setError(adError);
            setAdFlowState("idle");
        }
    }, [adError]);

    // Calculate conversion when settings are loaded (handles VIP and non-VIP flows)
    useEffect(() => {
        if (!isLoadingSettings && conversionSettings && conversionAmount === "...") {
            // Settings just finished loading and we were showing loading state
            // This handles both VIP (no ad) and non-VIP (after ad) flows
            setAdFlowState("completed");
            calculateConversion();
        }
    }, [isLoadingSettings, conversionSettings, conversionAmount, adFlowState]);

    // Cleanup timer on component unmount
    useEffect(() => {
        return () => {
            clearInterval(timerRef.current);
            if (resetResultRef.current) clearTimeout(resetResultRef.current);
        };
    }, []);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const getScaleClass = useCallback((width) => {
        for (let i = SCALE_CONFIG.length - 1; i >= 0; i--) {
            if (width >= SCALE_CONFIG[i].minWidth) {
                return SCALE_CONFIG[i].scaleClass;
            }
        }
        return "scale-100";
    }, []);

    useEffect(() => {
        const updateScale = () => {
            setCurrentScaleClass(getScaleClass(window.innerWidth));
        };
        updateScale();

        window.addEventListener('resize', updateScale);
        return () => window.removeEventListener('resize', updateScale);
    }, [getScaleClass]);

    return (
        <div className="flex p-4 w-full justify-center items-center">
            <div
                className={`flex flex-col  w-full max-w-[335px] items-start justify-between gap-2.5 relative transition-transform duration-200 ease-in-out`}
                role="main"
                aria-label="Currency conversion interface"
            >
                {/* Web-only mock overlay (native uses real fullscreen ads) */}
                {isWeb && (
                    <MockAdOverlay
                        isVisible={showMockAd}
                        onComplete={handleMockAdComplete}
                        onClose={handleMockAdClose}
                        duration={15}
                    />
                )}

                {/* Conditional rendering of overlays based on flowState */}
                {timerFlowState === 'running' && (
                    <SimpleTimerModal
                        onClose={() => {
                            clearInterval(timerRef.current);
                            // Don't show conversion if user closes early
                            setTimerFlowState("idle");
                        }}
                        timeLeft={timeLeft}
                    />
                )}
                <h1 className="relative mb-1 text-family:'Poppins',Helvetica] font-semibold text-[#f4f3fc] text-[16px] tracking-[0] leading-[normal]">
                    Check Conversion Rates
                </h1>

                <div
                    className="inline-flex items-center justify-center gap-2.5 relative flex-[0_0_auto]"
                    role="group"
                    aria-label="Currency conversion calculator"
                >
                    {/* Editable Coin Input Field */}
                    <div
                        className={`relative h-[53px] flex items-center justify-center gap-1.5 rounded-[8px] border px-3 transition-all duration-200 ${timerFlowState === 'idle'
                            ? 'border-[#3C3C3C] hover:border-purple-500/50 focus-within:border-purple-500'
                            : 'border-[#3C3C3C] opacity-50'
                            }`}
                        style={{
                            width: `${Math.max(80, Math.min(coinAmount.length * 14 + 50, 150))}px`,
                            background: 'linear-gradient(to right, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.15) 20%, rgba(0, 0, 0, 0.9) 100%)',
                        }}
                    >
                        <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={coinAmount}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Allow only numbers and limit to 5 digits, allow empty string
                                if (/^\d*$/.test(value) && value.length <= 5) {
                                    setCoinAmount(value);
                                }
                            }}
                            className="bg-transparent text-white text-[13px] outline-none text-center font-medium [appearance:none] [-webkit-appearance:none] [-moz-appearance:textfield]"
                            placeholder="0"
                            disabled={timerFlowState !== 'idle'}
                            style={{
                                width: `${Math.max(coinAmount.length * 14, 30)}px`,
                                textAlign: 'center'
                            }}
                        />
                        <img
                            className="w-[23px] h-[23px] flex-shrink-0"
                            alt="Coin"
                            src="/assets/animaapp/GgG4W9O5/img/image-3937-2x.png"
                            loading="eager"
                            decoding="async"
                            width={23}
                            height={23}
                        />
                    </div>

                    <div
                        className="relative w-3 h-[17px] font-semibold text-[#f4f3fc] text-base whitespace-nowrap [font-family:'Poppins',Helvetica] tracking-[0] leading-[normal]"
                        aria-label="equals"
                    >
                        =
                    </div>

                    {/* Second field: conversionAmount (Output result) */}
                    <div
                        className={`relative h-[53px] flex items-center rounded-[8px] border px-3 transition-all duration-200 ${timerFlowState === 'idle'
                            ? 'border-[#3C3C3C] hover:border-purple-500/50 focus-within:border-purple-500'
                            : 'border-[#3C3C3C] opacity-50'
                            }`}
                        role="textbox"
                        aria-label="Converted amount"
                        style={{
                            width: `${Math.max(80, Math.min(conversionAmount.length * 8 + 50, 120))}px`,
                            background: 'linear-gradient(to right, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.15) 20%, rgba(0, 0, 0, 0.9) 100%)',
                        }}
                    >
                        <span
                            className="[font-family:'Poppins',Helvetica] font-normal text-neutral-400 text-[13px] tracking-[0] leading-[normal] text-center w-full"
                            aria-live="polite"
                            style={{ textAlign: 'center' }}
                        >
                            {conversionAmount}
                        </span>
                    </div>

                    {/* Currency Display (Static USD) */}
                    <div
                        className={`relative h-[53px] w-[85px] flex items-center rounded-[8px] border px-3 transition-all duration-200 ${timerFlowState === 'idle'
                            ? 'border-[#3C3C3C] hover:border-purple-500/50'
                            : 'border-[#3C3C3C] opacity-50'
                            }`}
                        role="textbox"
                        aria-label="Target currency"
                        style={{
                            background: 'linear-gradient(to right, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.15) 20%, rgba(0, 0, 0, 0.9) 100%)',
                        }}
                    >
                        <span className="[font-family:'Poppins',Helvetica] font-normal text-white text-[13px] tracking-[0] leading-[normal] text-center w-full">
                            USD
                        </span>
                    </div>
                </div>

                <div
                    className="inline-flex items-center gap-14  relative flex-[0_0_auto]"
                    role="group"
                    aria-label="Conversion options"
                >
                    {/* Convert in 5 Mins Button */}
                    <button
                        className="bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] relative w-[159px] h-10 rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                        onClick={handleScheduledConvert}
                        disabled={timerFlowState !== 'idle'}
                        aria-label="Schedule conversion for 5 minutes"
                        role="button"
                        tabIndex={0}
                    >
                        <div className="absolute inset-0 flex justify-center items-center font-semibold text-white text-[13px]">
                            {timerFlowState === 'running' ? `Time Left: ${formatTime(timeLeft)}` : 'Convert in 05:00'}
                        </div>
                    </button>

                    {/* Convert Now Button — VIP: no ad; non-VIP: show ad then conversion (same as SpinWheel) */}
                    <button
                        className="bg-[linear-gradient(180deg,rgba(251,159,68,1)_0%,rgba(241,188,132,1)_100%)] relative w-[159px] h-10 rounded-lg overflow-hidden cursor-pointer transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 flex items-center justify-center"
                        onClick={handleConvertNow}
                        disabled={adFlowState !== 'idle' || (!vipData.isVipActive && !isInitialized)}
                        aria-label="Convert currency now"
                        role="button"
                        tabIndex={0}
                    >
                        {adFlowState === "loading" || adFlowState === "watching" || (!vipData.isVipActive && (isAdLoading || isShowingAd)) ? (
                            <>
                                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span className="font-semibold text-white text-[13px]">
                                    {vipData.isVipActive
                                        ? "Converting..."
                                        : (adFlowState === "watching" || isShowingAd ? "Watching Ad..." : "Loading Ad...")}
                                </span>
                            </>
                        ) : (
                            <>
                                <img
                                    className="w-7 h-7 mr-2"
                                    alt="Convert now icon"
                                    src="/assets/animaapp/GgG4W9O5/img/image-3941-2x.png"
                                    loading="eager"
                                    decoding="async"
                                    width={28}
                                    height={28}
                                />
                                <span className="font-semibold text-white text-[13px]">
                                    Convert Now
                                </span>
                            </>
                        )}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="w-full mt-2 bg-red-600 rounded-lg p-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
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

                {/* Success Message (when ad completes or VIP conversion completes) */}
                {adFlowState === 'completed' && (lastReward || vipData.isVipActive) && (
                    <div className="w-full mt-2 bg-gradient-to-r from-[#4bba56] to-[#2a8a3e] rounded-lg p-3 shadow-lg animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                                <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <p className="text-white text-sm font-medium [font-family:'Poppins',Helvetica]">
                                {vipData.isVipActive ? "🎉 Conversion amount unlocked." : "🎉 Ad completed! Conversion amount unlocked."}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};