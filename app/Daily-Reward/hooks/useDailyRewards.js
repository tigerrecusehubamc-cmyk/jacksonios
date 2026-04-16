import { useState, useCallback, useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { updateUserEarnings } from "@/lib/redux/slice/gameSlice";
import {
  fetchWalletScreen,
  fetchWalletTransactions,
  fetchFullWalletTransactions,
} from "@/lib/redux/slice/walletTransactionsSlice";
import { fetchProfileStats } from "@/lib/redux/slice/profileSlice";
import {
  getDailyRewardsWeek,
  claimDailyReward,
  recoverMissedDailyReward,
} from "@/lib/api";

export const useDailyRewards = () => {
  const dispatch = useDispatch();
  const [weekData, setWeekData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(new Date());
  const [isNavigating, setIsNavigating] = useState(false);
  const [isCurrentWeek, setIsCurrentWeek] = useState(true);
  const [isFutureWeek, setIsFutureWeek] = useState(false);

  // Use ref to always have the latest currentWeekStart value
  const currentWeekStartRef = useRef(currentWeekStart);

  // Update ref whenever currentWeekStart changes
  useEffect(() => {
    currentWeekStartRef.current = currentWeekStart;
  }, [currentWeekStart]);

  // Hydrate from localStorage cache immediately to avoid initial loading flicker
  useEffect(() => {
    try {
      const cached = localStorage.getItem("daily_rewards_current_week");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.data) {
          setWeekData(parsed.data);
          if (parsed.data.weekStart) {
            setCurrentWeekStart(new Date(parsed.data.weekStart));
          }
          // Also set isCurrentWeek and isFutureWeek based on cached data
          const now = new Date();
          const weekStart = new Date(parsed.data.weekStart);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          setIsCurrentWeek(now >= weekStart && now <= weekEnd);
          setIsFutureWeek(weekStart > now);
        }
      }
    } catch (_e) {
      // ignore cache errors
    }
  }, []);

  // Fetch week data (with cache)
  const fetchWeekData = useCallback(
    async (date = null, forceRefresh = false) => {
      try {
        const cacheKey = date
          ? `week_${date.toISOString().split("T")[0]}`
          : "current_week";
        const cachedData = localStorage.getItem(`daily_rewards_${cacheKey}`);

        // Only use cache if not forcing refresh and cache is fresh
        if (cachedData && !date && !forceRefresh) {
          try {
            const parsedData = JSON.parse(cachedData);
            const cacheTime = parsedData.cacheTime;
            const now = Date.now();

            // Use cache if less than 2 minutes old (reduced from 5 minutes for better freshness)
            if (now - cacheTime < 2 * 60 * 1000) {
              const cachedWeekData = parsedData.data;
              setWeekData(cachedWeekData);
              setCurrentWeekStart(new Date(cachedWeekData.weekStart));
              setLoading(false); // Ensure loading is false when using cache

              // Also set isCurrentWeek and isFutureWeek based on cached data
              const currentNow = new Date();
              const weekStart = new Date(cachedWeekData.weekStart);
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekEnd.getDate() + 6);
              setIsCurrentWeek(
                currentNow >= weekStart && currentNow <= weekEnd
              );
              setIsFutureWeek(weekStart > currentNow);

              return cachedWeekData;
            }
          } catch (e) {
            // Ignore cache parse error
          }
        }

        // Show loading state when navigating to a different week
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Please log in to view daily rewards.");
        }

        // Use centralized API function instead of hardcoded URL
        const dateString = date ? date.toISOString().split("T")[0] : null;
        const data = await getDailyRewardsWeek(dateString, token);

        if (!data.success) {
          throw new Error(
            data.error || data.message || "Failed to load week data"
          );
        }

        if (data.success && data.data) {
          // Update state with new week data
          const newWeekData = data.data;
          const newWeekStart = new Date(newWeekData.weekStart);

          setWeekData(newWeekData);
          setCurrentWeekStart(newWeekStart);

          // Check if this is the current week or future week
          const now = new Date();
          const weekStart = new Date(newWeekData.weekStart);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);

          const isCurrentWeek = now >= weekStart && now <= weekEnd;
          const isFutureWeek = weekStart > now;
          setIsCurrentWeek(isCurrentWeek);
          setIsFutureWeek(isFutureWeek);

          const cacheData = {
            data: newWeekData,
            cacheTime: Date.now(),
          };
          localStorage.setItem(
            `daily_rewards_${cacheKey}`,
            JSON.stringify(cacheData)
          );

          // Also update the current week cache if this is the current week
          if (isCurrentWeek) {
            localStorage.setItem(
              `daily_rewards_current_week`,
              JSON.stringify(cacheData)
            );
          }

          return newWeekData;
        } else {
          throw new Error(
            data.error || data.message || "Failed to fetch week data"
          );
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [] // Remove weekData dependency to avoid stale closures
  );

  // Go to previous week
  const goToPreviousWeek = useCallback(async () => {
    if (isNavigating) return;

    setIsNavigating(true);
    try {
      // Use ref to get the latest currentWeekStart value (not from closure)
      const current = currentWeekStartRef.current;
      const previousWeek = new Date(current);
      previousWeek.setDate(previousWeek.getDate() - 7);

      // Fetch data for the previous week
      await fetchWeekData(previousWeek);
    } catch (error) {
      // Error navigating to previous week
    } finally {
      setIsNavigating(false);
    }
  }, [fetchWeekData, isNavigating]);

  // Go to next week
  const goToNextWeek = useCallback(async () => {
    if (isNavigating) return;

    setIsNavigating(true);
    try {
      // Use ref to get the latest currentWeekStart value (not from closure)
      const current = currentWeekStartRef.current;
      const nextWeek = new Date(current);
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Fetch data for the next week
      await fetchWeekData(nextWeek);
    } catch (error) {
      // Error navigating to next week
    } finally {
      setIsNavigating(false);
    }
  }, [fetchWeekData, isNavigating]);

  // Claim reward
  const handleRewardClaim = useCallback(
    async (dayNumber) => {
      try {
        if (!dayNumber || dayNumber < 1 || dayNumber > 7) {
          throw new Error("Invalid day number. Must be between 1-7.");
        }

        const token = localStorage.getItem("authToken");
        if (!token) {
          throw new Error("Please log in to claim rewards.");
        }

        // Use centralized API function instead of hardcoded URL
        const data = await claimDailyReward(dayNumber, token);

        if (!data.success) {
          throw new Error(
            data.error || data.message || "Failed to claim reward"
          );
        }

        if (data.success && data.data) {
          // Update Redux store with new coins and XP from reward response
          // Use xp value from response (includes multipliers) for reward model
          dispatch(
            updateUserEarnings({
              coins: data.data.coins || 0,
              xp: data.data.xp || 0,
            })
          );

          // Refresh wallet screen data for real-time updates
          try {
            await dispatch(fetchWalletScreen({ token, force: true }));
          } catch (walletError) {
            // Failed to refresh wallet screen
            // Don't throw error - reward was still claimed successfully
          }

          // Refresh transaction history in background (non-blocking)
          // Uses stale-while-revalidate pattern - shows cached data immediately, updates in background
          Promise.all([
            dispatch(fetchWalletTransactions({ token, limit: 5, background: true })).catch(() => {}),
            dispatch(
              fetchFullWalletTransactions({
                token,
                page: 1,
                limit: 20,
                type: "all",
                background: true,
              })
            ).catch(() => {}),
          ]).catch(() => {
            // Silently fail - reward was already claimed successfully, transactions will refresh later
          });

          // Refresh profile stats for homepage components (RewardProgress, XPTierTracker)
          try {
            await dispatch(fetchProfileStats({ token, force: true }));
          } catch (statsError) {
            // Failed to refresh profile stats
            // Don't throw error - reward was still claimed successfully
          }

          // Set success message immediately so user sees it right away
          // Use actual earned amounts from API response
          const earnedCoins = data.data.coins || data.data.rewardCoins || 0;
          // Use xp value from reward response (includes multipliers)
          const earnedXp =
            data.data.xp ||
            data.data.rewardXp ||
            data.data.baseXp ||
            data.data.baseXP ||
            0;

          setSuccessMessage(
            `Reward claimed! You earned ${earnedCoins} coins and ${earnedXp} XP!`
          );
          setError(null);

          // Force refresh to get updated status and timer from backend
          // Clear cache for current week to force fresh fetch
          const cacheKey = "current_week";
          localStorage.removeItem(`daily_rewards_${cacheKey}`);
          localStorage.removeItem(`daily_rewards_current_week`);

          // Wait for API to update, then refresh to show "CLAIMED" status and timer
          // This ensures the button only changes to "CLAIMED" after successful API confirmation
          // Don't await this - let it happen in background so modal can show immediately
          setTimeout(async () => {
            try {
              await fetchWeekData(currentWeekStartRef.current, true);
            } catch (refreshError) {
              // Failed to refresh week data after claim
              // Don't throw - reward was already claimed successfully
            }
          }, 500);

          return data.data;
        } else {
          throw new Error(
            data.error || data.message || "Failed to claim reward"
          );
        }
      } catch (err) {
        setError(err.message);
        throw err;
      }
    },
    [fetchWeekData, dispatch]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear success message
  const clearSuccessMessage = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  return {
    weekData,
    loading,
    error,
    successMessage,
    currentWeekStart,
    isNavigating,
    isCurrentWeek,
    isFutureWeek,
    fetchWeekData,
    goToPreviousWeek,
    goToNextWeek,
    handleRewardClaim,
    clearError,
    clearSuccessMessage,
  };
};
