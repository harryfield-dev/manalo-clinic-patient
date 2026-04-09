import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  CalendarClock,
  CalendarPlus,
  CheckCircle,
  ChevronRight,
  Clock,
  MapPin,
  Megaphone,
  MessageCircle,
  Stethoscope,
  TrendingUp,
  User,
  Wifi,
  Ban,
  XCircle,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { OnboardingTutorial } from "../components/OnboardingTutorial";
import { useApp, type AppointmentStatus } from "../context/AppContext";
import { getClinicStatus, getClinicWeekdayIndex, type ClinicScheduleEntry } from "../lib/clinicStatusLive";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

export const statusConfig: Record<
  AppointmentStatus,
  { label: string; color: string; bg: string; border: string; icon: React.ReactNode }
> = {
  Pending: {
    label: "Pending",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <AlertCircle size={13} />,
  },
  Approved: {
    label: "Approved",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    icon: <CheckCircle size={13} />,
  },
  Rejected: {
    label: "Rejected",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <XCircle size={13} />,
  },
  Completed: {
    label: "Completed",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <CheckCircle size={13} />,
  },
  Cancelled: {
    label: "Cancelled",
    color: "text-gray-500",
    bg: "bg-gray-50",
    border: "border-gray-200",
    icon: <Ban size={13} />,
  },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const cfg = statusConfig[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${cfg.color} ${cfg.bg} ${cfg.border}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

export function ModeBadge({ mode }: { mode: "Online" | "Walk-in" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${mode === "Online" ? "bg-[#E8F1FF] text-[#1B4FD8]" : "bg-indigo-50 text-indigo-700"
        }`}
    >
      {mode === "Online" ? <Wifi size={10} /> : <User size={10} />}
      {mode}
    </span>
  );
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-100 ${className}`} />;
}

function toStatus(status?: string | null): AppointmentStatus {
  switch (status?.toLowerCase()) {
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "completed":
      return "Completed";
    case "cancelled":
    case "canceled":
      return "Cancelled";
    default:
      return "Pending";
  }
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type PatientInfo = {
  id: string;
  email: string;
  fullName: string;
};

type DashboardStats = {
  pending: number;
  upcoming: number;
  completed: number;
  unreadNotifications: number;
  unreadMessages: number;
};

type ClinicHours = {
  dayRange: string;
  hours: string;
  address: string;
  schedule: ClinicScheduleEntry[];
};

type AssignedDoctor = {
  doctorName: string;
  specialty: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
};

type ClinicAnnouncement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

type RecentAppointment = {
  id: string;
  consultationType: string;
  doctorName: string;
  specialty: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  mode: "Online" | "Walk-in";
};

const defaultStats: DashboardStats = {
  pending: 0,
  upcoming: 0,
  completed: 0,
  unreadNotifications: 0,
  unreadMessages: 0,
};

const weekKeys = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const weekLabels: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

const weekdayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export function Dashboard() {
  const navigate = useNavigate();
  const { profile, clinicAddress, clinicSchedule } = useApp();

  const [patient, setPatient] = useState<PatientInfo | null>(null);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [clinicHours, setClinicHours] = useState<ClinicHours | null>(null);
  const [assignedDoctor, setAssignedDoctor] = useState<AssignedDoctor | null>(null);
  const [announcement, setAnnouncement] = useState<ClinicAnnouncement | null>(null);
  const [recentAppointments, setRecentAppointments] = useState<RecentAppointment[]>([]);
  const [now, setNow] = useState(() => new Date());

  const [statsLoading, setStatsLoading] = useState(true);
  const [clinicHoursLoading, setClinicHoursLoading] = useState(true);
  const [assignedDoctorLoading, setAssignedDoctorLoading] = useState(true);
  const [announcementLoading, setAnnouncementLoading] = useState(true);
  const [recentAppointmentsLoading, setRecentAppointmentsLoading] = useState(true);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadPatient = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active || !user?.id || !user.email) return;

      const { data } = await supabase
        .from("patients")
        .select("full_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      const nextPatient = {
        id: user.id,
        email: data?.email || user.email,
        fullName: data?.full_name || profile.fullName || "",
      };

      setPatient(nextPatient);

      const ts = sessionStorage.getItem("login_welcome_ts");
      if (ts && nextPatient.fullName) {
        sessionStorage.removeItem("login_welcome_ts");
        const loginDate = new Date(ts);
        const dateStr = loginDate.toLocaleDateString("en-PH", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        const timeStr = loginDate.toLocaleTimeString("en-PH", {
          hour: "2-digit",
          minute: "2-digit",
        });
        toast(`Welcome back, ${nextPatient.fullName}! You logged in on ${dateStr} at ${timeStr}.`, {
          duration: 7000,
        });
      }
    };

    void loadPatient();

    return () => {
      active = false;
    };
  }, [profile.fullName]);

  useEffect(() => {
    if (!patient?.id || !patient.email) return;
    let active = true;

    const loadStats = async () => {
      setStatsLoading(true);
      const [pending, upcoming, completed, notifications, messages] = await Promise.all([
        supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("patient_id", patient.id)
          .eq("status", "pending"),
        supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("patient_id", patient.id)
          .eq("status", "approved"),
        supabase
          .from("appointments")
          .select("*", { count: "exact", head: true })
          .eq("patient_id", patient.id)
          .eq("status", "completed"),
        supabase
          .from("notifications")
          .select("*", { count: "exact", head: true })
          .eq("patient_email", patient.email)
          .eq("read", false),
        supabase
          .from("chat_messages")
          .select("*", { count: "exact", head: true })
          .eq("patient_email", patient.email)
          .in("sender_type", ["admin", "staff"])
          .eq("read", false),
      ]);

      if (!active) return;

      setStats({
        pending: pending.count ?? 0,
        upcoming: upcoming.count ?? 0,
        completed: completed.count ?? 0,
        unreadNotifications: notifications.count ?? 0,
        unreadMessages: messages.count ?? 0,
      });
      setStatsLoading(false);
    };

    const loadAssignedDoctor = async () => {
      setAssignedDoctorLoading(true);
      const { data } = await supabase
        .from("appointments")
        .select("doctor_name, date, time, status")
        .eq("patient_id", patient.id)
        .in("status", ["pending", "approved"])
        .order("date", { ascending: true })
        .order("time", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (!data?.doctor_name) {
        setAssignedDoctor(null);
        setAssignedDoctorLoading(false);
        return;
      }

      const { data: doctor } = await supabase
        .from("doctors")
        .select("specialization")
        .eq("name", data.doctor_name)
        .maybeSingle();

      if (!active) return;

      setAssignedDoctor({
        doctorName: data.doctor_name,
        specialty: doctor?.specialization || "General Medicine",
        appointmentDate: data.date,
        appointmentTime: data.time,
        status: toStatus(data.status),
      });
      setAssignedDoctorLoading(false);
    };

    const loadAnnouncement = async () => {
      setAnnouncementLoading(true);
      const { data } = await supabase
        .from("announcements")
        .select("id, title, body, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!active) return;

      setAnnouncement(data ?? null);
      setAnnouncementLoading(false);
    };

    const loadRecentAppointments = async () => {
      setRecentAppointmentsLoading(true);
      const { data } = await supabase
        .from("appointments")
        .select("id, doctor_name, date, time, type, status")
        .eq("patient_id", patient.id)
        .order("date", { ascending: false })
        .order("time", { ascending: false })
        .limit(3);

      if (!active) return;

      if (!data?.length) {
        setRecentAppointments([]);
        setRecentAppointmentsLoading(false);
        return;
      }

      const doctorNames = [...new Set(data.map((row) => row.doctor_name).filter(Boolean))];
      const { data: doctors } = await supabase
        .from("doctors")
        .select("name, specialization")
        .in("name", doctorNames);

      if (!active) return;

      const doctorMap = new Map(
        (doctors ?? []).map((doctor) => [doctor.name, doctor.specialization || "General Medicine"]),
      );

      setRecentAppointments(
        data.map((row) => ({
          id: row.id,
          consultationType: row.type || "Consultation",
          doctorName: row.doctor_name || "Clinic Doctor",
          specialty: doctorMap.get(row.doctor_name || "") || "General Medicine",
          date: row.date,
          time: row.time,
          status: toStatus(row.status),
          mode: "Online",
        })),
      );
      setRecentAppointmentsLoading(false);
    };

    void loadStats();
    void loadAssignedDoctor();
    void loadAnnouncement();
    void loadRecentAppointments();

    return () => {
      active = false;
    };
  }, [patient?.id, patient?.email]);

  useEffect(() => {
    let active = true;

    const loadClinicHours = async () => {
      setClinicHoursLoading(true);

      const { data } = await supabase
        .from("clinic_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!active) return;

      const schedule = weekKeys.map((day, index) => {
        const fallbackHours = clinicSchedule[index]?.hours || "Closed";
        const rawHours =
          typeof data?.[day] === "string" && data[day].trim() !== ""
            ? data[day].trim()
            : fallbackHours;

        return {
          day: day.charAt(0).toUpperCase() + day.slice(1),
          hours: rawHours,
          closed: rawHours.toLowerCase() === "closed",
        };
      });

      const openDays = schedule.filter((entry) => !entry.closed);
      const firstOpenDay = openDays[0]?.day.toLowerCase();
      const lastOpenDay = openDays[openDays.length - 1]?.day.toLowerCase();

      setClinicHours({
        dayRange:
          firstOpenDay && lastOpenDay
            ? `${weekLabels[firstOpenDay]}${openDays.length > 1 ? ` - ${weekLabels[lastOpenDay]}` : ""}`
            : "Clinic closed",
        hours: openDays[0]?.hours || "Hours unavailable",
        address:
          typeof data?.address === "string" && data.address.trim() !== "" ? data.address.trim() : clinicAddress,
        schedule,
      });
      setClinicHoursLoading(false);
    };

    void loadClinicHours();

    return () => {
      active = false;
    };
  }, [clinicAddress, clinicSchedule]);

  const clinicStatus = clinicHours ? getClinicStatus(clinicHours.schedule, now) : null;
  const todayLabel = weekdayNames[getClinicWeekdayIndex(now)];
  const todayHours =
    clinicHours?.schedule.find((entry) => entry.day.toLowerCase() === todayLabel.toLowerCase())?.hours || "Closed";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = patient?.fullName.trim().split(/\s+/)[0] || profile.fullName.trim().split(/\s+/)[0] || "Patient";

  const statCards = [
    {
      label: "Pending",
      value: stats.pending,
      desc: "Awaiting review",
      icon: <AlertCircle size={22} />,
      click: "/appointments",
      lightBg: "bg-amber-50",
      iconColor: "text-amber-600",
      gradient: "from-amber-500 to-orange-400",
    },
    {
      label: "Upcoming",
      value: stats.upcoming,
      desc: "Approved visits",
      icon: <CalendarClock size={22} />,
      click: "/appointments",
      lightBg: "bg-[#E8F1FF]",
      iconColor: "text-[#1B4FD8]",
      gradient: "from-[#1B4FD8] to-[#3A86FF]",
    },
    {
      label: "Completed",
      value: stats.completed,
      desc: "Visits done",
      icon: <CheckCircle size={22} />,
      click: "/appointments",
      lightBg: "bg-teal-50",
      iconColor: "text-teal-600",
      gradient: "from-teal-500 to-emerald-400",
    },
    {
      label: "Unread Notifications",
      value: stats.unreadNotifications,
      desc: "Needs attention",
      icon: <Bell size={22} />,
      click: "/notifications",
      lightBg: "bg-violet-50",
      iconColor: "text-violet-600",
      gradient: "from-violet-500 to-indigo-500",
    },
    {
      label: "Unread Messages",
      value: stats.unreadMessages,
      desc: "Staff replies",
      icon: <MessageCircle size={22} />,
      click: "/chat",
      lightBg: "bg-sky-50",
      iconColor: "text-sky-600",
      gradient: "from-sky-500 to-cyan-500",
    },
  ];

  return (
    <DashboardLayout title="Dashboard">
      <OnboardingTutorial />

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          data-tutorial="dashboard-greeting"
        >
          <p className="mb-0.5 text-xs font-medium uppercase tracking-widest text-gray-400">{greeting}</p>
          <h2
            className="text-[#0A2463]"
            style={{ fontFamily: "Playfair Display, serif", fontSize: "1.5rem", fontWeight: 700 }}
          >
            {firstName}
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
          {statsLoading
            ? statCards.map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-gray-100 bg-white p-5"
                style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.06)" }}
              >
                <Skeleton className="mb-4 h-12 w-12" />
                <Skeleton className="mb-2 h-7 w-14" />
                <Skeleton className="mb-1 h-3 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))
            : statCards.map((card) => (
              <motion.button
                key={card.label}
                whileHover={{ y: -3, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(card.click)}
                className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 text-left"
                style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.06)" }}
              >
                <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${card.gradient} opacity-10`} />
                <div className={`relative mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${card.lightBg} ${card.iconColor}`}>
                  {card.icon}
                </div>
                <p className="text-[1.7rem] font-extrabold leading-none text-[#0A2463]">{card.value}</p>
                <p className="text-xs font-semibold text-gray-500">{card.label}</p>
                <p className="text-[11px] text-gray-300">{card.desc}</p>
              </motion.button>
            ))}
        </div>

        {announcementLoading ? (
          <div className="rounded-2xl border border-gray-100 bg-white p-5" style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.06)" }}>
            <div className="flex items-start gap-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          </div>
        ) : announcement ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0A2463] via-[#0F3080] to-[#1B4FD8] p-5 text-white"
          >
            <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white opacity-5" />
            <div className="relative flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                <Megaphone size={18} className="text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-white/60">Clinic Announcement</p>
                <p className="text-sm font-bold leading-snug">{announcement.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/70">{announcement.body}</p>
              </div>
              <span className="hidden text-[10px] text-white/30 sm:block">
                {new Date(announcement.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
              </span>
            </div>
          </motion.div>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
            style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.06)" }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F1FF]">
                  <Clock size={14} className="text-[#1B4FD8]" />
                </div>
                <h3 className="text-sm font-bold text-[#0A2463]">Clinic Hours</h3>
              </div>
              {clinicHoursLoading ? (
                <Skeleton className="h-6 w-24 rounded-full" />
              ) : (
                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${clinicStatus?.isOpen ? "border-teal-200 bg-teal-50 text-teal-700" : "border-red-200 bg-red-50 text-red-600"}`}>
                  {clinicStatus?.title || "Closed"}
                </span>
              )}
            </div>
            <div className="space-y-4 px-5 py-5">
              {clinicHoursLoading ? (
                <>
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </>
              ) : clinicHours ? (
                <>
                  <div className="rounded-2xl bg-[#F8FAFF] p-4">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-gray-400">{todayLabel}</p>
                    <p className="text-lg font-bold text-[#0A2463]">{todayHours}</p>
                    <p className="mt-1 text-xs text-gray-400">Regular schedule: {clinicHours.dayRange} • {clinicHours.hours}</p>
                    {clinicStatus ? (
                      <p className={`mt-2 text-xs font-semibold ${clinicStatus.isOpen ? "text-teal-600" : "text-red-500"}`}>
                        {clinicStatus.detail}
                      </p>
                    ) : null}
                  </div>
                  <div className="rounded-2xl border border-gray-100 p-4">
                    <p className="text-sm font-semibold text-[#0A2463]">Before your visit</p>
                    <p className="mt-1 text-xs leading-relaxed text-gray-500">Please arrive 10 minutes early before your consultation.</p>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-gray-400">
                    <MapPin size={12} className="mt-0.5 shrink-0" />
                    <span>{clinicHours.address}</span>
                  </div>
                </>
              ) : null}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white"
            style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.06)" }}
          >
            <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50">
                <Stethoscope size={14} className="text-teal-600" />
              </div>
              <h3 className="text-sm font-bold text-[#0A2463]">Assigned Doctor</h3>
            </div>
            <div className="px-5 py-5">
              {assignedDoctorLoading ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-14 w-14 rounded-2xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                  <Skeleton className="h-14 w-full" />
                </div>
              ) : assignedDoctor ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8F1FF] to-[#EEF4FF]">
                      <User size={24} className="text-[#1B4FD8]" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#0A2463]">{assignedDoctor.doctorName}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{assignedDoctor.specialty}</p>
                      <div className="mt-2"><StatusBadge status={assignedDoctor.status} /></div>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[#F8FAFF] p-3">
                    <p className="mb-1 text-xs text-gray-400">Appointment schedule</p>
                    <p className="text-sm font-bold text-[#0A2463]">{formatDate(assignedDoctor.appointmentDate)} • {assignedDoctor.appointmentTime}</p>
                  </div>
                  <button onClick={() => navigate("/appointments")} className="flex items-center gap-1 text-xs font-semibold text-[#1B4FD8] hover:text-[#0A2463]">
                    View appointment <ArrowRight size={12} />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center py-6 text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8F1FF] to-[#EEF4FF]">
                    <Stethoscope size={22} className="text-[#1B4FD8]" />
                  </div>
                  <p className="text-sm font-bold text-[#0A2463]">No assigned doctor yet</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-400">Book an appointment to get matched with one of our clinic doctors.</p>
                  <button onClick={() => navigate("/book")} className="mt-4 rounded-xl px-4 py-2 text-xs font-semibold text-white" style={{ background: "linear-gradient(135deg, #1B4FD8, #0A2463)" }}>
                    Book Now
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="xl:col-span-2">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                { label: "Book Appointment", sub: "Schedule a visit", icon: <CalendarPlus size={20} />, path: "/book", background: "linear-gradient(135deg, #1B4FD8, #0A2463)" },
                { label: "My Appointments", sub: "View your visits", icon: <CalendarClock size={20} />, path: "/appointments", background: "linear-gradient(135deg, #0d9488, #059669)" },
                { label: "Contact Clinic", sub: "Chat with staff", icon: <MessageCircle size={20} />, path: "/chat", background: "linear-gradient(135deg, #0284c7, #1d4ed8)" },
              ].map((action) => (
                <motion.button
                  key={action.label}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(action.path)}
                  className="relative overflow-hidden rounded-2xl p-4 text-left text-white"
                  style={{ background: action.background, boxShadow: "0 6px 20px rgba(10,36,99,0.18)" }}
                >
                  <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white opacity-5" />
                  <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">{action.icon}</div>
                  <p className="text-sm font-bold">{action.label}</p>
                  <p className="mt-0.5 text-xs text-white/70">{action.sub}</p>
                </motion.button>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="overflow-hidden rounded-2xl border border-gray-100 bg-white xl:col-span-2"
            style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.06)" }}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F1FF]">
                  <TrendingUp size={14} className="text-[#1B4FD8]" />
                </div>
                <h3 className="text-sm font-bold text-[#0A2463]">Recent Appointments</h3>
              </div>
              {!recentAppointmentsLoading && recentAppointments.length > 0 && (
                <button onClick={() => navigate("/appointments")} className="flex items-center gap-0.5 text-xs font-medium text-[#1B4FD8] hover:text-[#0A2463]">
                  View all <ChevronRight size={13} />
                </button>
              )}
            </div>

            {recentAppointmentsLoading ? (
              <div className="space-y-3 px-6 py-6">
                {[0, 1, 2].map((item) => (
                  <div key={item} className="flex items-center gap-4 rounded-2xl border border-gray-50 p-4">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentAppointments.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-14 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#E8F1FF] to-[#EEF4FF]">
                  <CalendarPlus size={28} className="text-[#1B4FD8]" />
                </div>
                <p className="mb-1 text-sm font-bold text-[#0A2463]">No appointments yet</p>
                <p className="max-w-xs text-xs leading-relaxed text-gray-400">When you book your first visit, your latest appointment details will appear here.</p>
                <button
                  onClick={() => navigate("/book")}
                  className="mt-5 flex items-center gap-1.5 rounded-xl px-6 py-2.5 text-xs font-semibold text-white"
                  style={{ background: "linear-gradient(135deg, #1B4FD8, #0A2463)", boxShadow: "0 4px 16px rgba(27,79,216,0.3)" }}
                >
                  <CalendarPlus size={14} /> Book Now
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex flex-col gap-3 px-6 py-4 transition-colors hover:bg-[#F8FAFF] md:flex-row md:items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#E8F1FF] to-[#EEF4FF]">
                      <CalendarClock size={17} className="text-[#1B4FD8]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0A2463]">{appointment.consultationType}</p>
                      <p className="mt-0.5 truncate text-xs text-gray-400">{appointment.doctorName} • {appointment.specialty}</p>
                      <p className="mt-1 text-xs text-gray-400">{formatDate(appointment.date)} • {appointment.time}</p>
                    </div>
                    <div className="flex items-center gap-2 md:flex-col md:items-end">
                      <StatusBadge status={appointment.status} />
                      <ModeBadge mode={appointment.mode} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
