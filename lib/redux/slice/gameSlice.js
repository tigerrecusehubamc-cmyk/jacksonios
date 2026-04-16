import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getUserData,
  getConversions,
  getSurveys,
  getUserProfiling,
  getMessenger,
  getOffers,
  getGamesBySection,
  getGameById,
  getBitlabsAIDownloadedGames,
  getBitlabsUserHistory,
} from "@/lib/api";

// ============================================================================
// INITIAL STATE
// ============================================================================

/**
 * Initial state for the games slice
 * Manages user-specific game data, earnings, and various game-related features
 */
const initialState = {
  // Core game data from User Data API
  userData: null,
  availableGames: [], // Games user can start playing
  inProgressGames: [], // Games user is currently playing
  completedGames: [], // Games user has finished
  mostPlayedGames: [], // Processed games for homepage display
  // STALE-WHILE-REVALIDATE: Cache for user data
  userDataCacheTimestamp: null,
  userDataCacheTTL: 5 * 60 * 1000, // Cache TTL: 5 minutes in milliseconds

  // Offers data from Besitos API
  offers: [], // Available offers/games for swipe cards
  offersStatus: "idle", // idle | loading | succeeded | failed

  // New game discovery API data - SEPARATE STATE FOR EACH UI SECTION
  gamesBySection: {}, // Games for specific UI sections: { "Most Played": [...], "Swipe": [...], etc. }
  gamesBySectionStatus: {}, // Status for each section: { "Most Played": "idle", "Swipe": "loading", etc. }
  gamesBySectionTimestamp: {}, // Cache timestamps for each section: { "Most Played": 1234567890, "Swipe": 1234567890 }
  gamesBySectionCacheTTL: 5 * 60 * 1000, // Cache TTL: 5 minutes in milliseconds

  // Dedicated state for Most Played Screen
  mostPlayedScreenGames: [], // Games specifically for Most Played Screen
  mostPlayedScreenStatus: "idle", // idle | loading | succeeded | failed
  mostPlayedScreenError: null, // Error state for Most Played Screen
  mostPlayedScreenCacheTimestamp: null, // Cache timestamp for cache-first / focus refresh

  currentGameDetails: null, // Detailed game information
  gameDetailsStatus: "idle", // idle | loading | succeeded | failed
  gameDetailsError: null, // Error state for game details
  // STALE-WHILE-REVALIDATE: Cache for game details (keyed by gameId)
  gameDetailsCache: {}, // { gameId: gameData }
  gameDetailsCacheTimestamp: {}, // { gameId: timestamp }
  gameDetailsCacheTTL: 5 * 60 * 1000, // Cache TTL: 5 minutes in milliseconds
  availableUiSections: [], // Available UI sections from API

  // User earnings and financial data
  userEarnings: {
    historyAmount: 0, // Total amount user has earned
    currency: "$", // Currency symbol
    balance: 0, // Available balance for withdrawal
  },

  // Additional game features
  conversions: [], // Conversion tracking data
  surveys: [], // Available surveys
  userProfiling: null, // User profiling data
  messenger: null, // Messenger/chat data

  // Bitlabs downloaded games data
  bitlabsDownloadedGames: [], // Downloaded games from Bitlabs API
  bitlabsDownloadedGamesStatus: "idle", // idle | loading | succeeded | failed
  bitlabsDownloadedGamesError: null, // Error state for Bitlabs data

  // Bitlabs AI downloaded games data
  bitlabsAIDownloadedGames: [], // Downloaded games from Bitlabs AI API
  bitlabsAIDownloadedGamesStatus: "idle", // idle | loading | succeeded | failed
  bitlabsAIDownloadedGamesError: null, // Error state for Bitlabs AI data

  // Loading states for different API calls
  userDataStatus: "idle", // idle | loading | succeeded | failed
  conversionsStatus: "idle",
  surveysStatus: "idle",
  userProfilingStatus: "idle",
  messengerStatus: "idle",

  // Error handling
  error: null,

  // OPTIMIZED: Image caching for performance (serializable)
  imageCache: {}, // Cache of optimized image URLs
  preloadedImages: [], // Array of preloaded image URLs (serializable alternative to Set)
};

export const fetchUserData = createAsyncThunk(
  "games/fetchUserData",
  async (
    { userId, token, force = false, background = false } = {},
    { rejectWithValue, getState },
  ) => {
    try {
      const CACHE_KEY = `userData_${userId}`;
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

      // STALE-WHILE-REVALIDATE: Check localStorage cache first (persists across page reloads)
      if (!force && !background && typeof window !== "undefined") {
        try {
          const cachedData = localStorage.getItem(CACHE_KEY);
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            const cacheAge = Date.now() - (parsed.timestamp || 0);

            // If cache is fresh (< 5 minutes), return cached data immediately
            if (cacheAge < CACHE_TTL) {
              // Trigger background refresh if cache is 80% expired (4 minutes)
              if (cacheAge > CACHE_TTL * 0.8) {
                setTimeout(() => {
                  const { store } = require("@/lib/redux/store");
                  store.dispatch(
                    fetchUserData({
                      userId,
                      token,
                      background: true,
                    }),
                  );
                }, 0);
              }

              return {
                ...parsed.data,
                fromCache: true,
                cacheAge,
              };
            }

            // Cache is stale but exists - return it and refresh in background
            // Trigger background refresh immediately
            setTimeout(() => {
              const { store } = require("@/lib/redux/store");
              store.dispatch(
                fetchUserData({
                  userId,
                  token,
                  background: true,
                }),
              );
            }, 0);

            // Return stale cache immediately (stale-while-revalidate pattern)
            return {
              ...parsed.data,
              fromCache: true,
              cacheAge,
              stale: true,
            };
          }
        } catch (err) {
          // Failed to read localStorage cache, continue to Redux cache check
        }
      }

      // STALE-WHILE-REVALIDATE: Check Redux state cache if not forcing refresh
      if (!force && !background) {
        const state = getState();
        const cachedUserData = state.games.userData;
        const cacheTimestamp = state.games.userDataCacheTimestamp;
        const cacheTTL = state.games.userDataCacheTTL;

        if (cachedUserData && cacheTimestamp) {
          const cacheAge = Date.now() - cacheTimestamp;

          // If cache is fresh (< 5 minutes), return cached data immediately
          if (cacheAge < cacheTTL) {
            // Trigger background refresh if cache is 80% expired (4 minutes)
            if (cacheAge > cacheTTL * 0.8) {
              setTimeout(() => {
                const { store } = require("@/lib/redux/store");
                store.dispatch(
                  fetchUserData({
                    userId,
                    token,
                    background: true,
                  }),
                );
              }, 0);
            }

            return {
              ...cachedUserData,
              fromCache: true,
              cacheAge,
            };
          }

          // Cache is stale but exists - return it and refresh in background
          // Trigger background refresh immediately
          setTimeout(() => {
            const { store } = require("@/lib/redux/store");
            store.dispatch(
              fetchUserData({
                userId,
                token,
                background: true,
              }),
            );
          }, 0);

          // Return stale cache immediately (stale-while-revalidate pattern)
          return {
            ...cachedUserData,
            fromCache: true,
            cacheAge,
            stale: true,
          };
        }
      }

      const response = await getUserData(userId, token);

      // Process and structure the User Data API response
      // Handle nested data structure from API response
      const apiData = response.data || response;

      const processedData = {
        available: apiData.available || [],
        in_progress: apiData.in_progress || [],
        completed: apiData.completed || [],
        nextbatch: apiData.nextbatch || 1,
        userEarnings: {
          historyAmount: apiData.history_amount || 0,
          currency: apiData.currency || "$",
          balance: apiData.balance || 0,
        },
        userXpTier: apiData.userXpTier || null,
        termsOfService: apiData.terms_of_service,
        privacyPolicy: apiData.privacy_policy,
        faq: apiData.faq,
        support: apiData.support,
        fromCache: false,
        timestamp: Date.now(),
        background,
      };

      // Save to localStorage for persistence across page reloads
      if (typeof window !== "undefined" && userId) {
        try {
          const cacheData = {
            data: processedData,
            timestamp: Date.now(),
          };
          localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        } catch (err) {
          // Failed to save to localStorage - non-blocking
        }
      }

      return processedData;
    } catch (error) {
      // Error fetching user data
      return rejectWithValue(error.message);
    }
  },
);

export const fetchConversions = createAsyncThunk(
  "games/fetchConversions",
  async (_, { rejectWithValue }) => {
    try {
      const response = await getConversions();
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchSurveys = createAsyncThunk(
  "games/fetchSurveys",
  async ({ userId, device = "mobile", userIp }, { rejectWithValue }) => {
    try {
      const response = await getSurveys(userId, device, userIp);
      return response.data || [];
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Fetch user profiling data from Besitos API
 * Provides insights about user preferences and behavior
 *
 * @param {string} userId - User ID
 * @returns {Promise<Object>} User profiling data
 */
export const fetchUserProfiling = createAsyncThunk(
  "games/fetchUserProfiling",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await getUserProfiling(userId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchMessenger = createAsyncThunk(
  "games/fetchMessenger",
  async (userId, { rejectWithValue }) => {
    try {
      const response = await getMessenger(userId);
      return response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchOffers = createAsyncThunk(
  "games/fetchOffers",
  async (
    { per_page = 5, device_platform = "android", page = 1 } = {},
    { rejectWithValue },
  ) => {
    try {
      const response = await getOffers({ per_page, device_platform, page });

      // Ensure we only get exactly the requested number of games
      const offersData = response.data || [];
      const limitedOffers = offersData.slice(0, per_page);

      return limitedOffers;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchGamesBySection = createAsyncThunk(
  "games/fetchGamesBySection",
  async (
    {
      uiSection = "Swipe",
      ageGroup = "18-24",
      gender = "male",
      page = 1,
      limit = 20,
      token = null,
      user = null, // User object with age/ageRange and gender - if provided, will override ageGroup and gender
      force = false, // Force refresh, ignore cache
      background = false, // Background refresh (don't show loading)
    } = {},
    { rejectWithValue, getState },
  ) => {
    try {
      // Get authentication token
      const authToken = token || localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication required. Please log in.");
      }

      // STALE-WHILE-REVALIDATE: Check cache if not forcing refresh
      if (!force && !background) {
        const state = getState();
        const cachedGames = state.games.gamesBySection[uiSection];
        const cacheTimestamp = state.games.gamesBySectionTimestamp[uiSection];
        const cacheTTL = state.games.gamesBySectionCacheTTL;

        if (cachedGames && cacheTimestamp) {
          const cacheAge = Date.now() - cacheTimestamp;

          // If cache is fresh (< 5 minutes), return cached data immediately
          if (cacheAge < cacheTTL) {
            // Trigger background refresh if cache is 80% expired (4 minutes)
            if (cacheAge > cacheTTL * 0.8) {
              // Dispatch background refresh (don't await)
              setTimeout(() => {
                const { store } = require("@/lib/redux/store");
                store.dispatch(
                  fetchGamesBySection({
                    uiSection,
                    ageGroup,
                    gender,
                    page,
                    limit,
                    token: authToken,
                    user,
                    background: true,
                  }),
                );
              }, 0);
            }

            return {
              games: cachedGames,
              pagination: {},
              uiSections: [],
              fromCache: true,
              cacheAge,
            };
          }

          // Cache is stale but exists - return it and refresh in background
          // Trigger background refresh immediately
          setTimeout(() => {
            const { store } = require("@/lib/redux/store");
            store.dispatch(
              fetchGamesBySection({
                uiSection,
                ageGroup,
                gender,
                page,
                limit,
                token: authToken,
                user,
                background: true,
              }),
            );
          }, 0);

          // Return stale cache immediately (stale-while-revalidate pattern)
          return {
            games: cachedGames,
            pagination: {},
            uiSections: [],
            fromCache: true,
            cacheAge,
            stale: true,
          };
        }
      }

      const response = await getGamesBySection({
        uiSection,
        ageGroup,
        gender,
        page,
        limit,
        token: authToken,
        user, // Pass user object to extract age and gender dynamically
      });

      return {
        games: response.data || [],
        pagination: response.pagination || {},
        uiSections: response.uiSections || [],
        fromCache: false,
        timestamp: Date.now(),
        background,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchMostPlayedScreenGames = createAsyncThunk(
  "games/fetchMostPlayedScreenGames",
  async (
    {
      ageGroup = "18-24", // Default fallback, should be provided from profile
      gender = "male", // Default fallback, should be provided from profile
      page = 1,
      limit = 50,
      token = null,
      user = null, // User object with age/ageRange and gender - if provided, will override ageGroup and gender
      force = false, // Force refresh, ignore cache
      background = false, // Background refresh (don't show loading)
    } = {},
    { rejectWithValue },
  ) => {
    try {
      // Get authentication token
      const authToken = token || localStorage.getItem("authToken");
      if (!authToken) {
        throw new Error("Authentication required. Please log in.");
      }

      const response = await getGamesBySection({
        uiSection: "Most Played Screen",
        ageGroup,
        gender,
        page,
        limit,
        token: authToken,
        user, // Pass user object to API
      });

      return {
        games: response.data || [],
        pagination: response.pagination || {},
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

export const fetchBitlabsDownloadedGames = createAsyncThunk(
  "games/fetchBitlabsDownloadedGames",
  async ({ userId, token }, { rejectWithValue }) => {
    try {
      // Hardcode offer ID as 1671770 for all BitLabs calls
      const offerId = "1671770";
      console.log("Bitlabs Debug - Fetching:", {
        userId,
        offerId,
        hasToken: !!token,
      });
      const response = await getBitlabsUserHistory(userId, offerId, token);
      console.log("Bitlabs Debug - Response:", response);
      return response.data || response;
    } catch (error) {
      console.log("Bitlabs Debug - Error:", error);
      return rejectWithValue(error.message);
    }
  },
);

export const fetchBitlabsAIDownloadedGames = createAsyncThunk(
  "games/fetchBitlabsAIDownloadedGames",
  async ({ userId, token }, { rejectWithValue }) => {
    try {
      console.log("Bitlabs AI Debug - Fetching:", {
        userId,
        hasToken: !!token,
      });
      const response = await getBitlabsAIDownloadedGames(userId, token);
      console.log("Bitlabs AI Debug - Response:", response);
      return response.data || response;
    } catch (error) {
      console.log("Bitlabs AI Debug - Error:", error);
      return rejectWithValue(error.message);
    }
  },
);

export const fetchGameById = createAsyncThunk(
  "games/fetchGameById",
  async (
    { gameId, force = false, background = false } = {},
    { rejectWithValue, getState },
  ) => {
    try {
      // Get authentication token
      const token = localStorage.getItem("authToken");
      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      // Handle both object and string gameId
      const actualGameId = typeof gameId === "object" ? gameId.gameId : gameId;

      // STALE-WHILE-REVALIDATE: Check cache if not forcing refresh
      if (!force && !background) {
        const state = getState();
        const cachedGameData = state.games.gameDetailsCache[actualGameId];
        const cacheTimestamp =
          state.games.gameDetailsCacheTimestamp[actualGameId];
        const cacheTTL = state.games.gameDetailsCacheTTL;

        if (cachedGameData && cacheTimestamp) {
          const cacheAge = Date.now() - cacheTimestamp;

          // If cache is fresh (< 5 minutes), return cached data immediately
          if (cacheAge < cacheTTL) {
            // Trigger background refresh if cache is 80% expired (4 minutes)
            if (cacheAge > cacheTTL * 0.8) {
              setTimeout(() => {
                const { store } = require("@/lib/redux/store");
                store.dispatch(
                  fetchGameById({
                    gameId: actualGameId,
                    background: true,
                  }),
                );
              }, 0);
            }

            return {
              ...cachedGameData,
              fromCache: true,
              cacheAge,
            };
          }

          // Cache is stale but exists - return it and refresh in background
          // Trigger background refresh immediately
          setTimeout(() => {
            const { store } = require("@/lib/redux/store");
            store.dispatch(
              fetchGameById({
                gameId: actualGameId,
                background: true,
              }),
            );
          }, 0);

          // Return stale cache immediately (stale-while-revalidate pattern)
          return {
            ...cachedGameData,
            fromCache: true,
            cacheAge,
            stale: true,
          };
        }
      }

      const response = await getGameById(actualGameId, token);

      // Handle both array and object responses
      let gameData = null;
      if (Array.isArray(response.data)) {
        // If data is an array, get the first item
        gameData = response.data?.[0] || null;
      } else if (response.data && typeof response.data === "object") {
        // If data is an object, use it directly
        gameData = response.data;
      }

      return {
        ...gameData,
        fromCache: false,
        timestamp: Date.now(),
        background,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// ============================================================================
// REDUX SLICE
// ============================================================================

/**
 * Games slice for managing game-related state
 * Handles user data, game categories, earnings, and additional features
 */
const gameSlice = createSlice({
  name: "games",
  initialState,

  // ============================================================================
  // REDUCERS - SYNCHRONOUS ACTIONS
  // ============================================================================

  reducers: {
    /**
     * Preserve games data across navigation
     * Prevents data loss when navigating between pages
     */
    preserveGamesData: (state) => {
      // Keep existing data, just update status to prevent refetching
      if (state.gamesBySectionStatus === "succeeded") {
        // Data is already loaded, keep it
        return;
      }
    },

    /**
     * Clear all games data and reset to initial state
     * Useful for logout or data refresh
     */
    clearGames: (state) => {
      // Reset core game data
      state.userData = null;
      state.availableGames = [];
      state.inProgressGames = [];
      state.completedGames = [];
      state.mostPlayedGames = [];

      // Reset offers data
      state.offers = [];

      // Reset additional features
      state.conversions = [];
      state.surveys = [];
      state.userProfiling = null;
      state.messenger = null;

      // Reset Bitlabs data
      state.bitlabsDownloadedGames = [];
      state.bitlabsDownloadedGamesStatus = "idle";
      state.bitlabsDownloadedGamesError = null;

      // Reset Bitlabs AI data
      state.bitlabsAIDownloadedGames = [];
      state.bitlabsAIDownloadedGamesStatus = "idle";
      state.bitlabsAIDownloadedGamesError = null;

      // Reset loading states
      state.userDataStatus = "idle";
      state.conversionsStatus = "idle";
      state.surveysStatus = "idle";
      state.userProfilingStatus = "idle";
      state.messengerStatus = "idle";
      state.offersStatus = "idle";
      state.bitlabsDownloadedGamesStatus = "idle";

      // Reset error and earnings
      state.error = null;
      state.userEarnings = {
        historyAmount: 0,
        currency: "$",
        balance: 0,
      };

      // OPTIMIZED: Clear image cache when clearing games
      state.imageCache = {};
      state.preloadedImages = [];
    },

    /**
     * Clear games by section data to force fresh fetch
     */
    clearGamesBySection: (state) => {
      state.gamesBySection = {};
      state.gamesBySectionStatus = {};
      state.gamesBySectionTimestamp = {};
      state.availableUiSections = [];
    },

    /**
     * Clear specific section data
     */
    clearSpecificSection: (state, action) => {
      const sectionName = action.payload;
      if (state.gamesBySection[sectionName]) {
        delete state.gamesBySection[sectionName];
        delete state.gamesBySectionStatus[sectionName];
        delete state.gamesBySectionTimestamp[sectionName];
      }
    },

    /**
     * Manually set most played games
     * Used for custom game processing or external data
     *
     * @param {Object} state - Current state
     * @param {Object} action - Action with payload containing games array
     */
    setMostPlayedGames: (state, action) => {
      state.mostPlayedGames = action.payload;
    },

    /**
     * Cache optimized image URL for a game
     * Used for performance optimization
     *
     * @param {Object} state - Current state
     * @param {Object} action - Action with payload containing gameId and imageUrl
     */
    cacheImage: (state, action) => {
      const { gameId, imageUrl } = action.payload;
      if (gameId && imageUrl) {
        state.imageCache[gameId] = imageUrl;
      }
    },

    /**
     * Add image to preloaded images list
     * Used for tracking preloaded images
     *
     * @param {Object} state - Current state
     * @param {Object} action - Action with payload containing imageUrl
     */
    addPreloadedImage: (state, action) => {
      const { imageUrl } = action.payload;
      if (imageUrl && !state.preloadedImages.includes(imageUrl)) {
        state.preloadedImages.push(imageUrl);
      }
    },

    /**
     * Clear image cache and preloaded images
     * Used for cleanup or reset
     */
    clearImageCache: (state) => {
      state.imageCache = {};
      state.preloadedImages = [];
    },

    /**
     * Clear current game details
     * Used when navigating to prevent showing old game data
     */
    clearCurrentGameDetails: (state) => {
      state.currentGameDetails = null;
      state.gameDetailsStatus = "idle";
      state.gameDetailsError = null;
    },

    /**
     * Update user earnings with new coins and XP
     */
    updateUserEarnings: (state, action) => {
      const { coins, xp } = action.payload;

      // Update balance with new coins
      state.userEarnings.balance += coins || 0;

      // Update history amount with new coins
      state.userEarnings.historyAmount += coins || 0;
    },

    /**
     * Load user data from localStorage cache immediately
     * Used to show games instantly before API call completes
     */
    loadUserDataFromCache: (state, action) => {
      const { userData, timestamp } = action.payload;
      if (userData) {
        state.userData = userData;
        state.userDataCacheTimestamp = timestamp || Date.now();
        state.availableGames = userData.available || [];
        state.inProgressGames = userData.in_progress || [];
        state.completedGames = userData.completed || [];
        state.userEarnings = userData.userEarnings || {
          historyAmount: 0,
          currency: "$",
          balance: 0,
        };

        // Process available games for homepage display (same logic as fetchUserData.fulfilled)
        if (userData.available && userData.available.length > 0) {
          const processedGames = userData.available
            .filter((game) => game.categories && game.categories.length > 0)
            .sort((a, b) => (b.amount || 0) - (a.amount || 0))
            .map((game, index) => ({
              id: game.id,
              name: game.title,
              title: game.title,
              image: game.square_image || game.image,
              square_image: game.square_image,
              large_image: game.large_image,
              bgImage: game.large_image || game.image,
              borderImage: game.image,
              borderColor: "#FF69B4",
              isNew: index < 2,
              amount: game.amount,
              currency: game.currency || "$",
              description: game.description,
              url: game.url,
              appStoreUrl:
                game.appStoreUrl || game.playStoreUrl || game.googlePlayUrl,
              packageName: game.packageName || game.package_name,
              appStoreId: game.appStoreId || game.app_store_id,
              categories: game.categories,
              goals: game.goals || [],
              budget_status: "Active",
              cpi: game.cpi,
              image_text: game.image_text,
              card_text: game.card_text,
              details: game.details,
              points: game.points || [],
            }));

          state.mostPlayedGames = processedGames;
        }

        // Set status to succeeded if we have data (so UI doesn't show loading)
        if (userData.available || userData.in_progress || userData.completed) {
          state.userDataStatus = "succeeded";
        }
      }
    },
  },
  // ============================================================================
  // EXTRA REDUCERS - ASYNC ACTIONS
  // ============================================================================

  extraReducers: (builder) => {
    builder
      // ========================================================================
      // USER DATA API - Core game data management
      // ========================================================================

      .addCase(fetchUserData.pending, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // IMPORTANT: Background refreshes do NOT set loading status
        // This ensures UI doesn't show loading spinners during background refresh
        if (!isBackground) {
          state.userDataStatus = "loading";
        }
        // Background refreshes keep existing status (don't change it)
        state.error = null; // Clear previous errors
      })

      .addCase(fetchUserData.fulfilled, (state, action) => {
        const isBackground = action.meta.arg?.background || false;
        const fromCache = action.payload.fromCache || false;

        // Only update user data if not from cache (fresh data)
        if (!fromCache) {
          // Remove cache metadata before storing
          const {
            fromCache: _,
            cacheAge: __,
            stale: ___,
            timestamp: ____,
            background: _____,
            ...userDataPayload
          } = action.payload;

          state.userData = userDataPayload;
          state.userDataCacheTimestamp = Date.now();

          // Update game categories
          state.availableGames = userDataPayload.available || [];
          state.inProgressGames = userDataPayload.in_progress || [];
          state.completedGames = userDataPayload.completed || [];

          // Update user earnings
          state.userEarnings = userDataPayload.userEarnings || {
            historyAmount: 0,
            currency: "$",
            balance: 0,
          };

          // Process available games for homepage display
          if (
            userDataPayload.available &&
            userDataPayload.available.length > 0
          ) {
            const processedGames = userDataPayload.available
              .filter((game) => game.categories && game.categories.length > 0)
              .sort((a, b) => (b.amount || 0) - (a.amount || 0))
              // Remove the .slice(0, 12) limit to show all games
              .map((game, index) => ({
                id: game.id,
                name: game.title,
                title: game.title,
                image: game.square_image || game.image,
                square_image: game.square_image,
                large_image: game.large_image,
                bgImage: game.large_image || game.image,
                borderImage: game.image,
                borderColor: "#FF69B4",
                isNew: index < 2,
                amount: game.amount,
                currency: game.currency || "$",
                description: game.description,
                url: game.url,
                // Add direct app store URLs for bypassing Besitos wall
                appStoreUrl:
                  game.appStoreUrl || game.playStoreUrl || game.googlePlayUrl,
                packageName: game.packageName || game.package_name,
                appStoreId: game.appStoreId || game.app_store_id,
                categories: game.categories,
                goals: game.goals || [],
                budget_status: "Active", // User Data API only returns eligible games
                cpi: game.cpi,
                image_text: game.image_text,
                card_text: game.card_text,
                details: game.details,
                points: game.points || [],
              }));

            state.mostPlayedGames = processedGames;
          }
        }

        // IMPORTANT: Background refreshes do NOT update status
        // This prevents UI from showing loading states during background refresh
        if (!isBackground) {
          state.userDataStatus = "succeeded";
        }
        // Background refreshes: status stays as "succeeded" (or whatever it was)
      })

      .addCase(fetchUserData.rejected, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // Only update status if not background refresh
        if (!isBackground) {
          state.userDataStatus = "failed";
          state.error = action.payload;
        }
        // Background refresh errors are silent (don't change status)
        // Keep existing data on error to avoid UI flicker
      })

      // ========================================================================
      // CONVERSIONS - Track user conversions and earnings
      // ========================================================================

      .addCase(fetchConversions.pending, (state) => {
        state.conversionsStatus = "loading";
        state.error = null;
      })
      .addCase(fetchConversions.fulfilled, (state, action) => {
        state.conversionsStatus = "succeeded";
        state.conversions = action.payload;
      })
      .addCase(fetchConversions.rejected, (state, action) => {
        state.conversionsStatus = "failed";
        state.error = action.payload;
      })

      // ========================================================================
      // SURVEYS - Available surveys for the user
      // ========================================================================

      .addCase(fetchSurveys.pending, (state) => {
        state.surveysStatus = "loading";
        state.error = null;
      })
      .addCase(fetchSurveys.fulfilled, (state, action) => {
        state.surveysStatus = "succeeded";
        state.surveys = action.payload;
      })
      .addCase(fetchSurveys.rejected, (state, action) => {
        state.surveysStatus = "failed";
        state.error = action.payload;
      })

      // ========================================================================
      // USER PROFILING - User preferences and behavior insights
      // ========================================================================

      .addCase(fetchUserProfiling.pending, (state) => {
        state.userProfilingStatus = "loading";
        state.error = null;
      })
      .addCase(fetchUserProfiling.fulfilled, (state, action) => {
        state.userProfilingStatus = "succeeded";
        state.userProfiling = action.payload;
      })
      .addCase(fetchUserProfiling.rejected, (state, action) => {
        state.userProfilingStatus = "failed";
        state.error = action.payload;
      })

      // ========================================================================
      // MESSENGER - Chat and communication features
      // ========================================================================

      .addCase(fetchMessenger.pending, (state) => {
        state.messengerStatus = "loading";
        state.error = null;
      })
      .addCase(fetchMessenger.fulfilled, (state, action) => {
        state.messengerStatus = "succeeded";
        state.messenger = action.payload;
      })
      .addCase(fetchMessenger.rejected, (state, action) => {
        state.messengerStatus = "failed";
        state.error = action.payload;
      })

      // ========================================================================
      // OFFERS - Available games for swipe cards
      // ========================================================================

      .addCase(fetchOffers.pending, (state) => {
        state.offersStatus = "loading";
        state.error = null;
      })
      .addCase(fetchOffers.fulfilled, (state, action) => {
        state.offersStatus = "succeeded";
        state.offers = action.payload;
      })
      .addCase(fetchOffers.rejected, (state, action) => {
        state.offersStatus = "failed";
        state.error = action.payload;
      })

      // ========================================================================
      // GAMES BY SECTION - New game discovery API
      // ========================================================================

      .addCase(fetchGamesBySection.pending, (state, action) => {
        const uiSection = action.meta.arg.uiSection || "Unknown";
        const isBackground = action.meta.arg.background || false;

        // IMPORTANT: Background refreshes do NOT set loading status
        // This ensures UI doesn't show loading spinners during background refresh
        // Users see cached data immediately, fresh data updates silently
        if (!isBackground) {
          state.gamesBySectionStatus[uiSection] = "loading";
        }
        // Background refreshes keep existing status (don't change it)
        state.error = null;
      })
      .addCase(fetchGamesBySection.fulfilled, (state, action) => {
        const uiSection = action.meta.arg.uiSection || "Unknown";
        const isBackground = action.meta.arg.background || false;
        const fromCache = action.payload.fromCache || false;
        const newGames = action.payload.games;
        const hasNewGames = Array.isArray(newGames) && newGames.length > 0;
        const existingGames = state.gamesBySection[uiSection];

        // Handle empty response - always clear section when API returns empty
        if (!fromCache) {
          if (hasNewGames) {
            state.gamesBySection[uiSection] = newGames;
          } else {
            state.gamesBySection[uiSection] = [];
          }
          state.gamesBySectionTimestamp[uiSection] =
            action.payload.timestamp || Date.now();
          state.availableUiSections =
            action.payload.uiSections || state.availableUiSections;
          state.gamesBySectionStatus[uiSection] = "succeeded";
        } else if (!isBackground) {
          state.gamesBySectionStatus[uiSection] = "succeeded";
        }
      })
      .addCase(fetchGamesBySection.rejected, (state, action) => {
        const uiSection = action.meta.arg.uiSection || "Unknown";
        state.gamesBySectionStatus[uiSection] = "failed";
        state.error = action.payload;
      })

      // ========================================================================
      // GAME DETAILS - Game details by ID
      // ========================================================================

      .addCase(fetchGameById.pending, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // IMPORTANT: Background refreshes do NOT set loading status
        // This ensures UI doesn't show loading spinners during background refresh
        if (!isBackground) {
          state.gameDetailsStatus = "loading";
        }
        // Background refreshes keep existing status (don't change it)
        state.gameDetailsError = null;
      })
      .addCase(fetchGameById.fulfilled, (state, action) => {
        const isBackground = action.meta.arg?.background || false;
        const fromCache = action.payload.fromCache || false;

        // Get gameId from payload or action meta
        const gameId =
          action.payload.id ||
          action.payload._id ||
          action.payload.gameId ||
          action.meta.arg?.gameId ||
          (typeof action.meta.arg === "object"
            ? action.meta.arg.gameId
            : action.meta.arg);

        // Only update game details if not from cache (fresh data)
        if (!fromCache) {
          // Remove cache metadata before storing
          const {
            fromCache: _,
            cacheAge: __,
            stale: ___,
            timestamp: ____,
            background: _____,
            ...gameData
          } = action.payload;

          state.currentGameDetails = gameData;
          state.gameDetailsCache[gameId] = gameData;
          state.gameDetailsCacheTimestamp[gameId] = Date.now();
        } else {
          // Use cached data if available
          if (state.gameDetailsCache[gameId]) {
            state.currentGameDetails = state.gameDetailsCache[gameId];
          }
        }

        // IMPORTANT: Background refreshes do NOT update status
        // This prevents UI from showing loading states during background refresh
        if (!isBackground) {
          state.gameDetailsStatus = "succeeded";
        }
        // Background refreshes: status stays as "succeeded" (or whatever it was)
      })
      .addCase(fetchGameById.rejected, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // Only update status if not background refresh
        if (!isBackground) {
          state.gameDetailsStatus = "failed";
          state.gameDetailsError = action.payload;
        }
        // Background refresh errors are silent (don't change status)
        // Keep existing data on error to avoid UI flicker
      })

      // ========================================================================
      // MOST PLAYED SCREEN GAMES - Dedicated state for Most Played Screen
      // ========================================================================

      .addCase(fetchMostPlayedScreenGames.pending, (state) => {
        state.mostPlayedScreenStatus = "loading";
        state.mostPlayedScreenError = null;
      })
      .addCase(fetchMostPlayedScreenGames.fulfilled, (state, action) => {
        state.mostPlayedScreenStatus = "succeeded";
        state.mostPlayedScreenGames = action.payload.games;
        state.mostPlayedScreenCacheTimestamp = Date.now();
      })
      .addCase(fetchMostPlayedScreenGames.rejected, (state, action) => {
        state.mostPlayedScreenStatus = "failed";
        state.mostPlayedScreenError = action.payload;
      })

      // ========================================================================
      // BITLABS DOWNLOADED GAMES - Downloaded games from Bitlabs API
      // ========================================================================

      // ========================================================================
      // BITLABS DOWNLOADED GAMES - Downloaded games from Bitlabs API
      // ========================================================================

      .addCase(fetchBitlabsDownloadedGames.pending, (state) => {
        state.bitlabsDownloadedGamesStatus = "loading";
        state.bitlabsDownloadedGamesError = null;
      })
      .addCase(fetchBitlabsDownloadedGames.fulfilled, (state, action) => {
        state.bitlabsDownloadedGamesStatus = "succeeded";

        console.log("Bitlabs Debug - Raw payload:", action.payload);

        // Map Bitlabs data to match structure used by GameListSection
        // The response structure: { data: { available: [...] } } or just the response directly
        let bitlabsGames = [];

        // Handle different response structures
        if (action.payload.data) {
          // If payload has data property
          if (action.payload.data.available) {
            bitlabsGames = action.payload.data.available;
          } else if (Array.isArray(action.payload.data)) {
            bitlabsGames = action.payload.data;
          }
        } else if (action.payload.available) {
          // If payload has available property directly
          bitlabsGames = action.payload.available;
        } else if (Array.isArray(action.payload)) {
          // If payload is directly an array
          bitlabsGames = action.payload;
        } else if (action.payload.success === false && action.payload.error) {
          // Handle API error response
          console.error("Bitlabs API Error:", action.payload.error);
          state.bitlabsDownloadedGamesStatus = "failed";
          state.bitlabsDownloadedGamesError =
            action.payload.error.message || "API error";
          return;
        }

        console.log("Bitlabs Debug - Parsed games:", bitlabsGames);
        console.log("Bitlabs Debug - Game count:", bitlabsGames.length);

        // If no games found, set empty array
        if (!bitlabsGames || bitlabsGames.length === 0) {
          console.log("Bitlabs Debug - No games found");
          state.bitlabsDownloadedGames = [];
          return;
        }

        // Get taskProgressionRule from root level of response
        const taskProgressionRule =
          action.payload.data?.taskProgressionRule || null;
        const hasProgressionRule = !!taskProgressionRule;
        const firstBatchSize = taskProgressionRule?.firstBatchSize || 0;
        const nextBatchSize = taskProgressionRule?.nextBatchSize || 0;
        const maxBatches = taskProgressionRule?.maxBatches || null;

        const mappedGames = bitlabsGames.map((game) => {
          // Calculate completed events and earned points
          const completedEvents =
            game.events?.filter((event) => event.status === "completed") || [];
          const totalPayableEvents =
            game.events?.filter((event) => event.payable) || [];

          // FIX: Use total_approved_points from API for total coins (this is the correct earned amount)
          // This matches what Besitos uses and is the actual approved amount
          const earnedAmount = parseFloat(game.total_approved_points) || 0;

          // Calculate potential earnings from remaining payable events
          const potentialEarnings = totalPayableEvents.reduce((sum, event) => {
            if (event.status !== "completed") {
              return sum + (parseFloat(event.promised_points) || 0);
            }
            return sum;
          }, 0);

          // Apply progression rules to calculate batch numbers and lock/unlock status
          const processEventWithProgression = (event, index) => {
            let batchNumber = null;
            let isLocked = false;
            let isUnlocked = true;

            // If progression rule exists, calculate batch numbers
            if (hasProgressionRule && firstBatchSize > 0) {
              if (index < firstBatchSize) {
                // First batch (index 0 to firstBatchSize-1)
                batchNumber = 0;
                isLocked = false;
                isUnlocked = true;
              } else {
                // Calculate which batch this event belongs to
                // Batch 0: indices 0 to (firstBatchSize - 1)
                // Batch 1: indices firstBatchSize to (firstBatchSize + nextBatchSize - 1)
                // Batch 2: indices (firstBatchSize + nextBatchSize) to (firstBatchSize + 2*nextBatchSize - 1)
                const batchIndex = index - firstBatchSize;
                batchNumber = Math.floor(batchIndex / nextBatchSize) + 1;

                // Check if ALL previous batches are completed
                let allPreviousBatchesCompleted = true;

                // Check batch 0 (first batch)
                const batch0Events =
                  game.events?.slice(0, firstBatchSize) || [];
                const batch0Completed = batch0Events.every(
                  (e) => e.status === "completed",
                );
                if (!batch0Completed) {
                  allPreviousBatchesCompleted = false;
                }

                // Check all batches before current batch
                for (
                  let b = 1;
                  b < batchNumber && allPreviousBatchesCompleted;
                  b++
                ) {
                  const batchStart = firstBatchSize + (b - 1) * nextBatchSize;
                  const batchEnd = Math.min(
                    batchStart + nextBatchSize,
                    game.events?.length || 0,
                  );
                  const batchEvents =
                    game.events?.slice(batchStart, batchEnd) || [];
                  const batchCompleted = batchEvents.every(
                    (e) => e.status === "completed",
                  );

                  if (!batchCompleted) {
                    allPreviousBatchesCompleted = false;
                    break;
                  }
                }

                // Task is locked if any previous batch is not completed
                isLocked = !allPreviousBatchesCompleted;
                isUnlocked = allPreviousBatchesCompleted;
              }
            } else {
              // No progression rule - use API progression data if available
              if (event.progression) {
                isLocked = event.progression.isLocked || false;
                isUnlocked = event.progression.isUnlocked !== false; // Default to true if not specified
                batchNumber = event.progression.batchNumber || null;
              } else {
                // No progression rule and no API data - all tasks unlocked
                isLocked = false;
                isUnlocked = true;
                batchNumber = null;
              }
            }

            return {
              id: event.uuid,
              name: event.name,
              amount: parseFloat(event.promised_points) || 0,
              completed: event.status === "completed",
              payable: event.payable,
              type: event.type,
              progression: {
                isUnlocked,
                isLocked,
                unlockReason: isLocked
                  ? "Complete previous tasks to unlock"
                  : event.progression?.unlockReason ||
                    "No progression rules applied",
                batchNumber,
                ...(event.progression || {}), // Preserve other progression fields if they exist
              },
              approved_cpa: parseFloat(event.approved_cpa),
              approved_conversions: event.approved_conversions,
              pending_conversions: event.pending_conversions,
              pending_cpa: parseFloat(event.pending_cpa),
              status: event.status,
              timestamp: event.timestamp,
              type_id: event.type_id,
            };
          };

          // Map goals structure to match besitos format with progression rules applied
          const goals =
            game.events?.map((event, index) => {
              const processed = processEventWithProgression(event, index);
              console.log(
                `🔒 [Bitlabs] Event ${index} "${event.name}": batch=${processed.progression.batchNumber}, locked=${processed.progression.isLocked}, unlocked=${processed.progression.isUnlocked}`,
              );
              return processed;
            }) || [];

          // Calculate completed unlocked tasks count for progression
          const completedUnlockedTasks = goals.filter(
            (g) => g.completed && !g.progression.isLocked,
          ).length;

          console.log("🔒 [Bitlabs] Progression Summary:", {
            hasProgressionRule,
            firstBatchSize,
            nextBatchSize,
            totalEvents: game.events?.length,
            completedEvents: completedEvents.length,
            completedUnlockedTasks,
            goalsWithLocks: goals.map((g) => ({
              name: g.name,
              batch: g.progression.batchNumber,
              locked: g.progression.isLocked,
              completed: g.completed,
            })),
          });

          // Calculate if next batch can be unlocked
          const calculateCanUnlockNextTasks = () => {
            if (!hasProgressionRule || firstBatchSize === 0) {
              return true; // No progression rule means all tasks are unlocked
            }

            // Check if first batch is completed
            if (completedUnlockedTasks < firstBatchSize) {
              return false; // First batch not completed yet
            }

            // Calculate which batch we're currently in
            const tasksAfterFirstBatch =
              completedUnlockedTasks - firstBatchSize;
            const currentBatch = Math.floor(
              tasksAfterFirstBatch / nextBatchSize,
            );
            const tasksInCurrentBatch = tasksAfterFirstBatch % nextBatchSize;

            // Can unlock next batch if current batch is fully completed
            return tasksInCurrentBatch === 0 && currentBatch >= 0;
          };

          // Update taskProgression with rule data from root level
          const taskProgression = {
            hasProgressionRule,
            ruleId: taskProgressionRule?.ruleId || null,
            ruleName: taskProgressionRule?.ruleName || null,
            appliedMilestones: taskProgressionRule?.appliedMilestones || null,
            firstBatchSize,
            nextBatchSize,
            maxBatches,
            completedTasks: completedUnlockedTasks,
            thresholdReached: game.taskProgression?.thresholdReached || false,
            rewardTransferred: game.taskProgression?.rewardTransferred || false,
            coinBoxBalance: game.taskProgression?.coinBoxBalance || 0,
            canTransfer: game.taskProgression?.canTransfer || false,
            canUnlockNextTasks: calculateCanUnlockNextTasks(),
          };

          return {
            id: game.offer_id || game.id,
            title: game.product_name || game.anchor,
            name: game.product_name || game.anchor,
            description: game.description,
            image: game.icon_url,
            square_image: game.icon_url,
            large_image: game.icon_url,
            url: game.continue_url,
            categories: game.categories?.map((c) =>
              typeof c === "string" ? { name: c } : c,
            ),
            goals,
            amount: earnedAmount, // FIXED: Now uses total_approved_points from API
            totalPotentialEarnings: potentialEarnings,
            totalPoints: parseFloat(game.total_points),
            hoursLeft: game.hours_left,
            isGame: game.is_game,
            completedEvents: completedEvents.length,
            totalEvents: game.events?.length,
            nextEvent: game.next_event,
            source: "bitlabs", // Flag to identify source
            // Additional Bitlabs-specific fields
            anchor: game.anchor,
            completed: game.completed,
            completed_events: game.completed_events,
            confirmation_time: game.confirmation_time,
            contact_url: game.contact_url,
            disclaimer: game.disclaimer,
            has_pending_conversions: game.has_pending_conversions,
            latest_date: game.latest_date,
            next_payable_event: game.next_payable_event,
            points: game.points,
            product_id: game.product_id,
            requirements: game.requirements,
            started_at: game.started_at,
            things_to_know: game.things_to_know,
            total_approved_events: game.total_approved_events,
            total_approved_points: game.total_approved_points, // This is the source for amount
            total_cancelled_events: game.total_cancelled_events,
            total_cancelled_points: game.total_cancelled_points,
            total_pending_events: game.total_pending_events,
            total_pending_points: game.total_pending_points,
            tx_id: game.tx_id,
            taskProgression, // FIXED: Now includes progression rule data from root level
            bonusTasks: game.bonusTasks,
          };
        });

        state.bitlabsDownloadedGames = mappedGames;

        // CRITICAL FIX: If the user is currently on the Details Page for a Bitlabs game,
        // update currentGameDetails so the data appears immediately.
        if (
          state.currentGameDetails &&
          state.currentGameDetails.source === "bitlabs"
        ) {
          const activeGame = mappedGames.find(
            (g) => g.id === state.currentGameDetails.id,
          );
          if (activeGame) {
            state.currentGameDetails = activeGame;
            state.gameDetailsStatus = "succeeded";
          }
        }
      })
      .addCase(fetchBitlabsDownloadedGames.rejected, (state, action) => {
        state.bitlabsDownloadedGamesStatus = "failed";
        state.bitlabsDownloadedGamesError = action.payload;
      })

      // ========================================================================
      // BITLABS AI DOWNLOADED GAMES - Downloaded games from Bitlabs AI API
      // ========================================================================

      .addCase(fetchBitlabsAIDownloadedGames.pending, (state) => {
        state.bitlabsAIDownloadedGamesStatus = "loading";
        state.bitlabsAIDownloadedGamesError = null;
      })
      .addCase(fetchBitlabsAIDownloadedGames.fulfilled, (state, action) => {
        state.bitlabsAIDownloadedGamesStatus = "succeeded";

        let bitlabsAIGames = [];
        if (action.payload?.data?.available) {
          bitlabsAIGames = action.payload.data.available;
        } else if (action.payload?.available) {
          bitlabsAIGames = action.payload.available;
        } else if (Array.isArray(action.payload)) {
          bitlabsAIGames = action.payload;
        }

        if (!bitlabsAIGames || bitlabsAIGames.length === 0) {
          state.bitlabsAIDownloadedGames = [];
          return;
        }

        const mappedAIGames = bitlabsAIGames.map((game) => {
          const events = game.events || [];
          const earnedAmount = events
            .filter((event) => event.status === "completed")
            .reduce(
              (total, event) =>
                total + (parseFloat(event.promised_points) || 0),
              0,
            );

          const goals = events.map((event, index) => ({
            id: event.uuid || event.id || `event-${index}`,
            goal_id: event.uuid || event.id || `event-${index}`,
            name: event.name || `Task ${index + 1}`,
            title: event.name,
            description: event.description || "",
            amount:
              event.promised_points != null
                ? String(event.promised_points)
                : "0",
            completed: event.status === "completed",
            completedAt: event.timestamp,
            status: event.status,
            type: event.type || "flat",
            type_id: event.type_id,
            uuid: event.uuid,
            payable: event.payable,
            progression: event.progression || null,
            promised_points: event.promised_points,
          }));

          return {
            id: game.id || game.offer_id,
            gameId: game.id || game.offer_id,
            title: game.product_name || game.name || game.title || game.anchor,
            name: game.product_name || game.name || game.title || game.anchor,
            description: game.description || "",

            image: game.icon_url || game.image,
            square_image: game.icon_url || game.image,
            large_image: game.icon_url || game.image,
            bgImage: game.icon_url || game.image,

            url: game.continue_url || game.url,
            categories: game.categories?.map((c) =>
              typeof c === "string" ? { name: c } : c,
            ) || [{ name: "Game" }],

            goals,
            points: goals,
            amount: earnedAmount,
            currency: "$",

            total_points: game.total_points,
            totalPoints: game.total_points || 0,
            hoursLeft: game.hours_left || 0,
            days_left: Math.ceil((game.hours_left || 0) / 24),
            source: "bitlabs_ai",
            is_game: game.is_game,
            completedEvents: events.filter((e) => e.status === "completed")
              .length,
            totalEvents: events.length,
            events,
            xpRewardConfig: game.xpRewardConfig || { baseXP: 1, multiplier: 1 },
            taskProgression: game.taskProgression || null,
            besitosRawData: game,
          };
        });

        state.bitlabsAIDownloadedGames = mappedAIGames;

        // Sync Details page if active
        if (
          state.currentGameDetails &&
          state.currentGameDetails.source === "bitlabs_ai"
        ) {
          const activeGame = mappedAIGames.find(
            (g) => g.id === state.currentGameDetails.id,
          );
          if (activeGame) {
            state.currentGameDetails = activeGame;
            state.gameDetailsStatus = "succeeded";
          }
        }
      })
      .addCase(fetchBitlabsAIDownloadedGames.rejected, (state, action) => {
        state.bitlabsAIDownloadedGamesStatus = "failed";
        state.bitlabsAIDownloadedGamesError = action.payload;
      });
  },
});

// ============================================================================
// EXPORTS
// ============================================================================

/**
 * Action creators for synchronous operations
 * @type {Object}
 */
export const {
  clearGames,
  setMostPlayedGames,
  clearGamesBySection,
  clearSpecificSection,
  clearCurrentGameDetails,
  updateUserEarnings,
  loadUserDataFromCache,
} = gameSlice.actions;

// Bitlabs async thunk is already exported at its definition

/**
 * Async thunk exports
 * Note: All async thunks (fetchUserData, fetchConversions, fetchSurveys, etc.)
 * are already exported at their definitions (lines 74-379).
 * No additional export block needed.
 */

/**
 * Default export - the games reducer
 * Handles all game-related state management
 * @type {Function}
 */
export default gameSlice.reducer;
