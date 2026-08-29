import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Input, PasswordInput, Button } from "../components/ui";
import { Landmark, ArrowLeft, AlertCircle } from "lucide-react";
import { users } from "../services/mockData";

export default function LoginPage() {
  useEffect(() => { window.scrollTo(0, 0); }, []);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      const success = login(email.trim(), password.trim());
      if (success) {
        const user = users.find((u) => u.email === email.trim());
        if (user) {
          const routes: Record<string, string> = {
            student: "/student/dashboard",
            adviser: "/adviser/dashboard",
            dean: "/dean/dashboard",
            admin: "/admin/dashboard",
          };
          navigate(routes[user.role] || "/");
        }
      } else {
        setError("Invalid email or password. Please try again.");
      }
      setLoading(false);
    }, 600);
  }

  // Demo credentials for quick login
  const demoAccounts = [
    { role: "Student Officer", email: "mlopez@student.cite.edu.ph", password: "lopez_124983", color: "bg-teal-50 border-teal-200 text-teal-700" },
    { role: "Faculty Adviser", email: "ereyes@cite.edu.ph", password: "reyes_773012", color: "bg-blue-50 border-blue-200 text-blue-700" },
    { role: "College Dean", email: "dean@cite.edu.ph", password: "villanueva_441209", color: "bg-purple-50 border-purple-200 text-purple-700" },
    { role: "Administrator", email: "admin@cite.edu.ph", password: "cruz_882341", color: "bg-amber-50 border-amber-200 text-amber-700" },
  ];

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
                placeholder="lastname_xxxxxx"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" size="lg" className="w-full justify-center" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-6">
              <p className="text-xs text-center text-[var(--muted-foreground)] mb-3 font-mono">— Demo Accounts —</p>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => { setEmail(acc.email); setPassword(acc.password); }}
                    className={`text-left px-3 py-2 rounded-lg text-xs border transition hover:opacity-80 ${acc.color}`}
                  >
                    <p className="font-semibold">{acc.role}</p>
                    <p className="font-mono truncate mt-0.5 opacity-70">{acc.email}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-teal-100 text-xs mt-4 font-mono">© {new Date().getFullYear()} COLLinSight · CITE · LCUP</p>
      </div>
    </div>
  );
}
