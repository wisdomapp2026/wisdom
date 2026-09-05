import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X, LayoutGrid, List, SlidersHorizontal, Lightbulb, BookOpen } from "lucide-react";
import {
  getAllCourses,
  getAllCategories,
  getAllProgressByUser,
  getStudentCountByCourse,
  getTopicsByCourse,
  getMotivationPhrases,
  getMotivationSettings,
} from "@shared/repositories";
import type { Course } from "@shared/types";
import { useAuth } from "../../hooks/useAuth";
import { cachedFetch } from "../../hooks/useCache";
import { getLocalProgress } from "../../hooks/useLocalProgress";
import CourseCard, { CourseCardSkeleton, type CourseCardData } from "../components/CourseCard";
import CourseListRow from "../components/CourseListRow";
import { EmptyState, SectionHeading } from "../components/ui";

const PAGE_SIZE = 24;
const VIEW_KEY = "wisdom-dk-courses-view";

type SortKey = "default" | "progress" | "students" | "title";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "default", label: "Standart" },
  { key: "progress", label: "Progress bo'yicha" },
  { key: "students", label: "Ommaboplik" },
  { key: "title", label: "Alifbo tartibida" },
];

/**
 * Desktop kurslar sahifasi.
 *
 * Mobil versiyadan farqi: 3 ustunli grid / ro'yxat ko'rinishi, saralash,
 * yopishqoq filtr paneli va cheksiz (lazy) yuklash.
 */
export default function DesktopCourses() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();

  const [rawCourses, setRawCourses] = useState<Course[]>([]);
  const [categories, setCategories] = useState<string[]>(["Barchasi", "Jarayonda"]);
  const [statsMap, setStatsMap] = useState<Record<string, number>>({});
  const [topicsMap, setTopicsMap] = useState<Record<string, number>>({});
  const [progressMap, setProgressMap] = useState<Record<string, number>>({});
  const [motivation, setMotivation] = useState(
    "Har kuni tashlangan kichik qadamlar katta yutuqlarga olib keladi."
  );

  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [sort, setSort] = useState<SortKey>("default");
  const [view, setView] = useState<"grid" | "list">(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as "grid" | "list") || "grid";
    } catch {
      return "grid";
    }
  });
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [loading, setLoading] = useState(
    () => localStorage.getItem("edukids_cache_all-courses") === null
  );
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view);
    } catch {}
  }, [view]);

  useEffect(() => {
    if (authLoading) return;
    loadCourses();
    loadCategories();
    loadProgress();
    loadMotivation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  async function loadCourses() {
    try {
      const data = await cachedFetch("all-courses", getAllCourses);
      setRawCourses((data as Course[]).filter((c) => !c.isHidden));
    } catch (err) {
      console.error("Kurslarni yuklashda xato:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const cats = await cachedFetch("all-categories", getAllCategories);
      setCategories(["Barchasi", "Jarayonda", ...new Set(cats.map((c) => c.name))]);
    } catch {}
  }

  async function loadProgress() {
    const map: Record<string, number> = {};
    if (user) {
      const all = await cachedFetch(`progress-${user.uid}`, () => getAllProgressByUser(user.uid));
      for (const p of all) map[p.courseId] = p.progressPercent || 0;
    } else {
      for (const [courseId, p] of Object.entries(getLocalProgress())) {
        map[courseId] = p.progressPercent || 0;
      }
    }
    setProgressMap(map);
  }

  async function loadMotivation() {
    try {
      const [phrases, settings] = await Promise.all([
        cachedFetch("motivation-courses_list", () => getMotivationPhrases("courses_list")),
        cachedFetch("motivation-settings-courses_list", () => getMotivationSettings("courses_list")),
      ]);
      const active = phrases.filter((p) => p.isActive);
      if (active.length === 0) return;
      const hours = settings?.rotateHours || 2;
      const idx =
        settings?.displayOrder === "random"
          ? Math.floor(Math.random() * active.length)
          : Math.floor(Math.floor(Date.now() / 3_600_000) / hours) % active.length;
      setMotivation(active[idx].text);
    } catch {}
  }

  /** Ekranda ko'rinadigan kurslar uchun statistikani lazy yuklash */
  async function loadStatsFor(ids: string[]) {
    const missingStudents = ids.filter((id) => statsMap[id] === undefined);
    const missingTopics = ids.filter((id) => topicsMap[id] === undefined);
    if (missingStudents.length === 0 && missingTopics.length === 0) return;

    if (missingStudents.length > 0) {
      const results = await Promise.all(
        missingStudents.map(async (id) => {
          const count = await cachedFetch(`students-${id}`, () => getStudentCountByCourse(id));
          return [id, count] as const;
        })
      );
      setStatsMap((prev) => {
        const next = { ...prev };
        for (const [id, count] of results) next[id] = count;
        return next;
      });
    }

    if (missingTopics.length > 0) {
      const results = await Promise.all(
        missingTopics.map(async (id) => {
          const topics = await cachedFetch(`topics-${id}`, () => getTopicsByCourse(id));
          return [id, topics.length] as const;
        })
      );
      setTopicsMap((prev) => {
        const next = { ...prev };
        for (const [id, count] of results) next[id] = count;
        return next;
      });
    }
  }

  // Kurslarni statistika bilan boyitish
  const allCourses: CourseCardData[] = useMemo(
    () =>
      rawCourses.map((c) => ({
        ...c,
        studentCount: statsMap[c.id] ?? c.totalStudents ?? 0,
        topicCount: topicsMap[c.id] ?? 0,
        progress: progressMap[c.id] || 0,
      })),
    [rawCourses, statsMap, topicsMap, progressMap]
  );

  // Filtrlash va saralash
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = allCourses.filter((c) => {
      if (q && !c.title.toLowerCase().includes(q) && !(c.description || "").toLowerCase().includes(q)) {
        return false;
      }
      if (activeCategory === "Barchasi") return true;
      if (activeCategory === "Jarayonda") return (c.progress || 0) > 0;
      return c.category === activeCategory;
    });

    if (sort === "progress") list = [...list].sort((a, b) => (b.progress || 0) - (a.progress || 0));
    else if (sort === "students")
      list = [...list].sort((a, b) => (b.studentCount || 0) - (a.studentCount || 0));
    else if (sort === "title")
      list = [...list].sort((a, b) => a.title.localeCompare(b.title, "uz"));

    return list;
  }, [allCourses, query, activeCategory, sort]);

  const display = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  useEffect(() => setVisibleCount(PAGE_SIZE), [query, activeCategory, sort]);

  useEffect(() => {
    const ids = display.map((c) => c.id);
    if (ids.length > 0) loadStatsFor(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleCount, rawCourses.length, query, activeCategory, sort]);

  // Cheksiz yuklash
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !hasMore) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) setVisibleCount((v) => v + PAGE_SIZE);
      },
      { rootMargin: "400px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore]);

  return (
    <div className="space-y-8">
      {/* Sarlavha */}
      <SectionHeading
        title="Kurslar"
        subtitle={
          loading ? "Yuklanmoqda..." : `${filtered.length} ta kurs · ${categories.length - 2} kategoriya`
        }
        icon={<BookOpen size={18} />}
      />

      {/* Filtr paneli — scroll paytida tepada qoladi */}
      <div
        className="sticky z-20 rounded-3xl px-5 py-4 dk-glass"
        style={{ top: "calc(var(--dk-topbar-h) + 12px)", border: "1px solid var(--dk-border)" }}
      >
        <div className="flex items-center gap-4 flex-wrap">
          {/* Qidiruv */}
          <div
            className="flex items-center gap-2.5 h-11 px-4 rounded-2xl flex-1 min-w-[260px]"
            style={{ backgroundColor: "var(--theme-card-bg)", border: "1px solid var(--dk-border)" }}
          >
            <Search size={17} className="text-gray-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kurs nomi yoki tavsifi bo'yicha qidirish..."
              className="flex-1 bg-transparent text-[13.5px] outline-none placeholder:text-gray-400 text-gray-900"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="w-6 h-6 rounded-lg grid place-items-center bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
                aria-label="Qidiruvni tozalash"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Saralash */}
          <div className="flex items-center gap-2 shrink-0">
            <SlidersHorizontal size={15} className="text-gray-400" />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="h-11 px-3 rounded-2xl text-[13px] font-semibold text-gray-700 outline-none cursor-pointer"
              style={{ backgroundColor: "var(--theme-card-bg)", border: "1px solid var(--dk-border)" }}
              aria-label="Saralash"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Ko'rinish almashtirish */}
          <div
            className="flex items-center gap-1 h-11 p-1 rounded-2xl shrink-0"
            style={{ backgroundColor: "var(--theme-card-bg)", border: "1px solid var(--dk-border)" }}
          >
            <ViewToggle active={view === "grid"} onClick={() => setView("grid")} label="Panjara ko'rinishi">
              <LayoutGrid size={16} />
            </ViewToggle>
            <ViewToggle active={view === "list"} onClick={() => setView("list")} label="Ro'yxat ko'rinishi">
              <List size={16} />
            </ViewToggle>
          </div>
        </div>

        {/* Kategoriyalar */}
        <div className="flex gap-2 mt-3.5 overflow-x-auto scrollbar-hide pb-0.5">
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className={`shrink-0 px-4 py-2 rounded-full text-[12.5px] font-semibold transition-all duration-300 ${
                activeCategory === c
                  ? "bg-gray-900 text-white shadow-md"
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
      </div>

      {/* Ro'yxat */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : display.length === 0 ? (
        <EmptyState
          emoji={query.trim() ? "🔍" : "📚"}
          title={query.trim() ? `"${query}" bo'yicha natija topilmadi` : "Hozircha kurslar mavjud emas"}
          hint={
            query.trim()
              ? "Boshqa so'z bilan qidirib ko'ring yoki kategoriyani o'zgartiring."
              : "Tez orada yangi kurslar qo'shiladi."
          }
        />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 dk-stagger">
          {display.map((c, i) => (
            <CourseCard key={c.id} course={c} priority={i < 3} />
          ))}
        </div>
      ) : (
        <div className="space-y-4 dk-stagger">
          {display.map((c) => (
            <CourseListRow key={c.id} course={c} />
          ))}
        </div>
      )}

      {/* Cheksiz yuklash sentineli */}
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-8">
          <span className="w-7 h-7 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Motivatsiya */}
      <div
        className="flex items-start gap-4 rounded-3xl px-7 py-6"
        style={{
          background: "linear-gradient(120deg, rgba(59,130,246,0.09), rgba(139,92,246,0.06))",
          border: "1px solid var(--dk-border)",
        }}
      >
        <span className="w-12 h-12 rounded-2xl grid place-items-center bg-white shadow-sm shrink-0">
          <Lightbulb size={20} className="text-amber-500" />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-primary-600">Kun maslahati</p>
          <p className="text-[15px] text-gray-700 leading-relaxed italic mt-1">"{motivation}"</p>
        </div>
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={`w-9 h-9 rounded-xl grid place-items-center transition-all duration-300 ${
        active ? "bg-primary-500 text-white shadow-md" : "text-gray-400 hover:text-gray-700 hover:bg-gray-100"
      }`}
    >
      {children}
    </button>
  );
}
