"use client";
import React from "react";

/**
 * ContactUs Component
 * 
 * Reusable component for displaying contact information:
 * - Physical address with map view
 * - Email and phone contact details
 * - Tap-to-call and tap-to-email functionality
 * 
 * @param {Object} contactInfo - Contact information object
 * @param {string} contactInfo.address - Physical address
 * @param {string} contactInfo.email - Email address
 * @param {string} contactInfo.phone - Phone number
 * @param {function} onBack - Handler for back button
 * @param {boolean} showHeader - Whether to show header section
 * @param {boolean} showMap - Whether to show map section
 * @param {boolean} showHomeIndicator - Whether to show home indicator
 */
export const ContactUs = ({
    contactInfo = {
        address: "2972 Westheimer Rd. Santa Ana, Illinois 85486",
        email: "contact@company.com",
        phone: "(406) 555-0120",
    },
    onBack,
    showHeader = true,
    showMap = true,
    showHomeIndicator = true
}) => {
    const handleEmailClick = () => {
        try {
            window.location.href = `mailto:${contactInfo.email}`;
        } catch (error) {
            console.error("Failed to open email client:", error);
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(contactInfo.email);
            alert(`Email copied to clipboard: ${contactInfo.email}`);
        }
    };

    const handlePhoneClick = () => {
        try {
            window.location.href = `tel:${contactInfo.phone.replace(/\D/g, "")}`;
        } catch (error) {
            console.error("Failed to open phone dialer:", error);
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(contactInfo.phone);
            alert(`Phone number copied to clipboard: ${contactInfo.phone}`);
        }
    };

    return (
        <div className="relative w-full min-h-screen bg-black">
            {/* Header */}
            {showHeader && (
                <header className="absolute top-0 left-0 w-full h-11 bg-[url(/assets/animaapp/A0aDsc87/img/iphone-x--11-pro---black.svg)] bg-[100%_100%]" />
            )}

            {/* Navigation */}
            {showHeader && (
                <nav className="flex flex-col w-full items-start gap-2 px-5 py-3 absolute top-[54px] left-0">
                    <div className="flex items-center gap-4 relative self-stretch w-full flex-[0_0_auto] rounded-[32px]">
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="relative w-6 h-6 cursor-pointer hover:opacity-80 transition-opacity duration-200"
                                aria-label="Go back"
                                type="button"
                            >
                                <img
                                    className="w-full h-full"
                                    alt=""
                                    src="/assets/animaapp/A0aDsc87/img/arrow-back-ios-new-2x.png"
                                />
                            </button>
                        )}

                        <h1 className="relative w-[271px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xl tracking-[0] leading-5">
                            Contact Us
                        </h1>
                    </div>
                </nav>
            )}

            {/* App Version */}
            {showHeader && (
                <div className="absolute top-[38px] left-5 [font-family:'Poppins',Helvetica] font-normal text-[#A4A4A4] text-[10px] tracking-[0] leading-3 whitespace-nowrap">
                    App Version: {process.env.NEXT_PUBLIC_APP_VERSION || "V0.0.1"}
                </div>
            )}

            {/* Map Display */}
            {showMap && (
                <img
                    className="absolute top-[122px] left-5 w-[335px] h-[184px] aspect-[1.82] object-cover rounded-lg"
                    alt={`Map showing location at ${contactInfo.address}`}
                    src="/assets/animaapp/A0aDsc87/img/image-4031-2x.png"
                />
            )}

            {/* Main Content */}
            <main className={`flex flex-col w-[335px] items-start gap-6 absolute ${showMap ? 'top-[330px]' : 'top-[122px]'} left-5`}>
                {/* Visit Us Section */}
                <section className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
                    <h2 className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-[#8b92de] text-2xl tracking-[0] leading-[normal]">
                        Visit us
                    </h2>

                    <address className="relative self-stretch [font-family:'Poppins',Helvetica] font-normal text-white text-base tracking-[0] leading-6 not-italic">
                        {contactInfo.address}
                    </address>
                </section>

                {/* Contact Section */}
                <section className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
                    <h2 className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-bold text-[#9eadf7] text-2xl tracking-[0] leading-[normal]">
                        Contact
                    </h2>

                    <div className="flex flex-col items-start gap-2 relative self-stretch w-full flex-[0_0_auto]">
                        <button
                            onClick={handleEmailClick}
                            className="relative w-fit mt-[-1.00px] [font-family:'Inter',Helvetica] font-normal text-white text-base tracking-[0] leading-6 whitespace-nowrap hover:underline cursor-pointer transition-all duration-200 hover:text-blue-400"
                        >
                            {contactInfo.email}
                        </button>

                        <button
                            onClick={handlePhoneClick}
                            className="relative w-fit [font-family:'Inter',Helvetica] font-normal text-white text-base tracking-[0] leading-6 whitespace-nowrap hover:underline cursor-pointer transition-all duration-200 hover:text-green-400"
                        >
                            {contactInfo.phone}
                        </button>
                    </div>
                </section>
            </main>

            {/* Home Indicator */}
            {showHomeIndicator && (
                <div className="fixed left-0 bottom-[9px] w-full h-[27px]">
                    <div className="absolute top-px left-0 w-full h-[26px] bg-black" />
                    <div className="absolute top-[calc(50.00%_+_2px)] left-[calc(50.00%_-_68px)] w-[135px] h-[5px] bg-white rounded-[100px]" />
                </div>
            )}
        </div>
    );
};
