import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router";
import { CalendarPlus, X, ChevronRight, Sparkles } from "lucide-react";

interface Step {
  id: string;
  title: string;
  description: string;
  targetSelector: string;
  tooltipPosition: "right" | "bottom" | "top";
}

const STEPS: Step[] = [
  {
    id: "dashboard",
    title: "Welcome to your Patient Portal! 👋",
    description:
      "This is your Dashboard — your home base. Here you can see your approved appointments, notifications, and quickly navigate to all features.",
    targetSelector: "[data-tutorial='dashboard-greeting']",
    tooltipPosition: "bottom",
  },
  {
    id: "book",
    title: "Book an Appointment",
    description:
      "Click here to book a new appointment with our clinic doctors. Choose your preferred doctor, date, and time.",
    targetSelector: "[data-tutorial='nav-book']",
    tooltipPosition: "right",
  },
  {
    id: "appointments",
    title: "My Appointments",
    description:
      "View and manage all your appointments here. You can also cancel pending or approved appointments from this page.",
    targetSelector: "[data-tutorial='nav-appointments']",
    tooltipPosition: "right",
  },
  {
    id: "notifications",
    title: "Notifications",
    description:
      "Check your notifications here for appointment updates and clinic alerts. Unread notifications are shown with a red badge.",
    targetSelector: "[data-tutorial='nav-notifications']",
    tooltipPosition: "right",
  },
  {
    id: "chat",
    title: "Chat with Staff",
    description:
      "Have a question? Chat directly with our clinic staff here. We're happy to help with any concerns.",
    targetSelector: "[data-tutorial='nav-chat']",
    tooltipPosition: "right",
  },
  {
    id: "profile",
    title: "My Profile",
    description:
      "Update your personal information, contact details, and emergency contact here. Keep your profile up to date!",
    targetSelector: "[data-tutorial='nav-profile']",
    tooltipPosition: "right",
  },
];

export function OnboardingTutorial() {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [done, setDone] = useState(false);

  // A newly registered account should always trigger the tutorial once,
  // even if this browser has a previously completed tutorial flag.
  useEffect(() => {
    const pending = localStorage.getItem("tutorial_seen_pending");
    if (pending === "true") {
      localStorage.removeItem("tutorial_seen_pending");
      // Small delay so page renders first
      const t = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  // Update target element rect whenever step changes
  useEffect(() => {
    if (!active) return;
    const updateRect = () => {
      const el = document.querySelector(STEPS[step].targetSelector);
      if (el) {
        setTargetRect(el.getBoundingClientRect());
      } else {
        setTargetRect(null);
      }
    };
    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [active, step]);

  const handleSkip = () => {
    localStorage.setItem("tutorial_seen", "true");
    setActive(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      localStorage.setItem("tutorial_seen", "true");
      setActive(false);
      setDone(true);
    }
  };

  const handleComplete = () => {
    setDone(false);
    navigate("/book");
  };

  if (!active && !done) return null;

  const currentStep = STEPS[step];

  // Compute tooltip position relative to target
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect) return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const pos = currentStep.tooltipPosition;
    if (pos === "right") {
      return {
        top: Math.max(16, targetRect.top + targetRect.height / 2 - 80),
        left: targetRect.right + 24,
      };
    }
    if (pos === "bottom") {
      return {
        top: targetRect.bottom + 20,
        left: Math.max(16, targetRect.left + targetRect.width / 2 - 180),
      };
    }
    // top
    return {
      bottom: window.innerHeight - targetRect.top + 20,
      left: Math.max(16, targetRect.left + targetRect.width / 2 - 180),
    };
  };

  // Spotlight style (box-shadow cutout)
  const getSpotlightStyle = (): React.CSSProperties | undefined => {
    if (!targetRect) return undefined;
    const pad = 8;
    return {
      position: "fixed",
      top: targetRect.top - pad,
      left: targetRect.left - pad,
      width: targetRect.width + pad * 2,
      height: targetRect.height + pad * 2,
      borderRadius: 12,
      boxShadow: "0 0 0 9999px rgba(0,0,0,0.62)",
      zIndex: 9998,
      pointerEvents: "none",
    };
  };

  return (
    <AnimatePresence>
      {/* Completion card */}
      {done && (
        <motion.div
          key="done"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
          style={{ background: "rgba(10,36,99,0.65)", backdropFilter: "blur(6px)" }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 24 }}
            className="bg-white rounded-3xl p-8 text-center max-w-sm w-full shadow-2xl"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.15 }}
              className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1B4FD8] to-[#3A86FF] flex items-center justify-center mx-auto mb-5"
            >
              <Sparkles size={36} className="text-white" />
            </motion.div>
            <h2
              className="text-[#0A2463] mb-2"
              style={{ fontFamily: "Playfair Display, serif", fontSize: "1.5rem", fontWeight: 700 }}
            >
              You're all set! 🎉
            </h2>
            <p className="text-gray-500 text-sm mb-8 leading-relaxed">
              Start by booking your first appointment with our clinic doctors.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleComplete}
              className="w-full bg-[#1B4FD8] hover:bg-[#0A2463] text-white py-3 rounded-xl text-sm font-semibold tracking-wide flex items-center justify-center gap-2 transition-all"
            >
              <CalendarPlus size={17} />
              Get Started — Book Appointment
            </motion.button>
          </motion.div>
        </motion.div>
      )}

      {/* Tutorial overlay */}
      {active && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9997]"
          onClick={handleNext}
          style={{ cursor: "pointer" }}
        />
      )}

      {/* Spotlight */}
      {active && targetRect && (
        <div style={getSpotlightStyle()} />
      )}

      {/* Tooltip card */}
      {active && (
        <motion.div
          key={`tooltip-${step}`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          style={{
            position: "fixed",
            zIndex: 9999,
            width: 360,
            fontFamily: "DM Sans, sans-serif",
            ...getTooltipStyle(),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "#fff", border: "1px solid #E8F1FF" }}
          >
            {/* Header */}
            <div
              className="px-5 pt-5 pb-4"
              style={{ background: "linear-gradient(135deg, #0A2463, #1B4FD8)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-white/70 text-xs font-medium tracking-wider uppercase"
                >
                  Step {step + 1} of {STEPS.length}
                </span>
                <button
                  onClick={handleSkip}
                  className="text-white/60 hover:text-white text-xs flex items-center gap-1 transition-colors"
                >
                  <X size={13} /> Skip Tutorial
                </button>
              </div>
              {/* Progress dots */}
              <div className="flex gap-1.5 mt-2 mb-0.5">
                {STEPS.map((_, i) => (
                  <div
                    key={i}
                    className="h-1 rounded-full transition-all duration-300"
                    style={{
                      width: i === step ? 20 : 6,
                      background: i <= step ? "#fff" : "rgba(255,255,255,0.3)",
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              <h3
                className="text-[#0A2463] mb-2"
                style={{ fontSize: "1rem", fontWeight: 700 }}
              >
                {currentStep.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed mb-4">
                {currentStep.description}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">Click anywhere to continue</p>
                <motion.button
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleNext}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, #1B4FD8, #3A86FF)" }}
                >
                  {step === STEPS.length - 1 ? "Finish" : "Next"}
                  <ChevronRight size={15} />
                </motion.button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

