import React, { useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { debounce } from "lodash";
import { useAuth } from "@/contexts/AuthContext";
import { setGoalsLocally, updateFinancialGoals } from "@/lib/redux/slice/cashCoachSlice";

export const GoalsAndTargetsSection = () => {
    const dispatch = useDispatch();
    const router = useRouter();
    const { token } = useAuth();
    const goals = useSelector((state) => state.cashCoach.goals) || {};

    const debouncedUpdate = useCallback(
        debounce((newGoals, authToken) => {
            dispatch(updateFinancialGoals({ goalsData: newGoals, token: authToken }));
        }, 500),
        [dispatch]
    );

    const handleValueChange = (key, value) => {
        const numericValue = Math.max(0, Number(value) || 0);
        const updatedGoal = { [key]: numericValue };
        dispatch(setGoalsLocally(updatedGoal));
        const newGoals = { ...goals, ...updatedGoal };
        debouncedUpdate(newGoals, token);
    };

    const handleHelpMeEarnClick = () => {
        router.push('/AchieveGoals');
    };



    const goalData = [
        { key: "salary", label: "Salary (Per Month)", max: 9999 },
        { key: "rent", label: "Rent (Per Month)", max: 9999 },
        { key: "food", label: "Food (Per Month)", max: 9999 },
        { key: "savings", label: "Savings (Per Month)", max: 9999 },
        { key: "revenueGoal", label: "Revenue Goal from Jackson", max: 9999 },
    ];
    return (
        <section className="flex  flex-col w-full justify-center mb-30 mt-7 items-start gap-2 relative">
            <header className="flex w-full items-center justify-between  ml-1 relative">
                <h2 className="relative [font-family:'Poppins',Helvetica] font-semibold text-[#F4F3FC] text-base tracking-[0] leading-[normal]">
                    Personalised Earning Targets
                </h2>
            </header>

            <p className="relative self-stretch [font-family:'Poppins',Helvetica] ml-1 font-normal text-[#F4F3FC] text-xs tracking-[0] leading-[normal]">
                Set your goals &amp; finish them the way you prefer.
            </p>

            <div className="relative w-full p-5 bg-black rounded-[10px] shadow-[2.48px_2.48px_18.58px_#a6aabc4c,-1.24px_-1.24px_16.1px_#f9faff1a]">
                <div className="flex flex-col w-full items-start gap-4">
                    {goalData.map((goal, index) => {
                        const currentValue = goals[goal.key] ?? 0;
                        const progress = (currentValue / goal.max) * 100;
                        const sliderStyle = {
                            background: `linear-gradient(to right, #6a6dcd ${progress}%, #307fe24c ${progress}%)`,
                        };

                        return (
                            <div
                                key={goal.key}
                                className={`flex flex-col items-start gap-4 relative self-stretch w-full pb-4 ${index < goalData.length - 1
                                    ? "border-b [border-bottom-style:solid] border-white/20"
                                    : ""
                                    }`}
                            >
                                <div className="flex items-center justify-between relative self-stretch w-full">
                                    <label
                                        htmlFor={`goal-${goal.key}`}
                                        className="relative [font-family:'Poppins',Helvetica] font-medium text-[#d9d9d9] text-sm tracking-[0.02px] leading-5"
                                    >
                                        {goal.label}
                                    </label>
                                    <div className="relative min-w-0 h-8 flex items-center justify-center gap-1.5 rounded-md bg-[#1C1C1E] px-2">
                                        <input
                                            id={`goal-${goal.key}`}
                                            type="number"
                                            value={currentValue}
                                            readOnly
                                            className="w-10 min-w-0 [font-family:'Poppins',Helvetica] font-bold text-[#d9d9d9] text-sm text-center bg-transparent border-none outline-none p-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                            min="0"
                                            max={goal.max}
                                        />
                                        <img
                                            className="w-[18px] h-5 flex-shrink-0"
                                            alt="Coin"
                                            src="/dollor.png"
                                        />
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max={goal.max}
                                    step="1"
                                    value={currentValue}
                                    onChange={(e) => handleValueChange(goal.key, e.target.value)}
                                    style={sliderStyle}
                                    className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-[#6a6dcd]"
                                />
                            </div>
                        );
                    })}

                    <button
                        onClick={handleHelpMeEarnClick}
                        className={`w-[200px] h-12 self-center mt-4 rounded-[12px] bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] hover:opacity-90 transition-opacity font-semibold text-white text-base  cursor-pointer
                            `}
                    >
                        Help me earn
                    </button>
                </div>
            </div>
        </section>
    );
};