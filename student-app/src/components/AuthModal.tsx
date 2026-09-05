import { Link, useLocation } from "react-router-dom";
import { getAuthPath } from "../utils/authRedirect";
import { useBackHandler } from "../services/backActionManager";

interface Props {
  open: boolean;
  onClose: () => void;
}

/** Login talab qilinayotganda modal oyna. */
export default function AuthModal({ open, onClose }: Props) {
  const location = useLocation();

  // Android back tugmasi bosilganda modalni yopish
  useBackHandler(onClose, open, 20);

  if (!open) return null;

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 px-6">
      <div className="bg-white rounded-3xl w-full max-w-sm p-8 text-center shadow-xl">
        <div className="mx-auto w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center">
          <span className="text-primary-500 text-2xl">🛡️</span>
        </div>

        <h2 className="text-xl font-bold mt-4">Davom etish uchun<br/>tizimga kiring</h2>
        <p className="text-sm text-gray-500 mt-3 leading-relaxed">
          Eksklyuziv videolarni ko'rish va barcha imkoniyatlardan foydalanish uchun hisobingizga kiring.
        </p>

        <Link
          to={getAuthPath("/login", returnTo)}
          onClick={onClose}
          className="w-full bg-primary-500 text-white font-bold py-3.5 rounded-xl mt-6 flex items-center justify-center gap-2"
        >
          →] Kirish
        </Link>

        <Link
          to={getAuthPath("/register", returnTo)}
          onClick={onClose}
          className="w-full border-2 border-gray-900 text-gray-900 font-bold py-3.5 rounded-xl mt-3 flex items-center justify-center gap-2"
        >
          👤+ Ro'yxatdan o'tish
        </Link>

        <button onClick={onClose} className="mt-4 text-sm text-gray-500 flex items-center justify-center gap-1 mx-auto">
          ✕ Bekor qilish
        </button>
      </div>
    </div>
  );
}