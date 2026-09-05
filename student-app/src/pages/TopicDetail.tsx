import { Link, useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  BookOpen,
  Layers,
  HelpCircle,
  Gamepad2,
  Volume2,
  Maximize2,
  X,
  CheckCircle2,
  XCircle,
  ArrowRight,
  RotateCcw,
  Sparkles,
  Trophy,
  Play,
  Check,
  Eye,
  Star,
  Shuffle,
} from "lucide-react";
import {
  getTopicById,
  getVocabulariesByIds,
  getUserProgress,
  setUserProgress,
  saveStudentWordStat,
} from "@shared/repositories";
import type { Topic, Vocabulary, TopicQuizQuestion } from "@shared/types";
import { useAuth } from "../hooks/useAuth";
import { useCourseAccess } from "../hooks/useCourseAccess";
import { useBackHandler } from "../services/backActionManager";

export default function TopicDetail() {
  const { courseId, topicId } = useParams<{ courseId: string; topicId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAccess } = useCourseAccess(courseId);

  const [topic, setTopic] = useState<Topic | null>(null);
  const [vocabularies, setVocabularies] = useState<Vocabulary[]>([]);
  const [loading, setLoading] = useState(true);

  // Active step: "theory" | "vocabulary" | "quiz" | "games"
  const [activeStep, setActiveStep] = useState<"theory" | "vocabulary" | "quiz" | "games">("theory");

  // Fullscreen media modal
  const [fullscreenMedia, setFullscreenMedia] = useState<{ type: "image" | "video"; url: string; caption?: string } | null>(null);

  // Quiz state
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Games state
  const [selectedGame, setSelectedGame] = useState<"flashcards" | "match" | "scramble">("flashcards");

  // Flashcards state
  const [flashcardIndex, setFlashcardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knownWords, setKnownWords] = useState<Set<string>>(new Set());

  // Match Pairs state
  type MatchCard = { id: string; text: string; wordId: string; type: "en" | "uz"; isMatched: boolean };
  const [matchCards, setMatchCards] = useState<MatchCard[]>([]);
  const [selectedMatchFirst, setSelectedMatchFirst] = useState<MatchCard | null>(null);
  const [matchSuccessCount, setMatchSuccessCount] = useState(0);

  // Word Scramble state
  const [scrambleIndex, setScrambleIndex] = useState(0);
  const [scrambledLetters, setScrambledLetters] = useState<Array<{ char: string; id: number; used: boolean }>>([]);
  const [assembledWord, setAssembledWord] = useState<Array<{ char: string; originalId: number }>>([]);
  const [scrambleSuccess, setScrambleSuccess] = useState(false);

  // Smartfon back tugmasi
  function handleBack() {
    if (topic?.folderId) {
      navigate(`/course/${courseId}/folder/${topic.folderId}`);
    } else {
      navigate(`/course/${courseId}`);
    }
  }
  useBackHandler(handleBack, true, 0);

  useEffect(() => {
    if (courseId && topicId) {
      loadData();
    }
  }, [courseId, topicId]);

  async function loadData() {
    setLoading(true);
    try {
      const t = await getTopicById(courseId!, topicId!);
      if (t) {
        setTopic(t);
        if (t.vocabularyIds && t.vocabularyIds.length > 0) {
          const vList = await getVocabulariesByIds(t.vocabularyIds);
          setVocabularies(vList);
        }
      }
    } catch (err) {
      console.error("Mavzu yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  // Audio talaffuz (SpeechSynthesis)
  function playSpeech(word: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-US";
    utterance.rate = 0.85;
    window.speechSynthesis.speak(utterance);
  }

  // Quiz operatsiyalari
  const questions = topic?.quizQuestions || [];

  function handleSelectOption(optIdx: number) {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(optIdx);
    setIsAnswerSubmitted(true);
    if (optIdx === questions[quizIndex]?.correctAnswer) {
      setQuizScore((prev) => prev + 1);
    }
  }

  function handleNextQuestion() {
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    if (quizIndex + 1 < questions.length) {
      setQuizIndex((prev) => prev + 1);
    } else {
      setQuizFinished(true);
      // O'quvchi progressiga XP qo'shish
      if (user && courseId) {
        getUserProgress(user.uid, courseId).then((prog) => {
          if (prog) {
            const completedTopics = Array.from(new Set([...(prog.completedTopics || []), topicId!]));
            setUserProgress({
              ...prog,
              completedTopics,
              totalXP: (prog.totalXP || 0) + 20,
            });
          }
        });
      }
    }
  }

  function handleRestartQuiz() {
    setQuizIndex(0);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setQuizScore(0);
    setQuizFinished(false);
  }

  // O'yinlar: Match Pairs tayyorlash
  function initMatchGame() {
    if (vocabularies.length === 0) return;
    const subset = vocabularies.slice(0, 6);
    const cards: MatchCard[] = [];
    subset.forEach((v) => {
      cards.push({ id: v.id + "_en", text: v.word, wordId: v.id, type: "en", isMatched: false });
      cards.push({ id: v.id + "_uz", text: v.translation, wordId: v.id, type: "uz", isMatched: false });
    });
    // Aralashtirish (shuffle)
    cards.sort(() => Math.random() - 0.5);
    setMatchCards(cards);
    setSelectedMatchFirst(null);
    setMatchSuccessCount(0);
  }

  function handleCardClick(card: MatchCard) {
    if (card.isMatched) return;
    if (!selectedMatchFirst) {
      setSelectedMatchFirst(card);
      if (card.type === "en") playSpeech(card.text);
      return;
    }

    if (selectedMatchFirst.id === card.id) {
      setSelectedMatchFirst(null);
      return;
    }

    // Tekshirish: bir xil so'zmi va har xil tildami?
    if (selectedMatchFirst.wordId === card.wordId && selectedMatchFirst.type !== card.type) {
      // To'g'ri juftlik!
      setMatchCards((prev) =>
        prev.map((c) =>
          c.wordId === card.wordId ? { ...c, isMatched: true } : c
        )
      );
      setMatchSuccessCount((prev) => prev + 1);
      setSelectedMatchFirst(null);
      // So'z statistikasiga yozish
      if (user) saveStudentWordStat({ userId: user.uid, wordId: card.wordId, isCorrect: true });
    } else {
      // Noto'g'ri juftlik
      if (card.type === "en") playSpeech(card.text);
      setSelectedMatchFirst(card);
    }
  }

  // Word Scramble tayyorlash
  function initScrambleGame(index: number) {
    if (!vocabularies[index]) return;
    const wordObj = vocabularies[index];
    const letters = wordObj.word
      .toUpperCase()
      .split("")
      .map((char, id) => ({ char, id, used: false }))
      .sort(() => Math.random() - 0.5);

    setScrambledLetters(letters);
    setAssembledWord([]);
    setScrambleSuccess(false);
  }

  function handleLetterPick(letterItem: { char: string; id: number; used: boolean }) {
    if (letterItem.used) return;
    setScrambledLetters((prev) =>
      prev.map((l) => (l.id === letterItem.id ? { ...l, used: true } : l))
    );
    const nextAssembled = [...assembledWord, { char: letterItem.char, originalId: letterItem.id }];
    setAssembledWord(nextAssembled);

    // Tekshirish
    const currentTarget = vocabularies[scrambleIndex]?.word.toUpperCase();
    const assembledStr = nextAssembled.map((a) => a.char).join("");
    if (assembledStr === currentTarget) {
      setScrambleSuccess(true);
      playSpeech(vocabularies[scrambleIndex].word);
      if (user) saveStudentWordStat({ userId: user.uid, wordId: vocabularies[scrambleIndex].id, isCorrect: true });
    }
  }

  function handleUndoLetter(index: number) {
    if (scrambleSuccess) return;
    const removed = assembledWord[index];
    const nextAssembled = assembledWord.filter((_, idx) => idx !== index);
    setAssembledWord(nextAssembled);
    setScrambledLetters((prev) =>
      prev.map((l) => (l.id === removed.originalId ? { ...l, used: false } : l))
    );
  }

  useEffect(() => {
    if (activeStep === "games") {
      if (selectedGame === "match") initMatchGame();
      if (selectedGame === "scramble") initScrambleGame(scrambleIndex);
    }
  }, [activeStep, selectedGame, scrambleIndex, vocabularies]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-xl font-bold text-gray-900">Mavzu topilmadi</h2>
        <button
          onClick={handleBack}
          className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow"
        >
          Orqaga qaytish
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-24 text-gray-900">
      {/* Top Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-gray-100 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="text-center truncate px-2">
            <h1 className="font-bold text-sm text-gray-900 truncate">{topic.title}</h1>
            <p className="text-[11px] text-gray-400 font-medium">Wisdom English</p>
          </div>
          <div className="w-10 flex justify-end">
            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      {/* Stepper / Tabs */}
      <div className="max-w-4xl mx-auto px-4 pt-4">
        <div className="grid grid-cols-4 bg-gray-100 p-1 rounded-2xl gap-1 text-xs font-semibold text-gray-500">
          <button
            onClick={() => setActiveStep("theory")}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeStep === "theory"
                ? "bg-white text-indigo-600 shadow-sm font-bold"
                : "hover:text-gray-900"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">1. Teoriya</span>
            <span className="sm:hidden">Teoriya</span>
          </button>

          <button
            onClick={() => setActiveStep("vocabulary")}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeStep === "vocabulary"
                ? "bg-white text-indigo-600 shadow-sm font-bold"
                : "hover:text-gray-900"
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="hidden sm:inline">2. Lug'at</span>
            <span className="sm:hidden">Lug'at</span>
          </button>

          <button
            onClick={() => setActiveStep("quiz")}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeStep === "quiz"
                ? "bg-white text-indigo-600 shadow-sm font-bold"
                : "hover:text-gray-900"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">3. Quiz</span>
            <span className="sm:hidden">Quiz</span>
          </button>

          <button
            onClick={() => setActiveStep("games")}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              activeStep === "games"
                ? "bg-white text-indigo-600 shadow-sm font-bold"
                : "hover:text-gray-900"
            }`}
          >
            <Gamepad2 className="w-4 h-4" />
            <span className="hidden sm:inline">4. O'yinlar</span>
            <span className="sm:hidden">O'yinlar</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-4 pt-4 space-y-6">
        {/* ================= STEP 1: THEORY ================= */}
        {activeStep === "theory" && (
          <div className="space-y-6">
            {/* Theory Text Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Dars Nazariyasi</h2>
                  <p className="text-xs text-gray-500">Mavzuni diqqat bilan o'qib chiqing</p>
                </div>
              </div>

              {topic.theoryContent ? (
                <div
                  className="rich-theory-content text-gray-800 text-sm sm:text-base leading-relaxed break-words"
                  dangerouslySetInnerHTML={{
                    __html: topic.theoryContent.includes("<")
                      ? topic.theoryContent
                      : topic.theoryContent.replace(/\n/g, "<br />"),
                  }}
                />
              ) : (
                <div className="p-8 text-center text-gray-400 italic">
                  Ushbu dars uchun hozircha nazariy matn kiritilmagan.
                </div>
              )}
            </div>

            {/* Theory Media: Rasmlar va Videolar */}
            {topic.theoryMedia && topic.theoryMedia.length > 0 && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-4">
                <h3 className="font-bold text-gray-900 text-sm uppercase tracking-wider">
                  Mavzuga oid ko'rgazmali materiallar
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {topic.theoryMedia.map((media, idx) => (
                    <div
                      key={idx}
                      onClick={() => setFullscreenMedia(media)}
                      className="group relative rounded-2xl overflow-hidden border border-gray-200 cursor-pointer bg-black/5 hover:border-indigo-500 transition-all shadow-sm"
                    >
                      {media.type === "image" ? (
                        <div className="relative h-48 w-full overflow-hidden">
                          <img
                            src={media.url}
                            alt={media.caption || "Theory visual"}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <span className="p-2 bg-white/90 rounded-full text-gray-800 shadow-md transform group-hover:scale-110 transition-transform">
                              <Maximize2 className="w-5 h-5" />
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="h-48 w-full bg-gray-900 flex flex-col items-center justify-center text-white relative">
                          <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                            <Play className="w-6 h-6 fill-current translate-x-0.5" />
                          </div>
                          <span className="text-xs font-semibold mt-2 text-gray-300">
                            Videoni to'liq ekranda ko'rish
                          </span>
                        </div>
                      )}
                      {media.caption && (
                        <div className="p-3 bg-white text-xs font-medium text-gray-700">
                          {media.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Next Step Button */}
            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setActiveStep("vocabulary")}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all transform active:scale-98"
              >
                <span>Teoriyani o'qib bo'ldim → Lug'atga o'tish</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: VOCABULARY ================= */}
        {activeStep === "vocabulary" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Layers className="w-6 h-6 text-indigo-600" />
                  Mavzu Lug'ati ({vocabularies.length} ta so'z)
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Har bir so'zning ma'nosini va talaffuzini eslab qoling
                </p>
              </div>
            </div>

            {vocabularies.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center text-gray-400 space-y-3 border border-gray-100">
                <Layers className="w-12 h-12 mx-auto text-gray-300" />
                <p className="text-base font-semibold text-gray-700">Bu mavzuda hali lug'at yo'q</p>
                <p className="text-xs text-gray-400">Tez orada admin tomonidan so'zlar biriktiriladi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vocabularies.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:border-indigo-200 transition-all space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-extrabold text-gray-900 tracking-tight">
                            {v.word}
                          </h3>
                          {v.level && (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                              {v.level}
                            </span>
                          )}
                        </div>
                        {v.phonetic && (
                          <p className="text-xs font-mono text-gray-400 mt-0.5">{v.phonetic}</p>
                        )}
                      </div>
                      <button
                        onClick={() => playSpeech(v.word)}
                        className="p-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors shadow-sm"
                        title="Talaffuzni tinglash"
                      >
                        <Volume2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="p-3 bg-gray-50/80 rounded-xl border border-gray-100/60">
                      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        Tarjima
                      </p>
                      <p className="text-sm font-bold text-indigo-950 mt-0.5">{v.translation}</p>
                    </div>

                    {v.exampleSentence && (
                      <div className="text-xs text-gray-600 space-y-1 pt-1">
                        <p className="italic text-gray-800">"{v.exampleSentence}"</p>
                        {v.exampleTranslation && (
                          <p className="text-gray-500">— {v.exampleTranslation}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 flex justify-between gap-4">
              <button
                onClick={() => setActiveStep("theory")}
                className="px-6 py-3 border border-gray-200 text-gray-600 rounded-2xl font-semibold hover:bg-gray-100"
              >
                ← Teoriya
              </button>
              <button
                onClick={() => setActiveStep("quiz")}
                className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
              >
                <span>Quizga o'tish (Test)</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: QUIZ ================= */}
        {activeStep === "quiz" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
              {questions.length === 0 ? (
                <div className="text-center py-12 text-gray-400 space-y-3">
                  <HelpCircle className="w-12 h-12 mx-auto text-gray-300" />
                  <p className="text-base font-semibold text-gray-700">Quiz savollari mavjud emas</p>
                  <p className="text-xs text-gray-400">To'g'ridan-to'g'ri o'yinlarga o'tishingiz mumkin.</p>
                  <button
                    onClick={() => setActiveStep("games")}
                    className="mt-4 px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-xs"
                  >
                    O'yinlarga o'tish →
                  </button>
                </div>
              ) : quizFinished ? (
                /* Quiz Finished Card */
                <div className="text-center py-8 space-y-5">
                  <div className="w-20 h-20 rounded-3xl bg-amber-50 border border-amber-100 flex items-center justify-center mx-auto text-amber-500 shadow-sm">
                    <Trophy className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-extrabold text-gray-900">Quiz Yakunlandi!</h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Siz {questions.length} ta savoldan {quizScore} tasiga to'g'ri javob berdingiz.
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-3 px-6 py-3 bg-indigo-50 text-indigo-700 rounded-2xl font-bold text-lg">
                    <Sparkles className="w-5 h-5" />
                    +20 XP Qolga kiritildi!
                  </div>

                  <div className="flex justify-center gap-4 pt-4">
                    <button
                      onClick={handleRestartQuiz}
                      className="px-6 py-3 border border-gray-200 text-gray-700 rounded-2xl font-semibold text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Qayta topshirish
                    </button>
                    <button
                      onClick={() => setActiveStep("games")}
                      className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 flex items-center gap-2"
                    >
                      <span>O'yinlar bilan mustahkamlash</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Ongoing Quiz */
                <div className="space-y-6">
                  {/* Quiz Progress */}
                  <div className="flex items-center justify-between text-xs font-bold text-gray-500">
                    <span>
                      Savol {quizIndex + 1} / {questions.length}
                    </span>
                    <span className="text-indigo-600 font-extrabold">Ball: {quizScore}</span>
                  </div>

                  <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${((quizIndex + 1) / questions.length) * 100}%` }}
                    />
                  </div>

                  {/* Question Text */}
                  <div className="py-2">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-snug">
                      {questions[quizIndex]?.question}
                    </h3>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {questions[quizIndex]?.options.map((opt, oIdx) => {
                      const isSelected = selectedAnswer === oIdx;
                      const isCorrect = questions[quizIndex]?.correctAnswer === oIdx;

                      let btnStyle = "bg-white border-gray-200 text-gray-800 hover:border-indigo-300";
                      if (isAnswerSubmitted) {
                        if (isCorrect) {
                          btnStyle = "bg-emerald-50 border-emerald-500 text-emerald-900 font-bold";
                        } else if (isSelected && !isCorrect) {
                          btnStyle = "bg-red-50 border-red-400 text-red-900 font-medium";
                        } else {
                          btnStyle = "bg-gray-50 border-gray-100 text-gray-400";
                        }
                      } else if (isSelected) {
                        btnStyle = "bg-indigo-50 border-indigo-600 text-indigo-900 font-bold";
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleSelectOption(oIdx)}
                          disabled={isAnswerSubmitted}
                          className={`w-full p-4 rounded-2xl border-2 text-left text-sm sm:text-base flex items-center justify-between transition-all ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {isAnswerSubmitted && isCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          {isAnswerSubmitted && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after answer */}
                  {isAnswerSubmitted && (
                    <div className="p-4 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                        {selectedAnswer === questions[quizIndex]?.correctAnswer
                          ? "🎉 To'g'ri javob!"
                          : "⚠️ Noto'g'ri javob"}
                      </p>
                      {questions[quizIndex]?.explanation && (
                        <p className="text-xs text-indigo-800/80">
                          {questions[quizIndex].explanation}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Next Question Button */}
                  {isAnswerSubmitted && (
                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={handleNextQuestion}
                        className="w-full sm:w-auto px-8 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                      >
                        <span>
                          {quizIndex + 1 === questions.length
                            ? "Natijalarni ko'rish"
                            : "Keyingi savol"}
                        </span>
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ================= STEP 4: GAMES ================= */}
        {activeStep === "games" && (
          <div className="space-y-6">
            {/* Game Selector Bar */}
            <div className="grid grid-cols-3 bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm gap-2">
              <button
                onClick={() => setSelectedGame("flashcards")}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  selectedGame === "flashcards"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Layers className="w-4 h-4" />
                Flashcards
              </button>
              <button
                onClick={() => setSelectedGame("match")}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  selectedGame === "match"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Shuffle className="w-4 h-4" />
                Juftini top
              </button>
              <button
                onClick={() => setSelectedGame("scramble")}
                className={`py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  selectedGame === "scramble"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                So'z yasash
              </button>
            </div>

            {/* 1. FLASHCARDS */}
            {selectedGame === "flashcards" && (
              <div className="bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-gray-100 text-center space-y-6">
                {vocabularies.length === 0 ? (
                  <p className="text-gray-400 py-8">Mavzuda so'zlar topilmadi.</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                      <span>Xotira Kartasi</span>
                      <span>
                        {flashcardIndex + 1} / {vocabularies.length}
                      </span>
                    </div>

                    {/* Interactive Flipping Card */}
                    <div
                      onClick={() => setIsFlipped(!isFlipped)}
                      className="w-full max-w-md mx-auto min-h-[220px] rounded-3xl border-2 border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white p-8 flex flex-col items-center justify-center cursor-pointer shadow-sm hover:border-indigo-300 transition-all transform active:scale-98 relative"
                    >
                      <span className="absolute top-4 right-4 text-xs font-semibold text-indigo-400">
                        Aylantirish uchun bosing 🔄
                      </span>

                      {!isFlipped ? (
                        <div className="space-y-2">
                          <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                            {vocabularies[flashcardIndex]?.word}
                          </h3>
                          {vocabularies[flashcardIndex]?.phonetic && (
                            <p className="text-sm font-mono text-gray-400">
                              {vocabularies[flashcardIndex].phonetic}
                            </p>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              playSpeech(vocabularies[flashcardIndex].word);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-gray-200 rounded-full text-xs font-semibold text-indigo-600 shadow-sm mt-2"
                          >
                            <Volume2 className="w-3.5 h-3.5" /> Tinglash
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <h4 className="text-2xl font-bold text-indigo-900">
                            {vocabularies[flashcardIndex]?.translation}
                          </h4>
                          {vocabularies[flashcardIndex]?.exampleSentence && (
                            <p className="text-xs text-gray-600 italic max-w-xs">
                              "{vocabularies[flashcardIndex].exampleSentence}"
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="flex items-center justify-center gap-4 pt-4">
                      <button
                        onClick={() => {
                          setIsFlipped(false);
                          setFlashcardIndex((prev) => (prev > 0 ? prev - 1 : vocabularies.length - 1));
                        }}
                        className="px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-semibold text-xs hover:bg-gray-50"
                      >
                        ← Oldingisi
                      </button>
                      <button
                        onClick={() => {
                          setIsFlipped(false);
                          setFlashcardIndex((prev) => (prev + 1) % vocabularies.length);
                        }}
                        className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 shadow-sm"
                      >
                        Keyingisi →
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 2. MATCH PAIRS */}
            {selectedGame === "match" && (
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-base text-gray-900">Juftini top (Match Pairs)</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Inglizcha so'z va uning o'zbekcha tarjimasini bir-biriga moslang
                    </p>
                  </div>
                  <button
                    onClick={initMatchGame}
                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-xl"
                    title="Qayta boshlash"
                  >
                    <RotateCcw className="w-5 h-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {matchCards.map((card) => {
                    const isSelected = selectedMatchFirst?.id === card.id;
                    return (
                      <button
                        key={card.id}
                        disabled={card.isMatched}
                        onClick={() => handleCardClick(card)}
                        className={`p-4 rounded-2xl border-2 text-center text-sm font-bold min-h-[70px] flex items-center justify-center transition-all ${
                          card.isMatched
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 opacity-40 scale-95"
                            : isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md scale-102"
                            : "bg-gray-50 border-gray-200/80 text-gray-800 hover:border-indigo-300"
                        }`}
                      >
                        {card.text}
                      </button>
                    );
                  })}
                </div>

                {matchCards.length > 0 && matchCards.every((c) => c.isMatched) && (
                  <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
                    <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                    <h4 className="font-bold text-lg text-emerald-950">Ajoyib natija!</h4>
                    <p className="text-xs text-emerald-800">
                      Barcha so'zlarning juftligini to'g'ri topdingiz!
                    </p>
                    <button
                      onClick={initMatchGame}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs shadow-sm hover:bg-emerald-700"
                    >
                      Yana o'ynash
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. WORD SCRAMBLE */}
            {selectedGame === "scramble" && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 text-center space-y-6">
                <div className="flex items-center justify-between text-xs font-bold text-gray-400">
                  <span>Harflardan so'z yasash</span>
                  <span>
                    {scrambleIndex + 1} / {vocabularies.length}
                  </span>
                </div>

                {vocabularies[scrambleIndex] && (
                  <div className="space-y-6">
                    <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100 max-w-sm mx-auto">
                      <p className="text-xs text-indigo-600 font-semibold uppercase">Tarjima</p>
                      <h4 className="text-xl font-extrabold text-indigo-950 mt-1">
                        {vocabularies[scrambleIndex].translation}
                      </h4>
                    </div>

                    {/* Assembled Letters Box */}
                    <div className="flex items-center justify-center gap-2 min-h-[56px] border-b-2 border-gray-200 pb-3">
                      {assembledWord.length === 0 ? (
                        <span className="text-xs text-gray-400 italic">
                          Pastdagi harflarni bosib so'zni yig'ing
                        </span>
                      ) : (
                        assembledWord.map((item, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleUndoLetter(idx)}
                            className="w-10 h-12 rounded-xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-md transform active:scale-95 transition-transform"
                          >
                            {item.char}
                          </button>
                        ))
                      )}
                    </div>

                    {/* Available Scrambled Letters */}
                    <div className="flex flex-wrap items-center justify-center gap-2 max-w-sm mx-auto">
                      {scrambledLetters.map((l) => (
                        <button
                          key={l.id}
                          disabled={l.used || scrambleSuccess}
                          onClick={() => handleLetterPick(l)}
                          className={`w-11 h-12 rounded-xl font-bold text-lg flex items-center justify-center transition-all ${
                            l.used
                              ? "bg-gray-100 text-gray-300 border border-gray-200"
                              : "bg-white border-2 border-gray-300 text-gray-800 hover:border-indigo-500 shadow-sm active:scale-90"
                          }`}
                        >
                          {l.char}
                        </button>
                      ))}
                    </div>

                    {scrambleSuccess && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                        <p className="font-bold text-emerald-800 text-sm">
                          🎉 Barakalla! So'z to'g'ri yig'ildi!
                        </p>
                        <button
                          onClick={() => {
                            setScrambleIndex((prev) => (prev + 1) % vocabularies.length);
                          }}
                          className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 shadow"
                        >
                          Keyingi so'zga o'tish →
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Fullscreen Media Modal */}
      {fullscreenMedia && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setFullscreenMedia(null)}
            className="absolute top-4 right-4 p-3 text-white/80 hover:text-white bg-white/10 rounded-full backdrop-blur-md"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="max-w-4xl max-h-[85vh] w-full flex flex-col items-center justify-center">
            {fullscreenMedia.type === "image" ? (
              <img
                src={fullscreenMedia.url}
                alt={fullscreenMedia.caption || "Fullscreen"}
                className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
                <iframe
                  src={fullscreenMedia.url.replace("watch?v=", "embed/")}
                  title="Video player"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            )}
            {fullscreenMedia.caption && (
              <p className="text-white/90 text-sm font-medium mt-4 text-center">
                {fullscreenMedia.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
