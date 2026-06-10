import { Link, useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { useSubscription } from "../hooks/useSubscription";
import { useEffect } from "react";

export default function PremiumGate() {
  const { isPremium, loading } = useSubscription();
  const navigate = useNavigate();

  // Agar obuna bor bo'lsa — orqaga qaytarish
  useEffect(() => {
    if (!loading && isPremium) {
      navigate(-1);
    }
  }, [isPremium, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Obuna bor — bu sahifa ko'rinmasligi kerak
  if (isPremium) return null;

  return (
    <div className="min-h-screen bg-gray-500/50 flex flex-col max-w-mobile mx-auto">
      {/* Header */}
      <header className="px-5 pt-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">⚡</span>
          </div>
          <span className="font-bold text-primary-500">EduKids</span>
        </div>
        <button onClick={() => navigate(-1)} className="text-gray-400"><X size={22} /></button>
      </header>

      {/* Modal */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-xl">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center relative">
            <span className="text-3xl">🔒</span>
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[8px] font-bold px-2 py-0.5 rounded">Yopiq</span>
          </div>

          <h2 className="text-xl font-bold mt-5">Bu dars pullik</h2>
          <p className="text-sm text-gray-500 mt-2 leading-relaxed">
            To'liq kirish uchun obuna bo'ling va barcha materiallardan foydalaning.
          </p>

          <Link
            to="/subscription"
            className="block w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl mt-6"
          >
            💳 Obuna bo'lish
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="block w-full border border-gray-200 text-gray-700 font-medium py-3.5 rounded-xl mt-3"
          >
            Orqaga qaytish
          </button>
        </div>
      </div>
    </div>
  );
}
