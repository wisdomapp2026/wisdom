import { Search, Bell, ChevronRight, Play, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { getAllCourses, getTopicsByCourse, getMotivationPhrases, getMotivationSettings, getAllProgressByUser, getCourseById, getTopicById, getAllSocialLinks } from "@shared/repositories";
import { getStudentCountByCourse } from "@shared/repositories";
import type { Course, UserProgress, Topic, SocialLink } from "@shared/types";
import { useAuth } from "../hooks/useAuth";
import { HomeLoader } from "../components/PageLoader";

interface CourseWithMeta extends Course {
  topicCount: number;
  studentCount: number;
}

interface ContinueItem {
  progress: UserProgress;
  course: Course;
  currentTopic: Topic | null;
}

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [motivationPhrase, setMotivationPhrase] = useState("Bugungi kichik harakat — ertangi katta natija 🔥");
  const [continueItems, setContinueItems] = useState<ContinueItem[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    loadAll();
  }, [user, authLoading]);

  async function loadAll() {
    setLoading(true);
    try {
      await Promise.all([
        loadCourses(),
        loadHomeMotivation(),
        loadContinueItems(),
        loadSocialLinks(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function loadCourses() {
    const data = await getAllCourses();
    const withMeta = await Promise.all(
      data.map(async (c) => {
        const [topics, students] = await Promise.all([
          getTopicsByCourse(c.id),
          getStudentCountByCourse(c.id),
        ]);
        return { ...c, topicCount: topics.length, studentCount: students };
      })
    );
    setCourses(withMeta);
  }

  async function loadSocialLinks() {
    try {
      const allLinks = await getAllSocialLinks();
      setSocialLinks(allLinks.filter((l) => l.isActive));
    } catch (err) {
      // ixtiyoriy
    }
  }

  async function loadContinueItems() {
    if (!user) return;
    try {
      const allProgress = await getAllProgressByUser(user.uid);
      if (allProgress.length === 0) return;

      const sorted = [...allProgress].sort((a, b) => (b.lastAccessedAt || 0) - (a.lastAccessedAt || 0));
      const items: ContinueItem[] = [];

      for (const prog of sorted.slice(0, 3)) {
        const course = await getCourseById(prog.courseId);
        if (!course) continue;
        let currentTopic: Topic | null = null;
        if (prog.currentTopicId) {
          currentTopic = await getTopicById(prog.courseId, prog.currentTopicId);
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
        getMotivationPhrases("home"),
        getMotivationSettings("home"),
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
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">⚡</span>
          </div>
          <span className="text-lg font-bold text-primary-500">EduKids</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-gray-400"><Search size={20} /></button>
          <Link to="/notifications" className="text-gray-400"><Bell size={20} /></Link>
          <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
            <img src="https://i.pravatar.cc/32?img=3" alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="mx-5 mt-4 bg-primary-500 rounded-2xl p-5 relative overflow-hidden">
        <h2 className="text-white text-lg font-bold leading-tight">Milliy sertifikatga<br/>tayyormisiz?</h2>
        <button className="mt-3 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg">Boshlash</button>
      </div>

      {/* Yangiliklar */}
      <section className="mt-6 px-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-gray-900">Yangiliklar</h3>
          <button className="text-sm text-primary-500 font-medium">Barchasi</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {[
            { title: "Milliy sertifikat TOP misollar", time: "03:45" },
            { title: "SAT matematikasi lifehack", time: "02:10" },
            { title: "Prezident maktabi tayyorlov", time: "05:20" },
          ].map((item, i) => (
            <div key={i} className="shrink-0 w-36">
              <div className="w-full h-24 bg-gray-800 rounded-xl flex items-center justify-center relative">
                <Play size={20} className="text-white" fill="white" />
                <span className="absolute bottom-1.5 right-2 text-[10px] text-white bg-black/60 px-1 rounded">{item.time}</span>
              </div>
              <p className="text-xs text-gray-700 font-medium mt-1.5 line-clamp-2">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Kurslar */}
      <section className="mt-6 px-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-gray-900">Kurslar</h3>
          <Link to="/courses" className="text-sm text-primary-500 font-medium">Barchasi</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(courses.length > 0 ? courses : [
            { id: "demo-boshlangich-matematika", title: "Yuklanmoqda...", topicCount: 0, studentCount: 0, category: "Matematika" },
          ] as any[]).slice(0, 4).map((c: any, i: number) => (
            <Link to={`/course/${c.id}`} key={i} className="border border-gray-100 rounded-xl p-3.5 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center mb-2">
                <span className="text-primary-500 font-bold">⚡</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{c.title}</p>
              <p className="text-[11px] text-gray-500 mt-1">📚 {c.topicCount} mavzu · 👥 {c.studentCount} o'quvchi</p>
              <div className="flex items-center justify-between mt-2 text-[10px]">
                <span className="text-gray-400">Progress:</span>
                <span className="text-primary-500 font-semibold">{c.progress || 0}%</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full mt-1">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${c.progress || 0}%` }} />
              </div>
              <button className="w-full mt-3 border border-gray-200 rounded-lg py-1.5 text-xs font-medium text-gray-700">Davom ettirish</button>
            </Link>
          ))}
        </div>
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

      {/* Premium imkoniyatlar */}
      <section className="mt-6 px-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">Premium imkoniyatlar</h3>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { label: "Video\nyechimlar", bgColor: "bg-red-500", icon: <Play size={18} className="text-white" fill="white" /> },
            { label: "Professional\ntestlar", bgColor: "bg-green-500", icon: <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 11l3 3L22 4" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { label: "Progress\ntracking", bgColor: "bg-blue-500", icon: <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 20V10M12 20V4M6 20v-6" strokeLinecap="round" strokeLinejoin="round"/></svg> },
            { label: "AI\ntavsiyalar", bgColor: "bg-purple-500", icon: <svg className="w-[18px] h-[18px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2"/><circle cx="9" cy="12" r="1" fill="white"/><circle cx="15" cy="12" r="1" fill="white"/><path d="M9 16h6" strokeLinecap="round"/><path d="M3 8h2M19 8h2M3 16h2M19 16h2" strokeLinecap="round"/></svg> },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center py-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className={`w-11 h-11 ${item.bgColor} rounded-full flex items-center justify-center mb-2.5`}>
                {item.icon}
              </div>
              <span className="text-[10px] text-gray-600 text-center whitespace-pre-line leading-tight font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Ijtimoiy tarmoqlar */}
      {socialLinks.length > 0 && (
        <section className="mt-6 px-5 pb-6">
          <h3 className="text-base font-bold text-gray-900 mb-3">Ijtimoiy tarmoqlar</h3>
          <div className="flex flex-wrap gap-3">
            {socialLinks.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 px-4 py-3 bg-white border border-gray-100 rounded-2xl hover:shadow-md active:bg-gray-50 transition-all"
              >
                <SocialIcon platform={link.platform} iconUrl={link.iconUrl} />
                <span className="text-sm font-medium text-gray-700">{link.label}</span>
              </a>
            ))}
          </div>
        </section>
      )}
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

  const icons: Record<string, { bg: string; content: JSX.Element }> = {
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
