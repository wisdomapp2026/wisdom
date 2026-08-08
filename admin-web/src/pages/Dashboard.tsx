import {
  Users,
  TrendingUp,
  UserPlus,
  DollarSign,
  BookOpen,
  Trophy,
  ArrowUp,
  Activity,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getAllCourses, getAllStudents, getRecentPayments, getStudentCountByCourse } from "@shared/repositories";
import type { Course, User, Payment } from "@shared/types";
import StudentActivityModal from "../components/StudentActivityModal";
import { supabase } from "@shared/supabase";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardData {
  totalStudents: number;
  totalCourses: number;
  recentStudents: User[];
  recentPayments: Payment[];
  coursesWithStudents: { course: Course; students: number }[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityModalOpen, setActivityModalOpen] = useState(false);
  const [adminName, setAdminName] = useState("Admin");

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setAdminName(user.user_metadata?.name || user.user_metadata?.displayName || "Admin");
      }
    });
  }, []);

  async function loadDashboard() {
    try {
      const [courses, students, payments] = await Promise.all([
        getAllCourses(),
        getAllStudents(),
        getRecentPayments(5),
      ]);

      const coursesWithStudents = await Promise.all(
        courses.slice(0, 5).map(async (c) => {
          const count = await getStudentCountByCourse(c.id);
          return { course: c, students: count };
        })
      );

      setData({
        totalStudents: students.length,
        totalCourses: courses.length,
        recentStudents: students.slice(0, 5),
        recentPayments: payments,
        coursesWithStudents,
      });
    } catch (err) {
      console.error("Dashboard yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  function downloadReport() {
    if (!data) return;

    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // CSV hisobot yaratish
    const lines: string[] = [];
    lines.push("EduKids — Dashboard Hisoboti");
    lines.push(`Sana: ${dateStr}`);
    lines.push("");
    lines.push("=== UMUMIY STATISTIKA ===");
    lines.push(`Jami o'quvchilar,${data.totalStudents}`);
    lines.push(`Jami kurslar,${data.totalCourses}`);
    lines.push(`Jami tushum (so'm),${totalRevenue}`);
    lines.push(`Top kurs,${topCourse?.course.title || "-"}`);
    lines.push("");
    lines.push("=== KURSLAR BO'YICHA ===");
    lines.push("Kurs nomi,Kategoriya,O'quvchilar soni,Premium");
    for (const item of data.coursesWithStudents) {
      lines.push(`"${item.course.title}","${item.course.category}",${item.students},${item.course.isPremium ? "Ha" : "Yo'q"}`);
    }
    lines.push("");
    lines.push("=== SO'NGGI TO'LOVLAR ===");
    lines.push("Foydalanuvchi,Summa (so'm),Holat,Sana");
    for (const p of data.recentPayments) {
      const d = new Date(p.createdAt);
      lines.push(`"${p.userName}",${p.amount},${p.status},${d.toLocaleDateString("uz")}`);
    }
    lines.push("");
    lines.push("=== SO'NGGI O'QUVCHILAR ===");
    lines.push("Ism,Telefon,Ro'yxatdan o'tgan");
    for (const s of data.recentStudents) {
      const d = new Date(s.createdAt);
      lines.push(`"${s.name}","${s.phone}",${d.toLocaleDateString("uz")}`);
    }

    // Faylni yuklab olish
    const csvContent = "\uFEFF" + lines.join("\n"); // BOM — Excel uchun UTF-8 kodlash
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `edukids-hisobot-${dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  const totalRevenue = data?.recentPayments
    .filter((p) => p.status === "success")
    .reduce((sum, p) => sum + p.amount, 0) || 0;

  const topCourse = data?.coursesWithStudents.sort((a, b) => b.students - a.students)[0];

  // Chart data — real kurslar asosida
  const courseDistribution = data?.coursesWithStudents.map((item, i) => ({
    name: item.course.category || item.course.title,
    value: item.students || 1,
    color: ["#2196F3", "#4CAF50", "#FF9800", "#9C27B0", "#F44336"][i % 5],
  })) || [];

  // Revenue data — faqat haqiqiy to'lovlar asosida ko'rsatiladi
  const revenueData = [
    { month: "So'nggi", daromad: totalRevenue > 0 ? totalRevenue / 1000 : 0, students: data?.totalStudents || 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Xayrli kun, {adminName}!</h1>
          <p className="text-sm text-gray-500 mt-1">Platformadagi bugungi asosiy ko'rsatkichlar va yangilanishlar bilan tanishing.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button onClick={() => setActivityModalOpen(true)} className="btn-outline text-sm flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-green-500" /> Faollik
          </button>
          <button className="btn-outline text-sm">Oxirgi 7 kun</button>
          <button onClick={downloadReport} className="btn-primary text-sm">Hisobotni yuklash</button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Jami o'quvchilar" value={String(data?.totalStudents || 0)} bg="bg-blue-50" />
        <StatCard icon={<BookOpen className="w-5 h-5 text-green-500" />} label="Jami kurslar" value={String(data?.totalCourses || 0)} bg="bg-green-50" />
        <StatCard icon={<DollarSign className="w-5 h-5 text-yellow-500" />} label="Jami tushum" value={totalRevenue > 0 ? `${(totalRevenue / 1000).toFixed(0)}k so'm` : "0"} bg="bg-yellow-50" />
        <StatCard icon={<Trophy className="w-5 h-5 text-purple-500" />} label="Top kurs" value={topCourse?.course.title || "—"} bg="bg-purple-50" small />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm min-w-0">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="font-semibold text-gray-900">Daromad va O'quvchilar o'sishi</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary-500 rounded-full"></span>Daromad</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-300 rounded-full"></span>O'quvchilar</span>
            </div>
          </div>
          <div className="h-52 lg:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="daromad" stroke="#2196F3" fill="#2196F3" fillOpacity={0.1} strokeWidth={2} />
                <Area type="monotone" dataKey="students" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.05} strokeWidth={1.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course distribution pie */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-2">Kurslar mashurligi</h3>
          <p className="text-xs text-gray-500 mb-4">O'quvchilar ulushi</p>
          <div className="h-40 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={courseDistribution} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value">
                  {courseDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {courseDistribution.map((item, i) => (
              <div key={`${item.name}-${i}`} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                <span className="text-gray-600 truncate">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">⚡ Tezkor amallar</h3>
          <div className="space-y-2">
            {[
              { icon: "📚", label: "Yangi kurs", to: "/courses" },
              { icon: "📝", label: "Mavzu qo'shish", to: "/courses" },
              { icon: "✅", label: "Test yaratish", to: "/tests/builder" },
              { icon: "🏷️", label: "Promo kod yaratish", to: "/promos" },
              { icon: "🎥", label: "Video yuklash", to: "/courses" },
            ].map((action) => (
              <Link key={action.label} to={action.to} className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                <span>{action.icon}</span>
                <span className="font-medium">{action.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* So'nggi to'lovlar */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">So'nggi to'lovlar</h3>
            <Link to="/payments" className="text-xs text-primary-500 hover:underline">To'lovlar tarixi</Link>
          </div>
          {data?.recentPayments && data.recentPayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[300px]">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-100">
                    <th className="text-left pb-2 font-medium">Foydalanuvchi</th>
                    <th className="text-left pb-2 font-medium">Summa</th>
                    <th className="text-left pb-2 font-medium">Holat</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-50">
                      <td className="py-2 font-medium text-gray-900">{p.userName}</td>
                      <td className="py-2 text-gray-600 whitespace-nowrap">{p.amount.toLocaleString()} so'm</td>
                      <td className="py-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                          p.status === "success" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {p.status === "success" ? "Muvaffaqiyatli" : "Kutilmoqda"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">Hali to'lov yo'q</p>
          )}
        </div>

        {/* O'ng ustun */}
        <div className="space-y-6">
          {/* Yangi foydalanuvchilar */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Yangi foydalanuvchilar</h3>
              <Link to="/students" className="text-xs text-primary-500 hover:underline">Barchasini ko'rish</Link>
            </div>
            {data?.recentStudents && data.recentStudents.length > 0 ? (
              <div className="space-y-3">
                {data.recentStudents.map((u) => (
                  <div key={u.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 text-xs font-bold shrink-0">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{u.name}</p>
                        <p className="text-xs text-gray-500">O'quvchi</p>
                      </div>
                    </div>
                    <Link to="/students" className="text-xs text-primary-500 font-medium">Profil</Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Hali o'quvchi yo'q</p>
            )}
          </div>

          {/* So'nggi kurslar */}
          <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">So'nggi kurslar</h3>
            {data?.coursesWithStudents && data.coursesWithStudents.length > 0 ? (
              <div className="space-y-3">
                {data.coursesWithStudents.slice(0, 3).map(({ course, students }) => (
                  <div key={course.id} className="flex items-center gap-3">
                    <div className="w-12 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                      <p className="text-xs text-gray-500">{students} o'quvchi</p>
                    </div>
                    <Link to={`/courses/${course.id}`} className="text-xs text-primary-500 shrink-0">Tahrirlash</Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Hali kurs yo'q</p>
            )}
          </div>
        </div>
      </div>

      {/* O'quvchilarning faolligi modali */}
      <StudentActivityModal isOpen={activityModalOpen} onClose={() => setActivityModalOpen(false)} />
    </div>
  );
}

function StatCard({ icon, label, value, bg, small }: { icon: React.ReactNode; label: string; value: string; bg: string; small?: boolean }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className={`font-bold text-gray-900 mt-1 ${small ? "text-sm truncate" : "text-xl"}`}>{value}</p>
    </div>
  );
}
