import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, ChevronRight, BookOpen, Folder, FileText, X, LogIn, Command } from "lucide-react";
import { getAllCourses, getFoldersByCourse, getTopicsByCourse, getUserById } from "@shared/repositories";
import { cachedFetch } from "../../hooks/useCache";
import { useAuth } from "../../hooks/useAuth";
import { useNotificationCount } from "../../hooks/useNotificationCount";

type ItemKind = "course" | "folder" | "topic";

interface SearchItem {
  id: string;
  kind: ItemKind;
  title: string;
  subtitle: string;
  link: string;
}

const KIND_META: Record<ItemKind, { label: string; cls: string; icon: typeof BookOpen }> = {
  course: { label: "Kurs", cls: "bg-primary-50 text-primary-600", icon: BookOpen },
  folder: { label: "Modul", cls: "bg-orange-50 text-orange-600", icon: Folder },
  topic: { label: "Mavzu", cls: "bg-emerald-50 text-emerald-600", icon: FileText },
};

/** Sahifa yo'liga qarab breadcrumb sarlavhasi */
const ROUTE_TITLES: Array<[RegExp, string]> = [
  [/^\/$/, "Bosh sahifa"],
  [/^\/continue/, "Davom etish"],
  [/^\/courses/, "Kurslar"],
  [/^\/tests/, "Testlar"],
  [/^\/news/, "Yangiliklar"],
  [/^\/notifications/, "Bildirishnomalar"],
  [/^\/messages/, "Bog'lanish"],
  [/^\/search/, "Qidiruv"],
  [/^\/profile\/edit/, "Shaxsiy ma'lumotlar"],
  [/^\/profile\/favorites/, "Tanlangan modullar"],
  [/^\/profile\/certificates/, "Sertifikatlarim"],
  [/^\/profile\/payments/, "To'lovlarim"],
  [/^\/profile\/promo/, "Promokodlarim"],
  [/^\/profile\/help/, "Yordam"],
  [/^\/profile/, "Profilim"],
  [/^\/course\//, "Kurs"],
  [/^\/test\//, "Test"],
  [/^\/test-result/, "Test natijasi"],
];

function routeTitle(pathname: string): string {
  for (const [re, title] of ROUTE_TITLES) if (re.test(pathname)) return title;
  return "Wisdom";
}

export default function DesktopTopbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoggedIn } = useAuth();
  const { count: notifCount } = useNotificationCount();

  const [userData, setUserData] = useState<{ name?: string; avatar?: string } | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setUserData(null);
      return;
    }
    cachedFetch(`user-${user.uid}`, () => getUserById(user.uid))
      .then((u) => u && setUserData({ name: u.name, avatar: u.avatar }))
      .catch(() => {});
  }, [user?.uid]);

  // Ctrl/Cmd + K bilan qidiruvni ochish
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const displayName = userData?.name || user?.displayName || user?.email?.split("@")[0] || "Foydalanuvchi";

  return (
    <>
      <header
        className="sticky top-0 z-30 h-[var(--dk-topbar-h)] flex items-center gap-4 px-8 dk-glass dk-no-print"
        style={{ borderBottom: "1px solid var(--dk-border)" }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[13px] text-gray-400 hidden xl:inline">Wisdom</span>
          <ChevronRight size={14} className="text-gray-300 hidden xl:inline" />
          <h1 className="text-[15px] font-bold text-gray-900 truncate">{routeTitle(location.pathname)}</h1>
        </div>

        {/* Qidiruv trigger */}
        <button
          onClick={() => setPaletteOpen(true)}
          className="ml-auto group flex items-center gap-2.5 h-11 pl-4 pr-2.5 rounded-2xl w-full max-w-sm text-left transition-colors hover:bg-gray-100"
          style={{ backgroundColor: "var(--theme-card-bg)", border: "1px solid var(--dk-border)" }}
        >
          <Search size={17} className="text-gray-400 shrink-0" />
          <span className="text-[13px] text-gray-400 flex-1 truncate">Kurs, modul yoki mavzuni qidirish...</span>
          <kbd className="hidden lg:flex items-center gap-0.5 text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-1 rounded-md shrink-0">
            <Command size={9} /> K
          </kbd>
        </button>

        {/* Bildirishnomalar */}
        <Link
          to="/notifications"
          className="relative w-11 h-11 rounded-2xl grid place-items-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors shrink-0"
          aria-label="Bildirishnomalar"
        >
          <Bell size={19} />
          {notifCount > 0 && (
            <span className="absolute top-2 right-2 min-w-[17px] h-[17px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center ring-2 ring-white">
              {notifCount > 99 ? "99+" : notifCount}
            </span>
          )}
        </Link>

        {/* Profil / kirish */}
        {isLoggedIn ? (
          <Link
            to="/profile"
            className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-2xl hover:bg-gray-100 transition-colors shrink-0"
          >
            <span className="w-9 h-9 rounded-full overflow-hidden bg-primary-100 grid place-items-center shrink-0 ring-2 ring-white shadow-sm">
              {userData?.avatar ? (
                <img src={userData.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-primary-600 text-sm font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </span>
            <span className="hidden xl:block text-[13px] font-semibold text-gray-700 max-w-[130px] truncate">
              {displayName}
            </span>
          </Link>
        ) : (
          <button
            onClick={() => navigate("/login")}
            className="dk-press inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary-500 hover:bg-primary-600 text-white text-[13px] font-bold shadow-lg shadow-primary-500/25 transition-colors shrink-0"
          >
            <LogIn size={15} /> Kirish
          </button>
        )}
      </header>

      {paletteOpen && <SearchPalette onClose={() => setPaletteOpen(false)} />}
    </>
  );
}

/* ============================================================
   Command palette uslubidagi qidiruv (Ctrl+K)
   ============================================================ */
function SearchPalette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(0);

  useEffect(() => {
    inputRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const courses = await cachedFetch("all-courses", getAllCourses);
        const visible = courses.filter((c) => !c.isHidden);
        const acc: SearchItem[] = visible.map((c) => ({
          id: c.id,
          kind: "course" as ItemKind,
          title: c.title,
          subtitle: c.category || "Kurs",
          link: `/course/${c.id}`,
        }));
        if (!cancelled) setItems([...acc]);

        // Modul va mavzular — fonda bosqichma-bosqich qo'shiladi (UI bloklanmaydi)
        for (const c of visible) {
          const [folders, topics] = await Promise.all([
            cachedFetch(`folders-${c.id}`, () => getFoldersByCourse(c.id)).catch(() => []),
            cachedFetch(`topics-${c.id}`, () => getTopicsByCourse(c.id)).catch(() => []),
          ]);
          if (cancelled) return;
          for (const f of folders) {
            if (f.isHidden) continue;
            acc.push({
              id: f.id,
              kind: "folder",
              title: f.title,
              subtitle: c.title,
              link: `/course/${c.id}/folder/${f.id}`,
            });
          }
          for (const t of topics) {
            if (t.isHidden) continue;
            acc.push({
              id: t.id,
              kind: "topic",
              title: t.title,
              subtitle: c.title,
              link: `/course/${c.id}/topic/${t.id}`,
            });
          }
          setItems([...acc]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.filter((i) => i.kind === "course").slice(0, 8);
    return items
      .filter((i) => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q))
      .slice(0, 24);
  }, [query, items]);

  useEffect(() => setCursor(0), [query]);

  function go(item: SearchItem) {
    navigate(item.link);
    onClose();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(results.length - 1, c + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(0, c - 1));
    } else if (e.key === "Enter" && results[cursor]) {
      e.preventDefault();
      go(results[cursor]);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] bg-gray-900/45 backdrop-blur-sm flex items-start justify-center pt-[10vh] px-4 dk-anim-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl dk-anim-scale-in"
        style={{ backgroundColor: "var(--theme-card-bg)", border: "1px solid var(--dk-border)" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-5 h-16" style={{ borderBottom: "1px solid var(--dk-border)" }}>
          <Search size={19} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Kurs, modul yoki mavzu nomini yozing..."
            className="flex-1 bg-transparent text-[15px] outline-none placeholder:text-gray-400 text-gray-900"
          />
          {loading && (
            <span className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin shrink-0" />
          )}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl grid place-items-center bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
            aria-label="Yopish"
          >
            <X size={15} />
          </button>
        </div>

        {/* Natijalar */}
        <div className="max-h-[52vh] overflow-y-auto dk-scroll p-2">
          {results.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-3xl mb-2">🔍</p>
              <p className="text-sm text-gray-500">
                {query.trim() ? `"${query}" bo'yicha natija topilmadi` : "Qidiruv uchun yozishni boshlang"}
              </p>
            </div>
          ) : (
            <>
              {!query.trim() && (
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                  Kurslar
                </p>
              )}
              {results.map((item, i) => {
                const meta = KIND_META[item.kind];
                const Icon = meta.icon;
                return (
                  <button
                    key={`${item.kind}-${item.id}`}
                    onClick={() => go(item)}
                    onMouseEnter={() => setCursor(i)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-colors ${
                      i === cursor ? "bg-primary-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${meta.cls}`}>
                      <Icon size={17} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13.5px] font-semibold text-gray-900 truncate">{item.title}</span>
                      <span className="block text-[11.5px] text-gray-400 truncate mt-0.5">{item.subtitle}</span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Footer maslahatlar */}
        <div
          className="flex items-center gap-4 px-5 py-3 text-[11px] text-gray-400"
          style={{ borderTop: "1px solid var(--dk-border)" }}
        >
          <span className="flex items-center gap-1.5">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> tanlash
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Enter</Kbd> ochish
          </span>
          <span className="flex items-center gap-1.5">
            <Kbd>Esc</Kbd> yopish
          </span>
          <span className="ml-auto">{items.length} element indekslandi</span>
        </div>
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-grid place-items-center min-w-[20px] h-5 px-1.5 rounded-md bg-gray-100 text-gray-500 text-[10px] font-semibold">
      {children}
    </kbd>
  );
}
