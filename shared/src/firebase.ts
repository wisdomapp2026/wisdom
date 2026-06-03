import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

/**
 * Firebase konfiguratsiya
 * Vite (admin-web): import.meta.env.VITE_*
 * Expo (student-app): process.env.EXPO_PUBLIC_*
 */
function getEnv(viteKey: string, expoKey: string): string {
  // Vite environment
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    return (import.meta as any).env[viteKey] || "";
  }
  // Node/Expo environment
  if (typeof process !== "undefined" && process.env) {
    return process.env[expoKey] || "";
  }
  return "";
}

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY", "EXPO_PUBLIC_FIREBASE_API_KEY"),
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN", "EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN"),
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID", "EXPO_PUBLIC_FIREBASE_PROJECT_ID"),
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET", "EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET"),
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID", "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID"),
  appId: getEnv("VITE_FIREBASE_APP_ID", "EXPO_PUBLIC_FIREBASE_APP_ID"),
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
