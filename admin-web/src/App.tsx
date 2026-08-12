import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase } from "@shared/supabase";
import { getUserById } from "@shared/repositories";
import ErrorBoundary from "./components/ErrorBoundary";
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
import Testimonials from "./pages/Testimonials";
import Backup from "./pages/Backup";

export default function App() {
  const [user, setUser] = useState<any | null>(null);
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    /** Hozirgi authenticated user ID — takroriy SIGNED_IN eventlarini filtrlash uchun */
    let currentUserId: string | null = null;

    /** Foydalanuvchi haqiqatan admin rolida ekanligini `users` jadvalidan tekshirish */
    async function resolveRole(u: any | null) {
      if (cancelled) return;
      setUser(u);

      if (!u) {
        currentUserId = null;
        setIsAdmin(false);
        setAccessDenied(false);
        setChecking(false);
        return;
      }

      currentUserId = u.id;

      try {
        const profile = await getUserById(u.id);
        if (cancelled) return;
        const admin = profile?.role === "admin";
        setIsAdmin(admin);
        // Login qilgan, lekin admin emas — sababini ko'rsatamiz
        setAccessDenied(!admin);
      } catch (err) {
        console.error("Rolni tekshirishda xatolik:", err);
        if (cancelled) return;
        setIsAdmin(false);
        setAccessDenied(true);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    supabase.auth.getSession().then(({ data: { session } }) => resolveRole(session?.user || null));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setChecking(true);
        resolveRole(null);
      } else if (event === "SIGNED_IN") {
        // Supabase har safar tab-ga qaytganda SIGNED_IN eventini yuboradi.
        // Agar user o'zgarmagan bo'lsa — qayta loading qilishning hojati yo'q.
        const newUserId = session?.user?.id || null;
        if (newUserId && newUserId === currentUserId) {
          // Xuddi shu user — hech narsa qilmaymiz
          return;
        }
        setChecking(true);
        resolveRole(session?.user || null);
      }
      // TOKEN_REFRESHED, INITIAL_SESSION va boshqa eventlarni e'tiborsiz qoldiramiz
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Login qilgan, lekin admin huquqi yo'q
  if (user && accessDenied) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🔒</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900">Kirish huquqi yo'q</h1>
          <p className="text-sm text-gray-500 mt-2">
            Bu hisob admin emas. Boshqaruv paneliga faqat admin rolidagi foydalanuvchilar kira oladi.
          </p>
          <button
            onClick={async () => { await supabase.auth.signOut(); }}
            className="w-full btn-primary py-3 mt-6"
          >
            Boshqa hisob bilan kirish
          </button>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Login onLogin={() => {}} />;
  }

  return (
    <ErrorBoundary>
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
          <Route path="testimonials" element={<Testimonials />} />
          <Route path="backup" element={<Backup />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}
