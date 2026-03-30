"use client";
import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";

const HeaderSection = () => {
    const router = useRouter();

    // OPTIMIZED: Memoize selectors to prevent unnecessary re-renders
    const profile = useSelector((state) => state.profile.details);
    const walletScreen = useSelector((state) => state.walletTransactions.walletScreen);

    // Coin balance from profile API (https://rewardsuatapi.hireagent.co/api/profile) -> wallet.balance, fallback to wallet screen
    const headerData = useMemo(() => {
        const firstName = profile?.firstName || "Player";
        const balance = profile?.wallet?.balance ?? profile?.data?.wallet?.balance ?? walletScreen?.wallet?.balance ?? 0;

        return {
            firstName,
            balance,
            avatar: profile?.profile?.avatar
        };
    }, [profile, walletScreen]);

    // OPTIMIZED: Memoize event handlers to prevent recreation
    const handleProfileClick = useCallback(() => {
        router.push("/myprofile");
    }, [router]);

    const handleWalletClick = useCallback(() => {
        router.push("/Wallet");
    }, [router]);

    // OPTIMIZED: Memoize avatar URL processing
    const avatarUrl = useMemo(() => {
        if (!headerData.avatar) return "/profile.png";

        let avatarUrl = headerData.avatar;
        // Remove any leading '=' characters
        avatarUrl = avatarUrl.replace(/^=+/, '');
        // Ensure proper protocol
        return avatarUrl.startsWith('http')
            ? avatarUrl
            : `https://rewardsuatapi.hireagent.co${avatarUrl}`;
    }, [headerData.avatar]);

    return (
        <header className="absolute top-[60px] left-0 w-full px-5 bg-transparent z-20">
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                    <button
                        className="relative w-12 h-12   z-50 rounded-full overflow-hidden flex-shrink-0"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleProfileClick();
                        }}
                        type="button"
                        aria-label="Go to My Profile"
                    >
                        <img
                            className="w-12 h-12 pointer-events-none rounded-full object-cover"
                            alt="Profile"
                            src={avatarUrl}
                            crossOrigin="anonymous"
                            onError={(e) => {
                                e.target.src = "/profile.png";
                            }}
                            loading="eager"
                            decoding="async"
                            width="48"
                            height="48"
                        />
                    </button>
                    <div className="flex flex-col items-start gap-1 flex-1 min-w-0">
                        <div className="[font-family:'Poppins',Helvetica] font-semibold text-white text-lg tracking-[-0.37px] leading-[22px] truncate w-full max-w-[160px]">
                            <div className="flex items-baseline ...">
                                <span className="flex-shrink-0">Hi!&nbsp;</span>
                                <span className="truncate">{headerData.firstName}</span>
                                <span className="flex-shrink-0">👋</span>
                            </div>
                        </div>
                        <div className="[font-family:'Poppins',Helvetica] font-light text-white text-sm tracking-[-0.17px] leading-[18px] opacity-60">
                            Welcome back
                        </div>
                    </div>
                </div>

                <div className="flex items-center">
                    <button
                        onClick={handleWalletClick}
                        className="min-w-[87px] h-9 gap-[2px] rounded-3xl bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex items-center justify-between px-2.5 hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                        type="button"
                        aria-label="Go to Wallet"
                    >
                        <div className="text-white text-lg [font-family:'Poppins',Helvetica] font-semibold leading-[normal]">
                            {headerData.balance || 0}
                        </div>
                        <img
                            className="w-[23px] h-6"
                            alt="Coin"
                            src="/dollor.png"
                            loading="eager"
                            decoding="async"
                            width="23"
                            height="24"
                        />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default HeaderSection;