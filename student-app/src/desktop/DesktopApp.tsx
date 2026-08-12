import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import DesktopLayout from "./components/DesktopLayout";
import DesktopContentFrame from "./components/DesktopContentFrame";
import { Skeleton } from "./components/ui";

// ===== To'liq desktop dizaynga o'tkazilgan sahifalar =====
const DesktopHome = lazy(() => import("./pages/DesktopHome"));
const DesktopCourses = lazy(() => import("./pages/DesktopCourses"));
const DesktopTests = lazy(() => import("./pages/DesktopTests"));
const DesktopProfile = lazy(() => import("./pages/DesktopProfile"));

// ===== Mavjud (mobil) sahifalar — mantiq o'zgarmaydi, faqat desktop ramkasida ko'rsatiladi =====
const CourseDetail = lazy(() => import("../pages/CourseDetail"));
const FolderDetail = lazy(() => import("../pages/FolderDetail"));
const TopicDetail = lazy(() => import("../pages/TopicDetail"));
const TestScreen = lazy(() => import("../pages/TestScreen"));
const TestResult = lazy(() => import("../pages/TestResult"));
const ContinueLearning = lazy(() => import("../pages/ContinueLearning"));
const AllNews = lazy(() => import("../pages/AllNews"));
const Certificates = lazy(() => import("../pages/Certificates"));
const Favorites = lazy(() => import("../pages/Favorites"));
const PaymentHistory = lazy(() => import("../pages/PaymentHistory"));
const ProfileEdit = lazy(() => import("../pages/ProfileEdit"));
const PromoPage = lazy(() => import("../pages/PromoPage"));
const Help = lazy(() => import("../pages/Help"));
const Messages = lazy(() => import("../pages/Messages"));
const StudentNotifications = lazy(() => import("../pages/StudentNotifications"));
const SearchPage = lazy(() => import("../pages/Search"));
const Login = lazy(() => import("../pages/Login"));
const Register = lazy(() => import("../pages/Register"));
const TelegramCallback = lazy(() => import("../pages/TelegramCallback"));
const Payment = lazy(() => import("../pages/Payment"));
const PremiumGate = lazy(() => import("../pages/PremiumGate"));

/**
 * Desktop marshrutlar.
 *
 * Kodni ikkiga bo'lish (code-splitting) — har bir sahifa alohida chunk,
 * shuning uchun boshlang'ich yuklanish tez bo'ladi.
 */
export default function DesktopApp() {
  return (
    <DesktopLayout>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          {/* To'liq desktop dizayn */}
          <Route path="/" element={<DesktopHome />} />
          <Route path="/courses" element={<DesktopCourses />} />
          <Route path="/tests" element={<DesktopTests />} />
          <Route path="/profile" element={<DesktopProfile />} />

          {/* Kurs ichi — kengroq ramka */}
          <Route
            path="/course/:courseId"
            element={
              <DesktopContentFrame width="wide">
                <CourseDetail />
              </DesktopContentFrame>
            }
          />
          <Route
            path="/course/:courseId/folder/:folderId"
            element={
              <DesktopContentFrame width="wide">
                <FolderDetail />
              </DesktopContentFrame>
            }
          />

          {/* Mavzu — o'qish uchun tor ustun (uzun matn o'qishga qulay) */}
          <Route
            path="/course/:courseId/topic/:topicId"
            element={
              <DesktopContentFrame width="reading">
                <TopicDetail />
              </DesktopContentFrame>
            }
          />

          {/* Test ekrani — chalg'itmaslik uchun markazda, ramkasiz fokus rejimi */}
          <Route
            path="/test/:testId"
            element={
              <div className="min-h-screen py-8 px-6">
                <DesktopContentFrame width="reading">
                  <TestScreen />
                </DesktopContentFrame>
              </div>
            }
          />
          <Route
            path="/test-result"
            element={
              <DesktopContentFrame width="reading">
                <TestResult />
              </DesktopContentFrame>
            }
          />

          {/* Ro'yxat/karta tipidagi sahifalar */}
          <Route
            path="/continue"
            element={
              <DesktopContentFrame width="wide">
                <ContinueLearning />
              </DesktopContentFrame>
            }
          />
          <Route
            path="/news"
            element={
              <DesktopContentFrame width="wide">
                <AllNews />
              </DesktopContentFrame>
            }
          />
          <Route
            path="/notifications"
            element={
              <DesktopContentFrame width="reading">
                <StudentNotifications />
              </DesktopContentFrame>
            }
          />
          <Route
            path="/messages"
            element={
              <DesktopContentFrame width="reading">
                <Messages />
              </DesktopContentFrame>
            }
          />
          <Route
            path="/search"
            element={
              <DesktopContentFrame width="reading">
                <SearchPage />
              </DesktopContentFrame>
            }
          />

          {/* Profil ostidagi sahifalar */}
          <Route
            path="/profile/edit"
            element={
              <DesktopContentFrame width="reading">
                <ProfileEdit />
              </DesktopContentFrame>
            }
          />
          <Route
            path="/profile/favorites"
            element={
              <DesktopContentFrame width="wide">
                <Favorites />
              </DesktopContentFrame>
            }
          />
          <Route
            path="/profile/certificates"
            element={
              <DesktopContentFrame width="wide">
                <Certificates />
              </DesktopContentFrame>
            }
          />
          <Route
            path="/profile/payments"
            element={
              <DesktopContentFrame width="reading">
                <PaymentHistory />
              </DesktopContentFrame>
            }
          />
          <Route
            path="/profile/promo"
            element={
              <DesktopContentFrame width="reading">
                <PromoPage />
              </DesktopContentFrame>
            }
          />
          <Route
            path="/profile/help"
            element={
              <DesktopContentFrame width="reading">
                <Help />
              </DesktopContentFrame>
            }
          />

          {/* Autentifikatsiya va to'lov — fokus rejimi (DesktopLayout sidebarni yashiradi) */}
          <Route path="/login" element={<CenteredCard><Login /></CenteredCard>} />
          <Route path="/register" element={<CenteredCard><Register /></CenteredCard>} />
          <Route path="/auth/telegram-callback" element={<CenteredCard><TelegramCallback /></CenteredCard>} />
          <Route path="/payment" element={<CenteredCard wide><Payment /></CenteredCard>} />
          <Route path="/premium-gate" element={<CenteredCard wide><PremiumGate /></CenteredCard>} />

          {/* Eski marshrutlar */}
          <Route path="/subscription" element={<Navigate to="/courses" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </DesktopLayout>
  );
}

/** Login/to'lov kabi sahifalar uchun ekran markazidagi kartochka */
function CenteredCard({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="min-h-screen grid place-items-center px-6 py-12">
      <div className="w-full" style={{ maxWidth: wide ? 720 : 460 }}>
        <div
          className="dk-frame rounded-[26px] overflow-hidden dk-anim-scale-in"
          style={{
            backgroundColor: "var(--theme-card-bg)",
            border: "1px solid var(--dk-border)",
            boxShadow: "var(--dk-shadow-xl)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function PageFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-64 rounded-[26px]" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-[20px]" />
        ))}
      </div>
    </div>
  );
}
