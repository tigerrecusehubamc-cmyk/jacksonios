/**
 * Verisoul Frontend SDK Integration
 * Official Browser SDK Integration
 * Documentation: https://docs.verisoul.ai/integration/frontend/browser
 */

const VERISOUL_API_KEY = process.env.NEXT_PUBLIC_VERISOUL_API_KEY;

if (!VERISOUL_API_KEY) {
  console.warn("⚠️ [Verisoul] NEXT_PUBLIC_VERISOUL_API_KEY is not set. Please add it to your .env file.");
} else if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  console.log("✅ [Verisoul] API key loaded from env (key present)");
}

// Use SANDBOX when NEXT_PUBLIC_VERISOUL_BASE_URL=https://api.sandbox.verisoul.ai (recommended for testing). Otherwise production.
const VERISOUL_BASE_URL =
  process.env.NEXT_PUBLIC_VERISOUL_BASE_URL || "https://api.verisoul.ai";

const VERISOUL_ENV = VERISOUL_BASE_URL.includes("sandbox") ? "sandbox" : "prod";

let isInitialized = false;
let sessionId = null;

/**
 * Wait for Verisoul SDK to be available
 * @param {number} maxWaitMs - Maximum time to wait in milliseconds
 * @returns {Promise<boolean>} - True if SDK is available, false otherwise
 */
const logVerisoulState = (label) => {
  if (typeof window === "undefined") return;
  const hasVerisoul = !!window.Verisoul;
  const sessionType = hasVerisoul ? typeof window.Verisoul.session : "n/a";
  const scriptTag = document.querySelector("script[verisoul-project-id]");
  console.log(`[Verisoul Debug] ${label}:`, {
    hasVerisoul,
    sessionType,
    scriptInDom: !!scriptTag,
    scriptSrc: scriptTag?.src || "none",
    projectId: scriptTag?.getAttribute?.("verisoul-project-id") || "none",
  });
};

const waitForVerisoul = (maxWaitMs = 10000) => {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Verisoul && typeof window.Verisoul.session === "function") {
      resolve(true);
      return;
    }

    const startTime = Date.now();
    const checkInterval = setInterval(() => {
      if (typeof window !== "undefined" && window.Verisoul && typeof window.Verisoul.session === "function") {
        clearInterval(checkInterval);
        resolve(true);
      } else if (Date.now() - startTime > maxWaitMs) {
        clearInterval(checkInterval);
        logVerisoulState("timeout – SDK still not ready");
        console.warn("⚠️ [Verisoul] SDK not available after waiting", maxWaitMs, "ms");
        resolve(false);
      }
    }, 100);
  });
};

/**
 * Initialize Verisoul SDK
 * This should be called early in the app lifecycle
 * Official API: https://docs.verisoul.ai/integration/frontend/browser
 */
export const initializeVerisoulSDK = async () => {
  if (typeof window === "undefined") {
    console.warn("⚠️ [Verisoul] Cannot initialize on server side");
    return { success: false, error: "Server side initialization not supported" };
  }

  if (isInitialized && sessionId) {
    console.log("✅ [Verisoul] SDK already initialized with session:", sessionId);
    return { success: true, sessionId };
  }

  try {
    logVerisoulState("initializeVerisoulSDK start");

    // Wait for Verisoul SDK to load from HTML script tag (10s)
    let sdkAvailable = await waitForVerisoul(10000);
    console.log("[Verisoul Debug] After first wait (10s): sdkAvailable =", sdkAvailable);

    if (!sdkAvailable) {
      console.log("[Verisoul Debug] Retrying in 2.5s...");
      await new Promise((r) => setTimeout(r, 2500));
      logVerisoulState("before retry wait");
      sdkAvailable = await waitForVerisoul(8000);
      console.log("[Verisoul Debug] After retry wait (8s): sdkAvailable =", sdkAvailable);
    }

    if (!sdkAvailable) {
      // SDK not available - use fallback (this is expected until SDK loads)
      if (!isInitialized) {
        console.log("ℹ️ [Verisoul] SDK not ready after wait + retry, using fallback session ID");
      }
      sessionId = generateFallbackSessionId();
      isInitialized = true;
      console.log("[FraudDebug] Verisoul SDK – SDK not available, fallback session_id:", sessionId?.slice?.(0, 24) + "...");
      return { success: true, sessionId, fallback: true };
    }

    // Get session ID using official Verisoul.session() API
    // Documentation: https://docs.verisoul.ai/integration/frontend/browser#session
    if (window.Verisoul && typeof window.Verisoul.session === "function") {
      try {
        console.log("[Verisoul Debug] Calling Verisoul.session()...");
        const result = await window.Verisoul.session();
        console.log("[Verisoul Debug] Verisoul.session() result:", typeof result, result);

        if (result && result.session_id) {
          sessionId = result.session_id;
          isInitialized = true;
          console.log("✅ [Verisoul] SDK initialized successfully with session:", sessionId);
          console.log("[FraudDebug] Verisoul SDK – session_id from SDK:", sessionId?.slice?.(0, 24) + "...");
          return { success: true, sessionId };
        } else if (typeof result === "string") {
          // Handle case where session() returns string directly
          sessionId = result;
          isInitialized = true;
          console.log("✅ [Verisoul] SDK initialized successfully with session:", sessionId);
          console.log("[FraudDebug] Verisoul SDK – session_id from SDK (string):", sessionId?.slice?.(0, 24) + "...");
          return { success: true, sessionId };
        } else {
          console.warn("⚠️ [Verisoul] Unexpected session() response format:", result);
          sessionId = generateFallbackSessionId();
          isInitialized = true;
          console.log("[FraudDebug] Verisoul SDK – using fallback session_id:", sessionId?.slice?.(0, 24) + "...");
          return { success: true, sessionId, fallback: true };
        }
      } catch (sessionError) {
        console.error("❌ [Verisoul] Error getting session ID:", sessionError);
        console.log("[Verisoul Debug] session() error details:", sessionError?.message, sessionError?.stack);
        sessionId = generateFallbackSessionId();
        isInitialized = true;
        return { success: true, sessionId, fallback: true };
      }
    } else {
      logVerisoulState("SDK check failed (Verisoul or session not ready) – using fallback");
      sessionId = generateFallbackSessionId();
      isInitialized = true;
      return { success: true, sessionId, fallback: true };
    }
  } catch (error) {
    console.error("❌ [Verisoul] Initialization error:", error);
    // Use fallback even on error
    sessionId = generateFallbackSessionId();
    isInitialized = true;
    return { success: true, sessionId, fallback: true, error: error.message };
  }
};

/**
 * Generate a fallback session ID when SDK is not available
 */
const generateFallbackSessionId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const deviceId = localStorage.getItem("deviceId") || "unknown";
  return `fallback_${timestamp}_${random}_${deviceId.substring(0, 8)}`;
};

/**
 * Get current Verisoul session ID
 * Uses official Verisoul.session() API
 * @returns {Promise<string|null>} Session ID or null
 */
export const getVerisoulSessionId = async () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    // If not initialized, initialize first
    if (!isInitialized) {
      const initResult = await initializeVerisoulSDK();
      if (initResult.success && initResult.sessionId) {
        return initResult.sessionId;
      }
    }

    // Return stored session ID
    if (sessionId) {
      return sessionId;
    }

    // Try to get from SDK again using official API
    if (window.Verisoul && typeof window.Verisoul.session === "function") {
      try {
        const result = await window.Verisoul.session();
        if (result && result.session_id) {
          sessionId = result.session_id;
          return sessionId;
        } else if (typeof result === "string") {
          sessionId = result;
          return sessionId;
        }
      } catch (error) {
        console.error("❌ [Verisoul] Error getting session ID:", error);
      }
    }

    return null;
  } catch (error) {
    console.error("❌ [Verisoul] Error getting session ID:", error);
    return null;
  }
};

/**
 * Reinitialize Verisoul session
 * Official API: https://docs.verisoul.ai/integration/frontend/browser#reinitialize
 * Useful when user logs out to generate a new session_id
 */
export const reinitializeVerisoulSession = async () => {
  try {
    // Clear existing session
    sessionId = null;
    isInitialized = false;

    // Use official Verisoul.reinitialize() API
    if (window.Verisoul && typeof window.Verisoul.reinitialize === "function") {
      try {
        await window.Verisoul.reinitialize();
        console.log("✅ [Verisoul] Session reinitialized");
      } catch (error) {
        console.error("❌ [Verisoul] Error reinitializing:", error);
      }
    }

    // Get new session ID
    const result = await initializeVerisoulSDK();
    return result;
  } catch (error) {
    console.error("❌ [Verisoul] Error reinitializing:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if Verisoul SDK is initialized
 */
export const isVerisoulSDKInitialized = () => {
  return isInitialized;
};

/**
 * Get current session ID (sync version)
 * Returns null if not initialized
 */
export const getCurrentSessionId = () => {
  return sessionId;
};
