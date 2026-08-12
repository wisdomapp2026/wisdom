import { useState, useEffect } from "react";
import { Save, DollarSign, Globe, Shield, Bell, Palette, Server, User, Check, FileText } from "lucide-react";
import { supabase } from "@shared/supabase";
import LoadingButton from "../components/LoadingButton";
import type { AuthorInfo, AuthorSocialLink, SocialPlatform } from "@shared/types";

interface PlatformSettings {
  // Premium narxlar
  monthlyPrice: number;
  quarterlyPrice: number;
  yearlyPrice: number;
  // Premium foydalari (student app da ko'rinadi)
  premiumBenefits: string[];
  // Umumiy
  platformName: string;
  logoUrl: string;
  supportPhone: string;
  supportEmail: string;
  // Mobil ilova (APK)
  apkUrl: string;
  apkVersion: string;
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
  // Interfeys (tema) sozlamalari — student app ranglari
  theme?: ThemeSettings;
}

/** Student app interfeys ranglari */
interface ThemeSettings {
  primaryColor: string; // Asosiy rang (tugmalar, progress bar, header)
  bgColor: string; // Sahifa fon rangi
  cardBgColor: string; // Kartochkalar fon rangi
  textColor: string; // Asosiy matn rangi
  secondaryTextColor: string; // Ikkilamchi matn rangi
  navBgColor: string; // Bottom nav fon rangi
  navActiveColor: string; // Nav active ikonka/matn rangi
  buttonTextColor: string; // Tugma matni rangi
  accentColor: string; // Qo'shimcha urg'u rangi (badge, progress)
}

const DEFAULT_THEME: ThemeSettings = {
  primaryColor: "#2196F3",
  bgColor: "#f9fafb",
  cardBgColor: "#ffffff",
  textColor: "#111827",
  secondaryTextColor: "#6b7280",
  navBgColor: "#ffffff",
  navActiveColor: "#2196F3",
  buttonTextColor: "#ffffff",
  accentColor: "#22c55e",
};

const DEFAULT_SETTINGS: PlatformSettings = {
  monthlyPrice: 50000,
  quarterlyPrice: 120000,
  yearlyPrice: 400000,
  premiumBenefits: [
    "Barcha premium darslar va mavzular",
    "500+ interaktiv testlar",
    "Video yechimlar — har bir misol uchun",
    "Shaxsiy progress tahlili",
    "Sertifikat olish imkoniyati",
    "Reklama va cheklovlarsiz",
  ],
  platformName: "tushunGo",
  logoUrl: "",
  supportPhone: "+998 90 123 45 67",
  supportEmail: "support@edukids.uz",
  apkUrl: "",
  apkVersion: "",
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
  const [activeTab, setActiveTab] = useState<"general" | "payments" | "notifications" | "theme" | "author" | "legal">("general");

  useEffect(() => { loadSettings(); }, []);

  async function loadSettings() {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "platform")
        .maybeSingle();
      if (!error && data?.value) {
        setSettings({ ...DEFAULT_SETTINGS, ...data.value } as PlatformSettings);
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
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "platform", value: settings });
      if (error) throw error;
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error("Saqlashda xatolik:", err);
      alert("Saqlashda xatolik: " + err.message);
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
    { id: "general" as const, label: "Umumiy", icon: <Globe size={16} /> },
    { id: "payments" as const, label: "To'lov usullari", icon: <Shield size={16} /> },
    { id: "notifications" as const, label: "Bildirishnomalar", icon: <Bell size={16} /> },
    { id: "theme" as const, label: "Interfeys", icon: <Palette size={16} /> },
    { id: "legal" as const, label: "Huquqiy", icon: <FileText size={16} /> },
    { id: "author" as const, label: "Muallif", icon: <User size={16} /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sozlamalar</h1>
          <p className="text-sm text-gray-500 mt-1">Platformaning umumiy sozlamalari va narxlarni boshqarish</p>
        </div>
        <LoadingButton
          onClick={handleSave}
          className="btn-primary flex items-center gap-2 text-sm shrink-0"
        >
          <Save size={16} />
          Saqlash
        </LoadingButton>
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
        {activeTab === "general" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Umumiy sozlamalar</h3>
              <p className="text-sm text-gray-500">Platforma nomi, logosi va aloqa ma'lumotlari</p>
            </div>

            {/* Logo */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">📱 App logosi (Student header)</h4>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary-500 flex items-center justify-center shrink-0 border-2 border-gray-200">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-2xl">⚡</span>
                  )}
                </div>
                <div className="flex-1">
                  <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                    📷 Logo tanlash
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 5 * 1024 * 1024) { alert("Maksimal 5MB!"); return; }
                        try {
                          const filePath = `branding/logo-${Date.now()}.${file.name.split('.').pop()}`;
                          const { error: uploadErr } = await supabase.storage.from("edukids").upload(filePath, file);
                          if (uploadErr) throw uploadErr;
                          const url = supabase.storage.from("edukids").getPublicUrl(filePath).data.publicUrl;
                          updateField("logoUrl", url);
                          await supabase.from("settings").upsert({ key: "platform", value: { ...settings, logoUrl: url } });
                        } catch (err: any) {
                          console.error("Logo yuklashda xatolik:", err);
                          alert("Logo yuklashda xatolik: " + err.message);
                        }
                      }}
                    />
                  </label>
                  {settings.logoUrl && (
                    <button
                      onClick={() => updateField("logoUrl", "")}
                      className="ml-2 text-xs text-red-500 hover:underline"
                    >
                      O'chirish
                    </button>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Tavsiya: 512x512 px, PNG yoki SVG</p>
                </div>
              </div>
            </div>

            {/* Android APK */}
            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">🤖 Android ilova (APK)</h4>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-green-500 flex items-center justify-center shrink-0 border-2 border-gray-200">
                  <span className="text-white text-2xl">📦</span>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      ⬆️ APK faylni yuklash
                      <input
                        type="file"
                        accept=".apk,application/vnd.android.package-archive"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 200 * 1024 * 1024) { alert("Maksimal 200MB!"); return; }
                          try {
                            const filePath = `apk/tushungo-${Date.now()}.apk`;
                            const { error: uploadErr } = await supabase.storage.from("edukids").upload(filePath, file);
                            if (uploadErr) throw uploadErr;
                            const url = supabase.storage.from("edukids").getPublicUrl(filePath).data.publicUrl;
                            updateField("apkUrl", url);
                            await supabase.from("settings").upsert({ key: "platform", value: { ...settings, apkUrl: url } });
                          } catch (err: any) {
                            console.error("APK yuklashda xatolik:", err);
                            alert("APK yuklashda xatolik: " + err.message);
                          }
                        }}
                      />
                    </label>
                    {settings.apkUrl && (
                      <>
                        <a
                          href={settings.apkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary-500 hover:underline"
                        >
                          Ko'rish
                        </a>
                        <button
                          onClick={() => updateField("apkUrl", "")}
                          className="text-xs text-red-500 hover:underline"
                        >
                          O'chirish
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {settings.apkUrl ? "APK yuklangan — student ilovada yuklab olish havolasi ko'rinadi" : "Hali APK yuklanmagan"}
                  </p>
                  <div className="mt-2.5">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Versiya (ixtiyoriy, masalan 1.2.0)</label>
                    <input
                      value={settings.apkVersion}
                      onChange={(e) => updateField("apkVersion", e.target.value)}
                      placeholder="1.0.0"
                      className="w-40 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
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

        {activeTab === "theme" && (
          <ThemeEditor
            theme={settings.theme || DEFAULT_THEME}
            onChange={(theme) => updateField("theme", theme)}
            onReset={() => updateField("theme", DEFAULT_THEME)}
          />
        )}

        {activeTab === "legal" && (
          <LegalEditor />
        )}

        {activeTab === "author" && (
          <AuthorEditor />
        )}
      </div>

      {/* Tizim haqida */}
      <div className="bg-gray-50 rounded-xl border border-gray-100 p-5">
        <div className="flex items-center gap-3">
          <Server size={18} className="text-gray-400" />
          <div>
            <p className="text-sm font-medium text-gray-700">Tizim ma'lumotlari</p>
            <p className="text-xs text-gray-500 mt-0.5">tushunGo Admin Panel v2.5.0 · Supabase · Vite + React</p>
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


// ===== Interfeys (tema) tahrirlash komponenti =====
const THEME_FIELDS: { key: keyof ThemeSettings; label: string; description: string }[] = [
  { key: "primaryColor", label: "Asosiy rang", description: "Tugmalar, progress bar, header elementlari" },
  { key: "bgColor", label: "Sahifa fon rangi", description: "Asosiy sahifa fon rangi" },
  { key: "cardBgColor", label: "Kartochka fon rangi", description: "Kurs, misol va boshqa kartochkalar" },
  { key: "textColor", label: "Asosiy matn rangi", description: "Sarlavhalar va asosiy matnlar" },
  { key: "secondaryTextColor", label: "Ikkilamchi matn rangi", description: "Tavsif, sana, kichik matnlar" },
  { key: "navBgColor", label: "Navbar fon rangi", description: "Pastki navigatsiya paneli fon rangi" },
  { key: "navActiveColor", label: "Navbar aktiv rangi", description: "Faol menyu elementi rangi" },
  { key: "buttonTextColor", label: "Tugma matni rangi", description: "Tugma ichidagi matn/ikonka rangi" },
  { key: "accentColor", label: "Urg'u rang", description: "Yashil badge, online indikator, muvaffaqiyat" },
];

function ThemeEditor({ theme, onChange, onReset }: {
  theme: ThemeSettings; onChange: (theme: ThemeSettings) => void; onReset: () => void;
}) {
  function updateColor(key: keyof ThemeSettings, value: string) {
    onChange({ ...theme, [key]: value });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Interfeys sozlamalari</h3>
          <p className="text-sm text-gray-500">Student ilovaning ranglari va ko'rinishini sozlash</p>
        </div>
        <button
          onClick={() => { if (confirm("Barcha ranglarni boshlang'ich holatiga qaytarishni xohlaysizmi?")) onReset(); }}
          className="btn-outline text-sm flex items-center gap-2 text-amber-600 border-amber-200 hover:bg-amber-50"
        >
          ↺ Default holatiga qaytarish
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Ranglar ro'yxati */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Ranglarni tanlang</h4>
          {THEME_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <input
                type="color"
                value={theme[field.key]}
                onChange={(e) => updateColor(field.key, e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{field.label}</p>
                <p className="text-[11px] text-gray-500">{field.description}</p>
              </div>
              <input
                type="text"
                value={theme[field.key]}
                onChange={(e) => updateColor(field.key, e.target.value)}
                className="w-24 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono text-center"
              />
            </div>
          ))}
        </div>

        {/* Live Preview — telefon ko'rinishida */}
        <div className="sticky top-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Ko'rinishi (Preview)</h4>
          <div className="border-[3px] border-gray-800 rounded-[2rem] overflow-hidden shadow-2xl mx-auto" style={{ width: "280px" }}>
            {/* Status bar */}
            <div className="h-6 bg-gray-800 flex items-center justify-center">
              <div className="w-16 h-3 bg-gray-700 rounded-full" />
            </div>
            {/* Screen */}
            <div className="h-[500px] overflow-y-auto" style={{ backgroundColor: theme.bgColor }}>
              {/* Header */}
              <div className="px-4 pt-3 pb-2 flex items-center justify-between" style={{ backgroundColor: theme.cardBgColor }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.primaryColor }}>
                    <span className="text-xs" style={{ color: theme.buttonTextColor }}>⚡</span>
                  </div>
                  <span className="text-sm font-bold" style={{ color: theme.primaryColor }}>tushunGo</span>
                </div>
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.bgColor }} />
                  <div className="w-6 h-6 rounded-full" style={{ backgroundColor: theme.bgColor }} />
                </div>
              </div>

              {/* Banner */}
              <div className="mx-3 mt-3 rounded-xl p-4" style={{ backgroundColor: theme.primaryColor, minHeight: "90px" }}>
                <p className="text-sm font-bold" style={{ color: theme.buttonTextColor }}>Milliy sertifikatga tayyormisiz?</p>
                <div className="mt-2 inline-block px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: theme.textColor, color: theme.cardBgColor }}>Boshlash</div>
              </div>

              {/* Kurs kartochkasi */}
              <div className="mx-3 mt-3 rounded-xl p-3 border" style={{ backgroundColor: theme.cardBgColor, borderColor: theme.bgColor }}>
                <div className="h-16 rounded-lg mb-2" style={{ backgroundColor: theme.primaryColor + "20" }} />
                <p className="text-xs font-semibold" style={{ color: theme.textColor }}>Matematika kursi</p>
                <p className="text-[10px] mt-0.5" style={{ color: theme.secondaryTextColor }}>📚 12 modul · 👥 45 o'quvchi</p>
                <div className="mt-2 h-1.5 rounded-full" style={{ backgroundColor: theme.bgColor }}>
                  <div className="h-full rounded-full w-3/5" style={{ backgroundColor: theme.primaryColor }} />
                </div>
              </div>

              {/* Misol kartochkasi */}
              <div className="mx-3 mt-3 rounded-xl p-3 border" style={{ backgroundColor: theme.cardBgColor, borderColor: theme.bgColor }}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: theme.accentColor + "20", color: theme.accentColor }}>Oson</span>
                  <span className="text-[9px]" style={{ color: theme.secondaryTextColor }}>1 · MISOL</span>
                </div>
                <p className="text-[11px]" style={{ color: theme.textColor }}>x² + 5x + 6 = 0 tenglamani yeching</p>
                <div className="flex gap-2 mt-2">
                  <span className="text-[9px] px-2 py-1 rounded" style={{ backgroundColor: theme.primaryColor + "15", color: theme.primaryColor }}>📖 Yechim</span>
                  <span className="text-[9px] px-2 py-1 rounded" style={{ backgroundColor: "#9333ea15", color: "#9333ea" }}>▶ Video</span>
                </div>
              </div>

              {/* Motivatsiya */}
              <div className="mx-3 mt-3 rounded-xl p-3 text-center" style={{ backgroundColor: theme.primaryColor }}>
                <span className="text-lg">⭐</span>
                <p className="text-[10px] font-medium mt-1" style={{ color: theme.buttonTextColor }}>"Har kuni o'rganish — muvaffaqiyat kaliti"</p>
              </div>

              {/* Bottom spacing */}
              <div className="h-14" />
            </div>

            {/* Bottom nav */}
            <div className="flex items-center justify-around py-2 border-t" style={{ backgroundColor: theme.navBgColor, borderColor: theme.bgColor }}>
              {["🏠", "▶", "📚", "📝", "👤"].map((icon, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className="text-sm" style={{ color: i === 0 ? theme.navActiveColor : theme.secondaryTextColor }}>{icon}</span>
                  <span className="text-[7px]" style={{ color: i === 0 ? theme.navActiveColor : theme.secondaryTextColor }}>
                    {["Bosh", "Davom", "Kurs", "Test", "Profil"][i]}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">Ranglar saqlangach, student ilovada avtomatik qo'llaniladi</p>
        </div>
      </div>
    </div>
  );
}

// ===== Muallif ma'lumotlarini tahrirlash =====
const AUTHOR_PLATFORMS: { value: SocialPlatform; label: string; emoji: string }[] = [
  { value: "telegram", label: "Telegram", emoji: "✈️" },
  { value: "instagram", label: "Instagram", emoji: "📸" },
  { value: "youtube", label: "YouTube", emoji: "▶️" },
  { value: "facebook", label: "Facebook", emoji: "📘" },
  { value: "tiktok", label: "TikTok", emoji: "🎵" },
  { value: "twitter", label: "Twitter / X", emoji: "🐦" },
  { value: "linkedin", label: "LinkedIn", emoji: "💼" },
  { value: "website", label: "Veb-sayt", emoji: "🌐" },
];

function AuthorEditor() {
  const [author, setAuthor] = useState<AuthorInfo>({
    name: "",
    title: "",
    bio: "",
    avatarUrl: "",
    socialLinks: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  useEffect(() => { loadAuthor(); }, []);

  async function loadAuthor() {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "author")
        .maybeSingle();
      if (!error && data?.value) {
        const authorData = data.value as AuthorInfo;
        setAuthor(authorData);
        if (authorData.avatarUrl) setAvatarPreview(authorData.avatarUrl);
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

    let avatarUrl = author.avatarUrl || "";
    if (avatarFile) {
      try {
        const filePath = `author/avatar-${Date.now()}.jpg`;
        const { error: uploadErr } = await supabase.storage.from("edukids").upload(filePath, avatarFile);
        if (uploadErr) throw uploadErr;
        avatarUrl = supabase.storage.from("edukids").getPublicUrl(filePath).data.publicUrl;
      } catch (err: any) {
        console.error("Rasm yuklashda xatolik:", err);
      }
    }

    try {
      const updatedAuthor = { ...author, avatarUrl };
      const { error } = await supabase
        .from("settings")
        .upsert({ key: "author", value: updatedAuthor });
      if (error) throw error;
      setAuthor(updatedAuthor);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error("Saqlashda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  function addSocialLink() {
    setAuthor((prev) => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: "telegram", url: "" }],
    }));
  }

  function updateSocialLink(index: number, field: keyof AuthorSocialLink, value: string) {
    setAuthor((prev) => {
      const links = [...prev.socialLinks];
      links[index] = { ...links[index], [field]: value };
      return { ...prev, socialLinks: links };
    });
  }

  function removeSocialLink(index: number) {
    setAuthor((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index),
    }));
  }

  if (loading) {
    return <div className="flex items-center justify-center py-10"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Muallif ma'lumotlari</h3>
          <p className="text-sm text-gray-500">Student app da logo bosilganda ko'rinadigan muallif haqida ma'lumotlar</p>
        </div>
        <LoadingButton
          onClick={handleSave}
          loading={saving}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <Save size={16} />
          {saved ? "✓ Saqlandi" : "Saqlash"}
        </LoadingButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="space-y-5">
          {/* Avatar */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Muallif rasmi</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl text-gray-400">👤</div>
                )}
              </div>
              <label className="cursor-pointer px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                📷 Rasm tanlash
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) { alert("Maksimal 5MB!"); return; }
                      setAvatarFile(file);
                      setAvatarPreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </label>
            </div>
          </div>

          {/* Ism */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">To'liq ismi</label>
            <input
              value={author.name}
              onChange={(e) => setAuthor((p) => ({ ...p, name: e.target.value }))}
              placeholder="Jo'raboyeva Dilrabo Jaloliddin qizi"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Lavozim / Institut */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lavozim / Muassasa</label>
            <input
              value={author.title || ""}
              onChange={(e) => setAuthor((p) => ({ ...p, title: e.target.value }))}
              placeholder="Samarqand davlat chet tillari instituti"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Bio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Muallif haqida</label>
            <textarea
              value={author.bio}
              onChange={(e) => setAuthor((p) => ({ ...p, bio: e.target.value }))}
              placeholder="Muallif haqida qisqacha ma'lumot..."
              rows={4}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Ijtimoiy tarmoqlar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700">Ijtimoiy tarmoqlar</label>
              <button
                onClick={addSocialLink}
                className="text-xs text-primary-500 font-medium hover:underline"
              >
                + Qo'shish
              </button>
            </div>
            <div className="space-y-3">
              {author.socialLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={link.platform}
                    onChange={(e) => updateSocialLink(i, "platform", e.target.value)}
                    className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  >
                    {AUTHOR_PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>{p.emoji} {p.label}</option>
                    ))}
                  </select>
                  <input
                    value={link.url}
                    onChange={(e) => updateSocialLink(i, "url", e.target.value)}
                    placeholder="https://t.me/kanal"
                    className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    onClick={() => removeSocialLink(i)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {author.socialLinks.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-3">Hali ijtimoiy tarmoq qo'shilmagan</p>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="sticky top-6">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Student app dagi ko'rinishi</h4>
          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm max-w-sm mx-auto">
            {/* Avatar */}
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-primary-100">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center text-2xl">👤</div>
                )}
              </div>
            </div>
            <h3 className="text-base font-bold text-gray-900 text-center mt-3">
              {author.name || "Muallif ismi"}
            </h3>
            {author.title && (
              <p className="text-xs text-primary-500 text-center mt-1">🎓 {author.title}</p>
            )}
            {author.bio && (
              <p className="text-xs text-gray-500 text-center mt-2 leading-relaxed">{author.bio.slice(0, 100)}...</p>
            )}
            {author.socialLinks.length > 0 && (
              <div className="flex justify-center gap-2 mt-4">
                {author.socialLinks.map((link, i) => {
                  const info = AUTHOR_PLATFORMS.find((p) => p.value === link.platform);
                  return (
                    <div key={i} className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-sm">
                      {info?.emoji || "🔗"}
                    </div>
                  );
                })}
              </div>
            )}
            <div className="border-t border-gray-100 mt-4 pt-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">💬 Fikr qoldirish</p>
              <div className="flex gap-0.5 mb-2">
                {[1,2,3,4,5].map((s) => <span key={s} className="text-yellow-400 text-sm">★</span>)}
              </div>
              <div className="h-16 bg-gray-50 border border-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ===== Huquqiy hujjatlar tahrirlash =====
function LegalEditor() {
  const [termsContent, setTermsContent] = useState("");
  const [privacyContent, setPrivacyContent] = useState("");
  const [termsUpdated, setTermsUpdated] = useState<number | null>(null);
  const [privacyUpdated, setPrivacyUpdated] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  useEffect(() => {
    loadLegalContent();
  }, []);

  function formatDate(ts: number): string {
    const d = new Date(ts);
    const months = ["yanvar", "fevral", "mart", "aprel", "may", "iyun", "iyul", "avgust", "sentyabr", "oktyabr", "noyabr", "dekabr"];
    return `${d.getFullYear()}-yil, ${d.getDate()}-${months[d.getMonth()]}`;
  }

  async function loadLegalContent() {
    try {
      const [termsRes, privacyRes] = await Promise.all([
        supabase.from("settings").select("value").eq("key", "legal_terms").maybeSingle(),
        supabase.from("settings").select("value").eq("key", "legal_privacy").maybeSingle(),
      ]);
      if (termsRes.data?.value) {
        const v = termsRes.data.value as any;
        setTermsContent(typeof v === "string" ? v : v.content || "");
        setTermsUpdated(typeof v === "object" && v.updatedAt ? v.updatedAt : null);
      } else {
        setTermsContent(DEFAULT_TERMS_TEXT);
      }
      if (privacyRes.data?.value) {
        const v = privacyRes.data.value as any;
        setPrivacyContent(typeof v === "string" ? v : v.content || "");
        setPrivacyUpdated(typeof v === "object" && v.updatedAt ? v.updatedAt : null);
      } else {
        setPrivacyContent(DEFAULT_PRIVACY_TEXT);
      }
    } catch (err) {
      console.error("Huquqiy hujjatlarni yuklashda xatolik:", err);
      setTermsContent(DEFAULT_TERMS_TEXT);
      setPrivacyContent(DEFAULT_PRIVACY_TEXT);
    } finally {
      setLoading(false);
    }
  }

  /** Barcha o'quvchilarga bildirishnoma yuborish */
  async function notifyStudents(docType: "terms" | "privacy") {
    try {
      const now = Date.now();
      const { data } = await supabase.from("settings").select("value").eq("key", "studentNotifications").maybeSingle();
      const list = (data?.value as any[]) || [];
      const newNotif = {
        id: `legal-${docType}-${now}`,
        type: "legal",
        legalType: docType,
        title: docType === "terms" ? "Foydalanish shartlari yangilandi" : "Maxfiylik siyosati yangilandi",
        body: "Hujjatni o'qib chiqishingizni so'raymiz. Bosing va tanishing.",
        isRead: false,
        createdAt: now,
      };
      await supabase.from("settings").upsert({ key: "studentNotifications", value: [...list, newNotif] });
    } catch (err) {
      console.error("Bildirishnoma yuborishda xatolik:", err);
    }
  }

  async function handleSaveTerms() {
    setSaving(true);
    setSaved("");
    try {
      const now = Date.now();
      const { error } = await supabase.from("settings").upsert({ key: "legal_terms", value: { content: termsContent, updatedAt: now } });
      if (error) throw error;
      setTermsUpdated(now);
      await notifyStudents("terms");
      setSaved("terms");
      setTimeout(() => setSaved(""), 3000);
    } catch (err: any) {
      alert("Saqlashda xatolik: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSavePrivacy() {
    setSaving(true);
    setSaved("");
    try {
      const now = Date.now();
      const { error } = await supabase.from("settings").upsert({ key: "legal_privacy", value: { content: privacyContent, updatedAt: now } });
      if (error) throw error;
      setPrivacyUpdated(now);
      await notifyStudents("privacy");
      setSaved("privacy");
      setTimeout(() => setSaved(""), 3000);
    } catch (err: any) {
      alert("Saqlashda xatolik: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Huquqiy hujjatlar</h3>
        <p className="text-sm text-gray-500">Foydalanish shartlari va maxfiylik siyosati matnlarini tahrirlash. Bu matnlar student ilovasida modal oynada ko'rsatiladi.</p>
      </div>

      {/* Foydalanish shartlari */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">Foydalanish shartlari</label>
            {termsUpdated && <p className="text-xs text-gray-400 mt-0.5">Oxirgi yangilanish: {formatDate(termsUpdated)}</p>}
          </div>
          <button
            onClick={handleSaveTerms}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {saved === "terms" ? <><Check size={14} /> Saqlandi</> : <><Save size={14} /> Saqlash</>}
          </button>
        </div>
        <textarea
          value={termsContent}
          onChange={(e) => setTermsContent(e.target.value)}
          placeholder="Foydalanish shartlari matnini kiriting..."
          rows={16}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
        />
      </div>

      {/* Maxfiylik siyosati */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-gray-900">Maxfiylik siyosati</label>
            {privacyUpdated && <p className="text-xs text-gray-400 mt-0.5">Oxirgi yangilanish: {formatDate(privacyUpdated)}</p>}
          </div>
          <button
            onClick={handleSavePrivacy}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-50"
          >
            {saved === "privacy" ? <><Check size={14} /> Saqlandi</> : <><Save size={14} /> Saqlash</>}
          </button>
        </div>
        <textarea
          value={privacyContent}
          onChange={(e) => setPrivacyContent(e.target.value)}
          placeholder="Maxfiylik siyosati matnini kiriting..."
          rows={16}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
        />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
        <p className="text-xs text-blue-700">
          💡 Matnlar student ilovasida "Foydalanish shartlari" va "Maxfiylik siyosati" tugmalarini bosganida modal oynada ko'rsatiladi.
          Agar matn kiritilmasa, standart namuna matn ko'rsatiladi.
        </p>
      </div>
    </div>
  );
}


// ===== Huquqiy hujjatlar — standart namuna matnlar =====
const DEFAULT_TERMS_TEXT = `1. UMUMIY QOIDALAR

1.1. Ushbu foydalanish shartlari (keyingi o'rinlarda – "Shartlar") tushunGo mobil ilovasi (keyingi o'rinlarda – "Ilova") va uning xizmatlaridan foydalanish qoidalarini belgilaydi.

1.2. Ilovadan foydalanish orqali siz ushbu Shartlarga rozilik bildirasiz. Agar siz Shartlarga rozi bo'lmasangiz, iltimos, Ilovadan foydalanmang.

1.3. Ilova 6 yoshdan 18 yoshgacha bo'lgan o'quvchilar uchun mo'ljallangan ta'lim platformasidir.

2. RO'YXATDAN O'TISH VA HISOB

2.1. Ilovadan to'liq foydalanish uchun ro'yxatdan o'tish talab etiladi.

2.2. Ro'yxatdan o'tishda siz haqiqiy ma'lumotlaringizni kiritishingiz shart.

2.3. 16 yoshga to'lmagan foydalanuvchilar ota-onasi yoki qonuniy vasiysi roziligida ro'yxatdan o'tishlari kerak.

2.4. Hisobingiz xavfsizligi uchun siz javobgarsiz. Parolingizni uchinchi shaxslarga bermang.

3. XIZMATLAR

3.1. Ilova quyidagi xizmatlarni taqdim etadi:
- Matematika, fizika, kimyo va boshqa fanlar bo'yicha video darslar
- Interaktiv testlar va mashqlar
- O'quv materiallari va konspektlar
- Bilim darajasini baholash va sertifikatlash

3.2. Ba'zi xizmatlar pullik (Premium) bo'lib, alohida obuna talab qiladi.

3.3. Biz xizmatlar tarkibini oldindan ogohlantirmasdan o'zgartirish huquqini saqlab qolamiz.

4. TO'LOV VA OBUNA

4.1. Premium obuna narxlari Ilovada ko'rsatilgan.

4.2. To'lov amalga oshirilgandan so'ng, obuna belgilangan muddat davomida amal qiladi.

4.3. Obunani bekor qilish keyingi to'lov muddatidan boshlab amalga oshiriladi.

4.4. Qaytarish siyosati: to'lovdan keyin 3 kun ichida pulni qaytarish so'rovi yuborish mumkin.

5. FOYDALANUVCHI MAJBURIYATLARI

5.1. Foydalanuvchi quyidagilarga rozi bo'ladi:
- Ilovadan faqat qonuniy maqsadlarda foydalanish
- Boshqa foydalanuvchilarning huquqlarini hurmat qilish
- O'quv materiallarini ruxsatsiz tarqatmaslik
- Ilova xavfsizligiga tahdid soluvchi harakatlar qilmaslik

5.2. Qoidalarni buzish hisobning bloklanishiga olib kelishi mumkin.

6. INTELLEKTUAL MULK

6.1. Ilovadagi barcha materiallar (darslar, testlar, rasmlar, videolar) tushunGo mulki hisoblanadi.

6.2. Materiallarni ruxsatsiz nusxalash, tarqatish yoki qayta nashr etish taqiqlanadi.

7. JAVOBGARLIKNI CHEKLASH

7.1. Ilova "boricha" tamoyili asosida taqdim etiladi.

7.2. Biz texnik nosozliklar, ma'lumotlar yo'qotilishi yoki xizmat uzilishi uchun javobgar emasmiz.

7.3. Biz uchinchi tomon xizmatlari (to'lov tizimlari, ijtimoiy tarmoqlar) ishlashi uchun kafolat bermaymiz.

8. SHARTLARNI O'ZGARTIRISH

8.1. Biz ushbu Shartlarni istalgan vaqtda o'zgartirish huquqini saqlab qolamiz.

8.2. O'zgarishlar Ilovada e'lon qilingan paytdan boshlab kuchga kiradi.

8.3. Ilovadan foydalanishni davom ettirish yangi Shartlarga rozilik hisoblanadi.

9. ALOQA

Savollar yoki shikoyatlar uchun: support@tushungo.uz

© tushunGo. Barcha huquqlar himoyalangan.`;

const DEFAULT_PRIVACY_TEXT = `1. KIRISH

1.1. Ushbu maxfiylik siyosati tushunGo mobil ilovasi foydalanuvchilarining shaxsiy ma'lumotlarini qanday yig'ish, saqlash va ishlatishimiz haqida ma'lumot beradi.

1.2. Ilovadan foydalanish orqali siz ushbu siyosatga rozilik bildirasiz.

2. YIG'ILADIGAN MA'LUMOTLAR

2.1. Ro'yxatdan o'tish ma'lumotlari:
- Ism va familiya
- Telefon raqam
- Email manzil (ixtiyoriy)
- Tug'ilgan sana (ixtiyoriy)

2.2. Foydalanish ma'lumotlari:
- Ilova ichidagi harakatlar (darslarni ko'rish, testlar natijasi)
- O'quv progressi va statistika
- Qurilma turi va operatsion tizim versiyasi

2.3. Texnik ma'lumotlar:
- IP manzil
- Qurilma identifikatori
- Ilova versiyasi

3. MA'LUMOTLARDAN FOYDALANISH

3.1. Yig'ilgan ma'lumotlar quyidagi maqsadlarda ishlatiladi:
- Xizmatlarni taqdim etish va yaxshilash
- Shaxsiylashtirilgan o'quv tavsiyalari berish
- Texnik muammolarni hal qilish
- Xavfsizlikni ta'minlash
- Statistik tahlil (anonim holda)

3.2. Biz ma'lumotlaringizni uchinchi shaxslarga SOTMAYMIZ yoki BERMAYMIZ.

4. MA'LUMOTLARNI SAQLASH

4.1. Ma'lumotlar xavfsiz serverlarda shifrlangan holda saqlanadi.

4.2. Biz ma'lumotlarni faqat kerakli muddat davomida saqlaymiz.

4.3. Hisob o'chirilganda, shaxsiy ma'lumotlar 30 kun ichida o'chiriladi.

5. FOYDALANUVCHI HUQUQLARI

5.1. Siz quyidagi huquqlarga egasiz:
- O'z ma'lumotlaringizni ko'rish va yuklab olish
- Ma'lumotlarni tuzatish yoki yangilash
- Hisobni o'chirish va ma'lumotlarni olib tashlash so'rovi
- Marketing xabarlaridan voz kechish

5.2. Huquqlaringizdan foydalanish uchun support@tushungo.uz ga murojaat qiling.

6. BOLALAR MAXFIYLIGI

6.1. Biz 16 yoshdan kichik foydalanuvchilarning maxfiyligiga alohida e'tibor beramiz.

6.2. 16 yoshdan kichik foydalanuvchilardan minimal ma'lumot olamiz.

6.3. Ota-onalar istalgan vaqtda farzandlarining ma'lumotlarini ko'rish yoki o'chirish so'rovini yuborishi mumkin.

7. COOKIE VA KUZATISH

7.1. Ilova foydalanuvchi sessiyasini saqlash uchun local storage ishlatadi.

7.2. Biz uchinchi tomon kuzatish xizmatlari (analytics) ishlatamiz (faqat anonim statistika uchun).

8. XAVFSIZLIK

8.1. Ma'lumotlar SSL/TLS shifrlash orqali uzatiladi.

8.2. Serverlar xavfsiz ma'lumotlar markazlarida joylashgan.

8.3. Doimiy xavfsizlik tekshiruvlari o'tkaziladi.

9. O'ZGARISHLAR

9.1. Biz ushbu siyosatni vaqti-vaqti bilan yangilashimiz mumkin.

9.2. Muhim o'zgarishlar haqida Ilova orqali xabar beramiz.

10. ALOQA

Maxfiylik masalalari bo'yicha: support@tushungo.uz

© tushunGo. Barcha huquqlar himoyalangan.`;
