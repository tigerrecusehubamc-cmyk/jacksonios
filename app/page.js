"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Compute the destination route SYNCHRONOUSLY from localStorage.
//
// WHY: The old pattern put this logic inside useEffect, which runs one frame
// AFTER the component renders. That one-frame gap was invisible on cold start
// (native Capacitor splash covers it) but caused a visible blank flash when
// Android resumed the app from the background — the native splash is NOT shown
// on background resume, so users saw: null → blank flash → correct onboarding step.
//
// The useState initializer runs synchronously during the first render, so the
// correct destination is known before any frame is painted. The useEffect then
// just fires router.replace() with the already-computed value.
// ─────────────────────────────────────────────────────────────────────────────
function computeDestination() {
  if (typeof window === "undefined") return "/welcome";

  const storedUserString = localStorage.getItem("user");
  const hasCompletedOnboarding =
    localStorage.getItem("onboardingComplete") === "true";
  const onboardingInProgressData = localStorage.getItem("onboarding-storage");
  const permissionsAccepted =
    localStorage.getItem("permissionsAccepted") === "true";
  const locationCompleted =
    localStorage.getItem("locationCompleted") === "true";
  const faceVerificationCompleted =
    localStorage.getItem("faceVerificationCompleted") === "true";
  const faceVerificationSkipped =
    localStorage.getItem("faceVerificationSkipped") === "true";

  if (storedUserString) {
    try {
      const user = JSON.parse(storedUserString);
      const isNewSignup = !hasCompletedOnboarding;

      const permissionsAcceptedFinal =
        permissionsAccepted || user.permissionStatus === true;
      const locationCompletedFinal =
        locationCompleted ||
        !!(user.location?.city || user.location?.latitude);
      const faceVerificationCompletedFinal =
        faceVerificationCompleted || user.faceVerificationStatus === true;

      // Sync localStorage from profile to prevent future mismatches
      if (permissionsAcceptedFinal && !permissionsAccepted)
        localStorage.setItem("permissionsAccepted", "true");
      if (locationCompletedFinal && !locationCompleted)
        localStorage.setItem("locationCompleted", "true");
      if (faceVerificationCompletedFinal && !faceVerificationCompleted)
        localStorage.setItem("faceVerificationCompleted", "true");

      if (isNewSignup && onboardingInProgressData) {
        try {
          const onboardingState = JSON.parse(onboardingInProgressData);
          const state = onboardingState?.state;
          if (state) {
            if (!state.ageRange) return "/select-age";
            if (!state.gender) return "/select-gender";
            if (!state.gamePreferences || state.gamePreferences.length === 0)
              return "/game-preferences";
            if (!state.gameStyle) return "/game-styles";
            if (!state.gameHabit) return "/player-type";
            // All questionnaire fields filled — fall through to permissions
          }
        } catch {
          return "/select-age";
        }
      }

      if (!permissionsAcceptedFinal) return "/permissions";
      if (!locationCompletedFinal) return "/location";
      if (
        isNewSignup &&
        !faceVerificationCompletedFinal &&
        !faceVerificationSkipped
      )
        return "/face-verification";

      return "/homepage";
    } catch {
      return "/login";
    }
  }

  if (onboardingInProgressData) {
    try {
      const onboardingState = JSON.parse(onboardingInProgressData);
      const state = onboardingState?.state;
      if (state) {
        if (!state.ageRange) return "/select-age";
        if (!state.gender) return "/select-gender";
        if (!state.gamePreferences || state.gamePreferences.length === 0)
          return "/game-preferences";
        if (!state.gameStyle) return "/game-styles";
        return "/player-type";
      }
    } catch {
      return "/welcome";
    }
  }

  if (hasCompletedOnboarding) return "/login";
  return "/welcome";
}

export default function AppLoader() {
  const router = useRouter();

  // destination is computed synchronously on first render —
  // zero async gap means no blank-frame flash on background resume.
  const [destination] = useState(computeDestination);

  useEffect(() => {
    router.replace(destination);
  }, [destination, router]);

  // Return null — the native Capacitor splash stays visible until
  // the landing page calls hideSplash() when it is ready to render.
  return null;
}
