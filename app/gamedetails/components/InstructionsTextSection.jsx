import React, { useState } from "react";
import { normalizeGameDescription } from "@/lib/gameDataNormalizer";

export const InstructionsTextSection = ({ game }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Clean HTML tags from game description - use normalizer for both besitos and bitlab
    const rawDescription = normalizeGameDescription(game) || game?.description || game?.card_text || game?.details?.description || "No description available";
    const instructionText = rawDescription.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();

    const handleToggle = () => setIsExpanded(!isExpanded);

    return (
        <section className="flex flex-col w-[375px] items-start gap-1 px-6 py-2 relative flex-[0_0_auto]">
            <p
                className={`relative self-stretch mt-[-1.00px] [font-family:'Poppins',Helvetica] font-regular text-white text-[16px] tracking-[0] leading-6 ${isExpanded
                    ? "h-auto"
                    : "h-[72px] overflow-hidden text-ellipsis [display:-webkit-box] [-webkit-line-clamp:3] [-webkit-box-orient:vertical]"
                    }`}
            >
                {instructionText}
            </p>

            {!isExpanded && (
                <div className="absolute right-4 bottom-9 w-24 h-6 bg-[linear-gradient(270deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0)_100%)]" />
            )}

            <button
                onClick={handleToggle}
                className="relative w-fit [font-family:'Poppins',Helvetica] font-semibold text-white text-base tracking-[0] leading-6 whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded"
                aria-expanded={isExpanded}
                aria-label={isExpanded ? "Show less text" : "Show more text"}
            >
                {isExpanded ? "Less" : "More"}
            </button>
        </section>
    );
};
