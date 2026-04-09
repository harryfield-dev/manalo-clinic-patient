import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bell,
  CheckCheck,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Ban,
  MessageSquare,
  Calendar,
  Trash2,
  Sparkles,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useApp, type Notification } from "../context/AppContext";
import { ConfirmModal } from "../components/ui/ConfirmModal";

// ── Type config ───────────────────────────────────────────────────────
const typeConfig: Record<
  string,
  { icon: React.ReactNode; label: string; color: string; bg: string; borderColor: string; glow: string }
> = {
  Approved: {
    icon: <CheckCircle size={16} />,
    label: "Approved",
    color: "text-teal-600",
    bg: "bg-teal-50",
    borderColor: "border-l-teal-400",
    glow: "rgba(20,184,166,0.08)",
  },
  Completed: {
    icon: <CheckCircle size={16} />,
    label: "Completed ✓",
    color: "text-blue-600",
    bg: "bg-blue-50",
    borderColor: "border-l-blue-400",
    glow: "rgba(37,99,235,0.08)",
  },
  Rejected: {
    icon: <XCircle size={16} />,
    label: "Not Approved",
    color: "text-red-500",
    bg: "bg-red-50",
    borderColor: "border-l-red-400",
    glow: "rgba(239,68,68,0.06)",
  },
  Cancelled: {
    icon: <Ban size={16} />,
    label: "Cancelled",
    color: "text-gray-500",
    bg: "bg-gray-50",
    borderColor: "border-l-gray-300",
    glow: "rgba(107,114,128,0.06)",
  },
  Reminder: {
    icon: <Clock size={16} />,
    label: "Reminder",
    color: "text-sky-600",
    bg: "bg-sky-50",
    borderColor: "border-l-sky-400",
    glow: "rgba(2,132,199,0.08)",
  },
  Update: {
    icon: <RefreshCw size={16} />,
    label: "Update",
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    borderColor: "border-l-indigo-400",
    glow: "rgba(79,70,229,0.08)",
  },
  Login: {
    icon: <Sparkles size={16} />,
    label: "Login",
    color: "text-blue-600",
    bg: "bg-blue-50",
    borderColor: "border-l-blue-400",
    glow: "rgba(37,99,235,0.08)",
  },
  ChatReply: {
    icon: <MessageSquare size={16} />,
    label: "Message",
    color: "text-violet-600",
    bg: "bg-violet-50",
    borderColor: "border-l-violet-400",
    glow: "rgba(124,58,237,0.08)",
  },
};

type TabKey = "all" | "appointments" | "chat";

const APPOINTMENT_TYPES = new Set(["Approved", "Rejected", "Cancelled", "Reminder", "Completed"]);

function isAppointmentNotification(notif: Notification) {
  if (APPOINTMENT_TYPES.has(notif.type)) return true;
  if (notif.type !== "Update") return false;

  const searchable = `${notif.title} ${notif.message}`.toLowerCase();
  return searchable.includes("appointment");
}

function isMessageNotification(notif: Notification) {
  return notif.type === "ChatReply";
}

function formatTime(ts: string) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function NotifCard({
  notif,
  onRead,
  onDelete,
}: {
  notif: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const cfg = typeConfig[notif.type] ?? typeConfig.Update;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: -20, scale: 0.97 }}
      transition={{ duration: 0.25 }}
      onClick={() => !notif.read && onRead(notif.id)}
      className={`relative bg-white rounded-2xl border border-gray-100 border-l-4 ${cfg.borderColor} p-5 transition-all duration-200 ${
        !notif.read ? "cursor-pointer hover:shadow-md" : "opacity-70"
      }`}
      style={{
        boxShadow: !notif.read
          ? `0 4px 16px ${cfg.glow}, 0 1px 4px rgba(0,0,0,0.04)`
          : "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      {/* Unread dot */}
      {!notif.read && (
        <span className="absolute top-4 right-12 w-2 h-2 rounded-full bg-[#1B4FD8]" />
      )}

      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0 ${cfg.color}`}
        >
          {cfg.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                {/* Type label pill */}
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
                >
                  {cfg.label}
                </span>
                {!notif.read && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#E8F1FF] text-[#1B4FD8]">
                    <Sparkles size={8} /> New
                  </span>
                )}
              </div>
              <p className={`text-sm font-bold ${notif.read ? "text-gray-500" : "text-[#0A2463]"}`}>
                {notif.title}
              </p>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(notif.timestamp)}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }}
                className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                aria-label={`Delete ${notif.title}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-500 leading-relaxed">{notif.message}</p>

          {!notif.read && (
            <p className="text-xs text-[#1B4FD8] mt-2 font-medium">Tap to mark as read →</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function Notifications() {
  const { notifications, markNotificationRead, markAllRead, deleteNotification, clearNotifications } =
    useApp();
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const filterByTab = (list: Notification[]) => {
    if (activeTab === "appointments") return list.filter(isAppointmentNotification);
    if (activeTab === "chat") return list.filter(isMessageNotification);
    return list;
  };

  const filtered = filterByTab(notifications);
  const unread = filtered.filter((n) => !n.read);
  const read = filtered.filter((n) => n.read);
  const activeUnreadCount = unread.length;
  const activeTotalCount = filtered.length;

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count: number }[] = [
    {
      key: "all",
      label: "All",
      icon: <Bell size={14} />,
      count: notifications.filter((n) => !n.read).length,
    },
    {
      key: "appointments",
      label: "Appointments",
      icon: <Calendar size={14} />,
      count: notifications.filter((n) => !n.read && isAppointmentNotification(n)).length,
    },
    {
      key: "chat",
      label: "Messages",
      icon: <MessageSquare size={14} />,
      count: notifications.filter((n) => !n.read && isMessageNotification(n)).length,
    },
  ];

  const summaryTitle =
    activeUnreadCount > 0
      ? activeTab === "all"
        ? `${activeUnreadCount} unread notification${activeUnreadCount > 1 ? "s" : ""}`
        : activeTab === "appointments"
          ? `${activeUnreadCount} unread appointment notification${activeUnreadCount > 1 ? "s" : ""}`
          : `${activeUnreadCount} unread message${activeUnreadCount > 1 ? "s" : ""}`
      : activeTab === "all"
        ? "All caught up!"
        : activeTab === "appointments"
          ? "No unread appointment notifications"
          : "No unread messages";

  const summaryMeta =
    activeTab === "all"
      ? `${notifications.length} total`
      : `${activeTotalCount} in this filter`;

  return (
    <DashboardLayout title="Notifications">
      <ConfirmModal
        open={showClearConfirm}
        title="Clear All Notifications?"
        description="Are you sure you want to clear all notifications? This cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
        onConfirm={() => { setShowClearConfirm(false); clearNotifications(); }}
        onCancel={() => setShowClearConfirm(false)}
      />

      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── Summary header ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-br from-[#0A2463] to-[#1B4FD8] rounded-2xl p-5 text-white overflow-hidden"
          style={{ boxShadow: "0 8px 32px rgba(10,36,99,0.2)" }}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white opacity-[0.04]" />
          <div className="relative flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <Bell size={16} className="text-amber-300" />
                <span className="text-white/60 text-xs uppercase tracking-widest font-semibold">Notifications</span>
              </div>
              <p className="text-white font-bold text-lg">{summaryTitle}</p>
              <p className="text-white/50 text-xs mt-0.5">{summaryMeta}</p>
            </div>
            <div className="flex items-center gap-2">
              {notifications.filter((n) => !n.read).length > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3 py-2 rounded-xl transition-all font-medium"
                >
                  <CheckCheck size={13} /> Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="flex items-center gap-1.5 text-xs bg-red-500/20 hover:bg-red-500/35 border border-red-400/30 text-red-300 hover:text-white px-3 py-2 rounded-xl transition-all font-medium"
                >
                  <Trash2 size={13} /> Clear All
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Tabs ─────────────────────────────────────────── */}
        <div className="flex gap-2 bg-white border border-gray-100 rounded-2xl p-1.5 shadow-sm w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                activeTab === tab.key
                  ? "text-white shadow-md"
                  : "text-gray-500 hover:text-[#0A2463] hover:bg-gray-50"
              }`}
              style={{
                background: activeTab === tab.key
                  ? "linear-gradient(135deg, #1B4FD8, #3A86FF)"
                  : undefined,
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === tab.key
                      ? "bg-white/25 text-white"
                      : "bg-red-100 text-red-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Notification list ─────────────────────────────── */}
        {filtered.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white rounded-2xl border border-gray-100 py-16 text-center"
            style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.04)" }}
          >
            <Bell size={44} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm font-medium">
              {activeTab === "all"
                ? "No notifications yet"
                : activeTab === "appointments"
                ? "No appointment notifications"
                : "No chat messages"}
            </p>
            <p className="text-gray-300 text-xs mt-1">You're all caught up! 🎉</p>
          </motion.div>
        ) : (
          <>
            {/* Unread */}
            {unread.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">New</p>
                  <span className="bg-[#1B4FD8] text-white text-[10px] font-bold rounded-full px-1.5 py-0.5">
                    {unread.length}
                  </span>
                </div>
                <div className="space-y-3">
                  <AnimatePresence>
                    {unread.map((n) => (
                      <NotifCard key={n.id} notif={n} onRead={markNotificationRead} onDelete={deleteNotification} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Read history */}
            {read.length > 0 && (
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                  {unread.length > 0 ? "Earlier" : "Notification History"}
                </p>
                <div className="space-y-3">
                  {read.map((n) => (
                    <NotifCard key={n.id} notif={n} onRead={markNotificationRead} onDelete={deleteNotification} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
