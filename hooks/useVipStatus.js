import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchVipStatus } from "@/lib/redux/slice/profileSlice";

/**
 * Custom hook for managing VIP status across the application
 * Automatically fetches VIP status when needed and provides refresh functionality
 */
export const useVipStatus = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth || {});
  const { vipStatus, vipStatusState } = useSelector((state) => state.profile);

  // Auto-fetch VIP status when token is available and status is idle
  useEffect(() => {
    if (token && vipStatusState === "idle") {
      console.log("🔄 [useVipStatus] Auto-fetching VIP status...");
      dispatch(fetchVipStatus(token));
    }
  }, [dispatch, token, vipStatusState]);

  // Refresh VIP status function
  const refreshVipStatus = () => {
    if (token) {
      console.log("🔄 [useVipStatus] Manually refreshing VIP status...");
      dispatch(fetchVipStatus(token));
    }
  };

  // Force refresh VIP status (bypasses idle check)
  const forceRefreshVipStatus = () => {
    if (token) {
      console.log("🔄 [useVipStatus] Force refreshing VIP status...");
      dispatch(fetchVipStatus(token));
    }
  };

  // Check if VIP is active
  const isVipActive =
    vipStatus?.data?.isActive &&
    vipStatus?.data?.currentTier &&
    vipStatus?.data?.currentTier !== "Free";

  // Get current tier
  const currentTier = vipStatus?.data?.currentTier;

  // Get formatted tier name
  const formattedTierName = currentTier
    ? currentTier.charAt(0).toUpperCase() + currentTier.slice(1).toLowerCase()
    : "VIP";

  return {
    vipStatus,
    vipStatusState,
    isVipActive,
    currentTier,
    formattedTierName,
    refreshVipStatus,
    forceRefreshVipStatus,
    isLoading: vipStatusState === "loading",
    hasError: vipStatusState === "failed",
  };
};

/**
 * Hook for pages that need VIP status refresh on focus/visibility
 */
export const useVipStatusWithRefresh = () => {
  const vipStatusHook = useVipStatus();
  const { token } = useSelector((state) => state.auth || {});

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        console.log(
          "🔄 [useVipStatusWithRefresh] Page became visible, refreshing VIP status...",
        );
        vipStatusHook.refreshVipStatus();
      }
    };

    const handleFocus = () => {
      if (token) {
        console.log(
          "🔄 [useVipStatusWithRefresh] Page focused, refreshing VIP status...",
        );
        vipStatusHook.refreshVipStatus();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [token, vipStatusHook.refreshVipStatus]);

  return vipStatusHook;
};
