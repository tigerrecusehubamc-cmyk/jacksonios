/**
 * Adjust Web SDK Wrapper
 *
 * Initializes the Adjust Web SDK and provides typed event tracking.
 * SDK events go directly from the browser to Adjust's servers.
 *
 * App Token: sa992du19dkw
 * Docs: https://dev.adjust.com/en/sdk/web
 */

// ---------------------------------------------------------------------------
// SDK Event Token Map (non-s2s, SDK-only events from CSV)
// ---------------------------------------------------------------------------
export const SDK_TOKENS = {
  // ── Install & Session ──────────────────────────────────────────────────
  appInstall:          "pwtxz9",
  appSessionStart:     "oezjqo",

  // ── App open retention milestones ──────────────────────────────────────
  appOpenDay1:         "3jry64",
  appOpenDay3:         "bax5td",
  appOpenDay7:         "e7fv03",
  appOpenDay14:        "62kx42",
  appOpenDay21:        "o4sl7w",
  appOpenDay31:        "1r5loh",
  appOpenDay40:        "scfefb",
  appOpenDay60:        "a78z65",
  appOpenDay90:        "809u35",

  // ── Registration ───────────────────────────────────────────────────────
  registrationStarted:   "3xfafa",
  registrationCompleted: "bkf678",

  // ── Game downloads ─────────────────────────────────────────────────────
  gameDownload1st:  "3k3hot",
  gameDownload2nd:  "nxl1tt",
  gameDownload3rd:  "5isx4q",
  gameDownload4th:  "gwpqsg",
  gameDownload5th:  "raftbp",
  gameDownload10th: "tt5fze",
  gameDownload15th: "i5cj68",
  gameDownload20th: "yfrprf",

  // ── Surveys completed ──────────────────────────────────────────────────
  survey1:   "gngvna",
  survey2:   "l99rcz",
  survey3:   "xl45ah",
  survey5:   "rzxdgm",
  survey10:  "z4hizw",
  survey15:  "cmxqyo",
  survey20:  "59yd4b",
  survey30:  "ui6ioz",
  survey40:  "qmvn9t",
  survey50:  "kj0apc",

  // ── Non-gaming offers completed ────────────────────────────────────────
  nonGamingOffer1st:  "yff4op",
  nonGamingOffer3rd:  "eiicuj",
  nonGamingOffer5th:  "s4p3wy",
  nonGamingOffer10th: "716jdd",
  nonGamingOffer20th: "yigij6",
  nonGamingOffer30th: "1pgnn1",

  // ── Daily challenges ───────────────────────────────────────────────────
  dailyChallenge2:  "sm362n",
  dailyChallenge5:  "7sx0y0",
  dailyChallenge10: "74ovs9",
  dailyChallenge20: "slfld8",
  dailyChallenge30: "q49oa6",

  // ── Daily streaks ──────────────────────────────────────────────────────
  streak7:  "pz5spl",
  streak14: "8rsu8n",
  streak21: "m3bhgv",
  streak30: "gsv6g4",

  // ── Race completions ───────────────────────────────────────────────────
  race1st: "hdb71y",
  race2nd: "wc1l12",
  race3rd: "s7ckmf",
  race4th: "bhpc1r",
  race5th: "z3yil6",

  // ── Cash withdrawals ───────────────────────────────────────────────────
  withdrawal1st:  "3j4ext",
  withdrawal2nd:  "il3hq8",
  withdrawal3rd:  "2d6rx4",
  withdrawal4th:  "ingjet",
  withdrawal6th:  "kizgjw",
  withdrawal10th: "7tyrzw",

  // ── In-game purchase count milestones ──────────────────────────────────
  gamePurchase1st:  "4l8udl",
  gamePurchase2nd:  "jw9l57",
  gamePurchase5th:  "3euaqv",
  gamePurchase10th: "1qyz32",
  gamePurchase20th: "bi3kk8",
  gamePurchase40th: "qasu8p",

  // ── In-game purchase revenue milestones ────────────────────────────────
  purchaseRevenue5:   "hpk06i",
  purchaseRevenue10:  "z1gnvt",
  purchaseRevenue40:  "fwsm1m",
  purchaseRevenue50:  "equtf1",
  purchaseRevenue70:  "4hv039",
  purchaseRevenue100: "2jp615",
  purchaseRevenue200: "tiy22n",

  // ── Playtime milestones ────────────────────────────────────────────────
  playtime5m:    "xqx3fx",
  playtime10m:   "7vihva",
  playtime30m:   "nlakee",
  playtime60m:   "ndearb",
  playtime120m:  "jkd1ll",
  playtime200m:  "7nvnfy",
  playtime300m:  "4y7uj2",
  playtime400m:  "3k7q01",
  playtime700m:  "ew7i7l",
  playtime1000m: "bphhbn",
  playtime1500m: "b3oaoa",
  playtime2000m: "cbsg75",
  playtime2500m: "olit79",
  playtime3000m: "dmvomw",

  // ── XP Levels ──────────────────────────────────────────────────────────
  reachMidXP:    "skxvai",
  reachSeniorXP: "hewxyy",

  // ── Other ──────────────────────────────────────────────────────────────
  cashCoachAllDone:      "f6wbsy",
  welcomeBonusComplete:  "uiglsj",
  inGamePurchaseCount:   "jtvhoz",
  inGamePurchaseRevenue: "e3fu18",

  // ── Spinner milestones ─────────────────────────────────────────────────
  spinner3:   "b392k4",
  spinner6:   "nnjl5a",
  spinner10:  "47khn8",
  spinner20:  "pt27rq",
  spinner40:  "i7h0h5",
  spinner60:  "7bn4i9",
  spinner100: "i98o46",
};

// ---------------------------------------------------------------------------
// Capacitor native plugin bridge (Android only)
// ---------------------------------------------------------------------------

/**
 * Returns true when running inside a Capacitor native app (Android/iOS).
 * On web/browser this is always false.
 */
const isCapacitorNative = () =>
  typeof window !== "undefined" &&
  window.Capacitor?.isNativePlatform?.() === true;

/**
 * Returns true when running on iOS native (Capacitor).
 */
const isIOS = () =>
  typeof window !== "undefined" &&
  window.Capacitor?.getPlatform?.() === "ios";

/**
 * Get the AdjustPlugin registered via Capacitor bridge.
 * Returns null if not available (web browser).
 */
const getAdjustNativePlugin = () => {
  try {
    if (!isCapacitorNative()) return null;
    const { registerPlugin } = require("@capacitor/core");
    return registerPlugin("AdjustPlugin");
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// SDK initialisation
// ---------------------------------------------------------------------------

let _sdkInitialised = false;

/**
 * Initialise the Adjust Web SDK once per session.
 * On iOS/Android native (Capacitor) — uses Web SDK (no native plugin available).
 * On web/browser — uses Web SDK.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export const initAdjustSDK = async () => {
  if (typeof window === "undefined") return;

  if (_sdkInitialised) {
    console.log("[Adjust SDK] Already initialised — skipping");
    return;
  }

  // iOS native — no Capacitor Adjust plugin available, use Web SDK
  if (isCapacitorNative()) {
    console.log(`[Adjust SDK] Running on ${isIOS() ? "iOS" : "Android"} native — using Web SDK`);
  }

  try {
    const { default: Adjust } = await import("@adjustcom/adjust-web-sdk");
    const env = "production"; // Always production — sandbox splits data from S2S production events

    console.log(`[Adjust SDK] Initialising — appToken: sa992du19dkw | env: ${env}`);

    Adjust.initSdk({
      appToken: "sa992du19dkw",
      environment: env,
      logLevel: process.env.NODE_ENV === "production" ? "none" : "warning",
    });

    _sdkInitialised = true;
    console.log("[Adjust SDK] ✅ Initialised successfully");
  } catch (err) {
    console.warn("[Adjust SDK] ❌ Init failed:", err?.message);
  }
};

/**
 * Track a custom SDK event.
 * On Android (Capacitor) → uses native Adjust SDK via Capacitor bridge (proper GAID attribution).
 * On web/browser → uses Adjust Web SDK fallback.
 *
 * @param {string}  token         - Adjust SDK event token
 * @param {Object}  [params]
 * @param {number}  [params.revenue]           - Revenue amount
 * @param {string}  [params.currency]          - Currency code (ISO 4217)
 * @param {Array}   [params.callbackParams]    - [{ key, value }, ...]
 * @param {Array}   [params.partnerParams]     - [{ key, value }, ...]
 */
export const trackSDKEvent = async (token, params = {}) => {
  if (typeof window === "undefined" || !token) return;

  // ── Native path (Android only — Capacitor bridge → native Adjust SDK) ───
  // iOS: Skip native plugin (not installed), use Web SDK instead
  if (isCapacitorNative() && !isIOS()) {
    try {
      const plugin = getAdjustNativePlugin();
      if (plugin) {
        const payload = { token };
        if (params.revenue !== undefined) {
          payload.revenue = params.revenue;
          payload.currency = params.currency || "USD";
        }
        console.log(`[Adjust Native] 📤 Firing event — token: ${token}`, params.revenue ? `| revenue: $${params.revenue}` : "");
        await plugin.trackEvent(payload);
        console.log(`[Adjust Native] ✅ Event sent — token: ${token}`);
        return;
      }
    } catch (err) {
      console.warn(`[Adjust Native] ❌ Event failed — token: ${token}`, err?.message);
      // fall through to Web SDK as backup
    }
  }

  // ── Web SDK (browser / iOS native / Android fallback) ────────────────────
  try {
    const { default: Adjust } = await import("@adjustcom/adjust-web-sdk");

    const eventData = { eventToken: token };
    if (params.revenue !== undefined) {
      eventData.revenue = params.revenue;
      eventData.currency = params.currency || "USD";
    }
    if (params.callbackParams) eventData.callbackParams = params.callbackParams;
    if (params.partnerParams)  eventData.partnerParams  = params.partnerParams;

    console.log(`[Adjust SDK] 📤 Firing event — token: ${token}`, params.revenue ? `| revenue: $${params.revenue}` : "");
    Adjust.trackEvent(eventData);
    console.log(`[Adjust SDK] ✅ Event sent — token: ${token}`);
  } catch (err) {
    console.warn(`[Adjust SDK] ❌ Event failed — token: ${token}`, err?.message);
  }
};
