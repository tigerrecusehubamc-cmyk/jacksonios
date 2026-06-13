/**
 * Game Data Normalizer
 * Normalizes game data from different SDK providers (besitos, bitlab) into a consistent format
 */

/**
 * Get the SDK provider from game data
 * @param {Object} game - Game object
 * @returns {string} - 'bitlab' or 'besitos' (default)
 */
export const getSdkProvider = (game) => {
  const rawData = game?.besitosRawData || game || {};
  let provider =
    rawData.sdkProvider ||
    rawData.provider ||
    game?.sdkProvider ||
    game?.provider;
  if (provider) {
    provider = String(provider).toLowerCase();
    if (provider === "bitlabs") provider = "bitlab";
    return provider;
  }
  // Detect BitLab by raw events array (promised_points/type_id/uuid or BitLabs API: points/payout/hash/id)
  const events = rawData.events || game?.events || game?.bitlabsRawData?.events;
  if (Array.isArray(events) && events.length > 0) {
    const first = events[0];
    if (
      first &&
      (first.promised_points !== undefined ||
        first.type_id !== undefined ||
        first.uuid != null ||
        first.points !== undefined ||
        first.payout !== undefined ||
        first.hash != null ||
        first.id != null)
    ) {
      return "bitlab";
    }
  }
  // Detect BitLab when backend sends normalized goals with event-N ids (no raw events)
  const goals = rawData.goals || game?.goals;
  if (Array.isArray(goals) && goals.length > 0) {
    const first = goals[0];
    const id = first?.id ?? first?.goal_id ?? "";
    if (typeof id === "string" && /^event-\d+$/.test(id)) {
      return "bitlab";
    }
  }
  return "besitos";
};

/**
 * Normalize game images for display
 * Handles both besitos and bitlab image structures
 * @param {Object} game - Game object
 * @returns {Object} - Normalized image object with icon, square_image, large_image, banner
 */
export const normalizeGameImages = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  if (provider === "bitlab") {
    // Bitlab structure: creatives.images with different sizes
    const creatives = rawData.creatives || {};
    const images = creatives.images || {};

    // Helper function to get first valid image URL
    const getValidImage = (...candidates) => {
      for (const candidate of candidates) {
        if (
          candidate &&
          typeof candidate === "string" &&
          candidate.trim() !== "" &&
          candidate !== "null" &&
          candidate !== "undefined"
        ) {
          return candidate;
        }
      }
      return "";
    };

    // Try to get any image from the images object (handle different key formats)
    const getAllImageValues = () => {
      const allImages = [];
      // Try common size keys
      const sizeKeys = [
        "275x275",
        "400x400",
        "580x580",
        "630x315",
        "600x300",
        "600x200",
        "800x400",
        "1024x512",
      ];
      sizeKeys.forEach((key) => {
        if (images[key]) {
          allImages.push(images[key]);
        }
      });
      // Also try iterating over all keys in case they're different
      Object.keys(images).forEach((key) => {
        if (images[key] && typeof images[key] === "string") {
          allImages.push(images[key]);
        }
      });
      return allImages;
    };

    const allImageValues = getAllImageValues();

    // For bitlab, prioritize creatives.icon and icon_url as they're most reliable
    const iconUrl = getValidImage(
      creatives.icon,
      rawData.icon_url,
      rawData.icon,
      creatives.banner,
      rawData.banner,
      ...allImageValues,
      game?.icon,
      game?.images?.icon,
      game?.image,
      game?.square_image,
      game?.large_image,
      game?.images?.large_image,
      game?.images?.banner,
    );

    return {
      icon: iconUrl,
      square_image: getValidImage(
        images["275x275"],
        images["400x400"],
        images["580x580"],
        creatives.icon,
        rawData.icon_url,
        rawData.icon,
        ...allImageValues,
        game?.images?.square_image,
        game?.square_image,
        game?.image,
      ),
      large_image: getValidImage(
        images["630x315"],
        images["600x300"],
        images["600x200"],
        images["800x400"],
        creatives.banner,
        rawData.banner,
        creatives.icon,
        rawData.icon_url,
        rawData.icon,
        ...allImageValues,
        game?.images?.large_image,
        game?.large_image,
        game?.image,
        game?.images?.banner,
      ),
      banner: getValidImage(
        images["600x200"],
        images["600x300"],
        images["630x315"],
        images["800x400"],
        creatives.banner,
        rawData.banner,
        creatives.icon,
        rawData.icon_url,
        ...allImageValues,
        game?.images?.banner,
        game?.large_image,
        game?.image,
      ),
    };
  } else {
    // Besitos structure: direct image properties
    // Helper function to get first valid image URL
    const getValidImage = (...candidates) => {
      for (const candidate of candidates) {
        if (
          candidate &&
          typeof candidate === "string" &&
          candidate.trim() !== "" &&
          candidate !== "null" &&
          candidate !== "undefined"
        ) {
          return candidate;
        }
      }
      return "";
    };

    return {
      icon: getValidImage(
        rawData.image,
        rawData.square_image,
        game?.icon,
        game?.images?.icon,
      ),
      square_image: getValidImage(
        rawData.square_image,
        rawData.image,
        game?.images?.square_image,
        game?.square_image,
      ),
      large_image: getValidImage(
        rawData.large_image,
        rawData.image,
        game?.images?.large_image,
        game?.large_image,
      ),
      banner: getValidImage(
        rawData.image,
        rawData.large_image,
        game?.images?.banner,
      ),
    };
  }
};

/**
 * Normalize game title
 * @param {Object} game - Game object
 * @returns {string} - Normalized title
 */
export const normalizeGameTitle = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  if (provider === "bitlab") {
    return (
      rawData.product_name ||
      rawData.anchor ||
      rawData.title ||
      game?.title ||
      game?.details?.name ||
      "Unknown Game"
    );
  } else {
    return (
      rawData.title || game?.title || game?.details?.name || "Unknown Game"
    );
  }
};

/**
 * Normalize game description
 * @param {Object} game - Game object
 * @returns {string} - Normalized description
 */
export const normalizeGameDescription = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  if (provider === "bitlab") {
    return (
      rawData.description ||
      game?.description ||
      game?.details?.description ||
      ""
    );
  } else {
    return (
      rawData.description ||
      game?.description ||
      game?.details?.description ||
      ""
    );
  }
};

/**
 * Get events array from game from any common path (raw API response shape)
 * @param {Object} game - Game object
 * @returns {Array} - Events array or empty
 */
function getEventsFromGame(game) {
  if (!game) return [];
  const raw = game?.besitosRawData || game;
  const candidates = [
    game?.bitlabsRawData?.events,
    game?.events,
    raw?.events,
    raw?.data?.events,
    game?.details?.events,
    game?.data?.events,
    game?.offer?.events,
    game?.raw?.events,
    Array.isArray(game?.data?.available?.[0]?.events)
      ? game.data.available[0].events
      : null,
  ];
  const isEventsArray = (ev) =>
    Array.isArray(ev) &&
    ev.length > 0 &&
    ev[0] &&
    (ev[0].promised_points !== undefined ||
      ev[0].uuid != null ||
      ev[0].points !== undefined ||
      ev[0].payout !== undefined ||
      ev[0].type_id !== undefined ||
      ev[0].hash != null ||
      ev[0].id != null);
  for (const ev of candidates) {
    if (isEventsArray(ev)) return ev;
  }
  return [];
}

/**
 * Normalize game goals/events
 * Converts bitlab events to besitos-style goals format
 * @param {Object} game - Game object
 * @returns {Array} - Normalized goals array
 */
export const normalizeGameGoals = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  if (provider === "bitlab") {
    const events = getEventsFromGame(game);
    // Prefer raw events when present (BitLabs: points/payout; others: promised_points, status, timestamp)
    if (events.length > 0) {
      return events.map((event, index) => {
        const promisedPoints =
          event.promised_points != null
            ? String(event.promised_points)
            : event.points != null
              ? String(event.points)
              : event.payout != null
                ? String(event.payout)
                : "0";
        let daysLeft = null;
        if (event.expires_at && event.expires_at > 0) {
          const expiresAtMs = event.expires_at * 1000;
          daysLeft = Math.ceil(
            (expiresAtMs - Date.now()) / (1000 * 60 * 60 * 24),
          );
        } else if (rawData.hours_left != null) {
          daysLeft = Math.ceil(rawData.hours_left / 24);
        } else if (rawData.session_hours) {
          daysLeft = Math.ceil(rawData.session_hours / 24);
        } else if (rawData.sessionHours) {
          daysLeft = Math.ceil(rawData.sessionHours / 24);
        }
        const isCompleted =
          event.status === "completed" ||
          event.status === "success" ||
          event.completed === true;
        const isFailed =
          event.status === "failed" ||
          event.status === "expired" ||
          event.completed === false;
        // Event number from API (id / event_number) for XP multiplier and unlock order; fallback to 1-based index
        const eventNumber =
          event.event_number ??
          (typeof event.id === "number" ? event.id : null) ??
          index + 1;
        return {
          goal_id: event.uuid || event.hash || `bitlab_${index}`,
          id: event.uuid || event.hash || `bitlab_${index}`,
          name: event.name || "",
          text: event.name || "",
          title: event.name || "",
          amount: promisedPoints,
          points: promisedPoints,
        payout: event.payout || "0",
        coinReward: event.coinReward ?? 0,
        goal_type:
            event.type_id === 2
              ? "linear"
              : event.type_id === 4
                ? "non-linear"
                : "linear",
          section:
            event.type_id === 4
              ? "turbo"
              : event.type_id === 1
                ? "install"
                : "linear",
          position: index + 1,
          event_number: eventNumber,
          days_left: daysLeft,
          completed: isCompleted,
          failed: isFailed,
          type_id: event.type_id,
          uuid: event.uuid,
          hash: event.hash,
          payable: event.payable,
          status:
            event.status ||
            (isCompleted ? "completed" : isFailed ? "failed" : "viewed"),
          timestamp: event.timestamp,
          completed_datetime:
            isCompleted && event.timestamp ? event.timestamp : null,
          progression: event.progression || null,
          time_played: event.time_played,
          display_type: event.display_type,
        };
      });
    }
    // Backend sent BitLab-style goals only (event-0, event-1, ...) – get events from any path for promised_points
    const goals = rawData.goals || game?.goals || [];
    const eventsByIndex = getEventsFromGame(game);
    return goals.map((goal, index) => {
      // Amount: goal fields first, then game-level arrays by index, then event by index
      let amount =
        goal.promised_points ??
        goal.points ??
        goal.amount ??
        goal.xp ??
        goal.reward ??
        goal.value ??
        goal.reward_points ??
        goal.approved_cpa ??
        goal.pending_cpa;
      if (amount == null || amount === "") {
        const arr =
          rawData.promised_points ??
          game?.promised_points ??
          rawData.reward_points ??
          game?.reward_points;
        if (Array.isArray(arr) && arr[index] != null) amount = arr[index];
      }
      if (amount == null || amount === "") {
        const ev = eventsByIndex[index];
        if (ev && (ev.promised_points != null || ev.points != null))
          amount = ev.promised_points ?? ev.points;
      }
      const promisedPoints =
        amount != null && amount !== "" ? String(amount) : "0";
      const name = goal.name ?? goal.title ?? goal.text ?? "";
      const isCompleted =
        goal.completed === true ||
        goal.status === "completed" ||
        goal.status === "success";
      const isFailed =
        goal.failed === true ||
        goal.status === "failed" ||
        goal.status === "expired";
      const numId = typeof goal.id === "number" ? goal.id : null;
      const eventMatch =
        typeof goal.id === "string" ? goal.id.match(/^event-(\d+)$/) : null;
      const parsedEventN = eventMatch ? parseInt(eventMatch[1], 10) + 1 : null;
      const eventNumber =
        goal.event_number ?? numId ?? parsedEventN ?? index + 1;
      return {
        goal_id: goal.id ?? goal.goal_id ?? goal.uuid ?? `event-${index}`,
        id: goal.id ?? goal.goal_id ?? goal.uuid ?? `event-${index}`,
        name,
        text: name,
        title: name,
        amount: promisedPoints,
        points: promisedPoints,
        payout: goal.payout ?? "0",
        coinReward: goal.coinReward ?? 0,
        goal_type:
          goal.goal_type ?? (goal.type === "flat" ? "linear" : "linear"),
        section: goal.section ?? "linear",
        position: index + 1,
        event_number: eventNumber,
        days_left: goal.days_left ?? null,
        completed: isCompleted,
        failed: isFailed,
        type_id: goal.type_id,
        uuid: goal.uuid,
        hash: goal.hash,
        payable: goal.payable,
        status:
          goal.status ??
          (isCompleted ? "completed" : isFailed ? "failed" : "viewed"),
        timestamp: goal.timestamp,
        completed_datetime:
          goal.completed_datetime ??
          (isCompleted && goal.timestamp ? goal.timestamp : null),
        progression: goal.progression ?? null,
        time_played: goal.time_played,
        display_type: goal.display_type,
      };
    });
  }
  return rawData.goals || game?.goals || [];
};

/**
 * Get total promised points for display as total coins and total XP
 * BitLab: total coins = total_points from API; total XP = xpRewardConfig formula (baseXP * (multiplier^n - 1)/(multiplier - 1))
 * @param {Object} game - Game object
 * @returns {{ totalCoins: number, totalXP: number }}
 */
export const getTotalPromisedPoints = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  if (provider === "bitlab") {
    const events = getEventsFromGame(game);
    const n = events.length || (rawData.goals || game?.goals || []).length;
    // Total coins: prefer backend totalCoins, then API rewards.coins / rewards.gold, then total_points, then sum of coinReward
    const backendTotalCoins = rawData.totalCoins ?? game?.totalCoins;
    const rewardsCoins = game?.rewards?.coins ?? game?.rewards?.gold;
    const totalPointsFromApi =
      rawData.total_points != null ? parseFloat(rawData.total_points) : NaN;
    let totalCoins;
    if (backendTotalCoins != null && Number(backendTotalCoins) > 0) {
      totalCoins = Number(backendTotalCoins);
    } else if (rewardsCoins != null && Number(rewardsCoins) > 0) {
      totalCoins = Number(rewardsCoins);
    } else if (Number.isFinite(totalPointsFromApi) && totalPointsFromApi > 0) {
      totalCoins = totalPointsFromApi;
    } else {
      // Sum coinReward from events if available
      const coinRewardSum = events.reduce(
        (acc, e) => acc + (parseFloat(e.coinReward ?? e.promised_points ?? e.points ?? e.payout) || 0),
        0,
      );
      totalCoins = coinRewardSum ||
        (rawData.goals || game?.goals || []).reduce(
          (acc, g) =>
            acc +
            (parseFloat(g.coinReward ?? g.promised_points ?? g.amount ?? g.points) || 0),
          0,
        );
    }

    // Total XP = sum of baseXP * multiplier^index for each task (geometric series)
    const xpConfig = rawData.xpRewardConfig ||
      game?.xpRewardConfig || { baseXP: 1, multiplier: 1 };
    const baseXP = Number(xpConfig.baseXP ?? 1);
    const multiplier = Number(xpConfig.multiplier ?? 1);
    let totalXP;
    if (multiplier === 1) {
      totalXP = baseXP * n;
    } else if (n > 0) {
      totalXP = (baseXP * (Math.pow(multiplier, n) - 1)) / (multiplier - 1);
    } else {
      totalXP = 0;
    }
    totalXP = Math.floor(totalXP);
    const rewardsXP = game?.rewards?.xp;
    // Use computed total XP when rewards.xp is 0 or missing (same as Besitos – show task-based XP in all UI sections)
    const finalXP =
      rewardsXP != null && Number(rewardsXP) > 0 ? Number(rewardsXP) : totalXP;
    return {
      totalCoins: Math.round(Number(totalCoins) * 100) / 100,
      totalXP: Math.round(Number(finalXP)),
    };
  }

  // Coins: prefer backend totalCoins, then API rewards.coins / rewards.gold, then sum of coinReward
  const backendTotalCoins = rawData.totalCoins ?? game?.totalCoins;
  const rewardsCoins = game?.rewards?.coins ?? game?.rewards?.gold;
  const goals = rawData.goals || game?.goals || [];
  const coinRewardSum = goals.reduce(
    (acc, g) => acc + (parseFloat(g.coinReward ?? g.amount) || 0),
    0,
  );
  let totalCoins;
  if (backendTotalCoins != null && Number(backendTotalCoins) > 0) {
    totalCoins = Number(backendTotalCoins);
  } else if (rewardsCoins != null && Number(rewardsCoins) >= 0) {
    totalCoins = Number(rewardsCoins);
  } else {
    totalCoins = coinRewardSum;
  }

  // Total XP: same as BitLab – from task count + xpRewardConfig (baseXP * multiplier^index per task)
  const n = goals.length;
  const xpConfig = rawData.xpRewardConfig ||
    game?.xpRewardConfig || { baseXP: 1, multiplier: 1 };
  const baseXP = Number(xpConfig.baseXP ?? 1);
  const multiplier = Number(xpConfig.multiplier ?? 1);
  let totalXP;
  if (n === 0) {
    totalXP =
      game?.rewards?.xp != null && Number(game.rewards.xp) >= 0
        ? Number(game.rewards.xp)
        : 0;
  } else if (multiplier === 1) {
    totalXP = baseXP * n;
  } else {
    totalXP = (baseXP * (Math.pow(multiplier, n) - 1)) / (multiplier - 1);
  }
  const rewardsXP = game?.rewards?.xp;
  const finalXP =
    rewardsXP != null && Number(rewardsXP) > 0
      ? Number(rewardsXP)
      : Math.floor(totalXP);
  return {
    totalCoins: Math.round(Number(totalCoins) * 100) / 100,
    totalXP: Math.round(Number(finalXP)),
  };
};

/**
 * Normalize game URL/click URL
 * @param {Object} game - Game object
 * @returns {string} - Normalized URL
 */
export const normalizeGameUrl = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  let url = "";
  if (provider === "bitlab") {
    // Bitlab/Bitlabs URL priority: Check multiple possible field names and locations
    // Try rawData first, then game level, then details
    url =
      rawData.continue_url ||
      rawData.clickUrl ||
      rawData.click_url ||
      rawData.deepLink ||
      rawData.url ||
      rawData.downloadUrl ||
      rawData.tracking_url ||
      rawData.offer_url ||
      game?.clickUrl ||
      game?.click_url ||
      game?.deepLink ||
      game?.url ||
      game?.details?.downloadUrl ||
      game?.details?.clickUrl ||
      game?.details?.url ||
      "";

    console.log("🔗 Bitlab URL extraction:", {
      provider,
      rawDataKeys: Object.keys(rawData),
      clickUrl: rawData.clickUrl,
      click_url: rawData.click_url,
      deepLink: rawData.deepLink,
      url: rawData.url,
      gameUrl: game?.url,
      gameClickUrl: game?.clickUrl,
      detailsUrl: game?.details?.downloadUrl,
      finalUrl: url,
      // Log all URL-like fields from rawData
      allUrlFields: Object.keys(rawData).filter(
        (key) =>
          key.toLowerCase().includes("url") ||
          key.toLowerCase().includes("link") ||
          key.toLowerCase().includes("download"),
      ),
    });
  } else {
    // Besitos URL priority: rawData.url > game.url
    url = rawData.url || game?.url || game?.details?.downloadUrl || "";
    console.log("🔗 Besitos URL extraction:", {
      provider,
      rawDataUrl: rawData.url,
      gameUrl: game?.url,
      detailsUrl: game?.details?.downloadUrl,
      finalUrl: url,
    });
  }

  return url;
};

/**
 * Normalize game amount/rewards
 * @param {Object} game - Game object
 * @returns {number} - Normalized amount
 */
export const normalizeGameAmount = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  if (provider === "bitlab") {
    // Bitlab: sum all payable events
    const events = rawData.events || [];
    const totalAmount = events
      .filter((event) => event.payable === true)
      .reduce((sum, event) => {
        const payout = parseFloat(event.payout || 0);
        const points =
          parseFloat(event.promised_points || event.points || 0) / 100;
        return sum + (payout > 0 ? payout : points);
      }, 0);

    return totalAmount || rawData.amount || game?.rewards?.coins || 0;
  } else {
    return rawData.amount || game?.rewards?.coins || game?.amount || 0;
  }
};

/**
 * Normalize game category
 * @param {Object} game - Game object
 * @returns {string} - Normalized category
 */
export const normalizeGameCategory = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  if (provider === "bitlab") {
    // Bitlab: categories is an array of strings
    const categories = rawData.categories || [];
    return categories[0] || game?.details?.category || "Game";
  } else {
    // Besitos: categories is array of objects with 'name' property
    const categories = rawData.categories || [];
    return categories[0]?.name || game?.details?.category || "Game";
  }
};

/**
 * Get game confirmation time
 * @param {Object} game - Game object
 * @returns {string} - Confirmation time text
 */
export const getGameConfirmationTime = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  if (provider === "bitlab") {
    return rawData.confirmationTime || rawData.confirmation_time || "";
  } else {
    return rawData.confirmationTime || "";
  }
};

/**
 * Get game support URL
 * @param {Object} game - Game object
 * @returns {string} - Support URL
 */
export const getGameSupportUrl = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  if (provider === "bitlab") {
    return rawData.supportUrl || rawData.support_url || "";
  } else {
    return rawData.supportUrl || "";
  }
};

/**
 * Get game requirements/things to know
 * @param {Object} game - Game object
 * @returns {Array} - Requirements array
 */
export const getGameRequirements = (game) => {
  const rawData = game?.besitosRawData || game || {};
  const provider = getSdkProvider(game);

  if (provider === "bitlab") {
    return rawData.thingsToKnow || rawData.things_to_know || [];
  } else {
    return rawData.thingsToKnow || [];
  }
};

/**
 * Comprehensive game data normalizer
 * Returns a normalized game object with all fields mapped correctly
 * @param {Object} game - Raw game object from API
 * @returns {Object} - Normalized game object
 */
export const normalizeGameData = (game) => {
  if (!game) return null;

  const provider = getSdkProvider(game);
  const images = normalizeGameImages(game);
  const goals = normalizeGameGoals(game);

  return {
    // Core identifiers
    id: game._id || game.id || game.gameId,
    gameId: game.gameId || game._id || game.id,

    // Basic info
    title: normalizeGameTitle(game),
    description: normalizeGameDescription(game),
    category: normalizeGameCategory(game),

    // Images
    icon: images.icon,
    square_image: images.square_image,
    large_image: images.large_image,
    banner: images.banner,
    image: images.square_image || images.icon, // Default image

    // Rewards
    amount: normalizeGameAmount(game),
    coins: normalizeGameAmount(game),
    rewards: {
      coins: normalizeGameAmount(game),
      xp: game?.rewards?.xp || 0,
    },

    // Goals/Events
    goals: goals,

    // URLs
    url: normalizeGameUrl(game),
    downloadUrl: normalizeGameUrl(game),
    clickUrl: normalizeGameUrl(game),
    deepLink: normalizeGameUrl(game),
    supportUrl: getGameSupportUrl(game),

    // Additional info
    confirmationTime: getGameConfirmationTime(game),
    requirements: getGameRequirements(game),

    // Provider info
    provider: provider,
    sdkProvider: provider,

    // Keep original data for reference
    besitosRawData: game.besitosRawData,
    originalGame: game,

    // Other fields from original game
    ...game,
  };
};
