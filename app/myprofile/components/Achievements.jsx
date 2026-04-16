import React from 'react'
import Image from 'next/image'
import { useSelector } from 'react-redux'

const Achievements = () => {

    const achievements = useSelector((state) => state.profile.achievements)
    const achievementsStatus = useSelector((state) => state.profile.achievementsStatus)


    // Show loading state
    if (achievementsStatus === 'loading') {
        return (
            <section className="flex flex-col w-full max-w-[335px] items-start gap-2.5 mx-auto">
                <div className="flex w-full items-center justify-between">
                    <div className="inline-flex items-center gap-2">
                        <Image
                            width={43}
                            height={44}
                            alt="Trophy"
                            src="/achivementtrophy.png"
                            loading="eager"
                            decoding="async"
                            priority
                        />
                        <h3 className="font-semibold text-white text-base">
                            Achievements
                        </h3>
                    </div>
                    <button className="font-medium text-[#8b92de] text-base">
                        See All
                    </button>
                </div>
                {[1, 2].map((i) => (
                    <div key={i} className="relative w-full max-w-[335px] h-[92px] bg-black rounded-[10px] animate-pulse">
                        <div className="absolute w-16 h-16 top-3.5 left-4 bg-gray-700 rounded"></div>
                        <div className="absolute top-[13px] left-[92px] w-32 h-4 bg-gray-700 rounded"></div>
                        <div className="absolute top-10 left-[92px] w-40 h-3 bg-gray-700 rounded"></div>
                        <div className="absolute w-[60px] h-[58px] top-4 left-[261px]">
                            <div className="w-12 h-4 bg-gray-700 rounded"></div>
                            <div className="w-16 h-6 mt-2 bg-gray-700 rounded"></div>
                        </div>
                    </div>
                ))}
            </section>
        )
    }

    // Show message if no achievements
    if (achievements.length === 0) {
        return (
            <section className="flex flex-col w-full max-w-[335px] items-start gap-2.5 mx-auto">
                <div className="flex w-full items-center justify-between">
                    <div className="inline-flex items-center gap-2">
                        <Image
                            width={43}
                            height={44}
                            alt="Trophy"
                            src="/achivementtrophy.png"
                            loading="eager"
                            decoding="async"
                            priority
                        />
                        <h3 className="font-semibold text-white text-base">
                            Achievements
                        </h3>
                    </div>
                    <button className="font-medium text-[#8b92de] text-base">
                        See All
                    </button>
                </div>
                <div className="flex items-center justify-center w-full h-22
                
                ">
                    <p className="text-gray-400 text-sm">No achievements yet</p>
                </div>
            </section>
        )
    }
    return (
        <section className="flex flex-col w-full max-w-[335px] items-start gap-2.5 mx-auto">
            <div className="flex w-full items-center justify-between">
                <div className="inline-flex items-center gap-2">
                    <Image
                        width={43}
                        height={44}
                        alt="Trophy"
                        src="/achivementtrophy.png"
                    />
                    <h3 className="font-semibold text-white text-base">
                        Achievements
                    </h3>
                </div>
                <button className="font-medium text-[#8b92de] text-base">
                    See All
                </button>
            </div>

            {achievements.map((achievement) => (
                <article
                    key={achievement.id}
                    className="relative w-full max-w-[335px] h-[92px] bg-black rounded-[10px] shadow-[2.48px_2.48px_18.58px_#a6aabc4c,-1.24px_-1.24px_16.1px_#f9faff1a]"
                >
                    <div
                        className="absolute w-16 h-16 top-3.5 left-4 bg-cover bg-center"
                        style={{ backgroundImage: `url(${achievement.bgImage || '/assets/animaapp/V1uc3arn/img/oval-2x.png'})` }}
                    >
                        <Image
                            width={63}
                            height={49}
                            className="absolute top-[15px] left-0"
                            alt={achievement.title || achievement.name}
                            src={achievement.image || achievement.icon || '/assets/animaapp/V1uc3arn/img/image-3926-2x.png'}
                            loading="lazy"
                            decoding="async"
                        />
                    </div>

                    <h4 className="absolute top-[13px] left-[92px] font-bold text-[#d9d9d9] text-base">
                        {achievement.title || achievement.name || 'Achievement'}
                    </h4>

                    <p className="absolute top-10 left-[92px] font-light text-[#d9d9d9] text-[13px] leading-4 whitespace-pre-line">
                        {achievement.description || achievement.desc || 'Complete this achievement to earn rewards'}
                    </p>

                    <div className="absolute w-[60px] h-[58px] top-4 left-[261px]">
                        <div className="absolute -top-px left-0 font-semibold text-white text-xl text-right">
                            {achievement.points || achievement.reward || 0}
                        </div>
                        <Image
                            width={21}
                            height={22}
                            className="absolute top-1 left-[38px]"
                            alt="Coin"
                            src="/dollor.png"
                            loading="lazy"
                            decoding="async"
                        />
                        <div className="absolute w-[59px] h-6 top-[33px] left-0 bg-[#201f58] rounded">
                            <div className="relative w-[49px] h-[15px] top-[5px] left-[5px] flex items-center">
                                <div className="font-medium text-white text-[13px] leading-[13px]">
                                    +{achievement.bonus || achievement.bonusPoints || 0}
                                </div>
                                <Image
                                    width={16}
                                    height={15}
                                    className="ml-1"
                                    alt="Trophy"
                                    src={`/xp.svg`}
                                    loading="lazy"
                                    decoding="async"
                                />
                            </div>
                        </div>
                    </div>
                </article>
            ))}
        </section>
    )
}

export default Achievements
