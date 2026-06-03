import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { getAllCourses } from "@shared/repositories";
import type { Course } from "@shared/types";

const categories = ["All", "In Progress", "Academic", "Language"];

export default function Courses() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllCourses().then((data) => {
      setCourses(data);
      setLoading(false);
    }).catch((err) => {
      console.error("Kurslarni yuklashda xato:", err);
      setLoading(false);
    });
  }, []);

  // Agar Firestore'dan kurslar bo'sh bo'lsa, demo ko'rsatamiz
  const displayCourses = courses.length > 0 ? courses : [
    { id: "demo-boshlangich-matematika", title: "Boshlang'ich Matematika", description: "Matematika asoslari: arifmetika, geometriya va algebraning boshlang'ich tushunchalari.", category: "Matematika", tags: ["Boshlang'ich"], isPremium: false, totalStudents: 1240, progress: 65 },
  ] as any[];

  const icons: Record<string, string> = { Matematika: "📋", "Ona tili": "📚", "Ingliz tili": "🌐", Dasturlash: "💻", default: "⭐" };
  const colors: Record<string, string> = { Matematika: "#2196F3", "Ona tili": "#4CAF50", "Ingliz tili": "#9C27B0", Dasturlash: "#FF9800", default: "#F44336" };

  return (
    <div className="page-content">
      <header className="px-5 pt-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Kurslar</h1>
        <button className="text-gray-400">⋮</button>
      </header>

      {/* Search */}
      <div className="mx-5 mt-3 flex items-center bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
        <span className="text-gray-400 mr-2">🔍</span>
        <input placeholder="Search your courses..." className="flex-1 bg-transparent text-sm outline-none" />
        <button className="text-gray-400">⚙️</button>
      </div>

      {/* Categories */}
      <div className="px-5 mt-4">
        <p className="text-[11px] font-semibold text-gray-400 uppercase mb-2">Categories</p>
        <div className="flex gap-2 overflow-x-auto">
          {categories.map((c, i) => (
            <button key={c} onClick={() => setActiveCategory(c)} className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium ${activeCategory === c ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"}`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Section */}
      <div className="px-5 mt-5 flex justify-between items-center">
        <h2 className="text-lg font-bold text-gray-900">Mening kurslarim</h2>
        <span className="text-sm text-primary-500 font-medium">{displayCourses.length} ta kurs</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Course list */}
      <div className="px-5 mt-3 space-y-3">
        {displayCourses.map((course) => {
          const color = colors[course.category] || colors.default;
          const icon = icons[course.category] || icons.default;
          return (
            <Link to={`/course/${course.id}`} key={course.id} className="block border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "15" }}>
                  <span className="text-2xl">{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-900 truncate">{course.title}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full ml-2 shrink-0" style={{ backgroundColor: color + "15", color }}>{course.category}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    {course.isPremium && <span className="text-yellow-600 font-medium">Premium</span>}
                    {!course.isPremium && <span className="text-green-600 font-medium">Bepul</span>}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                  <div className="flex items-center mt-2.5">
                    <span className="text-[11px] text-gray-400">⏱ Jarayonda</span>
                    <div className="flex-1 h-1 bg-gray-100 rounded-full mx-3">
                      <div className="h-full bg-primary-500 rounded-full" style={{ width: `${course.progress || 0}%` }} />
                    </div>
                    <span className="text-[11px] font-semibold text-primary-500">{course.progress || 0}%</span>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Tip */}
      <div className="mx-5 mt-5 bg-blue-50 rounded-xl p-4 flex items-center gap-3">
        <span className="text-xl">💡</span>
        <p className="text-sm text-blue-800">"Har kuni tashlangan kichik qadamlar katta yutuqlarga olib keladi. Siz ajoyib natija ko'rsatyapsiz!"</p>
      </div>
    </div>
  );
}
