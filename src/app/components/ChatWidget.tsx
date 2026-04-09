import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2, UserCheck } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useApp } from "../context/AppContext";

interface Message {
  id: string;
  role: "user" | "bot" | "staff";
  text: string;
  time: string;
}

function getTime() {
  return new Date().toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

const aiResponses: { keywords: string[]; reply: string }[] = [
  { keywords: ["book", "appointment", "schedule", "reserve"], reply: "To book an appointment, head to the **Book Appointment** page from the sidebar!" },
  { keywords: ["cancel", "cancell"], reply: "Go to **My Appointments**, expand the appointment card, and click 'Cancel Appointment'." },
  { keywords: ["hours", "open", "time", "when"], reply: "Our clinic is open:\n• **Monday – Saturday**: 7:00 AM – 3:00 PM\n• **Sunday**: Closed" },
  { keywords: ["address", "location", "where", "map"], reply: "We are located at **Blk 35 Lot 12 Sector IIB Brgy, Capas, 2315 Tarlac**." },
  { keywords: ["contact", "phone", "number", "call"], reply: "You can reach us at **(045) 123-4567** during clinic hours." },
  { keywords: ["doctor", "physician", "specialist"], reply: "Our doctors:\n• Dr. Ana Manalo (General Medicine)\n• Dr. Carlos Rivera (Internal Medicine)\n• Dr. Rosa Santos (Diagnostics)\n• Dr. Miguel Torres (Specialist)" },
  { keywords: ["hello", "hi", "hey", "good morning", "good afternoon"], reply: "Hello! 👋 I'm your Manalo Clinic assistant. How can I help you today?" },
  { keywords: ["thank", "thanks", "salamat"], reply: "You're welcome! 😊 Take care and stay healthy!" },
  { keywords: ["status", "approved", "pending", "rejected"], reply: "Check your appointment status anytime in **My Appointments**." },
];

function generateResponse(input: string): string {
  const lower = input.toLowerCase();
  for (const item of aiResponses) {
    if (item.keywords.some((kw) => lower.includes(kw))) return item.reply;
  }
  return "I'm not sure I understood that. For complex concerns, please call us at (045) 123-4567.";
}

function renderMessage(text: string) {
  return text.split("\n").map((line, i) => {
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className={i > 0 ? "mt-1" : ""}>
        {parts.map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
      </p>
    );
  });
}

const WELCOME: Message = {
  id: "welcome",
  role: "bot",
  text: "Hi! I'm your Manalo Clinic assistant. How can I help you today?",
  time: getTime(),
};

export function ChatWidget() {
  const { profile, isAuthenticated } = useApp();
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const resolvedEmail = isAuthenticated ? profile.email : "";
  const resolvedName = isAuthenticated ? (profile.fullName || profile.email) : "";

  useEffect(() => {
    if (open && !minimized) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, minimized, typing]);

  useEffect(() => {
    if (!resolvedEmail) return;

    const channel = supabase
      .channel(`patient-chat-${resolvedEmail}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `patient_email=eq.${resolvedEmail}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.sender_type === 'admin' || newMsg.sender_type === 'staff') {
            setMessages(prev => [...prev, {
              id: newMsg.id,
              role: 'staff',
              text: newMsg.message,
              time: new Date(newMsg.created_at).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }),
            }]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [resolvedEmail]);

  const saveToSupabase = async (text: string, senderType: "patient" | "bot") => {
    if (!resolvedEmail) return;
    await supabase.from("chat_messages").insert({
      patient_email: resolvedEmail,
      patient_name: resolvedName || resolvedEmail,
      sender_type: senderType,
      message: text,
      read: false,
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    setMessages(m => [...m, { id: `u-${Date.now()}`, role: "user", text, time: getTime() }]);
    setTyping(true);

    if (resolvedEmail) await saveToSupabase(text, "patient");

    await new Promise(r => setTimeout(r, 900 + Math.random() * 700));
    const reply = generateResponse(text);

    if (resolvedEmail) await saveToSupabase(reply, "bot");

    setTyping(false);
    setMessages(m => [...m, { id: `b-${Date.now()}`, role: "bot", text: reply, time: getTime() }]);
  };

  const isLoggedIn = !!resolvedEmail;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col"
            style={{ width: 340, height: minimized ? "auto" : 480 }}
          >
            <div className="bg-gradient-to-r from-[#0A2463] to-[#1B4FD8] px-5 py-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Bot size={18} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white text-sm font-semibold">Manalo AI Assistant</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                  <p className="text-white/70 text-xs">
                    {isLoggedIn ? resolvedName : "Online"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMinimized(!minimized)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                  <Minimize2 size={14} />
                </button>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {!minimized && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#F8FAFF]">
                  {messages.map((msg) => (
                    <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user"
                        ? "bg-[#0A2463] text-white"
                        : msg.role === "staff"
                          ? "bg-emerald-500 text-white"
                          : "bg-[#1B4FD8]/15 text-[#1B4FD8]"
                        }`}>
                        {msg.role === "user" ? (
                          <User size={14} />
                        ) : msg.role === "staff" ? (
                          <UserCheck size={14} />
                        ) : (
                          <Bot size={14} />
                        )}
                      </div>

                      <div className={`max-w-[75%] flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}>
                        {msg.role === "staff" && (
                          <span className="text-[10px] text-emerald-600 font-semibold px-1 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                            Clinic Staff
                          </span>
                        )}
                        <div className={`px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${msg.role === "user"
                          ? "bg-[#1B4FD8] text-white rounded-tr-none"
                          : msg.role === "staff"
                            ? "bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-tl-none shadow-sm"
                            : "bg-white text-gray-700 shadow-sm rounded-tl-none border border-gray-100"
                          }`}>
                          {renderMessage(msg.text)}
                        </div>
                        <span className="text-[10px] text-gray-400 px-1">{msg.time}</span>
                      </div>
                    </motion.div>
                  ))}

                  {typing && (
                    <div className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#1B4FD8]/15 flex items-center justify-center shrink-0">
                        <Bot size={14} className="text-[#1B4FD8]" />
                      </div>
                      <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1">
                        {[0, 0.15, 0.3].map((delay, i) => (
                          <span key={i} className="w-1.5 h-1.5 rounded-full bg-gray-400"
                            style={{ animation: `bounce 1s ${delay}s infinite` }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <div ref={bottomRef} />
                </div>

                <div className="px-4 py-3 bg-white border-t border-gray-100">
                  {!isLoggedIn && (
                    <p className="text-[10px] text-amber-600 text-center mb-2 bg-amber-50 rounded-lg py-1.5 px-2">
                      ⚠️ Login to save your conversation with clinic staff
                    </p>
                  )}
                  <div className="flex gap-2 items-end">
                    <textarea
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                      placeholder="Type your question..."
                      rows={1}
                      className="flex-1 bg-[#F4F7FF] rounded-xl px-3.5 py-2.5 text-xs text-gray-700 outline-none resize-none leading-relaxed max-h-24 overflow-y-auto"
                      style={{ fontFamily: "DM Sans, sans-serif" }}
                    />
                    <button
                      onClick={send}
                      disabled={!input.trim() || typing}
                      className="w-9 h-9 rounded-xl bg-[#1B4FD8] hover:bg-[#0A2463] text-white flex items-center justify-center shrink-0 transition-all disabled:opacity-40"
                    >
                      {typing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    </button>
                  </div>
                  <p className="text-[10px] text-center mt-2" style={{ color: isLoggedIn ? "#059669" : "#9CA3AF" }}>
                    {isLoggedIn
                      ? "✓ Conversation synced with clinic staff"
                      : "AI assistant only • Login to reach clinic staff"}
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => { setOpen(!open); setMinimized(false); }}
        className="w-14 h-14 rounded-full bg-gradient-to-br from-[#1B4FD8] to-[#0A2463] text-white shadow-2xl shadow-[#1B4FD8]/40 flex items-center justify-center relative"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
              <X size={22} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.2 }}>
              <MessageCircle size={22} />
            </motion.div>
          )}
        </AnimatePresence>
        {!open && <span className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-teal-400 border-2 border-white" />}
      </motion.button>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}
