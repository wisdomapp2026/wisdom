import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Tag, Check } from "lucide-react";
import { getPromoByCode, updatePromoCode } from "@shared/repositories";
import { useAuth } from "../hooks/useAuth";

export default function PromoPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; discount?: number } | null>(null);
  const [appliedCodes, setAppliedCodes] = useState<{ code: string; discount: number }[]>([]);

  async function handleCheck() {
    if (!code.trim()) return;
    setChecking(true);
    setResult(null);

    try {
      const promo = await getPromoByCode(code.trim());

      if (!promo) {
        setResult({ success: false, message: "Bunday promokod topilmadi" });
      } else if (!promo.isActive) {
        setResult({ success: false, message: "Bu promokod faol emas" });
      } else if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
        setResult({ success: false, message: "Bu promokod limiti tugagan" });
      } else if (promo.expiresAt && promo.expiresAt < Date.now()) {
        setResult({ success: false, message: "Bu promokod muddati o'tgan" });
      } else {
        // Muvaffaqiyatli
        setResult({
          success: true,
          message: `${promo.discountPercent}% chegirma qo'llanildi!`,
          discount: promo.discountPercent,
        });
        // usedCount ni oshirish
        await updatePromoCode(promo.id, { usedCount: promo.usedCount + 1 });
        setAppliedCodes((prev) => [...prev, { code: promo.code, discount: promo.discountPercent }]);
        setCode("");
      }
    } catch (err) {
      setResult({ success: false, message: "Tekshirishda xatolik yuz berdi" });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="page-content pb-24">
      <header className="px-5 pt-4 flex items-center gap-3">
        <Link to="/profile" className="text-gray-500 shrink-0 flex items-center justify-center"><ChevronLeft size={22} /></Link>
        <h1 className="text-xl font-bold">Promokodlarim</h1>
      </header>

      <div className="px-5 mt-6">
        {/* Input */}
        <div className="bg-white border border-gray-100 rounded-xl p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Tag size={18} className="text-primary-500" />
            Promokod kiritish
          </h3>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Kodni kiriting: WISDOM50"
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
              onKeyDown={(e) => { if (e.key === "Enter") handleCheck(); }}
            />
            <button
              onClick={handleCheck}
              disabled={checking || !code.trim()}
              className="px-5 py-3 bg-primary-500 text-white font-semibold rounded-xl text-sm disabled:opacity-50 shrink-0"
            >
              {checking ? "..." : "Tekshirish"}
            </button>
          </div>

          {/* Natija */}
          {result && (
            <div className={`mt-3 p-3 rounded-lg text-sm font-medium ${
              result.success
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {result.success ? "✅" : "❌"} {result.message}
            </div>
          )}
        </div>

        {/* Qo'llangan promokodlar */}
        {appliedCodes.length > 0 && (
          <div className="mt-6">
            <h3 className="font-semibold text-gray-900 mb-3">Qo'llangan kodlar</h3>
            <div className="space-y-2">
              {appliedCodes.map((item, i) => (
                <div key={i} className="flex items-center justify-between bg-green-50 border border-green-100 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <Check size={14} className="text-white" />
                    </div>
                    <span className="font-mono font-bold text-gray-900">{item.code}</span>
                  </div>
                  <span className="text-green-700 font-bold">{item.discount}% chegirma</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Izoh */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
          <p className="text-sm text-blue-800 font-medium">Promokod qanday ishlaydi?</p>
          <ul className="text-xs text-blue-700 mt-2 space-y-1">
            <li>• Promokod kiritib "Tekshirish" bosing</li>
            <li>• Aktiv bo'lsa — keyingi to'lovlarda chegirma qo'llaniladi</li>
            <li>• Har bir promokod faqat bir marta ishlatiladi</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
