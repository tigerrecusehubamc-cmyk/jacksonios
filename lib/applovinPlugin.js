/**
 * AppLovin MAX Capacitor Plugin Bridge
 * 
 * This module provides a bridge between the React frontend and the native AppLovin MAX SDK.
 * For web development, it provides a mock implementation.
 * For native mobile (Android/iOS via Capacitor), it interfaces with the native SDK.
 * 
 * Ad Unit IDs (iOS — active):
 * - iOS Rewarded: b3bf29fc650db20d
 * - Google AdMob App ID (iOS): ca-app-pub-2800391972465887~6894931313
 * Android IDs kept in APPLOVIN_CONFIG for reference but not used.
 */

import { Capacitor } from '@capacitor/core';

/**
 * Dynamically load AppLovin MAX Cordova plugin JavaScript
 * This is needed because Capacitor doesn't automatically load Cordova plugin JS
 */
const loadAppLovinPluginScript = async () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  
  // Check if already loaded
  // cordova-plugin-applovin-max clobbers `window.applovin` (see cordova_plugins.js)
  if (window.applovin || window.AppLovinMAX) {
    console.log('[AppLovin] ✅ Plugin script already loaded');
    return true;
  }
  
  // Try to load from common locations
  const scriptPaths = [
    // In your built Android assets this file is lowercase: plugins/.../applovinmax.js
    '/plugins/cordova-plugin-applovin-max/www/applovinmax.js',
  ];
  
  for (const path of scriptPaths) {
    try {
      console.log(`[AppLovin] 🔍 Trying to load plugin from: ${path}`);
      const script = document.createElement('script');
      script.src = path;
      script.async = false;
      
      await new Promise((resolve, reject) => {
        script.onload = () => {
          console.log(`[AppLovin] ✅ Plugin script loaded from: ${path}`);
          // cordova-plugin-applovin-max exposes global `applovin`
          if (window.applovin || window.AppLovinMAX) {
            resolve();
          } else {
            reject(new Error('Script loaded but AppLovin global not found (expected window.applovin)'));
          }
        };
        script.onerror = () => {
          console.log(`[AppLovin] ❌ Failed to load from: ${path}`);
          reject(new Error(`Failed to load script from ${path}`));
        };
        document.head.appendChild(script);
      });
      
      return true;
    } catch (error) {
      console.log(`[AppLovin] ⚠️ Could not load from ${path}:`, error.message);
      continue;
    }
  }
  
  return false;
};

// AppLovin MAX Configuration
// Ad Unit IDs loaded from environment variables
export const APPLOVIN_CONFIG = {
  SDK_KEY: process.env.NEXT_PUBLIC_APPLOVIN_SDK_KEY || "", // AppLovin SDK Key from environment
  AD_UNIT_ID: {
    ANDROID_REWARDED: process.env.NEXT_PUBLIC_APPLOVIN_AD_UNIT_ANDROID_REWARDED,
    IOS_REWARDED: process.env.NEXT_PUBLIC_APPLOVIN_AD_UNIT_IOS_REWARDED,
  },
  GOOGLE_ADMOB_APP_ID: {
    ANDROID: process.env.NEXT_PUBLIC_ADMOB_APP_ID_ANDROID,
    IOS: process.env.NEXT_PUBLIC_ADMOB_APP_ID_IOS,
  },
};

// Check if running on native platform
const isNative = Capacitor.isNativePlatform();
const platform = Capacitor.getPlatform();

/**
 * Wait for Cordova deviceready on native platforms.
 * Cordova plugin registration may not be complete until this event fires.
 */
const waitForCordovaReady = async (timeout = 5000) => {
  if (typeof window === 'undefined' || !window.cordova) return false;
  if (window.cordova?.device?.ready) return true;

  return new Promise((resolve) => {
    let resolved = false;
    const cleanup = () => {
      document.removeEventListener('deviceready', onDeviceReady);
      clearTimeout(timer);
    };

    const onDeviceReady = () => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(true);
      }
    };

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    }, timeout);

    document.addEventListener('deviceready', onDeviceReady, false);
  });
};

/**
 * Check if AppLovin plugin is available
 * Works with Capacitor native plugin, Cordova plugin, or global
 * 
 * The cordova-plugin-applovin-max exposes AppLovinMAX on window
 * after Cordova's deviceready event
 */
const getAppLovinPlugin = () => {
  if (typeof window === 'undefined') return null;
  
  console.log('[AppLovin] 🔍 Checking for AppLovin plugin...');
  console.log('[AppLovin] 📊 Window check:', {
    hasWindow: typeof window !== 'undefined',
    hasApplovin: typeof window.applovin !== 'undefined',
    hasAppLovinMAX: typeof window.AppLovinMAX !== 'undefined',
    hasCapacitor: typeof window.Capacitor !== 'undefined',
    hasCordova: typeof window.cordova !== 'undefined',
    deviceready: window.cordova?.device?.ready || false,
  });
  
  // Cordova plugin (cordova-plugin-applovin-max) clobbers global `applovin`
  // cordova_plugins.js: clobbers: ["applovin"]
  if (window.applovin) {
    console.log('[AppLovin] ✅ Found window.applovin');
    console.log('[AppLovin] 📊 applovin keys:', Object.keys(window.applovin || {}));

    if (typeof window.applovin.initialize === 'function') {
      console.log('[AppLovin] ✅ Found cordova-plugin-applovin-max (applovin.initialize exists)');
      return { type: 'cordova', plugin: window.applovin };
    } else {
      console.warn('[AppLovin] ⚠️ window.applovin exists but initialize is not a function');
    }
  }
  
  // Check for Capacitor plugin via Capacitor.Plugins
  if (window.Capacitor?.Plugins?.AppLovinMAX) {
    console.log('[AppLovin] ✅ Found Capacitor.Plugins.AppLovinMAX');
    return { type: 'capacitor', plugin: window.Capacitor.Plugins.AppLovinMAX };
  }
  
  // Some setups might attach it here (not used by cordova-plugin-applovin-max by default)
  if (window.cordova?.plugins?.AppLovinMax) {
    console.log('[AppLovin] ✅ Found window.cordova.plugins.AppLovinMax');
    return { type: 'cordova', plugin: window.cordova.plugins.AppLovinMax };
  }
  
  // Check for AppLovin global (some plugins expose it this way)
  if (window.AppLovin) {
    console.log('[AppLovin] ✅ Found window.AppLovin');
    return { type: 'global', plugin: window.AppLovin };
  }
  
  console.warn('[AppLovin] ❌ No AppLovin plugin found');
  return null;
};

/**
 * AppLovin MAX Plugin Interface
 * Provides methods for initializing SDK and showing rewarded ads
 */
class AppLovinMAXPlugin {
  constructor() {
    this.isInitialized = false;
    this.sdkKey = null;
    this.adUnitId = null;
    this.isAdLoaded = false;
    this.adLoadListeners = [];
    this.adDisplayListeners = [];
    this.adCompleteListeners = [];
    this.adFailListeners = [];
    this.currentAdInfo = null;
    this.nativePlugin = null; // Reference to native plugin
    this.pluginType = null; // 'capacitor', 'cordova', or 'global'
    this.completionFired = false; // Flag to prevent multiple completion events
  }

  /**
   * Initialize the AppLovin MAX SDK
   * @param {Object} config - Configuration object
   * @param {string} config.sdkKey - AppLovin SDK key from backend
   * @param {string} config.adUnitId - Ad unit ID for the platform
   * @returns {Promise<boolean>} Success status
   */
  async initialize(config = {}) {
    console.log('[AppLovin] 🚀 Starting plugin initialization...');
    console.log('[AppLovin] 📋 Initial config:', {
      hasSdkKey: !!config.sdkKey,
      adUnitId: config.adUnitId,
      placement: config.placement,
      platform: platform,
      isNative,
    });
    
    try {
      this.sdkKey = config.sdkKey || APPLOVIN_CONFIG.SDK_KEY;
      this.adUnitId = config.adUnitId || this.getDefaultAdUnitId();
      console.log('[AppLovin] 📋 Final config values:', {
        hasSdkKey: !!this.sdkKey,
        sdkKeyPreview: this.sdkKey ? '***' + this.sdkKey.slice(-10) : 'missing',
        adUnitId: this.adUnitId,
      });

      if (isNative) {
        // Native initialization
        console.log('[AppLovin] 📱 Native platform detected, initializing native SDK...');
        console.log('[AppLovin] 🔍 Checking for native plugin...');
        console.log('[AppLovin] 🌐 Window object available:', typeof window !== 'undefined');
        console.log('[AppLovin] 🔍 Checking window.applovin:', typeof window?.applovin);
        console.log('[AppLovin] 🔍 Checking window.AppLovinMAX (legacy):', typeof window?.AppLovinMAX);
        console.log('[AppLovin] 🔍 Checking window.Capacitor?.Plugins?.AppLovinMAX:', typeof window?.Capacitor?.Plugins?.AppLovinMAX);
        console.log('[AppLovin] 🔍 Checking window.cordova?.plugins?.AppLovinMax:', typeof window?.cordova?.plugins?.AppLovinMax);
        
        // Wait for Cordova deviceready before plugin detection
        if (window.cordova && !window.cordova?.device?.ready) {
          console.log('[AppLovin] ⏳ Waiting for Cordova deviceready before AppLovin plugin detection...');
          const cordovaReady = await waitForCordovaReady(7000);
          console.log('[AppLovin] ⏳ Cordova deviceready result:', cordovaReady);
        }

        let pluginInfo = getAppLovinPlugin();
        
        // If plugin not found and we're on native, try to load it and retry
        if (!pluginInfo && isNative) {
          console.log('[AppLovin] ⏳ Plugin not found immediately, attempting to load...');
          console.log('[AppLovin] 📊 Current state:', {
            readyState: typeof document !== 'undefined' ? document.readyState : 'N/A',
            hasCapacitor: typeof window?.Capacitor !== 'undefined',
            hasCordova: typeof window?.cordova !== 'undefined',
            cordovaReady: window.cordova?.device?.ready || false,
          });
          
          // Try to dynamically load the plugin script
          try {
            const loaded = await loadAppLovinPluginScript();
            if (loaded) {
              pluginInfo = getAppLovinPlugin();
            }
          } catch (error) {
            console.warn('[AppLovin] ⚠️ Failed to load plugin script:', error);
          }
          
          // If still not found, retry checking (plugin might load asynchronously)
          if (!pluginInfo) {
            console.log('[AppLovin] 🔄 Retrying plugin detection...');
            for (let attempt = 0; attempt < 5; attempt++) {
              await new Promise(resolve => setTimeout(resolve, 300 * (attempt + 1)));
              pluginInfo = getAppLovinPlugin();
              
              if (pluginInfo) {
                console.log(`[AppLovin] ✅ Plugin found after ${attempt + 1} retry(ies)!`);
                break;
              } else {
                console.log(`[AppLovin] 🔄 Retry ${attempt + 1}/5: Plugin still not found...`);
              }
            }
          }
          
          // Final check
          if (!pluginInfo) {
            console.warn('[AppLovin] ⚠️ Plugin still not found after all attempts');
            console.warn('[AppLovin] 💡 Solutions:');
            console.warn('[AppLovin]   1. Copy AppLovinMax.js to public/plugins/ folder');
            console.warn('[AppLovin]   2. Add script tag to index.html');
            console.warn('[AppLovin]   3. Check capacitor.config.ts for plugin configuration');
            console.warn('[AppLovin] 📝 See APPLOVIN_PLUGIN_NOT_LOADING_FIX.md for details');
          }
        }
        
        console.log('[AppLovin] 📊 Plugin detection result:', {
          found: !!pluginInfo,
          type: pluginInfo?.type || 'none',
          hasPlugin: !!pluginInfo?.plugin,
        });
        
        if (pluginInfo) {
          console.log('[AppLovin] ✅ Native plugin found (' + pluginInfo.type + '), initializing...');
          this.nativePlugin = pluginInfo.plugin;
          this.pluginType = pluginInfo.type;
          
          try {
            if (pluginInfo.type === 'cordova') {
              // Cordova plugin initialization (cordova-plugin-applovin-max)
              // API: initialize(sdkKey, callback)
              console.log('[AppLovin] Initializing Cordova plugin with SDK key...');
              await new Promise((resolve, reject) => {
                try {
                  pluginInfo.plugin.initialize(this.sdkKey, (config) => {
                    console.log('[AppLovin] Cordova init success:', config);

                    // Helpful for diagnosing "no ads / timeouts" during development.
                    // (In production you typically keep verbose logging OFF.)
                    try {
                      if (typeof process !== 'undefined' && process.env?.NODE_ENV !== 'production') {
                        pluginInfo.plugin.setVerboseLogging(true);
                        console.log('[AppLovin] ✅ Verbose logging enabled (dev mode)');
                      }
                    } catch (e) {
                      console.log('[AppLovin] ⚠️ Could not enable verbose logging:', e?.message || e);
                    }
                    
                    // Set up event listeners for rewarded ads
                    this.setupCordovaListeners();
                    
                    resolve(config);
                  });
                } catch (err) {
                  console.error('[AppLovin] Cordova init error:', err);
                  reject(err);
                }
              });
            } else if (pluginInfo.type === 'capacitor') {
              // Capacitor plugin initialization
              const result = await pluginInfo.plugin.initialize({
                sdkKey: this.sdkKey,
                adUnitId: this.adUnitId,
              });
              console.log('[AppLovin] Capacitor init result:', result);
              
              // Set up Capacitor listeners
              this.setupCapacitorListeners();
            } else {
              // Global plugin
              await pluginInfo.plugin.initialize({
                sdkKey: this.sdkKey,
                adUnitId: this.adUnitId,
              });
              this.setupNativeListeners();
            }
            
            console.log('[AppLovin] ✅ Native SDK initialized successfully');
          } catch (error) {
            console.error('[AppLovin] ❌ Native SDK initialization failed:', error);
            console.warn('[AppLovin] Falling back to mock implementation');
            this.nativePlugin = null;
            this.pluginType = null;
          }
        } else {
          console.warn('[AppLovin] ⚠️ Native plugin not available');
          console.warn('[AppLovin] To use real ads, install: npm install cordova-plugin-applovin-max');
          console.warn('[AppLovin] Then run: npx cap sync android');
          console.warn('[AppLovin] Using mock implementation for now');
          // Fall back to mock for development
        }
      } else {
        // Web mock initialization
        console.log('[AppLovin] Running in web mode - using mock implementation');
      }

      this.isInitialized = true;
      console.log('[AppLovin] SDK initialized successfully');
      return true;
    } catch (error) {
      console.error('[AppLovin] SDK initialization failed:', error);
      return false;
    }
  }

  /**
   * Get the default ad unit ID based on platform
   * @returns {string} Ad unit ID
   */
  getDefaultAdUnitId() {
    if (platform === 'android') {
      return APPLOVIN_CONFIG.AD_UNIT_ID.ANDROID_REWARDED;
    } else if (platform === 'ios') {
      return APPLOVIN_CONFIG.AD_UNIT_ID.IOS_REWARDED;
    }
    // For web, return Android as default for testing
    return APPLOVIN_CONFIG.AD_UNIT_ID.ANDROID_REWARDED;
  }

  /**
   * Set up Cordova event listeners (cordova-plugin-applovin-max)
   * The plugin fires events on window object
   */
  setupCordovaListeners() {
    console.log('[AppLovin] Setting up Cordova event listeners...');

    const normalizeCordovaEvent = (evt) => {
      // Cordova plugins typically dispatch CustomEvent with payload in `detail`
      if (evt && typeof evt === 'object' && 'detail' in evt) {
        // Prefer CustomEvent.detail when present; otherwise avoid passing the raw Event around.
        if (evt.detail !== undefined && evt.detail !== null) return evt.detail;
      }

      const payload = evt;
      if (typeof payload === 'string') {
        try {
          return JSON.parse(payload);
        } catch {
          return { message: payload };
        }
      }
      return payload;
    };
    
    // Ad loaded
    window.addEventListener('OnRewardedAdLoadedEvent', (event) => {
      const adInfo = normalizeCordovaEvent(event);
      console.log('[AppLovin] Rewarded ad loaded:', adInfo);
      this.isAdLoaded = true;
      this.currentAdInfo = adInfo;
      this.adLoadListeners.forEach(listener => listener(adInfo));
    });

    // Ad load failed
    window.addEventListener('OnRewardedAdLoadFailedEvent', (event) => {
      const errorInfo = normalizeCordovaEvent(event);
      console.error('[AppLovin] Rewarded ad load failed:', errorInfo);
      this.isAdLoaded = false;
      this.adFailListeners.forEach(listener => listener({
        type: 'load',
        error: errorInfo.message || 'Failed to load ad',
        errorCode: errorInfo.code || 'LOAD_ERROR',
      }));
    });

    // Ad displayed
    window.addEventListener('OnRewardedAdDisplayedEvent', (event) => {
      const adInfo = normalizeCordovaEvent(event);
      console.log('[AppLovin] Rewarded ad displayed:', adInfo);
      this.adDisplayListeners.forEach(listener => listener(adInfo));
    });

    // Ad hidden (closed)
    window.addEventListener('OnRewardedAdHiddenEvent', (event) => {
      const adInfo = normalizeCordovaEvent(event);
      console.log('[AppLovin] Rewarded ad hidden:', adInfo);
    });

    // Ad clicked
    window.addEventListener('OnRewardedAdClickedEvent', (event) => {
      const adInfo = normalizeCordovaEvent(event);
      console.log('[AppLovin] Rewarded ad clicked:', adInfo);
    });

    // Reward received - THIS IS THE KEY EVENT FOR COMPLETION
    window.addEventListener('OnRewardedAdReceivedRewardEvent', (event) => {
      // Prevent multiple completion events from firing
      if (this.completionFired) {
        console.warn('[AppLovin] ⚠️ Completion event already fired, ignoring duplicate');
        return;
      }
      
      this.completionFired = true;
      
      const rewardInfo = normalizeCordovaEvent(event);
      console.log('[AppLovin] ✅ Reward received event fired:', rewardInfo);
      this.isAdLoaded = false;
      
      // Format reward for our listeners
      const result = {
        reward: {
          amount: rewardInfo.amount || 100,
          currency: rewardInfo.label || 'coins',
        },
        adInfo: {
          adUnitId: rewardInfo.adUnitId || this.adUnitId,
          networkName: rewardInfo.networkName || 'AppLovin',
          adNetwork: (rewardInfo.networkName || 'applovin').toLowerCase().replace(/\s+/g, '_'),
          // Revenue is often available on adInfo; fall back gracefully.
          revenue: rewardInfo.revenue ?? this.currentAdInfo?.revenue ?? 0,
        },
      };
      
      console.log('[AppLovin] 📢 Notifying', this.adCompleteListeners.length, 'completion listeners');
      this.adCompleteListeners.forEach(listener => {
        try {
          listener(result);
        } catch (err) {
          console.error('[AppLovin] ❌ Error in completion listener:', err);
        }
      });
      
      // Clear all completion listeners after successful completion to prevent multiple calls
      this.adCompleteListeners = [];
    });

    // Ad display failed
    window.addEventListener('OnRewardedAdFailedToDisplayEvent', (event) => {
      const errorInfo = normalizeCordovaEvent(event);
      console.error('[AppLovin] Rewarded ad display failed:', errorInfo);
      this.adFailListeners.forEach(listener => listener({
        type: 'display',
        error: errorInfo.message || 'Failed to display ad',
        errorCode: errorInfo.code || 'DISPLAY_ERROR',
      }));
    });

    console.log('[AppLovin] Cordova event listeners set up');
  }

  /**
   * Set up Capacitor event listeners
   */
  setupCapacitorListeners() {
    if (!this.nativePlugin) return;
    
    // Capacitor plugins use addListener method
    this.nativePlugin.addListener('rewardedAdLoaded', (adInfo) => {
      console.log('[AppLovin] Ad loaded:', adInfo);
      this.isAdLoaded = true;
      this.currentAdInfo = adInfo;
      this.adLoadListeners.forEach(listener => listener(adInfo));
    });

    this.nativePlugin.addListener('rewardedAdFailedToLoad', (error) => {
      console.error('[AppLovin] Ad failed to load:', error);
      this.isAdLoaded = false;
      this.adFailListeners.forEach(listener => listener({
        type: 'load',
        error: error.error || 'Failed to load ad',
        errorCode: error.errorCode || 'LOAD_ERROR',
      }));
    });

    this.nativePlugin.addListener('rewardedAdDisplayed', (adInfo) => {
      console.log('[AppLovin] Ad displayed:', adInfo);
      this.adDisplayListeners.forEach(listener => listener(adInfo));
    });

    this.nativePlugin.addListener('rewardedAdReceivedReward', (result) => {
      // Prevent multiple completion events from firing
      if (this.completionFired) {
        console.warn('[AppLovin] ⚠️ Capacitor completion event already fired, ignoring duplicate');
        return;
      }
      
      this.completionFired = true;
      console.log('[AppLovin] ✅ Capacitor reward received:', result);
      this.isAdLoaded = false;
      
      this.adCompleteListeners.forEach(listener => {
        try {
          listener(result);
        } catch (err) {
          console.error('[AppLovin] ❌ Error in Capacitor completion listener:', err);
        }
      });
      
      // Clear listeners after completion
      this.adCompleteListeners = [];
    });

    this.nativePlugin.addListener('rewardedAdFailedToDisplay', (error) => {
      console.error('[AppLovin] Ad failed to display:', error);
      this.adFailListeners.forEach(listener => listener({
        type: 'display',
        error: error.error || 'Failed to display ad',
        errorCode: error.errorCode || 'DISPLAY_ERROR',
      }));
    });

    this.nativePlugin.addListener('rewardedAdHidden', (adInfo) => {
      console.log('[AppLovin] Ad hidden:', adInfo);
    });
  }

  /**
   * Set up native event listeners (for legacy/other plugins)
   */
  setupNativeListeners() {
    if (!window.AppLovinMAX) return;

    // Ad loaded
    window.AppLovinMAX.addRewardedAdLoadedListener((adInfo) => {
      console.log('[AppLovin] Ad loaded:', adInfo);
      this.isAdLoaded = true;
      this.currentAdInfo = adInfo;
      this.adLoadListeners.forEach(listener => listener(adInfo));
    });

    // Ad load failed
    window.AppLovinMAX.addRewardedAdFailedToLoadListener((error) => {
      console.error('[AppLovin] Ad failed to load:', error);
      this.isAdLoaded = false;
      this.adFailListeners.forEach(listener => listener({
        type: 'load',
        error: error.message || 'Failed to load ad',
        errorCode: error.code || 'LOAD_ERROR',
      }));
    });

    // Ad displayed
    window.AppLovinMAX.addRewardedAdDisplayedListener((adInfo) => {
      console.log('[AppLovin] Ad displayed:', adInfo);
      this.adDisplayListeners.forEach(listener => listener(adInfo));
    });

    // Ad completed (user watched full ad)
    window.AppLovinMAX.addRewardedAdReceivedRewardListener((reward) => {
      console.log('[AppLovin] Reward received:', reward);
      this.isAdLoaded = false;
      this.adCompleteListeners.forEach(listener => listener({
        reward,
        adInfo: this.currentAdInfo,
      }));
    });

    // Ad hidden (closed)
    window.AppLovinMAX.addRewardedAdHiddenListener((adInfo) => {
      console.log('[AppLovin] Ad hidden:', adInfo);
    });

    // Ad display failed
    window.AppLovinMAX.addRewardedAdFailedToDisplayListener((error) => {
      console.error('[AppLovin] Ad failed to display:', error);
      this.adFailListeners.forEach(listener => listener({
        type: 'display',
        error: error.message || 'Failed to display ad',
        errorCode: error.code || 'DISPLAY_ERROR',
      }));
    });
  }

  /**
   * Load a rewarded ad
   * @returns {Promise<Object>} Ad info when loaded
   */
  async loadAd() {
    if (!this.isInitialized) {
      throw new Error('SDK not initialized');
    }

    if (isNative && this.nativePlugin) {
      // Native ad loading with retry logic
      return new Promise((resolve, reject) => {
        // Cordova MAX SDK can sometimes take longer on slow networks; keep JS timeout generous.
        const timeoutMs = this.pluginType === 'cordova' ? 120000 : 90000; // Increased to 120s for Cordova, 90s for Capacitor
        let retryCount = 0;
        const maxRetries = 3;
        
        const attemptLoad = () => {
          const loadTimeout = setTimeout(() => {
            if (retryCount < maxRetries) {
              retryCount++;
              console.log(`[AppLovin] ⏳ Ad load timeout, retrying (${retryCount}/${maxRetries})...`);
              clearTimeout(loadTimeout);
              this.removeLoadListener(onLoaded);
              this.removeFailListener(onFailed);
              // Retry after a short delay
              setTimeout(() => {
                attemptLoad();
              }, 2000);
            } else {
              clearTimeout(loadTimeout);
              this.removeLoadListener(onLoaded);
              this.removeFailListener(onFailed);
              reject(new Error('Ad load timeout after retries. Please check your network connection.'));
            }
          }, timeoutMs);

          const onLoaded = (adInfo) => {
            clearTimeout(loadTimeout);
            this.removeLoadListener(onLoaded);
            this.removeFailListener(onFailed);
            console.log(`[AppLovin] ✅ Ad loaded successfully${retryCount > 0 ? ` (after ${retryCount} retry)` : ''}`);
            resolve(adInfo);
          };

          const onFailed = (error) => {
            clearTimeout(loadTimeout);
            const errorMsg = error?.error || error?.message || 'Failed to load ad';
            
              // Check if it's a network error that we should retry
              const isNetworkError = errorMsg.toLowerCase().includes('timeout') || 
                                     errorMsg.toLowerCase().includes('network') ||
                                     errorMsg.toLowerCase().includes('connection') ||
                                     errorMsg.toLowerCase().includes('socket');
              
              if (isNetworkError && retryCount < maxRetries) {
                retryCount++;
                console.log(`[AppLovin] ⚠️ Network error detected, retrying (${retryCount}/${maxRetries}):`, errorMsg);
                this.removeLoadListener(onLoaded);
                this.removeFailListener(onFailed);
                // Retry after a longer delay for network issues
                setTimeout(() => {
                  attemptLoad();
                }, 3000 + (retryCount * 2000)); // Progressive delay: 3s, 5s, 7s
              } else {
                // For final network timeout error, provide more descriptive message
                const finalErrorMsg = isNetworkError 
                  ? `Network timeout after ${retryCount} retries. Please check your internet connection and try again.`
                  : errorMsg;
                this.removeLoadListener(onLoaded);
                this.removeFailListener(onFailed);
                reject(new Error(finalErrorMsg));
              }
          };

          // Set up listeners and start loading
          this.addLoadListener(onLoaded);
          this.addFailListener(onFailed);

          // Use appropriate method based on plugin type
          if (this.pluginType === 'cordova') {
            // Cordova plugin (cordova-plugin-applovin-max) API:
            // loadRewardedAd(adUnitId) - no callbacks, fires events
            console.log('[AppLovin] Loading rewarded ad with unit ID:', this.adUnitId);
            this.nativePlugin.loadRewardedAd(this.adUnitId);
          } else if (this.pluginType === 'capacitor') {
            // Capacitor plugin uses Promise-based API
            this.nativePlugin.loadRewardedAd({ adUnitId: this.adUnitId })
              .then((adInfo) => {
                onLoaded(adInfo);
              })
              .catch((error) => {
                onFailed({ error: error.message || 'Failed to load ad' });
              });
          } else {
            this.nativePlugin.loadRewardedAd(this.adUnitId);
          }
        };

        // Start the first attempt
        attemptLoad();
      });
    } else {
      // Web mock - simulate ad loading
      console.log('[AppLovin Mock] Loading ad...');
      return new Promise((resolve) => {
        setTimeout(() => {
          this.isAdLoaded = true;
          this.currentAdInfo = {
            adUnitId: this.adUnitId,
            networkName: 'Mock Network',
            networkPlacement: 'test',
            creativeId: 'mock_creative_' + Date.now(),
            revenue: 0.01,
            revenuePrecision: 'estimated',
          };
          console.log('[AppLovin Mock] Ad loaded');
          this.adLoadListeners.forEach(listener => listener(this.currentAdInfo));
          resolve(this.currentAdInfo);
        }, 1500); // Simulate 1.5s load time
      });
    }
  }

  /**
   * Check if an ad is ready to show
   * @returns {boolean} Whether ad is ready
   */
  isAdReady() {
    if (isNative && this.nativePlugin) {
      if (this.pluginType === 'cordova') {
        // Cordova plugin (cordova-plugin-applovin-max) API:
        // isRewardedAdReady(adUnitId) - returns boolean synchronously
        // The plugin tracks state internally via isAdReadyValues
        const ready = this.nativePlugin.isRewardedAdReady(this.adUnitId);
        console.log('[AppLovin] isRewardedAdReady:', ready, 'internal:', this.isAdLoaded);
        return ready || this.isAdLoaded;
      } else if (this.pluginType === 'capacitor') {
        // Capacitor plugin - check ready state
        try {
          const result = this.nativePlugin.isRewardedAdReady({ adUnitId: this.adUnitId });
          return result?.ready || this.isAdLoaded;
        } catch (e) {
          return this.isAdLoaded;
        }
      }
      return this.nativePlugin.isRewardedAdReady(this.adUnitId);
    }
    return this.isAdLoaded;
  }

  /**
   * Show the rewarded ad
   * @param {string} placement - Placement name for analytics
   * @returns {Promise<Object>} Reward info when ad completes
   */
  async showAd(placement = 'rewarded') {
    if (!this.isInitialized) {
      throw new Error('SDK not initialized');
    }

    if (!this.isAdReady()) {
      throw new Error('No ad ready to show');
    }

    if (isNative && this.nativePlugin) {
      // Native ad display
      return new Promise((resolve, reject) => {
        let timeoutCleared = false;
        const displayTimeout = setTimeout(() => {
          if (!timeoutCleared) {
            console.warn('[AppLovin] Display timeout fired - ad completion event may not have been received');
            reject(new Error('Ad display timeout - please check your internet connection and try again'));
          }
        }, 90000); // 90 seconds timeout for watching ad (increased from 60s)

        const clearResources = () => {
          if (!timeoutCleared) {
            timeoutCleared = true;
            clearTimeout(displayTimeout);
            console.log('[AppLovin] ✅ Ad display timeout cleared');
          }
        };

        const onComplete = (result) => {
          console.log('[AppLovin] ✅ Ad completion event received:', result);
          clearResources();
          // Remove all instances of these listeners to prevent duplicates
          this.removeCompleteListener(onComplete);
          this.removeFailListener(onFailed);
          resolve(result);
        };

        const onFailed = (error) => {
          console.log('[AppLovin] ❌ Ad failure event received:', error);
          if (error.type === 'display') {
            clearResources();
            this.removeCompleteListener(onComplete);
            this.removeFailListener(onFailed);
            reject(new Error(error.error || 'Failed to display ad'));
          }
        };

        // Reset completion flag before showing new ad
        this.completionFired = false;
        console.log('[AppLovin] 🔄 Reset completion flag, showing ad...');
        
        this.addCompleteListener(onComplete);
        this.addFailListener(onFailed);

        // Use appropriate method based on plugin type
        if (this.pluginType === 'cordova') {
          // Cordova plugin (cordova-plugin-applovin-max) API:
          // showRewardedAd(adUnitId, placement) - no callbacks, fires events
          console.log('[AppLovin] Showing rewarded ad with unit ID:', this.adUnitId, 'placement:', placement);
          this.nativePlugin.showRewardedAd(this.adUnitId, placement);
        } else if (this.pluginType === 'capacitor') {
          // Capacitor plugin uses Promise-based API
          this.nativePlugin.showRewardedAd({ adUnitId: this.adUnitId, placement })
            .then((result) => {
              onComplete(result);
            })
            .catch((error) => {
              onFailed({ type: 'display', error: error.message || 'Failed to display ad' });
            });
        } else {
          this.nativePlugin.showRewardedAd(this.adUnitId, placement);
        }
      });
    } else {
      // Web mock - simulate ad display and completion
      console.log('[AppLovin Mock] Showing ad...');
      this.adDisplayListeners.forEach(listener => listener(this.currentAdInfo));

      return new Promise((resolve, reject) => {
        // Simulate 15 second ad watch time
        const adDuration = 15000;
        
        console.log(`[AppLovin Mock] Ad playing for ${adDuration / 1000} seconds...`);
        
        setTimeout(() => {
          // Simulate 95% success rate
          const success = Math.random() > 0.05;
          
          if (success) {
            this.isAdLoaded = false;
            const result = {
              reward: {
                amount: 100,
                currency: 'coins',
              },
              adInfo: {
                ...this.currentAdInfo,
                adNetwork: 'mock_network',
                networkName: 'Mock Network',
                revenue: {
                  amount: 0.01,
                  currency: 'USD',
                },
                // Ensure revenue is always an object
                ...(this.currentAdInfo?.revenue && typeof this.currentAdInfo.revenue === 'number' 
                  ? { revenue: { amount: this.currentAdInfo.revenue, currency: 'USD' } }
                  : {}),
              },
            };
            console.log('[AppLovin Mock] Ad completed, reward:', result);
            this.adCompleteListeners.forEach(listener => listener(result));
            resolve(result);
          } else {
            const error = { 
              type: 'display',
              error: 'User skipped the ad',
              errorCode: 'USER_SKIPPED',
            };
            console.log('[AppLovin Mock] Ad skipped');
            this.adFailListeners.forEach(listener => listener(error));
            reject(new Error('User skipped the ad'));
          }
        }, adDuration);
      });
    }
  }

  /**
   * Get current platform info
   * @returns {Object} Platform information
   */
  getPlatformInfo() {
    return {
      platform: platform,
      isNative: isNative,
      deviceType: isNative ? 'mobile' : 'desktop',
      adUnitId: this.adUnitId,
    };
  }

  // Event listener management
  addLoadListener(listener) {
    this.adLoadListeners.push(listener);
  }

  removeLoadListener(listener) {
    this.adLoadListeners = this.adLoadListeners.filter(l => l !== listener);
  }

  addDisplayListener(listener) {
    this.adDisplayListeners.push(listener);
  }

  removeDisplayListener(listener) {
    this.adDisplayListeners = this.adDisplayListeners.filter(l => l !== listener);
  }

  addCompleteListener(listener) {
    this.adCompleteListeners.push(listener);
  }

  removeCompleteListener(listener) {
    this.adCompleteListeners = this.adCompleteListeners.filter(l => l !== listener);
    // Also clear any potential duplicates
    this.adCompleteListeners = [...new Set(this.adCompleteListeners)];
  }

  addFailListener(listener) {
    this.adFailListeners.push(listener);
  }

  removeFailListener(listener) {
    this.adFailListeners = this.adFailListeners.filter(l => l !== listener);
    // Also clear any potential duplicates
    this.adFailListeners = [...new Set(this.adFailListeners)];
  }

  /**
   * Clean up listeners and resources
   */
  destroy() {
    this.adLoadListeners = [];
    this.adDisplayListeners = [];
    this.adCompleteListeners = [];
    this.adFailListeners = [];
    this.isInitialized = false;
    this.isAdLoaded = false;
    this.currentAdInfo = null;
    this.completionFired = false;
  }
}

// Export singleton instance
export const appLovinPlugin = new AppLovinMAXPlugin();
export default appLovinPlugin;
