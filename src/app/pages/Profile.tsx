import { useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  User,
  Edit3,
  Save,
  X,
  Shield,
  Phone,
  MapPin,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  KeyRound,
  Mail,
  Calendar,
  CheckCircle,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useApp, type PatientProfile } from "../context/AppContext";
import { supabase } from "../lib/supabase";
import { toast } from "sonner";

// ── Helpers ─────────────────────────────────────────────────────────────
function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 py-3.5 border-b border-gray-50 last:border-0 group">
      <div className="flex items-center gap-2 sm:w-48 shrink-0">
        {icon && <span className="text-gray-300 group-hover:text-[#1B4FD8] transition-colors">{icon}</span>}
        <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <span className="text-sm text-[#0A2463] font-medium pl-0 sm:pl-2">{value || "—"}</span>
    </div>
  );
}

// ── Change Password Modal ─────────────────────────────────────────────
function ChangePasswordModal({
  email,
  patientId,
  onClose,
}: {
  email: string;
  patientId: string;
  onClose: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const inputCls =
    "w-full bg-[#F4F7FF] border border-transparent focus:border-[#1B4FD8] focus:bg-white rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-800 outline-none transition-all duration-200";

  const handleSubmit = async () => {
    setError("");
    if (!currentPassword) { setError("Please enter your current password."); return; }
    if (newPassword.length !== 8) { setError("New password must be exactly 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    if (!patientId) { setError("Your patient record could not be identified."); return; }
    setLoading(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
      if (signInError) { setError("Current password is incorrect."); setLoading(false); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) { setError(updateError.message || "Failed to update password."); setLoading(false); return; }
      const { error: patientUpdateError } = await supabase
        .from("patients")
        .update({
          plain_password: newPassword,
          password_changed_at: new Date().toISOString(),
        })
        .eq("id", patientId);
      if (patientUpdateError) {
        const message = "Password changed, but we could not update your patient record.";
        setError(message);
        toast.error(message);
        setLoading(false);
        return;
      }
      toast.success("Password updated successfully!");
      onClose();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: "0 24px 60px rgba(10,36,99,0.2)" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-[#0A2463] to-[#1B4FD8] px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <KeyRound size={17} className="text-white" />
            </div>
            <h3 className="text-white font-bold text-base" style={{ fontFamily: "Playfair Display, serif" }}>
              Change Password
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {[
            { label: "Current Password", value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(v => !v) },
            { label: "New Password", value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(v => !v) },
            { label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(v => !v) },
          ].map(({ label, value, set, show, toggle }) => (
            <div key={label}>
              <label className="block text-xs text-gray-500 font-semibold mb-1.5 uppercase tracking-wider">{label}</label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  maxLength={label === "Current Password" ? undefined : 8}
                  className={inputCls}
                  placeholder="••••••••"
                />
                <button type="button" onClick={toggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1B4FD8] transition-colors">
                  {show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              {label === "New Password" && newPassword.length > 0 && newPassword.length < 8 && (
                <p className="text-xs text-amber-500 mt-1">Must be exactly 8 characters</p>
              )}
              {label === "Confirm New Password" && confirmPassword.length > 0 && newPassword !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>
          ))}

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl px-3 py-2.5 flex items-start gap-2"
              >
                <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-50 hover:opacity-90 transition-all flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #1B4FD8, #0A2463)" }}
            >
              {loading ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Lock size={13} />}
              {loading ? "Updating…" : "Update Password"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Delete Account Modal ──────────────────────────────────────────────
function DeleteAccountModal({ profile, onClose, onDeleted }: { profile: PatientProfile; onClose: () => void; onDeleted: () => void }) {
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const confirmed = emailInput.trim().toLowerCase() === profile.email.toLowerCase();

  const handleDelete = async () => {
    if (!confirmed) return;
    setLoading(true);
    setError("");
    try {
      await supabase.from("appointments").delete().eq("patient_email", profile.email);
      await supabase.from("chat_messages").delete().eq("patient_email", profile.email);
      await supabase.from("notifications").delete().eq("patient_email", profile.email);
      await supabase.from("patients").update({ status: "deleted" }).eq("id", profile.id);
      await supabase.auth.signOut();
      toast.success("Your account has been deleted.");
      onDeleted();
    } catch {
      setError("Failed to delete account. Please try again.");
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        style={{ boxShadow: "0 24px 60px rgba(220,38,38,0.15)" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Trash2 size={17} className="text-white" />
            </div>
            <h3 className="text-white font-bold text-base" style={{ fontFamily: "Playfair Display, serif" }}>Delete Account</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 text-white/70 hover:text-white transition-colors"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs text-red-700 leading-relaxed">
              <strong>⚠ This action is permanent and cannot be undone.</strong> All your appointments, chat history, and personal data will be permanently erased.
            </p>
          </div>
          <div>
            <label className="block text-xs text-gray-500 font-semibold mb-1.5 uppercase tracking-wider">
              Type your email to confirm: <span className="text-red-500 normal-case font-bold">{profile.email}</span>
            </label>
            <input
              type="email" value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              placeholder={profile.email}
              className="w-full bg-red-50 border border-red-200 focus:border-red-400 focus:bg-white rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all"
            />
          </div>
          <AnimatePresence>
            {error && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-red-500 text-xs">{error}</motion.p>}
          </AnimatePresence>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors">Cancel</button>
            <button
              onClick={handleDelete}
              disabled={!confirmed || loading}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Trash2 size={13} />}
              {loading ? "Deleting…" : "Delete Account"}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Main Profile page ─────────────────────────────────────────────────
export function Profile() {
  const navigate = useNavigate();
  const { profile, updateProfile, logout } = useApp();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<PatientProfile>(profile);
  const [saved, setSaved] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);

  const set =
    (field: keyof PatientProfile) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    await updateProfile(form);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCancel = () => { setForm(profile); setEditing(false); };
  const handleDeleted = () => { logout(); navigate("/"); };

  const inputCls =
    "w-full bg-[#F4F7FF] border border-transparent focus:border-[#1B4FD8] focus:bg-white rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none transition-all duration-200";

  return (
    <DashboardLayout title="My Profile">
      <AnimatePresence>
        {showChangePassword && (
          <ChangePasswordModal
            email={profile.email}
            patientId={profile.id}
            onClose={() => setShowChangePassword(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showDeleteAccount && <DeleteAccountModal profile={profile} onClose={() => setShowDeleteAccount(false)} onDeleted={handleDeleted} />}
      </AnimatePresence>

      <div className="max-w-2xl mx-auto space-y-5">
        <AnimatePresence>
          {saved && (
            <motion.div
              initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
              className="flex items-center gap-2.5 bg-teal-50 border border-teal-200 text-teal-700 text-sm rounded-2xl px-5 py-3.5"
            >
              <CheckCircle size={16} className="shrink-0" />
              Profile updated successfully!
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Hero Card ──────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative rounded-2xl overflow-hidden text-white"
          style={{
            background: "linear-gradient(135deg, #0A2463 0%, #0F3080 50%, #1B4FD8 100%)",
            boxShadow: "0 16px 48px rgba(10,36,99,0.25)",
          }}
        >
          {/* Decorative circles */}
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white opacity-[0.04]" />
          <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-[#3A86FF] opacity-[0.07]" />
          <div className="absolute top-8 right-24 w-12 h-12 rounded-full bg-white opacity-[0.05]" />

          <div className="relative p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {/* Avatar */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 font-bold text-[#0A2463] text-2xl"
              style={{
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                fontFamily: "Playfair Display, serif",
              }}
            >
              {profile.fullName ? getInitials(profile.fullName) : <User size={30} className="text-[#1B4FD8]" />}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-white/50 uppercase tracking-widest font-semibold">Patient</span>
                <span className="inline-flex items-center gap-1 bg-teal-400/20 border border-teal-300/30 text-teal-300 text-[10px] px-2 py-0.5 rounded-full">
                  <CheckCircle size={9} /> Verified
                </span>
              </div>
              <h2
                className="text-white truncate leading-tight mb-3"
                style={{ fontFamily: "Playfair Display, serif", fontSize: "1.4rem", fontWeight: 700 }}
              >
                {profile.fullName || "Patient Name"}
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-white/60 text-xs">
                <span className="flex items-center gap-1.5"><Mail size={11} /> {profile.email}</span>
                {profile.contactNumber && <span className="flex items-center gap-1.5"><Phone size={11} /> {profile.contactNumber}</span>}
                {profile.address && <span className="flex items-center gap-1.5"><MapPin size={11} /> {profile.address}</span>}
              </div>
            </div>

            {/* Edit / Save buttons */}
            <div className="shrink-0">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-all"
                >
                  <Edit3 size={13} /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleCancel} className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white px-3 py-2 rounded-xl text-xs transition-all">
                    <X size={13} /> Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-1.5 bg-white text-[#1B4FD8] hover:bg-[#E8F1FF] px-3 py-2 rounded-xl text-xs font-bold transition-all"
                  >
                    <Save size={13} /> Save
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Personal Information ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.06)" }}
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1FF] flex items-center justify-center">
              <User size={16} className="text-[#1B4FD8]" />
            </div>
            <h3 className="text-[#0A2463] font-bold text-sm">Personal Information</h3>
          </div>
          <div className="px-6 py-4">
            {editing ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Full Name", key: "fullName" as keyof PatientProfile, type: "text" },
                  { label: "Email", key: "email" as keyof PatientProfile, type: "email" },
                  { label: "Contact Number", key: "contactNumber" as keyof PatientProfile, type: "tel" },
                ].map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">{label}</label>
                    <input type={type} value={form[key]} onChange={set(key)} className={inputCls} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Gender</label>
                  <select value={form.gender} onChange={set("gender")} className={inputCls}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Prefer not to say</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Date of Birth</label>
                  <input type="date" value={form.dateOfBirth} onChange={set("dateOfBirth")} className={inputCls} />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Address</label>
                  <input type="text" value={form.address} onChange={set("address")} className={inputCls} />
                </div>
              </div>
            ) : (
              <div>
                <InfoRow label="Full Name" value={profile.fullName} icon={<User size={14} />} />
                <InfoRow label="Email" value={profile.email} icon={<Mail size={14} />} />
                <InfoRow label="Contact" value={profile.contactNumber} icon={<Phone size={14} />} />
                <InfoRow label="Gender" value={profile.gender} icon={<Shield size={14} />} />
                <InfoRow
                  label="Date of Birth"
                  icon={<Calendar size={14} />}
                  value={
                    profile.dateOfBirth
                      ? new Date(profile.dateOfBirth).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })
                      : ""
                  }
                />
                <InfoRow label="Address" value={profile.address} icon={<MapPin size={14} />} />
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Emergency Contact ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14, duration: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.06)" }}
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={16} className="text-amber-500" />
            </div>
            <h3 className="text-[#0A2463] font-bold text-sm">Emergency Contact</h3>
          </div>
          <div className="px-6 py-4">
            {editing ? (
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Contact Name</label>
                  <input type="text" value={form.emergencyContactName} onChange={set("emergencyContactName")} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Contact Number</label>
                  <input type="tel" value={form.emergencyContactNumber} onChange={set("emergencyContactNumber")} className={inputCls} />
                </div>
              </div>
            ) : (
              <div>
                <InfoRow label="Name" value={profile.emergencyContactName} icon={<User size={14} />} />
                <InfoRow label="Number" value={profile.emergencyContactNumber} icon={<Phone size={14} />} />
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Medical Notes (readonly display) ─────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.4 }}
          className="hidden"
          style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.06)" }}
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">

          </div>
          <div className="px-6 py-4">
            <InfoRow label="Patient ID" value={profile.id ? `#${profile.id.slice(0, 8).toUpperCase()}` : "—"} icon={<Shield size={14} />} />
          </div>
        </motion.div>

        {/* ── Security Section ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22, duration: 0.4 }}
          className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
          style={{ boxShadow: "0 2px 12px rgba(10,36,99,0.06)" }}
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-[#E8F1FF] flex items-center justify-center">
              <Lock size={16} className="text-[#1B4FD8]" />
            </div>
            <h3 className="text-[#0A2463] font-bold text-sm">Security</h3>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#0A2463] font-semibold">Password</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <span className="tracking-widest text-gray-300">••••••••</span>
                  <span>Update your account password</span>
                </p>
              </div>
              <button
                onClick={() => setShowChangePassword(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border"
                style={{
                  background: "#E8F1FF",
                  color: "#1B4FD8",
                  borderColor: "rgba(27,79,216,0.2)",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#1B4FD8";
                  (e.currentTarget as HTMLButtonElement).style.color = "#fff";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = "#E8F1FF";
                  (e.currentTarget as HTMLButtonElement).style.color = "#1B4FD8";
                }}
              >
                <Lock size={13} /> Change Password
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Danger Zone ──────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}
          className="bg-white rounded-2xl border border-red-100 overflow-hidden"
          style={{ boxShadow: "0 2px 12px rgba(220,38,38,0.06)" }}
        >
          <div className="flex items-center gap-3 px-6 py-4 border-b border-red-50 bg-red-50/40">
            <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
              <AlertTriangle size={16} className="text-red-500" />
            </div>
            <h3 className="text-red-600 font-bold text-sm">Danger Zone</h3>
          </div>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#0A2463] font-semibold">Delete My Account</p>
                <p className="text-xs text-gray-400 mt-0.5">Permanently delete your account and all data</p>
              </div>
              <button
                onClick={() => setShowDeleteAccount(true)}
                className="flex items-center gap-2 text-red-500 hover:text-white bg-red-50 hover:bg-red-500 border border-red-200 hover:border-red-500 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              >
                <Trash2 size={13} /> Delete My Account
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
