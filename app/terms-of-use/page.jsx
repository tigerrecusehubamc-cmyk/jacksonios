
"use client";
import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const contentSections = [
    {
        id: 1,
        title: "Introduction",
        content:
            "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
        id: 2,
        title: "Account Responsibilities",
        content:
            "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
        id: 3,
        title: "Acceptable Use",
        content:
            "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
        id: 4,
        title: "User Obligations",
        content:
            "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
        id: 5,
        title: "Usage Restrictions",
        content:
            "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
        id: 6,
        title: "Termination Conditions",
        content:
            "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
        id: 7,
        title: "Intellectual Property",
        content:
            "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
        id: 8,
        title: "Limitation of Liability",
        content:
            "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
        id: 9,
        title: "Disclaimers",
        content:
            "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
    {
        id: 10,
        title: "Contact and Support",
        content:
            "You are granted a limited, non-exclusive, non-transferable license to access and use the Software/Platform solely for business purposes in object code form.",
    },
];

import BackToHomeButton from "./components/BackToHomeButton";

export default function TermsOfUsePage() {
    const router = useRouter();

    const handleBackClick = () => {
        router.back();
    };

    return (
        <div className="w-full min-h-screen bg-black">
            <div className="w-full max-w-[335px] sm:max-w-[375px] mx-auto mt-2 ml-2 px-4 sm:px-5">
                <div className="[font-family:'Poppins',Helvetica] font-normal text-neutral-400 text-[10px] tracking-[0] leading-3">
                    App Version: {process.env.NEXT_PUBLIC_APP_VERSION || "V0.0.1"}
                </div>
            </div>

            {/* Header Section with Back Arrow and Title */}
            <header className="px-4 sm:px-5 py-4 bg-black mt-2">
                <div className="flex items-center gap-4 sm:gap-5 w-full max-w-[335px] sm:max-w-[375px] mx-auto">
                    <button
                        onClick={handleBackClick}
                        className="relative w-6 h-6 cursor-pointer mt-[2px] hover:opacity-80 transition-opacity duration-200 flex-shrink-0"
                        aria-label="Go back"
                        type="button"
                    >
                        <Image
                            width={24}
                            height={24}
                            className="w-6 h-6"
                            alt="Back arrow"
                            src="https://c.animaapp.com/A0aDsc87/img/arrow-back-ios-new@2x.png"
                        />
                    </button>

                    <h1 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-lg sm:text-xl tracking-[0] leading-5">
                        Terms of Use
                    </h1>
                </div>
            </header>

            {/* Effective Date Header */}
            <div className="relative w-full bg-[#555555] shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
                <div className="w-full max-w-[335px] sm:max-w-[375px] mx-auto px-4 sm:px-5 py-3.5">
                    <p className="[font-family:'Poppins',Helvetica] font-bold text-white text-xs sm:text-[13px] text-center tracking-[0] leading-normal">
                        Effective Date: January 1, 2025 • Version 1.0
                    </p>
                </div>
            </div>

            {/* Main Content - Scrollable */}
            <main className="px-4 sm:px-5 py-6 pb-20">
                <div className="w-full max-w-[335px] sm:max-w-[375px] mx-auto flex flex-col gap-4 sm:gap-6">
                    {contentSections.map((section) => (
                        <article
                            key={section.id}
                            className="inline-flex flex-col items-start gap-2 relative flex-[0_0_auto]"
                        >
                            <h2 className="relative w-full mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-white text-base sm:text-lg tracking-[0] leading-5">
                                {section.title}
                            </h2>

                            <p className="relative w-full [font-family:'Poppins',Helvetica] font-normal text-white text-sm tracking-[0] leading-5 sm:leading-6">
                                {section.content.split("\n").map((line, index) => (
                                    <React.Fragment key={index}>
                                        {line}
                                        {index < section.content.split("\n").length - 1 && <br />}
                                    </React.Fragment>
                                ))}
                            </p>
                        </article>
                    ))}
                </div>
            </main>

            {/* Footer */}
            <footer className="relative w-full bg-[#555555] shadow-[0px_4px_4px_rgba(0,0,0,0.25)]">
                <div className="w-full max-w-[335px] sm:max-w-[375px] mx-auto px-4 sm:px-5 py-4">
                    <p className="[font-family:'Poppins',Helvetica] font-normal text-white text-xs sm:text-[13px] text-center tracking-[0] leading-normal">
                        <span className="font-bold">
                            Last Updated: January 1, 2025
                            <br />
                        </span>
                        <span className="[font-family:'Poppins',Helvetica] font-normal text-white text-xs sm:text-[13px] tracking-[0]">
                            {" "}
                            Document Version: 1.0 © 2025 Jackson
                            <br />
                            All rights reserved.
                        </span>
                    </p>
                </div>
            </footer>

            <BackToHomeButton />
        </div>
    );
}

