import React from "react";

export const Coins = ({ game, viewCount, onBack, onChat }) => {
    // Generate dynamic point breakdown from game goals
    const generatePointBreakdown = () => {
        if (!game?.goals) return [];

        const breakdownCategories = [
            { title: "Game Install", backgroundColor: "#fff090", icon: "install" },
            { title: "Daily Use", backgroundColor: "#9099ff", icon: "daily" },
            { title: "Goals", backgroundColor: "#f9b0ff", icon: "goals" },
            { title: "Purchases", backgroundColor: "#a6ffd1", icon: "purchases" },
            { title: "Ads Watched", backgroundColor: "#fff090", icon: "ads" }
        ];

        return breakdownCategories.map((category, index) => {
            // Calculate points based on game goals
            const relevantGoals = game.goals.filter(goal => {
                if (category.title === "Game Install") return goal.text.toLowerCase().includes("install");
                if (category.title === "Daily Use") return goal.text.toLowerCase().includes("daily");
                if (category.title === "Goals") return goal.goal_type === "linear";
                if (category.title === "Purchases") return goal.text.toLowerCase().includes("purchase");
                if (category.title === "Ads Watched") return goal.text.toLowerCase().includes("ad");
                return false;
            });

            const totalPoints = relevantGoals.reduce((sum, goal) => sum + (goal.amount || 0), 0);
            const points = totalPoints > 0 ? Math.floor(totalPoints / relevantGoals.length) : 13;

            return {
                id: index + 1,
                title: category.title,
                points: points,
                backgroundColor: category.backgroundColor,
                vectorLeft: `/assets/animaapp/ltgoa7L3/img/vector-4235-${index + 2}.svg`,
                vectorRight: `/assets/animaapp/ltgoa7L3/img/vector-4234-${index + 2}.svg`,
                pic: `/assets/animaapp/ltgoa7L3/img/pic-${index + 2}.svg`,
            };
        });
    };

    const pointBreakdownData = generatePointBreakdown();

    return (
        <div className="flex flex-col  pt-5 w-[375px] items-center justify-center gap-1 px-6 py-0 relative bg-[#1a1a1a]">
            <div className="relative w-[342px] h-[365px] bg-[#272727] rounded-2xl overflow-hidden border border-solid border-[#80e76a]">
                <header>
                    <h1 className="absolute top-5 left-[17px] [font-family:'Poppins',Helvetica] font-bold text-white text-xl tracking-[0] leading-[normal]">
                        Point Breakdown
                    </h1>
                </header>

                <div className="inline-flex items-center absolute top-12 left-[17px]">
                    <div className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-light text-white text-xs tracking-[0] leading-[normal]">
                        Earn up to {(() => {
                            const n = game?.rewards?.coins ?? game?.rewards?.gold ?? game?.amount ?? 0;
                            const num = Number(n);
                            return Number.isFinite(num) ? (num === Math.round(num) ? String(Math.round(num)) : num.toFixed(2)) : '0';
                        })()}
                    </div>

                    <img
                        className="relative w-3.5 h-3.5 aspect-[0.97]"
                        alt="Coin icon"
                        src="/assets/animaapp/ltgoa7L3/img/image-3937-7-2x.png"
                    />

                    <div className="relative w-fit mt-[-1.00px] font-normal text-xs flex items-start justify-center [font-family:'Poppins',Helvetica] text-white tracking-[0] leading-[normal]">
                        {" "}
                        and {game?.cpi || 0}
                    </div>

                    <img
                        className="relative w-[19px] h-[15px]"
                        alt="XP icon"
                        src="/assets/animaapp/ltgoa7L3/img/pic-7.svg"
                    />
                </div>

                <main className="flex flex-col w-[302px] items-start gap-4 absolute top-[82px] left-5">
                    {pointBreakdownData.map((item) => (
                        <article
                            key={item.id}
                            className="relative self-stretch w-full h-10 rounded-[10px]"
                            style={{ backgroundColor: item.backgroundColor }}
                        >
                            <h2 className="absolute top-2.5 left-3 [font-family:'Poppins',Helvetica] font-bold text-[#585858] text-sm tracking-[0] leading-[normal]">
                                {item.title}
                            </h2>

                            <div className="absolute top-3 left-[254px] w-3.5 text-[#292929] whitespace-nowrap [font-family:'Poppins',Helvetica] font-semibold text-sm text-right tracking-[0] leading-[normal]">
                                {item.points}
                            </div>

                            <img
                                className="absolute top-2 left-[272px] w-[23px] h-6 aspect-[0.97]"
                                alt="Coin icon"
                                src="/assets/animaapp/ltgoa7L3/img/image-3937-6-2x.png"
                            />

                            <div className="absolute top-[20px] left-[calc(50.00%_-_38px)] w-[89px] h-[22px]">
                                <div className="absolute top-0 left-[18px] w-[52px] h-[22px] bg-[#201f59] rounded-[4px_4px_0px_0px] shadow-[0px_0px_4px_#fef47e33]" />

                                <img
                                    className="absolute top-0.5 left-0 w-[19px] h-5"
                                    alt="Left arrow"
                                    src={item.vectorLeft}
                                />

                                <img
                                    className="absolute top-[3px] left-[70px] w-[18px] h-[19px]"
                                    alt="Right arrow"
                                    src={item.vectorRight}
                                />

                                <div className="absolute w-[calc(100%_-_71px)] top-px left-[26px] h-5 font-medium text-[13px] flex items-center justify-center [font-family:'Poppins',Helvetica] text-white tracking-[0] leading-[normal]">
                                    +5
                                </div>

                                <img
                                    className="absolute top-1 left-[46px] w-4 h-[13px]"
                                    alt="XP icon"
                                    src={item.pic}
                                />
                            </div>
                        </article>
                    ))}
                </main>
            </div>
        </div>
    );
};
