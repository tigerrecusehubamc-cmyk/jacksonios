import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getWalletTransactions,
  getFullWalletTransactions,
  getWalletScreen,
} from "@/lib/api";

const initialState = {
  transactions: [],
  fullTransactions: [],
  walletScreen: null,
  status: "idle",
  fullTransactionsStatus: "idle",
  walletScreenStatus: "idle",
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    hasMore: false,
  },
  error: null,
  // STALE-WHILE-REVALIDATE: Cache timestamps for wallet screen (balance)
  walletScreenCacheTimestamp: null,
  walletScreenCacheTTL: 5 * 60 * 1000, // 5 minutes in milliseconds
  // STALE-WHILE-REVALIDATE: Cache timestamps for transactions
  transactionsCacheTimestamp: null,
  fullTransactionsCacheTimestamp: null,
  transactionsCacheTTL: 3 * 60 * 1000, // 3 minutes for transactions
};

// Fetch wallet transactions with stale-while-revalidate support
export const fetchWalletTransactions = createAsyncThunk(
  "walletTransactions/fetchWalletTransactions",
  async ({ token, limit = 5, force = false, background = false } = {}, { rejectWithValue, getState, dispatch }) => {
    console.log("[DEBUG-SLICE] fetchWalletTransactions called | force:", force, "| background:", background, "| at:", new Date().toISOString());
    try {
      // STALE-WHILE-REVALIDATE: Check cache if not forcing refresh
      if (!force && !background) {
        const state = getState();
        const cachedTransactions = state.walletTransactions.transactions;
        const cacheTimestamp = state.walletTransactions.transactionsCacheTimestamp;
        const cacheTTL = state.walletTransactions.transactionsCacheTTL;

        if (cachedTransactions && cachedTransactions.length > 0 && cacheTimestamp) {
          const cacheAge = Date.now() - cacheTimestamp;

          // If cache is fresh (< 3 minutes), return cached data immediately
          if (cacheAge < cacheTTL) {
            // Trigger background refresh if cache is 80% expired (2.4 minutes)
            if (cacheAge > cacheTTL * 0.8) {
              setTimeout(() => {
                dispatch(fetchWalletTransactions({ token, limit, background: true }));
              }, 0);
            }

            return {
              transactions: cachedTransactions,
              fromCache: true,
              cacheAge,
            };
          }

          // Cache is stale but exists - return it and refresh in background
          // Trigger background refresh immediately
          setTimeout(() => {
            dispatch(fetchWalletTransactions({ token, limit, background: true }));
          }, 0);

          // Return stale cache immediately (stale-while-revalidate pattern)
          return {
            transactions: cachedTransactions,
            fromCache: true,
            cacheAge,
            stale: true,
          };
        }
      }

      // Fetch fresh data from API
      const response = await getWalletTransactions(token, limit);
      const transformedTransactions = response
        .map((transaction, index) => {
          // Set coins and XP based on balanceType
          const isCoins = transaction.balanceType === "coins";
          const isXp = transaction.balanceType === "xp";

          // Extract XP values from metadata if available (for Daily Rewards and other transactions)
          const metadataXp = transaction.metadata?.xp || null;
          const finalXp = transaction.metadata?.finalXp || null;
          const baseXp =
            transaction.metadata?.baseXp || transaction.metadata?.baseXP || null;
          const xpEarned = transaction.metadata?.xpEarned || null;

          // Priority: metadata.xp > finalXp > transaction amount for XP
          // Use metadata.xp if available (for Daily Rewards), otherwise use finalXp, or transaction amount for XP transactions
          let xpValue =
            metadataXp !== null
              ? metadataXp
              : isXp
              ? transaction.amount
              : finalXp || 0;

          // If xpValue is zero, use xpEarned from metadata if available
          if (xpValue === 0 && xpEarned !== null && xpEarned !== undefined) {
            xpValue = xpEarned;
          }

          // Check if this is an adjustment transaction
          const isAdjustment = transaction.adjustment?.isAdjustment || transaction.type === "adjustment";
          const adjustmentType = transaction.adjustment?.adjustmentType || null;

          return {
            id: transaction._id,
            gameName: getGameNameFromDescription(transaction.description),
            coins: isCoins ? transaction.amount : 0,
            xpBonus: xpValue,
            xp: metadataXp, // Store metadata.xp for display
            finalXp: finalXp, // Store finalXp separately for display
            baseXp: baseXp, // Store baseXp from metadata for transaction log
            gameLogoSrc: getDefaultGameImage(),
            status: transaction.status,
            description: transaction.description,
            referenceId: transaction.referenceId,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            metadata: transaction.metadata, // Include full metadata for reference
            isAdjustment: isAdjustment, // Flag to indicate if this is an adjustment
            adjustmentType: adjustmentType, // "subtract" or "add" or null
          };
        })
        .filter((transaction) => {
          // Filter out the second daily challenge spin transaction
          // Hide transactions with referenceId starting with "SPIN-DC-"
          // This is the duplicate spin transaction that should not be shown
          if (transaction.referenceId && transaction.referenceId.startsWith("SPIN-DC-")) {
            return false;
          }
          return true;
        });
      
      return {
        transactions: transformedTransactions,
        fromCache: false,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch full wallet transactions with pagination and stale-while-revalidate support
export const fetchFullWalletTransactions = createAsyncThunk(
  "walletTransactions/fetchFullWalletTransactions",
  async (
    { token, page = 1, limit = 20, type = "all", force = false, background = false } = {},
    { rejectWithValue, getState, dispatch }
  ) => {
    console.log("[DEBUG-SLICE] fetchFullWalletTransactions called | force:", force, "| background:", background, "| at:", new Date().toISOString());
    try {
      // STALE-WHILE-REVALIDATE: Check cache if not forcing refresh (only for page 1, type "all")
      if (!force && !background && page === 1 && type === "all") {
        const state = getState();
        const cachedFullTransactions = state.walletTransactions.fullTransactions;
        const cacheTimestamp = state.walletTransactions.fullTransactionsCacheTimestamp;
        const cacheTTL = state.walletTransactions.transactionsCacheTTL;

        if (cachedFullTransactions && cachedFullTransactions.length > 0 && cacheTimestamp) {
          const cacheAge = Date.now() - cacheTimestamp;

          // If cache is fresh (< 3 minutes), return cached data immediately
          if (cacheAge < cacheTTL) {
            // Trigger background refresh if cache is 80% expired (2.4 minutes)
            if (cacheAge > cacheTTL * 0.8) {
              setTimeout(() => {
                dispatch(fetchFullWalletTransactions({ token, page: 1, limit, type: "all", background: true }));
              }, 0);
            }

            return {
              transactions: cachedFullTransactions,
              pagination: state.walletTransactions.pagination,
              fromCache: true,
              cacheAge,
            };
          }

          // Cache is stale but exists - return it and refresh in background
          // Trigger background refresh immediately
          setTimeout(() => {
            dispatch(fetchFullWalletTransactions({ token, page: 1, limit, type: "all", background: true }));
          }, 0);

          // Return stale cache immediately (stale-while-revalidate pattern)
          return {
            transactions: cachedFullTransactions,
            pagination: state.walletTransactions.pagination,
            fromCache: true,
            cacheAge,
            stale: true,
          };
        }
      }

      // Fetch fresh data from API
      const response = await getFullWalletTransactions(
        token,
        page,
        limit,
        type
      );

      // Transform the API response to match the component's expected format
      // API returns array directly, not wrapped in data object
      const transformedTransactions = response
        .map((transaction) => {
          // Set coins and XP based on balanceType
          const isCoins = transaction.balanceType === "coins";
          const isXp = transaction.balanceType === "xp";

          // Extract XP values from metadata if available (for Daily Rewards and other transactions)
          const metadataXp = transaction.metadata?.xp || null;
          const finalXp = transaction.metadata?.finalXp || null;
          const baseXp =
            transaction.metadata?.baseXp || transaction.metadata?.baseXP || null;
          const xpEarned = transaction.metadata?.xpEarned || null;

          // Priority: metadata.xp > finalXp > transaction amount for XP
          // Use metadata.xp if available (for Daily Rewards), otherwise use finalXp, or transaction amount for XP transactions
          let xpValue =
            metadataXp !== null
              ? metadataXp
              : isXp
              ? transaction.amount
              : finalXp || 0;

          // If xpValue is zero, use xpEarned from metadata if available
          if (xpValue === 0 && xpEarned !== null && xpEarned !== undefined) {
            xpValue = xpEarned;
          }

          return {
            id: transaction._id,
            gameName: getGameNameFromDescription(transaction.description),
            gameType: transaction.type === "credit" ? "Reward" : "Purchase",
            coins: isCoins ? transaction.amount : 0,
            xpBonus: xpValue,
            xp: metadataXp, // Store metadata.xp for display
            finalXp: finalXp, // Store finalXp separately for display
            baseXp: baseXp, // Store baseXp from metadata for transaction log
            gameLogoSrc: getDefaultGameImage(),
            status: transaction.status,
            description: transaction.description,
            referenceId: transaction.referenceId,
            createdAt: transaction.createdAt,
            updatedAt: transaction.updatedAt,
            metadata: transaction.metadata, // Include full metadata for reference
          };
        })
        .filter((transaction) => {
          // Filter out the second daily challenge spin transaction
          // Hide transactions with referenceId starting with "SPIN-DC-"
          // This is the duplicate spin transaction that should not be shown
          if (transaction.referenceId && transaction.referenceId.startsWith("SPIN-DC-")) {
            return false;
          }
          return true;
        });

      return {
        transactions: transformedTransactions,
        pagination: {
          currentPage: page,
          totalPages: 1,
          totalItems: transformedTransactions.length,
          hasMore: false,
        },
        fromCache: false,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch wallet screen data with stale-while-revalidate
export const fetchWalletScreen = createAsyncThunk(
  "walletTransactions/fetchWalletScreen",
  async (
    { token, force = false, background = false } = {},
    { rejectWithValue, getState, dispatch }
  ) => {
    console.log("[DEBUG-SLICE] fetchWalletScreen called | force:", force, "| background:", background, "| at:", new Date().toISOString());
    try {
      // STALE-WHILE-REVALIDATE: Check cache if not forcing refresh
      if (!force && !background) {
        const state = getState();
        const cachedWalletScreen = state.walletTransactions.walletScreen;
        const cacheTimestamp =
          state.walletTransactions.walletScreenCacheTimestamp;
        const cacheTTL = state.walletTransactions.walletScreenCacheTTL;

        if (cachedWalletScreen && cacheTimestamp) {
          const cacheAge = Date.now() - cacheTimestamp;

          // If cache is fresh (< 5 minutes), return cached data immediately
          if (cacheAge < cacheTTL) {
            // Trigger background refresh if cache is 80% expired (4 minutes)
            if (cacheAge > cacheTTL * 0.8) {
              console.log("[DEBUG-SLICE] fetchWalletScreen: cache 80% expired, triggering background refresh | cacheAge:", Math.round(cacheAge/1000)+"s");
              setTimeout(() => {
                dispatch(fetchWalletScreen({ token, background: true }));
              }, 0);
            }

            return {
              ...cachedWalletScreen,
              fromCache: true,
              cacheAge,
            };
          }

          // Cache is stale but exists - return it and refresh in background
          // Trigger background refresh immediately
          console.log("[DEBUG-SLICE] fetchWalletScreen: cache STALE, triggering background refresh | cacheAge:", Math.round(cacheAge/1000)+"s");
          setTimeout(() => {
            dispatch(fetchWalletScreen({ token, background: true }));
          }, 0);

          // Return stale cache immediately (stale-while-revalidate pattern)
          return {
            ...cachedWalletScreen,
            fromCache: true,
            cacheAge,
            stale: true,
          };
        }
      }

      // Fetch fresh data from API
      const response = await getWalletScreen(token);
      const walletScreenData = {
        user: response.data.user,
        wallet: response.data.wallet,
        xp: response.data.xp,
        highestEarningGames: response.data.highestEarningGames.map((game) => ({
          id: game.id,
          name: game.name,
          icon: game.icon,
          earnings: game.earnings,
          difficulty: game.difficulty,
          timeRequired: game.timeRequired,
          views: "5.6 K",
        })),
      };
      return {
        ...walletScreenData,
        fromCache: false,
        timestamp: Date.now(),
        background,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

const getGameNameFromDescription = (description) => {
  if (!description) return "Game Reward";
  const parts = description.split("-");
  const gameName = parts[0].trim();
  return gameName || "Game Reward";
};

// Helper function to get default XP bonus based on coin amount
const getDefaultXpBonus = (coinAmount) => {
  if (coinAmount >= 100) return 50;
  if (coinAmount >= 50) return 50;
  if (coinAmount >= 25) return 50;
  if (coinAmount >= 10) return 50;
  return 50;
};

// Helper function to get default game image
const getDefaultGameImage = () => {
  return "/download.png";
};

// --- SLICE DEFINITION ---
const walletTransactionsSlice = createSlice({
  name: "walletTransactions",
  initialState,
  reducers: {
    clearWalletTransactions: (state) => {
      state.transactions = [];
      state.fullTransactions = [];
      state.walletScreen = null;
      state.status = "idle";
      state.fullTransactionsStatus = "idle";
      state.walletScreenStatus = "idle";
      state.pagination = {
        currentPage: 1,
        totalPages: 1,
        totalItems: 0,
        hasMore: false,
      };
      state.error = null;
      // Clear cache timestamps
      state.walletScreenCacheTimestamp = null;
      state.transactionsCacheTimestamp = null;
      state.fullTransactionsCacheTimestamp = null;
    },
    addNewTransaction: (state, action) => {
      // Add a new transaction to the beginning of the list
      state.transactions.unshift(action.payload);
      state.fullTransactions.unshift(action.payload);
    },
    loadMoreTransactions: (state, action) => {
      // Append new transactions to existing ones for pagination
      state.fullTransactions = [...state.fullTransactions, ...action.payload];
    },
  },
  extraReducers: (builder) => {
    builder
      // Reducers for fetchWalletTransactions with stale-while-revalidate
      .addCase(fetchWalletTransactions.pending, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // IMPORTANT: Background refreshes do NOT set loading status
        // This ensures UI doesn't show loading spinners during background refresh
        if (!isBackground) {
          state.status = "loading";
        }
        // Background refreshes keep existing status (don't change it)
        state.error = null;
      })
      .addCase(fetchWalletTransactions.fulfilled, (state, action) => {
        const isBackground = action.meta.arg?.background || false;
        const fromCache = action.payload.fromCache || false;

        // Only update transactions if not from cache (fresh data)
        if (!fromCache) {
          const transactions = action.payload.transactions || action.payload;
          // Ensure transactions is always an array
          state.transactions = Array.isArray(transactions) ? transactions : [];
          state.transactionsCacheTimestamp = Date.now();
        }
        // If fromCache is true, state.transactions already has the cached array, no update needed

        // IMPORTANT: Background refreshes do NOT update status
        // This prevents UI from showing loading states during background refresh
        if (!isBackground) {
          state.status = "succeeded";
        }
        // Background refreshes: status stays as "succeeded" (or whatever it was)
        state.error = null;
      })
      .addCase(fetchWalletTransactions.rejected, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // Only update status if not background refresh
        if (!isBackground) {
          state.status = "failed";
          state.error = action.payload;
        }
        // Background refresh errors are silent (don't change status)
        // Keep existing transactions on error to avoid UI flicker
      })

      // Reducers for fetchFullWalletTransactions with stale-while-revalidate
      .addCase(fetchFullWalletTransactions.pending, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // IMPORTANT: Background refreshes do NOT set loading status
        // This ensures UI doesn't show loading spinners during background refresh
        if (!isBackground) {
          state.fullTransactionsStatus = "loading";
        }
        // Background refreshes keep existing status (don't change it)
        state.error = null;
      })
      .addCase(fetchFullWalletTransactions.fulfilled, (state, action) => {
        const isBackground = action.meta.arg?.background || false;
        const fromCache = action.payload.fromCache || false;

        // Only update full transactions if not from cache (fresh data)
        if (!fromCache) {
          state.fullTransactions = action.payload.transactions;
          state.pagination = action.payload.pagination;
          // Only update cache timestamp for page 1, type "all"
          if (action.meta.arg?.page === 1 && action.meta.arg?.type === "all") {
            state.fullTransactionsCacheTimestamp = Date.now();
          }
        }

        // IMPORTANT: Background refreshes do NOT update status
        // This prevents UI from showing loading states during background refresh
        if (!isBackground) {
          state.fullTransactionsStatus = "succeeded";
        }
        // Background refreshes: status stays as "succeeded" (or whatever it was)
        state.error = null;
      })
      .addCase(fetchFullWalletTransactions.rejected, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // Only update status if not background refresh
        if (!isBackground) {
          state.fullTransactionsStatus = "failed";
          state.error = action.payload;
        }
        // Background refresh errors are silent (don't change status)
        // Keep existing transactions on error to avoid UI flicker
      })

      // Reducers for fetchWalletScreen with stale-while-revalidate
      .addCase(fetchWalletScreen.pending, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // IMPORTANT: Background refreshes do NOT set loading status
        // This ensures UI doesn't show loading spinners during background refresh
        if (!isBackground) {
          state.walletScreenStatus = "loading";
        }
        // Background refreshes keep existing status (don't change it)
        state.error = null;
      })
      .addCase(fetchWalletScreen.fulfilled, (state, action) => {
        const isBackground = action.meta.arg?.background || false;
        const fromCache = action.payload.fromCache || false;

        // Only update wallet screen if not from cache (fresh data)
        if (!fromCache) {
          // Remove cache metadata before storing
          const {
            fromCache: _,
            cacheAge: __,
            stale: ___,
            timestamp: ____,
            background: _____,
            ...walletScreenData
          } = action.payload;
          state.walletScreen = walletScreenData;
          state.walletScreenCacheTimestamp = Date.now();
        }

        // IMPORTANT: Background refreshes do NOT update status
        // This prevents UI from showing loading states during background refresh
        if (!isBackground) {
          state.walletScreenStatus = "succeeded";
        }
        // Background refreshes: status stays as "succeeded" (or whatever it was)
        state.error = null;
      })
      .addCase(fetchWalletScreen.rejected, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // Only update status if not background refresh
        if (!isBackground) {
          state.walletScreenStatus = "failed";
          state.error = action.payload;
        }
        // Background refresh errors are silent (don't change status)
        // Keep existing data on error to avoid UI flicker
      });
  },
});

export const {
  clearWalletTransactions,
  addNewTransaction,
  loadMoreTransactions,
} = walletTransactionsSlice.actions;

export default walletTransactionsSlice.reducer;
