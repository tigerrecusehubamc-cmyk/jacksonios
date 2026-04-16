// File: app/components/StatusBarSetter.jsx

"use client";
import { useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { App } from "@capacitor/app";

const SoftInputPlugin = registerPlugin("SoftInputPlugin");

export default function StatusBarSetter() {
    useEffect(() => {
        // Only run on native platforms
        const platform = Capacitor.getPlatform();
        if (platform === "web") return;

        const applyStatusBar = async () => {
            try {
                // Keep status bar visible, don't overlay content
                await StatusBar.setOverlaysWebView({ overlay: false });

                // Set status bar background to black
                await StatusBar.setBackgroundColor({ color: "#000000" });

                // Set style to Dark for white icons on dark/black background
                await StatusBar.setStyle({ style: Style.Dark });
            } catch (e) {
                console.warn("StatusBar config failed:", e);
            }
        };

        const initBars = async () => {
            await applyStatusBar();

            // Set window background to solid black so keyboard gaps
            // never reveal the splash image at any point in the app.
            try {
                await SoftInputPlugin.setMode({ mode: "pan" });
            } catch (e) {
                console.warn("SoftInputPlugin config failed:", e);
            }
        };

        initBars();

        // Aggressive early re-enforcement: SDKs (AdMob, AppLovin, Capacitor bridge)
        // often reset status bar icons within the first 2 seconds of startup.
        // Re-apply at short intervals immediately after launch to win the race.
        const earlyTimers = [
            setTimeout(() => applyStatusBar(), 300),
            setTimeout(() => applyStatusBar(), 600),
            setTimeout(() => applyStatusBar(), 1000),
            setTimeout(() => applyStatusBar(), 2000),
            setTimeout(() => applyStatusBar(), 3500),
        ];

        // Re-apply white icons when app returns to foreground.
        // Android OS resets the status bar icon style when the app is
        // backgrounded, causing icons to flip from white → black on resume.
        let appStateListener = null;
        (async () => {
            try {
                appStateListener = await App.addListener("appStateChange", ({ isActive }) => {
                    if (isActive) {
                        applyStatusBar();
                        // Re-enforce after foreground resume too (SDKs re-init on resume)
                        setTimeout(() => applyStatusBar(), 500);
                        setTimeout(() => applyStatusBar(), 1500);
                    }
                });
            } catch (e) {
                console.warn("App.addListener for status bar failed:", e);
            }
        })();

        // Also re-apply on window focus (covers WebView focus restore events)
        const handleFocus = () => applyStatusBar();
        window.addEventListener("focus", handleFocus);

        // Periodic guard: some native SDKs (e.g. AppLovin MAX) touch Android's
        // window flags during initialization/ad load, silently resetting the
        // status bar icon color from white → black while the app is in the
        // foreground. Re-enforce white icons every 8 seconds to counteract this.
        const guardInterval = setInterval(() => {
            applyStatusBar();
        }, 8000);

        return () => {
            earlyTimers.forEach(t => clearTimeout(t));
            window.removeEventListener("focus", handleFocus);
            clearInterval(guardInterval);
            if (appStateListener?.remove) {
                appStateListener.remove();
            }
        };
    }, []);

    return null;
}