import { Link, useNavigate, useLocation } from "react-router-dom";
import { Landmark, ArrowUpRight } from "lucide-react";

export default function PublicFooter() {
  const navigate = useNavigate();
  const location = useLocation();
  const onOrgsPage = location.pathname === "/organizations";

  function scrollTo(id: string) {
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  }

  function goTab(tab: "roster" | "calendar") {
    navigate(`/organizations?tab=${tab}`);
  }

  const landingLinks = [
    { label: "About", id: "about" },
    { label: "Workflow", id: "workflow" },
    { label: "Stakeholders", id: "about" },
    { label: "Developers", id: "developer" },
  ];

  const orgLinks = [
    { label: "Organization Roster", tab: "roster" as const },
    { label: "Calendar", tab: "calendar" as const },
  ];

  return (
    <footer className="bg-[#0a1128] py-12 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid sm:grid-cols-3 gap-8 mb-10">
          {/* Brand */}
          <div>
            <Link to="/" onClick={() => window.scrollTo(0, 0)} className="inline-flex items-center gap-2.5 mb-3 group">
              <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white group-hover:bg-[var(--accent)] transition">
                <Landmark size={16} strokeWidth={2} />
              </div>
              <span className="font-bold text-white group-hover:text-orange-200 transition">COLLinSight</span>
            </Link>
            <p className="text-sm text-slate-400 leading-relaxed">
              College Student Organization Management & Governance System with Automated Compliance Monitoring.
            </p>
          </div>

          {/* Nav */}
          <div>
            <p className="text-[10px] font-mono text-orange-400/80 uppercase tracking-widest mb-3">Navigation</p>
            <div className="flex flex-col gap-2">
              {onOrgsPage
                ? orgLinks.map((link) => (
                    <button key={link.label} onClick={() => goTab(link.tab)}
                      className="text-left text-sm text-slate-300 hover:text-white transition cursor-pointer">
                      {link.label}
                    </button>
                  ))
                : landingLinks.map((link) => (
                    <button key={link.label} onClick={() => scrollTo(link.id)}
                      className="text-left text-sm text-slate-300 hover:text-white transition cursor-pointer">
                      {link.label}
                    </button>
                  ))
              }
            </div>
          </div>

          {/* College */}
          <div>
            <p className="text-[10px] font-mono text-orange-400/80 uppercase tracking-widest mb-3">Institution</p>
            <div className="flex flex-col gap-2 text-sm text-slate-300">
              <span>La Consolacion University Philippines</span>
              <span>College of Information Technology and Engineering</span>
              <span>laconsolacionu@lcup.edu.ph</span>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-slate-400">
          <span>© {new Date().getFullYear()} COLLinSight · All rights reserved.</span>
          <Link to="/" onClick={() => window.scrollTo(0, 0)} className="hover:text-white transition flex items-center gap-1">
            Back to Home <ArrowUpRight size={11} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
