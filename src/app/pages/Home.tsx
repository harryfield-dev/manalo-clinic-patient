import { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import {
  Stethoscope,
  FlaskConical,
  UserRound,
  MapPin,
  Phone,
  Clock,
  ArrowRight,
  Shield,
  HeartPulse,
  Star,
} from "lucide-react";
import { Navbar } from "../components/Navbar";
import { useApp } from "../context/AppContext";
import { getClinicStatus } from "../lib/clinicStatusLive";

const clinicImage = "/clinic.jpg";

const services = [
  {
    icon: <Stethoscope size={28} />,
    title: "Routine Check-ups",
    description:
      "Comprehensive physical examinations and preventive health screenings to keep you in peak condition.",
    color: "from-blue-500/20 to-blue-600/10",
    accent: "#3A86FF",
  },
  {
    icon: <UserRound size={28} />,
    title: "Specialist Consultations",
    description:
      "Access to a network of specialists for targeted diagnosis and treatment of complex medical conditions.",
    color: "from-teal-500/20 to-teal-600/10",
    accent: "#0D9488",
  },
  {
    icon: <FlaskConical size={28} />,
    title: "Lab & Diagnostics",
    description:
      "State-of-the-art laboratory services and diagnostic interpretation for accurate and timely results.",
    color: "from-indigo-500/20 to-indigo-600/10",
    accent: "#6366F1",
  },
];

const stats = [
  { end: 5000, suffix: "+", label: "Patients Served" },
  { end: 8, suffix: "+", label: "Years of Service" },
  { end: 2, suffix: "", label: "Medical Specialists" },
  { end: 95, suffix: "%", label: "Patient Satisfaction" },
];

const testimonials = [
  {
    name: "Maria Santos",
    role: "Regular Patient",
    text: "The staff at Manalo Medical Clinic are incredibly caring and professional. Booking appointments online made everything so convenient!",
    rating: 5,
  },
  {
    name: "Jose Reyes",
    role: "Patient since 2020",
    text: "I've been visiting this clinic for years. The doctors are thorough, the facilities are clean, and the service is always top-notch.",
    rating: 4,
  },
  {
    name: "Ana Dela Cruz",
    role: "New Patient",
    text: "As a first-time patient, I was made to feel comfortable and well-cared for. Highly recommend Manalo Medical Clinic!",
    rating: 4,
  },
  {
    name: "Roberto Lim",
    role: "Patient since 2018",
    text: "Excellent doctors and very attentive staff. The clinic is clean, modern, and well-organized. My whole family trusts Manalo!",
    rating: 5,
  },
  {
    name: "Cristina Bautista",
    role: "Regular Patient",
    text: "Very professional and kind doctors. I always feel at ease whenever I visit. Highly recommended to everyone in the area.",
    rating: 4,
  },
  {
    name: "Eduardo Flores",
    role: "Patient since 2021",
    text: "The appointment system is so easy to use. Fast service and very knowledgeable physicians. Will definitely keep coming back!",
    rating: 5,
  },
];

// Duplicate for seamless infinite loop
const loopedTestimonials = [...testimonials, ...testimonials];

// CountUp component — animates a number from 0 to end when in view
function CountUp({ end, suffix, duration = 1800 }: { end: number; suffix: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let startTime: number | null = null;
    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, end, duration]);

  return (
    <span ref={ref}>
      {end >= 1000 ? count.toLocaleString() : count}{suffix}
    </span>
  );
}

export function Home() {
  const { clinicName, clinicAddress, clinicPhone, clinicMapsLink, clinicSchedule } = useApp();
  const trackRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const clinicStatus = getClinicStatus(clinicSchedule, now);

  return (
    <div
      className="min-h-screen bg-white"
      style={{ fontFamily: "DM Sans, sans-serif" }}
    >
      <Navbar />

      {/* ── HERO SECTION ── */}
      <section
        id="home"
        className="relative w-full h-screen min-h-[600px] overflow-hidden"
      >
        {/* Image background */}
        <div className="absolute inset-0">
          <img
            src="/clinic.jpg"
            alt="Manalo Medical Clinic"
            className="w-full h-full object-cover"
          />
          {/* Dark gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A2463]/88 via-[#0A2463]/65 to-[#0A2463]/25" />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 h-full flex items-center">
          <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
              className="max-w-xl"
            >
              {/* Subtitle */}
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-[#3A86FF] text-sm uppercase tracking-widest mb-4"
                style={{ fontFamily: "DM Sans, sans-serif" }}
              >
                Welcome to Manalo Medical Clinic
              </motion.p>

              {/* Title */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.65 }}
                className="text-white mb-6"
                style={{
                  fontFamily: "Playfair Display, serif",
                  fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                  fontWeight: 700,
                  lineHeight: 1.15,
                }}
              >
                Your Health,{" "}
                <span className="text-[#3A86FF]">
                  Our Priority
                </span>
              </motion.h1>

              {/* Description */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.45, duration: 0.6 }}
                className="text-white/75 text-base md:text-lg mb-10 leading-relaxed"
              >
                Experience compassionate, professional
                healthcare in a modern and welcoming environment
                designed with your comfort in mind.
              </motion.p>

              {/* CTA Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.5 }}
                className="flex flex-wrap gap-4"
              >
                <button
                  className="group flex items-center gap-2 bg-[#1B4FD8] hover:bg-[#3A86FF] text-white px-7 py-3.5 rounded-xl transition-all duration-300 shadow-xl hover:shadow-[#3A86FF]/40 hover:-translate-y-0.5"
                  onClick={() => navigate("/book")}
                >
                  <span className="text-sm uppercase tracking-wider">
                    Book Appointment
                  </span>
                  <ArrowRight
                    size={16}
                    className="group-hover:translate-x-1 transition-transform"
                  />
                </button>
                <button
                  onClick={() => navigate("/login")}
                  className="flex items-center gap-2 text-white border border-white/30 hover:border-white/70 hover:bg-white/10 px-7 py-3.5 rounded-xl transition-all duration-300 backdrop-blur-sm hover:-translate-y-0.5"
                >
                  <span className="text-sm uppercase tracking-wider">
                    Login / Register
                  </span>
                </button>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Glassmorphism info card */}
        <motion.div
          initial={{ opacity: 0, x: 60 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            delay: 0.7,
            duration: 0.7,
            ease: "easeOut",
          }}
          className="absolute top-1/2 -translate-y-1/2 right-6 md:right-12 z-10 hidden lg:block"
        >
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 w-72 shadow-2xl">
            {/* Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#3A86FF]/30 flex items-center justify-center shrink-0">
                    <HeartPulse
                      size={16}
                      className="text-[#3A86FF]"
                    />
                  </div>
                  <p className="text-white text-sm font-medium">
                    Clinic Hours
                  </p>
                </div>
                <span
                  className={`flex items-center gap-1 border text-[10px] px-2 py-0.5 rounded-full shrink-0 ${clinicStatus.isOpen
                    ? "bg-teal-400/20 border-teal-400/40 text-teal-300"
                    : "bg-rose-400/20 border-rose-400/40 text-rose-200"
                    }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full inline-block ${clinicStatus.isOpen
                      ? "bg-teal-400 animate-pulse"
                      : "bg-rose-300"
                      }`}
                  />
                  {clinicStatus.title}
                </span>
              </div>
              <p
                className={`mt-2 text-[11px] ${clinicStatus.isOpen ? "text-teal-100" : "text-rose-100"
                  }`}
              >
                {clinicStatus.detail}
              </p>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 text-white/70 text-xs mb-3 pb-3 border-b border-white/10">
              <MapPin
                size={12}
                className="text-[#3A86FF] mt-0.5 shrink-0"
              />
              <span>
                {clinicAddress}
              </span>
            </div>

            {/* Schedule */}
            <div className="space-y-1.5 text-xs mb-4">
              {clinicSchedule.map(({ day, hours, closed }) => (
                <div
                  key={day}
                  className="flex items-start justify-between gap-2"
                >
                  <div>
                    <span
                      className={
                        closed
                          ? "text-white/40"
                          : "text-white/70"
                      }
                    >
                      {day}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 ${closed ? "text-red-400/70" : "text-white/90"}`}
                  >
                    {hours}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <a
              href={clinicMapsLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 mt-1 w-full bg-[#1B4FD8] hover:bg-[#3A86FF] text-white text-xs uppercase tracking-wider py-2.5 rounded-lg transition-all duration-200"
            >
              <MapPin size={11} />
              Get Directions
            </a>
          </div>
        </motion.div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-[#0A2463] py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <p
                  className="text-white mb-1"
                  style={{
                    fontFamily: "Playfair Display, serif",
                    fontSize: "2rem",
                    fontWeight: 700,
                  }}
                >
                  <CountUp end={stat.end} suffix={stat.suffix} />
                </p>
                <p
                  className="text-white/60 text-sm uppercase tracking-wider"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES SECTION ── */}
      <section id="services" className="py-24 bg-[#E8F1FF]/30">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p
              className="text-[#1B4FD8] text-sm uppercase tracking-widest mb-3"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              What We Offer
            </p>
            <h2
              className="text-[#0A2463] mb-4"
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "clamp(1.8rem, 4vw, 2.8rem)",
                fontWeight: 700,
              }}
            >
              Our Medical Services
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto text-base">
              We provide a comprehensive range of healthcare
              services delivered by our team of experienced and
              compassionate medical professionals.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {services.map((service, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
                whileHover={{
                  y: -6,
                  transition: { duration: 0.25 },
                }}
                className="group bg-white rounded-2xl p-8 shadow-md hover:shadow-xl border border-gray-100 hover:border-[#3A86FF]/20 transition-all duration-300 cursor-pointer"
              >
                <div
                  className={`w-14 h-14 rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}
                  style={{ color: service.accent }}
                >
                  {service.icon}
                </div>
                <h3
                  className="text-[#0A2463] mb-3"
                  style={{
                    fontFamily: "Playfair Display, serif",
                    fontWeight: 600,
                  }}
                >
                  {service.title}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-5">
                  {service.description}
                </p>
                <div
                  className="flex items-center gap-1.5 text-sm transition-colors duration-200"
                  style={{ color: service.accent }}
                ></div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT SECTION ── */}
      <section id="about" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-16 items-center">
          {/* Image side */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <video
                src="/clinic-montage.mp4"
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-80 md:h-[420px] object-cover"
              />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-6 -right-6 bg-[#0A2463] text-white rounded-2xl px-6 py-4 shadow-xl">
              <div className="flex items-center gap-3">
                <Shield size={24} className="text-[#3A86FF]" />
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{
                      fontFamily: "DM Sans, sans-serif",
                    }}
                  >
                    Licensed & Accredited
                  </p>
                  <p className="text-white/60 text-xs">
                    DOH Philippines
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Text side */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
          >
            <p
              className="text-[#1B4FD8] text-sm uppercase tracking-widest mb-3"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              About Us
            </p>
            <h2
              className="text-[#0A2463] mb-6"
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              A Clinic Built on Trust & Compassion
            </h2>
            <p className="text-gray-500 leading-relaxed mb-5 text-sm">
              Manalo Medical Center provides accessible and
              organized consultation services for patients in
              the community. The clinic focuses on efficient
              appointment scheduling, reduced waiting times, and
              smooth patient flow to ensure timely medical
              consultations. Through a structured system and
              professional approach, patients receive focused
              attention and practical, evidence-based care
              delivered with respect and reliability.
            </p>
            <p className="text-gray-500 leading-relaxed mb-8 text-sm">
              Manalo Medical Center ensures smooth and efficient
              consultation services through a structured
              appointment system and coordinated staff,
              providing timely and reliable care for every
              patient.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                className="group flex items-center justify-center gap-2 bg-[#1B4FD8] hover:bg-[#0A2463] text-white px-7 py-3.5 rounded-xl transition-all duration-300 hover:-translate-y-0.5 shadow-lg hover:shadow-[#1B4FD8]/30"
                onClick={() => navigate("/book")}
              >
                <span className="text-sm uppercase tracking-wider">
                  Book Now
                </span>
                <ArrowRight
                  size={15}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
              <button
                className="flex items-center justify-center gap-2 border border-[#0A2463]/20 hover:border-[#1B4FD8] text-[#0A2463] hover:text-[#1B4FD8] px-7 py-3.5 rounded-xl transition-all duration-300 text-sm uppercase tracking-wider hover:-translate-y-0.5"
                onClick={() =>
                  window.open(
                    "https://maps.app.goo.gl/3goeh8vw4e2p2vAaA",
                    "_blank",
                  )
                }
              >
                Learn More
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── TESTIMONIALS — Infinite Horizontal Loop ── */}
      <section className="py-24 bg-[#0A2463] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-14">
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p
              className="text-[#3A86FF] text-sm uppercase tracking-widest mb-3"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Patient Reviews
            </p>
            <h2
              className="text-white"
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                fontWeight: 700,
              }}
            >
              What Our Patients Say
            </h2>
          </motion.div>
        </div>

        {/* Marquee track */}
        <div className="relative">
          {/* Left fade */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-r from-[#0A2463] to-transparent" />
          {/* Right fade */}
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-24 z-10 bg-gradient-to-l from-[#0A2463] to-transparent" />

          <div
            ref={trackRef}
            className="flex gap-6"
            style={{
              animation: "marquee 35s linear infinite",
              width: "max-content",
            }}
          >
            {loopedTestimonials.map((t, i) => (
              <div
                key={i}
                className="flex-shrink-0 w-80 bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl p-7 hover:bg-white/10 transition-all duration-300"
              >
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map(
                    (_, si) => (
                      <Star
                        key={si}
                        size={14}
                        className="text-amber-400 fill-amber-400"
                      />
                    ),
                  )}
                </div>
                <p className="text-white/75 text-sm leading-relaxed mb-6 italic">
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#1B4FD8]/40 flex items-center justify-center shrink-0">
                    <UserRound
                      size={17}
                      className="text-[#3A86FF]"
                    />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">
                      {t.name}
                    </p>
                    <p className="text-white/50 text-xs">
                      {t.role}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <style>{`
          @keyframes marquee {
            0%   { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
        `}</style>
      </section>

      {/* ── MAP / CONTACT CTA ── */}
      <section id="contact" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p
              className="text-[#1B4FD8] text-sm uppercase tracking-widest mb-3"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Find Us
            </p>
            <h2
              className="text-[#0A2463]"
              style={{
                fontFamily: "Playfair Display, serif",
                fontSize: "clamp(1.8rem, 4vw, 2.5rem)",
                fontWeight: 700,
              }}
            >
              Visit Our Clinic
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-5 gap-8 items-start">
            {/* Map Embed */}
            <motion.div
              className="md:col-span-3 rounded-2xl overflow-hidden shadow-xl"
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <iframe
                src="https://www.google.com/maps?q=Blk+35+Lot+12+Sector+IIB+Capas+Tarlac&output=embed"
                width="100%"
                height="488"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Manalo Medical Clinic Location"
              />
            </motion.div>

            {/* Info Card */}
            <motion.div
              className="md:col-span-2"
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
            >
              <div className="bg-[#E8F1FF] rounded-2xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3
                    className="text-[#0A2463]"
                    style={{
                      fontFamily: "Playfair Display, serif",
                      fontSize: "1.1rem",
                      fontWeight: 600,
                    }}
                  >
                    {clinicName}
                  </h3>
                  <span
                    className={`flex items-center gap-1.5 border text-[10px] px-2.5 py-1 rounded-full shrink-0 ${clinicStatus.isOpen
                      ? "bg-teal-100 border-teal-300 text-teal-700"
                      : "bg-red-100 border-red-300 text-red-700"
                      }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full inline-block ${clinicStatus.isOpen
                        ? "bg-teal-500 animate-pulse"
                        : "bg-red-500"
                        }`}
                    />
                    {clinicStatus.title}
                  </span>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <MapPin
                      size={15}
                      className="text-[#1B4FD8] mt-0.5 shrink-0"
                    />
                    <span>{clinicAddress}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-600">
                    <Phone
                      size={15}
                      className="text-[#1B4FD8] shrink-0"
                    />
                    <span>{clinicPhone}</span>
                  </div>
                  <p
                    className={`text-xs ${clinicStatus.isOpen ? "text-teal-700" : "text-red-600"
                      }`}
                  >
                    {clinicStatus.detail}
                  </p>
                </div>

                {/* Weekly schedule */}
                <div className="bg-white rounded-xl p-4 space-y-2 mb-5">
                  <p className="text-xs font-semibold text-[#0A2463] flex items-center gap-1.5 mb-3">
                    <Clock
                      size={12}
                      className="text-[#1B4FD8]"
                    />{" "}
                    Weekly Schedule
                  </p>
                  {clinicSchedule.map(({ day, hours, closed }) => (
                    <div
                      key={day}
                      className="flex items-start justify-between gap-2 text-xs"
                    >
                      <div>
                        <span
                          className={
                            closed
                              ? "text-gray-400"
                              : "text-gray-600"
                          }
                        >
                          {day}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 font-medium ${closed ? "text-red-400" : "text-[#0A2463]"}`}
                      >
                        {hours}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3">
                  <a
                    href={clinicMapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center bg-[#1B4FD8] hover:bg-[#0A2463] text-white text-xs uppercase tracking-wider py-3 rounded-xl transition-all duration-200"
                  >
                    Get Directions
                  </a>
                  <button
                    onClick={() => {
                      try {
                        const el =
                          document.createElement("textarea");
                        el.value = clinicAddress;
                        el.style.position = "fixed";
                        el.style.opacity = "0";
                        document.body.appendChild(el);
                        el.select();
                        document.execCommand("copy");
                        document.body.removeChild(el);
                      } catch (_) { }
                    }}
                    className="flex-1 border border-[#1B4FD8] text-[#1B4FD8] hover:bg-[#1B4FD8] hover:text-white text-xs uppercase tracking-wider py-3 rounded-xl transition-all duration-200"
                  >
                    Copy Address
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0A2463] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#3A86FF] flex items-center justify-center">
              <HeartPulse size={16} className="text-white" />
            </div>
            <p
              className="text-white text-sm"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              {clinicName}
            </p>
          </div>
          <p className="text-white/40 text-xs text-center">
            © {new Date().getFullYear()} Manalo Medical Clinic.
            All rights reserved.
          </p>
          <div className="flex gap-5">
            {["Privacy Policy", "Terms"].map(
              (link) => (
                <a
                  key={link}
                  href="pol.html"
                  className="text-white/40 hover:text-white/80 text-xs transition-colors"
                  style={{ fontFamily: "DM Sans, sans-serif" }}
                >
                  {link}
                </a>
              ),
            )}

          </div>
        </div>
      </footer>
    </div>
  );
}
