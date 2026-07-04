import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTestById, saveTestResult, getAllCourses, getTestsByCourse, getUserProgress, setUserProgress } from "@shared/repositories";
import type { Test, Question, TestResult, UserProgress } from "@shared/types";
import LatexText from "../components/LatexText";
import { useAuth } from "../hooks/useAuth";
import { cachedFetch, invalidateCache } from "../hooks/useCache";
import { getLocalCourseProgress, setLocalCourseProgress } from "../hooks/useLocalProgress";

const LOCAL_TEST_RESULTS_KEY = "edukids_local_test_results";

export default function TestScreen() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [test, setTest] = useState<Test | null>(null);
  const [courseId, setCourseId] = useState("");
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);
  const [finished, setFinished] = useState(false);
  const finishingRef = useRef(false); // dublikat finish oldini olish

  useEffect(() => {
    if (!testId) return;
    findAndLoadTest(testId);
  }, [testId]);

  async function findAndLoadTest(tId: string) {
    try {
      // cachedFetch orqali kurslarni tez olish
      const courses = await cachedFetch("all-courses", getAllCourses);
      for (const course of courses) {
        const tests = await cachedFetch(`tests-${course.id}`, () => getTestsByCourse(course.id));
        const found = tests.find((t) => t.id === tId);
        if (found) {
          setTest(found);
          setCourseId(course.id);
          setTimeLeft(found.totalTime * 60);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Timer — 0 ga yetganda auto-submit
  useEffect(() => {
    if (timeLeft <= 0 || finished) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          // Vaqt tugadi — avtomatik yakunlash
          clearInterval(interval);
          handleAutoFinish();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft > 0, finished]);

  // Auto-finish funksiya (timer tugganda)
  const handleAutoFinish = useCallback(() => {
    if (!finishingRef.current) {
      finishTest();
    }
  }, [answers, test, courseId, user]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!test || !test.questions?.length) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Test topilmadi</div>;
  }

  const questions = test.questions;
  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  function selectAnswer(label: string) {
    if (finished) return; // Yakunlangan testda javob berish mumkin emas
    setSelected(label);
    setAnswers({ ...answers, [q.id]: label });
  }

  function goNext() {
    if (finished) return;
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelected(answers[questions[current + 1]?.id] || null);
    } else {
      finishTest();
    }
  }

  async function finishTest() {
    // Dublikat finish oldini olish
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinished(true);

    const correct = questions.filter((qq) => answers[qq.id] === qq.correctAnswer).length;
    const score = Math.round((correct / questions.length) * 100);
    const timeTaken = (test!.totalTime * 60) - timeLeft;
    const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D";

    const resultData = {
      testId: test!.id,
      courseId,
      score,
      correctCount: correct,
      totalQuestions: questions.length,
      timeTaken,
      grade,
      answers: questions.map((qq) => ({
        questionId: qq.id,
        selectedAnswer: answers[qq.id] || "",
        isCorrect: answers[qq.id] === qq.correctAnswer,
      })),
      completedAt: Date.now(),
    };

    // Reyting (XP) faqat to'g'ri javob berilgan savollar bo'yicha hisoblanadi —
    // har bir savolning o'ziga tegishli "points" qiymati XP sifatida qo'shiladi.
    const xpEarned = questions.reduce(
      (sum, qq) => (answers[qq.id] === qq.correctAnswer ? sum + (qq.points || 0) : sum),
      0
    );

    if (user) {
      // Login qilgan — DB ga saqlash
      const result: TestResult = {
        ...resultData,
        id: `result-${user.uid}-${test!.id}-${Date.now()}`,
        userId: user.uid,
      };
      try {
        await saveTestResult(result);
      } catch (err) {
        console.error("Natijani saqlashda xatolik:", err);
        // DB ga saqlanmasa — local ga ham saqlash (zaxira)
        saveTestResultLocally(result);
      }

      // Test natijasiga qarab reytingni (UserProgress.totalXP) yangilash
      try {
        await awardTestXp(user.uid, courseId, xpEarned);
        invalidateCache(`progress-${user.uid}`);
      } catch (err) {
        console.error("XP yangilashda xatolik:", err);
      }
    } else {
      // Guest — localStorage ga saqlash
      const result: TestResult = {
        ...resultData,
        id: `result-guest-${test!.id}-${Date.now()}`,
        userId: "guest",
      };
      saveTestResultLocally(result);
      awardTestXpLocal(courseId, xpEarned);
    }

    navigate(`/test-result?score=${score}&correct=${correct}&total=${questions.length}&time=${timeTaken}&resultId=${resultData.testId}`);
  }

  function goPrev() {
    if (current > 0) {
      setCurrent(current - 1);
      setSelected(answers[questions[current - 1]?.id] || null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white max-w-mobile mx-auto">
      {/* Header */}
      <header className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900 truncate flex-1">{test.title}</h1>
          <div className="flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full flex items-center gap-1 ${timeLeft <= 60 ? "bg-red-50" : "bg-primary-50"} ${timeLeft <= 10 && timeLeft > 0 ? "animate-shake" : ""}`}>
              <span className={`text-xs ${timeLeft <= 60 ? "text-red-500" : "text-primary-500"}`}>⏱</span>
              <span className={`font-bold text-sm ${timeLeft <= 60 ? "text-red-500 animate-pulse" : "text-primary-500"}`}>
                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
              </span>
            </div>
            <button
              onClick={() => {
                if (confirm("Testni yakunlashga ishonchingiz komilmi? Javoblar saqlanadi.")) {
                  finishTest();
                }
              }}
              disabled={finished}
              className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full active:bg-red-600 disabled:opacity-50"
            >
              Yakunlash
            </button>
          </div>
        </div>
      </header>

      {/* Vaqt tugadi xabari */}
      {timeLeft === 0 && finished && (
        <div className="mx-5 bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-sm text-red-700 font-medium">⏱ Vaqt tugadi! Test avtomatik yakunlandi.</p>
        </div>
      )}

      {/* Progress */}
      <div className="px-5 mt-2">
        <p className="text-[11px] text-primary-500 font-medium uppercase">Joriy progress</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xl font-bold text-gray-900">
            Savol {current + 1}<span className="text-gray-400 text-base font-normal"> / {questions.length}</span>
          </p>
          <span className="text-sm font-medium text-primary-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full mt-2">
          <div className="h-full bg-primary-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Question */}
      <div className="px-5 mt-8">
        <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-primary-500">❓</span>
            <span className="text-[11px] text-primary-500 font-semibold uppercase">Savol</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 leading-7">
            <LatexText text={q.content} />
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="px-5 mt-6 space-y-3 flex-1">
        {q.options?.map((opt) => {
          const isSelected = selected === opt.label;
          return (
            <button
              key={opt.label}
              onClick={() => selectAnswer(opt.label)}
              disabled={finished}
              className={`w-full flex items-center px-5 py-4 rounded-xl border transition-all text-left ${
                isSelected ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white hover:border-gray-300"
              } ${finished ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 text-sm font-bold shrink-0 ${
                isSelected ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600"
              }`}>
                {opt.label}
              </div>
              <span className={`text-base ${isSelected ? "text-primary-700 font-medium" : "text-gray-700"}`}>
                <LatexText text={opt.text} />
              </span>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="px-5 py-4 flex items-center justify-between border-t border-gray-100 mt-auto">
        <button onClick={goPrev} disabled={current === 0} className="flex items-center gap-1 text-sm text-gray-400 disabled:opacity-40">
          <ChevronLeft size={16} /> Oldingi
        </button>
        <button onClick={goNext} disabled={finished} className="bg-primary-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2 disabled:opacity-50">
          {current === questions.length - 1 ? "Tugatish" : "Keyingi savol"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

/**
 * Login qilgan foydalanuvchi uchun — test natijasiga qarab UserProgress.totalXP ni oshirish.
 * Bu reytingning YAGONA manbai: modul/misolni ko'rish XP bermaydi, faqat to'g'ri ishlangan test savollari beradi.
 */
async function awardTestXp(userId: string, courseId: string, xpEarned: number): Promise<void> {
  if (!courseId || xpEarned <= 0) return;
  const progressId = `${userId}_${courseId}`;
  const existing = await getUserProgress(userId, courseId);

  if (existing) {
    await setUserProgress({
      ...existing,
      totalXP: (existing.totalXP || 0) + xpEarned,
      lastAccessedAt: Date.now(),
    });
  } else {
    const progress: UserProgress = {
      id: progressId,
      userId,
      courseId,
      completedTopics: [],
      completedProblems: [],
      progressPercent: 0,
      totalXP: xpEarned,
      streak: 1,
      weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
      lastAccessedAt: Date.now(),
    };
    await setUserProgress(progress);
  }
}

/** Guest (login qilmagan) foydalanuvchi uchun — local progress ga XP qo'shish */
function awardTestXpLocal(courseId: string, xpEarned: number): void {
  if (!courseId || xpEarned <= 0) return;
  const existing = getLocalCourseProgress(courseId);
  if (existing) {
    setLocalCourseProgress(courseId, {
      ...existing,
      totalXP: (existing.totalXP || 0) + xpEarned,
      lastAccessedAt: Date.now(),
    });
  } else {
    setLocalCourseProgress(courseId, {
      id: `local_${courseId}`,
      userId: "local",
      courseId,
      completedTopics: [],
      completedProblems: [],
      progressPercent: 0,
      totalXP: xpEarned,
      streak: 1,
      weeklyMinutes: [0, 0, 0, 0, 0, 0, 0],
      lastAccessedAt: Date.now(),
    });
  }
}

/** Guest test natijasini localStorage ga saqlash */
function saveTestResultLocally(result: TestResult): void {
  try {
    const raw = localStorage.getItem(LOCAL_TEST_RESULTS_KEY);
    const existing: TestResult[] = raw ? JSON.parse(raw) : [];
    existing.unshift(result);
    // Faqat oxirgi 50 ta natijani saqlash (localStorage limitini oshirmaslik uchun)
    const trimmed = existing.slice(0, 50);
    localStorage.setItem(LOCAL_TEST_RESULTS_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage to'lgan — eski natijalarni o'chirish
    localStorage.setItem(LOCAL_TEST_RESULTS_KEY, JSON.stringify([result]));
  }
}
