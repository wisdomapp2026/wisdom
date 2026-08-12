import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Send } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getUserById, createAdminNotification, sendMessage, getAllMessages } from "@shared/repositories";
import type { AdminNotification, Message } from "@shared/types";

interface ChatMessage {
  id: string;
  fromUserId: string;
  fromName: string;
  fromRole: "student" | "admin";
  text: string;
  createdAt: number;
}

export default function Messages() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState("O'quvchi");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;

    // User ismini olish
    getUserById(user.uid).then((u) => {
      if (u) setUserName(u.name);
    });

    // Real-time messages listener
    // Oddiy fetch (real-time emas, lekin composite index kerak emas)
    loadMessages();
  }, [user]);

  async function loadMessages() {
    if (!user) return;
    try {
      const all = await getAllMessages();
      // Faqat shu foydalanuvchiga tegishli habarlar (yuborgan yoki admin javob bergan)
      const filtered = all.filter(
        (m) => m.fromUserId === user.uid || m.toUserId === user.uid
      ).sort((a, b) => a.createdAt - b.createdAt);
      setMessages(filtered);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSend() {
    if (!newMessage.trim() || !user) return;
    setSending(true);
    try {
      await sendMessage({
        id: `msg-${Date.now()}`,
        fromUserId: user.uid,
        fromName: userName,
        fromRole: "student",
        toUserId: "admin",
        text: newMessage.trim(),
        isRead: false,
        createdAt: Date.now(),
      });

      // Admin uchun bildirishnoma — RLS cheklovi sababli xato bo'lishi mumkin
      try {
        const notif: AdminNotification = {
          id: `notif-msg-${Date.now()}`,
          type: "new_message",
          title: "Yangi habar",
          body: `${userName}: ${newMessage.trim().slice(0, 50)}`,
          isRead: false,
          data: { userId: user.uid },
          createdAt: Date.now(),
        };
        await createAdminNotification(notif);
      } catch {}

      setNewMessage("");
      await loadMessages();
    } catch (err) {
      console.error("Habar yuborishda xatolik:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col max-w-mobile mx-auto bg-white" style={{ height: "calc(100vh - 64px)" }}>
      {/* Header */}
      <header className="px-5 pt-4 pb-3 border-b border-gray-100 flex items-center gap-3 shrink-0">
        <Link to="/profile" className="text-gray-500"><ChevronLeft size={22} /></Link>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-primary-500 rounded-full flex items-center justify-center text-white text-xs font-bold">A</div>
          <div>
            <h1 className="text-sm font-bold text-gray-900">Admin</h1>
            <p className="text-[10px] text-green-500">Online</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-3xl mb-2">💬</p>
            <p className="text-sm">Hali habar yo'q. Adminga savol yuboring!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.fromRole === "student" && msg.fromUserId === user?.uid;
          return (
            <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                isMe
                  ? "bg-primary-500 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-900 rounded-bl-sm"
              }`}>
                <p>{msg.text}</p>
                <p className={`text-[9px] mt-1 ${isMe ? "text-white/60" : "text-gray-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("uz", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input — bottom nav ustida */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 shrink-0 bg-white mb-16">
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Habar yozing..."
          className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <button
          onClick={handleSend}
          disabled={sending || !newMessage.trim()}
          className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center disabled:opacity-50"
        >
          <Send size={18} className="text-white ml-0.5" />
        </button>
      </div>
    </div>
  );
}
