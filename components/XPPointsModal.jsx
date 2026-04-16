import React from "react";

export const XPPointsModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const decorativeStars = [
    { id: 1, top: "44px", left: "248px" },
    { id: 2, top: "125px", left: "12px" },
    { id: 3, top: "219px", left: "213px" },
    { id: 4, top: "54px", left: "16px" },
    { id: 5, top: "104px", left: "312px" },
    { id: 6, top: "33px", left: "79px" },
  ];

  const levelData = [
    {
      name: "Junior",
      reward: "Reward:",
      icon: "/assets/animaapp/rTwEmiCB/img/image-3937-3-2x.png",
      width: "98px",
    },
    {
      name: "Mid-level",
      reward: "1.2x",
      icon: "/assets/animaapp/rTwEmiCB/img/image-3937-4-2x.png",
      width: "61px",
    },
    {
      name: "Senior",
      reward: "1.5x",
      icon: "/assets/animaapp/rTwEmiCB/img/image-3937-5-2x.png",
      width: "66px",
    },
  ];

  const exampleData = [
    {
      name: "Junior",
      points: "5",
      icon: "/assets/animaapp/rTwEmiCB/img/image-3937-3-2x.png",
      width: "49px",
    },
    {
      name: "Mid-level",
      points: "8",
      icon: "/assets/animaapp/rTwEmiCB/img/image-3937-5-2x.png",
      width: "47px",
    },
    {
      name: "Senior",
      points: "10",
      icon: "/assets/animaapp/rTwEmiCB/img/image-3937-5-2x.png",
      width: "54px",
    },
  ];

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center px-4 py-4 z-50  overflow-x-hidden  overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-[335px] max-w-full max-h-[80vh] rounded-[20px] overflow-y-auto overflow-x-hidden border border-solid border-[#ffffff80] bg-[linear-gradient(0deg,rgba(0,0,0,1)_0%,rgba(0,0,0,1)_100%)]"
        data-model-id="2103:7095"
        role="dialog"
        aria-labelledby="xp-points-title"
        aria-describedby="xp-points-description"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content Container with proper spacing */}
        <div className="relative min-h-full p-6 pb-8">
          {/* Decorative Stars */}
          {decorativeStars.map((star) => (
            <img
              key={star.id}
              className="absolute w-[19px] h-[19px] pointer-events-none"
              style={{ top: star.top, left: star.left }}
              alt=""
              src={
                star.id <= 3
                  ? "/assets/animaapp/rTwEmiCB/img/vector-2.svg"
                  : star.id === 4
                    ? "/assets/animaapp/rTwEmiCB/img/vector-5.svg"
                    : star.id === 5
                      ? "/assets/animaapp/rTwEmiCB/img/vector-7.svg"
                      : "/assets/animaapp/rTwEmiCB/img/vector-8.svg"
              }
              aria-hidden="true"
            />
          ))}

          {/* Additional decorative elements */}
          <img
            className="absolute w-3 h-[13px] top-[214px] left-[271px] pointer-events-none"
            alt=""
            src="/assets/animaapp/rTwEmiCB/img/vector-4.svg"
            aria-hidden="true"
          />

          <img
            className="absolute w-3 h-[13px] top-[214px] left-[13px] pointer-events-none"
            alt=""
            src="/assets/animaapp/rTwEmiCB/img/vector-5.svg"
            aria-hidden="true"
          />

          {/* Close Button */}
          <button
            className="absolute w-[31px] h-[31px] top-6 right-6 cursor-pointer hover:opacity-80 transition-opacity z-10"
            aria-label="Close dialog"
            type="button"
            onClick={onClose}
          >
            <img alt="Close" src="/assets/animaapp/rTwEmiCB/img/close.svg" />
          </button>

          {/* Main Logo */}
          <div className="flex justify-center mb-4 mt-2">
            <img
              className="w-[125px] h-[108px]"
              alt="XP Points Logo"
              src="/assets/animaapp/rTwEmiCB/img/pic.svg"
            />
          </div>

          {/* Header Section */}
          <header className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-2">
              <h1
                id="xp-points-title"
                className="text-white [font-family:'Poppins',Helvetica] font-bold text-[32px] tracking-[0] leading-8 whitespace-nowrap"
              >
                XP Points
              </h1>
              <img
                className="w-[19px] h-[19px]"
                alt=""
                src="/assets/animaapp/rTwEmiCB/img/vector-8.svg"
                aria-hidden="true"
              />
            </div>
          </header>

          {/* Description */}
          <div className="mb-8">
            <p
              id="xp-points-description"
              className="w-full [font-family:'Poppins',Helvetica] font-light text-white text-sm text-center tracking-[0] leading-5 px-4"
            >
              Play more, level up, and multiply your rewards with XP Points.
            </p>
          </div>

          {/* Levels Section */}
          <section className="flex flex-col w-full items-start gap-3 mb-8">
            <div className="flex items-center justify-around gap-2.5 pt-0 pb-3 px-0 w-full border-b [border-bottom-style:solid] border-[#383838]">
              <h2 className="flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-sm text-center tracking-[0] leading-5">
                Levels
              </h2>
            </div>

            <div className="flex items-start justify-between w-full">
              {levelData.map((level, index) => (
                <div
                  key={index}
                  className="inline-flex flex-col items-start gap-1"
                >
                  <div className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[15px] tracking-[0] leading-[normal]">
                    {level.name}
                  </div>

                  <div className="flex items-center">
                    <div
                      className="h-[28.52px] rounded-[19.01px] bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex items-center justify-between px-2"
                      style={{ width: level.width }}
                    >
                      <div className="[font-family:'Poppins',Helvetica] font-medium text-white text-[15.6px] tracking-[0] leading-[16.9px] whitespace-nowrap">
                        {level.reward}
                      </div>

                      <img
                        className="w-[18px] h-[19px] aspect-[0.97] flex-shrink-0"
                        alt=""
                        src={level.icon}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Example Section */}
          <section className="flex flex-col w-full items-start gap-3">
            <div className="flex items-center gap-2.5 pt-0 pb-3 px-0 w-full border-b [border-bottom-style:solid] border-[#383838]">
              <h2 className="flex-1 [font-family:'Poppins',Helvetica] font-semibold text-white text-sm text-center tracking-[0] leading-5">
                Example
              </h2>
            </div>

            <p className="w-full [font-family:'Poppins',Helvetica] font-light text-white text-sm text-center tracking-[0] leading-5 mb-4">
              If you&apos;re playing game say &quot;Fortnite&quot; &amp; the task is
              complete 5 levels of the game. Here&apos;s how XP Points benefits you
            </p>

            <div className="flex items-start w-full">
              {exampleData.map((item, index) => (
                <div
                  key={index}
                  className="flex flex-col items-start gap-1"
                  style={{ width: item.width }}
                >
                  <div className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[15px] tracking-[0] leading-[normal]">
                    {item.name}
                  </div>

                  <div className="flex items-center">
                    <div
                      className="h-7 rounded-[18.64px] bg-[linear-gradient(180deg,rgba(158,173,247,0.4)_0%,rgba(113,106,231,0.4)_100%)] flex items-center justify-between px-2"
                      style={{ width: item.width }}
                    >
                      <div className="[font-family:'Poppins',Helvetica] font-medium text-white text-[15.3px] tracking-[0] leading-[16.5px] whitespace-nowrap">
                        {item.points}
                      </div>

                      <img
                        className="w-[18px] h-[19px] aspect-[0.97] flex-shrink-0"
                        alt=""
                        src={item.icon}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div >
  );
};