import { useState, useRef, useEffect } from "react";
import { X, Upload } from "lucide-react";
import { createProblem, updateProblem, saveTestToLibrary, saveTBQuestion, saveTBFolder, getAllTBFolders, getAllTBQuestions, getCourseById, getTopicById, getFoldersByCourse } from "@shared/repositories";
import { uploadFile } from "@shared/supabase";
import type { Problem, Test, Question } from "@shared/types";
import RichMathInput from "./RichMathInput";

interface Props {
  open: boolean;
  courseId: string;
  topicId: string;
  existingCount: number;
  onClose: () => void;
  onCreated: () => void;
  /** Agar berilsa — tahrirlash rejimi */
  editData?: Problem | null;
}

export default function CreateProblemModal({ open, courseId, topicId, existingCount, onClose, onCreated, editData }: Props) {
  const [content, setContent] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("easy");
  const [videoUrl, setVideoUrl] = useState("");
  const [videoType, setVideoType] = useState<"youtube" | "upload" | "youtube_time">("youtube");
  const [tags, setTags] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState(3);
  const [solutionSteps, setSolutionSteps] = useState<string[]>([""]);
  const [loading, setLoading] = useState(false);
  // YouTube with time
  const [startMin, setStartMin] = useState(0);
  const [startSec, setStartSec] = useState(0);
  const [endMin, setEndMin] = useState(0);
  const [endSec, setEndSec] = useState(0);
  // File upload
  const [uploading, setUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const videoFileRef = useRef<HTMLInputElement>(null);
  // Solution image
  const [solutionImage, setSolutionImage] = useState("");
  const [uploadingSolImg, setUploadingSolImg] = useState(false);
  const solutionImageRef = useRef<HTMLInputElement>(null);
  // Test variantlari (ixtiyoriy — to'ldirilsa test bazaga ham saqlanadi)
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState<"A" | "B" | "C" | "D">("A");

  // Edit mode — formani to'ldirish
  useEffect(() => {
    if (open && editData) {
      setContent(editData.content || "");
      setDifficulty(editData.difficulty || "easy");
      setVideoUrl(editData.videoUrl || "");
      setVideoType(editData.videoType || "youtube");
      setTags(editData.tags?.join(", ") || "");
      setEstimatedMinutes(editData.estimatedMinutes || 3);
      setSolutionSteps(editData.solution && editData.solution.length > 0 ? editData.solution.map((s) => s.text) : [""]);
      setSolutionImage(editData.solutionImage || "");
      // YouTube time parsing
      if (editData.videoUrl && editData.videoUrl.includes("start=")) {
        setVideoType("youtube_time");
        const params = new URLSearchParams(editData.videoUrl.split("?")[1] || "");
        const start = parseInt(params.get("start") || "0");
        const end = parseInt(params.get("end") || "0");
        setStartMin(Math.floor(start / 60));
        setStartSec(start % 60);
        setEndMin(Math.floor(end / 60));
        setEndSec(end % 60);
        // URL dan parametrlarni olib tashlash
        const baseUrl = editData.videoUrl.split("?")[0] + "?" + Array.from(params.entries()).filter(([k]) => k !== "start" && k !== "end").map(([k, v]) => `${k}=${v}`).join("&");
        setVideoUrl(baseUrl.endsWith("?") ? baseUrl.slice(0, -1) : baseUrl);
      }
    } else if (open && !editData) {
      setContent(""); setDifficulty("easy"); setVideoUrl(""); setVideoType("youtube");
      setTags(""); setEstimatedMinutes(3); setSolutionSteps([""]);
      setStartMin(0); setStartSec(0); setEndMin(0); setEndSec(0);
      setUploadedFileName(""); setSolutionImage("");
      setOptionA(""); setOptionB(""); setOptionC(""); setOptionD(""); setCorrectAnswer("A");
    }
  }, [open, editData]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    // Video URL ni tayyorlash
    let finalVideoUrl = videoUrl || undefined;
    let finalVideoType: "youtube" | "upload" | undefined = videoUrl ? (videoType === "youtube_time" ? "youtube" : videoType) : undefined;

    if (videoType === "youtube_time" && videoUrl) {
      const startSeconds = startMin * 60 + startSec;
      const endSeconds = endMin * 60 + endSec;
      const separator = videoUrl.includes("?") ? "&" : "?";
      finalVideoUrl = `${videoUrl}${separator}start=${startSeconds}&end=${endSeconds}`;
      finalVideoType = "youtube";
    }

    const builtSolutionSteps = solutionSteps
      .map((text, i) => ({ stepNumber: i + 1, text: text.trim() }))
      .filter((s) => s.text);
    const finalSolution = builtSolutionSteps.length > 0 ? builtSolutionSteps : undefined;

    try {
      if (editData) {
        // EDIT mode
        await updateProblem(courseId, topicId, editData.id, {
          content,
          difficulty,
          videoUrl: finalVideoUrl,
          videoType: finalVideoType,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          estimatedMinutes,
          solution: finalSolution,
          solutionImage: solutionImage || undefined,
        });

        // Variantlar bo'lsa test bazaga ham saqlash / yangilash
        await syncTestToLibrary(
          editData.id,
          content,
          difficulty,
          estimatedMinutes,
          tags,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswer,
          finalVideoUrl,
          finalVideoType,
          finalSolution,
          solutionImage
        );
      } else {
        // CREATE mode
        const order = existingCount + 1;
        const id = `p-${topicId.replace("topic-", "")}-${order}-${Date.now()}`;
        const now = Date.now();

        const problem: Problem = {
          id,
          topicId,
          courseId,
          content,
          difficulty,
          order,
          videoUrl: finalVideoUrl,
          videoType: finalVideoType,
          tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
          estimatedMinutes,
          solution: finalSolution,
          solutionImage: solutionImage || undefined,
          createdAt: now,
        };

        await createProblem(courseId, topicId, problem);

        // Variantlar bo'lsa test bazaga ham saqlash
        await syncTestToLibrary(
          id,
          content,
          difficulty,
          estimatedMinutes,
          tags,
          optionA,
          optionB,
          optionC,
          optionD,
          correctAnswer,
          finalVideoUrl,
          finalVideoType,
          finalSolution,
          solutionImage
        );
      }

      onCreated();
      onClose();
    } catch (err) {
      console.error("Misol saqlashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  /** Misoldan avtomatik Test Builder (Content Library) ga Kurs → Modul → Mavzu ierarxiyasi bilan saqlash */
  async function syncTestToLibrary(
    problemId: string,
    content: string,
    difficulty: "easy" | "medium" | "hard",
    estimatedMinutes: number,
    tagsStr: string,
    optionA: string,
    optionB: string,
    optionC: string,
    optionD: string,
    correctAnswer: string,
    finalVideoUrl?: string,
    finalVideoType?: "youtube" | "upload",
    finalSolution?: any,
    solutionImage?: string
  ) {
    const hasOptions = optionA.trim() || optionB.trim() || optionC.trim() || optionD.trim();
    if (!hasOptions) return;

    const tagList = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    const now = Date.now();
    const testQuestionId = `q-${problemId}`;

    const testQuestion: Question = {
      id: testQuestionId,
      type: "multiple_choice",
      content,
      options: [
        { label: "A", text: optionA.trim() },
        { label: "B", text: optionB.trim() },
        { label: "C", text: optionC.trim() },
        { label: "D", text: optionD.trim() },
      ],
      correctAnswer: correctAnswer as any,
      points: difficulty === "hard" ? 10 : difficulty === "medium" ? 5 : 3,
      estimatedMinutes,
      difficulty,
      tags: tagList,
      problemId,
      ...(finalVideoUrl ? { videoUrl: finalVideoUrl } : {}),
      ...(finalVideoType ? { videoType: finalVideoType } : {}),
      ...(finalSolution ? { solution: finalSolution } : {}),
      ...(solutionImage ? { solutionImage } : {}),
    };

    const testEntry: Test = {
      id: `tlib-${problemId}`,
      courseId,
      title: content.slice(0, 60) + (content.length > 60 ? "..." : ""),
      description: `Modul: ${topicId} · Misol: ${problemId}`,
      version: "Draft v1",
      status: "draft",
      passingScore: 1,
      shuffleQuestions: false,
      totalPoints: testQuestion.points,
      totalTime: estimatedMinutes,
      questions: [testQuestion],
      createdAt: now,
      updatedAt: now,
      createdBy: "admin",
    };

    await saveTestToLibrary(testEntry);

    try {
      const [course, topic, courseFolders] = await Promise.all([
        getCourseById(courseId),
        getTopicById(courseId, topicId),
        getFoldersByCourse(courseId),
      ]);

      const courseName = course?.title || "Kurs";
      const topicName = topic?.title || "Mavzu";

      const existingFolders = await getAllTBFolders();

      /** Papkani topish yoki yaratish (refKey va parentId/name asosida) */
      async function ensureFolder(
        name: string,
        parentId: string | null,
        refKey: string
      ): Promise<any> {
        let f = existingFolders.find(
          (x: any) =>
            x.refKey === refKey ||
            ((x.parentId ?? null) === parentId && x.name?.trim().toLowerCase() === name.trim().toLowerCase())
        );

        if (f) {
          let updated = false;
          if (!f.refKey) { f.refKey = refKey; updated = true; }
          if ((f.parentId ?? null) !== parentId) { f.parentId = parentId; updated = true; }
          if (f.name !== name) { f.name = name; updated = true; }
          if (updated) await saveTBFolder(f);
          return f;
        }

        f = {
          id: `tbf-${refKey}`,
          name,
          parentId: parentId ?? null,
          refKey,
          questionIds: [],
        };
        await saveTBFolder(f);
        existingFolders.push(f);
        return f;
      }

      // 1. Kurs papkasi (Root)
      const courseFolder = await ensureFolder(courseName, null, `c-${courseId}`);

      let targetFolder: any;

      if (topic?.folderId) {
        // Mavzu modul ichida — 3 darajali: Kurs → Modul → Mavzu
        const moduleName = courseFolders.find((f) => f.id === topic.folderId)?.title || "Modul";
        const moduleFolder = await ensureFolder(moduleName, courseFolder.id, `m-${courseId}-${topic.folderId}`);
        targetFolder = await ensureFolder(topicName, moduleFolder.id, `t-${courseId}-${topicId}`);
      } else {
        // Mavzu modulsiz — 2 darajali: Kurs → Mavzu
        targetFolder = await ensureFolder(topicName, courseFolder.id, `t-${courseId}-${topicId}`);
      }

      // Savol obyekti — 3-darajali mavzu papkasiga biriktiriladi
      const newQ = {
        id: testQuestion.id,
        content,
        difficulty,
        time: `${estimatedMinutes} min`,
        tags: tagList,
        order: Date.now(),
        folderId: targetFolder.id,
        options: testQuestion.options,
        correctAnswer,
        problemId,
        ...(finalVideoUrl ? { videoUrl: finalVideoUrl } : {}),
        ...(finalVideoType ? { videoType: finalVideoType } : {}),
        ...(finalSolution ? { solution: finalSolution } : {}),
        ...(solutionImage ? { solutionImage } : {}),
      };

      await saveTBQuestion(newQ);

      if (!targetFolder.questionIds?.includes(testQuestion.id)) {
        targetFolder.questionIds = [...(targetFolder.questionIds || []), testQuestion.id];
        await saveTBFolder(targetFolder);
      }

      // LocalStorage sync (fallback)
      const tbQuestions = JSON.parse(localStorage.getItem("tb_questions") || "[]");
      const tbFolders = JSON.parse(localStorage.getItem("tb_folders") || "[]");
      const qIdx = tbQuestions.findIndex((x: any) => x.id === newQ.id);
      if (qIdx >= 0) tbQuestions[qIdx] = newQ;
      else tbQuestions.push(newQ);

      for (const f of existingFolders) {
        const idx = tbFolders.findIndex((x: any) => x.id === f.id);
        if (idx >= 0) tbFolders[idx] = f;
        else tbFolders.push(f);
      }
      localStorage.setItem("tb_questions", JSON.stringify(tbQuestions));
      localStorage.setItem("tb_folders", JSON.stringify(tbFolders));
    } catch (err) {
      console.error("Test bazaga saqlashda xatolik:", err);
    }
  }

  async function handleVideoFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadedFileName(file.name);
    try {
      const fileName = `videos/${Date.now()}-${file.name}`;
      const url = await uploadFile("edukids", fileName, file);
      setVideoUrl(url);
    } catch (err: any) {
      console.error("Video yuklashda xatolik:", err);
      alert("Video yuklashda xatolik: " + err.message);
      setUploadedFileName("");
    } finally {
      setUploading(false);
    }
  }

  async function handleSolutionImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingSolImg(true);
    try {
      const fileName = `solutions/${Date.now()}-${file.name}`;
      const url = await uploadFile("edukids", fileName, file);
      setSolutionImage(url);
    } catch (err) {
      console.error("Rasm yuklashda xatolik:", err);
      // Fallback — local preview
      const reader = new FileReader();
      reader.onload = () => setSolutionImage(reader.result as string);
      reader.readAsDataURL(file);
    } finally {
      setUploadingSolImg(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 overflow-y-auto">
      <div className="min-h-full flex items-start justify-center py-8 px-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">{editData ? "Misolni tahrirlash" : "Yangi misol qo'shish"}</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Content - LaTeX qo'llab-quvvatlaydi */}
          <RichMathInput
            value={content}
            onChange={setContent}
            label="Misol matni *"
            placeholder="Masalan: $$3x + 12 = 36$$. $$x$$ ni toping."
            rows={4}
            required
            hint="💡 Word dan nusxalasangiz LaTeX formulalar $$...$$ ichida turishi kerak. Rasm paste qilish mumkin."
          />

          {/* Rasm yuklash (placeholder) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rasm (ixtiyoriy)</label>
            <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center hover:border-primary-300 cursor-pointer transition-colors">
              <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Rasmni shu yerga tashlang yoki bosing</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Qiyinlik</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="easy">Oson</option>
                <option value="medium">O'rta</option>
                <option value="hard">Qiyin</option>
              </select>
            </div>

            {/* Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Vaqt (daq)</label>
              <input
                type="number"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                min={1}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teglar</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="Algebra, Kasrlar"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              />
            </div>
          </div>

          {/* Video */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Video yechim</label>
            <div className="space-y-3">
              <select
                value={videoType}
                onChange={(e) => { setVideoType(e.target.value as any); setVideoUrl(""); setUploadedFileName(""); }}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
              >
                <option value="youtube">YouTube</option>
                <option value="upload">Fayl yuklash (Upload)</option>
                <option value="youtube_time">YouTube (vaqt belgilash bilan)</option>
              </select>

              {/* YouTube */}
              {videoType === "youtube" && (
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
              )}

              {/* File Upload */}
              {videoType === "upload" && (
                <div className="flex items-center gap-3">
                  <input
                    ref={videoFileRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => videoFileRef.current?.click()}
                    disabled={uploading}
                    className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary-400 hover:text-primary-500 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Yuklanmoqda..." : "Video faylni tanlash"}
                  </button>
                  {uploadedFileName && (
                    <span className="text-xs text-green-600 font-medium">✓ {uploadedFileName}</span>
                  )}
                </div>
              )}

              {/* YouTube with time */}
              {videoType === "youtube_time" && (
                <div className="space-y-3">
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">▶️ Boshlash vaqti</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={startMin}
                          onChange={(e) => setStartMin(Number(e.target.value))}
                          min={0}
                          className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded text-sm text-center"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">daq</span>
                        <input
                          type="number"
                          value={startSec}
                          onChange={(e) => setStartSec(Number(e.target.value))}
                          min={0}
                          max={59}
                          className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded text-sm text-center"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">sek</span>
                      </div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-600 mb-2">⏹️ Tugash vaqti</p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={endMin}
                          onChange={(e) => setEndMin(Number(e.target.value))}
                          min={0}
                          className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded text-sm text-center"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">daq</span>
                        <input
                          type="number"
                          value={endSec}
                          onChange={(e) => setEndSec(Number(e.target.value))}
                          min={0}
                          max={59}
                          className="w-16 px-2 py-1.5 bg-white border border-gray-200 rounded text-sm text-center"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500">sek</span>
                      </div>
                    </div>
                  </div>
                  {videoUrl && startMin + startSec > 0 && (
                    <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
                      📹 Video {startMin}:{startSec.toString().padStart(2, "0")} dan {endMin}:{endSec.toString().padStart(2, "0")} gacha ijro etiladi
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Solution steps */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">Yechim bosqichlari</label>
              <span className="text-xs text-gray-400">Har bir bosqichni alohida qo'shing</span>
            </div>
            <div className="space-y-3">
              {solutionSteps.map((step, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <div className="w-7 h-7 mt-7 rounded-full bg-blue-100 text-blue-600 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <RichMathInput
                      value={step}
                      onChange={(v) => setSolutionSteps((prev) => prev.map((s, i) => i === idx ? v : s))}
                      placeholder={`${idx + 1}-bosqich (bir nechta qator bo'lishi mumkin). $$formula$$`}
                      rows={2}
                    />
                  </div>
                  {solutionSteps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSolutionSteps((prev) => prev.filter((_, i) => i !== idx))}
                      className="w-7 h-7 mt-7 rounded-full text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0"
                      title="Bosqichni o'chirish"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSolutionSteps((prev) => [...prev, ""])}
              className="mt-2 text-sm text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"
            >
              + Yangi bosqich qo'shish
            </button>
            <p className="text-xs text-gray-400 mt-1">💡 Har bir bosqich student appda "Keyingi bosqich" bosilganda birin-ketin ko'rinadi. LaTeX va rasm qo'llab-quvvatlanadi.</p>
            {/* Yechim rasmi */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1">Yechim rasmi (ixtiyoriy)</label>
              <div className="flex items-center gap-3">
                {solutionImage && (
                  <div className="relative">
                    <img src={solutionImage} alt="" className="h-20 rounded-lg border border-gray-200" />
                    <button type="button" onClick={() => setSolutionImage("")} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">×</button>
                  </div>
                )}
                <input ref={solutionImageRef} type="file" accept="image/*" onChange={handleSolutionImageUpload} className="hidden" />
                <button
                  type="button"
                  onClick={() => solutionImageRef.current?.click()}
                  disabled={uploadingSolImg}
                  className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-primary-400 hover:text-primary-500 disabled:opacity-50"
                >
                  <Upload className="w-4 h-4" />
                  {uploadingSolImg ? "Yuklanmoqda..." : "Yechim rasmini yuklash"}
                </button>
              </div>
            </div>
          </div>

          {/* Test variantlari (ixtiyoriy) */}
          <div className="border border-orange-200 bg-orange-50/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">
                  Test variantlari <span className="text-xs text-gray-400">(ixtiyoriy — to'ldirsa test bazaga saqlanadi)</span>
                </label>
                <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Test baza</span>
              </div>
              <p className="text-xs text-gray-500 -mt-1">LaTeX formulalarni $$...$$ ichida paste qilishingiz mumkin. Rasm ham paste qilish mumkin.</p>
              <div className="space-y-2">
                {[
                  { label: "A", value: optionA, set: setOptionA },
                  { label: "B", value: optionB, set: setOptionB },
                  { label: "C", value: optionC, set: setOptionC },
                  { label: "D", value: optionD, set: setOptionD },
                ].map((opt) => (
                  <div key={opt.label} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCorrectAnswer(opt.label as any)}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border-2 transition-all ${
                        correctAnswer === opt.label
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-gray-300 text-gray-500 hover:border-green-300"
                      }`}
                      title={correctAnswer === opt.label ? "To'g'ri javob" : "To'g'ri deb belgilash"}
                    >
                      {opt.label}
                    </button>
                    <div className="flex-1">
                      <RichMathInput
                        value={opt.value}
                        onChange={opt.set}
                        placeholder={`Variant ${opt.label}`}
                        singleLine
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-gray-400">
                🟢 Yashil doira = to'g'ri javob. Variantlar to'ldirilsa misol test bazaga ham saqlanadi (studentda misol ichida ko'rinmaydi).
              </p>
            </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={onClose} className="flex-1 btn-outline">Bekor</button>
            <button type="submit" disabled={loading || !content} className="flex-1 btn-primary disabled:opacity-50">
              {loading ? "Saqlanmoqda..." : editData ? "O'zgarishlarni saqlash" : "Misolni qo'shish"}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
