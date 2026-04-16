"use client";
import React from "react";
import Image from "next/image";
import Link from "next/link";

export const AccountOverviewSection = () => {
  const navigationItems = [
    {
      id: "home",
      icon: "/assets/animaapp/3mn7waJw/img/home.svg",
      label: "Home",
      isActive: false,
      textColor: "text-[#ffffffb2]",
      hasIndicator: false,
    },
    {
      id: "games",
      icon: "/assets/animaapp/3mn7waJw/img/games.svg",
      label: "My Games",
      isActive: true,
      textColor: "text-white",
      hasIndicator: true,
      iconWidth: "w-[35px]",
      iconHeight: "h-[16.28px]",
    },
    {
      id: "wallet",
      icon: "/assets/animaapp/3mn7waJw/img/wallet-2x.png",
      label: "My Wallet",
      isActive: false,
      textColor: "text-[#ffffffb2]",
      hasIndicator: false,
      isWalletIcon: true,
    },
    {
      id: "cash-coach",
      icon: "/assets/animaapp/3mn7waJw/img/money.svg",
      label: "Cash Coach",
      isActive: false,
      textColor: "text-[#ffffffb2]",
      hasIndicator: false,
      hasMargin: true,
    },
  ];

  return (
    <nav
      className="fixed w-[375px] h-[116px] top-[2158px] left-0"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="absolute w-[375px] h-[37px] top-[79px] left-0 bg-black">
        <div className="relative w-[135px] h-[5px] top-[15px] left-[120px] bg-white rounded-[100px]" />
      </div>

      <div className="absolute w-[375px] h-20 -top-px left-0">
        <div className="relative h-[113px] -top-5">
          <Image
            className="absolute w-[375px] h-[103px] top-2.5 left-0"
            alt=""
            src="/assets/animaapp/3mn7waJw/img/botton-nav-2x.png"
            role="presentation"
            width={375}
            height={103}
            loading="eager"
            decoding="async"
            priority
          />

          <div className="flex flex-col w-[60px] items-center gap-2 absolute top-[39px] left-4">
            <Image
              className="relative w-6 h-6"
              alt=""
              src={navigationItems[0].icon}
              role="presentation"
              width={24}
              height={24}
              loading="eager"
              decoding="async"
              priority
            />

            <span className="relative w-fit [font-family:'Poppins',Helvetica] font-normal text-[#ffffffb2] text-[10px] tracking-[-0.17px] leading-[normal]">
              {navigationItems[0].label}
            </span>

            <div className="absolute w-1 h-1 top-[51px] left-[98px] bg-[#8b92de] rounded-sm" />
          </div>

          <div className="flex flex-col w-[60px] items-center gap-3 absolute top-[43px] left-[87px]">
            <Image
              className="relative w-[35px] h-[16.28px]"
              alt=""
              src={navigationItems[1].icon}
              role="presentation"
              width={35}
              height={16.28}
              loading="eager"
              decoding="async"
              priority
            />

            <span className="relative self-stretch [font-family:'Poppins',Helvetica] font-normal text-white text-[10px] text-center tracking-[-0.17px] leading-[normal]">
              {navigationItems[1].label}
            </span>
          </div>

          <Link
            className="flex flex-col w-[62px] items-center gap-[12.4px] absolute top-0 left-40"
            href="/games"
            aria-label="More options"
          >
            <Image
              className="relative w-[62px] h-[62px]"
              alt=""
              src="/assets/animaapp/3mn7waJw/img/more.svg"
              role="presentation"
              width={62}
              height={62}
              loading="eager"
              decoding="async"
              priority
            />
          </Link>

          <div className="flex flex-col w-[60px] items-center gap-2 absolute top-[39px] left-[229px]">
            <div className="relative w-6 h-6">
              <Image
                className="absolute w-5 h-[18px] top-[3px] left-0.5"
                alt=""
                src={navigationItems[2].icon}
                role="presentation"
                width={20}
                height={18}
                loading="eager"
                decoding="async"
                priority
              />
            </div>

            <span className="w-fit font-normal text-[#ffffffb2] text-[10px] text-center tracking-[-0.17px] leading-[normal] relative [font-family:'Poppins',Helvetica]">
              {navigationItems[2].label}
            </span>
          </div>

          <div className="flex flex-col w-[60px] items-center gap-2 absolute top-[39px] left-[300px]">
            <Image
              className="relative w-6 h-6"
              alt=""
              src={navigationItems[3].icon}
              role="presentation"
              width={24}
              height={24}
              loading="eager"
              decoding="async"
              priority
            />

            <span className="relative w-fit ml-[-0.50px] mr-[-0.50px] [font-family:'Poppins',Helvetica] font-normal text-[#ffffffb2] text-[10px] text-center tracking-[-0.17px] leading-[13px] whitespace-nowrap">
              {navigationItems[3].label}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};