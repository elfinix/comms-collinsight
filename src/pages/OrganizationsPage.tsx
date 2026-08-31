import { useState, useEffect, useRef, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { useToast } from "../context/ToastContext";
import { Dialog, SignatoryProgress } from "../components/ui";
import PublicNav from "../components/layout/PublicNav";
import PublicFooter from "../components/layout/PublicFooter";
import {
  Calendar as CalendarIcon, ArrowUpRight, Clock, MapPin, Building2, Users,
  ChevronLeft, ChevronRight, ArrowLeft, Search, LayoutGrid, ListFilter,
  X, CalendarDays, Award, ShieldCheck, Globe, Radio, Wallet, Receipt, Video, ExternalLink, FileText, Printer, BadgeCheck, FileSpreadsheet
} from "lucide-react";
import {
  getEventTypeById,
  formatDate, formatCurrency, statusColors, Event, isWebUrl, toWebUrl, resolvePdfUrl
} from "../services/mockData";
import { printClearanceDocument, printLiquidationDocument } from "../services/pdfDocuments";

function FadeSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setVisible(true); }, { threshold: 0.06 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(18px)",
        transition: `opacity 0.5s ease ${delay}ms, transform 0.5s ease ${delay}ms`
      }}
    >
      {children}
    </div>
  );
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const STATUS_FILTER_OPTIONS = ["All", "Approved", "For Approval", "For Review", "Completed", "Closed"] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];

function ModeIcon({ mode, size = 12, className = "text-[var(--primary)]" }: { mode?: string; size?: number; className?: string }) {
  if (mode?.toLowerCase().includes("online") || mode?.toLowerCase().includes("virtual")) {
    return <Video size={size} className={className} />;
  }
  if (mode?.toLowerCase().includes("hybrid")) {
    return <Radio size={size} className={className} />;
  }
  return <Building2 size={size} className={className} />;
}

function formatTimeRange(startStr: string, endStr: string): string {
  try {
    const s = new Date(startStr);
    const e = new Date(endStr);
    const startFormatted = s.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    const startTime = s.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
    const endTime = e.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
    return `${startFormatted} · ${startTime} – ${endTime}`;
  } catch {
    return `${startStr} – ${endStr}`;
  }
}

function CalendarGrid({
  events,
  organizations = [],
  onSelectEvent,
  selectedDay,
  onSelectDay,
}: {
  events: Event[];
  organizations?: any[];
  onSelectEvent: (e: Event) => void;
  selectedDay: { year: number; month: number; day: number } | null;
  onSelectDay: (dayObj: { year: number; month: number; day: number } | null) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => (i < firstDay ? null : i - firstDay + 1));
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsOnDay(day: number) {
    return events.filter((e) => {
      const d = new Date(e.dateStart);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day;
    });
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    onSelectDay({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
  }

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isDaySelected = (day: number) =>
    selectedDay !== null &&
    selectedDay.day === day &&
    selectedDay.month === viewMonth &&
    selectedDay.year === viewYear;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs">
      {/* Month Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]/30">
        <div className="flex items-center gap-3">
          <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight">
            {MONTH_NAMES[viewMonth]} <span className="text-[var(--primary)]">{viewYear}</span>
          </h3>
          {selectedDay && (
            <button
              onClick={() => onSelectDay(null)}
              className="inline-flex items-center gap-1 text-xs font-mono bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 rounded-full hover:bg-[var(--primary)]/20 transition cursor-pointer font-bold"
            >
              Filtering: {MONTH_NAMES[selectedDay.month].slice(0, 3)} {selectedDay.day}
              <X size={12} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] hover:border-[var(--primary)]/50 transition cursor-pointer shadow-2xs"
          >
            Today
          </button>
          <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-lg p-0.5">
            <button
              onClick={prevMonth}
              aria-label="Previous month"
              className="p-1.5 rounded-md hover:bg-[var(--muted)] transition text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={nextMonth}
              aria-label="Next month"
              className="p-1.5 rounded-md hover:bg-[var(--muted)] transition text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--muted)]/50">
        {DAY_NAMES.map((d) => (
          <div
            key={d}
            className="py-2.5 text-center text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const dayEvents = day ? eventsOnDay(day) : [];
          const isCurrentDay = day ? isToday(day) : false;
          const isSelected = day ? isDaySelected(day) : false;

          return (
            <div
              key={idx}
              onClick={() => {
                if (day) {
                  if (isSelected) {
                    onSelectDay(null);
                  } else {
                    onSelectDay({ year: viewYear, month: viewMonth, day });
                  }
                }
              }}
              className={`min-h-[100px] p-2 border-r border-b border-[var(--border)] transition-all ${
                day ? "cursor-pointer hover:bg-[var(--primary)]/5" : "bg-[var(--muted)]/20"
              } ${idx % 7 === 6 ? "border-r-0" : ""} ${isSelected ? "bg-[var(--primary)]/10 ring-2 ring-[var(--primary)] ring-inset" : ""}`}
            >
              {day && (
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isCurrentDay
                          ? "bg-[var(--primary)] text-white shadow-xs"
                          : isSelected
                          ? "bg-[var(--primary)]/20 text-[var(--primary)] font-bold"
                          : "text-[var(--muted-foreground)]"
                      }`}
                    >
                      {day}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="text-[10px] font-mono font-bold text-[var(--primary)]">
                        {dayEvents.length} {dayEvents.length === 1 ? "evt" : "evts"}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 flex-1">
                    {dayEvents.slice(0, 2).map((e) => {
                      const org = organizations.find((o) => o.id === e.organizationId);
                      return (
                        <button
                          key={e.id}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onSelectEvent(e);
                          }}
                          className="w-full text-left text-[10px] font-medium px-2 py-1 rounded-md truncate text-white leading-tight hover:brightness-110 hover:shadow-xs transition cursor-pointer"
                          style={{ backgroundColor: org?.logoColor ?? "var(--primary)" }}
                          title={`${e.name} (${org?.code ?? ""})`}
                        >
                          <span className="font-bold opacity-90 mr-1">{org?.code}:</span>
                          {e.name}
                        </button>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] font-mono font-bold text-[var(--primary)] px-1 mt-auto">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

type Tab = "roster" | "calendar";

export default function OrganizationsPage() {
  const {
    events: liveEvents,
    transactions: liveTxns,
    organizations,
    departments,
    users,
    expenditureCategories,
  } = useApp();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-driven tab state
  const tabParam = searchParams.get("tab");
  const tab: Tab = tabParam === "calendar" ? "calendar" : "roster";

  function handleTabChange(nextTab: Tab) {
    const newParams = new URLSearchParams(searchParams);
    if (nextTab === "calendar") {
      newParams.set("tab", "calendar");
    } else {
      newParams.delete("tab");
    }
    setSearchParams(newParams);
  }

  // Roster Tab Filters
  const [activeDept, setActiveDept] = useState<string>("all");
  const [rosterSearch, setRosterSearch] = useState("");

  // Calendar Tab Filters
  const [calendarSearch, setCalendarSearch] = useState("");
  const [selectedOrgFilter, setSelectedOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(null);
  const [calendarLayout, setCalendarLayout] = useState<"grid" | "list">("grid");

  // Modal
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  // Public events (includes ongoing proposals and approved/closed events)
  const publicEvents = useMemo(() => {
    return liveEvents.filter((e) =>
      ["Created", "For Review", "For Approval", "Approved", "Completed", "Closed"].includes(e.status)
    );
  }, [liveEvents]);

  // Filtered Roster Organizations
  const filteredOrganizations = useMemo(() => {
    return organizations.filter((org) => {
      // Dept match
      if (activeDept !== "all" && org.departmentId !== activeDept) return false;
      // Search match
      if (rosterSearch.trim()) {
        const q = rosterSearch.toLowerCase();
        const dept = departments.find((d) => d.id === org.departmentId);
        const adviser = users.find((u) => u.id === org.adviserId);
        const orgStudents = users.filter((u) => u.organizationId === org.id);

        const nameMatch = org.name.toLowerCase().includes(q);
        const codeMatch = org.code.toLowerCase().includes(q);
        const deptMatch = dept?.name.toLowerCase().includes(q) || dept?.code.toLowerCase().includes(q);
        const adviserMatch = adviser && `${adviser.firstName} ${adviser.lastName}`.toLowerCase().includes(q);
        const studentMatch = orgStudents.some((u) => `${u.firstName} ${u.lastName} ${u.position}`.toLowerCase().includes(q));

        if (!nameMatch && !codeMatch && !deptMatch && !adviserMatch && !studentMatch) return false;
      }
      return true;
    });
  }, [activeDept, rosterSearch]);

  // Filtered Calendar Events
  const filteredCalendarEvents = useMemo(() => {
    return publicEvents.filter((e) => {
      // Status filter
      if (statusFilter !== "All" && e.status !== statusFilter) return false;
      // Org filter
      if (selectedOrgFilter !== "all" && e.organizationId !== selectedOrgFilter) return false;
      // Day filter
      if (selectedDay) {
        const d = new Date(e.dateStart);
        if (
          d.getFullYear() !== selectedDay.year ||
          d.getMonth() !== selectedDay.month ||
          d.getDate() !== selectedDay.day
        ) {
          return false;
        }
      }
      // Search filter
      if (calendarSearch.trim()) {
        const q = calendarSearch.toLowerCase();
        const org = organizations.find((o) => o.id === e.organizationId);
        const type = getEventTypeById(e.typeId);
        const nameMatch = e.name.toLowerCase().includes(q);
        const descMatch = e.description?.toLowerCase().includes(q);
        const locMatch = e.location?.toLowerCase().includes(q);
        const orgMatch = org?.name.toLowerCase().includes(q) || org?.code.toLowerCase().includes(q);
        const typeMatch = type?.name.toLowerCase().includes(q);
        if (!nameMatch && !descMatch && !locMatch && !orgMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [publicEvents, statusFilter, selectedOrgFilter, selectedDay, calendarSearch]);

  // Quick statistics
  const totalOfficersCount = users.filter((u) => u.role === "student" && u.organizationId).length;
  const approvedEventsCount = publicEvents.filter((e) => e.status === "Approved").length;

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col">
      <PublicNav hideOrgCta />

      {/* Hero Section */}
      <div className="pt-24 bg-gradient-to-b from-[var(--card)] to-[var(--background)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6">
          <FadeSection>
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted-foreground)] mb-4">
              <Link
                to="/"
                onClick={() => window.scrollTo(0, 0)}
                className="flex items-center gap-1 hover:text-[var(--primary)] transition"
              >
                <ArrowLeft size={12} /> Home
              </Link>
              <span className="opacity-40">/</span>
              <span className="text-[var(--foreground)] font-medium">
                {tab === "roster" ? "Student Organizations" : "Campus Event Calendar"}
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-widest bg-[var(--primary)]/10 px-2.5 py-0.5 rounded-full font-bold">
                    CITE · LCUP
                  </span>
                </div>
                <h1 className="text-3xl lg:text-4xl font-extrabold mt-2 text-[var(--foreground)] tracking-tight">
                  {tab === "roster" ? "Student Organizations Roster" : "Institutional Event Calendar"}
                </h1>
                <p className="mt-2 text-sm lg:text-base text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
                  {tab === "roster"
                    ? "Explore official CITE student organizations, view designated leadership officers, and monitor organization-specific initiatives."
                    : "Track proposals, approved gatherings, workshops, and milestones scheduled across college departments in real time."}
                </p>
              </div>

              {/* Quick Metrics Badges */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3.5 py-2 shadow-2xs">
                  <Building2 size={16} className="text-[var(--primary)]" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-[var(--foreground)]">{organizations.length} Organizations</p>
                    <p className="text-[10px] font-mono text-[var(--muted-foreground)]">{departments.length} Departments</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3.5 py-2 shadow-2xs">
                  <CalendarDays size={16} className="text-[var(--primary)]" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-[var(--foreground)]">{publicEvents.length} Events Total</p>
                    <p className="text-[10px] font-mono text-[var(--primary)] font-semibold">{approvedEventsCount} Approved</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3.5 py-2 shadow-2xs">
                  <Users size={16} className="text-sky-600" />
                  <div className="text-left">
                    <p className="text-xs font-bold text-[var(--foreground)]">{totalOfficersCount} Officers</p>
                    <p className="text-[10px] font-mono text-[var(--muted-foreground)]">Active Leadership</p>
                  </div>
                </div>
              </div>
            </div>
          </FadeSection>

          {/* Primary View Switcher Tabs */}
          <div className="flex gap-2 mt-4 border-b border-[var(--border)]">
            <button
              onClick={() => handleTabChange("roster")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-xl border transition-all cursor-pointer ${
                tab === "roster"
                  ? "bg-[var(--background)] border-[var(--border)] border-b-[var(--background)] text-[var(--primary)] -mb-px shadow-2xs"
                  : "bg-transparent border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              }`}
            >
              <Users size={16} />
              Organization Roster
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                  tab === "roster" ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--foreground)]"
                }`}
              >
                {organizations.length}
              </span>
            </button>

            <button
              onClick={() => handleTabChange("calendar")}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-bold rounded-t-xl border transition-all cursor-pointer ${
                tab === "calendar"
                  ? "bg-[var(--background)] border-[var(--border)] border-b-[var(--background)] text-[var(--primary)] -mb-px shadow-2xs"
                  : "bg-transparent border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/50"
              }`}
            >
              <CalendarIcon size={16} />
              Event Calendar
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
                  tab === "calendar" ? "bg-[var(--primary)] text-white" : "bg-[var(--muted)] text-[var(--foreground)]"
                }`}
              >
                {publicEvents.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-10 flex-1 w-full">
        {/* ======================= ROSTER TAB ======================= */}
        {tab === "roster" && (
          <div className="flex flex-col gap-8">
            {/* Search & Department Filters */}
            <FadeSection>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Department Pills */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-[var(--muted-foreground)] uppercase tracking-wider mr-1">
                    Department:
                  </span>
                  <button
                    onClick={() => setActiveDept("all")}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                      activeDept === "all"
                        ? "bg-[var(--primary)] text-white shadow-xs"
                        : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)]"
                    }`}
                  >
                    All Departments ({organizations.length})
                  </button>

                  {departments.map((d) => {
                    const count = organizations.filter((o) => o.departmentId === d.id).length;
                    const isSelected = activeDept === d.id;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setActiveDept(d.id)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[var(--primary)] text-white shadow-xs"
                            : "bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--border)]"
                        }`}
                        title={d.name}
                      >
                        {d.code}
                        <span className={`ml-1.5 font-mono ${isSelected ? "text-teal-100" : "text-[var(--muted-foreground)]"}`}>
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Bar */}
                <div className="relative min-w-[260px] md:w-80">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                  <input
                    type="text"
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    placeholder="Search org, code, officer..."
                    className="w-full pl-9 pr-8 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition"
                  />
                  {rosterSearch && (
                    <button
                      onClick={() => setRosterSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-0.5 cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </FadeSection>

            {/* Organizations Catalog */}
            {filteredOrganizations.length === 0 ? (
              <FadeSection>
                <div className="py-20 flex flex-col items-center justify-center text-center bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8">
                  <Building2 size={48} className="text-[var(--muted-foreground)] opacity-40 mb-3" />
                  <h3 className="text-lg font-bold text-[var(--foreground)]">No organizations found</h3>
                  <p className="text-sm text-[var(--muted-foreground)] max-w-md mt-1">
                    No student organization matched your current filter criteria.
                  </p>
                  <button
                    onClick={() => {
                      setActiveDept("all");
                      setRosterSearch("");
                    }}
                    className="mt-4 px-4 py-2 bg-[var(--primary)] text-white text-xs font-semibold rounded-lg hover:bg-[var(--primary)]/90 transition cursor-pointer"
                  >
                    Clear Filters
                  </button>
                </div>
              </FadeSection>
            ) : (
              filteredOrganizations.map((org, orgIdx) => {
                const dept = departments.find((d) => d.id === org.departmentId);
                const orgStudents = users.filter((u) => u.organizationId === org.id && u.role === "student");
                const adviser = users.find((u) => u.id === org.adviserId);
                const orgEvents = publicEvents.filter((e) => e.organizationId === org.id);

                return (
                  <FadeSection key={org.id} delay={orgIdx * 50} className="flex flex-col gap-4">
                    {/* Organization Banner Card */}
                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                      {/* Top Org Header Bar */}
                      <div className="p-6 border-b border-[var(--border)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--muted)]/30">
                        <div className="flex items-center gap-4">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-lg shadow-xs flex-shrink-0"
                            style={{ backgroundColor: org.logoColor }}
                          >
                            {org.code}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="font-bold text-xl text-[var(--foreground)]">{org.name}</h2>
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--card)] border border-[var(--border)] text-[var(--primary)]">
                                {dept?.code}
                              </span>
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)] mt-1">
                              {dept?.name}
                            </p>
                          </div>
                        </div>

                        {/* Org Meta Badges */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs bg-[var(--card)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-[var(--foreground)] shadow-2xs">
                            <Users size={13} className="text-[var(--primary)]" />
                            <span className="font-bold">{orgStudents.length}</span> Officers
                          </div>

                          <div className="flex items-center gap-1.5 text-xs bg-[var(--card)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-[var(--foreground)] shadow-2xs">
                            <CalendarIcon size={13} className="text-[var(--primary)]" />
                            <span className="font-bold">{orgEvents.length}</span> Events
                          </div>

                          <div className="flex items-center gap-1.5 text-xs bg-[var(--card)] border border-[var(--border)] px-3 py-1.5 rounded-lg text-[var(--foreground)] shadow-2xs">
                            <Wallet size={13} className="text-[var(--primary)]" />
                            <span>Current Budget: <strong className="text-[var(--primary)] font-bold">{formatCurrency(org.allocatedBudget)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Content Grid: Events & Officers */}
                      <div className="p-6 grid lg:grid-cols-12 gap-6">
                        {/* Events Column */}
                        <div className="lg:col-span-7 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-mono font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                              <CalendarIcon size={14} className="text-[var(--primary)]" />
                              Scheduled Events ({orgEvents.length})
                            </p>
                            {orgEvents.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedOrgFilter(org.id);
                                  handleTabChange("calendar");
                                }}
                                className="text-xs font-bold text-[var(--primary)] hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                View in Calendar <ArrowUpRight size={12} />
                              </button>
                            )}
                          </div>

                          {orgEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 bg-[var(--muted)]/20 rounded-xl border border-dashed border-[var(--border)] text-center h-full min-h-[160px]">
                              <CalendarIcon size={28} className="text-[var(--muted-foreground)] opacity-40 mb-2" />
                              <p className="text-sm font-semibold text-[var(--foreground)]">No scheduled events yet</p>
                              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                Activity proposals will appear here once submitted.
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2.5">
                              {orgEvents.map((e) => {
                                const type = getEventTypeById(e.typeId);
                                return (
                                  <button
                                    key={e.id}
                                    onClick={() => setSelectedEvent(e)}
                                    className="flex items-start gap-3.5 text-left p-3.5 rounded-xl bg-[var(--card)] hover:bg-[var(--muted)]/40 transition-all group border border-[var(--border)] hover:border-[var(--primary)] shadow-2xs hover:shadow-xs cursor-pointer"
                                  >
                                    <div
                                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-2xs group-hover:scale-105 transition-transform"
                                      style={{ backgroundColor: org.logoColor }}
                                    >
                                      <CalendarIcon size={16} />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition truncate">
                                          {e.name}
                                        </p>
                                        <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full ${statusColors[e.status]}`}>
                                          {e.status}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-3 mt-2 flex-wrap text-xs">
                                        <span className="flex items-center gap-1 font-mono font-bold text-[var(--foreground)]">
                                          <Clock size={12} className="text-[var(--primary)]" />
                                          {formatDate(e.dateStart)}
                                        </span>
                                        <span className="flex items-center gap-1 text-[var(--muted-foreground)] font-medium">
                                          <ModeIcon mode={e.mode} size={12} />
                                          {e.mode}
                                        </span>
                                        {type && (
                                          <span className="bg-[var(--primary)] text-white px-2.5 py-0.5 rounded-md text-[11px] font-semibold shadow-2xs">
                                            {type.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <ArrowUpRight size={16} className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-0.5 transition flex-shrink-0 mt-1" />
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Officers Column */}
                        <div className="lg:col-span-5 flex flex-col gap-3">
                          <p className="text-xs font-mono font-bold text-[var(--foreground)] uppercase tracking-wider flex items-center gap-1.5">
                            <Users size={14} className="text-[var(--primary)]" />
                            Leadership & Officers
                          </p>

                          <div className="flex flex-col gap-2">
                            {/* Faculty Adviser */}
                            {adviser && (
                              <div className="flex items-center gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xs hover:border-[var(--primary)] transition">
                                <div className="w-9 h-9 rounded-full bg-[var(--primary)] text-white flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-2xs">
                                  {adviser.firstName[0]}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="text-sm font-bold text-[var(--foreground)] truncate">
                                      {adviser.firstName} {adviser.lastName} {adviser.suffix}
                                    </p>
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-[var(--primary)]/10 text-[var(--primary)] font-semibold px-2 py-0.5 rounded-md">
                                      <ShieldCheck size={11} />
                                      Adviser
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-[var(--muted-foreground)] truncate mt-0.5">
                                    {adviser.email}
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Student Officers */}
                            {orgStudents.length === 0 ? (
                              <p className="text-xs text-[var(--muted-foreground)] italic py-2">
                                No student officers registered for this organization yet.
                              </p>
                            ) : (
                              orgStudents.map((u) => {
                                const avatarBg =
                                  u.gender === "male"
                                    ? "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200 border-sky-200 dark:border-sky-800"
                                    : u.gender === "female"
                                    ? "bg-pink-50 text-pink-800 dark:bg-pink-950 dark:text-pink-200 border-pink-200 dark:border-pink-800"
                                    : "bg-purple-50 text-purple-800 dark:bg-purple-950 dark:text-purple-200 border-purple-200 dark:border-purple-800";

                                return (
                                  <div
                                    key={u.id}
                                    className="flex items-center gap-3 p-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xs hover:border-[var(--primary)]/40 transition"
                                  >
                                    <div
                                      className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarBg}`}
                                    >
                                      {u.firstName[0]}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-bold text-[var(--foreground)] truncate">
                                        {u.firstName} {u.lastName} {u.suffix}
                                      </p>
                                      <p className="text-[11px] text-[var(--muted-foreground)] truncate font-medium">
                                        {u.position} {u.yearLevel ? `· ${u.yearLevel}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </FadeSection>
                );
              })
            )}
          </div>
        )}

        {/* ======================= CALENDAR TAB ======================= */}
        {tab === "calendar" && (
          <div className="flex flex-col gap-8">
            {/* Interactive Calendar Component */}
            <FadeSection>
              <CalendarGrid
                events={publicEvents}
                organizations={organizations}
                onSelectEvent={setSelectedEvent}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
              />
            </FadeSection>

            {/* Filter and View Controls Toolbar */}
            <FadeSection className="flex flex-col gap-3">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col gap-3.5">
                {/* Top Row: Search, Org Dropdown, View Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1 max-w-xl">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                      <input
                        type="text"
                        value={calendarSearch}
                        onChange={(e) => setCalendarSearch(e.target.value)}
                        placeholder="Search by event title, venue, or keyword..."
                        className="w-full pl-9 pr-8 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-medium"
                      />
                      {calendarSearch && (
                        <button
                          onClick={() => setCalendarSearch("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>

                    {/* Org Filter Dropdown */}
                    <select
                      value={selectedOrgFilter}
                      onChange={(e) => setSelectedOrgFilter(e.target.value)}
                      className="px-3 py-2 text-xs font-semibold bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer max-w-[200px] truncate"
                    >
                      <option value="all">All Organizations</option>
                      {organizations.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.code} — {o.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Right: Layout Toggle */}
                  <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                    <div className="flex items-center gap-1 bg-[var(--muted)] p-1 rounded-xl border border-[var(--border)]">
                      <button
                        onClick={() => setCalendarLayout("grid")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                          calendarLayout === "grid"
                            ? "bg-[var(--card)] text-[var(--primary)] shadow-2xs font-bold"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-medium"
                        }`}
                        title="Grid View"
                      >
                        <LayoutGrid size={14} />
                        <span>Grid</span>
                      </button>
                      <button
                        onClick={() => setCalendarLayout("list")}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer ${
                          calendarLayout === "list"
                            ? "bg-[var(--card)] text-[var(--primary)] shadow-2xs font-bold"
                            : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] font-medium"
                        }`}
                        title="List View"
                      >
                        <ListFilter size={14} />
                        <span>List</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtle Divider */}
                <div className="h-px bg-[var(--border)]/60 w-full" />

                {/* Bottom Row: Status Filter Pills */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-[var(--muted-foreground)] uppercase tracking-wider mr-1">
                      Status:
                    </span>
                    {STATUS_FILTER_OPTIONS.map((s) => {
                      const count =
                        s === "All" ? publicEvents.length : publicEvents.filter((e) => e.status === s).length;
                      const isSelected = statusFilter === s;
                      return (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-[var(--primary)] text-white shadow-xs font-bold"
                              : "bg-[var(--muted)]/70 text-[var(--foreground)] hover:bg-[var(--border)] border border-[var(--border)]/50"
                          }`}
                        >
                          {s}
                          <span className={`ml-1 font-mono font-bold ${isSelected ? "text-teal-100" : "text-[var(--muted-foreground)]"}`}>
                            ({count})
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {(statusFilter !== "All" || selectedOrgFilter !== "all" || selectedDay !== null || calendarSearch) && (
                    <button
                      onClick={() => {
                        setStatusFilter("All");
                        setSelectedOrgFilter("all");
                        setSelectedDay(null);
                        setCalendarSearch("");
                      }}
                      className="text-xs text-[var(--primary)] hover:underline font-bold cursor-pointer ml-auto"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              </div>

              {/* Active Filter Indicators Bar */}
              <div className="flex items-center justify-between text-xs font-mono text-[var(--foreground)] px-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span>
                    Showing <strong className="text-[var(--primary)] font-bold">{filteredCalendarEvents.length}</strong> of {publicEvents.length} events
                  </span>
                  {selectedDay && (
                    <span className="bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-md font-bold">
                      Date: {MONTH_NAMES[selectedDay.month]} {selectedDay.day}, {selectedDay.year}
                    </span>
                  )}
                  {selectedOrgFilter !== "all" && (
                    <span className="bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] px-2 py-0.5 rounded-md font-medium">
                      Org: {organizations.find((o) => o.id === selectedOrgFilter)?.code}
                    </span>
                  )}
                </div>
              </div>
            </FadeSection>

            {/* Events Catalog View */}
            {filteredCalendarEvents.length === 0 ? (
              <FadeSection>
                <div className="flex flex-col items-center justify-center py-20 gap-3 bg-[var(--card)] rounded-2xl border border-[var(--border)] text-center p-6">
                  <CalendarIcon size={44} className="text-[var(--muted-foreground)] opacity-30 mb-1" />
                  <h3 className="text-base font-bold text-[var(--foreground)]">No events match your criteria</h3>
                  <p className="text-xs text-[var(--muted-foreground)] max-w-sm">
                    Try adjusting your status filter, organization selection, or chosen calendar date.
                  </p>
                  <button
                    onClick={() => {
                      setStatusFilter("All");
                      setSelectedOrgFilter("all");
                      setSelectedDay(null);
                      setCalendarSearch("");
                    }}
                    className="mt-2 px-4 py-2 text-xs font-semibold bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition cursor-pointer"
                  >
                    Show All Events
                  </button>
                </div>
              </FadeSection>
            ) : calendarLayout === "grid" ? (
              /* Grid Layout */
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCalendarEvents.map((e, i) => {
                  const org = organizations.find((o) => o.id === e.organizationId);
                  const type = getEventTypeById(e.typeId);
                  return (
                    <FadeSection key={e.id} delay={i * 30}>
                      <button
                        onClick={() => setSelectedEvent(e)}
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-left hover:shadow-md hover:border-[var(--primary)] transition-all group flex flex-col gap-4 h-full cursor-pointer shadow-2xs"
                      >
                        {/* Card Header: Status & Mode */}
                        <div className="flex items-center justify-between gap-2 w-full">
                          <span className={`text-[11px] font-mono px-2.5 py-1 rounded-full ${statusColors[e.status]}`}>
                            {e.status}
                          </span>
                          <span className="text-[11px] font-mono text-[var(--foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-md border border-[var(--border)] font-medium">
                            {e.mode}
                          </span>
                        </div>

                        {/* Title & Time */}
                        <div className="flex-1">
                          <h3 className="font-bold text-base text-[var(--foreground)] group-hover:text-[var(--primary)] transition leading-snug line-clamp-2">
                            {e.name}
                          </h3>
                          <div className="flex flex-col gap-1.5 mt-2.5 text-xs font-mono text-[var(--foreground)]">
                            <span className="flex items-center gap-1.5 font-bold text-[var(--foreground)]">
                              <Clock size={13} className="text-[var(--primary)]" />
                              {formatTimeRange(e.dateStart, e.dateEnd)}
                            </span>
                            {e.location && (
                              <span className="flex items-center gap-1.5 min-w-0 text-[var(--muted-foreground)] font-medium" title={e.location}>
                                {e.mode === "Online/Virtual" ? (
                                  <Video size={13} className="text-[var(--primary)] flex-shrink-0" />
                                ) : (
                                  <MapPin size={13} className="text-[var(--primary)] flex-shrink-0" />
                                )}
                                <span className="truncate">{e.location}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer: Organization pill & Event Type */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-[var(--border)] mt-auto w-full">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                              style={{ backgroundColor: org?.logoColor ?? "var(--primary)" }}
                            >
                              {org?.code?.slice(0, 2) ?? "?"}
                            </div>
                            <span className="text-xs font-semibold text-[var(--foreground)] truncate">
                              {org?.name}
                            </span>
                          </div>
                          {type && (
                            <span className="text-[10px] bg-[var(--primary)] text-white px-2 py-0.5 rounded-md font-semibold flex-shrink-0 shadow-2xs">
                              {type.name}
                            </span>
                          )}
                        </div>
                      </button>
                    </FadeSection>
                  );
                })}
              </div>
            ) : (
              /* List / Agenda Layout */
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs divide-y divide-[var(--border)]">
                {filteredCalendarEvents.map((e, i) => {
                  const org = organizations.find((o) => o.id === e.organizationId);
                  const type = getEventTypeById(e.typeId);
                  return (
                    <FadeSection key={e.id} delay={i * 20}>
                      <button
                        onClick={() => setSelectedEvent(e)}
                        className="w-full p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left hover:bg-[var(--muted)]/40 transition group cursor-pointer"
                      >
                        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-2xs"
                            style={{ backgroundColor: org?.logoColor ?? "var(--primary)" }}
                          >
                            {org?.code}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <h3 className="font-bold text-sm sm:text-base text-[var(--foreground)] group-hover:text-[var(--primary)] transition truncate">
                                {e.name}
                              </h3>
                              <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full ${statusColors[e.status]}`}>
                                {e.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 flex-wrap text-xs text-[var(--foreground)] font-mono">
                              <span className="flex items-center gap-1 font-bold">
                                <Clock size={12} className="text-[var(--primary)]" />
                                {formatTimeRange(e.dateStart, e.dateEnd)}
                              </span>
                              <span className="flex items-center gap-1 text-[var(--muted-foreground)]">
                                <ModeIcon mode={e.mode} size={12} />
                                {e.mode === "Online/Virtual" ? "Online" : e.mode}
                              </span>
                              {e.location && (
                                <span className="flex items-center gap-1 min-w-0 text-[var(--muted-foreground)]" title={e.location}>
                                  {e.mode === "Online/Virtual" ? (
                                    <Video size={12} className="text-[var(--primary)] flex-shrink-0" />
                                  ) : (
                                    <MapPin size={12} className="text-[var(--primary)] flex-shrink-0" />
                                  )}
                                  <span className="truncate max-w-[180px] sm:max-w-[240px]">{e.location}</span>
                                </span>
                              )}
                              {type && (
                                <span className="bg-[var(--primary)] text-white px-2 py-0.5 rounded text-[10px] font-semibold shadow-2xs">
                                  {type.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 justify-between md:justify-end flex-shrink-0">
                          <span className="text-xs font-semibold text-[var(--foreground)] font-mono">
                            {org?.name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] group-hover:translate-x-0.5 transition">
                            <ArrowUpRight size={14} />
                          </span>
                        </div>
                      </button>
                    </FadeSection>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <PublicFooter />

      {/* Rich Event Detail Dialog */}
      {selectedEvent && (
        <Dialog
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title="Event Clearance Details"
          size="lg"
        >
          {(() => {
            const org = organizations.find((o) => o.id === selectedEvent.organizationId);
            const dept = departments.find((d) => d.id === org?.departmentId);
            const type = getEventTypeById(selectedEvent.typeId);
            const eventTxns = liveTxns.filter((t) => t.eventId === selectedEvent.id && !t.deleted);
            const totalSpent = eventTxns.reduce((sum, t) => sum + (t.status === "Paid" ? t.amount : 0), 0);
            const remainingBalance = selectedEvent.proposedBudget - totalSpent;

            return (
              <div className="p-6 flex flex-col gap-6">
                {/* Organization Header Banner */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-2xs flex-shrink-0"
                      style={{ backgroundColor: org?.logoColor ?? "var(--primary)" }}
                    >
                      {org?.code}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[var(--foreground)] truncate">{org?.name}</p>
                      <p className="text-xs font-mono text-[var(--muted-foreground)] truncate">{dept?.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs font-mono px-3 py-1 rounded-full ${statusColors[selectedEvent.status]}`}>
                      {selectedEvent.status}
                    </span>
                    <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[var(--card)] text-[var(--foreground)] border border-[var(--border)] font-semibold">
                      {selectedEvent.mode === "Online/Virtual" ? "Online" : selectedEvent.mode}
                    </span>
                  </div>
                </div>

                {/* Event Title */}
                <div>
                  <h2 className="text-xl font-extrabold text-[var(--foreground)] leading-tight">
                    {selectedEvent.name}
                  </h2>
                  <p className="text-xs font-mono text-[var(--primary)] mt-1 font-bold">
                    {type?.name ?? "General Event"}
                  </p>
                </div>

                {/* Metadata Info Grid */}
                <div className="grid sm:grid-cols-2 gap-3.5 text-sm">
                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 shadow-2xs">
                    <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                      <Clock size={12} className="text-[var(--primary)]" /> Date & Schedule
                    </p>
                    <p className="font-bold text-xs text-[var(--foreground)] leading-snug">
                      {formatTimeRange(selectedEvent.dateStart, selectedEvent.dateEnd)}
                    </p>
                  </div>

                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 shadow-2xs">
                    <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                      {selectedEvent.mode === "Online/Virtual" ? (
                        <Video size={12} className="text-[var(--primary)]" />
                      ) : (
                        <MapPin size={12} className="text-[var(--primary)]" />
                      )}{" "}
                      {selectedEvent.mode === "Online/Virtual" ? "Platform / Link" : "Venue / Location"}
                    </p>
                    {isWebUrl(selectedEvent.location) ? (
                      <a
                        href={toWebUrl(selectedEvent.location!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-xs text-[var(--primary)] hover:underline underline-offset-2 flex items-center gap-1.5 leading-snug break-all transition-colors"
                      >
                        <span className="truncate">{selectedEvent.location}</span>
                        <ExternalLink size={12} className="flex-shrink-0 text-[var(--primary)]" />
                      </a>
                    ) : (
                      <p className="font-bold text-xs text-[var(--foreground)] leading-snug truncate">
                        {selectedEvent.location || (selectedEvent.mode === "Online/Virtual" ? "Online Platform" : "Venue TBD")}
                      </p>
                    )}
                  </div>

                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 shadow-2xs">
                    <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                      <Wallet size={12} className="text-[var(--primary)]" /> Proposed Budget
                    </p>
                    <p className="font-bold text-xs font-mono text-[var(--primary)] leading-snug">
                      {formatCurrency(selectedEvent.proposedBudget)}
                    </p>
                  </div>

                  <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 shadow-2xs">
                    <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider mb-1 flex items-center gap-1 font-bold">
                      <Award size={12} className="text-[var(--primary)]" /> Compliance Documents
                    </p>
                    <p className="font-bold text-xs text-[var(--foreground)] leading-snug">
                      {selectedEvent.apfUrl ? "APF Attached" : "Activity Proposal Form"} · {selectedEvent.appendices?.length ?? 0} Appendices
                    </p>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <p className="text-[10px] font-mono text-[var(--foreground)] uppercase tracking-wider mb-1.5 font-bold">
                    Event Overview & Objectives
                  </p>
                  <div className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-4 text-xs sm:text-sm text-[var(--foreground)] leading-relaxed font-medium">
                    {selectedEvent.description || "No description provided."}
                  </div>
                </div>

                {/* Financial Summary & Ledger Section */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 shadow-2xs flex flex-col gap-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-mono text-[var(--foreground)] uppercase tracking-wider font-bold flex items-center gap-1.5">
                        <Receipt size={13} className="text-[var(--primary)]" />
                        Financial Summary & Disbursement Ledger
                      </p>
                    </div>
                    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${
                      eventTxns.length > 0
                        ? "bg-teal-50 text-teal-800 border-teal-200"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}>
                      {eventTxns.length > 0 ? "Active Ledger" : "Proposal Stage"}
                    </span>
                  </div>

                  {/* Financial Metrics Strip */}
                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-2.5 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)]">
                      <p className="text-[9px] font-mono text-[var(--muted-foreground)] uppercase">Proposed Allocation</p>
                      <p className="text-xs sm:text-sm font-bold font-mono text-[var(--foreground)] mt-0.5 truncate">
                        {formatCurrency(selectedEvent.proposedBudget)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)]">
                      <p className="text-[9px] font-mono text-[var(--muted-foreground)] uppercase">Total Disbursed</p>
                      <p className="text-xs sm:text-sm font-bold font-mono text-teal-400 dark:text-teal-600 mt-0.5 truncate">
                        {formatCurrency(totalSpent)}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[var(--muted)]/30 border border-[var(--border)]">
                      <p className="text-[9px] font-mono text-[var(--muted-foreground)] uppercase">Remaining Balance</p>
                      <p className={`text-xs sm:text-sm font-bold font-mono mt-0.5 truncate ${remainingBalance < 0 ? "text-rose-600 font-bold" : "text-[var(--foreground)]"}`}>
                        {formatCurrency(remainingBalance)}
                      </p>
                    </div>
                  </div>

                  {/* Itemized Transactions Table */}
                  {eventTxns.length > 0 ? (
                    <div className="flex flex-col gap-1.5 mt-1">
                      <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider font-bold">
                        Itemized Disbursements ({eventTxns.length})
                      </p>
                      <div className="border border-[var(--border)] rounded-lg overflow-hidden divide-y divide-[var(--border)] text-xs">
                        {eventTxns.map((txn) => {
                          const cat = expenditureCategories.find((c) => c.id === txn.categoryId);
                          return (
                            <div key={txn.id} className="p-2.5 flex items-center justify-between gap-3 bg-[var(--card)] hover:bg-[var(--muted)]/20 transition">
                              <div className="min-w-0">
                                <p className="font-semibold text-[var(--foreground)] truncate">{txn.description}</p>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[var(--muted-foreground)] font-mono">
                                  <span>{cat?.name ?? "General Expense"}</span>
                                  <span>·</span>
                                  <span>{formatDate(txn.createdAt)}</span>
                                </div>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="font-bold font-mono text-[var(--foreground)]">{formatCurrency(txn.amount)}</p>
                                <span className="text-[9px] font-mono font-semibold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {txn.status}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-[var(--muted)]/20 rounded-lg border border-dashed border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
                      No disbursements recorded yet. Ledger activates upon Dean clearance and SDS dispatch.
                    </div>
                  )}
                </div>

                {/* Logistical Requisites if available */}
                {selectedEvent.requisites && (
                  <div>
                    <p className="text-[10px] font-mono text-[var(--foreground)] uppercase tracking-wider mb-1.5 font-bold">
                      Logistics & Requisites
                    </p>
                    <p className="bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl p-3 text-xs text-[var(--foreground)] leading-relaxed font-medium">
                      {selectedEvent.requisites}
                    </p>
                  </div>
                )}

                {/* Official Clearance Banner if Approved */}
                {["Approved", "Completed", "Closed"].includes(selectedEvent.status) && (
                  <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-xl p-4 shadow-sm border border-emerald-700/80 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 flex-shrink-0">
                        <BadgeCheck size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-white">Official Event Clearance Granted</p>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 uppercase font-bold">
                            SDS Dispatched
                          </span>
                        </div>
                        <p className="text-[11px] text-teal-100/80 font-mono truncate">
                          Event_Clearance_{selectedEvent.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end ml-auto flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          printClearanceDocument(selectedEvent, org?.name, type?.name);
                          toast.success("Clearance Certificate Prepared", "Document dispatched to the browser.");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium transition cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        <Printer size={13} /> Print / Preview Clearance
                      </button>
                    </div>
                  </div>
                )}

                {/* Liquidation Banner if Closed */}
                {selectedEvent.status === "Closed" && (
                  <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 text-white rounded-xl p-4 shadow-sm border border-teal-700/80 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/20 flex items-center justify-center text-teal-200 flex-shrink-0">
                        <FileSpreadsheet size={20} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-white">Liquidation Report Reconciled</p>
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-200 border border-teal-400/30 uppercase font-bold">
                            Audited & Archived
                          </span>
                        </div>
                        <p className="text-[11px] text-teal-100/80 font-mono truncate">
                          Liquidation_Report_{selectedEvent.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end ml-auto flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const eventTxns = liveTxns.filter((t) => t.eventId === selectedEvent.id && !t.deleted);
                          printLiquidationDocument(selectedEvent, eventTxns, org?.name);
                          toast.success("Liquidation Statement Prepared", "Official document dispatched for print/PDF export.");
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-medium transition cursor-pointer shadow-2xs whitespace-nowrap"
                      >
                        <Printer size={13} /> Print / Preview Liquidation
                      </button>
                    </div>
                  </div>
                )}

                {/* Signatory Progress */}
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-2xs">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-mono text-[var(--foreground)] uppercase tracking-wider font-bold">
                      Signatory Approval Progression
                    </p>
                    <span className="text-[10px] font-mono text-[var(--primary)] font-bold">
                      Student → Adviser → Dean → SDS
                    </span>
                  </div>
                  <SignatoryProgress status={selectedEvent.status} />
                </div>
              </div>
            );
          })()}
        </Dialog>
      )}
    </div>
  );
}
