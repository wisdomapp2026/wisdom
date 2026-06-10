import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import BottomNav from "./components/BottomNav";
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
import PromoPage from "./pages/PromoPage";
import StudentNotifications from "./pages/StudentNotifications";
import BannedScreen from "./components/BannedScreen";
import { useAuth } from "./hooks/useAuth";
import { getUserById } from "@shared/repositories";
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
    } else {
      setUserData(null);
    }
  }, [user]);

  // Ban qilingan bo'lsa — faqat BannedScreen ko'rinadi
  if (user && userData?.isBanned) {
    return <BannedScreen userId={user.uid} userName={userData.name} />;
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/continue" element={<ContinueLearning />} />
        <Route path="/courses" element={<Courses />} />
        <Route path="/tests" element={<Tests />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/edit" element={<ProfileEdit />} />
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
