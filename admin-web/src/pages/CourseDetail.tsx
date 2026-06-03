import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Lock, ChevronRight, Loader2 } from "lucide-react";
import { getCourseById, getTopicsByCourse, getTestsByCourse, deleteCourse } from "@shared/repositories";
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

  useEffect(() => {
    if (courseId) loadData(courseId);
  }, [courseId]);

  async function loadData(id: string) {
    try {
      const [c, t, te] = await Promise.all([
        getCourseById(id),
        getTopicsByCourse(id),
        getTestsByCourse(id),
      ]);
      setCourse(c);
      setTopics(t);
      setTests(te);
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
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-gray-500 mt-1">{course.description}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span>📚 {topics.length} mavzu</span>
              <span>👥 {(course.totalStudents || 0).toLocaleString()} o'quvchi</span>
              <span>✅ Har {course.testAfterEvery} darsdan keyin test</span>
              <span className={course.isPremium ? "text-yellow-600 font-medium" : "text-green-600 font-medium"}>
                {course.isPremium ? "Premium" : "Bepul"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn-outline flex items-center gap-2 text-sm">
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
            <Link
              key={topic.id}
              to={`/courses/${courseId}/topics/${topic.id}`}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm">
                  {topic.order}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900">{topic.title}</h4>
                    {topic.isPremium && <Lock className="w-3.5 h-3.5 text-yellow-500" />}
                  </div>
                  <p className="text-sm text-gray-500">{topic.description}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </Link>
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
