import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "./components/BottomNav";
import { NavigationLoader } from "./components/PageTransition";
import Home from "./pages/Home";
import Courses from "./pages/Courses";
import Tests from "./pages/Tests";
import Profile from "./pages/Profile";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CourseDetail from "./pages/CourseDetail";
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
import PaymentHistory from "./pages/PaymentHistory";
import AllNews from "./pages/AllNews";
import PromoPage from "./pages/PromoPage";
import StudentNotifications from "./pages/StudentNotifications";
import BannedScreen from "./components/BannedScreen";
import { useAuth } from "./hooks/useAuth";
import { useActivityTracker } from "./hooks/useActivityTracker";
import { getUserById } from "@shared/repositories";
import { syncLocalProgressToDb, hasLocalProgress } from "./hooks/useLocalProgress";
import type { User } from "@shared/types";

export default function App() {
  const { user, loading: authLoading } = useAuth();
  const [userData, setUserData] = useState<User | null>(null);
  const [checkingBan, setCheckingBan] = useState(false);

  useEffect(() => {
    if (user) {
      setCheckingBan(true);
      getUserById(user.uid)
        .then((u) => setUserData(u))
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

  // Ban qilingan bo'lsa
  if (user && userData?.isBanned) {
    return <BannedScreen userId={user.uid} userName={userData.name} />;
  }

  return (
    <>
      <NavigationLoader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/continue" element={<ContinueLearning />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
        <Route path="/profile/favorites" element={<Favorites />} />
        <Route path="/profile/payments" element={<PaymentHistory />} />
        <Route path="/news" element={<AllNews />} />
        <Route path="/profile/help" element={<Help />} />
        <Route path="/profile/promo" element={<PromoPage />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<StudentNotifications />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/course/:courseId" element={<CourseDetail />} />
        <Route path="/course/:courseId/topic/:topicId" element={<TopicDetail />} />
        <Route path="/test/:testId" element={<TestScreen />} />
        <Route path="/test-result" element={<TestResult />} />
        <Route path="/subscription" element={<Subscription />} />
        <Route path="/payment" element={<Payment />} />
        <Route path="/premium-gate" element={<PremiumGate />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}
