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
            imageClasses: "absolute top-[0%] left-[52%] w-[45%] h-[83%] aspect-[1]",
            titleClasses:
                "absolute top-[48%] left-[10%] [font-family:'Poppins',Helvetica] font-semibold text-white text-xs tracking-[-0.12px] leading-[normal]",
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
                "absolute top-[-10%] left-[58%] w-[38%] h-[95%] aspect-[0.82]",
            titleClasses:
                "absolute top-[38%] left-[10%] [font-family:'Poppins',Helvetica] font-semibold text-white text-xs tracking-[-0.12px] leading-4",
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
                "absolute top-[1%] left-[55%] w-[45%] h-[83%] aspect-[1] object-cover",
            titleClasses:
                "absolute top-[48%] left-[10%] [font-family:'Poppins',Helvetica] font-semibold text-white text-xs tracking-[-0.12px] leading-[normal]",
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
            imageClasses: "absolute top-[0%] left-[52%] w-[45%] h-[83%] aspect-[1]",
            titleClasses:
                "absolute top-[48%] left-[10%] [font-family:'Poppins',Helvetica] font-semibold text-white text-xs tracking-[-0.12px] leading-[normal]",
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
            <div className="relative cursor-pointer transition-transform duration-200 hover:scale-105 active:scale-95 w-full overflow-hidden rounded-md"
                key={feature.id}
                style={{ aspectRatio: "156 / 84" }}
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
                    className={feature.id === 4
                        ? "absolute top-[8%] left-[58%] w-[38%] h-[55%] rounded-full"
                        : "absolute top-[17%] left-[62%] w-[33%] h-[46%] rounded-full"}
                    style={{ backgroundColor: feature.bgColor }}
                />

                <img
                    className={feature.id === 4
                        ? "absolute top-[3%] left-0 w-full h-[97%]"
                        : "absolute top-[15%] left-0 w-full h-[84%]"}
                    alt="Rectangle"
                    src={feature.rectangleImage1}
                    loading="lazy"
                    decoding="async"
                />

                <img
                    className={feature.id === 4
                        ? "absolute top-[7%] left-0 w-full h-[93%]"
                        : "absolute top-[20%] left-0 w-full h-[80%]"}
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
                    <div className="absolute top-[-2%] left-[46%] w-[52%] h-[92%]">
                        <div className="absolute top-[62%] left-[15%] w-[80%] h-[59%] rounded-b-lg border border-solid border-[#c41f24] bg-[linear-gradient(270deg,rgba(250,97,87,1)_0%,rgba(197,32,36,1)_10%,rgba(205,50,54,1)_92%,rgba(250,97,87,1)_100%)]" />

                        <img
                            className="absolute top-[25%] left-[5%] w-[90%] h-[29%]"
                            alt="Union"
                            src="https://c.animaapp.com/En0DOTZF/img/union.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <div className="absolute top-[55%] left-[10%] w-[80%] h-[8%] bg-black opacity-10" />

                        <div className="absolute top-[38%] left-[5%] w-[85%] h-[16%] rounded-b-md bg-[linear-gradient(90deg,rgba(250,97,87,1)_0%,rgba(205,50,54,1)_9%,rgba(205,50,54,1)_88%,rgba(250,97,87,1)_100%)]" />

                        <img
                            className="absolute top-[20%] left-[15%] w-[80%] h-[15%]"
                            alt="Rectangle"
                            src="https://c.animaapp.com/En0DOTZF/img/rectangle-2318.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        {feature.id !== 4 && (
                            <img
                                className="absolute top-[15%] left-[75%] w-[20%] h-[22%]"
                                alt="Vector"
                                src="https://c.animaapp.com/En0DOTZF/img/vector-1.svg"
                                loading="lazy"
                                decoding="async"
                            />
                        )}

                        <img
                            className="absolute top-[15%] left-0 w-[20%] h-[22%]"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-9.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <img
                            className="absolute top-0 left-[48%] w-[32%] h-[29%]"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-6.png"
                            loading="lazy"
                            decoding="async"
                        />

                        <img
                            className="absolute top-0 left-[15%] w-[32%] h-[29%]"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-8.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <img
                            className="absolute top-[15%] left-[50%] w-[25%] h-[14%]"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-4.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <img
                            className="absolute top-[15%] left-[17%] w-[25%] h-[14%]"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-5.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <img
                            className="absolute top-[20%] left-[38%] w-[18%] h-[16%]"
                            alt="Vector"
                            src="https://c.animaapp.com/En0DOTZF/img/vector-3.svg"
                            loading="lazy"
                            decoding="async"
                        />

                        <div className="absolute top-[25%] left-[38%] w-[18%] h-[60%] rounded-md border border-solid border-[#c52024] bg-[linear-gradient(180deg,rgba(255,107,57,1)_0%,rgba(251,195,62,1)_13%,rgba(251,195,62,1)_68%,rgba(255,107,57,1)_100%)]" />
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
                        className="hidden"
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

            <div className="grid grid-cols-2 gap-3 w-full">
                {features.map((feature) => renderFeatureCard(feature))}
            </div>
        </section>
    );
};

export default FeaturesSection;

