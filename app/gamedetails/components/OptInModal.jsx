import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";


export const OptInModal = ({
    isVisible = false,
    onClose,
    sessionData = { sessionCoins: 0, sessionXP: 0 },
    game = null,
    isClaimed = false
}) => {
    // Calculate progress percentages
    const maxCoins = Number(game?.rewards?.coins ?? game?.rewards?.gold ?? game?.amount ?? 0) || 0;
    const coinProgressPercentage = maxCoins > 0 ? (sessionData.sessionCoins / maxCoins) * 100 : 0;
    const maxXP = maxCoins > 0 ? Math.floor(maxCoins * 0.1) : 0;

    // Handle modal close - simple close without animation
    const handleModalClose = () => {
        onClose();
    };

    // Prevent body scroll when modal is open and lock background screen
    useEffect(() => {
        if (isVisible) {
            // Save current scroll position
            const scrollY = window.scrollY;
            // Prevent scrolling on body
            document.body.style.overflow = 'hidden';
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = `-${scrollY}px`;
            // Store scroll position for restoration
            document.body.setAttribute('data-scroll-y', scrollY.toString());
        } else {
            // Restore scrolling on body
            const scrollY = document.body.getAttribute('data-scroll-y');
            document.body.style.overflow = 'unset';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY, 10));
            }
            document.body.removeAttribute('data-scroll-y');
        }
        return () => {
            document.body.style.overflow = 'unset';
            document.body.style.position = '';
            document.body.style.width = '';
            document.body.style.top = '';
            const scrollY = document.body.getAttribute('data-scroll-y');
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY, 10));
            }
            document.body.removeAttribute('data-scroll-y');
        };
    }, [isVisible]);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isVisible) {
                handleModalClose();
            }
        };
        if (isVisible) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isVisible, handleModalClose]);

    // Early return after all hooks
    if (!isVisible) {
        return null;
    }

    // Use portal to render modal at document body level
    const modalContent = (
<div
            className="fixed inset-0 z-[999999] flex items-center justify-center p-2 animate-fade-in"
            onClick={handleModalClose}
        >
            {/* Backdrop - Separate layer */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                style={{ pointerEvents: 'auto' }}
            />

            {/* Modal Container - Centered like 30-day streak modal */}
            <div
                className="relative w-full max-w-[95vw] bg-black rounded-[20px] border border-solid border-[#4A4A4A] overflow-hidden shadow-2xl max-h-[95vh] overflow-y-auto scrollbar-hide absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                onClick={(e) => e.stopPropagation()}
                style={{
                    isolation: 'isolate',
                    transform: 'translateZ(0)',
                    willChange: 'transform',
                    backdropFilter: 'none',
                    WebkitBackdropFilter: 'none',
                    backgroundColor: '#000000',
                    opacity: 1,
                    mixBlendMode: 'normal'
                }}
            >
                {/* Header - Sticky like 30-day streak modal */}
                <div
                    className="sticky top-0 bg-[linear-gradient(180deg,rgba(51,0,72,1)_0%,rgba(144,74,188,1)_100%)] px-6 py-4 flex items-center justify-between z-10 shadow-[0px_4px_4px_#00000040]"
                    style={{
                        isolation: 'isolate',
                        mixBlendMode: 'normal',
                        backdropFilter: 'none',
                        WebkitBackdropFilter: 'none'
                    }}
                >
                    <h1 className="[text-shadow:0px_4px_4px_#00000040] [font-family:'Poppins',Helvetica] font-bold text-white text-lg text-start tracking-[0] leading-tight">
                        What is Opt-In/Opt-Out?
                        <br />
                        And how to claim my 🎁?
                    </h1>
                    <button
                        onClick={handleModalClose}
                        className="w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-all duration-200 flex-shrink-0 ml-4"
                        aria-label="Close"
                        type="button"
                    >
                        <span className="text-white text-center mb-1 text-xl">×</span>
                    </button>
                </div>

                {/* Content - Scrollable with proper padding */}
                <div
                    className="p-6 pb-20"
                    style={{
                        backgroundColor: '#000000',
                        isolation: 'isolate',
                        mixBlendMode: 'normal'
                    }}
                >
                    {/* Introduction Content */}
                    <section className="w-full mb-6">
                        <p className="w-full mb-3 [font-family:'Poppins',Helvetica] font-normal text-white text-sm tracking-[0] leading-[normal]">
                            We've introduced a new rewards system where users can earn extra
                            loyalty points by choosing opt-in to long-term campaigns.
                        </p>
                        <div className="flex items-start gap-3">
                            {/* <img
                                className="w-11 h-11 aspect-[1] object-cover"
                                alt="Game controller icon"
                                src="/assets/animaapp/hVj7UvM7/img/image-4075-2x.png"
                            /> */}
                            <div className="flex-1">
                                <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-base tracking-[0] leading-[normal]">
                                    Choose a Game & Opt-In to Earn More
                                </h2>
                                <ul className="mt-2 [font-family:'Poppins',Helvetica] font-normal text-white text-sm tracking-[0] leading-[normal] list-none">
                                    <li> Select a game you enjoy and want to play consistently.</li>
                                    <li>
                                        Opt-in campaigns offer boosted rewards compared to standard
                                        ones.
                                    </li>
                                    <li>
                                        Simply check the box and tap "Opt-In" to join the
                                        campaign.
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </section>

                    {/* Campaign Steps - Using LevelsSection Card Style */}
                    <section className="w-full mt-8">
                        <div className="relative flex flex-col gap-4">
                            {/* Step 5: Complete Level 75 */}
                            <div className="flex items-center gap-3 w-full relative z-10">
                                {/* Level Number Circle */}
                                <div className="flex w-[43px] h-[43px] items-center justify-center rounded-full flex-shrink-0 relative bg-[#2f344a]">
                                    <div className="font-semibold text-[#f4f3fc] text-[14.7px]">
                                        5
                                    </div>
                                </div>

                                {/* Level Card */}
                                <div className="w-[256px] min-h-[75px] relative rounded-[10px] bg-[linear-gradient(180deg,rgba(255,0,238,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex flex-col justify-between p-2 pb-2">
                                    {/* Top Row: Title and Reward */}
                                    <div className="flex justify-between items-start gap-2 mb-1.5">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-normal text-[#f4f3fc] text-[13px] leading-tight line-clamp-2 pr-1">
                                                Complete Level 75
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <div className="font-semibold text-[15px] text-white">
                                                282
                                            </div>
                                            <img
                                                className="w-[19px] h-[20px]"
                                                alt="Reward Icon"
                                                src="/dollor.png"
                                            />
                                        </div>
                                    </div>

                                    {/* Time Limit Row */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <img
                                                className="w-[14px] h-[14px] flex-shrink-0"
                                                alt="Clock"
                                                src="/assets/animaapp/hVj7UvM7/img/clock.svg"
                                            />
                                            <span className="font-normal text-[11px] text-[#f4f3fc]">
                                                72 hrs
                                            </span>
                                        </div>

                                        {/* XP Bonus */}
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-gray-400">XP:</span>
                                            <div className=" text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                +50
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 6: Purchase 3 items in game */}
                            <div className="flex items-center gap-3 w-full relative z-10">
                                {/* Level Number Circle */}
                                <div className="flex w-[43px] h-[43px] items-center justify-center rounded-full flex-shrink-0 relative bg-[#2f344a]">
                                    <div className="font-semibold text-[#f4f3fc] text-[14.7px]">
                                        6
                                    </div>
                                </div>

                                {/* Level Card */}
                                <div className="w-[256px] min-h-[75px] relative rounded-[10px] bg-[linear-gradient(180deg,rgba(19,200,116,1)_0%,rgba(87,34,150,1)_100%)] flex flex-col justify-between p-2 pb-2">
                                    {/* Top Row: Title and Reward */}
                                    <div className="flex justify-between items-start gap-2 mb-1.5">
                                        <div className="flex-1 min-w-0">
                                            <div className="font-normal text-[#f4f3fc] text-[13px] leading-tight line-clamp-2 pr-1">
                                                Purchase 3 items in game
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <div className="font-semibold text-[15px] text-white">
                                                410
                                            </div>
                                            <img
                                                className="w-[19px] h-[20px]"
                                                alt="Reward Icon"
                                                src="/dollor.png"
                                            />
                                        </div>
                                    </div>

                                    {/* Time Limit Row */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-1.5">
                                            <img
                                                className="w-[14px] h-[14px] flex-shrink-0"
                                                alt="Clock"
                                                src="/assets/animaapp/hVj7UvM7/img/clock.svg"
                                            />
                                            <span className="font-normal text-[11px] text-[#f4f3fc]">
                                                No limit
                                            </span>
                                        </div>

                                        {/* XP Bonus */}
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-gray-400">XP:</span>
                                            <div className=" text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                                                +100
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 w-full relative">
                            {/* Spacer to match the circle width (43px) + gap (12px) = 55px */}
                            <div className="w-[43px] flex-shrink-0"></div>

                            {/* Button aligned with task cards */}
                            <div className={`w-[256px] h-[30px] flex gap-[2px] rounded-[0px_0px_10px_10px] overflow-hidden shadow-[0px_4px_4px_#00000040] bg-[linear-gradient(141deg,rgba(244,187,64,1)_0%,rgba(247,206,70,1)_64%,rgba(251,234,141,1)_80%,rgba(247,206,70,1)_98%)] ${isClaimed ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
                                <p className="mt-1.5 flex-1 h-[18px] px-2 [text-shadow:0px_4px_4px_#00000040] [font-family:'Poppins',Helvetica] font-semibold text-black text-xs text-center tracking-[0] leading-[normal]">
                                    Reach Here To Claim Your Rewards
                                </p>
                                <button
                                    className={`mt-[5px] w-[24px] mr-2 h-[19px] flex items-center justify-center bg-[#716ae7] rounded-[100px] overflow-hidden hover:bg-[#5a52d4] transition-colors cursor-pointer flex-shrink-0 ${isClaimed ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                                    aria-label="Information about claiming rewards"
                                >
                                    <div className="flex items-center justify-center w-full h-full [text-shadow:0px_4px_4px_#00000040] [font-family:'Poppins',Helvetica] font-bold text-white text-base text-center tracking-[0] leading-4 whitespace-nowrap">
                                        ﹖
                                    </div>
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* Important Notes */}
                    <section className="flex flex-col w-full items-center gap-2.5 mt-8">
                        <h2 className="relative self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-white text-base tracking-[0] leading-[normal]">
                            Important Notes
                        </h2>
                        <div className="relative w-[305px] h-[141px] ">
                            <img
                                className="absolute top- w-[303px] h-[141px]"
                                alt="Card background"
                                src="/assets/animaapp/hVj7UvM7/img/card-2x.png"
                            />
                            <ul className="absolute top-[18px] left-[15px] w-[273px] [font-family:'Poppins',Helvetica] font-normal text-neutral-400 text-sm tracking-[0] leading-[normal] list-none">
                                <li>
                                    Coins remain in the campaign until you end your game play
                                    <br />
                                    You should finish paying the game  opting out, to get your full rewards.
                                </li>
                            </ul>
                        </div>
                    </section>

                    {/* Final CTA Button */}
                    <button
                        onClick={handleModalClose}
                        className="w-full max-w-[303px] ml6 h-10 flex rounded-lg overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] mx-auto mt-6"
                        type="button"
                    >
                        <span className="mt-[8.0px] w-[261px] h-6 ml-[17.0px] [font-family:'Poppins',Helvetica] font-semibold text-white text-base text-center tracking-[0] leading-[normal]">
                            Tap Here to Claim Your Rewards
                        </span>
                    </button>
                </div>
            </div>

            <style jsx>{`
                @keyframes fade-in {
                    0% {
                        opacity: 0;
                    }
                    100% {
                        opacity: 1;
                    }
                }
                .animate-fade-in {
                    animation: fade-in 0.2s ease-out;
                }
                .scrollbar-hide {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                .scrollbar-hide::-webkit-scrollbar {
                    display: none;
                }
                /* Prevent color mixing during scroll */
                div[style*="isolation"] {
                    will-change: transform;
                    transform: translateZ(0);
                    -webkit-transform: translateZ(0);
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }
            `}</style>
        </div>
    );

    // Render modal using portal to document body
    if (typeof window !== 'undefined') {
        return createPortal(modalContent, document.body);
    }

    return null;
};