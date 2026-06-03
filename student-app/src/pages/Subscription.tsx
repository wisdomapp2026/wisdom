import { Link } from "react-router-dom";
import { X } from "lucide-react";

export default function Subscription() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-5 pt-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center"><span className="text-white text-sm">⚡</span></div>
          <span className="font-bold text-gray-900">EduPremium</span>
        </div>
        <Link to="/" className="text-gray-400"><X size={22} /></Link>
      </header>

      <div className="px-6 mt-6 flex flex-col items-center">
        {/* Course image */}
        <div className="w-24 h-24 bg-gray-200 rounded-2xl flex items-center justify-center"><span className="text-3xl">🎓</span></div>
        <span className="bg-gray-200 text-gray-600 text-xs font-medium px-3 py-1 rounded-full mt-3">Premium Tanlov</span>
        <h1 className="text-xl font-bold text-gray-900 mt-3">Milliy sertifikat kursi</h1>
        <p className="text-sm text-gray-500 text-center mt-1">O'z bilimingizni tasdiqlang va yangi<br/>cho'qqilarni zabt eting.</p>

        {/* Price */}
        <div className="w-full bg-primary-500 rounded-2xl py-5 text-center mt-6">
          <p className="text-white/70 text-xs uppercase">Oylik to'lov</p>
          <p className="text-white text-3xl font-bold mt-1">50 000 so'm <span className="text-base font-normal">/ oy</span></p>
        </div>

        {/* Trust */}
        <div className="w-full flex justify-between mt-4">
          <span className="text-xs text-gray-500 flex items-center gap-1">💳 Xavfsiz to'lov tizimi</span>
          <span className="text-xs text-green-600 font-semibold flex items-center gap-1">🏷️ FAOL CHEGIRMA</span>
        </div>

        {/* Benefits */}
        <div className="w-full mt-8">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-4">Siz nimalarga ega bo'lasiz?</p>
          {[
            { icon: "📚", title: "Barcha darslar", desc: "Ekspertlar tomonidan tayyorlangan barcha o'quv modullariga to'liq kirish." },
            { icon: "✅", title: "Testlar", desc: "Haqiqiy imtihon darajasidagi 500+ dan ortiq interaktiv testlar." },
            { icon: "🎬", title: "Video yechimlar", desc: "Har bir qiyin masalaning batafsil video tushuntirishlari." },
          ].map((b, i) => (
            <div key={i} className="flex items-start gap-4 mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0"><span className="text-lg">{b.icon}</span></div>
              <div><p className="font-semibold text-gray-900">{b.title}</p><p className="text-xs text-gray-500 mt-0.5">{b.desc}</p></div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <Link to="/payment" className="w-full bg-primary-500 text-white font-bold py-4 rounded-xl text-center flex items-center justify-center gap-2 mt-4">
          Obuna bo'lish <span>›</span>
        </Link>
        <Link to="/" className="text-sm text-gray-500 mt-4 mb-6">Keyinroq davom etish</Link>
        <p className="text-[10px] text-gray-400 text-center mb-8">Obuna bo'lish orqali siz foydalanish shartlari va maxfiylik siyosatiga rozilik bildirasiz.</p>
      </div>
    </div>
  );
}
