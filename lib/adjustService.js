/**
 * Adjust S2S Service
 *
 * Fires BOTH Adjust Web SDK events AND S2S events for every tracked action.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │ SDK events → Web SDK → Adjust servers (uses SDK token from adjustSDK)│
 * │ S2S events → Our backend POST /v2/adjust/report-event               │
 * │              body: { eventToken, eventType, deviceId, metadata }     │
 * │                                                                      │
 * │ Flow:                                                                │
 * │  1. fetchDynamicTokens() → GET /v2/adjust/events                    │
 * │     Response: { data: { events: [{ token, name, category }] } }     │
 * │  2. Builds s2sTokenMap: lowercase(name) → token                     │
 * │  3. fireS2S(eventName) → looks up token → POST /report-event        │
 * │     with { eventToken, eventType, deviceId, metadata }              │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * All functions are fire-and-forget — never throw, never block user flow.
 */

import { trackSDKEvent, SDK_TOKENS } from "./adjustSDK";
import { getDeviceId } from "./deviceUtils";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://rewardsuatapi.hireagent.co";

// ---------------------------------------------------------------------------
// Dynamic token cache — admin can update tokens on backend without app update
// ---------------------------------------------------------------------------

const CACHE_KEY = "adjust_dynamic_tokens";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// In-memory SDK token override: { internalKey: "sdkToken" }
// e.g. { appInstall: "pwtxz9" } — overrides hardcoded SDK_TOKENS
let _dynamicTokens = null;

// In-memory S2S token map: { lowercase_event_name: "eventToken" }
// e.g. { "s2s_app install": "3j4ext" } — used in /v2/adjust/report-event
let _s2sTokenMap = null;

/**
 * Mapping from exact CSV "name" column → our internal SDK_TOKENS key.
 * Backend returns events with the exact name from events-sa992du19dkw.csv.
 * This lets admin update tokens on backend and app picks them up dynamically.
 */
const CSV_NAME_TO_KEY = {
  // ── Install & Session ──────────────────────────────────────────────────
  "App install": "appInstall",
  "App session start": "appSessionStart",

  // ── App open retention milestones ──────────────────────────────────────
  "App open on Day 1": "appOpenDay1",
  "App open on Day 3": "appOpenDay3",
  "App open on Day 7": "appOpenDay7",
  "App open on Day 14": "appOpenDay14",
  "App open on Day 21": "appOpenDay21",
  "App open on Day 31": "appOpenDay31",
  "App open on Day 40": "appOpenDay40",
  "App open on Day 60": "appOpenDay60",
  "App open on Day 90": "appOpenDay90",

  // ── Registration ───────────────────────────────────────────────────────
  "Registration started": "registrationStarted",
  "registration completed": "registrationCompleted",

  // ── Game downloads ─────────────────────────────────────────────────────
  "1st game download": "gameDownload1st",
  "2nd game download": "gameDownload2nd",
  "3rd game download": "gameDownload3rd",
  "4th game download": "gameDownload4th",
  "5th game download": "gameDownload5th",
  "10th game download": "gameDownload10th",
  "15th game download": "gameDownload15th",
  "20th game download": "gameDownload20th",

  // ── Surveys completed ──────────────────────────────────────────────────
  "1 survey completed": "survey1",
  "2 survey completed": "survey2",
  "3 survey completed": "survey3",
  "5 survey completed": "survey5",
  "10 survey completed": "survey10",
  "15 survey completed": "survey15",
  "20 survey completed": "survey20",
  "30 survey completed": "survey30",
  "40 survey completed": "survey40",
  "50 survey completed": "survey50",

  // ── Non-gaming offers ──────────────────────────────────────────────────
  "1st non gaming offer completed": "nonGamingOffer1st",
  "3rd non gaming offer completed": "nonGamingOffer3rd",
  "5th non gaming offer completed": "nonGamingOffer5th",
  "10th non gaming offer completed": "nonGamingOffer10th",
  "20th non gaming offer completed": "nonGamingOffer20th",
  "30th non gaming offer completed": "nonGamingOffer30th",

  // ── Daily challenges ───────────────────────────────────────────────────
  "complete 2 daily challenges": "dailyChallenge2",
  "complete 5 daily challenges": "dailyChallenge5",
  "complete 10 daily challenges": "dailyChallenge10",
  "complete 20 daily challenges": "dailyChallenge20",
  "complete 30 daily challenges": "dailyChallenge30",

  // ── Daily streaks ──────────────────────────────────────────────────────
  "complete 7 days daily streak": "streak7",
  "complete 14 days daily streak": "streak14",
  "complete 21 days daily streak": "streak21",
  "complete 30 days daily streak": "streak30",

  // ── Race completions ───────────────────────────────────────────────────
  "complete 1st game in race": "race1st",
  "complete 2nd game in race": "race2nd",
  "complete 3rd game in race": "race3rd",
  "complete 4th game in race": "race4th",
  "complete 5th game in race": "race5th",

  // ── Cash withdrawals ───────────────────────────────────────────────────
  "first cash withdrawal": "withdrawal1st",
  "second cash withdrawal": "withdrawal2nd",
  "third cash withdrawal": "withdrawal3rd",
  "fourth cash withdrawal": "withdrawal4th",
  "sixth cash withdrawal": "withdrawal6th",
  "tenth cash withdrawal": "withdrawal10th",

  // ── In-game purchase count milestones ──────────────────────────────────
  "make 1st purchase in any game": "gamePurchase1st",
  "make 2nd purchase in any game": "gamePurchase2nd",
  "make 5th purchase in any game": "gamePurchase5th",
  "make 10th purchase in any game": "gamePurchase10th",
  "make 20th purchase in any game": "gamePurchase20th",
  "make 40th purchase in any game": "gamePurchase40th",

  // ── In-game purchase revenue milestones ────────────────────────────────
  "Make purchase of $5 inside any game": "purchaseRevenue5",
  "Make purchase of $10 inside any game": "purchaseRevenue10",
  "Make purchase of $40 inside any game": "purchaseRevenue40",
  "Make purchase of $50 inside any game": "purchaseRevenue50",
  "Make purchase of $70 inside any game": "purchaseRevenue70",
  "Make purchase of $100 inside any game": "purchaseRevenue100",
  "Make purchase of $200 inside any game": "purchaseRevenue200",

  // ── Playtime milestones ────────────────────────────────────────────────
  "play any game for 5 minutes": "playtime5m",
  "play any game for 10 minutes": "playtime10m",
  "play any game for 30 minutes": "playtime30m",
  "play any game for 60 minutes": "playtime60m",
  "play any game for 120 minutes": "playtime120m",
  "play any game for 200 minutes": "playtime200m",
  "play any game for 300 minutes": "playtime300m",
  "play any game for 400 minutes": "playtime400m",
  "play any game for 700 minutes": "playtime700m",
  "play any game for 1000 minutes": "playtime1000m",
  "play any game for 1500 minutes": "playtime1500m",
  "play any game for 2000 minutes": "playtime2000m",
  "play any game for 2500 minutes": "playtime2500m",
  "play any game for 3000 minutes": "playtime3000m",

  // ── XP Levels ──────────────────────────────────────────────────────────
  "reach mid xp level": "reachMidXP",
  "reach senior xp level": "reachSeniorXP",

  // ── Other ──────────────────────────────────────────────────────────────
  "complete cash coach all recommendations": "cashCoachAllDone",
  "complete welcome bonus": "welcomeBonusComplete",
  "User in game purchase count": "inGamePurchaseCount",
  "User in game purchase revenue": "inGamePurchaseRevenue",

  // ── Spinner milestones ─────────────────────────────────────────────────
  "use spinner 3 times": "spinner3",
  "use spinner 6 times": "spinner6",
  "use spinner 10 times": "spinner10",
  "use spinner 20 times": "spinner20",
  "use spinner 40 times": "spinner40",
  "use spinner 60 times": "spinner60",
  "use spinner 100 times": "spinner100",
};

/**
 * Get SDK token — dynamic (from backend) if available, fallback to hardcoded.
 * @param {string} key - SDK_TOKENS key e.g. "appInstall"
 * @returns {string|undefined}
 */
const getSDKToken = (key) => {
  if (_dynamicTokens && _dynamicTokens[key]) return _dynamicTokens[key];
  return SDK_TOKENS[key];
};

/**
 * Fetch Adjust event tokens from backend and cache them.
 * Backend returns events with exact CSV "name" values (e.g. "App install", "1st game download").
 * Admin updates tokens on backend → reflected in app within 24 hours.
 * Falls back to hardcoded SDK_TOKENS if API fails.
 *
 * @param {string} authToken - User Bearer token
 */
export const fetchDynamicTokens = async (authToken) => {
  if (!authToken) {
    console.log("[Adjust Dynamic] ⚠️ No auth token — skipping token fetch");
    return;
  }

  // Check localStorage cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      const { sdkTokens, s2sTokens, timestamp } = JSON.parse(cached);
      const age = Date.now() - timestamp;
      if (age < CACHE_TTL_MS) {
        _dynamicTokens = sdkTokens || {};
        _s2sTokenMap = s2sTokens || {};
        console.log(
          `[Adjust Dynamic] ✅ Using cached tokens (age: ${Math.round(age / 60000)}min) — SDK: ${Object.keys(_dynamicTokens).length} | S2S: ${Object.keys(_s2sTokenMap).length}`,
        );
        return;
      }
      console.log(
        "[Adjust Dynamic] 🔄 Cache expired — fetching fresh tokens from backend",
      );
    }
  } catch {
    // ignore cache read errors
  }

  // Fetch fresh tokens from backend
  try {
    console.log(
      "[Adjust Dynamic] 📡 Fetching tokens from /v2/adjust/events...",
    );
    const res = await fetch(`${BASE_URL}/api/v2/adjust/events`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });

    if (!res.ok) {
      console.warn(
        `[Adjust Dynamic] ❌ Backend returned ${res.status} — using hardcoded tokens`,
      );
      return;
    }

    const data = await res.json();
    // Backend response: { success: true, data: { events: [...], count: N } }
    const events = data?.data?.events || [];

    if (!Array.isArray(events) || events.length === 0) {
      console.warn(
        "[Adjust Dynamic] ⚠️ No events returned from backend — using hardcoded tokens",
      );
      return;
    }

    // Build two maps from events list:
    // 1. sdkTokenMap:  internalKey → sdkToken  (for SDK_TOKENS override, non-s2s events)
    // 2. s2sTokenMap:  lowercase(name) → token  (for /report-event, s2s_ prefix events)
    const sdkTokenMap = {};
    const s2sTokenMap = {};
    let sdkMatched = 0;
    let s2sMatched = 0;

    events.forEach((event) => {
      const name = event.name;
      const token = event.token;
      if (!name || !token) return;

      const lowerName = name.toLowerCase();

      if (lowerName.startsWith("s2s_")) {
        // S2S event — store by lowercase name for case-insensitive lookup
        s2sTokenMap[lowerName] = token;
        s2sMatched++;
      } else {
        // SDK event — map to internal key via CSV_NAME_TO_KEY
        const internalKey = CSV_NAME_TO_KEY[name];
        if (internalKey) {
          sdkTokenMap[internalKey] = token;
          sdkMatched++;
        }
      }
    });

    // Store in memory and cache
    _dynamicTokens = sdkTokenMap;
    _s2sTokenMap = s2sTokenMap;
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({
          sdkTokens: sdkTokenMap,
          s2sTokens: s2sTokenMap,
          timestamp: Date.now(),
        }),
      );
    } catch {
      // ignore storage errors
    }

    console.log(
      `[Adjust Dynamic] ✅ Tokens loaded — SDK: ${sdkMatched} | S2S: ${s2sMatched} | total events: ${events.length}`,
    );
  } catch (err) {
    console.warn(
      "[Adjust Dynamic] ❌ Fetch failed — using hardcoded tokens:",
      err?.message,
    );
  }
};

/**
 * Force refresh tokens (bypass cache) — call when admin updates tokens.
 * @param {string} authToken
 */
export const refreshDynamicTokens = async (authToken) => {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    /* ignore */
  }
  _dynamicTokens = null;
  _s2sTokenMap = null;
  console.log("[Adjust Dynamic] 🔄 Cache cleared — forcing fresh token fetch");
  await fetchDynamicTokens(authToken);
};

// ---------------------------------------------------------------------------
// S2S Event Name Map
// These are the exact event names stored in the backend database (from CSV).
// Backend resolves the Adjust token by this name — frontend never touches S2S tokens.
// ---------------------------------------------------------------------------
const S2S = {
  // ── Install & Session ──────────────────────────────────────────────────
  appInstall: "s2s_app install",
  appSessionStart: "s2s_app session start",

  // ── App open retention milestones ──────────────────────────────────────
  appOpenDay1: "s2s_App open on Day 1",
  appOpenDay3: "s2s_App open on Day 3",
  appOpenDay7: "s2s_App open on Day 7",
  appOpenDay14: "s2s_App open on Day 14",
  appOpenDay21: "s2s_App open on Day 21",
  appOpenDay31: "s2s_App open on Day 31",
  appOpenDay40: "s2s_App open on Day 40",
  appOpenDay60: "s2s_App open on Day 60",
  appOpenDay90: "s2s_App open on Day 90",

  // ── Registration ───────────────────────────────────────────────────────
  registrationStarted: "s2s_registration started",
  registrationCompleted: "s2s_registration completed",

  // ── Game downloads ─────────────────────────────────────────────────────
  gameDownload1st: "s2s_1st game download",
  gameDownload2nd: "s2s_2nd game download",
  gameDownload3rd: "s2s_3rd game download",
  gameDownload4th: "s2s_4th game download",
  gameDownload5th: "s2s_5th game download",
  gameDownload10th: "s2s_10th game completed",
  gameDownload15th: "s2s_15th game downloaded",
  gameDownload20th: "s2s_20th game downloaded",

  // ── Surveys completed ──────────────────────────────────────────────────
  survey1: "s2s_1 survey completed",
  survey2: "s2s_2 survey completed",
  survey3: "s2s_3 survey completed",
  survey5: "s2s_5 survey completed",
  survey10: "s2s_10 survey completed",
  survey15: "s2s_15 survey completed",
  survey20: "s2s_20 survey completed",
  survey30: "s2s_30 survey completed",
  survey40: "s2s_40 survey completed",
  survey50: "s2s_50 survey completed",

  // ── Non-gaming offers ──────────────────────────────────────────────────
  nonGamingOffer1st: "s2s_1st non gaming offer completed",
  nonGamingOffer3rd: "s2s_3rd non gaming offer completed",
  nonGamingOffer5th: "s2s_5th non gaming offer completed",
  nonGamingOffer10th: "s2s_10th non gaming offer completed",
  nonGamingOffer20th: "s2s_20th non gaming offer completed",
  nonGamingOffer30th: "s2s_30th non gaming offer completed",

  // ── Daily challenges ───────────────────────────────────────────────────
  dailyChallenge2: "s2s_complete 2 daily challenges",
  dailyChallenge5: "s2s_complete 5 daily challenges",
  dailyChallenge10: "s2s_complete 10 daily challenges",
  dailyChallenge20: "s2s_complete 20 daily challenges",
  dailyChallenge30: "s2s_complete 30 daily challenges",

  // ── Daily streaks ──────────────────────────────────────────────────────
  streak7: "s2s_complete 7 days daily streak",
  streak14: "s2s_complete 14 days daily streak",
  streak21: "s2s_complete 21 days daily streak",
  streak30: "s2s_complete 30 days daily streak",

  // ── Race completions ───────────────────────────────────────────────────
  race1st: "s2s_complete 1st game in race",
  race2nd: "s2s_complete 2nd game in race",
  race3rd: "s2s_complete 3rd game in race",
  race4th: "s2s_complete 4th game in race",
  race5th: "s2s_complete 5th game in race",

  // ── Cash withdrawals ───────────────────────────────────────────────────
  withdrawal1st: "s2s_first cash withdrawal",
  withdrawal2nd: "s2s_second cash withdrawal",
  withdrawal3rd: "s2s_third cash withdrawal",
  withdrawal4th: "s2s_fourth cash withdrawal",
  withdrawal6th: "s2s_sixth cash withdrawal",
  withdrawal10th: "s2s_tenth cash withdrawal",

  // ── In-game purchase count milestones ──────────────────────────────────
  gamePurchase1st: "s2s_make 1st purchase in any game",
  gamePurchase2nd: "s2s_make 2nd purchase in any game",
  gamePurchase5th: "s2s_make 5th purchase in any game",
  gamePurchase10th: "s2s_make 10th purchase in any game",
  gamePurchase20th: "s2s_make 20th purchase in any game",
  gamePurchase40th: "s2s_make 40th purchase in any game",

  // ── In-game purchase revenue milestones ────────────────────────────────
  purchaseRevenue5: "s2s_Make purchase of $5 inside any game",
  purchaseRevenue10: "s2s_Make purchase of $10 inside any game",
  purchaseRevenue20: "s2s_Make purchase of $20 inside any game",
  purchaseRevenue40: "s2s_Make purchase of $40 inside any game",
  purchaseRevenue50: "s2s_Make purchase of $50 inside any game",
  purchaseRevenue70: "s2s_Make purchase of $70 inside any game",
  purchaseRevenue100: "s2s_Make purchase of $100 inside any game",
  purchaseRevenue200: "s2s_Make purchase of $200 inside any game",

  // ── Playtime milestones ────────────────────────────────────────────────
  playtime5m: "s2s_play any game for 5 minutes",
  playtime10m: "s2s_play any game for 10 minutes",
  playtime20m: "s2s_play any game for 20 minutes",
  playtime30m: "s2s_play any game for 30 minutes",
  playtime60m: "s2s_play any game for 60 minutes",
  playtime120m: "s2s_play any game for 120 minutes",
  playtime200m: "s2s_play any game for 200 minutes",
  playtime300m: "s2s_play any game for 300 minutes",
  playtime400m: "s2s_play any game for 400 minutes",
  playtime500m: "s2s_play any game for 500 minutes",
  playtime700m: "s2s_play any game for 700 minutes",
  playtime1000m: "s2s_play any game for 1000 minutes",
  playtime1500m: "s2s_play any game for 1500 minutes",
  playtime2000m: "s2s_play any game for 2000 minutes",
  playtime2500m: "s2s_play any game for 2500 minutes",
  playtime3000m: "s2s_play any game for 3000 minutes",

  // ── XP Levels ──────────────────────────────────────────────────────────
  reachMidXP: "s2s_reach mid xp level",
  reachSeniorXP: "s2s_reach senior xp level",

  // ── Other ──────────────────────────────────────────────────────────────
  cashCoachAllDone: "s2s_complete cash coach all recommendations",
  welcomeBonusComplete: "s2s_complete welcome bonus",
  inGamePurchaseCount: "s2s_User in game purchase count",
  inGamePurchaseRevenue: "s2s_User in game purchase revenue",

  // ── Spinner milestones ─────────────────────────────────────────────────
  spinner3: "s2s_use spinner 3 times",
  spinner6: "s2s_use spinner 6 times",
  spinner10: "s2s_use spinner 10 times",
  spinner20: "s2s_use spinner 20 times",
  spinner40: "s2s_use spinner 40 times",
  spinner60: "s2s_use spinner 60 times",
  spinner100: "s2s_use spinner 100 times",
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const getAuthToken = () => {
  try {
    return typeof window !== "undefined"
      ? localStorage.getItem("authToken")
      : null;
  } catch {
    return null;
  }
};

/**
 * Map S2S event name to backend-allowed eventType.
 * Backend allowedEventTypes: level_complete, game_complete, achievement_unlocked,
 * purchase, ad_revenue, session_start, custom
 */
const getEventType = (eventName) => {
  const n = eventName.toLowerCase();
  if (n.includes("session") || n.includes("install")) return "session_start";
  if (
    n.includes("purchase") ||
    n.includes("revenue") ||
    n.includes("withdrawal")
  )
    return "purchase";
  if (n.includes("game") && n.includes("complet")) return "game_complete";
  return "custom";
};

/**
 * Fire S2S event via backend POST /v2/adjust/report-event (fire-and-forget).
 *
 * Looks up the eventToken from dynamic token map (fetched from /v2/adjust/events).
 * Sends: { eventToken, eventType, deviceId, metadata, revenue?, currency? }
 *
 * @param {string} eventName    - S2S event name (e.g. "s2s_app install")
 * @param {Object} extraPayload - Optional extra fields (revenue, currency, metadata)
 */
const fireS2S = async (eventName, extraPayload = {}) => {
  const authToken = getAuthToken();
  if (!authToken) {
    console.warn(
      `[Adjust S2S] ⚠️ DROPPED — no auth token | event: ${eventName}`,
    );
    return;
  }
  if (!eventName) return;

  // Look up eventToken from dynamic S2S map (case-insensitive)
  const eventToken = _s2sTokenMap?.[eventName.toLowerCase()];
  if (!eventToken) {
    console.warn(
      `[Adjust S2S] ⚠️ No token found for "${eventName}" — tokens not loaded yet or event not in backend`,
    );
    return;
  }

  try {
    const deviceId = await getDeviceId();
    const deviceIdType =
      (typeof window !== "undefined"
        ? localStorage.getItem("deviceIdType")
        : null) || "web_uuid";
    const eventType = getEventType(eventName);
    const { metadata, revenue, currency } = extraPayload;

    const body = {
      eventToken,
      eventType,
      deviceId: deviceId || undefined,
      deviceIdType: deviceId ? deviceIdType : undefined,
      ...(revenue !== undefined && { revenue, currency: currency || "USD" }),
      metadata: metadata || {},
    };

    console.log(
      `[Adjust S2S] 📤 Firing — event: "${eventName}" | token: ${eventToken} | type: ${eventType} | deviceId: ${deviceId}`,
    );

    fetch(`${BASE_URL}/api/v2/adjust/report-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (res.ok) {
          console.log(
            `[Adjust S2S] ✅ Success — event: "${eventName}" | token: ${eventToken} | status: ${res.status}`,
          );
        } else {
          console.warn(
            `[Adjust S2S] ❌ Failed — event: "${eventName}" | status: ${res.status}`,
          );
        }
      })
      .catch((err) => {
        console.warn(
          `[Adjust S2S] ❌ Network error — event: "${eventName}"`,
          err?.message,
        );
      });
  } catch (err) {
    console.warn(`[Adjust S2S] ❌ Error — event: "${eventName}"`, err?.message);
  }
};

/**
 * Fire both SDK event and S2S event together.
 *
 * @param {string} sdkToken   - SDK token (used directly by Adjust Web SDK)
 * @param {string} s2sName    - S2S event name (backend resolves token from DB)
 * @param {Object} sdkParams  - Extra SDK params (revenue, currency, etc.)
 * @param {Object} s2sPayload - Extra S2S body fields
 */
const fireEvent = (
  sdkTokenKeyOrToken,
  s2sName,
  sdkParams = {},
  s2sPayload = {},
) => {
  // Resolve dynamic token override: callers pass the hardcoded VALUE (e.g. "bkf678"),
  // so find the matching SDK_TOKENS KEY first, then check _dynamicTokens for an override.
  let resolvedToken = sdkTokenKeyOrToken;
  if (_dynamicTokens) {
    const tokenKey = Object.keys(SDK_TOKENS).find(
      (k) => SDK_TOKENS[k] === sdkTokenKeyOrToken,
    );
    if (tokenKey && _dynamicTokens[tokenKey]) {
      resolvedToken = _dynamicTokens[tokenKey];
    }
  }

  console.log(
    `[Adjust] 🔥 fireEvent — SDK token: ${resolvedToken || "none"} | S2S: ${s2sName || "none"} | source: ${_dynamicTokens ? "dynamic" : "hardcoded"}`,
  );
  if (resolvedToken) trackSDKEvent(resolvedToken, sdkParams);
  else console.log(`[Adjust] ℹ️ SDK skipped — no token (S2S-only event)`);
  if (s2sName) fireS2S(s2sName, s2sPayload);
};

// ---------------------------------------------------------------------------
// Milestone resolver helpers
// ---------------------------------------------------------------------------

const getGameDownloadKey = (n) => {
  const map = {
    1: "gameDownload1st",
    2: "gameDownload2nd",
    3: "gameDownload3rd",
    4: "gameDownload4th",
    5: "gameDownload5th",
    10: "gameDownload10th",
    15: "gameDownload15th",
    20: "gameDownload20th",
  };
  return map[n] || null;
};

const getSurveyKey = (n) => {
  const map = {
    1: "survey1",
    2: "survey2",
    3: "survey3",
    5: "survey5",
    10: "survey10",
    15: "survey15",
    20: "survey20",
    30: "survey30",
    40: "survey40",
    50: "survey50",
  };
  return map[n] || null;
};

const getDailyChallengeKey = (n) => {
  const map = {
    2: "dailyChallenge2",
    5: "dailyChallenge5",
    10: "dailyChallenge10",
    20: "dailyChallenge20",
    30: "dailyChallenge30",
  };
  return map[n] || null;
};

const getStreakKey = (days) => {
  const map = { 7: "streak7", 14: "streak14", 21: "streak21", 30: "streak30" };
  return map[days] || null;
};

const getSpinnerKey = (n) => {
  const map = {
    3: "spinner3",
    6: "spinner6",
    10: "spinner10",
    20: "spinner20",
    40: "spinner40",
    60: "spinner60",
    100: "spinner100",
  };
  return map[n] || null;
};

const getWithdrawalKey = (n) => {
  const map = {
    1: "withdrawal1st",
    2: "withdrawal2nd",
    3: "withdrawal3rd",
    4: "withdrawal4th",
    6: "withdrawal6th",
    10: "withdrawal10th",
  };
  return map[n] || null;
};

const getPurchaseRevenueKey = (amount) => {
  if (amount >= 200) return "purchaseRevenue200";
  if (amount >= 100) return "purchaseRevenue100";
  if (amount >= 70) return "purchaseRevenue70";
  if (amount >= 50) return "purchaseRevenue50";
  if (amount >= 40) return "purchaseRevenue40";
  if (amount >= 20) return "purchaseRevenue20";
  if (amount >= 10) return "purchaseRevenue10";
  if (amount >= 5) return "purchaseRevenue5";
  return null;
};

const getGamePurchaseCountKey = (n) => {
  // Exact match only — same pattern as getWithdrawalKey / getSurveyKey.
  // >= would re-fire the previous milestone on every purchase between milestones.
  const map = {
    1: "gamePurchase1st",
    2: "gamePurchase2nd",
    5: "gamePurchase5th",
    10: "gamePurchase10th",
    20: "gamePurchase20th",
    40: "gamePurchase40th",
  };
  return map[n] || null;
};

const getPlaytimeKey = (minutes) => {
  if (minutes >= 3000) return "playtime3000m";
  if (minutes >= 2500) return "playtime2500m";
  if (minutes >= 2000) return "playtime2000m";
  if (minutes >= 1500) return "playtime1500m";
  if (minutes >= 1000) return "playtime1000m";
  if (minutes >= 700) return "playtime700m";
  if (minutes >= 500) return "playtime500m";
  if (minutes >= 400) return "playtime400m";
  if (minutes >= 300) return "playtime300m";
  if (minutes >= 200) return "playtime200m";
  if (minutes >= 120) return "playtime120m";
  if (minutes >= 60) return "playtime60m";
  if (minutes >= 30) return "playtime30m";
  if (minutes >= 20) return "playtime20m";
  if (minutes >= 10) return "playtime10m";
  if (minutes >= 5) return "playtime5m";
  return null;
};

// ---------------------------------------------------------------------------
// Public event tracking API
// ---------------------------------------------------------------------------

/** Track app install — fires once ever on first app open */
export const onAppInstall = () => {
  if (typeof window === "undefined") return;
  if (localStorage.getItem("adjust_installed")) {
    console.log("[Adjust] ℹ️ onAppInstall — already fired before, skipping");
    return;
  }
  console.log("[Adjust] 🎉 onAppInstall — FIRST INSTALL firing now!");
  localStorage.setItem("adjust_installed", "1");
  fireEvent(SDK_TOKENS.appInstall, S2S.appInstall);
};

/**
 * Track app session start + day retention milestones.
 * @param {number} daysSinceInstall
 */
export const onAppOpen = (daysSinceInstall = 0) => {
  console.log(`[Adjust] 📱 onAppOpen — daysSinceInstall: ${daysSinceInstall}`);
  fireEvent(SDK_TOKENS.appSessionStart, S2S.appSessionStart);

  const retentionDays = [1, 3, 7, 14, 21, 31, 40, 60, 90];
  const matchedDay = retentionDays.find((day) => daysSinceInstall === day);
  if (matchedDay) {
    console.log(`[Adjust] 🏆 Retention milestone hit — Day ${matchedDay}!`);
    const key = `appOpenDay${matchedDay}`;
    fireEvent(SDK_TOKENS[key], S2S[key]);
  } else {
    console.log("[Adjust] ℹ️ No retention milestone for today");
  }
};

/** Track registration started — SDK only.
 *  S2S is skipped: no auth token exists before signup completes,
 *  so fireS2S would drop it silently every time. */
export const onRegistrationStart = () => {
  trackSDKEvent(SDK_TOKENS.registrationStarted);
};

/** Track registration completed.
 *  Auth token is available now (handleAuthSuccess just ran), but _s2sTokenMap
 *  may still be null (fetchDynamicTokens was skipped on first open — no auth then).
 *  Load tokens first if needed, then fire both SDK + S2S. */
export const onRegistrationComplete = async () => {
  const authToken = getAuthToken();
  if (!_s2sTokenMap && authToken) {
    await fetchDynamicTokens(authToken);
  }
  fireEvent(SDK_TOKENS.registrationCompleted, S2S.registrationCompleted);
};

/**
 * Track game download milestone.
 * @param {number} totalDownloads - Total games downloaded so far
 */
export const onGameDownload = (totalDownloads) => {
  const key = getGameDownloadKey(totalDownloads);
  if (!key) return;
  fireEvent(
    SDK_TOKENS[key],
    S2S[key],
    {},
    { metadata: { downloadCount: totalDownloads } },
  );
};

/**
 * Track survey completion milestone.
 * @param {number} totalSurveys - Total surveys completed
 * @param {string} [surveyId]
 */
export const onSurveyComplete = (totalSurveys, surveyId) => {
  const key = getSurveyKey(totalSurveys);
  if (!key) return;
  fireEvent(
    SDK_TOKENS[key],
    S2S[key],
    {},
    { metadata: { surveyId, count: totalSurveys } },
  );
};

/**
 * Track non-gaming offer completion milestone.
 * @param {number} totalOffers - Total non-gaming offers completed
 */
export const onNonGamingOfferComplete = (totalOffers) => {
  const map = {
    1: "nonGamingOffer1st",
    3: "nonGamingOffer3rd",
    5: "nonGamingOffer5th",
    10: "nonGamingOffer10th",
    20: "nonGamingOffer20th",
    30: "nonGamingOffer30th",
  };
  const key = map[totalOffers];
  if (!key) return;
  fireEvent(
    SDK_TOKENS[key],
    S2S[key],
    {},
    { metadata: { offerCount: totalOffers } },
  );
};

/**
 * Track daily challenge completion milestone.
 * @param {number} totalChallenges - Total daily challenges completed
 * @param {string} [challengeId]
 */
export const onDailyChallengeComplete = (totalChallenges, challengeId) => {
  const key = getDailyChallengeKey(totalChallenges);
  if (!key) return;
  fireEvent(
    SDK_TOKENS[key],
    S2S[key],
    {},
    { metadata: { challengeId, count: totalChallenges } },
  );
};

/**
 * Track daily streak milestone.
 * @param {number} streakDays - Current streak (7, 14, 21, or 30)
 */
export const onStreakMilestone = (streakDays) => {
  const key = getStreakKey(streakDays);
  if (!key) return;
  fireEvent(SDK_TOKENS[key], S2S[key], {}, { metadata: { streakDays } });
};

/**
 * Track race game completion.
 * @param {number} racePosition - 1 through 5
 */
export const onRaceGameComplete = (racePosition) => {
  const map = {
    1: "race1st",
    2: "race2nd",
    3: "race3rd",
    4: "race4th",
    5: "race5th",
  };
  const key = map[racePosition];
  if (!key) return;
  fireEvent(
    SDK_TOKENS[key],
    S2S[key],
    {},
    { metadata: { position: racePosition } },
  );
};

/**
 * Track cash withdrawal milestone.
 * @param {number} withdrawalCount - Total withdrawals made
 */
export const onCashWithdrawal = (withdrawalCount) => {
  const key = getWithdrawalKey(withdrawalCount);
  if (!key) return;
  fireEvent(
    SDK_TOKENS[key],
    S2S[key],
    {},
    { metadata: { count: withdrawalCount } },
  );
};

/**
 * Track in-game purchase (count + revenue milestones).
 * @param {number} purchaseCount - Total purchase count for this user
 * @param {number} revenue       - Purchase amount in USD
 * @param {string} [productId]
 */
export const onInGamePurchase = (purchaseCount, revenue, productId) => {
  const countKey = getGamePurchaseCountKey(purchaseCount);
  if (countKey) {
    fireEvent(
      SDK_TOKENS[countKey],
      S2S[countKey],
      {},
      { metadata: { purchaseCount, productId } },
    );
  }

  const revenueKey = getPurchaseRevenueKey(revenue);
  if (revenueKey) {
    fireEvent(
      SDK_TOKENS[revenueKey],
      S2S[revenueKey],
      { revenue, currency: "USD" },
      { revenue, currency: "USD", metadata: { productId } },
    );
  }

  fireEvent(SDK_TOKENS.inGamePurchaseCount, S2S.inGamePurchaseCount);
  fireEvent(
    SDK_TOKENS.inGamePurchaseRevenue,
    S2S.inGamePurchaseRevenue,
    { revenue, currency: "USD" },
    { revenue, currency: "USD" },
  );
};

/**
 * Track cumulative playtime milestone.
 * @param {number} totalMinutes - Total minutes played
 */
export const onPlaytimeMilestone = (totalMinutes) => {
  const key = getPlaytimeKey(totalMinutes);
  if (!key) return;
  fireEvent(SDK_TOKENS[key], S2S[key], {}, { metadata: { totalMinutes } });
};

/**
 * Track XP level milestone.
 * @param {"mid"|"senior"} level
 */
export const onXPLevelReached = (level) => {
  if (level === "mid") fireEvent(SDK_TOKENS.reachMidXP, S2S.reachMidXP);
  if (level === "senior")
    fireEvent(SDK_TOKENS.reachSeniorXP, S2S.reachSeniorXP);
};

/**
 * Track spinner use milestone.
 * @param {number} totalSpins - Total spins used
 */
export const onSpinnerUse = (totalSpins) => {
  const key = getSpinnerKey(totalSpins);
  if (!key) return;
  fireEvent(SDK_TOKENS[key], S2S[key], {}, { metadata: { totalSpins } });
};

/** Track Cash Coach all recommendations completed */
export const onCashCoachAllDone = () =>
  fireEvent(SDK_TOKENS.cashCoachAllDone, S2S.cashCoachAllDone);

/** Track welcome bonus completed */
export const onWelcomeBonusComplete = () =>
  fireEvent(SDK_TOKENS.welcomeBonusComplete, S2S.welcomeBonusComplete);

// ---------------------------------------------------------------------------
// Retention API — backend-driven, survives reinstalls & account switches
// ---------------------------------------------------------------------------

/**
 * GET /v2/adjust/retention
 * Fetches (or creates) the user's retention record from the backend.
 * Backend creates the record on first call, returns daysSinceFirstOpen
 * and which day milestones have already been fired.
 *
 * @param {string} authToken
 * @returns {{ isFirstOpen: boolean, daysSinceFirstOpen: number, firedMilestones: number[] } | null}
 */
export const fetchUserRetention = async (authToken) => {
  if (!authToken) return null;
  try {
    const res = await fetch(`${BASE_URL}/api/v2/adjust/retention`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
    });
    if (!res.ok) {
      console.warn(
        `[Adjust Retention] ❌ GET /v2/adjust/retention returned ${res.status}`,
      );
      return null;
    }
    const json = await res.json();
    const data = json?.data;
    console.log(
      `[Adjust Retention] ✅ Fetched — isFirstOpen: ${data?.isFirstOpen} | daysSinceFirstOpen: ${data?.daysSinceFirstOpen} | firedMilestones: [${data?.firedMilestones?.join(",")}]`,
    );
    return data || null;
  } catch (err) {
    console.warn("[Adjust Retention] ❌ Fetch failed:", err?.message);
    return null;
  }
};

/**
 * POST /v2/adjust/retention/milestone
 * Marks a retention day milestone as fired on the backend.
 * Fire-and-forget — never blocks user flow.
 *
 * @param {string} authToken
 * @param {number} day - e.g. 1, 3, 7, 14, 21, 31, 40, 60, 90
 */
export const markRetentionMilestone = (authToken, day) => {
  if (!authToken || !day) return;
  fetch(`${BASE_URL}/api/v2/adjust/retention/milestone`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify({ day }),
  })
    .then((res) => {
      if (res.ok)
        console.log(
          `[Adjust Retention] ✅ Milestone Day ${day} recorded on backend`,
        );
      else
        console.warn(
          `[Adjust Retention] ❌ Milestone Day ${day} failed — status: ${res.status}`,
        );
    })
    .catch((err) =>
      console.warn(
        `[Adjust Retention] ❌ Milestone Day ${day} network error:`,
        err?.message,
      ),
    );
};

/**
 * Backend-driven app open handler.
 * Replaces the localStorage-based onAppInstall + onAppOpen.
 * Uses backend retention record so it is:
 *  - Per user (not per device)
 *  - Survives reinstalls
 *  - Correct for multi-account on same device
 *
 * @param {{ isFirstOpen: boolean, daysSinceFirstOpen: number, firedMilestones: number[] }} retentionData
 * @param {string} authToken - needed to mark milestones on backend
 */
export const onAppOpenWithRetention = (retentionData, authToken) => {
  const {
    isFirstOpen,
    daysSinceFirstOpen,
    firedMilestones = [],
  } = retentionData;

  console.log(
    `[Adjust] 📱 onAppOpenWithRetention — isFirstOpen: ${isFirstOpen} | days: ${daysSinceFirstOpen} | firedMilestones: [${firedMilestones.join(",")}]`,
  );

  // Always fire session start
  fireEvent(SDK_TOKENS.appSessionStart, S2S.appSessionStart);

  // Fire install event on first ever open (per user, per account)
  if (isFirstOpen) {
    console.log(
      "[Adjust] 🎉 First open for this user account — firing install event!",
    );
    fireEvent(SDK_TOKENS.appInstall, S2S.appInstall);
  }

  // Fire all unfired retention milestones that have been reached
  // Uses >= so missed days (user didn't open that exact day) still fire
  const retentionDays = [1, 3, 7, 14, 21, 31, 40, 60, 90];
  retentionDays.forEach((day) => {
    if (!firedMilestones.includes(day) && daysSinceFirstOpen >= day) {
      console.log(
        `[Adjust] 🏆 Retention milestone — Day ${day} firing (days since first open: ${daysSinceFirstOpen})`,
      );
      const key = `appOpenDay${day}`;
      fireEvent(SDK_TOKENS[key], S2S[key]);
      markRetentionMilestone(authToken, day);
    }
  });
};
