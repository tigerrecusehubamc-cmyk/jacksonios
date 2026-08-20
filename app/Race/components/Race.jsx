import React, { useState } from "react";
import { useRouter } from "next/navigation";

export const Race = ({ progressData, isLoadingXP }) => {
    const router = useRouter();
    const [currentLevel, setCurrentLevel] = useState(3);
    const [playerCount, setPlayerCount] = useState(4);

    const platformImages = [
        {
            src: "https://c.animaapp.com/j8smgVil/img/group-3@2x.png",
            alt: "Group",
            top: "88.22%",
            left: "55.18%",
            level: 10,
            isCompleted: true,
            glow: true,
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/group-13@2x.png",
            alt: "Group",
            top: "78.20%",
            left: "7.05%",
            level: 9,
            isCompleted: true,
            glow: true,
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/group-14@2x.png",
            alt: "Group",
            top: "73.61%",
            left: "51.73%",
            level: 8,
            isCompleted: true,
            glow: true,
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/group-15@2x.png",
            alt: "Group",
            top: "65.17%",
            left: "9.02%",
            level: 7,
            isCompleted: true,
            glow: true,
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/group-16@2x.png",
            alt: "Group",
            top: "57.99%",
            left: "51.33%",
            level: 6,
            isCompleted: true,
            glow: true,
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/group-17@2x.png",
            alt: "Group",
            top: "49.56%",
            left: "10.72%",
            level: 5,
            isCompleted: true,
            glow: true,
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/group-18@2x.png",
            alt: "Group",
            top: "43.38%",
            left: "51.23%",
            level: 4,
            isCompleted: true,
            glow: true,
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/group-19@2x.png",
            alt: "Group",
            top: "36.22%",
            left: "5.21%",
            level: 3,
            isCompleted: true,
            glow: true,
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/group-20@2x.png",
            alt: "Group",
            top: "28.76%",
            left: "50.52%",
            level: 2,
            isCompleted: false,
            glow: false,
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/group-21@2x.png",
            alt: "Group",
            top: "21.89%",
            left: "5.10%",
            level: 1,
            isCompleted: false,
            glow: false,
        },
    ];

    const friendsImages = [
        {
            src: "https://c.animaapp.com/j8smgVil/img/friends@2x.png",
            alt: "Friends",
            top: "0",
            left: "33px",
            name: "Orbitron",
            isActive: true,
            position: 1,
            bgColor: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)", // Blue gradient
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/friends-1@2x.png",
            alt: "Friends",
            top: "22px",
            left: "0",
            name: "ByteBeast",
            isActive: true,
            position: 2,
            bgColor: "linear-gradient(135deg, #10b981 0%, #059669 100%)", // Green gradient
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/friends-2@2x.png",
            alt: "Friends",
            top: "6",
            left: "67px",
            name: "CyberBot",
            isActive: true,
            position: 3,
            bgColor: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)", // Indigo gradient
        },
        {
            src: "https://c.animaapp.com/j8smgVil/img/friends-3@2x.png",
            alt: "Friends",
            top: "35px",
            left: "33px",
            name: "You",
            isActive: true,
            position: 4,
            bgColor: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)", // Orange gradient
        },
    ];


    return (
        <div className="flex flex-col items-center">
            <div
                className="relative w-[334px] h-[698px] bg-[#1f162b] rounded-[10px] overflow-hidden shadow-2xl border-4 border-gray-300 transform perspective-1000 rotateY-2 rotateX-1"
                data-model-id="2035:7571"
                style={{
                    boxShadow: '0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                    border: '4px solid #d1d5db',
                    transform: 'perspective(1000px) rotateY(2deg) rotateX(1deg)',
                    transformStyle: 'preserve-3d'
                }}
            >
                {/* 3D Android-style Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-purple-900 via-orange-600 to-yellow-400 opacity-60"></div>

                {/* 3D Border Effect */}
                <div className="absolute inset-0 rounded-[10px] border-2 border-white/20 shadow-inner"></div>

                {/* Android-style Inner Shadow */}
                <div className="absolute inset-0 rounded-[10px] shadow-inner" style={{
                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(255,255,255,0.1)'
                }}></div>

                <img
                    className="absolute top-[86px] left-0 w-[334px] h-[612px]"
                    alt="Image"
                    src="https://c.animaapp.com/j8smgVil/img/image-4037.png"
                    loading="eager"
                    decoding="async"
                    width="334"
                    height="612"
                />

                {/* Static Lava Background */}
                <div
                    className="absolute top-[86px] left-0 w-[334px] h-[612px] bg-gradient-to-b from-transparent via-orange-500/20 to-yellow-400/30"
                ></div>

                {/* Player Avatars with Smooth Movement */}
                <div className="absolute w-[115px] h-[85px] top-[611px] left-[9px]">
                    {friendsImages.map((friend, index) => (
                        <div
                            key={index}
                            className="absolute"
                            style={{
                                top: friend.top,
                                left: friend.left,
                                animation: `smoothBounce 3s ease-in-out infinite ${index * 0.4}s`
                            }}
                        >
                            <img
                                className="w-12 h-[50px]"
                                alt={friend.alt}
                                src={friend.src}
                                loading="eager"
                                decoding="async"
                                width="48"
                                height="50"
                                style={{
                                    filter: 'drop-shadow(0 2px 8px rgba(255,255,255,0.2))'
                                }}
                            />
                            {/* Simple Player Name with Dynamic Background */}
                            <div
                                className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-white text-xs px-2 py-1 rounded-md text-center whitespace-nowrap font-semibold shadow-lg"
                                style={{
                                    background: friend.bgColor,
                                    minWidth: 'fit-content',
                                    width: 'auto',
                                }}
                            >
                                {friend.name}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Platform Levels with Gentle Movement */}
                {platformImages.map((platform, index) => (
                    <div
                        key={index}
                        className="absolute"
                        style={{
                            top: platform.top,
                            left: platform.left,
                            animation: `gentleMove 4s ease-in-out infinite ${index * 0.6}s`
                        }}
                    >
                        <img
                            className="w-[38.33%] h-[4.86%]"
                            alt={platform.alt}
                            src={platform.src}
                            loading="eager"
                            decoding="async"
                            width="128"
                            height="34"
                        />
                        {/* Simple Level Number */}
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                            {platform.level}
                        </div>
                    </div>
                ))}

                {/* Character Avatars with Smooth Movement */}
                <img
                    className="absolute top-[124px] left-24 w-[47px] h-10 object-cover"
                    alt="Image"
                    src="https://c.animaapp.com/j8smgVil/img/-@2x.png"
                    loading="eager"
                    decoding="async"
                    width="47"
                    height="40"
                    style={{
                        filter: 'drop-shadow(0 2px 8px rgba(255,255,255,0.2))',
                        animation: 'gentleMove 3.5s ease-in-out infinite 0.5s'
                    }}
                />

                <img
                    className="absolute top-24 left-[17px] w-[83px] h-[72px] object-cover"
                    alt="Image"
                    src="https://c.animaapp.com/j8smgVil/img/--1@2x.png"
                    loading="eager"
                    decoding="async"
                    width="83"
                    height="72"
                    style={{
                        filter: 'drop-shadow(0 2px 8px rgba(255,255,255,0.2))',
                        animation: 'gentleMove 3.5s ease-in-out infinite 1s'
                    }}
                />

                <section
                    className="absolute -top-px left-px w-[333px] h-[90px]"
                    data-model-id="2035:7719"
                    aria-label="Quest Progress"
                >
                    <img
                        className="absolute w-[99.91%] h-[96.90%] top-0 left-0 rotate-[-0.36deg]"
                        alt=""
                        src="https://c.animaapp.com/iHEgzz6R/img/rectangle-274.svg"
                        role="presentation"
                        loading="eager"
                        decoding="async"
                        width="333"
                        height="87"
                    />

                    <img
                        className="absolute w-[100.00%] h-[97.92%] top-0 left-0 rotate-[-0.36deg]"
                        alt=""
                        src="https://c.animaapp.com/iHEgzz6R/img/group-649@2x.png"
                        role="presentation"
                        loading="eager"
                        decoding="async"
                        width="333"
                        height="88"
                    />

                    <h2 className="absolute w-[80.05%] h-[13.29%] top-[26.03%] left-[8.45%] flex items-center justify-center font-bold text-white text-lg text-center leading-tight">
                        WIN THE RACE TO EARN $100
                    </h2>

                    <div
                        className="absolute w-[8.96%] h-[13.29%] top-[46.39%] left-[17.24%] rotate-[-0.36deg] font-semibold text-green-400 text-xs text-center"
                        aria-label="Levels label"
                    >
                        LEVELS
                    </div>

                    <div
                        className="absolute w-[11.35%] h-[13.29%] top-[46.39%] left-[68.51%] rotate-[-0.36deg] font-semibold text-green-400 text-xs text-center"
                        aria-label="Players label"
                    >
                        PLAYERS
                    </div>

                    <div className="absolute w-[9.86%] h-[17.72%] top-[70.62%] left-[72.45%]">
                        <div
                            className="absolute w-[93.91%] h-full top-[-5.00%] left-[-2.44%] font-bold text-white border-black text-sm text-center"
                            aria-label={`${playerCount} out of 10 players`}
                        >
                            {playerCount}/10
                        </div>
                    </div>
                </section>
                {/* 
                <section className="absolute top-[88px] left-0 w-full px-4 py-2">
                    {isLoadingXP ? (
                        <div className="flex justify-center items-center h-8">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500"></div>
                            <span className="ml-2 text-white text-sm">Loading XP...</span>
                        </div>
                    ) : (
                        <div className="relative w-full h-8 rounded-[32px] bg-[#373737] border-4 border-solid border-[#ffffff33]">
                            <div
                                className="absolute h-[18px] top-0.5 bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-[32px] transition-all duration-300 ease-out"
                                style={{
                                    left: `${progressData.progressBarStart || 0}px`,
                                    width: `${Math.max(0, Math.min(progressData.progressBarWidth || 0, 288 - (progressData.progressBarStart || 0)))}px`,
                                }}
                            />
                            <div
                                className="absolute w-6 h-6 top-0 bg-white rounded-full border-5 border-[#FFD700] z-10 transition-all duration-300 ease-out"
                                style={{
                                    left: `${Math.max(0, Math.min((progressData.indicatorPosition || 0) - 6, 288 - 6))}px`,
                                }}
                            />

                            <div className="absolute inset-0 flex items-center justify-center text-white text-xs font-semibold">
                                {`${progressData.currentXP} / ${progressData.totalXP} XP`}
                            </div>
                        </div>
                    )}
                </section> */}
                {/* Simple CSS Animations */}
                <style jsx>{`
                    @keyframes gentleMove {
                        0%, 100% {
                            transform: translateY(0px);
                        }
                        50% {
                            transform: translateY(-4px);
                        }
                    }
                    
                    @keyframes smoothBounce {
                        0%, 100% {
                            transform: translateY(0px);
                        }
                        50% {
                            transform: translateY(-4px);
                        }
                    }
                `}</style>
            </div>
            {/* Start Playing Button placed outside and below card */}
            <div className="w-[334px] max-w-full flex justify-center mt-4">
                <button
                    className="relative w-full h-12 rounded-[12.97px] overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] transition-transform duration-150 scale-100 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 shadow-lg border-2 border-white/20"
                    style={{
                        boxShadow: '0 8px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)',
                        transform: 'translateZ(10px)',
                        transformStyle: 'preserve-3d'
                    }}
                    onClick={() => router.push('/Race/ListGame?fromRace=true')}
                    aria-label="Start Playing - Begin Race"
                    type="button"
                >
                    <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 [font-family:'Poppins',Helvetica] font-semibold text-white text-base text-center tracking-[0] leading-[normal]">
                        Start Playing
                    </span>
                </button>
            </div>
        </div>
    );
};
