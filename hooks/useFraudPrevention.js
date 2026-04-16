"use client";
import { useState, useEffect } from "react";
import {
  getFraudAccountInfo,
  getFraudAccountSessions,
  getFraudSessionStatus,
} from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook for fraud prevention account security information
 * @returns {Object} Account security state and functions
 */
export const useFraudPrevention = () => {
  const { user, token } = useAuth();
  const [accountInfo, setAccountInfo] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load account security information
   */
  const loadAccountInfo = async () => {
    if (!user || !token) {
      setError("Authentication required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const accountId = user._id || user.id || String(user._id || user.id);
      const response = await getFraudAccountInfo(accountId, token);

      if (response?.success) {
        setAccountInfo(response.data);
        return { success: true, data: response.data };
      } else {
        const errorMsg = response?.error?.message || response?.message || "Failed to load account info";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err.message || "Network error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load active sessions for the account
   */
  const loadAccountSessions = async () => {
    if (!user || !token) {
      setError("Authentication required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const accountId = user._id || user.id || String(user._id || user.id);
      const response = await getFraudAccountSessions(accountId, token);

      if (response?.success) {
        setSessions(response.data?.sessions || []);
        return { success: true, sessions: response.data?.sessions || [] };
      } else {
        const errorMsg = response?.error?.message || response?.message || "Failed to load sessions";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err.message || "Network error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Check current session status
   */
  const checkSessionStatus = async () => {
    if (!token) {
      setError("Authentication required");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const storedSessionId = localStorage.getItem("verisoul_session_id");
      if (!storedSessionId) {
        setError("No active session found");
        return { success: false, error: "No active session found" };
      }

      const response = await getFraudSessionStatus(storedSessionId, token);

      if (response?.success) {
        setSessionStatus(response.data);
        return { success: true, data: response.data };
      } else {
        const errorMsg = response?.error?.message || response?.message || "Failed to check session status";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err.message || "Network error occurred";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear error state
   */
  const clearError = () => {
    setError(null);
  };

  /**
   * Reset all state
   */
  const reset = () => {
    setAccountInfo(null);
    setSessions([]);
    setSessionStatus(null);
    setIsLoading(false);
    setError(null);
  };

  return {
    accountInfo,
    sessions,
    sessionStatus,
    isLoading,
    error,
    loadAccountInfo,
    loadAccountSessions,
    checkSessionStatus,
    clearError,
    reset,
  };
};
