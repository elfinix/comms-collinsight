import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import PublicNav from "../components/layout/PublicNav";
import PublicFooter from "../components/layout/PublicFooter";
import {
  Users, ArrowRight, Mail, BarChart2, FileText,
  CheckCircle, ChevronRight, ArrowUpRight, BookOpen, Star,
  Landmark, ClipboardList, Calendar, Plus,
} from "lucide-react";

function FadeSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${className}`}
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(22px)", transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

function StatPill({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-3xl font-extrabold text-white leading-none">{value}</span>
      <span className="text-xs font-mono text-teal-200 mt-1">{label}</span>
    </div>
  );
}

export default function LandingPage() {
  const { organizations, events } = useApp();
  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">

      <PublicNav transparent />

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 bg-gradient-to-br from-[#062e2b] via-[#0a4f4a] to-[#0a6b64]" />
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)", backgroundSize: "28px 28px" }} />

        <div className="relative w-full max-w-7xl mx-auto px-6 pt-28 pb-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left copy */}
            <div>
              <div className="animate-fade-up">
                <span className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-teal-100 text-xs font-mono px-3 py-1.5 rounded-full mb-7 backdrop-blur-sm">
                  <Landmark size={11} /> LCUP | College of Information Technology and Engineering
                </span>
              </div>

              <h1 className="animate-fade-up animation-delay-100 text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold text-white leading-[1.1] tracking-tight">
                Organizational<br />
                Governance,<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 to-cyan-300">
                  Simplified.
                </span>
              </h1>

              <p className="animate-fade-up animation-delay-200 mt-6 text-base text-teal-100/80 leading-relaxed max-w-md">
                COLLinSight is the centralized platform for CITE student organizations — from multi-stage event clearance to real-time financial ledgers and automated SDS reporting.
              </p>

              <div className="animate-fade-up animation-delay-300 flex flex-wrap gap-3 mt-9">
                <Link
                  to="/organizations"
                  className="flex items-center gap-2 bg-white text-[var(--primary)] px-6 py-3 rounded-xl font-semibold text-sm hover:bg-teal-50 transition shadow-lg"
                >
                  <Users size={16} /> View Organizations
                </Link>
                <Link
                  to="/login"
                  className="flex items-center gap-2 bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl font-semibold text-sm hover:bg-white/20 transition backdrop-blur-sm"
                >
                  Login Portal <ArrowRight size={16} />
                </Link>
              </div>

              {/* Stats row */}
              <div className="animate-fade-up animation-delay-400 flex flex-wrap gap-10 mt-12 pt-8 border-t border-white/10">
                <StatPill value={String(organizations.length)} label="Organizations" />
                <StatPill value={String(events.length)} label="Events Created" />
                <StatPill value="100%" label="Automated Compliance" />
                <StatPill value="4" label="User Roles" />
              </div>
            </div>

            {/* Right — floating dashboard mockup cards */}
            <div className="animate-fade-in animation-delay-300 hidden lg:block relative">
              <div className="relative h-[500px]">
                {/* Main card */}
                <div className="animate-float absolute top-0 right-0 w-[340px] bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-2xl">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-mono text-teal-200 uppercase tracking-wider">Signatory Progress</span>
                    <span className="text-[10px] font-mono bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full">For Approval</span>
                  </div>
                  <p className="font-bold text-white text-sm mb-4">TechFest 2026: IT Innovation Summit</p>
                  <div className="flex items-center gap-0 mb-4">
                    {["Student","Adviser","Dean","SDS"].map((step, i) => (
                      <div key={step} className="flex items-center">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 2 ? "bg-teal-400 text-white" : i === 2 ? "bg-teal-400 text-white ring-2 ring-offset-1 ring-teal-300 ring-offset-transparent" : "bg-white/20 text-teal-300"}`}>
                            {i < 2 ? "✓" : i + 1}
                          </div>
                          <span className="text-[9px] text-teal-200/70 font-mono">{step}</span>
                        </div>
                        {i < 3 && <div className={`h-0.5 w-7 mx-1 mb-3 ${i < 2 ? "bg-teal-400" : "bg-white/20"}`} />}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-teal-200/60 font-mono pt-3 border-t border-white/10">
                    <span>Proposed: ₱18,500.00</span>
                    <span>ITSG</span>
                  </div>
                </div>

                {/* Finance card */}
                <div className="animate-float-b absolute top-[180px] left-0 w-[260px] bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 shadow-xl">
                  <p className="text-[10px] font-mono text-teal-200 uppercase tracking-wider mb-3">Budget Overview</p>
                  <div className="flex flex-col gap-2 mb-3">
                    {[
                      { label: "Allocated", val: "₱50,000", w: "100%", color: "bg-white/20" },
                      { label: "Proposed", val: "₱35,000", w: "70%", color: "bg-teal-400/60" },
                      { label: "Spent", val: "₱14,300", w: "29%", color: "bg-teal-300" },
                    ].map((b) => (
                      <div key={b.label}>
                        <div className="flex justify-between text-[10px] text-teal-100/70 mb-0.5">
                          <span>{b.label}</span><span className="font-mono">{b.val}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className={`h-full rounded-full ${b.color}`} style={{ width: b.w }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Event Created chip */}
                <div className="animate-float-c absolute top-[320px] right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center gap-3 shadow-xl">
                  <div className="w-8 h-8 bg-blue-400/30 rounded-lg flex items-center justify-center text-blue-200">
                    <Plus size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Event Created</p>
                    <p className="text-[10px] font-mono text-teal-200/60">Draft submitted for review</p>
                  </div>
                </div>

                {/* Event Approved chip */}
                <div className="animate-float-d absolute top-[400px] right-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-3 flex items-center gap-3 shadow-xl">
                  <div className="w-8 h-8 bg-teal-400/30 rounded-lg flex items-center justify-center text-teal-200">
                    <CheckCircle size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Event Approved</p>
                    <p className="text-[10px] font-mono text-teal-200/60">APF + CT sent to SDS</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── ABOUT ──────────────────────────────────────── */}
      <section id="about" className="py-24 max-w-7xl mx-auto px-6">
        <FadeSection className="mb-14">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-widest">About the Platform</span>
              <h2 className="text-3xl lg:text-4xl font-bold mt-2">Everything your org needs,<br />in one place.</h2>
            </div>
            <p className="text-[var(--muted-foreground)] max-w-sm leading-relaxed text-sm lg:text-right">
              COLLinSight replaces scattered spreadsheets and email threads with a structured, role-aware digital governance platform built for CITE.
            </p>
          </div>
        </FadeSection>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: <Calendar size={22} />, title: "Event Management", desc: "Propose, schedule, and track events through a structured multi-stage approval pipeline.", stat: "5 statuses", statLabel: "tracked end-to-end", iconBg: "bg-teal-50", iconColor: "text-[var(--primary)]", accent: "border-t-[var(--primary)]", delay: 0 },
            { icon: <FileText size={22} />, title: "Compliance Monitoring", desc: "Automated APF submission tracking, PDF clearance generation, and SDS email dispatch.", stat: "100%", statLabel: "automated reporting", iconBg: "bg-blue-50", iconColor: "text-blue-600", accent: "border-t-blue-500", delay: 80 },
            { icon: <BarChart2 size={22} />, title: "Financial Ledger", desc: "Per-event expenditure recording with receipt uploads, liquidation reports, and PDF export.", stat: "Per-event", statLabel: "budget tracking", iconBg: "bg-purple-50", iconColor: "text-purple-600", accent: "border-t-purple-500", delay: 160 },
            { icon: <FileText size={22} />, title: "Governance Reports", desc: "Role-stratified analytics and downloadable reports for officers, advisers, dean, and admin.", stat: "4 roles", statLabel: "with tailored views", iconBg: "bg-amber-50", iconColor: "text-amber-600", accent: "border-t-amber-500", delay: 240 },
          ].map((f) => (
            <FadeSection key={f.title} delay={f.delay}>
              <div className={`group bg-[var(--card)] border border-[var(--border)] border-t-2 ${f.accent} rounded-2xl p-6 h-full hover:shadow-lg transition-all duration-300 flex flex-col`}>
                <div className={`w-12 h-12 ${f.iconBg} ${f.iconColor} rounded-xl flex items-center justify-center mb-5 group-hover:scale-105 transition-transform`}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-[var(--foreground)] mb-2">{f.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed flex-1">{f.desc}</p>
                <div className="mt-5 pt-4 border-t border-[var(--border)]">
                  <span className={`text-lg font-extrabold ${f.iconColor}`}>{f.stat}</span>
                  <span className="text-xs text-[var(--muted-foreground)] ml-2 font-mono">{f.statLabel}</span>
                </div>
              </div>
            </FadeSection>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────── */}
      <section id="workflow" className="py-24 bg-[var(--card)] border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6">
          <FadeSection className="mb-14">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-widest">The Workflow</span>
                <h2 className="text-3xl lg:text-4xl font-bold mt-2">From proposal to completion</h2>
              </div>
              <p className="text-[var(--muted-foreground)] max-w-sm leading-relaxed text-sm lg:text-right">
                A clear, two-phase process ensures every event is properly cleared and financially accounted for.
              </p>
            </div>
          </FadeSection>

          <div className="grid md:grid-cols-2 gap-5 mb-10">
            {[
              {
                phase: "Phase 1", title: "Clearance", subtitle: "Compliance & Approval",
                icon: <ClipboardList size={20} className="text-white" />,
                headerBg: "bg-[var(--primary)]",
                steps: [
                  { label: "Draft", desc: "Officers create event details, upload APF and clearance documents." },
                  { label: "Adviser Review", desc: "Faculty adviser reviews the proposal and provides feedback or approval." },
                  { label: "Dean Approval", desc: "College Dean gives final sign-off on the cleared event." },
                  { label: "SDS Dispatch", desc: "System auto-emails APF and clearance to the SDS office." },
                ],
              },
              {
                phase: "Phase 2", title: "Finance", subtitle: "Ledger & Liquidation",
                icon: <BarChart2 size={20} className="text-white" />,
                headerBg: "bg-[#0a4f4a]",
                steps: [
                  { label: "Ledger Unlocked", desc: "Approval unlocks the event's financial ledger for expense entry." },
                  { label: "Log Expenses", desc: "Officers record expenditures by category with receipt uploads." },
                  { label: "Track Budget", desc: "System shows real-time spending vs. the approved budget cap." },
                  { label: "Liquidation", desc: "Completing all entries generates a downloadable PDF liquidation report." },
                ],
              },
            ].map((ph) => (
              <FadeSection key={ph.phase}>
                <div className="rounded-2xl border border-[var(--border)] overflow-hidden h-full flex flex-col">
                  <div className={`${ph.headerBg} px-6 py-5 flex items-center gap-4`}>
                    <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                      {ph.icon}
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-white/50 uppercase tracking-widest">{ph.phase}</span>
                      <h3 className="text-lg font-bold text-white leading-tight">{ph.title}</h3>
                      <p className="text-[11px] text-white/60 font-mono">{ph.subtitle}</p>
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    {ph.steps.map((step, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className="flex flex-col items-center">
                          <div className="w-7 h-7 rounded-full bg-[var(--muted)] border-2 border-[var(--border)] flex items-center justify-center text-xs font-bold font-mono text-[var(--primary)] flex-shrink-0 z-10">
                            {i + 1}
                          </div>
                          {i < ph.steps.length - 1 && <div className="w-px flex-1 bg-[var(--border)] my-1" />}
                        </div>
                        <div className="pb-5">
                          <p className="text-sm font-semibold text-[var(--foreground)] leading-none mb-1">{step.label}</p>
                          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>

          <FadeSection>
            <div className="bg-[var(--muted)] rounded-2xl p-5">
              <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider mb-4 text-center">Event Status Flow</p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  { label: "Created", color: "bg-slate-100 text-slate-700 border-slate-200" },
                  { label: "→", color: "text-[var(--muted-foreground)]" },
                  { label: "For Review", color: "bg-amber-100 text-amber-700 border-amber-200" },
                  { label: "→", color: "text-[var(--muted-foreground)]" },
                  { label: "For Approval", color: "bg-blue-100 text-blue-700 border-blue-200" },
                  { label: "→", color: "text-[var(--muted-foreground)]" },
                  { label: "Approved", color: "bg-teal-100 text-teal-700 border-teal-200" },
                  { label: "→", color: "text-[var(--muted-foreground)]" },
                  { label: "Completed", color: "bg-green-100 text-green-700 border-green-200" },
                  { label: "→", color: "text-[var(--muted-foreground)]" },
                  { label: "Closed", color: "bg-gray-100 text-gray-600 border-gray-200" },
                ].map((item, i) =>
                  item.label === "→" ? (
                    <ChevronRight key={i} size={14} className={item.color} />
                  ) : (
                    <span key={i} className={`text-xs font-mono px-3 py-1 rounded-full border ${item.color}`}>{item.label}</span>
                  )
                )}
              </div>
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── USER ROLES ──────────────────────────────── */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <FadeSection className="mb-12">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-widest">Who Uses It</span>
              <h2 className="text-3xl font-bold mt-2">Built for every stakeholder</h2>
            </div>
            <p className="text-[var(--muted-foreground)] max-w-sm leading-relaxed text-sm lg:text-right">
              Four distinct roles, each with a tailored view and permissions appropriate to their responsibilities.
            </p>
          </div>
        </FadeSection>
        <div className="grid grid-cols-2 gap-4">
          {[
            {
              icon: <Users size={20} />, role: "Student Officers",
              desc: "Draft events, upload APF, log financial records, and track clearance progress.",
              color: "border-t-teal-500", iconColor: "text-teal-600", iconBg: "bg-teal-50",
              tags: ["Draft Events", "Submit APF", "Log Expenses", "Track Status"],
            },
            {
              icon: <BookOpen size={20} />, role: "Faculty Advisers",
              desc: "Review proposals, provide feedback, and forward approved events to the Dean.",
              color: "border-t-blue-500", iconColor: "text-blue-600", iconBg: "bg-blue-50",
              tags: ["Review Proposals", "Approve Events", "Give Feedback", "Monitor Finance"],
            },
            {
              icon: <Star size={20} />, role: "College Dean",
              desc: "Give final approval, generate signed clearances, and access cross-org reports.",
              color: "border-t-purple-500", iconColor: "text-purple-600", iconBg: "bg-purple-50",
              tags: ["Final Approval", "Cross-Org Reports", "Sign Clearances", "Oversight"],
            },
            {
              icon: <Users size={20} />, role: "Student Body",
              desc: "Browse public events, follow org activities, and stay informed on CITE happenings.",
              color: "border-t-amber-500", iconColor: "text-amber-600", iconBg: "bg-amber-50",
              tags: ["View Calendar", "Browse Events", "Follow Orgs", "Public Feed"],
            },
          ].map((r, i) => (
            <FadeSection key={r.role} delay={i * 70}>
              <div className={`bg-[var(--card)] border border-[var(--border)] border-t-4 ${r.color} rounded-2xl p-6 h-full hover:shadow-md transition-all flex flex-col`}>
                <div className={`w-10 h-10 ${r.iconBg} ${r.iconColor} rounded-xl flex items-center justify-center mb-4`}>
                  {r.icon}
                </div>
                <h3 className="font-bold text-[var(--foreground)] mb-2">{r.role}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-4">{r.desc}</p>
                <div className="flex flex-wrap gap-1.5 mt-auto">
                  {r.tags.map((tag) => (
                    <span key={tag} className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${r.iconBg} ${r.iconColor} border-current/20`}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </FadeSection>
          ))}
        </div>
      </section>

      {/* ── DEVELOPERS ─────────────────────────────────── */}
      <section id="developer" className="bg-[var(--card)] border-t border-[var(--border)] py-24">
        <div className="max-w-7xl mx-auto px-6">
          <FadeSection className="mb-14">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div>
                <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-widest">The Team</span>
                <h2 className="text-3xl lg:text-4xl font-bold mt-2">Meet the Developers</h2>
              </div>
              <p className="text-[var(--muted-foreground)] max-w-sm leading-relaxed text-sm lg:text-right">
                COLLinSight was built as a capstone project by a team of three BS Information Technology students from CITE · LCUP.
              </p>
            </div>
          </FadeSection>

          <div className="grid sm:grid-cols-3 gap-6">
            {[
              {
                initials: "SR",
                name: "Sophia Rhyzelle",
                role: "Project Manager",
                focus: "Component Systems & Documentation",
                email: "srhyzelle@student.cite.edu.ph",
                github: "#",
                gradient: "from-pink-500 to-rose-700",
                delay: 0,
              },
              {
                initials: "JC",
                name: "John Mark Noel Cabuwagan",
                role: "Lead Developer",
                focus: "System Architecture & Integration",
                email: "jmcabuwagan@student.cite.edu.ph",
                github: "#",
                gradient: "from-[var(--primary)] to-[#062e2b]",
                delay: 100,
              },
              {
                initials: "RR",
                name: "Rom Jerico Reyes",
                role: "Quality Assurance",
                focus: "Testing & Verification",
                email: "rjreyes@student.cite.edu.ph",
                github: "#",
                gradient: "from-blue-500 to-blue-800",
                delay: 200,
              },
            ].map((dev) => (
              <FadeSection key={dev.name} delay={dev.delay}>
                <div className="group bg-[var(--background)] border border-[var(--border)] rounded-2xl overflow-hidden hover:shadow-xl hover:border-[var(--primary)]/40 transition-all duration-300 flex flex-col">
                  <div className={`bg-gradient-to-br ${dev.gradient} h-28 flex items-end px-6 pb-0 relative`}>
                    <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "20px 20px" }} />
                    <div className="relative translate-y-8 w-16 h-16 rounded-2xl bg-white border-4 border-[var(--card)] flex items-center justify-center font-extrabold text-xl shadow-lg"
                      style={{ color: "var(--primary)" }}>
                      {dev.initials}
                    </div>
                  </div>
                  <div className="pt-12 px-6 pb-6 flex flex-col flex-1">
                    <div className="mb-4">
                      <h3 className="font-bold text-[var(--foreground)] text-lg leading-snug">{dev.name}</h3>
                      <p className="text-xs font-mono text-[var(--primary)] mt-0.5">{dev.role}</p>
                    </div>
                    <p className="text-sm text-[var(--muted-foreground)] leading-relaxed mb-4">{dev.focus}</p>
                    <div className="flex flex-col gap-2 text-xs text-[var(--muted-foreground)] mb-5 mt-auto">
                      <span className="flex items-center gap-2">
                        <BookOpen size={12} className="text-[var(--primary)] flex-shrink-0" />
                        BS Information Technology · CITE · LCUP
                      </span>
                      <span className="flex items-center gap-2 font-mono">
                        <Mail size={12} className="text-[var(--primary)] flex-shrink-0" />
                        {dev.email}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
                      <a href={dev.github}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-[var(--primary)] text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--accent)] transition">
                        GitHub <ArrowUpRight size={12} />
                      </a>
                      <a href={`mailto:${dev.email}`}
                        className="flex items-center justify-center gap-1.5 border border-[var(--border)] text-[var(--foreground)] px-3 py-2 rounded-lg text-xs font-semibold hover:bg-[var(--muted)] transition">
                        <Mail size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              </FadeSection>
            ))}
          </div>

          <FadeSection delay={300} className="flex justify-center mt-10">
            <div className="inline-flex items-center gap-3 bg-[var(--muted)] border border-[var(--border)] rounded-full px-5 py-2.5 text-sm text-[var(--muted-foreground)]">
              <span className="w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
              Team COLLinSight | Batch 2026
            </div>
          </FadeSection>
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────── */}
      <section className="relative overflow-hidden py-20">
        <div className="absolute inset-0 bg-gradient-to-r from-[#062e2b] to-[var(--primary)]" />
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <FadeSection>
            <h2 className="text-3xl font-bold text-white mb-4">Ready to get started?</h2>
            <p className="text-teal-200/80 mb-8 text-base leading-relaxed">
              Log in with your institutional credentials to access your organization's dashboard.
            </p>
            <Link to="/login"
              className="inline-flex items-center gap-2 bg-white text-[var(--primary)] px-8 py-3.5 rounded-xl font-bold text-sm hover:bg-teal-50 transition shadow-xl">
              Login to COLLinSight <ArrowRight size={16} />
            </Link>
          </FadeSection>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
