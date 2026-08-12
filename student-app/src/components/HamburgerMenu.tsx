import { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import { Menu, X, Moon, Star, CreditCard, Settings, Shield, Bell, HelpCircle, MessageSquare, LogOut, ChevronRight, BookOpen, Award, FileText, Download, Smartphone } from "lucide-react";
import { supabase } from "@shared/supabase";
import { useAuth } from "../hooks/useAuth";
import { useDarkMode } from "../hooks/useDarkMode";
import AuthorModal from "./AuthorModal";
import LegalModal from "./LegalModal";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [authorModalOpen, setAuthorModalOpen] = useState(false);
  const [legalModal, setLegalModal] = useState<{ open: boolean; type: "terms" | "privacy" }>({ open: false, type: "terms" });
  const { isLoggedIn } = useAuth();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const [logoUrl, setLogoUrl] = useState("");
  const [appName, setAppName] = useState("tushunGo");
  const [apkUrl, setApkUrl] = useState("");

  // Swipe gesture refs
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { data: resData } = await supabase
          .from("settings")
          .select("value")
          .eq("key", "platform")
          .maybeSingle();
        if (cancelled || !resData?.value) return;
        const data = resData.value as any;
        if (data.logoUrl) setLogoUrl(data.logoUrl);
        if (data.platformName) setAppName(data.platformName);
        if (data.apkUrl) setApkUrl(data.apkUrl);
      } catch {
        // ixtiyoriy — sozlama yuklanmasa standart qiymatlar qoladi
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // Body scroll lock — menu ochilganda orqadagi sahifa scroll bo'lmasin
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [open]);

  // Swipe to open: chapdan o'ngga surish (edge swipe)
  const handleGlobalTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    // Faqat ekranning chap chetidan (30px) boshlangan swipe'ni aniqlash
    if (touch.clientX < 30 && !open) {
      touchStartX.current = touch.clientX;
      touchStartY.current = touch.clientY;
      isSwiping.current = true;
    }
  }, [open]);

  const handleGlobalTouchMove = useCallback((e: TouchEvent) => {
    if (!isSwiping.current) return;
    const touch = e.touches[0];
    touchCurrentX.current = touch.clientX;

    // Agar vertikal harakat gorizontaldan katta bo'lsa — bu scroll, swipe emas
    const dy = Math.abs(touch.clientY - touchStartY.current);
    const dx = Math.abs(touch.clientX - touchStartX.current);
    if (dy > dx) {
      isSwiping.current = false;
    }
  }, []);

  const handleGlobalTouchEnd = useCallback(() => {
    if (!isSwiping.current) return;
    const distance = touchCurrentX.current - touchStartX.current;
    // 50px dan ortiq chapdan o'ngga surilsa — menu ochiladi
    if (distance > 50) {
      setOpen(true);
    }
    isSwiping.current = false;
    touchStartX.current = 0;
    touchCurrentX.current = 0;
  }, []);

  // Swipe to close: o'ngdan chapga surish (menu ichida)
  const drawerTouchStartX = useRef(0);
  const drawerSwiping = useRef(false);

  function handleDrawerTouchStart(e: React.TouchEvent) {
    drawerTouchStartX.current = e.touches[0].clientX;
    drawerSwiping.current = true;
  }

  function handleDrawerTouchMove(e: React.TouchEvent) {
    if (!drawerSwiping.current) return;
    // Menu ichidagi scroll bilan conflict bo'lmasligi uchun
    // faqat gorizontal harakatni kuzatamiz
  }

  function handleDrawerTouchEnd(e: React.TouchEvent) {
    if (!drawerSwiping.current) return;
    const endX = e.changedTouches[0].clientX;
    const distance = drawerTouchStartX.current - endX;
    // 60px dan ortiq o'ngdan chapga surilsa — menu yopiladi
    if (distance > 60) {
      setOpen(false);
    }
    drawerSwiping.current = false;
  }

  // Global touch event'larni qo'shish (menu ochish uchun)
  useEffect(() => {
    document.addEventListener("touchstart", handleGlobalTouchStart, { passive: true });
    document.addEventListener("touchmove", handleGlobalTouchMove, { passive: true });
    document.addEventListener("touchend", handleGlobalTouchEnd, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleGlobalTouchStart);
      document.removeEventListener("touchmove", handleGlobalTouchMove);
      document.removeEventListener("touchend", handleGlobalTouchEnd);
    };
  }, [handleGlobalTouchStart, handleGlobalTouchMove, handleGlobalTouchEnd]);

  function handleExit() {
    setOpen(false);
    try {
      window.close();
    } catch {
      // window.close() faqat script orqali ochilgan oynalarda ishlaydi
    }
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
        onTouchStart={handleDrawerTouchStart}
        onTouchMove={handleDrawerTouchMove}
        onTouchEnd={handleDrawerTouchEnd}
        className={`fixed top-0 left-0 z-[101] h-full w-[85%] max-w-xs bg-white shadow-2xl transform transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header — logo va app nomi */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary-500 flex items-center justify-center shrink-0">
              {logoUrl ? (
                <img src={logoUrl} alt={appName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-lg">⚡</span>
              )}
            </div>
            <span className="text-lg font-bold text-primary-500">{appName}</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:bg-gray-200"
          >
            <X size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Menu items — scroll faqat shu ichida */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
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

            {/* Android ilovani yuklab olish */}
            {apkUrl && (
              <a
                href={apkUrl}
                download
                onClick={() => setOpen(false)}
                className="flex items-center w-full px-5 py-3.5 active:bg-green-50"
              >
                <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center mr-3">
                  <Smartphone size={18} className="text-green-600" />
                </div>
                <span className="flex-1 text-left text-[15px] text-gray-900 font-medium">Android ilovani yuklash</span>
                <Download size={16} className="text-green-500" />
              </a>
            )}

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

            {/* Huquqiy hujjatlar */}
            <button
              onClick={() => { setOpen(false); setLegalModal({ open: true, type: "terms" }); }}
              className="flex items-center w-full px-5 py-3.5 active:bg-gray-50"
            >
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center mr-3">
                <FileText size={18} className="text-gray-500" />
              </div>
              <span className="flex-1 text-left text-[15px] text-gray-900">Foydalanish shartlari</span>
              <ChevronRight size={16} className="text-gray-300" />
            </button>
            <button
              onClick={() => { setOpen(false); setLegalModal({ open: true, type: "privacy" }); }}
              className="flex items-center w-full px-5 py-3.5 active:bg-gray-50"
            >
              <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center mr-3">
                <Shield size={18} className="text-blue-500" />
              </div>
              <span className="flex-1 text-left text-[15px] text-gray-900">Maxfiylik siyosati</span>
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

      {/* Legal Modal */}
      <LegalModal
        open={legalModal.open}
        type={legalModal.type}
        onClose={() => setLegalModal({ ...legalModal, open: false })}
      />
    </>
  );
}
