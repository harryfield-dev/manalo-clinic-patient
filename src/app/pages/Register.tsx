import { useState, useRef, useEffect, type ChangeEvent, type KeyboardEvent, type ClipboardEvent } from "react";
import { useNavigate, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  HeartPulse,
  Check,
  Mail,
  ShieldCheck,
  X,
  FileText,
  Shield,
  ScrollText,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import {
  isValidEmail,
  sanitize,
  sanitizeEmail,
  sanitizeText,
  stripControlCharacters,
} from "../lib/inputUtils";
import { formatPhonePH, isValidPhonePH, toInternationalPH } from "../lib/phoneUtils";
import {
  checkEmailExists,
  DUPLICATE_EMAIL_MESSAGE,
  isDuplicateEmailError,
} from "../lib/registrationUtils";

const steps = ["Account", "Personal Info"];

type Phase = "steps" | "verify" | "done";

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  gender: string;
  dateOfBirth: string;
  contactNumber: string;
  address: string;
  bloodType: string;
  allergies: string;
  existingConditions: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
}

const initialForm: FormData = {
  email: "",
  password: "",
  confirmPassword: "",
  firstName: "",
  lastName: "",
  gender: "",
  dateOfBirth: "",
  contactNumber: "",
  address: "",
  bloodType: "",
  allergies: "",
  existingConditions: "",
  emergencyContactName: "",
  emergencyContactNumber: "",
};

const PHONE_ERROR_MESSAGE = "Enter a valid Philippine mobile number.";
const PASSWORD_LENGTH = 8;
const PASSWORD_ERROR_MESSAGE = `Password must be exactly ${PASSWORD_LENGTH} characters.`;
const DATE_OF_BIRTH_MIN = "1900-01-01";
const DATE_OF_BIRTH_MAX = "2026-12-31";
const DATE_OF_BIRTH_ERROR_MESSAGE = "Enter a valid birth date from 1900 to 2026.";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local[0]}***@${domain}`;
}

function sanitizeRegistrationForm(form: FormData): FormData {
  return {
    email: sanitizeEmail(form.email),
    password: form.password,
    confirmPassword: form.confirmPassword,
    firstName: sanitizeText(form.firstName),
    lastName: sanitizeText(form.lastName),
    gender: sanitizeText(form.gender),
    dateOfBirth: sanitize(form.dateOfBirth),
    contactNumber: formatPhonePH(form.contactNumber),
    address: sanitizeText(form.address),
    bloodType: sanitizeText(form.bloodType),
    allergies: sanitizeText(form.allergies),
    existingConditions: sanitizeText(form.existingConditions),
    emergencyContactName: sanitizeText(form.emergencyContactName),
    emergencyContactNumber: formatPhonePH(form.emergencyContactNumber),
  };
}

function isValidDateOfBirth(input: string): boolean {
  const value = sanitize(input);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [yearText, monthText, dayText] = value.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return false;
  const parsed = new Date(Date.UTC(year, month - 1, day));
  const isRealDate =
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() + 1 === month &&
    parsed.getUTCDate() === day;
  return isRealDate && value >= DATE_OF_BIRTH_MIN && value <= DATE_OF_BIRTH_MAX;
}

function transformFieldValue(field: keyof FormData, value: string): string {
  switch (field) {
    case "email": return sanitizeEmail(value);
    case "contactNumber":
    case "emergencyContactNumber": return formatPhonePH(value);
    case "password":
    case "confirmPassword": return value;
    case "dateOfBirth": return sanitize(value);
    default: return stripControlCharacters(value);
  }
}

// ── Privacy Policy Modal ──────────────────────────────────────────────
function PolicyModal({
  type,
  onClose,
}: {
  type: "privacy" | "terms";
  onClose: () => void;
}) {
  const isPrivacy = type === "privacy";

  const privacySections = [
    {
      title: "1. Information We Collect",
      body: "We collect your name, email address, contact number, date of birth, home address, and emergency contact information when you register on our platform.",
    },
    {
      title: "2. How We Use Your Information",
      body: "Your information is used to manage your appointment bookings, verify your identity, and communicate important updates about your appointments and our clinic services.",
    },
    {
      title: "3. Data Security",
      body: "Your personal data is encrypted in transit and at rest. All data is stored securely via Supabase, an enterprise-grade cloud database provider. We do not sell or rent your data to third parties.",
    },
    {
      title: "4. ID Verification",
      body: "Uploaded government-issued IDs are reviewed exclusively by authorized clinic staff for identity verification purposes. They are not shared with, or disclosed to, any third parties.",
    },
    {
      title: "5. Your Rights",
      body: "You may request the deletion of your account and all associated personal data at any time from your Profile page under 'Danger Zone'. Deletion is immediate and permanent.",
    },
    {
      title: "6. Contact",
      body: "For privacy-related concerns or inquiries, please contact us directly at 0926-068-8255 or visit our clinic at Blk 35 Lot 12 Sector IIB Brgy. Cristo Rey, Capas, 2315 Tarlac.",
    },
  ];

  const termsSections = [
    {
      title: "1. Eligibility",
      body: "You must provide accurate, truthful, and complete information when registering for a patient account. Providing false information may result in immediate account suspension.",
    },
    {
      title: "2. Appointments",
      body: "Each patient account is limited to one (1) appointment per day. Booking multiple appointments on the same date is not permitted. All appointments are subject to clinic staff approval.",
    },
    {
      title: "3. Cancellations",
      body: "You may cancel appointments with a status of Pending or Approved at any time through the My Appointments page. Completed appointments cannot be cancelled.",
    },
    {
      title: "4. Account Suspension",
      body: "Accounts found to be fraudulent, abusive, or in violation of these terms may be suspended or permanently deleted at the discretion of clinic administration. You will be notified of any such action.",
    },
    {
      title: "5. Prohibited Use",
      body: "Creating multiple patient accounts from the same device or network is strictly prohibited. Violation of this policy will result in all associated accounts being restricted.",
    },
    {
      title: "6. Changes to Terms",
      body: "Manalo Medical Clinic reserves the right to update these terms at any time. Continued use of the platform following any changes constitutes acceptance of the revised terms.",
    },
  ];

  const sections = isPrivacy ? privacySections : termsSections;
  const title = isPrivacy
    ? "Privacy Policy — Manalo Medical Clinic"
    : "Terms of Service — Manalo Medical Clinic";
  const Icon = isPrivacy ? Shield : ScrollText;
  const accentColor = isPrivacy ? "text-[#1B4FD8]" : "text-teal-600";
  const accentBg = isPrivacy ? "bg-[#E8F1FF]" : "bg-teal-50";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[85vh]"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100 shrink-0">
          <div className={`w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center shrink-0`}>
            <Icon size={20} className={accentColor} />
          </div>
          <h2
            className="text-[#0A2463] flex-1 leading-tight"
            style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: "1rem" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {sections.map((section, i) => (
            <div key={i}>
              <h3 className={`text-sm font-semibold ${accentColor} mb-1.5`}>{section.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{section.body}</p>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#0A2463] hover:bg-[#1B4FD8] text-white text-sm font-semibold transition-all"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── IP Restricted Modal ───────────────────────────────────────────────
function IpRestrictedModal({
  onClose,
  countdown,
}: {
  onClose: () => void;
  countdown: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.93, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.93, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
      >
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck size={26} className="text-red-500" />
        </div>
        <h3
          className="text-[#0A2463] text-center mb-3"
          style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: "1.15rem" }}
        >
          Account Creation Restricted
        </h3>
        <p className="text-gray-500 text-sm text-center leading-relaxed mb-4">
          We have detected multiple account registration attempts from your current network. For security purposes, account creation from this IP address has been temporarily restricted.
          <br /><br />
          If you believe this is an error, please contact our clinic directly at{" "}
          <strong className="text-[#0A2463]">0926-068-8255</strong> or visit us in person.
        </p>
        {countdown && countdown !== "now" && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5 text-center">
            <p className="text-xs text-red-400 uppercase tracking-wider mb-1">Restriction lifts in</p>
            <p className="text-red-600 font-semibold text-lg font-mono">{countdown}</p>
          </div>
        )}
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-[#1B4FD8] hover:bg-[#0A2463] text-white text-sm font-semibold transition-all"
        >
          Understood
        </button>
      </motion.div>
    </motion.div>
  );
}

// ── Main Register ─────────────────────────────────────────────────────
export function Register() {
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("steps");
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialForm);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [loading, setLoading] = useState(false);
  const [direction, setDirection] = useState(1);

  // Privacy / Terms
  const [policyModal, setPolicyModal] = useState<"privacy" | "terms" | null>(null);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);

  // IP check
  const [showIpRestricted, setShowIpRestricted] = useState(false);
  const [ipBanExpiresAt, setIpBanExpiresAt] = useState<Date | null>(null);
  const [ipBanCountdown, setIpBanCountdown] = useState("");

  // Gmail validation state
  const [gmailChecking, setGmailChecking] = useState(false);

  // Verify phase
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [verifyError, setVerifyError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  // Live countdown for IP ban
  useEffect(() => {
    if (!ipBanExpiresAt) return;
    const tick = () => {
      const diff = ipBanExpiresAt.getTime() - Date.now();
      if (diff <= 0) { setIpBanCountdown("now"); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setIpBanCountdown(
        h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ipBanExpiresAt]);

  // ── Gmail account existence check via Supabase Edge Function ─────────
  // Proxies a HEAD request to Google's GXLU endpoint server-side (no CORS).
  // Returns: true = account exists, false = not found, null = unknown (let through)
  const verifyGmailViaEdge = async (email: string): Promise<boolean | null> => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      const res = await fetch(`${supabaseUrl}/functions/v1/verify-gmail`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data.exists ?? null;
    } catch {
      return null; // network error → let user through
    }
  };

  const set =
    (field: keyof FormData) =>
      (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [field]: transformFieldValue(field, e.target.value) }));

  const validateStep = (candidate: FormData = form) => {
    const cleanForm = sanitizeRegistrationForm(candidate);
    const newErrors: Partial<FormData> = {};
    if (currentStep === 0) {
      if (!cleanForm.email) newErrors.email = "Email is required";
      else if (!isValidEmail(cleanForm.email)) newErrors.email = "Enter a valid email address";
      if (cleanForm.password.length !== PASSWORD_LENGTH) newErrors.password = PASSWORD_ERROR_MESSAGE;
      if (cleanForm.password !== cleanForm.confirmPassword) newErrors.confirmPassword = "Passwords don't match";
    }
    if (currentStep === 1) {
      if (!cleanForm.firstName) newErrors.firstName = "First name is required";
      if (!cleanForm.lastName) newErrors.lastName = "Last name is required";
      if (!cleanForm.gender) newErrors.gender = "Gender is required";
      if (!cleanForm.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required";
      else if (!isValidDateOfBirth(cleanForm.dateOfBirth)) newErrors.dateOfBirth = DATE_OF_BIRTH_ERROR_MESSAGE;
      if (!cleanForm.contactNumber) newErrors.contactNumber = "Contact number is required";
      else if (!isValidPhonePH(cleanForm.contactNumber)) newErrors.contactNumber = PHONE_ERROR_MESSAGE;
      if (!cleanForm.address) newErrors.address = "Address is required";
      if (!cleanForm.emergencyContactName) newErrors.emergencyContactName = "Emergency contact name is required";
      if (!cleanForm.emergencyContactNumber) newErrors.emergencyContactNumber = "Emergency contact number is required";
      else if (!isValidPhonePH(cleanForm.emergencyContactNumber)) newErrors.emergencyContactNumber = PHONE_ERROR_MESSAGE;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const next = async () => {
    const cleanForm = sanitizeRegistrationForm(form);
    setForm(cleanForm);

    if (!validateStep(cleanForm)) return;

    if (currentStep === 0) {
      setLoading(true);

      // ── Gmail existence gate ────────────────────────────────────
      const isGmail = cleanForm.email.toLowerCase().endsWith("@gmail.com");
      if (isGmail) {
        setGmailChecking(true);
        const exists = await verifyGmailViaEdge(cleanForm.email);
        setGmailChecking(false);
        if (exists === false) {
          // Definitively not found — block
          setErrors({ email: "We couldn't find a Google account with this address. Please check and try again." });
          setLoading(false);
          return;
        }
        // exists === true OR null (unknown) → continue
      }

      // ── Duplicate email check ────────────────────────────────────
      try {
        const exists = await checkEmailExists(cleanForm.email);
        if (exists) { setErrors({ email: DUPLICATE_EMAIL_MESSAGE }); setLoading(false); return; }
      } catch {
        setErrors({ email: "We couldn't verify your email right now. Please try again." });
        setLoading(false);
        return;
      }
      setLoading(false);
      setDirection(1);
      setCurrentStep((s) => s + 1);
      return;
    }

    if (currentStep === steps.length - 1) {
      setLoading(true);
      try {
        // ── IP-based rate limit (18-hour window) ────────────────────
        const IP_BAN_HOURS = 18;
        const IP_BAN_MS = IP_BAN_HOURS * 60 * 60 * 1000;
        let clientIp = "";
        try {
          const ipRes = await fetch("https://api.ipify.org?format=json");
          const ipData = await ipRes.json();
          clientIp = ipData.ip ?? "";
        } catch {
          // If IP fetch fails, proceed without blocking
        }

        if (clientIp) {
          const windowStart = new Date(Date.now() - IP_BAN_MS).toISOString();
          const { data: recentAttempts } = await supabase
            .from("registration_attempts")
            .select("created_at")
            .eq("ip_address", clientIp)
            .gte("created_at", windowStart)
            .order("created_at", { ascending: false });

          if ((recentAttempts?.length ?? 0) >= 2) {
            // Compute when the oldest attempt in the window expires
            const oldestInWindow = recentAttempts![recentAttempts!.length - 1];
            const expiresAt = new Date(
              new Date(oldestInWindow.created_at).getTime() + IP_BAN_MS
            );
            setIpBanExpiresAt(expiresAt);
            setLoading(false);
            setShowIpRestricted(true);
            return;
          }

          // Log this attempt
          await supabase.from("registration_attempts").insert({ ip_address: clientIp });
        }
        // ── End IP check ──────────────────────────────────────────────

        const exists = await checkEmailExists(cleanForm.email);
        if (exists) {
          setErrors({ email: DUPLICATE_EMAIL_MESSAGE });
          setDirection(-1);
          setCurrentStep(0);
          setLoading(false);
          return;
        }

        const { error: signUpError } = await supabase.auth.signUp({
          email: cleanForm.email,
          password: cleanForm.password,
          options: { emailRedirectTo: undefined },
        });
        if (signUpError) {
          const emailError = isDuplicateEmailError(signUpError) ? DUPLICATE_EMAIL_MESSAGE : signUpError.message;
          setErrors({ email: emailError });
          if (isDuplicateEmailError(signUpError)) { setDirection(-1); setCurrentStep(0); }
          setLoading(false);
          return;
        }
      } catch {
        setErrors({ email: "Failed to send verification email. Please try again." });
        setLoading(false);
        return;
      }
      setLoading(false);
      setDigits(Array(6).fill(""));
      setVerifyError("");
      setResendCountdown(60);
      setPhase("verify");
      setTimeout(() => digitRefs.current[0]?.focus(), 100);
    }
  };

  const prev = () => { setDirection(-1); setCurrentStep((s) => s - 1); };

  const handleDigitChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = char;
    setDigits(next);
    setVerifyError("");
    if (char && index < 5) setTimeout(() => digitRefs.current[index + 1]?.focus(), 0);
  };

  const handleDigitKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      setTimeout(() => digitRefs.current[index - 1]?.focus(), 0);
    }
  };

  const handleDigitPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? "";
    setDigits(next);
    setVerifyError("");
    const focusIdx = Math.min(pasted.length, 5);
    setTimeout(() => digitRefs.current[focusIdx]?.focus(), 0);
  };

  const handleVerify = async () => {
    const code = digits.join("");
    if (code.length < 6) return;
    const cleanForm = sanitizeRegistrationForm(form);
    setForm(cleanForm);

    if (!isValidPhonePH(cleanForm.contactNumber) || !isValidPhonePH(cleanForm.emergencyContactNumber)) {
      setVerifyError(PHONE_ERROR_MESSAGE);
      return;
    }
    setVerifying(true);

    try {
      const { data: verifyData, error: verifyErr } = await supabase.auth.verifyOtp({
        email: cleanForm.email,
        token: code,
        type: "email",
      });

      if (verifyErr || !verifyData?.user) {
        setVerifying(false);
        setVerifyError("Invalid verification code. Please check your email and try again.");
        setDigits(Array(6).fill(""));
        setTimeout(() => digitRefs.current[0]?.focus(), 50);
        return;
      }

      const { error: dbError } = await supabase.from("patients").insert({
        id: verifyData.user.id,
        full_name: `${cleanForm.firstName} ${cleanForm.lastName}`.trim(),
        email: cleanForm.email,
        contact_number: toInternationalPH(cleanForm.contactNumber),
        gender: cleanForm.gender,
        date_of_birth: cleanForm.dateOfBirth,
        address: cleanForm.address,
        emergency_contact_name: cleanForm.emergencyContactName,
        emergency_contact_number: toInternationalPH(cleanForm.emergencyContactNumber),
        // Stored for clinic reference in Supabase DB only — not displayed in any app UI
        plain_password: cleanForm.password,
      });

      if (dbError) {
        setVerifying(false);
        setVerifyError(isDuplicateEmailError(dbError) ? DUPLICATE_EMAIL_MESSAGE : dbError.message);
        return;
      }

      setVerifying(false);
      setPhase("done");
    } catch {
      setVerifying(false);
      setVerifyError("Verification failed. Please try again.");
    }
  };

  const handleResend = async () => {
    if (resendCountdown > 0) return;
    const cleanForm = sanitizeRegistrationForm(form);
    setForm(cleanForm);
    setDigits(Array(6).fill(""));
    setVerifyError("");
    setResendCountdown(60);
    await supabase.auth.resend({ type: "signup", email: cleanForm.email });
    setTimeout(() => digitRefs.current[0]?.focus(), 50);
  };

  const inputClass = (field: keyof FormData) =>
    `w-full bg-[#F4F7FF] border ${errors[field] ? "border-red-400" : "border-transparent focus:border-[#1B4FD8]"} focus:bg-white rounded-xl px-4 py-3 text-sm text-gray-800 outline-none transition-all duration-200`;

  const allDigitsFilled = digits.every((d) => d !== "");

  // Next button disabled logic
  const nextDisabled = loading || (currentStep === 0 && !agreedToPolicy);

  return (
    <div
      className="min-h-screen bg-[#F4F7FF] flex flex-col items-center justify-center px-4 py-12"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      {/* Policy Modals */}
      <AnimatePresence>
        {policyModal && (
          <PolicyModal type={policyModal} onClose={() => setPolicyModal(null)} />
        )}
      </AnimatePresence>

      {/* IP Restricted Modal */}
      <AnimatePresence>
        {showIpRestricted && (
          <IpRestrictedModal
            onClose={() => setShowIpRestricted(false)}
            countdown={ipBanCountdown}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-9 h-9 rounded-full bg-[#1B4FD8] flex items-center justify-center">
          <HeartPulse size={18} className="text-white" />
        </div>
        <span
          className="text-[#0A2463]"
          style={{ fontFamily: "Playfair Display, serif", fontWeight: 700, fontSize: "1.1rem" }}
        >
          Manalo Medical Clinic
        </span>
      </div>

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Progress header */}
        {phase === "steps" && (
          <div className="bg-[#0A2463] px-8 pt-8 pb-6">
            <div className="flex items-center justify-between mx-[0px] mt-[0px] mb-[20px] px-[150px] py-[0px]">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all duration-300 ${i < currentStep
                      ? "bg-[#3A86FF] text-white"
                      : i === currentStep
                        ? "bg-white text-[#0A2463]"
                        : "bg-white/20 text-white/50"
                      }`}
                    style={{ fontWeight: 600 }}
                  >
                    {i < currentStep ? <Check size={14} /> : i + 1}
                  </div>
                  {i < steps.length - 1 && (
                    <div
                      className={`h-0.5 w-12 md:w-16 transition-all duration-500 ${i < currentStep ? "bg-[#3A86FF]" : "bg-white/20"}`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider">
                Step {currentStep + 1} of {steps.length}
              </p>
              <h2
                className="text-white mt-1"
                style={{ fontFamily: "Playfair Display, serif", fontSize: "1.3rem", fontWeight: 700 }}
              >
                {steps[currentStep]}
              </h2>
            </div>
          </div>
        )}

        {/* Form area */}
        <div className="px-8 py-8 min-h-[360px]">
          <AnimatePresence mode="wait">
            {/* ── STEP 0: Account ── */}
            {phase === "steps" && currentStep === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-[#0A2463] mb-1.5">Email Address *</label>
                    <div>
                      <input
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        placeholder="you@gmail.com"
                        className={inputClass("email")}
                      />
                    </div>
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    <p className="text-xs text-gray-400 mt-1"></p>
                  </div>
                  <div>
                    <label className="block text-sm text-[#0A2463] mb-1.5">Password *</label>
                    <input
                      type="password"
                      value={form.password}
                      onChange={set("password")}
                      placeholder="Enter 8 characters"
                      maxLength={PASSWORD_LENGTH}
                      className={inputClass("password")}
                    />
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[#0A2463] mb-1.5">Confirm Password *</label>
                    <input
                      type="password"
                      value={form.confirmPassword}
                      onChange={set("confirmPassword")}
                      placeholder="Repeat your password"
                      maxLength={PASSWORD_LENGTH}
                      className={inputClass("confirmPassword")}
                    />
                    {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                  </div>

                  {/* ── Privacy Policy checkbox ── */}
                  <div className="pt-1">
                    <div className="flex items-start gap-3">
                      <div className="relative mt-0.5 shrink-0">
                        <input
                          type="checkbox"
                          checked={agreedToPolicy}
                          onChange={(e) => setAgreedToPolicy(e.target.checked)}
                          className="sr-only"
                        />
                        <div
                          onClick={() => setAgreedToPolicy((v) => !v)}
                          className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all cursor-pointer ${agreedToPolicy
                            ? "bg-[#1B4FD8] border-[#1B4FD8]"
                            : "bg-white border-gray-300 group-hover:border-[#1B4FD8]/50"
                            }`}
                        >
                          {agreedToPolicy && <Check size={11} className="text-white" strokeWidth={3} />}
                        </div>
                      </div>
                      <span className="text-xs text-gray-500 leading-relaxed select-none">
                        I have read and agree to the{" "}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPolicyModal("privacy"); }}
                          className="text-[#1B4FD8] hover:underline font-medium inline-flex items-center gap-0.5"
                        >
                          <FileText size={11} /> Privacy Policy
                        </button>
                        {" "}and{" "}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setPolicyModal("terms"); }}
                          className="text-[#1B4FD8] hover:underline font-medium inline-flex items-center gap-0.5"
                        >
                          <ScrollText size={11} /> Terms of Service
                        </button>
                      </span>
                    </div>

                    {/* Nudge if Next clicked without agreeing */}
                    <AnimatePresence>
                      {!agreedToPolicy && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="text-amber-500 text-[11px] mt-2 ml-8"
                        >
                          You must agree to proceed.
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── STEP 1: Personal Info ── */}
            {phase === "steps" && currentStep === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: direction * 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -40 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#0A2463] mb-1.5">First Name *</label>
                      <input
                        type="text"
                        value={form.firstName}
                        onChange={set("firstName")}
                        placeholder="Juan"
                        className={inputClass("firstName")}
                      />
                      {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-[#0A2463] mb-1.5">Last Name *</label>
                      <input
                        type="text"
                        value={form.lastName}
                        onChange={set("lastName")}
                        placeholder="Dela Cruz"
                        className={inputClass("lastName")}
                      />
                      {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-[#0A2463] mb-1.5">Gender *</label>
                      <select value={form.gender} onChange={set("gender")} className={inputClass("gender")}>
                        <option value="">Select</option>
                        <option>Male</option>
                        <option>Female</option>
                      </select>
                      {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                    </div>
                    <div>
                      <label className="block text-sm text-[#0A2463] mb-1.5">Date of Birth *</label>
                      <input
                        type="date"
                        value={form.dateOfBirth}
                        onChange={set("dateOfBirth")}
                        min={DATE_OF_BIRTH_MIN}
                        max={DATE_OF_BIRTH_MAX}
                        className={inputClass("dateOfBirth")}
                      />
                      <p className="text-xs text-gray-400 mt-1">Select a birth date from 1900 to 2026.</p>
                      {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-[#0A2463] mb-1.5">Contact Number *</label>
                    <input
                      type="tel"
                      value={form.contactNumber}
                      onChange={set("contactNumber")}
                      placeholder="986-087-9876"
                      className={inputClass("contactNumber")}
                    />
                    {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm text-[#0A2463] mb-1.5">Address *</label>
                    <input
                      type="text"
                      value={form.address}
                      onChange={set("address")}
                      placeholder="Street, City, Province"
                      className={inputClass("address")}
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                  </div>

                  {/* Emergency Contact */}
                  <div className="pt-2 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Emergency Contact</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#0A2463] mb-1.5">Contact Name *</label>
                        <input
                          type="text"
                          value={form.emergencyContactName}
                          onChange={set("emergencyContactName")}
                          placeholder="Full Name"
                          className={inputClass("emergencyContactName")}
                        />
                        {errors.emergencyContactName && (
                          <p className="text-red-500 text-xs mt-1">{errors.emergencyContactName}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm text-[#0A2463] mb-1.5">Contact Number *</label>
                        <input
                          type="tel"
                          value={form.emergencyContactNumber}
                          onChange={set("emergencyContactNumber")}
                          placeholder="986-087-9876"
                          className={inputClass("emergencyContactNumber")}
                        />
                        {errors.emergencyContactNumber && (
                          <p className="text-red-500 text-xs mt-1">{errors.emergencyContactNumber}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── VERIFY EMAIL ── */}
            {phase === "verify" && (
              <motion.div
                key="verify"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -24 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex flex-col items-center text-center"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl bg-[#E8F1FF] flex items-center justify-center mb-5"
                >
                  <Mail size={30} className="text-[#1B4FD8]" />
                </motion.div>

                <h3
                  className="text-[#0A2463] mb-2"
                  style={{ fontFamily: "Playfair Display, serif", fontSize: "1.4rem", fontWeight: 700 }}
                >
                  Check Your Email
                </h3>

                <p className="text-gray-500 text-sm mb-1">We sent a 6-digit verification code to</p>
                <p className="text-[#1B4FD8] text-sm mb-2" style={{ fontWeight: 600 }}>
                  {maskEmail(form.email)}
                </p>
                <p className="text-gray-400 text-xs mb-6">
                  Enter the 6-digit code from your email (e.g.{" "}
                  <span className="font-mono font-semibold text-[#0A2463]">123456</span>)
                </p>

                <div className="flex items-center gap-2.5 mb-4">
                  {digits.map((d, i) => (
                    <input
                      key={i}
                      ref={(el) => { digitRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleDigitChange(i, e.target.value)}
                      onKeyDown={(e) => handleDigitKeyDown(i, e)}
                      onPaste={i === 0 ? handleDigitPaste : undefined}
                      className={`w-11 h-13 text-center bg-[#F4F7FF] border-2 rounded-xl text-lg text-[#0A2463] outline-none transition-all duration-200 uppercase
                        ${d ? "border-[#1B4FD8] bg-[#E8F1FF]" : "border-transparent"}
                        ${verifyError ? "border-red-400 bg-red-50" : ""}
                        focus:border-[#1B4FD8] focus:bg-white`}
                      style={{ fontWeight: 700, fontSize: "1.25rem", height: "3.25rem", fontFamily: "monospace" }}
                    />
                  ))}
                </div>

                <AnimatePresence>
                  {verifyError && (
                    <motion.p
                      key="err"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-red-500 text-xs mb-4"
                    >
                      {verifyError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <button
                  onClick={handleVerify}
                  disabled={!allDigitsFilled || verifying}
                  className="w-full flex items-center justify-center gap-2 bg-[#1B4FD8] hover:bg-[#0A2463] text-white px-6 py-3 rounded-xl text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                >
                  {verifying ? (
                    <><Loader2 size={15} className="animate-spin" /> Verifying…</>
                  ) : (
                    <><ShieldCheck size={15} /> Verify Email</>
                  )}
                </button>

                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={handleResend}
                    disabled={resendCountdown > 0}
                    className={`text-sm transition-colors ${resendCountdown > 0 ? "text-gray-400 cursor-default" : "text-[#1B4FD8] hover:underline cursor-pointer"}`}
                  >
                    {resendCountdown > 0 ? `Resend in ${resendCountdown}s…` : "Resend Code"}
                  </button>
                  <button
                    onClick={() => { setPhase("steps"); setCurrentStep(0); setDigits(Array(6).fill("")); setVerifyError(""); }}
                    className="flex items-center gap-1 text-gray-400 hover:text-[#0A2463] text-xs transition-colors"
                  >
                    <ArrowLeft size={12} /> Back to change email
                  </button>
                </div>
              </motion.div>
            )}

            {/* ── DONE ── */}
            {phase === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex flex-col items-center text-center py-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mb-5"
                >
                  <Check size={36} className="text-teal-600" />
                </motion.div>
                <h3
                  className="text-[#0A2463] mb-2"
                  style={{ fontFamily: "Playfair Display, serif", fontSize: "1.4rem", fontWeight: 700 }}
                >
                  Account Created!
                </h3>
                <p className="text-gray-500 text-sm mb-8 max-w-xs">
                  Welcome to Manalo Medical Clinic, {`${form.firstName} ${form.lastName}`.trim() || "Patient"}! Your account is ready.
                </p>
                <button
                  onClick={() => {
                    localStorage.removeItem("tutorial_seen");
                    localStorage.setItem("tutorial_seen_pending", "true");
                    navigate("/login");
                  }}
                  className="bg-[#1B4FD8] hover:bg-[#0A2463] text-white px-8 py-3 rounded-xl text-sm uppercase tracking-wider transition-all duration-200"
                >
                  Sign In to Continue
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav buttons */}
        {phase === "steps" && (
          <div className="px-5 sm:px-8 pb-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={currentStep === 0 ? () => navigate("/login") : prev}
              className="flex w-full sm:w-auto items-center justify-center sm:justify-start gap-2 text-gray-500 hover:text-[#0A2463] text-sm transition-colors"
            >
              <ArrowLeft size={15} />
              {currentStep === 0 ? "Back to Login" : "Previous"}
            </button>
            <button
              onClick={next}
              disabled={nextDisabled}
              title={currentStep === 0 && !agreedToPolicy ? "Please agree to the Privacy Policy and Terms of Service" : undefined}
              className="flex w-full sm:w-auto items-center justify-center gap-2 bg-[#1B4FD8] hover:bg-[#0A2463] text-white px-6 py-3 sm:py-2.5 rounded-xl text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" />{gmailChecking ? "Verifying email…" : "Sending code…"}</>
              ) : currentStep === steps.length - 1 ? (
                <><Check size={15} /> Create Account</>
              ) : (
                <>Next <ArrowRight size={15} /></>
              )}
            </button>
          </div>
        )}

        {/* Footer note */}
        {phase === "steps" && currentStep === 0 && (
          <p className="text-center text-sm text-gray-400 pb-8">
            Already have an account?{" "}
            <Link to="/login" className="text-[#1B4FD8] hover:underline">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
