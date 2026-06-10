import { useState, useEffect } from "react";
import { Ban, Send, MessageCircle } from "lucide-react";
import { sendMessage, getMessagesByUser, getMessagesForUser } from "@shared/repositories";
import type { Message } from "@shared/types";
import { signOut } from "firebase/auth";
import { auth } from "@shared/firebase";

interface Props {
  userId: string;
  userName: string;
}

export default function BannedScreen({ userId, userName }: Props) {
  const [showChat, setShowChat] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);

  useEffect(() => {
    loadChat();
  }, [userId]);

  async function loadChat() {
    try {
      // O'quvchidan admin ga va admin dan o'quvchiga habarlar
      const [fromMe, toMe] = await Promise.all([
        getMessagesByUser(userId),
        getMessagesForUser(userId),
      ]);
      const all = [...fromMe, ...toMe].sort((a, b) => a.createdAt - b.createdAt);
      setChatMessages(all);
    } catch (err) {
      console.error("Chat yuklashda xatolik:", err);
    }
  }

  async function handleSendMessage() {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      const msg: Message = {
        id: `msg-${Date.now()}`,
        fromUserId: userId,
        fromName: userName,
        fromRole: "student",
        text: messageText.trim(),
        isRead: false,
        createdAt: Date.now(),
      };
      await sendMessage(msg);
      setMessageText("");
      await loadChat();
    } catch (err) {
      console.error("Habar yuborishda xatolik:", err);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {!showChat ? (
        /* Ban ma'lumoti */
        <div className="flex-1 flex items-center justify-center p-5">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-8 text-center">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Ban className="w-10 h-10 text-red-500" />
            </div>

            <h1 className="text-2xl font-bold text-gray-900 mb-2">Hisobingiz cheklangan</h1>
            <p className="text-gray-500 text-sm mb-6">
              Administrator tomonidan sizning hisobingizga cheklov o'rnatilgan.
              Agar bu xato deb hisoblasangiz, adminga murojaat qiling.
            </p>

            {/* Oxirgi admin habar */}
            {chatMessages.filter((m) => m.fromRole === "admin").length > 0 && (
              <div className="mb-6 text-left bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-blue-600 mb-1">Admin xabari:</p>
                <p className="text-sm text-blue-800">
                  {chatMessages.filter((m) => m.fromRole === "admin").slice(-1)[0]?.text}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => setShowChat(true)}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary-500 text-white font-semibold rounded-xl active:bg-primary-600"
              >
                <MessageCircle className="w-5 h-5" /> Adminga murojaat qilish
              </button>
              <button
                onClick={() => signOut(auth)}
                className="w-full py-3 text-gray-500 font-medium text-sm"
              >
                Boshqa hisob bilan kirish
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Chat oynasi */
        <div className="flex-1 flex flex-col max-h-screen">
          {/* Chat header */}
          <div className="bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowChat(false)} className="text-gray-500 text-lg">←</button>
              <div>
                <p className="font-bold text-gray-900">Admin bilan yozishma</p>
                <p className="text-xs text-gray-500">Murojaat va javoblar</p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
            {chatMessages.length === 0 && (
              <div className="text-center py-12 text-gray-400 text-sm">
                Hali habar yo'q. Adminga xabar yuboring.
              </div>
            )}
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.fromRole === "student" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.fromRole === "student"
                      ? "bg-primary-500 text-white rounded-br-md"
                      : "bg-white border border-gray-200 text-gray-800 rounded-bl-md"
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-[10px] mt-1 ${msg.fromRole === "student" ? "text-white/60" : "text-gray-400"}`}>
                    {new Date(msg.createdAt).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-200 px-5 py-3 shrink-0">
            <div className="flex items-center gap-3">
              <input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
                placeholder="Xabar yozing..."
                className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sending}
                className="w-11 h-11 bg-primary-500 text-white rounded-xl flex items-center justify-center disabled:opacity-50 active:bg-primary-600"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
