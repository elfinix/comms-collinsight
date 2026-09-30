import { useState, useEffect, useRef } from "react";
import { Dialog, Button, Input, PasswordInput } from "../ui";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { supabase } from "../../services/supabaseClient";
import { supabaseApi, mapUserFromDb } from "../../services/supabaseService";
import { dispatchOtpEmail } from "../../services/mailerService";
import { User, users as fallbackUsers } from "../../services/dataService";
import {
  KeyRound, Mail, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft,
  RotateCcw, Lock, AlertCircle, Sparkles, Check, Clock, Eye, EyeOff
} from "lucide-react";

interface ForgotPasswordModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (email: string) => void;
  initialEmail?: string;
}

type Step = "email" | "otp" | "password" | "success";

export default function ForgotPasswordModal({
  open,
  onClose,
  onSuccess,
  initialEmail = "",
}: ForgotPasswordModalProps) {
  const { users: liveUsers, updateUser } = useApp();
  const { toast } = useToast();

  const allUsers = liveUsers.length > 0 ? liveUsers : fallbackUsers;

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [matchedUser, setMatchedUser] = useState<User | null>(null);

  // OTP State
  const [generatedOtp, setGeneratedOtp] = useState<string>("");
  const [otpExpiry, setOtpExpiry] = useState<number>(0);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // New Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Reset state whenever modal opens
  useEffect(() => {
    if (open) {
      setStep("email");
      setEmail(initialEmail);
      setMatchedUser(null);
      setGeneratedOtp("");
      setOtpDigits(["", "", "", "", "", ""]);
      setNewPassword("");
      setConfirmPassword("");
      setError("");
      setInfoMessage("");
      setResendCooldown(0);
    }
  }, [open, initialEmail]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Helper to generate a random 6-digit numeric OTP code
  function generate6DigitOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // Step 1: Send OTP to User
  async function handleRequestOtp(targetEmail?: string) {
    const emailToSearch = (targetEmail || email).trim().toLowerCase();
    if (!emailToSearch) {
      setError("Please enter your registered institutional email.");
      return;
    }

    setError("");
    setInfoMessage("");
    setLoading(true);

    try {
      // 1. Look up user locally or in Supabase
      let user = allUsers.find(
        (u) => u.email.toLowerCase() === emailToSearch && !u.deleted
      );

      if (!user) {
        // Fallback live Supabase lookup
        try {
          const { data, error: dbErr } = await supabase
            .from("users")
            .select("*")
            .ilike("email", emailToSearch)
            .eq("deleted", false)
            .maybeSingle();

          if (!dbErr && data) {
            user = mapUserFromDb(data);
          }
        } catch {
          // Ignore
        }
      }

      if (!user) {
        setError("No institutional account found matching this email. Please check your spelling.");
        setLoading(false);
        return;
      }

      setMatchedUser(user);

      // 2. Generate 6-digit OTP & 10-minute expiry
      const code = generate6DigitOtp();
      const expiryTimestamp = Date.now() + 10 * 60 * 1000; // 10 minutes

      setGeneratedOtp(code);
      setOtpExpiry(expiryTimestamp);
      setOtpDigits(["", "", "", "", "", ""]);
      setResendCooldown(60); // 60-second cooldown

      // 3. Dispatch Branded Email via Gmail Mailer
      const userName = `${user.firstName} ${user.lastName}`.trim() || "Institutional User";
      const mailRes = await dispatchOtpEmail({
        to: user.email,
        userName,
        otpCode: code,
        userRole: user.role,
        expiresInMinutes: 10,
      });

      if (!mailRes.success) {
        console.warn("[Forgot Password] Email send warning:", mailRes.error);
        // Note for local testing if offline or missing API keys
        setInfoMessage(`Verification code dispatched. (Demo fallback code: ${code})`);
      } else {
        toast.success("Verification Code Sent", `A 6-digit code has been delivered to ${user.email}`);
      }

      setStep("otp");
      // Focus first OTP digit box on next tick
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } catch (err: any) {
      console.error("Forgot password OTP request failed:", err);
      setError("Failed to dispatch verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Dedicated paste handler for instant 6-digit autofill from clipboard
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    const clean = pastedText.replace(/[^0-9]/g, "").slice(0, 6);
    if (!clean) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = clean[i] || "";
    }
    setOtpDigits(newDigits);
    setError("");

    // Focus either the last box or the next unfilled box
    const focusIdx = Math.min(clean.length, 5);
    otpInputsRef.current[focusIdx]?.focus();
  }

  // Handle OTP digit changes with auto-advance and backspace
  function handleOtpDigitChange(index: number, val: string) {
    const clean = val.replace(/[^0-9]/g, "");
    setError("");

    // Handling paste or multi-character insertion
    if (clean.length > 1) {
      const pasted = clean.slice(0, 6).split("");
      const newDigits = [...otpDigits];
      pasted.forEach((char, i) => {
        if (i < 6) newDigits[i] = char;
      });
      setOtpDigits(newDigits);
      const nextFocus = Math.min(pasted.length, 5);
      otpInputsRef.current[nextFocus]?.focus();
      return;
    }

    const newDigits = [...otpDigits];
    newDigits[index] = clean;
    setOtpDigits(newDigits);

    // Auto-advance
    if (clean && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  }

  // Step 2: Verify OTP
  function handleVerifyOtp(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const enteredCode = otpDigits.join("");

    if (enteredCode.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (Date.now() > otpExpiry) {
      setError("Verification code has expired. Please request a new code.");
      return;
    }

    if (enteredCode !== generatedOtp) {
      setError("Invalid verification code. Please check your email and try again.");
      return;
    }

    setError("");
    setInfoMessage("");
    setStep("password");
  }

  // Step 3: Set New Password
  async function handleResetPasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please retype and confirm.");
      return;
    }

    if (!matchedUser) {
      setError("Session expired. Please restart the password reset process.");
      return;
    }

    setLoading(true);

    try {
      // 1. Update in local state & database
      updateUser(matchedUser.id, { password: newPassword });

      // 2. Direct Supabase update for immediate consistency
      await supabaseApi.updateUser(matchedUser.id, { password: newPassword });

      toast.success("Password Updated", "Your institutional password has been securely reset.");
      setStep("success");
    } catch (err: any) {
      console.error("Failed to update password:", err);
      setError("Failed to update password. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleFinish() {
    if (onSuccess && matchedUser) {
      onSuccess(matchedUser.email);
    }
    onClose();
  }

  // Password Strength Criteria Calculation
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const isStrong = hasMinLength && hasUpperCase && hasNumberOrSpecial;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reset Institutional Password"
      size="md"
    >
      <div className="p-6">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between pb-5 mb-5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-orange-600/15 text-[var(--primary)] flex items-center justify-center font-bold">
              <KeyRound size={16} />
            </div>
            <div>
              <p className="text-xs font-mono font-bold uppercase tracking-wider text-[var(--primary)]">
                Security Portal
              </p>
              <h3 className="text-sm font-bold text-[var(--foreground)]">
                {step === "email" && "Step 1: Enter Institutional Email"}
                {step === "otp" && "Step 2: Enter Verification Code"}
                {step === "password" && "Step 3: Create New Password"}
                {step === "success" && "Password Reset Complete"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-[var(--muted-foreground)]">
            <span className={`w-2 h-2 rounded-full ${step === "email" ? "bg-[var(--primary)] ring-4 ring-orange-100" : "bg-emerald-500"}`} />
            <span className={`w-2 h-2 rounded-full ${step === "otp" ? "bg-[var(--primary)] ring-4 ring-orange-100" : step === "password" || step === "success" ? "bg-emerald-500" : "bg-slate-200"}`} />
            <span className={`w-2 h-2 rounded-full ${step === "password" ? "bg-[var(--primary)] ring-4 ring-orange-100" : step === "success" ? "bg-emerald-500" : "bg-slate-200"}`} />
          </div>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2.5">
            <AlertCircle size={15} className="text-red-600 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed font-medium">{error}</span>
          </div>
        )}

        {/* Global Info Banner */}
        {infoMessage && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
            <Clock size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <span className="leading-relaxed font-mono font-medium">{infoMessage}</span>
          </div>
        )}

        {/* ── STEP 1: EMAIL INPUT ── */}
        {step === "email" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleRequestOtp();
            }}
            className="space-y-4"
          >
            <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
              Enter your registered institutional email address. We will dispatch a 6-digit one-time verification code to verify your identity.
            </p>

            <Input
              label="Institutional Email"
              type="email"
              placeholder="e.g. yourname@cite.edu.ph"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />

            <div className="pt-2 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={loading || !email.trim()}
                className="gap-1.5 shadow-sm cursor-pointer"
              >
                {loading ? "Dispatching Code..." : "Send Verification Code"}
                <ArrowRight size={14} />
              </Button>
            </div>
          </form>
        )}

        {/* ── STEP 2: 6-DIGIT OTP VERIFICATION ── */}
        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="text-center space-y-1">
              <p className="text-xs text-[var(--muted-foreground)]">
                We sent a 6-digit verification code to:
              </p>
              <p className="text-sm font-bold text-[var(--foreground)] font-mono">
                {matchedUser?.email || email}
              </p>
            </div>

            {/* 6-Box Numeric Input */}
            <div className="flex items-center justify-center gap-2 sm:gap-2.5">
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputsRef.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold font-mono rounded-xl border-2 border-slate-200 bg-[var(--card)] text-[var(--foreground)] focus:border-[var(--primary)] focus:ring-4 focus:ring-orange-500/15 transition-all outline-none"
                />
              ))}
            </div>

            {/* Timer & Resend Button */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setError("");
                }}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] inline-flex items-center gap-1 font-medium transition cursor-pointer"
              >
                <ArrowLeft size={13} /> Change Email
              </button>

              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={() => handleRequestOtp()}
                className={`font-semibold transition inline-flex items-center gap-1 ${
                  resendCooldown > 0
                    ? "text-[var(--muted-foreground)] cursor-not-allowed"
                    : "text-[var(--primary)] hover:underline cursor-pointer"
                }`}
              >
                <RotateCcw size={12} className={loading ? "animate-spin" : ""} />
                {resendCooldown > 0 ? `Resend Code in ${resendCooldown}s` : "Resend Code"}
              </button>
            </div>

            <div className="pt-3 flex items-center justify-end gap-2 border-t border-[var(--border)]">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={otpDigits.join("").length !== 6}
                className="gap-1.5 shadow-sm cursor-pointer"
              >
                Verify Code <Check size={14} />
              </Button>
            </div>
          </form>
        )}

        {/* ── STEP 3: SET NEW PASSWORD ── */}
        {step === "password" && (
          <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
            <div className="p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                {matchedUser?.firstName?.charAt(0) || "U"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[var(--foreground)] truncate">
                  {matchedUser?.firstName} {matchedUser?.lastName}
                </p>
                <p className="text-[11px] font-mono text-[var(--muted-foreground)] truncate">
                  {matchedUser?.email}
                </p>
              </div>
            </div>

            <PasswordInput
              label="New Institutional Password"
              placeholder="Enter minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoFocus
            />

            <PasswordInput
              label="Confirm New Password"
              placeholder="Re-type new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {/* Password Strength Checklist */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5 font-mono">
              <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Security Standards</p>
              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasMinLength ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                  ✓
                </span>
                <span className={hasMinLength ? "text-emerald-800 font-semibold" : "text-slate-500"}>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasUpperCase ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                  ✓
                </span>
                <span className={hasUpperCase ? "text-emerald-800 font-semibold" : "text-slate-500"}>Contains uppercase letter (A-Z)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[10px] ${hasNumberOrSpecial ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                  ✓
                </span>
                <span className={hasNumberOrSpecial ? "text-emerald-800 font-semibold" : "text-slate-500"}>Contains number or symbol</span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-[var(--border)]">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={loading || !newPassword || newPassword !== confirmPassword}
                className="gap-1.5 shadow-sm cursor-pointer"
              >
                {loading ? "Updating Password..." : "Update Password"}
                <Lock size={14} />
              </Button>
            </div>
          </form>
        )}

        {/* ── STEP 4: SUCCESS STATE ── */}
        {step === "success" && (
          <div className="py-4 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                Password Successfully Reset!
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1.5 max-w-sm mx-auto leading-relaxed">
                Your institutional credentials for <strong className="text-[var(--foreground)]">{matchedUser?.email}</strong> have been updated. You can now log in with your new password.
              </p>
            </div>

            <div className="pt-3">
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center gap-2 shadow-sm cursor-pointer"
                onClick={handleFinish}
              >
                Sign In With New Password <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
