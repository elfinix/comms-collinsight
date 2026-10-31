import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  Button,
  Dialog,
  Tabs,
  Card,
  SignatoryProgress,
  Textarea,
  RefreshButton,
  SkeletonEventCard,
  SkeletonToolbox,
  SkeletonTable,
} from "../../components/ui";
import {
  CheckCircle,
  RotateCcw,
  Eye,
  Calendar,
  MapPin,
  Video,
  ExternalLink,
  FileText,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Link2,
  Building2,
  XCircle,
  Search,
  Filter,
  ChevronDown,
  ArrowUpDown,
  ArrowUpNarrowWide,
  ArrowDownWideNarrow,
  X,
  ClipboardList,
} from "lucide-react";
import {
  getEventTypeById,
  formatDate,
  formatDateTime,
  formatEventSchedule,
  formatCurrency,
  getStatusBadgeClass,
  Event,
  isWebUrl,
  toWebUrl,
  resolvePdfUrl,
  resolveEventSignatories,
  isExcelFile,
  isGoogleDocsUrl,
  formatComplianceDocLabel,
} from "../../services/dataService";
import EventClearanceTab from "../../components/events/EventClearanceTab";

export default function SDSPendingClearance() {
  const [searchParams] = useSearchParams();
  const { events, organizations, users, eventTypes, setEventStatus, defaultView, isLoading, auditTrail, eventSignatories } = useApp();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  function getDeanDispatchedAt(eventId: string): string | undefined {
    // 1. Event signatory signed by Dean
    const deanSig = eventSignatories.find(
      (s) => s.eventId === eventId && s.role === "dean" && (s.status === "Approved" || s.status === "Endorsed")
    );
    if (deanSig?.signedAt || deanSig?.createdAt) {
      return deanSig.signedAt || deanSig.createdAt;
    }

    // 2. Audit trail record for Dean forward transition to SDS
    const deanAudit = auditTrail.find((a) => {
      if (a.eventId !== eventId) return false;
      const act = (a.action || "").toLowerCase();
      const det = (a.details || "").toLowerCase();
      const to = (a.statusTo || "").toLowerCase();
      const from = (a.statusFrom || "").toLowerCase();
      return (
        act.includes("approved & forwarded to sds") ||
        det.includes("forwarded to sds") ||
        det.includes("dispatched to sds") ||
        det.includes("forwarded to student development & services") ||
        (a.actorRole === "dean" && (to === "reviewed" || to === "approved")) ||
        (from === "for review (dn)" && (to === "reviewed" || to === "approved"))
      );
    });
    if (deanAudit?.timestamp) {
      return deanAudit.timestamp;
    }

    return undefined;
  }

  const pending = useMemo(() => {
    return events.filter(
      (e) =>
        !e.isInstitutional &&
        e.category !== "Institutional" &&
        Boolean(e.organizationId) &&
        (e.status === "Reviewed" || e.status === "Approved" || e.status === "For Review (SDS)")
    );
  }, [events]);

  const [view, setView] = useState<"grid" | "list">(defaultView || "grid");
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [settingFilter, setSettingFilter] = useState<"all" | "On-campus" | "Off-campus">("all");
  const [sortKey, setSortKey] = useState<"dispatchedAt" | "createdAt" | "name" | "proposedBudget" | "dateStart">("dispatchedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setView(defaultView || "grid");
  }, [defaultView]);

  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [viewTab, setViewTab] = useState("details");
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isAuthorizing, setIsAuthorizing] = useState(false);

  // Open review modal and mark event as "For Review (SDS)" if first-time open
  const handleOpenReview = (e: Event) => {
    if (e.status === "Reviewed" || e.status === "Approved") {
      setEventStatus(e.id, "For Review (SDS)", undefined, currentUser?.id);
      setViewEvent({ ...e, status: "For Review (SDS)" });
    } else {
      setViewEvent(e);
    }
    setViewTab("details");
  };

  // Auto-open event from URL query parameter ?event=...
  useEffect(() => {
    const urlEventId = searchParams.get("event") || searchParams.get("id");
    if (urlEventId && events.length > 0) {
      const match = events.find((e) => e.id === urlEventId);
      if (match) {
        handleOpenReview(match);
      }
    }
  }, [searchParams, events]);

  const filteredEvents = useMemo(() => {
    return pending
      .filter((e) => {
        if (settingFilter !== "all" && e.setting !== settingFilter) return false;
        if (orgFilter !== "all" && e.organizationId !== orgFilter) return false;

        if (search.trim()) {
          const q = search.toLowerCase();
          const org = organizations.find((o) => o.id === e.organizationId);
          const type = eventTypes.find((t) => t.id === e.typeId) || getEventTypeById(e.typeId);
          const matchName = e.name.toLowerCase().includes(q);
          const matchOrg = (org?.name || "").toLowerCase().includes(q) || (org?.code || "").toLowerCase().includes(q);
          const matchLoc = (e.location || "").toLowerCase().includes(q);
          const matchType = type?.name.toLowerCase().includes(q) || false;
          const matchDesc = e.description?.toLowerCase().includes(q) || false;
          if (!matchName && !matchOrg && !matchLoc && !matchType && !matchDesc) return false;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = 0;
        let valB: any = 0;

        if (sortKey === "createdAt") {
          valA = new Date(a.createdAt).getTime();
          valB = new Date(b.createdAt).getTime();
        } else if (sortKey === "dispatchedAt") {
          const dispA = getDeanDispatchedAt(a.id);
          const dispB = getDeanDispatchedAt(b.id);
          valA = dispA ? new Date(dispA).getTime() : new Date(a.createdAt).getTime();
          valB = dispB ? new Date(dispB).getTime() : new Date(b.createdAt).getTime();
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
  }, [pending, search, orgFilter, settingFilter, sortKey, sortDir, organizations, eventTypes, auditTrail, eventSignatories]);

  const isFiltered = search.trim() !== "" || orgFilter !== "all" || settingFilter !== "all";

  function handleResetFilters() {
    setSearch("");
    setOrgFilter("all");
    setSettingFilter("all");
    setSortKey("dispatchedAt");
    setSortDir("desc");
  }

  // Action Handlers
  async function handleAuthorize() {
    if (!viewEvent) return;
    setIsAuthorizing(true);
    const trimmed = feedback.trim();

    setEventStatus(
      viewEvent.id,
      "Event Authorized",
      trimmed || undefined,
      currentUser?.id
    );

    setIsAuthorizing(false);
    toast.success(
      "Executive Approval Granted",
      `'${viewEvent.name}' granted executive approval by SDS. Finance ledger unlocked.`
    );
    setViewEvent(null);
    setFeedback("");
  }

  function handleRequestRevision() {
    if (!viewEvent || !feedback.trim()) return;
    const trimmed = feedback.trim();
    setEventStatus(viewEvent.id, "Pending Revision", trimmed, currentUser?.id);
    toast.warning("Revision Requested", `'${viewEvent.name}' returned to student organizers for required compliance revisions.`);
    setViewEvent(null);
    setFeedback("");
    setShowRevisionDialog(false);
  }

  function handleReject() {
    if (!viewEvent || !feedback.trim()) return;
    const trimmed = feedback.trim();
    setEventStatus(viewEvent.id, "Rejected", trimmed, currentUser?.id);
    toast.error("Clearance Declined", `'${viewEvent.name}' has been rejected by SDS.`);
    setViewEvent(null);
    setFeedback("");
    setShowRejectDialog(false);
  }

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
            Pending Clearance
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {pending.length} Dean-approved student event(s) awaiting safety inspection and SDS clearance.
          </p>
        </div>
        <RefreshButton />
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <SkeletonToolbox />
          {view === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SkeletonEventCard />
              <SkeletonEventCard />
              <SkeletonEventCard />
            </div>
          ) : (
            <SkeletonTable rows={6} cols={6} />
          )}
        </div>
      ) : (
        <>
          {/* Coherent Toolbar (Matching Dean Design System) */}
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
                    <option value="dispatchedAt">Date Dispatched</option>
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

            {/* Tier 2: Setting / Scope Pills Filter */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mr-1 flex items-center gap-1 font-mono">
                  <Filter size={12} /> Scope:
                </span>
                {(["all", "On-campus", "Off-campus"] as const).map((s) => {
                  const isActive = settingFilter === s;
                  const count =
                    s === "all"
                      ? pending.length
                      : pending.filter((e) => e.setting === s).length;

                  return (
                    <button
                      key={s}
                      onClick={() => setSettingFilter(s)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                          : "bg-[var(--muted)]/50 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                      }`}
                    >
                      <span>{s === "all" ? "All Settings" : s}</span>
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
                  <ClipboardList size={24} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--foreground)]">
                    {isFiltered ? "No events matching your filters" : "Pending clearance queue is empty"}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    {isFiltered
                      ? "Try resetting your search query or choosing a different organization or scope."
                      : "When College Deans approve student proposals, they will arrive here for safety and policy compliance inspection."}
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
                        <span
                          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                            e.status === "For Review (SDS)"
                              ? "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/70 dark:text-blue-200"
                              : "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300"
                          }`}
                        >
                          {e.status === "For Review (SDS)" ? "Under SDS Review" : "Dean Approved · Ready for SDS"}
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

                        {/* Dispatched Date & Time */}
                        {(() => {
                          const dispatchedAt = getDeanDispatchedAt(e.id);
                          if (!dispatchedAt) return null;
                          return (
                            <p className="text-[11px] font-mono text-[var(--muted-foreground)] pt-1.5 flex items-center gap-1">
                              <span>Dispatched:</span>
                              <strong className="text-[var(--foreground)] font-semibold">
                                {formatDateTime(dispatchedAt)}
                              </strong>
                            </p>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[var(--border)]/70 flex items-center justify-between gap-3">
                      <span className="font-mono text-xs font-bold text-[var(--primary)]">
                        {formatCurrency(e.proposedBudget)}
                      </span>
                      <Button
                        size="sm"
                        variant={e.status === "For Review (SDS)" ? "primary" : "outline"}
                        onClick={() => handleOpenReview(e)}
                        className={`font-semibold text-xs gap-1.5 shadow-2xs h-8 ${
                          e.status !== "For Review (SDS)"
                            ? "border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10"
                            : ""
                        }`}
                      >
                        <Eye size={13} /> Review Clearance
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted)]/50">
                      <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Event Name</th>
                      <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Organization</th>
                      <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Date & Venue</th>
                      <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Budget</th>
                      <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-mono font-semibold text-[var(--muted-foreground)]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredEvents.map((e) => {
                      const org = organizations.find((o) => o.id === e.organizationId);
                      const orgColor = org?.logoColor || "#ea580c";

                      return (
                        <tr key={e.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-bold text-[var(--foreground)]">{e.name}</div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-[10px] font-mono font-medium px-2 py-0.2 rounded-md bg-orange-50 text-orange-800 border border-orange-200">
                                {e.category || "Organizational"}
                              </span>
                              <span className={`text-[10px] font-mono font-medium px-2 py-0.2 rounded-md ${
                                e.setting === "Off-campus"
                                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}>
                                {e.setting || "On-campus"}
                              </span>
                              <span className="text-xs text-[var(--muted-foreground)] font-mono ml-1">{e.mode}</span>
                            </div>
                            {(() => {
                              const dispatchedAt = getDeanDispatchedAt(e.id);
                              if (!dispatchedAt) return null;
                              return (
                                <div className="text-[11px] font-mono text-[var(--muted-foreground)] mt-1">
                                  <span>Dispatched: </span>
                                  <strong className="text-[var(--foreground)] font-semibold">{formatDateTime(dispatchedAt)}</strong>
                                </div>
                              );
                            })()}
                          </td>
                          <td className="px-4 py-3.5 text-xs font-mono">
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
                          <td className="px-4 py-3.5 font-mono text-xs text-[var(--muted-foreground)]">
                            <div>{formatDate(e.dateStart)}</div>
                            <div className="text-[11px] truncate max-w-[180px]">{e.location || "LCUP Main Campus"}</div>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs font-bold text-[var(--primary)]">
                            {formatCurrency(e.proposedBudget)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${
                                e.status === "For Review (SDS)"
                                  ? "bg-blue-100 text-blue-800 border-blue-300"
                                  : "bg-amber-50 text-amber-800 border-amber-300"
                              }`}
                            >
                              {e.status === "For Review (SDS)" ? "Under SDS Review" : "Ready for SDS"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Button
                              size="sm"
                              variant={e.status === "For Review (SDS)" ? "primary" : "outline"}
                              onClick={() => handleOpenReview(e)}
                              className={`gap-1.5 font-semibold text-xs h-8 ${
                                e.status !== "For Review (SDS)"
                                  ? "border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/10"
                                  : ""
                              }`}
                            >
                              <Eye size={13} /> Review Clearance
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

      {/* Review Dialog (Dean UI Layout with Stepper & 3 Tabs) */}
      {viewEvent && (
        <Dialog
          open={Boolean(viewEvent)}
          onClose={() => {
            setViewEvent(null);
            setFeedback("");
          }}
          title={viewEvent.name}
          size="xl"
        >
          <div className="flex flex-col min-h-0 flex-1 h-full">
            {/* Sticky Stepper Bar */}
            <div className="sticky top-0 z-20 bg-white dark:bg-[var(--card)] px-6 pt-4 shadow-2xs flex-shrink-0">
              <div className="flex items-center gap-3 pb-3">
                <span className={`text-xs font-mono px-3 py-1 rounded-full whitespace-nowrap text-center inline-flex items-center justify-center font-semibold shadow-2xs flex-shrink-0 ${getStatusBadgeClass(viewEvent.status, viewEvent.setting)}`}>
                  {viewEvent.status}
                </span>
                <div className="flex-1 min-w-0">
                  <SignatoryProgress status={viewEvent.status} setting={viewEvent.setting} />
                </div>
              </div>
              <Tabs tabs={viewTabs} activeTab={viewTab} onChange={setViewTab} className="-mx-6 px-6" />
            </div>

            {/* Tab Contents */}
            <div className="p-6 flex-1">
              {viewTab === "details" && (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Name</p>
                    <p className="font-semibold text-[var(--foreground)]">{viewEvent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Type</p>
                    <p className="font-medium">
                      {eventTypes.find((t) => t.id === viewEvent.typeId)?.name || getEventTypeById(viewEvent.typeId)?.name || "General Event"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Category</p>
                    <p className="font-semibold text-orange-700">{viewEvent.category || "Organizational"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Setting</p>
                    <p className="font-semibold text-blue-700">{viewEvent.setting || "On-campus"}</p>
                  </div>
                  {(() => {
                    const dispatchedAt = getDeanDispatchedAt(viewEvent.id);
                    if (!dispatchedAt) return null;
                    return (
                      <div>
                        <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Dispatched to SDS</p>
                        <p className="font-mono font-semibold text-[var(--foreground)]">{formatDateTime(dispatchedAt)}</p>
                      </div>
                    );
                  })()}
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Description</p>
                    <p className="text-xs leading-relaxed text-[var(--foreground)] whitespace-pre-wrap">{viewEvent.description || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Budget</p>
                    <p className="font-mono font-semibold text-[var(--primary)]">{formatCurrency(viewEvent.proposedBudget)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Mode</p>
                    <p className="font-medium">{viewEvent.mode === "Online/Virtual" ? "Online / Virtual" : "Face-to-Face (FTF)"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Scheduled Date & Time</p>
                    <p className="font-medium">{formatEventSchedule(viewEvent.dateStart, viewEvent.dateEnd, viewEvent.isAllDay)}</p>
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
                      <p className="font-medium">{viewEvent.location || "LCUP Main Campus"}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Attendee Requisites</p>
                    <p className="font-medium text-sm text-[var(--foreground)] leading-relaxed">{viewEvent.requisites || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Organization</p>
                    <p className="font-semibold text-[var(--foreground)]">
                      {organizations.find((o) => o.id === viewEvent.organizationId)?.name || "Student Organization"}
                    </p>
                  </div>
                </div>
              )}

              {viewTab === "compliance" && (
                <div className="flex flex-col gap-4">
                  {/* APF */}
                  <div className="bg-[var(--muted)]/50 rounded-xl p-4 border border-[var(--border)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-mono text-[var(--muted-foreground)] font-semibold uppercase">
                        APF (Activity Proposal Form)
                      </p>
                      {isGoogleDocsUrl(viewEvent.apfUrl) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-medium">
                          <Link2 size={12} /> Google Doc
                        </span>
                      )}
                    </div>
                    {viewEvent.apfUrl ? (
                      <div className="flex items-center gap-2">
                        {isGoogleDocsUrl(viewEvent.apfUrl) ? (
                          <Link2 size={16} className="text-blue-600 flex-shrink-0" />
                        ) : isExcelFile(viewEvent.apfUrl) ? (
                          <FileSpreadsheet size={16} className="text-emerald-600 flex-shrink-0" />
                        ) : (
                          <FileText size={16} className="text-[var(--primary)] flex-shrink-0" />
                        )}
                        <a
                          href={resolvePdfUrl(viewEvent.apfUrl, "apf")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1.5 break-all font-mono"
                        >
                          <span>{formatComplianceDocLabel(viewEvent.apfUrl, "Activity Proposal Form (APF)")}</span>
                          <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)] italic font-mono">No APF uploaded.</p>
                    )}
                  </div>

                  {/* Parental Consent Form (PCF) for Off-campus */}
                  {viewEvent.setting === "Off-campus" && (
                    <div className="bg-[var(--muted)]/50 rounded-xl p-4 border border-[var(--border)]">
                      <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2 font-semibold uppercase">
                        PCF (Parental Consent Form) · For Off-campus Events
                      </p>
                      {viewEvent.pcfUrl ? (
                        <div className="flex items-center gap-2">
                          {isExcelFile(viewEvent.pcfUrl) ? (
                            <FileSpreadsheet size={16} className="text-emerald-600 flex-shrink-0" />
                          ) : (
                            <FileText size={16} className="text-[var(--primary)] flex-shrink-0" />
                          )}
                          <a
                            href={resolvePdfUrl(viewEvent.pcfUrl, "pcf")}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1.5 break-all font-mono"
                          >
                            <span>{viewEvent.pcfName || viewEvent.pcfUrl.replace(/^.*[\\/]/, "")}</span>
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
                      Appendices ({viewEvent.appendices?.length ?? 0})
                    </p>
                    {viewEvent.appendices && viewEvent.appendices.length > 0 ? (
                      <ul className="text-sm space-y-2">
                        {viewEvent.appendices.map((a, i) => (
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

              {viewTab === "clearance" && (
                <EventClearanceTab
                  event={viewEvent}
                  organizationName={organizations.find((o) => o.id === viewEvent.organizationId)?.name}
                  eventTypeName={eventTypes.find((t) => t.id === viewEvent.typeId)?.name || getEventTypeById(viewEvent.typeId)?.name}
                />
              )}
            </div>

            {/* Sticky Modal Footer (Dean Buttons UI) */}
            <div className="flex justify-between px-6 pb-6 pt-4 border-t border-[var(--border)] bg-white dark:bg-[var(--card)] sticky bottom-0 z-10 mt-auto flex-wrap gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setViewEvent(null)}>
                Close
              </Button>
              <div className="flex gap-2 flex-wrap">
                {(viewTab === "details" || viewTab === "compliance") && (
                  <Button variant="outline" onClick={() => setViewTab(viewTab === "details" ? "compliance" : "clearance")}>
                    Next →
                  </Button>
                )}
                {viewTab === "clearance" && (viewEvent.status === "Reviewed" || viewEvent.status === "Approved" || viewEvent.status === "For Review (SDS)") && (
                  <>
                    <Button
                      variant="outline"
                      className="text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      onClick={() => setShowRejectDialog(true)}
                      disabled={isAuthorizing}
                    >
                      <XCircle size={14} /> Reject
                    </Button>
                    <Button variant="danger" onClick={() => setShowRevisionDialog(true)} disabled={isAuthorizing}>
                      <RotateCcw size={14} /> Request Change
                    </Button>
                    <Button variant="primary" onClick={handleAuthorize} disabled={isAuthorizing}>
                      <CheckCircle size={14} /> {isAuthorizing ? "Approving..." : "Approve"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Request Change Dialog */}
      <Dialog
        open={showRevisionDialog}
        onClose={() => setShowRevisionDialog(false)}
        title="Request Changes"
        size="sm"
        zIndex="z-[60]"
      >
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Specify compliance requirements, missing documents, or necessary modifications for the student organizers.
          </p>
          <Textarea
            label="Required Modifications *"
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="State necessary changes clearly..."
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRequestRevision} disabled={!feedback.trim()}>
              <RotateCcw size={14} /> Send Back
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reject Proposal Dialog */}
      <Dialog
        open={showRejectDialog}
        onClose={() => setShowRejectDialog(false)}
        title="Reject Proposal"
        size="sm"
        zIndex="z-[60]"
      >
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            State the formal justification for declining clearance for this event.
          </p>
          <Textarea
            label="Reason for Rejection *"
            rows={4}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Explain why this proposal is declined..."
          />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} disabled={!feedback.trim()}>
              <XCircle size={14} /> Reject Proposal
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
