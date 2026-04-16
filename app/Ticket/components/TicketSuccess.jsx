"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ============================================================================
// CONSTANTS
// ============================================================================
const FALLBACK_TICKET_ID = "2345678";

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const TicketSuccess = () => {
    // ============================================================================
    // STATE MANAGEMENT
    // ============================================================================
    const [ticketId, setTicketId] = useState("");

    // ============================================================================
    // ROUTER
    // ============================================================================
    const router = useRouter();
    const searchParams = useSearchParams();

    // ============================================================================
    // EFFECTS
    // ============================================================================
    useEffect(() => {
        const urlTicketId = searchParams.get('ticketId');
        setTicketId(urlTicketId || FALLBACK_TICKET_ID);
    }, [searchParams]);

    // ============================================================================
    // EVENT HANDLERS
    // ============================================================================
    const handleCopyTicketId = () => {
        navigator.clipboard.writeText(ticketId);
    };

    const handleGoToHomepage = () => {
        router.push("/homepage");
    };

    const handleGoBack = () => {
        router.back();
    };

    return (
        <div className="flex flex-col w-full h-screen bg-black">
            {/* App Version */}
            <div className="px-5 ml-2 [font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3">
                App Version: V0.0.1
            </div>

            {/* Header */}
            <header className="flex flex-col w-full items-start gap-2 px-5 py-3 pt-4">
                <div className="flex items-center gap-4 relative self-stretch w-full flex-[0_0_auto] rounded-[32px]">
                    <button
                        type="button"
                        onClick={handleGoBack}
                        className="relative w-6 h-6 cursor-pointer"
                        aria-label="Go back"
                    >
                        <svg
                            className="w-full h-full text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>

                    <h1 className="relative flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-5 ml-2   ">
                        Ticket Raised
                    </h1>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex flex-col w-full items-center justify-center flex-1 px-5 py-4">
                <div className="flex flex-col w-full max-w-[335px] items-center gap-4 relative">
                    <div
                        className="relative w-[120px] h-[120px] shadow-[0px_37.16px_55.74px_#b6d8461a] aspect-[1] flex items-center justify-center"
                        role="img"
                        aria-label="Success checkmark icon"
                    >
                        {/* Green circular background from original image */}
                        <div className="absolute w-full h-full top-0 left-[6.25%]">
                            <img
                                className="absolute w-[100.00%] h-full top-[4.53%] left-[2%]"
                                alt=""
                                src="/assets/animaapp/SF846ApE/img/star-6.svg"
                            />
                            <img
                                className="absolute w-[100.00%] h-full top-[4.53%] left-[4.31%]"
                                alt=""
                                src="/assets/animaapp/SF846ApE/img/star-7.svg"
                            />
                        </div>

                        {/* Centered white checkmark */}
                        <div className="relative z-10 flex items-center   ml-3stify-center">
                            <svg
                                className="w-12 h-12 text-white  ml-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                strokeWidth={3}
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-2 relative self-stretch w-full flex-[0_0_auto]">
                        <p className="relative w-full max-w-[194px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xl text-center tracking-[0] leading-6">
                            Your ticket has been raised
                        </p>

                        <p className="relative self-stretch [font-family:'Poppins',Helvetica] font-normal text-neutral-400 text-sm text-center tracking-[0.25px] leading-5">
                            Our team will get back to you as soon as possible.
                        </p>
                    </div>

                    {/* Ticket ID Section */}
                    <div className="flex items-center gap-2 justify-center w-full mt-4">
                        <p className="[font-family:'Poppins',Helvetica] font-normal text-white text-base text-center tracking-[0] leading-[normal]">
                            <span className="[font-family:'Poppins',Helvetica] font-normal text-white text-base tracking-[0]">
                                Ticket ID:{" "}
                            </span>
                            <span className="font-semibold">{ticketId}</span>
                        </p>

                        <button
                            className="w-7 h-7 cursor-pointer flex items-center justify-center"
                            onClick={handleCopyTicketId}
                            type="button"
                            aria-label="Copy ticket ID to clipboard"
                        >
                            <svg
                                className="w-7 h-7 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        </button>
                    </div>
                </div>
            </main>

            {/* Submit Button */}
            <div className="flex flex-col w-full items-start gap-2 px-4 py-4 bg-black">
                <div className="flex w-full items-start gap-2 py-0 relative flex-[0_0_auto]">
                    <button
                        className="relative flex-1 grow h-[55px] rounded-[12.97px] overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] cursor-pointer flex items-center justify-center"
                        onClick={handleGoToHomepage}
                        type="button"
                        aria-label="Go to Homepage"
                    >
                        <span className="[font-family:'Poppins',Helvetica] font-semibold text-white text-base text-center tracking-[0] leading-[normal]">
                            Go to Homepage
                        </span>
                    </button>
                </div>
            </div>

            {/* Android Home Indicator */}

        </div>
    );
};
