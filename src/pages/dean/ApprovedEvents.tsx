import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  Card,
  CardHeader,
  StatCard,
  Dialog,
  Tabs,
  SignatoryProgress,
  Button,
  RefreshButton,
  SkeletonStatCard,
  SkeletonEventCard,
  SkeletonTable,
  SkeletonToolbox,
} from "../../components/ui";
import {
  CalendarCheck, CreditCard, CheckCircle, ExternalLink, FileText, Calendar, MapPin, Video,
  LayoutGrid, List, Search, Filter, ArrowUpDown, ChevronDown, ArrowUpNarrowWide, ArrowDownWideNarrow,
  Building2, X, RotateCcw
} from "lucide-react";
import {
  formatCurrency, formatDate, formatDateTime, formatEventSchedule, statusColors, Event,
  getEventTypeById, isWebUrl, toWebUrl, resolvePdfUrl
} from "../../services/dataService";
import EventHistoryTimeline from "../../components/events/EventHistoryTimeline";
import EventClearanceTab from "../../components/events/EventClearanceTab";
import EventFinanceTab from "../../components/events/EventFinanceTab";

const STATUS_FILTERS = ["All", "Approved", "Completed", "Closed"] as const;
type StatusFilterType = (typeof STATUS_FILTERS)[number];

export default function DeanApprovedEvents() {
  const { events, eventTypes, transactions, organizations, defaultView, auditTrail, eventSignatories, isLoading } = useApp();

  const getApprovalTimestamp = (eventId: string, createdAt: string) => {
    const deanSig = (eventSignatories || []).find(
      (s) => s.eventId === eventId && s.role === "dean" && s.status === "Approved"
    );
    if (deanSig?.signedAt) return new Date(deanSig.signedAt).getTime();
    if (deanSig?.createdAt) return new Date(deanSig.createdAt).getTime();

    const auditEntry = (auditTrail || []).find(
      (a) => a.eventId === eventId && (a.action === "Approved Event" || a.action === "Executive Approval" || a.statusTo === "Approved")
    );
    if (auditEntry?.timestamp) return new Date(auditEntry.timestamp).getTime();

    return new Date(createdAt).getTime();
  };

  const baseApproved = useMemo(() => {
    return events.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  }, [events]);

  const totalSpent = useMemo(() => {
    return transactions.filter((t) => baseApproved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);
  }, [transactions, baseApproved]);

  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("All");
  const [sortKey, setSortKey] = useState<"dateApproved" | "createdAt" | "name" | "proposedBudget" | "dateStart">("dateApproved");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<"grid" | "list">(defaultView || "grid");

  useEffect(() => {
    setView(defaultView || "grid");
  }, [defaultView]);

  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [viewTab, setViewTab] = useState("details");

  const filteredApproved = useMemo(() => {
    return baseApproved
      .filter((e) => {
        // Status filter
        if (statusFilter !== "All" && e.status !== statusFilter) return false;

        // Org filter
        if (orgFilter !== "all" && e.organizationId !== orgFilter) return false;

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const org = organizations.find((o) => o.id === e.organizationId);
          const type = eventTypes.find((t) => t.id === e.typeId) || getEventTypeById(e.typeId);
          const matchName = e.name.toLowerCase().includes(q);
          const matchDesc = e.description?.toLowerCase().includes(q) || false;
          const matchLoc = e.location?.toLowerCase().includes(q) || false;
          const matchOrg = org?.name.toLowerCase().includes(q) || org?.code.toLowerCase().includes(q) || false;
          const matchType = type?.name.toLowerCase().includes(q) || false;
          if (!matchName && !matchDesc && !matchLoc && !matchOrg && !matchType) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = 0;
        let valB: any = 0;

        if (sortKey === "dateApproved") {
          valA = getApprovalTimestamp(a.id, a.createdAt);
          valB = getApprovalTimestamp(b.id, b.createdAt);
        } else if (sortKey === "createdAt") {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
        } else if (sortKey === "name") {
          valA = a.name.toLowerCase();
          valB = b.name.toLowerCase();
        } else if (sortKey === "proposedBudget") {
          valA = a.proposedBudget;
          valB = b.proposedBudget;
        } else if (sortKey === "dateStart") {
          valA = new Date(a.dateStart).getTime();
          valB = new Date(b.dateStart).getTime();
        }

        if (valA < valB) return sortDir === "asc" ? -1 : 1;
        if (valA > valB) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
  }, [baseApproved, search, orgFilter, statusFilter, sortKey, sortDir, organizations, eventTypes, auditTrail, eventSignatories]);

  const isFiltered = search.trim() !== "" || orgFilter !== "all" || statusFilter !== "All";

  function handleResetFilters() {
    setSearch("");
    setOrgFilter("all");
    setStatusFilter("All");
    setSortKey("dateApproved");
    setSortDir("desc");
  }

  const viewTabs = [
    { id: "details", label: "Details" },
    { id: "compliance", label: "Compliance Docs" },
    { id: "clearance", label: "Event Clearance", dividerAfter: true },
    { id: "history", label: "History" },
    { id: "finance", label: "Finance" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">Approved Events</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">All approved events across CITE organizations (read-only).</p>
        </div>
        <RefreshButton />
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <SkeletonToolbox />
          {view === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonEventCard key={i} />
              ))}
            </div>
          ) : (
            <SkeletonTable rows={6} cols={7} />
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Approved Events" value={baseApproved.length} icon={<CalendarCheck size={18} />} />
            <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<CreditCard size={18} />} />
            <StatCard label="Closed Events" value={events.filter((e) => e.status === "Closed").length} icon={<CheckCircle size={18} />} />
          </div>

      {/* CollInsight Interactive Toolbox */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-2xs space-y-3">
        {/* Tier 1: Search, Org Filter, Sort & View Toggles */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search by event title, location, description, or organization..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-0.5 rounded cursor-pointer"
                title="Clear Search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Organization Filter Dropdown */}
            <div className="relative flex items-center">
              <Building2 size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="pl-8 pr-7 py-2 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs hover:border-[var(--primary)]/40 transition"
              >
                <option value="all">All Organizations</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.code})
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 text-[var(--muted-foreground)] pointer-events-none" />
            </div>

            {/* Sort Key Dropdown */}
            <div className="relative flex items-center">
              <ArrowUpDown size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as any)}
                className="pl-8 pr-7 py-2 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs hover:border-[var(--primary)]/40 transition"
              >
                <option value="dateApproved">Date Approved</option>
                <option value="createdAt">Date Created</option>
                <option value="dateStart">Event Schedule</option>
                <option value="name">Name (A-Z)</option>
                <option value="proposedBudget">Proposed Budget</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 text-[var(--muted-foreground)] pointer-events-none" />
            </div>

            {/* Asc / Desc Toggle Button */}
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="w-8.5 h-8.5 flex items-center justify-center border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 hover:border-[var(--primary)]/40 transition cursor-pointer shadow-2xs"
              title={sortDir === "asc" ? "Ascending — Click to sort Descending" : "Descending — Click to sort Ascending"}
            >
              {sortDir === "asc" ? (
                <ArrowUpNarrowWide size={15} className="text-[var(--primary)]" />
              ) : (
                <ArrowDownWideNarrow size={15} className="text-[var(--primary)]" />
              )}
            </button>

            {/* Grid / List View Toggle */}
            <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] p-1 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  view === "grid"
                    ? "bg-[var(--primary)] text-white shadow-xs font-bold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  view === "list"
                    ? "bg-[var(--primary)] text-white shadow-xs font-bold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
                title="Table / List View"
              >
                <List size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border)]/70" />

        {/* Tier 2: Status Pills Filter */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mr-1 flex items-center gap-1">
              <Filter size={12} /> Status:
            </span>
            {STATUS_FILTERS.map((s) => {
              const isActive = statusFilter === s;
              const count = s === "All"
                ? baseApproved.length
                : baseApproved.filter((e) => e.status === s).length;

              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                      : "bg-[var(--muted)]/50 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span>{s}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-[var(--border)]/60 text-[var(--muted-foreground)]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="text-xs font-semibold text-[var(--primary)] hover:underline cursor-pointer ml-auto flex items-center gap-1"
            >
              <RotateCcw size={12} /> Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Events Presentation */}
      {filteredApproved.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-[var(--muted-foreground)] space-y-3">
            <div className="w-12 h-12 rounded-full bg-[var(--muted)]/50 flex items-center justify-center mx-auto text-[var(--muted-foreground)]">
              <CalendarCheck size={24} />
            </div>
            <div>
              <p className="font-semibold text-sm text-[var(--foreground)]">
                {isFiltered ? "No events matching your filters" : "No approved events yet"}
              </p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                {isFiltered
                  ? "Try resetting your search criteria or choosing a different organization/status."
                  : "Events endorsed and cleared by the Dean will appear here."}
              </p>
            </div>
            {isFiltered && (
              <Button size="sm" variant="outline" onClick={handleResetFilters} className="mt-2 text-xs">
                Reset All Filters
              </Button>
            )}
          </div>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredApproved.map((e) => {
            const org = organizations.find((o) => o.id === e.organizationId);
            const orgColor = org?.logoColor || "#0d9488";
            const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
            return (
              <div
                key={e.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md hover:border-[var(--primary)]/40 transition-all flex flex-col justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${statusColors[e.status]}`}>
                      {e.status}
                    </span>
                    <span
                      className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                      style={{
                        backgroundColor: `${orgColor}18`,
                        color: orgColor,
                        borderColor: `${orgColor}40`,
                      }}
                    >
                      {org?.code || "CITE"}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-[var(--foreground)] leading-snug">
                      {e.name}
                    </h3>
                    <div className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)] mt-1.5 font-mono">
                      <p className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-[var(--primary)] flex-shrink-0" />
                        <span>{formatDate(e.dateStart)}</span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        {e.mode === "Online/Virtual" ? (
                          <Video size={13} className="text-[var(--muted-foreground)] flex-shrink-0" />
                        ) : (
                          <MapPin size={13} className="text-[var(--muted-foreground)] flex-shrink-0" />
                        )}
                        <span className="truncate">{e.location}</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)] font-mono text-xs">
                    <div>
                      <span className="text-[var(--muted-foreground)] block text-[10px]">Budget:</span>
                      <span className="font-bold text-[var(--foreground)]">{formatCurrency(e.proposedBudget)}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)] block text-[10px]">Spent:</span>
                      <span className="font-extrabold text-[var(--primary)]">{formatCurrency(spent)}</span>
                    </div>
                  </div>

                  <div className="pt-4 pb-1 border-t border-[var(--border)]/60">
                    <SignatoryProgress status={e.status} />
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-[var(--border)]">
                  <Button
                    size="sm"
                    onClick={() => { setViewEvent(e); setViewTab("details"); }}
                    className="w-full h-8 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg shadow-2xs"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {["Event", "Organization", "Date", "Budget", "Spent", "Status", "Action"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-mono font-semibold text-[var(--muted-foreground)] ${h === "Action" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredApproved.map((e) => {
                  const org = organizations.find((o) => o.id === e.organizationId);
                  const orgColor = org?.logoColor || "#0d9488";
                  const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
                  return (
                    <tr key={e.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-4 py-3.5 font-medium max-w-[240px]">
                        <button
                          type="button"
                          onClick={() => {
                            setViewEvent(e);
                            setViewTab("details");
                          }}
                          className="text-left font-semibold text-[var(--primary)] hover:underline cursor-pointer truncate max-w-full block"
                          title="Click to view event details"
                        >
                          {e.name}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--muted-foreground)]">
                        <span
                          className="font-bold px-2 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: `${orgColor}18`,
                            color: orgColor,
                            borderColor: `${orgColor}40`,
                          }}
                        >
                          {org?.code || "CITE"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs">{formatDate(e.dateStart)}</td>
                      <td className="px-4 py-3.5 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--primary)] font-semibold">{formatCurrency(spent)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${statusColors[e.status]}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          onClick={() => { setViewEvent(e); setViewTab("details"); }}
                          className="gap-1.5 font-semibold text-xs h-8"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
        </>
      )}

      {/* Event Details Dialog */}
      {viewEvent && (
        <Dialog open={!!viewEvent} onClose={() => setViewEvent(null)} title={viewEvent.name} size="xl">
          <div className="flex flex-col min-h-0 flex-1 h-full">
            <div className="sticky top-0 z-20 bg-white border-b border-[var(--border)] px-6 pt-4 shadow-2xs flex-shrink-0">
              <div className="flex items-center gap-3 pb-3">
                <span className={`text-xs font-mono px-3 py-1 rounded-full whitespace-nowrap text-center inline-flex items-center justify-center font-semibold shadow-2xs flex-shrink-0 ${statusColors[viewEvent.status]}`}>
                  {viewEvent.status}
                </span>
                <div className="flex-1 min-w-0">
                  <SignatoryProgress status={viewEvent.status} />
                </div>
              </div>
              <Tabs tabs={viewTabs} activeTab={viewTab} onChange={setViewTab} />
            </div>

            <div className="p-6 flex-1">
              {viewTab === "details" && (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Name</p>
                    <p className="font-semibold text-[var(--foreground)]">{viewEvent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Type</p>
                    <p className="font-medium">{eventTypes.find((t) => t.id === viewEvent.typeId)?.name || getEventTypeById(viewEvent.typeId)?.name || "General Event"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Description</p>
                    <p className="text-xs leading-relaxed text-[var(--foreground)]">{viewEvent.description || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Proposed Budget</p>
                    <p className="font-mono font-bold text-[var(--primary)]">{formatCurrency(viewEvent.proposedBudget)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Mode</p>
                    <p className="font-medium">{viewEvent.mode === "Online/Virtual" ? "Online / Virtual" : "Face-to-Face (FTF)"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Scheduled Date & Time</p>
                    <p className="font-medium">
                      {formatEventSchedule(viewEvent.dateStart, viewEvent.dateEnd)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">
                      {viewEvent.mode === "Online/Virtual" ? "Platform / Link" : "Venue / Location"}
                    </p>
                    {isWebUrl(viewEvent.location) ? (
                      <a
                        href={toWebUrl(viewEvent.location!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline underline-offset-2 font-medium break-all"
                      >
                        {viewEvent.location}
                        <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                      </a>
                    ) : (
                      <p className="font-medium">{viewEvent.location || (viewEvent.mode === "Online/Virtual" ? "Online Platform" : "Venue TBD")}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Attendee Requisites</p>
                    <p className="font-medium text-sm text-[var(--foreground)] leading-relaxed">{viewEvent.requisites || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Organization</p>
                    <p className="font-semibold text-[var(--foreground)]">{organizations.find((o) => o.id === viewEvent.organizationId)?.name}</p>
                  </div>
                </div>
              )}

              {viewTab === "compliance" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">APF (Activity Proposal Form)</p>
                    {viewEvent.apfUrl ? (
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[var(--primary)] flex-shrink-0" />
                        <a
                          href={resolvePdfUrl(viewEvent.apfUrl, "apf")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1.5 break-all"
                        >
                          <span>{viewEvent.apfUrl.replace(/^.*[\\/]/, "")}</span>
                          <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No APF uploaded.</p>
                    )}
                  </div>

                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">Appendices ({viewEvent.appendices?.length ?? 0})</p>
                    {viewEvent.appendices && viewEvent.appendices.length > 0 ? (
                      <ul className="text-sm space-y-1.5">
                        {viewEvent.appendices.map((a, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <FileText size={14} className="text-[var(--primary)] flex-shrink-0" />
                            <a
                              href={resolvePdfUrl(a, "appendix")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1 break-all"
                            >
                              <span>{a.replace(/^.*[\\/]/, "")}</span>
                              <ExternalLink size={12} className="flex-shrink-0 text-[var(--primary)]" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No appendices.</p>
                    )}
                  </div>
                </div>
              )}

              {viewTab === "clearance" && (
                <EventClearanceTab
                  event={viewEvent}
                  organizationName={organizations.find((o) => o.id === viewEvent.organizationId)?.name}
                  eventTypeName={getEventTypeById(viewEvent.typeId)?.name}
                />
              )}

              {viewTab === "history" && (
                <EventHistoryTimeline eventId={viewEvent.id} event={viewEvent} />
              )}

              {viewTab === "finance" && (
                <EventFinanceTab
                  event={viewEvent}
                  organizationName={organizations.find((o) => o.id === viewEvent.organizationId)?.name}
                  showOpenFinance={false}
                />
              )}
            </div>

            <div className="flex justify-between px-6 pb-6 pt-4 border-t border-[var(--border)] bg-white sticky bottom-0 z-10 mt-auto flex-wrap gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setViewEvent(null)}>Close</Button>
              <div className="flex gap-2 flex-wrap">
                {(viewTab === "details" || viewTab === "compliance") && (
                  <Button variant="outline" onClick={() => setViewTab(viewTab === "details" ? "compliance" : "clearance")}>
                    Next →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
