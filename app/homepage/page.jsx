"use client";
import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useHomepageData } from "@/hooks/useHomepageData";
import { useNotifications } from "@/hooks/useNotifications";
import { HomeIndicator } from "../../components/HomeIndicator";
import NotificationBanner from "@/components/NotificationBanner";
import HeaderSection from "./components/HeaderSection";
import RewardProgress from "./components/RewardProgress";
import XPTierTracker from "./components/XPTierTracker";
import MostPlayedGames from "./components/MostPlayedGames";
import WelcomeOfferSection from "./components/WelcomeOfferSection";
import GameCard from "./components/GameCard";
import VipBanner from "./components/VipBanner";
import RaceSection from "./components/RaceSection";
import StreakSection from "./components/StreakSection";
import SurveysSection from "./components/SurveysSection";
import NonGameOffersSection from "./components/NonGameOffersSection";
import FeaturesSection from "./components/FeaturesSection";
import { BannerSection } from "../AchieveGoals/components/BannerSection";
import { Daily } from "./components/Daily";
import WalkathonSection from "./components/WalkathonSection";
import { Frame as GameTips } from "./components/GameTips";

const Homepage = () => {
  const { token, user } = useAuth();

  const {
    stats,
    hasStats,
  } = useHomepageData(token, user);

  // Fetch and manage notifications
  const { currentNotification, dismiss, loading: notificationsLoading, error: notificationsError } = useNotifications(token);

  // Debug logging
  React.useEffect(() => {
    if (notificationsError) {
      console.error("🔔 [Homepage] Notification error:", notificationsError);
    }
    if (currentNotification) {
    }
  }, [currentNotification, notificationsError, notificationsLoading]);

  return (
    <div
      className="relative w-full min-h-screen bg-black pb-[110px] animate-fade-in"
    >
      {/* Notification Banner - appears at top when user has notifications enabled */}
      {currentNotification && (
        <NotificationBanner
          notification={currentNotification}
          onDismiss={dismiss}
        />
      )}

      <div className="absolute w-full h-[49px] z-10 px-8 top-0">
        <div className="absolute top-[10px] left-6 [font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
          App Version: V0.0.1
        </div>
      </div>
      <div className="flex flex-col w-full max-w-[375px] mx-auto items-center gap-6 pt-36 px-4">
        <HeaderSection />
        <RewardProgress stats={stats} />
        <XPTierTracker stats={stats} token={token} />
        <MostPlayedGames />
        <WelcomeOfferSection />
        <GameCard />
        {/* <div className="mt-14">
          <SurveysSection />
        </div> */}
        <NonGameOffersSection />
        <FeaturesSection />
        <GameTips />
        <VipBanner />
        <WalkathonSection />
        <RaceSection />
        <StreakSection />
        <Daily />
      </div>
      <HomeIndicator activeTab="home" />
    </div>
  );
};

export default Homepage;