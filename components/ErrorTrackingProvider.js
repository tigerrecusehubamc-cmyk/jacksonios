"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/react";
import {
  initErrorTracking,
  syncErrorTrackingUser,
} from "@/lib/errorTracking";
import { useAuth } from "@/contexts/AuthContext";

// Init at module load so errors during first render are already captured
initErrorTracking();

function CrashFallback({ resetError }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white px-8 text-center">
      <p className="text-lg font-semibold mb-2">Something went wrong</p>
      <p className="text-sm text-gray-400 mb-6">
        The error has been reported. Please try again.
      </p>
      <button
        onClick={() => {
          if (resetError) resetError();
          window.location.href = "/";
        }}
        className="px-6 py-3 rounded-full bg-white text-black text-sm font-semibold"
      >
        Reload app
      </button>
    </div>
  );
}

/**
 * Wraps the app in a Sentry ErrorBoundary (a render crash previously meant a
 * silent white screen) and keeps the tracked user in sync with auth state.
 * Must be mounted inside AuthProvider.
 */
export default function ErrorTrackingProvider({ children }) {
  const { user } = useAuth();

  useEffect(() => {
    syncErrorTrackingUser(user);
  }, [user]);

  return (
    <Sentry.ErrorBoundary
      fallback={({ resetError }) => <CrashFallback resetError={resetError} />}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
