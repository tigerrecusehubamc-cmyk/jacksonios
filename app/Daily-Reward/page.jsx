"use client";

import React from "react";
import { NavigationGuard } from "./components/NavigationGuard";
import DailyReward from "./components/DailyReward";

export default function DailyRewardPage() {
    return (
        <NavigationGuard>
            <div className="flex justify-center w-full">
                <div className="relative w-full max-w-md min-h-screen bg-black mx-auto">
                    <DailyReward />
                </div>
            </div>
        </NavigationGuard>
    );
}