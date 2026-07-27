import { useState, useRef } from "react";
import { Download, Upload, Database, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { collection, getDocs, doc, setDoc, writeBatch } from "firebase/firestore";
import { ref, listAll, getBlob } from "firebase/storage";
import { db, storage } from "@shared/firebase";
import JSZip from "jszip";

interface BackupProgress {
  current: string;
  done: number;
  total: number;
}

// Barcha asosiy Firestore kolleksiyalar
const ROOT_COLLECTIONS = [
  "courses",
  "users",
  "categories",
  "testLists",
  "testLibrary",
  "testBuilderQuestions",
  "testBuilderFolders",
  "motivations",
  "motivationSettings",
  "socialLinks",
  "promoCodes",
  "adminNotifications",
  "homeBanners",
  "newsItems",
  "testimonials",
  "progress",
  "testResults",
  "subscriptions",
  "payments",
  "userActivity",
  "favorites",
  "certificates",
  "userDevices",
];

// Kurslar ichidagi subcollection lar
const COURSE_SUBCOLLECTIONS = ["topics", "tests", "folders", "advices", "socialLinks"];

// Topic ichidagi subcollection lar
const TOPIC_SUBCOLLECTIONS = ["problems"];

export default function Backup() {
  const [backing, setBacking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<BackupProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [includeFiles, setIncludeFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function fetchCollection(path: string): Promise<any[]> {
    try {
      const parts = path.split("/");
      const colRef = parts.length === 1
        ? collection(db, parts[0])
        : parts.length === 3
          ? collection(db, parts[0], parts[1], parts[2])
          : collection(db, parts[0], parts[1], parts[2], parts[3], parts[4]);
      const snap = await getDocs(colRef);
      return snap.docs.map((d) => ({ _id: d.id, ...d.data() }));
    } catch {
      return [];
    }
  }

  // ==================== BACKUP (EXPORT) ====================
  async function handleBackup() {
    setBacking(true);
    setError(null);
    setSuccess(null);
    setProgress({ current: "Tayyorlanmoqda...", done: 0, total: ROOT_COLLECTIONS.length + 2 });

    try {
      const zip = new JSZip();
      const dataFolder = zip.folder("data")!;
      let stepsDone = 0;
      const totalSteps = ROOT_COLLECTIONS.length + 2;

      // 1. Root kolleksiyalarni yuklash
      for (const colName of ROOT_COLLECTIONS) {
        setProgress({ current: `${colName} yuklanmoqda...`, done: stepsDone, total: totalSteps });
        const data = await fetchCollection(colName);
        if (data.length > 0) {
          dataFolder.file(`${colName}.json`, JSON.stringify(data, null, 2));
        }
        stepsDone++;
      }

      // 2. Kurslar subcollection larini yuklash
      setProgress({ current: "Kurslar tarkibi yuklanmoqda...", done: stepsDone, total: totalSteps });
      const coursesData = await fetchCollection("courses");
      const coursesFolder = dataFolder.folder("courses_detail")!;

      for (const course of coursesData) {
        const courseId = course._id;
        const courseFolder = coursesFolder.folder(courseId)!;

        for (const subCol of COURSE_SUBCOLLECTIONS) {
          const subData = await fetchCollection(`courses/${courseId}/${subCol}`);
          if (subData.length > 0) {
            courseFolder.file(`${subCol}.json`, JSON.stringify(subData, null, 2));

            // Topic ichidagi problems ni ham olish
            if (subCol === "topics") {
              for (const topic of subData) {
                const topicId = topic._id;
                for (const topicSub of TOPIC_SUBCOLLECTIONS) {
                  const topicSubData = await fetchCollection(`courses/${courseId}/topics/${topicId}/${topicSub}`);
                  if (topicSubData.length > 0) {
                    const topicsFolder = courseFolder.folder("topics_detail")!.folder(topicId)!;
                    topicsFolder.file(`${topicSub}.json`, JSON.stringify(topicSubData, null, 2));
                  }
                }
              }
            }
          }
        }
      }
      stepsDone++;

      // 3. Firebase Storage fayllarni ZIP ga yuklash (getBlob orqali — CORS muammosiz)
      if (includeFiles) {
        setProgress({ current: "Storage fayllar yuklanmoqda...", done: stepsDone, total: totalSteps });
        try {
          const filesFolder = zip.folder("files")!;
          const storageRef = ref(storage);
          await downloadStorageFiles(storageRef, filesFolder, "", (fileName) => {
            setProgress({ current: `Fayl: ${fileName}`, done: stepsDone, total: totalSteps });
          });
        } catch (err: any) {
          console.warn("Storage backup xatolik:", err.message);
        }
      }
      stepsDone++;

      // 4. Metadata
      const metadata = {
        backupDate: new Date().toISOString(),
        backupTimestamp: Date.now(),
        collectionsBackedUp: ROOT_COLLECTIONS,
        coursesCount: coursesData.length,
        includesFiles: includeFiles,
        version: "1.0",
      };
      zip.file("backup-meta.json", JSON.stringify(metadata, null, 2));

      // 5. ZIP yaratish va yuklab olish
      setProgress({ current: "ZIP yaratilmoqda...", done: totalSteps - 1, total: totalSteps });
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      a.href = url;
      a.download = `edukids-backup-${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`Backup muvaffaqiyatli yaratildi: ${new Date().toLocaleString("uz-UZ")}`);
      setProgress(null);
    } catch (err: any) {
      setError(err.message || "Backup jarayonida xatolik yuz berdi");
      setProgress(null);
    } finally {
      setBacking(false);
    }
  }

  /** Firebase Storage fayllarni rekursiv yuklash (getBlob — CORS muammosiz) */
  async function downloadStorageFiles(folderRef: any, zipFolder: any, path: string, onFile: (name: string) => void) {
    try {
      const result = await listAll(folderRef);

      // Fayllarni yuklash
      for (const item of result.items) {
        try {
          onFile(item.fullPath);
          const blob = await getBlob(item);
          zipFolder.file(item.name, blob);
        } catch {
          // Agar bitta fayl yuklanmasa — davom etamiz
        }
      }

      // Ichki papkalarni rekursiv
      for (const prefix of result.prefixes) {
        const subFolder = zipFolder.folder(prefix.name)!;
        await downloadStorageFiles(prefix, subFolder, `${path}/${prefix.name}`, onFile);
      }
    } catch {
      // Papkani o'qib bo'lmasa — o'tkazamiz
    }
  }

  // ==================== IMPORT (RESTORE) ====================
  async function handleImport(file: File) {
    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const zip = await JSZip.loadAsync(file);

      // Meta fayl mavjudligini tekshirish
      const metaFile = zip.file("backup-meta.json");
      if (!metaFile) {
        throw new Error("Bu fayl to'g'ri backup formati emas (backup-meta.json topilmadi)");
      }

      const meta = JSON.parse(await metaFile.async("text"));
      const dataFolder = zip.folder("data");
      if (!dataFolder) {
        throw new Error("data/ papkasi topilmadi");
      }

      // Root kolleksiyalarni import qilish
      const jsonFiles = Object.keys(zip.files).filter(f => f.startsWith("data/") && f.endsWith(".json") && !f.includes("/courses_detail/"));
      const totalSteps = jsonFiles.length + 1;
      let stepsDone = 0;

      for (const filePath of jsonFiles) {
        const fileName = filePath.replace("data/", "").replace(".json", "");
        if (fileName.startsWith("_")) { stepsDone++; continue; } // _storage_files.json ni o'tkazamiz
        setProgress({ current: `${fileName} import qilinmoqda...`, done: stepsDone, total: totalSteps });

        const content = await zip.file(filePath)!.async("text");
        const docs: any[] = JSON.parse(content);

        // Batch bilan yozish (500 limit)
        const BATCH_SIZE = 450;
        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const chunk = docs.slice(i, i + BATCH_SIZE);
          for (const item of chunk) {
            const docId = item._id || item.id;
            if (!docId) continue;
            const cleanItem = { ...item };
            delete cleanItem._id;
            batch.set(doc(db, fileName, docId), cleanItem);
          }
          await batch.commit();
        }
        stepsDone++;
      }

      // Kurslar subcollection larini import qilish
      setProgress({ current: "Kurslar tarkibi import qilinmoqda...", done: stepsDone, total: totalSteps });
      const courseDetailFiles = Object.keys(zip.files).filter(f => f.startsWith("data/courses_detail/") && f.endsWith(".json"));

      for (const filePath of courseDetailFiles) {
        // data/courses_detail/{courseId}/{subCol}.json
        // data/courses_detail/{courseId}/topics_detail/{topicId}/problems.json
        const relative = filePath.replace("data/courses_detail/", "");
        const parts = relative.split("/");

        const content = await zip.file(filePath)!.async("text");
        const docs: any[] = JSON.parse(content);

        if (parts.length === 2) {
          // courses/{courseId}/{subCol}
          const courseId = parts[0];
          const subCol = parts[1].replace(".json", "");
          const BATCH_SIZE = 450;
          for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = docs.slice(i, i + BATCH_SIZE);
            for (const item of chunk) {
              const docId = item._id || item.id;
              if (!docId) continue;
              const cleanItem = { ...item };
              delete cleanItem._id;
              batch.set(doc(db, "courses", courseId, subCol, docId), cleanItem);
            }
            await batch.commit();
          }
        } else if (parts.length === 4) {
          // courses/{courseId}/topics_detail/{topicId}/problems.json
          const courseId = parts[0];
          const topicId = parts[2];
          const subCol = parts[3].replace(".json", "");
          const BATCH_SIZE = 450;
          for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const batch = writeBatch(db);
            const chunk = docs.slice(i, i + BATCH_SIZE);
            for (const item of chunk) {
              const docId = item._id || item.id;
              if (!docId) continue;
              const cleanItem = { ...item };
              delete cleanItem._id;
              batch.set(doc(db, "courses", courseId, "topics", topicId, subCol, docId), cleanItem);
            }
            await batch.commit();
          }
        }
      }

      setSuccess(`Import muvaffaqiyatli yakunlandi! (${meta.backupDate})`);
      setProgress(null);
    } catch (err: any) {
      setError(err.message || "Import jarayonida xatolik yuz berdi");
      setProgress(null);
    } finally {
      setImporting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".zip")) {
      setError("Faqat .zip formatdagi backup fayllarni yuklash mumkin");
      return;
    }
    if (!confirm("Diqqat! Import mavjud ma'lumotlarni qayta yozadi. Davom etasizmi?")) {
      e.target.value = "";
      return;
    }
    handleImport(file);
    e.target.value = "";
  }

  const progressPercent = progress ? Math.round((progress.done / progress.total) * 100) : 0;
  const isWorking = backing || importing;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Backup</h1>
        <p className="text-gray-500 mt-1">Ma'lumotlarni eksport va import qilish</p>
      </div>

      {/* Progress */}
      {progress && (
        <div className="bg-white rounded-xl border border-blue-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-sm font-medium text-gray-700">{progress.current}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{progressPercent}% — {progress.done}/{progress.total}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}

      {/* Success */}
      {success && !isWorking && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
          <span className="text-sm text-green-700">{success}</span>
        </div>
      )}

      {/* Export card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Backup yaratish (Export)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Barcha Firestore ma'lumotlarni JSON formatda ZIP arxivga saqlang. 
              Kurslar, mavzular, misollar, testlar, foydalanuvchilar, to'lovlar — hammasi.
            </p>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Zaxiraga kiradi:</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600">
                <span>✅ Kurslar va mavzular</span>
                <span>✅ Testlar va savollar</span>
                <span>✅ Foydalanuvchilar</span>
                <span>✅ To'lovlar va obunalar</span>
                <span>✅ Progress va natijalar</span>
                <span>✅ Promo kodlar</span>
                <span>✅ Bannerlar va yangiliklar</span>
                <span>✅ Motivatsion frazalar</span>
                <span>✅ Sertifikatlar</span>
              </div>
            </div>

            {/* Include files checkbox */}
            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={includeFiles}
                onChange={(e) => setIncludeFiles(e.target.checked)}
                className="w-4 h-4 text-primary-500 border-gray-300 rounded focus:ring-primary-500"
              />
              <div>
                <span className="text-sm font-medium text-gray-700">Storage fayllarini ham ZIP ga qo'shish</span>
                <p className="text-xs text-gray-500">Barcha rasmlar, hujjatlar va yuklangan fayllar ZIP ichiga yuklanadi (katta hajm bo'lishi mumkin)</p>
              </div>
            </label>

            <button
              onClick={handleBackup}
              disabled={isWorking}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              {backing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {backing ? "Yuklanmoqda..." : "Backup yaratish"}
            </button>
          </div>
        </div>
      </div>

      {/* Import card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center shrink-0">
            <Upload className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Backup import (Restore)</h3>
            <p className="text-sm text-gray-600 mb-4">
              Avvalroq yaratilgan backup ZIP faylni yuklang. Ma'lumotlar bazaga qayta yoziladi.
              Bu yangi loyihaga yoki boshqa bazaga ko'chirishda foydali.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-amber-700">
                ⚠️ Import mavjud ma'lumotlarni qayta yozadi (merge). Bir xil ID li hujjatlar yangilanadi, yangilari qo'shiladi.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isWorking}
              className="btn-outline flex items-center gap-2 text-sm border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {importing ? "Import qilinmoqda..." : "ZIP faylni tanlash va import qilish"}
            </button>
          </div>
        </div>
      </div>

      {/* Tips card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <h4 className="font-medium text-amber-800 mb-2">💡 Maslahat</h4>
        <ul className="text-sm text-amber-700 space-y-1">
          <li>• Backup jarayoni ma'lumotlar hajmiga qarab 1-5 daqiqa davom etishi mumkin</li>
          <li>• Muntazam backup qilish tavsiya etiladi (haftada kamida 1 marta)</li>
          <li>• ZIP fayl ichida har bir kolleksiya alohida JSON faylda saqlanadi</li>
          <li>• Import qilishdan oldin mavjud ma'lumotlarni export qilib saqlab qo'ying</li>
          <li>• Storage fayllarini qo'shsangiz, hajm ancha katta bo'lishi mumkin (10-100 MB)</li>
        </ul>
      </div>
    </div>
  );
}
