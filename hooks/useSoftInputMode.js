"use client";
import { useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";

const SoftInputPlugin = registerPlugin("SoftInputPlugin");

/**
 * Use on pages that need adjustResize (OTP, country search/select).
 * Switches to adjustResize on mount, back to adjustPan on unmount.
 *
 * Usage:
 *   import useSoftInputMode from "@/hooks/useSoftInputMode";
 *   // inside your component:
 *   useSoftInputMode("resize");
 */
export default function useSoftInputMode(mode = "resize") {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    SoftInputPlugin.setMode({ mode });
    return () => {
      SoftInputPlugin.setMode({ mode: "pan" });
    };
  }, [mode]);
}
