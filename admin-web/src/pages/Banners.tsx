import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff, X, GripVertical } from "lucide-react";
import { getAllBanners, createBanner, updateBanner, deleteBanner, getAllCourses } from "@shared/repositories";
import { uploadFile } from "@shared/supabase";
import type { HomeBanner, Course } from "@shared/types";
import LoadingButton from "../components/LoadingButton";
import DesktopImageUpload from "../components/DesktopImageUpload";

/** Banner rasmi uchun tavsiya etiladigan o'lchamlar (px) */
const BANNER_PX = {
  mobile: { width: 800, height: 450 },   // 16:9 — telefon ekrani
  desktop: { width: 2400, height: 800 }, // 3:1 — kompyuterda banner keng va baland
};

export default function Banners() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editBanner, setEditBanner] = useState<HomeBanner | null>(null);

  // Form fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [buttonText, setButtonText] = useState("Boshlash");
  const [courseId, setCourseId] = useState("");
  const [bgColor, setBgColor] = useState("#3b82f6");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imagePosition, setImagePosition] = useState("center");
  const [imageFit, setImageFit] = useState<"cover" | "contain">("cover");
  const [imageFullWidth, setImageFullWidth] = useState(false);
  const [imageOpacity, setImageOpacity] = useState(70);
  // Desktop versiyasi uchun alohida rasm
  const [imageFileDesktop, setImageFileDesktop] = useState<File | null>(null);
  const [imagePreviewDesktop, setImagePreviewDesktop] = useState("");
  const [imagePositionDesktop, setImagePositionDesktop] = useState("center");
  const [imageFitDesktop, setImageFitDesktop] = useState<"cover" | "contain">("cover");
  const [imageOpacityDesktop, setImageOpacityDesktop] = useState(70);
  const [textColor, setTextColor] = useState("#ffffff");
  const [textOpacity, setTextOpacity] = useState(100);
  const [buttonPosition, setButtonPosition] = useState("");
  const [showButton, setShowButton] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    const [b, c] = await Promise.all([getAllBanners(), getAllCourses()]);
    setBanners(b);
    setCourses(c);
    setLoading(false);
  }

  function openCreate() {
    setEditBanner(null);
    setTitle(""); setSubtitle(""); setButtonText("Boshlash"); setCourseId(""); setBgColor("#3b82f6");
    setImageFile(null); setImagePreview(""); setImagePosition("center"); setImageFit("cover"); setImageFullWidth(false);
    setImageOpacity(70);
    setImageFileDesktop(null); setImagePreviewDesktop(""); setImagePositionDesktop("center");
    setImageFitDesktop("cover"); setImageOpacityDesktop(70);
    setTextColor("#ffffff"); setTextOpacity(100); setButtonPosition(""); setShowButton(true);
    setShowForm(true);
  }

  function openEdit(banner: HomeBanner) {
    setEditBanner(banner);
    setTitle(banner.title); setSubtitle(banner.subtitle || ""); setButtonText(banner.buttonText);
    setCourseId(banner.courseId || ""); setBgColor(banner.bgColor || "#3b82f6");
    setImagePreview(banner.imageUrl || ""); setImageFile(null);
    setImagePosition(banner.imagePosition || "center"); setImageFit(banner.imageFit || "cover");
    setImageFullWidth(banner.imageFullWidth || false);
    setImageOpacity(banner.imageOpacity ?? (banner.imageFullWidth ? 70 : 50));
    setImagePreviewDesktop(banner.imageUrlDesktop || ""); setImageFileDesktop(null);
    setImagePositionDesktop(banner.imagePositionDesktop || banner.imagePosition || "center");
    setImageFitDesktop(banner.imageFitDesktop || banner.imageFit || "cover");
    setImageOpacityDesktop(banner.imageOpacityDesktop ?? banner.imageOpacity ?? (banner.imageFullWidth ? 70 : 50));
    setTextColor(banner.textColor || "#ffffff"); setTextOpacity(banner.textOpacity ?? 100);
    setButtonPosition(banner.buttonPosition || ""); setShowButton(banner.showButton !== false);
    setShowForm(true);
  }

  async function handleSave() {
    setSaving(true);
    const now = Date.now();

    // Mobil rasm
    let imageUrl = editBanner?.imageUrl || "";
    if (imageFile) {
      try {
        imageUrl = await uploadFile("edukids", `banners/${now}-mobile-${imageFile.name}`, imageFile);
      } catch (err: any) {
        console.error("Mobil rasm yuklashda xatolik:", err);
      }
    }
    if (!imagePreview && !imageFile) imageUrl = "";

    // Desktop rasm (ixtiyoriy — bo'sh bo'lsa student app mobil rasmga qaytadi)
    let imageUrlDesktop = editBanner?.imageUrlDesktop || "";
    if (imageFileDesktop) {
      try {
        imageUrlDesktop = await uploadFile(
          "edukids",
          `banners/${now}-desktop-${imageFileDesktop.name}`,
          imageFileDesktop
        );
      } catch (err: any) {
        console.error("Desktop rasm yuklashda xatolik:", err);
      }
    }
    if (!imagePreviewDesktop && !imageFileDesktop) imageUrlDesktop = "";

    try {
      if (editBanner) {
        await updateBanner(editBanner.id, {
          title: title.trim(), subtitle: subtitle.trim(), buttonText: buttonText.trim(),
          courseId: courseId || undefined, bgColor, imageUrl: imageUrl || undefined,
          imagePosition, imageFit, imageFullWidth, imageOpacity,
          imageUrlDesktop: imageUrlDesktop || undefined,
          imagePositionDesktop, imageFitDesktop, imageOpacityDesktop,
          textColor, textOpacity, buttonPosition: buttonPosition || undefined,
          showButton,
        });
      } else {
        const banner: HomeBanner = {
          id: `banner-${now}`, title: title.trim(), subtitle: subtitle.trim(),
          buttonText: buttonText.trim(), courseId: courseId || undefined,
          bgColor, imageUrl: imageUrl || undefined,
          imagePosition, imageFit, imageFullWidth, imageOpacity,
          imageUrlDesktop: imageUrlDesktop || undefined,
          imagePositionDesktop, imageFitDesktop, imageOpacityDesktop,
          textColor, textOpacity, buttonPosition: buttonPosition || undefined,
          showButton,
          isActive: true, order: banners.length + 1,
          createdAt: now, updatedAt: now,
        };
        await createBanner(banner);
      }
      setShowForm(false);
      await loadData();
    } catch (err) {
      console.error("Banner saqlashda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu bannerni o'chirishga ishonchingiz komilmi?")) return;
    await deleteBanner(id);
    await loadData();
  }

  async function handleToggle(banner: HomeBanner) {
    await updateBanner(banner.id, { isActive: !banner.isActive });
    await loadData();
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bannerlar</h1>
          <p className="text-gray-500 mt-1">Bosh sahifadagi karusel bannerlarini boshqarish</p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Yangi banner
        </button>
      </div>

      {/* Banner form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-primary-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900">{editBanner ? "Bannerni tahrirlash" : "Yangi banner yaratish"}</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sarlavha</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Milliy sertifikatga tayyormisiz?" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kichik matn</label>
              <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ixtiyoriy qo'shimcha matn" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
            </div>

            {/* Yo'naltirish turi tanlash */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Kursga yo'naltirish turi</label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowButton(true)}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${showButton ? "border-primary-400 bg-primary-50 text-primary-700 ring-1 ring-primary-200" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                >
                  🔘 Tugma orqali
                  <p className="text-[10px] font-normal mt-0.5 opacity-70">Foydalanuvchi tugmani bosadi</p>
                </button>
                <button
                  type="button"
                  onClick={() => setShowButton(false)}
                  className={`flex-1 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${!showButton ? "border-primary-400 bg-primary-50 text-primary-700 ring-1 ring-primary-200" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                >
                  👆 To'g'ridan-to'g'ri
                  <p className="text-[10px] font-normal mt-0.5 opacity-70">Banner bosilganda kursga o'tadi</p>
                </button>
              </div>
            </div>

            {showButton && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tugma matni</label>
                <input value={buttonText} onChange={(e) => setButtonText(e.target.value)} placeholder="Boshlash" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm" />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kursga yo'naltirish</label>
              <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                <option value="">Tanlanmagan</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-gray-700">Matn shaffofligi</label>
                <span className="text-xs font-mono text-primary-600">{textOpacity}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={5}
                value={textOpacity}
                onChange={(e) => setTextOpacity(Number(e.target.value))}
                className="w-full accent-primary-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fon rangi</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Matn rangi</label>
              <div className="flex items-center gap-2">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer" />
                <input value={textColor} onChange={(e) => setTextColor(e.target.value)} className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📱 Mobil rasm (ixtiyoriy)
              </label>
              <div className="flex items-center gap-2">
                {imagePreview && <img src={imagePreview} alt="" className="h-10 rounded-lg border" />}
                <label className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 cursor-pointer hover:bg-gray-50">
                  📷 Tanlash
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} />
                </label>
                {imagePreview && (
                  <button
                    type="button"
                    onClick={() => { setImageFile(null); setImagePreview(""); }}
                    className="px-2.5 py-2.5 border border-gray-200 rounded-lg text-xs text-gray-500 hover:text-red-500 hover:bg-red-50"
                  >
                    O'chirish
                  </button>
                )}
              </div>
              <p className="text-[11px] text-gray-400 mt-1.5">
                Tavsiya: <strong>{BANNER_PX.mobile.width}×{BANNER_PX.mobile.height} px</strong> (16:9)
              </p>
            </div>
          </div>

          {/* Desktop versiyasi uchun alohida banner rasmi */}
          <DesktopImageUpload
            label="🖥 Desktop banner rasmi"
            preview={imagePreviewDesktop}
            onFileSelect={(f) => {
              setImageFileDesktop(f);
              setImagePreviewDesktop(URL.createObjectURL(f));
            }}
            onClear={() => {
              setImageFileDesktop(null);
              setImagePreviewDesktop("");
            }}
            recommended={BANNER_PX.desktop}
            mobileRecommended={BANNER_PX.mobile}
            aspectRatio="3 / 1"
            fit={imageFitDesktop}
            position={imagePositionDesktop}
            hint="Kompyuterda banner ekran bo'ylab keng va baland ko'rinadi — shuning uchun kengroq (3:1) rasm kerak. Matn chap tomonda joylashadi, shuning uchun rasmning muhim qismi o'ng tomonda bo'lsa yaxshi."
          />

          {/* Desktop rasm sozlamalari */}
          {imagePreviewDesktop && (
            <div className="rounded-xl border border-indigo-100 bg-white p-4 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Desktop rasm o'lchami</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImageFitDesktop("cover")}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border font-medium ${imageFitDesktop === "cover" ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    Cover (to'liq)
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageFitDesktop("contain")}
                    className={`flex-1 px-3 py-2 text-xs rounded-lg border font-medium ${imageFitDesktop === "contain" ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}
                  >
                    Contain (sig'adi)
                  </button>
                </div>
                <div className="flex items-center justify-between mt-3 mb-1">
                  <label className="text-xs font-medium text-gray-600">Desktop rasm shaffofligi</label>
                  <span className="text-[11px] font-mono text-indigo-600">{imageOpacityDesktop}%</span>
                </div>
                <input
                  type="range" min={0} max={100} step={5}
                  value={imageOpacityDesktop}
                  onChange={(e) => setImageOpacityDesktop(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Desktopda qaysi qismi ko'rinsin</label>
                <div className="grid grid-cols-3 gap-1">
                  {["top left", "top center", "top right", "center left", "center", "center right", "bottom left", "bottom center", "bottom right"].map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => setImagePositionDesktop(pos)}
                      className={`px-1 py-1.5 text-[10px] rounded border text-center ${imagePositionDesktop === pos ? "border-indigo-400 bg-indigo-50 text-indigo-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                    >
                      {pos.replace("center", "O'rta").replace("top", "Yuqori").replace("bottom", "Pastki").replace("left", "Chap").replace("right", "O'ng")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Rasm pozitsiyasi sozlamalari */}
          {imagePreview && (
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Rasm sozlamalari</h4>

              {/* To'liq yoyish toggle */}
              <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-gray-700">Rasmni banner bo'ylab yoyish</p>
                  <p className="text-[10px] text-gray-400">Fon sifatida to'liq banner'ni qoplaydi (matn ustida ko'rinadi)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setImageFullWidth(!imageFullWidth)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${imageFullWidth ? "bg-primary-500" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${imageFullWidth ? "translate-x-5" : ""}`} />
                </button>
              </div>

              {/* Shaffoflik (opacity) */}
              <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">Rasm shaffofligi (prozrachnost)</p>
                  <span className="text-xs font-mono text-primary-600">{imageOpacity}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={imageOpacity}
                  onChange={(e) => setImageOpacity(Number(e.target.value))}
                  className="w-full accent-primary-500 cursor-pointer"
                />
                <p className="text-[10px] text-gray-400 mt-1">0% — butunlay shaffof, 100% — to'liq ko'rinadigan rasm</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Qaysi qismi ko'rinsin</label>
                  <div className="grid grid-cols-3 gap-1">
                    {["top left", "top center", "top right", "center left", "center", "center right", "bottom left", "bottom center", "bottom right"].map((pos) => (
                      <button
                        key={pos}
                        type="button"
                        onClick={() => setImagePosition(pos)}
                        className={`px-1 py-1.5 text-[10px] rounded border text-center ${imagePosition === pos ? "border-primary-400 bg-primary-50 text-primary-700 font-medium" : "border-gray-200 text-gray-500 hover:bg-gray-100"}`}
                      >
                        {pos.replace("center", "O'rta").replace("top", "Yuqori").replace("bottom", "Pastki").replace("left", "Chap").replace("right", "O'ng")}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Rasm o'lchami</label>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setImageFit("cover")} className={`flex-1 px-3 py-2 text-xs rounded-lg border ${imageFit === "cover" ? "border-primary-400 bg-primary-50 text-primary-700 font-medium" : "border-gray-200 text-gray-500"}`}>
                      Cover (to'liq)
                    </button>
                    <button type="button" onClick={() => setImageFit("contain")} className={`flex-1 px-3 py-2 text-xs rounded-lg border ${imageFit === "contain" ? "border-primary-400 bg-primary-50 text-primary-700 font-medium" : "border-gray-200 text-gray-500"}`}>
                      Contain (sig'adi)
                    </button>
                  </div>
                </div>
              </div>

              {/* Tavsiya o'lchami */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
                <p className="text-xs text-blue-700 font-medium">📐 Tavsiya etiladigan rasm o'lchamlari:</p>
                <p className="text-xs text-blue-600">
                  📱 <strong>Mobil (telefon / planshet):</strong>{" "}
                  <code className="font-mono">{BANNER_PX.mobile.width}×{BANNER_PX.mobile.height} px</code> (16:9)
                  {" "}— banner balandligi ~180 px
                </p>
                <p className="text-xs text-blue-600">
                  🖥 <strong>Desktop (kompyuter):</strong>{" "}
                  <code className="font-mono">{BANNER_PX.desktop.width}×{BANNER_PX.desktop.height} px</code> (3:1)
                  {" "}— banner balandligi 320–460 px, kengligi ekran bo'ylab
                </p>
                <p className="text-xs text-blue-600">
                  • Rasmni faqat o'ng tomonda ko'rsatish uchun (yoyilmagan holat):{" "}
                  <code className="font-mono">600×450 px</code> mobil,{" "}
                  <code className="font-mono">1200×800 px</code> desktop
                </p>
                <p className="text-[11px] text-blue-500 pt-0.5">
                  Har bir fayl 500 KB dan oshmasligi tavsiya etiladi — shunda sahifa tez yuklanadi.
                </p>
              </div>
            </div>
          )}

          {/* Desktop preview — kompyuterdagi haqiqiy ko'rinish */}
          <div>
            <p className="text-xs text-gray-500 mb-2">🖥 Desktop (kompyuter) versiyasidagi ko'rinishi:</p>
            <div className="rounded-xl border border-gray-200 bg-gray-100 p-3 overflow-hidden">
              <div
                className="rounded-2xl relative overflow-hidden"
                style={{ backgroundColor: bgColor, aspectRatio: "3 / 1" }}
              >
                {(() => {
                  const dkImg = imagePreviewDesktop || imagePreview;
                  const dkFit = imagePreviewDesktop ? imageFitDesktop : imageFit;
                  const dkPos = imagePreviewDesktop ? imagePositionDesktop : imagePosition;
                  const dkOpacity = (imagePreviewDesktop ? imageOpacityDesktop : imageOpacity) / 100;
                  if (!dkImg) return null;
                  return (
                    <img
                      src={dkImg}
                      alt=""
                      className={imageFullWidth ? "absolute inset-0 w-full h-full" : "absolute right-0 top-0 h-full w-1/2"}
                      style={{ objectFit: dkFit, objectPosition: dkPos, opacity: dkOpacity }}
                      draggable={false}
                    />
                  );
                })()}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: imageFullWidth
                      ? "linear-gradient(100deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.22) 46%, rgba(0,0,0,0) 72%)"
                      : "linear-gradient(100deg, rgba(0,0,0,0.14) 0%, rgba(0,0,0,0) 55%)",
                  }}
                />
                <div className="relative z-10 h-full flex flex-col justify-center px-8 max-w-[62%]">
                  <p
                    className="font-extrabold leading-tight"
                    style={{ color: textColor, opacity: textOpacity / 100, fontSize: "clamp(15px, 2.4vw, 30px)" }}
                  >
                    {title || "Sarlavha"}
                  </p>
                  {subtitle && (
                    <p
                      className="mt-2 leading-snug"
                      style={{ color: textColor, opacity: (textOpacity / 100) * 0.86, fontSize: "clamp(10px, 1vw, 14px)" }}
                    >
                      {subtitle}
                    </p>
                  )}
                  {showButton && (
                    <span className="mt-4 self-start inline-block bg-white/95 text-gray-900 text-xs font-bold px-5 py-2 rounded-full shadow-lg">
                      {buttonText || "Tugma"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {!imagePreviewDesktop && imagePreview && (
              <p className="text-[11px] text-amber-600 mt-1.5 flex items-center gap-1">
                ⚠️ Desktop rasmi yuklanmagan — mobil rasm cho'zib ko'rsatilmoqda (xiralashishi mumkin)
              </p>
            )}
          </div>

          {/* Preview — student appdagi ko'rinish (mobil ramka) */}
          <div>
            <p className="text-xs text-gray-500 mb-2">📱 Mobil (telefon) versiyasidagi ko'rinishi:</p>
            <div className="border-[3px] border-gray-800 rounded-[1.5rem] overflow-hidden mx-auto" style={{ width: "320px" }}>
              <div className="bg-gray-50 p-4">
                <div
                  className="rounded-2xl p-5 relative overflow-hidden"
                  style={{ backgroundColor: bgColor, minHeight: "160px" }}
                >
                  {imagePreview && !imageFullWidth && (
                    <img src={imagePreview} alt="" className="absolute right-0 top-0 h-full w-1/3" style={{ objectFit: imageFit, objectPosition: imagePosition, opacity: imageOpacity / 100 }} draggable={false} />
                  )}
                  {imagePreview && imageFullWidth && (
                    <img src={imagePreview} alt="" className="absolute inset-0 w-full h-full" style={{ objectFit: imageFit, objectPosition: imagePosition, opacity: imageOpacity / 100 }} draggable={false} />
                  )}
                  <h2 className="text-lg font-bold leading-tight relative z-10" style={{ color: textColor, opacity: textOpacity / 100 }}>
                    {title || "Sarlavha"}
                  </h2>
                  {subtitle && (
                    <p className="text-sm mt-1 relative z-10" style={{ color: textColor, opacity: (textOpacity / 100) * 0.8 }}>
                      {subtitle}
                    </p>
                  )}
                  {showButton && (() => {
                    const bp = buttonPosition ? (() => { const m = buttonPosition.match(/([\d.]+)%?\s+([\d.]+)%?/); return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null; })() : null;
                    return bp ? (
                      <div className="absolute bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl z-10" style={{ left: `${bp.x}%`, top: `${bp.y}%`, transform: "translate(-50%, -50%)" }}>
                        {buttonText || "Tugma"}
                      </div>
                    ) : (
                      <div className="mt-3 inline-block bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl relative z-10">
                        {buttonText || "Tugma"}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Drag editor — rasm va tugma pozitsiyasini o'zgartirish */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500">Pozitsiya tahrirlash: <span className="text-gray-400">(rasmni yoki tugmani sudrab joylang)</span></p>
              {buttonPosition && (
                <button type="button" onClick={() => setButtonPosition("")} className="text-[11px] text-primary-500 font-medium hover:text-primary-700">
                  ↺ Tugma joyini standartga qaytarish
                </button>
              )}
            </div>
            <BannerPreviewDraggable
              title={title}
              subtitle={subtitle}
              buttonText={buttonText}
              showButton={showButton}
              bgColor={bgColor}
              textColor={textColor}
              textOpacity={textOpacity}
              imagePreview={imagePreview}
              imageFullWidth={imageFullWidth}
              imageFit={imageFit}
              imagePosition={imagePosition}
              imageOpacity={imageOpacity}
              buttonPosition={buttonPosition}
              onPositionChange={setImagePosition}
              onButtonPositionChange={setButtonPosition}
            />
          </div>

          <div className="flex gap-3">
            <LoadingButton onClick={handleSave} className="btn-primary">
              {editBanner ? "Saqlash" : "Yaratish"}
            </LoadingButton>
            <button onClick={() => setShowForm(false)} className="btn-outline">Bekor</button>
          </div>
        </div>
      )}

      {/* Bannerlar ro'yxati */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {banners.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">🖼️</p>
            <p>Hali banner yaratilmagan</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {banners.map((banner) => (
              <div key={banner.id} className={`flex items-center gap-4 p-4 ${!banner.isActive ? "opacity-50" : ""}`}>
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                <div className="w-16 h-10 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold overflow-hidden relative" style={{ backgroundColor: banner.bgColor }}>
                  {banner.imageUrl && <img src={banner.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                  <span className="relative z-10 truncate px-1">{banner.order}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{banner.title}</p>
                  <p className="text-xs text-gray-500">Tugma: "{banner.buttonText}" → {banner.courseId ? courses.find(c => c.id === banner.courseId)?.title || banner.courseId : "Link yo'q"}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <LoadingButton onClick={() => handleToggle(banner)} className={`p-1.5 rounded-lg ${banner.isActive ? "text-green-600 hover:bg-green-50" : "text-gray-400 hover:bg-gray-50"}`} title={banner.isActive ? "Faol" : "Nofaol"} iconOnly>
                    {banner.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </LoadingButton>
                  <button onClick={() => openEdit(banner)} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-all active:scale-95"><Edit className="w-4 h-4" /></button>
                  <LoadingButton onClick={() => handleDelete(banner.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg" iconOnly><Trash2 className="w-4 h-4" /></LoadingButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


// ===== Drag bilan rasm pozitsiyasi, matn rangi va tugma joyini o'zgartirish =====
function BannerPreviewDraggable({
  title, subtitle, buttonText, showButton, bgColor, textColor, textOpacity, imagePreview, imageFullWidth, imageFit, imagePosition, imageOpacity, buttonPosition, onPositionChange, onButtonPositionChange,
}: {
  title: string; subtitle: string; buttonText: string; showButton: boolean; bgColor: string;
  textColor: string; textOpacity: number;
  imagePreview: string; imageFullWidth: boolean; imageFit: "cover" | "contain";
  imagePosition: string; imageOpacity: number;
  buttonPosition: string; onPositionChange: (pos: string) => void; onButtonPositionChange: (pos: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Nima drag qilinayotgani: "image" | "button" | null
  const [dragTarget, setDragTarget] = useState<"image" | "button" | null>(null);

  // imagePosition ni x%, y% formatga parse qilish
  function parsePosition(pos: string): { x: number; y: number } {
    const map: Record<string, { x: number; y: number }> = {
      "top left": { x: 0, y: 0 }, "top center": { x: 50, y: 0 }, "top right": { x: 100, y: 0 },
      "center left": { x: 0, y: 50 }, "center": { x: 50, y: 50 }, "center right": { x: 100, y: 50 },
      "bottom left": { x: 0, y: 100 }, "bottom center": { x: 50, y: 100 }, "bottom right": { x: 100, y: 100 },
    };
    if (map[pos]) return map[pos];
    // "x% y%" formatini parse qilish
    const match = pos.match(/([\d.]+)%?\s+([\d.]+)%?/);
    if (match) return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
    return { x: 50, y: 50 };
  }

  function startImageDrag(e: React.MouseEvent | React.TouchEvent) {
    if (!imagePreview) return;
    e.preventDefault();
    e.stopPropagation();
    setDragTarget("image");
    const point = "touches" in e ? e.touches[0] : e;
    updatePosition(point.clientX, point.clientY, "image");
  }

  function startButtonDrag(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragTarget("button");
    const point = "touches" in e ? e.touches[0] : e;
    updatePosition(point.clientX, point.clientY, "button");
  }

  function handleMove(clientX: number, clientY: number) {
    if (!dragTarget) return;
    updatePosition(clientX, clientY, dragTarget);
  }

  function updatePosition(clientX: number, clientY: number, target: "image" | "button") {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 1000) / 10));
    const y = Math.max(0, Math.min(100, Math.round(((clientY - rect.top) / rect.height) * 1000) / 10));
    if (target === "image") onPositionChange(`${x}% ${y}%`);
    else onButtonPositionChange(`${x}% ${y}%`);
  }

  const pos = parsePosition(imagePosition);
  const btnPos = buttonPosition ? parsePosition(buttonPosition) : null;
  const textStyle: React.CSSProperties = { color: textColor, opacity: textOpacity / 100 };

  return (
    <div
      ref={containerRef}
      className="rounded-2xl p-5 relative overflow-hidden select-none min-h-[180px]"
      style={{ backgroundColor: bgColor }}
      onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
      onMouseUp={() => setDragTarget(null)}
      onMouseLeave={() => setDragTarget(null)}
      onTouchMove={(e) => { if (dragTarget) handleMove(e.touches[0].clientX, e.touches[0].clientY); }}
      onTouchEnd={() => setDragTarget(null)}
    >
      {imagePreview && !imageFullWidth && (
        <img
          src={imagePreview} alt=""
          className={`absolute right-0 top-0 h-full w-1/3 ${dragTarget === "image" ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ objectFit: imageFit, objectPosition: imagePosition, opacity: imageOpacity / 100 }}
          onMouseDown={startImageDrag}
          onTouchStart={startImageDrag}
          draggable={false}
        />
      )}
      {imagePreview && imageFullWidth && (
        <img
          src={imagePreview} alt=""
          className={`absolute inset-0 w-full h-full ${dragTarget === "image" ? "cursor-grabbing" : "cursor-grab"}`}
          style={{ objectFit: imageFit, objectPosition: imagePosition, opacity: imageOpacity / 100 }}
          onMouseDown={startImageDrag}
          onTouchStart={startImageDrag}
          draggable={false}
        />
      )}
      {/* Rasm pozitsiya indikatori */}
      {imagePreview && (
        <div
          className="absolute w-4 h-4 bg-white rounded-full border-2 border-primary-500 shadow-lg z-20 pointer-events-none"
          style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
        />
      )}
      {/* Matn */}
      <p className="text-xl font-bold relative z-10 pointer-events-none" style={textStyle}>{title || "Sarlavha"}</p>
      {subtitle && <p className="text-sm mt-1 relative z-10 pointer-events-none" style={{ ...textStyle, opacity: (textOpacity / 100) * 0.8 }}>{subtitle}</p>}

      {/* Tugma — standart holatda matn ostida, buttonPosition belgilangan bo'lsa — absolute + drag qilinadigan */}
      {showButton && (btnPos ? (
        <div
          className={`absolute bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl z-20 select-none ${dragTarget === "button" ? "cursor-grabbing ring-2 ring-primary-400" : "cursor-grab"}`}
          style={{ left: `${btnPos.x}%`, top: `${btnPos.y}%`, transform: "translate(-50%, -50%)" }}
          onMouseDown={startButtonDrag}
          onTouchStart={startButtonDrag}
        >
          {buttonText || "Tugma"}
        </div>
      ) : (
        <div
          className={`mt-3 inline-block bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-xl relative z-20 select-none ${dragTarget === "button" ? "cursor-grabbing ring-2 ring-primary-400" : "cursor-grab"}`}
          onMouseDown={startButtonDrag}
          onTouchStart={startButtonDrag}
        >
          {buttonText || "Tugma"}
        </div>
      ))}

      {/* Pozitsiya qiymatlarini ko'rsatish */}
      {(imagePreview || btnPos) && (
        <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded z-20 pointer-events-none font-mono space-y-0.5 text-right">
          {imagePreview && <div>🖼 {imagePosition}</div>}
          {btnPos && <div>🔘 {buttonPosition}</div>}
        </div>
      )}
    </div>
  );
}
