import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { X, Check, Lock } from "lucide-react";
import { getCourseById } from "@shared/repositories";
import { useCourseAccess } from "../hooks/useCourseAccess";
import type { Course } from "@shared/types";

export default function PremiumGate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const courseId = searchParams.get("course") || "";
  const { hasAccess, loading: accessLoading } = useCourseAccess(courseId || undefined);
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  useEffect(() => {
    if (courseId) {
      getCourseById(courseId).then((c) => {
        setCourse(c);
        // Default tanlash — birinchi tarif yoki one_time
        if (c?.subscriptionPlans && c.subscriptionPlans.length > 0) {
          setSelectedPlan(c.subscriptionPlans[0].id);
        }
      }).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [courseId]);

  // Agar obuna bor bo'lsa — orqaga qaytarish
  useEffect(() => {
    if (!accessLoading && hasAccess) {
      navigate(-1);
    }
  }, [hasAccess, accessLoading]);

  if (loading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (hasAccess) return null;

  const isOneTime = course?.pricingType === "one_time";
  const plans = course?.subscriptionPlans || [];
  const benefits = course?.premiumBenefits || [];
  const price = isOneTime ? (course?.coursePrice || 0) : 0;
  const selectedPlanData = plans.find((p) => p.id === selectedPlan);

  return (
    <div className="min-h-screen flex flex-col max-w-mobile mx-auto" style={{ backgroundColor: "var(--theme-bg)" }}>
      {/* Header */}
      <header className="px-5 pt-4 pb-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-sm">👑</span>
          </div>
          <span className="font-bold text-gray-900">Premium</span>
        </div>
        <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600"><X size={22} /></button>
      </header>

      <div className="flex-1 px-5 pb-8">
        {/* Kurs nomi */}
        <div className="text-center mt-4 mb-6">
          <div className="w-16 h-16 mx-auto bg-yellow-50 rounded-2xl flex items-center justify-center mb-3">
            <Lock className="w-7 h-7 text-yellow-600" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            {course?.title || "Premium kurs"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            To'liq kirish uchun sotib oling
          </p>
        </div>

        {/* Narx — bir martalik */}
        {isOneTime && price > 0 && (
          <div className="bg-white border-2 border-primary-200 rounded-2xl p-5 mb-4 text-center">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Bir martalik to'lov</p>
            <p className="text-3xl font-bold text-gray-900">{price.toLocaleString()} <span className="text-base font-normal text-gray-500">so'm</span></p>
            <p className="text-xs text-green-600 mt-1">Abadiy kirish — bir marta to'lab, doimiy foydalaning</p>
          </div>
        )}

        {/* Narx — obuna tariflari */}
        {!isOneTime && plans.length > 0 && (
          <div className="space-y-2.5 mb-4">
            {plans.map((plan, i) => {
              const isSelected = selectedPlan === plan.id;
              const monthlyPrice = plan.months > 0 ? Math.round(plan.price / plan.months) : plan.price;
              const cheapest = plans.length > 1 && plan.months === Math.max(...plans.map(p => p.months));
              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                    isSelected ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white"
                  } ${cheapest ? "relative" : ""}`}
                >
                  {cheapest && (
                    <span className="absolute -top-2.5 left-4 bg-green-500 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full">
                      Eng foydali
                    </span>
                  )}
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? "border-primary-500" : "border-gray-300"}`}>
                      {isSelected && <div className="w-2.5 h-2.5 bg-primary-500 rounded-full" />}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{plan.label}</p>
                      <p className="text-[10px] text-gray-500">{plan.months} oy muddatli</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{plan.price.toLocaleString()} <span className="text-xs font-normal text-gray-500">so'm</span></p>
                    {plan.months > 1 && (
                      <p className="text-[10px] text-gray-400">{monthlyPrice.toLocaleString()} so'm/oy</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Tanlangan tarif */}
        {!isOneTime && selectedPlanData && (
          <div className="bg-primary-500 rounded-2xl p-4 mb-4 text-center">
            <p className="text-white/80 text-xs uppercase tracking-wide">Tanlangan tarif — {selectedPlanData.label}</p>
            <p className="text-white text-2xl font-bold mt-1">{selectedPlanData.price.toLocaleString()} so'm</p>
            {selectedPlanData.months > 1 && (
              <p className="text-white/70 text-xs mt-0.5">{Math.round(selectedPlanData.price / selectedPlanData.months).toLocaleString()} so'm / oyiga</p>
            )}
          </div>
        )}

        {/* Premium foydalari */}
        {benefits.length > 0 ? (
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Siz nimalarga ega bo'lasiz:</p>
            <div className="space-y-2.5">
              {benefits.map((b, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-green-600" />
                  </div>
                  <p className="text-sm text-gray-700">{b}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-3">Siz nimalarga ega bo'lasiz:</p>
            <div className="space-y-2.5">
              {["Barcha premium mavzular va misollar", "Video yechimlar", "Cheksiz kirish"].map((b, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check size={12} className="text-green-600" />
                  </div>
                  <p className="text-sm text-gray-700">{b}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sotib olish tugmasi */}
        <button
          onClick={() => navigate(`/payment?course=${courseId}&plan=${selectedPlan || "one_time"}&amount=${isOneTime ? price : (selectedPlanData?.price || 0)}`)}
          className="w-full bg-primary-500 text-white font-bold py-4 rounded-2xl text-base shadow-lg active:scale-[0.98] transition-transform"
        >
          💳 Sotib olish
        </button>

        <button
          onClick={() => navigate(-1)}
          className="w-full text-gray-500 font-medium py-3 mt-2 text-sm"
        >
          ← Orqaga qaytish
        </button>
      </div>
    </div>
  );
}
