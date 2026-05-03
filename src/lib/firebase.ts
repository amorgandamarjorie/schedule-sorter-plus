import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

// 🔑 Replace these with your Firebase project config
// (Firebase Console → Project settings → Your apps → SDK setup)
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
};

// 🔑 Replace with your reCAPTCHA v2 site key (google.com/recaptcha → admin)
export const RECAPTCHA_SITE_KEY = "YOUR_RECAPTCHA_V2_SITE_KEY";

// Test site key (works on localhost; replace before publishing)
export const RECAPTCHA_TEST_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (typeof window === "undefined") throw new Error("Firebase is browser-only");
  if (!app) app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) authInstance = getAuth(getFirebaseApp());
  return authInstance;
}

export const googleProvider = new GoogleAuthProvider();
