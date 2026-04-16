/**
 * Capacitor Preferences Storage Adapter for Redux Persist
 *
 * This adapter uses @capacitor/preferences instead of localStorage,
 * which provides much higher storage limits on Android/iOS devices.
 *
 * Capacitor Preferences has no practical size limit (unlike localStorage's 5-10MB limit)
 * and is the recommended storage solution for Capacitor apps.
 */

import { Preferences } from "@capacitor/preferences";

const capacitorStorage = {
  /**
   * Get item from Capacitor Preferences
   * @param {string} key - Storage key
   * @returns {Promise<string|null>} - Stored value or null
   */
  getItem: async (key) => {
    try {
      const { value } = await Preferences.get({ key });
      return value;
    } catch (error) {
      console.error(`[CapacitorStorage] Error getting item "${key}":`, error);
      return null;
    }
  },

  /**
   * Set item in Capacitor Preferences
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   * @returns {Promise<void>}
   */
  setItem: async (key, value) => {
    try {
      await Preferences.set({ key, value });
    } catch (error) {
      // Handle quota exceeded errors gracefully
      if (
        error.message?.includes("QuotaExceeded") ||
        error.message?.includes("quota")
      ) {
        console.error(
          `[CapacitorStorage] Storage quota exceeded for key "${key}". Attempting cleanup...`
        );

        // Try to clear old cache data
        try {
          await Preferences.remove({ key: "persist:games" });
          await Preferences.remove({ key: "persist:walletTransactions" });
          console.log("[CapacitorStorage] Cleared old cache data, retrying...");

          // Retry once after cleanup
          await Preferences.set({ key, value });
        } catch (retryError) {
          console.error(
            `[CapacitorStorage] Failed to store after cleanup:`,
            retryError
          );
          throw new Error(
            `Storage quota exceeded. Please clear app data or contact support.`
          );
        }
      } else {
        console.error(`[CapacitorStorage] Error setting item "${key}":`, error);
        throw error;
      }
    }
  },

  /**
   * Remove item from Capacitor Preferences
   * @param {string} key - Storage key
   * @returns {Promise<void>}
   */
  removeItem: async (key) => {
    try {
      await Preferences.remove({ key });
    } catch (error) {
      console.error(`[CapacitorStorage] Error removing item "${key}":`, error);
    }
  },
};

export default capacitorStorage;
