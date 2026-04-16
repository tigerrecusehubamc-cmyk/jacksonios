"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import useOnboardingStore from "@/stores/useOnboardingStore";
import { acceptDisclosure, submitOnboarding, updateProfile } from "@/lib/api";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { useSplash } from "@/components/SplashScreen";

export default function PermissionsPage() {
  const { hideSplash } = useSplash();
  const router = useRouter();
  const { token, user, isLoading, updateUserInContext } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { hideSplash(); }, [hideSplash]);

  // Block Android hardware back button — user must tap Agree to proceed
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    let listenerHandle;
    App.addListener("backButton", () => {
      // Do nothing — back is blocked on Prominent Disclosure
    }).then((handle) => {
      listenerHandle = handle;
    });
    return () => { listenerHandle?.remove(); };
  }, []);

  // Check for token in localStorage and redirect if missing
  useEffect(() => {
    // Wait for AuthContext to finish loading
    if (isLoading) return;

    // Check both AuthContext state and localStorage as fallback
    const storedToken = localStorage.getItem("authToken");
    const hasToken = token || storedToken;

    if (!hasToken) {
      console.error("No auth token found. Redirecting to login.");
      router.replace("/login");
      return;
    }
  }, [token, isLoading, router]);

  const permissionItems = [
    {
      title: "Access to Installed Apps",
      description:
        "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
      title: "Approximate Geolocation Data (Non-Continuous)",
      description:
        "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
      title: "Display Over Other Apps Permission",
      description:
        "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
      title: "Notifications",
      description:
        "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
  ];

  const handleAgree = async () => {
    if (isSubmitting) return;

    const storedToken = localStorage.getItem("authToken");
    const authToken = token || storedToken;

    if (!authToken) {
      setError("Authentication error. Please log in again.");
      router.replace("/login");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Submit all onboarding answers in one call (POST /api/onboarding/submit)
      // User identified by auth token only; no mobile in body.
      const onboardingState = useOnboardingStore.getState();
      const payload = {
        ...(onboardingState.primaryGoal != null && { primaryGoal: onboardingState.primaryGoal }),
        ...(onboardingState.gender != null && { gender: onboardingState.gender }),
        ...(onboardingState.ageRange != null && { ageRange: onboardingState.ageRange }),
        ...(Array.isArray(onboardingState.gamePreferences) && onboardingState.gamePreferences.length > 0 && { gamePreferences: onboardingState.gamePreferences }),
        ...(onboardingState.gameStyle != null && { gameStyle: onboardingState.gameStyle }),
        ...(onboardingState.improvementArea != null && { improvementArea: onboardingState.improvementArea }),
        ...(onboardingState.dailyEarningGoal != null && { dailyEarningGoal: Number(onboardingState.dailyEarningGoal) }),
      };

      await submitOnboarding(payload, authToken);

      // 2. Mark onboarding complete and clear local onboarding data
      localStorage.setItem("onboardingComplete", "true");
      useOnboardingStore.getState().resetOnboarding();

      // 3. Accept disclosure
      await acceptDisclosure(authToken);

      localStorage.setItem("permissionsAccepted", "true");

      // 4. Update permissionStatus + age + gender on the profile
      // /api/disclosure/accept does NOT update permissionStatus, so we do it explicitly
      // NOTE: use onboardingState captured above — store was already reset at line 100
      const profileUpdate = {
        permissionStatus: true,
        ...(onboardingState.ageRange != null && { age: onboardingState.ageRange }),
        ...(onboardingState.gender != null && { gender: onboardingState.gender }),
      };
      updateProfile(profileUpdate, authToken).catch(() => { });

      // Update user in context immediately so app reflects latest state
      if (user) {
        const updatedUser = { ...user, ...profileUpdate };
        updateUserInContext(updatedUser);
      }

      router.push("/location");
    } catch (err) {
      console.error("Onboarding submit or disclosure error:", err);
      const message = err?.body?.message ?? err?.body?.error ?? err?.message ?? "Something went wrong. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="w-full min-h-screen bg-[#272052] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  // Don't render if no token (will redirect in useEffect)
  const storedToken = localStorage.getItem("authToken");
  if (!token && !storedToken) {
    return null;
  }

  return (
    <div className="w-full min-h-screen bg-[#272052] flex items-center justify-center ">
      <div
        className="w-[315px] h-[720px] max-h-full bg-[radial-gradient(ellipse_at_center,_#862F94_0%,_#06094E_100%)] rounded-[15px] flex flex-col relative overflow-hidden"
        aria-labelledby="permissions-heading"
      >
        <header className="p-6 pb-4">
          <h1
            id="permissions-heading"
            className="[font-family:'Poppins',Helvetica] font-semibold text-[#EFEFEF] text-[18px] tracking-[0] leading-[normal]"
          >
            Prominent Disclosure
          </h1>
        </header>

        <div className="flex-1 px-6 pb-20 overflow-y-auto">
          <div className="relative">
            {/* Dotted Line from Figma Design */}
            <div className="space-y-6">
              {permissionItems.map((item, index) => (
                <article key={index} className="pl-3">
                  <h2 className="[font-family:'Poppins',Helvetica] font-normal text-[#FEFEFE] text-[14px] tracking-[0] leading-5 text-left">
                    {`${index + 1}. ${item.title}`}
                  </h2>
                  <p className="mt-2 [font-family:'Poppins',Helvetica] font-light text-[#FEFEFE] text-[12px] tracking-[0] leading-5 text-left">
                    {item.description}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-6 right-6 z-10">
          {error && <p className="text-red-400 text-center text-sm mb-2">{error}</p>}
          <button
            onClick={handleAgree}
            disabled={isSubmitting}
            className="w-full h-12 rounded-xl bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Agree to permissions"
          >
            <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-base tracking-[0] leading-[normal]">
              {isSubmitting ? 'Agreeing...' : 'Agree'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}