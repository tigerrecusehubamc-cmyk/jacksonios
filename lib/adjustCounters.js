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
  "purchase",
  "playtime",
];

const _counts = Object.fromEntries(KEYS.map((k) => [k, 0]));
const _firedMilestones = new Set();
let _initialized = false;
let _authToken = null;

/**
 * Fetch true cumulative counts from the backend and seed in-memory store.
 * Called once per session — subsequent calls are no-ops.
 *
 * @param {string} authToken
 */
export const initFromServer = async (authToken) => {
  if (!authToken || _initialized) return;
  _authToken = authToken;
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
    _counts.nongameOffer = data.nonGameOffersCompleted || 0;
    _counts.purchase = data.purchaseCount || 0;
    _counts.playtime = data.totalPlaytimeMinutes || 0;
    // Seed fired milestones from backend — prevents re-fire across devices
    if (Array.isArray(data.firedKeys)) {
      data.firedKeys.forEach((k) => _firedMilestones.add(k));
      console.log(
        `[AdjustCounters] ✅ ${_firedMilestones.size} fired milestones seeded from server`,
      );
    }
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
 * Increment the given counter by 1 and return the NEW value.
 * This is what gets passed to onSurveyComplete(count), onCashWithdrawal(count), etc.
 *
 * @param {"survey"|"gameDownload"|"withdrawal"|"spin"|"challenge"|"nongameOffer"|"purchase"|"playtime"} key
 * @returns {number}
 */
export const incrementAndGet = (key) => {
  _counts[key] = (_counts[key] || 0) + 1;
  return _counts[key];
};

/**
 * Set a counter to an exact value (e.g. playtime minutes, which aren't +1 increments).
 * Also seeds the counter on cross-device login so the user resumes from their true total.
 *
 * @param {"survey"|"gameDownload"|"withdrawal"|"spin"|"challenge"|"nongameOffer"|"purchase"|"playtime"} key
 * @param {number} value
 */
export const setCount = (key, value) => {
  _counts[key] = Math.max(0, Math.floor(value));
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
 * Check if a milestone key has already been fired server-side.
 * Prevents re-firing the same milestone across devices or after reinstall.
 *
 * @param {string} key - e.g. "spinner6", "survey10"
 * @returns {boolean}
 */
export const isAlreadyFired = (key) => _firedMilestones.has(key);

/**
 * Mark a milestone key as fired on the backend and locally.
 * Fire-and-forget — never blocks user flow.
 *
 * @param {string} key - e.g. "spinner6", "survey10"
 */
export const markFiredOnServer = (key) => {
  _firedMilestones.add(key);
  if (!_authToken) return;
  fetch(`${BASE_URL}/api/v2/adjust/milestone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${_authToken}`,
    },
    body: JSON.stringify({ key }),
  }).catch(() => {});
};

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
  _firedMilestones.clear();
  _initialized = false;
  _authToken = null;
  console.log(
    "[AdjustCounters] 🔄 Reset — next login will re-seed from server",
  );
};
