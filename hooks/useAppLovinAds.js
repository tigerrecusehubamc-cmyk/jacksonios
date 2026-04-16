"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { appLovinPlugin, APPLOVIN_CONFIG } from "@/lib/applovinPlugin";
import { canRequestAds, showPrivacyOptionsForm } from "@/lib/umpConsent";
import { Capacitor } from "@capacitor/core";
import {
  getAppLovinHealth,
  getAppLovinConfig,
  trackAppLovinAdLoad,
  trackAppLovinAdDisplay,
  trackAppLovinAdComplete,
  trackAppLovinAdFailure,
  getAppLovinAdStats,
} from "@/lib/api";

/**
 * Custom hook for AppLovin MAX rewarded ads integration
 * Handles SDK initialization, ad loading, displaying, and tracking
 *
 * @returns {Object} Ad state and control functions
 */
export const useAppLovinAds = () => {
  const { token, user } = useAuth();

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAdReady, setIsAdReady] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [error, setError] = useState(null);
  const [sdkConfig, setSdkConfig] = useState(null);
  const [adStats, setAdStats] = useState(null);
  const [lastReward, setLastReward] = useState(null);

  // Refs for tracking
  const currentAdRecordIdRef = useRef(null);
  const initializationAttemptedRef = useRef(false);
  const preloadInFlightRef = useRef(false);

  // Get platform-specific ad unit ID
  const getPlatformAdUnitId = useCallback(() => {
    const platform = Capacitor.getPlatform();
    if (platform === 'ios') {
      return APPLOVIN_CONFIG.AD_UNIT_ID.IOS_REWARDED;
    }
    return APPLOVIN_CONFIG.AD_UNIT_ID.ANDROID_REWARDED;
  }, []);

  const normalizeRevenue = useCallback((rev) => {
    // Backend expects: { amount: number, currency: string }
    if (rev && typeof rev === "object") {
      const amount =
        typeof rev.amount === "number"
          ? rev.amount
          : typeof rev.value === "number"
            ? rev.value
            : undefined;
      if (typeof amount === "number") {
        return { amount, currency: rev.currency || "USD" };
      }
    }
    if (typeof rev === "number") return { amount: rev, currency: "USD" };
    return { amount: 0, currency: "USD" };
  }, []);

  /**
   * Set up event listeners for ad events
   */
  const setupListeners = useCallback(() => {
    console.log("[useAppLovinAds] 🔧 Setting up event listeners...");

    // Ad loaded
    appLovinPlugin.addLoadListener((adInfo) => {
      console.log("[useAppLovinAds] ✅ Ad loaded event received:", adInfo);
      console.log("[useAppLovinAds] 📊 Ad Info:", {
        adUnitId: adInfo?.adUnitId,
        networkName: adInfo?.networkName,
        creativeId: adInfo?.creativeId,
        revenue: adInfo?.revenue,
      });
      setIsAdReady(true);
      setIsLoading(false);
      console.log(
        "[useAppLovinAds] 📈 State updated: isAdReady=true, isLoading=false",
      );
    });

    // Ad displayed
    appLovinPlugin.addDisplayListener((adInfo) => {
      console.log("[useAppLovinAds] 🎬 Ad displayed event received:", adInfo);
      setIsShowingAd(true);
      console.log("[useAppLovinAds] 📈 State updated: isShowingAd=true");
    });

    // Ad completed
    appLovinPlugin.addCompleteListener((result) => {
      console.log("[useAppLovinAds] 🎉 Ad completed event received:", result);
      console.log("[useAppLovinAds] 💰 Reward details:", {
        amount: result?.reward?.amount,
        currency: result?.reward?.currency,
        adNetwork: result?.adInfo?.adNetwork,
        networkName: result?.adInfo?.networkName,
        revenue: result?.adInfo?.revenue,
      });
      setIsShowingAd(false);
      setIsAdReady(false);
      setLastReward(result.reward);
      console.log(
        "[useAppLovinAds] 📈 State updated: isShowingAd=false, isAdReady=false, lastReward set",
      );
    });

    // Ad failed
    appLovinPlugin.addFailListener((error) => {
      console.error("[useAppLovinAds] ❌ Ad failed event received:", error);
      console.error("[useAppLovinAds] 🐛 Error details:", {
        type: error?.type,
        error: error?.error,
        errorCode: error?.errorCode,
        fullError: error,
      });
      setIsLoading(false);
      setIsShowingAd(false);
      setError(error.error || "Ad failed");
      console.log(
        "[useAppLovinAds] 📈 State updated: isLoading=false, isShowingAd=false, error set",
      );
    });

    console.log("[useAppLovinAds] ✅ Event listeners set up successfully");
  }, []);

  /**
   * Initialize the AppLovin MAX SDK
   */
  const initializeSDK = useCallback(async () => {
    console.log("[useAppLovinAds] 🚀 Starting SDK initialization...");
    console.log("[useAppLovinAds] 📋 Initial state:", {
      initializationAttempted: initializationAttemptedRef.current,
      isInitialized,
      hasToken: !!token,
    });

    if (initializationAttemptedRef.current || isInitialized) {
      console.log(
        "[useAppLovinAds] ⏭️ SDK already initialized or attempt in progress, skipping",
      );
      return isInitialized;
    }

    initializationAttemptedRef.current = true;
    setIsLoading(true);
    setError(null);
    console.log(
      "[useAppLovinAds] 📈 State updated: initializationAttempted=true, isLoading=true",
    );

    try {
      // Wait for UMP consent (AdMob) so we can request ads legally; give consent flow up to 5s
      console.log(
        "[AdMob/UMP] Checking consent before ad init (mob id / AdMob)...",
      );
      let consented = await canRequestAds();
      console.log("[AdMob/UMP] Initial canRequestAds:", consented);
      for (let i = 0; i < 10 && !consented; i++) {
        await new Promise((r) => setTimeout(r, 500));
        consented = await canRequestAds();
        console.log("[AdMob/UMP] Retry", i + 1, "canRequestAds:", consented);
      }
      console.log(
        "[AdMob/UMP] Final consent for ads:",
        consented,
        "(AdMob app id used in AndroidManifest)",
      );
      if (!consented) {
        console.warn(
          "[useAppLovinAds] ⚠️ UMP consent not yet ready; initializing anyway (consent may complete later)",
        );
        console.log(
          "[AdMob/UMP] If consent form never appeared: NOT app error – AdMob/Google (mob) side. AdMob console → Privacy & messaging → add message for app ID ca-app-pub-2800391972465887~5310386906",
        );
      }

      // Health route commented out so ad init is faster; SDK proceeds without waiting on backend health
      // console.log('[useAppLovinAds] 🔍 Step 1: Verifying backend connection...');
      // console.log('[useAppLovinAds] 🌐 Backend URL:', process.env.NEXT_PUBLIC_API_URL || 'https://rewardsuatapi.hireagent.co');
      // try {
      //   const healthCheck = await getAppLovinHealth();
      //   console.log('[useAppLovinAds] ✅ Backend health check passed:', healthCheck);
      // } catch (healthError) {
      //   console.warn('[useAppLovinAds] ⚠️ Backend health check failed:', healthError);
      //   console.warn('[useAppLovinAds] 📝 Error details:', {
      //     message: healthError?.message,
      //     response: healthError?.response,
      //     status: healthError?.response?.status,
      //   });
      //   // Continue anyway - backend might be down but we can still use mock
      // }

      // Fetch SDK configuration from backend
      // Note: Backend returns "rewarded" as adUnitId (placement name),
      // but the actual AppLovin Ad Unit ID is different
      let config = {
        sdkKey: "",
        adUnitId: getPlatformAdUnitId(), // Use platform-specific ad unit ID
        placement: "rewarded",
      };

      console.log(
        "[AdMob/UMP] Google AdMob App ID (Android):",
        APPLOVIN_CONFIG.GOOGLE_ADMOB_APP_ID?.ANDROID ||
          "ca-app-pub-2800391972465887~5310386906",
      );
      console.log(
        "[useAppLovinAds] 🔍 Step 2: Fetching SDK configuration from backend...",
      );
      if (token) {
        console.log(
          "[useAppLovinAds] 🔑 Auth token available, fetching config...",
        );
        try {
          const configResponse = await getAppLovinConfig(token);
          console.log(
            "[useAppLovinAds] 📥 Backend config response received:",
            configResponse,
          );
          console.log("[useAppLovinAds] 📊 Config data:", {
            success: configResponse?.success,
            hasData: !!configResponse?.data,
            sdkKey: configResponse?.data?.sdkKey
              ? "***" + configResponse.data.sdkKey.slice(-10)
              : "missing",
            adUnitId: configResponse?.data?.adUnitId,
            placement: configResponse?.data?.placement,
          });

          if (configResponse?.success && configResponse?.data) {
            // Use SDK key from backend, but keep the actual ad unit ID from config
            // Backend's adUnitId is the placement name ("rewarded"), not the actual ad unit ID
            const platformAdUnitId = getPlatformAdUnitId();
            config = {
              sdkKey: configResponse.data.sdkKey || "",
              // IMPORTANT: Use platform-specific ad unit ID
              adUnitId: platformAdUnitId,
              placement: configResponse.data.adUnitId || "rewarded", // This is actually the placement
            };
            setSdkConfig({
              ...configResponse.data,
              actualAdUnitId: platformAdUnitId,
            });
            console.log(
              "[useAppLovinAds] ✅ Using backend SDK key with actual ad unit ID",
            );
            console.log("[useAppLovinAds] 📋 Final config:", {
              sdkKey: config.sdkKey
                ? "***" + config.sdkKey.slice(-10)
                : "missing",
              adUnitId: config.adUnitId,
              placement: config.placement,
            });
          } else {
            console.warn(
              "[useAppLovinAds] ⚠️ Backend config response invalid:",
              {
                success: configResponse?.success,
                hasData: !!configResponse?.data,
              },
            );
            console.warn("[useAppLovinAds] 📝 Using default config");
          }
        } catch (configError) {
          console.error(
            "[useAppLovinAds] ❌ Failed to fetch backend config:",
            configError,
          );
          console.error("[useAppLovinAds] 🐛 Config error details:", {
            message: configError?.message,
            response: configError?.response,
            status: configError?.response?.status,
            data: configError?.response?.data,
          });
          // Continue with default config
        }
      } else {
        console.warn("[useAppLovinAds] ⚠️ No auth token available");
        console.warn(
          "[useAppLovinAds] 📝 Using default config (SDK may not work without token)",
        );
      }

      // Initialize the plugin
      console.log(
        "[useAppLovinAds] 🔍 Step 3: Initializing AppLovin plugin...",
      );
      console.log("[useAppLovinAds] 📋 Plugin config:", {
        hasSdkKey: !!config.sdkKey,
        adUnitId: config.adUnitId,
        placement: config.placement,
      });

      const success = await appLovinPlugin.initialize(config);
      console.log("[useAppLovinAds] 📊 Plugin initialization result:", success);

      if (success) {
        setIsInitialized(true);
        console.log("[useAppLovinAds] ✅ SDK initialized successfully");
        console.log("[useAppLovinAds] 📈 State updated: isInitialized=true");

        // Set up listeners
        console.log(
          "[useAppLovinAds] 🔍 Step 4: Setting up event listeners...",
        );
        setupListeners();

        // FIX 1: Preload first ad immediately after SDK init (fire and forget)
        // Big apps (TikTok, Candy Crush, etc.) always preload on launch so the
        // ad is cached and shows INSTANTLY when user clicks — no spinner, no wait.
        console.log(
          "[useAppLovinAds] 🔍 Step 5: Preloading first ad in background...",
        );
        const _preloadPlatformInfo = appLovinPlugin.getPlatformInfo();
        if (token) {
          trackAppLovinAdLoad(
            {
              adUnitId: "rewarded",
              placement: "rewarded",
              platform: _preloadPlatformInfo.platform,
              deviceType: _preloadPlatformInfo.deviceType,
              appVersion: "1.0.0",
              sdkVersion: "11.0.0",
            },
            token,
          )
            .then((resp) => {
              if (resp?.success && resp?.data?.adRecordId) {
                currentAdRecordIdRef.current = resp.data.adRecordId;
                console.log(
                  "[useAppLovinAds] ✅ Preload ad record set:",
                  currentAdRecordIdRef.current,
                );
              }
            })
            .catch(() => {});
        }
        appLovinPlugin.loadAd().catch((err) => {
          console.warn(
            "[useAppLovinAds] ⚠️ Background preload failed:",
            err?.message,
          );
        });
        console.log(
          "[useAppLovinAds] ✅ Initialization complete — ad preloading in background",
        );

        return true;
      } else {
        console.error(
          "[useAppLovinAds] ❌ Plugin initialization returned false",
        );
        throw new Error("Failed to initialize AppLovin SDK");
      }
    } catch (err) {
      console.error("[useAppLovinAds] ❌ Initialization error:", err);
      console.error("[useAppLovinAds] 🐛 Error stack:", err?.stack);
      setError(err.message || "Failed to initialize ad SDK");
      console.log(
        "[useAppLovinAds] 📈 State updated: error set, isLoading=false",
      );
      return false;
    } finally {
      setIsLoading(false);
      console.log(
        "[useAppLovinAds] 📈 State updated: isLoading=false (finally)",
      );
    }
  }, [token, isInitialized, setupListeners]);

  /**
   * Load a rewarded ad
   */
  const loadAd = useCallback(async () => {
    console.log("[useAppLovinAds] 📥 Starting ad load process...");
    console.log("[useAppLovinAds] 📋 Current state:", {
      isInitialized,
      initializationAttempted: initializationAttemptedRef.current,
      isAdReady,
      isLoading,
    });

    if (!isInitialized && !initializationAttemptedRef.current) {
      console.log(
        "[useAppLovinAds] ⚠️ SDK not initialized, initializing first...",
      );
      await initializeSDK();
    }

    setIsLoading(true);
    setError(null);
    console.log(
      "[useAppLovinAds] 📈 State updated: isLoading=true, error cleared",
    );

    try {
      const platformInfo = appLovinPlugin.getPlatformInfo();
      console.log("[useAppLovinAds] 📱 Platform info:", platformInfo);

      // Track ad load with backend
      // Note: Send "rewarded" as adUnitId to backend (that's what it expects)
      console.log(
        "[useAppLovinAds] 🔍 Step 1: Tracking ad load with backend...",
      );
      if (token) {
        const loadTrackingData = {
          adUnitId: "rewarded", // Backend expects placement name, not actual ad unit ID
          placement: "rewarded",
          platform: platformInfo.platform,
          deviceType: platformInfo.deviceType,
          appVersion: "1.0.0",
          sdkVersion: "11.0.0",
        };
        console.log(
          "[useAppLovinAds] 📤 Sending load tracking data:",
          loadTrackingData,
        );

        // FIX 2: Fire backend tracking WITHOUT awaiting — start native ad load immediately
        // Before: backend call blocked the ad request, adding 300ms–2s delay every load
        trackAppLovinAdLoad(loadTrackingData, token)
          .then((loadResponse) => {
            if (loadResponse?.success && loadResponse?.data?.adRecordId) {
              currentAdRecordIdRef.current = loadResponse.data.adRecordId;
              console.log(
                "[useAppLovinAds] ✅ Ad record created:",
                currentAdRecordIdRef.current,
              );
            }
          })
          .catch((backendError) => {
            console.error(
              "[useAppLovinAds] ❌ Backend load tracking failed:",
              backendError?.message,
            );
          });
      } else {
        console.warn(
          "[useAppLovinAds] ⚠️ No auth token, skipping backend tracking",
        );
      }

      // FIX 3: If the background preload already loaded an ad, skip the native load entirely
      // This prevents a double-load glitch when user clicks before preload finishes
      if (appLovinPlugin.isAdReady()) {
        console.log(
          "[useAppLovinAds] ✅ Ad already preloaded and ready — skipping native load",
        );
        setIsAdReady(true);
        return true;
      }

      // Load ad via plugin
      console.log(
        "[useAppLovinAds] 🔍 Step 2: Loading ad via native plugin...",
      );
      await appLovinPlugin.loadAd();
      setIsAdReady(true);
      console.log("[useAppLovinAds] ✅ Ad load complete");
      console.log(
        "[useAppLovinAds] 📈 State updated: isAdReady=true, isLoading=false",
      );

      return true;
    } catch (err) {
      console.error("[useAppLovinAds] ❌ Load error:", err);
      console.error("[useAppLovinAds] 🐛 Error details:", {
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
      });
      setError(err.message || "Failed to load ad");
      setIsAdReady(false);
      console.log(
        "[useAppLovinAds] 📈 State updated: error set, isAdReady=false",
      );

      // Track failure
      if (token) {
        console.log(
          "[useAppLovinAds] 🔍 Tracking load failure with backend...",
        );
        await trackAppLovinAdFailure(
          {
            adRecordId: currentAdRecordIdRef.current,
            adUnitId: "rewarded", // Backend expects placement name
            error: err.message || "Failed to load ad",
            errorCode: "LOAD_ERROR",
          },
          token,
        ).catch((trackError) => {
          console.error(
            "[useAppLovinAds] ❌ Failed to track load failure:",
            trackError,
          );
        });
      }

      return false;
    } finally {
      setIsLoading(false);
      console.log(
        "[useAppLovinAds] 📈 State updated: isLoading=false (finally)",
      );
    }
  }, [isInitialized, token, initializeSDK]);

  /**
   * Preload next ad (debounced, single source of truth)
   */
  const preloadNextAd = useCallback(async () => {
    // Avoid duplicate preloads from multiple places (component + plugin + hook)
    if (preloadInFlightRef.current) return;
    preloadInFlightRef.current = true;
    try {
      await loadAd();
    } finally {
      preloadInFlightRef.current = false;
    }
  }, [loadAd]);

  /**
   * Show the rewarded ad
   * @param {Object} options - Options for showing the ad
   * @param {Function} options.onReward - Callback when reward is earned
   * @param {Function} options.onError - Callback when error occurs
   * @returns {Promise<Object>} Reward result or null
   */
  const showAd = useCallback(
    async (options = {}) => {
      const { onReward, onError } = options;

      console.log("[useAppLovinAds] 🎬 Starting ad show process...");
      console.log("[useAppLovinAds] 📋 Current state:", {
        isAdReady,
        isShowingAd,
        hasAdRecordId: !!currentAdRecordIdRef.current,
        hasToken: !!token,
      });

      // Avoid React state race: after loadAd() resolves, isAdReady state may not be updated yet.
      // Use plugin readiness as the source of truth on native.
      const pluginReady = appLovinPlugin.isAdReady?.() === true;
      if (!isAdReady && !pluginReady) {
        const errorMsg = "No ad ready to show. Please wait for ad to load.";
        console.error("[useAppLovinAds] ❌ Ad not ready:", errorMsg);
        setError(errorMsg);
        onError?.(errorMsg);
        return null;
      }
      if (!isAdReady && pluginReady) {
        console.log(
          "[useAppLovinAds] ✅ Plugin reports ad is ready (state race). Proceeding...",
        );
        setIsAdReady(true);
      }

      setIsShowingAd(true);
      setError(null);
      console.log(
        "[useAppLovinAds] 📈 State updated: isShowingAd=true, error cleared",
      );

      try {
        // Track ad display with backend
        console.log(
          "[useAppLovinAds] 🔍 Step 1: Tracking ad display with backend...",
        );
        // FIX 4: Fire display tracking WITHOUT awaiting — show ad IMMEDIATELY
        // Before: backend call added 300ms–2s delay between user click and ad appearing
        if (token && currentAdRecordIdRef.current) {
          trackAppLovinAdDisplay(currentAdRecordIdRef.current, token)
            .then(() =>
              console.log(
                "[useAppLovinAds] ✅ Ad display tracked with backend",
              ),
            )
            .catch((displayError) => {
              console.error(
                "[useAppLovinAds] ❌ Backend display tracking failed:",
                displayError?.message,
              );
            });
        }

        // Show ad via plugin — now fires INSTANTLY after user clicks
        console.log(
          "[useAppLovinAds] 🔍 Step 2: Showing ad via native plugin...",
        );
        console.log(
          '[useAppLovinAds] 📤 Calling appLovinPlugin.showAd("rewarded")...',
        );
        const result = await appLovinPlugin.showAd("rewarded");

        console.log(
          "[useAppLovinAds] ✅ Ad show complete, result received:",
          result,
        );
        console.log("[useAppLovinAds] 📊 Result details:", {
          hasReward: !!result?.reward,
          rewardAmount: result?.reward?.amount,
          rewardCurrency: result?.reward?.currency,
          hasAdInfo: !!result?.adInfo,
          adNetwork: result?.adInfo?.adNetwork,
          networkName: result?.adInfo?.networkName,
          revenue: result?.adInfo?.revenue,
        });

        // Track completion with backend
        console.log(
          "[useAppLovinAds] 🔍 Step 3: Tracking ad completion with backend...",
        );
        if (token && currentAdRecordIdRef.current) {
          const platformInfo = appLovinPlugin.getPlatformInfo();
          console.log(
            "[useAppLovinAds] 📱 Platform info for completion:",
            platformInfo,
          );

          try {
            const normalizedRevenue = normalizeRevenue(result?.adInfo?.revenue);
            // Prepare completion payload
            const completionPayload = {
              adRecordId: currentAdRecordIdRef.current,
              reward: {
                amount: result.reward?.amount || 100,
                currency: result.reward?.currency || "coins",
              },
              adNetwork: result.adInfo?.adNetwork || "mock_network",
              networkName: result.adInfo?.networkName || "Mock Network",
              revenue: normalizedRevenue,
              metadata: {
                platform: platformInfo.platform,
                country: "US",
                deviceType: platformInfo.deviceType,
                appVersion: "1.0.0",
                sdkVersion: "11.0.0",
              },
            };

            console.log("[useAppLovinAds] 📤 Sending completion payload:");
            console.log(
              "[useAppLovinAds] 📋 Payload:",
              JSON.stringify(completionPayload, null, 2),
            );

            const completionResponse = await trackAppLovinAdComplete(
              completionPayload,
              token,
            );

            console.log("[useAppLovinAds] ✅ Completion tracked with backend");
            console.log(
              "[useAppLovinAds] 📥 Completion response:",
              completionResponse,
            );
            console.log("[useAppLovinAds] 📊 Response data:", {
              success: completionResponse?.success,
              hasData: !!completionResponse?.data,
              coinsAwarded: completionResponse?.data?.coinsAwarded,
              xpAwarded: completionResponse?.data?.xpAwarded,
              transactionId: completionResponse?.data?.transactionId,
            });

            // Update reward with backend response if available
            if (completionResponse?.success && completionResponse?.data) {
              const backendReward = {
                coins:
                  completionResponse.data.coinsAwarded ||
                  result.reward?.amount ||
                  100,
                xp: completionResponse.data.xpAwarded || 5,
                ...completionResponse.data,
              };
              console.log(
                "[useAppLovinAds] 💰 Backend reward processed:",
                backendReward,
              );
              setLastReward(backendReward);
              onReward?.(backendReward);
              console.log(
                "[useAppLovinAds] 📈 State updated: lastReward set, onReward callback called",
              );

              // Refresh stats
              console.log("[useAppLovinAds] 🔍 Refreshing ad stats...");
              fetchAdStats();

              // Preload next ad
              console.log("[useAppLovinAds] 🔍 Preloading next ad...");
              preloadNextAd();

              console.log(
                "[useAppLovinAds] ✅ Ad show process complete with backend reward",
              );
              return backendReward;
            } else {
              console.warn(
                "[useAppLovinAds] ⚠️ Backend completion response invalid, using fallback",
              );
            }
          } catch (completeError) {
            console.error(
              "[useAppLovinAds] ❌ Backend completion tracking failed:",
              completeError,
            );
            console.error("[useAppLovinAds] 🐛 Completion error details:", {
              message: completeError?.message,
              response: completeError?.response,
              status: completeError?.response?.status,
              data: completeError?.response?.data,
            });
            // Continue with fallback reward
          }
        } else {
          console.warn("[useAppLovinAds] ⚠️ Cannot track completion:", {
            hasToken: !!token,
            hasAdRecordId: !!currentAdRecordIdRef.current,
          });
        }

        // Fallback reward
        console.log(
          "[useAppLovinAds] 💰 Using fallback reward (no backend tracking)",
        );
        const reward = {
          coins: result.reward?.amount || 100,
          xp: 5,
          success: true,
        };
        console.log("[useAppLovinAds] 📊 Fallback reward:", reward);
        setLastReward(reward);
        onReward?.(reward);
        console.log(
          "[useAppLovinAds] 📈 State updated: lastReward set (fallback)",
        );

        // Preload next ad
        console.log("[useAppLovinAds] 🔍 Preloading next ad...");
        preloadNextAd();

        console.log(
          "[useAppLovinAds] ✅ Ad show process complete with fallback reward",
        );
        return reward;
      } catch (err) {
        console.error("[useAppLovinAds] ❌ Show error:", err);
        console.error("[useAppLovinAds] 🐛 Error details:", {
          message: err?.message,
          stack: err?.stack,
          name: err?.name,
        });
        setError(err.message || "Failed to show ad");
        onError?.(err.message || "Failed to show ad");
        console.log("[useAppLovinAds] 📈 State updated: error set");

        // Track failure
        if (token && currentAdRecordIdRef.current) {
          console.log(
            "[useAppLovinAds] 🔍 Tracking display failure with backend...",
          );
          await trackAppLovinAdFailure(
            {
              adRecordId: currentAdRecordIdRef.current,
              adUnitId: "rewarded", // Backend expects placement name
              error: err.message || "Failed to display ad",
              errorCode: "DISPLAY_ERROR",
            },
            token,
          ).catch((trackError) => {
            console.error(
              "[useAppLovinAds] ❌ Failed to track display failure:",
              trackError,
            );
          });
        }

        // Preload next ad
        console.log("[useAppLovinAds] 🔍 Preloading next ad after error...");
        preloadNextAd();

        return null;
      } finally {
        setIsShowingAd(false);
        currentAdRecordIdRef.current = null;
        console.log(
          "[useAppLovinAds] 📈 State updated: isShowingAd=false, adRecordId cleared (finally)",
        );
      }
    },
    [isAdReady, token, preloadNextAd, normalizeRevenue],
  );

  /**
   * Fetch user's ad statistics
   */
  const fetchAdStats = useCallback(async () => {
    if (!token) return null;

    try {
      const response = await getAppLovinAdStats(token);
      if (response?.success && response?.data) {
        setAdStats(response.data);
        return response.data;
      }
    } catch (err) {
      console.error("[useAppLovinAds] Failed to fetch stats:", err);
    }
    return null;
  }, [token]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset and reinitialize
   */
  const reset = useCallback(async () => {
    appLovinPlugin.destroy();
    initializationAttemptedRef.current = false;
    currentAdRecordIdRef.current = null;
    setIsInitialized(false);
    setIsLoading(false);
    setIsAdReady(false);
    setIsShowingAd(false);
    setError(null);
    setLastReward(null);

    return initializeSDK();
  }, [initializeSDK]);

  // Initialize SDK on mount when token is available.
  // initializeSDK is intentionally omitted from deps: the initializationAttemptedRef
  // ref guard inside the function already prevents repeated calls, and including the
  // callback reference would cause the effect to re-run every time initializeSDK is
  // recreated (e.g. when sdkConfig or token changes), bypassing the ref guard.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (token && !isInitialized && !initializationAttemptedRef.current) {
      initializeSDK();
    }
  }, [token, isInitialized]);

  // Fetch stats when initialized
  useEffect(() => {
    if (isInitialized && token) {
      fetchAdStats();
    }
  }, [isInitialized, token, fetchAdStats]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Don't destroy singleton on unmount, just remove listeners
    };
  }, []);

  return {
    // State
    isInitialized,
    isLoading,
    isAdReady,
    isShowingAd,
    error,
    sdkConfig,
    adStats,
    lastReward,

    // Functions
    initializeSDK,
    loadAd,
    showAd,
    fetchAdStats,
    clearError,
    reset,

    // Platform info
    platformInfo: appLovinPlugin.getPlatformInfo(),

    // Ad consent (Google UMP) – use in Settings for "Manage ad choices" / "Privacy options"
    showPrivacyOptionsForm,

    // Opens AppLovin Mediation Debugger — shows which networks are active/verified
    // Only works on real device after APK build (not in browser)
    showMediationDebugger: () => appLovinPlugin.showMediationDebugger(),
  };
};
