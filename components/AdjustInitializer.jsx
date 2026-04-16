"use client";
/**
 * AdjustInitializer
 *
 * Initializes the Adjust Web SDK once per app session.
 * Fires app install (first open) and app session start events.
 *
 * Retention tracking strategy (industry best practice):
 *   PRIMARY   → GET /v2/adjust/retention (backend, per-user, survives reinstalls)
 *   FALLBACK  → localStorage (device-level, used only when not logged in)
 *
 * Renders nothing — purely a side-effect component.
 */
import { useEffect } from "react";
import { initAdjustSDK } from "@/lib/adjustSDK";
import {
  fetchDynamicTokens,
  fetchUserRetention,
  onAppOpenWithRetention,
  onAppInstall,
  onAppOpen,
} from "@/lib/adjustService";
import { initFromServer as initAdjustCounters } from "@/lib/adjustCounters";

export default function AdjustInitializer() {
  useEffect(() => {
    const run = async () => {
      console.log("[Adjust] 🚀 AdjustInitializer running...");

      // 1. Initialize the Web SDK
      await initAdjustSDK();

      const authToken = localStorage.getItem("authToken");

      // 2. Fetch dynamic event tokens from backend
      if (authToken) {
        try {
          console.log("[Adjust] 🔄 Fetching dynamic event tokens from backend...");
          await fetchDynamicTokens(authToken);
        } catch {
          console.log("[Adjust] ⚠️ Dynamic token fetch failed — using hardcoded tokens");
        }

        // 2b. Seed in-memory milestone counters from server (survives reinstalls)
        try {
          await initAdjustCounters(authToken);
        } catch {
          console.log("[Adjust] ⚠️ Counter seed failed — milestones start from 0");
        }
      } else {
        console.log("[Adjust] ⚠️ No auth token — using hardcoded tokens");
      }

      // 3. Retention tracking — backend-driven (primary) or localStorage (fallback)
      if (authToken) {
        // PRIMARY: backend-driven (per-user, survives reinstalls & account switches)
        console.log("[Adjust] 📡 Fetching user retention record from backend...");
        const retention = await fetchUserRetention(authToken);

        if (retention) {
          // Backend returned valid data — use it
          onAppOpenWithRetention(retention, authToken);
          console.log("[Adjust] ✅ AdjustInitializer done (backend-driven retention)");
          return;
        }

        console.log("[Adjust] ⚠️ Backend retention unavailable — falling back to localStorage");
      }

      // FALLBACK: localStorage (used when logged out or backend unavailable)
      // Note: device-level only — resets on reinstall, shared across accounts
      console.log("[Adjust] 📦 Using localStorage fallback for retention tracking");
      let daysSinceInstall = 0;
      try {
        const storedDate = localStorage.getItem("adjust_install_date");
        if (!storedDate) {
          localStorage.setItem("adjust_install_date", Date.now().toString());
          console.log("[Adjust] 📅 First open (localStorage) — install date saved");
        } else {
          const ms = Date.now() - parseInt(storedDate, 10);
          daysSinceInstall = Math.floor(ms / (1000 * 60 * 60 * 24));
          console.log(`[Adjust] 📅 Days since install (localStorage): ${daysSinceInstall}`);
        }
      } catch {
        // ignore storage errors
      }

      onAppInstall();
      onAppOpen(daysSinceInstall);
      console.log("[Adjust] ✅ AdjustInitializer done (localStorage fallback)");
    };

    run();
  }, []);

  return null;
}
