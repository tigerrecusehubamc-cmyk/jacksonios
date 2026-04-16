"use client";
import React from "react";
import Image from "next/image";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { fetchUserData, fetchGamesBySection, loadUserDataFromCache } from "@/lib/redux/slice/gameSlice";
import { useAuth } from "@/contexts/AuthContext";
import { normalizeGameImages, normalizeGameTitle, normalizeGameCategory, normalizeGameAmount, normalizeGameUrl } from "@/lib/gameDataNormalizer";
import GameItemCard from "./GameItemCard";
import WatchAdCard from "./WatchAdCard";
// Removed getAgeGroupFromProfile and getGenderFromProfile - now passing user object directly

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


export const GameListSection = ({ searchQuery = "", showSearch = false }) => {
  // Redux state management
  const dispatch = useDispatch();
  const router = useRouter();
  const { token } = useAuth();

  // Get data from Redux store
  const { inProgressGames, userDataStatus, error, gamesBySection, gamesBySectionStatus } = useSelector((state) => state.games);
  const { details: userProfile } = useSelector((state) => state.profile);

  // Extract games from the "Most Played" section
  const mostPlayedGames = gamesBySection?.["Most Played"] || [];
  const mostPlayedStatus = gamesBySectionStatus?.["Most Played"] || "idle";



  // Check if we have featured games data from MostPlayedGames
  const [featuredGames, setFeaturedGames] = React.useState(null);
  const [isFromFeatured, setIsFromFeatured] = React.useState(false);

  // Load featured games data on component mount
  React.useEffect(() => {
    const featuredGamesData = localStorage.getItem('featuredGamesData');
    if (featuredGamesData) {
      try {
        const games = JSON.parse(featuredGamesData);
        setFeaturedGames(games);
        setIsFromFeatured(true);
      } catch (error) {
        // Error parsing featured games data
      }
    }
  }, []);

  // Cleanup function to clear featured games data
  const clearFeaturedGames = () => {
    localStorage.removeItem('featuredGamesData');
    setFeaturedGames(null);
    setIsFromFeatured(false);
  };

  // Get user ID from localStorage - with better fallback logic
  const getUserId = () => {
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        const userId = user._id || user.id || user.userId;
        if (userId) {
          return userId;
        }
      }
      // Fallback: try other localStorage keys
      const userId = localStorage.getItem('userId') ||
        localStorage.getItem('user_id') ||
        localStorage.getItem('id');
      if (userId) {
        return userId;
      }
    } catch (error) {
      console.error('❌ [GameListSection] Error getting user ID:', error);
    }
    console.warn('⚠️ [GameListSection] No user ID found in localStorage');
    return null;
  };

  // Helper function to add user ID to redirect URL
  const addUserIdToRedirectUrl = (url, userId) => {
    if (!url || !userId) {
      console.warn('⚠️ [GameListSection] Cannot add user ID: missing url or userId', { url: !!url, userId: !!userId });
      return url;
    }

    try {
      const urlObj = new URL(url);
      const existingParam = urlObj.searchParams.get('partner_user_id');

      // Check if partner_user_id exists and has a value
      if (existingParam && existingParam.trim() !== '') {
        return url; // Already has user ID with value
      }

      // If parameter exists but is empty, or doesn't exist, set it
      urlObj.searchParams.set("partner_user_id", userId);
      const finalUrl = urlObj.toString();
      return finalUrl;
    } catch (error) {
      console.error('❌ [GameListSection] URL parsing failed, using fallback:', error);
      // If URL parsing fails, try to append/replace as query string
      // Remove existing empty partner_user_id if present
      let cleanUrl = url;
      if (url.includes('partner_user_id=')) {
        // Remove existing empty parameter
        cleanUrl = url.replace(/[?&]partner_user_id=[^&]*/g, '');
        // Clean up any double ? or & at the start
        cleanUrl = cleanUrl.replace(/^([^?]*)\?+/, '$1?').replace(/^([^?]*)\&+/, '$1&');
      }

      const separator = cleanUrl.includes("?") ? "&" : "?";
      const finalUrl = `${cleanUrl}${separator}partner_user_id=${userId}`;
      return finalUrl;
    }
  };

  // Fetch games from new API for "Most Played" section
  // Uses stale-while-revalidate: shows cached data immediately, fetches fresh if needed
  React.useEffect(() => {

    // Always dispatch - stale-while-revalidate will handle cache logic automatically
    // Pass user object directly - API will extract age and gender dynamically
    dispatch(fetchGamesBySection({
      uiSection: "Most Played",
      user: userProfile,
      page: 1,
      limit: 50
    }));
  }, [dispatch, userProfile]);

  // Refresh games in background after showing cached data (to get admin updates)
  React.useEffect(() => {
    if (!userProfile) return;

    const refreshTimer = setTimeout(() => {
      dispatch(fetchGamesBySection({
        uiSection: "Most Played",
        user: userProfile,
        page: 1,
        limit: 50,
        force: true,
        background: true
      }));
    }, 100);

    return () => clearTimeout(refreshTimer);
  }, [dispatch, userProfile]);

  // Refresh games in background when app comes to foreground
  React.useEffect(() => {
    if (!userProfile) return;

    const handleFocus = () => {
      dispatch(fetchGamesBySection({
        uiSection: "Most Played",
        user: userProfile,
        page: 1,
        limit: 50,
        force: true,
        background: true
      }));
    };

    window.addEventListener("focus", handleFocus);

    const handleVisibilityChange = () => {
      if (!document.hidden && userProfile) {
        dispatch(fetchGamesBySection({
          uiSection: "Most Played",
          user: userProfile,
          page: 1,
          limit: 50,
          force: true,
          background: true
        }));
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [dispatch, userProfile]);

  // Load cached data from localStorage immediately for instant display
  React.useEffect(() => {
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
  }, [dispatch]);

  // Fetch user data from Redux when component mounts (lazy loading) - fallback
  // Uses stale-while-revalidate: shows cached data immediately, fetches fresh if needed
  React.useEffect(() => {
    const userId = getUserId();
    if (userId && userDataStatus === "idle") {
      dispatch(fetchUserData({ userId, token }));
    }
  }, [dispatch, userDataStatus, token]);

  // Refresh user data in background after showing cached data
  React.useEffect(() => {
    const userId = getUserId();
    if (!userId) return;

    const refreshTimer = setTimeout(() => {
      dispatch(fetchUserData({ userId, token, force: true, background: true }));
    }, 100);

    return () => clearTimeout(refreshTimer);
  }, [dispatch, token]);

  // Process games from new API into the same format - using normalizer for both besitos and bitlab
  const processNewApiGames = (games) => {
    const userId = getUserId();

    return games.map((game, index) => {
      // Normalize game data for both besitos and bitlab
      const images = normalizeGameImages(game);
      const title = normalizeGameTitle(game);
      const category = normalizeGameCategory(game);
      const amount = normalizeGameAmount(game);
      const coinVal = game.rewards?.coins ?? game.rewards?.gold ?? amount;
      const raw = typeof coinVal === 'number' ? coinVal : (typeof coinVal === 'string' ? parseFloat(String(coinVal).replace('$', '')) || 0 : 0);
      const displayCoins = Number.isFinite(raw) ? (raw === Math.round(raw) ? Math.round(raw) : Math.round(raw * 100) / 100) : 0;
      let url = normalizeGameUrl(game) || game.details?.downloadUrl;

      // Add user ID to redirect URL if it exists
      if (url && userId) {
        url = addUserIdToRedirectUrl(url, userId);
        // Also update the URL in the game object for consistency
        if (game.besitosRawData?.url) {
          game.besitosRawData.url = url;
        }
        if (game.url) {
          game.url = url;
        }
        if (game.details?.downloadUrl) {
          game.details.downloadUrl = url;
        }
      }

      // Clean game name - remove platform suffix after "-"
      const cleanGameName = title.split(' - ')[0].trim();

      return {
        id: game.gameId || game.details?.id || game._id || game.id,
        name: cleanGameName,
        genre: category,
        subtitle: "Available to Download",
        // Use normalized images
        image: images.square_image || images.icon || game.images?.banner || game.images?.large_image || game.details?.square_image || game.details?.image || "/assets/animaapp/DfFsihWg/img/image-3930-2x.png",
        overlayImage: images.icon || images.square_image || game.details?.image || game.details?.square_image,
        amount: displayCoins ? `$${displayCoins}` : "$0",
        score: String(displayCoins),
        bonus: game.rewards?.xp ?? game.xpRewardConfig?.baseXP ?? "0",
        coinIcon: "/dollor.png",
        picIcon: "/xp.svg",
        hasStatusDot: false,
        // Use normalized images for background
        backgroundImage: images.large_image || images.banner || images.icon || game.images?.banner || game.details?.large_image || game.details?.image,
        isGradientBg: !images.square_image && !game.details?.square_image,
        downloadUrl: url,
        // Store full game data including besitosRawData (with updated URL)
        fullData: game,
        isNewApi: true,
      };
    });
  };

  // Process featured games from MostPlayedGames into the same format
  const processFeaturedGames = (games) => {
    const userId = getUserId();

    return games.map((game, index) => {
      // Clean game name - remove platform suffix after "-"
      const cleanGameName = (game.name || game.title || "Game").split(' - ')[0].trim();

      // Get download URL and add user ID if it exists
      let downloadUrl = game.downloadUrl || game.redirectUrl;
      if (downloadUrl && userId) {
        downloadUrl = addUserIdToRedirectUrl(downloadUrl, userId);
        // Also update the URL in the game object for consistency
        if (game.downloadUrl) {
          game.downloadUrl = downloadUrl;
        }
        if (game.redirectUrl) {
          game.redirectUrl = downloadUrl;
        }
      }

      const coinVal = game.rewards?.coins ?? game.rewards?.gold ?? game.amount ?? 0;
      const raw = typeof coinVal === 'number' ? coinVal : (typeof coinVal === 'string' ? parseFloat(String(coinVal).replace('$', '')) || 0 : 0);
      const displayCoins = Number.isFinite(raw) ? (raw === Math.round(raw) ? String(Math.round(raw)) : (Math.round(raw * 100) / 100).toString()) : "0";
      return {
        id: game.id,
        name: cleanGameName,
        genre: game.categories?.[0]?.name || "Game",
        subtitle: "Available to Download",
        image: game.square_image || game.image || "/assets/animaapp/DfFsihWg/img/image-3930-2x.png",
        overlayImage: game.image || game.square_image,
        amount: displayCoins,
        score: displayCoins,
        bonus: game.rewards?.xp ?? "0",
        coinIcon: "/dollor.png",
        picIcon: "/xp.svg",
        hasStatusDot: false, // Featured games don't have active status
        backgroundImage: game.large_image || game.image,
        isGradientBg: !game.square_image,
        // Download URL from game data (with user ID added)
        downloadUrl: downloadUrl,
        // Store full game data for navigation (with updated URL)
        fullData: game,
        isFeatured: true, // Mark as featured game
      };
    });
  };

  // Process in-progress games from Redux into downloadedGames format
  const downloadedGames = (inProgressGames || []).map((game, index) => {
    // Calculate completed goals
    const completedGoalsCount = game.goals?.filter(g => g.completed === true).length || 0;
    const totalGoals = game.goals?.length || 0;

    // Calculate actual earnings from completed goals only
    const earnedAmount = game.goals
      ?.filter(g => g.completed === true)
      .reduce((sum, goal) => sum + (goal.amount || 0), 0) || 0;

    // Calculate XP bonus (10% of earned amount)
    const xpBonus = Math.floor(earnedAmount * 0.1);

    // Get game category
    const category = game.categories?.[0]?.name || "Game";

    return {
      id: game.id,
      name: game.title,
      genre: category,
      subtitle: `${completedGoalsCount} of ${totalGoals} completed`,
      image: game.square_image || game.large_image || game.image,
      overlayImage: game.image || game.square_image,
      score: earnedAmount.toFixed(2),
      bonus: `+${xpBonus}`,
      coinIcon: "/dollor.png",
      picIcon: "/xp.svg",
      hasStatusDot: true, // All in-progress games have active status
      backgroundImage: game.large_image || game.image,
      isGradientBg: !game.square_image, // Use gradient if no square image
      // Store full game data for navigation
      fullData: game,
    };
  });

  // Handle click on downloaded game - navigate to game details with full data
  const handleDownloadedGameClick = (game, e) => {
    // GameItemCard passes (game, e), so game should always be the first parameter
    const actualGame = game;

    if (!actualGame) {
      console.error('❌ [GameListSection] No game provided to handleDownloadedGameClick');
      return;
    }

    // Use fullData if available, otherwise use the game object itself
    const gameData = actualGame.fullData || actualGame;

    if (!gameData) {
      console.error('❌ [GameListSection] No game data available');
      return;
    }

    // For downloaded games, we use localStorage (not API), so clear Redux state
    dispatch({ type: 'games/clearCurrentGameDetails' });

    // Store game data in localStorage for immediate access
    try {
      localStorage.setItem('selectedGameData', JSON.stringify(gameData));
      // Use provider gameId (BitLabs/Besitos) for get-game-by-id API
      const gameId = gameData.gameId || gameData.details?.id || actualGame.id || gameData.id || gameData._id;
      console.log('✅ [GameListSection] Navigating to game details:', gameId);
      router.push(`/gamedetails?gameId=${gameId}`);
    } catch (error) {
      console.error('❌ [GameListSection] Failed to store game data:', error);
    }
  };

  // Handle click on featured game - navigate to game details
  const handleFeaturedGameClick = (game, e) => {
    // GameItemCard passes (game, e), so game should always be the first parameter
    const actualGame = game;

    console.log('🟢 [GameListSection] handleFeaturedGameClick called:', {
      game: actualGame,
      hasFullData: !!actualGame?.fullData,
      gameId: actualGame?.id
    });

    if (!actualGame) {
      console.error('❌ [GameListSection] No game provided to handleFeaturedGameClick');
      return;
    }

    // Use fullData if available, otherwise use the game object itself
    const gameData = actualGame.fullData || actualGame;

    if (!gameData) {
      console.error('❌ [GameListSection] No game data available');
      return;
    }

    // For featured games, we use localStorage (not API), so clear Redux state
    dispatch({ type: 'games/clearCurrentGameDetails' });

    // Store full game data including besitosRawData in localStorage for immediate access
    try {
      localStorage.setItem('selectedGameData', JSON.stringify(gameData));
      // Use provider gameId (BitLabs/Besitos) for get-game-by-id API
      const gameId = gameData.gameId || gameData.details?.id || actualGame.id || gameData.id || gameData._id;
      console.log('✅ [GameListSection] Navigating to game details:', gameId);
      router.push(`/gamedetails?gameId=${gameId}&source=mostPlayed`);
    } catch (error) {
      console.error('❌ [GameListSection] Failed to store game data:', error);
    }
  };

  const filterGamesBySearch = (games, query) => {
    if (!query || query.trim() === "") return games;
    const searchTerm = query.toLowerCase().trim();
    return games.filter(game =>
      game.name.toLowerCase().includes(searchTerm) ||
      game.genre.toLowerCase().includes(searchTerm)
    );
  };

  // Determine which games to show - prioritize new API, then featured, then downloaded
  const gamesToShow = React.useMemo(() => {
    // First priority: New API games
    if (mostPlayedGames && mostPlayedGames.length > 0) {
      return processNewApiGames(mostPlayedGames);
    }

    // Second priority: Featured games from MostPlayedGames
    if (isFromFeatured && featuredGames) {
      return processFeaturedGames(featuredGames);
    }

    // Fallback: Downloaded games
    return downloadedGames;
  }, [mostPlayedGames, isFromFeatured, featuredGames, downloadedGames]);

  // Apply search filters to games
  const filteredGames = filterGamesBySearch(gamesToShow, searchQuery);

  return (
    <div className={`flex flex-col max-w-[335px] w-full mx-auto items-start gap-8 relative animate-fade-in ${showSearch ? 'top-[180px]' : 'top-[130px]'}`}>
      {/* ==================== DOWNLOADED GAMES SECTION ==================== */}
      <div className="flex flex-col items-start gap-2.5 relative self-stretch w-full flex-[0_0_auto]">
        <div className="flex flex-col w-full items-start gap-[49px] relative flex-[0_0_auto]">
          <div className="flex w-full items-center justify-between">
            <div className="inline-flex items-center gap-0.5 relative flex-[0_0_auto]">
              <Image
                className="relative w-5 h-5"
                alt="Badge check"
                src="/assets/animaapp/3mn7waJw/img/badgecheck.svg"
                width={20}
                height={20}
                loading="eager"
                decoding="async"
                priority
              />
              <div className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-medium text-white text-base tracking-[0] leading-[normal]">
                {"Most Played Games"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col w-full items-start gap-2.5 px-0 py-2.5 relative flex-[0_0_auto] overflow-y-scroll">
          {mostPlayedGames && mostPlayedGames.length > 0 ? (
            // Show new API games - REMOVED loading state for better Android UX
            mostPlayedStatus === "failed" ? (
              <div className="text-red-400 text-center py-4 w-full">
                <p>Failed to load games</p>
                <button
                  onClick={() => {
                    dispatch(fetchGamesBySection({
                      uiSection: "Most Played",
                      user: userProfile,
                      page: 1,
                      limit: 50
                    }));
                  }}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ) : filteredGames.length > 0 ? (
              filteredGames.map((game) => (
                <GameItemCard
                  key={game.id}
                  game={game}
                  isEmpty={false}
                  onClick={(clickedGame, e) => {
                    // GameItemCard passes (game, e), but we already have game captured
                    // Use the passed game or fallback to captured game
                    handleFeaturedGameClick(clickedGame || game, e);
                  }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center w-full py-6 px-4">
                <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-lg mb-2 text-center">
                  Gaming - Most Played
                </h3>
                <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-sm text-center">
                  No games available
                </p>
              </div>
            )
          ) : isFromFeatured ? (
            // Show featured games
            filteredGames.length > 0 ? (
              filteredGames.map((game) => (
                <GameItemCard
                  key={game.id}
                  game={game}
                  isEmpty={false}
                  onClick={(clickedGame, e) => {
                    // GameItemCard passes (game, e), but we already have game captured
                    // Use the passed game or fallback to captured game
                    handleFeaturedGameClick(clickedGame || game, e);
                  }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center w-full py-6 px-4">
                <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-lg mb-2 text-center">
                  Gaming - Most Played
                </h3>
                <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-sm text-center">
                  No games available
                </p>
              </div>
            )
          ) : (
            // Show downloaded games - REMOVED loading state for better Android UX
            userDataStatus === "failed" ? (
              <div className="text-red-400 text-center py-4 w-full">
                <p>Failed to load games</p>
                <button
                  onClick={() => {
                    const userId = getUserId();
                    if (userId) {
                      dispatch(fetchUserData({ userId, token }));
                    }
                  }}
                  className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                >
                  Retry
                </button>
              </div>
            ) : downloadedGames.length > 0 ? (
              filteredGames.map((game) => (
                <GameItemCard
                  key={game.id}
                  game={game}
                  isEmpty={false}
                  onClick={(clickedGame, e) => {
                    // GameItemCard passes (game, e), but we already have game captured
                    // Use the passed game or fallback to captured game
                    handleDownloadedGameClick(clickedGame || game, e);
                  }}
                />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center w-full py-6 px-4">
                <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-lg mb-2 text-center">
                  Gaming - Most Played
                </h3>
                <p className="[font-family:'Poppins',Helvetica] font-normal text-gray-400 text-sm text-center">
                  No games available
                </p>
              </div>
            )
          )}
        </div>
      </div>







      {/* ==================== WATCH AD SECTION ==================== */}
      <WatchAdCard xpAmount={5} />

      {/* ==================== NON-GAMING OFFERS CAROUSEL SECTION ==================== */}
      {/* <NonGamingOffersCarousel offers={nonGamingOffers} /> */}

      {/* Extra spacing to ensure content isn't hidden behind navigation */}
      <div className="h-[6px]"></div>
    </div>
  );
};