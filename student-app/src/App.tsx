import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { App as CapApp } from "@capacitor/app";
import BottomNav from "./components/BottomNav";
import TopHeader from "./components/TopHeader";
import { NavigationLoader } from "./components/PageTransition";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import Tests from "./pages/Tests";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import TelegramCallback from "./pages/TelegramCallback";
import CourseDetail from "./pages/CourseDetail";
import FolderDetail from "./pages/FolderDetail";
import TopicDetail from "./pages/TopicDetail";
import TestScreen from "./pages/TestScreen";
import TestResult from "./pages/TestResult";
import Subscription from "./pages/Subscription";
import Payment from "./pages/Payment";
import PremiumGate from "./pages/PremiumGate";
import ContinueLearning from "./pages/ContinueLearning";
import Help from "./pages/Help";
import Messages from "./pages/Messages";
import ProfileEdit from "./pages/ProfileEdit";
import Favorites from "./pages/Favorites";
import Certificates from "./pages/Certificates";
import PaymentHistory from "./pages/PaymentHistory";
import AllNews from "./pages/AllNews";
import PromoPage from "./pages/PromoPage";
import StudentNotifications from "./pages/StudentNotifications";
import Search from "./pages/Search";
import BannedScreen from "./components/BannedScreen";
import DeviceLimitScreen from "./components/DeviceLimitScreen";
import ErrorBoundary from "./components/ErrorBoundary";
import { useAuth } from "./hooks/useAuth";
import { useActivityTracker } from "./hooks/useActivityTracker";
import { useDeviceSession } from "./hooks/useDeviceSession";
import { getUserById, createUser } from "@shared/repositories";
import { supabase } from "@shared/supabase";
import { syncLocalProgressToDb, hasLocalProgress } from "./hooks/useLocalProgress";
import type { User } from "@shared/types";
// Desktop versiya — mobil kodga tegmaydigan alohida qatlam (src/desktop).
// `lazy` qilib yuklaymiz: shunda desktop dizayn kodi APK/mobil bundle'ga
// tushmaydi va faqat kompyuterda ochilganda yuklab olinadi.
import { lazy, Suspense } from "react";
import { useIsDesktop } from "./desktop/hooks/useIsDesktop";
import "./desktop/desktop.css";

const DesktopApp = lazy(() => import("./desktop/DesktopApp"));

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [checkingBan, setCheckingBan] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Kompyuter ekrani (>=1024px, faqat brauzer). Capacitor APK ichida — har doim false.
  const isDesktop = useIsDesktop();

  // `html.dk` klassi desktop CSS ni yoqadi (mobil uslublarga ta'sir qilmaydi)
  useEffect(() => {
    const root = document.documentElement;
    if (isDesktop) root.classList.add("dk");
    else root.classList.remove("dk");
    return () => root.classList.remove("dk");
  }, [isDesktop]);

  // Android back button handler
  useEffect(() => {
    const listener = CapApp.addListener("backButton", ({ canGoBack }) => {
      // Asosiy sahifalarda (home, courses, tests, profile) — app'ni yopish
      const mainRoutes = ["/", "/courses", "/tests", "/profile"];
      if (mainRoutes.includes(location.pathname)) {
        CapApp.exitApp();
      } else if (canGoBack) {
        window.history.back();
      } else {
        navigate(-1);
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [location.pathname, navigate]);

  // Deep link handler — OAuth callback (Google login APK da qaytganda)
  useEffect(() => {
    const urlListener = CapApp.addListener("appUrlOpen", async ({ url }) => {
      // OAuth redirect URL'dan token'ni ajratib olish
      if (url.includes("access_token") || url.includes("/auth/callback")) {
        const hashPart = url.split("#")[1];
        if (hashPart) {
          const params = new URLSearchParams(hashPart);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            navigate("/", { replace: true });
          }
        }
      }
    });

    return () => {
      urlListener.then((l) => l.remove());
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }

    let cancelled = false;
    setCheckingBan(true);

    (async () => {
      try {
        let profile = await getUserById(user.uid);

        // Profil topilmasa — avval yaratib ko'ramiz (Supabase Auth da hisob bor,
        // lekin `users` jadvalida yozuv yo'q holati). Faqat yaratish ham
        // muvaffaqiyatsiz bo'lsa tizimdan chiqaramiz.
        if (!profile) {
          // Google/Apple orqali kirgan bo'lsa — email haqiqiy (gmail.com kabi)
          // Telefon bilan kirgan bo'lsa — email 998...@edukids.uz formatda
          const isRealEmail = user.email && !user.email.endsWith("@edukids.uz");
          const phoneFromEmail = !isRealEmail ? (user.email?.split("@")[0] || "") : "";
          try {
            await createUser({
              id: user.uid,
              phone: phoneFromEmail ? `+${phoneFromEmail}` : (user.email || ""),
              name: user.displayName || user.email?.split("@")[0] || "O'quvchi",
              role: "student",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
            profile = await getUserById(user.uid);
          } catch (createErr) {
            console.error("Profil yaratib bo'lmadi:", createErr);
          }
        }

        if (cancelled) return;

        if (!profile) {
          // Hisob haqiqatan yo'q — sessiyani tugatamiz
          await supabase.auth.signOut();
          return;
        }

        setUserData(profile);
      } catch (err) {
        // Tarmoq/vaqtinchalik xato — foydalanuvchini tizimdan CHIQARMAYMIZ
        console.error("Profilni yuklashda xatolik:", err);
      } finally {
        if (!cancelled) setCheckingBan(false);
      }
    })();

    // Login qilganda — local (guest) progressni DB ga sync qilish
    if (hasLocalProgress()) {
      syncLocalProgressToDb(user.uid).catch(console.error);
    }

    return () => { cancelled = true; };
  }, [user]);

  // O'quvchi faolligini kuzatish (kunlik ishlatish vaqti)
  useActivityTracker(user?.uid, userData?.name || user?.displayName || undefined);

  // Qurilma sessiyasini tekshirish (3 ta qurilma limiti)
  const { checking: deviceChecking, allowed: deviceAllowed, activeDevices, maxDevices } = useDeviceSession(user?.uid);

  // Interfeys temasini Firestore'dan yuklash va CSS custom properties orqali qo'llash
  useEffect(() => {
    loadTheme();
  }, []);

  async function loadTheme() {
    try {
      const { data: resData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "platform")
        .maybeSingle();
      if (resData?.value) {
        const theme = (resData.value as any).theme;
        if (theme) {
          const root = document.documentElement;
          root.style.setProperty("--theme-primary", theme.primaryColor || "#2196F3");
          root.style.setProperty("--theme-bg", theme.bgColor || "#f9fafb");
          root.style.setProperty("--theme-card-bg", theme.cardBgColor || "#ffffff");
          root.style.setProperty("--theme-text", theme.textColor || "#111827");
          root.style.setProperty("--theme-text-secondary", theme.secondaryTextColor || "#6b7280");
          root.style.setProperty("--theme-nav-bg", theme.navBgColor || "#ffffff");
          root.style.setProperty("--theme-nav-active", theme.navActiveColor || "#2196F3");
          root.style.setProperty("--theme-button-text", theme.buttonTextColor || "#ffffff");
          root.style.setProperty("--theme-accent", theme.accentColor || "#22c55e");
        }
      }
    } catch {
      // Xatolik bo'lsa default ranglar qoladi
    }
  }

  // Auth yuklanayotganda
  if (authLoading) {
    return (
      <div className="page-content flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">tushunGo yuklanmoqda...</p>
        </div>
      </div>
    );
  }



  // Qurilma limiti oshgan bo'lsa
  if (user && !deviceAllowed) {
    return <DeviceLimitScreen activeDevices={activeDevices} maxDevices={maxDevices} />;
  }

  // Ban qilingan bo'lsa
  if (user && userData?.isBanned) {
    return <BannedScreen userId={user.uid} userName={userData.name} />;
  }

  // ===== DESKTOP VERSIYA =====
  // Kompyuter ekranida alohida (src/desktop) qatlam ishlaydi. Yuqoridagi barcha
  // tekshiruvlar (auth, ban, qurilma limiti, tema) ikkala versiya uchun umumiy.
  if (isDesktop) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<DesktopBootLoader />}>
          <DesktopApp />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // ===== MOBIL / PLANSHET VERSIYA (APK uchun ham shu) =====
  return (
    <ErrorBoundary>
      <NavigationLoader />
      <TopHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/continue" element={<ContinueLearning />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/favorites" element={<Favorites />} />
        <Route path="/profile/certificates" element={<Certificates />} />
        <Route path="/profile/payments" element={<PaymentHistory />} />
        <Route path="/news" element={<AllNews />} />
        <Route path="/profile/help" element={<Help />} />
        <Route path="/profile/promo" element={<PromoPage />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<StudentNotifications />} />
        <Route path="/search" element={<Search />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/telegram-callback" element={<TelegramCallback />} />
        <Route path="/course/:courseId" element={<CourseDetail />} />
        <Route path="/course/:courseId/folder/:folderId" element={<FolderDetail />} />
        <Route path="/course/:courseId/topic/:topicId" element={<TopicDetail />} />
        <Route path="/test/:testId" element={<TestScreen />} />
        <Route path="/test-result" element={<TestResult />} />
        <Route path="/subscription" element={<Navigate to="/courses" replace />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/premium-gate" element={<PremiumGate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </ErrorBoundary>
  );
}

/**
 * Desktop qatlam (lazy chunk) yuklanayotganda ko'rinadigan ekran.
 * Sidebar + kontent shakli oldindan chizilib, "sakrash" (layout shift) oldi olinadi.
 */
function DesktopBootLoader() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--theme-bg)" }}>
      <div
        className="w-[264px] shrink-0 hidden lg:block"
        style={{ backgroundColor: "var(--theme-card-bg)", borderRight: "1px solid rgba(16,24,40,0.07)" }}
      />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Desktop versiya yuklanmoqda...</p>
        </div>
      </div>
    </div>
  );
}
