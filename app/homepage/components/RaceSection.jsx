"use client";
import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RaceModal } from "../../../components/RaceModel";

const RaceSection = () => {
    const router = useRouter();
    const [isRaceModalOpen, setIsRaceModalOpen] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isRaceModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isRaceModalOpen]);

    // Handle Escape key to close modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isRaceModalOpen) {
                setIsAnimating(false);
                setTimeout(() => {
                    setIsRaceModalOpen(false);
                }, 500);
            }
        };
        if (isRaceModalOpen) {
            window.addEventListener('keydown', handleEscape);
        }
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isRaceModalOpen]);

    // Open the Race overview. The user can start and choose a game from there.
    const handleRaceClick = useCallback(() => {
        router.push('/Race');
    }, [router]);

    // Open the tooltip/modal
    const handleModalOpen = useCallback(() => {
        setIsRaceModalOpen(true);
        // Small delay to ensure DOM is updated before animation starts
        setTimeout(() => {
            setIsAnimating(true);
        }, 100);
    }, []);

    // Close the tooltip/modal
    const handleModalClose = useCallback(() => {
        setIsAnimating(false);
        // Delay closing to allow animation to complete
        setTimeout(() => {
            setIsRaceModalOpen(false);
        }, 500);
    }, []);

    // Memoize SVG icon - smaller size
    const infoIconSvg = useMemo(() => (
        <svg width="24" height="24" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0L28 0C32.4183 0 36 3.58172 36 8V36H8C3.58172 36 0 32.4183 0 28L0 0Z" fill="#2C1D87" />
            <path fillRule="evenodd" clipRule="evenodd" d="M29.52 18.0005C29.52 21.0558 28.3063 23.9859 26.1459 26.1463C23.9854 28.3068 21.0553 29.5205 18 29.5205C14.9447 29.5205 12.0145 28.3068 9.85411 26.1463C7.69369 23.9859 6.47998 21.0558 6.47998 18.0005C6.47998 14.9452 7.69369 12.015 9.85411 9.8546C12.0145 7.69418 14.9447 6.48047 18 6.48047C21.0553 6.48047 23.9854 7.69418 26.1459 9.8546C28.3063 12.015 29.52 14.9452 29.52 18.0005ZM19.44 12.2405C19.44 12.6224 19.2883 12.9886 19.0182 13.2587C18.7482 13.5288 18.3819 13.6805 18 13.6805C17.6181 13.6805 17.2518 13.5288 16.9817 13.2587C16.7117 12.9886 16.56 12.6224 16.56 12.2405C16.56 11.8586 16.7117 11.4923 16.9817 11.2222C17.2518 10.9522 17.6181 10.8005 18 10.8005C18.3819 10.8005 18.7482 10.9522 19.0182 11.2222C19.2883 11.4923 19.44 11.8586 19.44 12.2405ZM16.56 16.5605C16.1781 16.5605 15.8118 16.7122 15.5417 16.9822C15.2717 17.2523 15.12 17.6186 15.12 18.0005C15.12 18.3824 15.2717 18.7486 15.5417 19.0187C15.8118 19.2888 16.1781 19.4405 16.56 19.4405V23.7605C16.56 24.1424 16.7117 24.5086 16.9817 24.7787C17.2518 25.0488 17.6181 25.2005 18 25.2005H19.44C19.8219 25.2005 20.1882 25.0488 20.4582 24.7787C20.7283 24.5086 20.88 24.1424 20.88 23.7605C20.88 23.3786 20.7283 23.0123 20.4582 22.7422C20.1882 22.4722 19.8219 22.3205 19.44 22.3205V18.0005C19.44 17.6186 19.2883 17.2523 19.0182 16.9822C18.7482 16.7122 18.3819 16.5605 18 16.5605H16.56Z" fill="#8B92DF" />
        </svg>
    ), []);

    return (
        <div className="flex flex-col w-full items-start gap-2 relative">
            <div
                className="h-36 rounded-[20px] overflow-hidden bg-[linear-gradient(51deg,rgba(88,41,171,1)_0%,rgba(59,41,171,1)_100%)] relative w-full cursor-pointer hover:opacity-95 transition-opacity duration-200"
                onClick={handleRaceClick} // Go to /Race on main card click
            >
                <div className="relative w-[371px] h-[198px] -top-4 left-2">
                    <div
                        className="top-[81px] left-1 font-normal absolute [font-family:'Poppins',Helvetica] text-white text-base tracking-[0] leading-6 whitespace-nowrap pointer-events-none"
                    >
                        Take Part & Win
                    </div>
                    <div className="absolute w-[371px] h-[198px] top-0 left-0">
                        <div
                            className="top-[107px] left-1 text-[#fff57f] absolute [font-family:'Poppins',Helvetica] font-semibold text-[26px] tracking-[0] leading-6 whitespace-nowrap pointer-events-none"
                        >
                            Exciting Rewards
                        </div>
                        <img
                            className="absolute w-[198px] h-[198px] top-0 left-[173px] aspect-[1] object-cover pointer-events-none"
                            alt="Race character"
                            src="https://c.animaapp.com/xCaMzUYh/img/image-219@2x.png"
                            loading="eager"
                            decoding="async"
                            width="198"
                            height="198"
                        />
                        <img
                            className="absolute w-[211px] h-[42px] top-[38px] left-0 mix-blend-lighten pointer-events-none"
                            alt="Race banner"
                            src="https://c.animaapp.com/xCaMzUYh/img/banner---don-t-remove@2x.png"
                            loading="eager"
                            decoding="async"
                            width="211"
                            height="42"
                        />
                    </div>
                </div>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        handleModalOpen();
                    }}
                    className="absolute w-8 h-8 top-[-4px] right-[-4px] z-20 cursor-pointer hover:opacity-80 transition-opacity duration-200 rounded-tr-lg rounded-bl-lg overflow-hidden flex items-center justify-center"
                    aria-label="More information"
                >
                    {infoIconSvg}
                </button>
            </div>

            <RaceModal
                isOpen={isRaceModalOpen}
                isAnimating={isAnimating}
                onClose={handleModalClose}
                token={typeof window !== 'undefined' ? (localStorage.getItem('authToken') || localStorage.getItem('x-auth-token')) : null}
            />
        </div>
    );
};

export default RaceSection;
