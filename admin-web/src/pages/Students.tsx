import { useState, useEffect } from "react";
import { Search, Loader2, Eye, Users, X, Edit, Key, BookOpen, FileText, CreditCard, Ban, Trash2, ShieldOff, Clock } from "lucide-react";
import { getAllStudents, getAllProgressByUser, getTestResultsByUser, getRecentPayments, updateUser, banUser, unbanUser, deleteUserCompletely, getTodayActiveStudents, getAllStudentActivities } from "@shared/repositories";
import type { User, UserProgress, TestResult, Payment, UserActivity } from "@shared/types";
import LoadingButton from "../components/LoadingButton";

export default function Students() {
  const [students, setStudents] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [activityMap, setActivityMap] = useState<Map<string, UserActivity>>(new Map());

  useEffect(() => {
    loadStudents();
  }, []);

  async function loadStudents() {
    try {
      const [data, activities] = await Promise.all([
        getAllStudents(),
        getAllStudentActivities(30), // oxirgi 30 kunlik faollik
      ]);
      setStudents(data);

      // Har bir o'quvchi uchun eng oxirgi faollik
      const map = new Map<string, UserActivity>();
      activities.forEach((a) => {
        const existing = map.get(a.userId);
        if (!existing || a.lastActiveAt > existing.lastActiveAt) {
          map.set(a.userId, a);
        }
      });
      setActivityMap(map);
    } catch (err) {
      console.error("O'quvchilarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.phone.includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">O'quvchilar</h1>
          <p className="text-sm text-gray-500 mt-1">Ro'yxatdan o'tgan barcha o'quvchilar ({students.length} ta)</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Ism yoki telefon raqam bo'yicha qidirish..."
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

      {/* Students table */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">O'quvchi</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Telefon</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Sinf</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Oxirgi faollik</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ro'yxatdan o'tgan</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amallar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {student.avatar ? (
                        <img src={student.avatar} alt={student.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${student.isBanned ? "bg-red-100" : "bg-primary-100"}`}>
                          <span className={`text-sm font-bold ${student.isBanned ? "text-red-600" : "text-primary-600"}`}>
                            {student.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 text-sm">{student.name}</p>
                          {student.isBanned && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">BAN</span>}
                        </div>
                        <p className="text-xs text-gray-500">{student.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{student.phone}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">{student.grade || "—"}</span>
                  </td>
                  <td className="px-6 py-4">
                    {(() => {
                      const activity = activityMap.get(student.id);
                      if (!activity) return <span className="text-sm text-gray-400">—</span>;
                      const isOnline = Date.now() - activity.lastActiveAt < 300000; // 5 daqiqa ichida
                      return (
                        <div>
                          {isOnline ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-600">
                              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                              Hozir online
                            </span>
                          ) : (
                            <span className="text-sm text-gray-600">
                              {new Date(activity.lastActiveAt).toLocaleDateString("uz-UZ")},{" "}
                              {new Date(activity.lastActiveAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {activity.totalMinutes < 1 ? "< 1 daq" : activity.totalMinutes < 60 ? `${activity.totalMinutes} daq` : `${Math.floor(activity.totalMinutes / 60)} soat ${activity.totalMinutes % 60} daq`}
                          </p>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {new Date(student.createdAt).toLocaleDateString("uz-UZ")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setSelectedStudent(student)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 font-medium"
                    >
                      <Eye className="w-4 h-4" /> Ko'rish
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredStudents.length === 0 && (
            <div className="text-center py-16">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {students.length === 0 ? "Hali o'quvchilar ro'yxatdan o'tmagan" : "Qidiruv bo'yicha topilmadi"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <StudentDetailModal
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
          onUpdated={loadStudents}
        />
      )}
    </div>
  );
}

// ===== Student Detail Modal =====
function StudentDetailModal({ student, onClose, onUpdated }: { student: User; onClose: () => void; onUpdated: () => void }) {
  const [activeTab, setActiveTab] = useState<"info" | "courses" | "tests" | "payments">("info");
  const [zoomAvatar, setZoomAvatar] = useState(false);
  const [progress, setProgress] = useState<UserProgress[]>([]);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Edit fields
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState(student.name);
  const [editPhone, setEditPhone] = useState(student.phone);
  const [editGrade, setEditGrade] = useState(student.grade || "");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleBan() {
    if (student.isBanned) {
      if (!confirm(`"${student.name}" ning banini yechmoqchimisiz?`)) return;
      await unbanUser(student.id);
    } else {
      if (!confirm(`"${student.name}" ni ban qilmoqchimisiz? O'quvchi tizimga kira olmaydi, lekin progressi saqlanadi.`)) return;
      await banUser(student.id);
    }
    onUpdated();
    onClose();
  }

  async function handleDelete() {
    if (!confirm(`"${student.name}" ni tizimdan TO'LIQ o'chirmoqchimisiz?\n\nBu qaytarib bo'lmaydi! Barcha ma'lumotlar (progress, test natijalari, to'lovlar) o'chiriladi.`)) return;
    if (!confirm("Rostdan ham o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi!")) return;
    await deleteUserCompletely(student.id);
    onUpdated();
    onClose();
  }

  useEffect(() => {
    loadStudentData();
  }, [student.id]);

  async function loadStudentData() {
    setLoadingData(true);
    try {
      const [prog, results] = await Promise.all([
        getAllProgressByUser(student.id),
        getTestResultsByUser(student.id),
      ]);
      setProgress(prog);
      setTestResults(results);
    } catch (err) {
      console.error("O'quvchi ma'lumotlarini yuklashda xatolik:", err);
    } finally {
      setLoadingData(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateUser(student.id, {
        name: editName,
        phone: editPhone,
        grade: editGrade || undefined,
      });
      // Parol o'zgartirish — hozircha qo'llab-quvvatlanmaydi
      if (newPassword) {
        // Firebase Auth parolni faqat user o'zi yoki Admin SDK orqali o'zgartirishi mumkin
        // Hozircha bu funksiya ishlamaydi
      }
      setEditMode(false);
      onUpdated();
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            {student.avatar ? (
              <button
                onClick={() => setZoomAvatar(true)}
                className="w-14 h-14 rounded-full overflow-hidden border-2 border-gray-200 hover:border-primary-400 transition-colors cursor-zoom-in"
                title="Rasmni kattalashtirish"
              >
                <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
              </button>
            ) : (
              <div className={`w-14 h-14 rounded-full flex items-center justify-center ${student.isBanned ? "bg-red-100" : "bg-primary-100"}`}>
                <span className={`text-xl font-bold ${student.isBanned ? "text-red-600" : "text-primary-600"}`}>{student.name.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">{student.name}</h2>
                {student.isBanned && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">🚫 BAN</span>}
              </div>
              <p className="text-sm text-gray-500">{student.phone} · {student.grade || "Sinf belgilanmagan"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Ban/Unban */}
            <LoadingButton
              onClick={handleBan}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${
                student.isBanned
                  ? "border-green-200 text-green-700 hover:bg-green-50"
                  : "border-red-200 text-red-700 hover:bg-red-50"
              }`}
              title={student.isBanned ? "Banni yechish" : "Ban qilish"}
            >
              {student.isBanned ? <ShieldOff className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
              {student.isBanned ? "Banni yechish" : "Ban qilish"}
            </LoadingButton>
            {/* Delete */}
            <LoadingButton
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-700 hover:bg-red-50"
              title="To'liq o'chirish"
            >
              <Trash2 className="w-3.5 h-3.5" /> O'chirish
            </LoadingButton>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex items-center gap-1 bg-gray-50 border-b border-gray-100">
          {[
            { id: "info", label: "Ma'lumotlar", icon: Edit },
            { id: "courses", label: "Kurslar", icon: BookOpen },
            { id: "tests", label: "Test natijalari", icon: FileText },
            { id: "payments", label: "To'lovlar", icon: CreditCard },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${
                activeTab === tab.id ? "bg-white text-gray-900 border border-gray-100 border-b-white -mb-px" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loadingData && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-primary-500 animate-spin" />
            </div>
          )}

          {/* Info tab */}
          {!loadingData && activeTab === "info" && (
            <div className="space-y-4">
              {!editMode ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <InfoField label="Ism" value={student.name} />
                    <InfoField label="Telefon" value={student.phone} />
                    <InfoField label="Sinf" value={student.grade || "—"} />
                    <InfoField label="Rol" value={student.role} />
                    <InfoField label="Ro'yxatdan o'tgan" value={new Date(student.createdAt).toLocaleString("uz-UZ")} />
                    <InfoField label="Oxirgi yangilanish" value={new Date(student.updatedAt).toLocaleString("uz-UZ")} />
                  </div>
                  <div className="pt-4 border-t border-gray-100">
                    <button onClick={() => setEditMode(true)} className="btn-primary text-sm flex items-center gap-2">
                      <Edit className="w-4 h-4" /> Tahrirlash
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ism</label>
                      <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                      <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sinf</label>
                      <input value={editGrade} onChange={(e) => setEditGrade(e.target.value)} placeholder="Masalan: 5-sinf" className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <span className="flex items-center gap-1"><Key className="w-3.5 h-3.5" /> Yangi parol</span>
                      </label>
                      <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Yangi parol kiriting..." className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4 border-t border-gray-100">
                    <LoadingButton onClick={handleSave} className="btn-primary text-sm">
                      Saqlash
                    </LoadingButton>
                    <button onClick={() => setEditMode(false)} className="btn-outline text-sm">Bekor</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Courses tab */}
          {!loadingData && activeTab === "courses" && (
            <div className="space-y-3">
              {progress.length === 0 && (
                <p className="text-center text-gray-400 py-8">Hali kurs progressi yo'q</p>
              )}
              {progress.map((p) => (
                <div key={p.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Kurs: {p.courseId}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {p.completedTopics.length} modul · {p.completedProblems.length} misol · {p.totalXP} XP
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-primary-500">{p.progressPercent}%</p>
                    <p className="text-[10px] text-gray-400">Progress</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tests tab */}
          {!loadingData && activeTab === "tests" && (
            <div className="space-y-3">
              {testResults.length === 0 && (
                <p className="text-center text-gray-400 py-8">Hali test natijalari yo'q</p>
              )}
              {testResults.map((r) => (
                <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">Test: {r.testId.slice(0, 20)}...</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.correctCount}/{r.totalQuestions} to'g'ri · {Math.round(r.timeTaken / 60)} daqiqa
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${r.score >= 80 ? "text-green-600" : r.score >= 60 ? "text-yellow-600" : "text-red-600"}`}>
                      {r.score}%
                    </p>
                    <p className="text-[10px] text-gray-400">Baho: {r.grade}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payments tab */}
          {!loadingData && activeTab === "payments" && (
            <div className="space-y-3">
              <p className="text-center text-gray-400 py-8">To'lovlar ma'lumoti keyingi versiyada qo'shiladi</p>
            </div>
          )}
        </div>
      </div>

      {/* Avatar zoom modal */}
      {zoomAvatar && student.avatar && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center cursor-zoom-out"
          onClick={() => setZoomAvatar(false)}
        >
          <img
            src={student.avatar}
            alt={student.name}
            className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setZoomAvatar(false)}
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-white/30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <p className="text-[10px] text-gray-500 uppercase font-medium">{label}</p>
      <p className="text-sm font-medium text-gray-900 mt-0.5">{value}</p>
    </div>
  );
}
