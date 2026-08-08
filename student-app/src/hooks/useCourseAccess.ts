import { useState, useEffect } from "react";
import { getAllUserSubscriptions } from "@shared/repositories";
import { useAuth } from "./useAuth";

/**
 * Foydalanuvchining ma'lum bir kursga kirish huquqi bor-yo'qligini tekshiradi.
 * 
 * Huquq bor agar:
 * 1. Kurs bepul (isPremium === false)
 * 2. Foydalanuvchi shu kursga alohida obuna sotib olgan (courseId === kursId)
 * 3. Foydalanuvchi shu kursni bir martalik sotib olgan
 * 
 * Eski "barcha kursga umumiy obuna" modeli endi ishlamaydi.
 */
export function useCourseAccess(courseId: string | undefined) {
  const { user, loading: authLoading } = useAuth();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user || !courseId) {
      setHasAccess(false);
      setLoading(false);
      return;
    }
    checkAccess();
  }, [user, authLoading, courseId]);

  async function checkAccess() {
    try {
      const subs = await getAllUserSubscriptions(user!.uid);
      const now = Date.now();
      
      // 1. Shu kursga tegishli aktiv obunani qidirish
      const hasValidSub = subs.some(
        (sub) => sub.courseId === courseId && sub.status === "active" && sub.endDate > now
      );

      if (hasValidSub) {
        setHasAccess(true);
        return;
      }

      // 2. Eski umumiy obuna (courseId bo'sh) — backward compatibility
      const hasOldSub = subs.some(
        (sub) => (!sub.courseId || sub.courseId === "") && sub.status === "active" && sub.endDate > now
      );

      setHasAccess(hasOldSub);
    } catch {
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }

  return { hasAccess, loading };
}
