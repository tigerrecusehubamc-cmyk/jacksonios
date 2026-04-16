import { getUserFromLocalStorage } from "./utils";
import { getIntegrityToken } from "./playIntegrity";

// A custom error class to hold structured API error data
class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.responseData = body; // Alias for easier access
  }
}

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://rewardsuatapi.hireagent.co";

// Performance optimization: Only log in development or when explicitly enabled
const DEBUG_API =
  typeof window !== "undefined" &&
  (process.env.NODE_ENV === "development" ||
    localStorage.getItem("debug_api") === "true");

// Optimized logging function - only logs if DEBUG_API is true
const apiLog = (...args) => {
  if (DEBUG_API) {
    // console.log(...args);
  }
};

const apiError = (...args) => {
  // Always log errors, but less verbose
  if (DEBUG_API) {
    console.error(...args);
  } else {
    // In production, only log critical errors
    const lastArg = args[args.length - 1];
    if (lastArg?.error || lastArg?.message) {
      console.error("API Error:", lastArg.error || lastArg.message);
    }
  }
};
// const BASE_URL = "https://rewardsuatapi.hireagent.co";
// const BASE_URL = "http://10.0.2.2:4001";

const handleResponse = async (response) => {
  try {
    apiLog("🔍 [API] handleResponse called, status:", response.status);
    const contentType = response.headers.get("content-type");

    let responseData;

    if (response.status === 204) {
      return { success: true, data: null };
    }

    // Handle HTML responses (usually 404 or error pages)
    const isHtml = contentType && contentType.includes("text/html");

    if (isHtml) {
      const htmlText = await response.text();
      apiError("⚠️ [API] Received HTML response instead of JSON");

      // If it's HTML (likely 404), provide a more helpful error
      if (response.status === 404) {
        throw new ApiError(
          "API endpoint not found. Please ensure the backend routes are implemented.",
          response.status,
          { html: htmlText.substring(0, 200) },
        );
      }
      throw new ApiError(
        `Server returned HTML instead of JSON. Status: ${response.status}. This usually means the endpoint doesn't exist or the server is misconfigured.`,
        response.status,
        { html: htmlText.substring(0, 200) },
      );
    }

    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
      apiLog("🔍 [API] JSON parsed successfully");
    } else {
      const textData = await response.text();
      responseData = { message: textData };
    }

    if (!response.ok) {
      apiError(
        "❌ [API] Response not OK, status:",
        response.status,
        responseData,
      );

      // Log for debugging
      console.log("[API Error] responseData:", responseData);
      console.log("[API Error] blocked:", responseData?.blocked);

      // 🔒 GLOBAL VPN/PROXY BLOCK - Works anywhere in the app!
      // COMMENTED OUT FOR TESTING
      /*
      if (responseData?.blocked === true) {
        console.error(
          "🔒 [API] VPN/Proxy detected! Blocking user. Reason:",
          responseData?.reason,
        );

        // Check if already on blocked page (prevent infinite loop!)
        if (
          typeof window !== "undefined" &&
          window.location?.pathname?.includes("/blocked")
        ) {
          console.log("[API] Already on blocked page, skipping redirect");
          throw new ApiError(
            responseData?.message || "VPN/Proxy connections not allowed",
            403,
            responseData,
          );
        }

        // Check if already blocked (prevent re-trigger)
        try {
          const alreadyBlocked = localStorage.getItem("vpn_blocked_recent");
          if (alreadyBlocked === "true") {
            console.log("[API] Already blocked recently, skipping redirect");
            throw new ApiError(
              responseData?.message || "VPN/Proxy connections not allowed",
              403,
              responseData,
            );
          }
          localStorage.setItem("vpn_blocked_recent", "true");
          localStorage.setItem("vpn_blocked", "true");
          localStorage.setItem(
            "vpn_reason",
            responseData?.reason || "vpn_detected",
          );
          localStorage.setItem(
            "vpn_message",
            responseData?.message || "VPN/Proxy connections not allowed",
          );

          // Clear after 5 seconds to allow retry
          setTimeout(() => {
            try {
              localStorage.setItem("vpn_blocked_recent", "false");
            } catch (e) {}
          }, 5000);
        } catch (e) {}

        // Redirect immediately to blocked page
        if (typeof window !== "undefined" && window.location) {
          const reason = responseData?.reason || "vpn_detected";
          const message = encodeURIComponent(
            responseData?.message || "VPN/Proxy connections not allowed",
          );
          window.location.href = `/blocked?reason=${reason}&message=${message}`;
        }

        // Throw error with blocked data so it can be caught anywhere
        throw new ApiError(
          responseData?.message || "VPN/Proxy connections not allowed",
          403,
          responseData,
        );
      }
      */

      const errorMessage =
        responseData.error ||
        (responseData.errors && responseData.errors[0]?.msg) ||
        responseData.message ||
        `HTTP error! status: ${response.status}`;
      throw new ApiError(errorMessage, response.status, responseData);
    }

    return responseData;
  } catch (error) {
    apiError("❌ [API] handleResponse error:", error);
    throw error; // Re-throw to be caught by apiRequest
  }
};

const apiRequest = async (
  endpoint,
  method = "GET",
  body = null,
  token = null,
  isFormData = false,
  options = {},
) => {
  const headers = {};

  // Only set Content-Type for non-FormData requests
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    // Endpoints that require Bearer token
    const needsBearer = [
      "/api/cash-coach",
      "/api/vip",
      "/api/payment",
      "/api/game",
      "/api/profile/notifications",
      "/api/biometric",
      "/api/non-game-offers",
      "/api/non-gaming-survey",
      "/api/daily-rewards",
      "/api/v3/daily-rewards", // V3 user-based weeks
      "/api/daily-challenge",
      "/api/xp-tier",
      "/api/user/game-offers",
      "/api/fraud-prevention",
      "/api/welcome-bonus-tasks",
      "/api/conversion",
      "/api/my-games",
      "/api/google-play-iap",
      "/api/onboarding",
      "/v2/adjust", // Adjust S2S endpoints
      "/api/walkathon",
    ].some((p) => endpoint.startsWith(p));
    if (needsBearer) {
      headers["Authorization"] = `Bearer ${token}`;
    } else {
      // Payout endpoints use x-auth-token (protect middleware)
      headers["x-auth-token"] = token;
    }
    // Google Play Integrity: attach token for reward/withdraw endpoints (Android only).
    // Token is NOT stored; obtained on-demand and sent only in this header (see lib/playIntegrity.js).
    // Commented out until ENDPOINTS_REQUIRING_INTEGRITY is defined (see docs/PLAY_INTEGRITY.md).
    // if (ENDPOINTS_REQUIRING_INTEGRITY.some((p) => endpoint.startsWith(p))) {
    //   try {
    //     const integrityToken = await getIntegrityToken({ authToken: token });
    //     if (integrityToken) {
    //       headers["X-Integrity-Token"] = integrityToken;
    //       apiLog("[PlayIntegrity] X-Integrity-Token attached for", endpoint);
    //     } else {
    //       apiLog("[PlayIntegrity] no integrity token for", endpoint);
    //     }
    //   } catch (e) {
    //     apiError(
    //       "[PlayIntegrity] getIntegrityToken error for",
    //       endpoint,
    //       e?.message ?? e,
    //     );
    //   }
    // }
  }

  const config = { method, headers };
  if (body) {
    if (isFormData) {
      config.body = body; // Use FormData directly
    } else {
      config.body = JSON.stringify(body);
    }
  }

  try {
    apiLog("🔍 [API] apiRequest:", method, endpoint);

    // Add timeout to prevent hanging (30 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
      apiError("❌ [API] Request timeout:", endpoint);
    }, 30000);

    const fetchConfig = {
      ...config,
      signal: controller.signal,
    };

    const fetchStartTime = Date.now();
    const response = await fetch(`${BASE_URL}${endpoint}`, fetchConfig);

    clearTimeout(timeoutId);
    const fetchDuration = Date.now() - fetchStartTime;

    // Only log slow requests (> 1 second) or in debug mode
    if (fetchDuration > 1000 || DEBUG_API) {
      apiLog(
        `🔍 [API] ${endpoint} completed in ${fetchDuration}ms, status: ${response.status}`,
      );
    }

    const result = await handleResponse(response);

    // [FraudDebug] Log fraud-prevention request/response
    if (endpoint.startsWith("/api/fraud-prevention")) {
      if (endpoint.includes("/session/authenticate")) {
        console.log(
          "[FraudDebug] POST authenticate – body keys:",
          body ? Object.keys(body) : [],
          "session_id sent:",
          body?.session_id
            ? `${String(body.session_id).slice(0, 20)}...`
            : "none",
        );
        console.log(
          "[FraudDebug] POST authenticate – response:",
          result?.success
            ? {
                success: true,
                sessionId: result?.sessionId,
                risk_score: result?.data?.risk_score,
                decision: result?.data?.decision,
              }
            : result,
        );
      } else if (endpoint.includes("/session/unauthenticate")) {
        console.log(
          "[FraudDebug] POST unauthenticate – body sessionId:",
          body?.sessionId,
        );
        console.log(
          "[FraudDebug] POST unauthenticate – response:",
          result?.success !== false ? "ok" : result,
        );
      } else if (
        method === "GET" &&
        endpoint.includes("/session/") &&
        !endpoint.endsWith("/authenticate")
      ) {
        const pathId =
          endpoint.split("/session/")[1]?.split("/")[0] || endpoint;
        console.log(
          "[FraudDebug] GET session status – sessionId in URL:",
          pathId,
        );
        console.log(
          "[FraudDebug] GET session status – response:",
          result?.success
            ? {
                status: result?.data?.status,
                risk_score: result?.data?.risk_score,
              }
            : result,
        );
      }
    }

    // For biometric endpoints, ensure consistent response structure
    if (endpoint.includes("/biometric")) {
      // For status endpoint, preserve isRegistered flag and log for debugging
      if (endpoint.includes("/biometric/status")) {
        // Backend returns: { success: true, isRegistered: true/false, ... }
        // Preserve the structure as-is
        apiLog(
          "🔍 [API] Biometric status response:",
          JSON.stringify(result, null, 2),
        );
        return result;
      }

      // For biometric-login endpoint, backend returns: { success: true, token: "...", user: {...} }
      // Backend format: { success: true, token: "jwt...", user: { _id: "string", email: "...", mobile: "...", ... } }
      // Following official pattern: Backend returns token and user at top level
      if (endpoint.includes("/biometric-login")) {
        // Backend structure: { success: true, token: "...", user: {...} }
        // Ensure token and user are at top level for consistent access
        // Process if success is true OR if we have token and user (defensive fallback)
        if (
          result.success !== false &&
          (result.token || result.data?.token) &&
          (result.user || result.data?.user)
        ) {
          const extractedToken = result.token || result.data?.token;
          let extractedUser = result.user || result.data?.user;

          // Ensure user._id is a string (MongoDB ObjectIds are serialized to strings in JSON, but be defensive)
          if (extractedUser && extractedUser._id) {
            // Convert _id to string if it's not already (handles ObjectId objects)
            if (typeof extractedUser._id !== "string") {
              extractedUser = {
                ...extractedUser,
                _id: String(extractedUser._id),
              };
            }
          }

          // Validate user object has required fields
          if (extractedUser && !extractedUser._id) {
            console.warn("⚠️ [API] Biometric login user object missing _id:", {
              userKeys: Object.keys(extractedUser),
              hasUser: !!extractedUser,
              resultKeys: Object.keys(result),
              userType: typeof extractedUser,
              userValue: extractedUser,
            });
          }

          // Spread result first, then override with extracted values to ensure correct structure
          return {
            ...result, // Preserve any other fields first (firebaseCustomToken, biometricRequired, etc.)
            success: result.success !== undefined ? result.success : true, // Preserve success if present, default to true
            token: extractedToken,
            user: extractedUser, // Override with extracted/validated user
          };
        }
        // If not successful, return as-is (will have error field)
        return result;
      }

      // For setup/verify endpoints, preserve structure as-is
      // Backend returns: { success: true, ... }
      return result;
    }

    return result;
  } catch (error) {
    apiError("❌ [API] apiRequest error:", {
      endpoint,
      error: error.message,
      type: error.name,
    });

    // Handle AbortError (timeout)
    if (error.name === "AbortError") {
      return {
        success: false,
        error:
          "Request timeout. Please check your internet connection and try again.",
        status: 0,
        timeout: true,
      };
    }

    if (error instanceof ApiError) {
      return {
        success: false,
        error: error.message,
        status: error.status,
        body: error.body,
      };
    } else {
      // Handle network errors
      return {
        success: false,
        error: error.message || "A network error occurred. Please try again.",
        status: 0,
      };
    }
  }
};

// --- Authentication Endpoints ---
export const sendOtp = (mobile) =>
  apiRequest("/api/auth/send-otp", "POST", { mobile });
export const verifyOtp = (mobile, otp) =>
  apiRequest("/api/auth/verify-otp", "POST", { mobile, otp });
export const checkMobileAvailability = (mobile) =>
  apiRequest("/api/auth/check-availability", "POST", { mobile });
export const signup = (userData) =>
  apiRequest("/api/auth/signup", "POST", userData);
export const login = (emailOrMobile, password, turnstileToken = null) => {
  const body = { emailOrMobile, password };
  if (turnstileToken) {
    body.turnstileToken = turnstileToken;
  }
  return apiRequest("/api/auth/login", "POST", body);
};

// --- Google Play Integrity API (backend verification / status) ---
/** Generate challenge nonce (optional). POST /api/integrity/challenge */
export const getIntegrityChallengeFromBackend = (token = null) =>
  apiRequest("/api/integrity/challenge", "POST", {}, token);
/** Verify integrity token on backend. POST /api/integrity/verify */
export const verifyIntegrityToken = (integrityToken, token = null) =>
  apiRequest("/api/integrity/verify", "POST", { integrityToken }, token);
/** Get current integrity verification status. GET /api/integrity/status */
export const getIntegrityStatus = (token = null) =>
  apiRequest("/api/integrity/status", "GET", null, token);

// --- Onboarding Endpoints ---
export const getOnboardingOptions = (screenName) =>
  apiRequest(`/api/onboarding/options/${screenName}`);
export const updateOnboardingData = (field, value, mobile) => {
  const fieldMapping = {
    ageRange: { endpoint: "/api/onboarding/age-range", key: "ageRange" },
    gender: { endpoint: "/api/onboarding/gender", key: "gender" },
    improvementArea: {
      endpoint: "/api/onboarding/improvement-area",
      key: "area",
    },
    dailyEarningGoal: {
      endpoint: "/api/onboarding/daily-earning-goal",
      key: "goal",
    },
  };
  const mapping = fieldMapping[field];
  if (!mapping) {
    return Promise.resolve();
  }
  const body = { mobile, [mapping.key]: value };
  return apiRequest(mapping.endpoint, "PUT", body);
};

// --- Disclosure Endpoints ---
export const acceptDisclosure = (token) =>
  apiRequest("/api/disclosure/accept", "POST", null, token);

// --- Location Endpoints ---
export const updateLocation = (locationData, token) =>
  apiRequest("/api/location/report", "POST", locationData, token);
export const getLocationHistory = (token) =>
  apiRequest("/api/location/history", "GET", null, token);

// --- Biometric/Face Verification Endpoints ---
// POST /api/biometric/setup - Register biometric (requires mobile, type, verificationData, deviceId)
export const registerFace = (faceData, token) =>
  apiRequest("/api/biometric/setup", "POST", faceData, token);

// POST /api/biometric/verify - Verify biometric (requires token, verificationData, deviceId, scanType)
export const verifyFace = (verificationData, token) =>
  apiRequest("/api/biometric/verify", "POST", verificationData, token);

// POST /api/biometric/reset - Reset biometric (requires mobile)
export const resetBiometric = (mobile) =>
  apiRequest("/api/biometric/reset", "POST", { mobile });
export const submitOnboarding = (payload, token) =>
  apiRequest("/api/onboarding/submit", "POST", payload, token);

// NOTE: toggleBiometric endpoint doesn't exist in backend - removed to prevent errors
// If needed, use registerFace or verifyFace instead
export const checkBiometricStatus = async (identifier) => {
  // Handle both mobile and email
  // Mobile numbers can be in various formats: +919999988888, 919999988888, etc.
  // Email contains @ symbol
  try {
    apiLog("🔍 [API] checkBiometricStatus:", identifier);

    let endpoint;
    if (identifier && identifier.includes("@")) {
      endpoint = `/api/biometric/status?email=${encodeURIComponent(identifier)}`;
    } else {
      // Treat as mobile number
      endpoint = `/api/biometric/status?mobile=${encodeURIComponent(identifier)}`;
    }

    const result = await apiRequest(endpoint, "GET");

    // Only log full response in debug mode
    if (DEBUG_API) {
      apiLog(
        "🔍 [DEBUG] API Response received:",
        JSON.stringify(result, null, 2),
      );
    }

    return result;
  } catch (error) {
    apiError("❌ [API] checkBiometricStatus error:", error);

    // Return error object instead of throwing
    return {
      error: error.message || "Failed to check biometric status",
      status: error.status || 0,
      success: false,
    };
  }
};
export const checkBiometricStatusByDevice = (deviceId) =>
  apiRequest(
    `/api/biometric/status?deviceId=${encodeURIComponent(deviceId)}`,
    "GET",
  );
export const biometricLogin = (loginData) =>
  apiRequest("/api/biometric/biometric-login", "POST", loginData);

// --- Achievements Endpoints ---
export const getUserAchievements = (
  token,
  category = "games",
  status = "completed",
) =>
  apiRequest(
    `/api/achievements/user?category=${category}&status=${status}`,
    "GET",
    null,
    token,
  );

// --- Profile Endpoints ---
export const getProfile = (token) =>
  apiRequest("/api/profile", "GET", null, token);
export const getProfileStats = (token) =>
  apiRequest("/api/profile/stats", "GET", null, token);
export const updateProfile = (profileData, token) =>
  apiRequest("/api/profile", "PUT", profileData, token);
// --- Notification Endpoints ---
export const getUserNotifications = (token) =>
  apiRequest("/api/profile/notifications", "GET", null, token);
export const dismissNotification = (notificationId, token) =>
  apiRequest(
    `/api/profile/notifications/${notificationId}/dismiss`,
    "POST",
    null,
    token,
  );
export const uploadAvatar = async (avatarFile, token) => {
  const formData = new FormData();
  formData.append("avatar", avatarFile);
  const headers = { "x-auth-token": token };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(`${BASE_URL}/api/profile/avatar`, {
      method: "POST",
      headers,
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return handleResponse(response);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error(
        "Upload timed out. Please check your connection and try again.",
      );
    }
    throw new Error(
      error.message || "A network error occurred. Please try again.",
    );
  }
};

// --- VIP Endpoints ---
export const getVipStatus = (token) =>
  apiRequest("/api/vip/status", "GET", null, token);
export const getHomeDashboard = (token) =>
  apiRequest("/api/dashboard", "GET", null, token);

// --- Welcome Bonus Timer Endpoint ---
export const getWelcomeBonusTimer = (token) =>
  apiRequest("/api/user/game-offers/welcome-bonus-timer", "GET", null, token);

/**
 * Fetch welcome bonus tasks for user's downloaded games
 * @param {string} token - User authentication token
 * @returns {Promise} Response with games array containing bonus tasks
 */
export const getWelcomeBonusTasks = (token) =>
  apiRequest("/api/welcome-bonus-tasks", "GET", null, token);

export const forgotPassword = (email) =>
  apiRequest("/api/auth/forgot-password", "POST", { identifier: email });
export const resetPassword = (token, newPassword) =>
  apiRequest("/api/auth/reset-password", "POST", { token, newPassword });
// --- NEW: Cash Coach Endpoints (Following the exact same pattern) ---
// ===================================================================
export const getFinancialGoals = (token) =>
  apiRequest("/api/cash-coach/financial-goals", "GET", null, token);

export const updateFinancialGoals = (goalsData, token) =>
  apiRequest("/api/cash-coach/financial-goals", "PUT", goalsData, token);

// --- VIP MEMBERSHIP & PAYMENT ENDPOINTS ---
// These functions align with your Postman collection and are called by the Redux slice.

/**
 * Fetches all available VIP tiers and their pricing for a given region.
 * This is a public endpoint and does not require a token.
 * Note: Your original file was calling `/api/vip/tiers` but your Postman collection has `/vip/tiers`. The BASE_URL includes `/api`.
 * So the endpoint should be `/vip/tiers`.
 * @param {string} region - The region code (e.g., "US").
 */
export const getVipTiers = (region = "US") =>
  apiRequest(`/api/vip/tiers?region=${region}`);

/**
 * Verify and confirm Google Play IAP purchase
 * @param {object} data - { purchaseToken, productId, orderId, packageName, metadata }
 * @param {string} token - The user's authentication token
 */
export const verifyGooglePlayPurchase = (data, token) => {
  const requestBody = {
    ...data,
    purchaseType: "subscription",
    packageName: "com.jackson.app",
  };

  console.log("📤 [verifyGooglePlayPurchase] Request body:", {
    productId: requestBody.productId,
    orderId: requestBody.orderId,
    purchaseType: requestBody.purchaseType,
    packageName: requestBody.packageName,
    metadata: requestBody.metadata,
    purchaseToken: requestBody.purchaseToken
      ? `${requestBody.purchaseToken.substring(0, 20)}...`
      : "missing",
  });

  return apiRequest("/api/google-play-iap/verify", "POST", requestBody, token);
};

/**
 * Get active Google Play subscription
 * @param {string} token - The user's authentication token
 */
export const getActiveGooglePlaySubscription = (token) =>
  apiRequest("/api/google-play-iap/subscription/active", "GET", null, token);

/**
 * Get Google Play purchase history
 * @param {number} limit - Number of records to return
 * @param {string} token - The user's authentication token
 */
export const getGooglePlayPurchaseHistory = (limit = 20, token) =>
  apiRequest(`/api/google-play-iap/history?limit=${limit}`, "GET", null, token);

/**
 * Initiates the upgrade process by creating a 'pending' subscription record.
 * @param {object} data - The upgrade data: { tierId, plan, region }.
 * @param {string} token - The user's authentication token.
 */
export const initiateUpgrade = (data, token) =>
  apiRequest("/api/vip/upgrade", "POST", data, token);

/**
 * Initiates the payment with the payment provider (e.g., Stripe).
 * @param {object} data - The payment data: { subscriptionId, paymentMethod }.
 * @param {string} token - The user's authentication token.
 */

// --- OTHER API FUNCTIONS (UNCHANGED) ---
// ... (Your other functions like getVipStatus, login, signup, etc. would go here)
export const startPayment = (data, token) =>
  apiRequest("/api/payment/initiate", "POST", data, token);

/**
 * Confirms that the payment was successful, activating the subscription.
 * NOTE: In a modern payment flow with webhooks, this endpoint might not be called
 * from the client. The payment provider (e.g., Stripe) would notify the backend
 * directly via a webhook, which is more secure.
 * @param {object} data - The confirmation data: { paymentIntentId, subscriptionId }.
 * @param {string} token - The user's authentication token.
 */
export const confirmPayment = (data, token) => {
  return apiRequest("/api/payment/confirm", "POST", data, token);
};

// --- WALLET TRANSACTIONS ENDPOINTS ---
export const getWalletTransactions = (token, limit = 5) =>
  apiRequest(`/api/wallet/transactions?limit=${limit}`, "GET", null, token);

export const getFullWalletTransactions = (
  token,
  page = 1,
  limit = 20,
  type = "all",
) =>
  apiRequest(
    `/api/wallet/transactions?page=${page}&limit=${limit}&type=${type}`,
    "GET",
    null,
    token,
  );

export const getWalletScreen = (token) =>
  apiRequest("/api/wallet-screen", "GET", null, token);

// --- WITHDRAWAL/PAYOUT ENDPOINTS ---
export const getWithdrawalMethods = (token, queryParams = {}) => {
  const params = new URLSearchParams({
    currency_code: "USD",
    country: "US",
    ...queryParams,
  }).toString();
  return apiRequest(`/api/methods?${params}`, "GET", null, token);
};

export const getFundingSources = (token, queryParams = {}) => {
  const params = new URLSearchParams({
    currency_code: "USD",
    country: "US",
    ...queryParams,
  }).toString();
  return apiRequest(
    `/api/payout/funding-sources?${params}`,
    "GET",
    null,
    token,
  );
};

export const createWithdrawal = (withdrawalData, token) =>
  apiRequest("/api/payout/create", "POST", withdrawalData, token);

export const getWithdrawalHistory = (token, page = 1, limit = 20) =>
  apiRequest(
    `/api/payout/history?page=${page}&limit=${limit}`,
    "GET",
    null,
    token,
  );

export const getWithdrawalStatus = (orderId, token) =>
  apiRequest(`/api/payout/${orderId}/status`, "GET", null, token);

// --- TREMENDOUS API ENDPOINTS ---
export const getTremendousMethods = (token, queryParams = {}) => {
  const params = new URLSearchParams({
    currency: "USD",
    country: "US",
    ...queryParams,
  }).toString();
  return apiRequest(`/api/payouts/methods?${params}`, "GET", null, token);
};

export const getTremendousFundingSources = (token, queryParams = {}) => {
  const params = new URLSearchParams({
    currency: "USD",
    country: "US",
    ...queryParams,
  }).toString();
  return apiRequest(
    `/api/payouts/funding-sources?${params}`,
    "GET",
    null,
    token,
  );
};

export const createTremendousPayout = (payoutData, token) =>
  apiRequest("/api/payouts/create", "POST", payoutData, token);

export const getTremendousOrderStatus = (orderId, token) =>
  apiRequest(`/api/payouts/${orderId}/status`, "GET", null, token);

// --- BESITOS GAME API ENDPOINTS ---
// Base URL for Besitos API - Use production URL (same as main API)
const BESITOS_BASE_URL = BASE_URL;

// Custom API request function for Besitos endpoints
const besitosApiRequest = async (endpoint, method = "GET", body = null) => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "JacksonRewardsApp/1.0.0 (Android)",
    "X-Platform": "android",
    "X-App-Version": "1.0.0",
    // Add VPN-friendly headers
    "X-Forwarded-For": "auto-detect",
    "X-Real-IP": "auto-detect",
  };

  // Attach bearer token if available to avoid 401 on protected endpoints
  try {
    const authToken = localStorage.getItem("authToken");
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
  } catch (_) {
    // ignore storage errors
  }

  const config = {
    method,
    headers,
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${BESITOS_BASE_URL}${endpoint}`, config);
    return handleResponse(response);
  } catch (error) {
    // Handle specific error types for Android and VPN
    if (error.name === "AbortError") {
      // Check if user is using VPN and provide specific guidance
      const isVpnDetected =
        navigator.connection?.type === "cellular" &&
        navigator.connection?.effectiveType === "4g" &&
        window.location.protocol === "https:";

      if (isVpnDetected) {
        throw new Error(
          "Request timeout detected. VPN connection may be causing delays. Please try switching VPN servers or temporarily disabling VPN.",
        );
      } else {
        throw new Error(
          "Request timeout. Please check your internet connection.",
        );
      }
    } else if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error(
        "Network error. Please check your internet connection and VPN settings.",
      );
    } else if (error instanceof ApiError) {
      throw error;
    } else {
      throw new Error(
        error.message || "A network error occurred. Please try again.",
      );
    }
  }
};

/**
 * Fetch user data from Besitos API (User Data API)
 * This returns available, in_progress, and completed games for a specific user
 * @param {string} userId - User ID
 * @param {string} token - User authentication token
 * @returns {Promise} User data object with games categorized by status
 */
export const getUserData = (userId, token) => {
  // Use the production API endpoint with live base URL
  let endpoint = `/api/besitos/user-data/${userId}`;
  const params = new URLSearchParams();

  if (token) {
    params.append("token", token);
  }

  if (params.toString()) {
    endpoint += `?${params.toString()}`;
  }

  // Use main apiRequest function to use production BASE_URL
  return apiRequest(endpoint, "GET", null, token);
};

/**
 * Fetch conversions from Besitos API
 * @returns {Promise} Array of conversions
 */
export const getConversions = () => besitosApiRequest("/conversions");

/**
 * Fetch surveys from Besitos API
 * @param {string} userId - User ID
 * @param {string} device - Device type (default: "mobile")
 * @param {string} userIp - User IP address
 * @returns {Promise} Array of surveys
 */
export const getSurveys = (userId, device = "mobile", userIp) =>
  besitosApiRequest(`/surveys/${userId}?device=${device}&user_ip=${userIp}`);

/**
 * Fetch user profiling data from Besitos API
 * @param {string} userId - User ID
 * @returns {Promise} User profiling data
 */
export const getUserProfiling = (userId) =>
  besitosApiRequest(`/user-profiling/${userId}`);

/**
 * Fetch messenger data from Besitos API
 * @param {string} userId - User ID
 * @returns {Promise} Messenger data
 */
export const getMessenger = (userId) =>
  besitosApiRequest(`/messenger/${userId}`);

/**
 * Fetch offers/games from Besitos API
 * @param {Object} params - Parameters object
 * @param {number} params.per_page - Number of records per page (default: 5)
 * @param {string} params.device_platform - Device platform (android/ios)
 * @param {number} params.page - Page number (default: 1)
 * @returns {Promise} Array of offers/games
 */
export const getOffers = ({
  per_page = 5,
  device_platform = "android",
  page = 1,
} = {}) => {
  const params = new URLSearchParams();

  if (per_page) params.append("per_page", per_page);
  if (device_platform) params.append("device_platform", device_platform);
  if (page) params.append("page", page);

  const endpoint = `/offers?${params.toString()}`;

  return besitosApiRequest(endpoint);
};

// --- NEW GAME DISCOVERY API ENDPOINTS ---
/**
 * Get games by UI section (replaces old offers API)
 * @param {string} uiSection - UI section name (e.g., "Swipe", "Most Played", "Cash Coach Recommendation")
 * @param {string} ageGroup - Age group (e.g., "18-24", "25-34") - will be overridden by user.age or user.ageRange if user is provided
 * @param {string} gender - Gender (e.g., "male", "female") - will be overridden by user.gender if user is provided
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Number of games per page (default: 20)
 * @param {string} token - User authentication token
 * @param {Object} user - User object with age/ageRange and gender properties - if provided, will be used instead of ageGroup and gender parameters
 * @returns {Promise} Array of games for the specified UI section
 */

/**
 * Sync my-games data with the backend (non-blocking). Call without awaiting to avoid blocking UI.
 * @param {string} token - User authentication token
 * @returns {Promise} Sync response
 */
export const syncMyGames = (token) =>
  apiRequest("/api/my-games/sync", "POST", null, token);

export const getGamesBySection = async ({
  uiSection = "Swipe",
  ageGroup = "18-24",
  gender = "male",
  page = 1,
  limit = 20,
  token = null,
  user = null,
} = {}) => {
  // Extract age group and gender from user object if provided
  let finalAgeGroup = ageGroup;
  let finalGender = gender;

  // Validate user object - don't use error objects or invalid responses
  const isErrorObject =
    user && typeof user === "object" && (user.success === false || user.error);
  const isValidUserObject =
    user &&
    typeof user === "object" &&
    !Array.isArray(user) &&
    !isErrorObject && // Don't use error responses
    (user.age !== undefined ||
      user.ageRange !== undefined ||
      user.gender !== undefined ||
      user._id !== undefined); // Must have at least one user property

  // If user object is invalid, try to get from localStorage as fallback
  let userToUse = isValidUserObject ? user : null;
  if (!userToUse) {
    userToUse = getUserFromLocalStorage();
  } else {
    // Even if Redux user is valid, check if it has age/gender
    // If not, try to get from localStorage and merge
    const hasAgeOrGender =
      userToUse.age || userToUse.ageRange || userToUse.gender;
    if (!hasAgeOrGender) {
      const localStorageUser = getUserFromLocalStorage();
      if (
        localStorageUser &&
        (localStorageUser.age ||
          localStorageUser.ageRange ||
          localStorageUser.gender)
      ) {
        // Merge localStorage data with Redux user (localStorage has priority for age/gender)
        userToUse = {
          ...userToUse,
          age: localStorageUser.age || userToUse.age,
          ageRange: localStorageUser.ageRange || userToUse.ageRange,
          gender: localStorageUser.gender || userToUse.gender,
        };
      }
    }
  }

  if (userToUse) {
    // Extract age group from user object
    // Check both top-level and nested properties
    // Priority: ageRange > age (if age is string like "25-34") > age (if age is number, convert to age group)
    const userAge =
      userToUse.age || userToUse.profile?.age || userToUse.details?.age;
    const userAgeRange =
      userToUse.ageRange ||
      userToUse.profile?.ageRange ||
      userToUse.details?.ageRange;

    if (userAgeRange && typeof userAgeRange === "string") {
      finalAgeGroup = userAgeRange;
    } else if (userAge !== undefined && userAge !== null) {
      // Check if age is already in age group format (string like "25-34")
      if (typeof userAge === "string" && userAge.includes("-")) {
        finalAgeGroup = userAge;
      } else if (typeof userAge === "number") {
        // Convert numeric age to age group
        const age = userAge;
        if (age < 18) finalAgeGroup = "18-24";
        else if (age >= 18 && age <= 24) finalAgeGroup = "18-24";
        else if (age >= 25 && age <= 34) finalAgeGroup = "25-34";
        else if (age >= 35 && age <= 44) finalAgeGroup = "35-44";
        else if (age >= 45 && age <= 54) finalAgeGroup = "45-54";
        else if (age >= 55 && age <= 64) finalAgeGroup = "55-64";
        else if (age >= 65) finalAgeGroup = "65+";
      }
    } else {
      // Try localStorage as last resort before using defaults
      const localStorageUser = getUserFromLocalStorage();
      if (localStorageUser) {
        const localAge = localStorageUser.age || localStorageUser.ageRange;
        if (localAge) {
          if (typeof localAge === "string" && localAge.includes("-")) {
            finalAgeGroup = localAge;
          } else if (typeof localAge === "number") {
            const age = localAge;
            if (age < 18) finalAgeGroup = "18-24";
            else if (age >= 18 && age <= 24) finalAgeGroup = "18-24";
            else if (age >= 25 && age <= 34) finalAgeGroup = "25-34";
            else if (age >= 35 && age <= 44) finalAgeGroup = "35-44";
            else if (age >= 45 && age <= 54) finalAgeGroup = "45-54";
            else if (age >= 55 && age <= 64) finalAgeGroup = "55-64";
            else if (age >= 65) finalAgeGroup = "65+";
          }
        }
      }
    }

    // Extract gender from user object - check nested properties too
    const userGender =
      userToUse.gender ||
      userToUse.profile?.gender ||
      userToUse.details?.gender;

    if (userGender && typeof userGender === "string") {
      finalGender = userGender.toLowerCase().trim();
    } else {
      // Try localStorage as last resort before using defaults
      const localStorageUser = getUserFromLocalStorage();
      if (localStorageUser && localStorageUser.gender) {
        finalGender = localStorageUser.gender.toLowerCase().trim();
      }
    }
  }

  const params = new URLSearchParams();

  if (uiSection) params.append("uiSection", uiSection);
  if (finalAgeGroup) params.append("ageGroup", finalAgeGroup);
  if (finalGender) params.append("gender", finalGender);
  if (page) params.append("page", page);
  if (limit) params.append("limit", limit);
  params.append("platform", "ios");

  const endpoint = `/api/game/discover?${params.toString()}`;

  const response = await apiRequest(endpoint, "GET", null, token);

  // Add xpRewardConfig to the response
  const enhancedResponse = {
    ...response,
    xpRewardConfig: {
      baseXP: 1,
      multiplier: 1.8,
    },
  };

  // If response has data array, ensure each game also has access to xpRewardConfig
  if (enhancedResponse.data && Array.isArray(enhancedResponse.data)) {
    // Optionally add xpRewardConfig to each game object for convenience
    // enhancedResponse.data = enhancedResponse.data.map(game => ({
    //   ...game,
    //   xpRewardConfig: enhancedResponse.xpRewardConfig
    // }));
  }

  return enhancedResponse;
};

/**
 * Get game details by ID
 * @param {string} gameId - Game ID
 * @param {string} token - User authentication token
 * @returns {Promise} Game details with goals, rewards, and requirements
 */
export const getGameById = (gameId, token = null) => {
  const endpoint = `/api/game/get-game-by-id/${gameId}`;
  return apiRequest(endpoint, "GET", null, token);
};

// --- DAILY CHALLENGE API ENDPOINTS ---
/**
 * Get calendar view of daily challenges for the month
 * @param {number} year - Year (default: current year)
 * @param {number} month - Month 0-11 (default: current month)
 * @param {string} token - User authentication token
 * @returns {Promise} Calendar data with challenge states
 */
export const getDailyChallengeCalendar = (year, month, token) => {
  const params = new URLSearchParams();
  if (year) params.append("year", year);
  if (month !== undefined) params.append("month", month);

  const endpoint = `/api/daily-challenge/calendar?${params.toString()}`;
  return apiRequest(endpoint, "GET", null, token);
};

/**
 * Get today's challenge with countdown timer and details
 * @param {string} token - User authentication token
 * @returns {Promise} Today's challenge data
 */
export const getTodaysChallenge = (token) => {
  return apiRequest("/api/daily-challenge/today", "GET", null, token);
};

/**
 * Select a game for today's challenge
 * @param {string} gameId - Game ID to select
 * @param {string} token - User authentication token
 * @returns {Promise} Selection confirmation
 */
export const selectChallengeGame = (gameId, token) => {
  return apiRequest(
    "/api/daily-challenge/select-game",
    "POST",
    { gameId },
    token,
  );
};

/**
 * Start today's challenge
 * @param {string} token - User authentication token
 * @returns {Promise} Challenge start confirmation with game deep link
 */
export const startChallenge = (token) => {
  return apiRequest("/api/daily-challenge/start", "POST", null, token);
};

/**
 * Spin for daily challenge (bypasses eligibility, creates spin log)
 * @param {string} token - User authentication token
 * @returns {Promise} Spin result with spin log
 */
export const spinForChallenge = (token) => {
  return apiRequest("/api/daily-challenge/spin", "POST", null, token);
};

/**
 * Complete today's challenge and claim rewards
 * @param {string} conversionId - Optional Besitos conversion ID
 * @param {string} token - User authentication token
 * @returns {Promise} Completion confirmation with rewards
 */
export const completeChallenge = (conversionId, token) => {
  return apiRequest(
    "/api/daily-challenge/complete",
    "POST",
    { conversionId },
    token,
  );
};

/**
 * Get bonus days for the authenticated user
 * @param {string} token - User authentication token
 * @returns {Promise} Bonus days data with rewards and status
 */
export const getBonusDays = (token) => {
  return apiRequest("/api/streak/bonus-days", "GET", null, token);
};

/**
 * Get user's challenge completion history
 * @param {number} limit - Number of records to return (default: 30)
 * @param {string} token - User authentication token
 * @returns {Promise} Challenge history data
 */
export const getChallengeHistory = (limit = 30, token) =>
  apiRequest(`/api/daily-challenge/history?limit=${limit}`, "GET", null, token);

/**
 * Get user's challenge statistics and completion rates
 * @param {string} token - User authentication token
 * @returns {Promise} User challenge statistics
 */
export const getChallengeStats = (token) =>
  apiRequest("/api/daily-challenge/stats", "GET", null, token);

// --- DAILY REWARDS API ENDPOINTS ---
/**
 * Get daily rewards week data (V3 - User-based weeks)
 * @param {string} date - Optional date string (YYYY-MM-DD format)
 * @param {string} token - User authentication token
 * @returns {Promise} Week data with daily rewards
 */
export const getDailyRewardsWeek = (date = null, token = null) => {
  const endpoint = date
    ? `/api/v3/daily-rewards/week?date=${date}`
    : `/api/v3/daily-rewards/week`;

  return apiRequest(endpoint, "GET", null, token);
};

/**
 * Claim daily reward (V3 - User-based weeks, claims today automatically)
 * @param {number} dayNumber - Day number (not used in V3, kept for compatibility)
 * @param {string} token - User authentication token
 * @returns {Promise} Claim confirmation with rewards
 */
export const claimDailyReward = (dayNumber, token = null) => {
  const endpoint = `/api/v3/daily-rewards/claim`;
  return apiRequest(endpoint, "POST", {}, token); // V3 doesn't need dayNumber
};

/**
 * Recover missed daily reward day
 * @param {string} method - Recovery method
 * @param {string} token - User authentication token
 * @returns {Promise} Recovery confirmation
 */
export const recoverMissedDailyReward = (method, token = null) => {
  const endpoint = `/api/v3/daily-rewards/recover`;
  return apiRequest(endpoint, "POST", { method }, token);
};

/**
 * Get user's current streak status and milestone progress
 * @param {string} token - User authentication token
 * @returns {Promise} Streak status data
 */
export const getStreakStatus = (token) =>
  apiRequest("/api/streak/status", "GET", null, token);

/**
 * Get streak history for the last 30 days
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Number of records per page (default: 30)
 * @param {string} token - User authentication token
 * @returns {Promise} Streak history data
 */
export const getStreakHistory = (page = 1, limit = 30, token) =>
  apiRequest(
    `/api/streak/history?page=${page}&limit=${limit}`,
    "GET",
    null,
    token,
  );

/**
 * Get top users by streak count
 * @param {number} limit - Number of top users to return (default: 10)
 * @param {string} token - User authentication token
 * @returns {Promise} Streak leaderboard data
 */
export const getStreakLeaderboard = (limit = 10, token) =>
  apiRequest(`/api/streak/leaderboard?limit=${limit}`, "GET", null, token);

/**
 * Claim milestone reward for 7, 14, 21, or 30 day streak
 * @param {number} milestoneDay - Milestone day (7, 14, 21, or 30)
 * @param {Object} rewardAmount - Reward amounts: { coins: number, xp: number }
 * @param {string} token - User authentication token
 * @returns {Promise} Claim confirmation with rewards
 */
export const claimStreakMilestoneReward = (
  milestoneDay,
  rewardAmount,
  token,
) => {
  return apiRequest(
    "/api/streak/claim-reward",
    "POST",
    {
      milestoneDay,
      rewardAmount,
    },
    token,
  );
};

// ============================================================================
// TICKET SYSTEM APIs
// ============================================================================

/**
 * Get user's games list for ticket form dropdown
 * @param {string} token - User authentication token
 * @returns {Promise} List of games user has played
 */
export const getUserGamesList = (token) =>
  apiRequest("/api/tickets/games/list", "GET", null, token);

/**
 * Raise a new support ticket
 * @param {Object} ticketData - Ticket data including gameId, description, category, images, deviceInfo
 * @param {string} token - User authentication token
 * @returns {Promise} Created ticket response
 */
export const raiseTicket = (ticketData, token) => {
  // Send JSON payload with new structure
  const payload = {
    subject: ticketData.subject || "Support Request",
    description: ticketData.description || "",
    priority: ticketData.priority || "Medium",
    category: ticketData.category || "Other",
    game: "68ece317d8b3c45c06dd3908",
    contact: ticketData.contact || {},
    tags: ticketData.tags || [],
    images: ticketData.images || [],
    metadata: ticketData.metadata || {},
  };

  return apiRequest("/api/tickets", "POST", payload, token, false);
};

/**
 * Get user's tickets with filters and pagination
 * @param {Object} filters - Filter options (status, category, page, limit)
 * @param {string} token - User authentication token
 * @returns {Promise} User's tickets list
 */
export const getUserTickets = (filters = {}, token) => {
  const params = new URLSearchParams();

  // Always add userOnly=true for user tickets
  params.append("userOnly", "true");

  if (filters.status) params.append("status", filters.status);
  if (filters.category) params.append("category", filters.category);
  if (filters.page) params.append("page", filters.page);
  if (filters.limit) params.append("limit", filters.limit);

  const queryString = params.toString();
  const endpoint = `/api/tickets?${queryString}`;

  return apiRequest(endpoint, "GET", null, token);
};

/**
 * Get detailed ticket information
 * @param {string} ticketId - Ticket ID
 * @param {string} token - User authentication token
 * @returns {Promise} Detailed ticket information
 */
export const getTicketDetails = (ticketId, token) =>
  apiRequest(`/api/tickets/${ticketId}`, "GET", null, token);

/**
 * Get user's ticket statistics
 * @param {string} token - User authentication token
 * @returns {Promise} Ticket statistics
 */
export const getTicketStats = (token) =>
  apiRequest("/api/tickets/stats", "GET", null, token);

/**
 * Delete/cancel a ticket
 * @param {string} ticketId - Ticket ID
 * @param {string} token - User authentication token
 * @returns {Promise} Deletion response
 */
export const deleteTicket = (ticketId, token) =>
  apiRequest(`/api/tickets/${ticketId}`, "DELETE", null, token);

// ============================================================================
// GAME EARNING APIs
// ============================================================================

/**
 * Transfer earned coins and XP from game session to user wallet
 * @param {Object} earningData - Earning data: { gameId, coins, xp, reason }
 * @param {string} token - User authentication token
 * @returns {Promise} Transfer confirmation with updated wallet balance
 */
export const transferGameEarnings = async (earningData, token) => {
  // Send payload with batch fields for new backend integration
  const payload = {
    gameId: earningData.gameId,
    coins: earningData.coins,
    xp: earningData.xp,
    reason: earningData.reason,
    // New batch fields for backend integration
    batchNumber: earningData.batchNumber,
    batchesClaimed: earningData.batchesClaimed,
    gameTitle: earningData.gameTitle,
  };

  return apiRequest("/api/game/earn", "POST", payload, token);
};

/**
 * Get batch claim status for a user and game
 * @param {string} gameId - Game identifier
 * @param {string} token - Authentication token
 * @returns {Promise<Object>} Batch status with claimed batches array
 */
export const getBatchStatus = (gameId, token) => {
  return apiRequest(
    `/api/game/batch-status?gameId=${encodeURIComponent(gameId)}`,
    "GET",
    null,
    token,
  );
};

// ============================================================================
// DAILY ACTIVITY STATS API
// ============================================================================

/**
 * Get user's daily activity statistics for streak tracking
 * @param {string} token - User authentication token
 * @returns {Promise} Daily activity stats including currentStreak, totalActiveDays, longestStreak, lastActiveDate, streakHistory, isActiveToday
 */
export const getDailyActivityStats = (token) =>
  apiRequest("/api/daily-activity/stats", "GET", null, token);

// ============================================================================
// SPIN WHEEL APIs
// ============================================================================

/**
 * Get spin wheel configuration and rewards
 * @param {string} token - User authentication token
 * @returns {Promise} Spin config with rewards, eligibility, and user tier
 */
export const getSpinConfig = (token) =>
  apiRequest("/api/spin/config", "GET", null, token);

/**
 * Get user's spin status (canSpin, remainingSpins, cooldown, etc.)
 * @param {string} token - User authentication token
 * @returns {Promise} Spin status with remaining spins, cooldown, VIP multiplier
 */
export const getSpinStatus = (token) =>
  apiRequest("/api/spin/status", "GET", null, token);

/**
 * Perform a spin
 * @param {string} token - User authentication token
 * @returns {Promise} Spin result with reward, spinId, status
 */
export const performSpin = (token) =>
  apiRequest("/api/spin/spin", "POST", {}, token);

/**
 * Redeem a spin reward
 * @param {string} spinId - Spin ID from spin result
 * @param {string} token - User authentication token
 * @returns {Promise} Redemption result with reward, new balance, XP earned
 */
export const redeemSpinReward = (spinId, token) =>
  apiRequest("/api/spin/redeem", "POST", { spinId }, token);

// ============================================================================
// BITLABS SURVEY APIs
// ============================================================================

/**
 * Fetch configured Bitlabs surveys for users
 * @param {Object} params - Query parameters
 * @param {string} params.category - Category filter (default: "all")
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.useAdminConfig - Use admin-configured surveys (default: "true")
 * @param {string} token - User authentication token
 * @returns {Promise} Surveys data with pagination
 */
export const getBitlabsSurveys = (params = {}, token) => {
  const queryParams = new URLSearchParams();

  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);

  const endpoint = `/api/non-gaming-survey/user/surveys?${queryParams.toString()}`;
  return apiRequest(endpoint, "GET", null, token);
};

export const getBitlabsUserHistory = (userId, offerId, token) => {
  const endpoint = `/api/bitlabs/user-history/${userId}/`;
  return apiRequest(endpoint, "GET", null, token);
};

export const getBitlabsAIDownloadedGames = (userId, token) => {
  const endpoint = `/api/bitlabs/my-games/${userId}`;
  return apiRequest(endpoint, "GET", null, token);
};

/**
 * Track survey click for analytics (optional but recommended)
 * @param {string} offerId - Survey offer ID
 * @param {string} token - User authentication token
 * @returns {Promise} Tracking response
 */
export const trackSurveyClick = (offerId, token) => {
  const endpoint = `/api/non-game-offers/click`;
  return apiRequest(endpoint, "POST", { offerId, offerType: "survey" }, token);
};

// ============================================================================
// NON-GAME OFFERS APIs (Cashback, Shopping, Magic Receipts)
// ============================================================================

/**
 * Fetch all non-game offers (surveys, cashback, shopping, magic receipts)
 * @param {Object} params - Query parameters
 * @param {string} params.type - Filter by type: "all", "survey", "cashback", "shopping", "magic_receipt"
 * @param {string} params.category - Category filter (default: "all")
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.useAdminConfig - Use admin-configured offers (default: "true")
 * @param {string} token - User authentication token
 * @returns {Promise} Offers data with pagination
 */
export const getAllNonGameOffers = (params = {}, token) => {
  const queryParams = new URLSearchParams();

  if (params.offerType) queryParams.append("offerType", params.offerType);
  if (params.page) queryParams.append("page", params.page);
  if (params.limit) queryParams.append("limit", params.limit);

  const queryString = queryParams.toString();
  const endpoint = `/api/non-gaming-survey/user/non-gaming-offers${queryString ? `?${queryString}` : ""}`;
  return apiRequest(endpoint, "GET", null, token);
};

/**
 * Fetch cashback offers only
 * @param {Object} params - Query parameters
 * @param {string} params.category - Category filter (default: "all")
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.useAdminConfig - Use admin-configured offers (default: "true")
 * @param {string} token - User authentication token
 * @returns {Promise} Cashback offers data
 */
export const getCashbackOffers = (params = {}, token) => {
  return getAllNonGameOffers({ ...params, offerType: "cashback" }, token);
};

/**
 * Fetch shopping offers only
 * @param {Object} params - Query parameters
 * @param {string} params.category - Category filter (default: "all")
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.useAdminConfig - Use admin-configured offers (default: "true")
 * @param {string} token - User authentication token
 * @returns {Promise} Shopping offers data
 */
export const getShoppingOffers = (params = {}, token) => {
  return getAllNonGameOffers({ ...params, offerType: "shopping" }, token);
};

/**
 * Fetch magic receipt offers only
 * @param {Object} params - Query parameters
 * @param {string} params.category - Category filter (default: "all")
 * @param {number} params.page - Page number (default: 1)
 * @param {number} params.limit - Items per page (default: 20)
 * @param {string} params.useAdminConfig - Use admin-configured offers (default: "true")
 * @param {string} token - User authentication token
 * @returns {Promise} Magic receipt offers data
 */
export const getMagicReceipts = (params = {}, token) => {
  return getAllNonGameOffers({ ...params, offerType: "magic_receipt" }, token);
};

// ============================================================================
// XP TIER PROGRESS BAR API
// ============================================================================

/**
 * Get XP tier progress bar data
 * @param {string} token - User authentication token
 * @returns {Promise} XP tier progress data with current tier, tiers list, and progress percentage
 */
export const getXPTierProgressBar = (token) =>
  apiRequest("/api/xp-tier/progress-bar", "GET", null, token);

// ============================================================================
// VERISOUL FRAUD PREVENTION API
// ============================================================================

/**
 * Authenticate a user session for fraud detection
 * @param {Object} sessionData - Session authentication data
 * @param {string} sessionData.accountId - User's unique ID from database
 * @param {string} sessionData.email - User's email address
 * @param {Object} sessionData.metadata - Additional metadata (device info, timestamps, etc.)
 * @param {string} sessionData.group - User group/category (required, e.g., "regular_users", "premium_users")
 * @param {string} sessionData.sessionId - Session ID from Verisoul SDK (optional)
 * @param {string} token - User authentication token
 * @returns {Promise} Session authentication response with risk score and decision
 */
export const authenticateFraudSession = (sessionData, token) =>
  apiRequest(
    "/api/fraud-prevention/session/authenticate",
    "POST",
    sessionData,
    token,
  );

/**
 * Get session status and current risk status
 * @param {string} sessionId - Session ID from previous authentication
 * @param {string} token - User authentication token
 * @returns {Promise} Session status with risk score and decision
 */
export const getFraudSessionStatus = (sessionId, token) =>
  apiRequest(`/api/fraud-prevention/session/${sessionId}`, "GET", null, token);

/**
 * Verify user's phone number for additional security
 * @param {string} phoneNumber - Phone number in E.164 format (e.g., +1234567890)
 * @param {string} token - User authentication token
 * @returns {Promise} Phone verification response with verification ID
 */
export const verifyPhoneNumber = (phoneNumber, token) =>
  apiRequest(
    "/api/fraud-prevention/phone/verify",
    "POST",
    { phoneNumber },
    token,
  );

/**
 * End a session when user logs out
 * @param {string} sessionId - Session ID to end
 * @param {string} token - User authentication token
 * @returns {Promise} Unauthenticate response
 */
export const unauthenticateFraudSession = (sessionId, token) =>
  apiRequest(
    "/api/fraud-prevention/session/unauthenticate",
    "POST",
    { sessionId },
    token,
  );

/**
 * Get user's account security status and risk profile
 * @param {string} accountId - User's account ID
 * @param {string} token - User authentication token
 * @returns {Promise} Account information with risk score and verification status
 */
export const getFraudAccountInfo = (accountId, token) =>
  apiRequest(`/api/fraud-prevention/account/${accountId}`, "GET", null, token);

/**
 * Get all active sessions for a user account
 * @param {string} accountId - User's account ID
 * @param {string} token - User authentication token
 * @returns {Promise} List of active sessions with device and location info
 */
export const getFraudAccountSessions = (accountId, token) =>
  apiRequest(
    `/api/fraud-prevention/account/${accountId}/sessions`,
    "GET",
    null,
    token,
  );

// ============================================================================
// APPLOVIN MAX - AD MEDIATION APIs
// ============================================================================

/**
 * AppLovin MAX Configuration Constants
 */
export const APPLOVIN_CONFIG = {
  AD_UNIT_ID_REWARDED: process.env.NEXT_PUBLIC_APPLOVIN_AD_UNIT_IOS_REWARDED,
  GOOGLE_ADMOB_APP_ID: process.env.NEXT_PUBLIC_ADMOB_APP_ID_IOS,
};

/**
 * Health check endpoint to verify AppLovin MAX integration status
 * @returns {Promise} Health status of AppLovin integration
 */
export const getAppLovinHealth = () =>
  apiRequest("/api/applovin/health", "GET");

/**
 * Get AppLovin MAX SDK configuration for frontend initialization
 * @param {string} token - User authentication token
 * @returns {Promise} SDK configuration with sdkKey and adUnitId
 */
export const getAppLovinConfig = (token) =>
  apiRequest("/api/applovin/config", "GET", null, token);

/**
 * Track when a rewarded ad is loaded
 * @param {Object} adData - Ad load tracking data
 * @param {string} adData.adUnitId - Ad unit identifier (e.g., "rewarded")
 * @param {string} adData.placement - Ad placement (e.g., "rewarded")
 * @param {string} adData.platform - Platform (ios/android/web)
 * @param {string} adData.deviceType - Device type (mobile/tablet/desktop)
 * @param {string} adData.appVersion - App version
 * @param {string} adData.sdkVersion - AppLovin SDK version
 * @param {string} token - User authentication token
 * @returns {Promise} Response with adRecordId for subsequent calls
 */
export const trackAppLovinAdLoad = (adData, token) =>
  apiRequest("/api/applovin/rewarded-ad/load", "POST", adData, token);

/**
 * Track when a rewarded ad is displayed to the user
 * @param {string} adRecordId - Ad record ID from load tracking
 * @param {string} token - User authentication token
 * @returns {Promise} Display tracking confirmation
 */
export const trackAppLovinAdDisplay = (adRecordId, token) =>
  apiRequest(
    "/api/applovin/rewarded-ad/display",
    "POST",
    { adRecordId },
    token,
  );

/**
 * Track rewarded ad completion and credit rewards to user
 * @param {Object} completionData - Ad completion data
 * @param {string} completionData.adRecordId - Ad record ID from load tracking
 * @param {Object} completionData.reward - Reward details { amount: number, currency: string }
 * @param {string} completionData.adNetwork - Ad network that served the ad (e.g., "facebook", "admob")
 * @param {string} completionData.networkName - Human-readable network name
 * @param {Object} completionData.revenue - Revenue details { amount: number, currency: string }
 * @param {Object} completionData.metadata - Additional metadata (platform, country, deviceType, appVersion, sdkVersion)
 * @param {string} token - User authentication token
 * @returns {Promise} Completion confirmation with rewards credited
 */
export const trackAppLovinAdComplete = (completionData, token) =>
  apiRequest(
    "/api/applovin/rewarded-ad/complete",
    "POST",
    completionData,
    token,
  );

/**
 * Track when a rewarded ad fails to load or display
 * @param {Object} failureData - Ad failure data
 * @param {string} failureData.adRecordId - Ad record ID (optional, may not exist if load failed)
 * @param {string} failureData.adUnitId - Ad unit identifier
 * @param {string} failureData.error - Error message
 * @param {string} failureData.errorCode - Error code (e.g., "NO_FILL", "NETWORK_ERROR")
 * @param {string} token - User authentication token
 * @returns {Promise} Failure tracking confirmation
 */
export const trackAppLovinAdFailure = (failureData, token) =>
  apiRequest("/api/applovin/rewarded-ad/failed", "POST", failureData, token);

/**
 * Get user's rewarded ad history with pagination
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20)
 * @param {string} token - User authentication token
 * @returns {Promise} User's ad history with pagination
 */
export const getAppLovinAdHistory = (page = 1, limit = 20, token) =>
  apiRequest(
    `/api/applovin/rewarded-ad/history?page=${page}&limit=${limit}`,
    "GET",
    null,
    token,
  );

/**
 * Get user's rewarded ad statistics
 * @param {string} token - User authentication token
 * @returns {Promise} User statistics including total completed, coins earned, XP earned, breakdown by status
 */
export const getAppLovinAdStats = (token) =>
  apiRequest("/api/applovin/rewarded-ad/stats", "GET", null, token);

export const getConversionSettings = () => {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  return apiRequest("/api/conversion/conversions/settings", "GET", null, token);
};

export const trackUndoUsage = (data, token) =>
  apiRequest("/api/game/swipe/undo-usage", "POST", data, token);

export const getUndoUsage = (token) =>
  apiRequest("/api/game/swipe/undo-usage", "GET", null, token);

// ============================================================================
// WALKATHON API
// ============================================================================

/**
 * Get walkathon status and user eligibility
 * @param {string} token - User authentication token
 * @returns {Promise} Walkathon status and eligibility data
 */
export const getWalkathonStatus = (token) =>
  apiRequest("/api/walkathon/status", "GET", null, token);

/**
 * Join the current active walkathon
 * @param {string} token - User authentication token
 * @returns {Promise} Join response with progress data
 */
export const joinWalkathon = (token) =>
  apiRequest("/api/walkathon/join", "POST", {}, token);

/**
 * Sync step data from HealthKit
 * @param {object} stepData - Step data { steps, date, source, deviceInfo, healthKitData }
 * @param {string} token - User authentication token
 * @returns {Promise} Sync response with progress and milestones
 */
export const syncWalkathonSteps = (stepData, token) =>
  apiRequest("/api/walkathon/sync-steps", "POST", stepData, token);

/**
 * Get user's walkathon progress
 * @param {string} token - User authentication token
 * @returns {Promise} User progress data
 */
export const getWalkathonProgress = (token) =>
  apiRequest("/api/walkathon/progress", "GET", null, token);

/**
 * Claim reward for a milestone
 * @param {number} milestone - Step milestone (e.g., 1000, 2500, etc.)
 * @param {string} token - User authentication token
 * @returns {Promise} Claim response with rewards
 */
export const claimWalkathonReward = (milestone, token) =>
  apiRequest("/api/walkathon/claim-reward", "POST", { milestone }, token);

/**
 * Get walkathon leaderboard
 * @param {string} token - User authentication token
 * @returns {Promise} Leaderboard data
 */
export const getWalkathonLeaderboard = (token) =>
  apiRequest("/api/walkathon/leaderboard", "GET", null, token);

/**
 * Get user's rank in walkathon
 * @param {string} token - User authentication token
 * @returns {Promise} User rank data
 */
export const getWalkathonRank = (token) =>
  apiRequest("/api/walkathon/rank", "GET", null, token);

/**
 * Bulk sync multiple days of step data
 * @param {Array} stepsData - Array of step data objects
 * @param {string} source - Data source (e.g., "healthkit")
 * @param {object} deviceInfo - Device information
 * @param {string} token - User authentication token
 * @returns {Promise} Bulk sync response
 */
export const bulkSyncWalkathonSteps = (
  stepsData,
  source,
  deviceInfo,
  token,
) => {
  const body = {
    stepsData,
    source,
    deviceInfo,
  };
  return apiRequest("/api/walkathon/bulk-sync-steps", "POST", body, token);
};

/**
 * Health check for walkathon service
 * @param {string} token - User authentication token
 * @returns {Promise} Health check response
 */
export const getWalkathonHealth = (token) =>
  apiRequest("/api/walkathon/health", "GET", null, token);

// ============================================================================
// ADJUST S2S API ENDPOINTS
// ============================================================================

/**
 * Get Adjust S2S configuration
 * @param {string} token - User authentication token
 */
export const getAdjustConfig = (token) =>
  apiRequest("/v2/adjust/config", "GET", null, token);

/**
 * Get available Adjust S2S event tokens
 * @param {string} token - User authentication token
 * @returns {Promise} List of event tokens with name and token fields
 */
export const getAdjustEventTokens = (token) =>
  apiRequest("/v2/adjust/events", "GET", null, token);

/**
 * Report an Adjust S2S event to the backend
 * @param {Object} eventData - Event data
 * @param {string} eventData.eventType   - Event type (level_complete, game_complete, survey_complete, purchase)
 * @param {string} eventData.eventToken  - Adjust event token from /v2/adjust/events
 * @param {string} eventData.deviceId    - Device identifier
 * @param {number} [eventData.levelNumber] - Level number (level_complete only)
 * @param {number} [eventData.revenue]   - Revenue amount (purchase only)
 * @param {string} [eventData.currency]  - Currency code (purchase only, default USD)
 * @param {Object} [eventData.metadata]  - Additional metadata
 * @param {string} token - User authentication token
 */
export const reportAdjustEvent = (eventData, token) =>
  apiRequest("/v2/adjust/report-event", "POST", eventData, token);
