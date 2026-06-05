import { Link, useSearchParams } from "react-router-dom";
import { Play } from "lucide-react";

export default function TestResult() {
  const [params] = useSearchParams();
  const score = Number(params.get("score") || 85);
  const correct = Number(params.get("correct") || 6);
  const total = Number(params.get("total") || 7);
  const timeSec = Number(params.get("time") || 765);
  const minutes = Math.floor(timeSec / 60);
  const seconds = timeSec % 60;

  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  return (
    <div className="page-content">
      <header className="px-5 pt-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Test natijalari</h1>
        <button className="text-gray-400">⋮</button>
      </header>

      {/* Score card */}
      <div className="mx-5 mt-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full border-4 border-primary-500 flex items-center justify-center shrink-0">
            <div className="text-center"><p className="text-xl font-bold text-primary-500">{score}%</p><p className="text-[8px] text-gray-500">BALL</p></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <p className="text-xl font-bold">{score >= 80 ? "Ajoyib natija!" : score >= 60 ? "Yaxshi!" : "Harakat qiling!"}</p>
            </div>
            <p className="text-sm text-gray-500 mt-1">Siz {score}% ball to'pladingiz.</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">Baho: {grade}</span>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded font-medium">Test #{total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <span className="text-gray-400 text-sm">🎯</span>
          <p className="text-xs text-gray-500 mt-1">Aniqlik</p>
          <p className="text-lg font-bold">{correct}/{total}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <span className="text-gray-400 text-sm">⏱</span>
          <p className="text-xs text-gray-500 mt-1">Sarflangan vaqt</p>
          <p className="text-lg font-bold">{minutes}d {seconds}s</p>
        </div>
      </div>

      {/* Question Grid */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold">Savollar jadvali</h3>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary-500 rounded-full" />To'g'ri</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />Xato</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: total }, (_, i) => i + 1).map((n) => {
            const isCorrect = n <= correct;
            return (
              <button key={n} className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${isCorrect ? "bg-primary-500 text-white" : "bg-red-500 text-white"}`}>{n}</button>
            );
          })}
        </div>
      </section>

      {/* Tavsiya qilingan darslar */}
      <section className="px-5 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold flex items-center gap-2">📊 Tavsiya qilingan darslar</h3>
          <button className="text-sm text-primary-500 font-medium">Barchasi ›</button>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {[{ t: "Murakkab tenglamalar", c: "Matematika" }, { t: "Kvadrat formulalar", c: "Algebra" }].map((l, i) => (
            <div key={i} className="shrink-0 w-40">
              <div className="w-full h-24 bg-gray-800 rounded-xl flex items-center justify-center"><div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Play size={16} className="text-white ml-0.5" fill="white" /></div></div>
              <p className="text-[11px] text-primary-500 font-medium mt-2">{l.c}</p>
              <p className="text-sm font-medium text-gray-900">{l.t}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Performance */}
      <div className="mx-5 mt-6 bg-gray-50 border border-gray-100 rounded-xl p-5">
        <p className="font-semibold text-gray-900 mb-2">Natija tahlili</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          Siz {correct} ta savolga to'g'ri javob berdingiz. {total - correct > 0 ? `${total - correct} ta savolni qayta takrorlashni tavsiya qilamiz.` : "Barcha savollarga to'g'ri javob berdingiz!"}
        </p>
      </div>

      {/* Retake */}
      <div className="mx-5 mt-6">
        <Link to="/tests" className="block w-full border border-primary-300 text-primary-500 font-semibold py-3 rounded-xl text-center">Testlar sahifasiga qaytish</Link>
      </div>
    </div>
  );
}
