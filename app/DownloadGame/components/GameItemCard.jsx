import React from 'react';
import { getTotalPromisedPoints } from "@/lib/gameDataNormalizer";

const GameItemCard = ({
    game,
    showBorder = true,
    className = "",
    onClick,
    isEmpty = false
}) => {
    // Get user ID from localStorage - with better fallback logic
    const getUserId = () => {
        try {
            const userData = localStorage.getItem('user');
            if (userData) {
                const user = JSON.parse(userData);
                const userId = user._id || user.id || user.userId;
                if (userId) {
                    return userId;
                }
            }
            // Fallback: try other localStorage keys
            const userId = localStorage.getItem('userId') ||
                localStorage.getItem('user_id') ||
                localStorage.getItem('id');
            if (userId) {
                return userId;
            }
        } catch (error) {
            console.error('❌ [GameItemCard] Error getting user ID:', error);
        }
        console.warn('⚠️ [GameItemCard] No user ID found in localStorage');
        return null;
    };

    // Helper function to add user ID to redirect URL
    const addUserIdToRedirectUrl = (url, userId) => {
        if (!url) {
            console.warn('⚠️ [GameItemCard] No URL provided');
            return url;
        }

        if (!userId) {
            console.warn('⚠️ [GameItemCard] No user ID provided, cannot add to URL');
            return url;
        }

        try {
            const urlObj = new URL(url);
            const existingParam = urlObj.searchParams.get('partner_user_id');

            // Check if partner_user_id exists and has a value
            if (existingParam && existingParam.trim() !== '') {
                return url; // Already has user ID with value
            }

            // If parameter exists but is empty, or doesn't exist, set it
            urlObj.searchParams.set("partner_user_id", userId);
            const finalUrl = urlObj.toString();
            return finalUrl;
        } catch (error) {
            console.error('❌ [GameItemCard] URL parsing failed, using fallback:', error);
            // If URL parsing fails, try to append/replace as query string
            // Remove existing empty partner_user_id if present
            let cleanUrl = url;
            if (url.includes('partner_user_id=')) {
                // Remove existing empty parameter
                cleanUrl = url.replace(/[?&]partner_user_id=[^&]*/g, '');
                // Clean up any double ? or & at the start
                cleanUrl = cleanUrl.replace(/^([^?]*)\?+/, '$1?').replace(/^([^?]*)\&+/, '$1&');
            }

            const separator = cleanUrl.includes("?") ? "&" : "?";
            const finalUrl = `${cleanUrl}${separator}partner_user_id=${userId}`;
            return finalUrl;
        }
    };

    const handleClick = (e) => {
        if (onClick) {
            onClick(game, e)
        }
    }
    // Empty state component
    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center w-full py-8 px-4">
                <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 text-center">
                    No Games Downloaded Yet
                </h3>
                <p className="text-gray-400 text-sm text-center mb-4 max-w-[280px]">
                    Start your gaming journey! Download games to earn rewards and climb the leaderboard.
                </p>
                <div className="flex items-center gap-2 text-purple-400 text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Earn coins and XP with every game!</span>
                </div>
            </div>
        )
    }

    // Clean game name - remove platform suffix after "-"
    // Clean game name: remove platform suffix after "-" or ":"
    const cleanGameName = game.name.split(/[-:]/)[0].trim();

    // Get genre from game object
    const genre = game.genre || game.category || "Game";

    // Format numbers with commas for better readability
    const formatNumber = (num) => {
        if (num === null || num === undefined) return "0";
        const numValue = typeof num === 'string' ? parseFloat(String(num).replace(/,/g, '')) : num;
        if (isNaN(numValue)) return "0";
        return numValue.toLocaleString();
    };

    // Coins: prefer API rewards (unchanged). XP: total from tasks (getTotalPromisedPoints)
    const rawCoins = game.rewards?.coins ?? game.rewards?.gold ?? game.amount ?? game.score ?? 0;
    const coinsNum = typeof rawCoins === 'number' ? rawCoins : (typeof rawCoins === 'string' ? parseFloat(String(rawCoins).replace(/[$,]/g, '')) || 0 : 0);
    const displayCoins = Number.isFinite(coinsNum) ? (coinsNum === Math.round(coinsNum) ? String(Math.round(coinsNum)) : (Math.round(coinsNum * 100) / 100).toString()) : "0";
    let displayXP = "0";
    try {
        const { totalXP } = getTotalPromisedPoints(game);
        displayXP = Number.isFinite(totalXP) ? String(Math.round(totalXP)) : "0";
    } catch (_) {
        const rawXP = game.rewards?.xp ?? game.xp ?? game.bonus ?? 0;
        const xpNum = typeof rawXP === 'number' ? rawXP : (typeof rawXP === 'string' ? parseFloat(String(rawXP).replace(/,/g, '')) || 0 : 0);
        displayXP = Number.isFinite(xpNum) ? String(Math.round(xpNum)) : "0";
    }

    const stats = [
        {
            value: formatNumber(displayCoins),
            icon: "/dollor.png",
            iconAlt: "Coin",
        },
        {
            value: formatNumber(displayXP),
            icon: "/assets/animaapp/3btkjiTJ/img/pic.svg",
            iconAlt: "XP",
        },
    ];

    return (
        <header
            className={`flex items-start sm:items-center justify-between py-4 px-0 border-b border-[#4d4d4d] cursor-pointer hover:opacity-90 transition-opacity ${className}`}
            data-model-id="2035:3315"
            onClick={handleClick}
        >
            {/* Left Section - Game Info */}
            <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0 pr-2">
                {/* Game Image */}
                <div className="w-[55px] h-[55px] rounded-full overflow-hidden flex-shrink-0">
                    <img
                        className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                        alt={`${cleanGameName} game icon`}
                        src={game.image || game.overlayImage || "/assets/animaapp/DfFsihWg/img/image-3930-2x.png"}
                        loading="eager"
                        decoding="async"
                        width="55"
                        height="55"
                        onError={(e) => {
                            if (e.target.src !== "/assets/animaapp/DfFsihWg/img/image-3930-2x.png") {
                                e.target.src = "/assets/animaapp/DfFsihWg/img/image-3930-2x.png";
                            }
                        }}
                        onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            if (onClick) {
                                onClick(game, e);
                            }
                        }}
                    />
                </div>

                {/* Game Details */}
                <div className="flex flex-col flex-1 min-w-0">
                    {/* Game Name */}
                    <h1 className="[font-family:'Poppins',Helvetica] font-bold text-white text-sm sm:text-base leading-tight break-words">
                        {cleanGameName}
                    </h1>
                    <h1 className="[font-family:'Poppins',Helvetica] mb-2 mt-[2px] font-light text-white text-[11px] sm:text-[12px] leading-tight break-words">
                        ({genre})
                    </h1>

                    {/* Stats */}
                    <div className="flex gap-2 flex-wrap" role="list" aria-label="Game statistics">
                        {stats.map((stat, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-center min-w-fit h-[29px] px-2 rounded-[10px] bg-[linear-gradient(180deg,rgba(158,173,247,0.6)_0%,rgba(113,106,231,0.6)_100%)] relative"
                                role="listitem"
                            >
                                <span className="[font-family:'Poppins',Helvetica] font-medium text-white text-xs sm:text-sm leading-5 whitespace-nowrap">
                                    {stat.value}
                                </span>
                                <img
                                    className="w-4 h-4 ml-1 flex-shrink-0"
                                    alt={stat.iconAlt}
                                    src={stat.icon}
                                    loading="eager"
                                    decoding="async"
                                    width="16"
                                    height="16"
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right Section - Download Button */}
            <div className="flex-shrink-0 ml-2 sm:ml-5 flex justify-end">
                <button
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-2 rounded-lg bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] cursor-pointer hover:opacity-90 transition-opacity min-w-fit sm:min-w-[100px] h-[36px]"
                    type="button"
                    aria-label={`Download ${cleanGameName} game`}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent card click
                        if (game.downloadUrl || game.redirectUrl) {
                            const url = game.downloadUrl || game.redirectUrl;
                            const userId = getUserId();

                            if (!userId) {
                                console.error('❌ [GameItemCard] Cannot open URL: No user ID found');
                                alert('Error: User ID not found. Please log in again.');
                                return;
                            }

                            // Add user ID to redirect URL (will replace empty value if exists)
                            const finalUrl = addUserIdToRedirectUrl(url, userId);

                            if (finalUrl === url && !url.includes(`partner_user_id=${userId}`)) {
                                console.error('❌ [GameItemCard] Failed to add user ID to URL');
                                alert('Error: Failed to add user ID to redirect URL.');
                                return;
                            }

                            window.open(finalUrl, '_blank');
                        } else if (onClick) {
                            onClick(game, e);
                        }
                    }}
                >
                    <img
                        className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] flex-shrink-0"
                        alt=""
                        src="/assets/animaapp/3btkjiTJ/img/download.svg"
                        aria-hidden="true"
                        loading="eager"
                        decoding="async"
                        width="15"
                        height="15"
                    />
                    <span className="[font-family:'Poppins',Helvetica] font-normal text-white text-xs sm:text-sm whitespace-nowrap">
                        Download
                    </span>
                </button>
            </div>
        </header>
    )
}

export default GameItemCard
