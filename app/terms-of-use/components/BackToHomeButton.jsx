"use client";
import React from "react";
import { useRouter } from "next/navigation";

const BackToHomeButton = () => {
    const router = useRouter();

    const handleBackToHome = () => {
        router.push("/");
    };

    return (
        <div className="flex w-full max-w-[335px] mx-auto px-4 sm:px-5 pt-6 pb-6">
            <button
                type="button"
                aria-label="Back to Home"
                onClick={handleBackToHome}
                className="w-full h-[55px] rounded-xl bg-gradient-to-r from-[#9EADF7] to-[#716AE7] cursor-pointer transition-all duration-200 hover:opacity-90 active:opacity-80 flex items-center justify-center shadow-lg shadow-purple-500/20"
            >
                <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-base">
                    Back to Home
                </span>
            </button>
        </div>
    );
};

export default BackToHomeButton;