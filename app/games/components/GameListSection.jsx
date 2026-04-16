"use client";
import React, { useEffect, useRef, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { fetchUserData, loadUserDataFromCache, fetchBitlabsAIDownloadedGames } from "@/lib/redux/slice/gameSlice";
import { safeLocalStorage } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import GameItemCard from "./GameItemCard";
import NonGamingOffersCarousel from "./NonGamingOffersCarousel";
import AccountOverviewCard from "./AccountOverviewCard";
import WatchAdCard from "./WatchAdCard";
import NonGameOffersSection from "../../homepage/components/NonGameOffersSection";


// Static data for non-gaming offers carousel
const nonGamingOffers = [
  {
    id: 1,
    name: "Albert- Mobile Banking",
    image: "/assets/animaapp/xCaMzUYh/img/image-3982-2x.png",
    bgImage: "/assets/animaapp/xCaMzUYh/img/rectangle-74-2x.png",
    bottomBg: "/assets/animaapp/xCaMzUYh/img/rectangle-76-2x.png",
    earnAmount: "Earn upto 100",
  },
  {
    id: 2,
    name: "Chime- Mobile Banking",
    image: "/assets/animaapp/xCaMzUYh/img/image-3980-2x.png",
    bgImage: "/assets/animaapp/xCaMzUYh/img/rectangle-73-1-2x.png",
    bottomBg: "/assets/animaapp/xCaMzUYh/img/rectangle-74-1-2x.png",
    earnAmount: "Earn upto 100",
  },
  {
    id: 3,
    name: "Albert- Mobile Banking",
    image: "/assets/animaapp/xCaMzUYh/img/image-3982-2x.png",
    bgImage: "/assets/animaapp/xCaMzUYh/img/rectangle-74-2x.png",
    bottomBg: "/assets/animaapp/xCaMzUYh/img/rectangle-76-2x.png",
    earnAmount: "Earn upto 100",
  },
];

// Use this custom hook to subscribe to Downloaded events (works in React Native WebView/Android too)
function useGameDownloadedRefetch(callback) {
  useEffect(() => {
    // In ANDROID or WebView, you should post a "game-downloaded" event after download.
    // For pure web fallback, listen to window event.
    // When download happens inside the app (e.g. download button), trigger window.dispatchEvent(new CustomEvent('game-downloaded'))
    function onGameDownloaded(e) {
      callback && callback(e);
    }

    window.addEventListener('game-downloaded', onGameDownloaded);

    // Listen for message events (for Android WebView):
    function onMessage(event) {
      if (
        typeof event.data === 'string' &&
        event.data.toLowerCase().includes('game-downloaded')
      ) {
        callback && callback({ type: "webview", data: event.data });
      }
    }
    window.addEventListener('message', onMessage);

    // In some Android web app glue code, you may have to listen for other bridge events.

    return () => {
      window.removeEventListener('game-downloaded', onGameDownloaded);
      window.removeEventListener('message', onMessage);
    }
  }, [callback]);
}


export const GameListSection = ({ searchQuery = "", showSearch = false }) => {
  const dispatch = useDispatch();
  const router = useRouter();
  const { token } = useAuth();

  // Redux
  const { inProgressGames, bitlabsAIDownloadedGames, userDataStatus, bitlabsAIDownloadedGamesStatus, error } = useSelector((state) => state.games);

  // Client-side only state to prevent hydration mismatches
  const [isClient, setIsClient] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setHasNavigated(true); // Mark that user has navigated to this page
  }, []);

  // Helper to get userId
  const getUserId = () => {
    try {
      const userData = safeLocalStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const userId = user._id || user.id;
        return userId;
      }
    } catch (error) {
      // Error getting user ID from localStorage
    }
    return null;
  };

  // Refresh user data when app comes to foreground — stale check prevents redundant calls.
  // Only visibilitychange is used (focus also fires on return causing double fetchUserData).
  useEffect(() => {
    if (!isClient) return;

    const STALE_MS = 2 * 60 * 1000;
    const handleVisibilityChange = () => {
      if (document.hidden) return;
      const userId = getUserId();
      if (!userId) return;
      const lastFetch = safeLocalStorage.getItem(`userData_lastFetch_${userId}`);
      const isStale = !lastFetch || Date.now() - parseInt(lastFetch, 10) > STALE_MS;
      if (!isStale) return;
      safeLocalStorage.setItem(`userData_lastFetch_${userId}`, String(Date.now()));
      dispatch(fetchUserData({ userId, token, force: true, background: true }));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isClient, dispatch, token]);

  // Track loading at download event
  const refreshingRef = useRef(false);

  // Load cached data from localStorage immediately for instant display
  useEffect(() => {
    if (!isClient) return;

    const userId = getUserId();
    if (!userId) return;

    // Load from localStorage cache immediately (before API call)
    try {
      const CACHE_KEY = `userData_${userId}`;
      const cachedData = localStorage.getItem(CACHE_KEY);
      if (cachedData) {
        const parsed = JSON.parse(cachedData);
        const cacheAge = Date.now() - (parsed.timestamp || 0);
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

        // Load cache if it exists (even if stale - will refresh in background)
        if (parsed.data && cacheAge < CACHE_TTL * 2) { // Allow stale cache up to 10 minutes
          dispatch(loadUserDataFromCache({
            userData: parsed.data,
            timestamp: parsed.timestamp,
          }));
        }
      }
    } catch (err) {
      // Failed to load cache - continue to API fetch
    }
  }, [dispatch, isClient]);

  // Single data fetch on component mount - stale-while-revalidate handles caching
  // This fetches data once, showing cached data immediately if available
  // Redux slice automatically handles background refresh for stale cache
  useEffect(() => {
    if (!isClient) return;

    const userId = getUserId();
    if (userId) {
      // Fetch Besitos data - stale-while-revalidate will return cached data immediately if available
      // and refresh in background automatically
      dispatch(fetchUserData({ userId, token }));

      // Fetch Bitlabs AI downloaded games
      dispatch(fetchBitlabsAIDownloadedGames({ userId, token }));
    }
  }, [dispatch, isClient, token]);

  // Main fix: Listen to game download event - refetch without full refresh
  useGameDownloadedRefetch((event) => {
    const userId = getUserId();
    if (userId && userDataStatus !== 'loading') {
      refreshingRef.current = true;

      // Add retry logic for VPN connections
      const fetchWithRetry = async (retryCount = 0) => {
        try {
          await dispatch(fetchUserData({ userId, devicePlatform: "android" }));
        } catch (error) {
          if (retryCount < 3 && error.message.includes('timeout')) {
            setTimeout(() => fetchWithRetry(retryCount + 1), 2000);
          } else {
            // Failed to refresh after retries
          }
        }
      };

      fetchWithRetry();
    }
  });

  // Auto hide manual loading indicator after update
  useEffect(() => {
    if (refreshingRef.current && userDataStatus !== "loading") {
      refreshingRef.current = false;
    }
  }, [userDataStatus]);


  // Add retry mechanism for failed requests
  useEffect(() => {
    const userId = getUserId();

    // Retry Besitos data if failed
    if (userDataStatus === "failed" && !refreshingRef.current && userId) {
      setTimeout(() => {
        dispatch(fetchUserData({ userId, token }));
      }, 2000); // Retry after 2 seconds
    }

    // Retry Bitlabs AI data if failed
    if (bitlabsAIDownloadedGamesStatus === "failed" && !refreshingRef.current && userId) {
      setTimeout(() => {
        dispatch(fetchBitlabsAIDownloadedGames({ userId, token }));
      }, 2000); // Retry after 2 seconds
    }
  }, [userDataStatus, bitlabsAIDownloadedGamesStatus, dispatch]);


  // Combine Besitos and Bitlabs AI downloaded games — exclude stub/empty entries so we don't show a default "(Game)" when no real data came from Bitlab/Besitos
  const hasValidName = (g) =>
    g && typeof g === "object" && (g.title || g.name || g.product_name || g.anchor || g.details?.name);
  const besitosGames = (inProgressGames && Array.isArray(inProgressGames) ? inProgressGames : []).filter(hasValidName);
  const bitlabsAIGames = (bitlabsAIDownloadedGames && Array.isArray(bitlabsAIDownloadedGames) ? bitlabsAIDownloadedGames : []).filter(hasValidName);
  const allDownloadedGames = [...besitosGames, ...bitlabsAIGames];

  // Re-map with safety check for both data sources (Besitos + BitLabs AI)
  // Use same id/image mapping as UI sections so redirect and images work for all downloaded games
  const downloadedGames = allDownloadedGames.map((game) => {
    const goalsList = game.goals || [];
    const completedGoalsCount = goalsList.filter(g => g.completed === true || g.status === "completed").length || 0;
    const totalGoals = goalsList.length || 0;
    // Coins: same as LevelsSection — sum of completed goals' amount/points
    const earnedAmount = Number(
      goalsList
        .filter(g => g.completed === true || g.status === "completed")
        .reduce((sum, goal) => sum + (parseFloat(goal.amount || goal.points) || 0), 0)
    ) || 0;
    // XP: same formula as LevelsSection — per completed goal using xpRewardConfig (baseXP * multiplier^index)
    const xpConfig = game?.xpRewardConfig || game?.bitlabsRawData?.xpRewardConfig || game?.besitosRawData?.xpRewardConfig || { baseXP: 1, multiplier: 1 };
    const baseXP = Math.max(1, Number(xpConfig.baseXP) || 1);
    const multiplier = Number(xpConfig.multiplier) || 1;
    const totalXP = goalsList.reduce((sum, goal, index) => {
      const isCompleted = goal.completed === true || goal.completed === "true" || goal.status === "completed";
      if (!isCompleted) return sum;
      const calculatedXP = Math.round((baseXP * Math.pow(multiplier, index)) * 100) / 100;
      return sum + calculatedXP;
    }, 0);
    const category = game.categories?.[0]?.name || "Game";

    // Provider id for game details page / get-game-by-id (same as UI sections)
    const providerId = game.gameId || game.details?.id || game.id;
    // Image fallbacks for both Besitos and BitLabs AI (icon, creatives, details, etc.)
    const cardImage =
      game.square_image ||
      game.large_image ||
      game.image ||
      game.icon ||
      game.icon_url ||
      game.images?.icon ||
      game.images?.banner ||
      game.creatives?.icon ||
      game.details?.image ||
      game.details?.square_image ||
      game.besitosRawData?.icon ||
      game.besitosRawData?.icon_url;
    const cardBg =
      game.large_image ||
      game.image ||
      game.square_image ||
      game.icon ||
      game.icon_url ||
      game.images?.banner ||
      game.images?.large_image ||
      game.details?.large_image ||
      game.details?.image;

    return {
      id: providerId,
      name: game.title || game.name,
      genre: category,
      subtitle: `${completedGoalsCount} of ${totalGoals} completed`,
      image: cardImage,
      overlayImage: cardImage || game.image || game.square_image,
      score: Number.isFinite(earnedAmount) ? earnedAmount.toFixed(2) : "0.00",
      bonus: `+${totalXP}`,
      coinIcon: "/dollor.png",
      picIcon: "/xp.svg",
      hasStatusDot: true,
      backgroundImage: cardBg,
      isGradientBg: !cardImage,
      fullData: game,
      source: game.source || "besitos",
    };
  }).filter((card) => card.name); // Don't show cards with no name (avoids default "(Game)" when no real data from Bitlab/Besitos)

  // Navigation (same provider id + gameId param as other sections so details page and refresh work)
  const handleDownloadedGameClick = (game) => {
    if (game && game.fullData) {
      dispatch({ type: 'games/clearCurrentGameDetails' });

      const fullData = game.fullData;
      // Ensure details page can recognize BitLabs AI for images/goals when loading from localStorage
      const toStore =
        fullData.source === 'bitlabs_ai' && !fullData.sdkProvider
          ? { ...fullData, sdkProvider: 'bitlab' }
          : fullData;

      try {
        localStorage.setItem('selectedGameData', JSON.stringify(toStore));
      } catch (_) { }

      const gameId = fullData.gameId || fullData.details?.id || fullData.id || game.id;
      router.push(`/gamedetails?gameId=${gameId}`);
    }
  };

  // Search
  const filterGamesBySearch = (games, query) => {
    if (!query || query.trim() === "") return games;
    const searchTerm = query.toLowerCase().trim();
    return games.filter(game =>
      game.name.toLowerCase().includes(searchTerm) ||
      game.genre.toLowerCase().includes(searchTerm)
    );
  };

  const filteredDownloadedGames = filterGamesBySearch(downloadedGames, searchQuery);

  return (
    <div className={`flex flex-col w-full items-start gap-8 relative px-5 ${showSearch ? 'top-[180px]' : 'top-[96px]'}`}>
      {/* ==================== DOWNLOADED GAMES SECTION ==================== */}
      <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full flex-[0_0_auto] max-w-sm mx-auto">
        <div className="flex flex-col w-full items-start gap-4 relative flex-[0_0_auto]">
          <div className="relative flex-[0_0_auto]">
            <div className="relative w-fit [font-family:'Poppins',Helvetica] font-medium text-[#4bba56] text-base tracking-[0] leading-[normal]">
              {downloadedGames.length > 0 ? "Downloaded" : "Downloaded Games"}
            </div>
          </div>
        </div>

        <div className="flex flex-col w-full items-start gap-2.5 px-0 py-2.5 relative flex-[0_0_auto] overflow-y-scroll">
          {/* REMOVED: Loading state for better Android UX - show content immediately */}
          {userDataStatus === "failed" ? (
            <div className="text-red-400 text-center py-4 w-full">
              <p>Failed to load games</p>
              <p className="text-sm text-gray-400 mt-1">Check your internet connection</p>
              <button
                onClick={() => {
                  const userId = getUserId();
                  if (userId) {
                    dispatch(fetchUserData({ userId, token }));
                  } else {
                    // Cannot retry - no userId found
                  }
                }}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          ) : downloadedGames.length > 0 ? (
            filteredDownloadedGames.length > 0 ? (
              filteredDownloadedGames.map((game) => (
                <GameItemCard
                  key={game.id}
                  game={game}
                  isEmpty={false}
                  onClick={() => handleDownloadedGameClick(game)}
                />
              ))
            ) : (
              <div className="text-white text-md text-center py-4 w-full">
                No games found matching your search
              </div>
            )
          ) : (
            <div className="text-white text-center py-4 w-full">
              <GameItemCard isEmpty={true} />
              <p className="mt-4 text-sm text-gray-400">No games downloaded yet</p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== ACCOUNT OVERVIEW SECTION ==================== */}
      <AccountOverviewCard />

      {/* ==================== WATCH AD SECTION ==================== */}
      <WatchAdCard xpAmount={5} />

      <div className="-mt-6">
        <NonGameOffersSection skipFetch />
      </div>


      {/* ==================== NON-GAMING OFFERS CAROUSEL SECTION ==================== */}
      {/* <NonGamingOffersCarousel offers={nonGamingOffers} /> */}

      {/* Extra spacing to ensure content isn't hidden behind navigation */}
      <div className="h-[6px]"></div>
    </div>
  );
};