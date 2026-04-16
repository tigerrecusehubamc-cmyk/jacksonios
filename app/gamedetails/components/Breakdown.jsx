import React from "react";
import { normalizeGameGoals } from "@/lib/gameDataNormalizer";

// Format coins to 2 decimals; format XP so it adapts to any value (integer or decimal)
const formatTwoDecimals = (n) => Number(n).toFixed(2);
const formatXP = (n) => {
    const num = Number(n);
    if (Number.isNaN(num)) return "0";
    return Number.isInteger(num) ? String(num) : num.toFixed(2);
};

export const Breakdown = ({ game, sessionCoins = 0, sessionXP = 0 }) => {
    // Goals for this game – same source as LevelsSection (normalizer then fallbacks)
    const goals = React.useMemo(() => {
        if (!game) return [];
        try {
            const normalized = normalizeGameGoals(game);
            if (Array.isArray(normalized) && normalized.length > 0) return normalized;
        } catch (_) { }
        const fromRoot = Array.isArray(game.goals) ? game.goals : [];
        const fromRaw = Array.isArray(game.besitosRawData?.goals) ? game.besitosRawData.goals : [];
        const fromDetails = Array.isArray(game.gameDetails?.goals) ? game.gameDetails.goals : [];
        const fromData = Array.isArray(game.data?.goals) ? game.data.goals : [];
        return fromRoot.length > 0 ? fromRoot : fromRaw.length > 0 ? fromRaw : fromDetails.length > 0 ? fromDetails : fromData;
    }, [game]);
    const firstGoal = goals[0];

    // Same XP config as LevelsSection (bitlab + besitos)
    const xpConfig = game?.xpRewardConfig || game?.bitlabsRawData?.xpRewardConfig || game?.besitosRawData?.xpRewardConfig || { baseXP: 1, multiplier: 1 };
    const baseXP = Math.max(1, Number(xpConfig.baseXP) || 1);
    const multiplier = Number(xpConfig.multiplier) || 1;

    // First row: coin and XP of the first task (Game Install) – same formula as LevelsSection
    const firstTaskCoins = firstGoal
        ? (parseFloat(firstGoal.amount || firstGoal.points || 0) || 0)
        : 0;
    const firstTaskXP = firstGoal
        ? (firstGoal.xp != null && firstGoal.xp !== "")
            ? (parseFloat(firstGoal.xp) || 0)
            : Math.round((baseXP * Math.pow(multiplier, 0)) * 100) / 100
        : 0;

    // Same completion check as LevelsSection (so totals match level list)
    const isGoalCompleted = (g) =>
        g.completed === true || g.completed === "true" || g.status === "completed" || g.status === "success" || g.isCompleted === true;

    // Total coins earned from this game = sum over completed tasks only (same as LevelsSection: goal.amount || goal.points per task)
    const totalCoinsFromCompleted = goals
        .filter(isGoalCompleted)
        .reduce((sum, g) => sum + (parseFloat(g.amount || g.points || 0) || 0), 0);
    const totalCoins = sessionCoins > 0 ? sessionCoins : totalCoinsFromCompleted;

    // Total XP earned from this game = sum over completed tasks only (same as LevelsSection: baseXP * multiplier^index per task)
    const totalXPFromCompleted = goals.reduce((sum, g, index) => {
        if (!isGoalCompleted(g)) return sum;
        const xp = (g.xp != null && g.xp !== "")
            ? (parseFloat(g.xp) || 0)
            : Math.round((baseXP * Math.pow(multiplier, index)) * 100) / 100;
        return sum + xp;
    }, 0);
    const totalXPDisplay = formatXP(sessionXP > 0 ? sessionXP : totalXPFromCompleted);

    // Build rows: points = coins only, bonus = XP only (never the same source so they never display the same value)
    const breakdownItems = [
        {
            id: 1,
            label: "Game Install",
            points: formatTwoDecimals(firstTaskCoins),
            bonus: `+${formatXP(firstTaskXP)}`,
            bgColor: "bg-[linear-gradient(180deg,rgba(220,195,34,1)_0%,rgba(80,50,146,0.7)_100%)] ",
            textColor: "text-white",
            vectorLeft: "/assets/animaapp/OGuKwK7i/img/vector-4235-2.svg",
            vectorRight: "/assets/animaapp/OGuKwK7i/img/vector-4234-2.svg",
            pic: "/assets/animaapp/OGuKwK7i/img/pic-2.svg",
        },
        {
            id: 2,
            label: "My Earnings",
            points: formatTwoDecimals(totalCoins),
            bonus: `+${totalXPDisplay}`,
            bgColor: "bg-[linear-gradient(180deg,rgba(255,0,238,0.4)_0%,rgba(113,106,231,0.4)_100%)] ",
            textColor: "text-white",
            vectorLeft: "/assets/animaapp/OGuKwK7i/img/vector-4235-3.svg",
            vectorRight: "/assets/animaapp/OGuKwK7i/img/vector-4234-3.svg",
            pic: "/assets/animaapp/OGuKwK7i/img/pic-3.svg",
        }
    ];

    return (
        <div
            className="relative w-[342px] h-[220px] mt-6 bg-black rounded-2xl overflow-hidden border border-solid border-[#80e76a]"
            data-model-id="3212:8288"
        >
            <h1 className="absolute top-5 left-[17px] [font-family:'Poppins',Helvetica] font-bold text-white text-xl tracking-[0] leading-[normal]">
                Point Breakdown
            </h1>

            <div className="inline-flex items-center absolute top-12 left-[17px]">
                <p className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-light text-white text-xs tracking-[0] leading-[normal]">
                    Total earnings from completed tasks
                </p>
            </div>

            <div className="flex flex-col w-[302px] items-start gap-4 absolute top-[82px] left-4">
                {breakdownItems.map((item) => (
                    <div
                        key={item.id}
                        className={`${item.bgColor} relative self-stretch w-full min-h-[40px] rounded-[10px] flex items-center justify-between gap-3 px-3 pb-6`}
                    >
                        {/* Left side - Label (stays left, leaves center for XP) */}
                        <div className="[font-family:'Poppins',Helvetica] font-bold text-white text-sm tracking-[0] leading-[normal] flex-shrink-0 min-w-0">
                            {item.label}
                        </div>

                        {/* Right side - Points and Coin (stays right, leaves center for XP) */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <div className={`${item.textColor} [font-family:'Poppins',Helvetica] font-semibold text-sm tracking-[0] leading-[normal]`}>
                                {item.points}
                            </div>
                            <img
                                className="w-[23px] h-6 aspect-[0.97]"
                                alt="Coin icon"
                                src="/dollor.png" />
                        </div>

                        {/* Bottom: XP badge centered, tight spacing */}
                        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-0 h-[22px] min-w-[89px] w-max max-w-full">
                            <div className="relative h-full flex items-center justify-center gap-0 px-0">
                                <img
                                    className="w-[19px] h-5 flex-shrink-0 translate-y-0.5"
                                    alt=""
                                    src={item.vectorLeft}
                                />
                                <div className="h-[22px] px-0.5 flex items-center justify-center gap-1 bg-[#201f59] rounded-[4px_4px_0px_0px] shadow-[0px_0px_4px_#fef47e33] min-w-0">
                                    <span className="font-medium text-[13px] [font-family:'Poppins',Helvetica] text-white tracking-[0] leading-[normal] whitespace-nowrap">
                                        {item.bonus}
                                    </span>
                                    <img
                                        className="w-4 h-[13px] flex-shrink-0"
                                        alt="XP"
                                        src={item.pic}
                                    />
                                </div>
                                <img
                                    className="w-[18px] h-[19px] flex-shrink-0 translate-y-0.5"
                                    alt=""
                                    src={item.vectorRight}
                                />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

