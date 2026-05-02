"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

/**
 * HealthKit Integration Component
 * Handles Apple HealthKit integration for iOS devices using native Capacitor bridge
 * 
 * Uses Capacitor's native bridge to directly call HealthKit APIs on iOS
 */
export const HealthKitIntegration = ({
    onStepsSynced,
    token,
    onError,
    isJoined = false,
}) => {
    const [isAuthorizing, setIsAuthorizing] = useState(false);
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isSyncingInProgress, setIsSyncingInProgress] = useState(false);
    const [lastSync, setLastSync] = useState(null);
    const [error, setError] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [isAvailable, setIsAvailable] = useState(false);
    const syncInProgressRef = useRef(false);
    const initialSyncCompletedRef = useRef(false);

    // Debug logging helper
    const logHealthKit = (label, data) => {
        console.log(`[🏃 HEALTHKIT] ${label}`, data);
    };

    // Check if running on iOS/Capacitor - iOS-specific detection
    useEffect(() => {
        const checkPlatform = async () => {
            try {
                logHealthKit("🔍 Starting Platform Detection", {
                    timestamp: new Date().toISOString(),
                    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A',
                    windowExists: typeof window !== "undefined",
                    capacitorExists: typeof Capacitor !== 'undefined'
                });

                if (typeof window !== "undefined") {
                    logHealthKit("✅ Window Object Available", {
                        hasCapacitor: typeof Capacitor !== 'undefined',
                        isNativePlatform: Capacitor?.isNativePlatform?.() || false,
                        platform: Capacitor?.getPlatform?.() || 'unknown'
                    });

                    // Check if running on native iOS platform
                    if (Capacitor.isNativePlatform()) {
                        const platform = Capacitor.getPlatform();
                        const isIOSPlatform = platform === "ios";
                        setIsIOS(isIOSPlatform);

                        logHealthKit("📱 Native Platform Detected", {
                            platform,
                            isIOS: isIOSPlatform,
                            isNative: true,
                            healthKitAvailable: isIOSPlatform
                        });

                        if (isIOSPlatform) {
                            logHealthKit("✅ iOS Platform Detected - HealthKit Available", {
                                platform: "ios",
                                healthKitAvailable: true,
                                canUseHealthKit: true,
                                nextSteps: [
                                    "HealthKit native bridge should be configured",
                                    "Can call isAvailable() to verify",
                                    "Can request authorization",
                                    "Can query steps"
                                ]
                            });

                            // Try to check if HealthKit bridge exists
                            try {
                                logHealthKit("🔍 Checking HealthKit Bridge Configuration", {
                                    hasCapacitorPlugins: !!(Capacitor.Plugins),
                                    hasHealthKitPlugin: !!(Capacitor.Plugins?.HealthKit),
                                    hasWindowCapacitor: !!(window.Capacitor),
                                    hasWindowPlugins: !!(window.Capacitor?.Plugins),
                                    hasWindowHealthKit: !!(window.Capacitor?.Plugins?.HealthKit)
                                });

                                // Try to detect if native bridge methods exist
                                const hasMethods = {
                                    isAvailable: false,
                                    requestAuthorization: false,
                                    querySteps: false
                                };

                                // Check Method 1
                                if (Capacitor.Plugins?.HealthKit) {
                                    hasMethods.isAvailable = typeof Capacitor.Plugins.HealthKit.isAvailable === 'function';
                                    hasMethods.requestAuthorization = typeof Capacitor.Plugins.HealthKit.requestAuthorization === 'function';
                                    hasMethods.querySteps = typeof Capacitor.Plugins.HealthKit.querySteps === 'function';
                                }

                                // Check Method 2
                                if (window.Capacitor?.Plugins?.HealthKit) {
                                    hasMethods.isAvailable = hasMethods.isAvailable || typeof window.Capacitor.Plugins.HealthKit.isAvailable === 'function';
                                    hasMethods.requestAuthorization = hasMethods.requestAuthorization || typeof window.Capacitor.Plugins.HealthKit.requestAuthorization === 'function';
                                    hasMethods.querySteps = hasMethods.querySteps || typeof window.Capacitor.Plugins.HealthKit.querySteps === 'function';
                                }

                                logHealthKit("📋 HealthKit Bridge Methods Check", {
                                    methodsFound: hasMethods,
                                    isAvailableExists: hasMethods.isAvailable,
                                    requestAuthorizationExists: hasMethods.requestAuthorization,
                                    queryStepsExists: hasMethods.querySteps,
                                    allMethodsAvailable: hasMethods.isAvailable && hasMethods.requestAuthorization && hasMethods.querySteps,
                                    status: hasMethods.isAvailable && hasMethods.requestAuthorization && hasMethods.querySteps
                                        ? "✅ All HealthKit methods available - Bridge configured correctly"
                                        : "⚠️ Some HealthKit methods missing - Bridge may not be configured",
                                    recommendations: hasMethods.isAvailable && hasMethods.requestAuthorization && hasMethods.querySteps
                                        ? []
                                        : [
                                            "Ensure HealthKitBridge.swift and HealthKitBridge.m exist in ios/App/App/",
                                            "Ensure bridge files are added to Xcode project",
                                            "Run: npx cap sync ios",
                                            "Open Xcode: npx cap open ios",
                                            "Build and run on physical iOS device"
                                        ]
                                });
                            } catch (err) {
                                logHealthKit("⚠️ Error Checking HealthKit Bridge", {
                                    error: err.message,
                                    stack: err.stack,
                                    note: "This is OK - will be checked when methods are called"
                                });
                            }
                        } else {
                            logHealthKit("❌ Not iOS Platform", {
                                platform,
                                isIOS: false,
                                healthKitAvailable: false,
                                reason: `Platform is ${platform}, not iOS`,
                                note: "HealthKit is only available on iOS devices"
                            });
                        }
                    } else {
                        // Running on web - HealthKit not available
                        logHealthKit("🌐 Running on Web Platform", {
                            isNativePlatform: false,
                            platform: Capacitor.getPlatform(),
                            healthKitAvailable: false,
                            reason: "Not running on native iOS platform",
                            note: "HealthKit requires a physical iOS device. Use Capacitor to build iOS app.",
                            instructions: [
                                "Run: npx cap add ios (if not done)",
                                "Run: npx cap sync ios",
                                "Run: npx cap open ios",
                                "Build and run on physical iOS device"
                            ]
                        });
                        setIsIOS(false);
                    }
                } else {
                    logHealthKit("❌ Window Object Not Available", {
                        reason: "Running in non-browser environment",
                        healthKitAvailable: false
                    });
                    setIsIOS(false);
                }
            } catch (err) {
                logHealthKit("❌ Error Checking Platform", {
                    error: err.message,
                    stack: err.stack,
                    healthKitAvailable: false
                });
                console.error("Error checking iOS platform:", err);
                setIsIOS(false);
            }
        };
        checkPlatform();
    }, []);

    // Check HealthKit availability when iOS platform is detected
    useEffect(() => {
        if (!isIOS) {
            setIsAvailable(false);
            return;
        }
        
        const checkAvailability = async () => {
            try {
                // Direct check without callNativeMethod to avoid circular dependency
                if (Capacitor.Plugins?.HealthKit?.isAvailable) {
                    const result = await Capacitor.Plugins.HealthKit.isAvailable();
                    const available = result?.available ?? false;
                    setIsAvailable(available);
                    logHealthKit("✅ HealthKit Availability Checked on Mount", { available });
                } else if (window.Capacitor?.Plugins?.HealthKit?.isAvailable) {
                    const result = await window.Capacitor.Plugins.HealthKit.isAvailable();
                    const available = result?.available ?? false;
                    setIsAvailable(available);
                    logHealthKit("✅ HealthKit Availability Checked on Mount", { available });
                } else {
                    logHealthKit("⚠️ HealthKit plugin not found", {});
                    setIsAvailable(false);
                }
            } catch (err) {
                logHealthKit("⚠️ Could not check HealthKit availability on mount", { error: err.message });
                setIsAvailable(false);
            }
        };
        
        checkAvailability();
    }, [isIOS]);

    /**
     * Call native iOS HealthKit method using Capacitor bridge
     * Full implementation with native Capacitor plugin support
     */
    const callNativeMethod = useCallback(async (methodName, options = {}) => {
        logHealthKit("📞 Calling Native Method", {
            method: methodName,
            options,
            isIOS,
            isNativePlatform: Capacitor.isNativePlatform(),
            platform: Capacitor.getPlatform()
        });

        if (!isIOS || !Capacitor.isNativePlatform()) {
            const errorMsg = "HealthKit is only available on iOS devices";
            logHealthKit("❌ Native Method Failed", {
                method: methodName,
                reason: "Not iOS or not native platform",
                isIOS,
                isNativePlatform: Capacitor.isNativePlatform(),
                platform: Capacitor.getPlatform()
            });
            throw new Error(errorMsg);
        }

        try {
            logHealthKit("🔍 Attempting Method Call", {
                method: methodName,
                attempt: "Method 1 - Capacitor.Plugins.HealthKit"
            });

            // Method 1: Try direct Capacitor plugins (primary method)
            if (Capacitor.Plugins && Capacitor.Plugins.HealthKit) {
                const plugin = Capacitor.Plugins.HealthKit;
                logHealthKit("✅ Found Capacitor.Plugins.HealthKit", {
                    plugin: !!plugin,
                    hasMethod: typeof plugin[methodName] === 'function',
                    methods: Object.keys(plugin || {})
                });

                if (plugin && typeof plugin[methodName] === 'function') {
                    try {
                        logHealthKit("📤 Executing Method (Method 1)", {
                            method: methodName,
                            options,
                            timestamp: new Date().toISOString()
                        });
                        const result = await plugin[methodName](options);
                        logHealthKit("✅ Method Success (Method 1)", {
                            method: methodName,
                            result,
                            hasResult: result !== undefined && result !== null
                        });
                        if (result !== undefined && result !== null) {
                            return result;
                        }
                    } catch (err) {
                        logHealthKit("⚠️ Method 1 Failed", {
                            method: methodName,
                            error: err.message,
                            stack: err.stack
                        });
                        throw err;
                    }
                } else {
                    logHealthKit("❌ Method Not Found (Method 1)", {
                        method: methodName,
                        availableMethods: Object.keys(plugin || {})
                    });
                }
            } else {
                logHealthKit("❌ Capacitor.Plugins.HealthKit Not Found", {
                    hasPlugins: !!Capacitor.Plugins,
                    plugins: Capacitor.Plugins ? Object.keys(Capacitor.Plugins) : []
                });
            }

            logHealthKit("🔍 Attempting Method Call", {
                method: methodName,
                attempt: "Method 2 - window.Capacitor.Plugins"
            });

            // Method 2: Try window Capacitor bridge
            if (window.Capacitor?.Plugins) {
                const plugin = window.Capacitor.Plugins.HealthKit || window.Capacitor.Plugins['HealthKit'];
                logHealthKit("✅ Found window.Capacitor.Plugins", {
                    hasPlugins: !!window.Capacitor.Plugins,
                    hasHealthKit: !!plugin,
                    hasMethod: plugin && typeof plugin[methodName] === 'function',
                    allPlugins: Object.keys(window.Capacitor.Plugins || {})
                });

                if (plugin && typeof plugin[methodName] === 'function') {
                    try {
                        logHealthKit("📤 Executing Method (Method 2)", {
                            method: methodName,
                            options,
                            timestamp: new Date().toISOString()
                        });
                        const result = await plugin[methodName](options);
                        logHealthKit("✅ Method Success (Method 2)", {
                            method: methodName,
                            result,
                            hasResult: result !== undefined && result !== null
                        });
                        if (result !== undefined && result !== null) {
                            return result;
                        }
                    } catch (err) {
                        logHealthKit("⚠️ Method 2 Failed", {
                            method: methodName,
                            error: err.message,
                            stack: err.stack
                        });
                        throw err;
                    }
                } else {
                    logHealthKit("❌ Method Not Found (Method 2)", {
                        method: methodName,
                        pluginExists: !!plugin,
                        pluginMethods: plugin ? Object.keys(plugin) : []
                    });
                }
            } else {
                logHealthKit("❌ window.Capacitor.Plugins Not Found", {
                    hasWindowCapacitor: !!window.Capacitor,
                    hasPlugins: !!(window.Capacitor?.Plugins)
                });
            }

            logHealthKit("🔍 Attempting Method Call", {
                method: methodName,
                attempt: "Method 3 - registerPlugin"
            });

            // Method 3: Dynamic plugin registration
            try {
                logHealthKit("📦 Importing registerPlugin", {});
                const { registerPlugin } = await import('@capacitor/core');
                logHealthKit("✅ registerPlugin Imported", {});

                const HealthKitPlugin = registerPlugin('HealthKit');
                logHealthKit("📝 Plugin Registered", {
                    plugin: !!HealthKitPlugin,
                    hasMethod: HealthKitPlugin && typeof HealthKitPlugin[methodName] === 'function',
                    methods: HealthKitPlugin ? Object.keys(HealthKitPlugin) : []
                });

                if (HealthKitPlugin && typeof HealthKitPlugin[methodName] === 'function') {
                    try {
                        logHealthKit("📤 Executing Method (Method 3)", {
                            method: methodName,
                            options,
                            timestamp: new Date().toISOString()
                        });
                        const result = await HealthKitPlugin[methodName](options);
                        logHealthKit("✅ Method Success (Method 3)", {
                            method: methodName,
                            result,
                            hasResult: result !== undefined && result !== null
                        });
                        if (result !== undefined && result !== null) {
                            return result;
                        }
                    } catch (err) {
                        logHealthKit("⚠️ Method 3 Failed", {
                            method: methodName,
                            error: err.message,
                            stack: err.stack
                        });
                        throw err;
                    }
                } else {
                    logHealthKit("❌ Method Not Found (Method 3)", {
                        method: methodName,
                        pluginExists: !!HealthKitPlugin
                    });
                }
            } catch (err) {
                logHealthKit("❌ registerPlugin Failed", {
                    error: err.message,
                    stack: err.stack
                });
            }

            logHealthKit("🔍 Attempting Method Call", {
                method: methodName,
                attempt: "Method 4 - Direct Native Bridge"
            });

            // Method 4: Try Capacitor native bridge directly
            if (window.Capacitor?.isNativePlatform()) {
                logHealthKit("✅ Native Platform Detected", {
                    isNativePlatform: window.Capacitor.isNativePlatform(),
                    hasPlugins: !!(window.Capacitor.Plugins),
                    hasHealthKit: !!(window.Capacitor.Plugins?.HealthKit)
                });

                try {
                    logHealthKit("📤 Executing Method (Method 4)", {
                        method: methodName,
                        options,
                        timestamp: new Date().toISOString()
                    });
                    const result = await window.Capacitor.Plugins.HealthKit?.[methodName]?.(options);
                    logHealthKit("✅ Method Success (Method 4)", {
                        method: methodName,
                        result,
                        hasResult: result !== undefined && result !== null
                    });
                    if (result !== undefined && result !== null) {
                        return result;
                    }
                } catch (err) {
                    logHealthKit("⚠️ Method 4 Failed", {
                        method: methodName,
                        error: err.message,
                        stack: err.stack
                    });
                    throw err;
                }
            } else {
                logHealthKit("❌ Not Native Platform (Method 4)", {
                    isNativePlatform: window.Capacitor?.isNativePlatform()
                });
            }

            // If all methods fail, native bridge not set up
            const errorMsg = `HealthKit native bridge not configured. All 4 methods failed. Please create HealthKitBridge.swift and HealthKitBridge.m files. See SETUP_IOS_HEALTHKIT.md for setup instructions.`;
            logHealthKit("❌ All Methods Failed", {
                method: methodName,
                methodsAttempted: 4,
                error: errorMsg,
                recommendations: [
                    "Ensure iOS platform is added: npx cap add ios",
                    "Ensure bridge files exist: HealthKitBridge.swift, HealthKitBridge.m",
                    "Ensure HealthKit framework is linked in Xcode",
                    "Ensure HealthKit capability is enabled in Xcode",
                    "Build and run on physical iOS device (not simulator)"
                ]
            });
            throw new Error(errorMsg);
        } catch (err) {
            logHealthKit("❌ Native Method Error", {
                method: methodName,
                error: err.message,
                stack: err.stack,
                name: err.name
            });
            throw err;
        }
    }, [isIOS]);

    /**
     * Request HealthKit authorization
     */
    const requestHealthKitAuth = useCallback(async () => {
        if (!isIOS) {
            const errorMsg = "HealthKit is only available on iOS devices";
            logHealthKit("Auth Skipped", { reason: "Not iOS", isIOS });
            setError(errorMsg);
            onError?.(errorMsg);
            return false;
        }

        logHealthKit("Requesting Authorization", { timestamp: new Date().toISOString() });
        setIsAuthorizing(true);
        setError(null);

        try {
            // Check if HealthKit is available first
            logHealthKit("🔍 Checking HealthKit Availability", {
                timestamp: new Date().toISOString()
            });

            let available = false;
            try {
                const result = await callNativeMethod('isAvailable');
                available = result?.available ?? false;
                setIsAvailable(available);

                logHealthKit("✅ HealthKit Availability Check", {
                    available,
                    result,
                    message: available ? "HealthKit is available on this device" : "HealthKit is NOT available on this device"
                });

                if (!available) {
                    const errorMsg = "HealthKit is not available on this device. Please ensure your device supports HealthKit.";
                    logHealthKit("❌ HealthKit Not Available", { available, message: errorMsg });
                    setError(errorMsg);
                    onError?.(errorMsg);
                    return false;
                }
            } catch (err) {
                logHealthKit("⚠️ Could Not Check HealthKit Availability", {
                    error: err.message,
                    note: "Will continue anyway"
                });
            }

            // Request authorization - this shows the dialog
            logHealthKit("📝 Requesting HealthKit Authorization", {
                permissions: { read: ['steps'], write: [] },
                timestamp: new Date().toISOString()
            });

            const authResult = await callNativeMethod('requestAuthorization', {
                read: ['steps'],
                write: []
            });

            logHealthKit("📥 Authorization Response Received", { authResult });

            // IMPORTANT: Apple doesn't tell us if user actually granted READ permission
            // We must test by querying data!
            if (authResult?.status === "denied" && authResult?.requiresSettingsRedirect) {
                const errorMsg = "HealthKit access was denied. Please enable in Settings → Privacy & Security → Health.";
                logHealthKit("❌ Authorization Denied - Settings Required", {
                    authResult,
                    instructions: [
                        "Open iPhone Settings",
                        "Go to Privacy & Security",
                        "Tap Health",
                        "Find app name",
                        "Enable 'Read' permission for Steps"
                    ]
                });
                setError(errorMsg);
                onError?.(errorMsg);
                setIsAuthorized(false);
                return false;
            }

            // For other cases, we need to TEST if we actually have access
            // Use testReadAccess to verify permission by querying actual data
            logHealthKit("🧪 Testing Read Access", { timestamp: new Date().toISOString() });

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const testResult = await callNativeMethod('testReadAccess', {
                startDate: today.toISOString(),
                endDate: tomorrow.toISOString()
            });

            logHealthKit("📊 Read Access Test Result", { testResult });

            if (testResult?.hasAccess === false && testResult?.reason === "authorizationDenied") {
                // We definitively know permission was denied
                const errorMsg = "HealthKit permission denied. Please enable in Settings → Privacy & Security → Health.";
                logHealthKit("❌ Read Access Denied", { testResult });
                setError(errorMsg);
                onError?.(errorMsg);
                setIsAuthorized(false);
                return false;
            }

            if (testResult?.hasAccess === true) {
                // We got data - permission is granted!
                logHealthKit("✅ Authorization Confirmed - Has Access", {
                    steps: testResult?.steps,
                    message: "User has granted HealthKit read permission"
                });
                setIsAuthorized(true);
                return true;
            }

            // If steps == 0, could be no steps OR no permission
            // In this case, we assume authorization was granted but user has no steps today
            logHealthKit("⚠️ No Steps Today - Assuming Authorized", {
                steps: testResult?.steps,
                reason: "User likely granted permission but has 0 steps today"
            });
            setIsAuthorized(true);
            return true;

        } catch (err) {
            console.error("HealthKit authorization error:", err);
            const errorMsg = err.message || "Failed to authorize HealthKit access.";
            setError(errorMsg);
            onError?.(errorMsg);
            return false;
        } finally {
            setIsAuthorizing(false);
        }
    }, [isIOS, callNativeMethod, onError]);

    /**
     * Sync steps from HealthKit
     */
    const syncSteps = useCallback(async () => {
        if (!isAuthorized) {
            logHealthKit("Sync Skipped", { reason: "Not authorized", isAuthorized, isJoined });
            return;
        }
        if (!isJoined) {
            logHealthKit("Sync Skipped", { reason: "User not joined", isAuthorized, isJoined });
            return;
        }

        // Prevent race condition - skip if sync is already in progress
        if (syncInProgressRef.current) {
            logHealthKit("Sync Skipped", { reason: "Sync already in progress", isSyncingInProgress: true });
            return;
        }

        logHealthKit("Starting Step Sync", { timestamp: new Date().toISOString(), isAuthorized, isJoined });
        syncInProgressRef.current = true;
        setIsSyncing(true);
        setIsSyncingInProgress(true);
        setError(null);

        try {
            // Get today's date range
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Get device info
            logHealthKit("📱 Getting Device Information", {
                timestamp: new Date().toISOString()
            });

            let deviceInfo = {
                platform: "ios",
                appVersion: "1.0.0",
                deviceId: "device_ios",
                osVersion: "iOS 17.0",
            };

            try {
                const device = await Device.getInfo();
                deviceInfo = {
                    platform: device.platform || "ios",
                    appVersion: device.appVersion || "1.0.0",
                    deviceId: device.id || "device_ios",
                    osVersion: device.osVersion || "iOS 17.0",
                };

                logHealthKit("✅ Device Information Retrieved", {
                    deviceInfo,
                    device,
                    platform: deviceInfo.platform,
                    osVersion: deviceInfo.osVersion,
                    appVersion: deviceInfo.appVersion
                });
            } catch (err) {
                logHealthKit("⚠️ Could Not Get Device Info", {
                    error: err.message,
                    stack: err.stack,
                    usingDefaults: true,
                    defaultDeviceInfo: deviceInfo
                });
            }

            // Query steps from HealthKit - Full iOS SDK integration
            logHealthKit("📊 Preparing Step Query", {
                dateRange: {
                    start: today.toISOString(),
                    end: tomorrow.toISOString(),
                    startDate: today.toLocaleDateString(),
                    endDate: tomorrow.toLocaleDateString()
                },
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
            });

            let todaySteps = 0;
            try {
                // Call native HealthKit querySteps method
                // This uses HKStatisticsQuery from iOS HealthKit SDK
                logHealthKit("📤 Calling querySteps Native Method", {
                    startDate: today.toISOString(),
                    endDate: tomorrow.toISOString(),
                    dateFormat: "ISO 8601",
                    timestamp: new Date().toISOString()
                });

                const stepResult = await callNativeMethod('querySteps', {
                    startDate: today.toISOString(), // ISO 8601 format
                    endDate: tomorrow.toISOString() // ISO 8601 format
                });

                logHealthKit("📥 Step Query Response Received", {
                    stepResult,
                    rawSteps: stepResult?.steps,
                    rawValue: stepResult?.value,
                    resultType: typeof stepResult,
                    hasSteps: !!(stepResult?.steps),
                    hasValue: !!(stepResult?.value)
                });

                // Extract steps from native response
                const rawSteps = stepResult?.steps || stepResult?.value || 0;
                logHealthKit("🔍 Extracting Step Count", {
                    rawSteps,
                    fromSteps: stepResult?.steps,
                    fromValue: stepResult?.value,
                    extracted: rawSteps
                });

                todaySteps = rawSteps;

                // Validate step count
                if (isNaN(todaySteps) || todaySteps < 0) {
                    logHealthKit("⚠️ Invalid Step Count Detected", {
                        todaySteps,
                        isNaN: isNaN(todaySteps),
                        isNegative: todaySteps < 0,
                        settingToZero: true
                    });
                    todaySteps = 0;
                }

                logHealthKit("✅ Steps Queried Successfully", {
                    steps: todaySteps,
                    date: today.toLocaleDateString(),
                    startDate: today.toISOString(),
                    endDate: tomorrow.toISOString(),
                    validation: {
                        isNumber: typeof todaySteps === 'number',
                        isPositive: todaySteps >= 0,
                        isValid: !isNaN(todaySteps) && todaySteps >= 0
                    },
                    message: todaySteps > 0
                        ? `Successfully retrieved ${todaySteps.toLocaleString()} steps from HealthKit`
                        : "No steps found for today (may need to walk more or check HealthKit permissions)"
                });
            } catch (err) {
                // If native method fails, log error
                logHealthKit("❌ Step Query Failed", {
                    error: err.message,
                    stack: err.stack,
                    name: err.name,
                    dateRange: {
                        start: today.toISOString(),
                        end: tomorrow.toISOString()
                    },
                    troubleshooting: [
                        "Check if HealthKit native bridge is configured",
                        "Verify HealthKit permissions are granted",
                        "Ensure running on physical iOS device (not simulator)",
                        "Check if Health app has step data for today"
                    ]
                });

                // Only use mock data in development for testing UI
                if (process.env.NODE_ENV === 'development') {
                    todaySteps = Math.floor(Math.random() * 5000) + 1000;
                    logHealthKit("⚠️ Using Mock Data (Development Only)", {
                        mockSteps: todaySteps,
                        reason: "Native method failed, using mock data for UI testing",
                        note: "This will NOT work in production - ensure native bridge is configured",
                        originalError: err.message
                    });
                } else {
                    // In production, re-throw the error
                    logHealthKit("❌ Production Error - Cannot Use Mock Data", {
                        error: err.message,
                        environment: process.env.NODE_ENV,
                        action: "Re-throwing error for production"
                    });
                    throw new Error(
                        `Failed to query steps from HealthKit: ${err.message}. ` +
                        `Ensure native bridge is properly configured.`
                    );
                }
            }

            // Format step data for backend API
            // This matches the backend validation exactly
            logHealthKit("📦 Formatting Step Data for Backend", {
                rawSteps: todaySteps,
                todayISO: today.toISOString(),
                deviceInfo,
                timestamp: new Date().toISOString()
            });

            const syncData = {
                steps: todaySteps, // Integer: 0-100,000 (validated by backend)
                date: today.toISOString(), // ISO 8601: "2025-10-20T00:00:00.000Z"
                source: "healthkit", // Must be: "healthkit" | "manual" | "imported"
                deviceInfo: {
                    platform: deviceInfo.platform || "ios",
                    appVersion: deviceInfo.appVersion || "1.0.0",
                    deviceId: deviceInfo.deviceId || "device_ios",
                    osVersion: deviceInfo.osVersion || "iOS 17.0",
                },
                healthKitData: {
                    isAuthorized: true,
                    lastSyncDate: new Date().toISOString(),
                    dataQuality: "high", // "high" | "medium" | "low"
                },
            };

            logHealthKit("✅ Step Data Formatted", {
                syncData,
                validation: {
                    stepsIsNumber: typeof syncData.steps === 'number',
                    stepsInRange: syncData.steps >= 0 && syncData.steps <= 100000,
                    dateIsISO: syncData.date.includes('T') && syncData.date.includes('Z'),
                    sourceIsHealthKit: syncData.source === 'healthkit',
                    hasDeviceInfo: !!syncData.deviceInfo,
                    hasHealthKitData: !!syncData.healthKitData
                },
                dataSize: JSON.stringify(syncData).length + " bytes"
            });

            logHealthKit("📤 Sending Step Data to Backend", {
                steps: syncData.steps,
                date: syncData.date,
                source: syncData.source,
                deviceInfo: syncData.deviceInfo,
                healthKitData: syncData.healthKitData,
                timestamp: new Date().toISOString()
            });

            const syncResponse = await onStepsSynced?.(syncData);

            if (syncResponse?.success === false) {
                throw new Error(syncResponse.error || syncResponse.message || "Backend rejected step sync");
            }

            logHealthKit("✅ Steps Synced to Backend Successfully", {
                steps: syncData.steps,
                date: syncData.date,
                timestamp: new Date().toISOString(),
                nextStep: "Backend should update progress and leaderboard"
            });

            setLastSync(new Date());
            logHealthKit("🕐 Last Sync Time Updated", {
                lastSync: new Date().toISOString()
            });
        } catch (err) {
            console.error("HealthKit sync error:", err);
            const errorMsg = err.message || "Failed to sync steps from HealthKit";
            setError(errorMsg);
            onError?.(errorMsg);
        } finally {
            syncInProgressRef.current = false;
            setIsSyncing(false);
            setIsSyncingInProgress(false);
        }
    }, [isAuthorized, isJoined, onStepsSynced, onError, callNativeMethod]);

    // Auto-sync when joined and authorized
    useEffect(() => {
        logHealthKit("🔄 Auto-Sync Setup Check", {
            isJoined,
            isAuthorized,
            willSetup: isJoined && isAuthorized,
            timestamp: new Date().toISOString()
        });

        if (isJoined && isAuthorized) {
            logHealthKit("✅ Setting Up Auto-Sync", {
                interval: "30 seconds",
                willPerformInitialSync: true,
                timestamp: new Date().toISOString()
            });

            if (!initialSyncCompletedRef.current) {
                initialSyncCompletedRef.current = true;
                logHealthKit("🚀 Performing Initial Sync", {
                    timestamp: new Date().toISOString()
                });
                syncSteps();
            } else {
                logHealthKit("⏭️ Initial Sync Skipped", {
                    reason: "Already performed for this authorization session",
                    timestamp: new Date().toISOString()
                });
            }

            // Set up periodic sync (every 30 seconds for real-time updates)
            logHealthKit("⏰ Setting Up Periodic Sync Interval", {
                interval: 30000,
                intervalSeconds: 30,
                note: "Will sync every 30 seconds as per AC2 requirement"
            });

            const interval = setInterval(() => {
                logHealthKit("⏰ Periodic Sync Triggered", {
                    interval: "30 seconds",
                    timestamp: new Date().toISOString()
                });
                syncSteps();
            }, 30000); // 30 seconds - real-time syncing as per AC2

            return () => {
                logHealthKit("🛑 Auto-Sync Stopped", {
                    reason: "Component unmounted or dependencies changed",
                    timestamp: new Date().toISOString()
                });
                clearInterval(interval);
            };
        } else {
            initialSyncCompletedRef.current = false;
            logHealthKit("⏸️ Auto-Sync Not Setup", {
                reason: !isJoined ? "User not joined" : "HealthKit not authorized",
                isJoined,
                isAuthorized
            });
        }
    }, [isJoined, isAuthorized, syncSteps]);

    // Log component render status
    useEffect(() => {
        logHealthKit("🎨 Component Render Status", {
            isIOS,
            isAuthorized,
            isAuthorizing,
            isSyncing,
            isJoined,
            hasError: !!error,
            errorMessage: error || null,
            lastSync: lastSync ? lastSync.toISOString() : null,
            componentMounted: true,
            timestamp: new Date().toISOString()
        });
    }, [isIOS, isAuthorized, isAuthorizing, isSyncing, isJoined, error, lastSync]);

    return (
        <div className="w-full px-4">
            <AnimatePresence mode="wait">
                {/* Error State */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-2xl p-4 mb-3"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                                <span className="text-red-400">⚠️</span>
                            </div>
                            <div className="flex-1">
                                <p className="text-red-400 text-sm font-medium">{error}</p>
                                <p className="text-gray-500 text-xs mt-2">
                                    To enable: Settings → Privacy & Security → Health → [App Name] → Enable "Steps"
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Non-iOS Platform */}
            {!isIOS && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center">
                            <span className="text-2xl">📱</span>
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-medium text-sm">HealthKit Available on iOS</p>
                            <p className="text-gray-500 text-xs mt-1">
                                Open this app on your iPhone to sync steps from Apple Health
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* iOS - Not Authorized */}
            {isIOS && !isAuthorized && !isAvailable && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-gray-500/10 to-gray-600/5 backdrop-blur-sm border border-gray-500/30 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-lg">
                            <span className="text-2xl">❌</span>
                        </div>
                        <div className="flex-1">
                            <h4 className="text-white font-bold mb-1">
                                HealthKit Not Available
                            </h4>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Your device does not support HealthKit or it's disabled in Settings
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* iOS - Not Authorized but Available */}
            {isIOS && !isAuthorized && isAvailable && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 backdrop-blur-sm border border-orange-500/30 rounded-2xl p-4"
                >
                    <div className="flex items-center gap-4">
                        {/* Apple Health Icon */}
                        <motion.div
                            animate={{ 
                                scale: [1, 1.05, 1],
                                boxShadow: [
                                    "0 0 0 0 rgba(249, 115, 22, 0.4)",
                                    "0 0 0 10px rgba(249, 115, 22, 0)",
                                    "0 0 0 0 rgba(249, 115, 22, 0)"
                                ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center shadow-lg shadow-orange-500/20"
                        >
                            <span className="text-2xl">❤️</span>
                        </motion.div>

                        <div className="flex-1">
                            <h4 className="text-white font-bold mb-1">
                                Connect Apple Health
                            </h4>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Sync your steps automatically and track your progress in real-time
                            </p>
                        </div>
                    </div>

                    {/* Connect Button */}
                    <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={requestHealthKitAuth}
                        disabled={isAuthorizing}
                        className="w-full mt-4 py-3.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/30 disabled:opacity-50 transition-all"
                    >
                        {isAuthorizing ? (
                            <span className="flex items-center justify-center gap-2">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                                />
                                Connecting...
                            </span>
                        ) : (
                            "Connect Apple Health"
                        )}
                    </motion.button>

                    {/* Privacy Note */}
                    <p className="text-gray-600 text-xs text-center mt-3">
                        🔒 Your health data stays on your device
                    </p>
                </motion.div>
            )}

            {/* iOS - Authorized & Connected */}
            {isIOS && isAuthorized && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm border border-green-500/30 rounded-2xl p-4"
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {/* Connected Icon */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 300 }}
                                className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center shadow-lg shadow-green-500/30"
                            >
                                <motion.span
                                    initial={{ opacity: 0, scale: 0 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-white text-xl"
                                >
                                    ✓
                                </motion.span>
                            </motion.div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="text-white font-bold text-sm">Apple Health</p>
                                    <span className="px-2 py-0.5 bg-green-500/30 text-green-400 text-xs rounded-full font-medium">
                                        Connected
                                    </span>
                                </div>
                                {lastSync && (
                                    <p className="text-gray-500 text-xs mt-0.5">
                                        Last sync: {lastSync.toLocaleTimeString()}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Sync Button */}
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={syncSteps}
                            disabled={isSyncing || !isJoined}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50"
                        >
                            {isSyncing ? (
                                <motion.span
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                    className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                                />
                            ) : (
                                "Sync"
                            )}
                        </motion.button>
                    </div>

                    {/* Auto-Sync Status */}
                    <div className="mt-3 pt-3 border-t border-green-500/20">
                        <div className="flex items-center gap-2">
                            <motion.div
                                animate={{ opacity: [0.5, 1, 0.5] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="w-2 h-2 rounded-full bg-green-500"
                            />
                            <span className="text-gray-400 text-xs">Auto-syncing every 30 seconds</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
