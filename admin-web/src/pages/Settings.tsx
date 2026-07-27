import { useState, useEffect } from "react";
import { Save, DollarSign, Globe, Shield, Bell, Palette, Server, User, Check } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@shared/firebase";
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
  platformName: "EduKids",
  logoUrl: "",
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
  const [activeTab, setActiveTab] = useState<"general" | "payments" | "notifications" | "theme" | "author">("general");

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
    { id: "general" as const, label: "Umumiy", icon: <Globe size={16} /> },
    { id: "payments" as const, label: "To'lov usullari", icon: <Shield size={16} /> },
    { id: "notifications" as const, label: "Bildirishnomalar", icon: <Bell size={16} /> },
    { id: "theme" as const, label: "Interfeys", icon: <Palette size={16} /> },
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
                          const storageRef = ref(storage, `branding/logo-${Date.now()}.${file.name.split('.').pop()}`);
                          await uploadBytes(storageRef, file);
                          const url = await getDownloadURL(storageRef);
                          updateField("logoUrl", url);
                          // Avtomatik saqlash — admin alohida "Saqlash" bosmasligiga to'g'ri keladi
                          await setDoc(doc(db, "settings", "platform"), { ...settings, logoUrl: url });
                        } catch (err) {
                          console.error("Logo yuklashda xatolik:", err);
                          alert("Logo yuklashda xatolik yuz berdi");
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
                  <span className="text-sm font-bold" style={{ color: theme.primaryColor }}>EduKids</span>
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
      const snap = await getDoc(doc(db, "settings", "author"));
      if (snap.exists()) {
        const data = snap.data() as AuthorInfo;
        setAuthor(data);
        if (data.avatarUrl) setAvatarPreview(data.avatarUrl);
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
        const storageRef = ref(storage, `author/avatar-${Date.now()}.jpg`);
        await uploadBytes(storageRef, avatarFile);
        avatarUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("Rasm yuklashda xatolik:", err);
      }
    }

    try {
      await setDoc(doc(db, "settings", "author"), { ...author, avatarUrl });
      setAuthor((prev) => ({ ...prev, avatarUrl }));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
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
