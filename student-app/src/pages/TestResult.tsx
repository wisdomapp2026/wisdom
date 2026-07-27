import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Play, X, Check } from "lucide-react";
import { getTestResultsByUser, getAllCourses, getTestsByCourse, getTopicsByCourse, getProblemsByTopic } from "@shared/repositories";
import type { Test, TestResult as TestResultType, Question, Problem } from "@shared/types";
import { useAuth } from "../hooks/useAuth";
import { cachedFetch } from "../hooks/useCache";
import LatexText from "../components/LatexText";
import VideoModal from "../components/VideoModal";

const LOCAL_TEST_RESULTS_KEY = "edukids_local_test_results";

export default function TestResult() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const score = Number(params.get("score") || 0);
  const correct = Number(params.get("correct") || 0);
  const total = Number(params.get("total") || 0);
  const timeSec = Number(params.get("time") || 0);
  const resultId = params.get("resultId") || "";
  const minutes = Math.floor(timeSec / 60);
  const seconds = timeSec % 60;

  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [testData, setTestData] = useState<Test | null>(null);
  const [resultData, setResultData] = useState<TestResultType | null>(null);
  // Kurs ichidagi barcha misollar — video yechim topish uchun
  const [courseProblems, setCourseProblems] = useState<Problem[]>([]);
  // Video modal
  const [videoModalUrl, setVideoModalUrl] = useState<string | null>(null);

  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  useEffect(() => {
    loadResult();
  }, [user]);

  async function loadResult() {
    try {
      let targetResult: TestResultType | undefined;

      if (user) {
        // Login qilgan — DB dan olish
        const results = await getTestResultsByUser(user.uid);
        if (results.length > 0) {
          // resultId aslida testId — shu testga tegishli oxirgi natijani topish
          if (resultId) {
            targetResult = results.find((r) => r.testId === resultId) || results[0];
          } else {
            targetResult = results[0];
          }
        }
      } else {
        // Guest — localStorage dan olish
        const raw = localStorage.getItem(LOCAL_TEST_RESULTS_KEY);
        if (raw) {
          const localResults: TestResultType[] = JSON.parse(raw);
          if (localResults.length > 0) {
            if (resultId) {
              targetResult = localResults.find((r) => r.testId === resultId) || localResults[0];
            } else {
              targetResult = localResults[0];
            }
          }
        }
      }

      if (targetResult) {
        setResultData(targetResult);
        // Shu test ma'lumotlarini olish (savollarni ko'rish uchun)
        await loadTestData(targetResult.testId);
      } else {
        // Natija topilmadi — faqat testni ID bo'yicha topishga urinish
        if (resultId) {
          await loadTestData(resultId);
        }
      }
    } catch (err) {
      console.error("Natija yuklashda xatolik:", err);
    }
  }

  async function loadTestData(testId: string) {
    try {
      const courses = await cachedFetch("all-courses", getAllCourses);
      for (const course of courses) {
        const tests = await cachedFetch(`tests-${course.id}`, () => getTestsByCourse(course.id));
        const found = tests.find((t) => t.id === testId);
        if (found) {
          setTestData(found);
          // Shu kurs ichidagi barcha misollarni yuklash (video yechim topish uchun)
          loadCourseProblems(course.id);
          break;
        }
      }
    } catch (err) {
      console.error("Test yuklashda xatolik:", err);
    }
  }

  async function loadCourseProblems(courseId: string) {
    try {
      const topics = await cachedFetch(`topics-${courseId}`, () => getTopicsByCourse(courseId));
      const allProblems: Problem[] = [];
      for (const topic of topics) {
        const problems = await getProblemsByTopic(courseId, topic.id);
        allProblems.push(...problems);
      }
      setCourseProblems(allProblems);
    } catch (err) {
      console.error("Misollarni yuklashda xatolik:", err);
    }
  }

  /** Savol uchun mos video yechimni topish (content bo'yicha match) */
  function findVideoForQuestion(question: Question): string | null {
    // 1. Avval savolning o'zida videoUrl bormi
    if (question.videoUrl) return question.videoUrl;
    // 2. Kurs misollaridan content bo'yicha topish
    const matchedProblem = courseProblems.find((p) => 
      p.videoUrl && p.content.trim() === question.content.trim()
    );
    if (matchedProblem) return matchedProblem.videoUrl!;
    // 3. Qisman match (content boshi bir xil)
    const partialMatch = courseProblems.find((p) =>
      p.videoUrl && (
        p.content.trim().startsWith(question.content.trim().slice(0, 20)) ||
        question.content.trim().startsWith(p.content.trim().slice(0, 20))
      )
    );
    if (partialMatch) return partialMatch.videoUrl!;
    return null;
  }

  const questions = testData?.questions || [];
  const answers = resultData?.answers || [];

  return (
    <div className="page-content pb-24">
      <header className="px-5 pt-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Test natijalari</h1>
        <Link to="/tests" className="w-10 h-10 flex items-center justify-center text-gray-500 rounded-xl" aria-label="Yopish">
          <X size={20} />
        </Link>
      </header>

      {/* Score card */}
      <div className="mx-5 mt-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-5 border border-gray-100">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-full border-4 border-primary-500 flex items-center justify-center shrink-0">
            <div className="text-center"><p className="text-xl font-bold text-primary-500">{score}%</p><p className="text-[10px] text-gray-600 font-medium">BALL</p></div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <p className="text-xl font-bold">{score >= 80 ? "Ajoyib natija!" : score >= 60 ? "Yaxshi!" : "Harakat qiling!"}</p>
            </div>
            <p className="text-sm text-gray-500 mt-1">Siz {score}% ball to'pladingiz.</p>
            <div className="flex gap-2 mt-2">
              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded font-medium">Baho: {grade}</span>
              <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded font-medium">{correct}/{total} to'g'ri</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <span className="text-gray-500 text-sm">🎯</span>
          <p className="text-xs text-gray-500 mt-1">Aniqlik</p>
          <p className="text-lg font-bold">{correct}/{total}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4 text-center">
          <span className="text-gray-500 text-sm">⏱</span>
          <p className="text-xs text-gray-500 mt-1">Sarflangan vaqt</p>
          <p className="text-lg font-bold">{minutes}d {seconds}s</p>
        </div>
      </div>

      {/* Question Grid */}
      <section className="px-5 mt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold">Savollar jadvali</h3>
          <div className="flex gap-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-primary-500 rounded-full" />To'g'ri</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full" />Xato</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mb-3">Savol raqamini bosing — batafsil ko'rish uchun</p>
        <div className="flex flex-wrap gap-2">
          {answers.length > 0 ? (
            answers.map((ans, i) => (
              <button
                key={i}
                onClick={() => setSelectedQuestion(selectedQuestion === i ? null : i)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  ans.isCorrect ? "bg-primary-500 text-white" : "bg-red-500 text-white"
                } ${selectedQuestion === i ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "active:scale-95"}`}
              >
                {i + 1}
              </button>
            ))
          ) : (
            Array.from({ length: total }, (_, i) => (
              <button
                key={i}
                onClick={() => setSelectedQuestion(selectedQuestion === i ? null : i)}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-95 ${i < correct ? "bg-primary-500 text-white" : "bg-red-500 text-white"} ${selectedQuestion === i ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : ""}`}
              >
                {i + 1}
              </button>
            ))
          )}
        </div>
      </section>

      {/* Tanlangan savol detallari */}
      {selectedQuestion !== null && questions[selectedQuestion] && (
        <div className="mx-5 mt-4 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm text-gray-900">Savol #{selectedQuestion + 1}</h4>
            <button onClick={() => setSelectedQuestion(null)} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-lg" aria-label="Yopish">
              <X size={16} />
            </button>
          </div>

          {/* Savol matni */}
          <p className="text-sm text-gray-800 mb-4 leading-relaxed">
            <LatexText text={questions[selectedQuestion].content} />
          </p>

          {/* Variantlar */}
          <div className="space-y-2">
            {questions[selectedQuestion].options?.map((opt) => {
              const userAnswer = answers[selectedQuestion]?.selectedAnswer;
              const correctAnswer = questions[selectedQuestion].correctAnswer;
              const isSelected = opt.label === userAnswer;
              const isCorrectOption = opt.label === correctAnswer;

              let borderClass = "border-gray-100";
              let bgClass = "bg-white";
              let icon = null;

              if (isCorrectOption) {
                borderClass = "border-green-300";
                bgClass = "bg-green-50";
                icon = <Check size={14} className="text-green-600" />;
              }
              if (isSelected && !isCorrectOption) {
                borderClass = "border-red-300";
                bgClass = "bg-red-50";
                icon = <X size={14} className="text-red-600" />;
              }

              return (
                <div
                  key={opt.label}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${borderClass} ${bgClass}`}
                >
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    isCorrectOption ? "bg-green-500 text-white" : isSelected ? "bg-red-500 text-white" : "bg-gray-100 text-gray-600"
                  }`}>
                    {opt.label}
                  </span>
                  <span className="text-sm text-gray-800 flex-1"><LatexText text={opt.text} /></span>
                  {icon}
                </div>
              );
            })}
          </div>

          {/* Natija xabari */}
          <div className={`mt-4 px-3 py-2.5 rounded-xl text-xs font-medium ${
            answers[selectedQuestion]?.isCorrect
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}>
            {answers[selectedQuestion]?.isCorrect
              ? "✅ To'g'ri javob berdingiz!"
              : `❌ Xato. To'g'ri javob: ${questions[selectedQuestion].correctAnswer}`
            }
          </div>

          {/* Noto'g'ri javob bo'lsa — video yechim tavsiyasi */}
          {!answers[selectedQuestion]?.isCorrect && (() => {
            const videoUrl = findVideoForQuestion(questions[selectedQuestion]);
            if (!videoUrl) return null;
            return (
              <button
                onClick={() => setVideoModalUrl(videoUrl)}
                className="mt-4 w-full flex items-center gap-3 p-3 bg-purple-50 border border-purple-200 rounded-xl active:bg-purple-100"
              >
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center shrink-0">
                  <Play size={16} className="text-white" fill="white" />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-purple-800">Video yechimni ko'rish</p>
                  <p className="text-xs text-purple-600 mt-0.5">Bu savolning batafsil yechimi</p>
                </div>
              </button>
            );
          })()}
        </div>
      )}

      {/* Pastda umumiy video tavsiyalar — faqat noto'g'ri javoblar uchun */}
      {(() => {
        const wrongWithVideo = answers
          .map((ans, i) => ({ ans, question: questions[i], index: i }))
          .filter(({ ans, question }) => {
            if (!ans || ans.isCorrect || !question) return false;
            return !!findVideoForQuestion(question);
          });

        if (wrongWithVideo.length === 0) return null;

        return (
          <section className="px-5 mt-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold flex items-center gap-2">🎬 Video yechimlar</h3>
              <span className="text-xs text-gray-500">{wrongWithVideo.length} ta xato savol</span>
            </div>
            <div className="space-y-2">
              {wrongWithVideo.map(({ question, index }) => {
                const videoUrl = findVideoForQuestion(question)!;
                const isYouTube = videoUrl.includes("youtube") || videoUrl.includes("youtu.be");
                const thumbnail = isYouTube
                  ? (() => {
                      const match = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
                      return match ? `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg` : "";
                    })()
                  : "";

                return (
                  <button
                    key={question.id}
                    onClick={() => setVideoModalUrl(videoUrl)}
                    className="w-full flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl active:bg-gray-50 text-left"
                  >
                    <div className="w-14 h-10 bg-gray-800 rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative">
                      {thumbnail ? (
                        <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                      ) : null}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <Play size={12} className="text-white" fill="white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">Savol #{index + 1} — Video yechim</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{question.content.slice(0, 50)}...</p>
                    </div>
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg font-medium shrink-0">Xato</span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })()}

      {/* Performance */}
      <div className="mx-5 mt-6 bg-gray-50 border border-gray-100 rounded-xl p-5">
        <p className="font-semibold text-gray-900 mb-2">Natija tahlili</p>
        <p className="text-sm text-gray-600 leading-relaxed">
          Siz {correct} ta savolga to'g'ri javob berdingiz. {total - correct > 0 ? `${total - correct} ta savolni qayta takrorlashni tavsiya qilamiz.` : "Barcha savollarga to'g'ri javob berdingiz! 🎉"}
        </p>
      </div>

      {/* Retake */}
      <div className="mx-5 mt-6 space-y-3">
        <Link to="/tests" className="block w-full border border-primary-300 text-primary-500 font-semibold py-3 rounded-xl text-center active:bg-primary-50">Testlar sahifasiga qaytish</Link>
        {resultData?.courseId && (
          <Link to={`/course/${resultData.courseId}`} className="block w-full bg-primary-500 text-white font-semibold py-3 rounded-xl text-center active:bg-primary-600">Kursga qaytish →</Link>
        )}
      </div>

      {/* Video Modal */}
      <VideoModal open={!!videoModalUrl} videoUrl={videoModalUrl || ""} onClose={() => setVideoModalUrl(null)} />
    </div>
  );
}
