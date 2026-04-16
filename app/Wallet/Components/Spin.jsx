"use client";
import Image from "next/image";
import React, { useState, useEffect, useCallback } from "react";
import { HighestTransctionCard } from "./HighestTransctionCard";

const SCALE_CONFIG = [
    { minWidth: 0, scaleClass: "scale-90" },
    { minWidth: 320, scaleClass: "scale-90" },
    { minWidth: 375, scaleClass: "scale-100" },
    { minWidth: 480, scaleClass: "scale-125" },
    { minWidth: 640, scaleClass: "scale-120" },
    { minWidth: 768, scaleClass: "scale-150" },
    { minWidth: 1024, scaleClass: "scale-175" },
    { minWidth: 1280, scaleClass: "scale-200" },
    { minWidth: 1536, scaleClass: "scale-225" },
];

export const Spin = () => {
    const [currentScaleClass, setCurrentScaleClass] = useState("scale-100");

    const getScaleClass = useCallback((width) => {
        for (let i = SCALE_CONFIG.length - 1; i >= 0; i--) {
            if (width >= SCALE_CONFIG[i].minWidth) {
                return SCALE_CONFIG[i].scaleClass;
            }
        }
        return "scale-100";
    }, []);

    useEffect(() => {
        const updateScale = () => {
            setCurrentScaleClass(getScaleClass(window.innerWidth));
        };
        updateScale();
    }, [getScaleClass]);
    return (
        <div
            className={`flex justify-between items-center  transition-transform duration-200 px-4  pb-2 ease-in-out `}
        >
            <section className=" w-[335px] h-[103px] flex justify-center">
                <div className="relative w-full h-full rounded-[10px] overflow-hidden bg-[linear-gradient(107deg,rgba(200,117,251,1)_0%,rgba(16,4,147,1)_100%)]">
                    <div className="inline-flex flex-col items-start pl-4 pr-8 py-4">
                        <h4 className="font-bold text-[#e5bfff] text-sm">Spin &amp; Win</h4>
                        <div className="relative">
                            <div className="font-bold text-white text-[32px] leading-8">
                                50
                            </div>
                            <Image
                                width={23}
                                height={24}
                                className="absolute top-[2px] left-[46px]"
                                alt="Coin"
                                src="/assets/animaapp/V1uc3arn/img/image-3937-3-2x.png"
                                loading="eager"
                                decoding="async"
                            />
                        </div>
                        <p className="font-medium text-white text-xs">
                            Click to spin the wheel
                        </p>
                    </div>

                    <Image
                        width={102}
                        height={62}
                        className="absolute top-[18px] left-[195px]"
                        alt="Spin wheel"
                        src="/assets/animaapp/V1uc3arn/img/spin-icon-2x.png"
                        loading="eager"
                        decoding="async"
                        priority
                    />

                    {/* decorative assets kept as-is */}
                    <Image
                        width={42}
                        height={39}
                        className="absolute top-[22px] left-[145px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/-----6-2x.png"
                        loading="eager"
                        decoding="async"
                    />
                    <Image
                        width={30}
                        height={31}
                        className="absolute top-[63px] left-[175px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/-----9-2x.png"
                        loading="eager"
                        decoding="async"
                    />
                    <Image
                        width={44}
                        height={46}
                        className="absolute top-14 left-[275px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/-----5-2x.png"
                        loading="eager"
                        decoding="async"
                    />
                    <Image
                        width={44}
                        height={46}
                        className="absolute top-[3px] left-[291px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/-----10-2x.png"
                        loading="eager"
                        decoding="async"
                    />
                    <Image
                        width={8}
                        height={8}
                        className="absolute top-1.5 left-48"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-3.svg"
                        loading="eager"
                        decoding="async"
                    />
                    <Image
                        width={8}
                        height={8}
                        className="absolute top-[19px] left-[129px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-4.svg"
                        loading="eager"
                        decoding="async"
                    />
                    <Image
                        width={5}
                        height={5}
                        className="absolute top-[46px] left-48"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-5.svg"
                        loading="eager"
                        decoding="async"
                    />
                    <Image
                        width={5}
                        height={5}
                        className="absolute top-11 left-[302px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-6.svg"
                        loading="eager"
                        decoding="async"
                    />
                    <Image
                        width={8}
                        height={8}
                        className="absolute top-[70px] left-[164px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-8.svg"
                        loading="eager"
                        decoding="async"
                    />
                    <Image
                        width={8}
                        height={8}
                        className="absolute top-[13px] left-[270px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-8.svg"
                        loading="eager"
                        decoding="async"
                    />
                    <Image
                        width={26}
                        height={24}
                        className="absolute top-[73px] left-[250px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/-----8-2x.png"
                        loading="eager"
                        decoding="async"
                    />
                </div>
            </section>
        </div>
    )
}
