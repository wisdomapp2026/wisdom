import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Users,
  Trophy,
  Sparkles,
  Play,
  Star,
  Newspaper,
  GraduationCap,
  Download,
  Smartphone,
} from "lucide-react";
import { supabase } from "@shared/supabase";
import {
  getAllCourses,
  getTopicsByCourse,
  getMotivationPhrases,
  getMotivationSettings,
  getAllProgressByUser,
  getCourseById,
  getTopicById,
  getAllSocialLinks,
  getUserById,
  getActiveBanners,
  getActiveNewsItems,
  getActiveTestimonials,
  getStudentCountByCourse,
} from "@shared/repositories";
import type {
  Course,
  UserProgress,
  Topic,
  SocialLink,
  HomeBanner,
  NewsItem,
  Testimonial,
} from "@shared/types";
import { useAuth } from "../../hooks/useAuth";
import { cachedFetch } from "../../hooks/useCache";
import { getLocalProgress } from "../../hooks/useLocalProgress";
import BannerCarousel from "../components/BannerCarousel";
import CourseCard, { CourseCardSkeleton, type CourseCardData } from "../components/CourseCard";
import NewsCard, { NewsModal } from "../components/NewsCard";
import SocialLinksRow from "../components/SocialLinksRow";
import {
  SectionHeading,
  GhostLink,
  StatCard,
  EmptyState,
  Reveal,
  HScroller,
  Chip,
  ProgressBar,
  Skeleton,
} from "../components/ui";

interface ContinueItem {
  progress: UserProgress;
  course: Course;
  currentTopic: Topic | null;
}

/**
 * Desktop bosh sahifa.
 *
 * Ma'lumot yuklash mantiqi mobil `Home.tsx` bilan bir xil (bir xil repository
 * funksiyalari va bir xil kesh kalitlari) — faqat taqdimot (layout) boshqa.
 */
export default function DesktopHome() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [courses, setCourses] = useState<CourseCardData[]>([]);
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [motivation, setMotivation] = useState("Bugungi kichik harakat — ertangi katta natija 🔥");
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [apkUrl, setApkUrl] = useState("");

  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;

    (async () => {
      const hasCache = localStorage.getItem("edukids_cache_all-courses") !== null;
      if (!hasCache) setLoading(true);

      await Promise.all([
        loadCourses(cancelled),
        loadBanners(),
        loadNews(),
        loadTestimonials(),
        loadSocial(),
        loadContinue(),
        loadMotivation(),
        loadApkUrl(),
      ]);

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  useEffect(() => {
    if (!user) return;
    cachedFetch(`user-${user.uid}`, () => getUserById(user.uid))
      .then((u) => u?.name && setUserName(u.name.split(" ")[0]))
      .catch(() => {});
  }, [user?.uid]);

  async function loadCourses(cancelled: boolean) {
    try {
      const data = await cachedFetch("all-courses", getAllCourses);
      const homepage = data.filter((c) => !c.isHidden && c.showOnHomepage !== false).slice(0, 12);

      // Progress xaritasi — login yoki mehmon
      const progressMap: Record<string, string[]> = {};
      if (user) {
        const all = await cachedFetch(`progress-${user.uid}`, () => getAllProgressByUser(user.uid));
        for (const p of all) progressMap[p.courseId] = p.completedTopics || [];
      } else {
        for (const [courseId, p] of Object.entries(getLocalProgress())) {
          progressMap[courseId] = p.completedTopics || [];
        }
      }

      const withMeta = await Promise.all(
        homepage.map(async (c) => {
          const [topics, students] = await Promise.all([
            cachedFetch(`topics-${c.id}`, () => getTopicsByCourse(c.id)),
            cachedFetch(`students-${c.id}`, () => getStudentCountByCourse(c.id)),
          ]);
          const completed = progressMap[c.id] || [];
          const valid = completed.filter((id) => topics.some((t) => t.id === id));
          const progress = topics.length > 0 ? Math.round((valid.length / topics.length) * 100) : 0;
          return { ...c, topicCount: topics.length, studentCount: students, progress: Math.min(100, progress) };
        })
      );
      if (!cancelled) setCourses(withMeta);
    } catch (err) {
      console.error("Kurslarni yuklashda xatolik:", err);
    }
  }

  async function loadBanners() {
    try {
      setBanners(await getActiveBanners());
    } catch {}
  }

  async function loadNews() {
    try {
      setNewsItems(await getActiveNewsItems());
    } catch {}
  }

  async function loadTestimonials() {
    try {
      setTestimonials(await getActiveTestimonials());
    } catch {}
  }

  async function loadSocial() {
    try {
      const links = await cachedFetch("social-links", getAllSocialLinks);
      setSocialLinks(links.filter((l) => l.isActive));
    } catch {}
  }

  async function loadContinue() {
    if (!user) return;
    try {
      const all = await cachedFetch(`progress-${user.uid}`, () => getAllProgressByUser(user.uid), 30_000);
      if (all.length === 0) return;
      const sorted = [...all].sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));
      const items: ContinueItem[] = [];
      for (const prog of sorted.slice(0, 4)) {
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

  async function loadMotivation() {
    try {
      const [phrases, settings] = await Promise.all([
        cachedFetch("motivation-home", () => getMotivationPhrases("home")),
        cachedFetch("motivation-settings-home", () => getMotivationSettings("home")),
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

  async function loadApkUrl() {
    try {
      const { data } = await supabase.from("settings").select("value").eq("key", "platform").maybeSingle();
      const url = (data?.value as any)?.apkUrl;
      if (url) setApkUrl(url);
    } catch {}
  }

  // Umumiy statistika
  const totalTopics = courses.reduce((s, c) => s + (c.topicCount || 0), 0);
  const totalStudents = courses.reduce((s, c) => s + (c.studentCount || 0), 0);
  const avgRating =
    testimonials.length > 0
      ? (testimonials.reduce((s, t) => s + t.rating, 0) / testimonials.length).toFixed(1)
      : "—";

  if (loading) return <HomeSkeleton />;

  return (
    <div className="space-y-14">
      {/* ===== Salomlashuv ===== */}
      <section className="relative overflow-hidden rounded-[28px] px-9 py-9 lg:px-12 lg:py-11">
        {/* Fon — nozik gradient + naqsh */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--theme-primary) 6%, var(--theme-card-bg)) 0%, var(--theme-card-bg) 55%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              "radial-gradient(circle, color-mix(in srgb, var(--theme-primary) 18%, transparent) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            maskImage: "linear-gradient(to right, black, transparent 70%)",
          }}
        />
        <span className="absolute -top-20 right-0 w-72 h-72 rounded-full bg-primary-500/10 blur-3xl" />
        <div className="absolute inset-0 rounded-[28px]" style={{ boxShadow: "inset 0 0 0 1px var(--dk-border)" }} />

        <div className="relative z-10 flex items-end justify-between gap-8 flex-wrap">
          <div>
            <p className="text-[13px] font-semibold text-primary-600 uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={14} /> {greeting()}
            </p>
            <h1 className="text-[38px] font-extrabold tracking-tight text-gray-900 leading-tight mt-1.5">
              {userName ? (
                <>
                  Salom, <span className="dk-gradient-text">{userName}</span>!
                </>
              ) : (
                <>
                  Bilim olishni <span className="dk-gradient-text">boshlaymiz</span>
                </>
              )}
            </h1>
            <p className="text-[15px] text-gray-500 mt-2 max-w-2xl">{motivation}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {apkUrl && (
              <a
                href={apkUrl}
                download
                className="dk-press inline-flex items-center gap-2.5 px-5 py-3.5 rounded-2xl text-sm font-bold transition-colors shrink-0"
                style={{ backgroundColor: "var(--theme-card-bg)", border: "1px solid var(--dk-border)", color: "var(--theme-text)" }}
              >
                <span className="w-8 h-8 rounded-xl bg-green-500/10 grid place-items-center text-green-600 shrink-0">
                  <Smartphone size={16} />
                </span>
                <span className="flex flex-col items-start leading-tight">
                  <span className="text-[10px] font-semibold text-gray-400">Android uchun</span>
                  <span className="flex items-center gap-1">Ilovani yuklab olish <Download size={13} /></span>
                </span>
              </a>
            )}
            {!user && (
              <Link
                to="/register"
                className="dk-press inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-bold shadow-lg shadow-primary-500/25 transition-colors shrink-0"
              >
                <GraduationCap size={17} /> Ro'yxatdan o'tish
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ===== Bannerlar ===== */}
      {banners.length > 0 && (
        <Reveal>
          <BannerCarousel banners={banners} />
        </Reveal>
      )}

      {/* ===== Statistika ===== */}
      <Reveal>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 dk-stagger">
          <StatCard icon={<BookOpen size={20} />} label="Mavjud kurslar" value={String(courses.length)} tone="primary" />
          <StatCard icon={<Newspaper size={20} />} label="Jami mavzular" value={String(totalTopics)} tone="purple" />
          <StatCard
            icon={<Users size={20} />}
            label="O'quvchilar"
            value={totalStudents.toLocaleString()}
            tone="green"
          />
          <StatCard icon={<Trophy size={20} />} label="O'rtacha reyting" value={avgRating} tone="amber" />
        </div>
      </Reveal>

      {/* ===== Davom etayotgan darslar ===== */}
      {continueItems.length > 0 && (
        <Reveal>
          <section>
            <SectionHeading
              title="Davom etayotgan darslar"
              subtitle="To'xtagan joyingizdan davom ettiring"
              icon={<Play size={18} fill="currentColor" />}
              action={<GhostLink to="/continue">Barchasi</GhostLink>}
            />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 dk-stagger">
              {continueItems.map((item) => {
                const pct = Math.min(100, item.progress.progressPercent || 0);
                return (
                  <button
                    key={item.course.id}
                    onClick={() =>
                      item.currentTopic
                        ? navigate(`/course/${item.course.id}/topic/${item.currentTopic.id}`)
                        : navigate(`/course/${item.course.id}`)
                    }
                    className="dk-card dk-card-hover group p-6 flex items-center gap-5 text-left"
                  >
                    <span className="w-16 h-16 rounded-3xl grid place-items-center shrink-0 bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/25 text-2xl">
                      📖
                    </span>
                    <span className="flex-1 min-w-0">
                      <Chip tone="primary" className="mb-2">
                        So'nggi dars
                      </Chip>
                      <span className="block text-[16px] font-bold text-gray-900 dk-clamp-1 group-hover:text-primary-600 transition-colors">
                        {item.currentTopic?.title || item.course.title}
                      </span>
                      <span className="block text-[12.5px] text-gray-400 dk-clamp-1 mt-0.5">
                        {item.course.title}
                      </span>
                      <span className="block mt-3">
                        <ProgressBar value={pct} height={6} />
                      </span>
                    </span>
                    <span className="w-12 h-12 rounded-full grid place-items-center shrink-0 bg-primary-500 text-white shadow-lg shadow-primary-500/30 transition-transform group-hover:scale-110">
                      <Play size={17} fill="currentColor" className="ml-0.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        </Reveal>
      )}

      {/* ===== Yangiliklar ===== */}
      {newsItems.length > 0 && (
        <Reveal>
          <section>
            <SectionHeading
              title="Yangiliklar"
              subtitle="Platformadagi so'nggi e'lonlar va videolar"
              icon={<Newspaper size={18} />}
              action={<GhostLink to="/news">Barchasi</GhostLink>}
            />
            <HScroller itemWidth={380} ariaLabel="Yangiliklar">
              {newsItems.map((item) => (
                <NewsCard key={item.id} item={item} onOpen={setSelectedNews} />
              ))}
            </HScroller>
          </section>
        </Reveal>
      )}

      {/* ===== Kurslar ===== */}
      <Reveal>
        <section>
          <SectionHeading
            title="Kurslar"
            subtitle="Sizga tavsiya etilgan o'quv kurslari"
            icon={<BookOpen size={18} />}
            action={<GhostLink to="/courses">Barcha kurslar</GhostLink>}
          />
          {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 dk-stagger">
              {courses.map((c, i) => (
                <CourseCard key={c.id} course={c} priority={i < 3} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Hozircha kurslar mavjud emas"
              hint="Tez orada yangi kurslar qo'shiladi. Keyinroq qayta tekshirib ko'ring."
            />
          )}
        </section>
      </Reveal>

      {/* ===== Motivatsiya bloki ===== */}
      <Reveal>
        <section
          className="relative overflow-hidden rounded-[28px] px-10 md:px-14 py-12 md:py-16"
          style={{
            background:
              "radial-gradient(circle at 15% 20%, color-mix(in srgb, var(--theme-primary) 70%, #6366f1) 0%, transparent 45%), linear-gradient(135deg, var(--theme-primary) 0%, color-mix(in srgb, var(--theme-primary) 45%, #4338ca) 60%, #312e81 100%)",
          }}
        >
          {/* Nozik nuqta-panel naqsh */}
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: "radial-gradient(circle, #fff 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          {/* Dekorativ nurlar */}
          <span className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-white/10 blur-2xl dk-anim-float" />
          <span
            className="absolute -bottom-28 -left-16 w-72 h-72 rounded-full bg-indigo-400/20 blur-2xl dk-anim-float"
            style={{ animationDelay: "1.6s" }}
          />
          {/* Yumshoq shisha effektli chegara */}
          <div className="absolute inset-0 rounded-[28px] ring-1 ring-white/15" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 md:gap-10 max-w-5xl mx-auto">
            {/* Icon badge */}
            <div className="shrink-0 relative">
              <span className="absolute inset-0 rounded-[22px] bg-white/25 blur-md" />
              <span className="relative w-20 h-20 rounded-[22px] grid place-items-center bg-white/15 backdrop-blur-md ring-1 ring-white/30 shadow-2xl">
                <Sparkles size={30} className="text-yellow-300" strokeWidth={2.2} />
              </span>
            </div>

            {/* Matn */}
            <div className="flex-1 text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/20 text-white/80 text-[11px] font-bold uppercase tracking-widest">
                <Star size={11} className="fill-current" />
                Muvaffaqiyat formulasi
              </span>
              <p
                className="text-white font-bold leading-snug mt-4"
                style={{ fontSize: "clamp(19px, 1.7vw, 26px)" }}
              >
                “{motivation}”
              </p>
            </div>
          </div>
        </section>
      </Reveal>

      {/* ===== Otzivlar ===== */}
      {testimonials.length > 0 && (
        <Reveal>
          <section>
            <SectionHeading
              title="O'quvchilar fikri"
              subtitle={`${testimonials.length} ta izoh · o'rtacha ${avgRating} yulduz`}
              icon={<Star size={18} fill="currentColor" />}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 dk-stagger">
              {testimonials.slice(0, 6).map((t) => (
                <TestimonialCard key={t.id} testimonial={t} />
              ))}
            </div>
          </section>
        </Reveal>
      )}

      {/* ===== Ijtimoiy tarmoqlar ===== */}
      {socialLinks.length > 0 && (
        <Reveal>
          <SocialLinksRow links={socialLinks} />
        </Reveal>
      )}

      {/* Yangilik modali */}
      {selectedNews && <NewsModal item={selectedNews} onClose={() => setSelectedNews(null)} />}
    </div>
  );
}

/* ============================================================
   Otziv kartochkasi
   ============================================================ */
function TestimonialCard({ testimonial: t }: { testimonial: Testimonial }) {
  return (
    <article className="dk-card dk-card-hover p-7 relative overflow-hidden flex flex-col">
      <svg
        className="absolute -top-2 right-3 w-20 h-20 text-primary-50"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" />
      </svg>

      <div className="flex items-center gap-0.5 relative z-10">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            size={15}
            className={s <= t.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}
          />
        ))}
      </div>

      <p className="text-[14.5px] text-gray-700 leading-[1.75] mt-4 flex-1 dk-clamp-4 relative z-10">"{t.text}"</p>

      <div
        className="flex items-center gap-3.5 mt-6 pt-5"
        style={{ borderTop: "1px solid var(--dk-border)" }}
      >
        <span className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 shrink-0 ring-2 ring-white shadow-md">
          {t.avatarUrl ? (
            <img src={t.avatarUrl} alt="" loading="lazy" className="w-full h-full object-cover" />
          ) : (
            <span className="w-full h-full grid place-items-center bg-gradient-to-br from-primary-400 to-primary-600 text-white text-base font-bold">
              {t.name.charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-bold text-gray-900 truncate">{t.name}</span>
          {t.role && <span className="block text-[11.5px] text-gray-400 truncate mt-0.5">{t.role}</span>}
        </span>
      </div>
    </article>
  );
}

/* ============================================================
   Yuklanish skeleti
   ============================================================ */
function HomeSkeleton() {
  return (
    <div className="space-y-14">
      <div className="space-y-3">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-4 w-2/3 max-w-xl" />
      </div>
      <Skeleton className="rounded-[28px]" style={{ height: "clamp(320px, 34vw, 460px)" }} />
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-[20px]" />
        ))}
      </div>
      <div>
        <Skeleton className="h-7 w-56 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Xayrli tong";
  if (h < 18) return "Xayrli kun";
  return "Xayrli kech";
}
