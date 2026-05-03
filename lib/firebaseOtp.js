import { auth } from "./firebase";
import { Capacitor } from "@capacitor/core";
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

let confirmationResult = null;
let recaptchaVerifier = null;
let nativeVerificationId = null;
let phoneCodeSentListener = null;
let phoneVerificationCompletedListener = null;
let phoneVerificationFailedListener = null;

const logOtp = (message, data = {}) => {
  console.log(`[🔐 FIREBASE-OTP] ${message}`, data);
};

const warnOtp = (message, data = {}) => {
  console.warn(`[🔐 FIREBASE-OTP] ${message}`, data);
};

const errorOtp = (message, data = {}) => {
  console.error(`[🔐 FIREBASE-OTP] ${message}`, data);
};

const getFirebaseConfig = () => ({
  hasApiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  hasAuthDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  hasProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  hasAppId: !!process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  hasMessagingSenderId: !!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
});

const logFirebaseConfig = () => {
  logOtp("Firebase config check", getFirebaseConfig());
};

const clearWebSession = () => {
  if (recaptchaVerifier) {
    try {
      recaptchaVerifier.clear();
    } catch (err) {
      warnOtp("Failed to clear previous reCAPTCHA verifier", {
        error: err?.message,
      });
    }
    recaptchaVerifier = null;
  }
  confirmationResult = null;
};

const clearNativeListeners = async () => {
  if (phoneCodeSentListener) {
    await phoneCodeSentListener.remove();
    phoneCodeSentListener = null;
  }
  if (phoneVerificationCompletedListener) {
    await phoneVerificationCompletedListener.remove();
    phoneVerificationCompletedListener = null;
  }
  if (phoneVerificationFailedListener) {
    await phoneVerificationFailedListener.remove();
    phoneVerificationFailedListener = null;
  }
  nativeVerificationId = null;
};

export const sendFirebaseOtp = async (phoneNumber) => {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  logFirebaseConfig();
  logOtp("sendFirebaseOtp called", {
    phoneNumber,
    isNative,
    platform,
  });

  if (!phoneNumber) {
    throw new Error("Phone number is required to send OTP.");
  }

  if (!auth) {
    const config = getFirebaseConfig();
    errorOtp("Firebase auth unavailable", { platform, ...config });
    throw new Error(
      "Firebase configuration is incomplete. Set NEXT_PUBLIC_FIREBASE_* variables before using OTP.",
    );
  }

  if (isNative) {
    try {
      logOtp("Native platform detected, attempting native Firebase OTP", {
        phoneNumber,
        platform,
      });

      const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");

      if (FirebaseAuthentication?.signInWithPhoneNumber) {
        await clearNativeListeners();

        phoneCodeSentListener = await FirebaseAuthentication.addListener("phoneCodeSent", async (event) => {
          logOtp("phoneCodeSent received", {
            hasVerificationId: !!event.verificationId,
          });
          nativeVerificationId = event.verificationId || null;
        });

        phoneVerificationCompletedListener = await FirebaseAuthentication.addListener("phoneVerificationCompleted", async (event) => {
          logOtp("phoneVerificationCompleted", {
            hasUser: !!event.result?.user,
          });
          nativeVerificationId = null;
          await clearNativeListeners();
        });

        phoneVerificationFailedListener = await FirebaseAuthentication.addListener("phoneVerificationFailed", async (event) => {
          logOtp("phoneVerificationFailed", {
            message: event.message,
          });
          nativeVerificationId = null;
          await clearNativeListeners();
        });

        logOtp("Calling native signInWithPhoneNumber", { phoneNumber });
        await FirebaseAuthentication.signInWithPhoneNumber({
          phoneNumber,
        });

        logOtp("OTP initiated via native Firebase SDK", {
          phoneNumber,
        });
        return true;
      }

      warnOtp("Native Firebase Authentication not available, falling back to web SDK", {
        platform,
        hasNativePlugin: !!FirebaseAuthentication,
      });
    } catch (err) {
      warnOtp("Native Firebase OTP failed, falling back to web SDK", {
        error: err?.message,
        code: err?.code,
        platform,
      });
    }
  }

  try {
    if (typeof window === "undefined") {
      throw new Error("Firebase OTP web fallback requires a browser environment.");
    }

    const containerId = "recaptcha-container";
    const container = document.getElementById(containerId);
    logOtp("Web fallback selected", {
      containerFound: !!container,
      containerId,
    });

    if (!container) {
      throw new Error("Missing #recaptcha-container element for Firebase OTP.");
    }

    clearWebSession();

    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: "normal",
      callback: (token) => {
        logOtp("reCAPTCHA solved", {
          hasToken: !!token,
          tokenPreview: token ? `${String(token).slice(0, 6)}...` : null,
        });
      },
      "expired-callback": () => {
        warnOtp("reCAPTCHA expired");
      },
    });

    logOtp("Rendering reCAPTCHA widget", { containerId });
    await recaptchaVerifier.render();

    confirmationResult = await signInWithPhoneNumber(
      auth,
      phoneNumber,
      recaptchaVerifier,
    );

    logOtp("OTP sent via Firebase web SDK", {
      phoneNumber,
      hasConfirmationResult: !!confirmationResult,
    });

    return true;
  } catch (error) {
    errorOtp("OTP send failed", {
      phoneNumber,
      code: error?.code,
      message: error?.message,
      platform,
      isNative,
    });
    throw error;
  }
};

export const verifyFirebaseOtp = async (otp) => {
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  logFirebaseConfig();
  logOtp("verifyFirebaseOtp called", {
    otpLength: otp ? String(otp).length : 0,
    isNative,
    platform,
  });

  if (!otp) {
    throw new Error("OTP code is required.");
  }

  if (!auth) {
    const config = getFirebaseConfig();
    errorOtp("Firebase auth unavailable for verify", { platform, ...config });
    throw new Error(
      "Firebase configuration is incomplete. Set NEXT_PUBLIC_FIREBASE_* variables before verifying OTP.",
    );
  }

  if (isNative) {
    try {
      const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");

      if (!nativeVerificationId) {
        throw new Error("No OTP session found. Please resend OTP.");
      }

      if (!FirebaseAuthentication?.confirmVerificationCode) {
        throw new Error(
          "Native Firebase OTP plugin is not available on this build.",
        );
      }

      logOtp("Confirming native Firebase OTP", {
        hasVerificationId: !!nativeVerificationId,
        verificationIdPreview: `${String(nativeVerificationId).slice(0, 6)}...`,
      });

      const result = await FirebaseAuthentication.confirmVerificationCode({
        verificationId: nativeVerificationId,
        verificationCode: otp,
      });

      const idTokenResult = await FirebaseAuthentication.getIdToken();
      const idToken = idTokenResult?.token || null;

      logOtp("Native Firebase OTP verified", {
        hasToken: !!idToken,
        phoneNumber: result?.user?.phoneNumber,
      });

      await clearNativeListeners();
      return idToken;
    } catch (error) {
      errorOtp("Native Firebase OTP verify failed", {
        code: error?.code,
        message: error?.message,
        platform,
        hasNativePlugin: !!error,
      });
      throw error;
    }
  }

  try {
    if (!confirmationResult) {
      throw new Error("No OTP session found. Please resend OTP.");
    }

    logOtp("Confirming web Firebase OTP", {
      hasConfirmationResult: true,
    });

    const result = await confirmationResult.confirm(otp);
    const token = await result.user.getIdToken();

    logOtp("Web Firebase OTP verified", {
      hasToken: !!token,
      uid: result?.user?.uid || null,
    });

    clearWebSession();
    return token;
  } catch (error) {
    errorOtp("Web Firebase OTP verify failed", {
      code: error?.code,
      message: error?.message,
      platform,
    });
    throw error;
  }
};

export const resetFirebaseOtpState = () => {
  logOtp("Resetting Firebase OTP state");
  clearNativeListeners();
  clearWebSession();
};
