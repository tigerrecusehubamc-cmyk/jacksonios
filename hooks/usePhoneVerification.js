"use client";
import { useState } from "react";
import { verifyPhoneNumber } from "@/lib/api";
import { formatPhoneToE164, validateE164Phone } from "@/lib/deviceUtils";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook for phone verification with Verisoul Fraud Prevention API
 * @returns {Object} Phone verification state and functions
 */
export const usePhoneVerification = () => {
  const { token } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState(null);
  const [verificationId, setVerificationId] = useState(null);

  /**
   * Verify phone number
   * @param {string} countryCode - Country code (e.g., "1", "91")
   * @param {string} phoneNumber - Phone number without country code
   * @returns {Promise<Object>} Verification result
   */
  const verifyPhone = async (countryCode, phoneNumber) => {
    if (!token) {
      setError("Authentication required");
      return { success: false, error: "Authentication required" };
    }

    if (!phoneNumber || !countryCode) {
      setError("Phone number and country code are required");
      return { success: false, error: "Phone number and country code are required" };
    }

    setIsVerifying(true);
    setError(null);
    setVerificationId(null);

    try {
      // Format phone number to E.164
      const formattedPhone = formatPhoneToE164(countryCode, phoneNumber);

      // Validate format
      if (!validateE164Phone(formattedPhone)) {
        const errorMsg = "Invalid phone number format. Please include country code.";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }

      // Call verification API
      const response = await verifyPhoneNumber(formattedPhone, token);

      if (response?.success) {
        const verificationId = response?.data?.verification_id;
        setVerificationId(verificationId);
        return {
          success: true,
          verificationId,
          message: response?.message || "Phone verification initiated successfully",
        };
      } else {
        const errorMsg = response?.error?.message || response?.message || "Failed to verify phone number";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err.message || "Network error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Verify phone number with E.164 formatted string
   * @param {string} formattedPhone - Phone number in E.164 format (e.g., "+1234567890")
   * @returns {Promise<Object>} Verification result
   */
  const verifyPhoneE164 = async (formattedPhone) => {
    if (!token) {
      setError("Authentication required");
      return { success: false, error: "Authentication required" };
    }

    if (!formattedPhone) {
      setError("Phone number is required");
      return { success: false, error: "Phone number is required" };
    }

    // Validate format
    if (!validateE164Phone(formattedPhone)) {
      const errorMsg = "Invalid phone number format. Must be in E.164 format (e.g., +1234567890)";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }

    setIsVerifying(true);
    setError(null);
    setVerificationId(null);

    try {
      const response = await verifyPhoneNumber(formattedPhone, token);

      if (response?.success) {
        const verificationId = response?.data?.verification_id;
        setVerificationId(verificationId);
        return {
          success: true,
          verificationId,
          message: response?.message || "Phone verification initiated successfully",
        };
      } else {
        const errorMsg = response?.error?.message || response?.message || "Failed to verify phone number";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err.message || "Network error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsVerifying(false);
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Reset verification state
   */
  const reset = () => {
    setIsVerifying(false);
    setError(null);
    setVerificationId(null);
  };

  return {
    verifyPhone,
    verifyPhoneE164,
    isVerifying,
    error,
    verificationId,
    clearError,
    reset,
  };
};
