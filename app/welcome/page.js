"use client";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSplash } from "@/components/SplashScreen";
import {
  Star,
  Coins,
  Users,
  Shield,
  CheckCircle,
  Gift,
  Gamepad2,
  Wallet,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Zap,
  Clock,
  Target,
  CreditCard,
  MessageCircle,
} from "lucide-react";

export default function Home() {
  const { hideSplash } = useSplash();
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);

  useEffect(() => { hideSplash(); }, [hideSplash]);
  const [isSignIn, setIsSignIn] = useState(false);

  const reviews = [
    {
      text: "Best rewards app I've used! 💰 Cashed out $50 in my first month.",
      stars: 5,
      name: "Sarah M.",
    },
    {
      text: "Love the game variety and fast payouts. 🎮 Highly recommend!",
      stars: 5,
      name: "Mike R.",
    },
    {
      text: "Simple, fun, and actually pays. 🔥 Finally a legit rewards app.",
      stars: 5,
      name: "Alex K.",
    },
  ];

  const benefits = [
    {
      icon: <Coins className="w-6 h-6" />,
      emoji: "💎",
      title: "Earn While You Play",
      text: "Complete quick tasks and earn coins with every action you take",
    },
    {
      icon: <Gamepad2 className="w-6 h-6" />,
      emoji: "🎯",
      title: "Play & Win Daily",
      text: "Unlock exciting games and take on daily challenges for bonus rewards",
    },
    {
      icon: <Wallet className="w-6 h-6" />,
      emoji: "💸",
      title: "Cash Out Fast",
      text: "Withdraw your earnings easily with multiple payout options available",
    },
  ];

  const handleAuth = (type) => {
    if (type === "signin") {
      router.push("/login");
    } else {
      router.push("/signup");
    }
  };

  return (
    <div className="w-full mx-auto min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute top-40 right-10 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute top-96 left-10 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-1000" />

      {/* Main Scrollable Content */}
      <div className="pb-24 sm:pb-28 md:pb-32 lg:pb-36 xl:pb-40 px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
        {/* Tagline Section */}
        <div className="pt-4 sm:pt-6 md:pt-8 pb-4 sm:pb-6 md:pb-8 text-center">
          <div className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl mb-2 sm:mb-4 animate-bounce-slow">
            💎
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 sm:mb-3 leading-tight bg-gradient-to-r from-purple-200 via-violet-200 to-purple-200 bg-clip-text text-transparent">
            Earn Coins & XP by Playing Games 🎮
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-purple-300">
            Complete tasks, level up, get paid! ⚡
          </p>
        </div>

        {/* Reviews Section */}
        <div className="mb-4 sm:mb-6 md:mb-8 lg:mb-10 xl:mb-12 space-y-3">
          {reviews.map((review, index) => (
            <div
              key={index}
              className="bg-purple-900/40 backdrop-blur-sm p-5 rounded-2xl border border-purple-700/50 transform hover:scale-[1.02] transition-all duration-300 active:scale-95"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-500 rounded-full flex items-center justify-center text-xl">
                  {review.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">{review.name}</p>
                  <div className="flex gap-0.5">
                    {[...Array(review.stars)].map((_, i) => (
                      <span key={i} className="text-yellow-400 text-sm">
                        ⭐
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-purple-100 text-sm leading-relaxed">
                {review.text}
              </p>
            </div>
          ))}
        </div>

        {/* Trust Verification */}
        <div className="mb-4 sm:mb-6 md:mb-8 lg:mb-10 xl:mb-12">
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            <div className="text-center p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 bg-purple-900/30 rounded-2xl border border-purple-700/30">
              <div className="text-2xl sm:text-3xl md:text-4xl mb-1 sm:mb-2">
                💰
              </div>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-200 to-violet-200 bg-clip-text text-transparent">
                $4M+
              </p>
              <p className="text-purple-300 text-xs sm:text-sm md:text-base mt-1">
                Paid Out
              </p>
            </div>
            <div className="text-center p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 bg-purple-900/30 rounded-2xl border border-purple-700/30">
              <div className="text-2xl sm:text-3xl md:text-4xl mb-1 sm:mb-2">
                👥
              </div>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-200 to-violet-200 bg-clip-text text-transparent">
                8M+
              </p>
              <p className="text-purple-300 text-xs sm:text-sm md:text-base mt-1">
                Members
              </p>
            </div>
            <div className="text-center p-2 sm:p-3 md:p-4 lg:p-5 xl:p-6 bg-purple-900/30 rounded-2xl border border-purple-700/30">
              <div className="text-2xl sm:text-3xl md:text-4xl mb-1 sm:mb-2">
                🛡️
              </div>
              <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-200 to-violet-200 bg-clip-text text-transparent">
                100%
              </p>
              <p className="text-purple-300 text-xs sm:text-sm md:text-base mt-1">
                Secure
              </p>
            </div>
          </div>
        </div>

        {/* Why People Love Us */}
        <div className="mb-6 sm:mb-8 md:mb-10">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-4 sm:mb-6 text-center">
            <span className="bg-gradient-to-r from-purple-200 to-violet-200 bg-clip-text text-transparent">
              Why People Love Us ✨
            </span>
          </h2>
          <div className="space-y-3">
            {benefits.map((benefit, index) => (
              <div
                key={index}
                className="flex items-start gap-2 sm:gap-3 md:gap-4 p-3 sm:p-4 md:p-5 lg:p-6 bg-purple-900/30 rounded-2xl border border-purple-700/30 hover:bg-purple-900/40 transition-all duration-300 active:scale-95"
              >
                <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-600 to-violet-600 rounded-xl flex items-center justify-center text-2xl sm:text-3xl md:text-4xl shadow-lg">
                  {benefit.emoji}
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="font-bold text-sm sm:text-base md:text-lg lg:text-xl text-purple-100 mb-1">
                    {benefit.title}
                  </h3>
                  <p className="text-xs sm:text-sm md:text-base lg:text-lg text-purple-300 leading-relaxed">
                    {benefit.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTAs */}
      <div className="fixed bottom-0 left-0 right-0 w-full mx-auto bg-gradient-to-t from-gray-900 via-purple-900/98 to-transparent backdrop-blur-sm p-4 sm:p-6 md:p-8 lg:p-10 xl:p-12 border-t border-purple-700/30">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 md:gap-4">
          <button
            onClick={() => handleAuth("signin")}
            className="py-3 sm:py-4 md:py-5 lg:py-6 bg-purple-800/50 hover:bg-purple-800/70 border border-purple-600/50 rounded-xl font-semibold text-sm sm:text-base md:text-lg lg:text-xl transition-all duration-300 active:scale-95"
          >
            � Login
          </button>
          <button
            onClick={() => handleAuth("create")}
            className="py-3 sm:py-4 md:py-5 lg:py-6 bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-500 hover:to-violet-500 rounded-xl font-semibold text-sm sm:text-base md:text-lg lg:text-xl transition-all duration-300 active:scale-95 shadow-lg shadow-purple-500/50"
          >
            🚀 Register
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes bounce-slow {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
        .delay-700 {
          animation-delay: 700ms;
        }
        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
    </div>
  );
}
