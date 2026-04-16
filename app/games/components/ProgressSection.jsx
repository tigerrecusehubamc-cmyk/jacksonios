import React from 'react';
import Image from 'next/image';


const ProgressSection = ({
    title,
    progress,
    mainValue,
    bonusValue,
    top,
    showBorder = true
}) => {
    return (
        <div className={`absolute w-[304px] h-[99px] ${top} left-[15px] ${showBorder ? 'border-b [border-bottom-style:solid] border-[#cacaca80]' : ''}`}>
            {/* Title */}
            <div className="absolute w-[178px] top-1.5 left-[5px] [font-family:'Poppins',Helvetica] font-bold text-white text-base tracking-[0.02px] leading-[normal]">
                {title}
            </div>

            {/* Progress Bar */}
            <div className="absolute w-[177px] h-[20px] top-[68px] left-[5px] border-[4px] border-[#FFFFFF33] bg-transparent rounded-[10px]">
                <div
                    className="h-full bg-[linear-gradient(90deg,rgba(255,221,143,1)_0%,rgba(255,183,77,1)_100%)] rounded-[10px]"
                    style={{ width: `${progress}%` }}
                ></div>
                <div
                    className="absolute bg-white w-7 h-7 rounded-full top-[-8px] border-[5px] border-[#FFB74D]"
                    style={{ left: `calc(${progress}% - 12px)` }}
                ></div>
            </div>

            {/* Reward Badge */}
            <div className="relative w-[70px] h-[55px] left-[226px] top-4 rounded-[12px] overflow-hidden bg-[linear-gradient(331deg,rgba(237,131,0,1)_0%,rgba(237,166,0,1)_100%)] flex items-center justify-center px-1.5">
                <div className="flex items-center justify-center gap-x-1.5 w-full">
                    <div className="flex flex-col items-start justify-center ">
                        <div className="text-[14px] font-semibold text-white tabular-nums">
                            {mainValue}
                        </div>
                        <div className="text-[14px] font-semibold text-white tabular-nums">
                            {bonusValue}
                        </div>
                    </div>

                    <div className="flex flex-col items-center justify-center gap-y-1">
                        <div className="w-[18px] h-[19px] flex items-center justify-center">
                            <Image
                                alt="Coin"
                                src="/assets/animaapp/3mn7waJw/img/image-3937-12-2x.png"
                                width={18}
                                height={19}
                            />
                        </div>
                        <div className="w-5 h-5 flex items-center justify-center">
                            <Image
                                alt="XP"
                                src="/assets/animaapp/3mn7waJw/img/pic-7.svg"
                                width={17}
                                height={14}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProgressSection;
