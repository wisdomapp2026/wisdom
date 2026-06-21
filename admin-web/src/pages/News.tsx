import { useState, useEffect } from "react";
import { MessageCircle, Send, Loader2, Check, User, X, Megaphone } from "lucide-react";
import { getAllMessages, markMessageAsRead, sendMessage } from "@shared/repositories";
import { setDoc, doc } from "firebase/firestore";
import { db } from "@shared/firebase";
import type { Message } from "@shared/types";
import LoadingButton from "../components/LoadingButton";

// O'quvchilarni guruhlash
interface StudentThread {
  userId: string;
  name: string;
  lastMessage: string;
  lastTime: number;
  unreadCount: number;
  messages: Message[];
}

export default function News() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedThread, setSelectedThread] = useState<StudentThread | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [showBroadcastForm, setShowBroadcastForm] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastBody, setBroadcastBody] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);

  useEffect(() => {
    loadMessages();
  }, []);

  async function loadMessages() {
    try {
      const msgs = await getAllMessages();
      setMessages(msgs);
    } catch (err) {
      console.error("Habarlarni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;
    setBroadcastSending(true);
    try {
      const now = Date.now();
      const id = `broadcast-${now}`;
      await setDoc(doc(db, "studentNotifications", id), {
        id,
        type: "general",
        title: broadcastTitle.trim(),
        body: broadcastBody.trim(),
        isRead: false,
        createdAt: now,
      });
      setBroadcastTitle("");
      setBroadcastBody("");
      setShowBroadcastForm(false);
      alert("✅ Habar barcha o'quvchilarga yuborildi!");
    } catch (err) {
      console.error("Habar yuborishda xatolik:", err);
      alert("Xatolik yuz berdi!");
    } finally {
      setBroadcastSending(false);
    }
  }

  // O'quvchilarni thread larga guruhlash
  function getThreads(): StudentThread[] {
    const threadMap = new Map<string, StudentThread>();

    for (const msg of messages) {
      // Student habarlarini guruhlash
      const studentId = msg.fromRole === "student" ? msg.fromUserId : msg.toUserId;
      const studentName = msg.fromRole === "student" ? msg.fromName : undefined;

      if (!studentId || studentId === "admin") continue;

      if (!threadMap.has(studentId)) {
        threadMap.set(studentId, {
          userId: studentId,
          name: studentName || "O'quvchi",
          lastMessage: "",
          lastTime: 0,
          unreadCount: 0,
          messages: [],
        });
      }

      const thread = threadMap.get(studentId)!;
      thread.messages.push(msg);
      if (msg.fromRole === "student" && studentName) {
        thread.name = studentName;
      }
      if (msg.createdAt > thread.lastTime) {
        thread.lastMessage = msg.text;
        thread.lastTime = msg.createdAt;
      }
      if (msg.fromRole === "student" && !msg.isRead) {
        thread.unreadCount++;
      }
    }

    // Vaqt bo'yicha saralash
    return Array.from(threadMap.values())
      .sort((a, b) => b.lastTime - a.lastTime);
  }

  async function handleOpenThread(thread: StudentThread) {
    setSelectedThread(thread);
    // O'qilmagan habarlarni belgilash
    for (const msg of thread.messages) {
      if (msg.fromRole === "student" && !msg.isRead) {
        await markMessageAsRead(msg.id);
      }
    }
    setMessages((prev) => prev.map((m) =>
      m.fromRole === "student" && m.fromUserId === thread.userId ? { ...m, isRead: true } : m
    ));
  }

  async function handleReply() {
    if (!replyText.trim() || !selectedThread) return;
    setSending(true);
    try {
      const reply: Message = {
        id: `msg-admin-${Date.now()}`,
        fromUserId: "admin",
        fromName: "Admin",
        fromRole: "admin",
        toUserId: selectedThread.userId,
        text: replyText.trim(),
        isRead: false,
        createdAt: Date.now(),
      };
      await sendMessage(reply);
      setReplyText("");
      await loadMessages();
      // Thread ni yangilash
      const updatedThread = { ...selectedThread, messages: [...selectedThread.messages, reply] };
      setSelectedThread(updatedThread);
    } catch (err) {
      console.error("Javob yuborishda xatolik:", err);
    } finally {
      setSending(false);
    }
  }

  const threads = getThreads();
  const totalUnread = threads.reduce((sum, t) => sum + t.unreadCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Habarlar</h1>
          <p className="text-sm text-gray-500 mt-1">
            O'quvchilardan kelgan murojatlar ({threads.length} ta suhbat{totalUnread > 0 ? `, ${totalUnread} ta o'qilmagan` : ""})
          </p>
        </div>
        <button onClick={() => setShowBroadcastForm(!showBroadcastForm)} className="btn-primary text-sm flex items-center gap-2">
          <Megaphone className="w-4 h-4" /> Umumiy habar yuborish
        </button>
      </div>

      {/* Umumiy habar yuborish formasi */}
      {showBroadcastForm && (
        <div className="bg-white rounded-xl border border-primary-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-primary-500" />
            <h3 className="font-semibold text-gray-900">Barcha o'quvchilarga habar yuborish</h3>
          </div>
          <form onSubmit={handleSendBroadcast} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sarlavha *</label>
              <input
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="Masalan: Yangi kurs qo'shildi!"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Habar matni *</label>
              <textarea
                value={broadcastBody}
                onChange={(e) => setBroadcastBody(e.target.value)}
                placeholder="O'quvchilarga yubormoqchi bo'lgan xabaringiz..."
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                required
              />
            </div>
            <div className="flex gap-3">
              <LoadingButton type="submit" loading={broadcastSending} disabled={!broadcastTitle.trim() || !broadcastBody.trim()} className="btn-primary text-sm flex items-center gap-2">
                <Send className="w-4 h-4" /> Yuborish
              </LoadingButton>
              <button type="button" onClick={() => setShowBroadcastForm(false)} className="btn-outline text-sm">Bekor</button>
            </div>
          </form>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      )}

      {!loading && threads.length === 0 && (
        <div className="bg-white rounded-xl p-12 border border-gray-100 shadow-sm text-center">
          <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Hali habar kelmagan</p>
        </div>
      )}

      {/* Threads list */}
      {!loading && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
          {threads.map((thread) => (
            <div
              key={thread.userId}
              onClick={() => handleOpenThread(thread)}
              className={`flex items-center gap-4 p-5 cursor-pointer hover:bg-gray-50 transition-colors ${thread.unreadCount > 0 ? "bg-primary-50/30" : ""}`}
            >
              <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${thread.unreadCount > 0 ? "bg-primary-100" : "bg-gray-100"}`}>
                <User className={`w-5 h-5 ${thread.unreadCount > 0 ? "text-primary-600" : "text-gray-500"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">{thread.name}</p>
                  {thread.unreadCount > 0 && (
                    <span className="w-5 h-5 bg-primary-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {thread.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 truncate mt-0.5">{thread.lastMessage}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-gray-400">
                  {new Date(thread.lastTime).toLocaleDateString("uz-UZ")}
                </p>
                <p className="text-[10px] text-gray-400">
                  {new Date(thread.lastTime).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Chat Modal */}
      {selectedThread && (
        <ChatModal
          thread={selectedThread}
          allMessages={messages.filter((m) => m.fromUserId === selectedThread.userId || m.toUserId === selectedThread.userId).sort((a, b) => a.createdAt - b.createdAt)}
          replyText={replyText}
          setReplyText={setReplyText}
          sending={sending}
          onReply={handleReply}
          onClose={() => setSelectedThread(null)}
        />
      )}
    </div>
  );
}

// ===== Chat Modal =====
function ChatModal({ thread, allMessages, replyText, setReplyText, sending, onReply, onClose }: {
  thread: StudentThread;
  allMessages: Message[];
  replyText: string;
  setReplyText: (v: string) => void;
  sending: boolean;
  onReply: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">{thread.name}</p>
              <p className="text-xs text-gray-500">{thread.messages.length} ta habar</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-gray-50">
          {allMessages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.fromRole === "admin" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                  msg.fromRole === "admin"
                    ? "bg-primary-500 text-white rounded-br-md"
                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                }`}
              >
                <p className="text-sm">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${msg.fromRole === "admin" ? "text-white/60" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                  {" · "}
                  {new Date(msg.createdAt).toLocaleDateString("uz-UZ")}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Reply input */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <input
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onReply(); } }}
              placeholder="Javob yozing..."
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              onClick={onReply}
              disabled={!replyText.trim() || sending}
              className="w-10 h-10 bg-primary-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
