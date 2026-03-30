import React from 'react'
import Image from 'next/image'



const ProfileSection = ({ profile, vipStatus, handleEditProfile }) => {
    return (
        <section className="flex flex-col w-full max-w-[335px] items-center">
            <div className="relative">
                <img
                    width={132}
                    height={132}
                    className="w-[132px] h-[132px] object-cover rounded-full"
                    alt="Profile avatar"
                    src={
                        profile?.profile?.avatar
                            ? (() => {
                                let avatarUrl = profile.profile.avatar;
                                // Remove any leading '=' characters
                                avatarUrl = avatarUrl.replace(/^=+/, '');
                                // Ensure proper protocol
                                return avatarUrl.startsWith('http')
                                    ? avatarUrl
                                    : `https://rewardsuatapi.hireagent.co${avatarUrl}`;
                            })()
                            : "/profile.png"
                    }
                    crossOrigin="anonymous"
                    loading="eager"
                    decoding="async"
                    onError={(e) => {
                        e.target.src = "/profile.png";
                    }}
                />

                <button
                    onClick={handleEditProfile}
                    aria-label="Edit profile"
                    className="
                  absolute
                  -right-4 bottom-2
                  flex items-center justify-center
                  w-[44px] h-[44px]
                  rounded-full
                  bg-[#1F1F1F]
                  border-4 border-[#2C2C2C]
                  shadow-[0_4px_14px_rgba(0,0,0,0.5)]
                "
                >
                    <Image
                        width={20}
                        height={20}
                        alt="Edit"
                        src="https://c.animaapp.com/V1uc3arn/img/line-design-edit-line.svg"
                        loading="eager"
                        decoding="async"
                        priority
                    />
                </button>
            </div>

            <h2 className="font-semibold text-[#FEFEFE] text-[22px] mt-2 text-center truncate max-w-[300px] ">
                {((profile?.firstName || "Player") + " " + (profile?.lastName || "")).trim()}
            </h2>

            <div className="flex  items-center  mt-1">
                <img
                    src="/badge.png"
                    alt="Badge"
                    className="w-14 h-14  flex-shrink-0 object-contain"
                    loading="eager"
                    decoding="async"
                    width="56"
                    height="56"
                />
                <span className="text-[#FEFEFE] pb-5  text-lg pr-2  font-normal">
                    {vipStatus?.data?.currentTier ? vipStatus.data.currentTier.charAt(0).toUpperCase() + vipStatus.data.currentTier.slice(1).toLowerCase() : "Nil"} Badge
                </span>
            </div>

            <div className="flex flex-col items-center gap-2 -mt-3 ">
                <div className="flex items-center justify-center gap-2 text-[#FEFEFE] text-sm leading-5 w-full">
                    <Image
                        width={5}
                        height={5}
                        alt="Mail"
                        src="/gmail.png"
                        className="w-[22px] h-[17px] flex-shrink-0"
                        loading="eager"
                        decoding="async"
                        priority
                    />
                    <span className="text-[#FEFEFE] text-lg font-normal text-center truncate max-w-[120px]">
                        {profile?.email || "youremail@domain.com"}
                    </span>
                    <span className="opacity-60 text-[#FEFEFE] text-lg font-normal mx-1 flex-shrink-0">|</span>
                    <span className="text-[#FEFEFE] text-lg font-normal text-center flex-shrink-0">+{profile?.mobile || "+01 234 567 89"}</span>
                </div>

                <div className="flex items-center gap-1  text-gray-300 text-sm leading-5">
                    <Image
                        width={32}
                        height={32}
                        className="w-[34px] h-[22px] object-cover flex-shrink-0"
                        alt="Flag"
                        src="/socailtag.png"
                        loading="eager"
                        decoding="async"
                        priority
                    />
                    <span className="tracking-wide font-normal text-lg text-[#FEFEFE]">{profile?.socialTag || "GamePro"}</span>
                </div>
            </div>
        </section>
    )
}

export default ProfileSection
