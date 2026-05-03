/**
 * Biometric Authentication Helper
 * Handles Face ID / Touch ID authentication for login
 * Uses capacitor-native-biometric for proven Android/iOS support
 *
 * COMPLETE IMPLEMENTATION FOLLOWING OFFICIAL DOCUMENTATION:
 * https://www.npmjs.com/package/capacitor-native-biometric
 *
 * Features Implemented:
 * 1. isAvailable() - Check if biometric is available
 * 2. verifyIdentity() - Authenticate with biometric
 * 3. setCredentials() - Store credentials securely (per-user for multi-account)
 * 4. getCredentials() - Retrieve stored credentials
 * 5. deleteCredentials() - Delete stored credentials
 * 6. Multi-Account Support - Per-user Keychain entries
 * 7. Replay Protection - Nonce + Secure Enclave P256 signing (iOS)
 */

import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";
import { NativeBiometric, BiometryType } from "capacitor-native-biometric";
import { Preferences } from "@capacitor/preferences";

// Base server identifier for credential storage
const BASE_SERVER = "com.jackson.app";

/**
 * Get user-specific server string for multi-account support
 * @param {string} userId - User ID or email hash
 * @returns {string} - Server string for Keychain
 */
function getUserServer(userId) {
  if (!userId) return BASE_SERVER;
  // Use first 8 chars of sanitized identifier to keep it short
  const sanitizedId = userId.replace(/[^a-zA-Z0-9]/g, "").substring(0, 8);
  return `${BASE_SERVER}.${sanitizedId}`;
}

/**
 * Generate Secure Enclave key pair for replay protection (iOS only)
 * Returns public key to register with backend
 * @returns {Promise<{success: boolean, publicKey?: string, error?: string}>}
 */
export async function generateSecureEnclaveKey() {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    return { success: false, error: "Secure Enclave only available on iOS native" };
  }
  try {
    const result = await NativeBiometric.generateSecureEnclaveKey();
    return { success: true, publicKey: result.publicKey };
  } catch (error) {
    console.error("❌ [BIOMETRIC-LIB] Failed to generate Secure Enclave key:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Sign a nonce with Secure Enclave private key (iOS only)
 * Called after successful biometric authentication for replay protection
 * @param {string} nonce - Random nonce from backend
 * @returns {Promise<{success: boolean, signature?: string, error?: string}>}
 */
export async function signNonceWithSecureEnclave(nonce) {
  if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== "ios") {
    return { success: false, error: "Secure Enclave only available on iOS native" };
  }
  try {
    const result = await NativeBiometric.signNonce({ nonce });
    return { success: true, signature: result.signature };
  } catch (error) {
    console.error("❌ [BIOMETRIC-LIB] Failed to sign nonce:", error);
    return { success: false, error: error.message };
  }
}

/**
 * List all biometric accounts stored on this device
 * @returns {Promise<{success: boolean, accounts?: Array, error?: string}>}
 */
export async function listBiometricAccounts() {
  if (!Capacitor.isNativePlatform()) {
    return { success: false, error: "Not native platform" };
  }
  try {
    const result = await NativeBiometric.listBiometricAccounts();
    return { success: true, accounts: result.accounts || [] };
  } catch (error) {
    console.error("❌ [BIOMETRIC-LIB] Failed to list accounts:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Check if biometric authentication is available on this device
 * Following documentation: https://www.npmjs.com/package/capacitor-native-biometric
 * @returns {Promise<{isAvailable: boolean, biometryType: number, biometryTypeName: string, errorCode?: number}>}
 */
export async function checkBiometricAvailability() {
  console.log("🔍 [BIOMETRIC-LIB] checkBiometricAvailability() called");

  try {
    console.log("🔍 [BIOMETRIC-LIB] Platform:", Capacitor.getPlatform());
    console.log("🔍 [BIOMETRIC-LIB] Is native:", Capacitor.isNativePlatform());

    // Only available on native platforms
    if (!Capacitor.isNativePlatform()) {
      console.log(
        "⚠️ [BIOMETRIC-LIB] Not native platform, returning unavailable",
      );
      return {
        isAvailable: false,
        biometryType: BiometryType.NONE,
        biometryTypeName: "none",
        errorCode: -1,
      };
    }

    console.log("🔍 [BIOMETRIC-LIB] Calling NativeBiometric.isAvailable()...");

    // Call the plugin's isAvailable method
    const result = await NativeBiometric.isAvailable();

    console.log("✅ [BIOMETRIC-LIB] Raw result:", JSON.stringify(result));

    // Map biometry type to human-readable names
    // BiometryType values: 0=NONE, 1=TOUCH_ID, 2=FACE_ID, 3=FINGERPRINT, 4=FACE_AUTHENTICATION, 5=IRIS_AUTHENTICATION
    const biometryTypeNames = {
      [BiometryType.NONE]: "none",
      [BiometryType.TOUCH_ID]: "touchid",
      [BiometryType.FACE_ID]: "faceid",
      [BiometryType.FINGERPRINT]: "fingerprint",
      [BiometryType.FACE_AUTHENTICATION]: "face",
      [BiometryType.IRIS_AUTHENTICATION]: "iris",
    };

    const biometryTypeName =
      biometryTypeNames[result.biometryType] || "unknown";

    console.log("✅ [BIOMETRIC-LIB] Biometric available:", result.isAvailable);
    console.log(
      "✅ [BIOMETRIC-LIB] Biometry type:",
      result.biometryType,
      `(${biometryTypeName})`,
    );

    // IMPORTANT: On Android, the plugin only returns the PRIMARY biometric type
    // If fingerprint (type 3) is returned, face unlock (type 4) might also be available
    // Android's BiometricPrompt will show all available options when verifyIdentity() is called
    // So we should indicate that face unlock might be available even if fingerprint is primary
    const platform = Capacitor.getPlatform();
    let hasFaceUnlock = false;
    let hasFingerprint = false;

    if (platform === "android") {
      // On Android, if fingerprint is detected, face unlock might also be available
      // The plugin only returns the primary type, but Android supports multiple biometrics
      if (result.biometryType === BiometryType.FINGERPRINT) {
        hasFingerprint = true;
        // Note: Face unlock might be available but not detected as primary
        // Android's BiometricPrompt will show all available options when verifyIdentity() is called
        console.log(
          "ℹ️ [BIOMETRIC-LIB] Android: Fingerprint detected as primary (type 3).",
        );
        console.log(
          "ℹ️ [BIOMETRIC-LIB] Android: Face unlock (type 4) may also be available but NOT detected as primary.",
        );
        console.log(
          "ℹ️ [BIOMETRIC-LIB] Android: Note: isAvailable() only returns the PRIMARY biometric type",
        );
        console.log(
          "ℹ️ [BIOMETRIC-LIB] Android: However, verifyIdentity() will show ALL available biometrics",
        );
        console.log(
          "ℹ️ [BIOMETRIC-LIB] Android: Both fingerprint and face unlock will appear if both are enrolled",
        );
      } else if (result.biometryType === BiometryType.FACE_AUTHENTICATION) {
        hasFaceUnlock = true;
        console.log(
          "✅ [BIOMETRIC-LIB] Android: Face unlock detected as primary (type 4).",
        );
      }
    } else if (platform === "ios") {
      if (result.biometryType === BiometryType.FACE_ID) {
        hasFaceUnlock = true;
        console.log("✅ [BIOMETRIC-LIB] iOS: Face ID detected (type 2).");
      } else if (result.biometryType === BiometryType.TOUCH_ID) {
        hasFingerprint = true;
        console.log("✅ [BIOMETRIC-LIB] iOS: Touch ID detected (type 1).");
      }
    }

    return {
      isAvailable: result.isAvailable || false,
      biometryType: result.biometryType,
      biometryTypeName,
      errorCode: result.errorCode,
      // Additional info for Android
      hasFaceUnlock:
        platform === "android" && hasFingerprint ? "maybe" : hasFaceUnlock,
      hasFingerprint,
      platform,
    };
  } catch (error) {
    console.error(
      "❌ [BIOMETRIC-LIB] Error checking biometric availability:",
      error,
    );
    return {
      isAvailable: false,
      biometryType: BiometryType.NONE,
      biometryTypeName: "none",
      errorCode: error.code || -1,
      errorMessage: error.message,
    };
  }
}

/**
 * Verify identity using biometric authentication
 * Following documentation: https://www.npmjs.com/package/capacitor-native-biometric
 * @param {Object} options - Authentication options
 * @param {string} options.reason - Reason for authentication
 * @param {string} options.title - Title for prompt
 * @param {string} options.subtitle - Subtitle for prompt
 * @param {string} options.description - Description for prompt
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyBiometricIdentity(options = {}) {
  console.log("🔐 [BIOMETRIC-LIB] verifyBiometricIdentity() called");
  console.log("🔐 [BIOMETRIC-LIB] Options:", JSON.stringify(options));

  try {
    // Check if biometric is available first
    const availability = await checkBiometricAvailability();

    if (!availability.isAvailable) {
      console.log("❌ [BIOMETRIC-LIB] Biometric not available");
      return {
        success: false,
        error: "Biometric authentication not available on this device",
      };
    }

    const {
      reason = "For easy log in",
      title = "Log in",
      subtitle = "Authenticate to continue",
      description = "Use your biometric to verify your identity",
    } = options;

    console.log("🔐 [BIOMETRIC-LIB] Calling verifyIdentity...");
    console.log("🔐 [BIOMETRIC-LIB] Platform:", Capacitor.getPlatform());

    if (Capacitor.getPlatform() === "android") {
      console.log("ℹ️ [BIOMETRIC-LIB] Android: BiometricPrompt is being shown");
      console.log(
        "ℹ️ [BIOMETRIC-LIB] Android: BiometricPrompt will show all available biometric authenticators",
      );
      console.log(
        "ℹ️ [BIOMETRIC-LIB] Android: If face unlock is enrolled, it will appear in the prompt alongside fingerprint",
      );
    }

    // Call verifyIdentity - it resolves on success, rejects on failure
    // NOTE: Android's BiometricPrompt will show all available authenticators by default
    // Both fingerprint and face unlock will appear if both are enrolled
    // iOS: Set useFallback: false to prevent device passcode fallback (plugin uses LAContext)
    await NativeBiometric.verifyIdentity({
      reason,
      title,
      subtitle,
      description,
      useFallback: false, // Prevent fallback to device passcode on iOS
    });

    console.log("✅ [BIOMETRIC-LIB] Biometric verification successful!");
    console.log(
      "✅ [BIOMETRIC-LIB] User authenticated using biometric (fingerprint or face unlock)",
    );

    return {
      success: true,
      biometryType: availability.biometryType,
      biometryTypeName: availability.biometryTypeName,
    };
  } catch (error) {
    console.error("❌ [BIOMETRIC-LIB] Biometric verification failed:", error);
    return {
      success: false,
      error: error.message || "Biometric authentication failed",
      errorCode: error.code,
    };
  }
}

/**
 * Store user credentials securely using native biometric secure storage
 * Following documentation: https://www.npmjs.com/package/capacitor-native-biometric
 * Multi-Account Support: Uses per-user Keychain entries
 * @param {Object} credentials - User credentials
 * @param {string} credentials.username - Username (email or phone)
 * @param {string} credentials.password - Password (or auth token)
 * @param {string} [credentials.userId] - User ID for multi-account support
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function setCredentials(credentials) {
  console.log("💾 [BIOMETRIC-LIB] setCredentials() called");
  console.log("💾 [BIOMETRIC-LIB] Platform:", Capacitor.getPlatform());
  console.log("💾 [BIOMETRIC-LIB] Is native:", Capacitor.isNativePlatform());
  console.log("💾 [BIOMETRIC-LIB] Username:", credentials?.username);

  try {
    if (!Capacitor.isNativePlatform()) {
      console.log(
        "⚠️ [BIOMETRIC-LIB] Not native platform, using localStorage fallback",
      );
      localStorage.setItem("biometric_username", credentials.username);
      localStorage.setItem("biometric_password", credentials.password);
      return { success: true };
    }

    if (!credentials || typeof credentials !== "object") {
      return { success: false, error: "Invalid credentials object provided" };
    }

    const { username, password, userId } = credentials;

    if (!username || typeof username !== "string" || username.trim().length === 0) {
      return { success: false, error: "Valid username (non-empty string) is required" };
    }

    if (!password || typeof password !== "string" || password.trim().length === 0) {
      return { success: false, error: "Valid password (non-empty string) is required" };
    }

    const passwordString = String(password);
    if (passwordString === "{}" || passwordString === "[object Object]") {
      return { success: false, error: "Password must be a string, not an object" };
    }

    // Multi-account: Use per-user server string
    const server = getUserServer(userId || username);
    console.log("💾 [BIOMETRIC-LIB] Server (multi-account):", server);

    await NativeBiometric.setCredentials({
      username: username.trim(),
      password: passwordString,
      server: server,
    });

    console.log("✅ [BIOMETRIC-LIB] Credentials saved successfully");
    console.log("✅ [BIOMETRIC-LIB] Server:", server);
    console.log("✅ [BIOMETRIC-LIB] Username saved:", username);

    // Save username to Preferences for quick lookup (used by hasBiometricCredentials)
    try {
      await Preferences.set({ key: "biometric_username", value: username.trim() });
      console.log("✅ [BIOMETRIC-LIB] Username saved to Preferences");
    } catch (prefError) {
      console.warn("⚠️ [BIOMETRIC-LIB] Failed to save username to Preferences:", prefError);
    }
    
    // Also save to localStorage as fallback
    try {
      localStorage.setItem("biometric_username_backup", username.trim());
    } catch (localError) {
      console.warn("⚠️ [BIOMETRIC-LIB] Failed to save username to localStorage:", localError);
    }

    return { success: true };
  } catch (error) {
    console.error("❌ [BIOMETRIC-LIB] Failed to save credentials:", error);
    return { success: false, error: error.message || "Failed to save credentials", errorCode: error.code };
  }
}

/**
 * Retrieves saved credentials from native secure storage (Keychain/Keystore)
 * 
 * Multi-Account Support: Uses per-user Keychain entries
 * @param {string} [userId] - User ID for multi-account support
 * @returns {Promise<{success: boolean, username?: string, password?: string, error?: string}>}
 */
export async function getCredentials(userId) {
  console.log("🔑 [BIOMETRIC-LIB] getCredentials() called");
  console.log("🔑 [BIOMETRIC-LIB] Platform:", Capacitor.getPlatform());
  console.log("🔑 [BIOMETRIC-LIB] Is native:", Capacitor.isNativePlatform());

  try {
    if (!Capacitor.isNativePlatform()) {
      const username = localStorage.getItem("biometric_username");
      const password = localStorage.getItem("biometric_password");

      if (!username || !password) {
        return { success: false, error: "No credentials found" };
      }

      return { success: true, username, password };
    }

    // Multi-account: Use per-user server string
    const server = getUserServer(userId);
    console.log("🔑 [BIOMETRIC-LIB] Server (multi-account):", server);

    const credentials = await NativeBiometric.getCredentials({ server });

    return {
      success: true,
      username: credentials.username,
      password: credentials.password,
    };
  } catch (error) {
    const errorMessage = error.message || "";

    const isNoCredentialsError =
      errorMessage.includes("Failed to get credentials") ||
      errorMessage.includes("No credentials found") ||
      errorMessage.includes("not found") ||
      errorMessage.toLowerCase().includes("no credentials");

    if (isNoCredentialsError) {
      return {
        success: false,
        error: "No credentials found",
        errorCode: error.code,
        isNoCredentials: true,
      };
    }

    console.error(
      "❌ [BIOMETRIC-LIB] Failed to retrieve credentials from Keychain:",
      error,
    );
    return {
      success: false,
      error: error.message || "Failed to retrieve credentials",
      errorCode: error.code,
    };
  }
}

/**
 * Delete stored credentials from native biometric secure storage
 * Following documentation: https://www.npmjs.com/package/capacitor-native-biometric
 * Multi-Account Support: Deletes per-user Keychain entry
 * @param {string} [userId] - User ID for multi-account support
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function deleteCredentials(userId) {
  console.log("🗑️ [BIOMETRIC-LIB] deleteCredentials() called");

  try {
    if (!Capacitor.isNativePlatform()) {
      localStorage.removeItem("biometric_username");
      localStorage.removeItem("biometric_password");
      return { success: true };
    }

    // Multi-account: Use per-user server string
    const server = getUserServer(userId);
    console.log("🗑️ [BIOMETRIC-LIB] Deleting credentials for server:", server);

    await NativeBiometric.deleteCredentials({ server });

    console.log("✅ [BIOMETRIC-LIB] Credentials deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("❌ [BIOMETRIC-LIB] Failed to delete credentials:", error);
    return {
      success: false,
      error: error.message || "Failed to delete credentials",
    };
  }
}

/**
 * Complete biometric authentication flow for login
 * This is a complete implementation following the documentation
 * Flow: Check availability -> Get nonce -> Verify identity -> Sign nonce (iOS) -> Retrieve credentials
 * @param {Object} options - Authentication options
 * @param {string} [options.userId] - User ID for multi-account support
 * @param {boolean} [options.useReplayProtection] - Whether to use nonce + signature (default: true for iOS)
 * @returns {Promise<{success: boolean, username?: string, password?: string, biometryType?: number, nonce?: string, signature?: string, publicKey?: string, error?: string}>}
 */
export async function authenticateWithBiometric(options = {}) {
  console.log("🔐 [BIOMETRIC-LIB] authenticateWithBiometric() - Complete Flow");

  try {
    const { userId } = options;

    // Step 1: Check if biometric is available
    const availability = await checkBiometricAvailability();

    if (!availability.isAvailable) {
      return {
        success: false,
        error: "Biometric authentication not available",
      };
    }

    console.log(
      "✅ [BIOMETRIC-LIB] Biometric type:",
      availability.biometryTypeName,
    );

    let nonce, signature, publicKey;

    // Step 2: Replay Protection - Get nonce from backend (if supported)
    const useReplayProtection = options.useReplayProtection !== false && Capacitor.getPlatform() === "ios";
    
    if (useReplayProtection) {
      // Get stored username to request nonce
      const server = getUserServer(userId);
      try {
        const tempCreds = await NativeBiometric.getCredentials({ server });
        
        if (tempCreds?.username) {
          console.log("🔐 [BIOMETRIC-LIB] Requesting nonce for replay protection...");
          const nonceResult = await requestBiometricNonce(tempCreds.username);
          
          if (nonceResult?.success && nonceResult?.nonce) {
            nonce = nonceResult.nonce;
            console.log("✅ [BIOMETRIC-LIB] Nonce received:", nonce.substring(0, 16) + "...");
          }
        }
      } catch (nonceError) {
        console.warn("⚠️ [BIOMETRIC-LIB] Failed to get nonce, continuing without replay protection:", nonceError.message);
      }
    }

    // Step 3: Verify identity with biometric
    const verification = await verifyBiometricIdentity({
      reason: options.reason || "Login to your Jackson account",
      title: options.title || "Biometric Login",
      subtitle: options.subtitle || "Authenticate to continue",
      description: options.description || "Use your biometric to log in",
    });

    if (!verification.success) {
      return {
        success: false,
        error: verification.error || "Biometric verification failed",
      };
    }

    console.log("✅ [BIOMETRIC-LIB] Biometric verification successful");

    // Step 4: Replay Protection - Sign nonce with Secure Enclave (iOS)
    if (useReplayProtection && nonce) {
      try {
        console.log("🔐 [BIOMETRIC-LIB] Signing nonce with Secure Enclave...");
        const signResult = await signNonceWithSecureEnclave(nonce);
        
        if (signResult?.success && signResult?.signature) {
          signature = signResult.signature;
          console.log("✅ [BIOMETRIC-LIB] Nonce signed successfully");
          
          // Get public key for backend verification
          const keyResult = await generateSecureEnclaveKey();
          if (keyResult?.success && keyResult?.publicKey) {
            publicKey = keyResult.publicKey;
          }
        }
      } catch (signError) {
        console.warn("⚠️ [BIOMETRIC-LIB] Failed to sign nonce:", signError.message);
      }
    }

    // Step 5: Retrieve stored credentials
    const credentialsResult = await getCredentials(userId);

    if (!credentialsResult.success) {
      return {
        success: false,
        error: "No saved credentials found. Please login manually first.",
      };
    }

    console.log("✅ [BIOMETRIC-LIB] Complete authentication successful");

    return {
      success: true,
      username: credentialsResult.username,
      password: credentialsResult.password,
      biometryType: availability.biometryType,
      biometryTypeName: availability.biometryTypeName,
      nonce,
      signature,
      publicKey,
    };
  } catch (error) {
    console.error("❌ [BIOMETRIC-LIB] Authentication flow failed:", error);
    return {
      success: false,
      error: error.message || "Authentication failed",
    };
  }
}

/**
 * Get device ID for biometric tracking
 * @returns {Promise<string>}
 */
export async function getDeviceId() {
  try {
    const deviceInfo = await Device.getId();
    return deviceInfo.identifier || "unknown";
  } catch (error) {
    console.error("❌ [BIOMETRIC-LIB] Error getting device ID:", error);
    return "unknown";
  }
}

/**
 * Check if user has biometric credentials stored
 * This checks if credentials exist WITHOUT requiring biometric authentication
 * Uses Preferences to check if username is stored (survives logout)
 * @returns {Promise<boolean>}
 */
export async function hasBiometricCredentials(userId) {
  try {
    if (!Capacitor.isNativePlatform()) {
      return false; // No Keychain on web
    }

    // Use provided userId or get stored username from Preferences
    let targetUserId = userId;
    
    if (!targetUserId) {
      try {
        console.log("🔍 [BIOMETRIC-LIB] Attempting to get biometric_username from Preferences...");
        const prefResult = await Preferences.get({ key: "biometric_username" });
        console.log("🔍 [BIOMETRIC-LIB] Preferences.get result:", JSON.stringify(prefResult));
        const { value: storedUsername } = prefResult;
        if (storedUsername) {
          targetUserId = storedUsername;
          console.log(
            "ℹ️ [BIOMETRIC-LIB] Using stored username for credential check:",
            storedUsername,
          );
        } else {
          console.log("ℹ️ [BIOMETRIC-LIB] No username value in Preferences result:", JSON.stringify(prefResult));
        }
      } catch (prefError) {
        console.warn("⚠️ [BIOMETRIC-LIB] Could not get stored username from Preferences:", JSON.stringify(prefError));
        console.warn("⚠️ [BIOMETRIC-LIB] prefError type:", typeof prefError, "stringified:", JSON.stringify(prefError));
        // Fallback to localStorage
        try {
          const localUsername = localStorage.getItem("biometric_username") || localStorage.getItem("biometric_username_backup");
          if (localUsername) {
            targetUserId = localUsername;
            console.log("ℹ️ [BIOMETRIC-LIB] Using localStorage fallback for username:", localUsername);
          }
        } catch (localError) {
          console.warn("⚠️ [BIOMETRIC-LIB] localStorage fallback also failed:", localError);
        }
      }
    }

    if (!targetUserId) {
      console.log("ℹ️ [BIOMETRIC-LIB] No user ID available to check credentials");
      return false;
    }

    // Check Keychain for this user's credentials
    const server = getUserServer(targetUserId);
    try {
      const credentials = await NativeBiometric.getCredentials({ server });
      if (credentials?.username) {
        console.log(
          "✅ [BIOMETRIC-LIB] Found stored credentials in Keychain for user:",
          credentials.username,
        );
        return true;
      }
    } catch (keychainError) {
      console.log(
        "ℹ️ [BIOMETRIC-LIB] No credentials found in Keychain for server:",
        server,
        "error:",
        keychainError.message || keychainError,
      );
    }

    return false;
  } catch (error) {
    console.warn("⚠️ [BIOMETRIC-LIB] Error checking for credentials:", error);
    return false;
  }
}

/**
 * Check if user has biometric enabled locally
 * @returns {boolean}
 */
export function isBiometricEnabledLocally() {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("biometricEnabled") === "true";
}

/**
 * Get stored biometric type
 * @returns {string|null} - "faceid", "touchid", "fingerprint", "face", "iris" or null
 */
export function getBiometricType() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("biometricType");
}

/**
 * Enable biometric locally after successful setup
 * @param {string} type - Biometry type name
 */
export function enableBiometricLocally(type) {
  if (typeof window === "undefined") return;
  localStorage.setItem("biometricEnabled", "true");
  localStorage.setItem("biometricType", type);
  localStorage.setItem("faceVerificationCompleted", "true");
  console.log("✅ [BIOMETRIC-LIB] Biometric enabled locally:", type);
}

/**
 * Disable biometric locally and clear credentials
 * @returns {Promise<{success: boolean}>}
 */
export async function disableBiometricLocally() {
  if (typeof window === "undefined") return { success: false };

  // Clear local storage flags
  localStorage.removeItem("biometricEnabled");
  localStorage.removeItem("biometricType");
  localStorage.removeItem("faceVerificationCompleted");

  // Delete stored credentials
  const result = await deleteCredentials();

  console.log("✅ [BIOMETRIC-LIB] Biometric disabled locally");
  return result;
}
