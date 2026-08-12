import { useState, useEffect } from "react";
import { supabase } from "@shared/supabase";
import { useAuth } from "./useAuth";
import { requestNotificationPermission, showNewNotifications } from "../utils/nativeNotifications";

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
    // Native app da bildirishnoma ruxsatini so'rash (web da hech narsa qilmaydi)
    requestNotificationPermission();

    loadCount();
    // Har 30 sekund yangilanadi
    const interval = setInterval(loadCount, 30000);

    // Bildirishnoma o'qilganda darhol yangilash (custom event)
    function handleRead() { loadCount(); }
    window.addEventListener("edukids:notification-read", handleRead);

    return () => {
      clearInterval(interval);
      window.removeEventListener("edukids:notification-read", handleRead);
    };
  }, [user?.uid]);

  async function loadCount() {
    if (!user) {
      setCount(0);
      return;
    }
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "studentNotifications").maybeSingle();
      const all = (data?.value as any[]) || [];
      const readBroadcasts = getReadBroadcasts(user.uid);

      const unreadItems = all.filter((n) => {
        if (n.userId && n.userId !== user.uid) return false;
        if (!n.userId) return !readBroadcasts.includes(n.id);
        return !n.isRead;
      });

      setCount(unreadItems.length);

      // Native app da o'qilmagan yangi bildirishnomalarni status barda ko'rsatish
      showNewNotifications(
        unreadItems.map((n) => ({ id: String(n.id), title: n.title || "tushunGo", body: n.message || n.body || "" }))
      );
    } catch {
      // jim
    }
  }

  return { count, refresh: loadCount };
}

/** Bildirishnoma o'qilganda boshqa komponentlarga signal berish */
export function notifyBadgeUpdate() {
  window.dispatchEvent(new Event("edukids:notification-read"));
}
