import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Star, BookOpen, Trash2 } from "lucide-react";
import { getFavoriteTopics, removeFavoriteTopic } from "@shared/repositories";
import type { FavoriteTopic } from "@shared/types";
import { useAuth } from "../hooks/useAuth";

export default function Favorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteTopic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadFavorites();
    else setLoading(false);
  }, [user]);

  async function loadFavorites() {
    if (!user) return;
    try {
      const data = await getFavoriteTopics(user.uid);
      setFavorites(data);
    } catch (err) {
      console.error("Tanlangan mavzularni yuklashda xatolik:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(fav: FavoriteTopic, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await removeFavoriteTopic(fav.id);
      setFavorites((prev) => prev.filter((f) => f.id !== fav.id));
    } catch (err) {
      console.error("O'chirishda xatolik:", err);
    }
  }

  return (
    <div className="page-content pb-24 bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white px-5 pt-4 pb-4 border-b border-gray-100 flex items-center gap-3">
        <Link to="/profile" className="text-gray-500"><ChevronLeft size={22} /></Link>
        <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <Star size={20} className="text-yellow-400" fill="currentColor" /> Tanlangan mavzular
        </h1>
      </header>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {!loading && !user && (
        <div className="text-center py-20 px-5">
          <Star size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">Tanlangan mavzularni ko'rish uchun tizimga kiring</p>
          <Link to="/login" className="inline-block mt-4 bg-primary-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm">Kirish</Link>
        </div>
      )}

      {!loading && user && favorites.length === 0 && (
        <div className="text-center py-20 px-5">
          <Star size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 font-medium">Hali tanlangan mavzu yo'q</p>
          <p className="text-xs text-gray-400 mt-1">Mavzu ichidagi ⭐ tugmasini bosib, bu yerga qo'shishingiz mumkin</p>
          <Link to="/courses" className="inline-block mt-4 text-primary-500 font-medium text-sm">Kurslarni ko'rish →</Link>
        </div>
      )}

      {!loading && favorites.length > 0 && (
        <div className="px-5 mt-4 space-y-2">
          {favorites.map((fav) => (
            <Link
              key={fav.id}
              to={`/course/${fav.courseId}/topic/${fav.topicId}`}
              className="flex items-center gap-3 p-4 bg-white border border-gray-100 rounded-xl active:bg-gray-50"
            >
              <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center shrink-0">
                <BookOpen size={18} className="text-yellow-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{fav.topicTitle}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {new Date(fav.createdAt).toLocaleDateString("uz-UZ")} da qo'shilgan
                </p>
              </div>
              <button
                onClick={(e) => handleRemove(fav, e)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center shrink-0"
                title="O'chirish"
              >
                <Trash2 size={16} />
              </button>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
