import { useState, useEffect } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@shared/firebase";

/**
 * O'qilmagan bildirishnomalar sonini qaytaradi.
 * studentNotifications collection'dagi isRead=false bo'lganlarni hisoblaydi.
 */
export function useNotificationCount() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    loadCount();
    // Har 30 sekund yangilanadi
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadCount() {
    try {
      const snap = await getDocs(collection(db, "studentNotifications"));
      const unread = snap.docs.filter((d) => !(d.data() as { isRead?: boolean }).isRead).length;
      setCount(unread);
    } catch {
      // jim
    }
  }

  return { count, refresh: loadCount };
}
