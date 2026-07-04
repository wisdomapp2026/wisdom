import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getAllCourses, getTestsByCourse, getTestResultsByUser, getAllProgressByUser, getMotivationPhrases, getMotivationSettings, getAllTestResults, getUserById } from "@shared/repositories";
import type { Test, TestResult, Course, User } from "@shared/types";
import { Eye, RotateCcw, Trophy } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { TestsLoader } from "../components/PageLoader";
import { cachedFetch } from "../hooks/useCache";

interface TestWithCourse extends Test {
  courseName: string;
  courseCategory: string;
}

interface ResultWithTest {
  result: TestResult;
  test: TestWithCourse | null;
}

interface LeaderboardEntry {
  userId: string;
  userName: string;
  avatar?: string;
  avgScore: number;
  totalTests: number;
}

export default function Tests() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courseTests, setCourseTests] = useState<TestWithCourse[]>([]);
  const [results, setResults] = useState<ResultWithTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [motivationPhrase, setMotivationPhrase] = useState("Har bir test sizni maqsadingizga yaqinlashtiradi. To'xtamang!");
  const [showAllResults, setShowAllResults] = useState(false);
  const [showAllLeaderboard, setShowAllLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    loadData();
  }, [user, authLoading]);

  async function loadData() {
    try {
      const courses = await cachedFetch("all-courses", getAllCourses);

      // Barcha published testlarni yuklash
      const allTests: TestWithCourse[] = [];
      for (const course of courses) {
        const tests = await cachedFetch(`tests-${course.id}`, () => getTestsByCourse(course.id));
        for (const t of tests) {
          if (t.status === "published") {
            allTests.push({ ...t, courseName: course.title, courseCategory: course.category });
          }
        }
      }
      setCourseTests(allTests);

      // Foydalanuvchi natijalari
      if (user) {
        const userResults = await cachedFetch(`results-${user.uid}`, () => getTestResultsByUser(user.uid));
        const withTests: ResultWithTest[] = userResults.map((r) => ({
          result: r,
          test: allTests.find((t) => t.id === r.testId) || null,
        }));
        setResults(withTests);
      }

      // Motivatsion fraza
      try {
        const [phrases, settings] = await Promise.all([
          cachedFetch("motivation-course", () => getMotivationPhrases("course")),
          cachedFetch("motivation-settings-course", () => getMotivationSettings("course")),
        ]);
        const active = phrases.filter((p) => p.isActive);
        if (active.length > 0) {
          const hours = settings?.rotateHours || 2;
          const isRandom = settings?.displayOrder === "random";
          const idx = isRandom
            ? Math.floor(Math.random() * active.length)
            : Math.floor(Date.now() / (1000 * 60 * 60) / hours) % active.length;
          setMotivationPhrase(active[idx].text);
        }
      } catch {}

      // Leaderboard — barcha foydalanuvchilarning o'rtacha bali
      try {
        const allResults = await cachedFetch("all-test-results", getAllTestResults, 120_000);
        // userId bo'yicha guruhlash
        const userScores: Record<string, { total: number; count: number }> = {};
        for (const r of allResults) {
          if (!userScores[r.userId]) userScores[r.userId] = { total: 0, count: 0 };
          userScores[r.userId].total += r.score;
          userScores[r.userId].count += 1;
        }

        // Foydalanuvchi ma'lumotlarini olish va tartiblash
        const entries: LeaderboardEntry[] = [];
        for (const [userId, data] of Object.entries(userScores)) {
          const userData = await cachedFetch(`user-${userId}`, () => getUserById(userId), 300_000);
          entries.push({
            userId,
            userName: userData?.name || "Foydalanuvchi",
            avatar: userData?.avatar,
            avgScore: Math.round(data.total / data.count),
            totalTests: data.count,
          });
        }
        entries.sort((a, b) => b.avgScore - a.avgScore);
        setLeaderboard(entries);

        // Mening o'rnim
        if (user) {
          const myIdx = entries.findIndex((e) => e.userId === user.uid);
          setMyRank(myIdx >= 0 ? myIdx + 1 : null);
        }
      } catch {}
    } catch (err) {
      console.error("Testlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  // Statistikalar
  const totalTests = courseTests.length;
  const completedTests = results.length;
  const lastResult = results[0];
  const avgScore = results.length > 0
    ? Math.round(results.reduce((sum, r) => sum + r.result.score, 0) / results.length)
    : 0;

  // Kategoriyalar
  const categories = ["Barchasi", ...Array.from(new Set(courseTests.map((t) => t.courseCategory)))];

  // Filterlash
  const filteredTests = courseTests.filter((t) => {
    if (searchQuery && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (activeCategory === "Barchasi") return true;
    return t.courseCategory === activeCategory;
  });

  // Eng qiyin testlar (eng past natijalar)
  const hardestResults = [...results]
    .filter((r) => r.result.score < 60)
    .sort((a, b) => a.result.score - b.result.score)
    .slice(0, 3);

  if (loading) {
    return <TestsLoader />;
  }

  return (
    <div className="page-content pb-24">
      {/* Header */}
      <header className="px-5 pt-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Testlar</h1>
        <button className="w-9 h-9 bg-primary-50 rounded-full flex items-center justify-center">
          <Trophy size={18} className="text-primary-500" />
        </button>
      </header>

      {/* Statistika kartasi */}
      <div className="mx-5 mt-4 bg-primary-500 rounded-2xl p-5 flex items-center gap-4">
        {/* Doiraviy progress */}
        <div className="relative w-16 h-16 shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="5" />
            <circle
              cx="32" cy="32" r="26" fill="none" stroke="white" strokeWidth="5"
              strokeDasharray={`${2 * Math.PI * 26}`}
              strokeDashoffset={`${2 * Math.PI * 26 * (1 - avgScore / 100)}`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold">
            {avgScore}%
          </span>
        </div>
        <div>
          <p className="text-white/70 text-[10px] font-semibold uppercase">Ishlangan testlar</p>
          <p className="text-white text-2xl font-bold">{completedTests} ta</p>
          <p className="text-white/60 text-xs mt-0.5">
            Oxirgi natija: {lastResult ? `${lastResult.result.score}/${lastResult.result.totalQuestions > 0 ? lastResult.result.totalQuestions : 20}` : "—"}
          </p>
        </div>
      </div>

      {/* Qidiruv */}
      <div className="mx-5 mt-4 flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <span className="text-gray-400 mr-2">🔍</span>
        <input
          placeholder="Testlarni qidirish"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {/* Kategoriyalar */}
      <div className="flex gap-2 px-5 mt-3 overflow-x-auto pb-1 scrollbar-hide">
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${
              activeCategory === c ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Modul testlari — gorizontal scroll */}
      <section className="mt-6">
        <div className="flex justify-between items-center px-5 mb-3">
          <h3 className="font-bold text-gray-900">Modul testlari</h3>
          <span className="text-sm text-primary-500 font-medium">Barchasi</span>
        </div>
        <div className="flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-hide">
          {filteredTests.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">Hozircha test mavjud emas</p>
          ) : (
            filteredTests.map((test) => {
              const hasResult = results.some((r) => r.result.testId === test.id);
              return (
                <div key={test.id} className="shrink-0 w-44 border border-gray-100 rounded-2xl p-4 bg-white">
                  <div className="flex items-center gap-1.5 mb-2">
                    <div className="w-7 h-7 bg-primary-50 rounded-lg flex items-center justify-center">
                      <span className="text-primary-500 text-xs">📝</span>
                    </div>
                    {!hasResult && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-100 text-red-600">Yangi</span>
                    )}
                  </div>
                  <p className="font-semibold text-sm text-gray-900 line-clamp-2 mb-1.5">{test.title}</p>
                  <div className="flex items-center gap-2 text-[10px] text-gray-500 mb-3">
                    <span>⏱ {test.totalTime} daqiqa</span>
                    <span>❓ {test.questions?.length || 0} savol</span>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => navigate(`/test/${test.id}`)}
                      className="flex-1 bg-primary-500 text-white text-[11px] font-semibold py-2 rounded-lg active:bg-primary-600"
                    >
                      {hasResult ? "Qayta" : "Boshlash"}
                    </button>
                    {hasResult && (
                      <button
                        onClick={() => navigate(`/test/${test.id}`)}
                        className="flex-1 border border-gray-200 text-gray-700 text-[11px] font-medium py-2 rounded-lg active:bg-gray-50"
                      >
                        Davom ettirish
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* So'nggi natijalar */}
      {results.length > 0 && (
        <section className="px-5 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900">So'nggi natijalar</h3>
            <button
              onClick={() => setShowAllResults(!showAllResults)}
              className="text-sm text-primary-500 font-medium"
            >
              {showAllResults ? "Kamroq" : "Barchasi"}
            </button>
          </div>
          <div className="space-y-3">
            {results.slice(0, showAllResults ? 10 : 3).map((item) => {
              const timeTaken = item.result.timeTaken
                ? `${Math.floor(item.result.timeTaken / 60)}:${String(item.result.timeTaken % 60).padStart(2, "0")}`
                : "—";
              // Vaqt hisoblash — sana bo'yicha
              const completedAt = item.result.completedAt;
              const completedDate = new Date(completedAt);
              const today = new Date();
              const yesterday = new Date();
              yesterday.setDate(yesterday.getDate() - 1);

              let timeLabel = "";
              if (
                completedDate.getDate() === today.getDate() &&
                completedDate.getMonth() === today.getMonth() &&
                completedDate.getFullYear() === today.getFullYear()
              ) {
                timeLabel = "Bugun";
              } else if (
                completedDate.getDate() === yesterday.getDate() &&
                completedDate.getMonth() === yesterday.getMonth() &&
                completedDate.getFullYear() === yesterday.getFullYear()
              ) {
                timeLabel = "Kecha";
              } else {
                const diffDays = Math.floor((today.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
                timeLabel = `${diffDays} kun oldin`;
              }

              return (
                <div key={item.result.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900 text-sm truncate flex-1">
                      {item.test?.title || "Test"}
                    </p>
                    <span className="text-primary-500 font-bold text-sm ml-2">{item.result.score}%</span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    {timeLabel}, {timeTaken} · {item.result.correctCount}/{item.result.totalQuestions} to'g'ri
                  </p>
                  <div className="flex gap-2 mt-2.5">
                    <button
                      onClick={() => navigate(`/test-result?score=${item.result.score}&correct=${item.result.correctCount}&total=${item.result.totalQuestions}&time=${item.result.timeTaken}&resultId=${item.result.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 font-medium"
                    >
                      <Eye size={12} /> Natijani ko'rish
                    </button>
                    <button
                      onClick={() => item.test && navigate(`/test/${item.test.id}`)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-700 font-medium"
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

      {/* Motivatsion fraza */}
      <div className="mx-5 mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
        <span className="text-lg">💡</span>
        <p className="text-sm text-yellow-800">"{motivationPhrase}"</p>
      </div>

      {/* Eng yaxshi natijalar — Leaderboard */}
      {leaderboard.length > 0 && (
        <section className="px-5 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900">Eng yaxshi natijalar</h3>
            <button
              onClick={() => setShowAllLeaderboard(!showAllLeaderboard)}
              className="text-sm text-primary-500 font-medium"
            >
              {showAllLeaderboard ? "Kamroq" : "Barchasi"}
            </button>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl divide-y divide-gray-100">
            {leaderboard.slice(0, showAllLeaderboard ? 10 : 3).map((entry, idx) => {
              const isMe = user && entry.userId === user.uid;
              const rankColors = ["bg-yellow-400", "bg-gray-300", "bg-orange-300"];
              return (
                <div key={entry.userId} className={`flex items-center gap-3 p-4 ${isMe ? "bg-primary-50" : ""}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    idx < 3 ? `${rankColors[idx]} text-white` : "bg-gray-100 text-gray-600"
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                    {entry.avatar ? (
                      <img src={entry.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-bold">
                        {entry.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <p className={`flex-1 text-sm font-medium truncate ${isMe ? "text-primary-700" : "text-gray-900"}`}>
                    {entry.userName} {isMe && <span className="text-[10px] text-primary-500">(Siz)</span>}
                  </p>
                  <span className="text-sm font-bold text-primary-500">{entry.avgScore}%</span>
                </div>
              );
            })}

            {/* Agar student top 10 da bo'lmasa — uning o'rnini ko'rsatish */}
            {showAllLeaderboard && myRank && myRank > 10 && user && (
              <>
                <div className="px-4 py-2 text-center text-xs text-gray-400">• • •</div>
                <div className="flex items-center gap-3 p-4 bg-primary-50">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold bg-gray-100 text-gray-600">
                    {myRank}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                    <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm font-bold">
                      {leaderboard.find((e) => e.userId === user.uid)?.userName.charAt(0).toUpperCase() || "?"}
                    </div>
                  </div>
                  <p className="flex-1 text-sm font-medium text-primary-700 truncate">
                    {leaderboard.find((e) => e.userId === user.uid)?.userName || "Siz"} <span className="text-[10px] text-primary-500">(Siz)</span>
                  </p>
                  <span className="text-sm font-bold text-primary-500">
                    {leaderboard.find((e) => e.userId === user.uid)?.avgScore || 0}%
                  </span>
                </div>
              </>
            )}
          </div>
        </section>
      )}

      {/* Eng qiyin testlar */}
      {hardestResults.length > 0 && (
        <section className="px-5 mt-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-gray-900">Eng qiyin testlar</h3>
            <span className="text-sm text-primary-500 font-medium">Barchasi</span>
          </div>
          <div className="space-y-2.5">
            {hardestResults.map((item) => (
              <div key={item.result.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.test?.title || "Test"}</p>
                  <p className="text-[10px] text-gray-500">{item.result.totalQuestions} marta urinilgan</p>
                </div>
                <span className="text-sm font-semibold text-red-500 flex items-center gap-1">
                  ⚠️ {100 - item.result.score}% xato
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
