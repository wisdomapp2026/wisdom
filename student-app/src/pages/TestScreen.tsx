import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTestById, saveTestResult, getAllCourses, getTestsByCourse } from "@shared/repositories";
import type { Test, Question, TestResult } from "@shared/types";
import LatexText from "../components/LatexText";
import { useAuth } from "../hooks/useAuth";

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

  useEffect(() => {
    if (!testId) return;
    // Testni barcha kurslardan qidirish
    findAndLoadTest(testId);
  }, [testId]);

  async function findAndLoadTest(tId: string) {
    try {
      const courses = await getAllCourses();
      for (const course of courses) {
        const t = await getTestById(course.id, tId);
        if (t) {
          setTest(t);
          setCourseId(course.id);
          setTimeLeft(t.totalTime * 60);
          break;
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    const interval = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [timeLeft]);

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
    setSelected(label);
    setAnswers({ ...answers, [q.id]: label });
  }

  function goNext() {
    if (current < questions.length - 1) {
      setCurrent(current + 1);
      setSelected(answers[questions[current + 1]?.id] || null);
    } else {
      // Test tugadi — natijani saqlash va natija sahifasiga o'tish
      finishTest();
    }
  }

  async function finishTest() {
    const correct = questions.filter((qq) => answers[qq.id] === qq.correctAnswer).length;
    const score = Math.round((correct / questions.length) * 100);
    const timeTaken = (test!.totalTime * 60) - timeLeft;

    // Natijani Firestore ga saqlash
    if (user && test) {
      const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : "D";
      const result: TestResult = {
        id: `result-${user.uid}-${test.id}-${Date.now()}`,
        testId: test.id,
        userId: user.uid,
        courseId: courseId,
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
      try {
        await saveTestResult(result);
      } catch (err) {
        console.error("Natijani saqlashda xatolik:", err);
      }
    }

    navigate(`/test-result?score=${score}&correct=${correct}&total=${questions.length}&time=${timeTaken}`);
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
            <div className="bg-primary-50 px-3 py-1.5 rounded-full flex items-center gap-1">
              <span className="text-primary-500 text-xs">⏱</span>
              <span className="text-primary-500 font-bold text-sm">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
            </div>
            <button
              onClick={() => {
                if (confirm("Testni yakunlashga ishonchingiz komilmi? Javoblar saqlanadi.")) {
                  finishTest();
                }
              }}
              className="bg-red-500 text-white text-xs font-semibold px-3 py-1.5 rounded-full active:bg-red-600"
            >
              Yakunlash
            </button>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="px-5">
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
              className={`w-full flex items-center px-5 py-4 rounded-xl border transition-all text-left ${
                isSelected ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white hover:border-gray-300"
              }`}
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
        <button onClick={goNext} className="bg-primary-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2">
          {current === questions.length - 1 ? "Tugatish" : "Keyingi savol"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
