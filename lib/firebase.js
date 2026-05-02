// lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate required Firebase config
if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
  console.error("❌ [Firebase] Missing required Firebase configuration. Please check your .env file.");
}

let auth = null;

if (firebaseConfig.apiKey && firebaseConfig.projectId) {
  // Force initialize or get existing
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

  // LOG THIS TO YOUR CONSOLE TO VERIFY IT IS WORKING
  console.log("🔥 Firebase check - Project ID is:", app.options.projectId);

  auth = getAuth(app);
} else {
  console.warn("⚠️ [Firebase] Auth is disabled because Firebase config is incomplete.");
}

export { auth };
