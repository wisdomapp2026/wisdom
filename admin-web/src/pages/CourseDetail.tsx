import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Lock, Unlock, ChevronRight, Loader2 } from "lucide-react";
import { getCourseById, getTopicsByCourse, getTestsByCourse, deleteCourse, updateCourse, updateTopic } from "@shared/repositories";
import { getStudentCountByCourse } from "@shared/repositories";
import type { Course, Topic, Test } from "@shared/types";
import CreateTopicModal from "../components/CreateTopicModal";

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [studentCount, setStudentCount] = useState(0);

  useEffect(() => {
    if (courseId) loadData(courseId);
  }, [courseId]);

  async function loadData(id: string) {
    try {
      const [c, t, te, sc] = await Promise.all([
        getCourseById(id),
        getTopicsByCourse(id),
        getTestsByCourse(id),
        getStudentCountByCourse(id),
      ]);
      setCourse(c);
      setTopics(t);
      setTests(te);
      setStudentCount(sc);
      if (c) { setEditTitle(c.title); setEditDesc(c.description); }
    } catch (err) {
      console.error("Xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-20 text-gray-500">Kurs topilmadi</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/courses" className="hover:text-primary-500">Kurslar</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{course.title}</span>
      </div>

      {/* Course header */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        {editingCourse ? (
          <div className="space-y-3">
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            <div className="flex gap-2">
              <button onClick={async () => { await updateCourse(courseId!, { title: editTitle, description: editDesc }); setCourse((p) => p ? { ...p, title: editTitle, description: editDesc } : p); setEditingCourse(false); }} className="btn-primary text-sm">Saqlash</button>
              <button onClick={() => setEditingCourse(false)} className="btn-outline text-sm">Bekor</button>
            </div>
          </div>
        ) : (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-gray-500 mt-1">{course.description}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span>📚 {topics.length} mavzu</span>
              <span>👥 {studentCount.toLocaleString()} o'quvchi</span>
              <span className={course.isPremium ? "text-yellow-600 font-medium" : "text-green-600 font-medium"}>
                {course.isPremium ? "Premium" : "Bepul"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Premium/Free toggle */}
            <button
              onClick={async () => { const v = !course.isPremium; await updateCourse(courseId!, { isPremium: v }); setCourse((p) => p ? { ...p, isPremium: v } : p); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${course.isPremium ? "border-green-200 text-green-700 hover:bg-green-50" : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"}`}
            >
              {course.isPremium ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {course.isPremium ? "Free qilish" : "Premium qilish"}
            </button>
            <button onClick={() => setEditingCourse(true)} className="btn-outline flex items-center gap-2 text-sm">
              <Edit className="w-4 h-4" />
              Tahrirlash
            </button>
            <button
              onClick={async () => {
                if (confirm("Kursni o'chirishga ishonchingiz komilmi?")) {
                  await deleteCourse(courseId!);
                  navigate("/courses");
                }
              }}
              className="btn-outline flex items-center gap-2 text-sm text-danger border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              O'chirish
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={() => setShowTopicModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Yangi mavzu qo'shish
        </button>
        <Link
          to={`/courses/${courseId}/tests/builder`}
          className="btn-outline flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Test yaratish
        </Link>
      </div>

      {/* Topics list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Mavzular ({topics.length})</h3>
        </div>
        <div className="divide-y divide-gray-50">
          {topics.map((topic) => (
            <div key={topic.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
              <Link
                to={`/courses/${courseId}/topics/${topic.id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm">
                  {topic.order}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{topic.title}</h4>
                    {topic.isPremium && <Lock className="w-3.5 h-3.5 text-yellow-500" />}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{topic.description}</p>
                </div>
              </Link>
              <div className="flex items-center gap-2 ml-2">
                <button
                  onClick={async () => {
                    const v = !topic.isPremium;
                    await updateTopic(courseId!, topic.id, { isPremium: v });
                    setTopics((prev) => prev.map((t) => t.id === topic.id ? { ...t, isPremium: v } : t));
                  }}
                  className={`text-[10px] font-medium px-2 py-1 rounded border ${topic.isPremium ? "border-yellow-200 text-yellow-600 bg-yellow-50 hover:bg-yellow-100" : "border-green-200 text-green-600 bg-green-50 hover:bg-green-100"}`}
                  title={topic.isPremium ? "Bosib Free qilish" : "Bosib Premium qilish"}
                >
                  {topic.isPremium ? "Premium" : "Free"}
                </button>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tests */}
      {tests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Testlar ({tests.length})</h3>
          <div className="space-y-3">
            {tests.map((test) => (
              <div key={test.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-gray-900">{test.title}</h4>
                    <p className="text-sm text-gray-500">
                      {test.questions?.length || 0} savol · {test.totalTime} daqiqa
                      {test.afterTopicOrder ? ` · ${test.afterTopicOrder}-mavzudan keyin` : " · Kurs oxirida"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      test.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                    }`}>
                      {test.status === "published" ? "Published" : "Draft"}
                    </span>
                    <Link
                      to={`/courses/${courseId}/tests/${test.id}/preview`}
                      className="text-sm text-primary-500 hover:underline"
                    >
                      Ko'rish →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create topic modal */}
      <CreateTopicModal
        open={showTopicModal}
        courseId={courseId!}
        existingCount={topics.length}
        onClose={() => setShowTopicModal(false)}
        onCreated={() => loadData(courseId!)}
      />
    </div>
  );
}
