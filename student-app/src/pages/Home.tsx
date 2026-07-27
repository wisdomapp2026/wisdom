import { Search, Bell, ChevronRight, Play, Clock, X, FileText, Moon, Sun, Star } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { getAllCourses, getTopicsByCourse, getMotivationPhrases, getMotivationSettings, getAllProgressByUser, getCourseById, getTopicById, getAllSocialLinks, getUserById, getActiveBanners, getActiveNewsItems, getUserProgress, getActiveTestimonials } from "@shared/repositories";
import { getStudentCountByCourse } from "@shared/repositories";
import NotificationBell from "../components/NotificationBell";
import type { Course, UserProgress, Topic, SocialLink, HomeBanner, NewsItem, Testimonial } from "@shared/types";
import { useAuth } from "../hooks/useAuth";
import { HomeLoader } from "../components/PageLoader";
import { cachedFetch } from "../hooks/useCache";
import { getLocalProgress } from "../hooks/useLocalProgress";

interface CourseWithMeta extends Course {
  topicCount: number;
  studentCount: number;
  progress: number;
}

interface ContinueItem {
  progress: UserProgress;
  course: Course;
  currentTopic: Topic | null;
}

/** YouTube video URL dan thumbnail olish */
function getYouTubeThumbnail(url: string): string {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : "";
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [allCoursesForSearch, setAllCoursesForSearch] = useState<Course[]>([]);
  const [motivationPhrase, setMotivationPhrase] = useState("Bugungi kichik harakat — ertangi katta natija 🔥");
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [bannerIdx, setBannerIdx] = useState(0);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userData, setUserData] = useState<{ name?: string; avatar?: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    loadAll();
  }, [user, authLoading]);

  // User ma'lumotlarini yuklash (avatar uchun)
  useEffect(() => {
    if (user) {
      cachedFetch(`user-${user.uid}`, () => getUserById(user.uid)).then((u) => {
        if (u) setUserData({ name: u.name, avatar: u.avatar });
      });
    }
  }, [user]);

  async function loadAll() {
    // Agar kesh mavjud bo'lsa, loading ko'rsatmaymiz (instant load)
    const hasCachedData = localStorage.getItem("edukids_cache_all-courses") !== null;
    if (!hasCachedData) setLoading(true);
    try {
      await Promise.all([
        loadCourses(),
        loadHomeMotivation(),
        loadContinueItems(),
        loadSocialLinks(),
        loadBanners(),
        loadNewsItems(),
        loadTestimonials(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCourses() {
    const data = await cachedFetch("all-courses", getAllCourses);
    // Qidiruv barcha (yashirilmagan) kurslar bo'yicha ishlashi uchun to'liq ro'yxatni saqlaymiz
    setAllCoursesForSearch(data.filter((c) => !c.isHidden));

    // Bosh sahifada faqat admin belgilagan kurslar ko'rinadi (showOnHomepage !== false),
    // yashiringan kurslar ham chiqarib tashlanadi. Maksimum 10 tagacha.
    const homepageCourses = data
      .filter((c) => !c.isHidden && c.showOnHomepage !== false)
      .slice(0, 10);

    // Progress olish — login yoki guest
    let progressMap: Record<string, { completedTopics: string[] }> = {};
    if (user) {
      const allProgress = await cachedFetch(`progress-${user.uid}`, () => getAllProgressByUser(user.uid));
      for (const p of allProgress) {
        progressMap[p.courseId] = { completedTopics: p.completedTopics || [] };
      }
    } else {
      const localData = getLocalProgress();
      for (const [courseId, p] of Object.entries(localData)) {
        progressMap[courseId] = { completedTopics: p.completedTopics || [] };
      }
    }

    const withMeta = await Promise.all(
      homepageCourses.map(async (c) => {
        const [topics, students] = await Promise.all([
          cachedFetch(`topics-${c.id}`, () => getTopicsByCourse(c.id)),
          cachedFetch(`students-${c.id}`, () => getStudentCountByCourse(c.id)),
        ]);
        // Progress ni haqiqiy mavzular asosida hisoblash
        const userProgress = progressMap[c.id];
        let progress = 0;
        if (userProgress && topics.length > 0) {
          const validCompleted = userProgress.completedTopics.filter((id) => topics.some((t) => t.id === id));
          progress = Math.min(100, Math.round((validCompleted.length / topics.length) * 100));
        }
        return { ...c, topicCount: topics.length, studentCount: students, progress };
      })
    );
    setCourses(withMeta);
  }

  async function loadSocialLinks() {
    try {
      const allLinks = await cachedFetch("social-links", getAllSocialLinks);
      setSocialLinks(allLinks.filter((l) => l.isActive));
    } catch (err) {
      // ixtiyoriy
    }
  }

  async function loadBanners() {
    try {
      const data = await getActiveBanners();
      setBanners(data);
    } catch {}
  }

  async function loadNewsItems() {
    try {
      const data = await getActiveNewsItems();
      setNewsItems(data);
    } catch {}
  }

  async function loadTestimonials() {
    try {
      // Otzivlar tez-tez o'zgarishi mumkin (admin yangi qo'shadi) — har safar to'g'ridan-to'g'ri
      // Firestore'dan olamiz, eski (bo'sh) keshda qolib ketmasligi uchun cache ishlatmaymiz.
      const data = await getActiveTestimonials();
      setTestimonials(data);
    } catch (err) {
      console.error("Otzivlarni yuklashda xatolik:", err);
    }
  }

  async function loadContinueItems() {
    if (!user) return;
    try {
      const allProgress = await cachedFetch(`progress-${user.uid}`, () => getAllProgressByUser(user.uid), 30_000);
      if (allProgress.length === 0) return;

      const sorted = [...allProgress].sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));
      const items: ContinueItem[] = [];

      for (const prog of sorted.slice(0, 3)) {
        const course = await cachedFetch(`course-${prog.courseId}`, () => getCourseById(prog.courseId));
        if (!course) continue;
        let currentTopic: Topic | null = null;
        if (prog.currentTopicId) {
          currentTopic = await cachedFetch(
            `topic-${prog.courseId}-${prog.currentTopicId}`,
            () => getTopicById(prog.courseId, prog.currentTopicId!)
          );
        }
        items.push({ progress: prog, course, currentTopic });
      }
      setContinueItems(items);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadHomeMotivation() {
    try {
      const [phrases, settings] = await Promise.all([
        cachedFetch("motivation-home", () => getMotivationPhrases("home")),
        cachedFetch("motivation-settings-home", () => getMotivationSettings("home")),
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
      // Xatolik bo'lsa default fraza qoladi
    }
  }

  if (loading) return <HomeLoader />;

  return (
    <div className="page-content">

      {/* Qidiruv paneli */}
      {showSearch && (
        <div className="px-5 pb-3 animate-fadeIn">
          <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 gap-2">
            <Search size={18} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              placeholder="Kurslarni qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && searchQuery.trim()) {
                  navigate(`/courses?q=${encodeURIComponent(searchQuery.trim())}`);
                  setShowSearch(false);
                  setSearchQuery("");
                }
              }}
              className="flex-1 bg-transparent text-sm outline-none"
            />
            <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-gray-400">
              <X size={18} />
            </button>
          </div>
          {/* Tezkor natijalar */}
          {searchQuery.trim() && (
            <div className="mt-2 space-y-1">
              {allCoursesForSearch
                .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 4)
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => { navigate(`/course/${c.id}`); setShowSearch(false); setSearchQuery(""); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 active:bg-gray-100 text-left"
                  >
                    <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center shrink-0">
                      <span className="text-primary-500 text-xs">📚</span>
                    </div>
                    <span className="text-sm text-gray-700 truncate">{c.title}</span>
                  </button>
                ))}
              {allCoursesForSearch.filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p className="text-sm text-gray-400 px-3 py-2">Natija topilmadi</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Banner carousel */}
      {banners.length > 0 && (
        <div className="mx-5 mt-0 relative">
          <div
            className="flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-5 px-5"
            style={{ cursor: "grab" }}
            onScroll={(e) => {
              const el = e.currentTarget;
              const idx = Math.round(el.scrollLeft / el.clientWidth);
              setBannerIdx(idx);
            }}
            onMouseDown={(e) => {
              const el = e.currentTarget;
              el.dataset.dragging = "true";
              el.dataset.startX = String(e.pageX - el.offsetLeft);
              el.dataset.scrollLeft = String(el.scrollLeft);
              el.style.cursor = "grabbing";
              el.style.scrollSnapType = "none";
            }}
            onMouseMove={(e) => {
              const el = e.currentTarget;
              if (el.dataset.dragging !== "true") return;
              e.preventDefault();
              const x = e.pageX - el.offsetLeft;
              const walk = (x - Number(el.dataset.startX)) * 1.5;
              el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
            }}
            onMouseUp={(e) => {
              const el = e.currentTarget;
              el.dataset.dragging = "false";
              el.style.cursor = "grab";
              el.style.scrollSnapType = "x mandatory";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.dataset.dragging = "false";
              el.style.cursor = "grab";
              el.style.scrollSnapType = "x mandatory";
            }}
          >
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="snap-center shrink-0 w-full rounded-2xl p-5 relative overflow-hidden cursor-pointer"
                style={{ backgroundColor: banner.bgColor, minWidth: "calc(100% - 0px)", minHeight: "180px" }}
                onClick={() => {
                  if (banner.courseId) navigate(`/course/${banner.courseId}`);
                  else if (banner.linkUrl) window.open(banner.linkUrl, "_blank");
                }}
              >
                {banner.imageUrl && !banner.imageFullWidth && (
                  <img src={banner.imageUrl} alt="" className="absolute right-0 top-0 h-full w-1/3" style={{ objectFit: banner.imageFit || "cover", objectPosition: banner.imagePosition || "center", opacity: (banner.imageOpacity ?? 50) / 100 }} />
                )}
                {banner.imageUrl && banner.imageFullWidth && (
                  <img src={banner.imageUrl} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: banner.imageFit || "cover", objectPosition: banner.imagePosition || "center", opacity: (banner.imageOpacity ?? 70) / 100 }} />
                )}
                <h2
                  className="text-lg font-bold leading-tight relative z-10"
                  style={{ color: banner.textColor || "#ffffff", opacity: (banner.textOpacity ?? 100) / 100 }}
                >
                  {banner.title}
                </h2>
                {banner.subtitle && (
                  <p
                    className="text-sm mt-1 relative z-10"
                    style={{ color: banner.textColor || "#ffffff", opacity: ((banner.textOpacity ?? 100) / 100) * 0.8 }}
                  >
                    {banner.subtitle}
                  </p>
                )}
                {banner.showButton !== false && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (banner.courseId) navigate(`/course/${banner.courseId}`);
                      else if (banner.linkUrl) window.open(banner.linkUrl, "_blank");
                    }}
                    className={
                      banner.buttonPosition
                        ? "absolute bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg z-10 active:bg-gray-800"
                        : "mt-3 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg relative z-10 active:bg-gray-800"
                    }
                    style={
                      banner.buttonPosition
                        ? (() => {
                            const m = banner.buttonPosition!.match(/([\d.]+)%?\s+([\d.]+)%?/);
                            const x = m ? parseFloat(m[1]) : 50;
                            const y = m ? parseFloat(m[2]) : 50;
                            return { left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" };
                          })()
                        : undefined
                    }
                  >
                    {banner.buttonText}
                  </button>
                )}
              </div>
            ))}
          </div>
          {/* Dots indicator */}
          {banners.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {banners.map((_, i) => (
                <div key={i} className={`rounded-full transition-all ${i === bannerIdx ? "w-5 h-1.5 bg-primary-500" : "w-1.5 h-1.5 bg-gray-300"}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Yangiliklar */}
      {newsItems.length > 0 && (
        <section className="mt-6">
          <div className="flex justify-between items-center mb-3 px-5">
            <h3 className="text-base font-bold text-gray-900">Yangiliklar</h3>
            <button onClick={() => navigate("/news")} className="text-sm text-primary-500 font-medium">Barchasi</button>
          </div>
          <div
            className="flex items-start gap-3 overflow-x-auto pb-2 px-5 scrollbar-hide"
            style={{ cursor: "grab" }}
            onMouseDown={(e) => {
              const el = e.currentTarget;
              el.dataset.dragging = "true";
              el.dataset.startX = String(e.pageX - el.offsetLeft);
              el.dataset.scrollLeft = String(el.scrollLeft);
              el.style.cursor = "grabbing";
            }}
            onMouseMove={(e) => {
              const el = e.currentTarget;
              if (el.dataset.dragging !== "true") return;
              e.preventDefault();
              const x = e.pageX - el.offsetLeft;
              const walk = (x - Number(el.dataset.startX)) * 1.5;
              el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
            }}
            onMouseUp={(e) => { e.currentTarget.dataset.dragging = "false"; e.currentTarget.style.cursor = "grab"; }}
            onMouseLeave={(e) => { e.currentTarget.dataset.dragging = "false"; e.currentTarget.style.cursor = "grab"; }}
          >
            {newsItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.type === "image" && item.linkUrl) {
                    window.open(item.linkUrl, "_blank");
                  } else {
                    setSelectedNews(item);
                  }
                }}
                className="shrink-0 w-32 flex flex-col text-left"
              >
                <div className="w-full h-44 bg-gray-800 rounded-xl flex items-center justify-center relative overflow-hidden shrink-0">
                  {(() => {
                    const thumb = item.imageUrl || (item.type === "video" && item.videoUrl ? getYouTubeThumbnail(item.videoUrl) : "");
                    return thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                        {item.type === "video" ? <Play size={20} className="text-white" fill="white" /> : <FileText size={20} className="text-white/60" />}
                      </div>
                    );
                  })()}
                  {item.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play size={20} className="text-white" fill="white" />
                    </div>
                  )}
                  {item.duration && <span className="absolute bottom-1.5 right-2 text-[10px] text-white bg-black/60 px-1.5 py-0.5 rounded">{item.duration}</span>}
                </div>
                <p className="text-xs text-gray-700 font-medium mt-1.5 break-words [overflow-wrap:anywhere] whitespace-normal">{item.title}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Yangilik detail modal */}
      {selectedNews && (
        <NewsDetailModal item={selectedNews} onClose={() => setSelectedNews(null)} />
      )}

      {/* Kurslar */}
      <section className="mt-6 px-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-gray-900">Kurslar</h3>
          <Link to="/courses" className="text-sm text-primary-500 font-medium">Barchasi</Link>
        </div>
        {courses.length > 0 ? (
        <div className="space-y-4">
          {courses.map((c: any, i: number) => (
            <Link to={`/course/${c.id}`} key={i} className="block border border-gray-100 rounded-2xl overflow-hidden hover:shadow-md transition-shadow bg-white">
              {/* Muqova rasmi */}
              {c.coverImage ? (
                <div className="h-40 overflow-hidden relative">
                  <img
                    src={c.coverImage}
                    alt={c.title}
                    className="w-full h-full"
                    loading="lazy"
                    style={{ objectFit: c.coverFit || "cover", objectPosition: c.coverPosition || "50% 50%" }}
                  />
                  {c.isPremium && (
                    <span className="absolute top-2 right-2 bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                      👑 Premium
                    </span>
                  )}
                </div>
              ) : (
                <div className="h-32 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center relative">
                  <svg className="w-10 h-10 text-white/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  {c.isPremium && (
                    <span className="absolute top-2 right-2 bg-yellow-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow">
                      👑 Premium
                    </span>
                  )}
                </div>
              )}

              <div className="p-4">
                {/* Statistika */}
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-sm">
                    <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  </div>
                  <div className="text-right space-y-0.5">
                    <div className="flex items-center justify-end gap-2">
                      {c.category && (
                        <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {c.category}
                        </span>
                      )}
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        👥 Kursdagi o'quvchilar: <span className="font-semibold text-gray-700">{c.studentCount || 0}</span>
                      </p>
                    </div>
                    <p className="text-xs flex items-center justify-end gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full inline-block" />
                      <span className="text-green-600 font-medium">Hozir onlayn: {c.onlineNow || 0}</span>
                    </p>
                  </div>
                </div>

                {/* Kurs nomi */}
                <div className="mb-2">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">{c.title}</h3>
                </div>

                {/* Tavsif */}
                {c.description && (
                  <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 mb-3">{c.description}</p>
                )}

                {/* Progress */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 6v6l4 2" />
                      </svg>
                      {(c.progress || 0) > 0 ? "Jarayonda" : "Boshlang"}
                    </span>
                    <span className="text-sm font-bold text-primary-500">{Math.min(100, c.progress || 0)}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full">
                    <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${Math.min(100, c.progress || 0)}%` }} />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
        ) : (
          <div className="text-center py-8 border border-gray-100 rounded-xl">
            <p className="text-3xl mb-2">📚</p>
            <p className="text-sm text-gray-500">Hozircha kurslar mavjud emas</p>
            <p className="text-xs text-gray-400 mt-1">Tez orada yangi kurslar qo'shiladi</p>
          </div>
        )}
      </section>

      {/* Davom etayotgan darslar */}
      {continueItems.length > 0 && (
        <section className="mt-6 px-5">
          <h3 className="text-base font-bold text-gray-900 mb-3">Davom etayotgan darslar</h3>
          <div className="space-y-3">
            {continueItems.map((item) => (
              <button
                key={item.course.id}
                onClick={() => {
                  if (item.currentTopic) {
                    navigate(`/course/${item.course.id}/topic/${item.currentTopic.id}`);
                  } else {
                    navigate(`/course/${item.course.id}`);
                  }
                }}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center gap-3 text-left active:bg-gray-100"
              >
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
                  <span>📖</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.currentTopic?.title || item.course.title}
                  </p>
                  <p className="text-[10px] text-gray-500 mt-0.5">SO'NGGI DARS · {item.course.title}</p>
                </div>
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
                  <Play size={14} className="text-white ml-0.5" fill="white" />
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Kunlik motivatsiya */}
      <div className="mx-5 mt-6 bg-primary-500 rounded-2xl p-5 text-center">
        <span className="text-2xl">⭐</span>
        <p className="text-white font-bold mt-2">"{motivationPhrase}"</p>
        <p className="text-white/60 text-xs mt-2">— Muvaffaqiyat formulasi</p>
      </div>

      {/* Foydalanuvchi otzivlari */}
      {testimonials.length > 0 && (
        <section className="mt-6">
          <div className="flex justify-between items-center mb-3 px-5">
            <h3 className="text-base font-bold text-gray-900">O'quvchilar fikri</h3>
            <div className="flex items-center gap-1 text-[11px] text-gray-400">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="font-semibold text-gray-600">
                {(testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length).toFixed(1)}
              </span>
              <span>({testimonials.length})</span>
            </div>
          </div>
          <div
            className="flex items-stretch gap-3 overflow-x-auto pb-2 px-5 scrollbar-hide"
            style={{ cursor: "grab" }}
            onMouseDown={(e) => {
              const el = e.currentTarget;
              el.dataset.dragging = "true";
              el.dataset.startX = String(e.pageX - el.offsetLeft);
              el.dataset.scrollLeft = String(el.scrollLeft);
              el.style.cursor = "grabbing";
            }}
            onMouseMove={(e) => {
              const el = e.currentTarget;
              if (el.dataset.dragging !== "true") return;
              e.preventDefault();
              const x = e.pageX - el.offsetLeft;
              const walk = (x - Number(el.dataset.startX)) * 1.5;
              el.scrollLeft = Number(el.dataset.scrollLeft) - walk;
            }}
            onMouseUp={(e) => { e.currentTarget.dataset.dragging = "false"; e.currentTarget.style.cursor = "grab"; }}
            onMouseLeave={(e) => { e.currentTarget.dataset.dragging = "false"; e.currentTarget.style.cursor = "grab"; }}
          >
            {testimonials.map((t) => (
              <div
                key={t.id}
                className="shrink-0 w-64 border border-gray-200 rounded-2xl p-4 relative overflow-hidden flex flex-col"
                style={{ backgroundColor: 'var(--theme-card-bg)' }}
              >
                <svg className="absolute top-3 right-3 w-7 h-7 text-primary-100" viewBox="0 0 24 24" fill="currentColor"><path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z"/></svg>
                <div className="flex items-center gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} size={13} className={s <= t.rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"} />
                  ))}
                </div>
                <p className="text-[13px] text-gray-700 leading-relaxed flex-1 line-clamp-4 relative z-10">"{t.text}"</p>
                <div className="flex items-center gap-2.5 mt-3 pt-3 border-t border-gray-200">
                  <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow shrink-0">
                    {t.avatarUrl ? (
                      <img src={t.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary-500 text-white text-xs font-bold">
                        {t.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{t.name}</p>
                    {t.role && <p className="text-[10px] text-gray-500 truncate">{t.role}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Ijtimoiy tarmoqlar */}
      {socialLinks.length > 0 && (
        <section className="mt-6 px-5 pb-6">
          <h3 className="text-base font-bold text-gray-900 mb-3">Ijtimoiy tarmoqlar</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                title={link.label}
                className="w-11 h-11 flex items-center justify-center bg-white border border-gray-100 rounded-full hover:shadow-md active:bg-gray-50 transition-all"
              >
                <SocialIcon platform={link.platform} iconUrl={link.iconUrl} />
              </a>
            ))}
          </div>
        </section>
      )}

      {/* Author Modal */}
    </div>
  );
}

function SocialIcon({ platform, iconUrl }: { platform: string; iconUrl?: string }) {
  // Agar admin maxsus ikonka yuklagan bo'lsa
  if (iconUrl) {
    return (
      <div className="w-9 h-9 rounded-full overflow-hidden shrink-0">
        <img src={iconUrl} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  const icons: Record<string, { bg: string; content: React.ReactNode }> = {
    telegram: {
      bg: "bg-[#0088cc]",
      content: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>,
    },
    instagram: {
      bg: "bg-gradient-to-br from-[#f09433] via-[#e6683c] to-[#bc1888]",
      content: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>,
    },
    youtube: {
      bg: "bg-[#FF0000]",
      content: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>,
    },
    facebook: {
      bg: "bg-[#1877F2]",
      content: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>,
    },
    tiktok: {
      bg: "bg-black",
      content: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>,
    },
    twitter: {
      bg: "bg-black",
      content: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>,
    },
    linkedin: {
      bg: "bg-[#0A66C2]",
      content: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>,
    },
    website: {
      bg: "bg-gray-500",
      content: <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
    },
  };

  const data = icons[platform] || icons.website;
  return (
    <div className={`w-9 h-9 ${data.bg} rounded-full flex items-center justify-center shrink-0`}>
      {data.content}
    </div>
  );
}


// ===== Yangilik detail modal =====
function NewsDetailModal({ item, onClose }: { item: NewsItem; onClose: () => void }) {
  // Modal ochilganda orqadagi sahifa scroll bo'lmasligi uchun body scroll ni bloklaymiz
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  function getEmbedUrl(url: string): string {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
    return match ? `https://www.youtube-nocookie.com/embed/${match[1]}?autoplay=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1` : url;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-md max-h-[85vh] rounded-2xl overflow-hidden flex flex-col shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900 truncate">{item.title}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Rasm */}
          {item.imageUrl && (
            <img src={item.imageUrl} alt={item.title} className="w-full max-h-56 object-cover" />
          )}

          {/* Video */}
          {item.type === "video" && item.videoUrl && (
            <div className="aspect-video bg-black">
              {item.videoUrl.includes("youtube") || item.videoUrl.includes("youtu.be") ? (
                <iframe
                  src={getEmbedUrl(item.videoUrl)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={item.videoUrl} controls autoPlay className="w-full h-full" />
              )}
            </div>
          )}

          {/* Matn */}
          {item.body && (
            <div className="px-5 py-4">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.body}</p>
            </div>
          )}

          {/* Ma'lumot */}
          <div className="px-5 py-3 border-t border-gray-100">
            <p className="text-[10px] text-gray-400">
              {new Date(item.createdAt).toLocaleDateString("uz-UZ", { year: "numeric", month: "long", day: "numeric" })}
              {item.duration && ` · ⏱ ${item.duration}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


