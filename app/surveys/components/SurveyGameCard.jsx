import React from 'react'

const SurveyCard = React.memo(({
    survey,
    showBorder = true,
    className = "",
    onClick,
    onStart,
    isEmpty = false,
    isCompleted = false
}) => {
    if (!survey && !isEmpty) return null;

    const handleClick = (e) => {
        const handler = onStart || onClick;
        if (handler && !isCompleted) {
            handler(survey, e)
        }
    }

    if (isEmpty) {
        return (
            <div className="flex flex-col items-center justify-center w-full py-8 px-4">
                <div className="w-16 h-16 mb-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2 text-center">
                    No Surveys Available
                </h3>
                <p className="text-gray-400 text-sm text-center mb-4 max-w-[280px]">
                    Check back later for new survey opportunities to earn XP and coins!
                </p>
                <div className="flex items-center gap-2 text-purple-400 text-sm">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Earn coins and XP with every survey!</span>
                </div>
            </div>
        )
    }

    const coins = survey.coinReward || survey.userRewardCoins || 0;
    const xp = survey.userRewardXP || 0;
    const estimatedTime = survey.estimatedTime || survey.loi || survey.length || 5;
    const title = survey.title || survey.name || "Survey";
    const description = survey.description || "Earn Loyalty Coins By Participating";
    const thumbnail = survey.thumbnail || survey.image || "";

    return (
        <article
            className="relative w-[335px] h-[121px] bg-black rounded-[10px] shadow-[2.48px_2.48px_18.58px_#a6aabc4c,-1.24px_-1.24px_16.1px_#f9faff1a] border border-white/10"
        >
            <div className="absolute top-[calc(50.00%_-_18px)] flex w-[91.64%] items-center justify-between pt-0 pb-4 px-0 left-[4.18%]">
                <div className="inline-flex items-center gap-2 relative">
                    <div className="w-[55px] h-[55px] rounded-full overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        {thumbnail ? (
                            <img
                                className="w-full h-full object-cover"
                                alt={`${title} survey icon`}
                                src={thumbnail}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        ) : (
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                        )}
                    </div>

                    <div className="flex flex-col w-[124px] items-start justify-center gap-1 relative">

                        <p className="[font-family:'Poppins-Regular',Helvetica] font-normal text-white text-[13px] tracking-[0] leading-5">
                            {description}
                        </p>
                        {estimatedTime && (
                            <span className="[font-family:'Poppins-Regular',Helvetica] font-normal text-gray-400 text-[13px] tracking-[0] leading-5">
                                {estimatedTime} min
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        aria-label="Start survey"
                        className="box-border inline-flex items-center justify-center p-2 relative rounded-lg overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            const handler = onStart || onClick;
                            if (handler) {
                                handler(survey, e);
                            }
                        }}
                    >
                        <span className="relative flex items-center justify-center w-[89px] h-3.5 mt-[-1.30px] [font-family:'Poppins-Regular',Helvetica] font-normal text-white text-[13px] text-center tracking-[0] leading-[normal] whitespace-nowrap">
                            Start Survey
                        </span>
                    </button>
                </div>
            </div>
            <div className="absolute top-0 -left-px min-w-[140px] h-[29px] rounded-[10px_0px_10px_0px] overflow-hidden bg-[linear-gradient(180deg,rgba(158,173,247,0.6)_0%,rgba(113,106,231,0.6)_100%)]">
                <div className="absolute top-1.5 left-[9px] flex items-center gap-1">
                    {(coins > 0 || xp > 0) && (
                        <span className="[font-family:'Poppins-Regular',Helvetica] font-normal text-white text-[13px] tracking-[0] leading-5 whitespace-nowrap">
                            Up to
                        </span>
                    )}
                    {coins > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="[font-family:'Poppins-Regular',Helvetica] font-normal text-white text-[13px] tracking-[0] leading-5 whitespace-nowrap">
                                {coins}
                            </span>
                            <img
                                className="w-[14px] h-[14px]"
                                alt="Coin"
                                src="/dollor.png"
                            />
                        </div>
                    )}
                    {xp > 0 && (
                        <div className="flex items-center gap-1">
                            <span className="[font-family:'Poppins-Regular',Helvetica] font-normal text-white text-[13px] tracking-[0] leading-5 whitespace-nowrap">
                                {xp}
                            </span>
                            <img
                                className="w-[14px] h-[14px]"
                                alt="XP"
                                src="/xp.svg"
                            />
                        </div>
                    )}
                </div>
            </div>
        </article>
    )
});

SurveyCard.displayName = 'SurveyCard';

export default SurveyCard;