/**
 * Google Play Integrity API – frontend token generation
 *
 * Verified against official documentation:
 * - Overview: https://developer.android.com/google/play/integrity/overview
 * - Classic request (nonce + token): https://developer.android.com/google/play/integrity/classic
 * - Decrypt/verify (backend only): https://developer.android.com/google/play/integrity/classic#decrypt-verify
 *
 * Client flow (this file):
 * 1. Obtain nonce (optional: from backend POST /api/integrity/challenge; else generate unique client nonce).
 * 2. Call Play Integrity API requestIntegrityToken(nonce) via @capacitor-community/play-integrity (Android only).
 * 3. Send result.token to backend as X-Integrity-Token header.
 *
 * Where is the integrity token stored?
 * The integrity token is NOT stored anywhere. It is obtained on-demand when making requests to
 * integrity-protected endpoints (see ENDPOINTS_REQUIRING_INTEGRITY in lib/api.js). The token is
 * sent only in the X-Integrity-Token header for that single request; no caching or persistence.
 *
 * Backend only (never in app or git):
 * - GOOGLE_PLAY_INTEGRITY_SERVICE_ACCOUNT (service account JSON) must be used on the server to
 *   decrypt and verify the token with Google. See official docs "Decrypt and verify the integrity verdict".
 *
 * Plugin: https://www.npmjs.com/package/@capacitor-community/play-integrity
 */

const log = (...args) => {
  console.log("[PlayIntegrity]", ...args);
};

const BASE_URL =
  typeof process !== "undefined" && process.env?.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "https://rewardsapi.hireagent.co";

/**
 * Cloud project number for Play Integrity.
 * Must be set via env NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER (numeric, from Google Cloud Console > Project Settings).
 * Do NOT use 0 — the native plugin's getLong() returns null for 0, causing a NullPointerException crash.
 */
const DEFAULT_GOOGLE_CLOUD_PROJECT_NUMBER = (() => {
  if (
    typeof process === "undefined" ||
    process.env?.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER == null
  )
    return null;
  const n = Number(process.env.NEXT_PUBLIC_GOOGLE_CLOUD_PROJECT_NUMBER);
  return Number.isFinite(n) && n > 0 ? n : null;
})();

/**
 * Generate a unique nonce for Play Integrity (per official docs: unique value for replay protection).
 * Used when backend challenge is not available. Prefer server-generated nonce when possible.
 * @returns {string}
 */
function generateRandomNonce() {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return btoa(String.fromCharCode(...bytes))
      .replace(/=/g, "")
      .slice(0, 32);
  }
  return `client_nonce_${Date.now()}_${Math.random().toString(36).slice(2, 15)}`;
}

/**
 * Request a nonce from backend (optional). Backend POST /api/integrity/challenge
 * may return { nonce } for binding the integrity token to a server session.
 * @param {string|null} authToken - Optional Bearer token
 * @returns {Promise<string|null>} Nonce string or null
 */
export async function getIntegrityChallenge(authToken = null) {
  const url = `${BASE_URL}/api/integrity/challenge`;
  log("getIntegrityChallenge: POST", url, "auth:", !!authToken);
  try {
    const headers = { "Content-Type": "application/json" };
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      log("getIntegrityChallenge: response not ok", res.status, res.statusText);
      return null;
    }
    const data = await res.json().catch((e) => {
      log("getIntegrityChallenge: JSON parse failed", e);
      return {};
    });
    // Backend may return { success, data: { nonce, packageName, timestamp } } or flat { nonce }
    const nonce = data.data?.nonce ?? data.nonce ?? null;
    log(
      "getIntegrityChallenge: raw data",
      data,
      "-> nonce:",
      nonce ? `${nonce.slice(0, 20)}...` : null,
    );
    return nonce;
  } catch (e) {
    log("getIntegrityChallenge: error", e?.message ?? e);
    return null;
  }
}

// Deduplication: reuse the in-flight token promise across concurrent API calls.
// The Play Integrity plugin crashes if called concurrently (native NullPointerException).
let _inflightTokenPromise = null;

/**
 * Request Play Integrity token on Android; no-op on web/iOS (returns null).
 * Concurrent callers share the same in-flight request to avoid native plugin crashes.
 * Optionally uses backend challenge nonce; otherwise uses a client-generated nonce.
 *
 * @param {Object} options
 * @param {string} [options.authToken] - Optional auth token for /api/integrity/challenge
 * @param {number|null} [options.googleCloudProjectNumber] - Cloud project number (must be non-zero or null)
 * @returns {Promise<string|null>} Integrity token string or null
 */
export function getIntegrityToken(options = {}) {
  if (_inflightTokenPromise) {
    log("getIntegrityToken: reusing in-flight request");
    return _inflightTokenPromise;
  }
  _inflightTokenPromise = _fetchIntegrityToken(options).finally(() => {
    _inflightTokenPromise = null;
  });
  return _inflightTokenPromise;
}

async function _fetchIntegrityToken(options = {}) {
  const {
    authToken = null,
    googleCloudProjectNumber = DEFAULT_GOOGLE_CLOUD_PROJECT_NUMBER,
  } = options;

  log("getIntegrityToken: called", {
    hasAuthToken: !!authToken,
    googleCloudProjectNumber,
  });

  if (typeof window === "undefined") {
    log("getIntegrityToken: no window, skip");
    return null;
  }

  const Capacitor = window.Capacitor;
  const platform = Capacitor?.getPlatform?.();
  if (!Capacitor || platform !== "android") {
    log("getIntegrityToken: not Android, skip", { platform });
    return null;
  }

  let nonce = null;
  let nonceSource = "none";
  try {
    nonce = await getIntegrityChallenge(authToken);
    nonceSource = nonce ? "backend" : "none";
  } catch (e) {
    log("getIntegrityToken: getIntegrityChallenge threw", e?.message ?? e);
  }
  if (!nonce) {
    nonce = generateRandomNonce();
    nonceSource = "client";
  }
  log(
    "getIntegrityToken: nonce source:",
    nonceSource,
    "nonce length:",
    nonce?.length,
    "preview:",
    nonce ? `${nonce.slice(0, 24)}...` : null,
  );

  try {
    const { PlayIntegrity } =
      await import("@capacitor-community/play-integrity");

    // Never pass googleCloudProjectNumber: 0 — Capacitor getLong() returns null for 0,
    // causing NullPointerException in CapacitorPlayIntegrityPlugin.java:24.
    const requestOptions = { nonce };
    if (googleCloudProjectNumber != null && googleCloudProjectNumber > 0) {
      requestOptions.googleCloudProjectNumber = googleCloudProjectNumber;
    }

    log("getIntegrityToken: calling requestIntegrityToken", requestOptions);
    const result = await PlayIntegrity.requestIntegrityToken(requestOptions);
    const token = result?.token ?? null;
    log("getIntegrityToken: SDK result", {
      hasToken: !!token,
      tokenLength: token?.length ?? 0,
    });
    return token;
  } catch (err) {
    log(
      "getIntegrityToken: requestIntegrityToken failed",
      err?.message ?? err,
      err,
    );
    if (
      typeof console !== "undefined" &&
      (process.env.NODE_ENV === "development" ||
        localStorage?.getItem("debug_api") === "true")
    ) {
      console.warn(
        "[PlayIntegrity] requestIntegrityToken failed:",
        err?.message ?? err,
      );
    }
    return null;
  }
}

export default {
  getIntegrityChallenge,
  getIntegrityToken,
  generateRandomNonce,
};
