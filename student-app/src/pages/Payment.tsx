import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Copy, Check, Shield, Upload, Image } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { getPromoByCode, updatePromoCode, usePromoCodeAtomic, createPayment, getUserById } from "@shared/repositories";
import { supabase, uploadFile } from "@shared/supabase";
import type { Payment as PaymentType } from "@shared/types";

export default function Payment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const courseId = params.get("course") || "";
  const planId = params.get("plan") || "monthly";
  const baseAmount = Number(params.get("amount")) || 50000;

  const [cardNumber, setCardNumber] = useState("8600 1234 5678 9012");
  const [cardHolder, setCardHolder] = useState("WISDOM ADMIN");
  const [copied, setCopied] = useState(false);
  const [promo, setPromo] = useState("");
  const [discount, setDiscount] = useState(0);
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userName, setUserName] = useState("");
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState("");
  const [senderCard, setSenderCard] = useState("");
  const [senderPhone, setSenderPhone] = useState("");

  const finalAmount = Math.max(0, baseAmount - Math.round(baseAmount * discount / 100));

  useEffect(() => {
    loadSettings();
    if (user) getUserById(user.uid).then((u) => { if (u) setUserName(u.name); });
  }, [user]);

  async function loadSettings() {
    try {
      const { data: resData } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "platform")
        .maybeSingle();
      if (resData?.value) {
        const data = resData.value as any;
        if (data.cardNumber) setCardNumber(data.cardNumber);
        if (data.cardHolder) setCardHolder(data.cardHolder);
      }
    } catch {}
  }

  function handleCopy() {
    navigator.clipboard.writeText(cardNumber.replace(/\s/g, ""));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleApplyPromo() {
    if (!promo.trim()) return;
    setPromoError("");
    try {
      const promoData = await getPromoByCode(promo.trim());
      if (!promoData) { setPromoError("Promokod topilmadi"); return; }
      if (!promoData.isActive) { setPromoError("Promokod faol emas"); return; }
      if (promoData.maxUses > 0 && promoData.usedCount >= promoData.maxUses) { setPromoError("Limiti tugagan"); return; }

      // Atomik increment — race condition oldini olish
      const success = await usePromoCodeAtomic(promoData.id);
      if (!success) { setPromoError("Promokod limiti tugagan yoki faol emas"); return; }

      setDiscount(promoData.discountPercent);
      setPromoApplied(true);
    } catch { setPromoError("Xatolik"); }
  }

  async function handleSubmitPayment() {
    if (!user) return;
    if (!senderCard.trim() || senderCard.replace(/\D/g, "").length < 16) {
      alert("Iltimos, karta raqamingizni to'liq kiriting!");
      return;
    }
    if (!senderPhone.trim() || senderPhone.replace(/\D/g, "").length < 9) {
      alert("Iltimos, telefon raqamingizni kiriting!");
      return;
    }
    if (!screenshotFile) {
      alert("Iltimos, to'lov screenshotini yuklang!");
      return;
    }
    setSubmitting(true);

    const now = Date.now();
    const planLabel = planId === "yearly" ? "Yillik" : planId === "quarterly" ? "3 oylik" : "Oylik";

    // Screenshot upload
    let screenshotUrl = "";
    try {
      screenshotUrl = await uploadFile("edukids", `payment-screenshots/${user.uid}-${now}.jpg`, screenshotFile);
    } catch (err) {
      console.error("Screenshot yuklashda xatolik:", err);
    }

    // To'lovni "pending" holatda saqlash
    const payment: PaymentType = {
      id: `pay-${now}`,
      userId: user.uid,
      userName: userName || "Foydalanuvchi",
      courseId: courseId,
      courseTitle: `Premium obuna (${planLabel})`,
      amount: finalAmount,
      method: "card",
      status: "pending",
      promoCode: promoApplied ? promo : "",
      discount,
      cardNumber: senderCard.trim() || "",
      senderPhone: senderPhone.trim(),
      recipientCard: cardNumber,
      screenshotUrl: "",
      createdAt: now,
    };

    try {
      // Payment ga screenshot URL qo'shish
      await createPayment({ ...payment, screenshotUrl } as any);

      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Xatolik yuz berdi");
    } finally {
      setSubmitting(false);
    }
  }

  // Muvaffaqiyatli yuborilgan holat
  if (submitted) {
    return (
      <div className="min-h-screen bg-white max-w-mobile mx-auto flex flex-col items-center justify-center px-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <Check size={36} className="text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 text-center">To'lov so'rovi yuborildi!</h2>
        <p className="text-sm text-gray-500 text-center mt-2 leading-relaxed">
          Admin to'lovingizni tekshirib, obunangizni faollashtiradi. Odatda 5-30 daqiqa ichida amalga oshiriladi.
        </p>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-6 w-full">
          <p className="text-xs text-blue-700 font-medium">📋 To'lov ma'lumotlari:</p>
          <p className="text-xs text-blue-600 mt-1">Summa: {finalAmount.toLocaleString()} so'm</p>
          <p className="text-xs text-blue-600">Tarif: {planId === "yearly" ? "Yillik" : planId === "quarterly" ? "3 oylik" : "Oylik"}</p>
          <p className="text-xs text-blue-600">Holat: Kutilmoqda ⏳</p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="w-full bg-primary-500 text-white font-bold py-4 rounded-xl mt-6"
        >
          Bosh sahifaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white max-w-mobile mx-auto">
      {/* Header */}
      <header className="px-5 pt-4 pb-3 flex items-center gap-3 border-b border-gray-100">
        <Link to="/subscription" className="text-gray-500 shrink-0 flex items-center justify-center"><ChevronLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-gray-900">To'lov qilish</h1>
      </header>

      <div className="px-5 mt-5">
        {/* Yo'riqnoma */}
        <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-5">
          <p className="text-sm font-semibold text-primary-800">📋 To'lov qanday amalga oshiriladi:</p>
          <ol className="text-xs text-primary-700 mt-2 space-y-1.5 list-decimal list-inside">
            <li>Quyidagi karta raqamiga pul o'tkazing</li>
            <li>"To'lov qildim" tugmasini bosing</li>
            <li>Admin tekshirib, obunangizni faollashtiradi (5-30 daq)</li>
          </ol>
        </div>

        {/* Karta ma'lumotlari */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-700 rounded-2xl p-5 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10" />
          <p className="text-xs text-white/60 uppercase">O'tkazish uchun karta</p>
          <div className="flex items-center gap-3 mt-3">
            <p className="text-xl font-mono font-bold tracking-wider">{cardNumber}</p>
            <button onClick={handleCopy} className="p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="text-sm text-white/80 mt-3">{cardHolder}</p>
          {copied && <p className="text-xs text-green-400 mt-1">✓ Nusxalandi!</p>}
        </div>

        {/* Summa */}
        <div className="bg-gray-50 rounded-xl p-4 mt-4 border border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">O'tkazish summasi:</span>
            <span className="text-xl font-bold text-primary-500">{finalAmount.toLocaleString()} so'm</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Tarif: {planId === "yearly" ? "Yillik (12 oy)" : planId === "quarterly" ? "3 oylik" : "Oylik (1 oy)"}
          </p>
        </div>

        {/* Promo */}
        <div className="mt-5">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Promokod</p>
          <div className="flex gap-2">
            <input
              value={promo}
              onChange={(e) => { setPromo(e.target.value.toUpperCase()); setPromoError(""); }}
              placeholder="WISDOM50"
              disabled={promoApplied}
              className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
            />
            <button
              onClick={handleApplyPromo}
              disabled={promoApplied || !promo.trim()}
              className={`px-4 py-3 rounded-xl text-sm font-semibold shrink-0 ${promoApplied ? "bg-green-500 text-white" : "bg-primary-500 text-white disabled:opacity-50"}`}
            >
              {promoApplied ? "✓" : "Qo'llash"}
            </button>
          </div>
          {promoError && <p className="text-xs text-red-500 mt-1">{promoError}</p>}
          {promoApplied && <p className="text-xs text-green-600 mt-1 font-medium">🎉 {discount}% chegirma!</p>}
        </div>

        {/* O'z karta raqami */}
        <div className="mt-5">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Sizning karta raqamingiz *</p>
          <input
            value={senderCard}
            onChange={(e) => {
              // Faqat raqamlar va bo'shliq
              const val = e.target.value.replace(/[^\d\s]/g, "").replace(/\s+/g, " ");
              setSenderCard(val);
            }}
            placeholder="8600 1234 5678 9012"
            maxLength={19}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <p className="text-xs text-gray-400 mt-1">Pul o'tkazgan kartangiz raqamini kiriting</p>
        </div>

        {/* Telefon raqami */}
        <div className="mt-5">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Telefon raqamingiz *</p>
          <input
            value={senderPhone}
            onChange={(e) => setSenderPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            type="tel"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            required
          />
          <p className="text-xs text-gray-400 mt-1">Fors-major holatlarda siz bilan bog'lanish uchun</p>
        </div>

        {/* Screenshot yuklash */}
        <div className="mt-5">
          <p className="text-xs text-gray-500 uppercase font-semibold mb-2">To'lov screenshoti *</p>
          <label className={`flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl p-5 cursor-pointer transition-colors ${
            screenshotFile ? "border-green-300 bg-green-50" : "border-gray-300 bg-gray-50 hover:border-primary-300"
          }`}>
            {screenshotPreview ? (
              <div className="relative">
                <img src={screenshotPreview} alt="Screenshot" className="max-h-40 rounded-lg shadow-sm" />
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setScreenshotFile(null); setScreenshotPreview(""); }}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                >✕</button>
              </div>
            ) : (
              <>
                <Image size={32} className="text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 font-medium">To'lov screenshotini yuklang</p>
                <p className="text-xs text-gray-400 mt-1">PNG, JPG — max 5MB</p>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  // Fayl hajmini tekshirish — max 5MB
                  if (file.size > 5 * 1024 * 1024) {
                    alert("Fayl juda katta! Maksimal 5MB ruxsat berilgan.");
                    return;
                  }
                  setScreenshotFile(file);
                  setScreenshotPreview(URL.createObjectURL(file));
                }
              }}
            />
          </label>
        </div>

        {/* CTA */}
        <button
          onClick={handleSubmitPayment}
          disabled={submitting || !screenshotFile}
          className="w-full bg-green-600 text-white font-bold py-4 rounded-xl mt-6 text-base disabled:opacity-50 active:bg-green-700 flex items-center justify-center gap-2"
        >
          {submitting ? "Yuborilmoqda..." : "✅ To'lov qildim — tasdiqlash so'rash"}
        </button>

        <p className="text-[10px] text-gray-400 text-center mt-3 mb-8">
          To'lovni qilganingizdan keyin tugmani bosing. Admin 5-30 daqiqa ichida obunangizni faollashtiradi.
        </p>
      </div>
    </div>
  );
}
