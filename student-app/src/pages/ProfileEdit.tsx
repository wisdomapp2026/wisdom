import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Save } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getUserById, updateUser } from "@shared/repositories";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "@shared/firebase";

export default function ProfileEdit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Parol
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  useEffect(() => {
    if (user) {
      getUserById(user.uid).then((u) => {
        if (u) {
          setName(u.name || "");
          setPhone(u.phone || "");
        }
      });
    }
  }, [user]);

  async function handleSave() {
    if (!user || !name.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      await updateUser(user.uid, { name: name.trim(), phone: phone.trim() });
      setMessage("Ma'lumotlar saqlandi!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!user || !user.email || !oldPassword || !newPassword) return;
    setPasswordMsg("");
    try {
      const credential = EmailAuthProvider.credential(user.email, oldPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setPasswordMsg("Parol muvaffaqiyatli o'zgartirildi!");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordMsg(err.code === "auth/wrong-password" ? "Joriy parol noto'g'ri" : "Xatolik: " + err.message);
    }
  }

  return (
    <div className="page-content pb-24">
      <header className="px-5 pt-4 flex items-center gap-3">
        <Link to="/profile" className="text-gray-500"><ChevronLeft size={22} /></Link>
        <h1 className="text-xl font-bold">Shaxsiy ma'lumotlar</h1>
      </header>

      <div className="px-5 mt-6 space-y-5">
        {/* Ism */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ism va familiya</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ismingiz"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Telefon */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Telefon raqam</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+998 90 123 45 67"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Email (o'zgartirib bo'lmaydi) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            value={user?.email || ""}
            disabled
            className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-500"
          />
          <p className="text-xs text-gray-400 mt-1">Emailni o'zgartirish mumkin emas</p>
        </div>

        {message && (
          <p className={`text-sm font-medium ${message.includes("Xatolik") ? "text-red-500" : "text-green-600"}`}>{message}</p>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-primary-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Save size={16} /> {saving ? "Saqlanmoqda..." : "Saqlash"}
        </button>

        {/* Parol o'zgartirish */}
        <div className="pt-5 border-t border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-3">Parolni o'zgartirish</h3>
          <div className="space-y-3">
            <input
              type="password"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              placeholder="Joriy parol"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Yangi parol (6+ belgi)"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            {passwordMsg && (
              <p className={`text-sm font-medium ${passwordMsg.includes("muvaffaqiyatli") ? "text-green-600" : "text-red-500"}`}>{passwordMsg}</p>
            )}
            <button
              onClick={handleChangePassword}
              disabled={!oldPassword || !newPassword || newPassword.length < 6}
              className="w-full border-2 border-primary-500 text-primary-500 font-semibold py-3 rounded-xl disabled:opacity-50"
            >
              Parolni o'zgartirish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
