import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import TopHeader from "./components/TopHeader";
import { NavigationLoader } from "./components/PageTransition";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import Tests from "./pages/Tests";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
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
import { getUserById } from "@shared/repositories";
import { signOut } from "firebase/auth";
import { auth, db } from "@shared/firebase";
import { syncLocalProgressToDb, hasLocalProgress } from "./hooks/useLocalProgress";
import type { User } from "@shared/types";
import { doc, getDoc } from "firebase/firestore";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [checkingBan, setCheckingBan] = useState(false);

  useEffect(() => {
    if (user) {
      setCheckingBan(true);
      getUserById(user.uid)
        .then((u) => {
          if (!u) {
            // User Firestore dan o'chirilgan — tizimdan chiqarish
            signOut(auth);
            return;
          }
          setUserData(u);
        })
        .catch(console.error)
        .finally(() => setCheckingBan(false));

      // Login qilganda — local progress ni DB ga sync qilish
      if (hasLocalProgress()) {
        syncLocalProgressToDb(user.uid).catch(console.error);
      }
    } else {
      setUserData(null);
    }
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
      const snap = await getDoc(doc(db, "settings", "platform"));
      if (snap.exists()) {
        const data = snap.data();
        const theme = data.theme;
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
          <p className="text-sm text-gray-400">EduKids yuklanmoqda...</p>
        </div>
      </div>
    );
  }

  // Qurilma sessiyasi tekshirilayotganda
  if (user && deviceChecking) {
    return (
      <div className="page-content flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-[3px] border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">Qurilma tekshirilmoqda...</p>
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
