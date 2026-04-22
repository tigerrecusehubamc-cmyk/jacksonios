"use client";
import React, { useEffect } from "react";
import { GoalProgressSection } from "./components/GoalProgressSection";
import { TaskListSection } from "./components/TaskListSection";
import { BannerSection } from "./components/BannerSection";
import { HomeIndicator } from "@/components/HomeIndicator";
import { Header } from "./components/Header";
import { SurveyListSection } from "../surveys/components/SurveyListSection";

export default function AchieveGoalsPage() {
    useEffect(() => {
        const criticalImages = [
            '/dollor.png',
            '/xp.svg',
            '/goalstep1.svg',
            '/goalstep2.svg',
            '/goalstep3.svg',
            '/goalstep4.svg',
            '/goalstep5.svg',
            '/trophy@2x.png',
            '/arhievegolasbanner.png',
            '/tesurebox.png',
            '/dot1.svg',
            '/dot2.svg',
            '/dot3.svg',
            '/dot4.svg',
            '/dot5.svg'
        ];

        criticalImages.forEach(src => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = src.endsWith('.svg') ? 'image/svg+xml' : 'image';
            link.href = src;
            document.head.appendChild(link);
        });

        return () => {
            criticalImages.forEach(src => {
                const links = document.head.querySelectorAll(`link[href="${src}"]`);
                links.forEach(link => link.remove());
            });
        };
    }, []);

    return (
        <div className="flex flex-col overflow-x-hidden overflow-y-auto w-full min-h-screen items-center justify-start gap-4 px-4 pb-2 pt-1 bg-black max-w-[390px] mx-auto relative">
            <Header />
            <GoalProgressSection />
            <TaskListSection />
            <BannerSection />
            <div className="w-full max-w-[335px] mb-24 mx-auto -mt-32">
                <SurveyListSection onSurveyClick={(survey) => {
                    if (survey.clickUrl) {
                        window.open(survey.clickUrl, '_blank', 'noopener,noreferrer');
                    }
                }} />
            </div>
            <section className="mb-20">
                <div className="w-full max-w-[335px] sm:max-w-[375px] mx-auto">
                    <div className="w-full p-4 sm:p-6 rounded-lg bg-[linear-gradient(to_right,rgba(255,255,255,0.25)_0%,rgba(255,255,255,0.1)_50%,rgba(0,0,0,0.9)_100%)] shadow-lg border border-white/20">
                        <div className="flex flex-col justify-start gap-2">
                            <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-[#f4f3fc] text-[14px] sm:text-[14px]">
                                Disclaimer
                            </h2>
                            <p className="[font-family:'Poppins',Helvetica] font-light text-[#FFFFFF] text-[13px] sm:text-base text-start leading-5 sm:leading-6">
                                Jackson Coins and XP Points are loyalty rewards for in-app activity.These do not represent real currency or offer cash value.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
            <HomeIndicator />
        </div>
    );
}