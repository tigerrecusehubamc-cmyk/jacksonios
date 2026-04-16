import React from "react";
import { createPortal } from "react-dom";

export const RulesModal = ({ isVisible, onClose }) => {
    if (!isVisible) return null;

    return createPortal(
        <div
            className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center"
            onClick={onClose}
        >
            <div
                className="flex flex-col w-[335px] max-w-[90vw] max-h-[90vh] items-start pt-5 pb-0 px-0 bg-black rounded-[20px] border border-[#595959]"
                role="dialog"
                aria-labelledby="modal-title"
                aria-describedby="modal-description"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-start justify-between pt-2 pb-0 px-4 self-stretch w-full bg-black border-x border-[#595959]">
                    <h1
                        id="modal-title"
                        className="[font-family:'Poppins',Helvetica] font-semibold text-white text-base tracking-[0] leading-[normal]"
                    >
                        Rules for claiming rewards
                    </h1>

                    <button
                        onClick={onClose}
                        className="flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                        aria-label="Close dialog"
                    >
                        <img
                            alt="Close"
                            src="/assets/animaapp/2Z6cRMoo/img/close.svg"
                        />
                    </button>
                </header>

                <main className="flex flex-col items-start gap-6 px-4 py-5 self-stretch w-full bg-black rounded-[0px_0px_20px_20px] border-x border-b border-[#595959]">
                    <p
                        id="modal-description"
                        className="[font-family:'Poppins',Helvetica] font-normal text-white text-base tracking-[0] leading-6"
                    >
                        Once you reach this level, you&apos;ll be eligible to end this
                        session and transfer your collected coins and XP to your wallet.
                        After claiming, you won&apos;t be able to return to this game&apos;s
                        reward flow. Choose wisely
                    </p>

                    <button
                        onClick={onClose}
                        className="self-stretch h-10 rounded-lg bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 [font-family:'Poppins',Helvetica] font-semibold text-white text-sm"
                    >
                        Okay, Got It!
                    </button>
                </main>
            </div>
        </div>,
        document.body
    );
};
