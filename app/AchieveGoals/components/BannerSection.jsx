import React, { useState } from "react";
import { useRouter } from "next/navigation";

export const BannerSection = () => {
    const [isPressed, setIsPressed] = useState(false);
    const router = useRouter();

    const handleChallengeClick = () => {
        setIsPressed(true);
        setTimeout(() => setIsPressed(false), 150);
        router.push("/dailychallenge");
    };

    return (
        <section
            className="flex flex-col h-full w-full justify-center items-center  mt-2  mb-2 relative"
            role="banner"
            aria-label="Daily Challenge Banner"
        >
            <div className="relative w-full max-w-[340px] h-[176px] p-[2px]">
                {/* Outer glow layer with 3D border effect */}
                <div
                    className="relative w-full h-full rounded-[22px]"
                    style={{
                        background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, rgba(158,173,247,0.35) 50%, rgba(113,106,231,0.3) 100%)',
                        padding: '2px',
                        boxShadow: '0 0 8px rgba(158,173,247,0.3), 0 0 12px rgba(113,106,231,0.2), 0 2px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)'
                    }}
                >
                    {/* Middle border layer */}
                    <div
                        className="relative w-full h-full rounded-[20px]"
                        style={{
                            background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(158,173,247,0.25) 50%, rgba(113,106,231,0.2) 100%)',
                            padding: '1px',
                            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.2), inset 0 -1px 2px rgba(0,0,0,0.1)'
                        }}
                    >
                        {/* Inner border layer */}
                        <div
                            className="relative w-full h-full rounded-[19px]"
                            style={{
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(158,173,247,0.2) 50%, rgba(113,106,231,0.15) 100%)',
                                padding: '1px'
                            }}
                        >
                            {/* Main content container */}
                            <div
                                className="relative w-full h-full rounded-[18px] overflow-hidden bg-cover bg-center bg-no-repeat bg-black"
                                style={{ backgroundImage: "url('/arhievegolasbanner.png')" }}
                            >

                                <h2 className="absolute w-[204px] top-[19px] left-4 [font-family:'Poppins',Helvetica] font-bold text-white text-[18px] tracking-[-0.18px] leading-[normal]">
                                    Complete Daily Challenges
                                </h2>

                                <div className="absolute w-[97px] h-[97px] top-[19px] right-4">
                                    <img
                                        className="w-full h-full object-cover"
                                        alt="Treasure chest with golden coins"
                                        src="/tesurebox.png"
                                        loading="eager"
                                        fetchPriority="high"
                                    />
                                </div>

                                <div className="absolute min-w-[120px] px-4 h-[36px] top-[78px] left-4 rounded-[10px] overflow-hidden bg-[linear-gradient(107deg,rgba(200,117,251,1)_0%,rgba(16,4,147,1)_100%)] flex items-center justify-center">
                                    <span className="[font-family:'Poppins',Helvetica] font-medium text-white text-[16px] tracking-[0] leading-5">
                                        Earn Reward
                                    </span>
                                </div>

                                <div className="absolute bottom-0 left-0 w-full h-[46px] rounded-b-[18px] bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] flex items-center justify-center">
                                    <button
                                        className={`[font-family:'Poppins',Helvetica] font-semibold text-white text-[14px] tracking-[-0.14px] leading-[normal] cursor-pointer transition-transform duration-150 hover:scale-105  focus:ring-opacity-50 ${isPressed ? "transform scale-95" : ""
                                            }`}
                                        onClick={handleChallengeClick}
                                        aria-label="Check daily challenge to earn rewards"
                                        type="button"
                                    >
                                        Check Challenge
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};
