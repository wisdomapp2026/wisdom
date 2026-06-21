import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@shared/firebase";
import AdminLayout from "./layouts/AdminLayout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import TopicDetail from "./pages/TopicDetail";
import TestBuilder from "./pages/TestBuilder";
import TestPreview from "./pages/TestPreview";
import Tests from "./pages/Tests";
import Students from "./pages/Students";
import News from "./pages/News";
import Payments from "./pages/Payments";
import Promos from "./pages/Promos";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Banners from "./pages/Banners";
import NewsItems from "./pages/NewsItems";
import Motivations from "./pages/Motivations";
import SocialLinks from "./pages/SocialLinks";
import Notifications from "./pages/Notifications";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setChecking(false);
    });
    return unsub;
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <Routes>
      <Route path="/" element={<AdminLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="courses" element={<Courses />} />
        <Route path="courses/:courseId" element={<CourseDetail />} />
        <Route path="courses/:courseId/topics/:topicId" element={<TopicDetail />} />
        <Route path="courses/:courseId/tests/builder" element={<TestBuilder />} />
        <Route path="courses/:courseId/tests/:testId/preview" element={<TestPreview />} />
        <Route path="students" element={<Students />} />
        <Route path="tests" element={<Tests />} />
        <Route path="tests/builder" element={<TestBuilder />} />
        <Route path="motivations" element={<Motivations />} />
        <Route path="social-links" element={<SocialLinks />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="news" element={<News />} />
        <Route path="payments" element={<Payments />} />
        <Route path="promos" element={<Promos />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
        <Route path="banners" element={<Banners />} />
        <Route path="news-items" element={<NewsItems />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
