import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Bell, CheckCheck, BookOpen, Trophy, CreditCard, MessageCircle, FileText, Trash2 } from "lucide-react";
import { supabase } from "@shared/supabase";
import { useAuth } from "../hooks/useAuth";
import { notifyBadgeUpdate } from "../hooks/useNotificationCount";
import LegalModal from "../components/LegalModal";

interface StudentNotif {
  id: string;
  type: "course_update" | "test_result" | "payment" | "message" | "promo" | "general" | "legal";
  title: string;
  body: string;
  isRead: boolean;
  createdAt: number;
  /** Aniq foydalanuvchiga tegishli bo'lsa — uning ID si. Bo'sh bo'lsa umumiy (broadcast). */
  userId?: string;
  /** Huquqiy hujjat turi (legal type bildirishnomalar uchun) */
  legalType?: "terms" | "privacy";
}

/** Umumiy (broadcast) bildirishnomalarning o'qilgan ID lari — har user uchun alohida */
function getReadBroadcasts(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`edukids_read_broadcasts_${userId}`) || "[]");
  } catch {
    return [];
  }
}

function addReadBroadcast(userId: string, notifId: string) {
  const list = getReadBroadcasts(userId);
  if (!list.includes(notifId)) {
    localStorage.setItem(`edukids_read_broadcasts_${userId}`, JSON.stringify([...list, notifId]));
  }
}

/** O'chirilgan (dismissed) bildirishnomalar — user bu habarlarni ko'rmaydi */
function getDismissedNotifs(userId: string): string[] {
  try {
    return JSON.parse(localStorage.getItem(`edukids_dismissed_notifs_${userId}`) || "[]");
  } catch {
    return [];
  }
}

function addDismissedNotif(userId: string, notifId: string) {
  const list = getDismissedNotifs(userId);
  if (!list.includes(notifId)) {
    localStorage.setItem(`edukids_dismissed_notifs_${userId}`, JSON.stringify([...list, notifId]));
  }
}

const typeConfig: Record<string, { icon: React.ReactNode; bg: string }> = {
  course_update: { icon: <BookOpen size={16} className="text-blue-500" />, bg: "bg-blue-50" },
  test_result: { icon: <Trophy size={16} className="text-yellow-500" />, bg: "bg-yellow-50" },
  payment: { icon: <CreditCard size={16} className="text-green-500" />, bg: "bg-green-50" },
  message: { icon: <MessageCircle size={16} className="text-purple-500" />, bg: "bg-purple-50" },
  promo: { icon: <span className="text-sm">🏷️</span>, bg: "bg-orange-50" },
  general: { icon: <Bell size={16} className="text-gray-500" />, bg: "bg-gray-50" },
  legal: { icon: <FileText size={16} className="text-indigo-500" />, bg: "bg-indigo-50" },
};

export default function StudentNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<StudentNotif[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<{ open: boolean; type: "terms" | "privacy" }>({ open: false, type: "terms" });

  useEffect(() => {
    if (user) loadNotifications();
    else setLoading(false);
  }, [user]);

  async function loadNotifications() {
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "studentNotifications").maybeSingle();
      const all = (data?.value as StudentNotif[]) || [];

      // Faqat shu foydalanuvchiga tegishli (userId mos) yoki umumiy (userId yo'q) bildirishnomalar
      const mine = all.filter((n) => !n.userId || n.userId === user!.uid);

      // Umumiy bildirishnomalar uchun o'qilgan holati localStorage da (har user uchun alohida)
      const readBroadcasts = getReadBroadcasts(user!.uid);
      const dismissedList = getDismissedNotifs(user!.uid);
      const normalized = mine
        .filter((n) => !dismissedList.includes(n.id)) // O'chirilganlarni ko'rsatmaslik
        .map((n) =>
          n.userId ? n : { ...n, isRead: readBroadcasts.includes(n.id) }
        );

      setNotifications(normalized.sort((a, b) => b.createdAt - a.createdAt));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    const notif = notifications.find((n) => n.id === id);
    if (!notif || !user) return;
    try {
      if (notif.userId) {
        // Shaxsiy bildirishnoma — global settings ro'yxatida yangilanadi
        const { data } = await supabase.from("settings").select("value").eq("key", "studentNotifications").maybeSingle();
        const list = (data?.value as StudentNotif[]) || [];
        const updatedList = list.map((n) => n.id === id ? { ...n, isRead: true } : n);
        await supabase.from("settings").upsert({ key: "studentNotifications", value: updatedList });
      } else {
        // Umumiy bildirishnoma — localStorage da
        addReadBroadcast(user.uid, id);
      }
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, isRead: true } : n));
      notifyBadgeUpdate();
    } catch (err) {
      console.error(err);
    }
  }

  async function markAllRead() {
    if (!user) return;
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "studentNotifications").maybeSingle();
      const list = (data?.value as StudentNotif[]) || [];
      
      let listUpdated = false;
      const updatedList = list.map((n) => {
        const belongsToUser = n.userId === user.uid;
        if (belongsToUser && !n.isRead) {
          listUpdated = true;
          return { ...n, isRead: true };
        }
        if (!n.userId && !n.isRead) {
          addReadBroadcast(user.uid, n.id);
        }
        return n;
      });

      if (listUpdated) {
        await supabase.from("settings").upsert({ key: "studentNotifications", value: updatedList });
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      notifyBadgeUpdate();
    } catch (err) {
      console.error(err);
    }
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  function dismissNotification(id: string) {
    if (!user) return;
    addDismissedNotif(user.uid, id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    notifyBadgeUpdate();
  }

  if (loading) {
    return (
      <div className="page-content flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400 animate-pulse">Yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content pb-24">
      <header className="px-5 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center text-gray-500"><ChevronLeft size={22} /></Link>
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
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id);
                    // Huquqiy hujjat bildirishnomasi — modal ochish
                    if (notif.type === "legal" && notif.legalType) {
                      setLegalModal({ open: true, type: notif.legalType });
                      return;
                    }
                    setExpandedId(expandedId === notif.id ? null : notif.id);
                  }}
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
                    <p className={`text-xs text-gray-500 mt-0.5 whitespace-pre-wrap break-words ${expandedId === notif.id ? "" : "line-clamp-2"}`}>{notif.body}</p>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-[10px] text-gray-400">{timeAgo}</p>
                      {expandedId === notif.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); dismissNotification(notif.id); }}
                          className="text-[10px] text-red-400 flex items-center gap-1 active:text-red-600"
                        >
                          <Trash2 size={10} /> O'chirish
                        </button>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Legal Modal */}
      <LegalModal
        open={legalModal.open}
        type={legalModal.type}
        onClose={() => setLegalModal({ ...legalModal, open: false })}
      />
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
