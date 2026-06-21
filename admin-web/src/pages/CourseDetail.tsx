import { useParams, Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { Plus, Edit, Trash2, Lock, Unlock, ChevronRight, ChevronDown, Loader2, GripVertical, FileText, Eye, EyeOff, MessageSquare, ExternalLink, Upload, Share2, Folder as FolderIcon, FolderPlus } from "lucide-react";
import { getCourseById, getTopicsByCourse, getTestsByCourse, deleteCourse, updateCourse, updateTopic, updateTest, deleteTopic, deleteTest, getAdviceByCourse, updateAdvice, deleteAdvice, getCourseSocialLinks, createCourseSocialLink, updateCourseSocialLink, deleteCourseSocialLink, getFoldersByCourse, deleteFolder, updateFolder } from "@shared/repositories";
import { getStudentCountByCourse } from "@shared/repositories";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@shared/firebase";
import type { Course, Topic, Test, Advice, SocialLink, SocialPlatform, Folder } from "@shared/types";
import CreateTopicModal from "../components/CreateTopicModal";
import ImportTestModal from "../components/ImportTestModal";
import LoadingButton from "../components/LoadingButton";
import CourseIntroSection from "../components/CourseIntroSection";
import CreateAdviceModal from "../components/CreateAdviceModal";
import CreateFolderModal from "../components/CreateFolderModal";

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
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showImportTestModal, setShowImportTestModal] = useState(false);
  const [showAdviceModal, setShowAdviceModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [editFolder, setEditFolder] = useState<Folder | null>(null);
  // Modallar qaysi papkaga element qo'shayotganini belgilash (null = papkasiz)
  const [targetFolderId, setTargetFolderId] = useState<string | undefined>(undefined);
  const [editingCourse, setEditingCourse] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  // Drag and drop
  const [items, setItems] = useState<ListItem[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null); // "loose" yoki folder.id
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

  // Element qaysi papkaga tegishli ekanini aniqlash
  function getItemFolderId(item: ListItem): string | undefined {
    return (item.data as Topic | Test | Advice).folderId;
  }

  async function loadData(id: string) {
    try {
      const [c, t, te, sc, adv, slinks, fdrs] = await Promise.all([
        getCourseById(id),
        getTopicsByCourse(id),
        getTestsByCourse(id),
        getStudentCountByCourse(id),
        getAdviceByCourse(id),
        getCourseSocialLinks(id),
        getFoldersByCourse(id),
      ]);
      setCourse(c);
      setTopics(t);
      setTests(te);
      setStudentCount(sc);
      setAdvices(adv);
      setSocialLinks(slinks);
      setFolders(fdrs);
      if (c) { setEditTitle(c.title); setEditDesc(c.description); }
    } catch (err) {
      console.error("Xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  // ===== DRAG AND DROP =====
  // dragId — sudralayotgan element id si
  // dragOverId — ustiga kelingan element id si (shu elementdan oldin joylashadi)
  // dragOverFolderId — ustiga kelingan papka ("loose" = papkasiz zona)

  function handleDragStart(itemId: string) {
    setDragId(itemId);
  }

  function handleDragEnd() {
    setDragId(null);
    setDragOverId(null);
    setDragOverFolderId(null);
  }

  // Element ustiga sudralganda
  function handleItemDragOver(e: React.DragEvent, itemId: string, folderId: string | null) {
    e.preventDefault();
    e.stopPropagation();
    setDragOverId(itemId);
    setDragOverFolderId(folderId);
  }

  // Papka zonasi ustiga sudralganda (elementlar orasida emas)
  function handleZoneDragOver(e: React.DragEvent, folderId: string | null) {
    e.preventDefault();
    setDragOverId(null);
    setDragOverFolderId(folderId);
  }

  // Elementning folderId sini olish (state ichidagi qiymat)
  function itemFolderKey(item: ListItem): string {
    return getItemFolderId(item) || "loose";
  }

  // Tashlanganda — itemlarni qayta tartiblash va kerak bo'lsa papka almashtirish
  function handleDropOnTarget(targetFolderId: string | null) {
    if (!dragId) return;

    const dragged = items.find((it) => it.data.id === dragId);
    if (!dragged) { handleDragEnd(); return; }

    const destFolderKey = targetFolderId || "loose";

    // Yangi ro'yxat tuzamiz
    const without = items.filter((it) => it.data.id !== dragId);

    // Tashlanган joyni aniqlash
    let insertIndex: number;
    if (dragOverId && dragOverId !== dragId) {
      insertIndex = without.findIndex((it) => it.data.id === dragOverId);
      if (insertIndex < 0) insertIndex = without.length;
    } else {
      // Zonaga tashlandi — shu papkadagi oxirgi elementdan keyin
      const lastInFolder = without.map((it, i) => ({ it, i })).filter(({ it }) => itemFolderKey(it) === destFolderKey).pop();
      insertIndex = lastInFolder ? lastInFolder.i + 1 : without.length;
    }

    // Sudralgan elementning folderId sini yangilash
    const newFolderId = targetFolderId || undefined;
    const updatedDragged: ListItem = {
      ...dragged,
      data: { ...dragged.data, folderId: newFolderId } as any,
    } as ListItem;

    const newItems = [...without];
    newItems.splice(insertIndex, 0, updatedDragged);

    setItems(newItems);
    setOrderChanged(true);
    handleDragEnd();
  }

  async function handleSaveOrder() {
    if (!courseId) return;
    setSavingOrder(true);

    // Global tartib bo'yicha topic order va afterTopicOrder ni qayta hisoblaymiz
    let topicOrder = 1;
    let lastTopicOrder = 0;

    for (const item of items) {
      const folderId = getItemFolderId(item);
      if (item.type === "topic") {
        const topic = item.data as Topic;
        await updateTopic(courseId, topic.id, { order: topicOrder, folderId: folderId ?? undefined });
        lastTopicOrder = topicOrder;
        topicOrder++;
      } else if (item.type === "test") {
        const test = item.data as Test;
        await updateTest(courseId, test.id, { afterTopicOrder: lastTopicOrder, folderId: folderId ?? undefined });
      } else if (item.type === "advice") {
        const advice = item.data as Advice;
        await updateAdvice(courseId, advice.id, { afterTopicOrder: lastTopicOrder, folderId: folderId ?? undefined });
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
              <LoadingButton onClick={async () => { await updateCourse(courseId!, { title: editTitle, description: editDesc }); setCourse((p) => p ? { ...p, title: editTitle, description: editDesc } : p); setEditingCourse(false); }} className="btn-primary text-sm">Saqlash</LoadingButton>
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
            <LoadingButton
              onClick={async () => { const v = !course.isPremium; await updateCourse(courseId!, { isPremium: v }); setCourse((p) => p ? { ...p, isPremium: v } : p); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${course.isPremium ? "border-green-200 text-green-700 hover:bg-green-50" : "border-yellow-200 text-yellow-700 hover:bg-yellow-50"}`}
            >
              {course.isPremium ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              {course.isPremium ? "Free qilish" : "Premium qilish"}
            </LoadingButton>
            <LoadingButton
              onClick={async () => { const v = !course.isHidden; await updateCourse(courseId!, { isHidden: v }); setCourse((p) => p ? { ...p, isHidden: v } : p); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border ${course.isHidden ? "border-orange-200 text-orange-700 hover:bg-orange-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}
              title={course.isHidden ? "Studentda ko'rinmaydi" : "Studentda ko'rinadi"}
            >
              {course.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              {course.isHidden ? "Yashirin" : "Ko'rinadi"}
            </LoadingButton>
            <button onClick={() => setEditingCourse(true)} className="btn-outline flex items-center gap-2 text-sm">
              <Edit className="w-4 h-4" />
              Tahrirlash
            </button>
            <LoadingButton
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
            </LoadingButton>
          </div>
        </div>
        )}
      </div>

      {/* Kursni tanishtirish bo'limi */}
      <CourseIntroSection
        course={course}
        onUpdate={(updated) => setCourse(updated)}
      />

      {/* Kurs ijtimoiy tarmoqlari */}
      <CourseSocialLinksSection
        courseId={courseId!}
        links={socialLinks}
        onUpdate={() => loadData(courseId!)}
      />

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => { setEditFolder(null); setShowFolderModal(true); }}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <FolderPlus className="w-4 h-4" />
          Yangi papka qo'shish
        </button>
        <button onClick={() => { setTargetFolderId(undefined); setShowTopicModal(true); }} className="btn-outline flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" />
          Mavzu qo'shish
        </button>
        <button
          onClick={() => { setTargetFolderId(undefined); setShowImportTestModal(true); }}
          className="btn-outline flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Test qo'shish
        </button>
        <button
          onClick={() => { setTargetFolderId(undefined); setShowAdviceModal(true); }}
          className="btn-outline flex items-center gap-2 text-sm border-blue-200 text-blue-600 hover:bg-blue-50"
        >
          <MessageSquare className="w-4 h-4" />
          Maslahat qo'shish
        </button>
        {orderChanged && (
          <LoadingButton
            onClick={handleSaveOrder}
            loading={savingOrder}
            className="btn-primary flex items-center gap-2 text-sm ml-auto bg-green-600 hover:bg-green-700"
          >
            ✓ Tartibni saqlash
          </LoadingButton>
        )}
      </div>
      {orderChanged && (
        <p className="text-xs text-amber-600 -mt-2">Tartib o'zgartirildi — saqlash uchun "Tartibni saqlash" tugmasini bosing</p>
      )}

      {/* Papkalar va ularning ichidagi mavzu/testlar */}
      <div className="space-y-4">
        {folders.length === 0 && items.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm text-center py-12 text-gray-400">
            <p className="text-4xl mb-2">📚</p>
            <p>Hali papka, mavzu yoki test qo'shilmagan</p>
            <p className="text-xs mt-1">Avval "Yangi papka qo'shish" tugmasini bosing (masalan: IDC 1)</p>
          </div>
        )}

        {/* Har bir papka */}
        {folders.map((folder) => {
          const folderItems = items.filter((it) => getItemFolderId(it) === folder.id);
          return (
            <FolderSection
              key={folder.id}
              folder={folder}
              folderItems={folderItems}
              courseId={courseId!}
              onUpdate={() => loadData(courseId!)}
              onEditFolder={() => { setEditFolder(folder); setShowFolderModal(true); }}
              onAddTopic={() => { setTargetFolderId(folder.id); setShowTopicModal(true); }}
              onAddTest={() => { setTargetFolderId(folder.id); setShowImportTestModal(true); }}
              onAddAdvice={() => { setTargetFolderId(folder.id); setShowAdviceModal(true); }}
              allFolders={folders}
              dnd={{
                dragId,
                dragOverId,
                dragOverFolderId,
                onDragStart: handleDragStart,
                onDragEnd: handleDragEnd,
                onItemDragOver: handleItemDragOver,
                onZoneDragOver: handleZoneDragOver,
                onDrop: handleDropOnTarget,
              }}
            />
          );
        })}

        {/* Papkasiz mavzu/testlar */}
        {(() => {
          const looseItems = items.filter((it) => !getItemFolderId(it));
          const isDropZoneActive = dragOverFolderId === "loose";
          return (
            <div
              className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-colors ${isDropZoneActive ? "border-primary-400 ring-2 ring-primary-200" : "border-gray-100"}`}
              onDragOver={(e) => handleZoneDragOver(e, null)}
              onDrop={() => handleDropOnTarget(null)}
            >
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  📋 Papkasiz mavzu va testlar ({looseItems.length})
                </h3>
                <p className="text-xs text-gray-400">Papka ichiga sudrab tashlang</p>
              </div>
              <div className="divide-y divide-gray-50 min-h-[60px]">
                {looseItems.length === 0 && (
                  <div className="text-center py-6 text-gray-300 text-sm">
                    Bu yerga element tashlab papkadan chiqarishingiz mumkin
                  </div>
                )}
                {looseItems.map((item) => (
                  <div
                    key={`${item.type}-${item.data.id}`}
                    draggable
                    onDragStart={() => handleDragStart(item.data.id)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleItemDragOver(e, item.data.id, null)}
                    onDrop={(e) => { e.stopPropagation(); handleDropOnTarget(null); }}
                    className={`flex items-center justify-between p-4 transition-all cursor-grab active:cursor-grabbing ${
                      dragOverId === item.data.id ? "bg-primary-50 border-t-2 border-t-primary-400" : "hover:bg-gray-50"
                    } ${dragId === item.data.id ? "opacity-40" : ""}`}
                  >
                    {item.type === "topic" ? (
                      <TopicRow topic={item.data as Topic} courseId={courseId!} folders={folders} onUpdate={() => loadData(courseId!)} />
                    ) : item.type === "test" ? (
                      <TestRow test={item.data as Test} courseId={courseId!} folders={folders} onUpdate={() => loadData(courseId!)} />
                    ) : (
                      <AdviceRow advice={item.data as Advice} courseId={courseId!} folders={folders} onUpdate={() => loadData(courseId!)} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </div>

      {/* Create topic modal */}
      <CreateTopicModal
        open={showTopicModal}
        courseId={courseId!}
        existingCount={topics.length}
        folderId={targetFolderId}
        onClose={() => setShowTopicModal(false)}
        onCreated={() => loadData(courseId!)}
      />

      {/* Import test modal */}
      <ImportTestModal
        open={showImportTestModal}
        courseId={courseId!}
        existingTestIds={tests.map((t) => t.id)}
        folderId={targetFolderId}
        onClose={() => setShowImportTestModal(false)}
        onImported={() => loadData(courseId!)}
      />

      {/* Create advice modal */}
      <CreateAdviceModal
        open={showAdviceModal}
        courseId={courseId!}
        topics={topics}
        folderId={targetFolderId}
        onClose={() => setShowAdviceModal(false)}
        onCreated={() => loadData(courseId!)}
      />

      {/* Create/Edit folder modal */}
      <CreateFolderModal
        open={showFolderModal}
        courseId={courseId!}
        existingCount={folders.length}
        editFolder={editFolder}
        onClose={() => { setShowFolderModal(false); setEditFolder(null); }}
        onSaved={() => loadData(courseId!)}
      />
    </div>
  );
}

// ===== Topic Row =====
function TopicRow({ topic, courseId, folders, onUpdate }: { topic: Topic; courseId: string; folders?: Folder[]; onUpdate: () => void }) {
  const [editingOrder, setEditingOrder] = useState(false);
  const [orderValue, setOrderValue] = useState(String(topic.order));

  async function saveOrder() {
    const newOrder = parseInt(orderValue);
    setEditingOrder(false);
    if (isNaN(newOrder) || newOrder === topic.order) {
      setOrderValue(String(topic.order));
      return;
    }
    // topic.order ni yangilash + sarlavhadagi "N-mavzu:" prefiksini ham yangilash
    // folderId ni saqlab qolamiz (papka ichidan chiqib ketmasligi uchun)
    const newTitle = topic.title.replace(/^\d+-mavzu:/, `${newOrder}-mavzu:`);
    await updateTopic(courseId, topic.id, {
      order: newOrder,
      title: newTitle,
      ...(topic.folderId ? { folderId: topic.folderId } : {}),
    });
    onUpdate();
  }

  return (
    <>
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
        {editingOrder ? (
          <input
            type="number"
            value={orderValue}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setOrderValue(e.target.value)}
            onBlur={saveOrder}
            onKeyDown={(e) => {
              if (e.key === "Enter") saveOrder();
              if (e.key === "Escape") { setEditingOrder(false); setOrderValue(String(topic.order)); }
            }}
            className="w-10 h-10 bg-white border-2 border-primary-400 rounded-lg text-center text-primary-600 font-bold text-sm flex-shrink-0 focus:outline-none"
          />
        ) : (
          <button
            onClick={(e) => { e.stopPropagation(); setOrderValue(String(topic.order)); setEditingOrder(true); }}
            title="Raqamni o'zgartirish"
            className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center text-primary-600 font-bold text-sm flex-shrink-0 hover:bg-primary-100 hover:ring-2 hover:ring-primary-200 transition-all"
          >
            {topic.order}
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900">{topic.title}</h4>
            {topic.isPremium && <Lock className="w-3.5 h-3.5 text-yellow-500" />}
          </div>
          <p className="text-sm text-gray-500 truncate">{topic.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 ml-2">
        {folders && <MoveToFolderMenu courseId={courseId} folders={folders} currentFolderId={topic.folderId} itemType="topic" itemId={topic.id} onUpdate={onUpdate} />}
        <LoadingButton
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
        </LoadingButton>
        <LoadingButton
          onClick={async (e) => {
            e.stopPropagation();
            await updateTopic(courseId, topic.id, { isHidden: !topic.isHidden });
            onUpdate();
          }}
          className={`text-[10px] font-medium px-2 py-1 rounded border flex items-center gap-0.5 ${topic.isHidden ? "border-orange-200 text-orange-600 bg-orange-50" : "border-gray-200 text-gray-500 bg-gray-50 hover:bg-gray-100"}`}
          title={topic.isHidden ? "Yashirin — ko'rsatish" : "Yashirish"}
        >
          {topic.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
        </LoadingButton>
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
        <LoadingButton
          onClick={async (e) => {
            e.stopPropagation();
            if (!confirm(`"${topic.title}" mavzusini o'chirishga ishonchingiz komilmi?`)) return;
            await deleteTopic(courseId, topic.id);
            onUpdate();
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          title="O'chirish"
          iconOnly
        >
          <Trash2 className="w-4 h-4" />
        </LoadingButton>
      </div>
    </>
  );
}

// ===== Test Row =====
function TestRow({ test, courseId, folders, onUpdate }: { test: Test; courseId: string; folders?: Folder[]; onUpdate: () => void }) {
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
        {folders && <MoveToFolderMenu courseId={courseId} folders={folders} currentFolderId={test.folderId} itemType="test" itemId={test.id} onUpdate={onUpdate} />}
        <LoadingButton
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
        </LoadingButton>
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
        <LoadingButton
          onClick={async (e) => {
            e.stopPropagation();
            if (!confirm(`"${test.title}" testini o'chirishga ishonchingiz komilmi?`)) return;
            await deleteTest(courseId, test.id);
            onUpdate();
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          title="O'chirish"
          iconOnly
        >
          <Trash2 className="w-4 h-4" />
        </LoadingButton>
      </div>
    </>
  );
}

// ===== Advice Row =====
function AdviceRow({ advice, courseId, folders, onUpdate }: { advice: Advice; courseId: string; folders?: Folder[]; onUpdate: () => void }) {
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
          <LoadingButton onClick={handleSave} className="btn-primary text-xs px-3 py-1.5">Saqlash</LoadingButton>
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
        {folders && <MoveToFolderMenu courseId={courseId} folders={folders} currentFolderId={advice.folderId} itemType="advice" itemId={advice.id} onUpdate={onUpdate} />}
        <span className="text-[10px] font-medium px-2 py-1 rounded bg-blue-50 text-blue-600 border border-blue-200">
          Maslahat
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all active:scale-95"
          title="Tahrirlash"
        >
          <Edit className="w-4 h-4" />
        </button>
        <LoadingButton
          onClick={async (e) => {
            e.stopPropagation();
            if (!confirm(`"${advice.title}" maslahatini o'chirishga ishonchingiz komilmi?`)) return;
            await deleteAdvice(courseId, advice.id);
            onUpdate();
          }}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
          title="O'chirish"
          iconOnly
        >
          <Trash2 className="w-4 h-4" />
        </LoadingButton>
      </div>
    </>
  );
}

// ===== Kurs Ijtimoiy Tarmoqlari =====
const PLATFORMS: { value: SocialPlatform; label: string; color: string; icon: string }[] = [
  { value: "telegram", label: "Telegram", color: "#0088cc", icon: "✈️" },
  { value: "instagram", label: "Instagram", color: "#E4405F", icon: "📸" },
  { value: "youtube", label: "YouTube", color: "#FF0000", icon: "▶️" },
  { value: "facebook", label: "Facebook", color: "#1877F2", icon: "📘" },
  { value: "tiktok", label: "TikTok", color: "#000000", icon: "🎵" },
  { value: "twitter", label: "Twitter / X", color: "#1DA1F2", icon: "🐦" },
  { value: "linkedin", label: "LinkedIn", color: "#0A66C2", icon: "💼" },
  { value: "website", label: "Veb-sayt", color: "#6B7280", icon: "🌐" },
];

function getPlatformInfo(platform: SocialPlatform) {
  return PLATFORMS.find((p) => p.value === platform) || PLATFORMS[7];
}

function CourseSocialLinksSection({ courseId, links, onUpdate }: { courseId: string; links: SocialLink[]; onUpdate: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [newPlatform, setNewPlatform] = useState<SocialPlatform>("telegram");
  const [newLabel, setNewLabel] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newIconFile, setNewIconFile] = useState<File | null>(null);
  const [newIconPreview, setNewIconPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editUrl, setEditUrl] = useState("");

  async function handleAdd() {
    if (!newUrl.trim()) return;
    setSaving(true);
    const now = Date.now();
    const platformInfo = getPlatformInfo(newPlatform);

    let iconUrl = "";
    if (newIconFile) {
      try {
        const storageRef = ref(storage, `course-social-icons/${courseId}/${now}-${newIconFile.name}`);
        await uploadBytes(storageRef, newIconFile);
        iconUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("Ikonka yuklashda xatolik:", err);
      }
    }

    const link: SocialLink = {
      id: `csocial-${now}`,
      platform: newPlatform,
      label: newLabel.trim() || platformInfo.label,
      url: newUrl.trim(),
      ...(iconUrl ? { iconUrl } : {}),
      isActive: true,
      order: links.length + 1,
      createdAt: now,
      updatedAt: now,
    };

    try {
      await createCourseSocialLink(courseId, link);
      setShowForm(false);
      setNewPlatform("telegram");
      setNewLabel("");
      setNewUrl("");
      setNewIconFile(null);
      setNewIconPreview("");
      onUpdate();
    } catch (err) {
      console.error("Qo'shishda xatolik:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(linkId: string) {
    if (!confirm("Bu ijtimoiy tarmoq havolasini o'chirishga ishonchingiz komilmi?")) return;
    await deleteCourseSocialLink(courseId, linkId);
    onUpdate();
  }

  async function handleToggleActive(linkId: string, current: boolean) {
    await updateCourseSocialLink(courseId, linkId, { isActive: !current });
    onUpdate();
  }

  async function handleSaveEdit(linkId: string) {
    if (!editUrl.trim()) return;
    await updateCourseSocialLink(courseId, linkId, { label: editLabel.trim(), url: editUrl.trim() });
    setEditingId(null);
    onUpdate();
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="p-5 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
            <Share2 className="w-4.5 h-4.5 text-purple-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Kurs ijtimoiy tarmoqlari</h3>
            <p className="text-xs text-gray-500">Bu kursga tegishli ijtimoiy tarmoq havolalari</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn-outline flex items-center gap-1.5 text-sm text-purple-600 border-purple-200 hover:bg-purple-50"
        >
          <Plus className="w-4 h-4" /> Qo'shish
        </button>
      </div>

      {/* Qo'shish formasi */}
      {showForm && (
        <div className="p-5 border-b border-gray-100 bg-purple-50/30 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platforma</label>
              <select
                value={newPlatform}
                onChange={(e) => {
                  setNewPlatform(e.target.value as SocialPlatform);
                  const info = PLATFORMS.find((p) => p.value === e.target.value);
                  if (info && !newLabel) setNewLabel(info.label);
                }}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>{p.icon} {p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder={getPlatformInfo(newPlatform).label}
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
              <input
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://t.me/kurs_kanal"
                className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          {/* Tez tanlash */}
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => { setNewPlatform(p.value); if (!newLabel) setNewLabel(p.label); }}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  newPlatform === p.value
                    ? "border-purple-300 bg-purple-100 text-purple-700"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>

          {/* Ikonka upload */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 cursor-pointer hover:bg-gray-50">
              <Upload className="w-3.5 h-3.5" />
              {newIconFile ? newIconFile.name : "Maxsus ikonka (ixtiyoriy)"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setNewIconFile(file);
                    setNewIconPreview(URL.createObjectURL(file));
                  }
                }}
              />
            </label>
            {newIconPreview && (
              <div className="flex items-center gap-2">
                <img src={newIconPreview} alt="" className="w-7 h-7 rounded-lg object-cover border" />
                <button type="button" onClick={() => { setNewIconFile(null); setNewIconPreview(""); }} className="text-xs text-red-500">✕</button>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <LoadingButton onClick={handleAdd} disabled={!newUrl.trim()} className="btn-primary text-sm">
              Qo'shish
            </LoadingButton>
            <button onClick={() => { setShowForm(false); setNewUrl(""); setNewLabel(""); }} className="btn-outline text-sm">
              Bekor
            </button>
          </div>
        </div>
      )}

      {/* Havolalar ro'yxati */}
      {links.length === 0 && !showForm ? (
        <div className="text-center py-8 text-gray-400">
          <p className="text-3xl mb-2">🌐</p>
          <p className="text-sm">Hali kurs ijtimoiy tarmoqlari qo'shilmagan</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {links.map((link) => {
            const info = getPlatformInfo(link.platform);

            if (editingId === link.id) {
              return (
                <div key={link.id} className="p-4 bg-purple-50/50 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={editLabel}
                      onChange={(e) => setEditLabel(e.target.value)}
                      placeholder="Nom"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                    <input
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      placeholder="URL"
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
                    />
                  </div>
                  <div className="flex gap-2">
                    <LoadingButton onClick={() => handleSaveEdit(link.id)} className="btn-primary text-xs px-3 py-1.5">Saqlash</LoadingButton>
                    <button onClick={() => setEditingId(null)} className="btn-outline text-xs px-3 py-1.5">Bekor</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={link.id} className={`flex items-center p-4 gap-3 ${!link.isActive ? "opacity-50" : ""}`}>
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-base overflow-hidden"
                  style={{ backgroundColor: link.iconUrl ? "transparent" : info.color + "15" }}
                >
                  {link.iconUrl ? (
                    <img src={link.iconUrl} alt="" className="w-9 h-9 object-cover rounded-full" />
                  ) : (
                    info.icon
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-gray-900 text-sm">{link.label}</h4>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: info.color + "15", color: info.color }}>
                      {info.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{link.url}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <LoadingButton
                    onClick={() => handleToggleActive(link.id, link.isActive)}
                    className={`text-[10px] font-medium px-2 py-1 rounded border ${
                      link.isActive ? "border-green-200 text-green-600 bg-green-50" : "border-gray-200 text-gray-500 bg-gray-50"
                    }`}
                  >
                    {link.isActive ? "Faol" : "O'chiq"}
                  </LoadingButton>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => { setEditingId(link.id); setEditLabel(link.label); setEditUrl(link.url); }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all active:scale-95"
                  >
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <LoadingButton
                    onClick={() => handleDelete(link.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    iconOnly
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </LoadingButton>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


// ===== Papka bo'limi (ichida mavzu/test/maslahatlar) =====
interface FolderDnd {
  dragId: string | null;
  dragOverId: string | null;
  dragOverFolderId: string | null;
  onDragStart: (itemId: string) => void;
  onDragEnd: () => void;
  onItemDragOver: (e: React.DragEvent, itemId: string, folderId: string | null) => void;
  onZoneDragOver: (e: React.DragEvent, folderId: string | null) => void;
  onDrop: (targetFolderId: string | null) => void;
}

function FolderSection({
  folder,
  folderItems,
  courseId,
  onUpdate,
  onEditFolder,
  onAddTopic,
  onAddTest,
  onAddAdvice,
  allFolders,
  dnd,
}: {
  folder: Folder;
  folderItems: ListItem[];
  courseId: string;
  onUpdate: () => void;
  onEditFolder: () => void;
  onAddTopic: () => void;
  onAddTest: () => void;
  onAddAdvice: () => void;
  allFolders: Folder[];
  dnd: FolderDnd;
}) {
  const [expanded, setExpanded] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);

  const isDropZoneActive = dnd.dragOverFolderId === folder.id;

  async function handleDeleteFolder() {
    if (!confirm(`"${folder.title}" papkasini o'chirmoqchimisiz?\n\n⚠️ DIQQAT: Papka ichidagi barcha mavzu, test va maslahatlar ham o'chiriladi!`)) return;
    await deleteFolder(courseId, folder.id);
    onUpdate();
  }

  async function handleToggleFolderPremium() {
    await updateFolder(courseId, folder.id, { isPremium: !folder.isPremium });
    onUpdate();
  }

  return (
    <div
      className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-colors ${isDropZoneActive ? "border-primary-400 ring-2 ring-primary-200" : "border-gray-200"}`}
      onDragOver={(e) => dnd.onZoneDragOver(e, folder.id)}
      onDrop={() => dnd.onDrop(folder.id)}
    >
      {/* Papka sarlavhasi */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-primary-50 to-transparent border-b border-gray-100">
        <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-xl border border-gray-100 shrink-0 overflow-hidden">
          {folder.coverImage ? (
            <img src={folder.coverImage} alt="" className="w-full h-full object-cover" />
          ) : (
            folder.icon || "📚"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-gray-900">{folder.title}</h3>
            {folder.isPremium && <Lock className="w-3.5 h-3.5 text-yellow-500" />}
            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">{folderItems.length} element</span>
          </div>
          {folder.description && <p className="text-xs text-gray-500 truncate mt-0.5">{folder.description}</p>}
        </div>

        {/* Papka amallari */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="relative">
            <button
              onClick={() => setShowAddMenu(!showAddMenu)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100"
            >
              <Plus className="w-3.5 h-3.5" /> Qo'shish
            </button>
            {showAddMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowAddMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44">
                  <button onClick={() => { setShowAddMenu(false); onAddTopic(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                    📖 Mavzu qo'shish
                  </button>
                  <button onClick={() => { setShowAddMenu(false); onAddTest(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                    📝 Test qo'shish
                  </button>
                  <button onClick={() => { setShowAddMenu(false); onAddAdvice(); }} className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                    💡 Maslahat qo'shish
                  </button>
                </div>
              </>
            )}
          </div>
          <LoadingButton
            onClick={handleToggleFolderPremium}
            className={`text-[10px] font-medium px-2 py-1.5 rounded border ${folder.isPremium ? "border-yellow-200 text-yellow-600 bg-yellow-50" : "border-green-200 text-green-600 bg-green-50"}`}
          >
            {folder.isPremium ? "Premium" : "Free"}
          </LoadingButton>
          <LoadingButton
            onClick={async () => { await updateFolder(courseId, folder.id, { isHidden: !folder.isHidden }); onUpdate(); }}
            className={`text-[10px] font-medium px-2 py-1.5 rounded border flex items-center gap-1 ${folder.isHidden ? "border-orange-200 text-orange-600 bg-orange-50" : "border-gray-200 text-gray-500 bg-gray-50"}`}
            title={folder.isHidden ? "Yashirin — studentda ko'rinmaydi" : "Ko'rinadi"}
          >
            {folder.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {folder.isHidden ? "Yashirin" : "Ko'rinadi"}
          </LoadingButton>
          <button onClick={onEditFolder} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all active:scale-95" title="Papkani tahrirlash">
            <Edit className="w-4 h-4" />
          </button>
          <LoadingButton onClick={handleDeleteFolder} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded" title="Papkani o'chirish" iconOnly>
            <Trash2 className="w-4 h-4" />
          </LoadingButton>
        </div>
      </div>

      {/* Papka ichidagi elementlar */}
      {expanded && (
        <div className="divide-y divide-gray-50 min-h-[50px]">
          {folderItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <p>Bu papka bo'sh</p>
              <p className="text-xs mt-1">"Qo'shish" tugmasi orqali yoki elementni shu yerga sudrab tashlang</p>
            </div>
          ) : (
            folderItems.map((item) => (
              <div
                key={`${item.type}-${item.data.id}`}
                draggable
                onDragStart={(e) => { e.stopPropagation(); dnd.onDragStart(item.data.id); }}
                onDragEnd={dnd.onDragEnd}
                onDragOver={(e) => dnd.onItemDragOver(e, item.data.id, folder.id)}
                onDrop={(e) => { e.stopPropagation(); dnd.onDrop(folder.id); }}
                className={`flex items-center justify-between p-4 pl-6 transition-all cursor-grab active:cursor-grabbing ${
                  dnd.dragOverId === item.data.id ? "bg-primary-50 border-t-2 border-t-primary-400" : "hover:bg-gray-50"
                } ${dnd.dragId === item.data.id ? "opacity-40" : ""}`}
              >
                {item.type === "topic" ? (
                  <TopicRow topic={item.data as Topic} courseId={courseId} folders={allFolders} onUpdate={onUpdate} />
                ) : item.type === "test" ? (
                  <TestRow test={item.data as Test} courseId={courseId} folders={allFolders} onUpdate={onUpdate} />
                ) : (
                  <AdviceRow advice={item.data as Advice} courseId={courseId} folders={allFolders} onUpdate={onUpdate} />
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ===== Papkaga ko'chirish menyusi =====
function MoveToFolderMenu({
  courseId,
  folders,
  currentFolderId,
  itemType,
  itemId,
  onUpdate,
}: {
  courseId: string;
  folders: Folder[];
  currentFolderId?: string;
  itemType: "topic" | "test" | "advice";
  itemId: string;
  onUpdate: () => void;
}) {
  const [open, setOpen] = useState(false);

  async function moveTo(folderId: string | undefined) {
    setOpen(false);
    const data = folderId ? { folderId } : { folderId: undefined };
    try {
      if (itemType === "topic") await updateTopic(courseId, itemId, data as Partial<Topic>);
      else if (itemType === "test") await updateTest(courseId, itemId, data as Partial<Test>);
      else if (itemType === "advice") await updateAdvice(courseId, itemId, data as Partial<Advice>);
      onUpdate();
    } catch (err) {
      console.error("Ko'chirishda xatolik:", err);
    }
  }

  if (folders.length === 0) return null;

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        className="p-1.5 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded"
        title="Papkaga ko'chirish"
      >
        <FolderIcon className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-48 max-h-60 overflow-y-auto">
            <p className="px-3 py-1.5 text-[10px] text-gray-400 uppercase font-medium">Papkaga ko'chirish</p>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={(e) => { e.stopPropagation(); moveTo(f.id); }}
                disabled={f.id === currentFolderId}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 ${f.id === currentFolderId ? "opacity-40 cursor-default" : ""}`}
              >
                <span>{f.icon || "📚"}</span> {f.title}
                {f.id === currentFolderId && <span className="ml-auto text-[10px] text-primary-500">✓</span>}
              </button>
            ))}
            {currentFolderId && (
              <button
                onClick={(e) => { e.stopPropagation(); moveTo(undefined); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 text-gray-500"
              >
                📤 Papkadan chiqarish
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
