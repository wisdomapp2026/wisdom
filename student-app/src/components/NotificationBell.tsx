import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { useNotificationCount } from "../hooks/useNotificationCount";

/**
 * Bell ikonka + badge (o'qilmagan bildirishnomalar soni).
 * Bosganda /notifications sahifasiga o'tadi.
 */
export default function NotificationBell() {
  const { count } = useNotificationCount();

  return (
    <Link to="/notifications" className="relative w-10 h-10 flex items-center justify-center text-gray-500 rounded-xl" aria-label="Bildirishnomalar">
      <Bell size={20} />
      {count > 0 && (
        <span className="absolute top-1 right-1 min-w-[16px] h-[16px] bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
