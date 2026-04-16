import React, { useState, useRef, useEffect } from "react";
import { useRealTimeCountdown } from "../hooks/useRealTimeCountdown";
import { useAuth } from "@/contexts/AuthContext";
import { getWelcomeBonusTimer } from "@/lib/api";

// The SVG for the "Welcome Offer" label, converted to a reusable JSX component.
const WelcomeOfferLabel = () => (
  <svg
    width="104"
    height="24"
    viewBox="0 0 104 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M0 0L104 0V20C104 22.2091 102.209 24 100 24L4 24C1.79086 24 0 22.2091 0 20L0 0Z"
      fill="url(#paint0_linear_2472_7795)"
      fillOpacity="0.3"
    />
    <path
      d="M103.5 0.5V20C103.5 21.933 101.933 23.5 100 23.5L4 23.5C2.06701 23.5 0.500001 21.933 0.5 20L0.5 0.5L103.5 0.5Z"
      stroke="white"
      strokeOpacity="0.2"
    />
    <path
      d="M18.024 7.624L15.684 16H13.704L12.132 10.036L10.488 16L8.52 16.012L6.264 7.624H8.064L9.54 14.128L11.244 7.624H13.116L14.724 14.092L16.212 7.624H18.024ZM25.301 12.532C25.301 12.772 25.285 12.988 25.253 13.18H20.393C20.433 13.66 20.601 14.036 20.897 14.308C21.193 14.58 21.557 14.716 21.989 14.716C22.613 14.716 23.057 14.448 23.321 13.912H25.133C24.941 14.552 24.573 15.08 24.029 15.496C23.485 15.904 22.817 16.108 22.025 16.108C21.385 16.108 20.809 15.968 20.297 15.688C19.793 15.4 19.397 14.996 19.109 14.476C18.829 13.956 18.689 13.356 18.689 12.676C18.689 11.988 18.829 11.384 19.109 10.864C19.389 10.344 19.781 9.944 20.285 9.664C20.789 9.384 21.369 9.244 22.025 9.244C22.657 9.244 23.221 9.38 23.717 9.652C24.221 9.924 24.609 10.312 24.881 10.816C25.161 11.312 25.301 11.884 25.301 12.532ZM23.561 12.052C23.553 11.62 23.397 11.276 23.093 11.02C22.789 10.756 22.417 10.624 21.977 10.624C21.561 10.624 21.209 10.752 20.921 11.008C20.641 11.256 20.469 11.604 20.405 12.052H23.561ZM28.2072 7.12V16H26.5272V7.12H28.2072ZM29.4351 12.676C29.4351 11.988 29.5751 11.388 29.8551 10.876C30.1351 10.356 30.5231 9.956 31.0191 9.676C31.5151 9.388 32.0831 9.244 32.7231 9.244C33.5471 9.244 34.2271 9.452 34.7631 9.868C35.3071 10.276 35.6711 10.852 35.8551 11.596H34.0431C33.9471 11.308 33.7831 11.084 33.5511 10.924C33.3271 10.756 33.0471 10.672 32.7111 10.672C32.2311 10.672 31.8511 10.848 31.5711 11.2C31.2911 11.544 31.1511 12.036 31.1511 12.676C31.1511 13.308 31.2911 13.8 31.5711 14.152C31.8511 14.496 32.2311 14.668 32.7111 14.668C33.3911 14.668 33.8351 14.364 34.0431 13.756H35.8551C35.6711 14.476 35.3071 15.048 34.7631 15.472C34.2191 15.896 33.5391 16.108 32.7231 16.108C32.0831 16.108 31.5151 15.968 31.0191 15.688C30.5231 15.4 30.1351 15 29.8551 14.488C29.5751 13.968 29.4351 13.364 29.4351 12.676ZM40.0378 16.108C39.3978 16.108 38.8218 15.968 38.3098 15.688C37.7978 15.4 37.3938 14.996 37.0978 14.476C36.8098 13.956 36.6658 13.356 36.6658 12.676C36.6658 11.996 36.8138 11.396 37.1098 10.876C37.4138 10.356 37.8258 9.956 38.3458 9.676C38.8658 9.388 39.4458 9.244 40.0858 9.244C40.7258 9.244 41.3058 9.388 41.8258 9.676C42.3458 9.956 42.7538 10.356 43.0498 10.876C43.3538 11.396 43.5058 11.996 43.5058 12.676C43.5058 13.356 43.3498 13.956 43.0378 14.476C42.7338 14.996 42.3178 15.4 41.7898 15.688C41.2698 15.968 40.6858 16.108 40.0378 16.108ZM40.0378 14.644C40.3418 14.644 40.6258 14.572 40.8898 14.428C41.1618 14.276 41.3778 14.052 41.5378 13.756C41.6978 13.46 41.7778 13.1 41.7778 12.676C41.7778 12.044 41.6098 11.56 41.2738 11.224C40.9458 10.88 40.5418 10.708 40.0618 10.708C39.5818 10.708 39.1778 10.88 38.8498 11.224C38.5298 11.56 38.3698 12.044 38.3698 12.676C38.3698 13.308 38.5258 13.796 38.8378 14.14C39.1578 14.476 39.5578 14.644 40.0378 14.644ZM52.9942 9.256C53.8102 9.256 54.4662 9.508 54.9622 10.012C55.4662 10.508 55.7182 11.204 55.7182 12.1V16H54.0382V12.328C54.0382 11.808 53.9062 11.412 53.6422 11.14C53.3782 10.86 53.0182 10.72 52.5622 10.72C52.1062 10.72 51.7422 10.86 51.4702 11.14C51.2062 11.412 51.0742 11.808 51.0742 12.328V16H49.3942V12.328C49.3942 11.808 49.2622 11.412 48.9982 11.14C48.7342 10.86 48.3742 10.72 47.9182 10.72C47.4542 10.72 47.0862 10.86 46.8142 11.14C46.5502 11.412 46.4182 11.808 46.4182 12.328V16H44.7382V9.352H46.4182V10.156C46.6342 9.876 46.9102 9.656 47.2462 9.496C47.5902 9.336 47.9662 9.256 48.3742 9.256C48.8942 9.256 49.3582 9.368 49.7662 9.592C50.1742 9.808 50.4902 10.12 50.7142 10.528C50.9302 10.144 51.2422 9.836 51.6502 9.604C52.0662 9.372 52.5142 9.256 52.9942 9.256ZM63.4924 12.532C63.4924 12.772 63.4764 12.988 63.4444 13.18H58.5844C58.6244 13.66 58.7924 14.036 59.0884 14.308C59.3844 14.58 59.7484 14.716 60.1804 14.716C60.8044 14.716 61.2484 14.448 61.5124 13.912H63.3244C63.1324 14.552 62.7644 15.08 62.2204 15.496C61.6764 15.904 61.0084 16.108 60.2164 16.108C59.5764 16.108 59.0004 15.968 58.4884 15.688C57.9844 15.4 57.5884 14.996 57.3004 14.476C57.0204 13.956 56.8804 13.356 56.8804 12.676C56.8804 11.988 57.0204 11.384 57.3004 10.864C57.5804 10.344 57.9724 9.944 58.4764 9.664C58.9804 9.384 59.5604 9.244 60.2164 9.244C60.8484 9.244 61.4124 9.38 61.9084 9.652C62.4124 9.924 62.8004 10.312 63.0724 10.816C63.3524 11.312 63.4924 11.884 63.4924 12.532ZM61.7524 12.052C61.7444 11.62 61.5884 11.276 61.2844 11.02C60.9804 10.756 60.6084 10.624 60.1684 10.624C59.7524 10.624 59.4004 10.752 59.1124 11.008C58.8324 11.256 58.6604 11.604 58.5964 12.052H61.7524ZM71.466 16.084C70.682 16.084 69.962 15.9 69.306 15.532C68.65 15.164 68.13 14.656 67.746 14.008C67.362 13.352 67.17 12.612 67.17 11.788C67.17 10.972 67.362 10.24 67.746 9.592C68.13 8.936 68.65 8.424 69.306 8.056C69.962 7.688 70.682 7.504 71.466 7.504C72.258 7.504 72.978 7.688 73.626 8.056C74.282 8.424 74.798 8.936 75.174 9.592C75.558 10.24 75.75 10.972 75.75 11.788C75.75 12.612 75.558 13.352 75.174 14.008C74.798 14.656 74.282 15.164 73.626 15.532C72.97 15.9 72.25 16.084 71.466 16.084ZM71.466 14.584C71.97 14.584 72.414 14.472 72.798 14.248C73.182 14.016 73.482 13.688 73.698 13.264C73.914 12.84 74.022 12.348 74.022 11.788C74.022 11.228 73.914 10.74 73.698 10.324C73.482 9.9 73.182 9.576 72.798 9.352C72.414 9.128 71.97 9.016 71.466 9.016C70.962 9.016 70.514 9.128 70.122 9.352C69.738 9.576 69.438 9.9 69.222 10.324C69.006 10.74 68.898 11.228 68.898 11.788C68.898 12.348 69.006 12.84 69.222 13.264C69.438 13.688 69.738 14.016 70.122 14.248C70.514 14.472 70.962 14.584 71.466 14.584ZM80.0479 10.732H78.8839V16H77.1799V10.732H76.4239V9.352H77.1799V9.016C77.1799 8.2 77.4119 7.6 77.8759 7.216C78.3399 6.832 79.0399 6.652 79.9759 6.676V8.092C79.5679 8.084 79.2839 8.152 79.1239 8.296C78.9639 8.44 78.8839 8.7 78.8839 9.076V9.352H80.0479V10.732ZM84.1846 10.732H83.0206V16H81.3166V10.732H80.5606V9.352H81.3166V9.016C81.3166 8.2 81.5486 7.6 82.0126 7.216C82.4766 6.832 83.1766 6.652 84.1126 6.676V8.092C83.7046 8.084 83.4206 8.152 83.2606 8.296C83.1006 8.44 83.0206 8.7 83.0206 9.076V9.352H84.1846V10.732ZM91.4533 12.532C91.4533 12.772 91.4373 12.988 91.4053 13.18H86.5453C86.5853 13.66 86.7533 14.036 87.0493 14.308C87.3453 14.58 87.7093 14.716 88.1413 14.716C88.7653 14.716 89.2093 14.448 89.4733 13.912H91.2853C91.0933 14.552 90.7253 15.08 90.1813 15.496C89.6373 15.904 88.9693 16.108 88.1773 16.108C87.5373 16.108 86.9613 15.968 86.4493 15.688C85.9453 15.4 85.5493 14.996 85.2613 14.476C84.9813 13.956 84.8413 13.356 84.8413 12.676C84.8413 11.988 84.9813 11.384 85.2613 10.864C85.5413 10.344 85.9333 9.944 86.4373 9.664C86.9413 9.384 87.5213 9.244 88.1773 9.244C88.8093 9.244 89.3733 9.38 89.8693 9.652C90.3733 9.924 90.7613 10.312 91.0333 10.816C91.3133 11.312 91.4533 11.884 91.4533 12.532ZM89.7133 12.052C89.7053 11.62 89.5493 11.276 89.2453 11.02C88.9413 10.756 88.5693 10.624 88.1293 10.624C87.7133 10.624 87.3613 10.752 87.0733 11.008C86.7933 11.256 86.6213 11.604 86.5573 12.052H89.7133ZM94.3596 10.384C94.5756 10.032 94.8556 9.756 95.1996 9.556C95.5516 9.356 95.9516 9.256 96.3996 9.256V11.02H95.9556C95.4276 11.02 95.0276 11.144 94.7556 11.392C94.4916 11.64 94.3596 12.072 94.3596 12.688V16H92.6796V9.352H94.3596V10.384Z"
      fill="#FFBE6B"
    />
    <defs>
      <linearGradient
        id="paint0_linear_2472_7795"
        x1="50.7215"
        y1="35.1749"
        x2="41.5134"
        y2="-8.71253"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#3A1371" />
        <stop offset="1" stopColor="#7F23CB" />
      </linearGradient>
    </defs>
  </svg>
);

export const WelcomeOffer = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef(null);
  const { token } = useAuth();

  // Server-provided timer and message
  const [serverEndTime, setServerEndTime] = useState(null);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [fetchingWelcome, setFetchingWelcome] = useState(true);

  // Use real-time countdown hook with 24-hour persistence
  const {
    formatTime,
    isExpired,
    isLoading,
    timeRemaining,
    resetTimer
  } = useRealTimeCountdown({
    endTime: serverEndTime,
    defaultDuration: 24 * 60 * 60, // 24 hours in seconds
    persist: true,
    storageKey: 'welcomeOfferEndTime',
    autoReset: false // Don't auto reset when expired
  });

  // Resolve auth token: use context first, then localStorage so the API runs even if context updates slightly later
  const authToken =
    token ||
    (typeof window !== "undefined" ? localStorage.getItem("authToken") : null) ||
    null;

  // Fetch welcome bonus timer and message from API (GET /api/user/game-offers/welcome-bonus-timer)
  useEffect(() => {
    let mounted = true;

    if (!authToken || typeof authToken !== "string" || !authToken.trim()) {
      setFetchingWelcome(false);
      return;
    }

    const parseEndTimeFromResponse = (response) => {
      if (!response) return null;

      const timer =
        response?.data?.timer ||
        response?.timer;
      if (!timer || typeof timer !== "object") return null;

      // Backend says bonus is expired -> show expired state (end time in the past)
      if (timer.isExpired === true) {
        return Date.now() - 1000;
      }

      // Countdown to expiry (completion deadline) – preferred so UI shows "time left to complete"
      if (typeof timer.timeUntilExpiry === "number" && timer.timeUntilExpiry > 0) {
        return Date.now() + timer.timeUntilExpiry;
      }
      if (timer.completionDeadline) {
        const t = new Date(timer.completionDeadline).getTime();
        if (!isNaN(t) && t > Date.now()) return t;
      }

      // Fallback: countdown to unlock (e.g. before offer is unlocked)
      if (typeof timer.timeUntilUnlock === "number" && timer.timeUntilUnlock > 0) {
        return Date.now() + timer.timeUntilUnlock;
      }
      if (timer.unlockTime) {
        const t = new Date(timer.unlockTime).getTime();
        if (!isNaN(t) && t > Date.now()) return t;
      }

      return null;
    };

    const fetchWelcome = async () => {
      try {
        setFetchingWelcome(true);
        const data = await getWelcomeBonusTimer(authToken);
        if (!mounted) return;

        if (data && data.success === false) {
          const msg = (data.body && data.body.message) || data.error || '';
          setWelcomeMessage(msg);
          setFetchingWelcome(false);
          return;
        }

        const msg = data.message || data.msg || (data.data && data.data.message) || '';
        setWelcomeMessage(msg || '');

        const end = parseEndTimeFromResponse(data);
        if (end) {
          setServerEndTime(end);
        }
      } catch (error) {
        // Keep UI stable; timer falls back to hook's default/persisted value
      } finally {
        if (mounted) setFetchingWelcome(false);
      }
    };

    fetchWelcome();

    return () => {
      mounted = false;
    };
  }, [authToken]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const toggleTooltip = () => {
    setShowTooltip(!showTooltip);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target)) {
        setShowTooltip(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  return (
    <>
      <div
        className={`relative w-full max-w-[375px] rounded-[22px] overflow-hidden bg-gradient-to-br from-[#7920CF] via-[#A832B8] to-[#CD4999] shadow-[0_8px_24px_rgba(121,32,207,0.4)] transition-all duration-300 ${isExpanded ? "h-[400px]" : "h-[245px]"
          }`}
        data-model-id="4001:7472"
        style={{
          background: 'linear-gradient(135deg, rgba(121,32,207,1) 0%, rgba(168,50,184,1) 50%, rgba(205,73,153,1) 100%)'
        }}
      >
        {/* --- ADDED THIS SECTION --- */}
        {/* This div positions the SVG label at the top-center of the component, as per the Figma design. */}
        <div className="absolute top-[-2px] left-1/2 -translate-x-1/2 z-10">
          <WelcomeOfferLabel />
        </div>
        {/* --- END OF ADDED SECTION --- */}

        <div className="absolute w-full h-[245px] top-0 left-0">
          <div className="absolute w-full h-[200px] top-0 left-0 px-5">
            <div className="absolute w-full max-w-[200px] h-[90px] top-[58px] left-5">
              <div className="top-0 left-0 font-bold text-[#ffe664] text-[42px] leading-[50px] absolute [font-family:'Poppins',Helvetica] tracking-[-0.5px] whitespace-nowrap drop-shadow-[0_3px_10px_rgba(0,0,0,0.4)]">
                Welcome
              </div>
              {/* Enhanced 3D Bonus Badge - Modern Android Style */}
              <div className="absolute top-[50px] left-0 flex items-center justify-center" style={{ perspective: '1000px' }}>
                <div className="relative transform-gpu" style={{ transformStyle: 'preserve-3d' }}>
                  {/* 3D Main Bonus Badge Container */}
                  <div
                    className="relative w-[95px] h-[44px] rounded-[12px] overflow-visible transform-gpu transition-all duration-500 animate-float-3d group"
                    style={{
                      transform: 'rotateX(-8deg) rotateY(5deg) translateZ(0)',
                      transformStyle: 'preserve-3d',
                      boxShadow: `
                        0 8px 24px rgba(237, 131, 0, 0.5),
                        0 4px 12px rgba(0, 0, 0, 0.4),
                        0 2px 6px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3),
                        inset 0 -1px 0 rgba(0, 0, 0, 0.2)
                      `
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'rotateX(-5deg) rotateY(8deg) scale(1.15) translateZ(10px)';
                      e.currentTarget.style.boxShadow = `
                        0 12px 32px rgba(237, 131, 0, 0.6),
                        0 6px 16px rgba(0, 0, 0, 0.5),
                        0 3px 8px rgba(0, 0, 0, 0.4),
                        inset 0 1px 0 rgba(255, 255, 255, 0.4),
                        inset 0 -1px 0 rgba(0, 0, 0, 0.3)
                      `;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'rotateX(-8deg) rotateY(5deg) translateZ(0)';
                      e.currentTarget.style.boxShadow = `
                        0 8px 24px rgba(237, 131, 0, 0.5),
                        0 4px 12px rgba(0, 0, 0, 0.4),
                        0 2px 6px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.3),
                        inset 0 -1px 0 rgba(0, 0, 0, 0.2)
                      `;
                    }}
                  >
                    {/* 3D Depth Layer - Back */}
                    <div
                      className="absolute inset-0 rounded-[12px] bg-gradient-to-br from-[#CC7000] to-[#996600] transform-gpu"
                      style={{
                        transform: 'translateZ(-4px)',
                        opacity: 0.6,
                        filter: 'blur(2px)'
                      }}
                    ></div>

                    {/* 3D Depth Layer - Middle */}
                    <div
                      className="absolute inset-0 rounded-[12px] bg-gradient-to-br from-[#E67E00] to-[#CC7700] transform-gpu"
                      style={{
                        transform: 'translateZ(-2px)',
                        opacity: 0.8
                      }}
                    ></div>

                    {/* Animated 3D Gradient Background - Front */}
                    <div
                      className="absolute inset-0 rounded-[12px] transform-gpu"
                      style={{
                        background: 'linear-gradient(135deg, #FF8C00 0%, #FFA500 50%, #FFD700 100%)',
                        transform: 'translateZ(0)',
                        boxShadow: 'inset 0 2px 4px rgba(255, 255, 255, 0.3), inset 0 -2px 4px rgba(0, 0, 0, 0.2)'
                      }}
                    ></div>

                    {/* Top Highlight - 3D Lighting Effect */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[40%] rounded-t-[12px] transform-gpu"
                      style={{
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.4) 0%, rgba(255, 255, 255, 0.1) 50%, transparent 100%)',
                        transform: 'translateZ(2px)',
                        pointerEvents: 'none'
                      }}
                    ></div>

                    {/* Bottom Shadow - 3D Depth */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-[30%] rounded-b-[12px] transform-gpu"
                      style={{
                        background: 'linear-gradient(0deg, rgba(0, 0, 0, 0.3) 0%, transparent 100%)',
                        transform: 'translateZ(-1px)',
                        pointerEvents: 'none'
                      }}
                    ></div>

                    {/* Left Side Highlight */}
                    <div
                      className="absolute top-0 bottom-0 left-0 w-[30%] rounded-l-[12px] transform-gpu"
                      style={{
                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.2) 0%, transparent 100%)',
                        transform: 'translateZ(1px)',
                        pointerEvents: 'none'
                      }}
                    ></div>

                    {/* Right Side Shadow */}
                    <div
                      className="absolute top-0 bottom-0 right-0 w-[30%] rounded-r-[12px] transform-gpu"
                      style={{
                        background: 'linear-gradient(270deg, rgba(0, 0, 0, 0.25) 0%, transparent 100%)',
                        transform: 'translateZ(-1px)',
                        pointerEvents: 'none'
                      }}
                    ></div>

                    {/* Content - Elevated */}
                    <div
                      className="relative z-10 flex items-center justify-center h-full px-3 transform-gpu"
                      style={{ transform: 'translateZ(4px)' }}
                    >
                      {/* Sparkle Icon - 3D */}
                      <svg
                        className="w-4 h-4 mr-1.5 text-white transform-gpu transition-transform duration-300 hover:scale-125 hover:rotate-12"
                        style={{
                          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 8px rgba(255, 255, 255, 0.3))',
                          transform: 'translateZ(5px)'
                        }}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {/* Bonus Text - 3D with emboss effect */}
                      <span
                        className="font-bold text-white text-[16px] leading-[20px] [font-family:'Poppins',Helvetica] tracking-[0.5px] transform-gpu"
                        style={{
                          textShadow: `
                            0 1px 0 rgba(255, 255, 255, 0.4),
                            0 2px 4px rgba(0, 0, 0, 0.6),
                            0 0 8px rgba(255, 255, 255, 0.2)
                          `,
                          transform: 'translateZ(5px)',
                          WebkitTextStroke: '0.3px rgba(0, 0, 0, 0.2)'
                        }}
                      >
                        Bonus
                      </span>
                    </div>

                    {/* 3D Corner Highlights */}
                    <div
                      className="absolute top-0 left-0 w-4 h-4 transform-gpu"
                      style={{
                        borderTop: '2px solid rgba(255, 255, 255, 0.5)',
                        borderLeft: '2px solid rgba(255, 255, 255, 0.5)',
                        borderRadius: '12px 0 0 0',
                        transform: 'translateZ(3px)',
                        boxShadow: 'inset 1px 1px 2px rgba(255, 255, 255, 0.3)'
                      }}
                    ></div>
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 transform-gpu"
                      style={{
                        borderBottom: '2px solid rgba(0, 0, 0, 0.3)',
                        borderRight: '2px solid rgba(0, 0, 0, 0.3)',
                        borderRadius: '0 0 12px 0',
                        transform: 'translateZ(-1px)'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="top-[32px] left-5 font-medium text-white text-[22px] leading-[28px] absolute [font-family:'Poppins',Helvetica] tracking-[-0.3px] whitespace-nowrap drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]">
              Claim your
            </div>
            <img
              className="absolute w-[109px] h-[109px] top-[45px] right-[2px] object-cover"
              alt="Png clipart buried"
              src="/assets/animaapp/iuW6cMRd/img/png-clipart-buried-treasure-treasure-miscellaneous-treasure-tran-2x.png"
              loading="eager"
              decoding="async"
              width={109}
              height={109}
            />

            {/* Removed big circular countdown timer per request */}

            <button
              className="absolute w-8 h-8 top-[-4px] right-[-4px] z-20 cursor-pointer hover:opacity-80 transition-opacity duration-200 rounded-tr-lg rounded-bl-lg overflow-hidden flex items-center justify-center"
              aria-label="More information"
              onClick={toggleTooltip}
            >
              <img
                className="w-6 h-6"
                alt="Information circle"
                src="/assets/animaapp/iuW6cMRd/img/informationcircle.svg"
                loading="eager"
                decoding="async"
                width={24}
                height={24}
              />
            </button>
          </div>

          <div className="h-[73px] top-[172px] bg-[#982fbb] rounded-[0px_0px_20px_20px] absolute w-full left-0 shadow-[0_-4px_12px_rgba(0,0,0,0.2)]" />

          <div
            className="inline-flex items-center gap-2 absolute top-[210px] left-1/2 -translate-x-1/2 cursor-pointer group px-3 py-1 rounded-lg hover:bg-white/10 transition-all duration-300"
            onClick={toggleExpanded}
          >
            <div className="relative w-fit font-medium [font-family:'Poppins',Helvetica] text-white text-[15px] tracking-[0.2px] leading-6 whitespace-nowrap group-hover:text-yellow-200 transition-colors duration-300">
              Check Details
            </div>

            <img
              className={`relative w-5 h-5 transition-all duration-300 ${isExpanded ? "rotate-90" : ""} group-hover:translate-x-1`}
              alt="Arrow"
              src="/assets/animaapp/iuW6cMRd/img/arrow.svg"
              loading="eager"
              decoding="async"
              width={20}
              height={20}
            />
          </div>

          <div className="h-12 top-[161px] bg-[#80279e] absolute w-full left-0" />

          <div className="absolute top-[175px] left-6 font-medium [font-family:'Poppins',Helvetica] text-white text-[15px] tracking-[0.2px] leading-6 whitespace-nowrap drop-shadow-[0_1px_3px_rgba(0,0,0,0.3)]">
            Quest ends in:
          </div>
        </div>

        <div className={`absolute w-[130px] h-[40px] top-[165px] left-[140px] rounded-[12px] overflow-hidden flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.3)] transform transition-all duration-300 hover:scale-105 ${isExpired
          ? 'bg-[linear-gradient(107deg,rgba(255,0,0,0.9)_0%,rgba(180,0,0,1)_100%)]'
          : 'bg-[linear-gradient(107deg,rgba(200,117,251,1)_0%,rgba(120,50,220,1)_50%,rgba(16,4,147,1)_100%)]'
          }`}>
          <div className="relative z-10 [font-family:'Poppins',Helvetica] font-semibold text-white text-[15px] tracking-[0.5px] leading-[normal] text-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
            {fetchingWelcome ? (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-75"></span>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-150"></span>
              </span>
            ) : serverEndTime ? (
              isLoading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-75"></span>
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse delay-150"></span>
                </span>
              ) : (isExpired ? 'EXPIRED' : formatTime)
            ) : (
              <span className="text-[12px] leading-[16px]">{welcomeMessage || 'Please start downloading your first game from below suggestions to claim your Welcome Bonus.'}</span>
            )}
          </div>
          {!isExpired && !isLoading && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
          )}
        </div>

        {/* Expanded content */}
        {isExpanded && (
          <div className="absolute w-full top-[245px] left-0 bg-[#982fbb] -mt-2 rounded-[0px_0px_20px_20px] px-6 pt-5 pb-7 animate-fade-in shadow-[0_-4px_16px_rgba(0,0,0,0.2)]">

            {/* Paragraph */}
            <div className="font-normal font-['Poppins'] text-white text-[14px] leading-[22px] break-words tracking-[0.1px]">
              Please start downloading your first game from below suggestions to
              claim your Welcome Bonus.
            </div>

            {/* New UI Section */}
            {/* Rewards Section */}
            <div className="mt-5 flex items-center justify-center gap-4">

              {/* Coins */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm">

                <span className="text-white font-semibold text-[14px]">
                  100
                </span>
                <img
                  src="/dollor.png"
                  alt="Coins"
                  className="w-5 h-5 object-contain"
                  loading="eager"
                  decoding="async"
                  width={20}
                  height={20}
                />
              </div>

              {/* XP */}
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/15 backdrop-blur-sm">

                <span className="text-white font-semibold text-[14px]">
                  20
                </span>
                <img
                  src="/assets/animaapp/mHRmJGe1/img/pic.svg"
                  alt="XP"
                  className="w-5 h-5 object-contain"
                  loading="eager"
                  decoding="async"
                  width={20}
                  height={20}
                />
              </div>

            </div>

          </div>
        )}


        {/* Tooltip */}

      </div>
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute top-[35px] right-[-3px] z-50 w-[320px] bg-black/95 backdrop-blur-sm rounded-[12px] px-4 py-3 shadow-2xl"
        >
          <div className="text-white font-medium text-sm [font-family:'Poppins',Helvetica] leading-normal">
            <div className="text-[#ffe664] font-semibold mb-1 text-center">
              Welcome Offer
            </div>
            <div className="text-center">
              Please start downloading your first game from below suggestions
              to claim your Welcome Bonus.
            </div>
          </div>
          {/* Arrow pointing up to the info icon */}
          <div className="absolute top-[-8px] right-[25px] w-4 h-4 bg-black/95 transform rotate-45"></div>
        </div>
      )}
    </>
  );
};