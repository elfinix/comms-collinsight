import { useState, useEffect, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import {
  StatCard,
  Dialog,
  Tabs,
  Button,
  SignatoryProgress,
  RefreshButton,
  SkeletonStatCard,
  SkeletonToolbox,
  SkeletonEventCard,
  SkeletonTable,
  Card,
} from "../../components/ui";
import {
  CalendarCheck,
  CheckCircle,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Calendar,
  MapPin,
  Video,
  LayoutGrid,
  List,
  Search,
  Filter,
  Building2,
  ChevronDown,
  ArrowUpDown,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  RotateCcw,
  X,
  ShieldCheck,
  Link2,
  Eye,
} from "lucide-react";
import {
  formatDate,
  formatEventSchedule,
  formatCurrency,
  getStatusBadgeClass,
  Event,
  getEventTypeById,
  isWebUrl,
  toWebUrl,
  resolvePdfUrl,
  isExcelFile,
  isGoogleDocsUrl,
  formatComplianceDocLabel,
} from "../../services/dataService";
import EventClearanceTab from "../../components/events/EventClearanceTab";

const STATUS_FILTERS = ["All", "SDS Authorized", "Completed", "Closed"] as const;
type StatusFilterType = (typeof STATUS_FILTERS)[number];

export default function SDSApprovedEvents() {
  const { events, eventTypes, organizations, defaultView, auditTrail, eventSignatories, isLoading } = useApp();

  const baseAuthorized = useMemo(() => {
    return events.filter(
      (e) =>
        !e.isInstitutional &&
        e.category !== "Institutional" &&
        Boolean(e.organizationId) &&
        ["SDS Authorized", "CMO Authorized", "Completed", "Closed"].includes(e.status)
    );
  }, [events]);

  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilterType>("All");
  const [sortKey, setSortKey] = useState<"dateApproved" | "createdAt" | "name" | "proposedBudget" | "dateStart">("dateApproved");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [view, setView] = useState<"grid" | "list">(defaultView || "grid");

  useEffect(() => {
    setView(defaultView || "grid");
  }, [defaultView]);

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [detailTab, setDetailTab] = useState("details");

  const getClearanceTimestamp = (eventId: string, createdAt: string) => {
    const sdsSig = (eventSignatories || []).find(
      (s) => s.eventId === eventId && s.role === "sds" && s.status === "Approved"
    );
    if (sdsSig?.signedAt) return new Date(sdsSig.signedAt).getTime();
    if (sdsSig?.createdAt) return new Date(sdsSig.createdAt).getTime();

    const auditEntry = (auditTrail || []).find(
      (a) => a.eventId === eventId && (a.action === "SDS Authorized" || a.statusTo === "SDS Authorized")
    );
    if (auditEntry?.timestamp) return new Date(auditEntry.timestamp).getTime();
    return new Date(createdAt || 0).getTime();
  };

  const filteredEvents = useMemo(() => {
    return baseAuthorized
      .filter((e) => {
        if (statusFilter !== "All") {
          if (statusFilter === "SDS Authorized") {
            if (e.status !== "SDS Authorized" && e.status !== "CMO Authorized") return false;
          } else if (e.status !== statusFilter) {
            return false;
          }
        }
        if (orgFilter !== "all" && e.organizationId !== orgFilter) return false;

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
          valA = getClearanceTimestamp(a.id, a.createdAt);
          valB = getClearanceTimestamp(b.id, b.createdAt);
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
  }, [baseAuthorized, search, orgFilter, statusFilter, sortKey, sortDir, organizations, eventTypes, auditTrail, eventSignatories]);

  const isFiltered = search.trim() !== "" || orgFilter !== "all" || statusFilter !== "All";

  function handleResetFilters() {
    setSearch("");
    setOrgFilter("all");
    setStatusFilter("All");
    setSortKey("dateApproved");
    setSortDir("desc");
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const activeTodayCount = baseAuthorized.filter((e) => {
    const s = e.dateStart ? e.dateStart.split("T")[0] : "";
    const ed = e.dateEnd ? e.dateEnd.split("T")[0] : s;
    return s <= todayStr && todayStr <= ed;
  }).length;

  const offCampusCount = baseAuthorized.filter((e) => e.setting === "Off-campus").length;

  const viewTabs = [
    { id: "details", label: "Event Details" },
    { id: "compliance", label: "Event Compliance" },
    { id: "clearance", label: "Event Clearance" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            Authorized Events
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Registry of all student assemblies, seminars, and initiatives cleared by Student Development & Services.
          </p>
        </div>
        <RefreshButton />
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonStatCard />
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
          {/* Summary Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Authorized"
              value={baseAuthorized.length}
              sub="Official cleared initiatives"
              icon={<ShieldCheck size={18} />}
              color="bg-emerald-600 text-white"
            />
            <StatCard
              label="Active Today"
              value={activeTodayCount}
              sub="Assemblies live on campus"
              icon={<Calendar size={18} />}
              color="bg-amber-500 text-white"
            />
            <StatCard
              label="Off-Campus"
              value={offCampusCount}
              sub="CMO coordinated initiatives"
              icon={<MapPin size={18} />}
              color="bg-purple-600 text-white"
            />
            <StatCard
              label="Concluded & Closed"
              value={baseAuthorized.filter((e) => ["Completed", "Closed"].includes(e.status)).length}
              sub="Completed campus activities"
              icon={<CalendarCheck size={18} />}
              color="bg-slate-700 text-white"
            />
          </div>

          {/* Interactive Toolbar (Dean Style) */}
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
                    <option value="dateApproved">Date Cleared</option>
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
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mr-1 flex items-center gap-1 font-mono">
                  <Filter size={12} /> Status:
                </span>
                {STATUS_FILTERS.map((s) => {
                  const isActive = statusFilter === s;
                  const count =
                    s === "All"
                      ? baseAuthorized.length
                      : s === "SDS Authorized"
                      ? baseAuthorized.filter((e) => e.status === "SDS Authorized" || e.status === "CMO Authorized").length
                      : baseAuthorized.filter((e) => e.status === s).length;

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
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isActive
                            ? "bg-white/20 text-white"
                            : "bg-[var(--border)]/60 text-[var(--muted-foreground)]"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {isFiltered && (
                <button
                  onClick={handleResetFilters}
                  className="text-xs text-[var(--primary)] hover:underline font-mono cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw size={11} /> Reset filters
                </button>
              )}
            </div>
          </div>

          {/* Events Grid / List */}
          {filteredEvents.length === 0 ? (
            <Card className="p-12 text-center shadow-2xs">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--foreground)]">
                    {isFiltered ? "No events matching your filters" : "No authorized events yet"}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {isFiltered
                      ? "Try resetting your search criteria or choosing a different organization or status."
                      : "Events cleared by Student Development & Services will appear here."}
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
              {filteredEvents.map((e) => {
                const org = organizations.find((o) => o.id === e.organizationId);
                const orgColor = org?.logoColor || "#ea580c";

                return (
                  <div
                    key={e.id}
                    className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md hover:border-[var(--primary)]/40 transition-all flex flex-col justify-between gap-4 shadow-2xs"
                  >
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${getStatusBadgeClass(e.status, e.setting)}`}>
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
                            <span className="truncate">{e.location || "LCUP Main Campus"}</span>
                          </p>
                        </div>

                        {/* Event Classifications */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-2">
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200">
                            {e.category || "Organizational"}
                          </span>
                          <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full ${
                            e.setting === "Off-campus"
                              ? "bg-blue-50 text-blue-800 border border-blue-200"
                              : "bg-amber-50 text-amber-800 border border-amber-200"
                          }`}>
                            {e.setting || "On-campus"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border)]/70 flex items-center justify-between gap-3">
                      <span className="font-mono text-xs font-bold text-[var(--primary)]">
                        {formatCurrency(e.proposedBudget)}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedEvent(e);
                          setDetailTab("details");
                        }}
                        className="font-mono text-xs gap-1.5 shadow-2xs h-8"
                      >
                        <Eye size={13} /> View Clearance
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xs divide-y divide-[var(--border)]">
              {filteredEvents.map((evt) => {
                const org = organizations.find((o) => o.id === evt.organizationId);
                const isOffCampus = evt.setting === "Off-campus";

                return (
                  <div
                    key={evt.id}
                    onClick={() => {
                      setSelectedEvent(evt);
                      setDetailTab("details");
                    }}
                    className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[var(--muted)]/30 transition cursor-pointer"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-[var(--foreground)] truncate">
                          {evt.name}
                        </h3>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${getStatusBadgeClass(evt.status, evt.setting)}`}>
                          {evt.status}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                          isOffCampus ? "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300" : "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300"
                        }`}>
                          {evt.setting || "On-campus"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--muted-foreground)] font-mono flex-wrap">
                        <span>{org?.name || "Student Organization"}</span>
                        <span>•</span>
                        <span>{formatDate(evt.dateStart)}</span>
                        <span>•</span>
                        <span>{evt.location || "LCUP Main Campus"}</span>
                        <span>•</span>
                        <span className="font-bold text-[var(--primary)]">{formatCurrency(evt.proposedBudget)}</span>
                      </div>
                    </div>

                    <Button size="sm" variant="outline" className="font-mono text-xs gap-1.5 h-8">
                      <Eye size={13} /> View Clearance
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Event Details Dialog (Dean UI Layout with Stepper & 3 Tabs) */}
      {selectedEvent && (
        <Dialog
          open={Boolean(selectedEvent)}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent.name}
          size="xl"
        >
          <div className="flex flex-col min-h-0 flex-1 h-full">
            {/* Sticky Stepper Bar */}
            <div className="sticky top-0 z-20 bg-white dark:bg-[var(--card)] px-6 pt-4 shadow-2xs flex-shrink-0">
              <div className="flex items-center gap-3 pb-3">
                <span className={`text-xs font-mono px-3 py-1 rounded-full whitespace-nowrap text-center inline-flex items-center justify-center font-semibold shadow-2xs flex-shrink-0 ${getStatusBadgeClass(selectedEvent.status, selectedEvent.setting)}`}>
                  {selectedEvent.status}
                </span>
                <div className="flex-1 min-w-0">
                  <SignatoryProgress status={selectedEvent.status} setting={selectedEvent.setting} />
                </div>
              </div>
              <Tabs tabs={viewTabs} activeTab={detailTab} onChange={setDetailTab} className="-mx-6 px-6" />
            </div>

            {/* Tab Contents */}
            <div className="p-6 flex-1">
              {detailTab === "details" && (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Name</p>
                    <p className="font-semibold text-[var(--foreground)]">{selectedEvent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Type</p>
                    <p className="font-medium">
                      {eventTypes.find((t) => t.id === selectedEvent.typeId)?.name || getEventTypeById(selectedEvent.typeId)?.name || "General Event"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Category</p>
                    <p className="font-semibold text-orange-700">{selectedEvent.category || "Organizational"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Setting</p>
                    <p className="font-semibold text-blue-700">{selectedEvent.setting || "On-campus"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Description</p>
                    <p className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">{selectedEvent.description || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Budget</p>
                    <p className="font-mono font-semibold text-[var(--primary)]">{formatCurrency(selectedEvent.proposedBudget)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Mode</p>
                    <p className="font-medium">{selectedEvent.mode === "Online/Virtual" ? "Online / Virtual" : "Face-to-Face (FTF)"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Scheduled Date & Time</p>
                    <p className="font-medium">{formatEventSchedule(selectedEvent.dateStart, selectedEvent.dateEnd, selectedEvent.isAllDay)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">
                      {selectedEvent.mode === "Online/Virtual" ? "Platform / Link" : "Venue / Location"}
                    </p>
                    {isWebUrl(selectedEvent.location) ? (
                      <a
                        href={toWebUrl(selectedEvent.location!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline underline-offset-2 font-medium break-all"
                      >
                        {selectedEvent.location}
                        <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                      </a>
                    ) : (
                      <p className="font-medium">{selectedEvent.location || "LCUP Main Campus"}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Attendee Requisites</p>
                    <p className="font-medium text-sm text-[var(--foreground)] leading-relaxed">{selectedEvent.requisites || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Organization</p>
                    <p className="font-semibold text-[var(--foreground)]">
                      {organizations.find((o) => o.id === selectedEvent.organizationId)?.name || "Student Organization"}
                    </p>
                  </div>
                </div>
              )}

              {detailTab === "compliance" && (
                <div className="flex flex-col gap-4">
                  {/* APF */}
                  <div className="bg-[var(--muted)]/50 rounded-xl p-4 border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-mono text-[var(--muted-foreground)] font-semibold uppercase">
                        APF (Activity Proposal Form)
                      </p>
                      {isGoogleDocsUrl(selectedEvent.apfUrl) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                          <Link2 size={12} /> Google Doc
                        </span>
                      )}
                    </div>
                    {selectedEvent.apfUrl ? (
                      <div className="flex items-center gap-2">
                        {isGoogleDocsUrl(selectedEvent.apfUrl) ? (
                          <Link2 size={16} className="text-blue-600 flex-shrink-0" />
                        ) : isExcelFile(selectedEvent.apfUrl) ? (
                          <FileSpreadsheet size={16} className="text-emerald-600 flex-shrink-0" />
                        ) : (
                          <FileText size={16} className="text-[var(--primary)] flex-shrink-0" />
                        )}
                        <a
                          href={resolvePdfUrl(selectedEvent.apfUrl, "apf")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1.5 break-all font-mono"
                        >
                          <span>{formatComplianceDocLabel(selectedEvent.apfUrl, "Activity Proposal Form (APF)")}</span>
                          <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)] italic font-mono">No APF uploaded.</p>
                    )}
                  </div>

                  {/* Parental Consent Form (PCF) for Off-campus */}
                  {selectedEvent.setting === "Off-campus" && (
                    <div className="bg-[var(--muted)]/50 rounded-xl p-4 border border-[var(--border)]">
                      <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2 font-semibold uppercase">
                        PCF (Parental Consent Form) · For Off-campus Events
                      </p>
                      {selectedEvent.pcfUrl ? (
                        <div className="flex items-center gap-2">
                          {isExcelFile(selectedEvent.pcfUrl) ? (
                            <FileSpreadsheet size={16} className="text-emerald-600 flex-shrink-0" />
                          ) : (
                            <FileText size={16} className="text-[var(--primary)] flex-shrink-0" />
                          )}
                          <a
                            href={resolvePdfUrl(selectedEvent.pcfUrl, "pcf")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1.5 break-all font-mono"
                          >
                            <span>{selectedEvent.pcfName || selectedEvent.pcfUrl.replace(/^.*[\\/]/, "")}</span>
                            <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--muted-foreground)] italic font-mono">None Attached (Optional)</p>
                      )}
                    </div>
                  )}

                  {/* Appendices */}
                  <div className="bg-[var(--muted)]/50 rounded-xl p-4 border border-[var(--border)]">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2 font-semibold uppercase">
                      Appendices ({selectedEvent.appendices?.length ?? 0})
                    </p>
                    {selectedEvent.appendices && selectedEvent.appendices.length > 0 ? (
                      <ul className="text-sm space-y-2">
                        {selectedEvent.appendices.map((a, i) => (
                          <li key={i} className="flex items-center gap-2">
                            {isExcelFile(a) ? (
                              <FileSpreadsheet size={14} className="text-emerald-600 flex-shrink-0" />
                            ) : (
                              <FileText size={14} className="text-[var(--primary)] flex-shrink-0" />
                            )}
                            <a
                              href={resolvePdfUrl(a, "appendix")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1 break-all font-mono"
                            >
                              <span>{a.replace(/^.*[\\/]/, "") || `Appendix ${i + 1}`}</span>
                              <ExternalLink size={12} className="flex-shrink-0 text-[var(--primary)]" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)] italic font-mono">No appendices attached.</p>
                    )}
                  </div>
                </div>
              )}

              {detailTab === "clearance" && (
                <EventClearanceTab
                  event={selectedEvent}
                  organizationName={organizations.find((o) => o.id === selectedEvent.organizationId)?.name}
                  eventTypeName={eventTypes.find((t) => t.id === selectedEvent.typeId)?.name || getEventTypeById(selectedEvent.typeId)?.name}
                />
              )}
            </div>

            {/* Sticky Modal Footer */}
            <div className="flex justify-between px-6 pb-6 pt-4 border-t border-[var(--border)] bg-white dark:bg-[var(--card)] sticky bottom-0 z-10 mt-auto flex-wrap gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
              <div className="flex gap-2 flex-wrap">
                {(detailTab === "details" || detailTab === "compliance") && (
                  <Button variant="outline" onClick={() => setDetailTab(detailTab === "details" ? "compliance" : "clearance")}>
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
