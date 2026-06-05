import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getTestById } from "@shared/repositories";
import type { Test, Question } from "@shared/types";
import LatexText from "../components/LatexText";

export default function TestScreen() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<Test | null>(null);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!testId) return;
    // courseId ni URL dan yoki default olish
    const courseId = "demo-boshlangich-matematika";
    getTestById(courseId, testId).then((t) => {
      setTest(t);
      if (t) setTimeLeft(t.totalTime * 60); // daqiqani soniyaga
    }).catch(console.error).finally(() => setLoading(false));
  }, [testId]);

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
      // Test tugadi — natijaga o'tish
      const correct = questions.filter((qq) => answers[qq.id] === qq.correctAnswer).length;
      const score = Math.round((correct / questions.length) * 100);
      navigate(`/test-result?score=${score}&correct=${correct}&total=${questions.length}&time=${test.totalTime * 60 - timeLeft}`);
    }
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
          <h1 className="text-lg font-bold text-gray-900">{test.title}</h1>
          <div className="bg-primary-50 px-3 py-1.5 rounded-full flex items-center gap-1">
            <span className="text-primary-500 text-xs">⏱</span>
            <span className="text-primary-500 font-bold text-sm">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
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
