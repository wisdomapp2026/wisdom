import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { X, Check, Crown } from "lucide-react";
import { supabase } from "@shared/supabase";
import { useAuth } from "../hooks/useAuth";

interface PricingPlan {
  id: string;
  label: string;
  duration: string;
  price: number;
  perMonth: number;
  discount: number;
  popular?: boolean;
}

export default function Subscription() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [benefits, setBenefits] = useState<string[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>("quarterly");
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPricing(); }, []);

  async function loadPricing() {
    try {
      const { data: resData, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "platform")
        .maybeSingle();
      const data = (resData?.value || {}) as any;
      const monthly = data.monthlyPrice || 50000;
      const quarterly = data.quarterlyPrice || 120000;
      const yearly = data.yearlyPrice || 400000;

      // Premium foydalari
      if (data.premiumBenefits && Array.isArray(data.premiumBenefits)) {
        setBenefits(data.premiumBenefits.filter((b: string) => b.trim()));
      } else {
        setBenefits([
          "Barcha premium darslar va mavzular",
          "500+ interaktiv testlar",
          "Video yechimlar — har bir misol uchun",
          "Shaxsiy progress tahlili",
          "Sertifikat olish imkoniyati",
          "Reklama va cheklovlarsiz",
        ]);
      }

      setPlans([
        {
          id: "monthly",
          label: "Oylik",
          duration: "1 oy",
          price: monthly,
          perMonth: monthly,
          discount: 0,
        },
        {
          id: "quarterly",
          label: "3 oylik",
          duration: "3 oy",
          price: quarterly,
          perMonth: Math.round(quarterly / 3),
          discount: Math.round((1 - quarterly / (monthly * 3)) * 100),
          popular: true,
        },
        {
          id: "yearly",
          label: "Yillik",
          duration: "12 oy",
          price: yearly,
          perMonth: Math.round(yearly / 12),
          discount: Math.round((1 - yearly / (monthly * 12)) * 100),
        },
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const selected = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="min-h-screen bg-white max-w-mobile mx-auto">
      {/* Header */}
      <header className="px-5 pt-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Crown size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900">Wisdom Premium</span>
        </div>
        <Link to="/" className="text-gray-400"><X size={22} /></Link>
      </header>

      <div className="px-5 mt-6">
        {/* Hero */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl">👑</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Premium obuna</h1>
          <p className="text-sm text-gray-500 mt-2">Barcha kurslar, testlar va video yechimlardan cheksiz foydalaning</p>
        </div>

        {/* Plan selection */}
        {!loading && (
          <div className="space-y-3 mb-6">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`w-full flex items-center p-4 rounded-2xl border-2 transition-all text-left relative ${
                  selectedPlan === plan.id
                    ? "border-primary-500 bg-primary-50/50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-4 bg-primary-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                    Eng foydali
                  </span>
                )}
                {/* Radio */}
                <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center shrink-0 ${
                  selectedPlan === plan.id ? "border-primary-500" : "border-gray-300"
                }`}>
                  {selectedPlan === plan.id && <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{plan.label}</span>
                    {plan.discount > 0 && (
                      <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                        -{plan.discount}%
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{plan.duration} muddatli</p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-gray-900">{plan.price.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-500">so'm</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Selected plan info */}
        {selected && (
          <div className="bg-primary-500 rounded-2xl p-5 text-center mb-6">
            <p className="text-white/70 text-xs uppercase">Tanlangan tarif — {selected.label}</p>
            <p className="text-white text-3xl font-bold mt-1">
              {selected.price.toLocaleString()} so'm
            </p>
            <p className="text-white/60 text-xs mt-1">
              {selected.perMonth.toLocaleString()} so'm / oyiga
            </p>
          </div>
        )}

        {/* Afzalliklar */}
        <div className="mb-6">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-3">Siz nimalarga ega bo'lasiz:</p>
          <div className="space-y-2.5">
            {benefits.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                  <Check size={12} className="text-green-600" />
                </div>
                <p className="text-sm text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <Link
          to={`/payment?plan=${selectedPlan}&amount=${selected?.price || 0}`}
          className="block w-full bg-primary-500 text-white font-bold py-4 rounded-xl text-center active:bg-primary-600"
        >
          To'lovga o'tish — {selected?.price.toLocaleString()} so'm
        </Link>

        <Link to="/" className="block text-center text-sm text-gray-500 mt-4 mb-8">
          Keyinroq davom etish
        </Link>

        <p className="text-[10px] text-gray-400 text-center pb-8">
          Obuna bo'lish orqali siz foydalanish shartlari va maxfiylik siyosatiga rozilik bildirasiz.
          Obuna muddati tugagach avtomatik uzaytirilmaydi.
        </p>
      </div>
    </div>
  );
}
