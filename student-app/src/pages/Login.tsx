import { Link } from "react-router-dom";
export default function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-16 h-16 bg-primary-500 rounded-2xl flex items-center justify-center mb-6"><span className="text-white text-2xl">⚡</span></div>
      <h1 className="text-2xl font-bold">Xush kelibsiz!</h1>
      <p className="text-sm text-gray-500 mt-1">O'rganishni davom ettirish uchun kiring</p>
      <div className="w-full mt-8 space-y-4">
        <div><label className="text-sm font-medium text-gray-700">Telefon raqam</label><div className="mt-1.5 flex items-center border border-gray-200 rounded-xl px-4 py-3"><span className="text-gray-400 mr-3">📞</span><input placeholder="+998 90 123 45 67" className="flex-1 outline-none text-base" /></div></div>
        <div><label className="text-sm font-medium text-gray-700">Parol</label><div className="mt-1.5 flex items-center border border-gray-200 rounded-xl px-4 py-3"><span className="text-gray-400 mr-3">🔒</span><input type="password" placeholder="********" className="flex-1 outline-none text-base" /><button className="text-gray-400">👁</button></div><p className="text-right mt-1.5"><button className="text-sm text-primary-500 font-medium">Parolni unutdingizmi?</button></p></div>
        <button className="w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl text-base mt-2">Kirish  →</button>
      </div>
      <div className="flex items-center gap-3 my-8 w-full"><div className="flex-1 h-px bg-gray-200"></div><span className="text-sm text-gray-400">YOKI</span><div className="flex-1 h-px bg-gray-200"></div></div>
      <p className="text-sm text-gray-500">Hisobingiz yo'qmi?</p>
      <Link to="/register" className="text-base font-bold text-primary-500 mt-1">Ro'yxatdan o'tish</Link>
    </div>
  );
}
