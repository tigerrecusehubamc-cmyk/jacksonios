import React from 'react'
import Link from "next/link";
import NextImage from "next/image";
export const Header = () => {
    return (
        <>
            <div className="absolute top-[10px] left-6 right-6 h-[49px] z-10">
                <div className="absolute top-[8px] left-0 [font-family:'Poppins',Helvetica] font-light text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
                    App Version: V0.0.1
                </div>
            </div>

            <header className="flex flex-col w-full min-w-0 max-w-full items-start gap-2 pr-4 py-3 mt-[36px] mb-1">
                <div className="flex items-center gap-4 w-full min-w-0 max-w-full">
                    <Link
                        className="relative w-6 h-6 mt-[1px] flex-shrink-0"
                        aria-label="Go back"
                        href="/cash-coach"
                    >
                        <svg
                            className="w-6 h-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                d="M15 18L9 12L15 6"
                                stroke="white"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </Link>
                    <h1 className="font-semibold text-white text-xl leading-5">
                        Achieve Your Goal
                    </h1>
                </div>
            </header>
            <p className=' px-2 text-white text-[14px] font-light'>Follow the steps to unlock your rewards/ Loyalty plan</p>

        </>
    )
}
