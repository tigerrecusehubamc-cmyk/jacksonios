import React from "react";

export const BannerSection = ({ calendar, today, onDayClick, onPreviousMonth, onNextMonth, onTodayClick, isDisabled = false }) => {
    const daysOfWeek = [
        { label: "Su", key: "su" },
        { label: "Mo", key: "mo" },
        { label: "Tu", key: "tu" },
        { label: "We", key: "we" },
        { label: "Th", key: "th" },
        { label: "Fr", key: "fr" },
        { label: "Sa", key: "sa" },
    ];

    // Process real calendar data from API
    const processCalendarData = (apiData) => {
        if (!apiData?.calendarDays) {
            return null;
        }

        return apiData.calendarDays.map((dayData, index) => {
            // Support both old (day) and new (dayNumber) API format
            const dayNum = dayData.dayNumber || dayData.day;
            const dayNumber = parseInt(dayNum);
            const row = Math.floor(index / 7);
            const col = index % 7;

            return {
                day: dayNum ? dayNum.toString() : "", // Convert to string for display
                row,
                col,
                isToday: dayData.isToday,
                isCompleted: dayData.isCompleted || dayData.progress?.status === 'completed',
                isMissed: dayData.isMissed,
                isLocked: dayData.isLocked,
                isClickable: dayData.isClickable,
                isFuture: dayData.isFuture,
                isPast: dayData.isPast,
                isCurrentMonth: !dayData.isFuture && !dayData.isPast,
                isPrevMonth: dayData.isPast,
                isNextMonth: dayData.isFuture,
                challenge: dayData.challenge,
                progress: dayData.progress,
                isMilestone: dayData.isMilestone,
                date: dayData.date,
                dayOfWeek: dayData.dayOfWeek
            };
        });
    };

    // Use only processed calendar data from API
    const calendarDays = processCalendarData(calendar) || [];


    const getDayClasses = (dayData) => {
        let baseClasses =
            "absolute w-[31px] h-[31px] flex items-center justify-center m-1 mb-2";

        const topPositions = [
            "top-[calc(50.00%_-_86px)]",
            "top-[calc(50.00%_-_51px)]",
            "top-[calc(50.00%_-_16px)]",
            "top-[calc(50.00%_+_19px)]",
            "top-[calc(50.00%_+_54px)]",
            "top-[calc(50.00%_+_89px)]",
        ];

        const leftPositions = [
            "left-[calc(50.00%_-_142px)]",
            "left-[calc(50.00%_-_100px)]",
            "left-[calc(50.00%_-_58px)]",
            "left-[calc(50.00%_-_16px)]",
            "left-[calc(50.00%_+_26px)]",
            "left-[calc(50.00%_+_69px)]",
            "left-[calc(50.00%_+_111px)]",
        ];

        baseClasses += ` ${topPositions[dayData.row]} ${leftPositions[dayData.col]}`;

        // Handle completed days with friendly green background and white text
        if (dayData.isCompleted) {
            baseClasses += " bg-green-500 rounded-md text-white font-bold";
        }

        // Handle today's date with thin blue border
        if (dayData.isToday) {
            baseClasses += " border border-blue-500 rounded-md";

            // Add fire icon for clickable today
            if (dayData.isClickable) {
                baseClasses += " after:content-['🔥'] after:absolute after:top-[-5px] after:right-[-5px] after:text-xs";
            }
        }

        // Handle missed dates with grey background
        if (dayData.isMissed) {
            baseClasses += " bg-gray-500 rounded-md";
        }

        // Handle locked dates with lock icons
        if (dayData.isLocked) {
            baseClasses += " opacity-50";

            // Add lock icon for future dates
            if (dayData.isFuture) {
                baseClasses += " after:content-['🔒'] after:absolute after:top-[-5px] after:right-[-5px] after:text-xs";
            }
        }

        return baseClasses;
    };

    const getTextClasses = (dayData) => {
        let textClasses =
            "flex items-center justify-center [font-family:'Prompt',Helvetica] text-[12.6px] text-center tracking-[0] leading-[normal]";

        // Handle different day states with dynamic colors matching Figma
        if (dayData.isFuture || dayData.isNextMonth) {
            textClasses += " mt-[-0.2px] h-[19px] font-normal text-gray-400";
        } else if (dayData.isPast || dayData.isPrevMonth) {
            textClasses += " mt-[-0.2px] h-[19px] font-normal text-gray-400";
        } else if (dayData.isCurrentMonth) {
            if (dayData.isToday) {
                textClasses += " mt-[-0.2px] h-[19px] font-semibold text-white";
            } else if (dayData.isCompleted) {
                textClasses += " mt-[-0.2px] h-[19px] font-normal text-white";
            } else if (dayData.isMissed || dayData.isLocked) {
                textClasses += " mt-[-0.2px] h-[19px] font-normal text-gray-500";
            } else {
                textClasses += " mt-[-0.2px] h-[19px] font-normal text-white";
            }
        }

        // Add positioning classes based on column
        if (dayData.col === 0 || dayData.col === 2 || dayData.col === 4 || dayData.col === 6) {
            textClasses += " ml-[-0.6px] w-[15px]";
        } else if (dayData.col === 1) {
            textClasses += " ml-[-1.6px] w-3";
        } else if (dayData.col === 3) {
            textClasses += " ml-[-0.6px] w-[13px]";
        } else {
            textClasses += " ml-[-1.6px] w-4";
        }

        return textClasses;
    };

    return (
        <section className={`flex flex-col w-full max-w-[335px] h-[343px] items-center gap-2.5 ${isDisabled ? 'pointer-events-none opacity-90' : ''}`}>
            <article
                className="relative w-full max-w-[335px] h-[343px] rounded-[17.96px] border-[none] shadow-[inset_4.49px_4.49px_10.78px_#ffffff66,inset_-4.49px_-4.49px_13.47px_#00000075] backdrop-blur-[38.17px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(38.17px)_brightness(100%)]"
                style={{
                    background: calendar?.streak?.current
                        ? `linear-gradient(322deg, rgba(254,248,255,${Math.min(calendar.streak.current / 30, 0.3)})_0%, rgba(254,248,255,0)_100%)`
                        : 'linear-gradient(322deg,rgba(254,248,255,0.21)_0%,rgba(254,248,255,0)_100%)',
                    position: 'relative'
                }}
            >
                {/* Dynamic border gradient - top and left */}
                <div
                    className="absolute inset-0 rounded-[17.96px] pointer-events-none"
                    style={{
                        padding: '1.35px',
                        background: calendar?.streak?.current
                            ? `linear-gradient(139deg, rgba(255,255,255,${Math.min(calendar.streak.current / 30, 0.4)})_0%, rgba(255,255,255,0)_100%)`
                            : 'linear-gradient(139deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0)_100%)',
                        WebkitMask: 'linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                        zIndex: 1
                    }}
                />

                {/* Additional border for right and bottom */}
                <div
                    className="absolute inset-0 rounded-[17.96px] pointer-events-none"
                    style={{
                        padding: '1.35px',
                        background: calendar?.streak?.current
                            ? `linear-gradient(322deg, rgba(255,255,255,${Math.min(calendar.streak.current / 30, 0.4)})_0%, rgba(255,255,255,0)_100%)`
                            : 'linear-gradient(322deg,rgba(255,255,255,0.28)_0%,rgba(255,255,255,0)_100%)',
                        WebkitMask: 'linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)',
                        WebkitMaskComposite: 'xor',
                        maskComposite: 'exclude',
                        zIndex: 1
                    }}
                />
                <header className="absolute top-[calc(50.00%_-_146px)] left-[calc(50.00%_-_134px)] w-[272px] h-[30px]">
                    <button
                        type="button"
                        aria-label="Previous month"
                        className={`absolute top-[calc(50.00%_-_15px)] left-[calc(50.00%_-_136px)] w-[30px] h-[30px] transition-opacity ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                        onClick={isDisabled ? undefined : onPreviousMonth}
                        disabled={isDisabled}
                    >
                        <img
                            className="w-full h-full"
                            alt=""
                            src="/assets/animaapp/b23YVSTi/img/group-1-2x.png"
                            loading="eager"
                            decoding="async"
                            width="30"
                            height="30"
                        />
                    </button>

                    <button
                        type="button"
                        aria-label="Previous"
                        className="absolute top-[calc(50.00%_-_2px)] left-[calc(50.00%_-_22px)] w-1.5 h-1"
                    >

                    </button>

                    <h2 className="absolute top-[calc(50.00%_-_10px)] left-[calc(50.00%_-_94px)]  ml-4 h-5 flex items-center justify-center [font-family:'Poppins',Helvetica] font-semibold text-white text-[13px] text-center tracking-[0] leading-[normal]">
                        {calendar?.monthName || ""}
                    </h2>

                    <button
                        type="button"
                        className={`absolute top-[calc(50.00%_-_10px)] left-[calc(50.00%_+_88px)] h-5 flex items-center justify-center [font-family:'Poppins',Helvetica] font-medium text-white text-[13px] text-right tracking-[0] leading-[normal] transition-opacity ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}`}
                        onClick={isDisabled ? undefined : onTodayClick}
                        disabled={isDisabled}
                    >
                        TODAY
                    </button>

                    <button
                        type="button"
                        aria-label="Next month"
                        className={`absolute top-[calc(50.00%_-_15px)] left-[calc(50.00%_+_2px)] w-[30px] h-[30px] transition-opacity ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80'}`}
                        onClick={isDisabled ? undefined : onNextMonth}
                        disabled={isDisabled}
                    >
                        <img
                            className="w-full h-full"
                            alt=""
                            src="/assets/animaapp/b23YVSTi/img/group-2-2x.png"
                            loading="eager"
                            decoding="async"
                            width="30"
                            height="30"
                        />
                    </button>
                </header>

                {/* Dynamic background gradient based on streak progress */}
                <div
                    className="absolute top-[calc(50.00%_+_41px)] left-[calc(50.00%_-_104px)] w-[250px] h-[39px] rounded-[9.88px]"
                    style={{
                        background: calendar?.streak?.current
                            ? `radial-gradient(50%_50%_at_71%_46%, rgba(182,216,70,${Math.min(calendar.streak.current / 30, 0.3)})_0%, rgba(182,223,139,${Math.min(calendar.streak.current / 30, 0.3)})_100%)`
                            : 'radial-gradient(50%_50%_at_71%_46%, rgba(182,216,70,0.09)_0%, rgba(182,223,139,0.09)_100%)'
                    }}
                />

                <div className="absolute top-[calc(50.00%_-_95px)] left-[calc(50.00%_-_142px)] w-[285px] h-[242px]">
                    <div className="absolute top-[calc(50.00%_-_121px)] left-[calc(50.00%_-_142px)] w-[285px] h-[31px] flex">
                        {daysOfWeek.map((day, index) => {
                            const leftPositions = [
                                "left-[calc(50.00%_-_142px)]",
                                "left-[calc(50.00%_-_100px)]",
                                "left-[calc(50.00%_-_58px)]",
                                "left-[calc(50.00%_-_16px)]",
                                "left-[calc(50.00%_+_26px)]",
                                "left-[calc(50.00%_+_69px)]",
                                "left-[calc(50.00%_+_111px)]",
                            ];

                            return (
                                <div
                                    key={day.key}
                                    className={`absolute top-0 ${leftPositions[index]} w-[31px] h-[31px] flex items-center justify-center`}
                                >
                                    <div
                                        className="mt-[-1.2px] h-4 font-semibold text-[10.8px] flex items-center justify-center [font-family:'Prompt',Helvetica] text-center tracking-[0] leading-[normal] text-[#d7deff]"
                                    >
                                        {day.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {calendarDays.map((dayData, index) => {
                        // Handle completed days with special styling
                        if (dayData.isCompleted) {
                            return (
                                <div
                                    key={index}
                                    className={`${getDayClasses(dayData)} ${!isDisabled && dayData.isToday ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                    onClick={() => {
                                        if (!isDisabled && dayData.isClickable && onDayClick) {
                                            onDayClick(dayData);
                                        }
                                    }}
                                >
                                    <div className={getTextClasses(dayData)}>{dayData.day}</div>
                                </div>
                            );
                        }

                        // Handle days with icons (milestones, special events)
                        if (dayData.isMilestone || dayData.hasIcon) {
                            return (
                                <div
                                    key={index}
                                    className={`${getDayClasses(dayData)} ${!isDisabled && dayData.isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                    onClick={() => {
                                        if (!isDisabled && dayData.isClickable && onDayClick) {
                                            onDayClick(dayData);
                                        }
                                    }}
                                >
                                    <div className={getTextClasses(dayData)}>{dayData.day}</div>
                                    {/* <div className="absolute top-[19px] left-[19px] w-3 h-3">
                                        <img
                                            className="absolute top-px left-px w-2.5 h-2.5 aspect-[1] object-cover"
                                            alt=""
                                            src=""
                                        />

                                    </div> */}
                                </div>
                            );
                        }

                        // Handle regular days
                        return (
                            <div
                                key={index}
                                className={`${getDayClasses(dayData)} ${!isDisabled && dayData.isClickable ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                onClick={() => {
                                    if (!isDisabled && dayData.isClickable && onDayClick) {
                                        onDayClick(dayData);
                                    }
                                }}
                            >
                                <div className={getTextClasses(dayData)}>{dayData.day}</div>
                            </div>
                        );
                    })}
                </div>
            </article>
        </section>
    );
};
