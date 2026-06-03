import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
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
  Plus,
  LogOut,
} from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@shared/firebase";
import clsx from "clsx";

const sidebarItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/courses", label: "Kurslar", icon: BookOpen },
  { path: "/students", label: "O'quvchilar", icon: Users },
  { path: "/analytics", label: "Statistikalar", icon: BarChart3 },
  { path: "/settings", label: "Sozlamalar", icon: Settings },
];

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut(auth);
    navigate("/");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <span className="text-lg font-bold text-primary-500">EduKids Admin</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
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
                <span className="text-sm font-semibold text-primary-600">JT</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Javohir Toshpulatov</p>
                <p className="text-xs text-gray-500">Bosh administrator</p>
              </div>
            </div>
            <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-danger" title="Chiqish">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          {/* Search */}
          <div className="relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Qidiruv: kurslar, o'quvchilar, tranzaksiyalar..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-4">
            {/* Notification */}
            <button className="relative p-2 text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-danger rounded-full"></span>
            </button>

            {/* New course button */}
            <NavLink to="/courses" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Yangi yaratish
            </NavLink>

            {/* Status */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Tizim:</span>
              <span className="text-success font-medium">Barqaror</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <Outlet />
        </main>

        {/* Bottom bar */}
        <footer className="h-8 bg-white border-t border-gray-100 flex items-center justify-between px-6 text-xs text-gray-400">
          <span>© 2024 EduKids Admin Panel · All Rights Reserved</span>
          <div className="flex items-center gap-4">
            <span>Foydalanish shartlari</span>
            <span>Maxfiylik siyosati</span>
            <span>Yordam markazi</span>
            <span>Version 2.4.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
