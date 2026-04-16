/**
 * Adjust Milestone Counters
 *
 * Industry pattern: counters are seeded from the server on every login /
 * app-open, so a reinstall always starts from the user's TRUE cumulative
 * count rather than a device-local localStorage value.
 *
 * Usage:
 *   1. Call `initFromServer(authToken)` once at app start (AdjustInitializer).
 *   2. Replace `localStorage.getItem("adjust_xxx_count")` with
 *      `incrementAndGet("xxx")` at the point an event fires.
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://rewardsuatapi.hireagent.co";

// Keys match the names used in adjustService event functions
const KEYS = [
  "survey",
  "gameDownload",
  "withdrawal",
  "spin",
  "challenge",
  "nongameOffer",
];

const _counts = Object.fromEntries(KEYS.map((k) => [k, 0]));
let _initialized = false;

/**
 * Fetch true cumulative counts from the backend and seed in-memory store.
 * Called once per session — subsequent calls are no-ops.
 *
 * @param {string} authToken
 */
export const initFromServer = async (authToken) => {
  if (!authToken || _initialized) return;
  try {
    const res = await fetch(`${BASE_URL}/api/v2/adjust/counts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      signal: AbortSignal.timeout(8000), // 8 second timeout — prevents indefinite hang
    });
    if (!res.ok) {
      console.warn(
        `[AdjustCounters] /v2/adjust/counts returned ${res.status} — using 0 as base`,
      );
      return;
    }
    const { data } = await res.json();
    _counts.survey = data.surveysCompleted || 0;
    _counts.gameDownload = data.gamesDownloaded || 0;
    _counts.withdrawal = data.withdrawalsCount || 0;
    _counts.spin = data.spinCount || 0;
    _counts.challenge = data.challengesCompleted || 0;
    // nongameOffer has no backend tracking yet — stays 0 on reinstall (acceptable)
    _initialized = true;
    console.log("[AdjustCounters] ✅ Seeded from server:", { ..._counts });
  } catch (err) {
    console.warn(
      "[AdjustCounters] Seed failed — using 0 as base:",
      err?.message,
    );
  }
};

/**
 * Increment the given counter and return the NEW value.
 * This is what gets passed to onSurveyComplete(count), onCashWithdrawal(count), etc.
 *
 * @param {"survey"|"gameDownload"|"withdrawal"|"spin"|"challenge"|"nongameOffer"} key
 * @returns {number}
 */
export const incrementAndGet = (key) => {
  _counts[key] = (_counts[key] || 0) + 1;
  return _counts[key];
};

/**
 * Read the current count without incrementing.
 * Useful for debugging or displaying state.
 *
 * @param {string} key
 * @returns {number}
 */
export const getCount = (key) => _counts[key] || 0;

/**
 * Reset all counters and re-enable server seeding.
 * MUST be called on logout — industry standard (Mixpanel, Amplitude, Firebase
 * all reset per-user analytics state on signout so the next account on the
 * same device starts with a clean slate).
 *
 * Called automatically by AuthContext.signOut().
 */
export const resetCounters = () => {
  KEYS.forEach((k) => {
    _counts[k] = 0;
  });
  _initialized = false;
  console.log(
    "[AdjustCounters] 🔄 Reset — next login will re-seed from server",
  );
};
