/**
 * VPN Detection and Network Optimization Utilities
 * Handles VPN-specific issues with API requests and progress tracking
 */

/**
 * Detect if user is likely using VPN
 * @returns {Object} VPN detection result with confidence level
 */
export const detectVpnUsage = () => {
  const connection = navigator.connection;
  const userAgent = navigator.userAgent;

  // VPN detection indicators
  const indicators = {
    isVpnLikely: false,
    confidence: 0,
    reasons: [],
  };

  // Check for VPN-specific patterns
  if (connection) {
    // High latency might indicate VPN
    if (connection.rtt > 200) {
      indicators.confidence += 30;
      indicators.reasons.push("High latency detected");
    }

    // Cellular connection with HTTPS might indicate VPN
    if (
      connection.type === "cellular" &&
      window.location.protocol === "https:"
    ) {
      indicators.confidence += 20;
      indicators.reasons.push("Cellular with HTTPS");
    }
  }

  // Check for VPN-specific user agent patterns
  const vpnPatterns = [/vpn/i, /proxy/i, /tunnel/i, /tor/i];

  vpnPatterns.forEach((pattern) => {
    if (pattern.test(userAgent)) {
      indicators.confidence += 40;
      indicators.reasons.push("VPN pattern in user agent");
    }
  });

  // Check for timezone inconsistencies
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const expectedTimezone = "Asia/Kolkata"; // India timezone

  if (timezone !== expectedTimezone) {
    indicators.confidence += 25;
    indicators.reasons.push(
      `Timezone mismatch: ${timezone} vs ${expectedTimezone}`
    );
  }

  indicators.isVpnLikely = indicators.confidence > 50;

  return indicators;
};

/**
 * Get optimized API configuration for VPN users
 * @param {Object} baseConfig - Base API configuration
 * @returns {Object} Optimized configuration
 */
export const getVpnOptimizedConfig = (baseConfig = {}) => {
  const vpnDetection = detectVpnUsage();

  if (vpnDetection.isVpnLikely) {
    return {
      ...baseConfig,
      timeout: 90000, // 90 seconds for VPN
      retries: 5,
      retryDelay: 3000,
      headers: {
        ...baseConfig.headers,
        "X-VPN-Detected": "true",
        "X-Connection-Type": navigator.connection?.type || "unknown",
        "X-Latency": navigator.connection?.rtt || "unknown",
      },
    };
  }

  return baseConfig;
};

/**
 * Create a VPN-aware fetch function with automatic retries
 * @param {string} url - Request URL
 * @param {Object} options - Fetch options
 * @returns {Promise} Fetch result with retry logic
 */
export const vpnAwareFetch = async (url, options = {}) => {
  const vpnDetection = detectVpnUsage();
  const maxRetries = vpnDetection.isVpnLikely ? 5 : 3;
  const retryDelay = vpnDetection.isVpnLikely ? 3000 : 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = vpnDetection.isVpnLikely ? 90000 : 30000;

      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return response;
      }

      // If not the last attempt, wait before retry
      if (attempt < maxRetries) {
        console.log(`🔄 VPN-aware retry ${attempt}/${maxRetries} for ${url}`);
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelay * attempt)
        );
      }
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(
          `VPN connection failed after ${maxRetries} attempts: ${error.message}`
        );
      }

      console.log(`⚠️ Attempt ${attempt} failed, retrying...`);
      await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
    }
  }
};

/**
 * Get user-friendly VPN troubleshooting message
 * @returns {string} Troubleshooting message
 */
export const getVpnTroubleshootingMessage = () => {
  const vpnDetection = detectVpnUsage();

  if (vpnDetection.isVpnLikely) {
    return `VPN detected (${vpnDetection.confidence}% confidence). 
    For better performance:
    • Try switching to a server closer to India
    • Use a faster VPN protocol (WireGuard > OpenVPN)
    • Temporarily disable VPN for game downloads
    • Check if your VPN blocks certain APIs`;
  }

  return "If you're using a VPN, try switching servers or temporarily disabling it for better performance.";
};

/**
 * Monitor network quality and suggest optimizations
 * @returns {Object} Network quality assessment
 */
export const assessNetworkQuality = () => {
  const connection = navigator.connection;

  if (!connection) {
    return {
      quality: "unknown",
      suggestions: ["Unable to assess network quality"],
    };
  }

  const rtt = connection.rtt || 0;
  const downlink = connection.downlink || 0;

  let quality = "good";
  const suggestions = [];

  if (rtt > 500) {
    quality = "poor";
    suggestions.push("High latency detected - try switching VPN servers");
  } else if (rtt > 200) {
    quality = "fair";
    suggestions.push("Moderate latency - VPN may be causing delays");
  }

  if (downlink < 1) {
    quality = "poor";
    suggestions.push("Slow connection - consider upgrading VPN plan");
  }

  return {
    quality,
    rtt,
    downlink,
    suggestions,
  };
};
