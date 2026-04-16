"use client";

import React, { useEffect, useState, useCallback, createContext, useContext, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen as CapSplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";
import Image from "next/image";

const FADE_MS = 300;
const NATIVE_FADE_MS = 400;
const NATIVE_MAX_MS = 8000; // safety: hide no matter what after 8s
const SPLASH_SHOWN_KEY = "jr_splash_shown";

// Context so any screen (e.g. app/page.js) can trigger the hide.
export const SplashContext = createContext({ hideSplash: () => {} });
export const useSplash = () => useContext(SplashContext);

// Show web overlay only on first open of a session (native handles its own splash).
function shouldShowSplash() {
  try {
    if (typeof window === "undefined") return false;
    if (Capacitor.isNativePlatform?.()) return false;
    return !sessionStorage.getItem(SPLASH_SHOWN_KEY);
  } catch {
    return false;
  }
}

export default function SplashScreen({ children }) {
  const [visible, setVisible] = useState(shouldShowSplash);
  const [fading, setFading] = useState(false);
  const hideCalledRef = useRef(false);

  const hideSplash = useCallback(() => {
    if (hideCalledRef.current) return;
    hideCalledRef.current = true;

    const isNative = Capacitor.isNativePlatform?.();

    if (isNative) {
      // Hide the native Capacitor splash with a smooth fade.
      // Known Capacitor bug: SplashScreen.hide() resets Android status bar style.
      // Re-apply white icons immediately after the splash finishes hiding.
      CapSplashScreen.hide({ fadeOutDuration: NATIVE_FADE_MS })
        .catch(() => {})
        .finally(() => {
          StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
        });
      return;
    }

    // Web: fade out the overlay.
    if (!visible) return;
    setFading(true);
    setTimeout(() => setVisible(false), FADE_MS);
  }, [visible]);

  useEffect(() => {
    const isNative = Capacitor.isNativePlatform?.();

    if (isNative) {
      // Safety: if app/page.js never calls hideSplash (e.g. routing error),
      // force-hide after NATIVE_MAX_MS so the splash never gets stuck.
      const max = setTimeout(hideSplash, NATIVE_MAX_MS);
      return () => clearTimeout(max);
    }

    // Web — skip if already shown this session.
    if (!visible) return;

    sessionStorage.setItem(SPLASH_SHOWN_KEY, "1");

    // Auto-hide on first paint for web (no routing gate needed on web).
    const raf = requestAnimationFrame(() => {
      setFading(true);
      setTimeout(() => setVisible(false), FADE_MS);
    });

    return () => cancelAnimationFrame(raf);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SplashContext.Provider value={{ hideSplash }}>
      {children}

      {visible && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "#3a9e42",
            opacity: fading ? 0 : 1,
            transition: fading ? `opacity ${FADE_MS}ms ease-out` : "none",
            pointerEvents: fading ? "none" : "auto",
          }}
        >
          <Image
            src="/splash.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            style={{ objectFit: "cover", objectPosition: "center top" }}
          />
        </div>
      )}
    </SplashContext.Provider>
  );
}
