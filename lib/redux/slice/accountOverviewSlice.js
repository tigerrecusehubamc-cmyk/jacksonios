import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://rewardsuatapi.hireagent.co";
// Initial state for account overview
const initialState = {
  data: {
    user: {
      name: "",
      avatar: null,
      tier: "beginner",
      vipLevel: "free",
    },
    totalEarnings: {
      coins: 0,
      xp: 0,
    },
    progress: {
      gamesPlayed: { current: 0, target: 0, percentage: 0, isCompleted: false },
      coinsEarned: { current: 0, target: 0, percentage: 0, isCompleted: false },
      challengesCompleted: {
        current: 0,
        target: 0,
        percentage: 0,
        isCompleted: false,
      },
    },
    rewardBadges: [],
    recentAchievements: [],
    streak: { current: 0, lastUpdated: null },
    badges: [],
    userGoals: {
      gamesPlayed: 0,
      coinsEarned: 0,
      challengesCompleted: 0,
    },
    userProfile: {},
  },
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  lastFetched: null,
  cacheTTL: 5 * 60 * 1000, // 5 minutes, same as rest of project
};

const CACHE_KEY = "accountOverviewCache";

// Module-level flag to prevent multiple background refreshes from firing simultaneously.
// Without this, concurrent callers that all see an 80%-stale cache each schedule their
// own background dispatch, flooding the server with identical requests.
let _bgRefreshPending = false;

// Async thunk to fetch account overview
// Options: { force: boolean, background: boolean }
// Uses localStorage cache + stale-while-revalidate like fetchUserData
export const fetchAccountOverview = createAsyncThunk(
  "accountOverview/fetchAccountOverview",
  async (
    { force = false, background = false } = {},
    { rejectWithValue, getState, dispatch },
  ) => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("x-auth-token");

      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

      // Stale-while-revalidate: check localStorage first (unless force or background)
      if (!force && !background && typeof window !== "undefined") {
        try {
          const cachedRaw = localStorage.getItem(CACHE_KEY);
          if (cachedRaw) {
            const parsed = JSON.parse(cachedRaw);
            const cacheAge = Date.now() - (parsed.timestamp || 0);

            if (parsed.data) {
              // Fresh cache: return immediately, optionally trigger background refresh when 80% expired
              if (cacheAge < CACHE_TTL) {
                if (cacheAge > CACHE_TTL * 0.8 && !_bgRefreshPending) {
                  _bgRefreshPending = true;
                  setTimeout(() => {
                    _bgRefreshPending = false;
                    dispatch(
                      fetchAccountOverview({ force: false, background: true }),
                    );
                  }, 0);
                }
                return { data: parsed.data, fromCache: true, cacheAge };
              }

              // Stale cache: return it and refresh in background
              if (!_bgRefreshPending) {
                _bgRefreshPending = true;
                setTimeout(() => {
                  _bgRefreshPending = false;
                  dispatch(
                    fetchAccountOverview({ force: false, background: true }),
                  );
                }, 0);
              }
              return {
                data: parsed.data,
                fromCache: true,
                cacheAge,
                stale: true,
              };
            }
          }
        } catch (err) {
          // Ignore cache read errors, continue to fetch
        }

        // Redux in-memory cache (e.g. after navigation)
        const state = getState();
        const cached = state.accountOverview?.data;
        const lastFetched = state.accountOverview?.lastFetched;
        const cacheTTL = state.accountOverview?.cacheTTL ?? CACHE_TTL;

        if (cached && lastFetched) {
          const cacheAge = Date.now() - lastFetched;
          if (cacheAge < cacheTTL) {
            if (cacheAge > cacheTTL * 0.8 && !_bgRefreshPending) {
              _bgRefreshPending = true;
              setTimeout(() => {
                _bgRefreshPending = false;
                dispatch(
                  fetchAccountOverview({ force: false, background: true }),
                );
              }, 0);
            }
            return { data: cached, fromCache: true, cacheAge };
          }
          if (!_bgRefreshPending) {
            _bgRefreshPending = true;
            setTimeout(() => {
              _bgRefreshPending = false;
              dispatch(
                fetchAccountOverview({ force: false, background: true }),
              );
            }, 0);
          }
          return { data: cached, fromCache: true, cacheAge, stale: true };
        }
      }

      const response = await fetch(`${BASE_URL}/api/account-overview`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to fetch account overview",
        );
      }

      const data = await response.json();

      if (data.success && data.data) {
        const payload = data.data;
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem(
              CACHE_KEY,
              JSON.stringify({ data: payload, timestamp: Date.now() }),
            );
          } catch (e) {
            // ignore
          }
        }
        return { data: payload, fromCache: false };
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Async thunk to update progress
export const updateAccountProgress = createAsyncThunk(
  "accountOverview/updateAccountProgress",
  async ({ activityType, progressData }, { rejectWithValue }) => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("x-auth-token");

      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      const response = await fetch(
        `${BASE_URL}/api/account-overview/update-progress`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            activityType,
            progressData,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update progress");
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Async thunk to claim reward
export const claimAccountReward = createAsyncThunk(
  "accountOverview/claimAccountReward",
  async ({ milestoneType }, { rejectWithValue }) => {
    try {
      const token =
        localStorage.getItem("authToken") ||
        localStorage.getItem("x-auth-token");

      if (!token) {
        throw new Error("Authentication required. Please log in.");
      }

      const response = await fetch(
        `${BASE_URL}/api/account-overview/claim-reward`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ milestoneType }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to claim reward");
      }

      const data = await response.json();
      return data.data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Account Overview Slice
const accountOverviewSlice = createSlice({
  name: "accountOverview",
  initialState,
  reducers: {
    clearAccountOverview: (state) => {
      state.data = initialState.data;
      state.status = "idle";
      state.error = null;
      state.lastFetched = null;
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(CACHE_KEY);
        } catch (e) {
          // ignore
        }
      }
    },
    loadAccountOverviewFromCache: (state, action) => {
      const { data, timestamp } = action.payload || {};
      if (data) {
        state.data = data;
        state.lastFetched = timestamp || Date.now();
        state.status = "succeeded";
        state.error = null;
      }
    },
    updateLocalProgress: (state, action) => {
      const { activityType, progressData } = action.payload;

      // Update local state immediately for better UX
      if (activityType === "game") {
        state.data.progress.gamesPlayed.current += 1;
        state.data.progress.gamesPlayed.percentage =
          (state.data.progress.gamesPlayed.current /
            state.data.progress.gamesPlayed.target) *
          100;
      } else if (activityType === "coin") {
        state.data.progress.coinsEarned.current += progressData.amount || 0;
        state.data.progress.coinsEarned.percentage =
          (state.data.progress.coinsEarned.current /
            state.data.progress.coinsEarned.target) *
          100;
        state.data.totalEarnings.coins += progressData.amount || 0;
      } else if (activityType === "challenge") {
        state.data.progress.challengesCompleted.current += 1;
        state.data.progress.challengesCompleted.percentage =
          (state.data.progress.challengesCompleted.current /
            state.data.progress.challengesCompleted.target) *
          100;
      }
    },
    updateTotalEarnings: (state, action) => {
      const { coins, xp } = action.payload;
      state.data.totalEarnings.coins += coins || 0;
      state.data.totalEarnings.xp += xp || 0;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Account Overview
      .addCase(fetchAccountOverview.pending, (state, action) => {
        const isBackground = action.meta?.arg?.background;

        // For background refreshes, don't flip global loading/error state (prevents UI flicker)
        if (!isBackground) {
          state.status = "loading";
          state.error = null;
        }
      })
      .addCase(fetchAccountOverview.fulfilled, (state, action) => {
        const isBackground = action.meta?.arg?.background;
        const payload = action.payload;
        const data = payload?.data !== undefined ? payload.data : payload;

        state.data = data;
        state.lastFetched = Date.now();
        state.error = null;

        if (!isBackground) {
          state.status = "succeeded";
        }
      })
      .addCase(fetchAccountOverview.rejected, (state, action) => {
        const isBackground = action.meta?.arg?.background;

        // For background errors, keep existing UI state – just log the error
        if (!isBackground) {
          state.status = "failed";
          state.error = action.payload;
        }
      })

      // Update Progress
      .addCase(updateAccountProgress.pending, (state) => {
        // Keep current state, just update in background
      })
      .addCase(updateAccountProgress.fulfilled, (state, action) => {
        // Optionally update local state with server response
        if (action.payload) {
          // Update with server response if needed
        }
      })
      .addCase(updateAccountProgress.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Claim Reward
      .addCase(claimAccountReward.pending, (state) => {
        // Keep current state
      })
      .addCase(claimAccountReward.fulfilled, (state, action) => {
        // Update total earnings with claimed reward
        if (action.payload.reward) {
          state.data.totalEarnings.coins += action.payload.reward.coins || 0;
          state.data.totalEarnings.xp += action.payload.reward.xp || 0;
        }

        // Mark reward as claimed
        const badgeIndex = state.data.rewardBadges.findIndex(
          (badge) => badge.type === action.payload.milestoneType,
        );
        if (badgeIndex !== -1) {
          state.data.rewardBadges[badgeIndex].isClaimed = true;
        }
      })
      .addCase(claimAccountReward.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const {
  clearAccountOverview,
  loadAccountOverviewFromCache,
  updateLocalProgress,
  updateTotalEarnings,
} = accountOverviewSlice.actions;

export { CACHE_KEY as accountOverviewCacheKey };

export default accountOverviewSlice.reducer;
