import {
  Users,
  TrendingUp,
  UserPlus,
  DollarSign,
  Wallet,
  Trophy,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
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

// Demo stats (Firestore dan olinadi keyinchalik)
const stats = [
  { label: "FAOL FOYDALANUVCHILAR", value: "12,480", change: "+12%", icon: Users, positive: true },
  { label: "BUGUNGI KIRISHLAR", value: "1,240", change: "+5%", icon: TrendingUp, positive: true },
  { label: "YANGI OBUNALAR", value: "45", change: "-2%", icon: UserPlus, positive: false },
  { label: "KUNLIK DAROMAD", value: "4.2 mln", change: "+18%", icon: DollarSign, positive: true },
  { label: "OYLIK TUSHUM", value: "128 mln", change: "+24%", icon: Wallet, positive: true },
  { label: "JAMI TUSHUM", value: "1.2 mlrd", change: "+42%", icon: Wallet, positive: true },
  { label: "ENG MASHXUR KURS", value: "Matematika", change: "Top 1", icon: Trophy, positive: true },
];

// Revenue chart data
const revenueData = [
  { month: "Yan", daromad: 800, students: 1200 },
  { month: "Fev", daromad: 1200, students: 1800 },
  { month: "Mar", daromad: 2800, students: 2400 },
  { month: "Apr", daromad: 3200, students: 3000 },
  { month: "May", daromad: 4500, students: 4200 },
  { month: "Iyn", daromad: 5200, students: 5800 },
];

// Pie chart data
const courseDistribution = [
  { name: "Matematika", value: 60, color: "#2196F3" },
  { name: "Ingliz tili", value: 25, color: "#4CAF50" },
  { name: "Fizika", value: 15, color: "#FF9800" },
];

// Recent payments
const recentPayments = [
  { name: "Azizov Bekzod", amount: "450,000 UZS", time: "12:45", status: "Muvaffaqiyatli" },
  { name: "Karimova Malika", amount: "120,000 UZS", time: "11:20", status: "Muvaffaqiyatli" },
  { name: "Saidov Jamshid", amount: "250,000 UZS", time: "10:15", status: "Kutilmoqda" },
  { name: "Toshpulatova Dilnoza", amount: "600,000 UZS", time: "09:30", status: "Muvaffaqiyatli" },
  { name: "Ismoilov Otabek", amount: "320,000 UZS", time: "Kecha", status: "Muvaffaqiyatli" },
];

// New users
const newUsers = [
  { name: "Alisher Navoiy", role: "O'quvchi" },
  { name: "Zuhra Berdiyeva", role: "O'quvchi" },
  { name: "Jasur Umarov", role: "O'quvchi" },
  { name: "Sitora O'aniyeva", role: "Mentor" },
  { name: "Bobur Mirzo", role: "O'quvchi" },
];

// Recent courses
const recentCourses = [
  { title: "Full Stack Development", students: 120, status: "Tahrirlash" },
  { title: "English for Kids", students: 450, status: "Tahrirlash" },
  { title: "Mental Arifmetika", students: 85, status: "Tahrirlash" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Xayrli kun, Javohir!</h1>
          <p className="text-sm text-gray-500 mt-1">
            Platformadagi bugungi asosiy ko'rsatkichlar va yangilanishlar bilan tanishing.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-outline text-sm">Oxirgi 7 kun</button>
          <button className="btn-outline text-sm">Oxirgi 30 kun</button>
          <button className="btn-primary text-sm">Hisobotni yuklash</button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-7 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-primary-500" />
              <span
                className={`text-xs font-medium flex items-center gap-0.5 ${
                  stat.positive ? "text-success" : "text-danger"
                }`}
              >
                {stat.positive ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {stat.change}
              </span>
            </div>
            <p className="text-xs text-gray-500 uppercase">{stat.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="col-span-2 bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Daromad va O'quvchilar o'sishi</h3>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-primary-500 rounded-full"></span>
                Daromad (Mln)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-gray-300 rounded-full"></span>
                O'quvchilar
              </span>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="daromad"
                  stroke="#2196F3"
                  fill="#2196F3"
                  fillOpacity={0.1}
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="students"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.05}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Course distribution pie */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-2">Kurslar mashurligi</h3>
          <p className="text-xs text-gray-500 mb-4">Obuna bo'lgan fanlar ulushi</p>
          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={courseDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                >
                  {courseDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {courseDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                <span className="text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">⚡ Tezkor amallar</h3>
          <div className="space-y-2">
            {[
              { icon: "📚", label: "Yangi kurs" },
              { icon: "📝", label: "Mavzu qo'shish" },
              { icon: "✅", label: "Test yaratish" },
              { icon: "🏷️", label: "Promo kod yaratish" },
              { icon: "🎥", label: "Video yuklash" },
            ].map((action) => (
              <button
                key={action.label}
                className="w-full flex items-center gap-3 px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                <span>{action.icon}</span>
                <span className="font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent payments */}
        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">So'nggi to'lovlar</h3>
            <button className="text-xs text-primary-500 hover:underline">To'lovlar tarixi</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Foydalanuvchi</th>
                <th className="text-left pb-2 font-medium">Summa</th>
                <th className="text-left pb-2 font-medium">Vaqt</th>
                <th className="text-left pb-2 font-medium">Holat</th>
              </tr>
            </thead>
            <tbody>
              {recentPayments.map((p, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="py-2 font-medium text-gray-900">{p.name}</td>
                  <td className="py-2 text-gray-600">{p.amount}</td>
                  <td className="py-2 text-gray-500">{p.time}</td>
                  <td className="py-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === "Muvaffaqiyatli"
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right column: new users + recent courses */}
        <div className="space-y-6">
          {/* New users */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Yangi foydalanuvchilar</h3>
              <span className="text-xs text-gray-400">:</span>
            </div>
            <div className="space-y-3">
              {newUsers.map((u, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.role}</p>
                    </div>
                  </div>
                  <button className="text-xs text-primary-500 font-medium">Profil</button>
                </div>
              ))}
            </div>
            <button className="w-full text-center text-sm text-primary-500 font-medium mt-4 hover:underline">
              Barchasini ko'rish
            </button>
          </div>

          {/* Recent courses */}
          <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">So'nggi kurslar</h3>
            <div className="space-y-3">
              {recentCourses.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-16 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{c.title}</p>
                    <p className="text-xs text-gray-500">{c.students} o'quvchi</p>
                  </div>
                  <button className="text-xs text-primary-500">{c.status}</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
