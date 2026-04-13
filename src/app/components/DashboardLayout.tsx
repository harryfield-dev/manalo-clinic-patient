import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarClock,
  Bell,
  User,
  MapPin,
  LogOut,
  HeartPulse,
  Menu,
  X,
  MessageCircle,
} from "lucide-react";
import { useApp } from "../context/AppContext";
import { ConfirmModal } from "./ui/ConfirmModal";

interface NavItem {
  label: string;
  icon: React.ElementType;
  path: string;
  badge?: string;
  tutorial?: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/dashboard", tutorial: "nav-dashboard" },
  { label: "Book Appointment", icon: CalendarPlus, path: "/book", tutorial: "nav-book" },
  { label: "My Appointments", icon: CalendarClock, path: "/appointments", tutorial: "nav-appointments" },
  { label: "Chat with Staff", icon: MessageCircle, path: "/chat", badge: "chat", tutorial: "nav-chat" },
  { label: "Notifications", icon: Bell, path: "/notifications", badge: "unread", tutorial: "nav-notifications" },
  { label: "My Profile", icon: User, path: "/profile", tutorial: "nav-profile" },
  { label: "Clinic Map", icon: MapPin, path: "/map" },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

const PAGE_SUBTITLES: Record<string, string> = {
  "/dashboard": "View your health overview, recent activity, and quick actions in one place.",
  "/book": "Schedule a visit with your doctor and choose your preferred time.",
  "/appointments": "Manage your upcoming and past appointments in one place.",
  "/chat": "Message clinic staff for assistance, inquiries, or follow-ups.",
  "/notifications": "Stay updated with reminders, announcements, and important alerts.",
  "/profile": "View and update your personal and medical information.",
  "/map": "Find the clinic location and get directions.",
};

export function DashboardLayout({ children, title, subtitle }: DashboardLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, profile, unreadCount, unreadChatCount } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [tutorialMenuLocked, setTutorialMenuLocked] = useState(false);

  const resolvedSubtitle = subtitle ?? PAGE_SUBTITLES[location.pathname] ?? "";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const handleTutorialActive = (event: Event) => {
      const customEvent = event as CustomEvent<{ active?: boolean }>;
      const active = Boolean(customEvent.detail?.active);
      setTutorialMenuLocked(active);
      if (!active) {
        setSidebarOpen(false);
      }
    };

    const handleTutorialMenuToggle = (event: Event) => {
      const customEvent = event as CustomEvent<{ open?: boolean }>;
      setSidebarOpen(Boolean(customEvent.detail?.open));
    };

    window.addEventListener("tutorial:set-active", handleTutorialActive as EventListener);
    window.addEventListener("tutorial:toggle-mobile-menu", handleTutorialMenuToggle as EventListener);

    return () => {
      window.removeEventListener("tutorial:set-active", handleTutorialActive as EventListener);
      window.removeEventListener("tutorial:toggle-mobile-menu", handleTutorialMenuToggle as EventListener);
    };
  }, []);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, #3A86FF, #1B4FD8)" }}
          >
            <HeartPulse size={19} className="text-white" />
          </div>
          <div>
            <p className="text-white text-sm" style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700 }}>
              Manalo Clinic
            </p>
            <p className="text-white/50 text-xs">Patient Portal</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          const badgeCount =
            item.badge === "unread"
              ? unreadCount
              : item.badge === "chat"
              ? unreadChatCount
              : 0;
          return (
            <button
              key={item.path}
              data-tutorial={item.tutorial}
              onClick={() => {
                navigate(item.path);
                if (!tutorialMenuLocked) {
                  setSidebarOpen(false);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group relative ${
                active
                  ? "text-white shadow-lg"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              }`}
              style={{
                fontFamily: "DM Sans, sans-serif",
                background: active
                  ? "linear-gradient(135deg, #1B4FD8, #3A86FF)"
                  : undefined,
              }}
            >
              <item.icon size={18} className="shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {badgeCount > 0 && (
                <span
                  className="rounded-full flex items-center justify-center shrink-0 font-bold"
                  style={{
                    width: 18,
                    height: 18,
                    fontSize: "0.62rem",
                    background: "#EF4444",
                    color: "#fff",
                    lineHeight: 1,
                    boxShadow: badgeCount > 0 ? "0 0 0 2px rgba(239,68,68,0.2)" : "none",
                  }}
                >
                  {badgeCount > 9 ? "9+" : badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Patient info + Logout */}
      <div className="px-3 pb-4 border-t border-white/10 pt-4">
        <div
          className="flex items-center gap-3 px-3 py-3 rounded-xl mb-2"
          style={{ background: "rgba(255,255,255,0.07)" }}
        >
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-sm"
            style={{ background: "rgba(27,79,216,0.5)" }}
          >
            {profile.fullName
              ? profile.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
              : <User size={16} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-xs truncate" style={{ fontWeight: 600 }}>
              {profile.fullName || "Patient"}
            </p>
            <p className="text-white/50 text-[11px] truncate">{profile.email}</p>
          </div>
        </div>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white/50 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F4F7FF] overflow-hidden">
      {/* Logout Confirmation Modal */}
      <ConfirmModal
        open={showLogoutConfirm}
        title="Log Out?"
        description="Are you sure you want to log out of your patient portal?"
        confirmLabel="Log Out"
        variant="danger"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
      />

      {/* Sidebar — desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#0A2463] shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              if (!tutorialMenuLocked) {
                setSidebarOpen(false);
              }
            }}
          />
          <aside className="relative z-10 flex flex-col w-64 bg-[#0A2463]">
            {!tutorialMenuLocked && (
              <button
                className="absolute top-4 right-4 text-white/60 hover:text-white"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            )}
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>
            {title && (
              <div>
                <h1
                  className="text-[#0A2463] leading-tight"
                  style={{
                    fontFamily: "Playfair Display, serif",
                    fontSize: "1.3rem",
                    fontWeight: 700,
                  }}
                >
                  {title}
                </h1>
                {resolvedSubtitle && (
                  <p
                    className="text-gray-400 text-xs mt-0.5 leading-snug"
                    style={{ fontFamily: "DM Sans, sans-serif" }}
                  >
                    {resolvedSubtitle}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Header right — intentionally empty (badges live in sidebar) */}
          <div />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
