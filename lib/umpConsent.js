/**
 * Google UMP (User Messaging Platform) consent – JS bridge.
 * Uses native UmpConsent plugin on Android; for iOS, returns true and relies on
 * AppLovin MAX SDK's built-in consent handling via AdMob mediation.
 * See: https://developers.google.com/admob/android/privacy
 *
 * If the consent form never appears: this is NOT an app error – it is AdMob/Google (mob) side.
 * Fix: AdMob console → Privacy & messaging → create a message for your app ID.
 */

import { Capacitor, registerPlugin } from '@capacitor/core';

let UmpConsent = null;

// Only register UmpConsent on Android where it's available
const isAndroid = Capacitor.getPlatform() === 'android';
if (isAndroid) {
  try {
    UmpConsent = registerPlugin('UmpConsent');
  } catch (e) {
    console.warn('[AdMob/UMP] UmpConsent plugin not available:', e);
  }
}

const MOB_SIDE_DEBUG_MSG = '[AdMob/UMP] If consent form did not appear: NOT an app bug – AdMob console → Privacy & messaging → add message for your app ID.';

/**
 * Returns whether the app can request ads (user consent obtained or not required).
 * - Android: Uses native UmpConsent plugin
 * - iOS: Returns true, relies on AppLovin MAX SDK's built-in consent handling
 * @returns {Promise<boolean>}
 */
export const canRequestAds = async () => {
  const platform = Capacitor.getPlatform();
  console.log('[AdMob/UMP] canRequestAds() called, platform:', platform);

  // iOS: AppLovin MAX SDK handles consent internally via AdMob mediation
  if (platform === 'ios') {
    console.log('[AdMob/UMP] iOS detected – returning true (AppLovin handles consent)');
    return true;
  }

  // Web: No UMP needed
  if (!Capacitor.isNativePlatform()) {
    console.log('[AdMob/UMP] Not native – returning true (no UMP)');
    return true;
  }

  // Android: Use native UmpConsent plugin
  try {
    const result = await UmpConsent?.canRequestAds();
    const value = result?.value === true;
    console.log('[AdMob/UMP] canRequestAds() result:', value, 'raw:', result);
    if (!value) {
      console.log('[AdMob/UMP] canRequestAds=false – form may not have been shown. ' + MOB_SIDE_DEBUG_MSG);
    }
    return value;
  } catch (e) {
    console.warn('[AdMob/UMP] canRequestAds failed (may be mob side config):', e);
    console.log(MOB_SIDE_DEBUG_MSG);
    // On Android error, return true to allow ads (better UX than blocking)
    return true;
  }
};

/**
 * Shows the Google privacy options form (e.g. for "Privacy settings" / "Manage ad choices" in app settings).
 * Required when the privacy message is configured to need an in-app entry point.
 */
export const showPrivacyOptionsForm = async () => {
  const platform = Capacitor.getPlatform();
  console.log('[AdMob/UMP] showPrivacyOptionsForm() called, platform:', platform);

  // iOS: AppLovin MAX handles this internally
  if (platform === 'ios') {
    console.log('[AdMob/UMP] iOS – no separate form (AppLovin handles privacy)');
    return;
  }

  // Web: No-op
  if (!Capacitor.isNativePlatform()) {
    console.log('[AdMob/UMP] Not native – no-op');
    return;
  }

  // Android: Show native form
  try {
    console.log('[AdMob/UMP] Showing privacy options form...');
    await UmpConsent?.showPrivacyOptionsForm();
    console.log('[AdMob/UMP] showPrivacyOptionsForm() completed');
  } catch (e) {
    console.warn('[AdMob/UMP] showPrivacyOptionsForm failed:', e);
  }
};
