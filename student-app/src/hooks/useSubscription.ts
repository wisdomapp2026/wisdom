import { useState, useEffect } from "react";
import { getUserSubscription } from "@shared/repositories";
import { useAuth } from "./useAuth";

/**
 * Foydalanuvchining aktiv obunasi borligini tekshirish
 * isPremium = true bo'lsa, premium darslar ochiq
 */
export function useSubscription() {
  const { user, loading: authLoading } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setIsPremium(false);
      setLoading(false);
      return;
    }
    checkSubscription();
  }, [user, authLoading]);

  async function checkSubscription() {
    try {
      const sub = await getUserSubscription(user!.uid);
      if (sub && sub.status === "active" && sub.endDate > Date.now()) {
        setIsPremium(true);
      } else {
        setIsPremium(false);
      }
    } catch {
      setIsPremium(false);
    } finally {
      setLoading(false);
    }
  }

  return { isPremium, loading };
}
