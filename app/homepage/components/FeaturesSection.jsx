"use client";
import React from "react";
import { useRouter } from "next/navigation";

const FeaturesSection = () => {
    const router = useRouter();

    const features = [
        {
            id: 1,
            title: "Surveys",
            // bgColor: "#8963f5",
            route: "/surveys",
            rectangleImage1:
                "https://c.animaapp.com/En0DOTZF/img/rectangle-41006.svg",
            rectangleImage2:
                "https://c.animaapp.com/En0DOTZF/img/rectangle-41001.svg",
            mainImage: "https://c.animaapp.com/En0DOTZF/img/image-4043-1@2x.png",
            imageClasses: "absolute top-px left-[81px] w-[70px] h-[70px] aspect-[1]",
            titleClasses:
                "absolute top-[41px] left-[17px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xs tracking-[-0.12px] leading-[normal]",
            hasComplexIcon: false,
        },

        {
            id: 2,
            title: "Daily\nrewards",
            // bgColor: "#0ca8de",
            route: "/Daily-Reward",
            rectangleImage1:
                "https://c.animaapp.com/En0DOTZF/img/rectangle-41006-1.svg",
            rectangleImage2:
                "https://c.animaapp.com/En0DOTZF/img/rectangle-41001-1.svg",
            mainImage: "https://c.animaapp.com/En0DOTZF/img/image-3938.png",
            imageClasses:
                "absolute top-[-3px] left-[97px] w-[50px] h-[61px] aspect-[0.82]",
            titleClasses:
                "absolute top-[33px] left-[17px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xs tracking-[-0.12px] leading-4",
            hasComplexIcon: false,
        },
        {
            id: 3,
            title: "Challenges",
            // bgColor: "#be8fff",
            route: "/dailychallenge",
            rectangleImage1:
                "https://c.animaapp.com/En0DOTZF/img/rectangle-41004-1.svg",
            rectangleImage2:
                "https://c.animaapp.com/En0DOTZF/img/rectangle-41005-1.svg",
            mainImage: "https://c.animaapp.com/En0DOTZF/img/image-4086@2x.png",
            imageClasses:
                "absolute top-1 left-[86px] w-[70px] h-[70px] aspect-[1] object-cover",
            titleClasses:
                "absolute top-[41px] left-[17px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xs tracking-[-0.12px] leading-[normal]",
            hasComplexIcon: false,
        },
        {
            id: 4,
            title: "Deal",
            bgColor: "#ecb305",
            route: "/deals",
            rectangleImage1:
                "https://c.animaapp.com/En0DOTZF/img/rectangle-41004.svg",
            rectangleImage2:
                "https://c.animaapp.com/En0DOTZF/img/rectangle-41005.svg",
            mainImage: "https://c.animaapp.com/En0DOTZF/img/image-4043-1@2x.png",
            imageClasses: "absolute top-px left-[81px] w-[70px] h-[70px] aspect-[1]",
            titleClasses:
                "absolute top-[41px] left-[17px] [font-family:'Poppins',Helvetica] font-semibold text-white text-xs tracking-[-0.12px] leading-[normal]",
            hasComplexIcon: true,
        },
    ];

    const handleFeatureClick = (route) => {
        if (route) {
            router.push(route);
        }
    };

    const renderFeatureCard = (feature) => {
        return (
            <div
                key={feature.id}
                className="relative w-[156px] h-[84px] cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95"
                onClick={() => handleFeatureClick(feature.route)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleFeatureClick(feature.route);
                    }
                }}
                aria-label={`Navigate to ${feature.title}`}
            >
                <div
                    className="absolute top-[15px] left-[97px] w-[52px] h-[39px] rounded-[26px/19.5px]"
                    style={{ backgroundColor: feature.bgColor }}
                />

                <img
                    className="absolute top-[13px] left-px w-[156px] h-[71px]"
                    alt="Rectangle"
                    src={feature.rectangleImage1}
                    loading="lazy"
                    decoding="async"
                />

                <img
                    className="absolute top-4 left-px w-[156px] h-[68px]"
                    alt="Rectangle"
                    src={feature.rectangleImage2}
                    loading="lazy"
                    decoding="async"
                />

                <div className={feature.titleClasses}>
                    {feature.title.split("\n").map((line, index) => (
                        <React.Fragment key={index}>
                            {line}
                            {index < feature.title.split("\n").length - 1 && <br />}
                        </React.Fragment>
                    ))}
                </div>

                {feature.hasComplexIcon ? (
                    <div className="absolute top-px left-[78px] w-[71px] h-[58px]">
                        <div className="absolute top-6 left-[11px] w-12 h-[34px] rounded-[0px_0px_9.63px_9.63px] border-[0.69px] border-solid border-[#c41f24] bg-[linear-gradient(270deg,rgba(250,97,87,1)_0%,rgba(197,32,36,1)_10%,rgba(205,50,54,1)_92%,rgba(250,97,87,1)_100%)]" />

                        <img
                            className="absolute top-2.5 left-2.5 w-[51px] h-[17px]"
                            alt="Union"
                            src="https://c.animaapp.com/En0DOTZF/img/union.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <div className="absolute top-[25px] left-3 w-[46px] h-[5px] bg-black opacity-10" />

                        <div className="absolute top-[18px] left-2.5 w-[49px] h-[9px] rounded-[0px_0px_3.44px_3.44px] bg-[linear-gradient(90deg,rgba(250,97,87,1)_0%,rgba(205,50,54,1)_9%,rgba(205,50,54,1)_88%,rgba(250,97,87,1)_100%)]" />

                        <img
                            className="absolute top-[11px] left-[11px] w-12 h-2"
                            alt="Rectangle"
                            src="https://c.animaapp.com/En0DOTZF/img/rectangle-2318.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        {feature.id !== 4 && (
                            <img
                                className="absolute top-[9px] left-[53px] w-5 h-[13px]"
                                alt="Vector"
                                src="https://c.animaapp.com/En0DOTZF/img/vector-1.svg"
                                loading="lazy"
                                decoding="async"
                            />
                        )}

                        <img
                            className="absolute top-[9px] -left-0.5 w-5 h-[13px]"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-9.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <img
                            className="absolute -top-px left-[37px] w-[23px] h-[17px]"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-6.png"
                            loading="lazy"
                            decoding="async"
                        />

                        <img
                            className="absolute -top-px left-[11px] w-[23px] h-[17px]"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-8.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <img
                            className="absolute top-[9px] left-[39px] w-[18px] h-2"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-4.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <img
                            className="absolute top-[9px] left-[13px] w-[18px] h-2"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-5.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <img
                            className="absolute top-1.5 left-[29px] w-3 h-[9px]"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-3.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <div className="absolute top-[13px] left-[29px] w-[13px] h-[46px] rounded-[5.5px] border-[0.69px] border-solid border-[#c52024] bg-[linear-gradient(180deg,rgba(255,107,57,1)_0%,rgba(251,195,62,1)_13%,rgba(251,195,62,1)_68%,rgba(255,107,57,1)_100%)]" />
                    </div>
                ) : (
                    <img
                        className={feature.imageClasses}
                        alt={feature.title}
                        src={feature.mainImage}
                        loading="lazy"
                        decoding="async"
                    />
                )}

                {feature.id === 3 && (
                    <img
                        className="absolute top-[-65591px] left-[16570px] w-[49px] h-[35px]"
                        alt="Vector"
                        src="/img/vector-4236.png"
                    />
                )}
            </div>
        );
    };

    return (
        <section
            className="flex flex-col items-start gap-2.5 pl-3 sm:pl-4 md:pl-5 pr-0 py-0 relative w-full max-w-full sm:max-w-[375px] mx-auto"
            data-model-id="2035:19015"
            aria-labelledby="features-heading"
        >
            <h2
                id="features-heading"
                className="relative w-fit mt-[-1.00px] [font-family:'Poppins',Helvetica] font-semibold text-white text-[16px] tracking-[0] leading-[normal]"
            >
                Features
            </h2>

            <div className="flex flex-col w-full sm:w-[331px] items-start  relative flex-[0_0_auto]">
                <div className="flex items-center gap-[19px] relative self-stretch w-full flex-[0_0_auto]">
                    {features.slice(0, 2).map((feature) => renderFeatureCard(feature))}
                </div>

                <div className="flex items-center  relative self-stretch w-full flex-[0_0_auto]">
                    {features.slice(2, 4).map((feature) => renderFeatureCard(feature))}
                </div>
            </div>
        </section>
    );
};

export default FeaturesSection;

