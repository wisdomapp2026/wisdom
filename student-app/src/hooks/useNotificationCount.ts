import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@shared/firebase";
import { useAuth } from "./useAuth";

/** Umumiy (broadcast) bildirishnomalarning o'qilgan ID lari — har user uchun alohida */
function getReadBroadcasts(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`edukids_read_broadcasts_${userId}`) || "[]");
  } catch {
    return [];
  }
}

/**
 * O'qilmagan bildirishnomalar sonini qaytaradi.
 * Faqat shu foydalanuvchiga tegishli (userId mos) yoki umumiy (userId yo'q) bildirishnomalar hisoblanadi.
 */
export function useNotificationCount() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setCount(0);
      return;
    }
    loadCount();
    // Har 30 sekund yangilanadi
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.uid]);

  async function loadCount() {
    if (!user) {
      setCount(0);
      return;
    }
    try {
      const snap = await getDocs(collection(db, "studentNotifications"));
      const readBroadcasts = getReadBroadcasts(user.uid);

      const unread = snap.docs.filter((d) => {
        const data = d.data() as { isRead?: boolean; userId?: string };
        // Boshqa foydalanuvchiga tegishli bo'lsa — hisoblanmaydi
        if (data.userId && data.userId !== user.uid) return false;
        // Umumiy bildirishnoma — o'qilganligi localStorage da
        if (!data.userId) return !readBroadcasts.includes(d.id);
        // Shaxsiy bildirishnoma
        return !data.isRead;
      }).length;

      setCount(unread);
    } catch {
      // jim
    }
  }

  return { count, refresh: loadCount };
}
