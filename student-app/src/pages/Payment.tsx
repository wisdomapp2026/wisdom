import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Check } from "lucide-react";
import { useState } from "react";

const methods = [
  { id: "click", name: "Click", icon: "📱" },
  { id: "payme", name: "Payme", icon: "💳" },
  { id: "uzum", name: "Uzum Bank", icon: "📱" },
  { id: "card", name: "Karta orqali", icon: "💳" },
];

export default function Payment() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("card");
  const [promo, setPromo] = useState("");

  function handlePayment() {
    // TODO: real to'lov integratsiya
    alert("To'lov muvaffaqiyatli amalga oshirildi! ✅");
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100">
        <Link to="/subscription" className="text-gray-500"><ChevronLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-gray-900">To'lov qilish</h1>
      </header>

      <div className="px-5 mt-5">
        {/* Selected course */}
        <p className="text-xs text-gray-500 uppercase font-medium mb-3">Tanlangan kurs</p>
        <div className="flex items-center border border-gray-200 rounded-xl p-4 gap-3">
          <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center shrink-0">
            <span>🎓</span>
          </div>
          <div className="flex-1">
            <p className="font-semibold text-gray-900">Milliy sertifikat kursi</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-gray-500">Ona tili va adabiyot</span>
              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">Ommaviy</span>
              <span className="text-xs text-gray-400">⏱ 12 dars</span>
            </div>
          </div>
        </div>

        {/* Price */}
        <div className="flex justify-between items-center mt-4">
          <span className="text-sm text-gray-500">Oylik to'lov</span>
          <span className="text-lg font-bold text-primary-500">50 000 so'm / oy</span>
        </div>

        {/* Payment methods */}
        <p className="text-xs text-gray-500 uppercase font-medium mt-6 mb-1">To'lov usuli</p>
        <div className="flex justify-end mb-2">
          <button className="text-xs text-primary-500 font-medium">Barchasini ko'rish</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {methods.map((m) => (
            <button
              key={m.id}
              onClick={() => setSelected(m.id)}
              className={`border rounded-xl p-4 flex flex-col items-center gap-1 relative transition-all ${selected === m.id ? "border-primary-500 bg-primary-50" : "border-gray-200"}`}
            >
              <span className="text-2xl">{m.icon}</span>
              <span className={`text-sm font-medium ${selected === m.id ? "text-primary-600" : "text-gray-700"}`}>{m.name}</span>
              {selected === m.id && (
                <div className="absolute top-2 right-2 w-4 h-4 bg-primary-500 rounded-full flex items-center justify-center">
                  <Check size={10} className="text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Promo */}
        <p className="text-xs text-gray-500 uppercase font-medium mt-6 mb-3">Promo-kod</p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <span className="text-gray-400 mr-2">🏷️</span>
            <input
              value={promo}
              onChange={(e) => setPromo(e.target.value)}
              placeholder="Kod kiriting"
              className="flex-1 bg-transparent text-sm outline-none"
            />
          </div>
          <button className="bg-red-500 text-white font-medium text-sm px-4 rounded-xl">Qo'llash</button>
        </div>

        {/* Breakdown */}
        <div className="mt-6 space-y-2.5">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Kurs narxi</span>
            <span className="text-gray-900">50 000 so'm</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Chegirma</span>
            <span className="text-green-500">-0 so'm</span>
          </div>
          <div className="h-px bg-gray-200" />
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-gray-900">Jami to'lov</span>
            <span className="text-xl font-bold text-primary-500">50 000 so'm</span>
          </div>
        </div>

        {/* Pay button */}
        <button
          onClick={handlePayment}
          className="w-full bg-primary-500 text-white font-bold py-4 rounded-xl mt-6 text-base"
        >
          To'lov qilish
        </button>

        {/* Security */}
        <div className="text-center mt-4 mb-8">
          <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
            🛡️ <span className="uppercase font-medium">Xavfsiz to'lov</span>
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            Sizning to'lov ma'lumotlaringiz shifrlangan va xavfsiz kanallar orqali o'tkaziladi.
          </p>
        </div>
      </div>
    </div>
  );
}
