"use client";
import React, { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HomeIndicator } from "@/components/HomeIndicator";

function GameTipsDetailsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const gameTitle = searchParams.get('title') || "Game Tips";
    const gameImage = searchParams.get('image') || "image not loaded";
    const gameCategory = searchParams.get('category') || 'Casual';
    const gameDescription = searchParams.get('description') || '';

    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [bookmarkedTips, setBookmarkedTips] = useState([]);

    // Load bookmarked tips from localStorage on mount
    useEffect(() => {
        const savedBookmarks = localStorage.getItem(`gameTips_bookmarks_${gameTitle}`);
        if (savedBookmarks) {
            try {
                setBookmarkedTips(JSON.parse(savedBookmarks));
            } catch (e) {
                console.error('Failed to load bookmarks:', e);
            }
        }
    }, [gameTitle]);

    // Save bookmarks to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem(`gameTips_bookmarks_${gameTitle}`, JSON.stringify(bookmarkedTips));
    }, [bookmarkedTips, gameTitle]);

    const toggleBookmark = (tipId) => {
        setBookmarkedTips(prev => {
            if (prev.includes(tipId)) {
                return prev.filter(id => id !== tipId);
            } else {
                return [...prev, tipId];
            }
        });
    };

    const handleBack = () => {
        router.back();
    };

    // Game tips sections data - using dynamic game title with emojis
    const gameTips = [
        {
            id: 1,
            title: "Getting Started 🎮",
            content: `${gameTitle} is a fast-paced action game where survival and strategy matter. If you're new, begin by exploring the Creative Mode to get familiar with movement, weapons, and building mechanics.`
        },
        {
            id: 2,
            title: "Pro Strategy: Build Like a Champ ✨",
            content: "Master the art of building and strategy. Learn advanced techniques that will give you a competitive edge and help you climb the leaderboards faster. Practice building structures quickly in Creative Mode to improve your speed."
        },
        {
            id: 3,
            title: "XP & Leveling Tips 🕹️",
            content: "Complete daily challenges and missions to maximize your XP gains. Focus on completing quests that offer the highest XP rewards to level up faster."
        },
        {
            id: 4,
            title: "Smart Landing: Better Start 📌",
            content: "Choose your landing spot wisely at the beginning of each match. Avoid crowded areas if you're still learning, or land in popular spots if you want immediate action and faster skill development."
        },
        {
            id: 5,
            title: "Play Mindfully 📌",
            content: "Take breaks between matches to maintain focus and performance. Playing while tired can hurt your gameplay. Stay hydrated and stretch regularly during long gaming sessions."
        }
    ];

    return (
        <div className="flex flex-col overflow-x-hidden overflow-y-auto w-full min-h-screen items-center justify-start px-4 pb-[150px] pt-1 bg-black max-w-[390px] mx-auto">
            {/* App Version */}
            <div className="w-full max-w-[375px] px-3 ml-2 mb-3 pt-2">
                <div className="[font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3">
                    App Version: {process.env.NEXT_PUBLIC_APP_VERSION || "V0.1.0"}
                </div>
            </div>

            {/* Header - With Subtitle showing game name */}
            <div className="flex w-[375px] flex-col items-start px-2 py-4 relative">
                <div className="flex w-full items-center gap-6">
                    <button
                        onClick={handleBack}
                        className="flex justify-center items-center w-8 h-8 rounded-full transition-colors hover:bg-gray-800"
                        aria-label="Go back"
                    >
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <div className="flex items-center flex-1 min-w-0">
                        <h1 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[18px] tracking-[0] leading-[normal] line-clamp-2 break-words">
                            Game Tips & Tricks
                        </h1>
                    </div>

                    <div className="w-8 h-8" />
                </div>
                {/* Subtitle - Dynamic game name */}

            </div>

            {/* Game Banner Image - Same as Game Details page style */}
            <div className="flex w-[375px] items-center justify-center px-4 relative">
                {/* Image Skeleton - Show while loading */}
                {!isImageLoaded && !imageError && (
                    <div
                        className="w-full max-w-[335px] min-h-[200px] bg-gray-800 rounded-lg animate-pulse shadow-[100px] shadow-blue"
                        style={{
                            animation: 'pulse 1.5s ease-in-out infinite',
                            transform: 'translateZ(0)',
                            willChange: 'opacity'
                        }}
                    />
                )}

                {/* Actual Image - Show when loaded */}
                {!imageError && (
                    <img
                        className={`w-[335px] h-[200px] object-cover rounded-lg shadow-[0_14px_50px_-2px_rgba(113,106,231,0.5)] transition-opacity duration-300 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
                        alt={`${gameTitle} Tips Banner`}
                        src={gameImage}
                        loading="eager"
                        onLoad={() => setIsImageLoaded(true)}
                        onError={() => {
                            setImageError(true);
                            setIsImageLoaded(true);
                        }}
                    />
                )}

                {/* Error State - Show if image fails to load */}
                {imageError && (
                    <div className="w-[335px] h-[200px] bg-gray-800 rounded-lg flex items-center justify-center shadow-lg shadow-white/30">
                        <div className="text-center">
                            <svg className="w-8 h-8 text-gray-500 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <p className="text-gray-500 text-sm">Image unavailable</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Game Info - Title and Description - Same as Game Details page */}
            <div className="flex flex-col w-[375px] items-start justify-center mt-4 px-6 py-2 relative">
                <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[18px] leading-[1.3] line-clamp-2 break-words w-full">
                    {gameTitle}
                </h2>
                {gameDescription && (
                    <p className="[font-family:'Poppins',Helvetica] font-regular text-white/80 text-[14px] leading-6 w-full mt-2">
                        {gameDescription}
                    </p>
                )}
            </div>

            {/* Divider Line */}
            <div className="w-[335px] h-[1px] bg-white/10 mt-4 mb-2" />

            {/* Tips Cards - Individual cards with bookmark functionality */}
            <div className="flex flex-col w-[375px] items-start gap-4 mt-4 px-6">
                <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[16px] tracking-[0] leading-[normal] mb-2">
                    Tips & Tricks
                </h3>
                {gameTips.map((tip, index) => (
                    <article
                        key={tip.id}
                        className="relative w-full bg-[#1a1a1a] rounded-lg p-5 shadow-[0_0_10px_6px_rgba(255,255,255,0.15)]"
                    >
                        {/* Bookmark Icon - Top Right (Replacing pushpin) */}
                        <button
                            onClick={() => toggleBookmark(tip.id)}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center transition-transform hover:scale-110"
                            aria-label={bookmarkedTips.includes(tip.id) ? "Remove from Read Later" : "Save to Read Later"}
                        >
                            <svg
                                className={`w-6 h-6 transition-colors ${bookmarkedTips.includes(tip.id) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 fill-transparent'}`}
                                stroke="currentColor"
                                strokeWidth="2"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                        </button>

                        {/* Title */}
                        <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[16px] tracking-[0] leading-[normal] pr-12 mb-3">
                            {tip.title}
                        </h3>

                        {/* Description - Max 4 lines with line-clamp */}
                        <p className="[font-family:'Poppins',Helvetica] font-regular text-white/80 text-[14px] tracking-[0] leading-6 ">
                            {tip.content}
                        </p>
                    </article>
                ))}
            </div>

            {/* Footer Button - Navigate to Game Swipe Deck on Homepage */}
            <div className="flex w-full items-center justify-center mt-8 px-6">
                <button
                    onClick={() => router.push('/homepage')}
                    className="w-full h-[50px] bg-[linear-gradient(180deg,rgba(157,173,247,1)_0%,rgba(113,106,231,1)_100%)] rounded-lg [font-family:'Poppins',Helvetica] font-semibold text-white text-base tracking-[0] leading-[normal] hover:opacity-90 transition-opacity"
                >
                    Explore More Games
                </button>
            </div>

            <HomeIndicator activeTab="home" />
        </div>
    );
}

export default function GameTipsDetailsPage() {
    return (
        <Suspense fallback={null}>
            <GameTipsDetailsContent />
        </Suspense>
    );
}

