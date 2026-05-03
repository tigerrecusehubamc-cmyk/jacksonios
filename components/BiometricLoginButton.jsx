"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
    checkBiometricAvailability,
    authenticateWithBiometric,
    hasBiometricCredentials,
    getBiometricType,
    getCredentials,
    listBiometricAccounts,
} from "@/lib/biometricAuth";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";
import { useAuth } from "@/contexts/AuthContext";
import { checkBiometricStatus, checkBiometricStatusByDevice, biometricLogin } from "@/lib/api";

/**
 * Biometric Login Button Component
 * Uses capacitor-native-biometric properly following documentation
 * Flow: Check availability -> Verify identity -> Retrieve credentials -> Login
 */
export default function BiometricLoginButton({ onSuccess, onError }) {
    const [biometryType, setBiometryType] = useState("");
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [hasCredentials, setHasCredentials] = useState(false);
    const { refreshSession } = useAuth();
    const router = useRouter();

    useEffect(() => {
        checkAvailabilityAndCredentials();
    }, []);

    const checkAvailabilityAndCredentials = async () => {
        try {
            // Step 1: Check if biometric is available on device
            const availability = await checkBiometricAvailability();
            console.log("🔍 [LOGIN-BTN] Biometric availability:", availability);

            if (!availability.isAvailable) {
                console.log("⚠️ [LOGIN-BTN] Biometric not available");
                setBiometryType("none");
                return;
            }

            // Set the biometry type for display
            setBiometryType(availability.biometryTypeName);
            console.log("✅ [LOGIN-BTN] Biometry type:", availability.biometryTypeName);

            // Step 2: Check if user has stored credentials
            const credentialsExist = await hasBiometricCredentials();
            setHasCredentials(credentialsExist);
            console.log("🔍 [LOGIN-BTN] Has stored credentials:", credentialsExist);
        } catch (error) {
            console.error("❌ [LOGIN-BTN] Error checking availability:", error);
        }
    };

    const handleBiometricLogin = async () => {
        if (!Capacitor.isNativePlatform()) {
            onError?.("Biometric login is only available on the mobile app.");
            return;
        }

        setIsAuthenticating(true);

        try {
            console.log("🔐 [LOGIN-BTN] Starting biometric login flow...");

            // Check if credentials are stored locally
            if (!hasCredentials) {
                console.warn("⚠️ [LOGIN-BTN] No credentials stored");
                onError?.("Biometric login is not set up. Please sign in manually once to enable biometric login.");
                setIsAuthenticating(false);
                return;
            }

            // Get user identifier from Preferences (fast lookup)
            let userIdentifier = null;
            
            try {
                const { value: storedUsername } = await Preferences.get({ key: "biometric_username" });
                if (storedUsername) {
                    userIdentifier = storedUsername;
                    console.log("✅ [LOGIN-BTN] Got user identifier from Preferences:", userIdentifier);
                }
            } catch (e) {
                console.warn("⚠️ [LOGIN-BTN] Failed to get username from Preferences:", e);
            }
            
            // Fallback: Get from Keychain
            if (!userIdentifier && Capacitor.isNativePlatform()) {
                try {
                        const creds = await getCredentials(userIdentifier);
                        if (creds?.success && creds.username) {
                            userIdentifier = creds.username;
                            console.log("✅ [LOGIN-BTN] Got user identifier from Keychain:", userIdentifier);
                        }
                    } catch (e) {
                        console.warn("⚠️ [LOGIN-BTN] Failed to get credentials from Keychain:", e);
                    }
            }

            // Get device ID as backup for status check
            const { Device } = await import("@capacitor/device");
            const deviceInfo = await Device.getId();
            const deviceId = deviceInfo.identifier || "unknown";
            console.log("📱 [LOGIN-BTN] Device ID:", deviceId);

            // Step 1: Check if user has registered Face ID with backend
            // Try by user identifier first, fallback to device ID if identifier not available
            // OPTIMIZATION: Defer status check to next tick to prevent frame drops
            const DEBUG_BIOMETRIC = typeof window !== 'undefined' && (
                process.env.NODE_ENV === 'development' ||
                localStorage.getItem('debug_biometric') === 'true'
            );

            const bioLog = (...args) => {
                if (DEBUG_BIOMETRIC) console.log(...args);
            };

            bioLog("🔍 [LOGIN-BTN] Checking biometric registration status...");

            let statusResult;

            // OPTIMIZATION: Defer status check to next tick to prevent frame drops
            await new Promise(resolve => setTimeout(resolve, 0));

            try {
                const statusCheckStartTime = Date.now();

                if (userIdentifier) {
                    statusResult = await checkBiometricStatus(userIdentifier);
                    const duration = Date.now() - statusCheckStartTime;
                    bioLog(`🔍 [LOGIN-BTN] Status check completed in ${duration}ms`);
                    if (DEBUG_BIOMETRIC) {
                        bioLog("🔍 [LOGIN-BTN] Status check result:", JSON.stringify(statusResult, null, 2));
                    }
                } else {
                    // Fallback: Check by device ID (backend must support this)
                    statusResult = await checkBiometricStatusByDevice(deviceId);
                    const duration = Date.now() - statusCheckStartTime;
                    bioLog(`🔍 [LOGIN-BTN] Status check completed in ${duration}ms`);
                    if (DEBUG_BIOMETRIC) {
                        bioLog("🔍 [LOGIN-BTN] Status check result:", JSON.stringify(statusResult, null, 2));
                    }
                }
            } catch (error) {
                console.error("❌ [LOGIN-BTN] Exception during status check:", error.message);

                // Convert exception to error object
                statusResult = {
                    error: error.message || "Failed to check biometric status",
                    success: false,
                    status: 0
                };
            }

            // Handle API errors (404, HTML responses, etc.)
            // apiRequest returns error objects, not throws exceptions
            if (statusResult.error) {
                if (DEBUG_BIOMETRIC) {
                    console.error("❌ [LOGIN-BTN] Status check API error:", statusResult.error);
                }

                // If user not found (404), it means biometric is not registered
                if (statusResult.error.includes("User not found") || statusResult.status === 404) {
                    const errorMessage = "Face ID is not registered. Please log in first to register Face ID for faster login next time.";
                    onError?.(errorMessage, {
                        showRedirectLink: true,
                        redirectPath: "/login",
                        redirectMessage: "Log In to Register Face ID"
                    });
                    setIsAuthenticating(false);
                    return;
                }

                // If endpoint doesn't exist (HTML response), treat as not registered
                if (statusResult.error.includes("not found") ||
                    statusResult.error.includes("HTML")) {
                    const errorMessage = "Face ID is not registered. Please log in first to register Face ID for faster login next time.";
                    onError?.(errorMessage, {
                        showRedirectLink: true,
                        redirectPath: "/login",
                        redirectMessage: "Log In to Register Face ID"
                    });
                    setIsAuthenticating(false);
                    return;
                }
            }

            // Check if biometric is registered (handle different response structures)
            // Backend returns: { success: true, isRegistered: true/false, ... }
            const isRegistered =
                (statusResult.success === true && statusResult.isRegistered === true) ||
                (statusResult.data && statusResult.data.isRegistered === true) ||
                (statusResult.isRegistered === true);

            if (DEBUG_BIOMETRIC) {
                bioLog("🔍 [LOGIN-BTN] Status check result:", {
                    success: statusResult.success,
                    isRegistered: statusResult.isRegistered,
                    finalIsRegistered: isRegistered
                });
            }

            if (!isRegistered) {
                // INDUSTRIAL BEST PRACTICE: Clear error message with action
                // User must log in first to register Face ID (token required for security)
                const errorMessage = "Face ID is not registered. Please log in first to register Face ID for faster login next time.";
                onError?.(errorMessage, {
                    showRedirectLink: true,
                    redirectPath: "/login",
                    redirectMessage: "Log In to Register Face ID"
                });
                setIsAuthenticating(false);
                return;
            }

            console.log("✅ [LOGIN-BTN] Face ID is registered, proceeding with biometric authentication...");

            // Step 2: Perform biometric authentication on device to get user credentials
            // This also retrieves the username (mobile/email) from secure storage
            const authResult = await authenticateWithBiometric({
                reason: "Login to your Jackson account securely",
                title: "Biometric Login",
                subtitle: "Verify your identity to log in",
                description: "Use your biometric to access your account",
                userId: userIdentifier, // Pass the user identifier for multi-account support
            });

            console.log("🔐 [LOGIN-BTN] Authentication result:", {
                success: authResult.success,
                hasUsername: !!authResult.username,
                biometryType: authResult.biometryTypeName,
            });

            if (!authResult.success) {
                console.error("❌ [LOGIN-BTN] Biometric authentication failed:", authResult.error);
                onError?.(authResult.error || "Biometric authentication failed");
                setIsAuthenticating(false);
                return;
            }

            // Get user identifier from authenticated credentials (update if not already set)
            if (!userIdentifier) {
                userIdentifier = authResult.username;
            }
            if (!userIdentifier && authResult.password) {
                try {
                    const credentialPayload = JSON.parse(authResult.password);
                    userIdentifier = credentialPayload.user?.mobile || credentialPayload.user?.email || authResult.username;
                } catch (e) {
                    // If password is not JSON, use username from authResult
                    if (!userIdentifier) {
                        userIdentifier = authResult.username;
                    }
                }
            }

            if (!userIdentifier) {
                console.error("❌ [LOGIN-BTN] Cannot determine user identifier from credentials");
                onError?.("Unable to identify your account. Please sign in manually.");
                setIsAuthenticating(false);
                return;
            }

            console.log("🌐 [LOGIN-BTN] Calling biometric login endpoint...");

            // Step 3: Call backend biometric login endpoint to get fresh token
            const loginData = {
                deviceId: deviceId,
                biometricType: authResult.biometryTypeName || "face_id",
            };

            // Include mobile or email based on identifier type
            if (userIdentifier.includes("@")) {
                loginData.email = userIdentifier;
            } else {
                loginData.mobile = userIdentifier;
            }

            console.log("🌐 [LOGIN-BTN] Calling biometric login with data:", {
                ...loginData,
                deviceId: deviceId.substring(0, 10) + "...", // Log partial deviceId for privacy
            });

            // Step 3: Call backend biometric login endpoint to get fresh token
            // Following official pattern: Backend validates biometric registration and returns fresh JWT
            const loginResult = await biometricLogin(loginData);

            console.log("🌐 [LOGIN-BTN] Biometric login API response:", {
                success: loginResult.success,
                hasToken: !!loginResult.token,
                hasUser: !!loginResult.user,
                hasError: !!loginResult.error,
                error: loginResult.error,
            });

            // Handle API errors (404, HTML responses, etc.) - apiRequest returns error objects
            if (loginResult.error || !loginResult.success) {
                console.error("❌ [LOGIN-BTN] Biometric login API error:", loginResult.error);

                // Handle endpoint not found (404, HTML responses)
                if (loginResult.error?.includes("not found") ||
                    loginResult.error?.includes("HTML") ||
                    loginResult.status === 404) {
                    onError?.("Biometric login endpoint is not available. Please ensure backend routes are implemented. Sign in manually for now.");
                    setIsAuthenticating(false);
                    return;
                }

                // Handle specific backend error messages (following backend response structure)
                const errorMessage = loginResult.error || loginResult.message || "Biometric login failed";

                if (errorMessage.includes("not registered") ||
                    errorMessage.includes("not set up") ||
                    errorMessage.includes("Biometric not") ||
                    errorMessage.includes("Biometric authentication is not set up")) {
                    onError?.("Face ID is not registered. Please log in first to register Face ID for faster login next time.", {
                        showRedirectLink: true,
                        redirectPath: "/login",
                        redirectMessage: "Log In to Register Face ID"
                    });
                    setIsAuthenticating(false);
                    return;
                }

                if (errorMessage.includes("locked") || errorMessage.includes("Account locked")) {
                    onError?.("Account is temporarily locked. Please try again later or sign in manually.");
                    setIsAuthenticating(false);
                    return;
                }

                if (errorMessage.includes("not active") || errorMessage.includes("suspended") || errorMessage.includes("Account not active")) {
                    onError?.("Account is not active. Please contact support.");
                    setIsAuthenticating(false);
                    return;
                }

                if (errorMessage.includes("User not found")) {
                    onError?.("Account not found. Please sign in manually.");
                    setIsAuthenticating(false);
                    return;
                }

                // Generic error fallback
                onError?.(errorMessage || "Biometric login failed. Please try again or sign in manually.");
                setIsAuthenticating(false);
                return;
            }

            // Extract token and user from response (backend returns at top level)
            // Backend structure: { success: true, token: "...", user: {...} }
            let token = loginResult.token;
            let user = loginResult.user;

            // Handle nested response structure (defensive fallback)
            if (!token && loginResult.data) {
                token = loginResult.data.token;
                user = loginResult.data.user;
            }

            // Validate response has required data
            if (!token || !user) {
                console.error("❌ [LOGIN-BTN] Backend biometric login response missing token or user:", {
                    hasToken: !!token,
                    hasUser: !!user,
                    responseKeys: Object.keys(loginResult),
                    hasData: !!loginResult.data,
                    dataKeys: loginResult.data ? Object.keys(loginResult.data) : 'null',
                    loginResult: loginResult
                });
                onError?.("Invalid response from server. Please try again or sign in manually.");
                setIsAuthenticating(false);
                return;
            }

            // Ensure user._id is a string (MongoDB ObjectIds are serialized to strings in JSON, but be defensive)
            if (user && user._id && typeof user._id !== 'string') {
                console.log("🔄 [LOGIN-BTN] Converting user._id to string:", typeof user._id);
                user = {
                    ...user,
                    _id: String(user._id)
                };
            }

            // Validate user object has required fields (_id is critical for credential storage)
            if (!user || typeof user !== 'object' || Object.keys(user).length === 0) {
                console.error("❌ [LOGIN-BTN] Invalid user object:", {
                    hasUser: !!user,
                    userType: typeof user,
                    userKeys: user ? Object.keys(user) : 'null',
                    userValue: user
                });
                onError?.("Invalid user data received from server. Please try again or sign in manually.");
                setIsAuthenticating(false);
                return;
            }

            if (!user._id) {
                console.error("❌ [LOGIN-BTN] User object missing _id field:", {
                    userKeys: Object.keys(user),
                    userObject: user,
                    userType: typeof user,
                    hasId: '_id' in user,
                    idValue: user._id
                });
                // Don't fail login - user is authenticated, but we can't save credentials
                console.warn("⚠️ [LOGIN-BTN] User object missing _id - credentials will not be saved");
            } else {
                console.log("✅ [LOGIN-BTN] User object validated successfully:", {
                    hasId: !!user._id,
                    idType: typeof user._id,
                    userKeys: Object.keys(user).slice(0, 10)
                });
            }

            console.log("✅ [LOGIN-BTN] Backend biometric login successful, refreshing session...");

            // Step 5: Refresh session with fresh token from backend
            const refreshResult = await refreshSession({
                token: token,
                user: user,
            });

            if (refreshResult?.ok) {
                console.log("✅ [LOGIN-BTN] Session restored successfully with fresh token!");

                // Step 6: Save fresh credentials to secure storage for next Face ID login
                // This ensures credentials are updated with the latest token and user data
                if (Capacitor.isNativePlatform()) {
                    try {
                        const {
                            setCredentials,
                            checkBiometricAvailability,
                        } = await import("@/lib/biometricAuth");

                        // Check if biometric is available before saving
                        const availability = await checkBiometricAvailability();
                        if (availability.isAvailable) {
                            console.log("💾 [LOGIN-BTN] Saving fresh credentials to secure storage...");

                            // Get username from user object (mobile or email)
                            const username = user.email || user.mobile || userIdentifier;

                            if (username) {
                                // Ensure user._id is a string (defensive check)
                                let validatedUser = user;
                                if (user._id && typeof user._id !== 'string') {
                                    validatedUser = {
                                        ...user,
                                        _id: String(user._id)
                                    };
                                    console.log("🔄 [LOGIN-BTN] Converted user._id to string for credential storage");
                                }

                                // Validate user object has required fields before creating payload
                                if (!validatedUser || typeof validatedUser !== 'object' || Object.keys(validatedUser).length === 0 || !validatedUser._id) {
                                    console.error("❌ [LOGIN-BTN] Invalid user object for credential storage:", {
                                        hasUser: !!validatedUser,
                                        userType: typeof validatedUser,
                                        userKeys: validatedUser ? Object.keys(validatedUser) : 'null',
                                        hasUserId: !!validatedUser?._id,
                                        userIdType: typeof validatedUser?._id,
                                        userObject: validatedUser
                                    });
                                    console.warn("⚠️ [LOGIN-BTN] Cannot save biometric credentials - invalid user object");
                                    // Don't fail login - user is already authenticated, just skip credential save
                                } else {
                                    // Create credential payload with fresh token and validated user data
                                    const credentialPayload = {
                                        token: token.trim(),
                                        user: validatedUser, // Use validated user with string _id
                                    };

                                    // Validate payload before stringifying
                                    if (credentialPayload.token && credentialPayload.user && Object.keys(credentialPayload.user).length > 0 && credentialPayload.user._id) {
                                        const passwordString = JSON.stringify(credentialPayload);

                                        if (passwordString && passwordString !== '{}' && passwordString !== 'null') {
                                            const credentialResult = await setCredentials({
                                                username: username,
                                                password: passwordString,
                                            });

                                            if (credentialResult.success) {
                                                console.log("✅ [LOGIN-BTN] Fresh credentials saved successfully!");

                                                // Update stored username in Preferences
                                                try {
                                                    await Preferences.set({
                                                        key: "biometric_username",
                                                        value: username
                                                    });
                                                    console.log("✅ [LOGIN-BTN] Updated biometric username in Preferences");
                                                } catch (prefError) {
                                                    console.warn("⚠️ [LOGIN-BTN] Failed to update username in Preferences:", prefError);
                                                }
                                            } else {
                                                console.warn("⚠️ [LOGIN-BTN] Failed to save fresh credentials to Keystore:", credentialResult.error);

                                                // IMPORTANT: Save username to Preferences even if Keystore save failed
                                                // This is critical because credentials are saved to Preferences backup,
                                                // and hasBiometricCredentials() checks for username in Preferences
                                                // Without this, biometric login won't work even though credentials exist in backup
                                                try {
                                                    await Preferences.set({
                                                        key: "biometric_username",
                                                        value: username
                                                    });
                                                    console.log("✅ [LOGIN-BTN] Saved biometric username to Preferences (Keystore save failed, but credentials exist in backup)");
                                                } catch (prefError) {
                                                    console.warn("⚠️ [LOGIN-BTN] Failed to update username in Preferences:", prefError);
                                                }
                                                // Don't fail login if credential save fails - user is already logged in
                                            }
                                        } else {
                                            console.warn("⚠️ [LOGIN-BTN] Invalid credential payload - cannot save");
                                        }
                                    } else {
                                        console.warn("⚠️ [LOGIN-BTN] Credential payload validation failed - cannot save");
                                    }
                                }
                            } else {
                                console.warn("⚠️ [LOGIN-BTN] No username available - cannot save credentials");
                            }
                        } else {
                            console.log("ℹ️ [LOGIN-BTN] Biometric not available - skipping credential save");
                        }
                    } catch (biometricError) {
                        console.error("❌ [LOGIN-BTN] Error saving fresh credentials:", biometricError);
                        // Don't fail login if credential save fails - user is already logged in
                    }
                }

                onSuccess?.({
                    token: token,
                    user: user
                });
            } else {
                console.error("❌ [LOGIN-BTN] Session refresh failed");
                onError?.("Failed to restore your session. Please sign in manually.");
            }
        } catch (error) {
            console.error("❌ [LOGIN-BTN] Biometric login error:", error);
            onError?.(error.message || "Biometric login failed. Please try again.");
        } finally {
            setIsAuthenticating(false);
        }
    };

    // Button is always visible now (removed the auto-hide logic)

    return (
        <button
            onClick={handleBiometricLogin}
            disabled={isAuthenticating}
            className="relative w-[58.1px] h-11 rounded-[12px] border border-gray-600 bg-black/10 backdrop-blur-sm cursor-pointer flex items-center justify-center hover:bg-black/20 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            type="button"
            aria-label="Sign in with Biometric"
        >
            {isAuthenticating ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
                <div className="w-[20px] h-[20px] flex items-center justify-center">
                    <Image
                        className="w-7 h-[30px] object-cover"
                        alt="Apple logo"
                        src="https://c.animaapp.com/2Y7fJDnh/img/image-3961@2x.png"
                        width={28}
                        height={30}
                    />
                </div>
            )}
        </button>
    );
}

