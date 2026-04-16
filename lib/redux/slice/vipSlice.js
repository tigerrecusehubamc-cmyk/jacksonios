import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  getVipTiers,
  initiateUpgrade,
  startPayment,
  confirmPayment as confirmPaymentApi,
} from "@/lib/api";

// Fetch VIP tiers and pricing
export const fetchVipTiers = createAsyncThunk(
  "vip/fetchTiers",
  async (region = "US", { rejectWithValue }) => {
    try {
      const response = await getVipTiers(region);

      // Check if the API request failed
      if (!response) {
        throw new Error("No response from server");
      }

      if (response.success === false) {
        throw new Error(response.error || "Failed to fetch VIP tiers");
      }

      // Return the data, handling both nested and flat response structures
      return response.data || response;
    } catch (error) {
      return rejectWithValue(error.message || "Failed to fetch VIP tiers");
    }
  },
);

// Initiate subscription flow and get payment intent
export const initiatePurchase = createAsyncThunk(
  "vip/initiatePurchase",
  async ({ tierId, plan, region, token }, { rejectWithValue }) => {
    try {
      // Step 1: Initiate upgrade to get subscriptionId
      const upgradeResponse = await initiateUpgrade(
        { tierId, plan, region },
        token,
      );

      console.log(
        "📦 [initiatePurchase] upgradeResponse:",
        JSON.stringify(upgradeResponse, null, 2),
      );

      // Check if the API request failed (API returns { success: false, error: "..." } on error)
      if (!upgradeResponse) {
        throw new Error("No response from server");
      }

      if (upgradeResponse.success === false) {
        throw new Error(upgradeResponse.error || "Failed to initiate upgrade");
      }

      // Check if the response indicates user already has active subscription
      if (
        typeof upgradeResponse.data === "string" &&
        upgradeResponse.data.includes("already has an active VIP subscription")
      ) {
        throw new Error(upgradeResponse.data);
      }

      // Validate that upgradeResponse.data exists before destructuring
      if (!upgradeResponse.data || typeof upgradeResponse.data !== "object") {
        // Try to use the response itself if it has the required fields
        const dataSource = upgradeResponse.data || upgradeResponse;
        if (!dataSource || !dataSource.subscriptionId) {
          throw new Error("Invalid response from server: Missing upgrade data");
        }
      }

      // Use either nested data or the response itself
      const responseData = upgradeResponse.data || upgradeResponse;

      const {
        subscriptionId,
        paymentIntentId,
        tierId: responseTierId,
        plan: responsePlan,
        amount,
        currency,
      } = responseData;

      if (!subscriptionId) {
        throw new Error("Subscription ID not received.");
      }

      // Validate pricing data
      if (!amount || amount <= 0) {
        throw new Error(`Invalid amount received: ${amount}`);
      }
      if (!currency) {
        throw new Error(`Invalid currency received: ${currency}`);
      }
      if (!responseTierId) {
        throw new Error(`Invalid tierId received: ${responseTierId}`);
      }
      if (!responsePlan) {
        throw new Error(`Invalid plan received: ${responsePlan}`);
      }

      // Step 2: Get Stripe client secret for payment
      const paymentData = {
        subscriptionId,
        paymentMethod: "card",
      };

      const paymentResponse = await startPayment(paymentData, token);

      console.log(
        "📦 [initiatePurchase] paymentResponse:",
        JSON.stringify(paymentResponse, null, 2),
      );

      // Check if the API request failed
      if (!paymentResponse) {
        throw new Error("No response from payment server");
      }

      if (paymentResponse.success === false) {
        throw new Error(paymentResponse.error || "Failed to start payment");
      }

      // Validate that paymentResponse.data exists before destructuring
      if (!paymentResponse.data || typeof paymentResponse.data !== "object") {
        // Try to use the response itself if it has the required fields
        const paymentSource = paymentResponse.data || paymentResponse;
        if (!paymentSource || !paymentSource.clientSecret) {
          throw new Error("Invalid response from server: Missing payment data");
        }
      }

      // Use either nested data or the response itself
      const paymentDataResponse = paymentResponse.data || paymentResponse;

      const { clientSecret, paymentIntentId: responsePaymentIntentId } =
        paymentDataResponse;

      // Check if we have a proper Stripe client secret
      const isProperClientSecret =
        clientSecret && clientSecret.includes("_secret_");
      const isPaymentIntentId = clientSecret && clientSecret.startsWith("pi_");

      // Handle PaymentIntent ID instead of client secret (for mock backend)
      let finalClientSecret = clientSecret;
      if (isPaymentIntentId && !isProperClientSecret) {
        finalClientSecret = `${clientSecret}_secret_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
      }

      // Use finalClientSecret if available, otherwise use paymentIntentId
      finalClientSecret = finalClientSecret || responsePaymentIntentId;
      if (!finalClientSecret) {
        throw new Error("Stripe client secret not received.");
      }

      return {
        subscriptionId,
        clientSecret: finalClientSecret,
        tierId: responseTierId,
        plan: responsePlan,
        amount: amount,
        currency: currency,
      };
    } catch (error) {
      console.error("❌ [initiatePurchase] Error details:", {
        error,
        message: error?.message,
        body: error?.body,
        response: error?.response,
        data: error?.response?.data,
      });

      // Extract error message from various possible locations
      let errorMessage = "Subscription initiation failed";

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.body?.message) {
        errorMessage = error.body.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error?.response?.data === "string") {
        errorMessage = error.response.data;
      } else if (error?.response?.data) {
        errorMessage = JSON.stringify(error.response.data);
      }

      return rejectWithValue(errorMessage);
    }
  },
);

// Confirm payment after Stripe checkout is complete
export const confirmPayment = createAsyncThunk(
  "vip/confirmPayment",
  async ({ paymentIntentId, subscriptionId, token }, { rejectWithValue }) => {
    try {
      // Validate parameters before making API call
      if (!paymentIntentId) {
        throw new Error("Payment Intent ID is required");
      }
      if (!subscriptionId) {
        throw new Error("Subscription ID is required");
      }
      if (!token) {
        throw new Error("Authentication token is required");
      }

      const response = await confirmPaymentApi(
        { paymentIntentId, subscriptionId },
        token,
      );

      console.log(
        "📦 [confirmPayment] response:",
        JSON.stringify(response, null, 2),
      );

      // Check if the API request failed
      if (!response) {
        throw new Error("No response from server");
      }

      if (response.success === false) {
        // Extract error message from various possible locations
        const errorMsg =
          response.error ||
          response.body?.error ||
          response.body?.message ||
          response.message ||
          "Payment confirmation failed";
        throw new Error(errorMsg);
      }

      // Return the data, handling both nested and flat response structures
      return response.data || response;
    } catch (error) {
      console.error("❌ [confirmPayment] Error:", error);

      // Extract error message from various possible locations
      let errorMessage = "Payment confirmation failed";

      if (error?.message) {
        errorMessage = error.message;
      } else if (error?.body?.error) {
        errorMessage = error.body.error;
      } else if (error?.body?.message) {
        errorMessage = error.body.message;
      } else if (error?.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      return rejectWithValue(errorMessage);
    }
  },
);

const initialState = {
  tiers: [],
  region: "US",
  currency: "USD",
  symbol: "$",
  status: "idle",
  error: null,
  purchaseStatus: "idle", // idle | loading | awaiting_payment | succeeded | failed
  purchaseError: null,
  activeSubscriptionId: null,
  paymentClientSecret: null,
  modalLocked: false,
};

const vipSlice = createSlice({
  name: "vip",
  initialState,
  reducers: {
    resetPurchaseStatus: (state) => {
      state.purchaseStatus = "idle";
      state.purchaseError = null;
      state.activeSubscriptionId = null;
      state.paymentClientSecret = null;
      state.modalLocked = false;
    },
    setPurchaseStatus: (state, action) => {
      state.purchaseStatus = action.payload.status;
      state.purchaseError = action.payload.error || null;
      if (action.payload.status !== "succeeded") {
        state.activeSubscriptionId = null;
        state.paymentClientSecret = null;
      }
    },
    lockModal: (state) => {
      state.modalLocked = true;
    },
    unlockModal: (state) => {
      state.modalLocked = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVipTiers.pending, (state) => {
        state.status = "loading";
      })
      .addCase(fetchVipTiers.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.tiers = action.payload.tiers.sort((a, b) => a.order - b.order);
        state.region = action.payload.region;
        state.currency = action.payload.currency;
        state.symbol = action.payload.symbol;
      })
      .addCase(fetchVipTiers.rejected, (state, action) => {
        state.status = "failed";
        state.error = action.payload;
      })
      .addCase(initiatePurchase.pending, (state) => {
        state.purchaseStatus = "loading";
        state.purchaseError = null;
        state.paymentClientSecret = null;
      })
      .addCase(initiatePurchase.fulfilled, (state, action) => {
        state.purchaseStatus = "awaiting_payment";
        state.activeSubscriptionId = action.payload.subscriptionId;
        state.paymentClientSecret = action.payload.clientSecret;
      })
      .addCase(initiatePurchase.rejected, (state, action) => {
        state.purchaseStatus = "failed";
        state.purchaseError = action.payload;
      })
      .addCase(confirmPayment.pending, (state) => {
        state.purchaseStatus = "loading";
        state.purchaseError = null;
      })
      .addCase(confirmPayment.fulfilled, (state, action) => {
        state.purchaseStatus = "succeeded";
        state.purchaseError = null;
        state.activeSubscriptionId = null;
        state.paymentClientSecret = null;
      })
      .addCase(confirmPayment.rejected, (state, action) => {
        state.purchaseStatus = "failed";
        state.purchaseError = action.payload;
      });
  },
});

export const {
  resetPurchaseStatus,
  setPurchaseStatus,
  lockModal,
  unlockModal,
} = vipSlice.actions;
export default vipSlice.reducer;
