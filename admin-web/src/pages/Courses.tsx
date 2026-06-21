import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Users, BookOpen, Loader2, Edit, Trash2 } from "lucide-react";
import { getAllCourses, getTopicsByCourse, getAllCategories, deleteCourse } from "@shared/repositories";
import { getStudentCountByCourse } from "@shared/repositories";
import type { Course, Category } from "@shared/types";
import CreateCourseModal from "../components/CreateCourseModal";
import LoadingButton from "../components/LoadingButton";

interface CourseWithMeta extends Course {
  topicCount: number;
  studentCount: number;
}

export default function Courses() {
  const [courses, setCourses] = useState<CourseWithMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");

  useEffect(() => {
    loadCourses();
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const cats = await getAllCategories();
      setCategories(cats);
    } catch (err) {
      console.error("Kategoriyalarni yuklashda xatolik:", err);
    }
  }

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

  async function handleDeleteCourse(course: CourseWithMeta) {
    if (!confirm(`"${course.title}" kursini o'chirishga ishonchingiz komilmi?\n\n⚠️ Barcha mavzular, testlar, papkalar ham o'chiriladi!`)) return;
    await deleteCourse(course.id);
    await loadCourses();
  }

  const filteredCourses = courses.filter(
    (c) =>
      (c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.category.toLowerCase().includes(searchQuery.toLowerCase())) &&
      (selectedCategory === "" || c.category === selectedCategory)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kurslar</h1>
          <p className="text-sm text-gray-500 mt-1">Barcha kurslarni boshqaring ({courses.length} ta)</p>
        </div>
        <button onClick={() => { setEditCourse(null); setShowCreateModal(true); }} className="btn-primary flex items-center gap-2">
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
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
        >
          <option value="">Barcha kategoriyalar</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>
              {cat.name}
            </option>
          ))}
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
            <div
              key={course.id}
              className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative group"
            >
              {/* Edit/Delete buttons — card ustiga hover qilganda ko'rinadi */}
              <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditCourse(course); setShowCreateModal(true); }}
                  className="w-8 h-8 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:text-blue-600 hover:border-blue-300 shadow-sm transition-colors"
                  title="Tahrirlash"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <LoadingButton
                  onClick={() => handleDeleteCourse(course)}
                  className="w-8 h-8 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-600 hover:border-red-300 shadow-sm"
                  title="O'chirish"
                  iconOnly
                >
                  <Trash2 className="w-4 h-4" />
                </LoadingButton>
              </div>

              <Link to={`/courses/${course.id}`} className="block">
                {/* Course image */}
                <div className="h-40 bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center overflow-hidden">
                  {course.coverImage ? (
                    <img
                      src={course.coverImage}
                      alt={course.title}
                      className="w-full h-full"
                      style={{ objectFit: course.coverFit || "cover", objectPosition: course.coverPosition || "50% 50%" }}
                    />
                  ) : (
                    <BookOpen className="w-12 h-12 text-white/80" />
                  )}
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
            </div>
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

      {/* Create/Edit course modal */}
      <CreateCourseModal
        open={showCreateModal}
        editCourse={editCourse}
        onClose={() => { setShowCreateModal(false); setEditCourse(null); }}
        onCreated={() => { loadCourses(); loadCategories(); }}
      />
    </div>
  );
}
