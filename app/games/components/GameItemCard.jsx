import React from 'react'
import Image from 'next/image'


const GameItemCard = ({
    game,
    showBorder = true,
    className = "",
    onClick,
    isEmpty = false
}) => {
    const handleClick = (e) => {
        if (onClick) {
            onClick(game, e)
        }
    }

    // Empty state: show message immediately if there are no games
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

    // Defensively handle if game is missing (should not happen in normal usage, fallback UI just in case)
    if (!game) {
        return null;
    }

    // Clean game name - remove platform suffix after "-"
    const cleanGameName = (typeof game.name === 'string' ? game.name.split(' - ')[0].trim() : '');

    return (
        <div
            className={`flex items-center justify-between pt-0 pb-4 px-0 relative self-stretch w-full flex-[0_0_auto] ${showBorder ? "border-b [border-bottom-style:solid] border-[#4d4d4d]" : ""} ${className}`}
            onClick={handleClick}
        >
            <div className="inline-flex items-center gap-2 relative flex-[0_0_auto]">
                {game.image ? (
                    <div className="relative w-[55px] h-[55px] rounded-full overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                        <Image
                            className="w-full h-full object-cover"
                            alt={cleanGameName}
                            src={game.image}
                            width={55}
                            height={55}
                            loading="lazy"
                            decoding="async"
                        />
                    </div>
                ) : (
                    <div className="relative w-[55px] h-[55px] rounded-full bg-[linear-gradient(180deg,rgba(141,173,248,1)_0%,rgba(240,136,249,1)_100%)] flex items-center justify-center">
                        <span className="text-white text-xl font-bold">
                            {cleanGameName.charAt(0)}
                        </span>
                    </div>
                )}

                <div className="flex-col w-[139px] items-start flex relative">
                    <div className="relative self-stretch mb-1 [font-family:'Poppins',Helvetica] font-bold text-[#FFFFFF] text-base tracking-[0] leading-tight">
                        {cleanGameName}
                    </div>
                    <div className="relative self-stretch mb-1 [font-family:'Poppins',Helvetica] font-normal text-white text-xs tracking-[0] leading-tight">
                        ({game.genre})
                    </div>
                    <div className="relative self-stretch [font-family:'Poppins',Helvetica] font-normal text-[#bdbdbd] text-[13px] tracking-[0] leading-[normal]">
                        {game.subtitle}
                    </div>
                </div>
            </div>

            <div
                className={`relative ${game.scoreWidth || "w-[70px]"} h-[55px] rounded-[10px] overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,0.6)_0%,rgba(113,106,231,0.6)_100%)] flex flex-col items-center justify-center gap-1.5 px-2`}
            >
                {/* Coin value and icon - horizontally aligned */}
                <div className="flex items-center justify-center gap-1">
                    <span className="text-sm font-medium text-white [font-family:'Poppins',Helvetica] whitespace-nowrap">
                        {game.score}
                    </span>
                    <Image
                        className="w-[16px] h-[16px] flex-shrink-0"
                        alt="Coin"
                        src={game.coinIcon}
                        width={16}
                        height={16}
                        loading="eager"
                        decoding="async"
                        priority
                    />
                </div>

                {/* XP value and icon - horizontally aligned */}
                <div className="flex items-center justify-center ml-2 gap-1">
                    <span className="text-xs font-medium text-white [font-family:'Poppins',Helvetica] whitespace-nowrap">
                        {game.bonus}
                    </span>
                    <Image
                        className="w-[14px] h-[11px] flex-shrink-0"
                        alt="XP"
                        src={game.picIcon}
                        width={14}
                        height={11}
                        loading="eager"
                        decoding="async"
                        priority
                    />
                </div>
            </div>

            {/* If needed, you can add a status dot indicator here */}
            {/* {game.hasStatusDot && (
                <div className="absolute w-2 h-2 top-[26px] right-[8px] bg-[#4bba56] rounded-full animate-pulse" />
            )} */}
        </div>
    )
}

export default GameItemCard
