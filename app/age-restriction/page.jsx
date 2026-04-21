"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AgeRestrictionPage() {
    const router = useRouter();

    const handleBackClick = () => {
        router.back();
    };

    return (
        <div className="w-full min-h-screen bg-black">
            {/* App Version */}
            <div className="px-4 sm:px-5 mt-2">
                <div className="max-w-[335px] sm:max-w-[375px] mx-auto">
                    <div className="[font-family:'Poppins',Helvetica] font-normal text-neutral-400 text-[10px] tracking-[0] leading-3">
                        App Version: {process.env.NEXT_PUBLIC_APP_VERSION || "V0.0.1"}
                    </div>
                </div>
            </div>
            {/* Header Section */}
            <div className="px-4 sm:px-5 py-4 bg-black mt-2">
                <div className="flex items-center gap-5 w-full max-w-[335px] sm:max-w-[375px] mx-auto">
                    <button
                        onClick={handleBackClick}
                        className="relative w-6 h-6  cursor-pointer hover:opacity-80 transition-opacity duration-200"
                        aria-label="Go back"
                        type="button"
                    >
                        <img
                            className="w-full h-full mt-[1px]"
                            alt=""
                            src="https://c.animaapp.com/A0aDsc87/img/arrow-back-ios-new@2x.png"
                        />
                    </button>

                    <h1 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-5">
                        Age RestrictionS
                    </h1>

                    <div className="w-6 h-6"></div> {/* Spacer for centering */}
                </div>


            </div>

            {/* Main Content */}
            <main className="px-4 mt-10  sm:px-5 py-8 sm:py-12 ">
                <div className="w-full max-w-[335px] sm:max-w-[375px] mx-auto flex flex-col items-center justify-center gap-6 sm:gap-8">
                    {/* Age Restriction Icon */}
                    <div className="flex flex-col items-center gap-4">
                        <Image
                            width={138}
                            height={138}
                            className="relative w-[120px] h-[120px] sm:w-[138px] sm:h-[138px] aspect-[1] object-cover"
                            alt="Age restriction icon"
                            src="https://c.animaapp.com/pmIwt3V3/img/tempimageahopvm-2@2x.png"
                        />

                        {/* Age Restriction Text */}
                        <p className="relative w-full [font-family:'Poppins',Helvetica] font-normal text-gray-300 text-[14px] text-center tracking-[0] leading-5 sm:leading-6 max-w-[320px]">
                            This app is intended for users aged 17 and above. By continuing, you
                            confirm that you meet the minimum age requirement.
                        </p>
                    </div>

                </div>
            </main>

            {/* Important Notice Section */}
            <section className="px-4 sm:px-5 pb-6">
                <div className="w-full max-w-[335px] sm:max-w-[375px] mx-auto">
                    <div className="w-full p-4 sm:p-6 rounded-lg bg-[linear-gradient(to_right,rgba(255,_255,_255,_0.1)_0%,rgba(255,_255,_255,_0.05)_20%,rgba(0,_0,_0,_0.9)_100%)] shadow-lg border border-white/20">
                        <div className="flex flex-col justify-start gap-1">

                            <div className="flex items-center justify-start gap-x-1">
                                {/* Updated Red & Small Warning Icon */}
                                <div className="w-6 h-6 mt-[2px] flex items-center justify-center ">
                                    <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                </div>

                                {/* Important Notice Heading */}
                                <h2 className="[font-family:'Poppins',Helvetica] font-semibold text-gray-300 text-[14px] ">
                                    Important Notice
                                </h2>
                            </div>
                            {/* Updated Text Size and Color to match the reference */}
                            <p className="[font-family:'Poppins',Helvetica] font-light text-gray-300 text-[13px] text-start leading-5 sm:leading-6">
                                Only users 17+ may participate in XP and Coin activities. If you are below this age, please exit the app.
                            </p>
                        </div>
                    </div>
                </div>
            </section>



        </div>
    );
}