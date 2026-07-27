import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAllCourses,
  getTestsByCourse,
  getTestResultsByUser,
  getAllProgressByUser,
  getFoldersByCourse,
  getTopicsByCourse,
  getAllUserSubscriptions,
  getMotivationPhrases,
  getMotivationSettings,
  getAllTestResults,
  getUserById,
} from "@shared/repositories";
import type { Test, TestResult } from "@shared/types";
import { Lock, Play, RotateCcw, Eye, Trophy, Search, ChevronDown, ChevronUp, CheckCircle2, Clock, HelpCircle, TrendingUp, X } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { TestsLoader } from "../components/PageLoader";
import { cachedFetch } from "../hooks/useCache";

/** Test + manba ma'lumotlari va qulf holati */
interface TestNode {
  test: Test;
  courseId: string;
  courseName: string;
  courseCategory: string;
  folderName: string;
  topicName: string;
  /** Kursga kirish huquqi bor */
  courseUnlocked: boolean;
  /** Mavzu o'zlashtirilgan */
  topicUnlocked: boolean;
  /** Oldingi test ishlangan (ketma-ketlik) */
  prevDone: boolean;
  /** Yakuniy holat */
  locked: boolean;
  lockReason: "course" | "topic" | "sequence" | null;
  result: TestResult | null;
}

interface CourseGroup {
  courseId: string;
  courseName: string;
  courseCategory: string;
  hasAccess: boolean;
  nodes: TestNode[];
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatar?: string;
  avgScore: number;
  totalTests: number;
}

/** "3-modul: 1 - mavzu: Nom" → "1-mavzu: Nom" */
function cleanTopicTitle(title: string): string {
  const full = title.match(/^\d+-modul:\s*(\d+)\s*-\s*mavzu:\s*(.*)/i);
  if (full) return `${full[1]}-mavzu: ${full[2]}`;
  if (/^\d+-mavzu:/i.test(title)) return title;
  const m = title.match(/^(\d+)-modul:\s*(.*)/i);
  if (m) return `${m[1]}-mavzu: ${m[2]}`;
  return title;
}

export default function Tests() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [motivationPhrase, setMotivationPhrase] = useState("Har bir test sizni maqsadingizga yaqinlashtiradi.");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [lockToast, setLockToast] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [user, authLoading]);

  async function loadData() {
    try {
      const courses = await cachedFetch("all-courses", getAllCourses);
      const visible = courses.filter((c) => !c.isHidden);

      // Foydalanuvchi natijalari va progressi
      let userResults: TestResult[] = [];
      let completedTopicsByCourse: Record<string, string[]> = {};
      let accessibleCourseIds = new Set<string>();

      if (user) {
        const [res, progressList, subs] = await Promise.all([
          getTestResultsByUser(user.uid),
          getAllProgressByUser(user.uid),
          getAllUserSubscriptions(user.uid),
        ]);
        userResults = res.sort((a, b) => b.completedAt - a.completedAt);
        setResults(userResults);

        for (const p of progressList) {
          completedTopicsByCourse[p.courseId] = p.completedTopics || [];
        }

        const now = Date.now();
        for (const s of subs) {
          if (s.status === "active" && s.endDate > now) {
            if (s.courseId) accessibleCourseIds.add(s.courseId);
            else visible.forEach((c) => accessibleCourseIds.add(c.id)); // eski umumiy obuna
          }
        }
      }

      // Har bir kurs uchun testlarni manbasi bilan yig'ish
      const built: CourseGroup[] = [];

      for (const course of visible) {
        const [tests, folders, topics] = await Promise.all([
          cachedFetch(`tests-${course.id}`, () => getTestsByCourse(course.id)),
          cachedFetch(`folders-${course.id}`, () => getFoldersByCourse(course.id)),
          cachedFetch(`topics-${course.id}`, () => getTopicsByCourse(course.id)),
        ]);

        const published = tests.filter((t) => t.status === "published");
        if (published.length === 0) continue;

        const hasAccess = !course.isPremium || accessibleCourseIds.has(course.id);
        const completed = completedTopicsByCourse[course.id] || [];

        // Testlarni tartiblash (afterTopicOrder bo'yicha)
        const ordered = [...published].sort(
          (a, b) => (a.afterTopicOrder ?? 99999) - (b.afterTopicOrder ?? 99999)
        );

        const nodes: TestNode[] = [];
        let prevDone = true; // birinchi test uchun ketma-ketlik ochiq

        for (const t of ordered) {
          const topic = topics.find((tp) => tp.order === t.afterTopicOrder);
          const folder = folders.find(
            (f) => f.id === (t.folderId || topic?.folderId)
          );
          const topicUnlocked = topic ? completed.includes(topic.id) : true;
          const result = userResults.find((r) => r.testId === t.id) || null;

          let lockReason: TestNode["lockReason"] = null;
          if (!hasAccess) lockReason = "course";
          else if (!topicUnlocked) lockReason = "topic";
          else if (!prevDone) lockReason = "sequence";

          nodes.push({
            test: t,
            courseId: course.id,
            courseName: course.title,
            courseCategory: course.category,
            folderName: folder?.title || "",
            topicName: topic ? cleanTopicTitle(topic.title) : "Kurs yakuniy testi",
            courseUnlocked: hasAccess,
            topicUnlocked,
            prevDone,
            locked: lockReason !== null,
            lockReason,
            result,
          });

          // Keyingi test uchun: bu test ishlangan bo'lishi kerak
          prevDone = !!result;
        }

        built.push({
          courseId: course.id,
          courseName: course.title,
          courseCategory: course.category,
          hasAccess,
          nodes,
        });
      }

      setGroups(built);
      // Birinchi kursni ochiq holatda ko'rsatish
      if (built.length > 0) setExpanded({ [built[0].courseId]: true });

      // Motivatsion fraza
      try {
        const [phrases, settings] = await Promise.all([
          cachedFetch("motivation-course", () => getMotivationPhrases("course")),
          cachedFetch("motivation-settings-course", () => getMotivationSettings("course")),
        ]);
        const active = phrases.filter((p) => p.isActive);
        if (active.length > 0) {
          const hours = settings?.rotateHours || 2;
          const idx =
            settings?.displayOrder === "random"
              ? Math.floor(Math.random() * active.length)
              : Math.floor(Date.now() / (1000 * 60 * 60) / hours) % active.length;
          setMotivationPhrase(active[idx].text);
        }
      } catch {}

      // Leaderboard
      try {
        const allResults = await cachedFetch("all-test-results", getAllTestResults, 120_000);
        const scores: Record<string, { total: number; count: number }> = {};
        for (const r of allResults) {
          if (!scores[r.userId]) scores[r.userId] = { total: 0, count: 0 };
          scores[r.userId].total += r.score;
          scores[r.userId].count += 1;
        }
        const entries: LeaderboardEntry[] = [];
        for (const [uid, d] of Object.entries(scores)) {
          const u = await cachedFetch(`user-${uid}`, () => getUserById(uid), 300_000);
          entries.push({
            userId: uid,
            userName: u?.name || "Foydalanuvchi",
            avatar: u?.avatar,
            avgScore: Math.round(d.total / d.count),
            totalTests: d.count,
          });
        }
        entries.sort((a, b) => b.avgScore - a.avgScore);
        setLeaderboard(entries);
        if (user) {
          const i = entries.findIndex((e) => e.userId === user.uid);
          setMyRank(i >= 0 ? i + 1 : null);
        }
      } catch {}
    } catch (err) {
      console.error("Testlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  function handleLockedClick(node: TestNode) {
    if (node.lockReason === "course") {
      navigate(`/premium-gate?course=${node.courseId}`);
      return;
    }
    const msg =
      node.lockReason === "topic"
        ? `Avval "${node.topicName}" mavzusini o'qing`
        : "Avvalgi testni yakunlang";
    setLockToast(msg);
    setTimeout(() => setLockToast(null), 2500);
  }

  // Statistika
  const allNodes = groups.flatMap((g) => g.nodes);
  const totalTests = allNodes.length;
  const doneTests = allNodes.filter((n) => n.result).length;
  const avgScore =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length)
      : 0;

  // Kategoriyalar
  const categories = ["Barchasi", ...Array.from(new Set(groups.map((g) => g.courseCategory)))];

  // Filtrlangan guruhlar
  const filteredGroups = groups
    .filter((g) => activeCategory === "Barchasi" || g.courseCategory === activeCategory)
    .map((g) => ({
      ...g,
      nodes: searchQuery.trim()
        ? g.nodes.filter(
            (n) =>
              n.test.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              n.topicName.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : g.nodes,
    }))
    .filter((g) => g.nodes.length > 0);

  if (loading) return <TestsLoader />;

  return (
    <div className="page-content pb-24">
      {/* ===== Hero ===== */}
      <div className="bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] px-5 pt-5 pb-8 rounded-b-[2rem]">
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-2xl font-bold text-white">Testlar</h1>
          <div className="w-9 h-9 bg-white/15 rounded-full flex items-center justify-center">
            <Trophy size={18} className="text-yellow-300" />
          </div>
        </div>

        <div className="flex items-center gap-5">
          {/* Dumaloq progress */}
          <div className="relative w-20 h-20 shrink-0">
            <svg className="w-20 h-20 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="27" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="5" />
              <circle
                cx="32" cy="32" r="27" fill="none" stroke="#a5b4fc" strokeWidth="5"
                strokeDasharray={2 * Math.PI * 27}
                strokeDashoffset={2 * Math.PI * 27 * (1 - avgScore / 100)}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white text-lg font-bold">
              {avgScore}%
            </span>
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white/60 text-[10px] font-semibold uppercase tracking-wide">O'rtacha natija</p>
            <p className="text-white text-2xl font-bold leading-tight">
              {doneTests}<span className="text-white/50 text-lg font-normal"> / {totalTests} test</span>
            </p>
            <div className="flex gap-1 mt-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 flex-1 rounded-full ${
                    totalTests > 0 && i < Math.round((doneTests / totalTests) * 10)
                      ? "bg-indigo-300"
                      : "bg-white/15"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== Qidiruv ===== */}
      <div className="mx-4 -mt-5 relative z-10 bg-white rounded-2xl shadow-lg p-1.5">
        <div className="flex items-center gap-2 px-3 py-2">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            placeholder="Test yoki mavzu nomi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="text-gray-400">
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ===== Kategoriyalar ===== */}
      {categories.length > 1 && (
        <div className="flex gap-2 px-4 mt-4 overflow-x-auto pb-1 scrollbar-hide">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                activeCategory === c
                  ? "bg-indigo-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {/* ===== Kurslar bo'yicha testlar ===== */}
      <div className="px-4 mt-5 space-y-3">
        {filteredGroups.length === 0 && (
          <div className="bg-white border border-gray-100 rounded-2xl p-8 text-center">
            <p className="text-3xl mb-2">📝</p>
            <p className="text-sm text-gray-500">Test topilmadi</p>
          </div>
        )}

        {filteredGroups.map((group) => {
          const isOpen = expanded[group.courseId] ?? false;
          const groupDone = group.nodes.filter((n) => n.result).length;
          return (
            <div key={group.courseId} className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
              {/* Kurs sarlavhasi */}
              <button
                onClick={() => setExpanded((p) => ({ ...p, [group.courseId]: !isOpen }))}
                className="w-full flex items-center gap-3 p-4 text-left active:bg-gray-50"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${group.hasAccess ? "bg-indigo-50" : "bg-yellow-50"}`}>
                  {group.hasAccess ? (
                    <span className="text-lg">📚</span>
                  ) : (
                    <Lock size={18} className="text-yellow-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-sm leading-snug">{group.courseName}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {groupDone} / {group.nodes.length} test yakunlangan
                    {!group.hasAccess && <span className="text-yellow-600 font-medium"> · Premium</span>}
                  </p>
                </div>
                {isOpen ? (
                  <ChevronUp size={18} className="text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown size={18} className="text-gray-400 shrink-0" />
                )}
              </button>

              {/* Testlar ro'yxati */}
              {isOpen && (
                <div className="border-t border-gray-50 divide-y divide-gray-50">
                  {group.nodes.map((node) => (
                    <TestRow key={node.test.id} node={node} onLockedClick={handleLockedClick} navigate={navigate} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ===== Motivatsion fraza ===== */}
      <div className="mx-4 mt-5 bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <span className="text-lg shrink-0">💡</span>
        <p className="text-sm text-amber-800 leading-relaxed italic">"{motivationPhrase}"</p>
      </div>

      {/* ===== So'nggi natijalar ===== */}
      {results.length > 0 && (
        <section className="px-4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-500" />
              <h3 className="font-bold text-gray-900 text-base">So'nggi natijalar</h3>
            </div>
            {results.length > 3 && (
              <button
                onClick={() => setShowAllResults(!showAllResults)}
                className="text-xs text-indigo-500 font-semibold"
              >
                {showAllResults ? "Kamroq" : "Barchasi"}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {results.slice(0, showAllResults ? 20 : 3).map((r) => {
              const node = allNodes.find((n) => n.test.id === r.testId);
              const diff = Math.floor((Date.now() - r.completedAt) / 86400000);
              const label = diff === 0 ? "Bugun" : diff === 1 ? "Kecha" : `${diff} kun oldin`;
              return (
                <div key={r.id} className="bg-white border border-gray-100 rounded-xl p-3.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{node?.test.title || "Test"}</p>
                      {node && <p className="text-[10px] text-indigo-500 font-medium truncate">{node.courseName}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {label} · {r.correctCount}/{r.totalQuestions} to'g'ri
                      </p>
                    </div>
                    <div
                      className={`shrink-0 px-2.5 py-1 rounded-lg text-sm font-bold ${
                        r.score >= 80 ? "bg-green-50 text-green-600" : r.score >= 60 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500"
                      }`}
                    >
                      {r.score}%
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() =>
                        navigate(`/test-result?score=${r.score}&correct=${r.correctCount}&total=${r.totalQuestions}&time=${r.timeTaken}&resultId=${r.id}`)
                      }
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 rounded-lg text-[11px] text-gray-600 font-medium"
                    >
                      <Eye size={12} /> Natija
                    </button>
                    <button
                      onClick={() => navigate(`/test/${r.testId}`)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-50 rounded-lg text-[11px] text-gray-600 font-medium"
                    >
                      <RotateCcw size={12} /> Qayta ishlash
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ===== Leaderboard ===== */}
      {/* ===== Eng yaxshi natijalar — Leaderboard ===== */}
      {leaderboard.length > 0 && (
        <section className="px-4 mt-6">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Trophy size={16} className="text-yellow-500" />
              <h3 className="font-bold text-gray-900 text-base">Eng yaxshi natijalar</h3>
            </div>
            {leaderboard.length > 3 && (
              <button
                onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
                className="text-xs text-indigo-500 font-semibold"
              >
                {showAllLeaderboard ? "Kamroq" : "Barchasi"}
              </button>
            )}
          </div>
          <div className="bg-white border border-gray-100 rounded-2xl divide-y divide-gray-50 overflow-hidden">
            {leaderboard.slice(0, showAllLeaderboard ? 10 : 3).map((e, i) => {
              const isMe = user && e.userId === user.uid;
              const medals = ["🥇", "🥈", "🥉"];
              return (
                <div key={e.userId} className={`flex items-center gap-3 p-3.5 ${isMe ? "bg-indigo-50" : ""}`}>
                  <span className="w-7 text-center shrink-0">
                    {i < 3 ? <span className="text-base">{medals[i]}</span> : <span className="text-xs font-bold text-gray-400">{i + 1}</span>}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-200 to-purple-300 overflow-hidden shrink-0">
                    {e.avatar ? (
                      <img src={e.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                        {e.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isMe ? "text-indigo-700" : "text-gray-900"}`}>
                      {e.userName} {isMe && <span className="text-[10px] font-normal">(Siz)</span>}
                    </p>
                    <p className="text-[10px] text-gray-400">{e.totalTests} test</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-500 shrink-0">{e.avgScore}%</span>
                </div>
              );
            })}

            {/* Joriy talabaning o'rni — agar top ko'rsatilgan ro'yxatda yo'q bo'lsa */}
            {myRank && user && (() => {
              const shownCount = showAllLeaderboard ? 10 : 3;
              const inList = leaderboard.slice(0, shownCount).some((e) => e.userId === user.uid);
              if (inList) return null;
              const myEntry = leaderboard.find((e) => e.userId === user.uid);
              if (!myEntry) return null;
              return (
                <>
                  <div className="py-1.5 text-center text-xs text-gray-300">• • •</div>
                  <div className="flex items-center gap-3 p-3.5 bg-indigo-50">
                    <span className="w-7 text-center text-xs font-bold text-indigo-500 shrink-0">{myRank}</span>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-300 to-purple-400 overflow-hidden shrink-0">
                      {myEntry.avatar ? (
                        <img src={myEntry.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                          {myEntry.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-indigo-700 truncate">
                        {myEntry.userName} <span className="text-[10px] font-normal">(Siz)</span>
                      </p>
                      <p className="text-[10px] text-indigo-400">{myEntry.totalTests} test · {myRank}-o'rin</p>
                    </div>
                    <span className="text-sm font-bold text-indigo-500 shrink-0">{myEntry.avgScore}%</span>
                  </div>
                </>
              );
            })()}
          </div>
        </section>
      )}

      {/* ===== Qulf toast ===== */}
      {lockToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 max-w-[90%]">
          <Lock size={13} className="shrink-0" />
          <span>{lockToast}</span>
        </div>
      )}
    </div>
  );
}

// ===== Bitta test qatori =====
function TestRow({
  node,
  onLockedClick,
  navigate,
}: {
  node: TestNode;
  onLockedClick: (n: TestNode) => void;
  navigate: (path: string) => void;
}) {
  const { test, result, locked, lockReason } = node;
  const done = !!result;

  return (
    <button
      onClick={() => (locked ? onLockedClick(node) : navigate(`/test/${test.id}`))}
      className={`w-full flex items-center gap-3 p-3.5 text-left transition-colors ${
        locked ? "opacity-60 active:bg-gray-50" : "active:bg-indigo-50/40"
      }`}
    >
      {/* Ikonka */}
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          locked ? "bg-gray-100" : done ? "bg-green-50" : "bg-indigo-50"
        }`}
      >
        {locked ? (
          <Lock size={17} className="text-gray-400" />
        ) : done ? (
          <CheckCircle2 size={19} className="text-green-500" />
        ) : (
          <Play size={17} className="text-indigo-500 fill-current" />
        )}
      </div>

      {/* Ma'lumot */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-semibold text-gray-900 truncate">{test.title}</p>
          {test.isPremium && <span className="text-yellow-500 text-[10px] shrink-0">👑</span>}
        </div>
        <p className="text-[10px] text-indigo-500 font-medium mt-0.5 leading-snug">
          {node.folderName ? `${node.folderName} · ` : ""}
          {node.topicName}
        </p>
        <div className="flex items-center gap-2.5 mt-1">
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <Clock size={9} /> {test.totalTime} daq
          </span>
          <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
            <HelpCircle size={9} /> {test.questions?.length || 0} savol
          </span>
          {locked && (
            <span className="text-[10px] text-gray-400">
              {lockReason === "course" ? "· Kursni sotib oling" : lockReason === "topic" ? "· Mavzuni o'qing" : "· Avvalgi testni yakunlang"}
            </span>
          )}
        </div>
      </div>

      {/* Natija / holat */}
      <div className="shrink-0 text-right">
        {done ? (
          <span
            className={`text-sm font-bold ${
              result!.score >= 80 ? "text-green-600" : result!.score >= 60 ? "text-amber-600" : "text-red-500"
            }`}
          >
            {result!.score}%
          </span>
        ) : locked ? (
          <Lock size={14} className="text-gray-300 ml-auto" />
        ) : (
          <span className="text-[11px] font-semibold text-white bg-indigo-500 px-3 py-1.5 rounded-lg">
            Boshlash
          </span>
        )}
      </div>
    </button>
  );
}
