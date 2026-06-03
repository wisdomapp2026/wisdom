import { Link } from "react-router-dom";
import { X } from "lucide-react";

export default function PremiumGate() {
  return (
    <div className="min-h-screen bg-gray-500/50 flex flex-col">
      {/* Header */}
      <header className="px-5 pt-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center"><span className="text-white text-sm">⚡</span></div>
          <span className="font-bold text-primary-500">EduPlatform</span>
        </div>
        <Link to="/" className="text-gray-400"><X size={22} /></Link>
      </header>

      {/* Modal card */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl w-full p-8 text-center shadow-xl">
          {/* Lock icon */}
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center relative">
            <span className="text-3xl">🔒</span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded">Yopiq</span>
          </div>

          <h2 className="text-xl font-bold mt-4">Bu dars pullik</h2>
          <p className="text-sm text-gray-500 mt-2">To'liq kirish uchun obuna bo'ling va barcha<br/>materiallardan foydalaning.</p>

          {/* Plan */}
          <div className="bg-gray-50 rounded-xl p-4 mt-6 border border-gray-200 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"><span className="text-primary-500">📚</span></div>
              <div>
                <p className="font-bold text-gray-900">Milliy sertifikat kursi</p>
                <p className="text-xs text-gray-500">Ona tili va adabiyot fanidan milliy sertifikat imtihoniga tayyorlovchi</p>
              </div>
            </div>
            <div className="flex items-baseline mt-3">
              <span className="text-xs text-gray-500">NARXI</span>
              <span className="text-xl font-bold text-primary-500 ml-3">50 000 so'm</span>
              <span className="text-sm text-gray-400"> / oy</span>
            </div>
          </div>

          {/* Buttons */}
          <Link to="/subscription" className="block w-full bg-primary-500 text-white font-bold py-4 rounded-xl mt-6 flex items-center justify-center gap-2">
            💳 Obuna bo'lish
          </Link>
          <Link to="/" className="block w-full border border-gray-200 text-gray-700 font-medium py-4 rounded-xl mt-3">
            Bekor qilish
          </Link>
          <Link to="/" className="text-sm text-gray-500 mt-4 inline-block">Davom ettirish ›</Link>

          {/* Trust */}
          <div className="flex justify-center gap-4 mt-6 text-xs text-gray-400">
            <span>🛡️ Xavfsiz to'lov</span>
            <span>📞 24/7 Yordam</span>
          </div>
        </div>
      </div>

      <p className="text-[10px] text-gray-300 text-center px-6 pb-6">Obuna bo'lish orqali siz foydalanish shartlari va maxfiylik siyosatiga rozilik bildirasiz.</p>
    </div>
  );
}
