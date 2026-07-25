import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, CreditCard, BookOpen, Play } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ProfileLoader } from "../components/PageLoader";
import { getUserById, getAllProgressByUser, getTestResultsByUser, getUserSubscription, getAllCourses, getTopicsByCourse, getTopicById, getCourseById, getPaymentsByUser } from "@shared/repositories";
import type { User, UserProgress, TestResult, Subscription, Course, Topic, Payment } from "@shared/types";

interface ContinueItem {
  course: Course;
  topic: Topic | null;
  progress: number;
}

interface PaymentItem {
  title: string;
  date: string;
  amount: string;
}

export default function Profile() {
  const { user, isLoggedIn } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState<User | null>(null);
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProfile();
    else setLoading(false);
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    try {
      // User ma'lumotlari
      const uData = await getUserById(user.uid);
      setUserData(uData);

      // Progress va statistikalar
      const [allProgress, results] = await Promise.all([
        getAllProgressByUser(user.uid),
        getTestResultsByUser(user.uid),
      ]);

      setTotalCourses(allProgress.length);
      setTotalTests(results.length);
      setTestResults(results.slice(0, 3));

      // To'lovlar
      const userPayments = await getPaymentsByUser(user.uid);
      setPayments(userPayments);

      if (results.length > 0) {
        const avg = Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
        setAvgScore(avg);
      }

      // Davom etayotgan darslar (top 2)
      const sorted = [...allProgress].sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));
      const items: ContinueItem[] = [];
      for (const prog of sorted.slice(0, 2)) {
        const course = await getCourseById(prog.courseId);
        if (!course) continue;
        let topic: Topic | null = null;
        if (prog.currentTopicId) {
          topic = await getTopicById(prog.courseId, prog.currentTopicId);
        }
        const topics = await getTopicsByCourse(prog.courseId);
        const progress = topics.length > 0
          ? Math.round((prog.completedTopics.length / topics.length) * 100)
          : prog.progressPercent || 0;
        items.push({ course, topic, progress });
      }
      setContinueItems(items);

      // Obuna
      try {
        const sub = await getUserSubscription(user.uid);
        if (sub) setSubscriptions([sub]);
      } catch {}
    } catch (err) {
      console.error("Profil yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="page-content">
        <header className="px-5 pt-4"><h1 className="text-2xl font-bold">Profil</h1></header>
        <div className="px-5 mt-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">👤</span>
          </div>
          <h2 className="text-xl font-bold mt-4">Siz tizimga kirmagansiz</h2>
          <p className="text-sm text-gray-500 mt-2">Akkauntga kirasizmi yoki mehmon sifatida davom etasizmi?</p>
          <Link to="/login" className="block mt-6 bg-primary-500 text-white font-bold py-3.5 rounded-xl text-center">Akkauntga kirish</Link>
          <Link to="/register" className="block mt-3 border border-primary-500 text-primary-500 font-medium py-3.5 rounded-xl text-center">Ro'yxatdan o'tish</Link>
          <Link to="/" className="block mt-3 text-gray-500 font-medium py-3.5 text-center text-sm">Mehmon sifatida davom etish →</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return <ProfileLoader />;
  }

  const displayName = userData?.name || user?.displayName || user?.email?.split("@")[0] || "Foydalanuvchi";
  const avatarUrl = userData?.avatar;

  return (
    <div className="page-content pb-24">

      {/* Avatar & Info */}
      <div className="flex flex-col items-center mt-5">
        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-lg">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary-500 flex items-center justify-center text-white text-2xl font-bold">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <h2 className="text-lg font-bold mt-3 text-gray-900">{displayName}</h2>
        <span className="bg-primary-500 text-white text-[10px] font-semibold px-3 py-1 rounded-full mt-1">Premium Talaba</span>

        {/* Statistika */}
        <div className="flex gap-8 mt-4">
          <div className="text-center">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Kurslar</p>
            <p className="text-xl font-bold text-gray-900">{totalCourses}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Testlar</p>
            <p className="text-xl font-bold text-gray-900">{totalTests}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-gray-400 font-semibold uppercase">Natija</p>
            <p className="text-xl font-bold text-gray-900">{avgScore > 0 ? `${avgScore}%` : "—"}</p>
          </div>
        </div>

        {/* Profilni tahrirlash */}
        <Link to="/profile/edit" className="mt-4 w-52 border-2 border-primary-500 text-primary-500 font-semibold py-2.5 rounded-xl text-sm active:bg-primary-50 text-center block">
          Profilni tahrirlash
        </Link>
      </div>

      {/* Davom etayotgan darslar */}
      {continueItems.length > 0 && (
        <section className="px-5 mt-7">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Davom etayotgan darslar</h3>
            <Link to="/continue" className="text-sm text-primary-500 font-medium">Hammasi</Link>
          </div>

          <div className="overflow-x-auto -mx-5 px-5">
            <div className="flex gap-3 min-w-max">
              {continueItems.map((item) => (
                <button
                  key={item.course.id}
                  onClick={() => {
                    if (item.topic) navigate(`/course/${item.course.id}/topic/${item.topic.id}`);
                    else navigate(`/course/${item.course.id}`);
                  }}
                  className="w-56 bg-white border border-gray-100 rounded-xl p-4 text-left shrink-0 active:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-primary-500 font-semibold">Davom etmoqda</p>
                    <span className="text-[10px] text-gray-400">Ora t...</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {item.course.title}: {item.topic?.title || ""}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                    Modul: davom etishda
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[10px] text-gray-400">Progress</span>
                    <span className="text-[10px] font-bold text-primary-500">{item.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full mt-1">
                    <div className="h-full bg-primary-500 rounded-full" style={{ width: `${item.progress}%` }} />
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-primary-500">
                    <Play size={12} fill="currentColor" />
                    <span className="text-[11px] font-medium">Davom ettirish</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Faol obunalar */}
      <section className="px-5 mt-7">
        <h3 className="font-bold text-gray-900 mb-3">Faol obunalar</h3>
        {subscriptions.length > 0 ? (
          <div className="space-y-2.5">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
                <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                  <CreditCard size={18} className="text-primary-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{sub.plan}</p>
                  <p className="text-[10px] text-gray-500">⏱ Muddati: {new Date(sub.endDate).toLocaleDateString("uz")}</p>
                </div>
                <span className="text-[10px] font-semibold text-green-600 bg-green-50 px-2 py-1 rounded">Faol</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Hali obuna yo'q</p>
            <Link to="/subscription" className="text-sm text-primary-500 font-medium mt-1 inline-block">Obuna bo'lish →</Link>
          </div>
        )}
      </section>

      {/* So'nggi natijalar */}
      <section className="px-5 mt-7">
        <h3 className="font-bold text-gray-900 mb-3">So'nggi natijalar</h3>
        {testResults.length > 0 ? (
          <div className="space-y-2.5">
            {testResults.map((r, idx) => (
              <div key={r.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  r.score >= 80 ? "bg-green-50" : r.score >= 60 ? "bg-yellow-50" : "bg-red-50"
                }`}>
                  <span className="text-lg">{r.score >= 80 ? "🏆" : r.score >= 60 ? "📝" : "📕"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">Kurslar testi</p>
                  <p className="text-[10px] text-gray-500">{r.correctCount}/{r.totalQuestions} to'g'ri</p>
                </div>
                <span className={`text-sm font-bold ${r.score >= 80 ? "text-green-600" : r.score >= 60 ? "text-yellow-600" : "text-red-500"}`}>
                  {r.score}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-500">Hali test ishlanmagan</p>
            <Link to="/tests" className="text-sm text-primary-500 font-medium mt-1 inline-block">Testlarni ishlash →</Link>
          </div>
        )}
      </section>

      {/* Akkauntdan chiqish */}
      <section className="px-5 mt-7 pb-6">
        <button
          onClick={async () => {
            if (confirm("Akkauntdan chiqishni xohlaysizmi?")) {
              const { signOut } = await import("firebase/auth");
              const { auth } = await import("@shared/firebase");
              await signOut(auth);
              navigate("/");
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-red-50 border border-red-100 rounded-xl text-red-500 font-semibold text-sm active:bg-red-100"
        >
          Akkauntdan chiqish
        </button>
      </section>

    </div>
  );
}
