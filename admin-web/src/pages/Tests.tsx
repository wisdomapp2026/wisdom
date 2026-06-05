import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, FileText, Clock, CheckCircle, Loader2 } from "lucide-react";
import { getAllCourses, getTestsByCourse } from "@shared/repositories";
import type { Course, Test } from "@shared/types";

interface TestWithCourse extends Test {
  courseName: string;
}

export default function Tests() {
  const [tests, setTests] = useState<TestWithCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadTests();
  }, []);

  async function loadTests() {
    try {
      const courses = await getAllCourses();
      const allTests: TestWithCourse[] = [];
      for (const course of courses) {
        const courseTests = await getTestsByCourse(course.id);
        for (const t of courseTests) {
          allTests.push({ ...t, courseName: course.title });
        }
      }
      setTests(allTests);
    } catch (err) {
      console.error("Testlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredTests = tests.filter(
    (t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           t.courseName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Testlar</h1>
          <p className="text-sm text-gray-500 mt-1">Barcha testlarni boshqaring ({tests.length} ta)</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Yangi test
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Testlarni qidirish..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      )}

      {/* Tests list */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Test nomi</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Kurs</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Savollar</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Vaqt</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Holat</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredTests.map((test) => (
                <tr key={test.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center">
                        <FileText className="w-4 h-4 text-primary-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{test.title}</p>
                        {test.description && <p className="text-xs text-gray-500 truncate max-w-xs">{test.description}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{test.courseName}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 font-medium">{test.questions?.length || 0} ta</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {test.totalTime} daq
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      test.status === "published"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {test.status === "published" ? "Chop etilgan" : "Qoralama"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/courses/${test.courseId}/tests/${test.id}/preview`}
                      className="text-sm text-primary-500 font-medium hover:underline"
                    >
                      Ko'rish →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredTests.length === 0 && !loading && (
            <div className="text-center py-16">
              <p className="text-4xl mb-3">✅</p>
              <p className="text-gray-500">Hech qanday test topilmadi</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
