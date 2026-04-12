import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  CalendarDays,
  Stethoscope,
  ClipboardCheck,
  Check,
  ArrowLeft,
  ArrowRight,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Wifi,
  AlertCircle,
  Users,
  UploadCloud,
  FileText,
  X,
  ShieldCheck,
  Clock,
  CalendarX,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import {
  useApp,
  MAX_SLOT_CAPACITY,
} from "../context/AppContext";
import { supabase } from "../lib/supabase";

// ── Consultation types ────────────────────────────────────────────────
const CONSULTATION_TYPES = [
  "General Check-up",
  "Follow-up",
  "Lab Interpretation",
];

const steps = [
  { label: "Personal Info", icon: User },
  { label: "Schedule", icon: CalendarDays },
  { label: "Details", icon: Stethoscope },
  { label: "Review", icon: ClipboardCheck },
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const LUNCH_HOUR_SLOTS = new Set(["12:00 PM", "12:30 PM"]);

function getDaysInMonth(y: number, m: number) {
  return new Date(y, m + 1, 0).getDate();
}
function getFirstDay(y: number, m: number) {
  return new Date(y, m, 1).getDay();
}

// Parse clinic_settings hours string like "7:00 AM – 3:00 PM" or "Closed"
function parseClinicHours(hours: string): { openH: number; openM: number; closeH: number; closeM: number } | null {
  if (!hours || hours.toLowerCase() === "closed") return null;
  // Supports "7:00 AM – 3:00 PM" or "7:00 AM - 3:00 PM"
  const match = hours.match(/(\d+):(\d+)\s*(AM|PM)\s*[–\-]\s*(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let openH = parseInt(match[1]);
  const openM = parseInt(match[2]);
  const openPeriod = match[3].toUpperCase();
  let closeH = parseInt(match[4]);
  const closeM = parseInt(match[5]);
  const closePeriod = match[6].toUpperCase();
  if (openPeriod === "PM" && openH !== 12) openH += 12;
  if (openPeriod === "AM" && openH === 12) openH = 0;
  if (closePeriod === "PM" && closeH !== 12) closeH += 12;
  if (closePeriod === "AM" && closeH === 12) closeH = 0;
  return { openH, openM, closeH, closeM };
}

// Generate 30-min time slots between open and close
function generateSlotsFromHours(hours: string): string[] {
  const parsed = parseClinicHours(hours);
  if (!parsed) return [];
  const { openH, openM, closeH, closeM } = parsed;
  const slots: string[] = [];
  let totalMins = openH * 60 + openM;
  const endMins = closeH * 60 + closeM;
  while (totalMins < endMins) {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    const period = h < 12 ? "AM" : "PM";
    const display12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const mStr = m === 0 ? "00" : "30";
    slots.push(`${display12}:${mStr} ${period}`);
    totalMins += 30;
  }
  return slots;
}

// Parse slot string like "7:00 AM" to {h, m} in 24h
function parseSlot(slot: string): { h: number; m: number } {
  const [timePart, period] = slot.split(" ");
  let h = parseInt(timePart.split(":")[0]);
  const m = parseInt(timePart.split(":")[1]);
  if (period === "PM" && h !== 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return { h, m };
}

// Is this slot in the past (for today)?
function isSlotPast(slot: string, dateStr: string): boolean {
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  if (dateStr !== todayStr) return false; // Not today → never past
  const { h, m } = parseSlot(slot);
  const nowH = today.getHours();
  const nowM = today.getMinutes();
  return h < nowH || (h === nowH && m <= nowM);
}

// ── MiniCalendar ───────────────────────────────────────────────────────
function MiniCalendar({
  selectedDate,
  onChange,
  closedDays, // 0=Sun..6=Sat indices of closed days
}: {
  selectedDate: string;
  onChange: (d: string) => void;
  closedDays: number[];
}) {
  const today = new Date();
  const [vYear, setVYear] = useState(today.getFullYear());
  const [vMonth, setVMonth] = useState(today.getMonth());

  const days = getDaysInMonth(vYear, vMonth);
  const firstDay = getFirstDay(vYear, vMonth);

  const prev = () => {
    if (vMonth === 0) { setVMonth(11); setVYear((y) => y - 1); }
    else setVMonth((m) => m - 1);
  };
  const next = () => {
    if (vMonth === 11) { setVMonth(0); setVYear((y) => y + 1); }
    else setVMonth((m) => m + 1);
  };

  const toISO = (d: number) =>
    `${vYear}-${String(vMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const isDisabled = (d: number) => {
    const date = new Date(vYear, vMonth, d);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (date < todayStart) return true;
    // Check closed days from clinic schedule
    if (closedDays.includes(date.getDay())) return true;
    return false;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prev}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-[#0A2463]">
          {MONTH_NAMES[vMonth]} {vYear}
        </span>
        <button
          onClick={next}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {DAY_NAMES.map((d) => (
          <div key={d} className="text-center text-xs text-gray-400 py-1 font-medium">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const day = i + 1;
          const iso = toISO(day);
          const disabled = isDisabled(day);
          const selected = selectedDate === iso;
          const isToday =
            day === today.getDate() &&
            vMonth === today.getMonth() &&
            vYear === today.getFullYear();
          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => onChange(iso)}
              className={`aspect-square flex items-center justify-center rounded-full text-xs transition-all duration-150 ${selected
                ? "bg-[#1B4FD8] text-white font-semibold shadow-md"
                : disabled
                  ? "text-gray-300 cursor-not-allowed"
                  : isToday
                    ? "text-[#1B4FD8] font-semibold ring-1 ring-[#1B4FD8] hover:bg-[#E8F1FF]"
                    : "text-gray-700 hover:bg-[#E8F1FF] hover:text-[#1B4FD8]"
                }`}
            >
              {day}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 text-center mt-3 flex items-center justify-center gap-1">
        <AlertCircle size={11} /> Clinic closed days are unavailable
      </p>
    </div>
  );
}

// ── Slot grid grouped by hour ─────────────────────────────────────────
function SlotGrid({
  date,
  selected,
  onSelect,
  clinicSlots,
  globalSlotCounts,
}: {
  date: string;
  selected: string;
  onSelect: (t: string) => void;
  clinicSlots: string[];
  globalSlotCounts: Record<string, number>;
}) {
  const getCount = (slot: string) => globalSlotCounts[`${date}|${slot}`] ?? 0;
  const isFull = (slot: string) => getCount(slot) >= MAX_SLOT_CAPACITY;
  const isLunchHour = (slot: string) => LUNCH_HOUR_SLOTS.has(slot);

  // Group by hour
  const groupedSlots: Record<string, string[]> = {};
  clinicSlots.forEach((slot) => {
    const [timePart, period] = slot.split(" ");
    const hour = timePart.split(":")[0];
    const hourKey = `${hour} ${period}`;
    if (!groupedSlots[hourKey]) groupedSlots[hourKey] = [];
    groupedSlots[hourKey].push(slot);
  });

  return (
    <div className="space-y-5 mt-4">
      {Object.entries(groupedSlots).map(([hourLabel, slots]) => {
        const hourLunch = slots.every((slot) => isLunchHour(slot));
        const hourFull = slots.every((slot) => isFull(slot) || isLunchHour(slot));
        const allPast = slots.every((slot) => isSlotPast(slot, date));
        const availableSlots = slots.filter((s) => !isFull(s) && !isSlotPast(s, date) && !isLunchHour(s)).length;

        return (
          <div key={hourLabel}>
            {/* Hour header */}
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`text-xs font-bold px-3 py-1 rounded-lg ${hourLunch
                  ? "bg-amber-100 text-amber-700"
                  : allPast
                  ? "bg-gray-100 text-gray-400"
                  : hourFull
                    ? "bg-red-100 text-red-600"
                    : "bg-[#E8F1FF] text-[#1B4FD8]"
                  }`}
              >
                {hourLabel}
              </span>
              {hourLunch && (
                <span className="text-[11px] font-medium text-amber-700">Lunch hour</span>
              )}

            </div>

            {/* Slot buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {slots.map((slot) => {
                const count = getCount(slot);
                const full = isFull(slot);
                const past = isSlotPast(slot, date);
                const lunchHour = isLunchHour(slot);
                const disabled = full || past || lunchHour;
                const sel = selected === slot;
                const remaining = MAX_SLOT_CAPACITY - count;

                let btnClass = "";
                if (lunchHour) {
                  btnClass = "bg-amber-50 text-amber-700 cursor-not-allowed border border-amber-200";
                } else if (past) {
                  btnClass = "bg-gray-100 text-gray-300 cursor-not-allowed border border-gray-200";
                } else if (full) {
                  btnClass = "bg-red-50 text-red-400 cursor-not-allowed border border-red-200";
                } else if (sel) {
                  btnClass = "bg-[#1B4FD8] text-white shadow-md shadow-[#1B4FD8]/20 border border-[#1B4FD8]";
                } else if (remaining === 1) {
                  btnClass = "bg-amber-50 text-amber-800 border border-amber-300 hover:border-amber-400";
                } else {
                  btnClass = "bg-[#F4F7FF] text-gray-700 border border-transparent hover:bg-[#E8F1FF] hover:text-[#1B4FD8] hover:border-[#1B4FD8]/30";
                }

                return (
                  <button
                    key={slot}
                    disabled={disabled}
                    onClick={() => onSelect(slot)}
                    className={`py-3 px-3 rounded-xl text-xs font-medium transition-all duration-200 flex flex-col items-center gap-1 ${btnClass}`}
                  >
                    <span className="font-semibold">{slot}</span>
                    {lunchHour ? (
                      <span className="text-[10px] text-amber-700 font-bold">Lunch hour</span>
                    ) : past ? (
                      <span className="text-[10px] text-gray-400">Passed</span>
                    ) : full ? (
                      <span className="text-[10px] text-red-400 font-bold">FULL</span>
                    ) : (
                      <span className={`text-[10px] flex items-center gap-0.5 ${sel ? "text-white/70" : remaining === 1 ? "text-amber-600" : "text-gray-400"}`}>
                        <Users size={9} />
                        {remaining} spot{remaining !== 1 ? "s" : ""} left
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export function BookAppointment() {
  const navigate = useNavigate();
  const { profile, addAppointment, clinicSchedule, hasAppointmentOnDate } = useApp();
  const duplicateDateMessage = "You already have an appointment on this date. Only one appointment per day is allowed.";
  const missingTimeMessage = "Please select a time slot.";
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showDuplicateDateModal, setShowDuplicateDateModal] = useState(false);
  const [showTimeSlotModal, setShowTimeSlotModal] = useState(false);
  const [checkingTodayAppointment, setCheckingTodayAppointment] = useState(true);
  const [hasTodayAppointment, setHasTodayAppointment] = useState(false);

  // Dynamic doctors from DB
  const [doctors, setDoctors] = useState<{ name: string; specialty: string; status: string }[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);

  // Global slot booking counts from ALL patients (for accurate capacity display)
  const [globalSlotCounts, setGlobalSlotCounts] = useState<Record<string, number>>({});

  const refreshGlobalSlots = useCallback(async () => {
    const { data } = await supabase
      .from("appointments")
      .select("date, time, status");
    if (!data) return;

    const map: Record<string, number> = {};
    for (const apt of data) {
      const status = apt.status?.toLowerCase();
      if (status !== "cancelled" && status !== "rejected") {
        const key = `${apt.date}|${apt.time}`;
        map[key] = (map[key] ?? 0) + 1;
      }
    }

    setGlobalSlotCounts(map);
  }, []);

  const refreshTodayAppointmentStatus = useCallback(async () => {
    if (!profile.email) {
      setHasTodayAppointment(false);
      setCheckingTodayAppointment(false);
      return;
    }

    setCheckingTodayAppointment(true);
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
    const { data } = await supabase
      .from("appointments")
      .select("id")
      .eq("patient_email", profile.email)
      .eq("date", today)
      .neq("status", "cancelled")
      .neq("status", "rejected");

    setHasTodayAppointment((data?.length ?? 0) > 0);
    setCheckingTodayAppointment(false);
  }, [profile.email]);

  useEffect(() => {
    void refreshGlobalSlots();
  }, [refreshGlobalSlots]);

  useEffect(() => {
    void refreshTodayAppointmentStatus();
  }, [refreshTodayAppointmentStatus]);

  useEffect(() => {
    const channel = supabase
      .channel("booking-calendar-live")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        () => {
          void refreshGlobalSlots();
          void refreshTodayAppointmentStatus();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refreshGlobalSlots, refreshTodayAppointmentStatus]);

  // Fetch doctors from Supabase (active + on_leave)
  useEffect(() => {
    const fetchDoctors = async () => {
      setLoadingDoctors(true);
      const { data, error } = await supabase
        .from("doctors")
        .select("name, specialization, status")
        .in("status", ["active", "on_leave"])
        .order("name", { ascending: true });
      if (!error && data) {
        setDoctors(data.map((d: any) => ({ name: d.name, specialty: d.specialization, status: d.status })));
      }
      setLoadingDoctors(false);
    };
    fetchDoctors();
  }, []);

  // Compute closed days from clinic schedule (0=Sun..6=Sat)
  const closedDays: number[] = clinicSchedule
    .filter((s) => s.closed || s.hours === "Closed" || !s.hours)
    .map((s) => ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].indexOf(s.day));

  // Get clinic slots for selected date
  const getSlotsForDate = (dateStr: string): string[] => {
    if (!dateStr) return [];
    const dayIndex = new Date(dateStr + "T12:00:00").getDay();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[dayIndex];
    const schedEntry = clinicSchedule.find((s) => s.day === dayName);
    if (!schedEntry || schedEntry.closed || !schedEntry.hours || schedEntry.hours === "Closed") return [];
    return generateSlotsFromHours(schedEntry.hours);
  };

  const [form, setForm] = useState({
    firstName: profile.fullName.split(" ").slice(0, -1).join(" ") || profile.fullName,
    lastName: profile.fullName.split(" ").slice(-1).join(" "),
    contactNumber: profile.contactNumber,
    email: profile.email,
    date: "",
    time: "",
    doctor: "",
    consultationType: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync form fields when profile loads from Supabase (async)
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      firstName: prev.firstName || profile.fullName.split(" ").slice(0, -1).join(" ") || profile.fullName,
      lastName: prev.lastName || profile.fullName.split(" ").slice(-1).join(" "),
      contactNumber: prev.contactNumber || profile.contactNumber,
      email: prev.email || profile.email,
    }));
  }, [profile.fullName, profile.contactNumber, profile.email]);

  // Valid ID upload state
  const [validId, setValidId] = useState<File | null>(null);
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null);
  const [idError, setIdError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleIdFile = useCallback((file: File) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setIdError("Invalid file type. Please upload JPG, PNG, or PDF only.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setIdError("File size exceeds 5MB. Please upload a smaller file.");
      return;
    }
    setIdError("");
    setValidId(file);
    if (file.type !== "application/pdf") {
      setIdPreviewUrl(URL.createObjectURL(file));
    } else {
      setIdPreviewUrl(null);
    }
    setErrors((e) => { const n = { ...e }; delete n.validId; return n; });
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleIdFile(file);
    },
    [handleIdFile],
  );

  const removeId = () => {
    setValidId(null);
    setIdPreviewUrl(null);
    setIdError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const setField = (k: string, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => {
      const n = { ...e };
      delete n[k];
      return n;
    });
  };

  const handleDateChange = (date: string) => {
    if (hasAppointmentOnDate(date)) {
      setErrors((current) => {
        const nextErrors = { ...current };
        delete nextErrors.date;
        return nextErrors;
      });
      setShowDuplicateDateModal(true);
      return;
    }

    setField("date", date);
    setField("time", "");
  };

  const validate = () => {
    const e: Record<string, string> = {};
    let hasDuplicateDate = false;
    let hasMissingTime = false;
    if (step === 0) {
      if (!form.firstName) e.firstName = "Required";
      if (!form.lastName) e.lastName = "Required";
      if (!form.contactNumber) e.contactNumber = "Required";
      if (!form.email) e.email = "Required";
    }
    if (step === 1) {
      if (!form.date) e.date = "Please select a date";
      if (!form.time) {
        e.time = missingTimeMessage;
        hasMissingTime = true;
      }
      if (form.date && hasAppointmentOnDate(form.date)) {
        hasDuplicateDate = true;
      }
    }
    if (step === 2) {
      if (!form.doctor) e.doctor = "Please select a doctor";
      if (!form.consultationType) e.consultationType = "Please select a type";
      if (!validId) e.validId = "Please upload a valid government-issued ID";
    }
    setErrors(e);

    if (hasDuplicateDate) {
      setShowDuplicateDateModal(true);
      return false;
    }

    if (hasMissingTime) {
      setShowTimeSlotModal(true);
      return false;
    }

    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (!validate()) return;
    if (step === steps.length - 1) {
      setLoading(true);

      // Upload valid ID to Supabase Storage
      let uploadedIdUrl: string | undefined;
      if (validId) {
        try {
          const ext = validId.name.split(".").pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("valid-ids")
            .upload(fileName, validId, { cacheControl: "3600", upsert: false });

          if (!uploadError && uploadData) {
            const { data: urlData } = supabase.storage.from("valid-ids").getPublicUrl(uploadData.path);
            uploadedIdUrl = urlData?.publicUrl;
          } else {
            console.error("ID upload error:", uploadError);
          }
        } catch (err) {
          console.error("Storage upload failed:", err);
        }
      }

      await addAppointment({
        date: form.date,
        time: form.time,
        doctor: form.doctor,
        consultationType: form.consultationType,
        reason: "",
      }, uploadedIdUrl);

      setLoading(false);
      setDone(true);
    } else {
      setDir(1);
      setStep((s) => s + 1);
    }
  };

  const back = () => {
    setDir(-1);
    setStep((s) => s - 1);
  };

  const inp = (k: string) =>
    `w-full bg-[#F4F7FF] border ${errors[k]
      ? "border-red-400"
      : "border-transparent focus:border-[#1B4FD8]"
    } focus:bg-white rounded-xl px-4 py-3 text-sm text-gray-800 outline-none transition-all duration-200`;

  if (done) {
    return (
      <DashboardLayout title="Book Appointment">
        <div className="flex items-center justify-center min-h-[60vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-12 text-center max-w-sm w-full"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.1 }}
              className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-5"
            >
              <Check size={36} className="text-teal-600" />
            </motion.div>
            <h3
              className="text-[#0A2463] mb-2"
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "1.5rem",
                fontWeight: 700,
              }}
            >
              Appointment Submitted!
            </h3>
            <div className="space-y-3 mb-4">
              <div className="bg-[#E8F1FF] rounded-xl p-3 flex items-center justify-center gap-2">
                <Wifi size={15} className="text-[#1B4FD8]" />
                <span className="text-[#1B4FD8] text-xs font-semibold">
                  Online Appointment
                </span>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 flex items-center justify-center gap-2">
                <Clock size={15} className="text-amber-600" />
                <span className="text-amber-700 text-xs font-semibold">
                  Status Label: Pending Approval
                </span>
              </div>
            </div>
            <p className="text-gray-500 text-sm mb-2">
              Your appointment with{" "}
              <strong>{form.doctor}</strong> on{" "}
              <strong>
                {new Date(form.date + "T12:00:00").toLocaleDateString("en-PH", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </strong>{" "}
              at <strong>{form.time}</strong> is now{" "}
              <strong>Pending</strong> approval.
            </p>
            <p className="text-xs text-gray-400 mb-8">
              You'll receive a notification once approved by the clinic staff.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => navigate("/appointments")}
                className="bg-[#1B4FD8] hover:bg-[#0A2463] text-white py-3 rounded-xl text-sm uppercase tracking-wider transition-all"
              >
                View My Appointments
              </button>
              <button
                onClick={() => {
                  setDone(false);
                  setStep(0);
                  setForm({
                    firstName: profile.fullName.split(" ").slice(0, -1).join(" ") || profile.fullName,
                    lastName: profile.fullName.split(" ").slice(-1).join(" "),
                    contactNumber: profile.contactNumber,
                    email: profile.email,
                    date: "",
                    time: "",
                    doctor: "",
                    consultationType: "",
                  });
                }}
                className="text-gray-400 hover:text-gray-600 text-sm py-2 transition-colors"
              >
                Book Another
              </button>
            </div>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (checkingTodayAppointment) {
    return (
      <DashboardLayout title="Book Appointment">
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-sm w-full border border-gray-100"
          >
            <div className="w-16 h-16 rounded-full bg-[#E8F1FF] flex items-center justify-center mx-auto mb-5">
              <Loader2 size={30} className="text-[#1B4FD8] animate-spin" />
            </div>
            <h3
              className="text-[#0A2463] mb-3"
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "1.35rem",
                fontWeight: 700,
              }}
            >
              Checking Your Appointment
            </h3>
            <p className="text-gray-500 text-sm leading-relaxed">
              Please wait while we verify whether you already have an appointment scheduled for today.
            </p>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  if (hasTodayAppointment) {
    return (
      <DashboardLayout title="Book Appointment">
        <div className="flex items-center justify-center min-h-[60vh] px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl p-10 text-center max-w-sm w-full border border-gray-100"
          >
            <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
              <CalendarX size={32} className="text-red-500" />
            </div>
            <h3
              className="text-[#0A2463] mb-3"
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "1.4rem",
                fontWeight: 700,
              }}
            >
              Appointment Already Booked
            </h3>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              You already have an appointment scheduled for today. You can only book one appointment per day. Please check your appointments or come back tomorrow.
            </p>
            <button
              onClick={() => navigate("/appointments")}
              className="w-full bg-[#1B4FD8] hover:bg-[#0A2463] text-white py-3.5 rounded-xl text-sm font-semibold transition-all shadow-md shadow-[#1B4FD8]/20"
            >
              View My Appointments
            </button>
          </motion.div>
        </div>
      </DashboardLayout>
    );
  }

  const clinicSlots = getSlotsForDate(form.date);
  const progressPercent = ((step + 1) / steps.length) * 100;
  const selectedStep = steps[step];
  const SelectedStepIcon = selectedStep.icon;

  return (
    <DashboardLayout title="Book Appointment">
      <ConfirmModal
        open={showDuplicateDateModal}
        title="Appointment Already Exists"
        description={duplicateDateMessage}
        confirmLabel="OK"
        variant="danger"
        onConfirm={() => setShowDuplicateDateModal(false)}
        onCancel={() => setShowDuplicateDateModal(false)}
      />
      <ConfirmModal
        open={showTimeSlotModal}
        title="Time Slot Required"
        description={missingTimeMessage}
        confirmLabel="OK"
        variant="danger"
        onConfirm={() => setShowTimeSlotModal(false)}
        onCancel={() => setShowTimeSlotModal(false)}
      />
      <div className="max-w-6xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-[#0A2463] via-[#123a8d] to-[#1B4FD8] px-6 py-6 text-white shadow-[0_20px_60px_rgba(10,36,99,0.22)]"
        >
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -left-12 bottom-0 h-28 w-28 rounded-full bg-[#3A86FF]/30 blur-2xl" />
          <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_280px] lg:items-end">
            <div className="space-y-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold tracking-wide text-white/90">
                <Wifi size={14} />
                Online Appointment
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Guided Booking</p>
                <h2
                  className="mt-1 text-2xl text-white"
                  style={{ fontFamily: "Playfair Display, serif", fontWeight: 700 }}
                >
                  Book with Confidence
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/72">
                  Enjoy the same clinic vibe you love with a smoother, easier way to book that keeps you in control every step of the way.
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span>
                    Step {step + 1} of {steps.length}
                  </span>
                  <span>{Math.round(progressPercent)}% complete</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    animate={{ width: `${progressPercent}%` }}
                    transition={{ type: "spring", stiffness: 120, damping: 20 }}
                    className="h-full rounded-full bg-gradient-to-r from-teal-300 via-cyan-200 to-white"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <SelectedStepIcon size={20} />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Current Step</p>
                  <p className="text-base font-semibold text-white">{selectedStep.label}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {steps.map((s, i) => (
                  <div
                    key={s.label}
                    className={`rounded-2xl border px-3 py-2 text-xs transition-all ${i === step
                        ? "border-white/30 bg-white/15 text-white"
                        : i < step
                          ? "border-teal-300/35 bg-teal-300/10 text-teal-100"
                          : "border-white/10 bg-white/5 text-white/55"
                      }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <div
                        className={`flex h-6 w-6 items-center justify-center rounded-full ${i === step
                            ? "bg-white/20"
                            : i < step
                              ? "bg-teal-300/20"
                              : "bg-white/10"
                          }`}
                      >
                        {i < step ? <Check size={12} /> : <s.icon size={12} />}
                      </div>
                      <span className="font-medium">{s.label}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
        <div className="hidden">
          <Wifi size={15} className="text-[#1B4FD8]" />
          <span className="text-[#1B4FD8] text-xs font-semibold">
            Online Appointment — auto-tagged when you submit
          </span>
        </div>

        {/* Step indicators */}
        <div className="hidden">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${i < step
                    ? "bg-teal-500 text-white"
                    : i === step
                      ? "bg-[#1B4FD8] text-white shadow-lg shadow-[#1B4FD8]/30"
                      : "bg-gray-100 text-gray-400"
                    }`}
                >
                  {i < step ? <Check size={15} /> : <s.icon size={16} />}
                </div>
                <span
                  className={`text-xs hidden sm:block ${i === step ? "text-[#1B4FD8] font-medium" : "text-gray-400"
                    }`}
                >
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-all duration-500 ${i < step ? "bg-teal-500" : "bg-gray-200"
                    }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-[0_12px_40px_rgba(10,36,99,0.08)]">
            <div className="p-8 min-h-[400px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: dir * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: dir * -30 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  {/* Step 0 — Personal Info */}
                  {step === 0 && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[#0A2463] font-semibold mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
                          Personal Information
                        </p>
                        <p className="text-xs text-gray-400 mb-5">
                          Pre-filled from your profile. Update if needed.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-[#0A2463] mb-1.5">First Name</label>
                          <input
                            type="text"
                            value={form.firstName}
                            onChange={(e) => setField("firstName", e.target.value)}
                            className={inp("firstName")}
                          />
                          {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                        </div>
                        <div>
                          <label className="block text-sm text-[#0A2463] mb-1.5">Last Name</label>
                          <input
                            type="text"
                            value={form.lastName}
                            onChange={(e) => setField("lastName", e.target.value)}
                            className={inp("lastName")}
                          />
                          {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-[#0A2463] mb-1.5">Contact Number</label>
                          <input
                            type="tel"
                            value={form.contactNumber}
                            onChange={(e) => setField("contactNumber", e.target.value)}
                            className={inp("contactNumber")}
                          />
                          {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
                        </div>
                        <div>
                          <label className="block text-sm text-[#0A2463] mb-1.5">Email</label>
                          <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setField("email", e.target.value)}
                            className={inp("email")}
                          />
                          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 1 — Schedule */}
                  {step === 1 && (
                    <div>
                      <p className="text-[#0A2463] font-semibold mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
                        Select Date & Time
                      </p>
                      <p className="text-xs text-gray-400 mb-1">
                        Time slots are based on clinic schedule and sync live with the database. Each slot holds up to {MAX_SLOT_CAPACITY} patients.
                      </p>
                      {/* Legend */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-5">
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded bg-[#F4F7FF] border border-gray-200 inline-block" />
                          Available
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded bg-amber-100 border border-amber-200 inline-block" />
                          Filling up
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded bg-red-100 border border-red-200 inline-block" />
                          Full
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-3 h-3 rounded bg-gray-100 border border-gray-200 inline-block" />
                          Passed
                        </span>
                      </div>
                      {errors.date && <p className="text-red-500 text-xs mb-2">{errors.date}</p>}
                      {errors.time && <p className="text-red-500 text-xs mb-2">{errors.time}</p>}

                      <MiniCalendar
                        selectedDate={form.date}
                        onChange={handleDateChange}
                        closedDays={closedDays}
                      />

                      {form.date && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-5"
                        >

                          <p className="text-sm text-[#0A2463] font-medium mb-3">
                            Available slots for{" "}
                            {new Date(form.date + "T12:00:00").toLocaleDateString("en-PH", {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                            })}
                            :
                          </p>
                          {clinicSlots.length === 0 ? (
                            <div className="bg-gray-50 rounded-xl p-6 text-center text-gray-400 text-sm">
                              No available time slots for this day.
                            </div>
                          ) : (
                            <SlotGrid
                              date={form.date}
                              selected={form.time}
                              onSelect={(t) => setField("time", t)}
                              clinicSlots={clinicSlots}
                              globalSlotCounts={globalSlotCounts}
                            />
                          )}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {/* Step 2 — Details */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div>
                        <p className="text-[#0A2463] font-semibold mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
                          Consultation Details
                        </p>
                        <p className="text-xs text-gray-400 mb-5">Tell us about your visit.</p>
                      </div>

                      {/* Preferred Doctor */}
                      <div>
                        <label className="block text-sm text-[#0A2463] mb-1.5">Preferred Doctor</label>
                        {loadingDoctors ? (
                          <div className="flex items-center gap-2 text-gray-400 text-sm py-4">
                            <Loader2 size={16} className="animate-spin" />
                            Loading doctors...
                          </div>
                        ) : doctors.length === 0 ? (
                          <p className="text-gray-400 text-sm py-2">No active doctors available.</p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {doctors.map((d) => {
                              const isOnLeave = d.status === "on_leave";
                              return (
                                <div
                                  key={d.name}
                                  title={isOnLeave ? "This doctor is currently on leave and not accepting appointments." : undefined}
                                  className="relative"
                                >
                                  <button
                                    onClick={() => !isOnLeave && setField("doctor", d.name)}
                                    disabled={isOnLeave}
                                    className={`w-full py-3 px-4 rounded-xl text-xs text-left transition-all border flex flex-col gap-0.5 ${isOnLeave
                                        ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                                        : form.doctor === d.name
                                          ? "bg-[#1B4FD8] text-white border-[#1B4FD8]"
                                          : "bg-[#F4F7FF] text-gray-700 border-transparent hover:border-[#1B4FD8]/30"
                                      }`}
                                  >
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <span className="font-semibold truncate">{d.name}</span>
                                      {isOnLeave && (
                                        <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide bg-orange-100 text-orange-600 border border-orange-200 px-1.5 py-0.5 rounded-full">
                                          On Leave
                                        </span>
                                      )}
                                    </div>
                                    <span className={`text-[10px] ${isOnLeave ? "text-gray-400" : form.doctor === d.name ? "text-white/70" : "text-gray-400"}`}>
                                      {d.specialty}
                                    </span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {errors.doctor && <p className="text-red-500 text-xs mt-1">{errors.doctor}</p>}
                      </div>

                      {/* Consultation Type */}
                      <div>
                        <label className="block text-sm text-[#0A2463] mb-1.5">Consultation Type</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {CONSULTATION_TYPES.map((type) => (
                            <button
                              key={type}
                              onClick={() => setField("consultationType", type)}
                              className={`py-2.5 px-3 rounded-xl text-xs text-left transition-all border ${form.consultationType === type
                                ? "bg-[#1B4FD8] text-white border-[#1B4FD8]"
                                : "bg-[#F4F7FF] text-gray-600 border-transparent hover:border-[#1B4FD8]/30"
                                }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                        {errors.consultationType && (
                          <p className="text-red-500 text-xs mt-1">{errors.consultationType}</p>
                        )}
                      </div>

                      {/* Identity Verification */}
                      <div className="pt-2">
                        <div className="flex items-center gap-2 mb-1">
                          <ShieldCheck size={15} className="text-[#1B4FD8] shrink-0" />
                          <label className="block text-sm text-[#0A2463]" style={{ fontWeight: 600 }}>
                            Identity Verification
                          </label>
                        </div>
                        <div className="border-t border-gray-100 pt-4 space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <label className="block text-sm text-[#0A2463] mb-0">
                                Attach Valid ID <span className="text-red-500">*</span>
                              </label>
                            </div>
                            <p className="text-xs text-gray-400 mb-3">
                              Upload a government-issued ID to verify your identity (e.g. PhilSys, Driver's License, Passport, UMID)
                            </p>

                            <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/jpeg,image/png,application/pdf"
                              className="hidden"
                              onChange={(e) => {
                                if (e.target.files?.[0]) handleIdFile(e.target.files[0]);
                              }}
                            />

                            {!validId ? (
                              <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 px-4 cursor-pointer transition-all duration-200 ${isDragging
                                  ? "border-[#1B4FD8] bg-[#E8F1FF]"
                                  : errors.validId
                                    ? "border-red-300 bg-red-50"
                                    : "border-[#1B4FD8]/30 bg-[#F4F7FF] hover:bg-[#E8F1FF] hover:border-[#1B4FD8]/60"
                                  }`}
                              >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDragging ? "bg-[#1B4FD8]/20" : "bg-[#E8F1FF]"}`}>
                                  <UploadCloud size={20} className="text-[#1B4FD8]" />
                                </div>
                                <div className="text-center">
                                  <p className="text-sm text-[#0A2463]" style={{ fontWeight: 500 }}>
                                    Click to upload{" "}
                                    <span className="text-gray-400" style={{ fontWeight: 400 }}>
                                      or drag and drop
                                    </span>
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">
                                    JPG, PNG, PDF only — max 5MB
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.25 }}
                                className="border border-[#1B4FD8]/20 bg-[#F4F7FF] rounded-xl p-3 flex items-center gap-3"
                              >
                                {idPreviewUrl ? (
                                  <div className="w-14 h-14 rounded-lg overflow-hidden border border-[#1B4FD8]/20 shrink-0">
                                    <img src={idPreviewUrl} alt="ID preview" className="w-full h-full object-cover" />
                                  </div>
                                ) : (
                                  <div className="w-14 h-14 rounded-lg bg-[#E8F1FF] flex items-center justify-center shrink-0 border border-[#1B4FD8]/20">
                                    <FileText size={22} className="text-[#1B4FD8]" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-[#0A2463] truncate" style={{ fontWeight: 500 }}>
                                    {validId.name}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-0.5">{formatFileSize(validId.size)}</p>
                                  <div className="flex items-center gap-1 mt-1">
                                    <Check size={11} className="text-teal-500" />
                                    <span className="text-teal-600 text-[11px]">Ready to submit</span>
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => { e.stopPropagation(); removeId(); }}
                                  className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-300 transition-all shrink-0"
                                  title="Remove file"
                                >
                                  <X size={13} />
                                </button>
                              </motion.div>
                            )}

                            <AnimatePresence>
                              {(idError || errors.validId) && (
                                <motion.p
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0 }}
                                  className="text-red-500 text-xs mt-2 flex items-center gap-1"
                                >
                                  <AlertCircle size={11} />
                                  {idError || errors.validId}
                                </motion.p>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 3 — Review */}
                  {step === 3 && (
                    <div>
                      <p className="text-[#0A2463] font-semibold mb-1" style={{ fontFamily: "Playfair Display, serif" }}>
                        Review & Confirm
                      </p>
                      <p className="text-xs text-gray-400 mb-6">
                        Review your appointment before submitting.
                      </p>
                      <div className="bg-[#F4F7FF] rounded-2xl p-5 space-y-3 text-sm mb-4">
                        {[
                          { label: "Patient", value: `${form.firstName} ${form.lastName}`.trim() },
                          { label: "Contact", value: form.contactNumber },
                          { label: "Email", value: form.email },
                          {
                            label: "Date",
                            value: form.date
                              ? new Date(form.date + "T12:00:00").toLocaleDateString("en-PH", {
                                weekday: "long", month: "long", day: "numeric", year: "numeric",
                              })
                              : "",
                          },
                          { label: "Time", value: form.time },
                          { label: "Doctor", value: form.doctor },
                          { label: "Type", value: form.consultationType },
                        ].map(({ label, value }) => (
                          <div key={label} className="flex gap-4">
                            <span className="text-gray-400 w-20 shrink-0 text-xs">{label}</span>
                            <span className="text-[#0A2463] font-medium text-xs">{value}</span>
                          </div>
                        ))}

                        {/* Valid ID row */}
                        {validId && (
                          <div className="flex gap-4 pt-2 border-t border-gray-200/60">
                            <span className="text-gray-400 w-20 shrink-0 text-xs">Valid ID</span>
                            <div className="flex items-center gap-2">
                              {idPreviewUrl ? (
                                <div className="w-8 h-8 rounded overflow-hidden border border-[#1B4FD8]/20 shrink-0">
                                  <img src={idPreviewUrl} alt="ID" className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <FileText size={14} className="text-[#1B4FD8] shrink-0" />
                              )}
                              <span className="text-[#0A2463] font-medium text-xs truncate max-w-[180px]">
                                {validId.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                        <ShieldCheck size={14} className="text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700">
                          Your ID will be reviewed by clinic staff for verification purposes only.
                        </p>
                      </div>

                      <div className="bg-[#E8F1FF] border border-[#1B4FD8]/20 rounded-xl px-4 py-3 flex items-center gap-2">
                        <Wifi size={14} className="text-[#1B4FD8] shrink-0" />
                        <p className="text-xs text-[#1B4FD8]">
                          This will be marked as an <strong>Online Appointment</strong>. Status starts as{" "}
                          <strong>Pending</strong> until approved by clinic staff.
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Nav */}
            <div className="px-8 pb-8 flex items-center justify-between border-t border-gray-50 pt-5 bg-gradient-to-r from-white to-[#F8FAFF]">
              <button
                onClick={step === 0 ? () => navigate("/dashboard") : back}
                className="flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2 text-sm text-gray-400 transition-all hover:border-gray-200 hover:bg-white hover:text-[#0A2463]"
              >
                <ArrowLeft size={15} />
                {step === 0 ? "Cancel" : "Back"}
              </button>
              <button
                onClick={next}
                disabled={loading}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#1B4FD8] to-[#0A2463] px-7 py-3 text-sm uppercase tracking-wider text-white transition-all hover:shadow-[0_10px_24px_rgba(27,79,216,0.28)] disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" /> Submitting…
                  </>
                ) : step === steps.length - 1 ? (
                  <>
                    <Check size={15} /> Confirm Booking
                  </>
                ) : (
                  <>
                    Next <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </div>
      </div>
      </div>
    </DashboardLayout>
  );
}
