import { useState, useEffect, useCallback, useRef } from "react";

export const useRealTimeCountdown = ({
  endTime = null,
  defaultDuration = 24 * 60 * 60, // 24 hours in seconds
  persist = true,
  storageKey = "countdownTimer",
  autoReset = false,
} = {}) => {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isExpired, setIsExpired] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef(null);
  const endTimeRef = useRef(null);

  // Get or create end time
  const getOrCreateEndTime = useCallback(() => {
    try {
      let targetTime = null;
      let serverEndTime = null;
      const now = Date.now();

      // If endTime is provided from server, parse it
      if (endTime) {
        if (typeof endTime === "string") {
          serverEndTime = new Date(endTime).getTime();
        } else if (endTime instanceof Date) {
          serverEndTime = endTime.getTime();
        } else if (typeof endTime === "number") {
          serverEndTime = endTime;
        }

        // Persist server endTime if persistence is enabled (even if expired)
        if (serverEndTime && persist) {
          localStorage.setItem(storageKey, serverEndTime.toString());
        }

        // Use server time if it's valid (not in the past)
        if (serverEndTime && serverEndTime > now) {
          targetTime = serverEndTime;
        }
      }

      // If no valid server time, check storage for persisted time
      if (!targetTime && persist) {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const storedTime = parseInt(stored, 10);
          // Only use stored time if it's valid (not in the past)
          if (storedTime > now) {
            targetTime = storedTime;
          }
        }
      }

      // If still no valid time, create new one
      if (!targetTime || targetTime <= now) {
        targetTime = now + defaultDuration * 1000;
        if (persist) {
          localStorage.setItem(storageKey, targetTime.toString());
        }
      }

      return targetTime;
    } catch (error) {
      console.error("Error getting/creating end time:", error);
      // Fallback: create new end time
      const fallbackTime = Date.now() + defaultDuration * 1000;
      return fallbackTime;
    }
  }, [endTime, defaultDuration, persist, storageKey]);

  // Calculate remaining time based on actual time difference
  const calculateRemainingTime = useCallback((targetTime) => {
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((targetTime - now) / 1000));
    return {
      remaining,
      isExpired: remaining === 0,
    };
  }, []);

  // Update timer state
  const updateTimer = useCallback(() => {
    if (!endTimeRef.current) return;

    const result = calculateRemainingTime(endTimeRef.current);
    setTimeRemaining(result.remaining);
    setIsExpired(result.isExpired);

    // Auto reset if expired and autoReset is enabled
    if (result.isExpired && autoReset) {
      const newEndTime = Date.now() + defaultDuration * 1000;
      endTimeRef.current = newEndTime;
      if (persist) {
        localStorage.setItem(storageKey, newEndTime.toString());
      }
      const newResult = calculateRemainingTime(newEndTime);
      setTimeRemaining(newResult.remaining);
      setIsExpired(newResult.isExpired);
    }
  }, [calculateRemainingTime, autoReset, defaultDuration, persist, storageKey]);

  // Initialize timer
  useEffect(() => {
    const initializeTimer = () => {
      try {
        setIsLoading(true);
        const targetTime = getOrCreateEndTime();
        endTimeRef.current = targetTime;

        // Calculate initial state
        const result = calculateRemainingTime(targetTime);
        setTimeRemaining(result.remaining);
        setIsExpired(result.isExpired);

        // Clear any existing interval
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }

        // Set up new interval
        intervalRef.current = setInterval(updateTimer, 1000);
        setIsLoading(false);
      } catch (error) {
        console.error("Error initializing timer:", error);
        setIsLoading(false);
      }
    };

    initializeTimer();

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [getOrCreateEndTime, calculateRemainingTime, updateTimer]);

  // Format time as HH:MM:SS
  const formatTime = useCallback((seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  // Reset timer
  const resetTimer = useCallback(() => {
    const newEndTime = Date.now() + defaultDuration * 1000;
    endTimeRef.current = newEndTime;

    if (persist) {
      localStorage.setItem(storageKey, newEndTime.toString());
    }

    const result = calculateRemainingTime(newEndTime);
    setTimeRemaining(result.remaining);
    setIsExpired(result.isExpired);
  }, [defaultDuration, persist, storageKey, calculateRemainingTime]);

  // Clear timer
  const clearTimer = useCallback(() => {
    if (persist) {
      localStorage.removeItem(storageKey);
    }
    endTimeRef.current = null;
    setTimeRemaining(0);
    setIsExpired(true);
  }, [persist, storageKey]);

  // Extend timer
  const extendTimer = useCallback(
    (additionalSeconds) => {
      if (endTimeRef.current) {
        const newEndTime = endTimeRef.current + additionalSeconds * 1000;
        endTimeRef.current = newEndTime;

        if (persist) {
          localStorage.setItem(storageKey, newEndTime.toString());
        }

        const result = calculateRemainingTime(newEndTime);
        setTimeRemaining(result.remaining);
        setIsExpired(result.isExpired);
      }
    },
    [persist, storageKey, calculateRemainingTime]
  );

  return {
    timeRemaining,
    isExpired,
    isLoading,
    formatTime: formatTime(timeRemaining),
    resetTimer,
    clearTimer,
    extendTimer,
    // Raw values for custom formatting
    hours: Math.floor(timeRemaining / 3600),
    minutes: Math.floor((timeRemaining % 3600) / 60),
    seconds: timeRemaining % 60,
  };
};
