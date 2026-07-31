import { Outlet, NavLink, useLocation, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  BookOpen,
  FileText,
  Users,
  BarChart3,
  Bell,
  Newspaper,
  Tag,
  FileEdit,
  Settings,
  Search,
  LogOut,
  Share2,
  Menu,
  X,
  Image,
  MessageSquareQuote,
  HardDrive,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@shared/firebase";
import { getUnreadNotificationCount } from "@shared/repositories";
import clsx from "clsx";

const sidebarItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/courses", label: "Kurslar", icon: BookOpen },
  { path: "/tests", label: "Testlar", icon: FileText },
  { path: "/students", label: "O'quvchilar", icon: Users },
  { path: "/motivations", label: "Motivatsion frazalar", icon: Bell },
  { path: "/social-links", label: "Ijtimoiy tarmoqlar", icon: Share2 },
  { path: "/notifications", label: "Bildirishnomalar", icon: Bell },
  { path: "/news", label: "Habarlar", icon: Newspaper },
  { path: "/payments", label: "To'lovlar", icon: FileEdit },
  { path: "/promos", label: "Promo kodlar", icon: Tag },
  { path: "/analytics", label: "Statistikalar", icon: BarChart3 },
  { path: "/banners", label: "Bannerlar", icon: Image },
  { path: "/news-items", label: "Yangiliklar", icon: Newspaper },
  { path: "/testimonials", label: "Otzivlar", icon: MessageSquareQuote },
  { path: "/backup", label: "Backup", icon: HardDrive },
  { path: "/settings", label: "Sozlamalar", icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Sahifa o'zgarganda mobile menuni yopish
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    loadNotifCount();
    // Har 30 sekundda yangilash
    const interval = setInterval(loadNotifCount, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadNotifCount() {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {}
  }

  async function handleLogout() {
    await signOut(auth);
    navigate("/");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
        </div>
      )}

      {/* Sidebar — desktop: static, mobile: slide-in */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 transform transition-transform duration-300 lg:relative lg:translate-x-0 ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-primary-500">EduKids Admin</span>
          </div>
          <button onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {sidebarItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx("sidebar-link", isActive && "active")
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-semibold text-primary-600">
                  {auth.currentUser?.displayName?.charAt(0)?.toUpperCase() || "A"}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{auth.currentUser?.displayName || "Admin"}</p>
                <p className="text-xs text-gray-500">{auth.currentUser?.email || ""}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-danger" title="Chiqish">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          {location.pathname === "/courses" ? (
            <>
              {/* Hamburger + Search */}
              <div className="flex items-center gap-3">
                <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-gray-500 hover:text-gray-700">
                  <Menu className="w-5 h-5" />
                </button>
                <div className="relative w-64 md:w-96 hidden sm:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Qidiruv: kurslar, o'quvchilar..."
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                {/* Notification */}
                <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-danger rounded-full flex items-center justify-center text-[9px] text-white font-bold px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>

                {/* New course button removed */}

              </div>
            </>
          ) : (
            <>
              <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-2 text-gray-500 hover:text-gray-700">
                <Menu className="w-5 h-5" />
              </button>
              <div className="hidden lg:block"></div>
              <div className="flex items-center gap-4">
                <Link to="/notifications" className="relative p-2 text-gray-500 hover:text-gray-700">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-danger rounded-full flex items-center justify-center text-[9px] text-white font-bold px-1">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Link>
              </div>
            </>
          )}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>

      </div>
    </div>
  );
}
