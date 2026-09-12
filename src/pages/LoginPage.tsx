import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, getDefaultDashboardPath } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { Input, PasswordInput, Button } from "../components/ui";
import { Landmark, ArrowLeft, AlertCircle, Loader2, ArrowRight, LogOut, CheckCircle2, ShieldCheck } from "lucide-react";
import { users as fallbackUsers, formatUserRole } from "../services/dataService";

export default function LoginPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const { currentUser, isAuthLoading, login, logout } = useAuth();
  const { users: liveUsers } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectProgress, setRedirectProgress] = useState(15);

  const allUsers = liveUsers.length > 0 ? liveUsers : fallbackUsers;

  // Auto-redirect if an active session exists
  useEffect(() => {
    if (!currentUser) return;

    const progressTimer = setInterval(() => {
      setRedirectProgress((prev) => Math.min(prev + 25, 100));
    }, 120);

    const redirectTimer = setTimeout(() => {
      const destination = getDefaultDashboardPath(currentUser.role);
      navigate(destination, { replace: true });
    }, 650);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(redirectTimer);
    };
  }, [currentUser, navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const success = await login(email.trim(), password.trim());
      if (success) {
        const user = allUsers.find(
          (u) => u.email.toLowerCase() === email.trim().toLowerCase()
        );
        const destination = getDefaultDashboardPath(user?.role);
        navigate(destination, { replace: true });
      } else {
        setError("Invalid institutional email or password. Please try again.");
      }
    } catch {
      setError("An unexpected error occurred while verifying credentials.");
    } finally {
      setLoading(false);
    }
  }

  // Active Session Transition Screen
  if (currentUser) {
    const fullName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
    const destination = getDefaultDashboardPath(currentUser.role);

    return (
      <div className="page-enter min-h-screen bg-gradient-to-br from-[#031f1e] via-[#052c29] to-[#0a4f4a] flex items-center justify-center p-4">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="relative w-full max-w-md">
          <div className="bg-[var(--card)] rounded-2xl shadow-2xl overflow-hidden border border-teal-800/20">
            {/* Top animated gradient accent */}
            <div className="h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-400 animate-pulse" />
            <div className="p-8 text-center flex flex-col items-center">
              {/* Pulsing Icon */}
              <div className="relative mb-5">
                <div className="w-16 h-16 bg-teal-600/15 rounded-2xl flex items-center justify-center text-teal-600">
                  <Landmark size={32} strokeWidth={2.2} />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center text-white ring-4 ring-[var(--card)] shadow-sm">
                  <ShieldCheck size={14} strokeWidth={2.5} />
                </div>
              </div>

              {/* Status Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-3 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Active Session Detected
              </div>

              <h2 className="text-xl font-bold text-[var(--foreground)] mb-1">
                Welcome back, {fullName || "User"}
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] mb-6 flex items-center justify-center gap-1.5">
                <span className="font-semibold text-teal-600 uppercase tracking-wide">
                  {formatUserRole(currentUser.role)}
                </span>
                {currentUser.position && <span>• {currentUser.position}</span>}
              </p>

              {/* Progress Bar Container */}
              <div className="w-full bg-[var(--muted)] rounded-full h-2 mb-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${redirectProgress}%` }}
                />
              </div>

              <div className="flex items-center justify-center gap-2 text-xs text-[var(--muted-foreground)] mb-6 font-medium">
                <Loader2 size={13} className="animate-spin text-teal-600" />
                <span>Redirecting to your dashboard...</span>
              </div>

              {/* Action Buttons */}
              <div className="w-full flex flex-col gap-2.5">
                <Button
                  size="md"
                  className="w-full justify-center gap-2 shadow-sm"
                  onClick={() => navigate(destination, { replace: true })}
                >
                  Enter Dashboard <ArrowRight size={15} />
                </Button>
                <button
                  onClick={() => logout()}
                  className="inline-flex items-center justify-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-red-600 py-1.5 transition font-medium"
                >
                  <LogOut size={13} /> Switch Account or Log Out
                </button>
              </div>
            </div>
          </div>
          <p className="text-center text-teal-100 text-xs mt-4 font-mono">© {new Date().getFullYear()} COLLinSight · CITE · LCUP</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter min-h-screen bg-gradient-to-br from-[#031f1e] via-[#052c29] to-[#0a4f4a] flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-[var(--card)] rounded-2xl shadow-2xl overflow-hidden">
          {/* Top accent */}
          <div className="h-1 bg-gradient-to-r from-teal-500 to-cyan-400" />
          <div className="p-8">
            {/* Back link */}
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition mb-6">
              <ArrowLeft size={14} /> Back to Home
            </Link>

            {/* Logo */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center text-white shadow-sm">
                <Landmark size={20} strokeWidth={2} />
              </div>
              <div>
                <p className="font-bold text-[var(--foreground)] text-lg">COLLinSight</p>
                <p className="text-xs text-[var(--muted-foreground)] font-mono">Login Portal · CITE</p>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-[var(--foreground)] mb-1">Welcome back</h1>
            <p className="text-sm text-[var(--muted-foreground)] mb-6">Sign in with your institutional credentials.</p>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm mb-5 border border-red-200">
                <AlertCircle size={16} className="flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Institutional Email"
                type="email"
                placeholder="yourname@cite.edu.ph"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <PasswordInput
                label="Password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" size="lg" className="w-full justify-center mt-2 shadow-sm" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </div>
        </div>
        <p className="text-center text-teal-100 text-xs mt-4 font-mono">© {new Date().getFullYear()} COLLinSight · CITE · LCUP</p>
      </div>
    </div>
  );
}

