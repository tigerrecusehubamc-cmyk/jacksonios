import React from "react";
import Image from "next/image";

export const HighestTransctionCard = ({
    id,
    gameName,
    status,
    coins,
    xpBonus,
    xp,
    finalXp,
    gameLogoSrc,
    metadata,
    isAdjustment,
    adjustmentType,
}) => {
    let displayXp =
        xp !== null && xp !== undefined
            ? xp
            : finalXp !== null && finalXp !== undefined
                ? finalXp
                : xpBonus;

    const isSubtractAdjustment =
        isAdjustment && adjustmentType === "subtract";

    if (isSubtractAdjustment) {
        if (coins) coins = -Math.abs(coins);
        if (displayXp) displayXp = -Math.abs(displayXp);
    }

    return (
        <article
            className="relative w-[335px] h-[92px] bg-black rounded-[10px]
      shadow-[0_0_10px_6px_rgba(255,255,255,0.15)] overflow-hidden"
            role="button"
            tabIndex={0}
        >
            {/* Game Icon */}
            <div className="absolute w-14 h-14 top-3.5 left-4 rounded-full overflow-hidden">
                <Image
                    className="w-full h-full object-cover"
                    alt={gameLogoSrc ? `${gameName} game logo` : "Default game logo"}
                    src={gameLogoSrc || "/download.png"}
                    width={64}
                    height={64}
                    loading="lazy"
                    decoding="async"
                />
            </div>

            {/* Reward / Game Name (WRAPS, NO TRUNCATE) */}
            <header className="absolute top-[16px] left-[92px] right-[120px]">
                <h2
                    className="[font-family:'Poppins',Helvetica]
          font-bold text-[#d9d9d9] text-[15px]
          leading-[18px]
          break-words whitespace-normal
          line-clamp-2"
                >
                    {gameName}
                </h2>
            </header>

            {/* Status */}
            <p
                className="absolute top-[52px] left-[92px] right-[120px]
        [font-family:'Poppins',Helvetica]
        font-light text-[#d9d9d9] text-[13px]
        break-words whitespace-normal line-clamp-1"
            >
                {status}
            </p>

            {/* Coins (RIGHT SIDE SAFE FOR LARGE VALUES) */}
            <div
                className="absolute flex items-center justify-end
        top-[22px] right-4 gap-1 max-w-[105px]"
                aria-label={`${coins} coins`}
            >
                <span
                    className="[font-family:'Poppins',Helvetica]
          font-semibold text-[#FFFFFF] text-[20px]
          text-right tabular-nums break-all"
                >
                    {coins !== undefined && coins !== null && coins !== 0
                        ? isSubtractAdjustment
                            ? `-${Math.abs(coins)}`
                            : coins
                        : 0}
                </span>

                <Image
                    className="w-[20px] h-[21px] flex-shrink-0"
                    alt="Coin icon"
                    src="/dollor.png"
                    width={20}
                    height={21}
                    loading="lazy"
                    decoding="async"
                />
            </div>

            {/* XP (POSITION UNCHANGED – AS REQUESTED) */}
            <div
                className="absolute top-[70px] left-[123px]"
                aria-label={`XP ${displayXp}`}
            >
                <div className="relative flex items-center h-7 -top-0.5  -left-1.5">
                    <Image
                        className="w-[27px] h-7  -mr-[2.5px] flex-shrink-0"
                        alt="Left decoration"
                        src="/assets/animaapp/UNpBPFIY/img/vector-4235.svg"
                        width={27}
                        height={28}
                        loading="eager"
                        decoding="async"

                    />

                    <div
                        className="flex items-center gap-1 px-2 bg-[#201f59]
            rounded-[4px_4px_0px_0px]
            shadow-[0px_0px_4px_#fef47e33]
            max-w-[150px] break-all"
                    >
                        <span
                            className="[font-family:'Poppins',Helvetica]
              font-medium text-white text-[13px]
              tabular-nums"
                        >
                            {displayXp
                                ? isSubtractAdjustment
                                    ? `-${Math.abs(displayXp)}`
                                    : `+${displayXp}`
                                : "+0"}
                        </span>

                        <Image
                            className="w-4 h-[15px] flex-shrink-0"
                            alt="XP icon"
                            src="/xp.svg"
                            width={16}
                            height={15}
                            loading="lazy"
                            decoding="async"
                        />
                    </div>

                    <Image
                        className="w-[26px] h-[27px]  -ml-[3px] flex-shrink-0 relative"
                        style={{ top: "2px" }}
                        alt="Right decoration"
                        src="/assets/animaapp/UNpBPFIY/img/vector-4234.svg"
                        width={26}
                        height={27}
                        loading="lazy"
                        decoding="async"
                    />
                </div>
            </div>
        </article>
    );
};
