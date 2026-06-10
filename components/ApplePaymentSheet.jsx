"use client";
import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import {
  confirmApplePayment,
  lockModal,
  unlockModal,
} from "@/lib/redux/slice/vipSlice";
import { purchaseSubscription } from "@/lib/appleIAP";

export default function ApplePaymentSheet({
  subscriptionId,
  appleProductId,
  token,
  onPaymentSuccess,
  onPaymentError,
  onPaymentCancel,
}) {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setIsInitializing(false);
  }, []);

  const handlePurchase = async () => {
    setIsLoading(true);
    setError(null);
    dispatch(lockModal());

    try {
      const purchaseResult = await purchaseSubscription(appleProductId);

      const result = await dispatch(
        confirmApplePayment({
          subscriptionId,
          transactionId: purchaseResult.transactionId,
          transactionReceipt: purchaseResult.transactionReceipt,
          productId: purchaseResult.productId,
          token,
        })
      );

      if (result.type && result.type.endsWith("/rejected")) {
        const errorMessage = result.payload || "Payment verification failed with backend";
        throw new Error(errorMessage);
      }

      if (onPaymentSuccess) {
        onPaymentSuccess({
          transactionId: purchaseResult.transactionId,
          productId: purchaseResult.productId,
          verified: true,
          verificationData: result.payload
        });
      }
    } catch (err) {
      const msg = err?.message || "";
      const code = err?.code;

      const isCancelled =
        err?.isCancelled ||
        code === 'E_USER_CANCELLED' ||
        code === 2 ||
        msg.toLowerCase().includes("cancel");

      if (isCancelled) {
        if (onPaymentCancel) onPaymentCancel();
      } else {
        const errorMsg = err?.userMessage || msg || "Purchase failed. Please try again.";
        setError(errorMsg);
        if (onPaymentError) onPaymentError(err);
      }
    } finally {
      setIsLoading(false);
      dispatch(unlockModal());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-white/20 rounded-xl p-6 max-w-sm w-full">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
            {isLoading || isInitializing ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            ) : (
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2.01.77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
            )}
          </div>

          <h3 className="text-xl font-bold text-white mb-2">
            {isInitializing
              ? "Loading..."
              : isLoading
              ? "Processing..."
              : "Subscribe with App Store"}
          </h3>

          {error ? (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-500 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          ) : (
            !isInitializing && !isLoading && (
              <p className="text-gray-300 text-sm mb-6">
                Your subscription will be billed via the App Store
              </p>
            )
          )}

          {!isInitializing && !isLoading && (
            <button
              onClick={handlePurchase}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              Subscribe Now
            </button>
          )}

          {!isLoading && (
            <button
              onClick={onPaymentCancel}
              className="w-full mt-3 px-6 py-2 border border-white/30 text-white rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          )}

          <p className="text-xs text-gray-400 mt-4">
            Secured by <span className="font-semibold">Apple</span>
          </p>
        </div>
      </div>
    </div>
  );
}
