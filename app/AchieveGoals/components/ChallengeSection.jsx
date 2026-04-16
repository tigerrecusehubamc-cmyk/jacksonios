"use client";
import React, { useState, useRef, useEffect } from "react";

const ChallengeSection = () => {
    const [activesIndex, setActivesIndex] = useState(1);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [translateX, setTranslateX] = useState(0);
    const containerRef = useRef(null);
    const HORIZONTALS_SPREAD = 120;

    const surveyProviders = [
        {
            id: 1,
            name: "Ayet Studios",
            image: "/assets/animaapp/xCaMzUYh/img/image-3979-2x.png",
            bgImage: "/assets/animaapp/xCaMzUYh/img/rectangle-74-2-2x.png",
        },
        {
            id: 2,
            name: "BitLabs",
            image: "/assets/animaapp/xCaMzUYh/img/image-3974-2x.png",
            bgImage: "/assets/animaapp/xCaMzUYh/img/rectangle-73-3-2x.png",
        },
        {
            id: 3,
            name: "CPX Research",
            image: "/assets/animaapp/xCaMzUYh/img/image-3977-2x.png",
            bgImage: "/assets/animaapp/xCaMzUYh/img/rectangle-74-2-2x.png",
        },
    ];

    const totalsCards = surveyProviders.length;

    // Touch event handlers for swipe functionality
    const handleTouchStart = (e) => {
        e.preventDefault();
        setIsDragging(true);
        setStartX(e.touches[0].clientX);
        setTranslateX(0);
    };

    const handleTouchMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();

        const currentX = e.touches[0].clientX;
        const diffX = currentX - startX;
        setTranslateX(diffX);
    };

    const handleTouchEnd = () => {
        if (!isDragging) return;

        setIsDragging(false);

        // Determine swipe direction and update index
        if (Math.abs(translateX) > 50) {
            if (translateX > 0 && activesIndex > 0) {
                setActivesIndex(activesIndex - 1);
            } else if (translateX < 0 && activesIndex < surveyProviders.length - 1) {
                setActivesIndex(activesIndex + 1);
            }
        }

        setTranslateX(0);
    };

    // Mouse event handlers for desktop support
    const handleMouseDown = (e) => {
        setIsDragging(true);
        setStartX(e.clientX);
        setTranslateX(0);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const currentX = e.clientX;
        const diffX = currentX - startX;
        setTranslateX(diffX);
    };

    const handleMouseUp = () => {
        if (!isDragging) return;

        setIsDragging(false);

        if (Math.abs(translateX) > 50) {
            if (translateX > 0 && activesIndex > 0) {
                setActivesIndex(activesIndex - 1);
            } else if (translateX < 0 && activesIndex < surveyProviders.length - 1) {
                setActivesIndex(activesIndex + 1);
            }
        }

        setTranslateX(0);
    };

    const handleSurveyClick = (provider) => {
        // You can add navigation to survey provider or open WebView here
    };

    return (
        <div className="flex w-full flex-col my-1 items-start gap-3 relative">
            <div className="flex w-full items-center justify-between">
                <p className="[font-family:'Poppins',Helvetica] text-[16px] font-semibold leading-[normal] tracking-[0] text-[#FFFFFF]">
                    Earn $20 🤑 by doing surveys for 5 days
                </p>
            </div>

            {/* The Carousel itself */}
            <div
                ref={containerRef}
                className="relative flex h-[190px] rounded-[10px] w-full items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                {surveyProviders.map((provider, index) => {
                    const offset = index - activesIndex;

                    const cardStyle = {
                        transform: `translateX(calc(-50% + ${offset * HORIZONTALS_SPREAD + (isDragging ? translateX : 0)}px)) scale(${offset === 0 ? 1 : 0.85})`,
                        zIndex: totalsCards - Math.abs(offset),
                        opacity: offset === 0 ? 1 : 0.6,
                        transition: isDragging ? "none" : "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
                    };

                    return (
                        <div
                            key={provider.id}
                            onClick={() => {
                                setActivesIndex(index);
                                handleSurveyClick(provider);
                            }}
                            className="absolute top-0 left-1/2 cursor-pointer"
                            style={cardStyle}
                        >
                            <div className="relative h-[190px] w-[165px]">
                                <img
                                    className="absolute inset-0 h-full w-full rounded-2xl object-cover"
                                    alt={`${provider.name} background`}
                                    src={provider.bgImage}
                                    loading="eager"
                                    decoding="async"
                                    width="165"
                                    height="190"
                                />
                                <div className="absolute top-[123px] left-1/2 w-full -translate-x-1/2 text-center font-['Poppins',Helvetica] font-semibold leading-tight text-[16px] tracking-[0] text-[#FFFFFF]">
                                    {/* Break name into multiple lines if it contains spaces */}
                                    {provider.name.split(" ").map((word, i) => (
                                        <span key={i}>
                                            {word}
                                            {provider.name.includes(" ") && i === 0 && <br />}
                                        </span>
                                    ))}
                                </div>
                                <img
                                    className="absolute top-[39px] left-1/2 h-auto w-20 max-h-[78px] -translate-x-1/2 object-contain"
                                    alt={`${provider.name} logo`}
                                    src={provider.image}
                                    loading="eager"
                                    decoding="async"
                                    width="80"
                                    height="78"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Swipe indicators */}
            <div className="flex justify-center mt-4 space-x-2">
                {surveyProviders.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setActivesIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all duration-300 ${index === activesIndex
                            ? 'bg-white scale-125'
                            : 'bg-white/50 hover:bg-white/75'
                            }`}
                        aria-label={`Go to survey ${index + 1}`}
                    />
                ))}
            </div>

            {/* Swipe instruction */}
            <div className="text-center mt-2">
                <p className="text-white/60 text-xs">
                    Swipe or tap to explore survey options
                </p>
            </div>
        </div>
    );
};

export default ChallengeSection;
