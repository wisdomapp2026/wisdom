import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Search as SearchIcon, BookOpen, Folder, FileText, X } from "lucide-react";
import { getAllCourses, getTopicsByCourse, getFoldersByCourse } from "@shared/repositories";
import { cachedFetch } from "../hooks/useCache";
import type { Course, Topic, Folder as FolderType } from "@shared/types";

interface SearchItem {
  id: string;
  type: "course" | "folder" | "topic";
  title: string;
  subtitle?: string;
  link: string;
  icon: React.ReactNode;
}

export default function Search() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [allItems, setAllItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllSearchData();
    // Avtomatik fokus
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  async function loadAllSearchData() {
    try {
      const courses = await cachedFetch("all-courses", getAllCourses);
      const items: SearchItem[] = [];

      // Kurslar
      for (const course of courses) {
        if (course.isHidden) continue;
        items.push({
          id: course.id,
          type: "course",
          title: course.title,
          subtitle: course.category || "",
          link: `/course/${course.id}`,
          icon: <BookOpen size={16} className="text-primary-500" />,
        });

        // Modullar va mavzular parallel
        const [folders, topics] = await Promise.all([
          cachedFetch(`folders-${course.id}`, () => getFoldersByCourse(course.id)).catch(() => [] as FolderType[]),
          cachedFetch(`topics-${course.id}`, () => getTopicsByCourse(course.id)).catch(() => [] as Topic[]),
        ]);

        // Modullar
        for (const folder of folders) {
          if (folder.isHidden) continue;
          items.push({
            id: folder.id,
            type: "folder",
            title: folder.title,
            subtitle: course.title,
            link: `/course/${course.id}/folder/${folder.id}`,
            icon: <Folder size={16} className="text-orange-500" />,
          });
        }

        // Mavzular
        for (const topic of topics) {
          if (topic.isHidden) continue;
          items.push({
            id: topic.id,
            type: "topic",
            title: topic.title,
            subtitle: course.title,
            link: `/course/${course.id}/topic/${topic.id}`,
            icon: <FileText size={16} className="text-green-500" />,
          });
        }
      }

      setAllItems(items);
    } catch (err) {
      console.error("Qidiruv ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  // Qidiruv natijalari
  const results = query.trim()
    ? allItems.filter((item) =>
        item.title.toLowerCase().includes(query.toLowerCase()) ||
        (item.subtitle || "").toLowerCase().includes(query.toLowerCase())
      ).slice(0, 20)
    : [];

  return (
    <div className="page-content bg-white min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-gray-500 shrink-0">
            <ChevronLeft size={22} />
          </button>
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 gap-2.5">
            <SearchIcon size={18} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Kurs, modul yoki mavzuni qidiring..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-gray-400 active:text-gray-600">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Bo'sh holat — hali yozmagan */}
      {!loading && !query.trim() && (
        <div className="px-5 pt-8 text-center">
          <SearchIcon size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-sm text-gray-500">Kurs, modul yoki mavzu nomini yozing</p>
          <p className="text-xs text-gray-400 mt-1">
            {allItems.length} ta element topildi ({allItems.filter(i => i.type === "course").length} kurs, {allItems.filter(i => i.type === "folder").length} modul, {allItems.filter(i => i.type === "topic").length} mavzu)
          </p>
        </div>
      )}

      {/* Natija topilmadi */}
      {!loading && query.trim() && results.length === 0 && (
        <div className="px-5 pt-8 text-center">
          <p className="text-3xl mb-2">🔍</p>
          <p className="text-sm text-gray-500">"{query}" bo'yicha natija topilmadi</p>
          <p className="text-xs text-gray-400 mt-1">Boshqa so'z bilan qidirib ko'ring</p>
        </div>
      )}

      {/* Natijalar */}
      {!loading && results.length > 0 && (
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 mb-3">{results.length} ta natija</p>
          <div className="space-y-1">
            {results.map((item) => (
              <Link
                key={`${item.type}-${item.id}`}
                to={item.link}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                <div className="w-9 h-9 bg-gray-50 rounded-xl flex items-center justify-center shrink-0 border border-gray-100">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                  {item.subtitle && (
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.subtitle}</p>
                  )}
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  item.type === "course" ? "bg-primary-50 text-primary-600" :
                  item.type === "folder" ? "bg-orange-50 text-orange-600" :
                  "bg-green-50 text-green-600"
                }`}>
                  {item.type === "course" ? "Kurs" : item.type === "folder" ? "Modul" : "Mavzu"}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
