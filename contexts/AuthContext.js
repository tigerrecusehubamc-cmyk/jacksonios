"use client";
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  login,
  signup,
  getProfile,
  getDailyRewardsWeek,
  getXPTierProgressBar,
  getWelcomeBonusTasks,
  getWelcomeBonusTimer,
  authenticateFraudSession,
  getFraudSessionStatus,
  unauthenticateFraudSession,
  syncMyGames,
  getCashbackOffers,
  getShoppingOffers,
  getBitlabsSurveys,
  getWalkathonStatus,
  getWalkathonLeaderboard,
  biometricLogin,
  checkBiometricStatus,
} from "@/lib/api";
import {
  checkBiometricAvailability,
  verifyBiometricIdentity,
  getCredentials,
  hasBiometricCredentials,
} from "@/lib/biometricAuth";
import { setDealsCache, clearDealsCache } from "@/lib/dealsCache";
import { getDeviceMetadata, clearVerisoulSessionId } from "@/lib/deviceUtils";
import {
  initializeVerisoulSDK,
  getVerisoulSessionId,
  reinitializeVerisoulSession,
} from "@/lib/verisoulSDK";
import useOnboardingStore from "@/stores/useOnboardingStore";
import { App } from "@capacitor/app";
import { Preferences } from "@capacitor/preferences";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchUserProfile,
  fetchProfileStats,
  fetchVipStatus,
  clearProfile,
  fetchHomeDashboard,
  fetchLocationHistory,
  fetchUserAchievements,
} from "@/lib/redux/slice/profileSlice";
import { fetchFinancialGoals } from "@/lib/redux/slice/cashCoachSlice";
import { fetchOnboardingOptions } from "@/lib/redux/slice/onboardingSlice";
import { fetchVipTiers } from "@/lib/redux/slice/vipSlice";
import {
  fetchWalletTransactions,
  fetchWalletScreen,
  fetchFullWalletTransactions,
} from "@/lib/redux/slice/walletTransactionsSlice";
import {
  fetchAccountOverview,
  clearAccountOverview,
} from "@/lib/redux/slice/accountOverviewSlice";
import {
  fetchUserData,
  clearGames,
  fetchGamesBySection,
  fetchMostPlayedScreenGames,
} from "@/lib/redux/slice/gameSlice";
import { clearWalletTransactions } from "@/lib/redux/slice/walletTransactionsSlice";
import { store, persistor } from "@/lib/redux/store";
import {
  fetchCalendar as fetchDailyCalendar,
  fetchToday as fetchDailyToday,
  fetchBonusDays,
  resetDailyChallengeState,
} from "@/lib/redux/slice/dailyChallengeSlice";
import {
  fetchSurveys,
  fetchNonGameOffers,
  clearSurveys,
  clearNonGameOffers,
} from "@/lib/redux/slice/surveysSlice";
import { getUserFromLocalStorage } from "@/lib/utils";

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

const PROTECTED_ROUTES = [
  "/homepage",
  "/myprofile",
  "/edit-profile",
  "/games",
  "/permissions",
  "/location",
];
const PUBLIC_ONLY_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/select-age",
  "/onboarding/select-gender",
  "/onboarding/game-preferences",
  "/onboarding/game-styles",
  "/onboarding/player-type",
  "/welcome",
];

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUserFlow, setIsNewUserFlow] = useState(false);
  const [isLoginRedirectPending, setIsLoginRedirectPending] = useState(false);

  // NEW: Get the Redux dispatch function and the current status of the profile fetch
  const dispatch = useDispatch();
  const { detailsStatus } = useSelector((state) => state.profile);
  const { status: onboardingStatus } = useSelector((state) => state.onboarding);
  const { status: walletTransactionsStatus, walletScreenStatus } = useSelector(
    (state) => state.walletTransactions,
  );
  const { status: accountOverviewStatus } = useSelector(
    (state) => state.accountOverview,
  );
  // Deep link listener useEffect - Handles both custom scheme and HTTPS deep links
  useEffect(() => {
    let listener = null;
    let cancelled = false;

    // Check if we're in a Capacitor environment
    if (typeof window !== "undefined" && window.Capacitor && App) {
      try {
        (async () => {
          try {
            // Capacitor v7+: addListener returns a Promise<PluginListenerHandle>
            listener = await App.addListener("appUrlOpen", (event) => {
              const urlString = event.url;
              console.log(
                "🔗 [DeepLink] appUrlOpen fired. Raw URL:",
                urlString,
              );

              let parsableUrl;
              let path;
              let token;

              // Handle custom URL scheme (com.jackson.app://)
              if (urlString.startsWith("com.jackson.app://")) {
                parsableUrl = new URL(
                  urlString.replace("com.jackson.app://", "http://app/"),
                );
                path = parsableUrl.pathname;
                token = parsableUrl.searchParams.get("token");
                console.log("🔗 [DeepLink] Custom scheme parsed →", {
                  path,
                  hasToken: !!token,
                  allParams: Object.fromEntries(parsableUrl.searchParams),
                });
              }
              // Handle HTTPS deep links (Android App Links)
              else if (urlString.startsWith("https://")) {
                parsableUrl = new URL(urlString);
                path = parsableUrl.pathname;
                token = parsableUrl.searchParams.get("token");
                console.log("🔗 [DeepLink] HTTPS scheme parsed →", {
                  path,
                  hasToken: !!token,
                  allParams: Object.fromEntries(parsableUrl.searchParams),
                });
              } else {
                console.warn(
                  "🔗 [DeepLink] Unknown URL scheme — not handled:",
                  urlString,
                );
              }

              // Process the deep link
              if (path && token) {
                console.log("🔗 [DeepLink] Has token → success path:", path);
                if (path === "/reset-password") {
                  router.push(`/reset-password?token=${token}`);
                } else if (path === "/auth/callback") {
                  // Navigate immediately to the callback page (spinner UI) instead of
                  // processing auth inline — this prevents the login screen from sitting
                  // idle for ~3s while API calls complete in the background.
                  // source=native tells the callback page to skip its browser-close redirect.
                  console.log(
                    "🔗 [DeepLink] Navigating to /auth/callback with token (source=native)",
                  );
                  router.replace(
                    `/auth/callback?token=${encodeURIComponent(token)}&source=native`,
                  );
                }
              } else if (
                (path === "/auth/error" || path === "/auth/callback") &&
                parsableUrl
              ) {
                // Backend sent an error back via deep link (no token present)
                const accountStatus =
                  parsableUrl.searchParams.get("accountStatus") || null;
                const rawMessage =
                  parsableUrl.searchParams.get("message") ||
                  parsableUrl.searchParams.get("error") ||
                  parsableUrl.searchParams.get("error_description") ||
                  null;

                console.log("❌ [DeepLink] Error path detected →", {
                  path,
                  accountStatus,
                  rawMessage,
                  allParams: Object.fromEntries(parsableUrl.searchParams),
                });

                // Apply status → message mapping per backend spec
                let message;
                if (accountStatus === "suspended") {
                  message =
                    rawMessage ||
                    "Your account has been suspended. Please contact support for more information.";
                } else if (accountStatus === "inactive") {
                  message =
                    "Your account is inactive. Please contact support to reactivate your account.";
                } else if (accountStatus === "paused") {
                  message =
                    rawMessage ||
                    "Your account has been paused. Please contact support for more information.";
                } else if (accountStatus) {
                  message =
                    "Your account is not active. Please contact support for more information.";
                } else {
                  // No accountStatus = server crash fallback
                  message = rawMessage || "Google authentication failed";
                }

                console.log(
                  "❌ [DeepLink] Mapped error message:",
                  message,
                  "| accountStatus:",
                  accountStatus,
                );

                const loginUrl = `/login?googleError=${encodeURIComponent(message)}${accountStatus ? `&accountStatus=${encodeURIComponent(accountStatus)}` : ""}`;
                console.log(
                  "❌ [DeepLink] Navigating to login with error URL:",
                  loginUrl,
                );
                router.replace(loginUrl);
              } else {
                console.warn(
                  "🔗 [DeepLink] Path not matched or no parsableUrl →",
                  { path, hasToken: !!token, hasParsableUrl: !!parsableUrl },
                );
              }
            });

            if (cancelled && listener?.remove) {
              await listener.remove();
              listener = null;
            }
          } catch (e) {
            console.warn("App.addListener failed:", e);
          }
        })();
      } catch (error) {
        console.warn(
          "App.addListener not available in this environment:",
          error,
        );
      }
    }

    return () => {
      cancelled = true;
      if (listener) {
        try {
          // Try different possible cleanup methods
          if (listener && typeof listener === "object") {
            if (typeof listener.remove === "function") {
              listener.remove();
            } else if (typeof listener.unsubscribe === "function") {
              listener.unsubscribe();
            } else if (typeof listener.destroy === "function") {
              listener.destroy();
            } else if (typeof listener === "function") {
              listener();
            }
          } else if (typeof listener === "function") {
            listener();
          }
        } catch (error) {
          console.warn("Error cleaning up listener:", error);
        }
      }
    };
  }, [router]);

  // Initialize Verisoul SDK on app start (delay so script has time to load)
  useEffect(() => {
    const initVerisoul = async () => {
      try {
        const result = await initializeVerisoulSDK();
        if (result.success) {
          const isFallback =
            result.sessionId &&
            String(result.sessionId).startsWith("fallback_");
          if (isFallback) {
            console.log(
              "ℹ️ [AuthContext] Verisoul SDK using fallback session (script may still be loading)",
            );
          } else {
            console.log(
              "✅ [AuthContext] Verisoul SDK initialized with session:",
              result.sessionId,
            );
          }
        } else {
          console.warn(
            "⚠️ [AuthContext] Verisoul SDK initialization failed (non-blocking):",
            result.error,
          );
        }
      } catch (error) {
        console.error(
          "❌ [AuthContext] Failed to initialize Verisoul SDK (non-blocking):",
          error,
        );
      }
    };

    const timer = setTimeout(initVerisoul, 800);
    return () => clearTimeout(timer);
  }, []);

  // MODIFIED: This effect now focuses only on loading the session from storage
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedToken = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("user");
        if (storedToken && storedUser) {
          setToken(storedToken);
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setIsLoading(false); // INDUSTRIAL: Unblock first paint immediately; run fraud after

          // Sync my-games in background (non-blocking)
          syncMyGames(storedToken).catch(() => {});

          // INDUSTRIAL: Fraud session check runs AFTER first paint (non-blocking)
          setTimeout(() => {
            (async () => {
              try {
                const storedSessionId = localStorage.getItem(
                  "verisoul_session_id",
                );
                console.log(
                  "[FraudDebug] loadSession – stored backend sessionId:",
                  storedSessionId
                    ? `${storedSessionId.slice(0, 8)}...`
                    : "none",
                );
                if (storedSessionId) {
                  console.log(
                    "[FraudDebug] loadSession – GET status using backend sessionId",
                  );
                  const statusResponse = await getFraudSessionStatus(
                    storedSessionId,
                    storedToken,
                  );
                  if (statusResponse?.success) {
                    const status = statusResponse?.data?.status;
                    const riskScore = statusResponse?.data?.risk_score || 0;

                    console.log(
                      "🔍 [AuthContext] Fraud session status on app open:",
                      {
                        status,
                        riskScore,
                      },
                    );
                    console.log(
                      "[FraudDebug] loadSession – status:",
                      status,
                      "risk_score:",
                      riskScore,
                    );

                    // Re-authenticate if session is not active
                    if (status !== "active") {
                      console.log(
                        "🔄 [AuthContext] Session not active on app open, re-authenticating...",
                      );
                      const deviceMetadata = await getDeviceMetadata();

                      // Get Verisoul SDK session ID (required for full fraud detection); don't send fallback to backend
                      let verisoulSessionId = await getVerisoulSessionId();
                      if (
                        verisoulSessionId &&
                        String(verisoulSessionId).startsWith("fallback_")
                      )
                        verisoulSessionId = null;
                      console.log(
                        "[FraudDebug] loadSession re-auth – SDK session_id:",
                        verisoulSessionId
                          ? `${String(verisoulSessionId).slice(0, 24)}...`
                          : "none",
                      );

                      const sessionAuthData = {
                        accountId:
                          parsedUser.email ||
                          parsedUser.mobile ||
                          parsedUser._id ||
                          parsedUser.id,
                        email: parsedUser.email || "",
                        metadata: {
                          deviceId: deviceMetadata.deviceId,
                          appVersion: deviceMetadata.appVersion,
                          deviceModel: deviceMetadata.deviceModel,
                          osVersion: deviceMetadata.osVersion,
                          platform: deviceMetadata.platform,
                        },
                        group:
                          parsedUser.group ||
                          parsedUser.userGroup ||
                          "regular_users", // Required by API
                      };

                      if (verisoulSessionId)
                        sessionAuthData.session_id = verisoulSessionId;

                      const fraudResponse = await authenticateFraudSession(
                        sessionAuthData,
                        storedToken,
                      );
                      if (fraudResponse?.success && fraudResponse?.sessionId) {
                        console.log(
                          "[FraudDebug] loadSession re-auth – storing backend sessionId:",
                          fraudResponse.sessionId?.slice(0, 8) + "...",
                        );
                        localStorage.setItem(
                          "verisoul_session_id",
                          fraudResponse.sessionId,
                        );
                      }
                    }
                  }
                } else {
                  // No session ID found, authenticate new session
                  console.log(
                    "🔄 [AuthContext] No fraud session found, creating new session...",
                  );
                  const deviceMetadata = await getDeviceMetadata();

                  // Get Verisoul SDK session ID; don't send fallback to backend
                  let verisoulSessionId = await getVerisoulSessionId();
                  if (
                    verisoulSessionId &&
                    String(verisoulSessionId).startsWith("fallback_")
                  )
                    verisoulSessionId = null;
                  console.log(
                    "[FraudDebug] loadSession new session – SDK session_id:",
                    verisoulSessionId
                      ? `${String(verisoulSessionId).slice(0, 24)}...`
                      : "none",
                  );

                  const sessionAuthData = {
                    accountId:
                      parsedUser.email ||
                      parsedUser.mobile ||
                      parsedUser._id ||
                      parsedUser.id,
                    email: parsedUser.email || "",
                    metadata: {
                      deviceId: deviceMetadata.deviceId,
                      appVersion: deviceMetadata.appVersion,
                      deviceModel: deviceMetadata.deviceModel,
                      osVersion: deviceMetadata.osVersion,
                      platform: deviceMetadata.platform,
                    },
                    group:
                      parsedUser.group ||
                      parsedUser.userGroup ||
                      "regular_users", // Required by API
                  };

                  if (verisoulSessionId)
                    sessionAuthData.session_id = verisoulSessionId;

                  const fraudResponse = await authenticateFraudSession(
                    sessionAuthData,
                    storedToken,
                  );
                  if (fraudResponse?.success && fraudResponse?.sessionId) {
                    console.log(
                      "[FraudDebug] loadSession new session – storing backend sessionId:",
                      fraudResponse.sessionId?.slice(0, 8) + "...",
                    );
                    localStorage.setItem(
                      "verisoul_session_id",
                      fraudResponse.sessionId,
                    );
                  }
                }
              } catch (error) {
                console.error(
                  "❌ [AuthContext] Error checking/creating fraud session on app open (non-blocking):",
                  error,
                );
              }
            })();
          }, 0);
        }
      } catch (error) {
        console.error("❌ Failed to load session from storage", error);
        localStorage.clear();
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  // INDUSTRIAL: Auto Face ID on app launch (like Chase, Uber, big iOS apps)
  // Trigger Face ID automatically when app opens if biometric credentials exist
  useEffect(() => {
    const autoBiometricLogin = async () => {
      // Only run on native iOS/Android
      if (!Capacitor.isNativePlatform()) return;
      
      // Skip if already have a valid session
      const storedToken = localStorage.getItem("authToken");
      if (storedToken) {
        console.log("🔐 [AuthContext] Session exists, skipping auto Face ID");
        return;
      }

      // Check if biometric credentials exist and list all accounts
      const accountsResult = await listBiometricAccounts();
      
      if (!accountsResult.success || accountsResult.accounts?.length === 0) {
        console.log("🔐 [AuthContext] No biometric credentials, skipping auto Face ID");
        return;
      }

      console.log(
        "🔐 [AuthContext] Found",
        accountsResult.accounts.length,
        "biometric account(s) on device",
      );

      // Determine which account to use
      let selectedUserId = null;
      let selectedUsername = null;
      
      if (accountsResult.accounts.length === 1) {
        // Single account - use it directly
        selectedUserId = accountsResult.accounts[0].userId;
        selectedUsername = accountsResult.accounts[0].username;
        console.log("🔐 [AuthContext] Single account found:", selectedUsername);
      } else {
        // Multiple accounts - show account picker (Chase/Uber pattern)
        console.log("🔐 [AuthContext] Multiple accounts - showing picker");
        
        // For multiple accounts, we should NOT auto-login
        // Show the login page with account selection
        // The BiometricLoginButton will handle account selection
        console.log(
          "🔐 [AuthContext] Multiple accounts found:",
          accountsResult.accounts.map(a => a.username).join(", "),
        );
        console.log("🔐 [AuthContext] Skipping auto-login - user must choose account manually");
        console.log("🔐 [AuthContext] (Account picker UI needed for auto-login with multiple accounts)");
        
        // Don't auto-login when multiple accounts exist
        return;
      }

      console.log("🔐 [AuthContext] Auto-triggering Face ID for account:", selectedUsername);

      try {
        // Get device ID
        const { Device } = await import("@capacitor/device");
        const { identifier: deviceId } = await Device.getId();

        // Authenticate with biometric (includes replay protection for iOS)
        // Pass userId for multi-account support
        const authResult = await authenticateWithBiometric({
          reason: "Login to your Jackson account",
          title: "Biometric Login",
          subtitle: "Authenticate to continue",
          userId: selectedUserId,
          useReplayProtection: true,
        });

        if (!authResult.success) {
          console.log("🔐 [AuthContext] Auto Face ID cancelled or failed");
          return;
        }

        console.log("✅ [AuthContext] Auto Face ID successful, logging in...");

        // Call backend biometric login with replay protection
        const loginData = {
          deviceId,
          biometricType: authResult.biometryTypeName,
          nonce: authResult.nonce,
          signature: authResult.signature,
          publicKey: authResult.publicKey,
        };

        if (authResult.username.includes("@")) {
          loginData.email = authResult.username;
        } else {
          loginData.mobile = authResult.username;
        }

        const loginResult = await biometricLogin(loginData);

        if (loginResult?.success) {
          console.log("✅ [AuthContext] Auto login successful");
          localStorage.setItem("authToken", loginResult.token);
          localStorage.setItem("user", JSON.stringify(loginResult.user));
          setToken(loginResult.token);
          setUser(loginResult.user);
        } else {
          console.error("❌ [AuthContext] Auto login failed:", loginResult?.error);
        }
      } catch (error) {
        console.error("❌ [AuthContext] Auto biometric login error:", error);
      }
    };

    // Small delay to let the app initialize first
    const timer = setTimeout(autoBiometricLogin, 1000);
    return () => clearTimeout(timer);
  }, []);

  // REMOVED: This useEffect has been consolidated into the "Smart data fetching" effect below
  // Keeping all initial fetches in one place prevents duplicate API calls

  // REMOVED: Deferred one-time fetches have been consolidated into the "Smart data fetching" effect
  // This prevents duplicate API calls and unnecessary timers

  // OPTIMIZED: Consolidated smart data fetching with persistence awareness
  // This single effect handles all data initialization to prevent duplicate API calls
  useEffect(() => {
    if (!token) return;

    console.log(
      "[DEBUG-AUTHCTX] fetchInitialData effect fired at",
      new Date().toISOString(),
      "| user._id:",
      user?._id,
    );
    // Get current state to check what data is already available
    const currentState = store.getState();
    const {
      details,
      detailsStatus,
      statsStatus,
      dashboardStatus,
      stats,
      dashboardData,
      vipStatusState,
    } = currentState.profile;
    const { userDataStatus, userData, gamesBySection } = currentState.games;
    const { walletScreen, walletScreenStatus } =
      currentState.walletTransactions || {};
    const {
      calendarStatus: dailyCalendarStatus,
      todayStatus: dailyTodayStatus,
      bonusDaysStatus,
      bonusDays: bonusDaysData,
    } = currentState.dailyChallenge || {};
    const {
      status: surveysStatus,
      nonGameOffersStatus,
      cacheTimestamp: surveysCacheTimestamp,
      nonGameOffersCacheTimestamp,
    } = currentState.surveys || {};

    // OPTIMIZED: Check if data exists and is valid before fetching
    // IMPORTANT: Check for data existence first, then status (persisted data may have status "idle")
    const hasProfileData = details && detailsStatus === "succeeded";
    const hasStatsData =
      (stats || dashboardData?.stats) && statsStatus === "succeeded";
    const hasUserData = userData && userDataStatus === "succeeded";
    const hasWalletData =
      walletScreen &&
      (walletScreenStatus === "succeeded" || walletScreenStatus === "idle");
    // gamesBySection is an object {sectionName: []}, not an array — use Object.keys
    const hasGamesData =
      gamesBySection && Object.keys(gamesBySection).length > 0;
    const hasBonusDaysData = bonusDaysData && bonusDaysStatus === "succeeded";
    const hasVipData = vipStatusState === "succeeded";
    const SURVEY_CACHE_TTL = 90 * 1000;
    const hasFreshSurveys =
      surveysStatus === "succeeded" &&
      surveysCacheTimestamp &&
      Date.now() - surveysCacheTimestamp < SURVEY_CACHE_TTL;
    const hasFreshNonGameOffers =
      nonGameOffersStatus === "succeeded" &&
      nonGameOffersCacheTimestamp &&
      Date.now() - nonGameOffersCacheTimestamp < SURVEY_CACHE_TTL;

    // Get user for game fetching
    const getUser = () =>
      typeof window !== "undefined" ? getUserFromLocalStorage() : null;
    const userForGames = getUser() || user;

    // ── STAGE 1 (immediate): All homepage APIs ─────────────────────────────
    // Everything the home screen needs: profile, vip, progress bar, surveys,
    // non-game offers, stats, user data, and game cards.
    // Fires after login, signup, and app resume.
    if (!hasProfileData && detailsStatus === "idle") {
      dispatch(fetchUserProfile({ token }));
    }
    if (!hasVipData && vipStatusState === "idle") {
      dispatch(fetchVipStatus(token));
    }
    if (!hasWalletData) {
      console.log(
        "[DEBUG-AUTHCTX] fetchInitialData: hasWalletData=false → dispatching fetchWalletScreen | walletScreen:",
        !!walletScreen,
        "| walletScreenStatus:",
        walletScreenStatus,
      );
      dispatch(fetchWalletScreen({ token }));
    }
    if (!hasFreshNonGameOffers && nonGameOffersStatus !== "loading") {
      dispatch(fetchNonGameOffers({ token, offerType: "cashback_shopping" }));
    }
    if (!hasFreshSurveys && surveysStatus !== "loading") {
      dispatch(fetchSurveys({ token }));
    }
    if (!hasStatsData && statsStatus === "idle") {
      dispatch(fetchProfileStats({ token }));
    }
    if (user && user._id && !hasUserData && userDataStatus === "idle") {
      dispatch(fetchUserData({ userId: user._id, token }));
    }
    if (userForGames && !hasGamesData) {
      dispatch(
        fetchGamesBySection({
          uiSection: "Swipe",
          user: userForGames,
          page: 1,
          limit: 10,
        }),
      );
      dispatch(
        fetchGamesBySection({
          uiSection: "Most Played",
          user: userForGames,
          page: 1,
          limit: 10,
        }),
      );
    }

    // ── STAGE 2 (400 ms): Daily challenge ──────────────────────────────────
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const dailyTimer = setTimeout(() => {
      if (
        typeof window !== "undefined" &&
        window.location.pathname === "/dailychallenge"
      )
        return;
      const state = store.getState();
      const dc = state.dailyChallenge || {};
      const CACHE_TTL = 5 * 60 * 1000;
      const hasFreshCalendar =
        dc.calendar &&
        dc.calendarCacheTimestamp &&
        Date.now() - dc.calendarCacheTimestamp < CACHE_TTL;
      const hasFreshToday =
        dc.today &&
        dc.todayCacheTimestamp &&
        Date.now() - dc.todayCacheTimestamp < CACHE_TTL;
      const hasFreshBonus =
        dc.bonusDays &&
        dc.bonusDaysCacheTimestamp &&
        Date.now() - dc.bonusDaysCacheTimestamp < CACHE_TTL;
      if ((dc.calendarStatus || "idle") === "idle" && !hasFreshCalendar)
        dispatch(fetchDailyCalendar({ year, month, token }));
      if ((dc.todayStatus || "idle") === "idle" && !hasFreshToday)
        dispatch(fetchDailyToday({ token }));
      if ((dc.bonusDaysStatus || "idle") === "idle" && !hasFreshBonus)
        dispatch(fetchBonusDays({ token }));
    }, 400);

    // ── STAGE 3 (5 s): Wallet transactions + account / financial data ──────
    const walletTxTimer = setTimeout(() => {
      const path =
        typeof window !== "undefined" ? window.location.pathname : "";
      const skipRoutes = [
        "/Ticket",
        "/AchieveGoals",
        "/cash-coach",
        "/contact-us",
        "/privacy-policy",
        "/reset-password",
      ];
      if (skipRoutes.some((r) => path === r || path.startsWith(r + "/")))
        return;
      dispatch(fetchWalletTransactions({ token, limit: 5 }));
      dispatch(
        fetchFullWalletTransactions({ token, page: 1, limit: 20, type: "all" }),
      );
      dispatch(fetchAccountOverview());
      dispatch(fetchFinancialGoals(token));
      dispatch(fetchVipTiers("US"));
      dispatch(fetchLocationHistory(token));
      dispatch(
        fetchUserAchievements({
          token,
          category: "games",
          status: "completed",
        }),
      );
    }, 5000);

    // ── STAGE 4 (6 s): Most Played screen (full list for /DownloadGame page) ─
    const mostPlayedScreenTimer = setTimeout(() => {
      if (userForGames) {
        dispatch(
          fetchMostPlayedScreenGames({
            user: userForGames,
            page: 1,
            limit: 50,
          }),
        );
      }
    }, 6000);

    // ── STAGE 5 (7 s): Leadership + Highest Earning (Wallet / Profile screens) ─
    const secondaryGamesTimer = setTimeout(() => {
      if (userForGames) {
        dispatch(
          fetchGamesBySection({
            uiSection: "Leadership",
            user: userForGames,
            page: 1,
            limit: 10,
          }),
        );
        dispatch(
          fetchGamesBySection({
            uiSection: "Highest Earning",
            user: userForGames,
            page: 1,
            limit: 10,
          }),
        );
      }
    }, 7000);

    // ── STAGE 6 (9 s): Cash Coach Recommendation (TaskListSection / AchieveGoals) ─
    const taskListTimer = setTimeout(() => {
      if (userForGames) {
        dispatch(
          fetchGamesBySection({
            uiSection: "Cash Coach Recommendation",
            user: userForGames,
            page: 1,
            limit: 10,
          }),
        );
      }
    }, 9000);

    // ── STAGE 7 (30 s): Deals page pre-warm (Cashback + Shopping + Surveys) ────
    const dealsPrewarmTimer = setTimeout(async () => {
      try {
        const defaultParams = {
          category: "all",
          page: 1,
          limit: 6,
          useAdminConfig: "true",
        };
        const [cashbackRes, shoppingRes, surveysRes] = await Promise.all([
          getCashbackOffers(defaultParams, token),
          getShoppingOffers(defaultParams, token),
          getBitlabsSurveys(defaultParams, token),
        ]);

        let cbOffers = [];
        if (cashbackRes?.success && cashbackRes.data) {
          cbOffers = Array.isArray(cashbackRes.data.offers)
            ? cashbackRes.data.offers
            : cashbackRes.data.categorized?.cashback || [];
        }

        let shOffers = [];
        if (shoppingRes?.success && shoppingRes.data) {
          shOffers = Array.isArray(shoppingRes.data.offers)
            ? shoppingRes.data.offers
            : shoppingRes.data.categorized?.shopping || [];
        }

        let svOffers = [];
        if (surveysRes?.success && Array.isArray(surveysRes.data?.surveys)) {
          svOffers = surveysRes.data.surveys;
        }

        setDealsCache({
          cashbackOffers: cbOffers,
          shoppingOffers: shOffers.slice(0, 6),
          surveyOffers: svOffers,
        });
      } catch (_e) {
        // Silent — deals pre-warm is best-effort
      }
    }, 30000);

    return () => {
      clearTimeout(dailyTimer);
      clearTimeout(walletTxTimer);
      clearTimeout(mostPlayedScreenTimer);
      clearTimeout(secondaryGamesTimer);
      clearTimeout(taskListTimer);
      clearTimeout(dealsPrewarmTimer);
    };
    // Use user?._id (primitive string) instead of the full user object so this
    // effect only re-runs when the logged-in account actually changes, not on
    // every render where JSON.parse() creates a new object reference.
  }, [token, dispatch, user?._id]);

  // Refresh profile and wallet when app comes to foreground (to get admin updates)
  // Also check fraud session status. Skip when on routes that don't use this data (e.g. AchieveGoals).
  // Uses debouncing to prevent duplicate calls from simultaneous focus events
  useEffect(() => {
    if (!token) return;

    let focusTimeoutId = null;

    const handleFocus = async () => {
      console.log(
        "[DEBUG-AUTHCTX] window focus event fired at",
        new Date().toISOString(),
        "| debouncing 500ms...",
      );
      // Clear any pending refresh to prevent duplicates
      if (focusTimeoutId) {
        clearTimeout(focusTimeoutId);
      }

      // Debounce: only refresh once after 500ms of focus event
      focusTimeoutId = setTimeout(async () => {
        const path =
          typeof window !== "undefined" ? window.location.pathname : "";
        const skipRefreshRoutes = [
          "/AchieveGoals",
          "/Ticket",
          "/cash-coach",
          "/contact-us",
          "/privacy-policy",
        ];
        if (
          skipRefreshRoutes.some((r) => path === r || path.startsWith(r + "/"))
        )
          return;

        console.log(
          "[DEBUG-AUTHCTX] focus debounce resolved — dispatching refreshes for path:",
          path,
          "at",
          new Date().toISOString(),
        );
        dispatch(fetchUserProfile({ token, force: true, background: true }));
        dispatch(fetchVipStatus(token));
        // Also refresh wallet/balance/XP when app comes to foreground — background only, and only if stale
        const _walletState =
          require("@/lib/redux/store").store.getState().walletTransactions;
        const _walletTs = _walletState.walletScreenCacheTimestamp;
        const WALLET_FOCUS_STALE_MS = 60 * 1000; // 1 minute
        if (!_walletTs || Date.now() - _walletTs > WALLET_FOCUS_STALE_MS) {
          dispatch(fetchWalletScreen({ token, force: true, background: true }));
          dispatch(fetchProfileStats({ token, force: true, background: true }));
        }
        // Refresh account overview in background (real data like rest of project)
        dispatch(fetchAccountOverview({ force: true, background: true }));

        // Check fraud session status
        try {
          const storedSessionId = localStorage.getItem("verisoul_session_id");
          console.log(
            "[FraudDebug] handleFocus – stored backend sessionId:",
            storedSessionId ? `${storedSessionId.slice(0, 8)}...` : "none",
          );
          if (storedSessionId) {
            console.log(
              "[FraudDebug] handleFocus – GET status using backend sessionId",
            );
            const statusResponse = await getFraudSessionStatus(
              storedSessionId,
              token,
            );
            if (statusResponse?.success) {
              const riskScore = statusResponse?.data?.risk_score || 0;
              const status = statusResponse?.data?.status;

              console.log("🔍 [AuthContext] Fraud session status checked:", {
                status,
                riskScore,
              });
              console.log(
                "[FraudDebug] handleFocus – status:",
                status,
                "risk_score:",
                riskScore,
              );

              // Handle high risk or inactive session
              if (riskScore > 0.7) {
                console.warn(
                  "⚠️ [AuthContext] High risk detected on app resume:",
                  riskScore,
                );
              }

              if (status !== "active") {
                // Re-authenticate if session is not active
                console.log(
                  "🔄 [AuthContext] Session not active, re-authenticating...",
                );
                if (user) {
                  const deviceMetadata = await getDeviceMetadata();

                  // Get Verisoul SDK session ID; don't send fallback to backend
                  let verisoulSessionId = await getVerisoulSessionId();
                  if (
                    verisoulSessionId &&
                    String(verisoulSessionId).startsWith("fallback_")
                  )
                    verisoulSessionId = null;
                  console.log(
                    "[FraudDebug] handleFocus re-auth – SDK session_id:",
                    verisoulSessionId
                      ? `${String(verisoulSessionId).slice(0, 24)}...`
                      : "none",
                  );

                  const sessionAuthData = {
                    accountId: user.email || user.mobile || user._id || user.id,
                    email: user.email || "",
                    metadata: {
                      deviceId: deviceMetadata.deviceId,
                      appVersion: deviceMetadata.appVersion,
                      deviceModel: deviceMetadata.deviceModel,
                      osVersion: deviceMetadata.osVersion,
                      platform: deviceMetadata.platform,
                    },
                    group: user.group || user.userGroup || "regular_users", // Required by API
                  };

                  if (verisoulSessionId)
                    sessionAuthData.session_id = verisoulSessionId;

                  await authenticateFraudSession(sessionAuthData, token);
                  console.log(
                    "[FraudDebug] handleFocus re-auth – authenticate called (new backend sessionId in response if success)",
                  );
                }
              }
            }
          }
        } catch (error) {
          console.error(
            "❌ [AuthContext] Error checking fraud session status (non-blocking):",
            error,
          );
        }
      }, 500); // Debounce delay
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
      if (focusTimeoutId) {
        clearTimeout(focusTimeoutId);
      }
    };
    // Use user?._id (primitive) — same reasoning as the data-fetch effect above.
  }, [token, dispatch, user?._id]);

  // useEffect(() => {
  //   // Only fetch if we haven't fetched before
  //   if (onboardingStatus === "idle") {
  //     console.log("🚀 [Onboarding] Preloading all onboarding options...");
  //     dispatch(fetchOnboardingOptions("age_range"));
  //     dispatch(fetchOnboardingOptions("gender"));
  //     dispatch(fetchOnboardingOptions("game_preferences"));
  //     dispatch(fetchOnboardingOptions("game_style"));
  //     dispatch(fetchOnboardingOptions("dealy_game"));
  //   }
  // }, [dispatch, onboardingStatus]);

  // Gatekeeper logic for routing (No changes needed here)
  useEffect(() => {
    if (isLoading) return;
    if (pathname === "/") return;

    // ✅ FIX: Skip gatekeeper during NEW USER onboarding flow
    if (isNewUserFlow) return;

    // Skip gatekeeper while login prefetches are in-flight.
    // handleAuthSuccess sets this true before setUser/setToken and clears it
    // after all Tier 1-3 API calls finish — gatekeeper fires once with data ready.
    if (isLoginRedirectPending) return;

    // Skip gatekeeper logic during auth callback to prevent redirect loop
    if (pathname === "/auth/callback") return;

    const isAuthenticated = !!user;
    const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
      pathname.startsWith(route),
    );
    const isPublicOnlyRoute = PUBLIC_ONLY_ROUTES.some((route) =>
      pathname.startsWith(route),
    );

    // SIMPLE FLOW FOR ANDROID APP:
    // If user is logged in and visits any public-only route (login, signup, welcome, etc.),
    // send them to the homepage (login page navigates immediately on success; this handles other cases).
    if (isAuthenticated && isPublicOnlyRoute) {
      router.replace("/homepage");
      return;
    }

    if (!isAuthenticated && isProtectedRoute) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && isProtectedRoute && isNewUserFlow) {
      setIsNewUserFlow(false);
    }
  }, [
    isLoading,
    user,
    pathname,
    router,
    isNewUserFlow,
    isLoginRedirectPending,
  ]);

  // Hardware back button handler for Capacitor - prevents logout on back navigation
  useEffect(() => {
    let backButtonListener = null;

    // Check if we're in a Capacitor environment
    if (typeof window !== "undefined" && window.Capacitor && App) {
      try {
        backButtonListener = App.addListener("backButton", ({ canGoBack }) => {
          // Always check authentication from localStorage first (most reliable)
          const storedToken = localStorage.getItem("authToken");
          const storedUser = localStorage.getItem("user");
          const isAuthenticated = !!storedToken && !!storedUser;

          if (!isAuthenticated) {
            // Not authenticated - allow default behavior (go to login)
            App.exitApp();
            return;
          }

          // User is authenticated - handle navigation safely
          const currentPath = window.location.pathname;
          const isHomepage = currentPath === "/homepage" || currentPath === "/";
          const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
            currentPath.startsWith(route),
          );

          // Check if we can go back in browser history
          const hasHistory = window.history.length > 1;

          if (hasHistory && !isHomepage) {
            // Has history and not on homepage - navigate back
            router.back();
          } else if (isHomepage) {
            // On homepage with no history or can't go back - exit app
            App.exitApp();
          } else if (isProtectedRoute) {
            // On protected route with no history - go to homepage instead of login
            router.push("/homepage");
          } else {
            // On public route - navigate to homepage
            router.push("/homepage");
          }
        });
      } catch (error) {
        console.warn("⚠️ Hardware back button listener not available:", error);
      }
    }

    return () => {
      if (backButtonListener) {
        try {
          if (backButtonListener && typeof backButtonListener === "object") {
            if (typeof backButtonListener.remove === "function") {
              backButtonListener.remove();
            } else if (typeof backButtonListener.unsubscribe === "function") {
              backButtonListener.unsubscribe();
            } else if (typeof backButtonListener.destroy === "function") {
              backButtonListener.destroy();
            }
          } else if (typeof backButtonListener === "function") {
            backButtonListener();
          }
        } catch (error) {
          console.warn("⚠️ Error cleaning up back button listener:", error);
        }
      }
    };
  }, [router, pathname]);

  // Prefetch Daily Rewards current week so data is ready on navigation
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const prefetchDailyRewards = async () => {
      try {
        const existing = localStorage.getItem("daily_rewards_current_week");
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (
              parsed?.cacheTime &&
              Date.now() - parsed.cacheTime < 5 * 60 * 1000
            ) {
              return; // Fresh cache exists
            }
          } catch (_) {}
        }

        // Use centralized API function; silent so 5xx prefetch errors don't log to console
        const data = await getDailyRewardsWeek(null, token, { silent: true });
        if (data?.success && data?.data) {
          const cacheData = { data: data.data, cacheTime: Date.now() };
          localStorage.setItem(
            "daily_rewards_current_week",
            JSON.stringify(cacheData),
          );
        }
      } catch (_) {
        // ignore prefetch errors
      }
    };
    prefetchDailyRewards();
    return () => controller.abort();
  }, [token]);

  // Prefetch Walkathon data so it's ready on navigation
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    const prefetchWalkathon = async () => {
      try {
        const existing = localStorage.getItem("walkathon_cache");
        if (existing) {
          try {
            const parsed = JSON.parse(existing);
            if (parsed?.cacheTime && Date.now() - parsed.cacheTime < 5 * 60 * 1000) {
              return; // Fresh cache exists
            }
          } catch (_) {}
        }

        const data = await getWalkathonStatus(token);
        if (data?.success && data?.data?.hasActiveWalkathon) {
          const { data: walkathonData } = data;
          const cacheData = {
            data: {
              walkathon: walkathonData.walkathon,
              progress: walkathonData.userProgress?.progress || null,
              leaderboard: [],
              userRank: walkathonData.userProgress?.userRank || null,
              timeRemaining: walkathonData.userProgress?.timeRemaining || null,
              isJoined: walkathonData.userProgress?.hasProgress || false,
              isEligible: walkathonData.eligibility?.isEligible || false,
            },
            cacheTime: Date.now(),
          };
          localStorage.setItem("walkathon_cache", JSON.stringify(cacheData));

          // Also prefetch leaderboard in background
          const leaderboardData = await getWalkathonLeaderboard(token);
          if (leaderboardData?.success && leaderboardData?.data) {
            try {
              const cached = localStorage.getItem("walkathon_cache");
              if (cached) {
                const parsed = JSON.parse(cached);
                if (parsed?.data) {
                  parsed.data.leaderboard = leaderboardData.data.leaderboard || [];
                  parsed.data.totalParticipants = leaderboardData.data.totalParticipants;
                  localStorage.setItem("walkathon_cache", JSON.stringify(parsed));
                }
              }
            } catch (_) {}
          }
        }
      } catch (_) {
        // ignore prefetch errors
      }
    };
    prefetchWalkathon();
    return () => controller.abort();
  }, [token]);

  const handleAuthSuccess = useCallback(
    async (data) => {
      // Log the full response structure for debugging
      console.log("🔍 [AuthContext] handleAuthSuccess received:", {
        hasData: !!data,
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : [],
        fullData: data,
      });

      // Extract token and user - handle multiple possible response structures:
      // 1. { token, user } - direct structure
      // 2. { data: { token, user } } - nested in data
      // 3. { success: true, data: { token, user } } - API response wrapper
      // 4. { success: true, token, user } - API response with token/user at top level
      let token = null;
      let user = null;

      // Try direct access first
      if (data?.token) token = data.token;
      if (data?.user) user = data.user;

      // Try nested in data object
      if (!token && data?.data?.token) token = data.data.token;
      if (!user && data?.data?.user) user = data.data.user;

      // Try alternative nested structures
      if (!token && data?.response?.token) token = data.response.token;
      if (!user && data?.response?.user) user = data.response.user;

      // Validate token and user before proceeding
      if (!token || !user) {
        // Enhanced error logging with full response structure
        const errorDetails = {
          hasToken: !!token,
          hasUser: !!user,
          tokenValue: token
            ? typeof token === "string"
              ? token.substring(0, 20) + "..."
              : String(token)
            : null,
          userValue: user
            ? typeof user === "object"
              ? Object.keys(user)
              : String(user)
            : null,
          dataKeys: data ? Object.keys(data) : [],
          dataType: typeof data,
          hasSuccess: !!data?.success,
          successValue: data?.success,
          hasError: !!data?.error,
          errorValue: data?.error,
          hasMessage: !!data?.message,
          messageValue: data?.message,
          fullDataStructure: JSON.stringify(data, null, 2).substring(0, 1000),
        };

        console.error("❌ [AuthContext] Invalid auth data:", errorDetails);

        // Provide more helpful error message
        const errorMessage =
          data?.error?.message ||
          data?.error ||
          data?.message ||
          "Invalid authentication data received from server";

        throw new Error(errorMessage);
      }

      // CRITICAL: Save to localStorage FIRST (synchronously) before setting state
      // This ensures token is available immediately for navigation
      try {
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(user));
        console.log("✅ [AuthContext] Token saved to localStorage");
      } catch (err) {
        console.error("❌ Failed to save to localStorage", err);
        throw new Error("Failed to persist authentication token");
      }

      // Suppress the gatekeeper redirect until all prefetch data is ready.
      setIsLoginRedirectPending(true);
      setUser(user);
      setToken(token); // Setting the token here triggers the Redux fetch effect above

      // Sync my-games in background after login/signup (non-blocking)
      syncMyGames(token).catch(() => {});

      // INDUSTRIAL: Run Verisoul fraud auth AFTER first paint (non-blocking)
      (async () => {
        try {
          const deviceMetadata = await getDeviceMetadata();
          let verisoulSessionId = await getVerisoulSessionId();
          const isFallback = (id) =>
            typeof id === "string" && id.startsWith("fallback_");
          if (verisoulSessionId) {
            const reinitResult = await reinitializeVerisoulSession();
            if (reinitResult?.sessionId)
              verisoulSessionId = reinitResult.sessionId;
            if (isFallback(verisoulSessionId)) {
              await new Promise((r) => setTimeout(r, 500));
              const retrySessionId = await getVerisoulSessionId();
              if (retrySessionId && !isFallback(retrySessionId))
                verisoulSessionId = retrySessionId;
            }
          }
          if (verisoulSessionId && isFallback(verisoulSessionId))
            verisoulSessionId = null;
          const sessionAuthData = {
            accountId: user.email || user.mobile || user._id || user.id,
            email: user.email || "",
            metadata: {
              deviceId: deviceMetadata.deviceId,
              appVersion: deviceMetadata.appVersion,
              deviceModel: deviceMetadata.deviceModel,
              osVersion: deviceMetadata.osVersion,
              platform: deviceMetadata.platform,
              userAgent: deviceMetadata.userAgent,
              language: deviceMetadata.language,
              timezone: deviceMetadata.timezone,
              loginTime: new Date().toISOString(),
            },
            group: user.group || user.userGroup || "regular_users",
          };
          if (verisoulSessionId) sessionAuthData.session_id = verisoulSessionId;
          if (user.createdAt || user.created_at) {
            sessionAuthData.metadata.signupDate =
              user.createdAt || user.created_at;
          }
          const fraudResponse = await authenticateFraudSession(
            sessionAuthData,
            token,
          );
          if (fraudResponse?.success && fraudResponse?.sessionId) {
            localStorage.setItem(
              "verisoul_session_id",
              fraudResponse.sessionId,
            );
          }
        } catch (error) {
          console.error(
            "❌ [AuthContext] Error authenticating fraud session (non-blocking):",
            error,
          );
        }
      })();

      // IMPORTANT: Store user data in Redux profile immediately after login
      // This ensures age and gender are available immediately for game fetching
      if (user && (user.age || user.ageRange || user.gender || user._id)) {
        dispatch({
          type: "profile/setUserFromLogin",
          payload: user,
        });
      }

      // PREFETCH: Load every API used on the home screen before navigating.
      // Navigation only happens after all responses are received — no loading states on home screen.
      if (token) {
        // TIER 1 — Profile first: user data (age/gender) is required by game section fetches
        await dispatch(fetchUserProfile({ token }));

        // TIER 2 — Progress bar data: wallet balance + profile stats + XP tier in parallel
        await Promise.allSettled([
          dispatch(fetchWalletScreen({ token })),
          dispatch(fetchProfileStats({ token })),
          getXPTierProgressBar(token).then((response) => {
            if (
              response?.success &&
              response?.data &&
              typeof window !== "undefined"
            ) {
              try {
                localStorage.setItem(
                  "xpTierProgressBar",
                  JSON.stringify({
                    data: response.data,
                    timestamp: Date.now(),
                  }),
                );
              } catch (_) {}
            }
            return response;
          }),
        ]);

        // TIER 3 — All remaining homepage sections in parallel
        await Promise.allSettled([
          // Non-gaming offers (NonGameOffersSection)
          dispatch(
            fetchNonGameOffers({ token, offerType: "cashback_shopping" }),
          ),
          // Surveys (SurveysSection)
          dispatch(fetchSurveys({ token })),
          // VIP status (VipBanner)
          dispatch(fetchVipStatus(token)),
          // User game data (useHomepageData / inProgressGames)
          ...(user && user._id
            ? [
                dispatch(fetchUserData({ userId: user._id, token })),
                // Swipe games (GameCard)
                dispatch(
                  fetchGamesBySection({
                    uiSection: "Swipe",
                    user,
                    page: 1,
                    limit: 10,
                    token,
                  }),
                ),
                // Most Played games (MostPlayedGames)
                dispatch(
                  fetchGamesBySection({
                    uiSection: "Most Played",
                    user,
                    page: 1,
                    limit: 10,
                    token,
                  }),
                ),
              ]
            : []),
        ]);
      }

      // All Tier 1-3 data is now in Redux. Clear the flag so the gatekeeper
      // fires once and redirects to /homepage with everything already loaded.
      setIsLoginRedirectPending(false);

      // Welcome bonus tasks/timer in background (don't block navigation)
      if (token) {
        getWelcomeBonusTasks(token)
          .then((response) => {
            if (
              response?.success &&
              response?.data &&
              typeof window !== "undefined"
            ) {
              try {
                localStorage.setItem(
                  "welcomeBonusTasks",
                  JSON.stringify({
                    data: response.data,
                    timestamp: Date.now(),
                  }),
                );
              } catch (_) {}
            }
          })
          .catch(() => {});
        getWelcomeBonusTimer(token)
          .then((data) => {
            if (!data || data.success === false) return;
            const inner = data?.data;
            const timer = inner?.timer || data?.timer;
            const msg = inner?.message ?? data?.message ?? data?.msg ?? "";
            const isActive = inner?.isActive;
            let end = null;
            if (inner && typeof inner === "object" && inner.isActive === false)
              end = Date.now() - 1000;
            else if (timer && typeof timer === "object") {
              if (timer.isExpired === true) end = Date.now() - 1000;
              else if (
                typeof timer.timeUntilExpiry === "number" &&
                timer.timeUntilExpiry > 0
              )
                end = Date.now() + timer.timeUntilExpiry;
              else if (timer.completionDeadline) {
                const t = new Date(timer.completionDeadline).getTime();
                if (!isNaN(t) && t > Date.now()) end = t;
              }
            }
            if (typeof window !== "undefined") {
              try {
                localStorage.setItem(
                  "welcomeBonusTimer",
                  JSON.stringify({
                    message: msg,
                    endTime: end,
                    isActive,
                    timestamp: Date.now(),
                  }),
                );
              } catch (_) {}
            }
          })
          .catch(() => {});
      }

      return { ok: true, user };
      // dispatch is stable (Redux guarantee); all other deps are imported module-level
      // constants or stable setState functions — safe to use empty deps.
    },
    [dispatch],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const signIn = async (emailOrMobile, password, turnstileToken = null) => {
    try {
      let data = await login(emailOrMobile, password, turnstileToken);

      // Log the raw login response for debugging
      console.log("🔍 [AuthContext] Login API response:", {
        hasData: !!data,
        dataType: typeof data,
        dataKeys: data ? Object.keys(data) : [],
        hasToken: !!data?.token,
        hasUser: !!data?.user,
        hasDataData: !!data?.data,
        dataDataKeys: data?.data ? Object.keys(data.data) : [],
        hasSuccess: !!data?.success,
        successValue: data?.success,
        fullResponse: data,
      });

      // Check if biometric verification is required - MUST check this BEFORE error check
      const biometricRequired =
        data?.biometricRequired === true ||
        data?.data?.biometricRequired === true;
      const biometricToken = data?.biometricToken || data?.data?.biometricToken;

      console.log("🔍 [AuthContext] Checking biometric requirement:", {
        biometricRequired,
        biometricToken: biometricToken ? "present" : "missing",
        hasToken: !!data?.token,
        hasUser: !!data?.user,
      });

      if (biometricRequired) {
        console.log(
          "🔐 [AuthContext] Biometric verification required, triggering device biometric...",
        );

        // Check if we're on a native platform (biometric only works on native)
        if (
          typeof window !== "undefined" &&
          window.Capacitor &&
          window.Capacitor.isNativePlatform()
        ) {
          try {
            const { authenticateWithBiometric } =
              await import("@/lib/biometricAuth");

            // Trigger device biometric verification
            const biometricResult = await authenticateWithBiometric({
              reason: "Complete login to your Jackson account",
              title: "Biometric Verification",
              subtitle: "Verify your identity to continue",
              description: "Use your biometric to complete login",
            });

            if (!biometricResult.success) {
              console.error(
                "❌ [AuthContext] Biometric verification failed:",
                biometricResult.error,
              );
              return {
                ok: false,
                error:
                  biometricResult.error ||
                  "Biometric verification failed. Please try again.",
              };
            }

            console.log(
              "✅ [AuthContext] Biometric verification successful, retrying login...",
            );

            // Retry login after successful biometric verification
            // The backend should now allow login after device biometric is verified
            const retryData = await login(
              emailOrMobile,
              password,
              turnstileToken,
            );

            // Log the retry response
            console.log("🔍 [AuthContext] Login retry response:", {
              hasToken: !!retryData?.token,
              hasUser: !!retryData?.user,
              biometricRequired: retryData?.biometricRequired,
            });

            // Check if retry was successful
            const retryHasToken = !!(
              retryData?.token || retryData?.data?.token
            );
            const retryHasUser = !!(retryData?.user || retryData?.data?.user);

            if (!retryHasToken || !retryHasUser) {
              console.error(
                "❌ [AuthContext] Login retry failed after biometric verification",
              );
              return {
                ok: false,
                error:
                  retryData?.error ||
                  retryData?.message ||
                  "Login failed after biometric verification. Please try again.",
              };
            }

            // Use the retry data for the rest of the flow
            data = retryData;
          } catch (biometricError) {
            console.error(
              "❌ [AuthContext] Error during biometric verification:",
              biometricError,
            );
            return {
              ok: false,
              error:
                biometricError.message ||
                "Biometric verification failed. Please try again.",
            };
          }
        } else {
          // Not on native platform - return error asking user to complete biometric on mobile app
          console.warn(
            "⚠️ [AuthContext] Biometric required but not on native platform",
          );
          return {
            ok: false,
            error:
              data?.message ||
              "Biometric verification is required. Please use the mobile app to complete login.",
          };
        }
      }

      // Check if login was successful - handle multiple error response patterns
      // Pattern 1: { success: false, error: {...}, message: "..." }
      // Pattern 2: { success: false, body: {...}, error: {...} }
      // Pattern 3: { error: "...", message: "...", status: ... }
      // Pattern 4: { success: false, ... } without token/user
      // IMPORTANT: Exclude biometricRequired responses from error check - they are handled above
      const isBiometricResponse =
        data?.biometricRequired === true ||
        data?.data?.biometricRequired === true;
      const isErrorResponse =
        !isBiometricResponse &&
        (data?.success === false ||
          (data?.error &&
            !data?.token &&
            !data?.user &&
            !data?.data?.token &&
            !data?.data?.user) ||
          (!data?.token &&
            !data?.user &&
            !data?.data?.token &&
            !data?.data?.user &&
            (data?.error || data?.message)));

      if (isErrorResponse) {
        console.error("❌ [AuthContext] Login API returned error:", data);
        const errorMessage =
          data?.error?.message ||
          data?.error ||
          data?.body?.error ||
          data?.message ||
          "Login failed";
        return {
          ok: false,
          error:
            typeof errorMessage === "string"
              ? errorMessage
              : errorMessage?.message || "Login failed",
        };
      }

      // Additional validation: ensure we have token and user before proceeding
      const hasToken = !!(data?.token || data?.data?.token);
      const hasUser = !!(data?.user || data?.data?.user);

      if (!hasToken || !hasUser) {
        console.error(
          "❌ [AuthContext] Login response missing token or user:",
          {
            hasToken,
            hasUser,
            dataKeys: data ? Object.keys(data) : [],
            responseStructure: JSON.stringify(data, null, 2).substring(0, 500),
          },
        );
        return {
          ok: false,
          error:
            data?.error ||
            data?.message ||
            "Invalid response from server. Missing authentication data.",
        };
      }

      localStorage.setItem("permissionsAccepted", "true");
      // Purge persisted state to avoid showing previous account balances
      try {
        localStorage.removeItem("persist:root");
        localStorage.removeItem("persist:walletTransactions");
        localStorage.removeItem("persist:profile");
        localStorage.removeItem("persist:accountOverview");
      } catch (_) {}
      // Clear Redux slices proactively
      dispatch(clearWalletTransactions());
      dispatch(clearProfile());
      dispatch(clearAccountOverview());

      // Save credentials for biometric login (following capacitor-native-biometric documentation)
      // Only save if on native platform
      if (
        typeof window !== "undefined" &&
        window.Capacitor &&
        window.Capacitor.isNativePlatform()
      ) {
        try {
          const {
            setCredentials,
            enableBiometricLocally,
            checkBiometricAvailability,
          } = await import("@/lib/biometricAuth");

          // Check if biometric is available before saving
          const availability = await checkBiometricAvailability();
          if (availability.isAvailable) {
            // IMPORTANT: Check if we're logging in with a different account
            // If so, we need to delete old credentials first to avoid conflicts
            try {
              const { Preferences } = await import("@capacitor/preferences");
              const storedUsername = await Preferences.get({
                key: "biometric_username",
              });

              // Note: We no longer delete old credentials when a different user logs in
              // This allows credentials to persist and be overwritten by setCredentials()
              // Multi-account support is handled by per-user server strings in biometricAuth.js
            } catch (prefError) {
              console.warn(
                "⚠️ [AuthContext] Could not check stored username:",
                prefError,
              );
              // Continue anyway - try to save new credentials
            }

            // First, check if there are pending credentials from face verification
            // These might have failed to save due to UserNotAuthenticatedException
            const pendingCredentials = localStorage.getItem(
              "biometricCredentialsPending",
            );
            const pendingCredentialsData = localStorage.getItem(
              "biometricCredentialsData",
            );

            let credentialResult = null;

            if (pendingCredentials === "true" && pendingCredentialsData) {
              try {
                console.log(
                  "🔄 [AuthContext] Retrying to save pending biometric credentials...",
                );
                const credentialsData = JSON.parse(pendingCredentialsData);

                // Check if pending credentials match current user
                if (credentialsData.username === emailOrMobile) {
                  credentialResult = await setCredentials({
                    username: credentialsData.username,
                    password: credentialsData.password,
                  });

                  if (credentialResult.success) {
                    console.log(
                      "✅ [AuthContext] Pending credentials saved successfully!",
                    );
                    // Clear pending flags
                    localStorage.removeItem("biometricCredentialsPending");
                    localStorage.removeItem("biometricCredentialsData");

                    // Get biometric type from localStorage (set during face verification)
                    const biometricType =
                      localStorage.getItem("biometricType") ||
                      availability.biometryTypeName;
                    enableBiometricLocally(biometricType);
                  } else {
                    console.warn(
                      "⚠️ [AuthContext] Failed to save pending credentials:",
                      credentialResult.error,
                    );
                    // If still fails, fall through to normal credential saving
                  }
                } else {
                  console.log(
                    "🔄 [AuthContext] Pending credentials are for a different user, clearing them...",
                  );
                  localStorage.removeItem("biometricCredentialsPending");
                  localStorage.removeItem("biometricCredentialsData");
                  // Fall through to normal credential saving
                }
              } catch (parseError) {
                console.error(
                  "❌ [AuthContext] Error parsing pending credentials:",
                  parseError,
                );
                // Clear invalid pending credentials
                localStorage.removeItem("biometricCredentialsPending");
                localStorage.removeItem("biometricCredentialsData");
                // Fall through to normal credential saving
              }
            }

            // If pending credentials weren't saved or don't exist, save current credentials
            if (!credentialResult || !credentialResult.success) {
              console.log(
                "💾 [AuthContext] Saving biometric credentials for current login...",
              );
              console.log("💾 [AuthContext] Raw login response structure:", {
                hasData: !!data,
                hasToken: !!data.token,
                tokenType: typeof data.token,
                tokenValue: data.token
                  ? typeof data.token === "string"
                    ? data.token.substring(0, 50)
                    : String(data.token).substring(0, 50)
                  : "null",
                hasUser: !!data.user,
                hasDataData: !!data.data,
                dataKeys: data ? Object.keys(data) : "null",
                nestedDataKeys: data?.data ? Object.keys(data.data) : "null",
              });

              // Extract token and user using the SAME pattern as handleAuthSuccess
              // handleAuthSuccess does: const { token, user } = data;
              // So we should extract the same way to ensure consistency
              let actualToken = data.token;
              let actualUser = data.user;

              // If not at top level, check nested data (defensive fallback)
              if (!actualToken && data.data) {
                actualToken = data.data.token;
                actualUser = data.data.user;
              }

              // Log the raw values before any processing
              console.log("💾 [AuthContext] Token extraction:", {
                rawToken: actualToken,
                tokenType: typeof actualToken,
                tokenIsString: typeof actualToken === "string",
                tokenLength:
                  actualToken?.length ||
                  (typeof actualToken === "object" ? "N/A (object)" : 0),
                hasUser: !!actualUser,
                userType: typeof actualUser,
                userKeys: actualUser
                  ? Object.keys(actualUser).slice(0, 5)
                  : "null",
              });

              // Handle cases where token might be an object (shouldn't happen, but defensive coding)
              if (actualToken && typeof actualToken === "object") {
                console.error(
                  "❌ [AuthContext] Token is an object instead of string!",
                  {
                    tokenKeys: Object.keys(actualToken),
                    tokenStringified: JSON.stringify(actualToken).substring(
                      0,
                      100,
                    ),
                  },
                );
                console.warn(
                  "⚠️ [AuthContext] Attempting to extract token string from object...",
                );
                // Try common patterns where token might be nested in an object
                if (
                  actualToken.token &&
                  typeof actualToken.token === "string"
                ) {
                  actualToken = actualToken.token;
                  console.log(
                    "✅ [AuthContext] Extracted token string from token.token",
                  );
                } else if (
                  actualToken.value &&
                  typeof actualToken.value === "string"
                ) {
                  actualToken = actualToken.value;
                  console.log(
                    "✅ [AuthContext] Extracted token string from token.value",
                  );
                } else if (
                  actualToken.accessToken &&
                  typeof actualToken.accessToken === "string"
                ) {
                  actualToken = actualToken.accessToken;
                  console.log(
                    "✅ [AuthContext] Extracted token string from token.accessToken",
                  );
                } else {
                  // Last resort: check if it's a stringified JSON that needs parsing
                  try {
                    const parsed = JSON.parse(JSON.stringify(actualToken));
                    if (typeof parsed === "string" && parsed.length > 0) {
                      actualToken = parsed;
                      console.log(
                        "⚠️ [AuthContext] Extracted token via JSON stringify/parse (last resort)",
                      );
                    } else {
                      console.error(
                        "❌ [AuthContext] Cannot extract valid token from object:",
                        actualToken,
                      );
                      actualToken = null;
                    }
                  } catch (e) {
                    console.error(
                      "❌ [AuthContext] Failed to extract token from object:",
                      e,
                    );
                    actualToken = null;
                  }
                }
              }

              // Declare passwordString in outer scope for pending credentials storage
              let passwordString = null;

              // Validate and normalize token - must be a non-empty string
              // Convert token to string if it's not already (handle edge cases)
              if (actualToken && typeof actualToken !== "string") {
                // Token is not a string - try to convert or extract
                if (typeof actualToken === "object") {
                  // Try common patterns where token string might be nested
                  const tokenString =
                    actualToken.token ||
                    actualToken.value ||
                    actualToken.accessToken ||
                    actualToken.jwt;
                  if (
                    tokenString &&
                    typeof tokenString === "string" &&
                    tokenString.trim().length > 0
                  ) {
                    actualToken = tokenString.trim();
                    console.log(
                      "✅ [AuthContext] Extracted token string from object:",
                      actualToken.substring(0, 20) + "...",
                    );
                  } else {
                    // Try JSON stringify as last resort (unlikely but handles edge cases)
                    try {
                      const stringified = JSON.stringify(actualToken);
                      if (
                        stringified &&
                        stringified !== "{}" &&
                        stringified.length > 10
                      ) {
                        actualToken = stringified;
                        console.log(
                          "⚠️ [AuthContext] Using stringified token object as fallback",
                        );
                      } else {
                        console.error(
                          "❌ [AuthContext] Cannot extract valid token string from object:",
                          actualToken,
                        );
                        actualToken = null;
                      }
                    } catch (e) {
                      console.error(
                        "❌ [AuthContext] Failed to stringify token object:",
                        e,
                      );
                      actualToken = null;
                    }
                  }
                } else {
                  // Convert to string if it's a number or other type
                  actualToken = String(actualToken);
                  console.log(
                    "✅ [AuthContext] Converted token to string:",
                    typeof actualToken,
                  );
                }
              }

              // Final validation: token must be a non-empty string
              if (
                !actualToken ||
                typeof actualToken !== "string" ||
                actualToken.trim().length === 0
              ) {
                console.error(
                  "❌ [AuthContext] Invalid token for credential storage after normalization:",
                  {
                    hasToken: !!actualToken,
                    tokenType: typeof actualToken,
                    tokenLength: actualToken?.length || 0,
                    tokenPreview: actualToken
                      ? typeof actualToken === "string"
                        ? actualToken.substring(0, 30)
                        : String(actualToken).substring(0, 30)
                      : "null",
                    hasDataToken: !!data.token,
                    hasNestedToken: !!data.data?.token,
                    dataTokenType: typeof data.token,
                  },
                );
                console.warn(
                  "⚠️ [AuthContext] Cannot save biometric credentials - invalid token",
                );
                // Don't throw - just skip credential saving
              } else if (
                !actualUser ||
                typeof actualUser !== "object" ||
                Object.keys(actualUser).length === 0 ||
                !actualUser._id
              ) {
                console.error(
                  "❌ [AuthContext] Invalid user object for credential storage:",
                  {
                    hasUser: !!actualUser,
                    userType: typeof actualUser,
                    userKeys: actualUser ? Object.keys(actualUser) : "null",
                    hasUserId: !!actualUser?._id,
                    hasDataUser: !!data.user,
                    hasNestedUser: !!data.data?.user,
                  },
                );
                console.warn(
                  "⚠️ [AuthContext] Cannot save biometric credentials - invalid user",
                );
                // Don't throw - just skip credential saving
              } else {
                // Save credentials securely using native biometric storage
                // Store username and a JSON string containing token and user data
                // This way we don't rely on localStorage for user data during biometric login
                const credentialPayload = {
                  token: actualToken.trim(), // Use validated token
                  user: actualUser, // Use validated user
                };

                // Validate payload before stringifying to prevent "{}" issue
                if (
                  !credentialPayload.token ||
                  !credentialPayload.user ||
                  Object.keys(credentialPayload.user).length === 0
                ) {
                  console.error(
                    "❌ [AuthContext] Credential payload is invalid after creation",
                  );
                  console.warn(
                    "⚠️ [AuthContext] Cannot save biometric credentials - invalid payload",
                  );
                  // Don't throw - just skip credential saving
                } else {
                  // Stringify and validate the result
                  passwordString = JSON.stringify(credentialPayload);
                  if (
                    !passwordString ||
                    passwordString === "{}" ||
                    passwordString === "null"
                  ) {
                    console.error(
                      "❌ [AuthContext] Credential payload stringified to invalid value:",
                      passwordString,
                    );
                    console.warn(
                      "⚠️ [AuthContext] Cannot save biometric credentials - invalid stringified payload",
                    );
                    passwordString = null; // Reset to null to prevent use
                    // Don't throw - just skip credential saving
                  } else {
                    console.log(
                      "💾 [AuthContext] Credential payload validated successfully",
                    );
                    console.log(
                      "💾 [AuthContext] Token length:",
                      actualToken.length,
                    );
                    console.log("💾 [AuthContext] User ID:", actualUser._id);
                    console.log(
                      "💾 [AuthContext] Password string length:",
                      passwordString.length,
                    );
                    console.log(
                      "💾 [AuthContext] Password string preview:",
                      passwordString.substring(0, 100) + "...",
                    );

                    credentialResult = await setCredentials({
                      username: emailOrMobile,
                      password: passwordString, // Use validated stringified payload
                    });
                  }
                }
              }

              if (credentialResult && credentialResult.success) {
                // Enable biometric locally
                enableBiometricLocally(availability.biometryTypeName);
                // Clear any pending credentials flags since we successfully saved new ones
                localStorage.removeItem("biometricCredentialsPending");
                localStorage.removeItem("biometricCredentialsData");

                // Update stored username in Preferences
                try {
                  const { Preferences } =
                    await import("@capacitor/preferences");
                  await Preferences.set({
                    key: "biometric_username",
                    value: emailOrMobile,
                  });
                  console.log(
                    "✅ [AuthContext] Updated biometric username in Preferences",
                  );
                } catch (prefError) {
                  console.warn(
                    "⚠️ [AuthContext] Failed to update username in Preferences:",
                    prefError,
                  );
                }
              } else if (credentialResult) {
                console.warn(
                  "⚠️ [AuthContext] Failed to save biometric credentials to Keystore:",
                  credentialResult.error,
                );
                console.warn(
                  "⚠️ [AuthContext] Error code:",
                  credentialResult.errorCode,
                );

                // IMPORTANT: Save username to Preferences even if Keystore save failed
                // This is critical because credentials are saved to Preferences backup,
                // and hasBiometricCredentials() checks for username in Preferences
                // Without this, biometric login won't work even though credentials exist in backup
                try {
                  const { Preferences } =
                    await import("@capacitor/preferences");
                  await Preferences.set({
                    key: "biometric_username",
                    value: emailOrMobile,
                  });
                  console.log(
                    "✅ [AuthContext] Saved biometric username to Preferences (Keystore save failed, but credentials exist in backup)",
                  );
                } catch (prefError) {
                  console.warn(
                    "⚠️ [AuthContext] Failed to update username in Preferences:",
                    prefError,
                  );
                }

                // If device authentication is required, store credentials for retry
                // Only store if we have a valid passwordString
                if (credentialResult.requiresDeviceAuth && passwordString) {
                  console.warn(
                    "⚠️ [AuthContext] Device authentication required - credentials will be saved on next login",
                  );
                  localStorage.setItem("biometricCredentialsPending", "true");
                  localStorage.setItem(
                    "biometricCredentialsData",
                    JSON.stringify({
                      username: emailOrMobile,
                      password: passwordString, // Use validated stringified payload
                    }),
                  );
                }
              }
            }
          }
        } catch (biometricError) {
          console.error(
            "❌ [AuthContext] Error setting up biometric:",
            biometricError,
          );
          // Don't fail login if biometric setup fails
        }
      }

      return handleAuthSuccess(data);
    } catch (error) {
      return { ok: false, error: error.body || { error: error.message } };
    }
  };

  const signUpAndSignIn = async (signupData) => {
    try {
      const data = await signup(signupData);

      // Check if signup returned an error response
      if (
        !data ||
        data.success === false ||
        (!data.token && !data.data?.token)
      ) {
        // If it's an error response, return it directly
        if (data && data.success === false) {
          return {
            ok: false,
            error: data.body || { error: data.error || "Signup failed" },
          };
        }

        // Otherwise, it's an invalid response structure
        console.error("❌ [AuthContext] Signup response missing token:", data);
        return {
          ok: false,
          error: {
            error: "Invalid response from server. Please try again.",
            message: "Server response missing authentication token",
          },
        };
      }

      useOnboardingStore.getState().resetOnboarding();
      setIsNewUserFlow(true);

      // Clear permission/location flags for new signups so they go through the flow
      localStorage.removeItem("permissionsAccepted");
      localStorage.removeItem("onboardingComplete");
      localStorage.removeItem("locationCompleted");
      localStorage.removeItem("faceVerificationCompleted");
      localStorage.removeItem("faceVerificationSkipped");

      // DON'T save biometric credentials here for new users
      // New users will go through: Permissions → Location → Face Verification
      // Biometric credentials will be saved AFTER face verification is complete
      // This ensures proper onboarding flow

      // handleAuthSuccess saves token to localStorage synchronously before returning
      const result = await handleAuthSuccess(data);

      // Merge onboarding fields into the saved user — backend signup response
      // may return null for these fields even though they were submitted.
      try {
        const savedUser = JSON.parse(localStorage.getItem("user") || "{}");
        const mergedUser = {
          ...savedUser,
          ...(signupData.gender != null && { gender: signupData.gender }),
          ...(signupData.ageRange != null && { age: signupData.ageRange }),
          ...(signupData.gamePreferences != null && {
            gamePreferences: signupData.gamePreferences,
          }),
          ...(signupData.gameStyle != null && {
            gameStyle: signupData.gameStyle,
          }),
          ...(signupData.improvementArea != null && {
            improvementArea: signupData.improvementArea,
          }),
          ...(signupData.dailyEarningGoal != null && {
            dailyEarningGoal: signupData.dailyEarningGoal,
          }),
        };
        setUser(mergedUser);
        localStorage.setItem("user", JSON.stringify(mergedUser));
      } catch (e) {}

      // Verify token was saved
      const savedToken = localStorage.getItem("authToken");
      if (!savedToken) {
        console.error(
          "❌ [AuthContext] Token not found in localStorage after handleAuthSuccess",
        );
        return {
          ok: false,
          error: {
            error: "Failed to save authentication token. Please try again.",
            message: "Token persistence failed",
          },
        };
      }

      // 🔥 FETCH ONBOARDING OPTIONS ONCE (RIGHT HERE)
      await Promise.all([
        dispatch(fetchOnboardingOptions("age_range")),
        dispatch(fetchOnboardingOptions("gender")),
        dispatch(fetchOnboardingOptions("game_preferences")),
        dispatch(fetchOnboardingOptions("game_style")),
        dispatch(fetchOnboardingOptions("dealy_game")),
      ]);

      router.replace("/select-age"); // or first onboarding route

      return result;
    } catch (error) {
      console.error("❌ [AuthContext] Signup error:", error);
      return { ok: false, error: error.body || { error: error.message } };
    }
  };

  // MODIFIED: signOut clears the profile state in the Redux store but KEEPS biometric credentials
  // Biometric credentials are preserved so users can login with biometric after signout
  const signOut = async () => {
    // End Verisoul fraud prevention session before clearing data
    try {
      const storedSessionId = localStorage.getItem("verisoul_session_id");
      const currentToken = token || localStorage.getItem("authToken");
      console.log(
        "[FraudDebug] signOut – backend sessionId to unauthenticate:",
        storedSessionId ? `${storedSessionId.slice(0, 8)}...` : "none",
      );

      if (storedSessionId && currentToken) {
        await unauthenticateFraudSession(storedSessionId, currentToken);
        console.log("✅ [AuthContext] Fraud session unauthenticated");
        console.log(
          "[FraudDebug] signOut – POST unauthenticate sent with backend sessionId",
        );
      }
    } catch (error) {
      console.error(
        "❌ [AuthContext] Error unauthenticating fraud session (non-blocking):",
        error,
      );
    }

    // Clear Verisoul session ID
    clearVerisoulSessionId();
    console.log(
      "[FraudDebug] signOut – cleared localStorage verisoul_session_id",
    );

    // Clear all Redux state first
    dispatch(clearProfile()); // Clear profile data
    dispatch(clearGames()); // Clear games data (includes userData, gamesBySection, imageCache, etc.)
    dispatch(clearWalletTransactions()); // Clear wallet transactions
    dispatch(clearAccountOverview()); // Clear account overview
    dispatch(clearSurveys()); // Clear surveys data
    dispatch(clearNonGameOffers()); // Clear non-game offers data
    dispatch(resetDailyChallengeState()); // Clear daily challenge (today, calendar, etc.) so new account doesn't see previous user's "Claim reward" / completed state
    clearDealsCache(); // Clear in-memory deals page cache (not in localStorage, must be cleared explicitly)

    // Purge all Redux persist data to prevent QuotaExceededError
    // Use persistor.purge() which properly handles cleanup without serialization issues
    try {
      await persistor.purge();
    } catch (err) {
      console.error("❌ Failed to purge persistor:", err);
    }

    // DON'T clear biometric backup keys from Capacitor Preferences
    // These are needed for fallback when Preferences.get() fails
    // Biometric credentials should persist across logout to allow Face ID login
    // The backup keys (biometric_username_backup, biometric_password_backup) are used as fallback
    console.log(
      "ℹ️ [AuthContext] Keeping biometric backup keys in Capacitor Preferences for Face ID after logout",
    );

    setUser(null);
    setToken(null);

    // DON'T delete biometric credentials on signout
    // This allows users to use biometric login after signout without needing to login manually first
    // Biometric credentials are stored in native secure storage and remain available

    try {
      // Clear authentication data
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
      localStorage.removeItem("onboarding-storage");

      // Clear ALL Redux persist keys (pattern-based to catch all)
      // This prevents QuotaExceededError by ensuring all persist data is removed
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("persist:")) {
          localStorage.removeItem(key);
        }
      });

      // Don't clear permission/location flags on logout
      // Existing users should be able to login without re-doing permissions
      // Only new signups will clear these flags

      // Don't clear biometric flags (biometricEnabled, biometricType) on logout
      // Biometric credentials are preserved in native secure storage
      // This allows users to use biometric login after signout without manual login

      // Clear daily rewards data from localStorage
      // Remove all daily rewards cache entries
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("daily_rewards_")) {
          localStorage.removeItem(key);
        }
      });

      // Clear quest timer data from localStorage
      // Remove all quest timer cache entries
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("questTimer_")) {
          localStorage.removeItem(key);
        }
      });

      // Clear user data cache (userData_${userId})
      // Remove all user data cache entries to prevent showing previous user's data
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("userData_")) {
          localStorage.removeItem(key);
        }
      });

      // Clear XP tier progress bar cache
      localStorage.removeItem("xpTierProgressBar");
      localStorage.removeItem("xpTierProgressBarRace");

      // Clear game-related cache data
      localStorage.removeItem("featuredGamesData");
      localStorage.removeItem("selectedGameData");
      localStorage.removeItem("gameCard_undoCount");
      localStorage.removeItem("gameCard_swipeHistory");
      localStorage.removeItem("gamePreferences");
      localStorage.removeItem("lastBoosterAdWatched");

      // Clear countdown timer cache
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith("countdownTimer") || key === "countdownTimer") {
          localStorage.removeItem(key);
        }
      });

      // Clear account overview cache so next login gets fresh API data
      localStorage.removeItem("accountOverviewCache");

      // Clear session manager data
      localStorage.removeItem("jackson_rewards_sessions");

      // Clear face verification user-specific data (but keep biometric flags)
      localStorage.removeItem("cameraFacePhotoPath");
      localStorage.removeItem("cameraFacePhoto");
      localStorage.removeItem("faceVerificationSkipped");
      // Note: biometricToken, biometricUser, biometric_username, biometric_password are preserved
      // for biometric login functionality
    } catch (err) {
      console.error("❌ Failed to clear localStorage", err);
    }
    router.push("/login");
  };

  // MODIFIED: This function now leverages our Redux thunk for cleaner logic
  const handleSocialAuthCallback = useCallback(
    async (socialToken) => {
      setIsLoading(true);

      try {
        // 1. Fetch profile + location status in PARALLEL (saves ~200-400ms vs sequential)
        const [profileAction, locationResult] = await Promise.allSettled([
          dispatch(fetchUserProfile(socialToken)),
          fetch("https://rewardsuatapi.hireagent.co/api/location/status", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${socialToken}`,
              "Content-Type": "application/json",
            },
          }),
        ]);

        const resultAction =
          profileAction.status === "fulfilled" ? profileAction.value : null;

        if (resultAction && fetchUserProfile.fulfilled.match(resultAction)) {
          const userProfile = resultAction.payload;

          // --- PARSE USER STATUS (Disclosure/Location) ---
          let statusData = { needsDisclosure: true, needsLocation: true }; // Safe defaults

          try {
            if (locationResult.status === "fulfilled") {
              const rawText = await locationResult.value.text();
              try {
                const statusJson = JSON.parse(rawText);
                if (statusJson.success) {
                  statusData = statusJson.data;
                }
              } catch (_) {
                // Silent JSON parse failure
              }
            }
          } catch (_) {
            // Silent network/CORS failure
          }
          // ----------------------------------------------------

          // 2. Handle Auth Success (Save to state/Redux)
          const authResult = await handleAuthSuccess({
            token: socialToken,
            user: userProfile.data?.user || userProfile.user || userProfile,
          });

          return {
            ...authResult,
            statusData,
          };
        } else {
          const payload = resultAction?.payload;
          const backendMessage =
            typeof payload === "string"
              ? payload
              : (payload?.message ??
                payload?.error ??
                (payload && typeof payload === "object"
                  ? JSON.stringify(payload)
                  : "Social auth profile fetch failed"));
          throw new Error(backendMessage);
        }
      } catch (error) {
        const message =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          (error?.response?.data?.detail &&
            (Array.isArray(error.response.data.detail)
              ? error.response.data.detail.join(". ")
              : error.response.data.detail)) ||
          error?.message ||
          "Login failed";
        return { ok: false, error: message };
      } finally {
        setIsLoading(false);
      }
      // handleAuthSuccess is memoized above; dispatch is stable.
    },
    [dispatch, handleAuthSuccess],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const updateUserInContext = (newUserData) => {
    setUser(newUserData);
    localStorage.setItem("user", JSON.stringify(newUserData));
  };

  const value = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    signIn,
    signUpAndSignIn,
    signOut,
    updateUserInContext,
    handleSocialAuthCallback,
    refreshSession: handleAuthSuccess,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
