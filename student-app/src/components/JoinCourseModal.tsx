import { useState } from "react";
import { X, UserPlus, BookOpen } from "lucide-react";
import { useBackHandler } from "../services/backActionManager";

interface Props {
  open: boolean;
  courseTitle: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

export default function JoinCourseModal({ open, courseTitle, onConfirm, onClose }: Props) {
  const [loading, setLoading] = useState(false);

  // Android back tugmasi bosilganda modalni yopish
  useBackHandler(onClose, open, 20);

  if (!open) return null;

  async function handleConfirm() {
    setLoading(true);
    try {
      await onConfirm();
    } catch (err) {
      console.error("Kursga qo'shilishda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl relative text-center border border-gray-100">
        {/* Yopish tugmasi */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Ikonka */}
        <div className="w-16 h-16 bg-indigo-50 border-4 border-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-indigo-600 shadow-inner">
          <UserPlus size={32} />
        </div>

        {/* Sarlavha + matn */}
        <h3 className="text-xl font-bold text-gray-900 mb-2">Kursga qo'shilasizmi?</h3>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          <span className="font-semibold text-gray-800">"{courseTitle}"</span> kursini o'rganishni boshlash va uni kurslaringiz ro'yxatiga qo'shishni xohlaysizmi?
        </p>

        {/* Tugmalar */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-3 px-4 rounded-xl font-bold text-sm shadow-md shadow-indigo-200 flex items-center justify-center gap-2 transition-all disabled:opacity-70"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <BookOpen size={18} />
                Ha, qo'shilish
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-3 px-4 rounded-xl font-semibold text-sm transition-colors"
          >
            Bekor qilish
          </button>
        </div>
      </div>
    </div>
  );
}
