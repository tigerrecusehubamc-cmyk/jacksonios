"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../contexts/AuthContext";
import Image from "next/image";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

const Spinner = () => (
  <div className="border-gray-500 h-16 w-16 animate-spin rounded-full border-4 border-t-[#af7de6]" />
);

// A simple SVG checkmark for the success state
const SuccessIcon = () => (
  <svg
    className="h-16 w-16 text-green-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// A simple SVG error icon for the failure state
const ErrorIcon = () => (
  <svg
    className="h-16 w-16 text-red-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleSocialAuthCallback } = useAuth();

  // Guard: processAuth must only run once even if deps change mid-flight.
  // Root cause: handleSocialAuthCallback had a new reference on every AuthProvider
  // re-render (setIsLoading/setUser/setToken re-renders), re-triggering the effect.
  const hasProcessed = useRef(false);

  // State to manage UI: 'processing', 'success', or 'error'
  const [status, setStatus] = useState("processing");
  const [errorMessage, setErrorMessage] = useState("");
  // Collect all backend message params into one display string (no duplicates, preserve order)
  const collectBackendMessages = (params) => {
    const messages = [];
    const seen = new Set();
    const keys = [
      "message",
      "error",
      "error_description",
      "error_message",
      "msg",
      "detail",
      "details",
    ];
    for (const key of keys) {
      const raw = params.get(key);
      if (raw == null || raw === "") continue;
      let text = raw;
      if (key === "details") {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) text = parsed.filter(Boolean).join(". ");
          else if (typeof parsed === "string") text = parsed;
        } catch (_) {
          // use as-is
        }
      }
      const normalized = String(text).trim();
      if (normalized && !seen.has(normalized)) {
        seen.add(normalized);
        messages.push(normalized);
      }
    }
    return messages.length ? messages.join(" ") : null;
  };

  useEffect(() => {
    // Prevent duplicate execution if the effect re-fires due to reference changes
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processAuth = async () => {
      const token = searchParams.get("token");
      const provider = searchParams.get("provider");
      const userId = searchParams.get("userId");
      const allBackendMessages = collectBackendMessages(searchParams);
      const hasError =
        allBackendMessages ||
        searchParams.get("message") ||
        searchParams.get("error");

      console.log("📄 [AuthCallback] processAuth started →", {
        isNative: Capacitor.isNativePlatform(),
        hasToken: !!token,
        hasError: !!hasError,
        allParams: Object.fromEntries(searchParams),
        allBackendMessages,
      });

      // 1. Handle Native platform
      if (Capacitor.isNativePlatform()) {
        const source = searchParams.get("source");

        if (source === "native") {
          // Arrived here via router.replace() from the appUrlOpen deep link handler.
          // Browser is already closed — skip the browser-close redirect and fall through
          // to the normal web auth processing below (token is already in searchParams).
          console.log("📄 [AuthCallback] Native source=native → processing auth directly (browser already closed)");
        } else {
          // Arrived here because the OAuth browser loaded /auth/callback normally.
          // Need to close the browser and fire the deep link back to the app.
          let deepLink = "jacksonrewards://auth/callback";
          if (token) {
            deepLink += `?token=${encodeURIComponent(token)}`;
            if (provider) deepLink += `&provider=${encodeURIComponent(provider)}`;
            if (userId) deepLink += `&userId=${encodeURIComponent(userId)}`;
            console.log("📄 [AuthCallback] Native browser → building deep link with token:", deepLink);
          } else {
            const message =
              allBackendMessages || "Authentication token not found.";
            deepLink += `?message=${encodeURIComponent(message)}`;
            console.log("📄 [AuthCallback] Native browser ERROR → building error deep link:", deepLink);
          }

          try {
            console.log("📄 [AuthCallback] Closing browser, then firing deep link in 500ms...");
            await Browser.close();
            setTimeout(() => {
              console.log("📄 [AuthCallback] Firing deep link now:", deepLink);
              window.location.href = deepLink;
            }, 500);
          } catch (closeError) {
            console.warn("📄 [AuthCallback] Browser.close() failed, firing deep link immediately:", closeError);
            window.location.href = deepLink;
          }
          return;
        }
      }

      // 2. Handle Errors – show all messages from backend
      if (hasError) {
        let errorMessage =
          allBackendMessages ||
          searchParams.get("message") ||
          searchParams.get("error") ||
          "Authentication failed.";

        console.log("❌ [AuthCallback] Web ERROR path → raw errorMessage:", errorMessage);

        // Improve message for suspended/pending accounts
        const lowerError = errorMessage.toLowerCase();
        if (
          lowerError.includes("suspend") ||
          lowerError.includes("pending") ||
          lowerError.includes("not active") ||
          lowerError.includes("deactiv") ||
          lowerError.includes("forbidden") ||
          lowerError.includes("unauthorized")
        ) {
          errorMessage =
            "Your account is currently suspended or pending. Please contact support for assistance.";
          console.log("❌ [AuthCallback] Web ERROR → mapped to account-status message:", errorMessage);
        }

        console.log("❌ [AuthCallback] Web ERROR → setting error UI, will redirect to /login in 4s");
        setErrorMessage(errorMessage);
        setStatus("error");
        setTimeout(() => router.replace("/login"), 4000);
        return;
      }

      // 3. Process Login (WEB FLOW)
      // Same pattern as normal email/password login: navigate directly after the
      // auth function resolves. We do NOT gate on isLoading from AuthContext —
      // that flag stays true while handleAuthSuccess prefetches background data,
      // which would block navigation for many seconds.
      if (token) {
        try {
          console.log("✅ [Auth Callback] Token received, processing via Context...");

          const result = await handleSocialAuthCallback(token);

          if (result.ok) {
            console.log("✅ [Auth Callback] Login successful, navigating...");

            // Show the success UI briefly, then navigate — identical timing to
            // the normal login page redirect after signIn() resolves.
            setStatus("success");

            setTimeout(() => {
              const { needsDisclosure, needsLocation } = result.statusData || {};

              if (!needsDisclosure) localStorage.setItem("permissionsAccepted", "true");
              if (!needsLocation)   localStorage.setItem("locationCompleted",   "true");

              if (needsDisclosure) {
                router.replace("/permissions");
              } else if (needsLocation) {
                router.replace("/location");
              } else {
                router.replace("/homepage");
              }
            }, 800);

          } else {
            let errorMsg = "";
            if (typeof result.error === "string") {
              errorMsg = result.error;
            } else if (result.error?.message) {
              errorMsg = result.error.message;
            } else if (result.error?.error) {
              errorMsg = result.error.error;
            } else {
              errorMsg = JSON.stringify(result.error) || "Authentication failed";
            }

            const lowerError = errorMsg.toLowerCase();
            if (
              lowerError.includes("suspend") ||
              lowerError.includes("pending") ||
              lowerError.includes("not active") ||
              lowerError.includes("deactiv") ||
              lowerError.includes("forbidden") ||
              lowerError.includes("unauthorized")
            ) {
              errorMsg =
                "Your account is currently suspended or pending. Please contact support for assistance.";
            }

            setErrorMessage(errorMsg);
            setStatus("error");
            setTimeout(() => router.replace("/login"), 4000);
          }
        } catch (error) {
          const msg = error?.response?.data
            ? [
                error.response.data.message,
                error.response.data.error,
                error.response.data.detail,
                error.message,
              ]
                .filter(Boolean)
                .join(". ")
            : error?.message || "Authentication failed";

          let finalMsg = msg;
          const lowerMsg = msg.toLowerCase();
          if (
            lowerMsg.includes("suspend") ||
            lowerMsg.includes("pending") ||
            lowerMsg.includes("not active") ||
            lowerMsg.includes("deactiv") ||
            lowerMsg.includes("forbidden") ||
            lowerMsg.includes("unauthorized")
          ) {
            finalMsg =
              "Your account is currently suspended or pending. Please contact support for assistance.";
          }

          setErrorMessage(finalMsg);
          setStatus("error");
          setTimeout(() => router.replace("/login"), 4000);
        }
      } else {
        setErrorMessage("Authentication token not found.");
        setStatus("error");
        setTimeout(() => router.replace("/login"), 3000);
      }
    };

    processAuth();
  }, [router, searchParams, handleSocialAuthCallback]);

  // Helper function to render content based on status
  const renderContent = () => {
    switch (status) {
      case "success":
        return (
          <>
            <div className="relative flex items-center justify-center mb-2">
              <Image
                src="/jacksonicon.jpg"
                alt="Jackson Rewards"
                width={90}
                height={90}
                className="rounded-2xl shadow-lg"
                priority
              />
            </div>
            <h1 className="text-2xl font-semibold text-white mt-4 [font-family:'Poppins',Helvetica]">
              You&apos;re in! 🎉
            </h1>
            <p className="text-neutral-400 mt-2 text-center text-sm [font-family:'Poppins',Helvetica]">
              Setting up your account, just a moment…
            </p>
          </>
        );
      case "error":
        return (
          <>
            <div className="relative flex items-center justify-center mb-2">
              <Image
                src="/jacksonicon.jpg"
                alt="Jackson Rewards"
                width={90}
                height={90}
                className="rounded-2xl shadow-lg opacity-60"
                priority
              />
            </div>
            <h1 className="text-xl font-semibold text-red-400 mt-4 [font-family:'Poppins',Helvetica]">
              Sign-in failed
            </h1>
            <p className="text-neutral-400 mt-2 text-center text-sm [font-family:'Poppins',Helvetica]">
              {errorMessage}
            </p>
            <p className="text-neutral-500 text-xs mt-3 [font-family:'Poppins',Helvetica]">
              Redirecting you back…
            </p>
          </>
        );
      case "processing":
      default:
        return (
          <>
            <div className="relative flex items-center justify-center mb-2">
              <div className="absolute w-[106px] h-[106px] rounded-[26px] border-4 border-t-[#af7de6] border-r-[#af7de6] border-b-transparent border-l-transparent animate-spin" />
              <Image
                src="/jacksonicon.jpg"
                alt="Jackson Rewards"
                width={90}
                height={90}
                className="rounded-2xl shadow-lg"
                priority
              />
            </div>
            <h1 className="text-2xl font-semibold text-white mt-6 [font-family:'Poppins',Helvetica]">
              Signing you in…
            </h1>
            <p className="text-neutral-400 mt-2 text-center text-sm [font-family:'Poppins',Helvetica]">
              Securely connecting your Google account
            </p>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#272052] overflow-x-hidden">
      <div className="relative w-full min-h-screen bg-[#272052] flex justify-center items-center">
        <div className="absolute w-[375px] h-[1061px] bg-[#272052] overflow-hidden">
          <div className="absolute w-[470px] h-[883px] -top-32 -left-3.5">
            <div className="absolute w-[358px] h-[358px] top-0 left-7 bg-[#af7de6] rounded-[179px] blur-[250px]" />
            <Image
              className="absolute w-[83px] h-[125px] top-[140px] left-3.5"
              alt="Front shapes"
              src="/assets/animaapp/bkGH9LUL/img/front-shapes-2x.png"
              width={83}
              height={125}
            />
            <Image
              className="absolute w-[18px] h-[275px] top-[160px] left-[371px]"
              alt="Saly"
              src="/assets/animaapp/bkGH9LUL/img/saly-16-2x.png"
              width={18}
              height={275}
            />
          </div>
        </div>

        {/* Centered Content Box */}
        <div className="relative z-10 w-[314px] flex flex-col items-center justify-center p-6 [font-family:'Poppins',Helvetica]">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-[#272052] flex flex-col justify-center items-center gap-4">
          <div className="relative flex items-center justify-center">
            <div className="absolute w-[106px] h-[106px] rounded-[26px] border-4 border-t-[#af7de6] border-r-[#af7de6] border-b-transparent border-l-transparent animate-spin" />
            <Image
              src="/jacksonicon.jpg"
              alt="Jackson Rewards"
              width={90}
              height={90}
              className="rounded-2xl shadow-lg"
              priority
            />
          </div>
          <p className="text-neutral-400 text-sm [font-family:'Poppins',Helvetica]">
            Signing you in…
          </p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
