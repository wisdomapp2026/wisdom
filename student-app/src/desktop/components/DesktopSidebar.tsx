import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Home,
  BookOpen,
  ClipboardList,
  PlayCircle,
  User,
  Star,
  Award,
  CreditCard,
  Bell,
  HelpCircle,
  MessageSquare,
  Shield,
  FileText,
  PanelLeftClose,
  PanelLeftOpen,
  Moon,
  Sun,
  LogOut,
  Newspaper,
} from "lucide-react";
import { supabase } from "@shared/supabase";
import { useAuth } from "../../hooks/useAuth";
import { useDarkMode } from "../../hooks/useDarkMode";
import { useNotificationCount } from "../../hooks/useNotificationCount";

const MAIN_NAV = [
  { to: "/", label: "Bosh sahifa", icon: Home, exact: true },
  { to: "/continue", label: "Davom etish", icon: PlayCircle },
  { to: "/courses", label: "Kurslar", icon: BookOpen },
  { to: "/tests", label: "Testlar", icon: ClipboardList },
  { to: "/news", label: "Yangiliklar", icon: Newspaper },
];

const LIBRARY_NAV = [
  { to: "/profile/favorites", label: "Tanlangan modullar", icon: Star },
  { to: "/profile/certificates", label: "Sertifikatlarim", icon: Award },
  { to: "/profile/payments", label: "To'lovlarim", icon: CreditCard },
  { to: "/profile/promo", label: "Promokodlarim", icon: Shield },
];

const SUPPORT_NAV = [
  { to: "/notifications", label: "Bildirishnomalar", icon: Bell, badge: true },
  { to: "/messages", label: "Bog'lanish", icon: MessageSquare },
  { to: "/profile/help", label: "Yordam", icon: HelpCircle },
];

const COLLAPSE_KEY = "wisdom-dk-sidebar-collapsed";

interface Props {
  onLegalOpen: (type: "terms" | "privacy") => void;
  onAuthorOpen: () => void;
}

export default function DesktopSidebar({ onLegalOpen, onAuthorOpen }: Props) {
  const location = useLocation();
  const { isLoggedIn, logout } = useAuth();
  const { isDark, toggle: toggleDark } = useDarkMode();
  const { count: notifCount } = useNotificationCount();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [logoUrl, setLogoUrl] = useState("");
  const [appName, setAppName] = useState("Wisdom");

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_KEY, String(collapsed));
    } catch {}
    // Kontent maydoni sidebar kengligiga qarab siljiydi
    document.documentElement.style.setProperty(
      "--dk-sidebar-current",
      collapsed ? "var(--dk-sidebar-w-collapsed)" : "var(--dk-sidebar-w)"
    );
  }, [collapsed]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from("settings").select("value").eq("key", "platform").maybeSingle();
        if (cancelled || !data?.value) return;
        const v = data.value as any;
        if (v.logoUrl) setLogoUrl(v.logoUrl);
        if (v.platformName) setAppName(v.platformName);
      } catch {}
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const width = collapsed ? "var(--dk-sidebar-w-collapsed)" : "var(--dk-sidebar-w)";

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-40 flex flex-col dk-no-print"
      style={{
        width,
        backgroundColor: "var(--theme-card-bg)",
        borderRight: "1px solid var(--dk-border)",
        transition: "width 0.36s var(--dk-ease)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5 h-[var(--dk-topbar-h)] px-4 shrink-0"
        style={{ borderBottom: "1px solid var(--dk-border)" }}
      >
        <button onClick={onAuthorOpen} className="flex items-center gap-2.5 min-w-0 dk-press">
          <span className="w-10 h-10 rounded-2xl grid place-items-center overflow-hidden bg-primary-500 shrink-0 shadow-lg shadow-primary-500/25">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xl">⚡</span>
            )}
          </span>
          {!collapsed && (
            <span className="text-[19px] font-extrabold tracking-tight dk-gradient-text truncate dk-anim-fade-in">
              {appName}
            </span>
          )}
        </button>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="ml-auto w-8 h-8 rounded-xl grid place-items-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            aria-label="Menyuni yig'ish"
            title="Menyuni yig'ish"
          >
            <PanelLeftClose size={17} />
          </button>
        )}
      </div>

      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          className="mx-auto mt-3 w-9 h-9 rounded-xl grid place-items-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          aria-label="Menyuni ochish"
          title="Menyuni ochish"
        >
          <PanelLeftOpen size={17} />
        </button>
      )}

      {/* Navigatsiya */}
      <nav className="flex-1 overflow-y-auto dk-scroll px-3 py-4 space-y-6">
        <NavGroup label="Asosiy" collapsed={collapsed}>
          {MAIN_NAV.map((item) => (
            <NavRow
              key={item.to}
              {...item}
              collapsed={collapsed}
              active={item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to)}
            />
          ))}
        </NavGroup>

        <NavGroup label="Kabinet" collapsed={collapsed}>
          <NavRow
            to="/profile"
            label="Profilim"
            icon={User}
            collapsed={collapsed}
            active={location.pathname === "/profile"}
          />
          {LIBRARY_NAV.map((item) => (
            <NavRow
              key={item.to}
              {...item}
              collapsed={collapsed}
              active={location.pathname.startsWith(item.to)}
            />
          ))}
        </NavGroup>

        <NavGroup label="Yordam" collapsed={collapsed}>
          {SUPPORT_NAV.map((item) => (
            <NavRow
              key={item.to}
              {...item}
              collapsed={collapsed}
              active={location.pathname.startsWith(item.to)}
              badgeCount={item.badge ? notifCount : 0}
            />
          ))}
        </NavGroup>
      </nav>

      {/* Pastki panel */}
      <div className="px-3 py-3 space-y-1 shrink-0" style={{ borderTop: "1px solid var(--dk-border)" }}>
        <SideAction
          icon={isDark ? <Sun size={18} /> : <Moon size={18} />}
          label={isDark ? "Kunduzgi rejim" : "Tungi rejim"}
          collapsed={collapsed}
          onClick={toggleDark}
        />
        <SideAction
          icon={<BookOpen size={18} />}
          label="Kurslar muallifi"
          collapsed={collapsed}
          onClick={onAuthorOpen}
        />
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 pt-2 pb-1">
            <button
              onClick={() => onLegalOpen("terms")}
              className="text-[11px] text-gray-400 hover:text-primary-600 transition-colors flex items-center gap-1"
            >
              <FileText size={11} /> Shartlar
            </button>
            <span className="w-px h-3 bg-gray-200" />
            <button
              onClick={() => onLegalOpen("privacy")}
              className="text-[11px] text-gray-400 hover:text-primary-600 transition-colors flex items-center gap-1"
            >
              <Shield size={11} /> Maxfiylik
            </button>
          </div>
        )}
        {isLoggedIn && (
          <SideAction
            icon={<LogOut size={18} />}
            label="Chiqish"
            collapsed={collapsed}
            danger
            onClick={async () => {
              if (confirm("Akkauntdan chiqishni xohlaysizmi?")) {
                await logout();
                window.location.href = "/";
              }
            }}
          />
        )}
      </div>
    </aside>
  );
}

function NavGroup({
  label,
  collapsed,
  children,
}: {
  label: string;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      {!collapsed && (
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      )}
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function NavRow({
  to,
  label,
  icon: Icon,
  collapsed,
  active,
  badgeCount = 0,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  collapsed: boolean;
  active: boolean;
  badgeCount?: number;
}) {
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center gap-3 rounded-2xl transition-all duration-300 ${
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
      } ${
        active
          ? "bg-primary-50 text-primary-600 font-bold"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-medium"
      }`}
    >
      {/* Aktiv indikator */}
      <span
        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-r-full bg-primary-500 transition-all duration-300"
        style={{ height: active ? 22 : 0, opacity: active ? 1 : 0 }}
      />
      <span className="relative shrink-0">
        <Icon size={19} strokeWidth={active ? 2.4 : 1.9} />
        {badgeCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[15px] h-[15px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold grid place-items-center">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </span>
      {!collapsed && <span className="text-[13.5px] truncate">{label}</span>}
    </NavLink>
  );
}

function SideAction({
  icon,
  label,
  collapsed,
  onClick,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  collapsed: boolean;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full flex items-center gap-3 rounded-2xl transition-colors ${
        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2.5"
      } ${
        danger
          ? "text-red-500 hover:bg-red-50 font-semibold"
          : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 font-medium"
      }`}
    >
      <span className="shrink-0">{icon}</span>
      {!collapsed && <span className="text-[13.5px] truncate">{label}</span>}
    </button>
  );
}
