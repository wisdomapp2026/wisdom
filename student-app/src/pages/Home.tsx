import { Search, Bell, ChevronRight, Play } from "lucide-react";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="page-content">
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-500 rounded-xl flex items-center justify-center">
            <span className="text-white text-lg">⚡</span>
          </div>
          <span className="text-lg font-bold text-primary-500">EduKids</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-gray-400"><Search size={20} /></button>
          <button className="text-gray-400"><Bell size={20} /></button>
          <div className="w-8 h-8 bg-gray-200 rounded-full overflow-hidden">
            <img src="https://i.pravatar.cc/32?img=3" alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      {/* Banner */}
      <div className="mx-5 mt-4 bg-primary-500 rounded-2xl p-5 relative overflow-hidden">
        <h2 className="text-white text-lg font-bold leading-tight">Milliy sertifikatga<br/>tayyormisiz?</h2>
        <button className="mt-3 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg">Boshlash</button>
      </div>

      {/* Yangiliklar */}
      <section className="mt-6 px-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-gray-900">Yangiliklar</h3>
          <button className="text-sm text-primary-500 font-medium">Barchasi</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 scrollbar-hide">
          {[
            { title: "Milliy sertifikat TOP misollar", time: "03:45" },
            { title: "SAT matematikasi lifehack", time: "02:10" },
            { title: "Prezident maktabi tayyorlov", time: "05:20" },
          ].map((item, i) => (
            <div key={i} className="shrink-0 w-36">
              <div className="w-full h-24 bg-gray-800 rounded-xl flex items-center justify-center relative">
                <Play size={20} className="text-white" fill="white" />
                <span className="absolute bottom-1.5 right-2 text-[10px] text-white bg-black/60 px-1 rounded">{item.time}</span>
              </div>
              <p className="text-xs text-gray-700 font-medium mt-1.5 line-clamp-2">{item.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Kurslar */}
      <section className="mt-6 px-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-base font-bold text-gray-900">Kurslar</h3>
          <Link to="/courses" className="text-sm text-primary-500 font-medium">Barchasi</Link>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[
            { name: "Attestatsiya", students: "12.4k", progress: 65 },
            { name: "Milliy sertifikat", students: "8.2k", progress: 42 },
            { name: "Prezident maktabi", students: "15.6k", progress: 20 },
            { name: "Digital SAT", students: "3.1k", progress: 85 },
          ].map((c, i) => (
            <Link to={`/course/demo-boshlangich-matematika`} key={i} className="border border-gray-100 rounded-xl p-3.5 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 bg-primary-50 rounded-lg flex items-center justify-center mb-2">
                <span className="text-primary-500 font-bold">⚡</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{c.name}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">👥 {c.students} o'quvchi</p>
              <div className="flex items-center justify-between mt-2 text-[10px]">
                <span className="text-gray-400">Progress:</span>
                <span className="text-primary-500 font-semibold">{c.progress}%</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full mt-1">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${c.progress}%` }} />
              </div>
              <button className="w-full mt-3 border border-gray-200 rounded-lg py-1.5 text-xs font-medium text-gray-700">Davom ettirish</button>
            </Link>
          ))}
        </div>
      </section>

      {/* Davom etayotgan darslar */}
      <section className="mt-6 px-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">Davom etayotgan darslar</h3>
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center shrink-0">
            <span>📖</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">SAT Reading & Writing: Pa...</p>
            <p className="text-[10px] text-gray-500 mt-0.5">SO'NGGI DARS</p>
          </div>
          <button className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center shrink-0">
            <Play size={14} className="text-white ml-0.5" fill="white" />
          </button>
        </div>
      </section>

      {/* Kunlik motivatsiya */}
      <div className="mx-5 mt-6 bg-primary-500 rounded-2xl p-5 text-center">
        <span className="text-2xl">⭐</span>
        <p className="text-white font-bold mt-2">"Bugungi kichik harakat — ertangi<br/>katta natija 🔥"</p>
        <p className="text-white/60 text-xs mt-2">— Muvaffaqiyat formulasi</p>
      </div>

      {/* Premium imkoniyatlar */}
      <section className="mt-6 px-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">Premium imkoniyatlar</h3>
        <div className="grid grid-cols-4 gap-2.5">
          {[
            { icon: "🎬", label: "Video\nyechimlar" },
            { icon: "✅", label: "Professional\ntestlar" },
            { icon: "📊", label: "Progress\ntracking" },
            { icon: "🤖", label: "AI\ntavsiyalar" },
          ].map((item, i) => (
            <div key={i} className="flex flex-col items-center py-3 bg-gray-50 rounded-xl border border-gray-100">
              <span className="text-xl mb-1">{item.icon}</span>
              <span className="text-[9px] text-gray-600 text-center whitespace-pre-line leading-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
