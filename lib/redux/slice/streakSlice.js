import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { getStreakStatus } from "../../api";

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://rewardsuatapi.hireagent.co";

// Initial state
const initialState = {
  currentStreak: 0,
  completedDays: [],
  lastCompletedMilestone: 0,
  lastLoginDate: null,
  todayCompleted: false,
  totalRewardsClaimed: 0,
  streakHistory: [],
  status: "idle", // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  lastFetched: null,
};

/**
 * Fetch current streak status
 */
export const fetchStreakStatus = createAsyncThunk(
  "streak/fetchStatus",
  async (_, { rejectWithValue }) => {
    try {
      // Use the same storage key as AuthContext
      const token = localStorage.getItem("authToken");
      const response = await getStreakStatus(token);

      if (response.success === false) {
        if (response.status === 401) {
          return rejectWithValue("Unauthorized");
        }
        throw new Error(response.error || "Failed to fetch streak status");
      }

      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Update daily task completion
 */
export const updateDailyProgress = createAsyncThunk(
  "streak/updateProgress",
  async ({ taskId, gameId }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/streak/update-progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskId,
          gameId,
          completionDate: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update progress");
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Claim milestone reward
 */
export const claimMilestoneReward = createAsyncThunk(
  "streak/claimReward",
  async ({ milestone, coins, xp }, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/streak/claim-reward`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          milestoneDay: milestone,
          rewardAmount: { coins, xp },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to claim reward");
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

/**
 * Reset streak (triggered by backend on missed day)
 */
export const resetStreak = createAsyncThunk(
  "streak/reset",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${BASE_URL}/api/streak/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to reset streak");
      }

      const data = await response.json();
      return data.data || data;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  },
);

// Streak slice
const streakSlice = createSlice({
  name: "streak",
  initialState,
  reducers: {
    // Clear streak data
    clearStreak: (state) => {
      return initialState;
    },
    // Update local completed days
    markDayComplete: (state, action) => {
      const day = action.payload;
      if (!state.completedDays.includes(day)) {
        state.completedDays.push(day);
        state.completedDays.sort((a, b) => a - b);
      }
      state.currentStreak = Math.max(state.currentStreak, day);
      state.todayCompleted = true;
      state.lastLoginDate = new Date().toISOString();
    },
    // Set today completed status
    setTodayCompleted: (state, action) => {
      state.todayCompleted = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch streak status
      .addCase(fetchStreakStatus.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchStreakStatus.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.currentStreak = action.payload.currentStreak || 0;
        state.completedDays = action.payload.completedDays || [];
        state.lastCompletedMilestone =
          action.payload.lastCompletedMilestone || 0;
        state.lastLoginDate = action.payload.lastLoginDate || null;
        state.todayCompleted = action.payload.todayCompleted || false;
        state.totalRewardsClaimed = action.payload.totalRewardsClaimed || 0;
        state.streakHistory = action.payload.streakHistory || [];
        state.lastFetched = Date.now();
      })
      .addCase(fetchStreakStatus.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })

      // Update daily progress
      .addCase(updateDailyProgress.pending, (state) => {
        state.error = null;
      })
      .addCase(updateDailyProgress.fulfilled, (state, action) => {
        state.currentStreak = action.payload.newStreak;
        state.completedDays =
          action.payload.completedDays || state.completedDays;
        state.todayCompleted = true;
        state.lastLoginDate = new Date().toISOString();

        // Update milestone if reached
        const milestones = [7, 14, 21, 30];
        const reachedMilestone = milestones.find(
          (m) => m === action.payload.newStreak,
        );
        if (reachedMilestone) {
          state.lastCompletedMilestone = reachedMilestone;
        }
      })
      .addCase(updateDailyProgress.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Claim milestone reward
      .addCase(claimMilestoneReward.pending, (state) => {
        state.error = null;
      })
      .addCase(claimMilestoneReward.fulfilled, (state, action) => {
        state.totalRewardsClaimed += action.payload.rewardAmount?.coins || 0;
      })
      .addCase(claimMilestoneReward.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Reset streak
      .addCase(resetStreak.fulfilled, (state, action) => {
        state.currentStreak =
          action.payload.newStreak || state.lastCompletedMilestone;
        state.completedDays = action.payload.completedDays || [];
        state.todayCompleted = false;
      });
  },
});

export const { clearStreak, markDayComplete, setTodayCompleted } =
  streakSlice.actions;

export default streakSlice.reducer;
