import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Send, User, Stethoscope, Clock } from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string) {
  const d = new Date(ts);

  // Get date string in PH timezone
  const phLocale = "en-PH";
  const phTimeZone = "Asia/Manila";

  const toDateOnly = (date: Date) =>
    new Date(date.toLocaleDateString(phLocale, { timeZone: phTimeZone }));

  const dDate = toDateOnly(d);
  const today = toDateOnly(new Date());
  const yesterday = toDateOnly(new Date(Date.now() - 86400000));

  if (dDate.getTime() === today.getTime()) return "Today";
  if (dDate.getTime() === yesterday.getTime()) return "Yesterday";

  return d.toLocaleDateString(phLocale, {
    timeZone: phTimeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

interface ChatMsg {
  id: string;
  sender_type: "patient" | "admin" | "bot";
  message: string;
  created_at: string;
  patient_email: string;
  patient_name: string;
}

export function Chat() {

  const { profile, isAuthenticated, markChatRead, chatMessages, clinicIsOpen, clinicSchedule } = useApp();
  const [input, setInput] = useState("");
  const [isStaffTyping, setIsStaffTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const todaySchedule = clinicSchedule[new Date().getDay()];

  useEffect(() => {
    setLoading(false);
    // When new messages arrive (from staff) while user is on Chat page,
    // mark them as read immediately since they're actively viewing the chat.
    if (chatMessages.some(m => m.sender === 'staff' && !m.read)) {
      void markChatRead();
    }
  }, [chatMessages]);

  useEffect(() => {
    if (!isAuthenticated || !profile.email) return;
    void markChatRead();
  }, [isAuthenticated, profile.email]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isStaffTyping]);

  // ── Send message ──
  const handleSend = async () => {
    const text = input.trim();
    if (!text || !isAuthenticated) return;
    setInput("");

    const { error } = await supabase.from("chat_messages").insert({
      patient_email: profile.email,
      patient_name: profile.fullName || profile.email,
      sender_type: "patient",
      message: text,
      read: false,
    });

    if (error) {
      console.error("Send error:", error.message);
      return;
    }

    void markChatRead();
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Group by date ──
  const mappedMessages: ChatMsg[] = chatMessages.map(m => ({
    id: m.id,
    sender_type: m.sender === "patient" ? "patient" : m.sender === "staff" ? "admin" : "bot",
    message: m.text,
    created_at: m.timestamp,
    patient_email: profile.email || "",
    patient_name: profile.fullName || "",
  }));

  const groups: { date: string; messages: ChatMsg[] }[] = [];
  for (const msg of mappedMessages) {
    const label = formatDate(msg.created_at);
    const last = groups[groups.length - 1];
    if (!last || last.date !== label) groups.push({ date: label, messages: [msg] });
    else last.messages.push(msg);
  }

  const quickReplies = [
    "What are your clinic hours?",
    "How do I book an appointment?",
    "Where is the clinic located?",
    "I need to cancel my appointment",
  ];

  return (
    <DashboardLayout title="Chat with Staff">
      <div className="max-w-2xl mx-auto flex min-h-0 flex-col" style={{ height: "calc(100vh - 8rem)" }}>

        {/* Staff info header */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-4 flex items-center gap-3 sm:gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-[#E8F1FF] flex items-center justify-center">
              <Stethoscope size={22} className="text-[#1B4FD8]" />
            </div>
            <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${clinicIsOpen ? "bg-teal-400" : "bg-gray-400"}`} />
          </div>
          <div className="flex-1">
            <p className="text-[#0A2463] font-semibold text-sm">Manalo Medical Clinic — Staff</p>
            <p className={`text-xs flex items-center gap-1 ${clinicIsOpen ? "text-teal-600" : "text-gray-500"}`}>
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${clinicIsOpen ? "bg-teal-400 animate-pulse" : "bg-gray-400"}`} />
              {clinicIsOpen ? "Online" : "Offline"}
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end text-xs text-gray-400 gap-1 text-right">
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {todaySchedule?.hours || "Clinic hours unavailable"}
            </span>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto space-y-1 bg-[#F8FAFF] rounded-2xl border border-gray-100 p-5 mb-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-6 h-6 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
            </div>
          ) : (
            <>
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#E8F1FF] flex items-center justify-center">
                    <Stethoscope size={20} className="text-[#1B4FD8]" />
                  </div>
                  <p className="text-[#0A2463] font-semibold text-sm">Start a conversation</p>
                  <p className="text-gray-400 text-xs">Send a message to our clinic staff</p>
                </div>
              )}
              {groups.map((group) => (
                <div key={group.date}>
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-gray-400 bg-white border border-gray-100 px-3 py-1 rounded-full shadow-sm">
                      {group.date}
                    </span>
                  </div>
                  {group.messages.map((msg) => (
                    <motion.div key={msg.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}
                      className={`flex gap-2.5 mb-3 ${msg.sender_type === "patient" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-auto ${msg.sender_type !== "patient" ? "bg-[#E8F1FF]" : "bg-[#0A2463]"
                        }`}>
                        {msg.sender_type !== "patient"
                          ? <Stethoscope size={14} className="text-[#1B4FD8]" />
                          : <User size={14} className="text-white" />}
                      </div>
                      <div className={`max-w-[78%] flex flex-col gap-1 ${msg.sender_type === "patient" ? "items-end" : "items-start"}`}>
                        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.sender_type !== "patient"
                          ? "bg-white text-gray-700 shadow-sm border border-gray-100 rounded-tl-none"
                          : "bg-[#1B4FD8] text-white rounded-tr-none"
                          }`}>
                          {msg.sender_type !== "patient" && (
                            <p className="text-[10px] text-[#1B4FD8] font-semibold mb-1 uppercase tracking-wider">Clinic Staff</p>
                          )}
                          {msg.message}
                        </div>
                        <span className="text-[10px] text-gray-400 px-1">
                          {formatTime(msg.created_at)}
                          {msg.sender_type === "patient" && <span className="ml-1 text-teal-500">✓✓</span>}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ))}
            </>
          )}

          <AnimatePresence>
            {isStaffTyping && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex gap-2.5 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#E8F1FF] flex items-center justify-center shrink-0">
                  <Stethoscope size={14} className="text-[#1B4FD8]" />
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1.5">
                  {[0, 0.15, 0.3].map((delay, i) => (
                    <span key={i} className="w-2 h-2 rounded-full bg-gray-400"
                      style={{ animation: `bounce 1s ${delay}s infinite` }} />
                  ))}
                  <span className="text-xs text-gray-400 ml-1">Staff is typing…</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        {/* Quick replies */}
        {chatMessages.length === 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {quickReplies.map((q) => (
              <button key={q} onClick={() => setInput(q)}
                className="text-xs bg-white border border-[#1B4FD8]/20 text-[#1B4FD8] hover:bg-[#E8F1FF] px-3 py-1.5 rounded-xl transition-all">
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3 flex gap-3 items-end">
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKey}
            placeholder={isAuthenticated ? "Type your message to clinic staff…" : "Please login to chat with staff"}
            disabled={!isAuthenticated}
            rows={1}
            className="flex-1 bg-[#F4F7FF] rounded-xl px-4 py-2.5 text-sm text-gray-700 outline-none resize-none leading-relaxed max-h-24 overflow-y-auto disabled:opacity-50"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          />
          <button onClick={handleSend} disabled={!input.trim() || !isAuthenticated}
            className="w-10 h-10 rounded-xl bg-[#1B4FD8] hover:bg-[#0A2463] text-white flex items-center justify-center shrink-0 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            <Send size={16} />
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2 px-2">
          {clinicIsOpen ? "Clinic staff is currently available." : "Clinic staff is currently offline based on clinic hours."} For urgent concerns, call us at <strong>0926-068-8255</strong>
        </p>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </DashboardLayout>
  );
}
