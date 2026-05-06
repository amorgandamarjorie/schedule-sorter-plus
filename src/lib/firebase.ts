import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

// 🔑 Replace these with your Firebase project config
// (Firebase Console → Project settings → Your apps → SDK setup)
export const firebaseConfig = {
  apiKey: "AIzaSyCLvaTMs6lpewN7DKQfi3DefoB3RA51to4",
  authDomain: "schedule-sorter-plus-main.firebaseapp.com",
  projectId: "schedule-sorter-plus-main",
  storageBucket: "schedule-sorter-plus-main.firebasestorage.app",
  messagingSenderId: "991071231543",
  appId: "1:991071231543:web:fcd4d96b3a16d6df7aa9b2",
  measurementId: "G-Q4PDPMQX32",
};

// 🔑 Replace with your reCAPTCHA v2 site key (google.com/recaptcha → admin)
export const RECAPTCHA_SITE_KEY = "6LfjgNwsAAAAAG5RrQUh4vc76cfH6s3ZHvvCwpnA";

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
