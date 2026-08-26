import { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { Dialog, SignatoryProgress } from "../components/ui";
import PublicNav from "../components/layout/PublicNav";
import PublicFooter from "../components/layout/PublicFooter";
import {
  Calendar, ArrowUpRight, Clock, MapPin, Building2, Users,
  ChevronLeft, ChevronRight, ArrowLeft,
} from "lucide-react";
import {
  departments, organizations, users, getEventTypeById,
  formatDate, statusColors,
} from "../services/mockData";

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
    <div ref={ref} className={className}
      style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(22px)", transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms` }}>
      {children}
    </div>
  );
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const STATUS_FILTER_OPTIONS = ["All", "For Approval", "Approved", "Completed", "Closed"] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];

function CalendarGrid({ events, onSelectEvent }: {
  events: ReturnType<typeof useApp>["events"];
  onSelectEvent: (e: ReturnType<typeof useApp>["events"][0]) => void;
}) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = Array.from({ length: firstDay + daysInMonth }, (_, i) => i < firstDay ? null : i - firstDay + 1);
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsOnDay(day: number) {
    return events.filter((e) => {
      const d = new Date(e.dateStart);
      return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day;
    });
  }
  function prevMonth() { if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth((m) => m - 1); }
  function nextMonth() { if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth((m) => m + 1); }
  const isToday = (day: number) => day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition text-[var(--muted-foreground)]"><ChevronLeft size={18} /></button>
        <h3 className="font-bold text-[var(--foreground)]">{MONTH_NAMES[viewMonth]} {viewYear}</h3>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-[var(--muted)] transition text-[var(--muted-foreground)]"><ChevronRight size={18} /></button>
      </div>
      <div className="grid grid-cols-7 border-b border-[var(--border)]">
        {DAY_NAMES.map((d) => (
          <div key={d} className="py-2 text-center text-[10px] font-mono font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          const dayEvents = day ? eventsOnDay(day) : [];
          const isCurrentDay = day ? isToday(day) : false;
          return (
            <div key={idx} className={`min-h-[90px] p-1.5 border-r border-b border-[var(--border)] ${day ? "" : "bg-[var(--muted)]/30"} ${idx % 7 === 6 ? "border-r-0" : ""}`}>
              {day && (
                <>
                  <span className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-semibold mb-1 ${isCurrentDay ? "bg-[var(--primary)] text-white" : "text-[var(--muted-foreground)]"}`}>{day}</span>
                  <div className="flex flex-col gap-0.5">
                    {dayEvents.slice(0, 2).map((e) => {
                      const org = organizations.find((o) => o.id === e.organizationId);
                      return (
                        <button key={e.id} onClick={() => onSelectEvent(e)}
                          className="w-full text-left text-[11px] font-medium px-1.5 py-0.5 rounded truncate text-white leading-tight hover:opacity-80 transition"
                          style={{ backgroundColor: org?.logoColor ?? "var(--primary)" }} title={e.name}>
                          {e.name}
                        </button>
                      );
                    })}
                    {dayEvents.length > 2 && <span className="text-[10px] font-mono text-[var(--muted-foreground)] px-1">+{dayEvents.length - 2} more</span>}
                  </div>
                </>
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
  const { events: liveEvents } = useApp();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(searchParams.get("tab") === "calendar" ? "calendar" : "roster");

  useEffect(() => {
    const t = searchParams.get("tab");
    setTab(t === "calendar" ? "calendar" : "roster");
    window.scrollTo(0, 0);
  }, [searchParams]);
  const [activeDept, setActiveDept] = useState(departments[0].id);
  const [selectedEvent, setSelectedEvent] = useState<(typeof liveEvents)[0] | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");

  const publicEvents = liveEvents.filter((e) => ["For Approval", "Approved", "Completed", "Closed"].includes(e.status));
  const deptOrgs = organizations.filter((o) => o.departmentId === activeDept);
  const filtered = statusFilter === "All" ? publicEvents : publicEvents.filter((e) => e.status === statusFilter);

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <PublicNav hideOrgCta />

      {/* Page hero */}
      <div className="pt-24 bg-[var(--card)] border-b border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-6">
          <FadeSection>
            {/* Breadcrumb trail */}
            <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted-foreground)] mb-5">
              <Link to="/" onClick={() => window.scrollTo(0, 0)}
                className="flex items-center gap-1 hover:text-[var(--primary)] transition">
                <ArrowLeft size={11} /> Home
              </Link>
              <span className="opacity-40">/</span>
              <span className="text-[var(--foreground)]">
                {tab === "roster" ? "Organization Roster" : "Event Calendar"}
              </span>
            </div>

            <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-widest">CITE · LCUP</span>
            <h1 className="text-3xl lg:text-4xl font-extrabold mt-2 text-[var(--foreground)]">
              {tab === "roster" ? "Organization Roster" : "Event Calendar"}
            </h1>
            <p className="mt-3 text-[var(--muted-foreground)] max-w-xl leading-relaxed">
              {tab === "roster"
                ? "Browse student organizations by department, explore their upcoming events, and see the officers leading each group."
                : "Track approved, upcoming, and completed events across all CITE student organizations."}
            </p>
          </FadeSection>

          {/* Tab switcher */}
          <div className="flex gap-1 mt-8">
            {(["roster", "calendar"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold rounded-t-xl border border-b-0 transition-all ${
                  tab === t
                    ? "bg-[var(--background)] border-[var(--border)] text-[var(--foreground)]"
                    : "bg-transparent border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                {t === "roster" ? <Users size={14} /> : <Calendar size={14} />}
                {t === "roster" ? "Organization Roster" : "Calendar"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-6 py-14">

        {tab === "roster" && (
          <>
            {/* Dept pills */}
            <FadeSection className="mb-8">
              <div className="flex gap-2 flex-wrap">
                {departments.map((d) => (
                  <button key={d.id} onClick={() => setActiveDept(d.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      activeDept === d.id
                        ? "bg-[var(--primary)] text-white shadow-sm"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                    }`}>
                    {d.code}
                    <span className={`ml-1.5 text-[10px] font-mono ${activeDept === d.id ? "text-teal-200" : "text-[var(--muted-foreground)]"}`}>
                      {organizations.filter((o) => o.departmentId === d.id).length} org
                    </span>
                  </button>
                ))}
              </div>
            </FadeSection>

            {departments.filter((d) => d.id === activeDept).map((dept) => (
              <FadeSection key={dept.id} className="mb-8">
                <div className="flex items-center gap-2">
                  <Building2 size={15} className="text-[var(--primary)]" />
                  <span className="text-sm font-mono text-[var(--muted-foreground)]">{dept.name}</span>
                </div>
              </FadeSection>
            ))}

            {deptOrgs.length === 0 ? (
              <div className="py-20 text-center text-[var(--muted-foreground)]">No organizations in this department.</div>
            ) : (
              deptOrgs.map((org, orgIdx) => {
                const orgUsers = users.filter((u) => u.organizationId === org.id && u.role === "student");
                const adviser = users.find((u) => u.id === org.adviserId);
                const orgEvents = publicEvents.filter((e) => e.organizationId === org.id).slice(0, 3);
                return (
                  <FadeSection key={org.id} delay={orgIdx * 60} className="mb-12">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-base shadow flex-shrink-0"
                        style={{ backgroundColor: org.logoColor }}>
                        {org.code.slice(0, 2)}
                      </div>
                      <div>
                        <h2 className="font-bold text-[var(--foreground)] text-xl">{org.name}</h2>
                        <p className="text-xs font-mono text-[var(--muted-foreground)] mt-0.5">{org.code}</p>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-5">
                      {/* Events */}
                      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                        <p className="text-[10px] font-mono font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-4">Upcoming Events</p>
                        {orgEvents.length === 0 ? (
                          <div className="flex flex-col items-center gap-2 py-8 text-[var(--muted-foreground)]">
                            <Calendar size={24} className="opacity-40" />
                            <p className="text-sm">No public events yet.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {orgEvents.map((e) => (
                              <button key={e.id} onClick={() => setSelectedEvent(e)}
                                className="flex items-start gap-3 text-left p-3 rounded-xl hover:bg-[var(--muted)] transition group border border-transparent hover:border-[var(--border)]">
                                <div className="w-9 h-9 bg-[var(--primary)] rounded-xl flex items-center justify-center text-white flex-shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                                  <Calendar size={14} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition truncate">{e.name}</p>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--muted-foreground)]"><Clock size={9} /> {formatDate(e.dateStart)}</span>
                                    <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--muted-foreground)]"><MapPin size={9} /> {e.mode}</span>
                                  </div>
                                </div>
                                <ArrowUpRight size={14} className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition flex-shrink-0 mt-1" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Officers */}
                      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                        <p className="text-[10px] font-mono font-bold text-[var(--muted-foreground)] uppercase tracking-widest mb-4">Organization Officers</p>
                        <div className="flex flex-col gap-2">
                          {adviser && (
                            <div className="flex items-center gap-3 p-2.5 bg-[var(--muted)] rounded-xl">
                              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{adviser.firstName[0]}</div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--foreground)] truncate">{adviser.firstName} {adviser.lastName}</p>
                                <p className="text-[10px] font-mono text-amber-600/80">Faculty Adviser</p>
                              </div>
                            </div>
                          )}
                          {orgUsers.slice(0, 5).map((u) => {
                            const avatarBg = u.gender === "male" ? "bg-blue-100 text-blue-600" : u.gender === "female" ? "bg-pink-100 text-pink-600" : "bg-purple-100 text-purple-600";
                            return (
                              <div key={u.id} className="flex items-center gap-3 p-2.5 bg-[var(--muted)] rounded-xl">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${avatarBg}`}>{u.firstName[0]}</div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{u.firstName} {u.lastName}</p>
                                  <p className="text-[10px] font-mono text-[var(--muted-foreground)]">{u.position} · {u.yearLevel}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </FadeSection>
                );
              })
            )}
          </>
        )}

        {tab === "calendar" && (
          <div className="flex flex-col gap-10">
            <FadeSection>
              <CalendarGrid events={publicEvents} onSelectEvent={setSelectedEvent} />
            </FadeSection>

            {/* Filter row */}
            <FadeSection className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex gap-2 flex-wrap">
                {STATUS_FILTER_OPTIONS.map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                      statusFilter === s
                        ? "bg-[var(--primary)] text-white shadow-sm"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:bg-[var(--border)] hover:text-[var(--foreground)]"
                    }`}>
                    {s}
                  </button>
                ))}
              </div>
              <p className="text-sm text-[var(--muted-foreground)] font-mono">
                <span className="font-semibold text-[var(--foreground)]">{filtered.length}</span> event{filtered.length !== 1 ? "s" : ""}
                {statusFilter !== "All" && <span> · {statusFilter}</span>}
              </p>
            </FadeSection>

            {/* Event cards */}
            {filtered.length === 0 ? (
              <FadeSection>
                <div className="flex flex-col items-center justify-center py-24 gap-4 bg-[var(--card)] rounded-2xl border border-[var(--border)]">
                  <Calendar size={40} className="text-[var(--muted-foreground)] opacity-40" />
                  <p className="text-[var(--muted-foreground)]">No events match this filter</p>
                  <button onClick={() => setStatusFilter("All")} className="text-sm font-medium text-[var(--primary)] hover:underline">Clear filter</button>
                </div>
              </FadeSection>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map((e, i) => {
                  const org = organizations.find((o) => o.id === e.organizationId);
                  const type = getEventTypeById(e.typeId);
                  return (
                    <FadeSection key={e.id} delay={i * 40}>
                      <button onClick={() => setSelectedEvent(e)}
                        className="w-full bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-left hover:shadow-lg hover:border-[var(--primary)]/50 transition-all group flex flex-col gap-3 h-full">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono px-2.5 py-1 rounded-full border ${statusColors[e.status]}`}>{e.status}</span>
                          <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{e.mode}</span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition leading-snug">{e.name}</h3>
                          <div className="flex items-center gap-3 mt-2 flex-wrap text-[10px] font-mono text-[var(--muted-foreground)]">
                            <span className="flex items-center gap-1"><Clock size={9} /> {formatDate(e.dateStart)}</span>
                            {e.location && <span className="flex items-center gap-1"><MapPin size={9} /> {e.location.split(",")[0]}</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-[var(--border)]">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-bold"
                              style={{ backgroundColor: org?.logoColor ?? "var(--primary)" }}>
                              {org?.code?.slice(0, 2) ?? "?"}
                            </div>
                            <span className="text-xs text-[var(--muted-foreground)]">{org?.name}</span>
                          </div>
                          {type && <span className="text-[10px] bg-[var(--muted)] text-[var(--muted-foreground)] px-2 py-0.5 rounded-full font-mono">{type.name}</span>}
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

      {/* Event detail dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onClose={() => setSelectedEvent(null)} title={selectedEvent.name} size="lg">
          <div className="p-6 flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${statusColors[selectedEvent.status]}`}>{selectedEvent.status}</span>
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">{selectedEvent.mode}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                { label: "Date", value: formatDate(selectedEvent.dateStart) },
                { label: "Location", value: selectedEvent.location },
                { label: "Type", value: getEventTypeById(selectedEvent.typeId)?.name ?? "—" },
                { label: "Organization", value: organizations.find((o) => o.id === selectedEvent.organizationId)?.name ?? "—" },
              ].map((item) => (
                <div key={item.label} className="bg-[var(--muted)] rounded-xl p-3">
                  <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider mb-1">{item.label}</p>
                  <p className="font-medium text-[var(--foreground)] leading-snug">{item.value}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider mb-2">Description</p>
              <p className="text-sm text-[var(--foreground)] leading-relaxed">{selectedEvent.description}</p>
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-4">
              <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-wider mb-4">Signatory Progress</p>
              <SignatoryProgress status={selectedEvent.status} />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
