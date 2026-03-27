// Firebase OTP functionality commented out — OTP not in use
// import { initializeApp, getApps, getApp } from "firebase/app";
// import {
//   getAuth,
//   RecaptchaVerifier,
//   signInWithPhoneNumber,
// } from "firebase/auth";
// import { Capacitor } from "@capacitor/core";
// import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// };

// let app = null;
// let auth = null;

// if (firebaseConfig.apiKey && firebaseConfig.projectId) {
//   app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
//   auth = getAuth(app);
// }

// let confirmationResult = null;
// let recaptchaVerifier = null;
// let nativeVerificationId = null;

// export const sendFirebaseOtp = async (phoneNumber) => {
//   // Native Android/iOS — use native Firebase SDK (no reCAPTCHA)
//   if (Capacitor.isNativePlatform()) {
//     try {
//       const result = await FirebaseAuthentication.signInWithPhoneNumber({
//         phoneNumber,
//       });
//       nativeVerificationId = result?.verificationId ?? null;
//       console.log("✅ OTP sent via native SDK to:", phoneNumber);
//       return true;
//     } catch (error) {
//       console.error("❌ Native SMS Error:", error.code, error.message);
//       throw error;
//     }
//   }

//   // Web / Capacitor WebView fallback — use web SDK with visible reCAPTCHA
//   try {
//     const containerId = "recaptcha-container";
//     const container = document.getElementById(containerId);

//     if (!container) {
//       throw new Error("Missing <div id='recaptcha-container'></div>");
//     }

//     if (recaptchaVerifier) {
//       recaptchaVerifier.clear();
//       recaptchaVerifier = null;
//     }

//     recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
//       size: "normal",
//       callback: () => {
//         console.log("reCAPTCHA solved");
//       },
//       "expired-callback": () => {
//         console.warn("reCAPTCHA expired");
//       },
//     });

//     await recaptchaVerifier.render();

//     confirmationResult = await signInWithPhoneNumber(
//       auth,
//       phoneNumber,
//       recaptchaVerifier,
//     );

//     console.log("✅ OTP sent via web SDK to:", phoneNumber);
//     return true;
//   } catch (error) {
//     console.error("❌ SMS Error:", error.code, error.message);
//     throw error;
//   }
// };

// export const verifyFirebaseOtp = async (otp) => {
//   // Native Android/iOS
//   if (Capacitor.isNativePlatform()) {
//     try {
//       if (!nativeVerificationId) {
//         throw new Error("No OTP session found. Please resend OTP.");
//       }
//       const result = await FirebaseAuthentication.confirmVerificationCode({
//         verificationId: nativeVerificationId,
//         verificationCode: otp,
//       });
//       const idToken = await FirebaseAuthentication.getIdToken();
//       return idToken.token;
//     } catch (error) {
//       console.error("❌ Native OTP verify error:", error.code, error.message);
//       throw error;
//     }
//   }

//   // Web fallback
//   if (!confirmationResult) {
//     throw new Error("No OTP session found. Please resend OTP.");
//   }

//   const result = await confirmationResult.confirm(otp);
//   return await result.user.getIdToken();
// };
