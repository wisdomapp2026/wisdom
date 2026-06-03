import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const questions = [
  { id: "q1", content: "Which of the following numbers is a prime number between 10 and 20?", options: [{ l: "A", t: "12" }, { l: "B", t: "15" }, { l: "C", t: "17" }, { l: "D", t: "18" }] },
  { id: "q2", content: "23 + 45 = ?", options: [{ l: "A", t: "58" }, { l: "B", t: "68" }, { l: "C", t: "78" }, { l: "D", t: "63" }] },
];

export default function TestScreen() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="px-5 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold text-gray-900">Math Test #102</h1>
          <div className="bg-primary-50 px-3 py-1.5 rounded-full flex items-center gap-1">
            <span className="text-primary-500 text-xs">⏱</span>
            <span className="text-primary-500 font-bold text-sm">14:52</span>
          </div>
        </div>
      </header>

      {/* Progress */}
      <div className="px-5">
        <p className="text-[11px] text-primary-500 font-medium uppercase">Current Progress</p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-xl font-bold text-gray-900">Question {current + 1}<span className="text-gray-400 text-base font-normal"> / {questions.length}</span></p>
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
            <span className="text-[11px] text-primary-500 font-semibold uppercase">Question Statement</span>
          </div>
          <p className="text-lg font-semibold text-gray-900 leading-7">{q.content}</p>
        </div>
      </div>

      {/* Options */}
      <div className="px-5 mt-6 space-y-3 flex-1">
        {q.options.map((opt) => {
          const isSelected = selected === opt.l;
          return (
            <button
              key={opt.l}
              onClick={() => setSelected(opt.l)}
              className={`w-full flex items-center px-5 py-4 rounded-xl border transition-all ${isSelected ? "border-primary-500 bg-primary-50" : "border-gray-200 bg-white hover:border-gray-300"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 text-sm font-bold ${isSelected ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600"}`}>
                {opt.l}
              </div>
              <span className={`text-base ${isSelected ? "text-primary-700 font-medium" : "text-gray-700"}`}>{opt.t}</span>
            </button>
          );
        })}
      </div>

      {/* Navigation */}
      <div className="px-5 py-4 flex items-center justify-between border-t border-gray-100 mt-auto">
        <button
          onClick={() => { setCurrent(Math.max(0, current - 1)); setSelected(null); }}
          disabled={current === 0}
          className="flex items-center gap-1 text-sm text-gray-400 disabled:opacity-40"
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <button
          onClick={() => {
            if (current < questions.length - 1) { setCurrent(current + 1); setSelected(null); }
            else navigate("/test-result");
          }}
          className="bg-primary-500 text-white font-bold text-sm px-6 py-3 rounded-xl flex items-center gap-2"
        >
          {current === questions.length - 1 ? "Tugatish" : "Next Question"} <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
