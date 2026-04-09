import { useState, useEffect } from "react";
import { Menu, X, HeartPulse } from "lucide-react";
import { useNavigate } from "react-router";

interface NavbarProps {
  onBookClick?: () => void;
  onLoginClick?: () => void;
}

export function Navbar({ onBookClick, onLoginClick }: NavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-[#0A2463]/95 backdrop-blur-md shadow-lg"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#3A86FF] flex items-center justify-center">
            <HeartPulse size={20} className="text-white" />
          </div>
          <div>
            <p
              className="text-white text-sm tracking-widest uppercase"
              style={{ fontFamily: "DM Sans, sans-serif", letterSpacing: "0.15em" }}
            >
              Manalo
            </p>
            <p
              className="text-[#3A86FF] text-xs tracking-widest uppercase -mt-1"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Medical Clinic
            </p>
          </div>
        </div>

        {/* Desktop Links */}
        <ul
          className="hidden md:flex items-center gap-8 text-white/80"
          style={{ fontFamily: "DM Sans, sans-serif" }}
        >
          {["Home", "Services", "About", "Contact"].map((item) => (
            <li key={item}>
              <a
                href={`#${item.toLowerCase()}`}
                className="hover:text-white transition-colors duration-200 text-sm relative group"
              >
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#3A86FF] transition-all duration-300 group-hover:w-full" />
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => navigate("/login")}
            className="text-white/90 hover:text-white text-sm px-4 py-2 rounded-lg border border-white/20 hover:border-white/40 transition-all duration-200"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Login
          </button>
          <button
            onClick={() => navigate("/book")}
            className="bg-[#1B4FD8] hover:bg-[#3A86FF] text-white text-sm px-5 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-[#3A86FF]/30"
            style={{ fontFamily: "DM Sans, sans-serif" }}
          >
            Book Appointment
          </button>
        </div>

        {/* Mobile Hamburger */}
        <button
          className="md:hidden text-white"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0A2463]/97 backdrop-blur-md px-6 pb-6 pt-2 flex flex-col gap-4">
          {["Home", "Services", "About", "Contact"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-white/80 hover:text-white text-sm py-2 border-b border-white/10"
              style={{ fontFamily: "DM Sans, sans-serif" }}
              onClick={() => setMobileOpen(false)}
            >
              {item}
            </a>
          ))}
          <div className="flex gap-3 mt-2">
            <button
              onClick={() => { navigate("/login"); setMobileOpen(false); }}
              className="flex-1 text-white/90 text-sm px-4 py-2 rounded-lg border border-white/20"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Login
            </button>
            <button
              onClick={() => { navigate("/book"); setMobileOpen(false); }}
              className="flex-1 bg-[#1B4FD8] text-white text-sm px-4 py-2 rounded-lg"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Book Appointment
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}