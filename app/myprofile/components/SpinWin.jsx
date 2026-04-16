import React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

const SpinWin = () => {
    const router = useRouter();

    const handleSpinClick = () => {
        // Fast navigation without loading delays
        router.push('/spin-wheel', { scroll: false });
    };

    return (
        <section className="w-full flex mt-0 mb-1 justify-center px-4">
            <div
                className="relative w-full max-w-[335px] h-[103px] rounded-[20px] overflow-hidden cursor-pointer hover:scale-105 transition-all duration-200 p-[2px]"
                style={{
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.3) 100%)',
                    boxShadow: `
                        0 4px 12px rgba(0, 0, 0, 0.4),
                        0 2px 4px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.1),
                        inset 0 -1px 0 rgba(0, 0, 0, 0.2)
                    `
                }}
                onClick={handleSpinClick}
            >
                <div
                    className="relative w-full h-full rounded-[18px] overflow-hidden bg-[linear-gradient(107deg,rgba(200,117,251,1)_0%,rgba(16,4,147,1)_100%)]"
                    style={{ boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.2)' }}
                >
                    <div className="inline-flex flex-col items-start pl-4 pr-8 py-4">
                        <h4 className="font-bold text-[#e5bfff] text-sm">Spin &amp; Win</h4>
                        <div className="relative">
                            <div className="font-bold text-white text-[32px] leading-8">
                                50
                            </div>
                            <Image
                                width={23}
                                height={24}
                                className="absolute top-[2px] left-[46px]"
                                alt="Coin"
                                src="/assets/animaapp/V1uc3arn/img/image-3937-3-2x.png"
                                loading="eager"
                                decoding="async"
                                priority
                            />
                        </div>
                        <p className="font-medium text-white text-xs">
                            Click to spin the wheel
                        </p>
                    </div>

                    <Image
                        width={102}
                        height={62}
                        className="absolute top-[18px] left-[195px]"
                        alt="Spin wheel"
                        src="/assets/animaapp/V1uc3arn/img/spin-icon-2x.png"
                        loading="eager"
                        decoding="async"
                        priority
                    />

                    {/* decorative assets — lazy loaded, no priority */}
                    <Image
                        width={42}
                        height={39}
                        className="absolute top-[22px] left-[145px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/-----6-2x.png"
                        loading="lazy"
                        decoding="async"
                    />
                    <Image
                        width={30}
                        height={31}
                        className="absolute top-[63px] left-[175px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/-----9-2x.png"
                        loading="lazy"
                        decoding="async"
                    />
                    <Image
                        width={44}
                        height={46}
                        className="absolute top-14 left-[275px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/-----5-2x.png"
                        loading="lazy"
                        decoding="async"
                    />
                    <Image
                        width={44}
                        height={46}
                        className="absolute top-[3px] left-[291px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/-----10-2x.png"
                        loading="lazy"
                        decoding="async"
                    />
                    <Image
                        width={8}
                        height={8}
                        className="absolute top-1.5 left-48"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-3.svg"
                        loading="lazy"
                        decoding="async"
                    />
                    <Image
                        width={8}
                        height={8}
                        className="absolute top-[19px] left-[129px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-4.svg"
                        loading="lazy"
                        decoding="async"
                    />
                    <Image
                        width={5}
                        height={5}
                        className="absolute top-[46px] left-48"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-5.svg"
                        loading="lazy"
                        decoding="async"
                    />
                    <Image
                        width={5}
                        height={5}
                        className="absolute top-11 left-[302px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-6.svg"
                        loading="lazy"
                        decoding="async"
                    />
                    <Image
                        width={8}
                        height={8}
                        className="absolute top-[70px] left-[164px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-8.svg"
                        loading="lazy"
                        decoding="async"
                    />
                    <Image
                        width={8}
                        height={8}
                        className="absolute top-[13px] left-[270px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/vector-8.svg"
                        loading="lazy"
                        decoding="async"
                    />
                    <Image
                        width={26}
                        height={24}
                        className="absolute top-[73px] left-[250px]"
                        alt=""
                        src="/assets/animaapp/V1uc3arn/img/-----8-2x.png"
                        loading="lazy"
                        decoding="async"
                    />
                </div>
            </div>
        </section>
    )
}

export default SpinWin
