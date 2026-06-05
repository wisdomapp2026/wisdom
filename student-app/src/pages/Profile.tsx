import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Profile() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="page-content">
      <header className="px-5 pt-4 flex justify-between">
        <h1 className="text-2xl font-bold">Profil</h1>
        <button className="text-gray-400">⚙️</button>
      </header>

      {/* Agar login qilmagan bo'lsa */}
      {!isLoggedIn ? (
        <div className="px-5 mt-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <span className="text-3xl">👤</span>
          </div>
          <h2 className="text-xl font-bold mt-4">Tizimga kiring</h2>
          <p className="text-sm text-gray-500 mt-2">O'z natijalaringiz va progressingizni kuzatish uchun tizimga kiring.</p>
          <Link to="/login" className="block mt-6 bg-primary-500 text-white font-bold py-3.5 rounded-xl text-center">Kirish</Link>
          <Link to="/register" className="block mt-3 border border-gray-200 text-gray-700 font-medium py-3.5 rounded-xl text-center">Ro'yxatdan o'tish</Link>
        </div>
      ) : (
        <>
          {/* Avatar & Info */}
          <div className="flex flex-col items-center mt-6">
            <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-3xl">👤</span>
            </div>
            <h2 className="text-xl font-bold mt-3">{user?.email?.replace("@edukids.uz", "") || "O'quvchi"}</h2>
            <span className="bg-primary-500 text-white text-xs font-medium px-3 py-1 rounded-full mt-1.5">Talaba</span>
            <div className="flex gap-8 mt-4">
              <div className="text-center"><p className="text-[10px] text-gray-500">KURSLAR</p><p className="text-lg font-bold">1</p></div>
              <div className="text-center"><p className="text-[10px] text-gray-500">TESTLAR</p><p className="text-lg font-bold">0</p></div>
              <div className="text-center"><p className="text-[10px] text-gray-500">NATIJA</p><p className="text-lg font-bold">—</p></div>
            </div>
            <button className="mt-4 border-2 border-primary-500 text-primary-500 font-semibold px-6 py-2 rounded-xl text-sm">Profilni tahrirlash</button>
          </div>

          {/* Faol obunalar */}
          <section className="px-5 mt-8">
            <h3 className="font-bold text-gray-900 mb-3">Faol obunalar</h3>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Hali obuna yo'q</p>
              <Link to="/subscription" className="text-sm text-primary-500 font-medium mt-2 inline-block">Obuna bo'lish →</Link>
            </div>
          </section>

          {/* So'nggi natijalar */}
          <section className="px-5 mt-6">
            <h3 className="font-bold text-gray-900 mb-3">So'nggi natijalar</h3>
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
              <p className="text-sm text-gray-500">Hali test ishlanmagan</p>
              <Link to="/tests" className="text-sm text-primary-500 font-medium mt-2 inline-block">Testlarni ishlash →</Link>
            </div>
          </section>

          {/* Sozlamalar */}
          <section className="px-5 mt-6">
            <h3 className="font-bold text-gray-900 mb-3">Sozlamalar</h3>
            {[
              { i: "👤", l: "Shaxsiy ma'lumotlar" },
              { i: "🔒", l: "Xavfsizlik" },
              { i: "🔔", l: "Bildirishnomalar" },
              { i: "❓", l: "Yordam" },
            ].map((m, i) => (
              <button key={i} className="flex items-center w-full py-3.5 border-b border-gray-50">
                <span className="mr-3">{m.i}</span>
                <span className="flex-1 text-left text-gray-900">{m.l}</span>
                <span className="text-gray-300">›</span>
              </button>
            ))}
            <button onClick={handleLogout} className="flex items-center w-full py-3.5 text-red-500">
              <span className="mr-3">🚪</span>
              <span className="flex-1 text-left font-medium">Chiqish</span>
            </button>
          </section>
        </>
      )}
    </div>
  );
}
