import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getProfile,
  getProfileStats,
  getVipStatus,
  getHomeDashboard,
  updateProfile as apiUpdateProfile,
  getLocationHistory,
  getUserAchievements,
} from "@/lib/api";

const initialState = {
  details: null,
  stats: null,
  vipStatus: null,
  dashboardData: null,
  locationHistory: null,
  achievements: [],
  detailsStatus: "idle",
  statsStatus: "idle",
  vipStatusState: "idle",
  dashboardStatus: "idle",
  locationStatus: "idle",
  achievementsStatus: "idle",
  error: null,
  // STALE-WHILE-REVALIDATE: Cache timestamps for balance and XP
  statsCacheTimestamp: null,
  statsCacheTTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  // Profile (details) cache - same pattern as wallet
  detailsCacheTimestamp: null,
  detailsCacheTTL: 5 * 60 * 1000, // 5 minutes
};

export const fetchHomeDashboard = createAsyncThunk(
  "profile/fetchHomeDashboard",
  async (token, { rejectWithValue }) => {
    try {
      return await getHomeDashboard(token);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch user's main profile details with stale-while-revalidate (same as wallet)
export const fetchUserProfile = createAsyncThunk(
  "profile/fetchUserProfile",
  async (
    tokenOrParams,
    { rejectWithValue, getState }
  ) => {
    try {
      const token =
        typeof tokenOrParams === "string"
          ? tokenOrParams
          : tokenOrParams?.token || tokenOrParams;
      const force = tokenOrParams?.force ?? false;
      const background = tokenOrParams?.background ?? false;

      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

      if (!force && !background) {
        const state = getState();
        const cachedDetails = state.profile.details;
        const cacheTimestamp = state.profile.detailsCacheTimestamp;
        const cacheTTL = state.profile.detailsCacheTTL ?? CACHE_TTL;

        if (cachedDetails && cacheTimestamp) {
          const isError =
            cachedDetails &&
            typeof cachedDetails === "object" &&
            (cachedDetails.success === false || cachedDetails.error);
          if (isError) {
            // Don't return error as cache, fetch fresh
          } else {
            const cacheAge = Date.now() - cacheTimestamp;

            if (cacheAge < cacheTTL) {
              if (cacheAge > cacheTTL * 0.8) {
                const { store } = require("@/lib/redux/store");
                setTimeout(() => {
                  store.dispatch(
                    fetchUserProfile({ token, force: false, background: true })
                  );
                }, 0);
              }
              return {
                ...cachedDetails,
                fromCache: true,
                cacheAge,
              };
            }

            const { store } = require("@/lib/redux/store");
            setTimeout(() => {
              store.dispatch(
                fetchUserProfile({ token, force: false, background: true })
              );
            }, 0);
            return {
              ...cachedDetails,
              fromCache: true,
              cacheAge,
              stale: true,
            };
          }
        }
      }

      const response = await getProfile(token);
      const isError =
        response &&
        typeof response === "object" &&
        (response.success === false || response.error);
      if (isError) {
        const parts = [
          response?.message,
          response?.error,
          typeof response?.body === "object" && response?.body
            ? (response.body.message || response.body.error || (Array.isArray(response.body.details) ? response.body.details.join(". ") : response.body.details))
            : null,
          response?.details ? (Array.isArray(response.details) ? response.details.join(". ") : response.details) : null,
        ].filter(Boolean);
        const fullMessage = parts.length ? parts.join(". ") : "Failed to fetch profile";
        return rejectWithValue(fullMessage);
      }
      return {
        ...response,
        fromCache: false,
        timestamp: Date.now(),
        background,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch user's stats (earnings, XP, etc.) with stale-while-revalidate
export const fetchProfileStats = createAsyncThunk(
  "profile/fetchProfileStats",
  async (
    { token, force = false, background = false } = {},
    { rejectWithValue, getState }
  ) => {
    try {
      // STALE-WHILE-REVALIDATE: Check cache if not forcing refresh
      if (!force && !background) {
        const state = getState();
        const cachedStats = state.profile.stats;
        const cacheTimestamp = state.profile.statsCacheTimestamp;
        const cacheTTL = state.profile.statsCacheTTL;

        if (cachedStats && cacheTimestamp) {
          const cacheAge = Date.now() - cacheTimestamp;

          // If cache is fresh (< 5 minutes), return cached data immediately
          if (cacheAge < cacheTTL) {
            // Trigger background refresh if cache is 80% expired (4 minutes)
            if (cacheAge > cacheTTL * 0.8) {
              setTimeout(() => {
                const { store } = require("@/lib/redux/store");
                store.dispatch(
                  fetchProfileStats({
                    token,
                    background: true,
                  })
                );
              }, 0);
            }

            return {
              ...cachedStats,
              fromCache: true,
              cacheAge,
            };
          }

          // Cache is stale but exists - return it and refresh in background
          // Trigger background refresh immediately
          setTimeout(() => {
            const { store } = require("@/lib/redux/store");
            store.dispatch(
              fetchProfileStats({
                token,
                background: true,
              })
            );
          }, 0);

          // Return stale cache immediately (stale-while-revalidate pattern)
          return {
            ...cachedStats,
            fromCache: true,
            cacheAge,
            stale: true,
          };
        }
      }

      // Fetch fresh data from API
      const response = await getProfileStats(token);
      return {
        ...response,
        fromCache: false,
        timestamp: Date.now(),
        background,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

//  Fetch user's VIP status
export const fetchVipStatus = createAsyncThunk(
  "profile/fetchVipStatus",
  async (token, { rejectWithValue }) => {
    try {
      return await getVipStatus(token);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

//  Handle updating the user profile
export const updateUserProfile = createAsyncThunk(
  "profile/updateUserProfile",
  async ({ profileData, token }, { dispatch, getState, rejectWithValue }) => {
    try {
      await apiUpdateProfile(profileData, token);
      const currentState = getState();
      const currentProfile = currentState.profile.details;
      return {
        ...currentProfile,
        ...profileData,
        profile: {
          ...currentProfile?.profile,
          ...profileData,
        },
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch user's location history
export const fetchLocationHistory = createAsyncThunk(
  "profile/fetchLocationHistory",
  async (token, { rejectWithValue }) => {
    try {
      return await getLocationHistory(token);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch user's achievements
export const fetchUserAchievements = createAsyncThunk(
  "profile/fetchUserAchievements",
  async (
    { token, category = "games", status = "completed" },
    { rejectWithValue }
  ) => {
    try {
      return await getUserAchievements(token, category, status);
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// --- SLICE DEFINITION ---
const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    clearProfile: (state) => {
      state.details = null;
      state.dashboardData = null;
      state.stats = null;
      state.vipStatus = null;
      state.locationHistory = null;
      state.achievements = [];
      state.detailsStatus = "idle";
      state.statsStatus = "idle";
      state.vipStatusState = "idle";
      state.dashboardStatus = "idle";
      state.locationStatus = "idle";
      state.achievementsStatus = "idle";
      state.error = null;
      state.statsCacheTimestamp = null;
      state.detailsCacheTimestamp = null;
    },
    // Store user data from login response immediately
    // This allows components to use age/gender right away without waiting for profile API
    setUserFromLogin: (state, action) => {
      const user = action.payload;
      // Only update if user has valid data and current details is null or error
      const isErrorObject =
        user &&
        typeof user === "object" &&
        (user.success === false || user.error);
      if (user && typeof user === "object" && !isErrorObject) {
        // Merge with existing details if available, otherwise set as new
        const existingIsError =
          state.details &&
          typeof state.details === "object" &&
          (state.details.success === false || state.details.error);
        if (
          state.details &&
          typeof state.details === "object" &&
          !existingIsError
        ) {
          // Merge login data with existing profile data
          state.details = { ...state.details, ...user };
        } else {
          // Set login user data as details (will be updated when profile API succeeds)
          state.details = user;
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchHomeDashboard.pending, (state) => {
        state.dashboardStatus = "loading";
      })
      .addCase(fetchHomeDashboard.fulfilled, (state, action) => {
        state.dashboardStatus = "succeeded";
        state.dashboardData = action.payload;
      })

      // Reducers for fetchUserProfile (with cache like wallet)
      .addCase(fetchUserProfile.pending, (state, action) => {
        const isBackground = action.meta?.arg?.background ?? false;
        if (!isBackground) {
          state.detailsStatus = "loading";
          state.error = null;
        }
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        const isBackground = action.meta?.arg?.background ?? false;
        const payload = action.payload;
        const fromCache = payload?.fromCache === true;

        if (fromCache) {
          const { fromCache: _, cacheAge: __, stale: ___, ...details } = payload;
          state.details = details;
          if (!isBackground) state.detailsStatus = "succeeded";
          return;
        }

        const {
          fromCache: _,
          timestamp: __,
          background: ___,
          ...details
        } = payload;
        const isError =
          details &&
          typeof details === "object" &&
          (details.success === false || details.error);

        if (isError) {
          if (!isBackground) {
            state.detailsStatus = "failed";
            state.error = details.error || "Failed to fetch profile";
          }
        } else {
          state.details = details;
          state.detailsCacheTimestamp = Date.now();
          state.error = null;
          if (!isBackground) state.detailsStatus = "succeeded";
        }
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        const isBackground = action.meta?.arg?.background ?? false;
        if (!isBackground) {
          state.detailsStatus = "failed";
          state.error = action.payload;
        }
      })

      //  Reducers for fetchProfileStats with stale-while-revalidate
      .addCase(fetchProfileStats.pending, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // IMPORTANT: Background refreshes do NOT set loading status
        // This ensures UI doesn't show loading spinners during background refresh
        if (!isBackground) {
          state.statsStatus = "loading";
        }
        // Background refreshes keep existing status (don't change it)
        state.error = null;
      })
      .addCase(fetchProfileStats.fulfilled, (state, action) => {
        const isBackground = action.meta.arg?.background || false;
        const fromCache = action.payload.fromCache || false;

        // Only update stats if not from cache (fresh data)
        if (!fromCache) {
          // Remove cache metadata before storing
          const {
            fromCache: _,
            cacheAge: __,
            stale: ___,
            timestamp: ____,
            background: _____,
            ...statsData
          } = action.payload;
          state.stats = statsData;
          state.statsCacheTimestamp = Date.now();
        }

        // IMPORTANT: Background refreshes do NOT update status
        // This prevents UI from showing loading states during background refresh
        if (!isBackground) {
          state.statsStatus = "succeeded";
        }
        // Background refreshes: status stays as "succeeded" (or whatever it was)
      })
      .addCase(fetchProfileStats.rejected, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // Only update status if not background refresh
        if (!isBackground) {
          state.statsStatus = "failed";
          state.error = action.payload;
        }
        // Background refresh errors are silent (don't change status)
      })

      //  Reducers for fetchVipStatus
      .addCase(fetchVipStatus.pending, (state) => {
        state.vipStatusState = "loading";
      })
      .addCase(fetchVipStatus.fulfilled, (state, action) => {
        state.vipStatusState = "succeeded";
        state.vipStatus = action.payload;
      })
      .addCase(fetchVipStatus.rejected, (state, action) => {
        state.vipStatusState = "failed";
        state.error = action.payload;
      })

      //Reducers for updateUserProfile (optional, for handling saving state)
      .addCase(updateUserProfile.pending, (state) => {})
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.details = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Reducers for fetchLocationHistory
      .addCase(fetchLocationHistory.pending, (state) => {
        state.locationStatus = "loading";
      })
      .addCase(fetchLocationHistory.fulfilled, (state, action) => {
        state.locationStatus = "succeeded";
        state.locationHistory = action.payload;
      })
      .addCase(fetchLocationHistory.rejected, (state, action) => {
        state.locationStatus = "failed";
        state.error = action.payload;
      })

      // Reducers for fetchUserAchievements
      .addCase(fetchUserAchievements.pending, (state) => {
        state.achievementsStatus = "loading";
      })
      .addCase(fetchUserAchievements.fulfilled, (state, action) => {
        state.achievementsStatus = "succeeded";
        state.achievements = action.payload.data?.achievements || [];
      })
      .addCase(fetchUserAchievements.rejected, (state, action) => {
        state.achievementsStatus = "failed";
        state.error = action.payload;
      });
  },
});

export const { clearProfile } = profileSlice.actions;

export default profileSlice.reducer;
