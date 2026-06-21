import { useEffect, useRef } from "react";
import { startUserSession, updateSessionTime, endUserSession } from "@shared/repositories";

/**
 * O'quvchining dasturda o'tkazgan vaqtini kuzatuvchi hook.
 * - Kirganida sessiya boshlanadi
 * - Har 30 soniyada vaqt yangilanadi (Firestore ga yoziladi)
 * - Sahifa yopilganda yoki chiqib ketganda sessiya tugatiladi
 */
export function useActivityTracker(userId: string | undefined, userName: string | undefined) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isTracking = useRef(false);

  useEffect(() => {
    if (!userId || !userName) return;

    // Sessiyani boshlash
    startUserSession(userId, userName).catch(console.error);
    isTracking.current = true;

    // Har 30 soniyada vaqtni yangilash
    intervalRef.current = setInterval(() => {
      if (isTracking.current) {
        updateSessionTime(userId).catch(console.error);
      }
    }, 30000); // 30 sekund

    // Sahifa yopilganda sessiyani tugatish
    const handleBeforeUnload = () => {
      if (isTracking.current) {
        endUserSession(userId).catch(console.error);
        isTracking.current = false;
      }
    };

    // Visibility o'zgarganida (tab switch, minimize)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab yashirildi — sessiyani to'xtatish
        endUserSession(userId).catch(console.error);
        isTracking.current = false;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        // Tab qayta ochildi — yangi sessiya boshlash
        startUserSession(userId, userName).catch(console.error);
        isTracking.current = true;
        intervalRef.current = setInterval(() => {
          if (isTracking.current) {
            updateSessionTime(userId).catch(console.error);
          }
        }, 30000);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      // Cleanup
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (isTracking.current) {
        endUserSession(userId).catch(console.error);
        isTracking.current = false;
      }
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [userId, userName]);
}
