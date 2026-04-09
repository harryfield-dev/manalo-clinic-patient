import { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  MapPin,
  Phone,
  Clock,
  Copy,
  ExternalLink,
  Check,
  HeartPulse,
} from "lucide-react";
import { DashboardLayout } from "../components/DashboardLayout";
import { useApp } from "../context/AppContext";
import { getClinicStatus, getClinicWeekdayIndex } from "../lib/clinicStatusLive";

export function ClinicMap() {
  const { clinicName, clinicAddress, clinicPhone, clinicMapsLink, clinicSchedule } = useApp();
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const handleCopy = () => {
    try {
      const el = document.createElement("textarea");
      el.value = clinicAddress;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    } catch (_) { }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60000);

    return () => window.clearInterval(timer);
  }, []);

  const today = getClinicWeekdayIndex(now);
  const status = getClinicStatus(clinicSchedule, now);
  const mapEmbedSrc = `https://www.google.com/maps?q=${encodeURIComponent(clinicAddress)}&output=embed`;

  return (
    <DashboardLayout title="Clinic Map">
      <div className="space-y-6">
        {/* Info banner */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-[#0A2463] to-[#1B4FD8] rounded-2xl p-6 text-white"
        >
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <HeartPulse size={26} className="text-white" />
              </div>
              <div>
                <h2
                  className="text-white"
                  style={{
                    fontFamily: "Playfair Display, serif",
                    fontSize: "1.2rem",
                    fontWeight: 700,
                  }}
                >
                  {clinicName}
                </h2>
                <p className="text-white/70 text-sm">
                  {clinicAddress}
                </p>
              </div>
            </div>
            <div className="md:ml-auto flex flex-wrap gap-3">
              <a
                href={clinicMapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white text-[#1B4FD8] hover:bg-[#E8F1FF] px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              >
                <ExternalLink size={14} />
                Get Directions
              </a>
              <button
                onClick={handleCopy}
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white px-5 py-2.5 rounded-xl text-sm transition-all"
              >
                {copied ? (
                  <Check size={14} />
                ) : (
                  <Copy size={14} />
                )}
                {copied ? "Copied!" : "Copy Address"}
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Map embed */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="lg:col-span-2 rounded-2xl overflow-hidden shadow-md border border-gray-100"
            style={{ minHeight: 400 }}
          >
            <iframe
              src={mapEmbedSrc}
              width="100%"
              height="100%"
              style={{ border: 0, minHeight: 400 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title={clinicName}
            />
          </motion.div>

          {/* Details panel */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-4"
          >
            {/* Contact */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[#0A2463] font-semibold text-sm mb-4">
                Contact Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <MapPin
                    size={15}
                    className="text-[#1B4FD8] mt-0.5 shrink-0"
                  />
                  <span className="text-gray-600 text-sm leading-relaxed">
                    {clinicAddress}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone
                    size={15}
                    className="text-[#1B4FD8] shrink-0"
                  />
                  <span className="text-gray-600 text-sm">
                    {clinicPhone}
                  </span>
                </div>
              </div>
            </div>

            {/* Schedule */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="text-[#0A2463] font-semibold text-sm mb-4 flex items-center gap-2">
                <Clock size={14} className="text-[#1B4FD8]" />
                Clinic Hours
              </h3>
              <div className="space-y-2.5">
                {clinicSchedule.map((s, i) => {
                  const dayIdx = i === 6 ? 0 : i + 1;
                  const isToday = dayIdx === today;
                  return (
                    <div
                      key={s.day}
                      className={`flex justify-between items-center text-sm rounded-lg px-2 py-1.5 ${isToday ? "bg-[#E8F1FF]" : ""
                        }`}
                    >
                      <span
                        className={`${isToday ? "text-[#1B4FD8] font-semibold" : "text-gray-500"}`}
                      >
                        {s.day}
                        {isToday && (
                          <span className="ml-1 text-[10px] bg-[#1B4FD8] text-white px-1.5 py-0.5 rounded-full">
                            Today
                          </span>
                        )}
                      </span>
                      <span
                        className={`font-medium text-xs ${s.closed
                            ? "text-red-400"
                            : isToday
                              ? "text-[#1B4FD8]"
                              : "text-[#0A2463]"
                          }`}
                      >
                        {s.closed ? "Closed" : s.hours}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status */}
            <div
              className={`rounded-2xl p-4 flex items-center gap-3 border ${
                status.isOpen
                  ? "bg-teal-50 border-teal-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <div
                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                  status.isOpen
                    ? "bg-teal-500 animate-pulse"
                    : "bg-red-400"
                }`}
              />
              <div>
                <p
                  className={`text-sm font-semibold ${
                    status.isOpen ? "text-teal-800" : "text-red-700"
                  }`}
                >
                  {status.title}
                </p>
                <p
                  className={`text-xs ${
                    status.isOpen ? "text-teal-600" : "text-red-500"
                  }`}
                >
                  {status.detail}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
