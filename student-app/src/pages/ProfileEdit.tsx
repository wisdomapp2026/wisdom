import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, Save, Camera } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { getUserById, updateUser } from "@shared/repositories";
import { uploadFile } from "@shared/supabase";
import { supabase } from "@shared/supabase";

export default function ProfileEdit() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
          setAvatarUrl(u.avatar || "");
        }
      });
    }
  }, [user]);

  async function handleSave() {
    if (!user || !name.trim()) return;
    setSaving(true);
    setMessage("");
    try {
      await updateUser(user.uid, { name: name.trim(), phone: phone.trim(), avatar: avatarUrl || undefined });
      setMessage("Ma'lumotlar saqlandi!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Xatolik yuz berdi");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    try {
      const url = await uploadFile("edukids", `avatars/${user.uid}/${Date.now()}-${file.name}`, file);
      setAvatarUrl(url);
      // Darhol saqlash
      await updateUser(user.uid, { avatar: url });
      setMessage("Rasm yuklandi!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage("Rasm yuklashda xatolik");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleChangePassword() {
    if (!user || !user.email || !oldPassword || !newPassword) return;
    setPasswordMsg("");
    try {
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) throw updateErr;
      setPasswordMsg("Parol muvaffaqiyatli o'zgartirildi!");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setPasswordMsg("Xatolik: " + err.message);
    }
  }

  return (
    <div className="page-content pb-24">
      <header className="px-5 pt-4 flex items-center gap-3">
        <Link to="/profile" className="text-gray-500 shrink-0 flex items-center justify-center"><ChevronLeft size={22} /></Link>
        <h1 className="text-xl font-bold">Shaxsiy ma'lumotlar</h1>
      </header>

      <div className="px-5 mt-6 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 border-2 border-white shadow-lg">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-500 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{name.charAt(0).toUpperCase() || "?"}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={avatarUploading}
              className="absolute bottom-0 right-0 w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white active:bg-primary-600 disabled:opacity-50"
            >
              <Camera size={14} />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
            />
          </div>
          {avatarUploading && <p className="text-xs text-primary-500 mt-2 animate-pulse">Yuklanmoqda...</p>}
          <p className="text-xs text-gray-400 mt-2">Rasmni o'zgartirish uchun kamera ikonkasini bosing</p>
        </div>

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
