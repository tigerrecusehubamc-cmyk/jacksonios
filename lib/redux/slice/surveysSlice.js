import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getBitlabsSurveys,
  getAllNonGameOffers,
  getCashbackOffers,
  getShoppingOffers,
  getMagicReceipts
} from "@/lib/api";

const initialState = {
  surveys: [],
  nonGameOffers: [], // Cashback, Shopping, Magic Receipts
  status: "idle", // idle | loading | succeeded | failed
  nonGameOffersStatus: "idle",
  error: null,
  nonGameOffersError: null,
  // STALE-WHILE-REVALIDATE: Cache timestamps for surveys
  cacheTimestamp: null,
  nonGameOffersCacheTimestamp: null,
  cacheTTL: 90 * 1000, // 90 seconds in milliseconds
};

// Fetch Bitlabs surveys with stale-while-revalidate pattern
export const fetchSurveys = createAsyncThunk(
  "surveys/fetchSurveys",
  async (
    { token, force = false, background = false, params = {} } = {},
    { rejectWithValue, getState }
  ) => {
    try {
      // STALE-WHILE-REVALIDATE: Check cache if not forcing refresh
      if (!force && !background) {
        const state = getState();
        const cachedSurveys = state.surveys.surveys;
        const cacheTimestamp = state.surveys.cacheTimestamp;
        const cacheTTL = state.surveys.cacheTTL;

        if (cachedSurveys && cachedSurveys.length > 0 && cacheTimestamp) {
          const cacheAge = Date.now() - cacheTimestamp;

          // If cache is fresh (< 90 seconds), return cached data immediately
          if (cacheAge < cacheTTL) {
            // Trigger background refresh if cache is 80% expired (72 seconds)
            if (cacheAge > cacheTTL * 0.8) {
              setTimeout(() => {
                const { store } = require("@/lib/redux/store");
                store.dispatch(
                  fetchSurveys({
                    token,
                    background: true,
                    params,
                  })
                );
              }, 0);
            }

            return {
              surveys: cachedSurveys,
              fromCache: true,
              cacheAge,
            };
          }

          // Cache is stale but exists - return it and refresh in background
          // Trigger background refresh immediately
          setTimeout(() => {
            const { store } = require("@/lib/redux/store");
            store.dispatch(
              fetchSurveys({
                token,
                background: true,
                params,
              })
            );
          }, 0);

          // Return stale cache immediately (stale-while-revalidate pattern)
          return {
            surveys: cachedSurveys,
            fromCache: true,
            cacheAge,
            stale: true,
          };
        }
      }

      // Fetch surveys from dedicated surveys endpoint
      const response = await getBitlabsSurveys({ page: 1, limit: 3, ...params }, token);
      const allSurveys = (response.success && Array.isArray(response.data)) ? response.data : [];

      return {
        surveys: allSurveys.slice(0, 3),
        fromCache: false,
        timestamp: Date.now(),
        background,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// Fetch non-game offers (cashback, shopping, magic receipts) with stale-while-revalidate pattern
export const fetchNonGameOffers = createAsyncThunk(
  "surveys/fetchNonGameOffers",
  async (
    { token, force = false, background = false, params = {}, offerType = "all" } = {},
    { rejectWithValue, getState }
  ) => {
    try {
      // STALE-WHILE-REVALIDATE: Check cache if not forcing refresh
      if (!force && !background) {
        const state = getState();
        const cachedOffers = state.surveys.nonGameOffers;
        const cacheTimestamp = state.surveys.nonGameOffersCacheTimestamp;
        const cacheTTL = state.surveys.cacheTTL;

        if (cachedOffers && cachedOffers.length > 0 && cacheTimestamp) {
          const cacheAge = Date.now() - cacheTimestamp;

          // If cache is fresh (< 90 seconds), return cached data immediately
          if (cacheAge < cacheTTL) {
            // Trigger background refresh if cache is 80% expired (72 seconds)
            if (cacheAge > cacheTTL * 0.8) {
              setTimeout(() => {
                const { store } = require("@/lib/redux/store");
                store.dispatch(
                  fetchNonGameOffers({
                    token,
                    background: true,
                    params,
                    offerType,
                  })
                );
              }, 0);
            }

            return {
              offers: cachedOffers,
              fromCache: true,
              cacheAge,
            };
          }

          // Cache is stale but exists - return it and refresh in background
          // Trigger background refresh immediately
          setTimeout(() => {
            const { store } = require("@/lib/redux/store");
            store.dispatch(
              fetchNonGameOffers({
                token,
                background: true,
                params,
                offerType,
              })
            );
          }, 0);

          // Return stale cache immediately (stale-while-revalidate pattern)
          return {
            offers: cachedOffers,
            fromCache: true,
            cacheAge,
            stale: true,
          };
        }
      }

      // Fetch fresh data from API - fetch 2 cashback, 1 shopping
      const defaultParams = {
        page: 1,
        ...params,
      };

      // Handle different offer types
      if (offerType === "cashback_shopping" || offerType === "all") {
        // Fetch from single endpoint and take first 3 offers
        const response = await getAllNonGameOffers({}, token);
        const allOffers = (response.success && Array.isArray(response.data)) ? response.data : [];

        return {
          offers: allOffers.slice(0, 3),
          fromCache: false,
          timestamp: Date.now(),
          background,
        };
      }

      // Handle individual offer types
      let response;
      if (offerType === "cashback") {
        response = await getCashbackOffers(defaultParams, token);
      } else if (offerType === "shopping") {
        response = await getShoppingOffers(defaultParams, token);
      } else if (offerType === "magic_receipt") {
        response = await getMagicReceipts(defaultParams, token);
      } else {
        response = await getAllNonGameOffers(defaultParams, token);
      }

      const offers = (response.success && response.data?.offers) ? response.data.offers : [];

      return {
        offers: offers,
        fromCache: false,
        timestamp: Date.now(),
        background,
      };
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

// --- SLICE DEFINITION ---
const surveysSlice = createSlice({
  name: "surveys",
  initialState,
  reducers: {
    clearSurveys: (state) => {
      state.surveys = [];
      state.status = "idle";
      state.error = null;
      state.cacheTimestamp = null;
    },
    clearNonGameOffers: (state) => {
      state.nonGameOffers = [];
      state.nonGameOffersStatus = "idle";
      state.nonGameOffersError = null;
      state.nonGameOffersCacheTimestamp = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSurveys.pending, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // IMPORTANT: Background refreshes do NOT set loading status
        // This ensures UI doesn't show loading spinners during background refresh
        if (!isBackground) {
          state.status = "loading";
        }
        // Background refreshes keep existing status (don't change it)
        state.error = null;
      })
      .addCase(fetchSurveys.fulfilled, (state, action) => {
        const isBackground = action.meta.arg?.background || false;
        const fromCache = action.payload.fromCache || false;

        // Only update surveys if not from cache (fresh data)
        if (!fromCache) {
          // Remove cache metadata before storing
          const {
            fromCache: _,
            cacheAge: __,
            stale: ___,
            timestamp: ____,
            background: _____,
            ...surveysData
          } = action.payload;
          state.surveys = surveysData.surveys || [];
          // Always stamp cacheTimestamp (even empty result) so the
          // component cache-guard blocks unnecessary re-fetches
          state.cacheTimestamp = Date.now();
        }

        // IMPORTANT: Background refreshes do NOT update status
        // This prevents UI from showing loading states during background refresh
        if (!isBackground) {
          state.status = "succeeded";
        }
        // Background refreshes: status stays as "succeeded" (or whatever it was)
      })
      .addCase(fetchSurveys.rejected, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        // Only update status if not background refresh
        if (!isBackground) {
          state.status = "failed";
          state.error = action.payload;
        }
        // Background refresh errors are silent (don't change status)
      })
      // Non-game offers reducers
      .addCase(fetchNonGameOffers.pending, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        if (!isBackground) {
          state.nonGameOffersStatus = "loading";
        }
        state.nonGameOffersError = null;
      })
      .addCase(fetchNonGameOffers.fulfilled, (state, action) => {
        const isBackground = action.meta.arg?.background || false;
        const fromCache = action.payload.fromCache || false;

        if (!fromCache) {
          const {
            fromCache: _,
            cacheAge: __,
            stale: ___,
            timestamp: ____,
            background: _____,
            ...offersData
          } = action.payload;
          state.nonGameOffers = offersData.offers || [];
          // Always stamp cacheTimestamp (even empty result) so the
          // component cache-guard blocks unnecessary re-fetches
          state.nonGameOffersCacheTimestamp = Date.now();
        }

        if (!isBackground) {
          state.nonGameOffersStatus = "succeeded";
        }
      })
      .addCase(fetchNonGameOffers.rejected, (state, action) => {
        const isBackground = action.meta.arg?.background || false;

        if (!isBackground) {
          state.nonGameOffersStatus = "failed";
          state.nonGameOffersError = action.payload;
        }
      });
  },
});

export const { clearSurveys, clearNonGameOffers } = surveysSlice.actions;

export default surveysSlice.reducer;

