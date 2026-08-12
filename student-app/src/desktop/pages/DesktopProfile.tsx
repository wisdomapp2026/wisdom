import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  CreditCard,
  Play,
  Pencil,
  LogOut,
  Award,
  Receipt,
  HelpCircle,
  BookOpen,
  ClipboardList,
  Target,
  Crown,
  Clock,
  X,
  TrendingUp,
  Star,
  Shield,
  UserPlus,
} from "lucide-react";
import {
  getUserById,
  getAllProgressByUser,
  getTestResultsByUser,
  getAllUserSubscriptions,
  getTopicsByCourse,
  getTopicById,
  getCourseById,
  getTestsByCourse,
} from "@shared/repositories";
import type { User, TestResult, Subscription, Course, Topic } from "@shared/types";
import { useAuth } from "../../hooks/useAuth";
import { SectionHeading, StatCard, ProgressBar, Chip, EmptyState, Reveal, Skeleton } from "../components/ui";

interface ContinueItem {
  course: Course;
  topic: Topic | null;
  progress: number;
}

type SubWithCourse = Subscription & { courseName?: string };

function cleanTopicTitle(title: string): string {
  const full = title.match(/^\d+-modul:\s*(\d+)\s*-\s*mavzu:\s*(.*)/i);
  if (full) return `${full[1]}-mavzu: ${full[2]}`;
  if (/^\d+-mavzu:/i.test(title)) return title;
  const m = title.match(/^(\d+)-modul:\s*(.*)/i);
  if (m) return `${m[1]}-mavzu: ${m[2]}`;
  return title;
}

/**
 * Desktop profil sahifasi.
 *
 * Ma'lumot yuklash mobil `Profile.tsx` bilan aynan bir xil — taqdimot
 * ikki ustunli (chapda kabinet, o'ngda obunalar va natijalar) qilib qayta qurildi.
 */
export default function DesktopProfile() {
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
  const [testResults, setTestResults] = useState<
    Array<TestResult & { testTitle?: string; courseName?: string }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadProfile();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function loadProfile() {
    if (!user) return;
    try {
      setUserData(await getUserById(user.uid));

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

      // So'nggi natijalar (desktopda 6 ta ko'rsatamiz)
      const recent = [...results].sort((a, b) => b.completedAt - a.completedAt).slice(0, 6);
      const enriched = await Promise.all(
        recent.map(async (r) => {
          try {
            const [course, tests] = await Promise.all([
              getCourseById(r.courseId),
              getTestsByCourse(r.courseId),
            ]);
            return {
              ...r,
              testTitle: tests.find((x) => x.id === r.testId)?.title,
              courseName: course?.title,
            };
          } catch {
            return { ...r };
          }
        })
      );
      setTestResults(enriched);

      // Davom etayotgan darslar (desktopda 4 ta)
      const sorted = [...allProgress].sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));
      const items: ContinueItem[] = [];
      for (const prog of sorted.slice(0, 4)) {
        const course = await getCourseById(prog.courseId);
        if (!course) continue;
        let topic: Topic | null = null;
        if (prog.currentTopicId) topic = await getTopicById(prog.courseId, prog.currentTopicId);
        const topics = await getTopicsByCourse(prog.courseId);
        const progress =
          topics.length > 0
            ? Math.round((prog.completedTopics.length / topics.length) * 100)
            : prog.progressPercent || 0;
        items.push({ course, topic, progress: Math.min(100, progress) });
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

  // ===== Login qilmagan =====
  if (!isLoggedIn) {
    return (
      <div className="max-w-3xl mx-auto py-10">
        <div
          className="relative overflow-hidden rounded-[28px] px-12 py-14 text-center"
          style={{ background: "linear-gradient(130deg, #1e1b4b, #312e81 52%, #4338ca)" }}
        >
          <span className="absolute -top-16 -right-10 w-56 h-56 rounded-full bg-white/8 dk-anim-float" />
          <div className="relative z-10">
            <span className="w-24 h-24 mx-auto rounded-3xl grid place-items-center bg-white/15 backdrop-blur-sm text-5xl">
              👤
            </span>
            <h1 className="text-white text-[30px] font-extrabold mt-6">Siz tizimga kirmagansiz</h1>
            <p className="text-white/70 text-[15px] mt-2.5 max-w-md mx-auto">
              Progressni saqlash, sertifikat olish va testlarda qatnashish uchun akkaunt yarating.
            </p>
            <div className="flex items-center justify-center gap-3 mt-9 flex-wrap">
              <Link
                to="/login"
                className="dk-press inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white text-indigo-700 text-sm font-bold shadow-xl"
              >
                Akkauntga kirish
              </Link>
              <Link
                to="/register"
                className="dk-press inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-sm font-bold backdrop-blur-sm transition-colors"
              >
                <UserPlus size={16} /> Ro'yxatdan o'tish
              </Link>
            </div>
            <Link to="/" className="inline-block text-white/60 hover:text-white text-[13px] font-medium mt-6 transition-colors">
              Mehmon sifatida davom etish →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <ProfileSkeleton />;

  const displayName =
    userData?.name || user?.displayName || user?.email?.split("@")[0] || "Foydalanuvchi";
  const isPremium = subscriptions.length > 0;
  const history = allSubscriptions.filter((s) => s.status !== "active" || s.endDate <= Date.now());

  return (
    <div className="space-y-8">
      {/* ===== Hero ===== */}
      <section
        className="relative overflow-hidden rounded-[28px] px-10 py-9"
        style={{ background: "linear-gradient(120deg, #1e1b4b 0%, #312e81 48%, #4338ca 100%)" }}
      >
        <span className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-white/8 dk-anim-float" />
        <div className="relative z-10 flex items-center gap-7 flex-wrap">
          <div className="relative shrink-0">
            <div className="w-28 h-28 rounded-3xl overflow-hidden bg-white/20 ring-2 ring-white/30 shadow-2xl">
              {userData?.avatar ? (
                <img src={userData.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full grid place-items-center text-white text-4xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {isPremium && (
              <span className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-full grid place-items-center bg-yellow-400 ring-4 ring-[#312e81]">
                <Crown size={17} className="text-white" />
              </span>
            )}
          </div>

          <div className="flex-1 min-w-[240px]">
            <h1 className="text-white text-[32px] font-extrabold leading-tight">{displayName}</h1>
            <p className="text-white/60 text-[13.5px] mt-1">{userData?.phone || user?.email || ""}</p>
            <span
              className={`inline-flex items-center gap-1.5 text-[11.5px] font-bold px-3.5 py-1.5 rounded-full mt-3.5 ${
                isPremium ? "bg-yellow-400 text-yellow-900" : "bg-white/20 text-white"
              }`}
            >
              {isPremium ? (
                <>
                  <Crown size={12} /> Premium talaba
                </>
              ) : (
                "Bepul talaba"
              )}
            </span>
          </div>

          <Link
            to="/profile/edit"
            className="dk-press shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/15 hover:bg-white/25 text-white text-[13.5px] font-bold backdrop-blur-sm transition-colors"
          >
            <Pencil size={15} /> Profilni tahrirlash
          </Link>
        </div>
      </section>

      {/* ===== Statistika ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 dk-stagger">
        <StatCard icon={<BookOpen size={20} />} label="Boshlangan kurslar" value={String(totalCourses)} tone="primary" />
        <StatCard icon={<ClipboardList size={20} />} label="Ishlangan testlar" value={String(totalTests)} tone="purple" />
        <StatCard icon={<Target size={20} />} label="O'rtacha natija" value={avgScore > 0 ? `${avgScore}%` : "—"} tone="green" />
        <StatCard icon={<Award size={20} />} label="Yig'ilgan XP" value={totalXP.toLocaleString()} tone="amber" />
      </div>

      {/* ===== Tezkor havolalar ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 dk-stagger">
        <QuickLink to="/profile/certificates" icon={<Award size={20} />} label="Sertifikatlar" hint="Yutuqlaringiz" tone="bg-amber-50 text-amber-600" />
        <QuickLink to="/profile/payments" icon={<Receipt size={20} />} label="To'lovlar" hint="Tranzaksiya tarixi" tone="bg-emerald-50 text-emerald-600" />
        <QuickLink to="/profile/favorites" icon={<Star size={20} />} label="Tanlangan" hint="Saqlangan modullar" tone="bg-violet-50 text-violet-600" />
        <QuickLink to="/profile/help" icon={<HelpCircle size={20} />} label="Yordam" hint="Savol-javoblar" tone="bg-sky-50 text-sky-600" />
      </div>

      {/* ===== Davom etayotgan darslar ===== */}
      {continueItems.length > 0 && (
        <Reveal>
          <section>
            <SectionHeading
              title="Davom etayotgan darslar"
              icon={<Play size={18} fill="currentColor" />}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 dk-stagger">
              {continueItems.map((item) => (
                <button
                  key={item.course.id}
                  onClick={() =>
                    item.topic
                      ? navigate(`/course/${item.course.id}/topic/${item.topic.id}`)
                      : navigate(`/course/${item.course.id}`)
                  }
                  className="dk-card dk-card-hover group p-5 text-left flex flex-col"
                >
                  <Chip tone="primary">Davom etmoqda</Chip>
                  <p className="text-[15px] font-bold text-gray-900 dk-clamp-2 leading-snug mt-2.5 group-hover:text-primary-600 transition-colors">
                    {item.course.title}
                  </p>
                  {item.topic && (
                    <p className="text-[12px] text-gray-400 dk-clamp-1 mt-1">{cleanTopicTitle(item.topic.title)}</p>
                  )}
                  <div className="mt-auto pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-gray-400 uppercase tracking-wide">Progress</span>
                      <span className="text-[13px] font-extrabold text-primary-600 tabular-nums">
                        {item.progress}%
                      </span>
                    </div>
                    <ProgressBar value={item.progress} height={6} />
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-primary-600 mt-3.5 transition-all group-hover:gap-3">
                      <Play size={12} fill="currentColor" /> Davom ettirish
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* ===== Ikki ustun: obunalar | natijalar ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        {/* Obunalar */}
        <Reveal>
          <section>
            <SectionHeading title="Faol obunalar" icon={<CreditCard size={18} />} />
            {subscriptions.length > 0 ? (
              <div className="space-y-4">
                {subscriptions.map((sub) => {
                  const daysLeft = Math.max(0, Math.ceil((sub.endDate - Date.now()) / 86_400_000));
                  const total = Math.max(1, Math.ceil((sub.endDate - sub.startDate) / 86_400_000));
                  const pct = Math.round((daysLeft / total) * 100);
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setSelectedSub(sub)}
                      className="dk-card dk-card-hover w-full p-5 text-left"
                    >
                      <div className="flex items-start gap-4">
                        <span className="w-12 h-12 rounded-2xl grid place-items-center bg-emerald-50 shrink-0">
                          <Crown size={20} className="text-emerald-600" />
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className="block text-[15px] font-bold text-gray-900 dk-clamp-2 leading-snug">
                            {sub.courseName || sub.plan}
                          </span>
                          <span className="block text-[11.5px] text-gray-400 mt-0.5">{sub.plan}</span>
                        </span>
                        <Chip tone="green">Faol</Chip>
                      </div>
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11.5px] text-gray-400 flex items-center gap-1.5">
                            <Clock size={11} /> {daysLeft} kun qoldi
                          </span>
                          <span className="text-[11.5px] text-gray-400">
                            {new Date(sub.endDate).toLocaleDateString("uz")}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              daysLeft <= 7 ? "bg-red-400" : daysLeft <= 30 ? "bg-amber-400" : "bg-emerald-500"
                            }`}
                            style={{ width: `${pct}%`, transition: "width 0.7s var(--dk-ease)" }}
                          />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                emoji="👑"
                title="Hali obuna yo'q"
                hint="Premium kurslarga kirish uchun obuna sotib oling."
                action={
                  <Link
                    to="/courses"
                    className="dk-press inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-[13.5px] font-bold transition-colors"
                  >
                    Kurslarni ko'rish →
                  </Link>
                }
              />
            )}

            {/* Obuna tarixi */}
            {history.length > 0 && (
              <div className="mt-7">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                    <Clock size={15} className="text-gray-400" /> Obuna tarixi
                  </h3>
                  {history.length > 4 && (
                    <button
                      onClick={() => setShowAllHistory((v) => !v)}
                      className="text-[12px] font-semibold text-primary-600 hover:text-primary-700"
                    >
                      {showAllHistory ? "Kamroq" : "Barchasi"}
                    </button>
                  )}
                </div>
                <div className="dk-card overflow-hidden">
                  {(showAllHistory ? history : history.slice(0, 4)).map((sub, i) => (
                    <div
                      key={sub.id}
                      className="flex items-center gap-3.5 px-5 py-4"
                      style={i > 0 ? { borderTop: "1px solid var(--dk-border)" } : undefined}
                    >
                      <span className="w-9 h-9 rounded-xl grid place-items-center bg-gray-50 shrink-0">
                        <CreditCard size={15} className="text-gray-300" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[13.5px] font-medium text-gray-600 truncate">
                          {sub.courseName || sub.plan}
                        </span>
                        <span className="block text-[11px] text-gray-400 mt-0.5">
                          {new Date(sub.startDate).toLocaleDateString("uz")} —{" "}
                          {new Date(sub.endDate).toLocaleDateString("uz")}
                        </span>
                      </span>
                      <Chip tone={sub.status === "cancelled" ? "red" : "gray"}>
                        {sub.status === "cancelled" ? "Bekor" : "Tugagan"}
                      </Chip>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </Reveal>

        {/* Natijalar */}
        <Reveal>
          <section>
            <SectionHeading
              title="So'nggi natijalar"
              icon={<TrendingUp size={18} />}
              action={
                testResults.length > 0 ? (
                  <Link
                    to="/tests"
                    className="text-[12.5px] font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-full transition-colors"
                  >
                    Barchasi
                  </Link>
                ) : undefined
              }
            />
            {testResults.length > 0 ? (
              <div className="dk-card overflow-hidden">
                {testResults.map((r, i) => (
                  <div
                    key={r.id}
                    className="flex items-center gap-4 px-5 py-4"
                    style={i > 0 ? { borderTop: "1px solid var(--dk-border)" } : undefined}
                  >
                    <span
                      className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 text-lg ${
                        r.score >= 80 ? "bg-emerald-50" : r.score >= 60 ? "bg-amber-50" : "bg-red-50"
                      }`}
                    >
                      {r.score >= 80 ? "🏆" : r.score >= 60 ? "📝" : "📕"}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold text-gray-900 truncate">
                        {r.testTitle || "Test"}
                      </span>
                      {r.courseName && (
                        <span className="block text-[11.5px] text-primary-600 font-medium truncate mt-0.5">
                          {r.courseName}
                        </span>
                      )}
                      <span className="block text-[11px] text-gray-400 mt-0.5">
                        {r.correctCount}/{r.totalQuestions} to'g'ri ·{" "}
                        {new Date(r.completedAt).toLocaleDateString("uz")}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 px-3 py-1.5 rounded-xl text-[14px] font-bold ${
                        r.score >= 80
                          ? "text-emerald-600 bg-emerald-50"
                          : r.score >= 60
                          ? "text-amber-600 bg-amber-50"
                          : "text-red-500 bg-red-50"
                      }`}
                    >
                      {r.score}%
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                emoji="📝"
                title="Hali test ishlanmagan"
                hint="Mavzularni o'qib bo'lgach testlar ochiladi."
                action={
                  <Link
                    to="/tests"
                    className="dk-press inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-[13.5px] font-bold transition-colors"
                  >
                    Testlarni ko'rish →
                  </Link>
                }
              />
            )}

            {/* Xavfsizlik / chiqish */}
            <div className="dk-card p-5 mt-7 flex items-center gap-4">
              <span className="w-11 h-11 rounded-2xl grid place-items-center bg-gray-50 shrink-0">
                <Shield size={19} className="text-gray-400" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-[14px] font-semibold text-gray-900">Akkaunt xavfsizligi</span>
                <span className="block text-[12px] text-gray-400 mt-0.5">
                  Umumiy kompyuterda ishlatgandan keyin tizimdan chiqing
                </span>
              </span>
              <button
                onClick={async () => {
                  if (confirm("Akkauntdan chiqishni xohlaysizmi?")) {
                    await logout();
                    navigate("/");
                  }
                }}
                className="dk-press shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-red-500 hover:bg-red-50 text-[13px] font-bold transition-colors"
                style={{ border: "1px solid rgba(239,68,68,0.25)" }}
              >
                <LogOut size={15} /> Chiqish
              </button>
            </div>
          </section>
        </Reveal>
      </div>

      {/* Obuna modali */}
      {selectedSub && <SubModal sub={selectedSub} onClose={() => setSelectedSub(null)} />}
    </div>
  );
}

function QuickLink({
  to,
  icon,
  label,
  hint,
  tone,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
  tone: string;
}) {
  return (
    <Link to={to} className="dk-card dk-card-hover group p-5 flex items-center gap-4">
      <span className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 ${tone}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-[14px] font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
          {label}
        </span>
        <span className="block text-[11.5px] text-gray-400 truncate mt-0.5">{hint}</span>
      </span>
    </Link>
  );
}

function SubModal({ sub, onClose }: { sub: SubWithCourse; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const daysLeft = Math.max(0, Math.ceil((sub.endDate - Date.now()) / 86_400_000));

  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-900/55 backdrop-blur-sm grid place-items-center p-6 dk-anim-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl dk-anim-scale-in"
        style={{ backgroundColor: "var(--theme-card-bg)", border: "1px solid var(--dk-border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-7 py-5"
          style={{ borderBottom: "1px solid var(--dk-border)" }}
        >
          <h3 className="text-[18px] font-extrabold text-gray-900">Obuna tafsilotlari</h3>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl grid place-items-center bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Yopish"
          >
            <X size={17} />
          </button>
        </div>

        <div className="p-7 space-y-4">
          <DetailRow label="Kurs" value={sub.courseName || sub.plan} />
          <DetailRow label="Tarif" value={sub.plan} />
          <DetailRow
            label="Boshlanish"
            value={new Date(sub.startDate).toLocaleDateString("uz-UZ", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <DetailRow
            label="Tugash sanasi"
            value={new Date(sub.endDate).toLocaleDateString("uz-UZ", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          />
          <DetailRow label="Qolgan kunlar" value={`${daysLeft} kun`} highlight />
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 pb-3.5" style={{ borderBottom: "1px solid var(--dk-border)" }}>
      <span className="text-[12.5px] text-gray-500 shrink-0">{label}</span>
      <span className={`text-[14px] font-semibold text-right ${highlight ? "text-primary-600" : "text-gray-900"}`}>
        {value}
      </span>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-52 rounded-[28px]" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-[20px]" />
        ))}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 rounded-[20px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <Skeleton className="h-72 rounded-[20px]" />
        <Skeleton className="h-72 rounded-[20px]" />
      </div>
    </div>
  );
}
