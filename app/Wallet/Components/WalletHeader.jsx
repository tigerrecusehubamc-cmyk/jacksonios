"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useWalletUpdates } from "@/hooks/useWalletUpdates";

export default function WalletHeader({ balance = 0, appVersion = "V0.1.1", token }) {
    const router = useRouter();

    // Use custom hook for real-time wallet updates
    const { realTimeBalance } = useWalletUpdates(token);
    const displayBalance = realTimeBalance || balance;

    const handleWalletClick = () => {
        router.push("/Wallet");
    };

    return (
        <>
            {/* Move App Version left-aligned, same as "Wallet" heading, top edge spacing */}
            <div className="w-full max-w-[335px] mx-auto px-4 mt-2 mb-2 flex flex-col">
                <span className="[font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
                    App Version: {appVersion}
                </span>
            </div>
            <div className="flex items-center justify-between w-full max-w-[335px]  mt-[10px] mx-auto px-4 mb-4">
                <div className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[20px] tracking-[-0.37px] leading-[22px]">
                    Wallet
                </div>
                <button
                    onClick={handleWalletClick}
                    className="min-w-[87px] max-w-[140px] h-9 rounded-3xl bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex items-center gap-2 px-3 hover:opacity-80 transition-opacity duration-200 cursor-pointer flex-shrink-0"
                    type="button"
                    aria-label="Go to Wallet"
                    suppressHydrationWarning
                >
                    <span suppressHydrationWarning className="text-white text-base [font-family:'Poppins',Helvetica] font-semibold leading-normal truncate">
                        {displayBalance}
                    </span>
                    <img
                        className="w-[23px] h-6 flex-shrink-0"
                        alt="Coin"
                        src="/dollor.png"
                        loading="eager"
                        decoding="async"
                        width={23}
                        height={24}
                    />
                </button>
            </div>
        </>
    );
}
