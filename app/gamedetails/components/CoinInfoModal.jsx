import React from "react";

export const CoinInfoModal = ({ isVisible, onClose }) => {
    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[999999]">
            <div
                className="flex flex-col w-[335px] h-[315px] items-start pt-5 pb-0 px-0  bg-black rounded-[20px] border-t [border-top-style:solid] border-r [border-right-style:solid] border-l [border-left-style:solid] border-[#595959] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
                role="dialog"
                aria-labelledby="modal-title"
                aria-describedby="modal-description"
            >
                <header className="flex items-start justify-between pt-2 pb-0 px-4 relative self-stretch w-full flex-[0_0_auto] bg-black border-r [border-right-style:solid] border-l [border-left-style:solid] border-[#595959]">
                    <div className="relative w-[219px] h-6">
                        <h1
                            id="modal-title"
                            className="absolute top-0 left-0 [font-family:'Poppins',Helvetica] font-semibold text-white text-base tracking-[0] leading-[normal]"
                        >
                            💰 Coin Progress Guide
                        </h1>
                    </div>

                    <button
                        onClick={onClose}
                        className="relative flex-[0_0_auto] cursor-pointer hover:opacity-80 transition-opacity"
                        aria-label="Close dialog"
                    >
                        <img
                            alt="Close"
                            src="/assets/animaapp/2Z6cRMoo/img/close.svg"
                        />
                    </button>
                </header>

                <main className="flex flex-col h-64 items-start gap-6 px-4 py-5 relative self-stretch w-full bg-black rounded-[0px_0px_20px_20px] border-r [border-right-style:solid] border-b [border-bottom-style:solid] border-l [border-left-style:solid] border-[#595959]">
                    <div className="relative w-[305px] h-36 mr-[-2.00px]">
                        <div className="space-y-4">
                            <div>
                                <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-sm mb-2">
                                    📊 Progress Bar
                                </h3>
                                <p className="[font-family:'Poppins',Helvetica] font-normal text-white text-sm leading-5">
                                    Track your coins and XP progress. The green bar shows how close you are to reaching the next milestone.
                                </p>
                            </div>

                            <div>
                                <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-sm mb-2">
                                    🎯 Milestone Requirement
                                </h3>
                                <p className="[font-family:'Poppins',Helvetica] font-normal text-white text-sm leading-5">
                                    Complete level 6 to unlock the "End & Claim Rewards" button and transfer your earnings to your wallet.
                                </p>
                            </div>

                            <div>
                                <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-sm mb-2">
                                    💎 Current Balance
                                </h3>
                                <p className="[font-family:'Poppins',Helvetica] font-normal text-white text-sm leading-5">
                                    Your current coin balance is displayed at the top. This updates as you earn rewards through gameplay.
                                </p>
                            </div>
                        </div>
                    </div>


                </main>
            </div>
        </div>
    );
};
