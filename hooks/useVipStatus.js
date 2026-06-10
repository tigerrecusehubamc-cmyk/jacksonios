import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { fetchVipStatus } from "@/lib/redux/slice/profileSlice";

export const useVipStatus = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth || {});
  const { vipStatus, vipStatusState } = useSelector((state) => state.profile);

  useEffect(() => {
    if (token && vipStatusState === "idle") {
      dispatch(fetchVipStatus(token));
    }
  }, [dispatch, token, vipStatusState]);

  const refreshVipStatus = () => {
    if (token) {
      dispatch(fetchVipStatus(token));
    }
  };

  const forceRefreshVipStatus = () => {
    if (token) {
      dispatch(fetchVipStatus(token));
    }
  };

  const isVipActive =
    vipStatus?.data?.isActive &&
    vipStatus?.data?.currentTier &&
    vipStatus?.data?.currentTier !== "Free";

  const currentTier = vipStatus?.data?.currentTier;

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

export const useVipStatusWithRefresh = () => {
  const vipStatusHook = useVipStatus();
  const { token } = useSelector((state) => state.auth || {});

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && token) {
        vipStatusHook.refreshVipStatus();
      }
    };

    const handleFocus = () => {
      if (token) {
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
