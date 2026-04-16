/**
 * Game Download Utilities
 * Simple, clean logic based on Besitos documentation
 */
import {
  normalizeGameUrl,
  normalizeGameTitle,
  getSdkProvider,
} from "@/lib/gameDataNormalizer";

/**
 * Get user ID from localStorage
 */
export const getUserId = () => {
  try {
    const user = localStorage.getItem("user");
    if (user) {
      const userData = JSON.parse(user);
      return userData.id || userData.userId || userData._id;
    }
    return (
      localStorage.getItem("userId") ||
      localStorage.getItem("user_id") ||
      localStorage.getItem("id")
    );
  } catch {
    return null;
  }
};

/**
 * Add user ID to URL for tracking
 */
const addUserIdToUrl = (url, userId) => {
  if (!userId) return url;

  try {
    const urlObj = new URL(url);

    // Only add partner_user_id (as per Besitos documentation)
    // Don't add user_id as it might conflict with Besitos' internal tracking
    urlObj.searchParams.set("partner_user_id", userId);

    return urlObj.toString();
  } catch {
    return url;
  }
};

/**
 * Debug function to show Besitos URL information
 */
export const debugBesitosUrl = (game) => {
  const userId = getUserId();
  console.log("=== Besitos Debug ===");
  console.log("Game:", game.title || game.name, "- Android ID:", game.id);
  console.log("Original URL:", game.url);
  console.log("User ID:", userId);
  console.log("Game type:", getGameTypeDescription(getGameType(game)));
  console.log("=== End Debug ===");
};

/**
 * Handle game download - Simple, clean logic based on Besitos documentation
 * Enhanced with VPN detection and optimization
 */
export const handleGameDownload = async (game) => {
  try {
    const userId = getUserId();
    // OPTIMIZED: Use normalizer for both besitos and bitlab
    let finalUrl =
      normalizeGameUrl(game) ||
      game.url ||
      game.details?.downloadUrl ||
      game.downloadUrl;

    // Get game ID - use game.id or game._id
    const gameId = game.id || game._id || game.gameId;
    const gameTitle = normalizeGameTitle(game);
    const provider = getSdkProvider(game);

    console.log("🔍 Debug Info:", {
      provider,
      originalUrl: finalUrl,
      normalizedUrl: normalizeGameUrl(game),
      downloadUrl: game.details?.downloadUrl,
      fallbackUrl: game.url,
      userId,
      gameId: gameId,
      gameTitle: gameTitle,
    });

    // Add user ID and game ID to URL for tracking - different parameters for different providers
    if (finalUrl && userId) {
      try {
        const urlObj = new URL(finalUrl);

        // Use partner_user_id for both Besitos and Bitlab (consistent parameter)
        urlObj.searchParams.set("partner_user_id", userId);
        console.log(`✅ Added partner_user_id to ${provider} URL:`, userId);

        // CRITICAL: Add user_id for Bitlab games (required by Bitlab for re-encryption and tracking)
        if (provider === "bitlab") {
          urlObj.searchParams.set("user_id", userId);
          console.log(
            "✅ Added user_id to Bitlab URL (required for re-encryption):",
            userId,
          );
        }

        // Add game ID as query parameter if not already in URL path (for both providers)
        const urlPath = urlObj.pathname;
        const gameIdInPath = urlPath.includes(gameId);

        if (gameId && !gameIdInPath) {
          urlObj.searchParams.set("game_id", gameId);
          console.log("✅ Added game_id to URL:", gameId);
        }

        finalUrl = urlObj.toString();
        console.log(`✅ Added parameters to ${provider} URL:`, finalUrl);
      } catch (urlError) {
        // If URL parsing fails, try to append as query string
        console.warn(
          "⚠️ URL parsing failed, appending as query string:",
          urlError,
        );
        const separator = finalUrl.includes("?") ? "&" : "?";
        let queryParams = `partner_user_id=${userId}`;

        // Add user_id for Bitlab games
        if (provider === "bitlab") {
          queryParams += `&user_id=${userId}`;
        }

        if (gameId) {
          queryParams += `&game_id=${gameId}`;
        }

        finalUrl = `${finalUrl}${separator}${queryParams}`;
        console.log(
          `✅ Added parameters to ${provider} URL (fallback):`,
          finalUrl,
        );
      }
    } else {
      if (!userId) {
        console.warn("⚠️ No user ID found - using original URL");
      }
      if (!finalUrl) {
        console.error("❌ No download URL found for game:", gameId);
      }
    }

    // Add VPN detection and optimization
    const { detectVpnUsage, getVpnTroubleshootingMessage } =
      await import("./vpnUtils");
    const vpnDetection = detectVpnUsage();

    if (vpnDetection.isVpnLikely) {
      console.log("🔍 VPN detected:", vpnDetection);
      console.log("💡 VPN Tips:", getVpnTroubleshootingMessage());
    }

    console.log("🎯 Starting game download", {
      game: gameTitle,
      gameId: gameId,
      userId,
      url: finalUrl,
      vpnDetected: vpnDetection.isVpnLikely,
      vpnConfidence: vpnDetection.confidence,
    });

    // Open the URL directly - Besitos will handle the redirect to app store
    console.log("📱 Opening game URL:", finalUrl);

    // Use Capacitor Browser plugin for mobile apps
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: finalUrl });

        // Dispatch event for ALL users so GameListSection can immediately refetch inProgressGames
        window.dispatchEvent(
          new CustomEvent("gameDownloaded", {
            detail: {
              gameId: gameId,
              userId,
              url: finalUrl,
              vpnDetected: vpnDetection.isVpnLikely,
              timestamp: Date.now(),
            },
          }),
        );

        return;
      } catch (browserError) {
        console.warn(
          "Browser plugin not available, falling back to window.open",
        );
      }
    }

    // Fallback to window.open
    const newWindow = window.open(finalUrl, "_blank", "noopener,noreferrer");
    if (
      !newWindow ||
      newWindow.closed ||
      typeof newWindow.closed === "undefined"
    ) {
      // Popup blocked → navigate directly
      window.location.href = finalUrl;
    }
  } catch (err) {
    console.error("Error handling game download:", err);
    // last resort - use normalizer for both besitos and bitlab
    const fallbackUrl =
      normalizeGameUrl(game) || game.url || game.details?.downloadUrl;
    if (fallbackUrl) {
      window.location.href = fallbackUrl;
    } else {
      console.error(
        "❌ No valid download URL found for game:",
        game.id || game._id,
      );
    }
  }
};

/**
 * Check if game is available for download
 * REMOVED FILTERING - Show all games from API
 */
export const isGameAvailable = (game) => {
  if (!game) {
    return false;
  }

  // Show all games - no filtering
  return true;
};

/**
 * Get game type description
 */
const getGameTypeDescription = (gameType) => {
  switch (gameType) {
    case "app_store":
      return "App Store Game";
    case "play_store":
      return "Google Play Game";
    case "web_game":
      return "Web Game";
    case "redirect_service":
      return "Redirect Service (Tracked Download)";
    default:
      return "Unknown Game Type";
  }
};

/**
 * Get game type from URL
 */
const getGameType = (game) => {
  if (!game || !game.url) return "unknown";

  const url = game.url.toLowerCase();

  if (url.includes("apps.apple.com") || url.includes("itunes.apple.com")) {
    return "app_store";
  } else if (url.includes("play.google.com")) {
    return "play_store";
  } else if (
    url.includes("wall.besitos.ai") ||
    url.includes("besitos-service.test")
  ) {
    return "redirect_service";
  } else {
    return "web_game";
  }
};
