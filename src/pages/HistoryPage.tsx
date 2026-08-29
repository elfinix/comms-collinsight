import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { useApp } from "../context/AppContext";
import { Card, Dialog, Tabs, SignatoryProgress, Button } from "../components/ui";
import {
  History, Search, Filter, Clock, CheckCircle, RotateCcw,
  FileText, ArrowRight, Eye, Calendar, ExternalLink, Video, MapPin,
  Shield, User, ArrowUpDown, ChevronDown, ChevronRight, Table, ListTree,
  ArrowUpNarrowWide, ArrowDownWideNarrow, Trash2, Edit2, DollarSign
} from "lucide-react";
import {
  formatDate, formatDateTime, formatCurrency, statusColors, getEventTypeById,
  Event, AuditEntry, isWebUrl, toWebUrl, resolvePdfUrl, getActionBadgeClass
} from "../services/mockData";
import EventHistoryTimeline from "../components/events/EventHistoryTimeline";
import EventClearanceTab from "../components/events/EventClearanceTab";
import EventFinanceTab from "../components/events/EventFinanceTab";

type DateRangeType = "today" | "7days" | "month" | "all";
type ActionFilterType = "ALL" | "CREATE" | "SUBMIT" | "APPROVE" | "REVISION" | "MODIFIED" | "FINANCE" | "CLOSURE";

const ACTION_FILTERS: { id: ActionFilterType; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "CREATE", label: "Created Proposals" },
  { id: "SUBMIT", label: "For Review" },
  { id: "APPROVE", label: "Approvals & Endorsements" },
  { id: "REVISION", label: "Revision Requests" },
  { id: "MODIFIED", label: "Edits & Deletions" },
  { id: "FINANCE", label: "Financial Records" },
  { id: "CLOSURE", label: "Event Closure" },
];

export default function HistoryPage() {
  const { currentUser } = useAuth();
  const { auditTrail, events, users, transactions } = useApp();

  const [search, setSearch] = useState("");
  const [dateRange, setDateRange] = useState<DateRangeType>("7days"); // Default: Last 7 days
  const [actionFilter, setActionFilter] = useState<ActionFilterType>("ALL");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // Default: most recent first
  const [viewMode, setViewMode] = useState<"timeline" | "table">("timeline"); // Default: timeline
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogTab, setDialogTab] = useState("details");

  // Lazy loading state
  const [displayLimit, setDisplayLimit] = useState(10);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const role = currentUser?.role || "student";
  const userOrgId = currentUser?.organizationId;

  // Filter audit records based on Role (RBAC)
  const scopedEntries = useMemo(() => {
    return auditTrail.filter((entry) => {
      // For Dean: History of Dean's own executive actions
      if (role === "dean") {
        return entry.userId === currentUser?.id || entry.actorRole === "dean";
      }

      // For Student and Adviser: Organization's events history
      if (role === "student" || role === "adviser") {
        if (entry.organizationId && userOrgId && entry.organizationId === userOrgId) {
          return true;
        }
        if (entry.eventId) {
          const evt = events.find((e) => e.id === entry.eventId);
          if (evt && evt.organizationId === userOrgId) return true;
        }
        return false;
      }

      // Admin or default: all entries
      return true;
    });
  }, [auditTrail, role, currentUser, userOrgId, events]);

  function getAssociatedEvent(entry: AuditEntry): Event | undefined {
    if (entry.eventId) {
      return events.find((e) => e.id === entry.eventId);
    }
    return events.find((e) => entry.details.toLowerCase().includes(e.name.toLowerCase()));
  }

  // Date range matcher
  function matchesDateRange(timestamp: string, range: DateRangeType) {
    if (range === "all") return true;
    const entryDate = new Date(timestamp);
    if (isNaN(entryDate.getTime())) return true;

    const now = new Date();
    const diffMs = now.getTime() - entryDate.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    if (range === "today") {
      return diffDays >= -1 && diffDays <= 1;
    }
    if (range === "7days") {
      return diffDays >= -1 && diffDays <= 7.5;
    }
    if (range === "month") {
      return diffDays >= -1 && diffDays <= 31;
    }
    return true;
  }

  // Filtered and Sorted Entries
  const filteredAndSortedEntries = useMemo(() => {
    const filtered = scopedEntries.filter((entry) => {
      const evt = getAssociatedEvent(entry);
      const user = users.find((u) => u.id === entry.userId);
      const userName = user ? `${user.firstName} ${user.lastName}` : entry.userId;

      // Search matching
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        entry.action.toLowerCase().includes(q) ||
        entry.details.toLowerCase().includes(q) ||
        userName.toLowerCase().includes(q) ||
        (entry.remarks && entry.remarks.toLowerCase().includes(q)) ||
        (evt && evt.name.toLowerCase().includes(q));

      // Action / Status filtering
      const act = entry.action.toLowerCase();
      let matchesAction = true;
      if (actionFilter === "APPROVE") {
        matchesAction = act.includes("approve") || act.includes("endors") || act.includes("executive");
      } else if (actionFilter === "REVISION") {
        matchesAction = act.includes("revision") || act.includes("change");
      } else if (actionFilter === "SUBMIT") {
        matchesAction = act.includes("submit") || act.includes("for review");
      } else if (actionFilter === "CREATE") {
        matchesAction = act.includes("creat");
      } else if (actionFilter === "MODIFIED") {
        matchesAction = act.includes("modified") || act.includes("edit") || act.includes("delete") || act.includes("removed");
      } else if (actionFilter === "FINANCE") {
        matchesAction = act.includes("disburs") || act.includes("expense") || act.includes("transaction");
      } else if (actionFilter === "CLOSURE") {
        matchesAction = act.includes("completed") || act.includes("closed") || act.includes("closure") || act.includes("liquidation");
      }

      // Date Range filtering
      const matchesDate = matchesDateRange(entry.timestamp, dateRange);

      return matchesSearch && matchesAction && matchesDate;
    });

    // Chronological Sort
    return [...filtered].sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return sortDir === "desc" ? timeB - timeA : timeA - timeB;
    });
  }, [scopedEntries, search, actionFilter, dateRange, sortDir, events, users]);

  // Paginated/Lazy Loaded entries
  const visibleEntries = useMemo(() => {
    return filteredAndSortedEntries.slice(0, displayLimit);
  }, [filteredAndSortedEntries, displayLimit]);

  function handleLoadMore() {
    setIsLoadingMore(true);
    setTimeout(() => {
      setDisplayLimit((prev) => prev + 10);
      setIsLoadingMore(false);
    }, 300);
  }

  function handleOpenEventModal(evt: Event, defaultTab: string = "details") {
    setSelectedEvent(evt);
    setDialogTab(defaultTab);
  }

  const dialogTabs = [
    { id: "details", label: "Event Details" },
    { id: "compliance", label: "Event Compliance" },
    { id: "clearance", label: "Event Clearance" },
    { id: "history", label: "History" },
    ...(role === "student" ? [{ id: "finance", label: "Finance" }] : []),
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Consistent Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">History</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Track and review all recorded actions, approvals, and event journeys.
          </p>
        </div>
      </div>

      {/* 2-Tier UX-Friendly Toolbar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-xs space-y-3">
        {/* Tier 1: Search, Date Range Filter & View Toggle Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setDisplayLimit(10);
              }}
              placeholder="Search history by event, action, notes, or actor..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
            {search && (
              <button
                onClick={() => {
                  setSearch("");
                  setDisplayLimit(10);
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Date Range Segmented Filter Buttons */}
            <div className="flex border border-[var(--border)] rounded-xl overflow-hidden p-0.5 bg-[var(--muted)]/30">
              {[
                { id: "today", label: "Today" },
                { id: "7days", label: "Last 7 days" },
                { id: "month", label: "This Month" },
                { id: "all", label: "All" },
              ].map((r) => {
                const active = dateRange === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setDateRange(r.id as DateRangeType);
                      setDisplayLimit(10);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                      active
                        ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                        : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>

            {/* Asc / Desc Icon Toggle Button */}
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="w-8.5 h-8.5 flex items-center justify-center border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 hover:border-[var(--primary)]/40 transition cursor-pointer shadow-2xs"
              title={sortDir === "asc" ? "Ascending (Oldest first) — Click for Most Recent first" : "Descending (Most Recent first) — Click for Ascending"}
            >
              {sortDir === "asc" ? (
                <ArrowUpNarrowWide size={15} className="text-[var(--primary)]" />
              ) : (
                <ArrowDownWideNarrow size={15} className="text-[var(--primary)]" />
              )}
            </button>

            {/* View Mode Toggle */}
            <div className="flex border border-[var(--border)] rounded-xl overflow-hidden p-0.5 bg-[var(--muted)]/30">
              <button
                type="button"
                onClick={() => setViewMode("timeline")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  viewMode === "timeline"
                    ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <ListTree size={13} />
                <span>Timeline</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  viewMode === "table"
                    ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Table size={13} />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border)]/70" />

        {/* Tier 2: Action / Status Filter Pills with horizontal scroll support */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 max-w-full">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mr-1 flex items-center gap-1 flex-shrink-0">
              <Filter size={11} /> Filter:
            </span>
            {ACTION_FILTERS.map((f) => {
              const active = actionFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => {
                    setActionFilter(f.id);
                    setDisplayLimit(10);
                  }}
                  className={`text-xs font-medium px-3 py-1 rounded-full transition cursor-pointer flex-shrink-0 ${
                    active
                      ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/80"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-mono text-[var(--muted-foreground)] ml-auto flex-shrink-0">
            Showing <strong className="text-[var(--foreground)]">{visibleEntries.length}</strong> of {filteredAndSortedEntries.length} activities
          </span>
        </div>
      </div>

      {/* Content View: Timeline (Default) or Table */}
      {viewMode === "timeline" ? (
        /* Timeline View */
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xs space-y-6">
          {visibleEntries.length === 0 ? (
            <div className="py-12 text-center text-[var(--muted-foreground)]">
              <Clock size={32} className="mx-auto mb-2 opacity-50" />
              <p className="font-semibold text-sm text-[var(--foreground)]">No History Records Found</p>
              <p className="text-xs mt-0.5">Try adjusting your search query, date range, or event filter.</p>
            </div>
          ) : (
            <div className="relative pl-7 space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[var(--border)]">
              {visibleEntries.map((entry) => {
                const evt = getAssociatedEvent(entry);
                const user = users.find((u) => u.id === entry.userId);
                const userName = user ? `${user.firstName} ${user.lastName}` : entry.userId;
                const userRole = user?.role || entry.actorRole || "student";

                const isApprove = entry.action.toLowerCase().includes("approve") || entry.action.toLowerCase().includes("endors");
                const isRevision = entry.action.toLowerCase().includes("revision") || entry.action.toLowerCase().includes("change");
                const isSubmit = entry.action.toLowerCase().includes("submit") || entry.action.toLowerCase().includes("for review");
                const isModified = entry.action.toLowerCase().includes("modified") || entry.action.toLowerCase().includes("edit");
                const isDelete = entry.action.toLowerCase().includes("delete") || entry.action.toLowerCase().includes("removed");
                const isClosure = entry.action.toLowerCase().includes("completed") || entry.action.toLowerCase().includes("closed") || entry.action.toLowerCase().includes("closure");
                const isFinance = entry.action.toLowerCase().includes("disburs") || entry.action.toLowerCase().includes("expense") || entry.action.toLowerCase().includes("transaction");

                return (
                  <div key={entry.id} className="relative group">
                    {/* Timeline Icon Node */}
                    <div className="absolute -left-7 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-[var(--border)] shadow-2xs flex items-center justify-center group-hover:border-[var(--primary)] transition-colors">
                      {isApprove ? (
                        <CheckCircle size={13} className="text-emerald-600" />
                      ) : isRevision ? (
                        <RotateCcw size={13} className="text-rose-600" />
                      ) : isModified ? (
                        <Edit2 size={12} className="text-amber-600" />
                      ) : isDelete ? (
                        <Trash2 size={12} className="text-red-600" />
                      ) : isClosure ? (
                        <CheckCircle size={13} className="text-slate-600" />
                      ) : isFinance ? (
                        <DollarSign size={13} className="text-emerald-600" />
                      ) : isSubmit ? (
                        <FileText size={12} className="text-blue-600" />
                      ) : (
                        <Clock size={12} className="text-[var(--primary)]" />
                      )}
                    </div>

                    {/* Card Content */}
                    <div className="bg-white border border-[var(--border)] rounded-2xl p-5 shadow-2xs hover:shadow-xs transition-shadow space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {evt ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEventModal(evt, "history")}
                              className="font-bold text-base text-[var(--primary)] hover:underline cursor-pointer text-left"
                            >
                              {evt.name}
                            </button>
                          ) : (
                            <span className="font-bold text-base text-[var(--foreground)]">System Activity</span>
                          )}
                          <span
                            className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${getActionBadgeClass(entry.action)}`}
                          >
                            {entry.action}
                          </span>
                        </div>
                        <span className="text-xs font-mono text-[var(--muted-foreground)] flex items-center gap-1">
                          <Clock size={12} /> {formatDateTime(entry.timestamp)}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--foreground)] leading-relaxed">{entry.details}</p>

                      {/* Status Transition Pill */}
                      {(entry.statusFrom || entry.statusTo) && (
                        <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--muted-foreground)]">
                          <span>Stage transition:</span>
                          {entry.statusFrom && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">{entry.statusFrom}</span>
                          )}
                          {entry.statusFrom && entry.statusTo && <ArrowRight size={11} className="text-[var(--muted-foreground)]" />}
                          {entry.statusTo && (
                            <span className={`px-1.5 py-0.5 rounded font-bold border ${entry.statusTo === "Approved" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-teal-50 text-[var(--primary)] border-teal-200"}`}>
                              {entry.statusTo}
                            </span>
                          )}
                        </div>
                      )}

                      {entry.remarks && (
                        <div
                          className={`border-l-4 p-3 rounded-r-xl text-xs leading-relaxed ${
                            entry.action.toLowerCase().includes("approve") || entry.action.toLowerCase().includes("endors") || entry.action.toLowerCase().includes("executive") || entry.statusTo === "Approved"
                              ? "bg-emerald-50/80 border-emerald-500 text-emerald-950"
                              : "bg-amber-50/80 border-amber-400 text-amber-900"
                          }`}
                        >
                          {entry.remarks}
                        </div>
                      )}

                      <div className="pt-2 border-t border-[var(--border)]/60 flex items-center justify-between text-xs text-[var(--muted-foreground)] flex-wrap gap-2">
                        <div className="flex items-center gap-1.5">
                          <User size={13} />
                          <span>Performed by: <strong className="text-[var(--foreground)] font-medium">{userName}</strong> ({userRole})</span>
                        </div>
                        {evt && (
                          <button
                            type="button"
                            onClick={() => handleOpenEventModal(evt, "details")}
                            className="text-xs font-bold text-[var(--primary)] hover:underline cursor-pointer flex items-center gap-1"
                          >
                            View Full Event <ChevronRight size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Lazy Loading / Skeletons Trigger */}
          {filteredAndSortedEntries.length > displayLimit && (
            <div className="pt-2 flex flex-col items-center justify-center gap-3">
              {isLoadingMore ? (
                <div className="w-full space-y-4 animate-pulse">
                  <div className="h-20 bg-slate-100/80 rounded-2xl border border-[var(--border)]" />
                  <div className="h-20 bg-slate-100/80 rounded-2xl border border-[var(--border)]" />
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  className="text-xs font-semibold px-5 py-2 shadow-2xs hover:border-[var(--primary)]/40 cursor-pointer"
                >
                  Load More Activities ({filteredAndSortedEntries.length - displayLimit} remaining)
                </Button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <Card className="shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)]/70 border-b border-[var(--border)] text-xs font-mono text-[var(--muted-foreground)]">
                  <th className="px-4 py-3 text-left">Timestamp</th>
                  <th className="px-4 py-3 text-left">Related Event</th>
                  <th className="px-4 py-3 text-left">Action</th>
                  <th className="px-4 py-3 text-left">Actor / Performer</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {visibleEntries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                      <Clock size={28} className="mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-sm">No History Records Found</p>
                      <p className="text-xs mt-0.5">Try adjusting your search query, date range, or event filter.</p>
                    </td>
                  </tr>
                ) : (
                  visibleEntries.map((entry) => {
                    const evt = getAssociatedEvent(entry);
                    const user = users.find((u) => u.id === entry.userId);
                    const userName = user ? `${user.firstName} ${user.lastName}` : entry.userId;
                    const userRole = user?.role || entry.actorRole || "student";

                    return (
                      <tr key={entry.id} className="hover:bg-[var(--muted)]/40 transition-colors">
                        {/* Timestamp */}
                        <td className="px-4 py-3.5 font-mono text-xs text-[var(--muted-foreground)] whitespace-nowrap align-top">
                          {formatDateTime(entry.timestamp)}
                        </td>

                        {/* Event Name Link */}
                        <td className="px-4 py-3.5 align-top min-w-[200px]">
                          {evt ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEventModal(evt, "history")}
                              className="text-left font-bold text-[var(--primary)] hover:underline cursor-pointer block"
                              title={`View full details for ${evt.name}`}
                            >
                              <span className="leading-snug">{evt.name}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-[var(--muted-foreground)] font-mono">System Record</span>
                          )}
                          {evt && (
                            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                              {evt.status}
                            </span>
                          )}
                        </td>

                        {/* Action Badge */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap">
                          <span
                            className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border shadow-2xs ${getActionBadgeClass(entry.action)}`}
                          >
                            {entry.action}
                          </span>
                        </td>

                        {/* Actor */}
                        <td className="px-4 py-3.5 align-top whitespace-nowrap text-xs">
                          <div className="font-medium text-[var(--foreground)]">{userName}</div>
                          <span className="text-[10px] font-mono text-[var(--muted-foreground)] capitalize">{userRole}</span>
                        </td>

                        {/* Details */}
                        <td className="px-4 py-3.5 align-top text-xs space-y-1.5">
                          <p className="text-[var(--foreground)] leading-relaxed">{entry.details}</p>
                          {entry.remarks && (
                            <div
                              className={`border-l-2 p-2 rounded text-[11px] leading-relaxed ${
                                entry.action.toLowerCase().includes("approve") || entry.action.toLowerCase().includes("endors") || entry.action.toLowerCase().includes("executive") || entry.statusTo === "Approved"
                                  ? "bg-emerald-50 border-emerald-500 text-emerald-950"
                                  : "bg-amber-50 border-amber-400 text-amber-900"
                              }`}
                            >
                              {entry.remarks}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Lazy Loading / Skeletons Trigger for Table */}
          {filteredAndSortedEntries.length > displayLimit && (
            <div className="p-4 border-t border-[var(--border)] flex flex-col items-center justify-center gap-3 bg-[var(--muted)]/20">
              {isLoadingMore ? (
                <div className="w-full space-y-2 animate-pulse py-2">
                  <div className="h-8 bg-slate-100 rounded-lg border border-[var(--border)]" />
                  <div className="h-8 bg-slate-100 rounded-lg border border-[var(--border)]" />
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={handleLoadMore}
                  className="text-xs font-semibold px-5 py-2 shadow-2xs hover:border-[var(--primary)]/40 cursor-pointer"
                >
                  Load More Activities ({filteredAndSortedEntries.length - displayLimit} remaining)
                </Button>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Hyperlinked Full Event Dialog Modal */}
      {selectedEvent && (
        <Dialog
          open={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={selectedEvent.name}
          size="xl"
        >
          <div className="flex flex-col min-h-0 flex-1">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 bg-white border-b border-[var(--border)] px-6 pt-4 shadow-2xs">
              <div className="flex items-center gap-3 pb-3">
                <span className={`text-xs font-mono px-3 py-1 rounded-full whitespace-nowrap text-center inline-flex items-center justify-center font-semibold shadow-2xs flex-shrink-0 ${statusColors[selectedEvent.status]}`}>
                  {selectedEvent.status}
                </span>
                <div className="flex-1 min-w-0">
                  <SignatoryProgress status={selectedEvent.status} />
                </div>
              </div>
              <Tabs tabs={dialogTabs} activeTab={dialogTab} onChange={setDialogTab} />
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Event Details Tab */}
              {dialogTab === "details" && (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Name</p>
                    <p className="font-medium">{selectedEvent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Type</p>
                    <p>{getEventTypeById(selectedEvent.typeId)?.name || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Description</p>
                    <p className="leading-relaxed">{selectedEvent.description || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Proposed Budget</p>
                    <p className="font-mono font-semibold text-[var(--primary)]">{formatCurrency(selectedEvent.proposedBudget)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Mode</p>
                    <p>{selectedEvent.mode === "Online/Virtual" ? "Online" : selectedEvent.mode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Date Start</p>
                    <p>{formatDateTime(selectedEvent.dateStart)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Date End</p>
                    <p>{formatDateTime(selectedEvent.dateEnd)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">
                      {selectedEvent.mode === "Online/Virtual" ? "Platform / Link" : "Location"}
                    </p>
                    {isWebUrl(selectedEvent.location) ? (
                      <a
                        href={toWebUrl(selectedEvent.location!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline underline-offset-2 font-medium break-all"
                      >
                        {selectedEvent.location}
                        <ExternalLink size={12} className="flex-shrink-0 text-[var(--primary)]" />
                      </a>
                    ) : (
                      <p className="font-medium">{selectedEvent.location || "—"}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Compliance Tab */}
              {dialogTab === "compliance" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">APF (Activity Proposal Form)</p>
                    {selectedEvent.apfUrl ? (
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[var(--primary)] flex-shrink-0" />
                        <a
                          href={resolvePdfUrl(selectedEvent.apfUrl, "apf")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1.5 break-all"
                        >
                          <span>{selectedEvent.apfUrl.replace(/^.*[\\/]/, "")}</span>
                          <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No APF uploaded.</p>
                    )}
                  </div>
                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">
                      Appendices ({selectedEvent.appendices?.length ?? 0})
                    </p>
                    {selectedEvent.appendices && selectedEvent.appendices.length > 0 ? (
                      <ul className="text-sm space-y-1.5">
                        {selectedEvent.appendices.map((a, i) => (
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
                      <p className="text-sm text-[var(--muted-foreground)]">No appendices uploaded.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Clearance Tab */}
              {dialogTab === "clearance" && (
                <EventClearanceTab
                  event={selectedEvent}
                  eventTypeName={getEventTypeById(selectedEvent.typeId)?.name}
                />
              )}

              {/* History Tab */}
              {dialogTab === "history" && (
                <EventHistoryTimeline eventId={selectedEvent.id} event={selectedEvent} />
              )}

              {/* Finance Tab */}
              {dialogTab === "finance" && (
                <EventFinanceTab
                  event={selectedEvent}
                  onOpenFinance={() => {
                    setSelectedEvent(null);
                  }}
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end px-6 pb-6 pt-4 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
