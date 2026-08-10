import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard, Play, Pencil, LogOut, Award, Receipt, HelpCircle,
  BookOpen, ClipboardList, Target, Crown, Clock, X, TrendingUp,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { ProfileLoader } from "../components/PageLoader";
import {
  getUserById, getAllProgressByUser, getTestResultsByUser, getAllUserSubscriptions,
  getTopicsByCourse, getTopicById, getCourseById, getTestsByCourse,
} from "@shared/repositories";
import type { User, TestResult, Subscription, Course, Topic } from "@shared/types";

interface ContinueItem {
  course: Course;
  topic: Topic | null;
  progress: number;
}

type SubWithCourse = Subscription & { courseName?: string };

/** "3-modul: 1 - mavzu: Nom" → "1-mavzu: Nom" */
function cleanTopicTitle(title: string): string {
  const full = title.match(/^\d+-modul:\s*(\d+)\s*-\s*mavzu:\s*(.*)/i);
  if (full) return `${full[1]}-mavzu: ${full[2]}`;
  if (/^\d+-mavzu:/i.test(title)) return title;
  const m = title.match(/^(\d+)-modul:\s*(.*)/i);
  if (m) return `${m[1]}-mavzu: ${m[2]}`;
  return title;
}

export default function Profile() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const [userData, setUserData] = useState<User | null>(null);
  const [totalCourses, setTotalCourses] = useState(0);
  const [totalTests, setTotalTests] = useState(0);
  const [avgScore, setAvgScore] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubWithCourse[]>([]);
  const [allSubscriptions, setAllSubscriptions] = useState<SubWithCourse[]>([]);
  const [selectedSub, setSelectedSub] = useState<SubWithCourse | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [testResults, setTestResults] = useState<Array<TestResult & { testTitle?: string; courseName?: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProfile();
    else setLoading(false);
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    try {
      const uData = await getUserById(user.uid);
      setUserData(uData);

      const [allProgress, results] = await Promise.all([
        getAllProgressByUser(user.uid),
        getTestResultsByUser(user.uid),
      ]);

      setTotalCourses(allProgress.length);
      setTotalTests(results.length);
      setTotalXP(allProgress.reduce((s, p) => s + (p.totalXP || 0), 0));

      if (results.length > 0) {
        setAvgScore(Math.round(results.reduce((s, r) => s + r.score, 0) / results.length));
      }

      // So'nggi natijalar — test nomi va kurs nomi bilan
      const recent = [...results].sort((a, b) => b.completedAt - a.completedAt).slice(0, 3);
      const enriched = await Promise.all(
        recent.map(async (r) => {
          try {
            const [course, tests] = await Promise.all([
              getCourseById(r.courseId),
              getTestsByCourse(r.courseId),
            ]);
            const t = tests.find((x) => x.id === r.testId);
            return { ...r, testTitle: t?.title, courseName: course?.title };
          } catch {
            return { ...r };
          }
        })
      );
      setTestResults(enriched);

      // Davom etayotgan darslar
      const sorted = [...allProgress].sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));
      const items: ContinueItem[] = [];
      for (const prog of sorted.slice(0, 3)) {
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

      // Obunalar
      try {
        const subs = await getAllUserSubscriptions(user.uid);
        const withNames = await Promise.all(
          subs.map(async (sub) => {
            if (sub.courseId) {
              try {
                const course = await getCourseById(sub.courseId);
                return { ...sub, courseName: course?.title };
              } catch {}
            }
            return { ...sub, courseName: sub.plan };
          })
        );
        setSubscriptions(withNames.filter((s) => s.status === "active" && s.endDate > Date.now()));
        setAllSubscriptions(withNames);
      } catch {}
    } catch (err) {
      console.error("Profil yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  // ===== Login qilmagan holat =====
  if (!isLoggedIn) {
    return (
      <div className="page-content">
        <div className="bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] px-5 pt-8 pb-12 rounded-b-[2rem] text-center">
          <div className="w-20 h-20 bg-white/15 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👤</span>
          </div>
          <h2 className="text-xl font-bold text-white">Siz tizimga kirmagansiz</h2>
          <p className="text-sm text-white/70 mt-1.5">Progressni saqlash uchun akkaunt yarating</p>
        </div>
        <div className="px-5 -mt-6 relative z-10 space-y-3">
          <Link to="/login" className="block bg-indigo-600 text-white font-bold py-3.5 rounded-2xl text-center shadow-lg active:scale-[0.98] transition-transform">
            Akkauntga kirish
          </Link>
          <Link to="/register" className="block bg-white border border-gray-200 text-gray-700 font-semibold py-3.5 rounded-2xl text-center">
            Ro'yxatdan o'tish
          </Link>
          <Link to="/" className="block text-gray-500 font-medium py-3 text-center text-sm">
            Mehmon sifatida davom etish →
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return <ProfileLoader />;

  const displayName = userData?.name || user?.displayName || user?.email?.split("@")[0] || "Foydalanuvchi";
  const avatarUrl = userData?.avatar;
  const isPremium = subscriptions.length > 0;
  const history = allSubscriptions.filter((s) => s.status !== "active" || s.endDate <= Date.now());

  return (
    <div className="page-content pb-24">
      {/* ===== Hero ===== */}
      <div className="bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] px-5 pt-6 pb-14 rounded-b-[2rem]">
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/20 ring-2 ring-white/30">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-3xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            {isPremium && (
              <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center ring-2 ring-[#312e81]">
                <Crown size={14} className="text-white" />
              </div>
            )}
          </div>

          {/* Ism va badge */}
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="text-xl font-bold text-white">{displayName}</h2>
            <p className="text-xs text-white/60 mt-0.5">{userData?.phone || user?.email || ""}</p>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full mt-2 ${
              isPremium ? "bg-yellow-400 text-yellow-900" : "bg-white/20 text-white"
            }`}>
              {isPremium ? <><Crown size={10} /> Premium talaba</> : "Bepul talaba"}
            </span>
          </div>

          {/* Tahrirlash */}
          <Link
            to="/profile/edit"
            className="shrink-0 w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center active:bg-white/25"
            aria-label="Profilni tahrirlash"
          >
            <Pencil size={16} className="text-white" />
          </Link>
        </div>
      </div>

      {/* ===== Statistika kartasi ===== */}
      <div className="mx-4 -mt-10 relative z-10 bg-white rounded-2xl shadow-lg py-4">
        <div className="flex items-stretch">
          <StatCell icon={<BookOpen size={18} className="text-indigo-500" />} value={String(totalCourses)} label="Kurslar" />
          <div className="w-px bg-gray-100 my-1" />
          <StatCell icon={<ClipboardList size={18} className="text-purple-500" />} value={String(totalTests)} label="Testlar" />
          <div className="w-px bg-gray-100 my-1" />
          <StatCell icon={<Target size={18} className="text-green-500" />} value={avgScore > 0 ? `${avgScore}%` : "—"} label="O'rtacha" />
          <div className="w-px bg-gray-100 my-1" />
          <StatCell icon={<Award size={18} className="text-yellow-500" />} value={`${totalXP}`} label="XP" />
        </div>
      </div>

      {/* ===== Tezkor havolalar ===== */}
      <div className="px-4 mt-4 grid grid-cols-3 gap-2.5">
        <QuickLink to="/profile/certificates" icon={<Award size={18} className="text-yellow-600" />} bg="bg-yellow-50" label="Sertifikatlar" />
        <QuickLink to="/profile/payments" icon={<Receipt size={18} className="text-green-600" />} bg="bg-green-50" label="To'lovlar" />
        <QuickLink to="/profile/help" icon={<HelpCircle size={18} className="text-blue-600" />} bg="bg-blue-50" label="Yordam" />
      </div>

      {/* ===== Davom etayotgan darslar ===== */}
      {continueItems.length > 0 && (
        <section className="mt-6">
          <div className="flex items-center justify-between px-4 mb-3">
            <div className="flex items-center gap-2">
              <Play size={15} className="text-indigo-500 fill-current" />
              <h3 className="font-bold text-gray-900 text-base">Davom etayotgan darslar</h3>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto px-4 pb-3" style={{ WebkitOverflowScrolling: "touch" }}>
            {continueItems.map((item) => (
              <button
                key={item.course.id}
                onClick={() =>
                  item.topic
                    ? navigate(`/course/${item.course.id}/topic/${item.topic.id}`)
                    : navigate(`/course/${item.course.id}`)
                }
                className="shrink-0 w-60 bg-white border border-gray-100 rounded-2xl p-4 text-left shadow-sm active:bg-gray-50"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Davom etmoqda
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">{item.course.title}</p>
                {item.topic && (
                  <p className="text-[11px] text-gray-400 mt-1 truncate">{cleanTopicTitle(item.topic.title)}</p>
                )}
                <div className="flex items-center justify-between mt-3 mb-1">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wide">Progress</span>
                  <span className="text-xs font-bold text-indigo-500">{item.progress}%</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${item.progress}%` }} />
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-indigo-500">
                  <Play size={11} fill="currentColor" />
                  <span className="text-[11px] font-semibold">Davom ettirish</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ===== Faol obunalar ===== */}
      <section className="px-4 mt-6">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard size={15} className="text-green-500" />
          <h3 className="font-bold text-gray-900 text-base">Faol obunalar</h3>
        </div>
        {subscriptions.length > 0 ? (
          <div className="space-y-2.5">
            {subscriptions.map((sub) => {
              const daysLeft = Math.max(0, Math.ceil((sub.endDate - Date.now()) / 86400000));
              const total = Math.max(1, Math.ceil((sub.endDate - sub.startDate) / 86400000));
              const pct = Math.round((daysLeft / total) * 100);
              return (
                <button
                  key={sub.id}
                  onClick={() => setSelectedSub(sub)}
                  className="w-full bg-white border border-gray-100 rounded-2xl p-4 text-left shadow-sm active:bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
                      <Crown size={18} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 line-clamp-2 leading-snug">
                        {sub.courseName || sub.plan}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{sub.plan}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                      Faol
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock size={9} /> {daysLeft} kun qoldi
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(sub.endDate).toLocaleDateString("uz")}
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${daysLeft <= 7 ? "bg-red-400" : daysLeft <= 30 ? "bg-amber-400" : "bg-green-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-6 text-center">
            <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2">
              <Crown size={20} className="text-gray-300" />
            </div>
            <p className="text-sm text-gray-500">Hali obuna yo'q</p>
            <Link to="/courses" className="text-sm text-indigo-500 font-semibold mt-1.5 inline-block">
              Kurslarni ko'rish →
            </Link>
          </div>
        )}
      </section>

      {/* ===== Obuna tarixi ===== */}
      {history.length > 0 && (
        <section className="px-4 mt-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              <h3 className="font-bold text-gray-900 text-base">Obuna tarixi</h3>
            </div>
            {history.length > 3 && (
              <button
                onClick={() => setShowAllHistory(!showAllHistory)}
                className="text-xs text-indigo-500 font-semibold"
              >
                {showAllHistory ? "Kamroq" : "Barchasi"}
              </button>
            )}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 overflow-hidden">
            {(showAllHistory ? history : history.slice(0, 3)).map((sub) => (
              <div key={sub.id} className="flex items-center gap-3 p-3.5">
                <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <CreditCard size={15} className="text-gray-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-600 truncate">{sub.courseName || sub.plan}</p>
                  <p className="text-[10px] text-gray-400">
                    {new Date(sub.startDate).toLocaleDateString("uz")} — {new Date(sub.endDate).toLocaleDateString("uz")}
                  </p>
                </div>
                <span
                  className={`text-[9px] font-bold px-2 py-1 rounded-lg shrink-0 ${
                    sub.status === "cancelled" ? "text-red-500 bg-red-50" : "text-gray-400 bg-gray-50"
                  }`}
                >
                  {sub.status === "cancelled" ? "Bekor" : "Tugagan"}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ===== So'nggi natijalar ===== */}
      <section className="px-4 mt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp size={15} className="text-purple-500" />
            <h3 className="font-bold text-gray-900 text-base">So'nggi natijalar</h3>
          </div>
          {testResults.length > 0 && (
            <Link to="/tests" className="text-xs text-indigo-500 font-semibold">Barchasi</Link>
          )}
        </div>
        {testResults.length > 0 ? (
          <div className="space-y-2.5">
            {testResults.map((r) => (
              <div key={r.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3.5 shadow-sm">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    r.score >= 80 ? "bg-green-50" : r.score >= 60 ? "bg-amber-50" : "bg-red-50"
                  }`}
                >
                  <span className="text-lg">{r.score >= 80 ? "🏆" : r.score >= 60 ? "📝" : "📕"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{r.testTitle || "Test"}</p>
                  {r.courseName && <p className="text-[10px] text-indigo-500 font-medium truncate">{r.courseName}</p>}
                  <p className="text-[10px] text-gray-400 mt-0.5">{r.correctCount}/{r.totalQuestions} to'g'ri</p>
                </div>
                <span
                  className={`shrink-0 text-sm font-bold px-2.5 py-1 rounded-lg ${
                    r.score >= 80 ? "text-green-600 bg-green-50" : r.score >= 60 ? "text-amber-600 bg-amber-50" : "text-red-500 bg-red-50"
                  }`}
                >
                  {r.score}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl p-6 text-center">
            <p className="text-3xl mb-2">📝</p>
            <p className="text-sm text-gray-500">Hali test ishlanmagan</p>
            <Link to="/tests" className="text-sm text-indigo-500 font-semibold mt-1.5 inline-block">
              Testlarni ishlash →
            </Link>
          </div>
        )}
      </section>

      {/* ===== Akkauntdan chiqish ===== */}
      <section className="px-4 mt-6">
        <button
          onClick={async () => {
            if (confirm("Akkauntdan chiqishni xohlaysizmi?")) {
              await logout();
              navigate("/");
            }
          }}
          className="w-full flex items-center justify-center gap-2 py-3.5 bg-white border border-red-100 rounded-2xl text-red-500 font-semibold text-sm active:bg-red-50"
        >
          <LogOut size={16} /> Akkauntdan chiqish
        </button>
      </section>

      {/* ===== Obuna tafsilotlari modali ===== */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setSelectedSub(null)}>
          <div
            className="bg-white w-full max-w-mobile rounded-t-3xl p-6 animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-gray-900">Obuna tafsilotlari</h3>
              <button onClick={() => setSelectedSub(null)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <DetailRow label="Kurs" value={selectedSub.courseName || selectedSub.plan} />
              <DetailRow label="Tarif" value={selectedSub.plan} />
              <DetailRow
                label="Boshlanish"
                value={new Date(selectedSub.startDate).toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" })}
              />
              <DetailRow
                label="Tugash sanasi"
                value={new Date(selectedSub.endDate).toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" })}
              />
              <DetailRow
                label="Qolgan kunlar"
                value={`${Math.max(0, Math.ceil((selectedSub.endDate - Date.now()) / 86400000))} kun`}
                highlight
              />
            </div>

            <button
              onClick={() => setSelectedSub(null)}
              className="w-full mt-5 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-2xl text-sm active:bg-gray-200"
            >
              Yopish
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Statistika ustuni =====
function StatCell({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex-1 min-w-0 flex flex-col items-center gap-1.5 px-1">
      <div className="flex items-center justify-center h-5">{icon}</div>
      <p className="text-sm font-bold text-gray-900 leading-tight truncate w-full text-center">{value}</p>
      <p className="text-[10px] text-gray-400 leading-tight">{label}</p>
    </div>
  );
}

// ===== Tezkor havola =====
function QuickLink({ to, icon, bg, label }: { to: string; icon: React.ReactNode; bg: string; label: string }) {
  return (
    <Link
      to={to}
      className="bg-white border border-gray-100 rounded-2xl p-3 flex flex-col items-center gap-2 shadow-sm active:bg-gray-50"
    >
      <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center`}>{icon}</div>
      <span className="text-[10px] font-semibold text-gray-600 text-center leading-tight">{label}</span>
    </Link>
  );
}

// ===== Modal qatori =====
function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-gray-500 shrink-0">{label}</span>
      <span className={`text-sm font-semibold text-right ${highlight ? "text-indigo-600" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}
