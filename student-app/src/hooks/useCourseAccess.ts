import { useState, useEffect } from "react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@shared/firebase";
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
      // 1. Shu kursga tegishli aktiv obunani qidirish
      const q = query(
        collection(db, "subscriptions"),
        where("userId", "==", user!.uid),
        where("courseId", "==", courseId),
        where("status", "==", "active")
      );
      const snap = await getDocs(q);
      
      const now = Date.now();
      const hasValidSub = snap.docs.some((doc) => {
        const data = doc.data();
        return data.endDate > now;
      });

      if (hasValidSub) {
        setHasAccess(true);
        return;
      }

      // 2. Eski umumiy obuna (courseId bo'sh) — backward compatibility
      const qOld = query(
        collection(db, "subscriptions"),
        where("userId", "==", user!.uid),
        where("status", "==", "active")
      );
      const snapOld = await getDocs(qOld);
      const hasOldSub = snapOld.docs.some((doc) => {
        const data = doc.data();
        return (!data.courseId || data.courseId === "") && data.endDate > now;
      });

      setHasAccess(hasOldSub);
    } catch {
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }

  return { hasAccess, loading };
}
