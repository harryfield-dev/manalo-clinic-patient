import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { sanitize, sanitizeEmail, sanitizeText } from "../lib/inputUtils";
import { formatPhonePH, isValidPhonePH, toInternationalPH } from "../lib/phoneUtils";
import { toast } from "sonner";
import { getClinicStatus } from "../lib/clinicStatusLive";

export const MAX_SLOT_CAPACITY = 3;

export let CLINIC_NAME = "Manalo Medical Clinic";
export let CLINIC_ADDRESS = "Blk 35 Lot 12 Sector IIB Brgy, Capas, 2315 Tarlac";
export let CLINIC_PHONE = "(045) 123-4567";
export let CLINIC_MAPS_LINK = "https://maps.app.goo.gl/mVSMzAtFzsqz4nwi6";

export let CLINIC_SCHEDULE: { day: string; hours: string; closed?: boolean }[] = [
  { day: "Monday", hours: "7:00 AM – 3:00 PM" },
  { day: "Tuesday", hours: "7:00 AM – 3:00 PM" },
  { day: "Wednesday", hours: "7:00 AM – 3:00 PM" },
  { day: "Thursday", hours: "7:00 AM – 3:00 PM" },
  { day: "Friday", hours: "7:00 AM – 3:00 PM" },
  { day: "Saturday", hours: "7:00 AM – 3:00 PM" },
  { day: "Sunday", hours: "Closed", closed: true },
];

export async function loadClinicSettings() {
  const { data } = await supabase
    .from('clinic_settings')
    .select('*')
    .limit(1)
    .single();

  if (!data) return;

  CLINIC_NAME = data.clinic_name || CLINIC_NAME;
  CLINIC_ADDRESS = data.address || CLINIC_ADDRESS;
  CLINIC_PHONE = data.phone || CLINIC_PHONE;
  CLINIC_MAPS_LINK = data.maps_link || CLINIC_MAPS_LINK;

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  CLINIC_SCHEDULE = days.map(day => ({
    day: day.charAt(0).toUpperCase() + day.slice(1),
    hours: data[day] || 'Closed',
    closed: data[day] === 'Closed' || !data[day],
  }));
}

export function generateTimeSlots(): string[] {
  const slots: string[] = [];
  let totalMins = 7 * 60;
  const endMins = 15 * 60;
  while (totalMins <= endMins) {
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

export const TIME_SLOTS = generateTimeSlots();

export const DOCTORS = [
  { name: "Dr. Ana Manalo", specialty: "General Medicine" },
  { name: "Dr. Carlos Rivera", specialty: "Internal Medicine" },
  { name: "Dr. Rosa Santos", specialty: "Diagnostics" },
  { name: "Dr. Miguel Torres", specialty: "Specialist" },
];

export const CONSULTATION_TYPES = [
  "General Check-up",
  "Specialist Consultation",
  "Follow-up",
  "Lab Interpretation",
];

export type AppointmentStatus = "Pending" | "Approved" | "Rejected" | "Completed" | "Cancelled";
export type AppointmentMode = "Online" | "Walk-in";

export interface Appointment {
  id: string;
  date: string;
  time: string;
  doctor: string;
  consultationType: string;
  reason: string;
  status: AppointmentStatus;
  mode: AppointmentMode;
  createdAt?: string;
  notes?: string;
  cancelledAt?: string;
}

export type NotifType = "Approved" | "Rejected" | "Reminder" | "Update" | "Cancelled" | "ChatReply" | "Login" | "Completed";

export interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface ChatMessage {
  id: string;
  sender: "patient" | "staff" | "bot";
  text: string;
  timestamp: string;
  read: boolean;
}

type NotificationRecord = {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
};

type ChatMessageRecord = {
  id: string;
  sender_type: "patient" | "admin" | "staff" | "bot";
  message: string;
  created_at: string;
  read: boolean;
};

export interface PatientProfile {
  id: string;
  fullName: string;
  email: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  contactNumber: string;
  bloodType: string;
  allergies: string;
  existingConditions: string;
  emergencyContactName: string;
  emergencyContactNumber: string;
}

type PatientRecord = {
  id: string;
  full_name: string;
  email: string;
  gender?: string | null;
  date_of_birth?: string | null;
  address?: string | null;
  contact_number?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_number?: string | null;
  status?: string | null;
  suspended_until?: string | null;
  suspension_reason?: string | null;
};

type LoginFailureCode = "invalid_credentials" | "suspended" | "deleted_or_missing" | "verification_failed";

export type LoginResult =
  | { success: true }
  | {
      success: false;
      code: LoginFailureCode;
      message: string;
    };

export function slotKey(date: string, time: string) {
  return `${date}|${time}`;
}

const defaultProfile: PatientProfile = {
  id: "", fullName: "", email: "", gender: "", dateOfBirth: "",
  address: "", contactNumber: "", bloodType: "", allergies: "",
  existingConditions: "", emergencyContactName: "", emergencyContactNumber: "",
};

function mapPatientToProfile(patientData: PatientRecord): PatientProfile {
  return {
    id: patientData.id,
    fullName: patientData.full_name,
    email: patientData.email,
    gender: patientData.gender || "",
    dateOfBirth: patientData.date_of_birth || "",
    address: patientData.address || "",
    contactNumber: patientData.contact_number ? formatPhonePH(patientData.contact_number) : "",
    bloodType: "",
    allergies: "",
    existingConditions: "",
    emergencyContactName: patientData.emergency_contact_name || "",
    emergencyContactNumber: patientData.emergency_contact_number
      ? formatPhonePH(patientData.emergency_contact_number)
      : "",
  };
}

function toStoredPhoneNumber(phone?: string | null): string | null | undefined {
  if (phone === undefined) return undefined;
  if (phone === null) return null;
  const cleanPhone = sanitize(phone);
  if (!cleanPhone) return "";
  return isValidPhonePH(cleanPhone) ? toInternationalPH(cleanPhone) : cleanPhone;
}

function buildSuspensionMessage(reason?: string | null, suspendedUntil?: string | null) {
  const cleanReason = reason?.trim();
  const baseMessage = cleanReason
    ? `Your account is suspended due to ${cleanReason}.`
    : "Your account is suspended. Please contact the clinic for assistance.";

  if (!suspendedUntil) return baseMessage;

  const untilDate = new Date(suspendedUntil);
  if (Number.isNaN(untilDate.getTime())) return baseMessage;

  return `${baseMessage} You can try again after ${untilDate.toLocaleString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}.`;
}

function buildDeletedMessage() {
  return "Your account has been deleted and can no longer be accessed. Please contact the clinic if this is a mistake.";
}

const staffReplies: { keywords: string[]; reply: string }[] = [
  { keywords: ["book", "appointment", "schedule", "reserve"], reply: "Sure! You can book an appointment by going to the 'Book Appointment' section." },
  { keywords: ["cancel", "cancell"], reply: "To cancel your appointment, go to 'My Appointments', find the appointment, and click 'Cancel'." },
  { keywords: ["hours", "open", "time", "when", "schedule"], reply: "Our clinic is open Monday to Saturday, 7:00 AM – 3:00 PM. We are closed on Sundays." },
  { keywords: ["address", "location", "where", "directions", "map"], reply: "We are located at Blk 35 Lot 12 Sector IIB Brgy, Capas, 2315 Tarlac." },
  { keywords: ["doctor", "physician", "available"], reply: "We have Dr. Ana Manalo (General Medicine), Dr. Carlos Rivera (Internal Medicine), Dr. Rosa Santos (Diagnostics), and Dr. Miguel Torres (Specialist)." },
  { keywords: ["thank", "thanks", "salamat", "okay", "ok", "noted"], reply: "You're welcome! 😊 Feel free to message us anytime. Take care and stay healthy!" },
  { keywords: ["hello", "hi", "hey", "good morning", "good afternoon"], reply: "Hello! Good day! 👋 How can we assist you today?" },
];

function getStaffReply(message: string): string {
  const lower = message.toLowerCase();
  for (const item of staffReplies) {
    if (item.keywords.some((k) => lower.includes(k))) return item.reply;
  }
  return "Thank you for reaching out. A clinic staff member will get back to you shortly. For urgent concerns, please call us at (045) 123-4567.";
}

function mapNotificationRecord(record: NotificationRecord): Notification {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    message: record.message,
    timestamp: record.timestamp,
    read: record.read,
  };
}

// ── FIX: admin/staff messages always treated as unread from patient's perspective ──
// The admin panel inserts with read:true (their own read status), but from the
// patient's side, any message from admin/staff should be unread until patient views it.
function mapChatMessageRecord(record: ChatMessageRecord): ChatMessage {
  const isStaff = record.sender_type === "admin" || record.sender_type === "staff";
  return {
    id: record.id,
    sender: record.sender_type === "patient" ? "patient" : isStaff ? "staff" : "bot",
    text: record.message,
    timestamp: record.created_at,
    // For staff/admin messages: use the actual read value from DB
    // (markChatRead will update this to true when patient reads it)
    read: record.read,
  };
}

function sameNotification(a: Notification, b: Notification) {
  return (
    a.id === b.id ||
    (a.type === b.type &&
      a.title === b.title &&
      a.message === b.message &&
      a.timestamp === b.timestamp)
  );
}

function upsertNotification(list: Notification[], incoming: Notification) {
  let found = false;
  const next = list.map((item) => {
    if (!sameNotification(item, incoming)) return item;
    found = true;
    return { ...item, ...incoming };
  });
  return found ? next : [incoming, ...list];
}

function upsertChatMessage(list: ChatMessage[], incoming: ChatMessage) {
  const existingIndex = list.findIndex((item) => item.id === incoming.id);
  if (existingIndex === -1) {
    return [...list, incoming].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  }
  const next = [...list];
  next[existingIndex] = { ...next[existingIndex], ...incoming };
  return next;
}

function removeById<T extends { id: string }>(list: T[], id: string) {
  return list.filter((item) => item.id !== id);
}

function buildChatNotification(message: ChatMessage): Notification {
  return {
    id: `chat-notif-${message.id}`,
    type: "ChatReply",
    title: "New message from Clinic Staff",
    message: message.text.length > 80 ? `${message.text.slice(0, 80)}...` : message.text,
    timestamp: message.timestamp,
    read: message.read,
  };
}

function buildLoginNotification(now: Date): Notification {
  return {
    id: `notif-login-${now.getTime()}`,
    type: "Login",
    title: "Login Detected",
    message: `You logged in on ${now.toLocaleDateString("en-PH", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })} at ${now.toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
    })}. If this wasn't you, please contact the clinic immediately.`,
    timestamp: now.toISOString(),
    read: false,
  };
}

function getToastId(notification: Notification) {
  return `${notification.type}-${notification.timestamp}-${notification.title}`;
}

function sortNotifications(list: Notification[]) {
  return [...list].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function getDismissedNotificationsStorageKey(email: string) {
  return `dismissed-notifications:${sanitizeEmail(email)}`;
}

function getDismissedNotificationIds(email: string) {
  if (typeof window === "undefined" || !email) return [] as string[];
  try {
    const raw = window.localStorage.getItem(getDismissedNotificationsStorageKey(email));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

function appendDismissedNotificationIds(email: string, ids: string[]) {
  if (typeof window === "undefined" || !email || ids.length === 0) return;
  const next = Array.from(new Set([...getDismissedNotificationIds(email), ...ids]));
  window.localStorage.setItem(getDismissedNotificationsStorageKey(email), JSON.stringify(next));
}

function isNotificationDismissed(email: string, id: string) {
  return getDismissedNotificationIds(email).includes(id);
}

function filterDismissedNotifications(email: string, list: Notification[]) {
  if (!email) return list;
  const dismissed = new Set(getDismissedNotificationIds(email));
  return list.filter((notification) => !dismissed.has(notification.id));
}

interface AppContextType {
  isAuthenticated: boolean;
  authErrorMessage: string;
  profile: PatientProfile;
  clinicName: string;
  clinicAddress: string;
  clinicPhone: string;
  clinicMapsLink: string;
  clinicSchedule: { day: string; hours: string; closed?: boolean }[];
  clinicIsOpen: boolean;
  appointments: Appointment[];
  notifications: Notification[];
  chatMessages: ChatMessage[];
  slotBookings: Record<string, number>;
  unreadCount: number;
  unreadChatCount: number;
  loading: boolean;
  loginTimestamp: Date | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  clearAuthError: () => void;
  register: (data: Partial<PatientProfile> & { password: string }) => Promise<{ error: string | null }>;
  updateProfile: (data: Partial<PatientProfile>) => Promise<void>;
  addAppointment: (data: Omit<Appointment, "id" | "status" | "mode">, validIdUrl?: string) => Promise<void>;
  cancelAppointment: (id: string) => void;
  getSlotCount: (date: string, time: string) => number;
  isSlotFull: (date: string, time: string) => boolean;
  hasAppointmentOnDate: (date: string) => boolean;
  markNotificationRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearNotifications: () => Promise<void>;
  sendChatMessage: (text: string) => void;
  markChatRead: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState("");
  const [profile, setProfile] = useState<PatientProfile>(defaultProfile);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [slotBookings, setSlotBookings] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [loginTimestamp, setLoginTimestamp] = useState<Date | null>(null);
  const [clinicName, setClinicName] = useState("Manalo Medical Clinic");
  const [clinicAddress, setClinicAddress] = useState("Blk 35 Lot 12 Sector IIB Brgy, Capas, 2315 Tarlac");
  const [clinicPhone, setClinicPhone] = useState("(045) 123-4567");
  const [clinicMapsLink, setClinicMapsLink] = useState("https://maps.app.goo.gl/mVSMzAtFzsqz4nwi6");
  const [clinicSchedule, setClinicSchedule] = useState([
    { day: "Monday", hours: "7:00 AM – 3:00 PM", closed: false },
    { day: "Tuesday", hours: "7:00 AM – 3:00 PM", closed: false },
    { day: "Wednesday", hours: "7:00 AM – 3:00 PM", closed: false },
    { day: "Thursday", hours: "7:00 AM – 3:00 PM", closed: false },
    { day: "Friday", hours: "7:00 AM – 3:00 PM", closed: false },
    { day: "Saturday", hours: "7:00 AM – 3:00 PM", closed: false },
    { day: "Sunday", hours: "Closed", closed: true },
  ]);

  const applyClinicSettings = (data: Record<string, any>) => {
    if (data.clinic_name) setClinicName(data.clinic_name);
    if (data.address) setClinicAddress(data.address);
    if (data.phone) setClinicPhone(data.phone);
    if (data.maps_link) setClinicMapsLink(data.maps_link);
    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
    setClinicSchedule(days.map((day) => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      hours: data[day] || "Closed",
      closed: data[day] === "Closed" || !data[day],
    })));
  };

  const clearAuthState = (message = "") => {
    setIsAuthenticated(false);
    setProfile(defaultProfile);
    setAppointments([]);
    setNotifications([]);
    setChatMessages([]);
    setSlotBookings({});
    setAuthErrorMessage(message);
  };

  const clearAuthError = () => setAuthErrorMessage("");

  const signOutAndClear = async (message = "") => {
    await supabase.auth.signOut();
    clearAuthState(message);
  };

  const validatePatientAccess = async (
    patientData: PatientRecord | null,
    options?: { missingMessage?: string },
  ): Promise<
    | { allowed: true; patient: PatientRecord }
    | { allowed: false; code: LoginFailureCode; message: string }
  > => {
    if (!patientData) {
      return {
        allowed: false,
        code: "deleted_or_missing",
        message: options?.missingMessage ?? buildDeletedMessage(),
      };
    }

    if (patientData.status?.toLowerCase() === "deleted") {
      return { allowed: false, code: "deleted_or_missing", message: buildDeletedMessage() };
    }

    if (patientData.status?.toLowerCase() !== "suspended") {
      return { allowed: true, patient: patientData };
    }

    const suspendedUntil = patientData.suspended_until ? new Date(patientData.suspended_until) : null;
    const now = new Date();

    if (suspendedUntil && !Number.isNaN(suspendedUntil.getTime()) && suspendedUntil <= now) {
      const normalizedPatient: PatientRecord = {
        ...patientData,
        status: "active",
        suspended_until: null,
        suspension_reason: null,
      };

      const { data: updatedPatient } = await supabase
        .from("patients")
        .update({ status: "active", suspended_until: null, suspension_reason: null })
        .eq("id", patientData.id)
        .select("*")
        .maybeSingle();

      return {
        allowed: true,
        patient: (updatedPatient as PatientRecord | null) ?? normalizedPatient,
      };
    }

    return {
      allowed: false,
      code: "suspended",
      message: buildSuspensionMessage(patientData.suspension_reason, patientData.suspended_until),
    };
  };

  const fetchAppointments = async (email: string) => {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('patient_email', email)
      .order('created_at', { ascending: false });

    if (error || !data) return;

    const mapped: Appointment[] = data.map((a: any) => ({
      id: a.id,
      date: a.date,
      time: a.time,
      doctor: a.doctor_name,
      consultationType: a.type,
      reason: a.reason,
      status: (a.status.charAt(0).toUpperCase() + a.status.slice(1)) as AppointmentStatus,
      mode: "Online",
      createdAt: a.created_at || undefined,
      notes: a.notes || undefined,
      cancelledAt: a.cancelled_at || undefined,
    }));

    setAppointments(mapped);

    const map: Record<string, number> = {};
    for (const apt of mapped) {
      if (apt.status !== "Cancelled" && apt.status !== "Rejected") {
        const key = slotKey(apt.date, apt.time);
        map[key] = (map[key] ?? 0) + 1;
      }
    }
    setSlotBookings(map);
  };

  const fetchNotifications = async (email: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('patient_email', email)
      .order('timestamp', { ascending: false });

    if (error || !data) return;

    const mapped: Notification[] = filterDismissedNotifications(
      email,
      data.map((n: NotificationRecord) => mapNotificationRecord(n)),
    );

    setNotifications(sortNotifications(mapped));
  };

  // ── FIX: fetch chat messages and check unread status from notifications table ──
  // Since admin inserts chat_messages with read:true (their own perspective),
  // we check the notifications table for the patient's unread status instead.
  const fetchChatMessages = async (email: string, patientId?: string) => {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, sender_type, message, created_at, read")
      .eq("patient_email", email)
      .order("created_at", { ascending: true });

    if (error || !data) return;

    // ── FIX: fetch which chat messages the patient has already read ──
    // We store patient-read status in notifications table (chat-notif-{id} with read bool)
    const { data: chatNotifData } = await supabase
      .from("notifications")
      .select("id, read")
      .eq("patient_email", email)
      .eq("type", "ChatReply");

    // Build a map: chat message id → patient has read it
    const patientReadMap = new Map<string, boolean>();
    for (const n of (chatNotifData || [])) {
      // notification id format: "chat-notif-{messageId}"
      const msgId = n.id.replace("chat-notif-", "");
      patientReadMap.set(msgId, n.read);
    }

    // Map messages — for staff/admin, use patient's read status from notifications
    const mappedMessages: ChatMessage[] = data.map((record: ChatMessageRecord) => {
      const isStaff = record.sender_type === "admin" || record.sender_type === "staff";
      return {
        id: record.id,
        sender: record.sender_type === "patient" ? "patient" : isStaff ? "staff" : "bot",
        text: record.message,
        timestamp: record.created_at,
        // ── FIX: use patient-side read status, not admin-side ──
        read: isStaff
          ? (patientReadMap.has(record.id) ? patientReadMap.get(record.id)! : false)
          : record.read,
      };
    });

    setChatMessages(mappedMessages);

    // Build chat notifications for staff messages
    const chatNotifications = filterDismissedNotifications(
      email,
      mappedMessages
        .filter((message) => message.sender === "staff")
        .map((message) => buildChatNotification(message)),
    );

    if (chatNotifications.length > 0) {
      setNotifications((prev) => {
        let next = [...prev];
        for (const notification of chatNotifications) {
          next = upsertNotification(next, notification);
        }
        return sortNotifications(next);
      });
    }

    if (patientId && chatNotifications.length > 0) {
      await supabase.from("notifications").upsert(
        chatNotifications.map((notification) => ({
          id: notification.id,
          patient_id: patientId,
          patient_email: email,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp: notification.timestamp,
          read: notification.read,
        })),
        { onConflict: "id" },
      );
    }
  };

  const saveNotification = async (notif: Notification, patientId: string, patientEmail: string) => {
    await supabase.from('notifications').upsert({
      id: notif.id,
      patient_id: patientId,
      patient_email: patientEmail,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      timestamp: notif.timestamp,
      read: notif.read,
    }, { onConflict: "id" });
  };

  useEffect(() => {
    const fetchClinicSettings = async () => {
      const { data } = await supabase
        .from('clinic_settings')
        .select('*')
        .limit(1)
        .single();
      if (!data) return;
      applyClinicSettings(data);
    };
    fetchClinicSettings();

    const clinicSettingsChannel = supabase
      .channel("patient-clinic-settings")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "clinic_settings",
      }, (payload) => {
        if (payload.eventType === "DELETE") return;
        applyClinicSettings(payload.new as Record<string, any>);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(clinicSettingsChannel);
    };
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user?.email) {
        const email = sanitizeEmail(data.session.user.email);
        const { data: patientData } = await supabase
          .from('patients')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        const access = await validatePatientAccess(patientData as PatientRecord | null, {
          missingMessage: "",
        });

        if (!access.allowed) {
          await signOutAndClear(access.message);
          return;
        }

        if (access.patient) {
          setAuthErrorMessage("");
          setProfile(mapPatientToProfile(access.patient));
          await fetchAppointments(email);
          await fetchNotifications(email);
          await fetchChatMessages(email, access.patient.id);
          setIsAuthenticated(true);
        }
      }
    };
    checkSession();
  }, []);

  useEffect(() => {
    if (!profile.email) return;

    const channel = supabase
      .channel(`patient-appointments-${profile.email}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "appointments",
        filter: `patient_email=eq.${profile.email}`,
      }, () => { void fetchAppointments(profile.email); })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile.email]);

  useEffect(() => {
    if (!profile.email) return;

    const channel = supabase
      .channel(`patient-notifications-${profile.email}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "notifications",
        filter: `patient_email=eq.${profile.email}`,
      }, (payload) => {
        if (payload.eventType === "DELETE") {
          const deleted = payload.old as { id: string };
          setNotifications((prev) => removeById(prev, deleted.id));
          return;
        }

        const nextNotification = mapNotificationRecord(payload.new as NotificationRecord);
        if (isNotificationDismissed(profile.email, nextNotification.id)) return;

        setNotifications((prev) => sortNotifications(upsertNotification(prev, nextNotification)));

        if (payload.eventType === "INSERT" && !nextNotification.read) {
          toast(nextNotification.title, {
            id: getToastId(nextNotification),
            description: nextNotification.message,
          });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile.email]);

  // ── Realtime: chat messages ──
  useEffect(() => {
    if (!profile.email) return;

    const channel = supabase
      .channel(`patient-chat-notifications-${profile.email}`)
      .on("postgres_changes", {
        event: "*", schema: "public", table: "chat_messages",
        filter: `patient_email=eq.${profile.email}`,
      }, (payload) => {
        if (payload.eventType === "DELETE") {
          const deleted = payload.old as { id: string };
          setChatMessages((prev) => removeById(prev, deleted.id));
          return;
        }

        const record = payload.new as ChatMessageRecord;
        const isStaff = record.sender_type === "admin" || record.sender_type === "staff";

        // ── FIX: staff messages are always unread from patient's perspective on arrival ──
        const nextMessage: ChatMessage = {
          id: record.id,
          sender: record.sender_type === "patient" ? "patient" : isStaff ? "staff" : "bot",
          text: record.message,
          timestamp: record.created_at,
          read: isStaff ? false : record.read, // staff messages always unread until patient reads
        };

        setChatMessages((prev) => upsertChatMessage(prev, nextMessage));

        if (nextMessage.sender === "staff") {
          const nextNotification = buildChatNotification(nextMessage);

          if (!isNotificationDismissed(profile.email, nextNotification.id)) {
            setNotifications((prev) => sortNotifications(upsertNotification(prev, nextNotification)));
          }

          // Persist unread chat notification to DB
          if (payload.eventType === "INSERT" && profile.id && profile.email) {
            void saveNotification(
              { ...nextNotification, read: false }, // always unread on insert
              profile.id,
              profile.email,
            );
          }

          // Toast for new staff message
          if (payload.eventType === "INSERT") {
            toast("New message from Clinic Staff", {
              id: getToastId(buildChatNotification(nextMessage)),
              description: nextMessage.text.length > 80
                ? `${nextMessage.text.slice(0, 80)}...`
                : nextMessage.text,
            });
          }
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile.email, profile.id]);

  const login = async (email: string, password: string): Promise<LoginResult> => {
    setLoading(true);
    setAuthErrorMessage("");
    const cleanEmail = sanitizeEmail(email);
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error || !data.user) {
      setLoading(false);
      return {
        success: false,
        code: "invalid_credentials",
        message: "Invalid email or password. Please check your credentials.",
      };
    }

    const { data: patientData } = await supabase
      .from('patients')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    const access = await validatePatientAccess(patientData as PatientRecord | null);

    if (!access.allowed) {
      await signOutAndClear();
      setLoading(false);
      return { success: false, code: access.code, message: access.message };
    }

    const now = new Date();
    setLoginTimestamp(now);

    if (access.patient) {
      const profileData = mapPatientToProfile(access.patient);
      setProfile(profileData);
      await fetchAppointments(cleanEmail);
      await fetchNotifications(cleanEmail);
      await fetchChatMessages(cleanEmail, access.patient.id);

      const loginNotif = buildLoginNotification(now);
      setNotifications((prev) => sortNotifications(upsertNotification(prev, loginNotif)));
      void saveNotification(loginNotif, access.patient.id, cleanEmail);
    }

    setIsAuthenticated(true);
    setLoading(false);
    return { success: true };
  };

  const register = async (data: Partial<PatientProfile> & { password: string }): Promise<{ error: string | null }> => {
    const cleanEmail = sanitizeEmail(data.email || "");
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: cleanEmail,
      password: data.password,
    });
    if (authError) return { error: authError.message };

    const { data: newPatient, error: dbError } = await supabase.from('patients').insert({
      id: authData?.user?.id,
      full_name: sanitizeText(data.fullName || ""),
      email: cleanEmail,
      contact_number: toStoredPhoneNumber(data.contactNumber),
      gender: sanitizeText(data.gender || ""),
      date_of_birth: sanitize(data.dateOfBirth || ""),
      address: sanitizeText(data.address || ""),
      emergency_contact_name: sanitizeText(data.emergencyContactName || ""),
      emergency_contact_number: toStoredPhoneNumber(data.emergencyContactNumber),
    }).select().single();
    if (dbError) return { error: dbError.message };

    setProfile((p) => ({
      ...p, ...data,
      id: newPatient?.id || authData?.user?.id || "",
      email: cleanEmail,
      fullName: sanitizeText(data.fullName || ""),
      contactNumber: data.contactNumber ? formatPhonePH(data.contactNumber) : "",
      gender: sanitizeText(data.gender || ""),
      dateOfBirth: sanitize(data.dateOfBirth || ""),
      address: sanitizeText(data.address || ""),
      emergencyContactName: sanitizeText(data.emergencyContactName || ""),
      emergencyContactNumber: data.emergencyContactNumber ? formatPhonePH(data.emergencyContactNumber) : "",
    }));
    setIsAuthenticated(true);
    return { error: null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
    clearAuthState();
  };

  const updateProfile = async (data: Partial<PatientProfile>) => {
    setProfile((p) => ({
      ...p, ...data,
      fullName: data.fullName === undefined ? p.fullName : sanitizeText(data.fullName),
      email: data.email === undefined ? p.email : sanitizeEmail(data.email),
      gender: data.gender === undefined ? p.gender : sanitizeText(data.gender),
      dateOfBirth: data.dateOfBirth === undefined ? p.dateOfBirth : sanitize(data.dateOfBirth),
      address: data.address === undefined ? p.address : sanitizeText(data.address),
      contactNumber: data.contactNumber === undefined ? p.contactNumber : formatPhonePH(data.contactNumber),
      emergencyContactName: data.emergencyContactName === undefined ? p.emergencyContactName : sanitizeText(data.emergencyContactName),
      emergencyContactNumber: data.emergencyContactNumber === undefined ? p.emergencyContactNumber : formatPhonePH(data.emergencyContactNumber),
    }));
    if (profile.id) {
      await supabase.from('patients').update({
        full_name: data.fullName === undefined ? undefined : sanitizeText(data.fullName),
        email: data.email === undefined ? undefined : sanitizeEmail(data.email),
        contact_number: toStoredPhoneNumber(data.contactNumber),
        gender: data.gender === undefined ? undefined : sanitizeText(data.gender),
        date_of_birth: data.dateOfBirth === undefined ? undefined : sanitize(data.dateOfBirth),
        address: data.address === undefined ? undefined : sanitizeText(data.address),
        emergency_contact_name: data.emergencyContactName === undefined ? undefined : sanitizeText(data.emergencyContactName),
        emergency_contact_number: toStoredPhoneNumber(data.emergencyContactNumber),
      }).eq('id', profile.id);
    }
  };

  const getSlotCount = (date: string, time: string) => slotBookings[slotKey(date, time)] ?? 0;
  const isSlotFull = (date: string, time: string) => getSlotCount(date, time) >= MAX_SLOT_CAPACITY;

  const hasAppointmentOnDate = (date: string): boolean => {
    return appointments.some(
      (a) => a.date === date && a.status !== "Cancelled" && a.status !== "Rejected"
    );
  };

  const addAppointment = async (data: Omit<Appointment, "id" | "status" | "mode">, validIdUrl?: string) => {
    const { data: inserted, error } = await supabase.from('appointments').insert({
      patient_id: profile.id,
      patient_name: profile.fullName,
      patient_email: profile.email,
      patient_phone: toStoredPhoneNumber(profile.contactNumber) || profile.contactNumber,
      doctor_name: data.doctor,
      date: data.date,
      time: data.time,
      type: data.consultationType,
      status: 'pending',
      reason: data.reason,
      valid_id_url: validIdUrl || null,
    }).select().single();

    if (error) { console.error('Error saving appointment:', error); return; }

    const newApt: Appointment = {
      id: inserted.id,
      date: data.date,
      time: data.time,
      doctor: data.doctor,
      consultationType: data.consultationType,
      reason: data.reason,
      status: "Pending",
      mode: "Online",
      createdAt: inserted.created_at || new Date().toISOString(),
    };

    setAppointments((prev) => [newApt, ...prev]);
    const key = slotKey(data.date, data.time);
    setSlotBookings((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));

    const notif: Notification = {
      id: `notif-${Date.now()}`,
      type: "Update",
      title: "Appointment Submitted",
      message: `Your appointment with ${data.doctor} on ${new Date(data.date + "T12:00:00").toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })} at ${data.time} is now pending approval.`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
    await saveNotification(notif, profile.id, profile.email);
  };

  const cancelAppointment = async (id: string) => {
    await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', id);

    setAppointments((prev) =>
      prev.map((a) => {
        if (a.id !== id) return a;
        if (a.status !== "Cancelled") {
          const key = slotKey(a.date, a.time);
          setSlotBookings((sb) => ({ ...sb, [key]: Math.max(0, (sb[key] ?? 0) - 1) }));
        }
        return { ...a, status: "Cancelled" as AppointmentStatus, cancelledAt: new Date().toISOString() };
      })
    );

    const apt = appointments.find((a) => a.id === id);
    if (apt) {
      const notif: Notification = {
        id: `notif-${Date.now()}`,
        type: "Cancelled",
        title: "Appointment Cancelled",
        message: `Your appointment with ${apt.doctor} on ${new Date(apt.date + "T12:00:00").toLocaleDateString("en-PH", { month: "long", day: "numeric" })} at ${apt.time} has been cancelled.`,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);
      await saveNotification(notif, profile.id, profile.email);
    }
  };

  const markNotificationRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

    if (id.startsWith("chat-notif-")) {
      const chatMessageId = id.replace("chat-notif-", "");
      setChatMessages((prev) =>
        prev.map((message) => message.id === chatMessageId ? { ...message, read: true } : message)
      );
      await supabase.from("chat_messages").update({ read: true }).eq("id", chatMessageId);
    }

    await supabase.from('notifications').update({ read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setChatMessages((prev) =>
      prev.map((message) => message.sender === "staff" ? { ...message, read: true } : message)
    );

    if (profile.email) {
      await supabase.from('notifications').update({ read: true }).eq('patient_email', profile.email).eq('read', false);
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("patient_email", profile.email)
        .eq("type", "ChatReply")
        .eq("read", false);
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => removeById(prev, id));
    if (profile.email) {
      appendDismissedNotificationIds(profile.email, [id]);
      await supabase.from("notifications").delete().eq("patient_email", profile.email).eq("id", id);
    }
  };

  const clearNotifications = async () => {
    setNotifications([]);
    if (profile.email) {
      appendDismissedNotificationIds(profile.email, notifications.map((n) => n.id));
      await supabase.from('notifications').delete().eq('patient_email', profile.email);
    }
  };

  // ── markChatRead: marks all staff messages as read from patient's perspective ──
  const markChatRead = async () => {
    setChatMessages((prev) =>
      prev.map((message) => message.sender === "staff" ? { ...message, read: true } : message)
    );

    setNotifications((prev) =>
      prev.map((n) => n.type === "ChatReply" ? { ...n, read: true } : n)
    );

    if (profile.email) {
      // Mark ChatReply notifications as read (this is how we track patient-read status)
      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("patient_email", profile.email)
        .eq("type", "ChatReply")
        .eq("read", false);
    }
  };

  const sendChatMessage = (text: string) => {
    const patientMsg: ChatMessage = {
      id: `chat-${Date.now()}`,
      sender: "patient",
      text,
      timestamp: new Date().toISOString(),
      read: true,
    };
    setChatMessages((prev) => [...prev, patientMsg]);
    const delay = 2000 + Math.random() * 2000;
    setTimeout(async () => {
      const staffMsg: ChatMessage = {
        id: `chat-staff-${Date.now()}`,
        sender: "staff",
        text: getStaffReply(text),
        timestamp: new Date().toISOString(),
        read: false,
      };
      setChatMessages((prev) => [...prev, staffMsg]);
      const notif: Notification = {
        id: `notif-chat-${Date.now()}`,
        type: "ChatReply",
        title: "New message from Clinic Staff",
        message: staffMsg.text.length > 80 ? staffMsg.text.slice(0, 80) + "…" : staffMsg.text,
        timestamp: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);
      if (profile.id && profile.email) {
        await saveNotification(notif, profile.id, profile.email);
      }
    }, delay);
  };

  // ── Derived counts ──
  const unreadCount = notifications.filter((n) => !n.read).length;
  // ── FIX: count unread chat messages using notifications table read status ──
  const unreadChatCount = notifications.filter((n) => n.type === "ChatReply" && !n.read).length;
  const clinicIsOpen = getClinicStatus(clinicSchedule, new Date()).isOpen;

  return (
    <AppContext.Provider value={{
      isAuthenticated, authErrorMessage, profile, appointments, notifications,
      chatMessages, slotBookings, unreadCount, unreadChatCount, loading,
      clinicName, clinicAddress, clinicPhone, clinicMapsLink, clinicSchedule, clinicIsOpen,
      loginTimestamp,
      login, logout, clearAuthError, register, updateProfile, addAppointment, cancelAppointment,
      getSlotCount, isSlotFull, hasAppointmentOnDate,
      markNotificationRead, markAllRead, deleteNotification, clearNotifications,
      sendChatMessage, markChatRead,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
