import { useEffect, useRef, useState } from "react";

// Floating particle type
interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

// Animated counter hook
function useCounter(target: number, duration: number = 2000) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

export function MaintenancePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const [progress, setProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [pulse, setPulse] = useState(false);
  const etaMinutes = useCounter(47, 1800);

  // Fade-in on mount
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Progress bar simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 73) {
          clearInterval(interval);
          return 73;
        }
        return p + 0.4;
      });
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Cycle maintenance steps
  useEffect(() => {
    const steps = [
      "Upgrading database schemas…",
      "Optimizing server clusters…",
      "Deploying security patches…",
      "Syncing health records…",
      "Running diagnostics…",
    ];
    const interval = setInterval(() => {
      setActiveStep((s) => (s + 1) % steps.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  // Pulse effect
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((p) => !p);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Canvas particle system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Init particles
    particlesRef.current = Array.from({ length: 55 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 3 + 1,
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((p) => {
        p.x += p.speedX;
        p.y += p.speedY;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Draw cross (medical cross) for some, circle for others
        if (p.id % 5 === 0) {
          ctx.save();
          ctx.globalAlpha = p.opacity * 0.6;
          ctx.strokeStyle = "#7dd3fc";
          ctx.lineWidth = p.size * 0.5;
          const arm = p.size * 2.5;
          ctx.beginPath();
          ctx.moveTo(p.x - arm, p.y);
          ctx.lineTo(p.x + arm, p.y);
          ctx.moveTo(p.x, p.y - arm);
          ctx.lineTo(p.x, p.y + arm);
          ctx.stroke();
          ctx.restore();
        } else {
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = p.id % 3 === 0 ? "#38bdf8" : "#0ea5e9";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      });

      // Draw connecting lines between nearby particles
      for (let i = 0; i < particlesRef.current.length; i++) {
        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const a = particlesRef.current[i];
          const b = particlesRef.current[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < 120) {
            ctx.save();
            ctx.globalAlpha = (1 - dist / 120) * 0.12;
            ctx.strokeStyle = "#0ea5e9";
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => {
      window.removeEventListener("resize", animate);
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const steps = [
    "Upgrading database schemas…",
    "Optimizing server clusters…",
    "Deploying security patches…",
    "Syncing health records…",
    "Running diagnostics…",
  ];

  const statusCards = [
    { label: "API Services", status: "Offline", icon: "⚡", color: "#f59e0b" },
    { label: "Database", status: "Updating", icon: "🗄️", color: "#38bdf8" },
    { label: "Auth System", status: "Stable", icon: "🔐", color: "#34d399" },
    { label: "CDN", status: "Active", icon: "🌐", color: "#34d399" },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "linear-gradient(135deg, #020817 0%, #0c1a3a 40%, #0d2954 70%, #0a1628 100%)",
        fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease",
      }}
    >
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,600;0,9..40,700;1,9..40,300&family=Sora:wght@300;400;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />

      {/* Background radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(14,165,233,0.10) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top glow orb */}
      <div
        style={{
          position: "absolute",
          top: "-120px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "600px",
          height: "300px",
          background: "radial-gradient(ellipse, rgba(56,189,248,0.18) 0%, transparent 70%)",
          pointerEvents: "none",
          animation: "floatGlow 6s ease-in-out infinite",
        }}
      />

      {/* Grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(56,189,248,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(56,189,248,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Scrollable container */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          height: "100vh",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "40px 20px 60px",
          boxSizing: "border-box",
        }}
      >
        {/* Header badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            background: "rgba(56,189,248,0.08)",
            border: "1px solid rgba(56,189,248,0.25)",
            borderRadius: "100px",
            padding: "6px 18px",
            marginBottom: "48px",
            animation: "slideDown 0.8s ease 0.2s both",
          }}
        >
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: pulse ? "#38bdf8" : "#0ea5e9",
              boxShadow: pulse ? "0 0 12px #38bdf8" : "0 0 6px #0ea5e9",
              transition: "all 0.6s ease",
              display: "inline-block",
            }}
          />
          <span style={{ color: "#7dd3fc", fontSize: "13px", fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            System Maintenance in Progress
          </span>
        </div>

        {/* Main icon / medical cross */}
        <div
          style={{
            position: "relative",
            marginBottom: "32px",
            animation: "slideDown 0.8s ease 0.3s both",
          }}
        >
          {/* Rotating ring */}
          <div
            style={{
              position: "absolute",
              inset: "-20px",
              borderRadius: "50%",
              border: "2px solid transparent",
              borderTopColor: "#38bdf8",
              borderRightColor: "rgba(56,189,248,0.3)",
              animation: "spin 3s linear infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: "-32px",
              borderRadius: "50%",
              border: "1px solid transparent",
              borderBottomColor: "#0ea5e9",
              borderLeftColor: "rgba(14,165,233,0.2)",
              animation: "spin 5s linear infinite reverse",
            }}
          />

          {/* Icon container */}
          <div
            style={{
              width: "96px",
              height: "96px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(56,189,248,0.2), rgba(14,165,233,0.1))",
              border: "1px solid rgba(56,189,248,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 40px rgba(56,189,248,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
              backdropFilter: "blur(10px)",
            }}
          >
            {/* Medical cross SVG */}
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="16" y="4" width="16" height="40" rx="4" fill="url(#crossGrad)" />
              <rect x="4" y="16" width="40" height="16" rx="4" fill="url(#crossGrad)" />
              <defs>
                <linearGradient id="crossGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7dd3fc" />
                  <stop offset="1" stopColor="#0ea5e9" />
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: "clamp(32px, 5vw, 58px)",
            fontWeight: 700,
            color: "#f0f9ff",
            margin: "0 0 12px",
            textAlign: "center",
            letterSpacing: "-0.02em",
            lineHeight: 1.1,
            animation: "slideDown 0.8s ease 0.4s both",
          }}
        >
          We're Under
          <br />
          <span
            style={{
              background: "linear-gradient(90deg, #38bdf8, #7dd3fc, #0ea5e9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              backgroundSize: "200% auto",
              animation: "shimmer 3s linear infinite",
            }}
          >
            Maintenance
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            color: "rgba(186,230,253,0.7)",
            fontSize: "clamp(14px, 2vw, 18px)",
            fontWeight: 300,
            textAlign: "center",
            maxWidth: "480px",
            lineHeight: 1.7,
            margin: "0 0 48px",
            animation: "slideDown 0.8s ease 0.5s both",
          }}
        >
          Our clinical systems are being upgraded to serve you better.
          We'll be back shortly with improved performance and new features.
        </p>

        {/* ETA card */}
        <div
          style={{
            background: "rgba(14,165,233,0.08)",
            border: "1px solid rgba(56,189,248,0.2)",
            borderRadius: "20px",
            padding: "20px 40px",
            marginBottom: "40px",
            display: "flex",
            gap: "48px",
            backdropFilter: "blur(12px)",
            animation: "slideDown 0.8s ease 0.6s both",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "42px",
                fontWeight: 700,
                color: "#38bdf8",
                lineHeight: 1,
                textShadow: "0 0 20px rgba(56,189,248,0.5)",
              }}
            >
              {String(etaMinutes).padStart(2, "0")}
            </div>
            <div style={{ color: "rgba(186,230,253,0.5)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "4px" }}>
              Minutes
            </div>
          </div>
          <div style={{ width: "1px", background: "rgba(56,189,248,0.15)", alignSelf: "stretch" }} />
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontFamily: "'Sora', sans-serif",
                fontSize: "42px",
                fontWeight: 700,
                color: "#38bdf8",
                lineHeight: 1,
                textShadow: "0 0 20px rgba(56,189,248,0.5)",
              }}
            >
              {Math.round(progress)}%
            </div>
            <div style={{ color: "rgba(186,230,253,0.5)", fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", marginTop: "4px" }}>
              Complete
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            marginBottom: "12px",
            animation: "slideDown 0.8s ease 0.7s both",
          }}
        >
          <div
            style={{
              height: "6px",
              background: "rgba(56,189,248,0.12)",
              borderRadius: "100px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress}%`,
                background: "linear-gradient(90deg, #0ea5e9, #38bdf8, #7dd3fc)",
                borderRadius: "100px",
                transition: "width 0.3s ease",
                boxShadow: "0 0 12px rgba(56,189,248,0.6)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Shimmer on bar */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
                  animation: "barShimmer 1.5s ease infinite",
                }}
              />
            </div>
          </div>
        </div>

        {/* Current step text */}
        <div
          style={{
            color: "#7dd3fc",
            fontSize: "13px",
            marginBottom: "48px",
            letterSpacing: "0.04em",
            animation: "slideDown 0.8s ease 0.75s both",
            minHeight: "20px",
            textAlign: "center",
          }}
        >
          <span
            key={activeStep}
            style={{ animation: "fadeSwap 0.5s ease" }}
          >
            ↳ {steps[activeStep]}
          </span>
        </div>

        {/* Status cards grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: "16px",
            width: "100%",
            maxWidth: "720px",
            marginBottom: "48px",
            animation: "slideDown 0.8s ease 0.85s both",
          }}
        >
          {statusCards.map((card, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredCard(i)}
              onMouseLeave={() => setHoveredCard(null)}
              style={{
                background:
                  hoveredCard === i
                    ? "rgba(56,189,248,0.12)"
                    : "rgba(255,255,255,0.03)",
                border: `1px solid ${hoveredCard === i ? "rgba(56,189,248,0.35)" : "rgba(56,189,248,0.1)"}`,
                borderRadius: "16px",
                padding: "20px",
                cursor: "default",
                transition: "all 0.3s ease",
                transform: hoveredCard === i ? "translateY(-3px)" : "translateY(0)",
                backdropFilter: "blur(8px)",
                boxShadow: hoveredCard === i ? "0 8px 32px rgba(56,189,248,0.12)" : "none",
              }}
            >
              <div style={{ fontSize: "22px", marginBottom: "10px" }}>{card.icon}</div>
              <div style={{ color: "rgba(186,230,253,0.6)", fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "6px" }}>
                {card.label}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: card.color,
                    boxShadow: `0 0 8px ${card.color}`,
                    display: "inline-block",
                    animation: card.status === "Updating" ? "pulseDot 1.2s ease-in-out infinite" : "none",
                  }}
                />
                <span style={{ color: card.color, fontSize: "13px", fontWeight: 600 }}>
                  {card.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Contact & notify section */}
        <div
          style={{
            width: "100%",
            maxWidth: "520px",
            background: "rgba(255,255,255,0.02)",
            border: "1px solid rgba(56,189,248,0.12)",
            borderRadius: "20px",
            padding: "28px",
            marginBottom: "40px",
            animation: "slideDown 0.8s ease 0.95s both",
            backdropFilter: "blur(8px)",
          }}
        >
          <p style={{ color: "rgba(186,230,253,0.6)", fontSize: "13px", textAlign: "center", margin: "0 0 16px", letterSpacing: "0.03em" }}>
            Get notified when we're back online
          </p>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <input
              type="email"
              placeholder="your@email.com"
              style={{
                flex: 1,
                minWidth: "180px",
                background: "rgba(56,189,248,0.07)",
                border: "1px solid rgba(56,189,248,0.2)",
                borderRadius: "12px",
                padding: "12px 16px",
                color: "#e0f2fe",
                fontSize: "14px",
                outline: "none",
                fontFamily: "inherit",
                transition: "border-color 0.3s",
              }}
              onFocus={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(56,189,248,0.5)";
              }}
              onBlur={(e) => {
                (e.target as HTMLInputElement).style.borderColor = "rgba(56,189,248,0.2)";
              }}
            />
            <button
              style={{
                background: "linear-gradient(135deg, #0ea5e9, #38bdf8)",
                border: "none",
                borderRadius: "12px",
                padding: "12px 22px",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "0.02em",
                boxShadow: "0 4px 20px rgba(14,165,233,0.4)",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 6px 28px rgba(14,165,233,0.55)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = "0 4px 20px rgba(14,165,233,0.4)";
              }}
            >
              Notify Me
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={{ animation: "slideDown 0.8s ease 1.05s both", textAlign: "center" }}>
          <p style={{ color: "rgba(186,230,253,0.3)", fontSize: "12px", margin: 0 }}>
            For urgent inquiries, contact{" "}
            <a
              href="mailto:support@yourdomain.com"
              style={{ color: "#38bdf8", textDecoration: "none", borderBottom: "1px solid rgba(56,189,248,0.3)" }}
            >
              support@yourdomain.com
            </a>
          </p>
          <p style={{ color: "rgba(186,230,253,0.2)", fontSize: "11px", marginTop: "8px" }}>
            © {new Date().getFullYear()} YourClinic · All rights reserved
          </p>
        </div>
      </div>

      {/* CSS keyframes */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes barShimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes fadeSwap {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes floatGlow {
          0%, 100% { transform: translateX(-50%) translateY(0px); opacity: 1; }
          50% { transform: translateX(-50%) translateY(-20px); opacity: 0.7; }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        input::placeholder { color: rgba(186,230,253,0.3); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(56,189,248,0.2); border-radius: 4px; }

        @media (max-width: 480px) {
          input[type="email"] { min-width: 100%; }
        }
      `}</style>
    </div>
  );
}