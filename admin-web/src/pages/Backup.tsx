import { Database, ShieldCheck, RefreshCw, ExternalLink, Download } from "lucide-react";

export default function Backup() {
  const backupDate = new Date();
  
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ma'lumotlar zaxirasi (Backups)</h1>
        <p className="text-sm text-gray-500 mt-1">Loyihaning ma'lumotlar bazasi va fayllar xavfsizligini boshqarish</p>
      </div>

      {/* Main Info Card */}
      <div className="bg-gradient-to-br from-primary-500 to-blue-600 rounded-3xl p-6 md:p-8 text-white shadow-lg border border-primary-400/20 relative overflow-hidden">
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-10 translate-y-10 scale-150">
          <Database size={240} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur rounded-full text-xs font-semibold">
              <ShieldCheck size={14} className="text-green-300" />
              TIZIM HIMOYA OSTIDA
            </div>
            <h2 className="text-2xl md:text-3xl font-bold">Avtomatik Bulutli Zaxira</h2>
            <p className="text-white/80 text-sm max-w-xl leading-relaxed">
              EduKids platformasi endi <strong>Supabase</strong> (PostgreSQL) bulutli texnologiyasiga o'tkazildi. 
              Barcha ma'lumotlar bazasi va media fayllar har kuni avtomatik ravishda xavfsiz serverlarga zaxiralanadi.
            </p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 shrink-0 flex flex-col items-center justify-center text-center w-full md:w-56">
            <div className="w-10 h-10 bg-green-400/20 rounded-full flex items-center justify-center mb-2">
              <div className="w-4 h-4 bg-green-400 rounded-full animate-ping" />
            </div>
            <p className="text-xs text-white/70">Zaxira holati</p>
            <p className="text-lg font-bold mt-0.5 text-green-300">Faol (Active)</p>
            <p className="text-[10px] text-white/50 mt-1">Keyingi zaxiralash: 24 soat ichida</p>
          </div>
        </div>
      </div>

      {/* Backup Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* DB Backup */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Ma'lumotlar bazasi zaxirasi</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              PostgreSQL ma'lumotlar bazasining kunlik to'liq SQL zaxiralari avtomatik ravishda Supabase tomonidan boshqariladi. 
              Zaxiralar 7 kun davomida saqlanadi.
            </p>
          </div>
          <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Tizim: Supabase PG Admin</span>
            <a 
              href="https://supabase.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1 hover:underline"
            >
              Supabase Dashboard <ExternalLink size={12} />
            </a>
          </div>
        </div>

        {/* Media Backup */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">Fayllar va Rasmlar (Storage)</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Barcha o'quv materiallari, darsliklar va foydalanuvchi rasmlari Supabase S3-mos Storage tizimida joylashgan bo'lib, 
              avtomatik replikatsiya orqali yo'qolishdan himoyalangan.
            </p>
          </div>
          <div className="pt-6 mt-6 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs text-gray-400">Tizim: Supabase Storage</span>
            <a 
              href="https://supabase.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary-500 hover:text-primary-600 flex items-center gap-1 hover:underline"
            >
              Media papkalar <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Manual Export Info */}
      <div className="bg-amber-50 rounded-2xl border border-amber-100 p-6">
        <h4 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
          <span>💡</span> Qo'shimcha ma'lumot
        </h4>
        <p className="text-sm text-amber-700 leading-relaxed">
          Agar sizga ma'lumotlar bazasining qo'lda olingan nusxasi (SQL dump) kerak bo'lsa yoki yangi loyihaga ko'chirmoqchi bo'lsangiz, 
          buni Supabase boshqaruv paneli orqali amalga oshirishingiz mumkin. Bu SQL import/export ni xatoliklarsiz kafolatlaydi.
        </p>
      </div>
    </div>
  );
}
