import { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchUserData } from "@/lib/redux/slice/gameSlice";
import { fetchWalletScreen } from "@/lib/redux/slice/walletTransactionsSlice";
import { fetchProfileStats } from "@/lib/redux/slice/profileSlice";

/**
 * Custom hook to manage homepage data efficiently
 * Prevents unnecessary API calls and re-renders
 */
export const useHomepageData = (token, user) => {
  const dispatch = useDispatch();

  // Get all necessary state from Redux
  const {
    stats,
    statsStatus,
    dashboardData,
    dashboardStatus,
    details,
    detailsStatus,
  } = useSelector((state) => state.profile);

  const { userDataStatus, userData } = useSelector((state) => state.games);
  const { walletScreenStatus, walletScreen } = useSelector(
    (state) => state.walletTransactions
  );

  // OPTIMIZED: Enhanced data availability check with persistence awareness
  // OPTIMIZED: Only require walletScreen for core UI (RewardProgress, XPTierTracker)
  // Don't block homepage render waiting for stats or userData
  const dataAvailability = useMemo(() => {
    const hasStats =
      (dashboardData?.stats || stats) &&
      (statsStatus === "succeeded" || dashboardStatus === "succeeded");
    const hasUserData =
      userData && (userDataStatus === "succeeded" || userDataStatus === "idle");
    // Check for walletScreen data existence (persisted data is available even if status is "idle")
    // This is CRITICAL for RewardProgress and XPTierTracker to show immediately
    const hasWalletData = walletScreen && (walletScreenStatus === "succeeded" || walletScreenStatus === "idle");
    const hasDashboardData = dashboardData && dashboardStatus === "succeeded";

    // OPTIMIZED: Only check loading for walletScreen (core data)
    // Stats and userData are nice-to-have and shouldn't block homepage render
    const isCoreLoading = walletScreenStatus === "loading";
    const hasCoreData = hasWalletData; // Only walletScreen is required for homepage to feel "ready"

    return {
      hasStats,
      hasUserData,
      hasWalletData,
      hasDashboardData,
      // Only show loading if we have NO core data (walletScreen) and are actively loading
      // This allows homepage to render immediately with walletScreen data, even if stats/userData are still loading
      shouldShowLoading: !hasCoreData && isCoreLoading,
    };
  }, [
    dashboardData,
    stats,
    userDataStatus,
    userData,
    walletScreenStatus,
    walletScreen,
    statsStatus,
    dashboardStatus,
  ]);

  // INDUSTRIAL: Only fetch if we don't have data (avoid duplicate fetches; AuthContext already fetches)
  useEffect(() => {
    if (!token || !user?._id) return;

    const hasStats =
      (stats || dashboardData?.stats) &&
      (statsStatus === "succeeded" || dashboardStatus === "succeeded");
    if (!hasStats && statsStatus === "idle") {
      dispatch(fetchProfileStats({ token }));
    }

    if (userDataStatus === "idle" && !userData) {
      dispatch(
        fetchUserData({
          userId: user._id,
          token: token,
        })
      );
    }
  }, [token, user, userDataStatus, userData, statsStatus, dashboardStatus, stats, dashboardData, dispatch]);

  // Refresh balance/XP when app comes to foreground (admin changes)
  useEffect(() => {
    if (!token) return;

    const handleFocus = () => {
      // Force refresh to get latest admin changes
      dispatch(fetchProfileStats({ token, force: true }));
      dispatch(fetchWalletScreen({ token, force: true }));
    };

    // Listen for window focus (app comes to foreground)
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [token, dispatch]);

  return {
    // Data
    stats: dashboardData?.stats || stats,
    userData,
    walletScreen,
    details,

    // Loading states
    isLoading: dataAvailability.shouldShowLoading,
    hasStats: dataAvailability.hasStats,
    hasUserData: dataAvailability.hasUserData,
    hasWalletData: dataAvailability.hasWalletData,

    // Status
    statsStatus,
    userDataStatus,
    walletScreenStatus,
    detailsStatus,
  };
};
