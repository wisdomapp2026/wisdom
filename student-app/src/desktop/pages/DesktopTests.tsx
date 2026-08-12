import { useEffect, useMemo, useState } from "react";
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
import {
  Lock,
  Play,
  RotateCcw,
  Eye,
  Trophy,
  Search,
  ChevronDown,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
  X,
  ClipboardList,
  Target,
  Lightbulb,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { cachedFetch } from "../../hooks/useCache";
import { RingProgress, SectionHeading, StatCard, EmptyState, Reveal, Chip, Skeleton } from "../components/ui";

interface TestNode {
  test: Test;
  courseId: string;
  courseName: string;
  courseCategory: string;
  folderName: string;
  topicName: string;
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

/**
 * Desktop testlar sahifasi.
 *
 * Qulf mantiqi mobil `Tests.tsx` bilan bir xil — faqat 2 ustunli layout,
 * kengroq statistika paneli va yon ustundagi leaderboard qo'shilgan.
 */
export default function DesktopTests() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<CourseGroup[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [motivation, setMotivation] = useState("Har bir test sizni maqsadingizga yaqinlashtiradi.");
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [lockToast, setLockToast] = useState<string | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [showAllBoard, setShowAllBoard] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function loadData() {
    try {
      const courses = await cachedFetch("all-courses", getAllCourses);
      const visible = courses.filter((c) => !c.isHidden);

      let userResults: TestResult[] = [];
      const completedByCourse: Record<string, string[]> = {};
      const accessible = new Set<string>();

      if (user) {
        const [res, progressList, subs] = await Promise.all([
          getTestResultsByUser(user.uid),
          getAllProgressByUser(user.uid),
          getAllUserSubscriptions(user.uid),
        ]);
        userResults = res.sort((a, b) => b.completedAt - a.completedAt);
        setResults(userResults);
        for (const p of progressList) completedByCourse[p.courseId] = p.completedTopics || [];
        const now = Date.now();
        for (const s of subs) {
          if (s.status === "active" && s.endDate > now) {
            if (s.courseId) accessible.add(s.courseId);
            else visible.forEach((c) => accessible.add(c.id));
          }
        }
      }

      const built: CourseGroup[] = [];
      for (const course of visible) {
        const [tests, folders, topics] = await Promise.all([
          cachedFetch(`tests-${course.id}`, () => getTestsByCourse(course.id)),
          cachedFetch(`folders-${course.id}`, () => getFoldersByCourse(course.id)),
          cachedFetch(`topics-${course.id}`, () => getTopicsByCourse(course.id)),
        ]);
        const published = tests.filter((t) => t.status === "published");
        if (published.length === 0) continue;

        const hasAccess = !course.isPremium || accessible.has(course.id);
        const completed = completedByCourse[course.id] || [];
        const ordered = [...published].sort(
          (a, b) => (a.afterTopicOrder ?? 99999) - (b.afterTopicOrder ?? 99999)
        );
        const hasFreeTests = published.some((t) => t.isPremium === false);

        const nodes: TestNode[] = [];
        let prevDone = true;
        for (const t of ordered) {
          const topic = topics.find((tp) => tp.order === t.afterTopicOrder);
          const folder = folders.find((f) => f.id === (t.folderId || topic?.folderId));
          const topicUnlocked = topic ? completed.includes(topic.id) : true;
          const result = userResults.find((r) => r.testId === t.id) || null;

          let lockReason: TestNode["lockReason"] = null;
          if (t.isPremium !== false && !hasAccess) lockReason = "course";
          else if (!topicUnlocked) lockReason = "topic";
          else if (!prevDone) lockReason = "sequence";

          nodes.push({
            test: t,
            courseId: course.id,
            courseName: course.title,
            courseCategory: course.category,
            folderName: folder?.title || "",
            topicName: topic ? cleanTopicTitle(topic.title) : "Kurs yakuniy testi",
            locked: lockReason !== null,
            lockReason,
            result,
          });
          prevDone = !!result;
        }

        built.push({
          courseId: course.id,
          courseName: course.title,
          courseCategory: course.category,
          hasAccess: hasAccess || hasFreeTests,
          nodes,
        });
      }

      setGroups(built);
      // Desktopda ekran keng — birinchi uch kursni ochiq ko'rsatamiz
      const init: Record<string, boolean> = {};
      built.slice(0, 3).forEach((g) => (init[g.courseId] = true));
      setExpanded(init);

      // Motivatsiya
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
              : Math.floor(Math.floor(Date.now() / 3_600_000) / hours) % active.length;
          setMotivation(active[idx].text);
        }
      } catch {}

      // Leaderboard
      try {
        const all = await cachedFetch("all-test-results", getAllTestResults, 120_000);
        const scores: Record<string, { total: number; count: number }> = {};
        for (const r of all) {
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

  function handleLocked(node: TestNode) {
    if (node.lockReason === "course") {
      navigate(`/premium-gate?course=${node.courseId}`);
      return;
    }
    setLockToast(
      node.lockReason === "topic"
        ? `Avval "${node.topicName}" mavzusini o'qing`
        : "Avvalgi testni yakunlang"
    );
    setTimeout(() => setLockToast(null), 2600);
  }

  const allNodes = useMemo(() => groups.flatMap((g) => g.nodes), [groups]);
  const totalTests = allNodes.length;
  const doneTests = allNodes.filter((n) => n.result).length;
  const avgScore =
    results.length > 0 ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const bestScore = results.length > 0 ? Math.max(...results.map((r) => r.score)) : 0;

  const categories = useMemo(
    () => ["Barchasi", ...new Set(groups.map((g) => g.courseCategory))],
    [groups]
  );

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => activeCategory === "Barchasi" || g.courseCategory === activeCategory)
      .map((g) => ({
        ...g,
        nodes: q
          ? g.nodes.filter(
              (n) => n.test.title.toLowerCase().includes(q) || n.topicName.toLowerCase().includes(q)
            )
          : g.nodes,
      }))
      .filter((g) => g.nodes.length > 0);
  }, [groups, activeCategory, query]);

  if (loading) return <TestsSkeleton />;

  return (
    <div className="space-y-8">
      {/* ===== Hero ===== */}
      <section
        className="relative overflow-hidden rounded-[28px] px-10 py-9"
        style={{
          background: "linear-gradient(120deg, #1e1b4b 0%, #312e81 48%, #4338ca 100%)",
        }}
      >
        <span className="absolute -top-20 -right-14 w-72 h-72 rounded-full bg-white/8 dk-anim-float" />
        <span
          className="absolute -bottom-24 left-1/3 w-64 h-64 rounded-full bg-white/5 dk-anim-float"
          style={{ animationDelay: "1.4s" }}
        />
        <div className="relative z-10 flex items-center gap-10 flex-wrap">
          <RingProgress
            value={avgScore}
            size={128}
            stroke={11}
            color="#a5b4fc"
            track="rgba(255,255,255,0.16)"
          />
          <div className="flex-1 min-w-[260px]">
            <p className="text-white/60 text-[11px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Trophy size={13} className="text-yellow-300" /> Testlar bo'limi
            </p>
            <h1 className="text-white text-[34px] font-extrabold leading-tight mt-1.5">
              {doneTests}
              <span className="text-white/50 text-[22px] font-normal"> / {totalTests} test yakunlangan</span>
            </h1>
            <p className="text-white/70 text-[14px] mt-2 max-w-2xl">
              O'rtacha natijangiz {avgScore}%. Har bir yakunlangan test yangi mavzular va sertifikatlarni ochadi.
            </p>
            <div className="flex gap-1.5 mt-5 max-w-lg">
              {Array.from({ length: 20 }).map((_, i) => (
                <span
                  key={i}
                  className="h-2 flex-1 rounded-full transition-colors duration-500"
                  style={{
                    backgroundColor:
                      totalTests > 0 && i < Math.round((doneTests / totalTests) * 20)
                        ? "#a5b4fc"
                        : "rgba(255,255,255,0.16)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Statistika ===== */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 dk-stagger">
        <StatCard icon={<ClipboardList size={20} />} label="Jami testlar" value={String(totalTests)} tone="primary" />
        <StatCard icon={<CheckCircle2 size={20} />} label="Yakunlangan" value={String(doneTests)} tone="green" />
        <StatCard icon={<Target size={20} />} label="O'rtacha natija" value={avgScore > 0 ? `${avgScore}%` : "—"} tone="purple" />
        <StatCard
          icon={<Trophy size={20} />}
          label={myRank ? `Reytingda ${myRank}-o'rin` : "Eng yaxshi natija"}
          value={bestScore > 0 ? `${bestScore}%` : "—"}
          tone="amber"
        />
      </div>

      {/* ===== Asosiy ustunlar ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8 items-start">
        {/* Chap ustun — testlar */}
        <div className="space-y-5 min-w-0">
          {/* Filtrlar */}
          <div
            className="sticky z-20 rounded-3xl px-5 py-4 dk-glass"
            style={{ top: "calc(var(--dk-topbar-h) + 12px)", border: "1px solid var(--dk-border)" }}
          >
            <div
              className="flex items-center gap-2.5 h-11 px-4 rounded-2xl"
              style={{ backgroundColor: "var(--theme-card-bg)", border: "1px solid var(--dk-border)" }}
            >
              <Search size={17} className="text-gray-400 shrink-0" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Test yoki mavzu nomi..."
                className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-gray-400 text-gray-900"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="w-6 h-6 rounded-lg grid place-items-center bg-gray-100 text-gray-400 hover:text-gray-700 shrink-0"
                  aria-label="Tozalash"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            {categories.length > 1 && (
              <div className="flex gap-2 mt-3.5 overflow-x-auto scrollbar-hide pb-0.5">
                {categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setActiveCategory(c)}
                    className={`shrink-0 px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all duration-300 ${
                      activeCategory === c
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                    style={
                      activeCategory === c
                        ? undefined
                        : { backgroundColor: "var(--theme-card-bg)", border: "1px solid var(--dk-border)" }
                    }
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kurs guruhlari */}
          {filteredGroups.length === 0 ? (
            <EmptyState
              emoji="📝"
              title="Test topilmadi"
              hint="Qidiruv shartlarini o'zgartirib ko'ring yoki boshqa kategoriyani tanlang."
            />
          ) : (
            filteredGroups.map((group) => {
              const open = expanded[group.courseId] ?? false;
              const done = group.nodes.filter((n) => n.result).length;
              const pct = Math.round((done / group.nodes.length) * 100);
              return (
                <div key={group.courseId} className="dk-card overflow-hidden">
                  <button
                    onClick={() => setExpanded((p) => ({ ...p, [group.courseId]: !open }))}
                    className="w-full flex items-center gap-4 p-5 text-left hover:bg-gray-50 transition-colors"
                    aria-expanded={open}
                  >
                    <span
                      className={`w-12 h-12 rounded-2xl grid place-items-center shrink-0 text-xl ${
                        group.hasAccess ? "bg-indigo-50" : "bg-amber-50"
                      }`}
                    >
                      {group.hasAccess ? "📚" : <Lock size={19} className="text-amber-500" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[16px] font-bold text-gray-900 dk-clamp-1">
                        {group.courseName}
                      </span>
                      <span className="flex items-center gap-2.5 mt-1.5">
                        <span className="text-[12px] text-gray-400">
                          {done} / {group.nodes.length} yakunlangan
                        </span>
                        {!group.hasAccess && <Chip tone="amber">Premium</Chip>}
                      </span>
                    </span>
                    <span className="shrink-0 w-28 hidden md:block">
                      <span className="block h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <span
                          className="block h-full rounded-full bg-indigo-500"
                          style={{ width: `${pct}%`, transition: "width 0.7s var(--dk-ease)" }}
                        />
                      </span>
                      <span className="block text-[11px] text-gray-400 mt-1.5 text-right tabular-nums">{pct}%</span>
                    </span>
                    <ChevronDown
                      size={19}
                      className="text-gray-400 shrink-0 transition-transform duration-300"
                      style={{ transform: open ? "rotate(180deg)" : "none" }}
                    />
                  </button>

                  {open && (
                    <div style={{ borderTop: "1px solid var(--dk-border)" }}>
                      {group.nodes.map((node) => (
                        <TestRow
                          key={node.test.id}
                          node={node}
                          onLocked={handleLocked}
                          onOpen={() => navigate(`/test/${node.test.id}`)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* O'ng ustun — natijalar va reyting */}
        <aside className="space-y-6 xl:sticky" style={{ top: "calc(var(--dk-topbar-h) + 24px)" }}>
          {/* Motivatsiya */}
          <div
            className="rounded-3xl px-6 py-5 flex items-start gap-3.5"
            style={{
              background: "linear-gradient(140deg, rgba(251,191,36,0.14), rgba(251,191,36,0.04))",
              border: "1px solid var(--dk-border)",
            }}
          >
            <span className="w-10 h-10 rounded-2xl grid place-items-center bg-white shadow-sm shrink-0">
              <Lightbulb size={18} className="text-amber-500" />
            </span>
            <p className="text-[13.5px] text-amber-900 leading-relaxed italic">"{motivation}"</p>
          </div>

          {/* So'nggi natijalar */}
          {results.length > 0 && (
            <Reveal>
              <div className="dk-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                    <TrendingUp size={16} className="text-indigo-500" /> So'nggi natijalar
                  </h3>
                  {results.length > 4 && (
                    <button
                      onClick={() => setShowAllResults((v) => !v)}
                      className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-700"
                    >
                      {showAllResults ? "Kamroq" : "Barchasi"}
                    </button>
                  )}
                </div>
                <div className="space-y-2.5">
                  {results.slice(0, showAllResults ? 20 : 4).map((r) => {
                    const node = allNodes.find((n) => n.test.id === r.testId);
                    const days = Math.floor((Date.now() - r.completedAt) / 86_400_000);
                    const when = days === 0 ? "Bugun" : days === 1 ? "Kecha" : `${days} kun oldin`;
                    return (
                      <div
                        key={r.id}
                        className="rounded-2xl p-3.5"
                        style={{ border: "1px solid var(--dk-border)" }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-semibold text-gray-900 dk-clamp-1">
                              {node?.test.title || "Test"}
                            </p>
                            {node && (
                              <p className="text-[11px] text-indigo-500 font-medium dk-clamp-1 mt-0.5">
                                {node.courseName}
                              </p>
                            )}
                            <p className="text-[11px] text-gray-400 mt-1">
                              {when} · {r.correctCount}/{r.totalQuestions} to'g'ri
                            </p>
                          </div>
                          <span
                            className={`shrink-0 px-2.5 py-1 rounded-xl text-[13px] font-bold ${scoreTone(r.score)}`}
                          >
                            {r.score}%
                          </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <MiniButton
                            onClick={() =>
                              navigate(
                                `/test-result?score=${r.score}&correct=${r.correctCount}&total=${r.totalQuestions}&time=${r.timeTaken}&resultId=${r.id}`
                              )
                            }
                          >
                            <Eye size={12} /> Natija
                          </MiniButton>
                          <MiniButton onClick={() => navigate(`/test/${r.testId}`)}>
                            <RotateCcw size={12} /> Qayta
                          </MiniButton>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Reveal>
          )}

          {/* Leaderboard */}
          {leaderboard.length > 0 && (
            <Reveal>
              <div className="dk-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[15px] font-bold text-gray-900 flex items-center gap-2">
                    <Trophy size={16} className="text-amber-500" /> Eng yaxshi natijalar
                  </h3>
                  {leaderboard.length > 5 && (
                    <button
                      onClick={() => setShowAllBoard((v) => !v)}
                      className="text-[12px] font-semibold text-indigo-500 hover:text-indigo-700"
                    >
                      {showAllBoard ? "Kamroq" : "Barchasi"}
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {leaderboard.slice(0, showAllBoard ? 15 : 5).map((e, i) => (
                    <BoardRow key={e.userId} entry={e} rank={i + 1} isMe={!!user && e.userId === user.uid} />
                  ))}

                  {myRank && user && myRank > (showAllBoard ? 15 : 5) && (
                    <>
                      <p className="text-center text-[11px] text-gray-300 py-1.5">• • •</p>
                      {(() => {
                        const me = leaderboard.find((e) => e.userId === user.uid);
                        return me ? <BoardRow entry={me} rank={myRank} isMe /> : null;
                      })()}
                    </>
                  )}
                </div>
              </div>
            </Reveal>
          )}
        </aside>
      </div>

      {/* Qulf toast */}
      {lockToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[150] flex items-center gap-2.5 bg-gray-900 text-white text-[13px] font-medium px-5 py-3.5 rounded-2xl shadow-2xl dk-anim-scale-in">
          <Lock size={14} className="shrink-0" />
          {lockToast}
        </div>
      )}
    </div>
  );
}

function scoreTone(score: number): string {
  if (score >= 80) return "bg-emerald-50 text-emerald-600";
  if (score >= 60) return "bg-amber-50 text-amber-600";
  return "bg-red-50 text-red-500";
}

function MiniButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="dk-press inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-[11.5px] font-semibold text-gray-600 transition-colors"
    >
      {children}
    </button>
  );
}

function TestRow({
  node,
  onLocked,
  onOpen,
}: {
  node: TestNode;
  onLocked: (n: TestNode) => void;
  onOpen: () => void;
}) {
  const { test, result, locked, lockReason } = node;
  const done = !!result;

  return (
    <button
      onClick={() => (locked ? onLocked(node) : onOpen())}
      className={`w-full flex items-center gap-4 px-5 py-4 text-left transition-colors ${
        locked ? "opacity-65 hover:bg-gray-50" : "hover:bg-indigo-50/45"
      }`}
      style={{ borderTop: "1px solid var(--dk-border)" }}
    >
      <span
        className={`w-11 h-11 rounded-2xl grid place-items-center shrink-0 ${
          locked ? "bg-gray-100" : done ? "bg-emerald-50" : "bg-indigo-50"
        }`}
      >
        {locked ? (
          <Lock size={17} className="text-gray-400" />
        ) : done ? (
          <CheckCircle2 size={19} className="text-emerald-500" />
        ) : (
          <Play size={17} className="text-indigo-500" fill="currentColor" />
        )}
      </span>

      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="text-[14px] font-semibold text-gray-900 dk-clamp-1">{test.title}</span>
          {test.isPremium && <span className="text-amber-500 text-[11px] shrink-0">👑</span>}
        </span>
        <span className="block text-[11.5px] text-indigo-500 font-medium mt-0.5 dk-clamp-1">
          {node.folderName ? `${node.folderName} · ` : ""}
          {node.topicName}
        </span>
        <span className="flex items-center gap-3.5 mt-1.5">
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <Clock size={10} /> {test.totalTime} daq
          </span>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <HelpCircle size={10} /> {test.questions?.length || 0} savol
          </span>
          {locked && (
            <span className="text-[11px] text-gray-400">
              {lockReason === "course"
                ? "· Kursni sotib oling"
                : lockReason === "topic"
                ? "· Mavzuni o'qing"
                : "· Avvalgi testni yakunlang"}
            </span>
          )}
        </span>
      </span>

      <span className="shrink-0">
        {done ? (
          <span className={`px-3 py-1.5 rounded-xl text-[14px] font-bold ${scoreTone(result!.score)}`}>
            {result!.score}%
          </span>
        ) : locked ? (
          <Lock size={15} className="text-gray-300" />
        ) : (
          <span className="inline-block px-4 py-2 rounded-xl bg-indigo-500 text-white text-[12px] font-bold shadow-md shadow-indigo-500/25">
            Boshlash
          </span>
        )}
      </span>
    </button>
  );
}

function BoardRow({ entry, rank, isMe }: { entry: LeaderboardEntry; rank: number; isMe: boolean }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors ${
        isMe ? "bg-indigo-50" : "hover:bg-gray-50"
      }`}
    >
      <span className="w-7 text-center shrink-0">
        {rank <= 3 ? (
          <span className="text-base">{medals[rank - 1]}</span>
        ) : (
          <span className="text-[12px] font-bold text-gray-400 tabular-nums">{rank}</span>
        )}
      </span>
      <span className="w-9 h-9 rounded-full overflow-hidden shrink-0 bg-gradient-to-br from-indigo-200 to-violet-300 grid place-items-center">
        {entry.avatar ? (
          <img src={entry.avatar} alt="" loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <span className="text-white text-[13px] font-bold">{entry.userName.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className={`block text-[13px] font-semibold truncate ${isMe ? "text-indigo-700" : "text-gray-900"}`}>
          {entry.userName}
          {isMe && <span className="text-[10px] font-normal ml-1">(Siz)</span>}
        </span>
        <span className="block text-[11px] text-gray-400">{entry.totalTests} test</span>
      </span>
      <span className="text-[14px] font-bold text-indigo-500 shrink-0 tabular-nums">{entry.avgScore}%</span>
    </div>
  );
}

function TestsSkeleton() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-52 rounded-[28px]" />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-[20px]" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-[20px]" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-[20px]" />
      </div>
    </div>
  );
}
