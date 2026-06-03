import { Link } from "react-router-dom";
export default function Register() {
  return (
    <div className="min-h-screen px-5 pt-4">
      <div className="flex items-center gap-3 mb-6"><Link to="/login" className="text-2xl text-gray-600">‹</Link><h1 className="text-lg font-bold">Ro'yxatdan o'tish</h1></div>
      <div className="h-1 bg-primary-500 -mx-5 mb-8"></div>
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center"><span className="text-primary-500 text-2xl">⚡</span></div>
        <p className="text-sm text-gray-500 text-center mt-4">Farzandingiz kelajagi uchun yangi<br/>bilimlar olamiga qo'shiling</p>
      </div>
      <div className="mt-8 space-y-4">
        <div><label className="text-sm font-semibold">Telefon raqam</label><div className="mt-1.5 flex items-center border border-gray-200 rounded-xl px-4 py-3"><span className="text-gray-400 mr-3">📞</span><input placeholder="+998 90 123 45 67" className="flex-1 outline-none" /></div></div>
        <div><label className="text-sm font-semibold">Parol</label><div className="mt-1.5 flex items-center border border-gray-200 rounded-xl px-4 py-3"><span className="text-gray-400 mr-3">🔒</span><input type="password" placeholder="Kamida 8 ta belgi" className="flex-1 outline-none" /><button className="text-gray-400">👁</button></div></div>
        <button className="w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl">Ro'yxatdan o'tish  →</button>
      </div>
      <p className="text-center mt-6 text-sm text-gray-500">Profilingiz bormi?</p>
      <p className="text-center"><Link to="/login" className="font-bold text-primary-500">Kirish</Link></p>
      <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4"><div className="flex items-start gap-3"><span className="text-primary-500">🛡️</span><div><p className="text-sm font-bold uppercase">Xavfsizlik kafolati</p><p className="text-xs text-gray-600 mt-1">Tugmani bosish orqali siz bizning <span className="text-primary-500 underline">Foydalanish shartlari</span> va <span className="text-primary-500 underline">Maxfiylik siyosati</span>ga rozilik bildirasiz.</p></div></div></div>
    </div>
  );
}
