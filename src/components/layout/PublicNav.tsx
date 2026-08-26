import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Users, Menu, X, Landmark } from "lucide-react";

interface PublicNavProps {
  transparent?: boolean;
  hideOrgCta?: boolean;
}

export default function PublicNav({ transparent = false, hideOrgCta = false }: PublicNavProps) {
  const [scrolled, setScrolled] = useState(!transparent);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  function scrollToSection(id: string) {
    setMobileOpen(false);
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  }

  useEffect(() => {
    if (!transparent) return;
    const handler = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [transparent]);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { to: "/#about", label: "About", hash: true },
    { to: "/#workflow", label: "How It Works", hash: true },
    { to: "/organizations", label: "Organizations" },
  ];

  const solid = scrolled || !transparent;

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
          solid ? "bg-white/95 backdrop-blur shadow-sm border-b border-[var(--border)]" : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" onClick={() => window.scrollTo(0, 0)} className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white shadow-sm">
              <Landmark size={16} strokeWidth={2} />
            </div>
            <span className={`font-bold text-base ${solid ? "text-[var(--foreground)]" : "text-white"}`}>
              COLLinSight
            </span>
          </Link>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0">
            {!hideOrgCta && (
              <Link
                to="/organizations"
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-sm ${
                  solid
                    ? "bg-[var(--primary)] text-white hover:bg-[var(--accent)]"
                    : "bg-white text-[var(--primary)] hover:bg-teal-50"
                }`}
              >
                <Users size={14} /> Organizations
              </Link>
            )}
            <Link
              to="/login"
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition border ${
                solid
                  ? "border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                  : "border-white/30 text-white hover:bg-white/10"
              }`}
            >
              Login <ArrowRight size={14} />
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className={`md:hidden p-2 rounded-md transition ${solid ? "text-[var(--foreground)]" : "text-white"}`}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative ml-auto w-72 bg-[var(--card)] h-full shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 bg-[var(--primary)] rounded-md flex items-center justify-center text-white">
                  <Landmark size={14} strokeWidth={2} />
                </div>
                <span className="font-bold text-[var(--foreground)]">COLLinSight</span>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-[var(--muted-foreground)]"><X size={18} /></button>
            </div>
            <nav className="flex-1 px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) =>
                link.hash ? (
                  <button key={link.label}
                    onClick={() => scrollToSection(link.to.replace("/#", ""))}
                    className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)] transition">
                    {link.label}
                  </button>
                ) : (
                  <Link key={link.label} to={link.to} onClick={() => setMobileOpen(false)}
                    className={`px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                      isActive(link.to) ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    }`}>
                    {link.label}
                  </Link>
                )
              )}
            </nav>
            <div className="px-4 py-5 border-t border-[var(--border)] flex flex-col gap-2">
              <Link to="/organizations" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 bg-[var(--primary)] text-white py-2.5 rounded-lg text-sm font-semibold">
                <Users size={15} /> View Organizations
              </Link>
              <Link to="/login" onClick={() => setMobileOpen(false)}
                className="flex items-center justify-center gap-2 border border-[var(--border)] text-[var(--foreground)] py-2.5 rounded-lg text-sm font-medium hover:bg-[var(--muted)] transition">
                Login Portal <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
