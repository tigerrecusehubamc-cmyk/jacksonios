'use client'
import React, { useState, useRef, useEffect } from 'react'
import { Capacitor, registerPlugin } from "@capacitor/core";
const SoftInput = registerPlugin("SoftInputPlugin");
import Image from "next/image";
import Link from "next/link";
import { useDispatch } from "react-redux";
import { fetchStreakStatus } from "@/lib/redux/slice/streakSlice";
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import useOnboardingStore from '@/stores/useOnboardingStore';
import { sendOtp, verifyOtp, checkMobileAvailability } from '@/lib/api';
import Script from 'next/script';
import { sendFirebaseOtp, verifyFirebaseOtp } from "@/lib/firebaseOtp";
import { onRegistrationStart, onRegistrationComplete } from "@/lib/adjustService";
import { defaultCountries, parseCountry } from 'react-international-phone';

const getFlagEmoji = (iso2) =>
  iso2.toUpperCase().split('').map(char =>
    String.fromCodePoint(127397 + char.charCodeAt(0))
  ).join('');

const parsedCountries = defaultCountries.map(c => {
  const country = parseCountry(c);
  return { ...country, flag: getFlagEmoji(country.iso2) };
});

const validateName = (name, fieldName = 'Name') => {
  const trimmedName = name.trim();


  if (!trimmedName) {
    return `${fieldName} is required.`;
  }
  if (trimmedName.length < 2) {
    return `${fieldName} must be at least 2 characters.`;
  }
  if (trimmedName.length > 30) {
    return `${fieldName} cannot exceed 50 characters.`;
  }

  const nameRegex = /^[\p{L}'\- ]+$/u;
  if (!nameRegex.test(trimmedName)) {
    return `${fieldName} contains invalid characters.`;
  }

  return "";
};


const SignUp = () => {
  const router = useRouter();
  const { signUpAndSignIn, signIn } = useAuth();
  const dispatch = useDispatch();
  const [formData, setFormData] = useState({
    firstname: "",
    lastname: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
    otp: new Array(6).fill(""), // Firebase uses 6 digits
  });

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadings, setIsLoadings] = useState(false);
  const [isLoadingss, setIsLoadingss] = useState(false);
  const [firebaseIdToken, setFirebaseIdToken] = useState(null);


  const [error, setError] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [countryCode, setCountryCode] = useState("+1");
  const [showCountryPicker, setShowCountryPicker] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    SoftInput.setMode({ mode: showCountryPicker ? "resize" : "pan" });
    // Match page background so keyboard gap never reveals splash image
    document.body.style.backgroundColor = "#272052";
    document.documentElement.style.backgroundColor = "#272052";
    return () => {
      document.body.style.backgroundColor = "";
      document.documentElement.style.backgroundColor = "";
    };
  }, [showCountryPicker]);

  const [countrySearch, setCountrySearch] = useState('');
  const [selectedFlag, setSelectedFlag] = useState('🇺🇸');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isMobileVerified, setIsMobileVerified] = useState(false);
  const [countdown, setCountdown] = useState(180);
  const [isResending, setIsResending] = useState(false);
  const otpInputs = useRef([]);
  const otpSectionRef = useRef(null);
  const [turnstileToken, setTurnstileToken] = useState(null);
  const [isTurnstileLoading, setIsTurnstileLoading] = useState(true);
  const turnstileRef = useRef(null);
  const turnstileWidgetId = useRef(null);
  const safetyTimerId = useRef(null);

  useEffect(() => {
    let timer;
    if (isOtpSent && countdown > 0 && !isMobileVerified) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isOtpSent, countdown, isMobileVerified]);

  // Scroll OTP section into view when it appears so Verify button is never hidden by keyboard
  useEffect(() => {
    if (isOtpSent && !isMobileVerified) {
      setTimeout(() => {
        otpSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
    }
  }, [isOtpSent]);

  const formatTime = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };


  // useEffect(() => {
  //   let timer;
  //   if (isOtpSent && countdown > 0 && !isMobileVerified) {
  //     timer = setTimeout(() => setCountdown(countdown - 1), 1000);
  //   }
  //   return () => clearTimeout(timer);
  // }, [isOtpSent, countdown, isMobileVerified]);

  // ============================================================
  // CLOUDFLARE TURNSTILE - MANUAL RENDERING FOR CLIENT-SIDE NAVIGATION
  // ============================================================
  useEffect(() => {
    const renderTurnstile = () => {
      if (typeof window !== 'undefined' && window.turnstile && turnstileRef.current) {
        if (turnstileWidgetId.current) return;
        const existingWidget = turnstileRef.current.querySelector('[data-widget-id]');
        if (existingWidget) {
          const existingId = existingWidget.getAttribute('data-widget-id');
          if (existingId) { try { window.turnstile.remove(existingId); } catch (e) { } }
        }
        try {
          turnstileRef.current.innerHTML = '';
          setIsTurnstileLoading(true);
          const widgetId = window.turnstile.render(turnstileRef.current, {
            sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
            callback: (token) => { setTurnstileToken(token); setIsTurnstileLoading(false); console.log('✅ Turnstile verified:', token); },
            'error-callback': () => { setTurnstileToken(null); setIsTurnstileLoading(false); console.error('❌ Turnstile error'); },
            'expired-callback': () => { setTurnstileToken(null); setIsTurnstileLoading(true); console.warn('⏰ Turnstile token expired'); },
            theme: 'dark',
            size: 'normal',
          });
          setIsTurnstileLoading(false);
          turnstileWidgetId.current = widgetId;
        } catch (err) {
          console.error('Failed to render Turnstile widget:', err);
        }
      }
    };

    const checkAndRender = () => {
      if (typeof window !== 'undefined' && window.turnstile && turnstileRef.current) {
        renderTurnstile(); return true;
      }
      return false;
    };

    if (checkAndRender()) {
      return () => {
        if (turnstileWidgetId.current && typeof window !== 'undefined' && window.turnstile) {
          try { window.turnstile.remove(turnstileWidgetId.current); turnstileWidgetId.current = null; } catch (e) { }
        }
      };
    }

    let checkInterval = null;
    let timeoutId = null;
    checkInterval = setInterval(() => {
      if (checkAndRender()) { clearInterval(checkInterval); clearTimeout(timeoutId); }
    }, 100);
    timeoutId = setTimeout(() => { if (checkInterval) clearInterval(checkInterval); }, 10000);

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
      if (turnstileWidgetId.current && typeof window !== 'undefined' && window.turnstile) {
        try { window.turnstile.remove(turnstileWidgetId.current); turnstileWidgetId.current = null; } catch (e) { }
      }
    };
  }, []);

  const resetTurnstileWidget = () => {
    if (typeof window !== 'undefined' && window.turnstile && turnstileWidgetId.current) {
      try {
        window.turnstile.reset(turnstileWidgetId.current);
        setTurnstileToken(null);
        setIsTurnstileLoading(true);
      } catch (err) {
        setTurnstileToken(null);
        setIsTurnstileLoading(true);
      }
    }
  };


  const handleInputChange = (field, value) => {
    // Clear errors when user starts typing
    setError({});
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };


  const handleOtpChange = (element, index) => {
    if (isNaN(element.value)) return false; // Only allow numbers
    setError({}); // Clear errors on input

    const newOtp = [...formData.otp];
    newOtp[index] = element.value;
    setFormData({ ...formData, otp: newOtp });

    // Auto-focus next input
    if (element.nextSibling && element.value) {
      element.nextSibling.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    // Handle backspace to move to previous field
    if (e.key === 'Backspace' && !formData.otp[index] && index > 0) {
      const newOtp = [...formData.otp];
      newOtp[index - 1] = '';
      setFormData({ ...formData, otp: newOtp });
      otpInputs.current[index - 1]?.focus();
    }
  };

  // const handleSendOtp = async () => {
  //   setError({});
  //   if (!formData.mobile.trim() || (countryCode === "+91" && !/^[6-9]\d{9}$/.test(formData.mobile))) {
  //     setError({ mobile: "Please enter a valid 10-digit Indian mobile number." });
  //     return;
  //   }
  //   setIsLoadingss(true);
  //   try {
  //     await sendOtp(`${countryCode}${formData.mobile}`);
  //     setIsOtpSent(true);
  //     setCountdown(60); // Reset timer
  //     setTimeout(() => otpInputs.current[0]?.focus(), 100); // Focus the first OTP box
  //   } catch (err) {
  //     setError({ mobile: err.message || "Failed to send OTP. Please try again." });
  //   } finally {
  //     setIsLoadingss(false);
  //   }
  // };

  // const handleResendOtp = async () => {
  //   if (countdown > 0) return;
  //   setIsResending(true);
  //   try {
  //     await sendOtp(`${countryCode}${formData.mobile}`);
  //     setFormData(prev => ({ ...prev, otp: new Array(4).fill("") })); // Clear old OTP
  //     setCountdown(60);
  //     setError({});
  //     otpInputs.current[0]?.focus();
  //   } catch (err) {
  //     setError({ otp: err.message || "Failed to resend OTP." });
  //   } finally {
  //     setIsResending(false);
  //   }
  // };

  // const handleVerifyOtp = async () => {
  //   const otpCode = formData.otp.join('');
  //   if (otpCode.length < 4) {
  //     setError({ otp: "Please enter the full 4-digit code." });
  //     return;
  //   }
  //   setIsLoadings(true);
  //   try {
  //     await verifyOtp(`${countryCode}${formData.mobile}`, otpCode);
  //     setIsMobileVerified(true);
  //     setError({});
  //   } catch (err) {
  //     setError({ otp: err.message || "An unknown verification error occurred." });
  //   } finally {
  //     setIsLoadings(false);
  //   }
  // }


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError({});

    if (!isMobileVerified) {
      setError({ form: "Please verify your mobile number before signing up." });
      return;
    }

    const clientErrors = {};
    const firstNameError = validateName(formData.firstname, "First name");
    if (firstNameError) clientErrors.firstname = firstNameError;

    const lastNameError = validateName(formData.lastname, "Last name");
    if (lastNameError) clientErrors.lastname = lastNameError;
    if (!formData.email.trim()) {
      clientErrors.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      clientErrors.email = "Please enter a valid email address.";
    }
    if (!formData.mobile.trim()) {
      clientErrors.mobile = "Mobile number is required.";
    } else if (!/^\d{5,15}$/.test(formData.mobile)) {
      clientErrors.mobile = "Please enter a valid mobile number (5-15 digits).";
    }
    if (!formData.password) {
      clientErrors.password = "Password is required.";
    } else if (formData.password.length < 8) {
      clientErrors.password = "Password must be at least 8 characters long.";
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password)) {
      clientErrors.password = "Password must include uppercase, lowercase, and a number.";
    }
    if (!formData.confirmPassword) {
      clientErrors.confirmPassword = "Please confirm your password.";
    } else if (formData.password !== formData.confirmPassword) {
      clientErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(clientErrors).length > 0) {
      setError(clientErrors);
      return;
    }

    // ============================================================
    // TURNSTILE TOKEN VALIDATION
    // ============================================================
    // Check if Turnstile has automatically generated a token
    // If no token exists, user hasn't been verified yet
    // (This usually means widget is still analyzing or failed)
    if (!turnstileToken) {
      if (isTurnstileLoading) {
        setError({ form: "Please wait for security verification to complete." });
      } else {
        setError({ form: "Security verification is required. Please wait a moment and try again." });
      }
      return;
    }

    // Track registration started (Adjust) — only after all validation passes
    onRegistrationStart();

    setIsLoading(true);
    const fullMobile = `${countryCode}${formData.mobile}`;

    try {
      const onboardingData = useOnboardingStore.getState();
      const fullSignupData = {
        firstName: formData.firstname.trim(),
        lastName: formData.lastname.trim() || '-',
        email: formData.email,
        mobile: fullMobile,
        password: formData.password,
        gender: onboardingData.gender,
        ageRange: onboardingData.ageRange,
        gamePreferences: onboardingData.gamePreferences,
        gameStyle: onboardingData.gameStyle,
        improvementArea: onboardingData.improvementArea,
        dailyEarningGoal: onboardingData.dailyEarningGoal,
        turnstileToken: turnstileToken,
        firebaseToken: firebaseIdToken// Include Turnstile token (automatically generated)
      };

      const result = await signUpAndSignIn(fullSignupData);

      if (result.ok) {
        dispatch(fetchStreakStatus());
        // Track registration completed (Adjust)
        onRegistrationComplete();
      }

      // CHANGE: The AuthProvider now handles the redirect.
      // We only need to handle the error case here.
      if (!result.ok) {
        const backendError = result?.error;

        // Extract error message from various possible structures
        const errorMessage =
          backendError?.error ||
          backendError?.message ||
          backendError?.body?.error ||
          backendError?.body?.message ||
          (backendError?.body?.errors && backendError.body.errors[0]?.msg) ||
          "";

        // Check if error is "Email already exists" or similar
        const isEmailExistsError =
          errorMessage.toLowerCase().includes("email already exists") ||
          errorMessage.toLowerCase().includes("user already exists") ||
          errorMessage.toLowerCase().includes("email is already registered") ||
          errorMessage.toLowerCase().includes("email already registered");

        // If user already exists, attempt to log them in instead
        if (isEmailExistsError) {
          try {
            const loginResult = await signIn(formData.email, formData.password, turnstileToken);

            if (loginResult.ok) {
              // Login successful - AuthProvider will handle redirect
              return;
            } else {
              // Login failed - show error
              setError({ form: "Account exists but password is incorrect. Please try logging in." });
            }
          } catch (loginErr) {
            // Login attempt failed - show original error
            setError({ form: "Account already exists. Please try logging in instead." });
          }
        } else {
          // Handle other errors normally
          if (backendError && backendError.errors) {
            const newErrors = {};
            backendError.errors.forEach(err => {
              if (err.param) newErrors[err.param] = err.msg;
            });
            setError(newErrors);
          } else {
            setError({ form: errorMessage || "An unknown error occurred. Please try again." });
          }
        }

        // Reset Turnstile on error so user can try again
        resetTurnstileWidget();
        setTurnstileToken(null);
      }
    }
    catch (err) {
      setError({ form: err.message || "An error occurred. Please check your details and try again." });
      // Reset Turnstile on error so user can try again
      resetTurnstileWidget();
      setTurnstileToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignInClick = (e) => {
    e.preventDefault();
    router.push('/login');
  };

  // const handleSendOtp = async () => {
  //   setError({});
  //   const fullNumber = `${countryCode}${formData.mobile}`;

  //   setIsLoadingss(true);
  //   try {
  //     // 1. Check Backend if number is used
  //     // const check = await fetch('/api/auth/check-availability', {
  //     //   method: 'POST',
  //     //   headers: { 'Content-Type': 'application/json' },
  //     //   body: JSON.stringify({ mobile: fullNumber })
  //     // });
  //     // const checkData = await check.json();
  //     // if (!check.ok) throw new Error(checkData.message);

  //     // 2. If free, send Firebase OTP
  //     await sendFirebaseOtp(fullNumber);
  //     setIsOtpSent(true);
  //     setCountdown(180); // Start 3-minute timer
  //   } catch (err) {
  //     setError({ mobile: err.message });
  //   } finally {
  //     setIsLoadingss(false);
  //   }
  // };
  const handleSendOtp = async () => {
    setError({});
    const fullNumber = `${countryCode}${formData.mobile}`;
    setIsLoadingss(true);

    // Step 1: Check if mobile is already registered
    try {
      const availabilityRes = await checkMobileAvailability(fullNumber.replace("+", ""));
      // Handle both error throws and 200 responses with error messages
      const resMessage = availabilityRes?.message || availabilityRes?.error || "";
      if (availabilityRes?.success === false || resMessage.toLowerCase().includes("already") || resMessage.toLowerCase().includes("registered")) {
        setError({ mobile: resMessage || "This mobile number is already registered. Please log in instead." });
        setIsLoadingss(false);
        return;
      }
    } catch (err) {
      const message = err?.body?.message || err?.body?.error || err?.message || "This mobile number is already registered. Please log in instead.";
      setError({ mobile: message });
      setIsLoadingss(false);
      return; // Block everything — don't send OTP, keep field editable
    }

    // Step 2: Send OTP only if number is available
    try {
      await sendFirebaseOtp(fullNumber);
      setIsOtpSent(true);
      setCountdown(180);
    } catch (err) {
      setError({ mobile: err.message || "Failed to send OTP. Please try again." });
    } finally {
      setIsLoadingss(false);
    }
  };
  const handleResendOtp = async () => {
    if (countdown > 0) return;
    try {
      await sendFirebaseOtp(`${countryCode}${formData.mobile}`);
      setCountdown(180);
      setFormData(prev => ({ ...prev, otp: new Array(6).fill("") }));
    } catch (err) {
      setError({ otp: "Resend failed. Try again." });
    }
  };
  const handleVerifyOtp = async () => {
    const otpCode = formData.otp.join("");
    setIsLoadings(true);
    try {
      const idToken = await verifyFirebaseOtp(otpCode);
      setFirebaseIdToken(idToken);
      setIsMobileVerified(true);
    } catch (err) {
      console.error("OTP verify error:", err);
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("session") || msg.toLowerCase().includes("no otp")) {
        setError({ otp: "Session expired. Please tap Resend OTP and try again." });
      } else if (msg.toLowerCase().includes("expired")) {
        setError({ otp: "Code expired. Please tap Resend OTP." });
      } else {
        setError({ otp: "Invalid code. Please check and try again." });
      }
    } finally {
      setIsLoadings(false);
    }
  };

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
        onLoad={() => {
          setTimeout(() => {
            if (turnstileRef.current && typeof window !== 'undefined' && window.turnstile && !turnstileWidgetId.current) {
              try {
                turnstileRef.current.innerHTML = '';
                setIsTurnstileLoading(true);
                const widgetId = window.turnstile.render(turnstileRef.current, {
                  sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
                  callback: (token) => { setTurnstileToken(token); setIsTurnstileLoading(false); console.log('✅ Turnstile verified:', token); },
                  'error-callback': () => { setTurnstileToken(null); setIsTurnstileLoading(false); console.error('❌ Turnstile error'); },
                  'expired-callback': () => { setTurnstileToken(null); setIsTurnstileLoading(true); console.warn('⏰ Turnstile token expired'); },
                  theme: 'dark',
                  size: 'normal',
                });
                turnstileWidgetId.current = widgetId;
                setIsTurnstileLoading(false);
              } catch (err) {
                console.error('Failed to render Turnstile widget on script load:', err);
              }
            }
          }, 200);
        }}
      />
      <div className="min-h-screen w-full bg-[#272052] overflow-x-hidden ">
        <div
          className="relative w-full min-h-screen bg-[#272052] flex  justify-center"
          data-model-id="1322:2980"
        >
          <div className="relative w-[460px] min-h-screen bg-[#272052] overflow-x-hidden overflow-y-auto"
          >
            <div className="absolute  w-full h-[883px] -top-32 mx-auto">
              <div className="absolute w-full h-[358px] top-0 mx-auto bg-[#af7de6] rounded-[179px] blur-[250px]" />

              <div className="absolute w-[470px] h-[312px] top-[374px] left-4">
                <Image
                  className="absolute w-[83px] h-[125px] top-[-22px] left-3.5"
                  alt="Front shapes"
                  src="/assets/animaapp/bkGH9LUL/img/front-shapes-2x.png"
                  width={83}
                  height={125}
                />

                <div className="absolute w-[41px] h-72 top-[33px] left-[348px]">
                  <Image
                    className="absolute w-[43px] h-[106px] top-0 left-1.5"
                    alt="Front shapes"
                    src="/assets/animaapp/bkGH9LUL/img/front-shapes-1-2x.png"
                    width={43}
                    height={106}
                  />

                  <Image
                    className="absolute w-[18px] h-[275px] top-[13px] left-[23px]"
                    alt="Saly"
                    src="/assets/animaapp/bkGH9LUL/img/saly-16-2x.png"
                    width={18}
                    height={275}
                  />
                </div>
              </div>

              <Image
                className="absolute w-[26px] h-[23px] top-[187px] left-[338px]"
                alt="Gem"
                src="/assets/animaapp/bkGH9LUL/img/gem-1-2x.png"
                width={21}
                height={22}
              />

              <form
                onSubmit={handleSubmit}
                className="w-full absolute top-[274px]  flex flex-col items-center justify-center gap-5 pb-10"
              >
                <div className="flex flex-col">
                  <label className="[font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] mb-[1px] leading-[normal]">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-[314px] h-[55px] rounded-[12px]  bg-white/10 backdrop-blur-lg border border-white/20  focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
                    <Image
                      className="absolute w-[17px] h-[17px] top-5 left-5"
                      alt="User icon"
                      src="/assets/animaapp/bkGH9LUL/img/vector-2.svg"
                      width={17}
                      height={17}
                    />
                    <input
                      type="text"
                      value={formData.firstname}
                      onChange={(e) => handleInputChange("firstname", e.target.value)}
                      className="absolute top-[17px] left-[58px] [font-family:'Poppins',Helvetica] font-medium text-[#d3d3d3] text-[14.3px] tracking-[0] leading-[normal] bg-transparent border-none outline-none w-[240px]"
                      placeholder="Enter your first name"
                      required
                      aria-label="First Name"
                    />
                  </div>
                  {error.firstname && (
                    <p className="text-red-400 text-xs mt-1 ml-2 max-w-[314px] break-words">
                      {error.firstname}
                    </p>
                  )}
                </div>

                {/* Last Name Field */}
                <div className="flex flex-col">
                  <label className="[font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] mb-[1px] leading-[normal]">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-[314px] h-[55px] rounded-[12px]  bg-white/10 backdrop-blur-lg border border-white/20  focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
                    <Image
                      className="absolute w-[17px] h-[17px] top-5 left-5"
                      alt="User icon"
                      src="/assets/animaapp/bkGH9LUL/img/vector-2.svg"
                      width={17}
                      height={17}
                    />
                    <input
                      type="text"
                      value={formData.lastname}
                      onChange={(e) => handleInputChange("lastname", e.target.value)}
                      className="absolute top-[17px] left-[58px] [font-family:'Poppins',Helvetica] font-medium text-[#d3d3d3] text-[14.3px] tracking-[0] leading-[normal] bg-transparent border-none outline-none w-[240px]"
                      placeholder="Enter your last name"
                      required
                      aria-label="Last Name"
                    />
                  </div>
                  {error.lastname && (
                    <p className="text-red-400 text-xs mt-1 ml-2 max-w-[314px] break-words">
                      {error.lastname}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="flex flex-col">
                  <label className="[font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] mb-[1px] leading-[normal]">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-[314px] h-[55px] rounded-[12px] bg-white/10 backdrop-blur-lg border border-white/20  focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
                    <Image
                      className="absolute w-[17px] h-[17px] top-5 left-5"
                      alt="Email icon"
                      src="/assets/animaapp/2Y7fJDnh/img/vector.svg" // Using the correct email icon from your login example
                      width={17}
                      height={17}
                    />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange("email", e.target.value)}
                      className="absolute top-[17px] left-[58px] [font-family:'Poppins',Helvetica] font-medium text-[#d3d3d3] text-[14.3px] tracking-[0] leading-[normal] bg-transparent border-none outline-none w-[240px]"
                      placeholder="Enter your email"
                      required
                      aria-label="Email"
                    />
                  </div>
                  {error.email && (
                    <p className="text-red-400 text-xs mt-1 ml-2 max-w-[314px] break-words">
                      {error.email}
                    </p>
                  )}
                </div>

                {/* MOBILE INPUT SECTION */}
                <div className="flex flex-col">
                  <label className="[font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] mb-[1px] leading-[normal]">
                    Mobile Number <span className="text-red-400">*</span>
                  </label>
                  <div className="w-[314px] h-[55px] rounded-[12px] bg-white/10 backdrop-blur-lg border border-white/20 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors flex items-center px-3 gap-2">
                    <Image className="w-[17px] h-[17px] shrink-0" alt="Phone icon" src="/assets/animaapp/bkGH9LUL/img/vector-2.svg" width={17} height={17} />
                    <button
                      type="button"
                      onClick={() => { if (!isOtpSent && !isMobileVerified) setShowCountryPicker(true); }}
                      disabled={isOtpSent || isMobileVerified}
                      className="flex items-center gap-1 shrink-0 [font-family:'Poppins',Helvetica] font-medium text-[#d3d3d3] text-[14.3px] bg-transparent border-none outline-none disabled:opacity-50"
                    >
                      <span className="text-[18px] leading-none">{selectedFlag}</span>
                      <span className="whitespace-nowrap">{countryCode}</span>
                      <span className="text-[10px] text-[#a0a0a0]">▼</span>
                    </button>
                    <div className="w-px self-stretch my-3 bg-white/20 shrink-0" />
                    <input
                      type="tel"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange("mobile", e.target.value.replace(/\D/g, ''))}
                      maxLength={15}
                      className="flex-1 min-w-0 [font-family:'Poppins',Helvetica] font-medium text-[#d3d3d3] text-[14.3px] tracking-[0] leading-[normal] bg-transparent border-none outline-none disabled:opacity-50"
                      placeholder="Enter mobile number"
                      required
                      disabled={isOtpSent || isMobileVerified}
                    />
                    {!isOtpSent && !isMobileVerified && formData.mobile.length > 0 && (
                      <button
                        type="button"
                        onClick={handleSendOtp}
                        disabled={isLoadingss}
                        className="shrink-0 h-[35px] px-3 rounded-sm bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] text-white text-[14px] font-semibold shadow-md disabled:opacity-50 transition-all"
                      >
                        {isLoadingss ? 'Sending...' : 'Send OTP'}
                      </button>
                    )}
                    {isMobileVerified && (
                      <div className="shrink-0 text-green-400 text-sm font-semibold flex items-center">✓ Verified</div>
                    )}
                  </div>
                  {error.mobile && <p className="text-red-400 text-xs mt-1 ml-2 max-w-[314px] break-words">{error.mobile}</p>}
                  {/* reCAPTCHA — inside mobile field wrapper so it doesn't create extra gap */}
                  <div id="recaptcha-container" className={`flex justify-center ${isOtpSent || isMobileVerified ? 'hidden' : 'mt-1 '}`}></div>
                </div>

                {/* OTP SECTION */}
                {isOtpSent && !isMobileVerified && (
                  <div ref={otpSectionRef} className="w-full flex flex-col items-center justify-center ">
                    <h3 className="[font-family:'Poppins',Helvetica] mb-1 ml-4 font-medium text-[#A4A4A4] text-[14.3px] tracking-[0] leading-[normal]">
                      Verify OTP sent to your mobile number
                    </h3>

                    <div className="flex justify-center gap-2 pt-2">
                      {formData.otp.map((data, index) => (
                        <input
                          key={index}
                          type="text"
                          maxLength="1"
                          value={data}
                          onChange={e => handleOtpChange(e.target, index)}
                          onKeyDown={e => handleOtpKeyDown(e, index)}
                          onFocus={e => e.target.select()}
                          ref={el => otpInputs.current[index] = el}
                          className={`w-[45px] h-[55px] text-center bg-white/10 backdrop-blur-lg border-white/20 text-2xl font-semibold text-white rounded-[8px] border ${error.otp ? 'border-red-500' : 'border-gray-600'} focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors`}
                        />
                      ))}
                    </div>
                    {error.otp && <p className="text-red-400 text-xs mt-1 text-center max-w-[314px] mx-auto break-words px-2">{error.otp}</p>}

                    <div className="w-[315px] flex justify-between items-center mt-1">
                      <p className="font-medium text-[#FFFFFF] text-[14px] mt-2 ml-4">
                        {`${formatTime(countdown)} remaining`}
                      </p>
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={countdown > 0 || isResending}
                        className="mt-2 mr-4 w-[96px] h-[32px] rounded-[4px] border border-[#9EADF7] text-[#9EADF7] text-[13px] font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        {isResending ? 'Sending...' : 'Resend OTP'}
                      </button>
                    </div>

                    <div className="w-[180px] flex items-center justify-center pt-4">
                      <button
                        type="button"
                        onClick={handleVerifyOtp}
                        disabled={isLoadings || formData.otp.join('').length < 6}
                        className="w-full h-12 rounded-xl bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)] text-white text-lg font-semibold shadow-md disabled:opacity-50 transition-opacity"
                      >
                        {isLoadings ? 'Verifying...' : 'Verify'}
                      </button>
                    </div>
                  </div>
                )}
                <div className="flex flex-col">
                  <label className="[font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] mb-[1px] leading-[normal]">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-[314px] h-[55px] rounded-[12px]  bg-white/10 backdrop-blur-lg border border-white/20  focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
                    <div className="absolute w-[17px] h-[17px] top-5 left-5">
                      <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.3901 2.90445L18.0398 2.26388C18.2122 2.09156 18.309 1.85785 18.309 1.61416C18.309 1.37046 18.2122 1.13675 18.0398 0.964436C17.8675 0.792119 17.6338 0.695312 17.3901 0.695312C17.1464 0.695313 16.9127 0.792119 16.7404 0.964436L15.4593 2.25473L12.8695 4.84446L7.09524 10.6096C6.14907 9.98535 5.00485 9.73454 3.88431 9.90578C2.76377 10.077 1.74668 10.6581 1.03013 11.5365C0.313576 12.4148 -0.0514261 13.5279 0.0058485 14.66C0.0631231 15.7921 0.538597 16.8626 1.34014 17.6641C2.14168 18.4657 3.21222 18.9412 4.34432 18.9984C5.47642 19.0557 6.58948 18.6907 7.46783 17.9742C8.34617 17.2576 8.92726 16.2405 9.0985 15.12C9.26974 13.9994 9.01894 12.8552 8.39469 11.909L13.5101 6.78447L15.4501 8.73364C15.5354 8.81836 15.6366 8.88545 15.7479 8.93107C15.8591 8.97669 15.9783 8.99995 16.0985 8.99953C16.2187 8.9991 16.3377 8.975 16.4486 8.92859C16.5596 8.88218 16.6603 8.81439 16.745 8.72906C16.8297 8.64374 16.8968 8.54257 16.9424 8.43132C16.988 8.32007 17.0113 8.20092 17.0109 8.08068C17.0104 7.96044 16.9863 7.84146 16.9399 7.73054C16.8935 7.61962 16.8257 7.51892 16.7404 7.4342L14.8004 5.49418L16.0998 4.20389L16.7404 4.84446C16.8251 4.92978 16.9258 4.99758 17.0367 5.04399C17.1477 5.0904 17.2666 5.1145 17.3869 5.11493C17.5071 5.11535 17.6263 5.09209 17.7375 5.04647C17.8488 5.00085 17.9499 4.93376 18.0353 4.84904C18.1206 4.76432 18.1884 4.66362 18.2348 4.55269C18.2812 4.44177 18.3053 4.32279 18.3057 4.20255C18.3062 4.08231 18.2829 3.96317 18.2373 3.85192C18.1917 3.74067 18.1246 3.63949 18.0398 3.55417L17.3901 2.90445ZM4.57872 17.1709C4.03575 17.1709 3.50497 17.0099 3.05351 16.7082C2.60205 16.4065 2.25018 15.9778 2.04239 15.4761C1.83461 14.9745 1.78024 14.4225 1.88617 13.89C1.9921 13.3574 2.25356 12.8683 2.6375 12.4843C3.02143 12.1004 3.5106 11.8389 4.04314 11.733C4.57567 11.6271 5.12766 11.6814 5.6293 11.8892C6.13094 12.097 6.5597 12.4489 6.86135 12.9004C7.16301 13.3518 7.32402 13.8826 7.32402 14.4256C7.32402 15.1537 7.03478 15.8519 6.51994 16.3668C6.0051 16.8816 5.30682 17.1709 4.57872 17.1709Z" fill="#A4A4A4" />
                      </svg>

                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleInputChange("password", e.target.value)}
                      className="absolute top-[17px] left-[58px] [font-family:'Poppins',Helvetica] font-medium text-[#d3d3d3] text-[14.3px] tracking-[0] leading-[normal] bg-transparent border-none outline-none w-[200px]"
                      placeholder="Enter your password"
                      required
                      aria-label="Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute top-5 right-5 w-5 h-5 text-gray-400"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <svg width="17" height="17" viewBox="0 0 20 20" fill="none" className="w-full h-full">
                          <path d="M10 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" stroke="#d3d3d3" strokeWidth="1.2" fill="none" />
                          <path d="M10 4C5.5 4 1.73 7.11 1 10c.73 2.89 4.5 6 9 6s8.27-3.11 9-6c-.73-2.89-4.5-6-9-6z" stroke="#d3d3d3" strokeWidth="1.2" fill="none" />
                        </svg>
                      ) : (

                        <svg width="17" height="17" viewBox="0 0 20 20" fill="none" className="w-full h-full">
                          <path d="M10 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" stroke="#d3d3d3" strokeWidth="1.2" fill="none" />
                          <path d="M10 4C5.5 4 1.73 7.11 1 10c.73 2.89 4.5 6 9 6s8.27-3.11 9-6c-.73-2.89-4.5-6-9-6z" stroke="#d3d3d3" strokeWidth="1.2" fill="none" />
                          <line x1="3" y1="3" x2="17" y2="17" stroke="#d3d3d3" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {error.password && (
                    <p className="text-red-400 text-xs mt-1 ml-2 max-w-[314px] break-words">
                      {error.password}
                    </p>
                  )}
                </div>

                {/* Confirm Password Field */}
                <div className="flex flex-col">
                  <label className="[font-family:'Poppins',Helvetica] font-medium text-neutral-400 text-[14.3px] tracking-[0] mb-[1px] leading-[normal]">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative w-[314px] h-[55px] rounded-[12px]  bg-white/10 backdrop-blur-lg border border-white/20  focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-colors">
                    <div className="absolute w-[17px] h-[17px] top-5 left-5">
                      <svg width="19" height="19" viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.3901 2.90445L18.0398 2.26388C18.2122 2.09156 18.309 1.85785 18.309 1.61416C18.309 1.37046 18.2122 1.13675 18.0398 0.964436C17.8675 0.792119 17.6338 0.695312 17.3901 0.695312C17.1464 0.695313 16.9127 0.792119 16.7404 0.964436L15.4593 2.25473L12.8695 4.84446L7.09524 10.6096C6.14907 9.98535 5.00485 9.73454 3.88431 9.90578C2.76377 10.077 1.74668 10.6581 1.03013 11.5365C0.313576 12.4148 -0.0514261 13.5279 0.0058485 14.66C0.0631231 15.7921 0.538597 16.8626 1.34014 17.6641C2.14168 18.4657 3.21222 18.9412 4.34432 18.9984C5.47642 19.0557 6.58948 18.6907 7.46783 17.9742C8.34617 17.2576 8.92726 16.2405 9.0985 15.12C9.26974 13.9994 9.01894 12.8552 8.39469 11.909L13.5101 6.78447L15.4501 8.73364C15.5354 8.81836 15.6366 8.88545 15.7479 8.93107C15.8591 8.97669 15.9783 8.99995 16.0985 8.99953C16.2187 8.9991 16.3377 8.975 16.4486 8.92859C16.5596 8.88218 16.6603 8.81439 16.745 8.72906C16.8297 8.64374 16.8968 8.54257 16.9424 8.43132C16.988 8.32007 17.0113 8.20092 17.0109 8.08068C17.0104 7.96044 16.9863 7.84146 16.9399 7.73054C16.8935 7.61962 16.8257 7.51892 16.7404 7.4342L14.8004 5.49418L16.0998 4.20389L16.7404 4.84446C16.8251 4.92978 16.9258 4.99758 17.0367 5.04399C17.1477 5.0904 17.2666 5.1145 17.3869 5.11493C17.5071 5.11535 17.6263 5.09209 17.7375 5.04647C17.8488 5.00085 17.9499 4.93376 18.0353 4.84904C18.1206 4.76432 18.1884 4.66362 18.2348 4.55269C18.2812 4.44177 18.3053 4.32279 18.3057 4.20255C18.3062 4.08231 18.2829 3.96317 18.2373 3.85192C18.1917 3.74067 18.1246 3.63949 18.0398 3.55417L17.3901 2.90445ZM4.57872 17.1709C4.03575 17.1709 3.50497 17.0099 3.05351 16.7082C2.60205 16.4065 2.25018 15.9778 2.04239 15.4761C1.83461 14.9745 1.78024 14.4225 1.88617 13.89C1.9921 13.3574 2.25356 12.8683 2.6375 12.4843C3.02143 12.1004 3.5106 11.8389 4.04314 11.733C4.57567 11.6271 5.12766 11.6814 5.6293 11.8892C6.13094 12.097 6.5597 12.4489 6.86135 12.9004C7.16301 13.3518 7.32402 13.8826 7.32402 14.4256C7.32402 15.1537 7.03478 15.8519 6.51994 16.3668C6.0051 16.8816 5.30682 17.1709 4.57872 17.1709Z" fill="#A4A4A4" />
                      </svg>
                    </div>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                      className="absolute top-[17px] left-[58px] [font-family:'Poppins',Helvetica] font-medium text-[#d3d3d3] text-[14.3px] tracking-[0] leading-[normal] bg-transparent border-none outline-none w-[200px]"
                      placeholder="Confirm your password"
                      required
                      aria-label="Confirm Password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}

                      className="absolute top-5 right-5 w-5 h-5 text-gray-400"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <svg width="17" height="17" viewBox="0 0 20 20" fill="none" className="w-full h-full">
                          <path d="M10 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" stroke="#d3d3d3" strokeWidth="1.2" fill="none" />
                          <path d="M10 4C5.5 4 1.73 7.11 1 10c.73 2.89 4.5 6 9 6s8.27-3.11 9-6c-.73-2.89-4.5-6-9-6z" stroke="#d3d3d3" strokeWidth="1.2" fill="none" />
                        </svg>
                      ) : (

                        <svg width="17" height="17" viewBox="0 0 20 20" fill="none" className="w-full h-full">
                          <path d="M10 12c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2z" stroke="#d3d3d3" strokeWidth="1.2" fill="none" />
                          <path d="M10 4C5.5 4 1.73 7.11 1 10c.73 2.89 4.5 6 9 6s8.27-3.11 9-6c-.73-2.89-4.5-6-9-6z" stroke="#d3d3d3" strokeWidth="1.2" fill="none" />
                          <line x1="3" y1="3" x2="17" y2="17" stroke="#d3d3d3" strokeWidth="1.2" strokeLinecap="round" />
                        </svg>
                      )}
                    </button>
                  </div>
                  {error.confirmPassword && (
                    <p className="text-red-400 text-xs mt-1 ml-2 max-w-[314px] break-words">
                      {error.confirmPassword}
                    </p>
                  )}
                </div>
                {/* Error Message Display */}
                {error.form && (
                  <div className="w-full max-w-[314px] mx-auto text-center px-2">
                    <p className="text-red-400 text-sm break-words">{error.form}</p>
                  </div>
                )}
                {/* ============================================================
                  CLOUDFLARE TURNSTILE WIDGET - MANUAL RENDERING
                  ============================================================
                  
                  HOW IT WORKS:
                  1. Widget container is rendered with a ref
                  2. Widget is manually rendered via useEffect when script loads
                  3. This ensures it works on both page refresh and client-side navigation
                  4. Widget starts analyzing user behavior in the background
                  5. When verified → callback fires automatically
                  6. Token is stored in state and sent to backend with form
                  
                  Widget Modes:
                  - "Managed" (default): Automatically decides if challenge needed
                  - "Non-interactive": Never shows challenge, fully invisible
                  - "Invisible": Completely hidden, always automatic
                  
                  Most users will NEVER see a challenge - it's automatic!
                  ============================================================ */}
                <div className="w-full flex flex-col items-center justify-center mt-2">
                  <div
                    ref={turnstileRef}
                    className="cf-turnstile"
                  />
                  {isTurnstileLoading && !turnstileToken && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="w-4 h-4 border-2 border-[#af7de6] border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-white text-xs [font-family:'Poppins',Helvetica] font-medium">
                        Verifying security...
                      </p>
                    </div>
                  )}
                  {!isTurnstileLoading && !turnstileToken && (
                    <p className="text-neutral-400 text-xs mt-1 text-center max-w-[314px] mx-auto break-words px-2 [font-family:'Poppins',Helvetica]">
                      Security check in progress
                    </p>
                  )}
                </div>

                {/* Sign Up Button */}
                <div className='flex justify-between items-center'>
                  <button
                    onClick={handleSubmit} disabled={isLoading || !isMobileVerified}

                    className="all-[unset] box-border w-full h-[50px] cursor-pointer disabled:opacity-50 mt-1"
                    type="submit"
                  >
                    <div className="flex justify-center items-center w-80 h-[50px] rounded-[12.97px] bg-[linear-gradient(180deg,rgba(158,173,247,1)_0%,rgba(113,106,231,1)_100%)]">
                      <div className={`flex justify-center items-center w-full h-full [font-family:'Poppins',Helvetica] font-semibold text-white text-lg tracking-[0] leading-[normal]`}>
                        {isLoading ? (
                          <span className="w-full text-center">Signing Up.</span>
                        ) : (
                          <span className="w-full text-center">Sign up</span>
                        )}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Sign In Link */}
                <div className="w-full text-center mt-1">
                  <p className="[font-family:'Poppins',Helvetica] font-medium text-sm tracking-[0] leading-[normal]">
                    <span className="text-white">Already have an account? </span>
                    <Link
                      href="/login"
                      className="text-[#9098f2] cursor-pointer bg-transparent border-none outline-none [font-family:'Poppins',Helvetica] font-medium text-sm hover:text-[#a5aef5] transition-colors duration-200"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </form>

              <div className="absolute w-[305px] h-[65px] top-[179px] left-1/2 -translate-x-1/2 text-center">
                <h1 className="[font-family:'Poppins',Helvetica] font-semibold text-[#efefef] text-2xl tracking-[0] leading-[normal]">
                  Welcome to Jackson!
                </h1>
                <p className="[font-family:'Poppins',Helvetica]  font-medium text-neutral-400 text-sm tracking-[0] leading-[normal] mt-[3px]">
                  Create account to earn &amp; withdraw money
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
      {/* COUNTRY PICKER BOTTOM SHEET */}
      {showCountryPicker && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => { setShowCountryPicker(false); setCountrySearch(''); }}
          />
          <div
            className="fixed left-0 right-0 z-50 bg-[#272052] rounded-t-[24px] flex flex-col border-t border-[#af7de6]/30 overflow-hidden"
            style={{
              bottom: 0,
              // adjustResize shrinks the WebView so 100dvh = space above keyboard.
              // The sheet sits flush with the keyboard top with no JS height needed.
              maxHeight: `calc(100dvh - env(safe-area-inset-top, 0px) - 20px)`,
            }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 bg-white/20 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 pb-3">
              <h3 className="[font-family:'Poppins',Helvetica] font-semibold text-white text-[16px]">Select Country</h3>
              <button
                type="button"
                onClick={() => { setShowCountryPicker(false); setCountrySearch(''); }}
                className="text-[#d3d3d3] text-xl w-8 h-8 flex items-center justify-center"
              >✕</button>
            </div>
            <div className="px-4 pb-3">
              <div className="flex items-center bg-white/10 rounded-[10px] px-3 h-[42px] border border-white/20">
                <span className="text-[#a0a0a0] mr-2 text-[14px]">🔍</span>
                <input
                  type="text"
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search country or code..."
                  className="flex-1 bg-transparent outline-none [font-family:'Poppins',Helvetica] text-[#d3d3d3] text-[14px] placeholder:text-[#707070]"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-2 pb-6">
              {parsedCountries
                .filter(c =>
                  c.name.toLowerCase().includes(countrySearch.toLowerCase()) ||
                  `+${c.dialCode}`.includes(countrySearch)
                )
                .map(c => (
                  <button
                    key={c.iso2}
                    type="button"
                    onClick={() => {
                      setCountryCode(`+${c.dialCode}`);
                      setSelectedFlag(c.flag);
                      setShowCountryPicker(false);
                      setCountrySearch('');
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-[11px] rounded-[10px] text-left transition-colors ${countryCode === `+${c.dialCode}` ? 'bg-[#af7de6]/20 border border-[#af7de6]/30' : 'active:bg-white/10'
                      }`}
                  >
                    <span className="text-[22px] w-8 text-center">{c.flag}</span>
                    <span className="flex-1 [font-family:'Poppins',Helvetica] text-[#d3d3d3] text-[14px]">{c.name}</span>
                    <span className="[font-family:'Poppins',Helvetica] text-[#af7de6] text-[13px] font-medium">+{c.dialCode}</span>
                  </button>
                ))
              }
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SignUp;