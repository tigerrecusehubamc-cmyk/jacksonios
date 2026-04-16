import React from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

/**
 * Reusable Page Header Component with Back Button
 * Same styling as MyProfile page for consistency
 * 
 * @param {string} title - The page title to display
 * @param {function} onBack - Optional custom back handler (defaults to router.back())
 * @param {React.ReactNode} rightElement - Optional element to display on the right (e.g., coin balance)
 * @param {string} className - Optional additional classes for the header
 * @param {boolean} showBack - Optional flag to show/hide back button (defaults to true)
 */
export const PageHeader = ({ title, onBack, rightElement, className = "", showBack = true }) => {
    const router = useRouter();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else {
            router.back();
        }
    };

    return (
        <header className={`flex flex-col w-full items-start gap-2 px-0 py-3 mb-4 `}>
            <div className="flex items-center justify-between gap-4 w-full">
                <div className="flex items-center gap-4">
                    {showBack && (
                        <button
                            className="relative w-6 h-6 flex-shrink-0"
                            aria-label="Go back"
                            onClick={handleBack}
                        >
                            <Image
                                width={24}
                                height={24}
                                className="w-6 h-6"
                                alt="Back"
                                src="/assets/animaapp/V1uc3arn/img/arrow-back-ios-new-2x.png"
                            />
                        </button>
                    )}

                    <h1 className="font-semibold text-white text-xl leading-5">
                        {title}
                    </h1>
                </div>

                {/* Optional right element (e.g., coin balance) */}
                {rightElement && (
                    <div className="flex-shrink-0">
                        {rightElement}
                    </div>
                )}
            </div>
        </header>
    );
};

export default PageHeader;

