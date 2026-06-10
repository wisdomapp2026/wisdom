import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Bell, CheckCheck, BookOpen, Trophy, CreditCard, MessageCircle } from "lucide-react";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "@shared/firebase";
import { useAuth } from "../hooks/useAuth";

interface StudentNotif {
  id: string;
  type: "course_update" | "test_result" | "payment" | "message" | "promo" | "general";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: number;
}

const typeConfig: Record<string, { icon: React.ReactNode; bg: string }> = {
  course_update: { icon: <BookOpen size={16} className="text-blue-500" />, bg: "bg-blue-50" },
  test_result: { icon: <Trophy size={16} className="text-yellow-500" />, bg: "bg-yellow-50" },
  payment: { icon: <CreditCard size={16} className="text-green-500" />, bg: "bg-green-50" },
  message: { icon: <MessageCircle size={16} className="text-purple-500" />, bg: "bg-purple-50" },
  promo: { icon: <span className="text-sm">🏷️</span>, bg: "bg-orange-50" },
  general: { icon: <Bell size={16} className="text-gray-500" />, bg: "bg-gray-50" },
};

export default function StudentNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<StudentNotif[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadNotifications();
    else setLoading(false);
  }, [user]);

  async function loadNotifications() {
    try {
      // Foydalanuvchiga tegishli bildirishnomalar
      const snap = await getDocs(collection(db, "studentNotifications"));
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as StudentNotif));
      // Barcha umumiy + shu userga tegishlilar
      setNotifications(all.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    try {
      await updateDoc(doc(db, "studentNotifications", id), { isRead: true });
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
    } catch {}
  }

  async function markAllRead() {
    for (const n of notifications.filter((x) => !x.isRead)) {
      await updateDoc(doc(db, "studentNotifications", n.id), { isRead: true });
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-content pb-24">
      <header className="px-5 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-gray-500"><ChevronLeft size={22} /></Link>
          <h1 className="text-xl font-bold text-gray-900">Bildirishnomalar</h1>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-primary-500 font-medium flex items-center gap-1">
            <CheckCheck size={14} /> Barchasini o'qish
          </button>
        )}
      </header>

      {unreadCount > 0 && (
        <div className="mx-5 mt-3 bg-primary-50 border border-primary-100 rounded-xl px-4 py-2.5">
          <p className="text-xs text-primary-700 font-medium">{unreadCount} ta yangi bildirishnoma</p>
        </div>
      )}

      <div className="px-5 mt-4">
        {notifications.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Bell size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Hali bildirishnoma yo'q</p>
            <p className="text-xs text-gray-400 mt-1">Yangiliklar bu yerda paydo bo'ladi</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map((notif) => {
              const config = typeConfig[notif.type] || typeConfig.general;
              const timeAgo = getTimeAgo(notif.createdAt);
              return (
                <button
                  key={notif.id}
                  onClick={() => !notif.isRead && markAsRead(notif.id)}
                  className={`w-full flex items-start gap-3 p-4 rounded-xl text-left transition-colors ${
                    !notif.isRead ? "bg-blue-50/50 border border-blue-100" : "bg-white border border-gray-100"
                  }`}
                >
                  <div className={`w-9 h-9 ${config.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!notif.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>{notif.title}</p>
                      {!notif.isRead && <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Hozir";
  if (minutes < 60) return `${minutes} daqiqa oldin`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} soat oldin`;
  const days = Math.floor(hours / 24);
  return `${days} kun oldin`;
}
