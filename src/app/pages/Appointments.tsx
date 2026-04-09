import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  CalendarCheck,
  Search,
  ChevronDown,
  ChevronUp,
  Ban,
  User,
  Clock,
  Stethoscope,
  FileText,
  CalendarPlus,
  XCircle,
  AlertCircle,
  Calendar,
  Download,
  Star,
  X,
  ArrowUpDown,
  CheckCircle,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useApp, type Appointment } from "../context/AppContext";
import { StatusBadge, ModeBadge } from "./Dashboard";
import { ConfirmModal } from "../components/ui/ConfirmModal";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

function toAppointmentDate(date: string) {
  return new Date(`${date}T12:00:00`);
}

function getAppointmentSearchTerms(apt: Appointment) {
  const date = toAppointmentDate(apt.date);
  const monthLong = date.toLocaleDateString("en-PH", { month: "long" }).toLowerCase();
  const monthShort = date.toLocaleDateString("en-PH", { month: "short" }).toLowerCase();
  const day = String(date.getDate()).padStart(2, "0");
  const dayNoPad = String(date.getDate());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());
  const shortYear = year.slice(-2);

  return [
    apt.doctor.toLowerCase(),
    apt.consultationType.toLowerCase(),
    apt.status.toLowerCase(),
    `${monthLong} ${day} ${year}`,
    `${monthLong} ${dayNoPad} ${year}`,
    `${monthShort} ${day} ${year}`,
    `${monthShort} ${dayNoPad} ${year}`,
    `${month}/${day}/${year}`,
    `${month}/${day}/${shortYear}`,
    `${year}-${month}-${day}`,
    `${month}${day}`,
    `${month}${day}${shortYear}`,
    `${month}${day}${year}`,
    `${year}${month}${day}`,
  ];
}

type StatusFilter = "All" | "Pending" | "Approved" | "Rejected" | "Completed" | "Cancelled";
type SortMode = "newest" | "oldest" | "upcoming";

function getAppointmentIcon(status: Appointment["status"]) {
  if (status === "Approved") return <CheckCircle size={19} className="text-teal-600" />;
  if (status === "Pending") return <AlertCircle size={19} className="text-amber-600" />;
  if (status === "Completed") return <CheckCircle size={19} className="text-[#1B4FD8]" />;
  if (status === "Cancelled" || status === "Rejected") return <XCircle size={19} className="text-red-600" />;
  return <CalendarCheck size={19} className="text-[#1B4FD8]" />;
}

// ── Print appointment summary ─────────────────────────────────────────
function printAppointmentSummary(apt: Appointment, profile: { fullName: string; contactNumber: string; email: string }) {
  const dateStr = toAppointmentDate(apt.date).toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const createdStr = apt.createdAt
    ? new Date(apt.createdAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })
    : "—";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Appointment Summary — Manalo Medical Clinic</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; background: #fff; padding: 40px; max-width: 680px; margin: 0 auto; }
    .header { text-align: center; border-bottom: 2px solid #1B4FD8; padding-bottom: 18px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; color: #0A2463; letter-spacing: 0.5px; }
    .header p { font-size: 12px; color: #555; margin-top: 4px; }
    .section-title { font-size: 11px; font-weight: 700; color: #1B4FD8; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; margin-top: 22px; }
    .grid { display: grid; grid-template-columns: 160px 1fr; row-gap: 8px; }
    .label { font-size: 12px; color: #666; }
    .value { font-size: 13px; color: #111; font-weight: 600; }
    .status-badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .status-Pending { background: #FEF3C7; color: #92400E; }
    .status-Approved { background: #D1FAE5; color: #065F46; }
    .status-Completed { background: #DBEAFE; color: #1E40AF; }
    .status-Cancelled, .status-Rejected { background: #FEE2E2; color: #991B1B; }
    .notice { margin-top: 32px; border: 2px solid #DC2626; border-radius: 8px; padding: 14px 18px; }
    .notice p { font-size: 13px; font-weight: 700; color: #DC2626; line-height: 1.5; }
    .divider { border: none; border-top: 1px solid #E5E7EB; margin: 4px 0; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Manalo Medical Clinic</h1>
    <p>Blk 35 Lot 12 Sector IIB Brgy, Capas, 2315 Tarlac &nbsp;|&nbsp; 0926-068-8255</p>
    <p style="margin-top:6px;font-size:11px;color:#888;">APPOINTMENT SUMMARY</p>
  </div>

  <div class="section-title">Patient Information</div>
  <div class="grid">
    <span class="label">Full Name</span><span class="value">${apt.doctor ? profile.fullName || "—" : "—"}</span>
    <span class="label">Contact</span><span class="value">${profile.contactNumber || "—"}</span>
    <span class="label">Email</span><span class="value">${profile.email || "—"}</span>
  </div>

  <hr class="divider" style="margin-top:12px;" />
  <div class="section-title">Doctor Information</div>
  <div class="grid">
    <span class="label">Doctor Name</span><span class="value">${apt.doctor || "—"}</span>
    <span class="label">Specialization</span><span class="value">—</span>
  </div>

  <hr class="divider" style="margin-top:12px;" />
  <div class="section-title">Appointment Details</div>
  <div class="grid">
    <span class="label">Date</span><span class="value">${dateStr}</span>
    <span class="label">Time</span><span class="value">${apt.time}</span>
    <span class="label">Consultation Type</span><span class="value">${apt.consultationType}</span>
    <span class="label">Mode</span><span class="value">${apt.mode}</span>
    ${apt.reason ? `<span class="label">Reason for Visit</span><span class="value">${apt.reason}</span>` : ""}
    <span class="label">Status</span><span class="value"><span class="status-badge status-${apt.status}">${apt.status}</span></span>
    <span class="label">Created Date</span><span class="value">${createdStr}</span>
  </div>

  <div class="notice">
    <p>Please print this or take a screenshot and show to the secretary of Manalo Medical Clinic upon arrival.</p>
  </div>
</body>
</html>`;

  const printWindow = window.open("", "_blank", "width=750,height=900");
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// ── Star Rating Display ───────────────────────────────────────────────
function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={14}
          className={s <= rating ? "text-amber-400 fill-amber-400" : "text-gray-300"}
        />
      ))}
    </div>
  );
}

// ── Review Modal ──────────────────────────────────────────────────────
function ReviewModal({
  apt,
  profile,
  onClose,
  onSubmit,
}: {
  apt: Appointment;
  profile: { id: string; fullName: string; email: string };
  onClose: () => void;
  onSubmit: (rating: number, review: string) => void;
}) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedStar, setSelectedStar] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (selectedStar === 0) {
      toast.error("Please select a star rating.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("appointment_ratings").insert({
        appointment_id: apt.id,
        patient_id: profile.id,
        patient_email: profile.email,
        patient_name: profile.fullName,
        doctor_name: apt.doctor,
        rating: selectedStar,
        review: review.trim() || null,
      });
      if (error) throw error;
      toast.success("Thank you for your feedback!");
      onSubmit(selectedStar, review.trim());
    } catch {
      toast.error("Failed to submit review. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const activeStar = hoveredStar || selectedStar;
  const starLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent!"];
  const starEmojis = ["", "😞", "😕", "🙂", "😊", "🤩"];
  const starColors = ["", "#EF4444", "#F97316", "#EAB308", "#22C55E", "#1B4FD8"];

  const aptDateStr = new Date(apt.date + "T12:00:00").toLocaleDateString("en-PH", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(10, 36, 99, 0.6)", backdropFilter: "blur(10px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.88, y: 32, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.92, y: 20, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-md overflow-hidden rounded-3xl"
        style={{ boxShadow: "0 32px 80px rgba(10, 36, 99, 0.35), 0 0 0 1px rgba(255,255,255,0.08)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Gradient header ── */}
        <div
          className="relative px-6 pt-8 pb-7 text-center overflow-hidden"
          style={{ background: "linear-gradient(145deg, #0A2463 0%, #1B4FD8 55%, #3A86FF 100%)" }}
        >
          <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.05)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -20, left: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl flex items-center justify-center transition-all"
            style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.8)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
          >
            <X size={15} />
          </button>

          <div className="flex justify-center mb-4">
            <motion.div
              animate={{ rotate: [0, -3, 3, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(255,255,255,0.16)",
                border: "2px solid rgba(255,255,255,0.25)",
                backdropFilter: "blur(12px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.25)",
              }}
            >
              <span style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 800, fontSize: "1.15rem", color: "#fff", letterSpacing: "-0.02em" }}>MC</span>
            </motion.div>
          </div>

          <h2 style={{ fontFamily: "Playfair Display, serif", color: "#fff", fontSize: "1.35rem", fontWeight: 700, marginBottom: 4, position: "relative" }}>
            Rate Your Visit
          </h2>
          <p style={{ fontFamily: "DM Sans, sans-serif", color: "rgba(255,255,255,0.72)", fontSize: "0.8rem", position: "relative" }}>
            Manalo Medical Clinic
          </p>

          <div className="flex justify-center flex-wrap gap-2 mt-4" style={{ position: "relative" }}>
            <div
              className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)" }}
            >
              <Calendar size={12} style={{ color: "rgba(255,255,255,0.8)" }} />
              <span style={{ fontFamily: "DM Sans, sans-serif", color: "rgba(255,255,255,0.9)", fontSize: "0.74rem", fontWeight: 600 }}>
                {aptDateStr}
              </span>
            </div>
            <div
              className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
            >
              <Stethoscope size={11} style={{ color: "rgba(255,255,255,0.7)" }} />
              <span style={{ fontFamily: "DM Sans, sans-serif", color: "rgba(255,255,255,0.8)", fontSize: "0.72rem" }}>
                {apt.doctor}
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ background: "#fff" }} className="px-6 pt-7 pb-6">

          {/* Star rating */}
          <div className="text-center mb-6">
            <p style={{ fontFamily: "DM Sans, sans-serif", color: "#6B7A99", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 18 }}>
              How was your experience?
            </p>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map((s) => {
                const filled = s <= activeStar;
                return (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.25, y: -5 }}
                    whileTap={{ scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 450, damping: 16 }}
                    onMouseEnter={() => setHoveredStar(s)}
                    onMouseLeave={() => setHoveredStar(0)}
                    onClick={() => setSelectedStar(s)}
                    style={{ background: "none", border: "none", cursor: "pointer", padding: "4px" }}
                  >
                    <Star
                      size={40}
                      style={{
                        color: filled ? "#FBBF24" : "#E8F1FF",
                        fill: filled ? "#FBBF24" : "#E8F1FF",
                        filter: filled ? "drop-shadow(0 3px 10px rgba(251,191,36,0.6))" : "none",
                        transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                      }}
                    />
                  </motion.button>
                );
              })}
            </div>

            {/* Label with emoji */}
            <div style={{ minHeight: 38 }} className="flex items-center justify-center">
              <AnimatePresence mode="wait">
                {activeStar > 0 ? (
                  <motion.div
                    key={activeStar}
                    initial={{ opacity: 0, y: 8, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.9 }}
                    transition={{ duration: 0.2, type: "spring", stiffness: 400, damping: 22 }}
                    className="flex items-center justify-center gap-2 px-5 py-2 rounded-2xl"
                    style={{ background: `${starColors[activeStar]}18`, border: `1.5px solid ${starColors[activeStar]}30` }}
                  >
                    <span style={{ fontSize: "1.3rem", lineHeight: 1 }}>{starEmojis[activeStar]}</span>
                    <span style={{ fontFamily: "DM Sans, sans-serif", fontWeight: 700, fontSize: "0.92rem", color: starColors[activeStar] }}>
                      {starLabels[activeStar]}
                    </span>
                    <span style={{ fontFamily: "DM Sans, sans-serif", fontSize: "0.73rem", color: starColors[activeStar], opacity: 0.65 }}>
                      · {activeStar}/5
                    </span>
                  </motion.div>
                ) : (
                  <motion.p
                    key="prompt"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{ fontFamily: "DM Sans, sans-serif", color: "#C7D7F8", fontSize: "0.82rem" }}
                  >
                    ✦ Tap a star to rate your visit
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #E8F1FF 30%, #E8F1FF 70%, transparent)", margin: "0 0 22px 0" }} />

          {/* Review textarea */}
          <div className="mb-6">
            <label style={{
              fontFamily: "DM Sans, sans-serif",
              color: "#6B7A99",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              display: "flex",
              alignItems: "center",
              gap: 6,
              marginBottom: 10,
            }}>
              Write a Review
              <span style={{ fontWeight: 400, color: "#C7D7F8", textTransform: "none", letterSpacing: 0, fontSize: "0.72rem" }}>— optional</span>
            </label>
            <div className="relative">
              <textarea
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={4}
                maxLength={500}
                placeholder="Tell us what you loved, what we can improve, or anything else about your visit..."
                className="w-full rounded-2xl px-4 py-3.5 outline-none resize-none"
                style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "0.88rem",
                  color: "#0A2463",
                  lineHeight: 1.6,
                  background: "#F4F7FF",
                  border: "2px solid transparent",
                  transition: "all 0.2s ease",
                }}
                onFocus={(e) => {
                  e.currentTarget.style.border = "2px solid #3A86FF";
                  e.currentTarget.style.background = "#fff";
                  e.currentTarget.style.boxShadow = "0 0 0 4px rgba(58,134,255,0.12)";
                }}
                onBlur={(e) => {
                  e.currentTarget.style.border = "2px solid transparent";
                  e.currentTarget.style.background = "#F4F7FF";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
              <div className="absolute bottom-3 right-3">
                <span style={{
                  fontFamily: "DM Sans, sans-serif",
                  fontSize: "0.65rem",
                  color: review.length > 450 ? "#F59E0B" : "#C7D7F8",
                  fontWeight: 700,
                  background: review.length > 450 ? "#FEF3C7" : "#E8F1FF",
                  padding: "2px 7px",
                  borderRadius: 8,
                }}>
                  {review.length}/500
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-none px-5 py-3 rounded-2xl font-semibold transition-all"
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 600,
                fontSize: "0.875rem",
                color: "#6B7A99",
                background: "#F4F7FF",
                border: "1.5px solid #E8F1FF",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#E8F1FF"; e.currentTarget.style.color = "#0A2463"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#F4F7FF"; e.currentTarget.style.color = "#6B7A99"; }}
            >
              Cancel
            </button>

            <motion.button
              onClick={handleSubmit}
              disabled={submitting || selectedStar === 0}
              whileHover={!submitting && selectedStar > 0 ? { scale: 1.02, y: -1 } : {}}
              whileTap={!submitting && selectedStar > 0 ? { scale: 0.97 } : {}}
              className="flex-1 py-3 rounded-2xl flex items-center justify-center gap-2"
              style={{
                fontFamily: "DM Sans, sans-serif",
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "#fff",
                background: selectedStar === 0 || submitting
                  ? "#D1D5DB"
                  : "linear-gradient(135deg, #1B4FD8 0%, #3A86FF 100%)",
                boxShadow: selectedStar > 0 && !submitting
                  ? "0 10px 28px rgba(27,79,216,0.38)"
                  : "none",
                cursor: submitting || selectedStar === 0 ? "not-allowed" : "pointer",
                transition: "background 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin flex-shrink-0" />
                  <span>Submitting…</span>
                </>
              ) : (
                <>
                  <Star size={15} style={{ fill: selectedStar > 0 ? "#fff" : "transparent", color: "#fff" }} />
                  <span>Submit Review</span>
                </>
              )}
            </motion.button>
          </div>

          <p className="text-center mt-4" style={{ fontFamily: "DM Sans, sans-serif", color: "#C7D7F8", fontSize: "0.68rem" }}>
            Your feedback is visible to clinic staff only
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── AppointmentCard ───────────────────────────────────────────────────
function AppointmentCard({
  apt,
  onCancel,
  profile,
  existingRating,
  onRatingSubmitted,
}: {
  apt: Appointment;
  onCancel: (id: string) => void;
  profile: { id: string; fullName: string; email: string; contactNumber: string };
  existingRating: { rating: number; review: string } | null | undefined;
  onRatingSubmitted: (appointmentId: string, rating: number, review: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const canCancel = apt.status === "Pending" || apt.status === "Approved";
  const canDownloadSummary = apt.status === "Approved";
  const isCompleted = apt.status === "Completed";
  const cardTone =
    apt.status === "Approved"
      ? "from-teal-500/10 via-white to-white"
      : apt.status === "Pending"
        ? "from-amber-500/10 via-white to-white"
        : apt.status === "Completed"
          ? "from-[#1B4FD8]/10 via-white to-white"
          : "from-red-500/10 via-white to-white";
  const appointmentDate = toAppointmentDate(apt.date);
  const dayLabel = appointmentDate.toLocaleDateString("en-PH", { day: "2-digit" });
  const monthLabel = appointmentDate.toLocaleDateString("en-PH", { month: "short" });

  return (
    <>
      {/* Modal rendered OUTSIDE the card so it's not clipped by overflow-hidden */}
      <AnimatePresence>
        {showReviewModal && (
          <ReviewModal
            apt={apt}
            profile={profile}
            onClose={() => setShowReviewModal(false)}
            onSubmit={(rating, review) => {
              setShowReviewModal(false);
              onRatingSubmitted(apt.id, rating, review);
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        whileHover={{ y: -3 }}
        className={`bg-gradient-to-br ${cardTone} rounded-[26px] border border-gray-100 shadow-[0_10px_28px_rgba(10,36,99,0.06)] overflow-hidden`}
      >
        <ConfirmModal
          open={showCancelConfirm}
          title="Cancel Appointment?"
          description="Are you sure you want to cancel this appointment? This action cannot be undone."
          confirmLabel="Yes, Cancel"
          variant="danger"
          onConfirm={() => { setShowCancelConfirm(false); onCancel(apt.id); }}
          onCancel={() => setShowCancelConfirm(false)}
        />

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-start sm:items-center gap-4 p-5 transition-colors text-left"
        >
          <div className="hidden sm:flex w-14 h-14 rounded-2xl border border-[#1B4FD8]/10 bg-white items-center justify-center shrink-0 flex-col shadow-sm">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1B4FD8]">{monthLabel}</span>
            <span className="text-lg font-bold leading-none text-[#0A2463]">{dayLabel}</span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-[#E8F1FF] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            {getAppointmentIcon(apt.status)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[#0A2463] font-semibold text-sm">{apt.consultationType}</span>
              <StatusBadge status={apt.status} />
              <ModeBadge mode={apt.mode} />
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><User size={11} /> {apt.doctor}</span>
              <span className="flex items-center gap-1">
                <Calendar size={11} />
                {appointmentDate.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="flex items-center gap-1"><Clock size={11} /> {apt.time}</span>
            </div>
          </div>
          <div className="shrink-0 flex items-center gap-2 text-gray-400">
            <span className="hidden sm:inline text-[11px] uppercase tracking-[0.18em] text-gray-300">
              {expanded ? "Hide" : "Details"}
            </span>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </button>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 border-t border-gray-100/80 pt-4 space-y-4 bg-gradient-to-b from-white to-[#F8FAFF]">
                {/* Detail rows */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1 rounded-2xl border border-gray-100 bg-white px-4 py-3">
                    <p className="text-gray-400 flex items-center gap-1"><Stethoscope size={11} /> Doctor</p>
                    <p className="text-[#0A2463] font-medium">{apt.doctor}</p>
                  </div>
                  <div className="space-y-1 rounded-2xl border border-gray-100 bg-white px-4 py-3">
                    <p className="text-gray-400 flex items-center gap-1"><FileText size={11} /> Type</p>
                    <p className="text-[#0A2463] font-medium">{apt.consultationType}</p>
                  </div>
                </div>

                {apt.notes && (
                  <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 flex gap-2">
                    <FileText size={14} className="text-teal-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-teal-700 font-medium mb-0.5">Clinic Notes</p>
                      <p className="text-xs text-teal-600">{apt.notes}</p>
                    </div>
                  </div>
                )}

                {apt.createdAt && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <CalendarCheck size={11} /> Booked on {new Date(apt.createdAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                  </p>
                )}

                {apt.cancelledAt && (
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Ban size={11} /> Cancelled on {new Date(apt.cancelledAt).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}

                {/* Action buttons row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {/* Download button — always visible */}
                  {canDownloadSummary && (
                    <button
                      onClick={() => printAppointmentSummary(apt, profile)}
                      className="flex items-center gap-1.5 text-[#1B4FD8] hover:text-white bg-[#E8F1FF] hover:bg-[#1B4FD8] text-xs border border-[#1B4FD8]/20 hover:border-[#1B4FD8] px-3 py-1.5 rounded-lg transition-all"
                    >
                      <Download size={12} /> Download Summary
                    </button>
                  )}

                  {canCancel && (
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1.5 border border-red-200 hover:border-red-400 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all"
                    >
                      <Ban size={12} /> Cancel Appointment
                    </button>
                  )}

                  {/* Review section — Completed only */}
                  {isCompleted && (
                    existingRating ? (
                      <div className="flex items-center gap-2">
                        <StarDisplay rating={existingRating.rating} />
                        <span className="text-[10px] text-gray-400 italic">You reviewed this</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowReviewModal(true)}
                        className="flex items-center gap-1.5 text-amber-600 hover:text-white bg-amber-50 hover:bg-amber-500 text-xs border border-amber-200 hover:border-amber-500 px-3 py-1.5 rounded-lg transition-all"
                      >
                        <Star size={12} /> Write a Review
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ── Main Appointments page ────────────────────────────────────────────
export function Appointments() {
  const navigate = useNavigate();
  const { appointments, cancelAppointment, profile } = useApp();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("All");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  // Ratings map: appointmentId → rating data or null (null = checked but no rating)
  const [ratingsMap, setRatingsMap] = useState<Record<string, { rating: number; review: string } | null>>({});

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Fetch existing ratings for this patient on mount / when appointments change
  useEffect(() => {
    if (!profile.email || appointments.length === 0) return;
    const fetchRatings = async () => {
      const ids = appointments.filter((a) => a.status === "Completed").map((a) => a.id);
      if (ids.length === 0) return;
      const { data } = await supabase
        .from("appointment_ratings")
        .select("appointment_id, rating, review")
        .in("appointment_id", ids)
        .eq("patient_email", profile.email);
      if (!data) return;
      const map: Record<string, { rating: number; review: string }> = {};
      for (const r of data) {
        map[r.appointment_id] = { rating: r.rating, review: r.review || "" };
      }
      // Mark Completed appointments with no rating as null explicitly
      const next: Record<string, { rating: number; review: string } | null> = {};
      for (const id of ids) {
        next[id] = map[id] ?? null;
      }
      setRatingsMap(next);
    };
    void fetchRatings();
  }, [profile.email, appointments]);

  const handleRatingSubmitted = (appointmentId: string, rating: number, review: string) => {
    setRatingsMap((prev) => ({ ...prev, [appointmentId]: { rating, review } }));
  };

  // Filter tabs config
  const filterTabs: { label: StatusFilter; count: number }[] = [
    { label: "All", count: appointments.length },
    { label: "Pending", count: appointments.filter((a) => a.status === "Pending").length },
    { label: "Approved", count: appointments.filter((a) => a.status === "Approved").length },
    { label: "Completed", count: appointments.filter((a) => a.status === "Completed").length },
    { label: "Rejected", count: appointments.filter((a) => a.status === "Rejected").length },
    { label: "Cancelled", count: appointments.filter((a) => a.status === "Cancelled").length },
  ];

  const sortLabels: Record<SortMode, string> = {
    newest: "Newest First",
    oldest: "Oldest First",
    upcoming: "Upcoming First",
  };

  const filteredAppointments = appointments
    .filter((apt) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      const normalizedQuery = q.replace(/\s+/g, " ").trim();
      const digitQuery = q.replace(/\D/g, "");
      const searchTerms = getAppointmentSearchTerms(apt);

      return searchTerms.some((term) => {
        const normalizedTerm = term.toLowerCase();
        if (normalizedTerm.includes(normalizedQuery)) return true;
        return digitQuery ? normalizedTerm.replace(/\D/g, "").includes(digitQuery) : false;
      });
    })
    .filter((apt) => {
      if (activeFilter === "All") return true;
      return apt.status === activeFilter;
    })
    .sort((a, b) => {
      const aDate = toAppointmentDate(a.date);
      const bDate = toAppointmentDate(b.date);
      if (sortMode === "oldest") return aDate.getTime() - bDate.getTime();
      if (sortMode === "upcoming") {
        const aFuture = aDate >= today;
        const bFuture = bDate >= today;
        if (aFuture && !bFuture) return -1;
        if (!aFuture && bFuture) return 1;
        if (aFuture && bFuture) return aDate.getTime() - bDate.getTime();
        return bDate.getTime() - aDate.getTime();
      }
      // newest (default)
      return bDate.getTime() - aDate.getTime();
    });

  return (
    <DashboardLayout title="My Appointments">
      <div className="space-y-6">
        {/* Search + Sort */}
        <div className="rounded-3xl border border-gray-100 bg-white p-4 shadow-[0_12px_36px_rgba(10,36,99,0.06)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-2 w-full">
              {/* Search */}
              <div className="relative flex-1 lg:w-64">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search for existing appointments"
                  className="w-full bg-[#F8FAFF] border border-gray-200 focus:border-[#1B4FD8] rounded-2xl pl-9 pr-4 py-3 text-sm text-gray-700 outline-none transition-all"
                />
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowSortMenu((v) => !v)}
                  className="flex items-center gap-2 bg-[#F8FAFF] border border-gray-200 hover:border-[#1B4FD8] rounded-2xl px-4 py-3 text-sm text-gray-600 transition-all whitespace-nowrap"
                >
                  <ArrowUpDown size={14} />
                  <span className="hidden sm:inline">{sortLabels[sortMode]}</span>
                  <ChevronDown size={13} className={`transition-transform ${showSortMenu ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="absolute right-0 top-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-lg z-20 min-w-[170px] py-1 overflow-hidden"
                    >
                      {(["newest", "oldest", "upcoming"] as SortMode[]).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => { setSortMode(mode); setShowSortMenu(false); }}
                          className={`w-full text-left px-4 py-2 text-sm transition-colors ${sortMode === mode ? "bg-[#E8F1FF] text-[#1B4FD8] font-medium" : "text-gray-600 hover:bg-gray-50"}`}
                        >
                          {sortLabels[mode]}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mt-4 flex flex-wrap gap-2">
            {filterTabs.map((tab) => (
              <motion.button
                key={tab.label}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveFilter(tab.label)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-medium border transition-all ${activeFilter === tab.label
                  ? "bg-[#1B4FD8] text-white border-[#1B4FD8] shadow-md shadow-[#1B4FD8]/20"
                  : "bg-[#F8FAFF] text-gray-500 border-gray-200 hover:border-[#1B4FD8]/40 hover:text-[#1B4FD8]"
                  }`}
              >
                {tab.label}
                <span
                  className={`inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-bold px-1 ${activeFilter === tab.label
                    ? "bg-white/20 text-white"
                    : "bg-gray-100 text-gray-500"
                    }`}
                >
                  {tab.count}
                </span>
              </motion.button>
            ))}
          </div>

          <p className="mt-4 text-xs text-gray-400">
            {filteredAppointments.length} appointment{filteredAppointments.length !== 1 ? "s" : ""}
            {activeFilter !== "All" ? ` — ${activeFilter}` : ""}
          </p>
        </div>

        {/* Appointment list */}
        {filteredAppointments.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 py-16 text-center">
            <CalendarCheck size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm mb-4">
              {activeFilter !== "All"
                ? `No ${activeFilter.toLowerCase()} appointments found.`
                : "No appointments found yet."}
            </p>
            <button
              onClick={() => navigate("/book")}
              className="bg-[#1B4FD8] hover:bg-[#0A2463] text-white px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 mx-auto transition-all"
            >
              <CalendarPlus size={15} /> Book Appointment
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredAppointments.map((apt) => (
                <motion.div
                  key={apt.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  <AppointmentCard
                    apt={apt}
                    onCancel={cancelAppointment}
                    profile={{
                      id: profile.id,
                      fullName: profile.fullName,
                      email: profile.email,
                      contactNumber: profile.contactNumber,
                    }}
                    existingRating={apt.status === "Completed" ? ratingsMap[apt.id] : undefined}
                    onRatingSubmitted={handleRatingSubmitted}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
