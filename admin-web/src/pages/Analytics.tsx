import { useState, useEffect } from "react";
import { Users, BookOpen, FileText, DollarSign, TrendingUp, TrendingDown, Activity } from "lucide-react";
import { getAllCourses, getAllStudents, getRecentPayments, getStudentCountByCourse, getAllTestResults } from "@shared/repositories";
import type { Course, User, Payment, TestResult } from "@shared/types";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

interface AnalyticsData {
  totalStudents: number;
  totalCourses: number;
  totalTests: number;
  totalRevenue: number;
  students: User[];
  payments: Payment[];
  testResults: TestResult[];
  coursesWithStudents: { name: string; students: number }[];
}

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"7" | "30" | "90" | "all" | "month">("30");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [courses, students, payments, testResults] = await Promise.all([
        getAllCourses(),
        getAllStudents(),
        getRecentPayments(50),
        getAllTestResults(),
      ]);

      const coursesWithStudents = await Promise.all(
        courses.map(async (c) => ({
          name: c.title.length > 15 ? c.title.slice(0, 15) + "..." : c.title,
          students: await getStudentCountByCourse(c.id),
        }))
      );

      const totalRevenue = payments
        .filter((p) => p.status === "success")
        .reduce((sum, p) => sum + p.amount, 0);

      setData({
        totalStudents: students.length,
        totalCourses: courses.length,
        totalTests: testResults.length,
        totalRevenue,
        students,
        payments,
        testResults,
        coursesWithStudents,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!data) return null;

  // Sana filtrlash
  const now = Date.now();
  let rangeStart: number;
  let rangeEnd: number = now;

  if (dateRange === "month") {
    const [year, month] = selectedMonth.split("-").map(Number);
    rangeStart = new Date(year, month - 1, 1).getTime();
    rangeEnd = new Date(year, month, 0, 23, 59, 59).getTime();
  } else {
    const rangeMs = dateRange === "7" ? 7 * 86400000 : dateRange === "30" ? 30 * 86400000 : dateRange === "90" ? 90 * 86400000 : Infinity;
    rangeStart = rangeMs === Infinity ? 0 : now - rangeMs;
  }

  const filteredPayments = data.payments.filter((p) => p.createdAt >= rangeStart && p.createdAt <= rangeEnd);
  const filteredStudents = data.students.filter((s) => s.createdAt >= rangeStart && s.createdAt <= rangeEnd);
  const filteredTests = data.testResults.filter((t) => t.completedAt >= rangeStart && t.completedAt <= rangeEnd);

  // Kunlik o'quvchi registratsiyalari (oxirgi 7/30 kun)
  const dayCount = dateRange === "7" ? 7 : dateRange === "90" ? 12 : 10;
  const studentsByDay = Array.from({ length: dayCount }, (_, i) => {
    const dayStart = now - (dayCount - 1 - i) * 86400000;
    const dayEnd = dayStart + 86400000;
    const count = data.students.filter((s) => s.createdAt >= dayStart && s.createdAt < dayEnd).length;
    const date = new Date(dayStart);
    return { day: `${date.getDate()}/${date.getMonth() + 1}`, students: count };
  });

  // To'lovlar bo'yicha grafik
  const paymentsByDay = Array.from({ length: dayCount }, (_, i) => {
    const dayStart = now - (dayCount - 1 - i) * 86400000;
    const dayEnd = dayStart + 86400000;
    const total = data.payments
      .filter((p) => p.createdAt >= dayStart && p.createdAt < dayEnd && p.status === "success")
      .reduce((sum, p) => sum + p.amount, 0);
    const date = new Date(dayStart);
    return { day: `${date.getDate()}/${date.getMonth() + 1}`, amount: total / 1000 };
  });

  // Test natijalari taqsimoti
  const scoreDistribution = [
    { range: "0-30%", count: filteredTests.filter((t) => t.score <= 30).length, color: "#ef4444" },
    { range: "31-60%", count: filteredTests.filter((t) => t.score > 30 && t.score <= 60).length, color: "#f59e0b" },
    { range: "61-80%", count: filteredTests.filter((t) => t.score > 60 && t.score <= 80).length, color: "#3b82f6" },
    { range: "81-100%", count: filteredTests.filter((t) => t.score > 80).length, color: "#10b981" },
  ];

  const avgTestScore = filteredTests.length > 0
    ? Math.round(filteredTests.reduce((s, t) => s + t.score, 0) / filteredTests.length)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-gray-900">Statistikalar</h1>
          <p className="text-sm text-gray-500 mt-1">Platforma analitikasi va ko'rsatkichlari</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(["7", "30", "90", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                dateRange === r ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {r === "7" ? "7 kun" : r === "30" ? "30 kun" : r === "90" ? "90 kun" : "Barchasi"}
            </button>
          ))}
          {/* Oy tanlash */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setDateRange("month")}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                dateRange === "month" ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Oy
            </button>
            {dateRange === "month" && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Users className="w-5 h-5 text-blue-500" />} label="Yangi o'quvchilar" value={String(filteredStudents.length)} bg="bg-blue-50" trend={`+${filteredStudents.length}`} />
        <StatCard icon={<FileText className="w-5 h-5 text-orange-500" />} label="Ishlangan testlar" value={String(filteredTests.length)} bg="bg-orange-50" trend={`O'rtacha: ${avgTestScore}%`} />
        <StatCard icon={<DollarSign className="w-5 h-5 text-green-500" />} label="Daromad" value={`${(filteredPayments.filter(p => p.status === "success").reduce((s, p) => s + p.amount, 0) / 1000).toFixed(0)}k`} bg="bg-green-50" trend="so'm" />
        <StatCard icon={<Activity className="w-5 h-5 text-purple-500" />} label="Jami kurslar" value={String(data.totalCourses)} bg="bg-purple-50" trend={`${data.coursesWithStudents.reduce((s, c) => s + c.students, 0)} o'quvchi`} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* O'quvchilar o'sishi */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">📈 Yangi o'quvchilar dinamikasi</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={studentsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Area type="monotone" dataKey="students" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daromad dinamikasi */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">💰 Daromad dinamikasi (ming so'm)</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="amount" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Second Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kurs mashurligi */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">📚 Kurslar bo'yicha o'quvchilar</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.coursesWithStudents} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="students" fill="#6366f1" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Test natija taqsimoti */}
        <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">🎯 Test natijalar taqsimoti</h3>
          <div className="h-44 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={scoreDistribution} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="count" label={({ range }) => range}>
                  {scoreDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            {scoreDistribution.map((item) => (
              <div key={item.range} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-gray-600">{item.range}: {item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* So'nggi to'lovlar jadvali */}
      <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h3 className="font-semibold text-gray-900">💳 So'nggi to'lovlar</h3>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Qidirish..."
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100 bg-gray-50">
                <th className="text-left px-4 py-3 font-medium">Foydalanuvchi</th>
                <th className="text-left px-4 py-3 font-medium">Kurs</th>
                <th className="text-left px-4 py-3 font-medium">Summa</th>
                <th className="text-left px-4 py-3 font-medium">Usul</th>
                <th className="text-left px-4 py-3 font-medium">Holat</th>
                <th className="text-left px-4 py-3 font-medium">Sana</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments
                .filter((p) => !searchQuery || p.userName.toLowerCase().includes(searchQuery.toLowerCase()) || p.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()))
                .slice(0, 10)
                .map((p) => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.userName}</td>
                  <td className="px-4 py-3 text-gray-600 truncate max-w-[150px]">{p.courseTitle}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">{p.amount.toLocaleString()} so'm</td>
                  <td className="px-4 py-3"><span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{p.method}</span></td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      p.status === "success" ? "bg-green-100 text-green-700" : p.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                    }`}>
                      {p.status === "success" ? "✓" : p.status === "pending" ? "⏳" : "✗"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(p.createdAt).toLocaleDateString("uz")}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredPayments.length === 0 && (
            <p className="text-center text-gray-400 py-8">Tanlangan davr uchun to'lov topilmadi</p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, bg, trend }: { icon: React.ReactNode; label: string; value: string; bg: string; trend: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center`}>{icon}</div>
        <span className="text-xs text-gray-500">{trend}</span>
      </div>
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
