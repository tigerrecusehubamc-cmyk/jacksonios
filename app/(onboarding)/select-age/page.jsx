'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useOnboardingStore from '@/stores/useOnboardingStore'
import { useSelector } from 'react-redux';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useSplash } from '@/components/SplashScreen';

export default function AgeSelection() {
  const { hideSplash } = useSplash()
  const router = useRouter()
  const { ageRange, setAgeRange, setCurrentStep, currentStep } = useOnboardingStore()
  const { ageOptions, status: onboardingStatus, error } = useSelector((state) => state.onboarding);
  const [selectedIndex, setSelectedIndex] = useState(0)
  const itemHeight = 50

  // Hold the native splash until Redux options are loaded — prevents a blank
  // page flash during the 400ms splash fade while options are still fetching.
  useEffect(() => {
    if (onboardingStatus !== 'loading') hideSplash();
  }, [hideSplash, onboardingStatus])

  useEffect(() => {
    setCurrentStep(1)
  }, [setCurrentStep])

  const handleSelectAge = async (ageOptionId) => {
    await setAgeRange(ageOptionId)
    setTimeout(() => {
      router.push('/select-gender')
    }, 200)
  }

  const goBack = () => {
    // For first step, no back
  }

  const currentQ = {
    id: 1,
    question: "Select your age range",
    emoji: "🎯",
    options: ageOptions.map(option => ({
      text: option.label,
      emoji: "👤",
      icon: null
    }))
  }

  const progress = (1 / 5) * 100;

  return (
    <div className="w-full mx-auto h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white relative overflow-y-auto">
      {/* Animated Background Elements */}
      <div className="absolute top-20 right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-40 left-10 w-40 h-40 bg-violet-500/10 rounded-full blur-3xl animate-pulse delay-700" />



      {/* Fixed Header */}
      <div className="-mt-4 sticky top-0 bg-gradient-to-b from-gray-900 via-purple-900/95 to-transparent backdrop-blur-sm z-10 pb-0 sm:pb-0.5 md:pb-1 lg:pb-2 pt-0">
        <div className="px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12">
          {/* Branding */}
          <div className="text-center mb-4 sm:mb-6 md:mb-8">
            <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-1 sm:mb-2">💜</div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-1 sm:mb-2 bg-gradient-to-r from-purple-200 to-violet-200 bg-clip-text text-transparent">
              Jackson
            </h1>
            <p className="text-purple-300 text-sm sm:text-base md:text-lg">
              ✨ Let's personalize your experience
            </p>
          </div>

          {/* Question */}
          <div className="text-center mb-4 sm:mb-6">
            <div className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-1 sm:mb-2 animate-bounce-slow">{currentQ.emoji}</div>
            <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold leading-tight">
              {currentQ.question}
            </h2>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs sm:text-sm text-purple-300">
              <span>Step {currentStep} of 5</span>
              <span className="font-semibold">{Math.round(progress)}% 🚀</span>
            </div>
            <div className="w-full h-2.5 bg-gray-800/50 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-purple-500 via-violet-500 to-purple-500 rounded-full transition-all duration-700 ease-out relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 pt-10 pb-8 sm:pb-10 md:pb-12 lg:pb-14">

        <div className="space-y-2">
          {currentQ.options.map((option, index) => {
            const isSelected = ageRange === ageOptions[index]?.id;
            return (
              <button
                key={index}
                onClick={() => handleSelectAge(ageOptions[index].id)}
                className={`w-full p-2 sm:p-3 md:p-4 lg:p-5 rounded-2xl text-left transition-all duration-300 active:scale-95 transform ${isSelected
                  ? 'bg-gradient-to-r from-purple-600 to-violet-600 border-2 border-purple-400 shadow-lg shadow-purple-500/50'
                  : 'bg-purple-900/40 border-2 border-purple-700/50 hover:border-purple-500/70 hover:bg-purple-800/50'
                  }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-lg sm:text-xl ${isSelected ? 'bg-white/20' : 'bg-purple-800/50'
                    }`}>
                    {option.emoji}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm sm:text-base md:text-lg lg:text-xl font-medium leading-tight">{option.text}</span>
                  </div>
                  <div className={`flex-shrink-0 w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected
                    ? 'bg-white border-white'
                    : 'border-purple-400'
                    }`}>
                    {isSelected && <CheckCircle className="w-2 h-2 sm:w-3 sm:h-3 text-purple-600" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }
      `}</style>
    </div>
  )
}