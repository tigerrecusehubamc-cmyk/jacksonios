import React, { useState } from 'react'

const NonGamingOffersCarousel = ({ offers = [], className = "" }) => {
    const [activeIndex, setActiveIndex] = useState(1)
    const totalCards = offers.length

    const HORIZONTAL_SPREAD = 120

    // Helper to format title with a line break before the last word
    const formatTitle = (title) => {
        const words = title.split(' ')
        if (words.length <= 1) return title
        const lastWord = words.pop()
        return <>{words.join(' ')}<br />{lastWord}</>
    }

    if (offers.length === 0) {
        return (
            <div className={`w-full max-w-[335px] h-[255px] mx-auto flex flex-col items-center ${className}`}>
                <div className="w-full h-[24px] px-4 mb-2.5 mr-1">
                    <h2 className="font-['Poppins',Helvetica] text-[16px] mr-1 font-semibold leading-normal tracking-[0] text-[#FFFFFF]">
                        Non-Gaming Offers
                    </h2>
                </div>
                <div className="flex items-center justify-center h-[220px]">
                    <p className="text-white text-center">No offers available</p>
                </div>
            </div>
        )
    }

    return (
        <div className={`w-full max-w-[335px] h-[255px] mx-auto flex flex-col items-center ${className}`}>
            <div className="w-full h-[24px] px-4 mb-2.5 mr-1">
                <h2 className="font-['Poppins',Helvetica] text-[16px] mr-1 font-semibold leading-normal tracking-[0] text-[#FFFFFF]">
                    Non-Gaming Offers
                </h2>
            </div>


            <div className="relative w-full h-[220px] overflow-hidden">
                {offers.map((offer, index) => {
                    const offset = index - activeIndex

                    const cardStyle = {
                        transform: `translateX(calc(-50% + ${offset * HORIZONTAL_SPREAD}px)) scale(${offset === 0 ? 1 : 0.75})`,
                        zIndex: totalCards - Math.abs(offset),
                        opacity: offset === 0 ? 1 : 0.7,
                        transition: 'all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    }

                    return (
                        <div
                            key={offer.id}
                            // The ONLY way to change the active card is by clicking.
                            onClick={() => setActiveIndex(index)}
                            className="absolute top-0 left-1/2 cursor-pointer"
                            style={cardStyle}
                        >
                            {/* Card content - using your provided styles */}
                            <div className="relative h-[220px] w-[165px]">
                                <img
                                    className="absolute inset-0 h-full w-full"
                                    alt=""
                                    src={offer.bgImage}
                                    loading="eager"
                                    decoding="async"
                                    width="165"
                                    height="220"
                                />
                                <img
                                    className="absolute bottom-0 h-[57px] w-full object-cover"
                                    alt=""
                                    src={offer.bottomBg}
                                    loading="eager"
                                    decoding="async"
                                    width="165"
                                    height="57"
                                />
                                <div className="absolute bottom-2 left-0 right-0 text-center font-['Poppins',Helvetica] text-base font-semibold leading-5 tracking-[0] text-white">
                                    {formatTitle(offer.name)}
                                </div>
                                <img
                                    className="absolute top-20px left-1/2 h-[153px] w-[164px] -translate-x-1/2 object-full rounded-[10px]"
                                    alt={`${offer.name} app preview`}
                                    src={offer.image}
                                    loading="eager"
                                    decoding="async"
                                    width="164"
                                    height="153"
                                />
                                <div className="absolute top-[127px] left-1/2 flex h-[29px] w-[120px] -translate-x-1/2 items-center justify-center rounded-[10px] bg-gradient-to-b from-[#9EADF7] to-[#716AE7]">
                                    <span className="font-['Poppins',Helvetica] text-[13px] font-medium leading-normal tracking-[0] text-white">
                                        {offer.earnAmount}
                                    </span>
                                    <img
                                        className="ml-1.5 h-[15px] w-[15px]"
                                        alt="$"
                                        src="/assets/animaapp/xCaMzUYh/img/image-3937-2-2x.png"
                                        loading="eager"
                                        decoding="async"
                                        width="15"
                                        height="15"
                                    />
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default NonGamingOffersCarousel
