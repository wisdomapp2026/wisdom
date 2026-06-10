import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Lock, Unlock, ChevronRight, Loader2, GripVertical, FileText, Eye, MessageSquare } from "lucide-react";
import { getCourseById, getTopicsByCourse, getTestsByCourse, deleteCourse, updateCourse, updateTopic, updateTest, deleteTopic, deleteTest, getAdviceByCourse, updateAdvice, deleteAdvice } from "@shared/repositories";
import { getStudentCountByCourse } from "@shared/repositories";
import type { Course, Topic, Test, Advice } from "@shared/types";
import CreateTopicModal from "../components/CreateTopicModal";
import ImportTestModal from "../components/ImportTestModal";
import CourseIntroSection from "../components/CourseIntroSection";
import CreateAdviceModal from "../components/CreateAdviceModal";

/** Mavzu, test yoki maslahat — birlashtirilgan ro'yxat elementi */
type ListItem =
  | { type: "topic"; data: Topic; order: number }
  | { type: "test"; data: Test; order: number }
  | { type: "advice"; data: Advice; order: number };

export default function CourseDetail() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [course, setCourse] = useState<Course | null>(null);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showImportTestModal, setShowImportTestModal] = useState(false);
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [studentCount, setStudentCount] = useState(0);

  // Drag and drop
  const [items, setItems] = useState<ListItem[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [orderChanged, setOrderChanged] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    if (courseId) loadData(courseId);
  }, [courseId]);

  // items ni topics, tests va advices dan yaratish
  useEffect(() => {
    buildItemsList();
  }, [topics, tests, advices]);

  function buildItemsList() {
    const list: ListItem[] = [];
    for (const t of topics) {
      list.push({ type: "topic", data: t, order: t.order });
    }
    for (const t of tests) {
      const order = t.afterTopicOrder != null ? t.afterTopicOrder + 0.5 : 99999;
      list.push({ type: "test", data: t, order });
    }
    for (const a of advices) {
      const order = a.afterTopicOrder + 0.3; // mavzudan keyin, testdan oldin
      list.push({ type: "advice", data: a, order });
    }
    list.sort((a, b) => a.order - b.order);
    setItems(list);
  }

  async function loadData(id: string) {
    try {
      const [c, t, te, sc, adv] = await Promise.all([
        getCourseById(id),
        getTopicsByCourse(id),
        getTestsByCourse(id),
        getStudentCountByCourse(id),
        getAdviceByCourse(id),
      ]);
      setCourse(c);
      setTopics(t);
      setTests(te);
      setStudentCount(sc);
      setAdvices(adv);
      if (c) { setEditTitle(c.title); setEditDesc(c.description); }
    } catch (err) {
      console.error("Xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  // ===== DRAG AND DROP =====
  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  function handleDragLeave() {
    setDragOverIndex(null);
  }

  function handleDrop(index: number) {
    if (dragIndex === null || dragIndex === index) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const newItems = [...items];
    const [moved] = newItems.splice(dragIndex, 1);
    newItems.splice(index, 0, moved);

    setItems(newItems);
    setDragIndex(null);
    setDragOverIndex(null);
    setOrderChanged(true);
  }

  async function handleSaveOrder() {
    if (!courseId) return;
    setSavingOrder(true);

    let topicOrder = 1;
    let lastTopicOrder = 0;

    for (const item of items) {
      if (item.type === "topic") {
        const topic = item.data as Topic;
        await updateTopic(courseId, topic.id, { order: topicOrder });
        lastTopicOrder = topicOrder;
        topicOrder++;
      } else if (item.type === "test") {
        const test = item.data as Test;
        await updateTest(courseId, test.id, { afterTopicOrder: lastTopicOrder });
      } else if (item.type === "advice") {
        const advice = item.data as Advice;
        await updateAdvice(courseId, advice.id, { afterTopicOrder: lastTopicOrder });
      }
    }

    setOrderChanged(false);
    setSavingOrder(false);
    await loadData(courseId);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  if (!course) {
    return <div className="text-center py-20 text-gray-500">Kurs topilmadi</div>;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link to="/courses" className="hover:text-primary-500">Kurslar</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="text-gray-900 font-medium">{course.title}</span>
      </div>

      {/* Course header */}
      <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
        {editingCourse ? (
          <div className="space-y-3">
            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary-500" />
            <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            <div className="flex gap-2">
              <button onClick={async () => { await updateCourse(courseId!, { title: editTitle, description: editDesc }); setCourse((p) => p ? { ...p, title: editTitle, description: editDesc } : p); setEditingCourse(false); }} className="btn-primary text-sm">Saqlash</button>
              <button onClick={() => setEditingCourse(false)} className="btn-outline text-sm">Bekor</button>
            </div>
          </div>
        ) : (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            <p className="text-gray-500 mt-1">{course.description}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span>📚 {topics.length} mavzu</span>
              <span>👥 {studentCount.toLocaleString()} o'quvchi</span>
              <span className={course.isPremium ? "text-yellow-600 font-medium" : "text-green-600 font-medium"}>
                {course.isPremium ? "Premium" : "Bepul"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => { const v = !course.isPremium; await updateCourse(courseId!, { isPremium: v }); setCourse((p) => p ? { ...p, isPremium: v } : p); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${course.isPremium ? "border-green-200 text-green-700 hover:bg-green-50" : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"}`}
            >
              {course.isPremium ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {course.isPremium ? "Free qilish" : "Premium qilish"}
            </button>
            <button onClick={() => setEditingCourse(true)} className="btn-outline flex items-center gap-2 text-sm">
              <Edit className="w-4 h-4" />
              Tahrirlash
            </button>
            <button
              onClick={async () => {
                if (confirm("Kursni o'chirishga ishonchingiz komilmi?")) {
                  await deleteCourse(courseId!);
                  navigate("/courses");
                }
              }}
              className="btn-outline flex items-center gap-2 text-sm text-danger border-red-200 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
              O'chirish
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Kursni tanishtirish bo'limi */}
      <CourseIntroSection
        course={course}
        onUpdate={(updated) => setCourse(updated)}
      />

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button onClick={() => setShowTopicModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Yangi mavzu qo'shish
        </button>
        <button
          onClick={() => setShowImportTestModal(true)}
          className="btn-outline flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Test qo'shish
        </button>
        <button
          onClick={() => setShowAdviceModal(true)}
          className="btn-outline flex items-center gap-2 text-sm border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          <MessageSquare className="w-4 h-4" />
          Maslahat qo'shish
        </button>
      </div>

      {/* Mavzular va Testlar — drag and drop */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">
            Mavzular va Testlar ({items.length})
          </h3>
          <div className="flex items-center gap-3">
            {orderChanged && (
              <button
                onClick={handleSaveOrder}
                disabled={savingOrder}
                className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {savingOrder ? "Saqlanmoqda..." : "O'zgarishlarni saqlash"}
              </button>
            )}
            <p className="text-xs text-gray-400">Tartibni o'zgartirish uchun sudrab tashlang</p>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {items.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">📚</p>
              <p>Hali mavzu yoki test qo'shilmagan</p>
            </div>
          )}
          {items.map((item, index) => (
            <div
              key={`${item.type}-${item.type === "topic" ? (item.data as Topic).id : item.type === "test" ? (item.data as Test).id : (item.data as Advice).id}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              className={`flex items-center justify-between p-4 transition-all cursor-grab active:cursor-grabbing ${
                dragOverIndex === index ? "bg-primary-50 border-l-4 border-l-primary-400" : "hover:bg-gray-50"
              } ${dragIndex === index ? "opacity-40" : ""}`}
            >
              {item.type === "topic" ? (
                <TopicRow topic={item.data as Topic} courseId={courseId!} onUpdate={() => loadData(courseId!)} />
              ) : item.type === "test" ? (
                <TestRow test={item.data as Test} courseId={courseId!} onUpdate={() => loadData(courseId!)} />
              ) : (
                <AdviceRow advice={item.data as Advice} courseId={courseId!} onUpdate={() => loadData(courseId!)} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Create topic modal */}
      <CreateTopicModal
        open={showTopicModal}
        courseId={courseId!}
        existingCount={topics.length}
        onClose={() => setShowTopicModal(false)}
        onCreated={() => loadData(courseId!)}
      />

      {/* Import test modal */}
      <ImportTestModal
        open={showImportTestModal}
        courseId={courseId!}
        existingTestIds={tests.map((t) => t.id)}
        onClose={() => setShowImportTestModal(false)}
        onImported={() => loadData(courseId!)}
      />

      {/* Create advice modal */}
      <CreateAdviceModal
        open={showAdviceModal}
        courseId={courseId!}
        topics={topics}
        onClose={() => setShowAdviceModal(false)}
        onCreated={() => loadData(courseId!)}
      />
    </div>
  );
}

// ===== Topic Row =====
function TopicRow({ topic, courseId, onUpdate }: { topic: Topic; courseId: string; onUpdate: () => void }) {
  return (
    <>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0">
          {topic.order}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{topic.title}</h4>
            {topic.isPremium && <Lock className="w-3.5 h-3.5 text-yellow-500" />}
          </div>
          <p className="text-sm text-gray-500 truncate">{topic.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-2">
        <button
          onClick={async (e) => {
            e.stopPropagation();
            const v = !topic.isPremium;
            await updateTopic(courseId, topic.id, { isPremium: v });
            onUpdate();
          }}
          className={`text-[10px] font-medium px-2 py-1 rounded border ${topic.isPremium ? "border-yellow-200 text-yellow-600 bg-yellow-50 hover:bg-yellow-100" : "border-green-200 text-green-600 bg-green-50 hover:bg-green-100"}`}
          title={topic.isPremium ? "Bosib Free qilish" : "Bosib Premium qilish"}
        >
          {topic.isPremium ? "Premium" : "Free"}
        </button>
        <span className="text-[10px] font-medium px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200">
          Mavzu
        </span>
        <Link
          to={`/courses/${courseId}/topics/${topic.id}`}
          className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded"
          title="Ko'rish"
          onClick={(e) => e.stopPropagation()}
        >
          <Eye className="w-4 h-4" />
        </Link>
        <Link
          to={`/courses/${courseId}/topics/${topic.id}`}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
          title="Tahrirlash"
          onClick={(e) => e.stopPropagation()}
        >
          <Edit className="w-4 h-4" />
        </Link>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!confirm(`"${topic.title}" mavzusini o'chirishga ishonchingiz komilmi?`)) return;
            await deleteTopic(courseId, topic.id);
            onUpdate();
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          title="O'chirish"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

// ===== Test Row =====
function TestRow({ test, courseId, onUpdate }: { test: Test; courseId: string; onUpdate: () => void }) {
  return (
    <>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <FileText className="w-5 h-5 text-orange-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-gray-900">{test.title}</h4>
          <p className="text-sm text-gray-500">
            {test.questions?.length || 0} savol · {test.totalTime} daqiqa
          </p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-2">
        <button
          onClick={async (e) => {
            e.stopPropagation();
            const isPremium = !test.isPremium;
            await updateTest(courseId, test.id, { isPremium } as any);
            onUpdate();
          }}
          className={`text-[10px] font-medium px-2 py-1 rounded border ${test.isPremium ? "border-yellow-200 text-yellow-600 bg-yellow-50 hover:bg-yellow-100" : "border-green-200 text-green-600 bg-green-50 hover:bg-green-100"}`}
          title={test.isPremium ? "Bosib Free qilish" : "Bosib Premium qilish"}
        >
          {test.isPremium ? "Premium" : "Free"}
        </button>
        <span className={`text-[10px] px-2 py-1 rounded-full font-medium ${
          test.status === "published" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
        }`}>
          {test.status === "published" ? "Chop etilgan" : "Qoralama"}
        </span>
        <span className="text-[10px] font-medium px-2 py-1 rounded bg-orange-50 text-orange-600 border border-orange-200">
          Test
        </span>
        <Link
          to={`/courses/${courseId}/tests/${test.id}/preview`}
          className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded"
          title="Ko'rish"
          onClick={(e) => e.stopPropagation()}
        >
          <Eye className="w-4 h-4" />
        </Link>
        <Link
          to={`/courses/${courseId}/tests/${test.id}/preview`}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
          title="Tahrirlash"
          onClick={(e) => e.stopPropagation()}
        >
          <Edit className="w-4 h-4" />
        </Link>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!confirm(`"${test.title}" testini o'chirishga ishonchingiz komilmi?`)) return;
            await deleteTest(courseId, test.id);
            onUpdate();
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          title="O'chirish"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}

// ===== Advice Row =====
function AdviceRow({ advice, courseId, onUpdate }: { advice: Advice; courseId: string; onUpdate: () => void }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(advice.text);
  const [editTitle, setEditTitle] = useState(advice.title);

  async function handleSave() {
    await updateAdvice(courseId, advice.id, { title: editTitle, text: editText });
    setEditing(false);
    onUpdate();
  }

  if (editing) {
    return (
      <div className="flex-1 space-y-2" onClick={(e) => e.stopPropagation()}>
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={3}
          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div className="flex gap-2">
          <button onClick={handleSave} className="btn-primary text-xs px-3 py-1.5">Saqlash</button>
          <button onClick={() => setEditing(false)} className="btn-outline text-xs px-3 py-1.5">Bekor</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
          <MessageSquare className="w-5 h-5 text-blue-500" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="font-medium text-gray-900">{advice.title}</h4>
          <p className="text-sm text-gray-500 truncate">{advice.text}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-2">
        <span className="text-[10px] font-medium px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200">
          Maslahat
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
          title="Tahrirlash"
        >
          <Edit className="w-4 h-4" />
        </button>
        <button
          onClick={async (e) => {
            e.stopPropagation();
            if (!confirm(`"${advice.title}" maslahatini o'chirishga ishonchingiz komilmi?`)) return;
            await deleteAdvice(courseId, advice.id);
            onUpdate();
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          title="O'chirish"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </>
  );
}
