import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getAllCourses, getMotivationPhrases, getMotivationSettings, getStudentCountByCourse, getUserProgress, getTopicsByCourse, getAllCategories, getAllProgressByUser } from "@shared/repositories";
import type { Course, Category } from "@shared/types";
import { useAuth } from "../hooks/useAuth";
import { CoursesLoader } from "../components/PageLoader";
import { cachedFetch } from "../hooks/useCache";
import { getLocalProgress } from "../hooks/useLocalProgress";

const DEFAULT_CATEGORIES = ["Barchasi", "Jarayonda"];

interface CourseWithRealStats extends Course {
  realStudentCount: number;
  realProgress: number;
}

export default function Courses() {
  const { user, loading: authLoading } = useAuth();
  const [activeCategory, setActiveCategory] = useState("Barchasi");
  const [courses, setCourses] = useState<CourseWithRealStats[]>([]);
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(() => {
    // Kesh mavjud bo'lsa loading ko'rsatmaymiz
    return localStorage.getItem("edukids_cache_all-courses") === null;
  });
  const [motivationPhrase, setMotivationPhrase] = useState("Har kuni tashlangan kichik qadamlar katta yutuqlarga olib keladi. Siz ajoyib natija ko'rsatyapsiz!");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (authLoading) return;
    loadCourses();
    loadMotivation();
    loadCategories();
  }, [user, authLoading]);

  async function loadCategories() {
    try {
      const cats = await cachedFetch("all-categories", getAllCategories);
      const catNames = cats.map((c) => c.name);
      setCategories(["Barchasi", "Jarayonda", ...catNames]);
    } catch (err) {
      // Default qoladi
    }
  }

  async function loadCourses() {
    try {
      const data = await cachedFetch("all-courses", getAllCourses);
      // Yashirilgan kurslarni filterlash
      const visibleData = (data as Course[]).filter((c) => !c.isHidden);

      // Bir marta barcha progressni olish (kurs boshiga alohida query emas)
      let userProgressMap: Record<string, number> = {};
      if (user) {
        const allProgress = await cachedFetch(`progress-${user.uid}`, () => getAllProgressByUser(user.uid));
        for (const prog of allProgress) {
          userProgressMap[prog.courseId] = prog.progressPercent || 0;
        }
      } else {
        // Guest — localStorage dan progress olish
        const localData = getLocalProgress();
        for (const [courseId, prog] of Object.entries(localData)) {
          userProgressMap[courseId] = prog.progressPercent || 0;
        }
      }

      const withStats = await Promise.all(
        visibleData.map(async (c) => {
          const realStudentCount = await cachedFetch(`students-${c.id}`, () => getStudentCountByCourse(c.id));
          const realProgress = userProgressMap[c.id] || 0;
          return { ...c, realStudentCount, realProgress };
        })
      );
      setCourses(withStats);
    } catch (err) {
      console.error("Kurslarni yuklashda xato:", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMotivation() {
    try {
      const [phrases, settings] = await Promise.all([
        cachedFetch("motivation-courses_list", () => getMotivationPhrases("courses_list")),
        cachedFetch("motivation-settings-courses_list", () => getMotivationSettings("courses_list")),
      ]);
      const activePhrases = phrases.filter((p) => p.isActive);
      if (activePhrases.length > 0) {
        const hours = settings?.rotateHours || 2;
        const isRandom = settings?.displayOrder === "random";
        if (isRandom) {
          const idx = Math.floor(Math.random() * activePhrases.length);
          setMotivationPhrase(activePhrases[idx].text);
        } else {
          const hoursSinceEpoch = Math.floor(Date.now() / (1000 * 60 * 60));
          const idx = Math.floor(hoursSinceEpoch / hours) % activePhrases.length;
          setMotivationPhrase(activePhrases[idx].text);
        }
      }
    } catch (err) {
      // Default fraza qoladi
    }
  }

  // Agar Firestore'dan kurslar bo'sh bo'lsa, bo'sh ro'yxat ko'rsatamiz
  const allCourses = courses;

  // Filterlash
  const displayCourses = allCourses.filter((c) => {
    // Qidiruv
    if (searchQuery && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    // Kategoriya
    if (activeCategory === "Barchasi") return true;
    if (activeCategory === "Jarayonda") return (c.realProgress || 0) > 0;
    return c.category === activeCategory;
  });

  const colors: Record<string, string> = { Matematika: "#2196F3", "Ona tili": "#4CAF50", "Ingliz tili": "#9C27B0", Dasturlash: "#FF9800", default: "#F44336" };

  return (
    <div className="page-content">
      <header className="px-5 pt-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Kurslar</h1>
        <button className="w-10 h-10 flex items-center justify-center text-gray-500 rounded-lg" aria-label="Qo'shimcha">⋮</button>
      </header>

      {/* Qidiruv */}
      <div className="mx-5 mt-3 flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <span className="text-gray-400 mr-2">🔍</span>
        <input
          placeholder="Kurslarni qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-transparent text-sm outline-none"
        />
      </div>

      {/* Kategoriyalar */}
      <div className="px-5 mt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Kategoriyalar</p>
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map((c) => (
            <button key={c} onClick={() => setActiveCategory(c)} className={`shrink-0 px-4 py-2.5 rounded-full text-sm font-medium ${activeCategory === c ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Section */}
      <div className="px-5 mt-5 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Mening kurslarim</h2>
        <span className="text-sm text-primary-500 font-medium">{displayCourses.length} ta kurs</span>
      </div>

      {/* Loading */}
      {loading && <CoursesLoader />}

      {/* Course list */}
      {!loading && displayCourses.length === 0 && (
        <div className="mx-5 mt-6 text-center py-12 border border-gray-100 rounded-2xl bg-white">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-gray-600 font-medium">Hozircha kurslar mavjud emas</p>
          <p className="text-sm text-gray-400 mt-1">Tez orada yangi kurslar qo'shiladi</p>
        </div>
      )}
      <div className="px-5 mt-3 space-y-4">
        {displayCourses.map((course) => {
          const color = colors[course.category] || colors.default;
          return (
            <Link to={`/course/${course.id}`} key={course.id} className="block border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-white">
              {/* Muqova rasmi */}
              {course.coverImage ? (
                <div className="h-40 overflow-hidden">
                  <img
                    src={course.coverImage}
                    alt={course.title}
                    className="w-full h-full"
                    loading="lazy"
                    style={{ objectFit: (course as any).coverFit || "cover", objectPosition: (course as any).coverPosition || "50% 50%" }}
                  />
                </div>
              ) : (
                <div className="h-32 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                  <svg className="w-10 h-10 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              )}

              <div className="p-5">
              {/* Yuqori qism: icon va statistikalar */}
              <div className="flex items-start justify-between mb-4">
                {/* Icon */}
                <div className="w-14 h-14 bg-primary-500 rounded-2xl flex items-center justify-center shadow-sm">
                  <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </div>
                {/* Statistikalar */}
                <div className="text-right space-y-1">
                  <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
                    <span>👥</span> Kursdagi o'quvchilar: <span className="font-semibold text-gray-700">{(course.realStudentCount || course.totalStudents || 0).toLocaleString()}</span>
                  </p>
                  <p className="text-xs flex items-center justify-end gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                    <span className="text-green-600 font-medium">Hozir onlayn: {course.onlineNow || 0}</span>
                  </p>
                </div>
              </div>

              {/* Kurs nomi va kategoriya */}
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900">{course.title}</h3>
                <span className="text-xs font-semibold px-3 py-1 rounded-full shrink-0 ml-2" style={{ backgroundColor: color + "12", color }}>
                  {course.category}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-4">{course.description}</p>

              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-gray-500 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                    {(course.realProgress || 0) > 0 ? "Jarayonda" : "Siz bu kursga qatnashmagansiz"}
                  </span>
                  {(course.realProgress || 0) > 0 && (
                    <span className="text-sm font-bold text-primary-500">{Math.min(100, course.realProgress)}%</span>
                  )}
                </div>
                {(course.realProgress || 0) > 0 && (
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${Math.min(100, course.realProgress)}%` }} />
                  </div>
                )}
              </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tip */}
      <div className="mx-5 mt-5 bg-blue-50 rounded-xl p-4 flex items-center gap-3">
        <span className="text-xl">💡</span>
        <p className="text-sm text-blue-800">"{motivationPhrase}"</p>
      </div>
    </div>
  );
}
