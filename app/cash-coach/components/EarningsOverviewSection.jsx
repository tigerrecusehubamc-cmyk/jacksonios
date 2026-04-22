import React from "react";
import { useSelector } from "react-redux";

export const EarningsOverviewSection = () => {
    const summary = useSelector((state) => state.cashCoach.summary) || {};
    const {
        stats
    } = useSelector((state) => state.profile);
    const balance = stats?.balance ?? 0;

    // Get wallet screen data from Redux store
    const { walletScreen } = useSelector((state) => state.walletTransactions);
    const coinBalance = walletScreen?.wallet?.balance || 0;

    const earningsData = [
        {
            id: 1,
            emoji: "🚖",
            title: "Salary",
            amount: summary.salary ?? 0,
            period: "month",
            hasIcon: true,
            iconSrc: "https://c.animaapp.com/1jLgqlGD/img/polygon-1.svg",
        },
        {
            id: 2,
            emoji: "🕰️",
            title: "Expense",
            amount: summary.expense ?? 0,
            period: "month",
            hasIcon: true,
            iconSrc: "https://c.animaapp.com/1jLgqlGD/img/polygon-1-1.svg",
        },
        {
            id: 3,
            emoji: "👝",
            title: "Savings",
            amount: summary.savings ?? 0,
            period: "month",
            hasIcon: false,
        },
        {
            id: 4,
            emoji: "📌",
            title: "Goals",
            amount: summary.goals ?? 0,
            period: "month",
            hasIcon: false,
        },
    ];

    const renderCard = (item) => (
        <div
            key={item.id}
            className="flex flex-col h-[124px] items-start justify-between p-4 relative flex-1 grow bg-black rounded-xl border border-solid border-[#515151]"
        >
            <div className="text-3xl">{item.emoji}</div>
            <div className="flex flex-col items-start relative self-stretch w-full">
                {item.hasIcon ? (
                    <div className="flex items-center justify-start gap-2 relative self-stretch w-full">
                        <img
                            className="relative w-3 h-[10.73px]"
                            alt="Indicator"
                            src={item.iconSrc}
                        />
                        <div className="relative [font-family:'Poppins',Helvetica] font-normal text-white text-base">
                            {item.title}
                        </div>
                    </div>
                ) : (
                    <div className="relative self-stretch [font-family:'Poppins',Helvetica] font-normal text-white text-base">
                        {item.title}
                    </div>
                )}

                <p className="relative flex items-center self-stretch [font-family:'Poppins',Helvetica]">
                    <span className="font-semibold text-white text-base">{`$${item.amount}`}</span>
                    <span className="font-normal text-white text-base">/{item.period}</span>
                </p>
            </div>
        </div>
    );

    return (
        <section className="flex flex-col items-start gap-3 self-stretch w-full max-w-[390px] mx-auto">
            {/* Removed App Version and Cash Coach title - now in PageHeader */}
            <div className="flex w-full items-start justify-center gap-3">
                {earningsData.slice(0, 2).map(renderCard)}
            </div>
            <div className="flex w-full items-start justify-center gap-3">
                {earningsData.slice(2, 4).map(renderCard)}
            </div>
        </section>
    );
};