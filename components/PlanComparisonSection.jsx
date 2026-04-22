import React, { useState } from "react";

export const PlanComparisonSection = () => {
    const [isOpen, setIsOpen] = useState(true);

    const plans = [
        {
            name: "Bronze",
            weeklyXP: 100,
            bonusChances: 5,
            adFree: false,
            earlyAccess: false,
        },
        {
            name: "Gold",
            weeklyXP: 250,
            bonusChances: 10,
            adFree: true,
            earlyAccess: true,
        },
        {
            name: "Platinum",
            weeklyXP: 500,
            bonusChances: 50,
            adFree: true,
            earlyAccess: true,
        },
    ];

    const features = [
        { label: "Weekly XP", key: "weeklyXP" },
        { label: "Extra Spin", key: "bonusChances" },
        { label: "Ad Free", key: "adFree" },

    ];

    return (
        <section className="flex flex-col w-[335px] items-start gap-2.5">
            <header className="flex h-7 items-center justify-between relative self-stretch w-full">
                <h2 className="relative w-full [font-family:'Poppins',Helvetica] font-bold text-white text-base tracking-[0] leading-[normal]">
                    Plan Comparison
                </h2>

                <button
                    type="button"
                    aria-label="Collapse plan comparison"
                    className="relative w-6 h-6 flex-shrink-0"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <img
                        className="w-full h-full transition-transform duration-300"
                        alt="Collapse"
                        src="https://c.animaapp.com/r1fTnMhC/img/arrow-back-ios-new@2x.png"
                        style={{ transform: isOpen ? 'rotate(-90deg)' : 'rotate(0deg)' }}
                    />
                </button>
            </header>

            {isOpen && (
                <div className="grid grid-cols-4 gap-x-2 gap-y-4 self-stretch w-full p-4 rounded-[18.56px] border border-solid border-[#ffffff80]">
                    {/* Headers */}
                    <div className="[font-family:'Poppins',Helvetica] font-semibold text-white text-sm text-left tracking-[0] leading-[normal]">
                        Features
                    </div>
                    {plans.map(plan => (
                        <div key={plan.name} className="[font-family:'Poppins',Helvetica] font-semibold text-white text-sm text-center tracking-[0] leading-[normal]">
                            {plan.name}
                        </div>
                    ))}

                    {/* Body */}
                    {features.map(feature => (
                        <React.Fragment key={feature.key}>
                            <div className="[font-family:'Poppins',Helvetica] font-normal text-white text-[13px] tracking-[0] leading-4 flex items-center">
                                {feature.label.split('\n').map((line, i, arr) => (
                                    <React.Fragment key={i}>
                                        {line}
                                        {i < arr.length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </div>
                            {plans.map(plan => (
                                <div key={`${plan.name}-${feature.key}`} className="[font-family:'Poppins',Helvetica] font-normal text-white text-sm tracking-[0] leading-4 flex items-center justify-center">
                                    {typeof plan[feature.key] === 'boolean'
                                        ? (plan[feature.key] ? '✅' : '✅')
                                        : plan[feature.key]
                                    }
                                </div>
                            ))}
                        </React.Fragment>
                    ))}
                </div>
            )}
        </section>
    );
};
