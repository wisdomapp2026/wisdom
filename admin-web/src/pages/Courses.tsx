import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Users, BookOpen, Loader2 } from "lucide-react";
import { getAllCourses, getTopicsByCourse } from "@shared/repositories";
import { getStudentCountByCourse } from "@shared/repositories";
import type { Course } from "@shared/types";
import CreateCourseModal from "../components/CreateCourseModal";

interface CourseWithMeta extends Course {
  topicCount: number;
  studentCount: number;
}

export default function Courses() {
  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    try {
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
    } catch (err) {
      console.error("Kurslarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kurslar</h1>
          <p className="text-sm text-gray-500 mt-1">Barcha kurslarni boshqaring ({courses.length} ta)</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yangi kurs
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Kurslarni qidirish..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">
          <option>Barcha kategoriyalar</option>
          <option>Matematika</option>
          <option>Dasturlash</option>
          <option>Tillar</option>
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          <span className="ml-3 text-gray-500">Yuklanmoqda...</span>
        </div>
      )}

      {/* Courses grid */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
            >
              {/* Course image placeholder */}
              <div className="h-40 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <BookOpen className="w-12 h-12 text-white/80" />
              </div>

              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-primary-500 bg-primary-50 px-2 py-0.5 rounded-full">
                    {course.category}
                  </span>
                  {course.isPremium && (
                    <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">
                      Premium
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">{course.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-4">{course.description}</p>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {course.studentCount} o'quvchi
                  </span>
                  <span className="text-xs">
                    📚 {course.topicCount} mavzu
                  </span>
                </div>
              </div>
            </Link>
          ))}

          {/* Empty state */}
          {filteredCourses.length === 0 && !loading && (
            <div className="col-span-3 text-center py-20">
              <p className="text-6xl mb-4">📚</p>
              <p className="text-gray-500">Hech qanday kurs topilmadi</p>
            </div>
          )}
        </div>
      )}

      {/* Create course modal */}
      <CreateCourseModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={loadCourses}
      />
    </div>
  );
}
