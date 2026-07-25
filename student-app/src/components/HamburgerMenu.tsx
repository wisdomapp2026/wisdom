import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Moon, Star, CreditCard, Settings, Shield, Bell, HelpCircle, MessageSquare, LogOut, ChevronRight, BookOpen, Award } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useDarkMode } from "../hooks/useDarkMode";
import AuthorModal from "./AuthorModal";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [authorModalOpen, setAuthorModalOpen] = useState(false);
  const { isLoggedIn } = useAuth();
  const { isDark, toggle: toggleDark } = useDarkMode();

  function handleExit() {
    setOpen(false);
    // Brauzerda tab yopish, APK da dasturni yopish
    try {
      window.close();
    } catch {
      // window.close() faqat script orqali ochilgan oynalarda ishlaydi
    }
    // Agar window.close() ishlamasa (brauzer bloklasa) — sahifani bo'shatish
    if (!window.closed) {
      document.body.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;color:#6b7280;"><p>Dastur yopildi. Tabni yoping.</p></div>';
    }
  }

  return (
    <>
      {/* Hamburger tugmasi */}
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100 active:bg-gray-100"
        aria-label="Menyu"
      >
        <Menu size={20} className="text-gray-600" />
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/40" onClick={() => setOpen(false)} />
      )}

      {/* Drawer (slide-in from left) */}
      <div
        className={`fixed top-0 left-0 z-[101] h-full w-[85%] max-w-xs bg-white shadow-2xl transform transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header — faqat close button */}
        <div className="flex items-center justify-end px-5 pt-5 pb-4 border-b border-gray-100">
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Menu items */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-2">
            {/* Tungi rejim */}
            <button
              onClick={toggleDark}
              className="flex items-center w-full px-5 py-3.5 active:bg-gray-50"
            >
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center mr-3">
                <Moon size={18} className="text-gray-500" />
              </div>
              <span className="flex-1 text-left text-[15px] text-gray-900">Tungi rejim</span>
              <div className={`w-11 h-6 rounded-full relative transition-colors ${isDark ? "bg-primary-500" : "bg-gray-300"}`}>
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isDark ? "left-[22px]" : "left-0.5"}`} />
              </div>
            </button>

            <div className="h-px bg-gray-100 mx-5" />

            {/* Navigation links */}
            {[
              { icon: <Star size={18} className="text-yellow-500" />, label: "Tanlangan modullar", to: "/profile/favorites" },
              { icon: <Award size={18} className="text-primary-500" />, label: "Sertifikatlarim", to: "/profile/certificates" },
              { icon: <CreditCard size={18} className="text-green-500" />, label: "To'lovlarim", to: "/profile/payments" },
              { icon: <Settings size={18} className="text-gray-500" />, label: "Shaxsiy ma'lumotlar", to: "/profile/edit" },
              { icon: <Shield size={18} className="text-gray-500" />, label: "Promokodlarim", to: "/profile/promo" },
              { icon: <Bell size={18} className="text-gray-500" />, label: "Bildirishnomalar", to: "/notifications" },
              { icon: <HelpCircle size={18} className="text-gray-500" />, label: "Yordam", to: "/profile/help" },
              { icon: <MessageSquare size={18} className="text-gray-500" />, label: "Bog'lanish", to: "/messages" },
            ].map((item, i) => (
              <Link
                key={i}
                to={item.to}
                onClick={() => setOpen(false)}
                className="flex items-center w-full px-5 py-3.5 active:bg-gray-50"
              >
                <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center mr-3">
                  {item.icon}
                </div>
                <span className="flex-1 text-left text-[15px] text-gray-900">{item.label}</span>
                <ChevronRight size={16} className="text-gray-300" />
              </Link>
            ))}

            <div className="h-px bg-gray-100 mx-5 my-1" />

            {/* Kurslar muallifi */}
            <button
              onClick={() => { setOpen(false); setAuthorModalOpen(true); }}
              className="flex items-center w-full px-5 py-3.5 active:bg-gray-50"
            >
              <div className="w-9 h-9 bg-primary-50 rounded-xl flex items-center justify-center mr-3">
                <BookOpen size={18} className="text-primary-500" />
              </div>
              <span className="flex-1 text-left text-[15px] text-gray-900">Kurslar muallifi</span>
              <ChevronRight size={16} className="text-gray-300" />
            </button>

            <div className="h-px bg-gray-100 mx-5 my-1" />

            {/* Chiqish — dasturni/tabni yopish */}
            {isLoggedIn && (
              <button
                onClick={handleExit}
                className="flex items-center w-full px-5 py-3.5 active:bg-red-50"
              >
                <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center mr-3">
                  <LogOut size={18} className="text-red-500" />
                </div>
                <span className="flex-1 text-left text-[15px] text-red-500 font-medium">Chiqish</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Author Modal */}
      <AuthorModal open={authorModalOpen} onClose={() => setAuthorModalOpen(false)} />
    </>
  );
}
