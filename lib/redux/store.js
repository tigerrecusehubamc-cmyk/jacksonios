import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import { combineReducers } from "@reduxjs/toolkit";
import profileReducer from "./slice/profileSlice";
import onboardingReducer from "./slice/onboardingSlice";
import cashCoachReducer from "./slice/cashCoachSlice";
import vipReducer from "./slice/vipSlice";
import walletTransactionsReducer from "./slice/walletTransactionsSlice";
import gameReducer from "./slice/gameSlice";
import dailyChallengeReducer from "./slice/dailyChallengeSlice";
import accountOverviewReducer from "./slice/accountOverviewSlice";
import streakReducer from "./slice/streakSlice";
import ticketReducer from "./slice/ticketSlice";
import surveysReducer from "./slice/surveysSlice";

// OPTIMIZED: Redux Persist configuration for data persistence
const persistConfig = {
  key: "root",
  storage,
  // OPTIMIZED: Only persist essential data to avoid performance issues
  whitelist: [
    "profile", // User profile data
    "games", // Game data and preferences
    "walletTransactions", // Wallet and transaction data
    "streak", // Streak data
  ],
  // OPTIMIZED: Blacklist data that should not persist
  blacklist: [
    "onboarding", // Onboarding is one-time
    "cashCoach", // Temporary coaching data
    "vip", // VIP status can be refetched
    "dailyChallenge", // Daily challenges should refresh
    "accountOverview", // Account overview can be refetched
  ],
};

// OPTIMIZED: Persist configuration for specific slices
const profilePersistConfig = {
  key: "profile",
  storage,
  whitelist: ["details", "stats", "dashboardData", "statsCacheTimestamp"], // Persist cache timestamps for stale-while-revalidate
};

const gamesPersistConfig = {
  key: "games",
  storage,
  whitelist: [
    "userData",
    "gamesBySection",
    "gamesBySectionTimestamp", // Persist cache timestamps for stale-while-revalidate
    "availableGames",
    "inProgressGames",
    "imageCache", // OPTIMIZED: Persist image cache for performance
    "preloadedImages", // OPTIMIZED: Persist preloaded images list
  ], // Persist game data
};

const walletPersistConfig = {
  key: "walletTransactions",
  storage,
  whitelist: ["walletScreen", "transactions", "walletScreenCacheTimestamp"], // Persist cache timestamps for stale-while-revalidate
};

const streakPersistConfig = {
  key: "streak",
  storage,
  whitelist: ["currentStreak"], // Persist streak data
};

// OPTIMIZED: Combine reducers with persistence
const rootReducer = combineReducers({
  profile: persistReducer(profilePersistConfig, profileReducer),
  games: persistReducer(gamesPersistConfig, gameReducer),
  walletTransactions: persistReducer(
    walletPersistConfig,
    walletTransactionsReducer
  ),
  streak: persistReducer(streakPersistConfig, streakReducer),
  onboarding: onboardingReducer,
  cashCoach: cashCoachReducer,
  vip: vipReducer,
  dailyChallenge: dailyChallengeReducer,
  accountOverview: accountOverviewReducer,
  tickets: ticketReducer,
  surveys: surveysReducer,
});

// OPTIMIZED: Configure store with persistence
export const store = configureStore({
  reducer: persistReducer(persistConfig, rootReducer),
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Raise thresholds to suppress dev-mode warnings caused by large persisted state
      // (games, imageCache, wallet, profile). Both checks are already disabled in production.
      immutableCheck: { warnAfter: 128 },
      serializableCheck: {
        warnAfter: 128,
        ignoredActions: ["persist/PERSIST", "persist/REHYDRATE"],
      },
    }),
});

// OPTIMIZED: Create persistor for data persistence
export const persistor = persistStore(store);
