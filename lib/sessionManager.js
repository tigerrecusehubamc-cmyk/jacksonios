/**
 * Session Manager SDK - Complete Implementation
 *
 * Manages user game sessions with persistence, validation, analytics, and cleanup.
 * Prevents fraud and ensures one-time reward claims.
 */

class SessionManager {
  constructor() {
    this.activeSessions = new Map();
    this.maxSessionDuration = 24 * 60 * 60 * 1000; // 24 hours
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
    this.storageKey = "jackson_rewards_sessions";

    if (typeof window !== "undefined") {
      this.startCleanupInterval();
      this.loadSessionsFromStorage();
    }
  }

  /**
   * Generate unique session ID
   */
  generateSessionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `session_${timestamp}_${random}`;
  }

  /**
   * Create new session
   */
  createSession(gameId, userId, gameData = {}) {
    console.log("🎮 SessionManager: Creating new session", { gameId, userId });

    const sessionId = this.generateSessionId();
    const session = {
      id: sessionId,
      gameId,
      userId,
      gameTitle: gameData.title || "Unknown Game",
      startTime: Date.now(),
      lastActivity: Date.now(),
      isActive: true,
      isClaimed: false,
      sessionCoins: 0,
      sessionXP: 0,
      milestonesReached: [],
      tasksCompleted: [],
      metadata: {
        userAgent: navigator.userAgent,
        platform: this.detectPlatform(),
        version: "1.0.0",
      },
    };

    this.activeSessions.set(sessionId, session);
    this.saveToStorage();
    this.trackSessionStart(session);

    console.log("✅ SessionManager: Session created", sessionId);
    return sessionId;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get active session for game
   */
  getActiveSessionForGame(gameId, userId) {
    for (const [sessionId, session] of this.activeSessions) {
      if (
        session.gameId === gameId &&
        session.userId === userId &&
        session.isActive &&
        !session.isClaimed
      ) {
        return session;
      }
    }
    return null;
  }

  /**
   * Update session activity
   */
  updateSessionActivity(sessionId, activity = {}) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.lastActivity = Date.now();

      // Update session data
      if (activity.sessionCoins !== undefined) {
        session.sessionCoins = activity.sessionCoins;
      }
      if (activity.sessionXP !== undefined) {
        session.sessionXP = activity.sessionXP;
      }
      if (activity.milestoneReached) {
        session.milestonesReached.push({
          milestone: activity.milestoneReached,
          timestamp: Date.now(),
        });
      }
      if (activity.taskCompleted) {
        session.tasksCompleted.push({
          taskId: activity.taskCompleted,
          timestamp: Date.now(),
        });
      }

      this.saveToStorage();
      this.trackSessionActivity(session, activity);
    }
  }

  /**
   * Validate session
   */
  async validateSession(sessionId) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      console.warn("⚠️ SessionManager: Session not found", sessionId);
      return false;
    }

    // Check if session expired
    if (Date.now() - session.startTime > this.maxSessionDuration) {
      console.warn("⚠️ SessionManager: Session expired", sessionId);
      this.endSession(sessionId, "expired");
      return false;
    }

    // Check if session is inactive for too long (2 hours)
    if (Date.now() - session.lastActivity > 2 * 60 * 60 * 1000) {
      console.warn("⚠️ SessionManager: Session inactive", sessionId);
      this.endSession(sessionId, "inactive");
      return false;
    }

    // Validate with backend
    try {
      const response = await fetch(`/api/session/${sessionId}/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId,
          userId: session.userId,
          gameId: session.gameId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.isValid;
      } else {
        console.error(
          "❌ SessionManager: Backend validation failed",
          response.status,
        );
        return false;
      }
    } catch (error) {
      console.error("❌ SessionManager: Validation error", error);
      // Allow session to continue if backend is unavailable
      return true;
    }
  }

  /**
   * End session
   */
  endSession(sessionId, reason = "completed", claimData = {}) {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.isActive = false;
      session.endTime = Date.now();
      session.endReason = reason;
      session.duration = session.endTime - session.startTime;

      if (claimData.coins) session.sessionCoins = claimData.coins;
      if (claimData.xp) session.sessionXP = claimData.xp;
      if (claimData.isClaimed) session.isClaimed = true;

      this.trackSessionEnd(session);
      this.activeSessions.delete(sessionId);
      this.saveToStorage();

      console.log("✅ SessionManager: Session ended", {
        sessionId,
        reason,
        duration: session.duration,
      });
    }
  }

  /**
   * Claim session rewards
   */
  async claimSessionRewards(sessionId, claimData) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    if (session.isClaimed) {
      throw new Error("Session already claimed");
    }

    try {
      // Call backend API
      const response = await fetch(
        "https://rewardsuatapi.hireagent.co/api/claim-rewards",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionId,
            gameId: session.gameId,
            userId: session.userId,
            coins: claimData.coins || session.sessionCoins,
            xp: claimData.xp || session.sessionXP,
            sessionData: session,
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();

        // Mark session as claimed
        session.isClaimed = true;
        session.claimTime = Date.now();
        session.claimData = result;

        this.trackSessionClaim(session, result);
        this.saveToStorage();

        console.log("✅ SessionManager: Rewards claimed", result);
        return result;
      } else {
        throw new Error(`Claim failed: ${response.status}`);
      }
    } catch (error) {
      console.error("❌ SessionManager: Claim error", error);
      throw error;
    }
  }

  /**
   * Save sessions to localStorage
   */
  saveToStorage() {
    try {
      const sessionsData = Array.from(this.activeSessions.entries());
      localStorage.setItem(this.storageKey, JSON.stringify(sessionsData));
    } catch (error) {
      console.error("❌ SessionManager: Storage error", error);
    }
  }

  /**
   * Load sessions from localStorage
   */
  loadSessionsFromStorage() {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const sessionsData = JSON.parse(stored);
        this.activeSessions = new Map(sessionsData);

        // Clean up expired sessions
        this.cleanupExpiredSessions();

        console.log(
          "✅ SessionManager: Loaded sessions from storage",
          this.activeSessions.size,
        );
      }
    } catch (error) {
      console.error("❌ SessionManager: Load error", error);
    }
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    const expiredSessions = [];

    for (const [sessionId, session] of this.activeSessions) {
      if (now - session.startTime > this.maxSessionDuration) {
        expiredSessions.push(sessionId);
      }
    }

    expiredSessions.forEach((sessionId) => {
      this.endSession(sessionId, "expired");
    });

    if (expiredSessions.length > 0) {
      console.log(
        "🧹 SessionManager: Cleaned up expired sessions",
        expiredSessions.length,
      );
    }
  }

  /**
   * Start cleanup interval
   */
  startCleanupInterval() {
    // Store the ID so the interval can be cleared if needed (e.g. on logout or destroy).
    this._cleanupIntervalId = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.cleanupInterval);
  }

  /**
   * Stop the cleanup interval (call on logout or app teardown)
   */
  stopCleanupInterval() {
    if (this._cleanupIntervalId) {
      clearInterval(this._cleanupIntervalId);
      this._cleanupIntervalId = null;
    }
  }

  /**
   * Detect platform
   */
  detectPlatform() {
    if (typeof window !== "undefined") {
      if (window.Capacitor) return "mobile";
      if (window.navigator.userAgent.includes("Mobile")) return "mobile";
      return "web";
    }
    return "unknown";
  }

  /**
   * Track session start
   */
  trackSessionStart(session) {
    // Analytics tracking
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "session_started", {
        session_id: session.id,
        game_id: session.gameId,
        user_id: session.userId,
        platform: session.metadata.platform,
      });
    }

    console.log("📊 SessionManager: Session start tracked", {
      sessionId: session.id,
      gameId: session.gameId,
      userId: session.userId,
    });
  }

  /**
   * Track session activity
   */
  trackSessionActivity(session, activity) {
    // Analytics tracking
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "session_activity", {
        session_id: session.id,
        activity_type: activity.type || "general",
        coins: activity.sessionCoins || session.sessionCoins,
        xp: activity.sessionXP || session.sessionXP,
      });
    }
  }

  /**
   * Track session end
   */
  trackSessionEnd(session) {
    // Analytics tracking
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "session_ended", {
        session_id: session.id,
        duration: session.duration,
        reason: session.endReason,
        coins_earned: session.sessionCoins,
        xp_earned: session.sessionXP,
        tasks_completed: session.tasksCompleted.length,
      });
    }

    console.log("📊 SessionManager: Session end tracked", {
      sessionId: session.id,
      duration: session.duration,
      reason: session.endReason,
    });
  }

  /**
   * Track session claim
   */
  trackSessionClaim(session, claimResult) {
    // Analytics tracking
    if (typeof window !== "undefined" && window.gtag) {
      window.gtag("event", "rewards_claimed", {
        session_id: session.id,
        coins_claimed: claimResult.coinsTransferred,
        xp_claimed: claimResult.xpTransferred,
        total_duration: session.duration,
      });
    }

    console.log("📊 SessionManager: Claim tracked", {
      sessionId: session.id,
      coins: claimResult.coinsTransferred,
      xp: claimResult.xpTransferred,
    });
  }

  /**
   * Get session statistics
   */
  getSessionStats() {
    const sessions = Array.from(this.activeSessions.values());
    return {
      activeSessions: sessions.filter((s) => s.isActive).length,
      totalSessions: sessions.length,
      totalCoins: sessions.reduce((sum, s) => sum + s.sessionCoins, 0),
      totalXP: sessions.reduce((sum, s) => sum + s.sessionXP, 0),
      averageDuration:
        sessions.length > 0
          ? sessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
            sessions.length
          : 0,
    };
  }

  /**
   * Clear all sessions (for testing)
   */
  clearAllSessions() {
    this.activeSessions.clear();
    localStorage.removeItem(this.storageKey);
    console.log("🧹 SessionManager: All sessions cleared");
  }
}

// Create singleton instance
const sessionManager = new SessionManager();

export default sessionManager;
