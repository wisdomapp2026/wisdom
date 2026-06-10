import { useState, useEffect } from "react";
import { MessageCircle, CreditCard, UserPlus, FileText, Check, CheckCheck } from "lucide-react";
import { getAdminNotifications, markNotificationRead, markAllNotificationsRead } from "@shared/repositories";
import type { AdminNotification } from "@shared/types";

const typeIcons: Record<string, { icon: React.ReactNode; bg: string }> = {
  new_message: { icon: <MessageCircle size={16} className="text-blue-500" />, bg: "bg-blue-50" },
  new_payment: { icon: <CreditCard size={16} className="text-green-500" />, bg: "bg-green-50" },
  new_student: { icon: <UserPlus size={16} className="text-purple-500" />, bg: "bg-purple-50" },
  new_test_result: { icon: <FileText size={16} className="text-orange-500" />, bg: "bg-orange-50" },
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const data = await getAdminNotifications();
    setNotifications(data);
    setLoading(false);
  }

  async function handleMarkRead(id: string) {
    await markNotificationRead(id);
    await loadData();
  }

  async function handleMarkAllRead() {
    await markAllNotificationsRead();
    await loadData();
  }

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bildirishnomalar</h1>
          <p className="text-gray-500 mt-1">{unreadCount > 0 ? `${unreadCount} ta o'qilmagan` : "Barcha o'qilgan"}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="btn-outline text-sm flex items-center gap-2">
            <CheckCheck className="w-4 h-4" /> Barchasini o'qilgan deb belgilash
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {notifications.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🔔</p>
            <p>Hali bildirishnoma yo'q</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((notif) => {
              const typeInfo = typeIcons[notif.type] || typeIcons.new_message;
              const timeAgo = getTimeAgo(notif.createdAt);
              return (
                <div
                  key={notif.id}
                  className={`flex items-start gap-3 p-4 cursor-pointer hover:bg-gray-50 transition-colors ${!notif.isRead ? "bg-blue-50/30" : ""}`}
                  onClick={() => !notif.isRead && handleMarkRead(notif.id)}
                >
                  <div className={`w-9 h-9 ${typeInfo.bg} rounded-lg flex items-center justify-center shrink-0 mt-0.5`}>
                    {typeInfo.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm ${!notif.isRead ? "font-semibold text-gray-900" : "text-gray-700"}`}>{notif.title}</p>
                      {!notif.isRead && <span className="w-2 h-2 bg-primary-500 rounded-full shrink-0" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">{notif.body}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{timeAgo}</p>
                  </div>
                </div>
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
