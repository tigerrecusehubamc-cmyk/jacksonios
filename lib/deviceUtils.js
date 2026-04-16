/**
 * Device Utilities for Fraud Prevention
 * Provides device information for Verisoul fraud detection
 */

/**
 * Generate a cryptographically random UUID v4.
 * Uses crypto.randomUUID() where available (all modern browsers + Node 14.17+).
 */
const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
};

/**
 * Get the real Google Advertising ID (GAID) on Android / IDFA on iOS.
 * Returns null if tracking is limited or plugin unavailable.
 *
 * Uses @capacitor-community/advertising-id — the only way to get the real
 * GAID/IDFA from a Capacitor app without native code changes.
 *
 * @returns {Promise<{id: string, type: 'gps_adid'|'idfa'}|null>}
 */
export const getAdvertisingId = async () => {
  if (typeof window === "undefined") return null;
  if (!window.Capacitor?.isNativePlatform()) return null;

  try {
    let AdvertisingId;
    try {
      const module = await import("@capacitor-community/advertising-id");
      AdvertisingId = module.AdvertisingId;
    } catch {
      console.warn("[DeviceUtils] @capacitor-community/advertising-id not installed, skipping GAID/IDFA");
      return null;
    }
    if (!AdvertisingId) return null;
    
    const result = await AdvertisingId.getAdvertisingId();

    // All-zero UUID means tracking is disabled by the user
    if (!result?.id || result.id === "00000000-0000-0000-0000-000000000000") {
      console.warn("[DeviceUtils] Advertising tracking limited — GAID/IDFA not available");
      return null;
    }

    // Capacitor plugin exposes `isAdTrackingLimited` and platform
    const type = result.isAdTrackingLimited
      ? null
      : (result.platform === "ios" ? "idfa" : "gps_adid");

    if (!type) return null;

    console.log(`[DeviceUtils] ✅ Real ${type.toUpperCase()} obtained: ${result.id}`);
    return { id: result.id, type };
  } catch (err) {
    console.warn("[DeviceUtils] AdvertisingId plugin failed:", err?.message);
    return null;
  }
};

// In-memory cache for GAID/IDFA — avoids calling the native plugin on every S2S event
let _cachedDeviceId = null;
let _cachedDeviceIdType = null;

/**
 * Get device ID for Adjust S2S events.
 *
 * Priority:
 *   1. In-memory cache (set on first call — avoids repeated plugin calls per session)
 *   2. Real GAID (Android) / IDFA (iOS) via AdvertisingId plugin
 *   3. Capacitor Device.getId() — android_id fallback (not GAID but consistent)
 *   4. Web UUID stored in localStorage (browser sessions)
 *
 * Returns null on server-side rendering.
 * @returns {Promise<string|null>}
 */
export const getDeviceId = async () => {
  if (typeof window === "undefined") return null;

  // Return in-memory cache immediately — no plugin call needed
  if (_cachedDeviceId) return _cachedDeviceId;

  try {
    if (window.Capacitor?.isNativePlatform()) {
      // 1. Try real GAID/IDFA first — best for Adjust attribution
      const adId = await getAdvertisingId();
      if (adId?.id) {
        _cachedDeviceId   = adId.id;
        _cachedDeviceIdType = adId.type;
        localStorage.setItem("deviceId", adId.id);
        localStorage.setItem("deviceIdType", adId.type);
        return adId.id;
      }

      // 2. Fallback: Capacitor Device identifier (android_id — stable but not GAID)
      try {
        const { Device } = await import("@capacitor/device");
        const deviceInfo = await Device.getId();
        if (deviceInfo?.identifier) {
          _cachedDeviceId     = deviceInfo.identifier;
          _cachedDeviceIdType = "android_id";
          localStorage.setItem("deviceId", deviceInfo.identifier);
          localStorage.setItem("deviceIdType", "android_id");
          return deviceInfo.identifier;
        }
      } catch (err) {
        console.warn("[DeviceUtils] Device.getId() failed:", err?.message);
      }
    }

    // 3. Web / browser — use stored UUID or generate a proper one
    let deviceId = localStorage.getItem("deviceId");
    // Regenerate if it's the old invalid format (web_timestamp_random)
    if (!deviceId || deviceId.startsWith("web_") || deviceId === "unknown") {
      deviceId = generateUUID();
      localStorage.setItem("deviceId", deviceId);
      localStorage.setItem("deviceIdType", "web_uuid");
    }
    _cachedDeviceId     = deviceId;
    _cachedDeviceIdType = localStorage.getItem("deviceIdType") || "web_uuid";
    return deviceId;
  } catch (error) {
    console.error("[DeviceUtils] getDeviceId failed:", error);
    return null;
  }
};

/**
 * Get device metadata for fraud prevention
 * @returns {Promise<Object>} Device metadata object
 */
export const getDeviceMetadata = async () => {
  if (typeof window === "undefined") {
    return {
      deviceId: "unknown",
      appVersion: "1.0.0",
      deviceModel: "unknown",
      osVersion: "unknown",
    };
  }

  const deviceId = await getDeviceId();
  const userAgent = navigator.userAgent || "unknown";

  // Detect platform and device model
  let deviceModel = "Unknown Device";
  let osVersion = "Unknown";
  let platform = "web";

  if (window.Capacitor && window.Capacitor.isNativePlatform()) {
    platform = "mobile";
    try {
      const { Device } = await import("@capacitor/device");
      const deviceInfo = await Device.getInfo();
      deviceModel = deviceInfo.model || deviceInfo.name || "Unknown Device";
      osVersion = deviceInfo.osVersion || "Unknown";
    } catch (error) {
      console.warn("⚠️ [DeviceUtils] Failed to get Capacitor device info:", error);
      // Fallback to user agent parsing
      if (/Android/i.test(userAgent)) {
        const match = userAgent.match(/Android\s([0-9\.]*)/);
        osVersion = match ? match[1] : "Unknown";
        const modelMatch = userAgent.match(/\(([^)]+)\)/);
        deviceModel = modelMatch ? modelMatch[1] : "Android Device";
      } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
        const match = userAgent.match(/OS\s([0-9_]*)/);
        osVersion = match ? match[1].replace(/_/g, ".") : "Unknown";
        deviceModel = /iPad/i.test(userAgent) ? "iPad" : "iPhone";
      }
    }
  } else {
    // Web platform
    platform = "web";
    if (/Android/i.test(userAgent)) {
      const match = userAgent.match(/Android\s([0-9\.]*)/);
      osVersion = match ? match[1] : "Unknown";
      const modelMatch = userAgent.match(/\(([^)]+)\)/);
      deviceModel = modelMatch ? modelMatch[1] : "Android Device";
    } else if (/iPhone|iPad|iPod/i.test(userAgent)) {
      const match = userAgent.match(/OS\s([0-9_]*)/);
      osVersion = match ? match[1].replace(/_/g, ".") : "Unknown";
      deviceModel = /iPad/i.test(userAgent) ? "iPad" : "iPhone";
    } else if (/Windows/i.test(userAgent)) {
      const match = userAgent.match(/Windows NT\s([0-9\.]*)/);
      osVersion = match ? match[1] : "Unknown";
      deviceModel = "Windows PC";
    } else if (/Mac/i.test(userAgent)) {
      const match = userAgent.match(/Mac OS X\s([0-9_\.]*)/);
      osVersion = match ? match[1].replace(/_/g, ".") : "Unknown";
      deviceModel = "Mac";
    } else if (/Linux/i.test(userAgent)) {
      osVersion = "Linux";
      deviceModel = "Linux PC";
    }
  }

  // Get app version from package.json or localStorage
  let appVersion = "1.0.0";
  try {
    // Try to get from build config or environment
    if (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_APP_VERSION) {
      appVersion = process.env.NEXT_PUBLIC_APP_VERSION;
    } else {
      appVersion = localStorage.getItem("appVersion") || "1.0.0";
    }
  } catch (error) {
    // Use default
  }

  return {
    deviceId,
    appVersion,
    deviceModel,
    osVersion,
    platform,
    userAgent,
    language: navigator.language || "en",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
};

/**
 * Format phone number to E.164 format
 * @param {string} countryCode - Country code (e.g., "1", "91")
 * @param {string} phoneNumber - Phone number without country code
 * @returns {string} Formatted phone number in E.164 format
 */
export const formatPhoneToE164 = (countryCode, phoneNumber) => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, "");
  
  // Remove leading country code if already present
  let number = cleaned;
  if (number.startsWith(countryCode)) {
    number = number.substring(countryCode.length);
  }
  
  // Format as E.164: +[countryCode][number]
  return `+${countryCode}${number}`;
};

/**
 * Validate phone number format (E.164)
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} True if valid E.164 format
 */
export const validateE164Phone = (phoneNumber) => {
  // E.164 format: +[countryCode][number] (max 15 digits after +)
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phoneNumber);
};

/**
 * Generate Verisoul session ID (if not provided by SDK)
 * @returns {string} Session ID
 */
export const generateVerisoulSessionId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `verisoul_${timestamp}_${random}`;
};

/**
 * Get stored Verisoul session ID or generate new one
 * @returns {string} Session ID
 */
export const getOrCreateVerisoulSessionId = () => {
  if (typeof window === "undefined") return generateVerisoulSessionId();

  try {
    let sessionId = localStorage.getItem("verisoul_session_id");
    if (!sessionId) {
      sessionId = generateVerisoulSessionId();
      localStorage.setItem("verisoul_session_id", sessionId);
    }
    return sessionId;
  } catch (error) {
    console.error("❌ [DeviceUtils] Error getting Verisoul session ID:", error);
    return generateVerisoulSessionId();
  }
};

/**
 * Clear Verisoul session ID
 */
export const clearVerisoulSessionId = () => {
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem("verisoul_session_id");
    } catch (error) {
      console.error("❌ [DeviceUtils] Error clearing Verisoul session ID:", error);
    }
  }
};
