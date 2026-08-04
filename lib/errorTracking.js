/**
 * Error tracking via Sentry (sentry.io).
 *
 * - initErrorTracking(): call once on app start (client only). No-ops when
 *   NEXT_PUBLIC_SENTRY_DSN is not set, so local dev is unaffected.
 * - syncErrorTrackingUser(user): attach/detach the logged-in user so every
 *   event shows who hit it.
 * - reportApiFailure(...): called from lib/api.js — captures 5xx/server
 *   failures as events, records 4xx/network issues as breadcrumbs only
 *   (mobile networks flake constantly; those would drown the real signal).
 */
import * as Sentry from "@sentry/react";
import { Capacitor } from "@capacitor/core";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

// uat | production — explicit override wins, otherwise inferred from the API host
const ENVIRONMENT =
  process.env.NEXT_PUBLIC_SENTRY_ENV ||
  ((process.env.NEXT_PUBLIC_API_URL || "").includes("uat")
    ? "uat"
    : "production");

let initialized = false;

export const initErrorTracking = () => {
  if (initialized || typeof window === "undefined" || !DSN) return;
  initialized = true;

  Sentry.init({
    dsn: DSN,
    environment: ENVIRONMENT,
    release: process.env.NEXT_PUBLIC_APP_VERSION || undefined,
    // Errors only — keeps us within the Sentry free-tier event quota
    tracesSampleRate: 0,
    // Browser noise that isn't actionable
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
    ],
  });

  Sentry.setTag("platform", Capacitor.getPlatform()); // ios | android | web

  console.log(
    `✅ Error tracking initialized (env: ${ENVIRONMENT}, platform: ${Capacitor.getPlatform()})`,
  );
};

export const syncErrorTrackingUser = (user) => {
  if (!initialized) return;
  const id = user?._id || user?.id;
  if (id) {
    Sentry.setUser({ id: String(id) });
  } else {
    Sentry.setUser(null);
  }
};

export const reportApiFailure = ({ endpoint, method, status, message }) => {
  if (!initialized) return;

  // Server-side failures are actionable — capture as events
  if (status >= 500) {
    Sentry.withScope((scope) => {
      scope.setTag("api_endpoint", endpoint);
      scope.setTag("http_status", String(status));
      scope.setFingerprint(["api-failure", method, endpoint, String(status)]);
      Sentry.captureMessage(
        `API ${method} ${endpoint} failed with ${status}: ${message}`,
        "error",
      );
    });
    return;
  }

  // 4xx / timeouts / network errors: breadcrumb only, visible on later events
  Sentry.addBreadcrumb({
    category: "api",
    level: "warning",
    message: `${method} ${endpoint} -> ${status || "network-error"}: ${message}`,
  });
};

export { Sentry };
