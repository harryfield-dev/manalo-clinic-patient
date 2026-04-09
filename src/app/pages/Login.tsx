import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Eye, EyeOff, HeartPulse, ArrowLeft, Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { useApp } from "../context/AppContext";
import { supabase } from "../lib/supabase";
const clinicImage = "/clinic.jpg";
const PASSWORD_LENGTH = 8;
const PASSWORD_ERROR_MESSAGE = `Password must be exactly ${PASSWORD_LENGTH} characters.`;

// Reset flow step
type ResetStep = "email" | "code" | "newPassword" | "success";

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  return `${local[0]}***@${domain}`;
}

export function Login() {
  const navigate = useNavigate();
  const { login, authErrorMessage, clearAuthError } = useApp();

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Forgot password flow
  const [showReset, setShowReset] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // OTP code state (alphanumeric 6 chars)
  const [codeDigits, setCodeDigits] = useState<string[]>(Array(6).fill(""));
  const [resendCountdown, setResendCountdown] = useState(0);
  const digitRefs = useRef<(HTMLInputElement | null)[]>([]);

  // New password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPass, setShowNewPass] = useState(false);

  // Countdown for resend
  useEffect(() => {
    if (resendCountdown <= 0) return;
    const t = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCountdown]);

  useEffect(() => {
    if (!authErrorMessage) return;
    setError(authErrorMessage);
    clearAuthError();
  }, [authErrorMessage, clearAuthError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length !== PASSWORD_LENGTH) {
      setError(PASSWORD_ERROR_MESSAGE);
      return;
    }
    setLoading(true);
    setError("");
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      // Store pending welcome-toast data; Dashboard will show it after profile loads
      const now = new Date();
      sessionStorage.setItem('login_welcome_ts', now.toISOString());
      navigate("/dashboard");
    } else {
      setError(result.message);
    }
  };

  // Step 1: Send reset OTP email
  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) { setResetError("Please enter your email address."); return; }
    setResetLoading(true);
    setResetError("");
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: undefined,
    });
    setResetLoading(false);
    if (resetErr) {
      setResetError(resetErr.message);
      return;
    }
    setCodeDigits(Array(6).fill(""));
    setResendCountdown(60);
    setResetStep("code");
    setTimeout(() => digitRefs.current[0]?.focus(), 100);
  };

  // OTP digit handlers
  const handleDigitChange = (index: number, value: string) => {
    const char = value.replace(/[^a-zA-Z0-9]/g, "").slice(-1).toUpperCase();
    const next = [...codeDigits];
    next[index] = char;
    setCodeDigits(next);
    setResetError("");
    if (char && index < 5) {
      setTimeout(() => digitRefs.current[index + 1]?.focus(), 0);
    }
  };

  const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      setTimeout(() => digitRefs.current[index - 1]?.focus(), 0);
    }
  };

  const handleDigitPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
    if (!pasted) return;
    const next = [...codeDigits];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? "";
    setCodeDigits(next);
    setResetError("");
    setTimeout(() => digitRefs.current[Math.min(pasted.length, 5)]?.focus(), 0);
  };

  // Step 2: Verify OTP code
  const handleVerifyCode = async () => {
    const code = codeDigits.join("");
    if (code.length < 6) return;
    setResetLoading(true);
    setResetError("");

    const { error: verifyErr } = await supabase.auth.verifyOtp({
      email: resetEmail,
      token: code,
      type: "recovery",
    });

    setResetLoading(false);
    if (verifyErr) {
      setResetError("Invalid or expired code. Please try again.");
      setCodeDigits(Array(6).fill(""));
      setTimeout(() => digitRefs.current[0]?.focus(), 50);
      return;
    }
    setResetStep("newPassword");
  };

  // Step 3: Set new password
  const handleSetNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length !== PASSWORD_LENGTH) { setResetError(PASSWORD_ERROR_MESSAGE); return; }
    if (newPassword !== confirmNewPassword) { setResetError("Passwords don't match."); return; }
    setResetLoading(true);
    setResetError("");

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    setResetLoading(false);
    if (updateErr) {
      setResetError(updateErr.message);
      return;
    }
    setResetStep("success");
  };

  const handleResendCode = async () => {
    if (resendCountdown > 0) return;
    setCodeDigits(Array(6).fill(""));
    setResetError("");
    await supabase.auth.resetPasswordForEmail(resetEmail, { redirectTo: undefined });
    setResendCountdown(60);
    setTimeout(() => digitRefs.current[0]?.focus(), 50);
  };

  const allCodeFilled = codeDigits.every((d) => d !== "");

  const backToLogin = () => {
    setShowReset(false);
    setResetStep("email");
    setResetEmail("");
    setCodeDigits(Array(6).fill(""));
    setResetError("");
    setNewPassword("");
    setConfirmNewPassword("");
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "DM Sans, sans-serif" }}>
      {/* Left image panel */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <img src={clinicImage} alt="Clinic" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0A2463]/90 to-[#1B4FD8]/70" />
        <div className="absolute inset-0 flex flex-col justify-between p-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <HeartPulse size={22} className="text-white" />
            </div>
            <span className="text-white text-lg" style={{ fontFamily: "Playfair Display, serif", fontWeight: 600 }}>
              Manalo Medical Clinic
            </span>
          </div>
          <div>
            <h2 className="text-white mb-4" style={{ fontFamily: "Playfair Display, serif", fontSize: "2.2rem", fontWeight: 700, lineHeight: 1.2 }}>
              Your Health,<br />Our Priority
            </h2>
            <p className="text-white/70 leading-relaxed max-w-sm text-sm">
              Access your appointments, medical records, and connect with our care team — all in one place.
            </p>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-sm w-full mx-auto"
        >
          {/* Back to home */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-gray-400 hover:text-[#1B4FD8] text-sm mb-8 transition-colors"
          >
            <ArrowLeft size={15} />
            <span>Back to Home</span>
          </button>

          {!showReset ? (
            /* ── LOGIN FORM ── */
            <>
              <h1
                className="text-[#0A2463] mb-1"
                style={{ fontFamily: "Playfair Display, serif", fontSize: "1.9rem", fontWeight: 700 }}
              >
                Welcome back
              </h1>
              <p className="text-gray-500 text-sm mb-8">Sign in to your patient account</p>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5"
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="block text-sm text-[#0A2463] mb-1.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full bg-[#F4F7FF] border border-transparent focus:border-[#1B4FD8] focus:bg-white rounded-xl px-4 py-3 text-sm text-gray-800 outline-none transition-all duration-200"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#0A2463] mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      maxLength={PASSWORD_LENGTH}
                      className="w-full bg-[#F4F7FF] border border-transparent focus:border-[#1B4FD8] focus:bg-white rounded-xl px-4 py-3 pr-11 text-sm text-gray-800 outline-none transition-all duration-200"
                      style={{ WebkitAppearance: 'none' } as React.CSSProperties}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <div
                      onClick={() => setRememberMe(!rememberMe)}
                      className={`w-4.5 h-4.5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                        rememberMe ? "bg-[#1B4FD8] border-[#1B4FD8]" : "border-gray-300"
                      }`}
                    >
                      {rememberMe && (
                        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                          <path d="M1 3L3.5 5.5L8 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">Remember me</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowReset(true)}
                    className="text-sm text-[#1B4FD8] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1B4FD8] hover:bg-[#0A2463] text-white py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>

              <p className="text-center text-sm text-gray-500 mt-8">
                Don't have an account?{" "}
                <Link to="/register" className="text-[#1B4FD8] hover:underline font-medium">
                  Register here
                </Link>
              </p>
            </>
          ) : (
            /* ── FORGOT PASSWORD FLOW ── */
            <>
              <button
                onClick={backToLogin}
                className="flex items-center gap-1.5 text-gray-400 hover:text-[#1B4FD8] text-sm mb-8 transition-colors"
              >
                <ArrowLeft size={15} />
                <span>Back to Login</span>
              </button>

              <AnimatePresence mode="wait">
                {/* Step 1: Enter email */}
                {resetStep === "email" && (
                  <motion.div
                    key="reset-email"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h1
                      className="text-[#0A2463] mb-1"
                      style={{ fontFamily: "Playfair Display, serif", fontSize: "1.7rem", fontWeight: 700 }}
                    >
                      Reset Password
                    </h1>
                    <p className="text-gray-500 text-sm mb-8">
                      Enter your email address and we'll send a 6-character reset code.
                    </p>
                    {resetError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-5"
                      >
                        {resetError}
                      </motion.div>
                    )}
                    <form onSubmit={handleSendReset} className="space-y-5">
                      <div>
                        <label className="block text-sm text-[#0A2463] mb-1.5">Email Address</label>
                        <input
                          type="email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          placeholder="you@email.com"
                          className="w-full bg-[#F4F7FF] border border-transparent focus:border-[#1B4FD8] focus:bg-white rounded-xl px-4 py-3 text-sm text-gray-800 outline-none transition-all duration-200"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full bg-[#1B4FD8] hover:bg-[#0A2463] text-white py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {resetLoading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : "Send Reset Code"}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* Step 2: Enter OTP code */}
                {resetStep === "code" && (
                  <motion.div
                    key="reset-code"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                    className="flex flex-col items-center text-center"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#E8F1FF] flex items-center justify-center mb-4">
                      <ShieldCheck size={26} className="text-[#1B4FD8]" />
                    </div>
                    <h1
                      className="text-[#0A2463] mb-1"
                      style={{ fontFamily: "Playfair Display, serif", fontSize: "1.5rem", fontWeight: 700 }}
                    >
                      Enter Reset Code
                    </h1>
                    <p className="text-gray-500 text-sm mb-1">
                      We sent a 6-character code to
                    </p>
                    <p className="text-[#1B4FD8] text-sm font-semibold mb-2">
                      {maskEmail(resetEmail)}
                    </p>
                    <p className="text-gray-400 text-xs mb-6">
                      The code contains capital letters and numbers (e.g. <span className="font-mono font-semibold text-[#0A2463]">QWU869</span>)
                    </p>

                    {/* OTP digit boxes */}
                    <div className="flex items-center gap-2.5 mb-4 w-full justify-center">
                      {codeDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={(el) => { digitRefs.current[i] = el; }}
                          type="text"
                          inputMode="text"
                          maxLength={1}
                          value={d}
                          onChange={(e) => handleDigitChange(i, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(i, e)}
                          onPaste={i === 0 ? handleDigitPaste : undefined}
                          className={`w-11 text-center bg-[#F4F7FF] border-2 rounded-xl text-lg text-[#0A2463] outline-none transition-all duration-200 uppercase
                            ${d ? "border-[#1B4FD8] bg-[#E8F1FF]" : "border-transparent"}
                            ${resetError ? "border-red-400 bg-red-50" : ""}
                            focus:border-[#1B4FD8] focus:bg-white`}
                          style={{ fontWeight: 700, fontSize: "1.25rem", height: "3.25rem", fontFamily: "monospace" }}
                        />
                      ))}
                    </div>

                    {resetError && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-red-500 text-xs mb-4"
                      >
                        {resetError}
                      </motion.p>
                    )}

                    <button
                      onClick={handleVerifyCode}
                      disabled={!allCodeFilled || resetLoading}
                      className="w-full flex items-center justify-center gap-2 bg-[#1B4FD8] hover:bg-[#0A2463] text-white py-3 rounded-xl text-sm uppercase tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
                    >
                      {resetLoading ? (
                        <><Loader2 size={15} className="animate-spin" /> Verifying…</>
                      ) : (
                        <><ShieldCheck size={15} /> Verify Code</>
                      )}
                    </button>

                    <button
                      onClick={handleResendCode}
                      disabled={resendCountdown > 0}
                      className={`text-sm transition-colors ${
                        resendCountdown > 0
                          ? "text-gray-400 cursor-default"
                          : "text-[#1B4FD8] hover:underline cursor-pointer"
                      }`}
                    >
                      {resendCountdown > 0 ? `Resend in ${resendCountdown}s…` : "Resend Code"}
                    </button>
                  </motion.div>
                )}

                {/* Step 3: Set new password */}
                {resetStep === "newPassword" && (
                  <motion.div
                    key="reset-newpass"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-[#E8F1FF] flex items-center justify-center mb-4">
                      <KeyRound size={26} className="text-[#1B4FD8]" />
                    </div>
                    <h1
                      className="text-[#0A2463] mb-1"
                      style={{ fontFamily: "Playfair Display, serif", fontSize: "1.5rem", fontWeight: 700 }}
                    >
                      Set New Password
                    </h1>
                    <p className="text-gray-500 text-sm mb-6">
                      Create a strong new password for your account.
                    </p>
                    {resetError && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4"
                      >
                        {resetError}
                      </motion.div>
                    )}
                    <form onSubmit={handleSetNewPassword} className="space-y-4">
                      <div>
                        <label className="block text-sm text-[#0A2463] mb-1.5">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPass ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter 8 characters"
                            maxLength={PASSWORD_LENGTH}
                            className="w-full bg-[#F4F7FF] border border-transparent focus:border-[#1B4FD8] focus:bg-white rounded-xl px-4 py-3 pr-11 text-sm text-gray-800 outline-none transition-all duration-200"
                            style={{ WebkitAppearance: 'none' } as React.CSSProperties}
                          />
                          <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            {showNewPass ? <EyeOff size={17} /> : <Eye size={17} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-[#0A2463] mb-1.5">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          placeholder="Repeat your new password"
                          maxLength={PASSWORD_LENGTH}
                          className="w-full bg-[#F4F7FF] border border-transparent focus:border-[#1B4FD8] focus:bg-white rounded-xl px-4 py-3 text-sm text-gray-800 outline-none transition-all duration-200"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={resetLoading}
                        className="w-full bg-[#1B4FD8] hover:bg-[#0A2463] text-white py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70"
                      >
                        {resetLoading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : "Update Password"}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* Step 4: Success */}
                {resetStep === "success" && (
                  <motion.div
                    key="reset-success"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-center"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.1 }}
                      className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-5"
                    >
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
                        <path d="M20 6L9 17L4 12" stroke="#0D9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </motion.div>
                    <h1
                      className="text-[#0A2463] mb-2"
                      style={{ fontFamily: "Playfair Display, serif", fontSize: "1.5rem", fontWeight: 700 }}
                    >
                      Password Updated!
                    </h1>
                    <p className="text-gray-500 text-sm mb-8">
                      Your password has been successfully updated. You can now sign in with your new password.
                    </p>
                    <button
                      onClick={backToLogin}
                      className="w-full bg-[#1B4FD8] hover:bg-[#0A2463] text-white py-3.5 rounded-xl text-sm uppercase tracking-wider transition-all duration-300"
                    >
                      Back to Sign In
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
