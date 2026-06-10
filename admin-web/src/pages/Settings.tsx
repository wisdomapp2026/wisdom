import { useState, useEffect } from "react";
import { Save, DollarSign, Globe, Shield, Bell, Palette, Server } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@shared/firebase";

interface PlatformSettings {
  // Premium narxlar
  monthlyPrice: number; // oylik narx (so'm)
  quarterlyPrice: number; // 3 oylik
  yearlyPrice: number; // yillik
  // Umumiy
  platformName: string;
  supportPhone: string;
  supportEmail: string;
  // To'lov kartasi
  cardNumber: string;
  cardHolder: string;
  // To'lov
  paymeEnabled: boolean;
  clickEnabled: boolean;
  uzumEnabled: boolean;
  // Bildirishnomalar
  notifyNewStudent: boolean;
  notifyNewPayment: boolean;
  notifyNewMessage: boolean;
}

const DEFAULT_SETTINGS: PlatformSettings = {
  monthlyPrice: 50000,
  quarterlyPrice: 120000,
  yearlyPrice: 400000,
  platformName: "EduKids",
  supportPhone: "+998 90 123 45 67",
  supportEmail: "support@edukids.uz",
  cardNumber: "8600 1234 5678 9012",
  cardHolder: "EDUKIDS ADMIN",
  paymeEnabled: true,
  clickEnabled: true,
  uzumEnabled: true,
  notifyNewStudent: true,
  notifyNewPayment: true,
  notifyNewMessage: true,
};

export default function Settings() {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"pricing" | "general" | "payments" | "notifications">("pricing");

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const snap = await getDoc(doc(db, "settings", "platform"));
      if (snap.exists()) {
        setSettings({ ...DEFAULT_SETTINGS, ...snap.data() } as PlatformSettings);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await setDoc(doc(db, "settings", "platform"), settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Saqlashda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof PlatformSettings>(key: K, value: PlatformSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  const tabs = [
    { id: "pricing" as const, label: "Premium narxlar", icon: <DollarSign size={16} /> },
    { id: "general" as const, label: "Umumiy", icon: <Globe size={16} /> },
    { id: "payments" as const, label: "To'lov usullari", icon: <Shield size={16} /> },
    { id: "notifications" as const, label: "Bildirishnomalar", icon: <Bell size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sozlamalar</h1>
          <p className="text-sm text-gray-500 mt-1">Platformaning umumiy sozlamalari va narxlarni boshqarish</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary flex items-center gap-2 text-sm shrink-0 disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saqlanmoqda..." : saved ? "✓ Saqlandi!" : "Saqlash"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${
              activeTab === tab.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {activeTab === "pricing" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Premium obuna narxlari</h3>
              <p className="text-sm text-gray-500">O'quvchilar uchun premium obuna tariflari</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Oylik */}
              <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-primary-300 transition-colors">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">📅</span>
                </div>
                <h4 className="font-semibold text-gray-900">Oylik tarif</h4>
                <p className="text-xs text-gray-500 mt-1">1 oy muddatli obuna</p>
                <div className="mt-4">
                  <label className="text-xs text-gray-500 font-medium">Narxi (so'm)</label>
                  <input
                    type="number"
                    value={settings.monthlyPrice}
                    onChange={(e) => updateField("monthlyPrice", Number(e.target.value))}
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">{settings.monthlyPrice.toLocaleString()} so'm/oy</p>
                </div>
              </div>

              {/* 3 oylik */}
              <div className="border-2 border-primary-200 rounded-2xl p-6 relative bg-primary-50/30">
                <span className="absolute -top-3 left-4 bg-primary-500 text-white text-[10px] font-bold px-3 py-1 rounded-full">Mashhur</span>
                <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">🎯</span>
                </div>
                <h4 className="font-semibold text-gray-900">3 oylik tarif</h4>
                <p className="text-xs text-gray-500 mt-1">3 oy muddatli obuna</p>
                <div className="mt-4">
                  <label className="text-xs text-gray-500 font-medium">Narxi (so'm)</label>
                  <input
                    type="number"
                    value={settings.quarterlyPrice}
                    onChange={(e) => updateField("quarterlyPrice", Number(e.target.value))}
                    className="w-full mt-1 px-4 py-3 bg-white border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">{settings.quarterlyPrice.toLocaleString()} so'm / 3 oy</p>
                  <p className="text-xs text-green-600 font-medium mt-0.5">
                    {Math.round((1 - settings.quarterlyPrice / (settings.monthlyPrice * 3)) * 100)}% tejash
                  </p>
                </div>
              </div>

              {/* Yillik */}
              <div className="border-2 border-gray-200 rounded-2xl p-6 hover:border-primary-300 transition-colors">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-4">
                  <span className="text-2xl">👑</span>
                </div>
                <h4 className="font-semibold text-gray-900">Yillik tarif</h4>
                <p className="text-xs text-gray-500 mt-1">12 oy muddatli obuna</p>
                <div className="mt-4">
                  <label className="text-xs text-gray-500 font-medium">Narxi (so'm)</label>
                  <input
                    type="number"
                    value={settings.yearlyPrice}
                    onChange={(e) => updateField("yearlyPrice", Number(e.target.value))}
                    className="w-full mt-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">{settings.yearlyPrice.toLocaleString()} so'm / yil</p>
                  <p className="text-xs text-green-600 font-medium mt-0.5">
                    {Math.round((1 - settings.yearlyPrice / (settings.monthlyPrice * 12)) * 100)}% tejash
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Umumiy sozlamalar</h3>
              <p className="text-sm text-gray-500">Platforma nomi va aloqa ma'lumotlari</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Platforma nomi</label>
                <input
                  value={settings.platformName}
                  onChange={(e) => updateField("platformName", e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Yordam telefoni</label>
                <input
                  value={settings.supportPhone}
                  onChange={(e) => updateField("supportPhone", e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Yordam emaili</label>
                <input
                  value={settings.supportEmail}
                  onChange={(e) => updateField("supportEmail", e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">To'lov sozlamalari</h3>
              <p className="text-sm text-gray-500">Karta raqami va to'lov tizimlari</p>
            </div>

            {/* Karta raqami */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 space-y-4">
              <h4 className="font-medium text-gray-900">💳 To'lov uchun karta (studentlarga ko'rinadi)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Karta raqami</label>
                  <input
                    value={settings.cardNumber}
                    onChange={(e) => updateField("cardNumber", e.target.value)}
                    placeholder="8600 1234 5678 9012"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Karta egasi</label>
                  <input
                    value={settings.cardHolder}
                    onChange={(e) => updateField("cardHolder", e.target.value)}
                    placeholder="ISMI FAMILIYASI"
                    className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <ToggleRow
                icon="💳"
                title="Payme"
                description="Payme orqali to'lov qabul qilish"
                checked={settings.paymeEnabled}
                onChange={(v) => updateField("paymeEnabled", v)}
              />
              <ToggleRow
                icon="🟦"
                title="Click"
                description="Click orqali to'lov qabul qilish"
                checked={settings.clickEnabled}
                onChange={(v) => updateField("clickEnabled", v)}
              />
              <ToggleRow
                icon="🟢"
                title="Uzum Bank"
                description="Uzum Bank orqali to'lov qabul qilish"
                checked={settings.uzumEnabled}
                onChange={(v) => updateField("uzumEnabled", v)}
              />
            </div>
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Bildirishnoma sozlamalari</h3>
              <p className="text-sm text-gray-500">Qaysi hodisalar haqida bildirishnoma olishni tanlang</p>
            </div>

            <div className="space-y-4">
              <ToggleRow
                icon="👤"
                title="Yangi o'quvchi"
                description="Yangi foydalanuvchi ro'yxatdan o'tganda"
                checked={settings.notifyNewStudent}
                onChange={(v) => updateField("notifyNewStudent", v)}
              />
              <ToggleRow
                icon="💰"
                title="Yangi to'lov"
                description="To'lov muvaffaqiyatli amalga oshganda"
                checked={settings.notifyNewPayment}
                onChange={(v) => updateField("notifyNewPayment", v)}
              />
              <ToggleRow
                icon="💬"
                title="Yangi habar"
                description="O'quvchidan yangi habar kelganda"
                checked={settings.notifyNewMessage}
                onChange={(v) => updateField("notifyNewMessage", v)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Tizim haqida */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3">
          <Server size={18} className="text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">Tizim ma'lumotlari</p>
            <p className="text-xs text-gray-500 mt-0.5">EduKids Admin Panel v2.5.0 · Firebase Firestore · Vite + React</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ icon, title, description, checked, onChange }: {
  icon: string; title: string; description: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
      <div className="flex items-center gap-3">
        <span className="text-xl">{icon}</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? "bg-primary-500" : "bg-gray-300"}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
