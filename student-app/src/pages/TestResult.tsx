import { Link } from "react-router-dom";
import { Play } from "lucide-react";

const wrongAnswers = [2, 6, 11];

export default function TestResult() {
  return (
    <div className="page-content">
      <header className="px-5 pt-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Test Results</h1>
        <button className="text-gray-400">⋮</button>
      </header>

      {/* Score card */}
      <div className="mx-5 mt-4 bg-gradient-to-r from-gray-50 to-red-50 rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full border-4 border-primary-500 flex items-center justify-center shrink-0">
            <div className="text-center"><p className="text-xl font-bold text-primary-500">85%</p><p className="text-[8px] text-gray-500">SCORE</p></div>
          </div>
          <div>
            <div className="flex items-center gap-2"><span className="text-xl">🏆</span><p className="text-xl font-bold">Great Job!</p></div>
            <p className="text-sm text-gray-500 mt-1">You scored higher than 88% of other students in this test.</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">Grade: A</span>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded font-medium">Math Test #4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <span className="text-gray-400 text-sm">🎯</span><p className="text-xs text-gray-500 mt-1">Accuracy</p><p className="text-lg font-bold">17/20</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <span className="text-gray-400 text-sm">⏱</span><p className="text-xs text-gray-500 mt-1">Time Taken</p><p className="text-lg font-bold">12m 45s</p>
        </div>
      </div>

      {/* Question Grid */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Question Grid</h3>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary-500 rounded-full" />Correct</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />Wrong</span>
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mb-3">Tap a number to see explanation</p>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
            const isWrong = wrongAnswers.includes(n);
            return (
              <button key={n} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${isWrong ? "bg-red-500 text-white" : "bg-primary-500 text-white"}`}>{n}</button>
            );
          })}
        </div>
      </section>

      {/* Recommended */}
      <section className="px-5 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold flex items-center gap-2">📊 Recommended Lessons</h3>
          <button className="text-sm text-primary-500 font-medium">See All ›</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[{ t: "Understanding Complex Equations", c: "Mathematics" }, { t: "Quadratic Formula Mastery", c: "Algebra" }].map((l, i) => (
            <div key={i} className="shrink-0 w-40">
              <div className="w-full h-24 bg-gray-800 rounded-xl flex items-center justify-center"><div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Play size={16} className="text-white ml-0.5" fill="white" /></div></div>
              <p className="text-[11px] text-primary-500 font-medium mt-2">{l.c}</p>
              <p className="text-sm font-medium text-gray-900">{l.t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Performance Insight */}
      <div className="mx-5 mt-6 bg-gray-50 border border-gray-100 rounded-xl p-5">
        <p className="font-semibold text-gray-900 mb-2">Performance Insight</p>
        <p className="text-sm text-gray-600 leading-relaxed">You performed best in <strong>Geometry</strong> but struggled slightly with <strong>Calculus</strong>. Consider reviewing the video solutions for questions 2, 6, and 11.</p>
      </div>

      {/* Retake */}
      <div className="mx-5 mt-6">
        <button className="w-full border border-red-300 text-red-500 font-semibold py-3 rounded-xl">Retake Quiz</button>
      </div>

      {/* Share FAB */}
      <Link to="/" className="fixed bottom-24 right-5 w-14 h-14 bg-primary-500 rounded-full flex items-center justify-center shadow-lg z-40">
        <span className="text-white text-xl">📤</span>
      </Link>
    </div>
  );
}
