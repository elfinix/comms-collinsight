import { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Card, Button, UserAvatar } from "../../components/ui";
import {
  History, Search, Filter, Clock, ArrowDownWideNarrow, ArrowUpNarrowWide,
  ScrollText, FileText, ArrowRight, Activity, Building2, CheckCircle,
  ChevronDown, Loader2, Printer
} from "lucide-react";
import { formatDateTime, getActionBadgeClass, Event } from "../../services/mockData";

type ActionFilterType = "ALL" | "CREATE" | "SUBMIT" | "APPROVE" | "REVISION" | "MODIFIED" | "FINANCE" | "CLOSURE";

const ACTION_FILTERS: { id: ActionFilterType; label: string }[] = [
  { id: "ALL", label: "All Actions" },
  { id: "CREATE", label: "Created Proposals" },
  { id: "SUBMIT", label: "For Review" },
  { id: "APPROVE", label: "Approvals & Endorsements" },
  { id: "REVISION", label: "Revision Requests" },
  { id: "MODIFIED", label: "Edits & Deletions" },
  { id: "FINANCE", label: "Financial Records" },
  { id: "CLOSURE", label: "Event Closures" },
];

const INITIAL_BATCH_SIZE = 25;
const BATCH_INCREMENT = 25;

export default function AdminAuditTrail() {
  const { auditTrail, users, events } = useApp();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState<ActionFilterType>("ALL");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_BATCH_SIZE);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const adminName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}${currentUser.suffix ? ", " + currentUser.suffix : ""}`
    : "Engr. Marco D. Villanueva";

  // Reset lazy load pagination whenever filters change
  useEffect(() => {
    setVisibleCount(INITIAL_BATCH_SIZE);
  }, [search, actionFilter, roleFilter, sortDir]);

  // Map each audit entry to its associated event
  const getAssociatedEvent = (entry: any): Event | undefined => {
    if (entry.eventId) {
      return events.find((e) => e.id === entry.eventId);
    }
    return events.find((e) => entry.details.toLowerCase().includes(e.name.toLowerCase()));
  };

  // Filtered and Sorted audit trail
  const filteredEntries = useMemo(() => {
    return auditTrail
      .filter((entry) => {
        // Action Filter
        if (actionFilter !== "ALL") {
          const actionLower = entry.action.toLowerCase();
          if (actionFilter === "CREATE" && !actionLower.includes("creat")) return false;
          if (actionFilter === "SUBMIT" && !actionLower.includes("submit") && !actionLower.includes("review")) return false;
          if (actionFilter === "APPROVE" && !actionLower.includes("approv") && !actionLower.includes("endors") && !actionLower.includes("clearance")) return false;
          if (actionFilter === "REVISION" && !actionLower.includes("revis") && !actionLower.includes("change")) return false;
          if (actionFilter === "MODIFIED" && !actionLower.includes("edit") && !actionLower.includes("delet") && !actionLower.includes("remov")) return false;
          if (actionFilter === "FINANCE" && !actionLower.includes("financ") && !actionLower.includes("disburs") && !actionLower.includes("expens") && !actionLower.includes("ledger") && !actionLower.includes("liquidat")) return false;
          if (actionFilter === "CLOSURE" && !actionLower.includes("clos") && !actionLower.includes("conclud")) return false;
        }

        // Role Filter
        if (roleFilter !== "all") {
          const user = users.find((u) => u.id === entry.userId);
          const role = user?.role || entry.actorRole;
          if (role !== roleFilter) return false;
        }

        // Search Query
        if (search.trim()) {
          const q = search.toLowerCase();
          const user = users.find((u) => u.id === entry.userId);
          const userName = user ? `${user.firstName} ${user.lastName}` : entry.userId;
          const detailsMatch = entry.details.toLowerCase().includes(q);
          const actionMatch = entry.action.toLowerCase().includes(q);
          const userMatch = userName.toLowerCase().includes(q);
          const evt = getAssociatedEvent(entry);
          const evtMatch = evt ? evt.name.toLowerCase().includes(q) : false;
          return detailsMatch || actionMatch || userMatch || evtMatch;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();
        return sortDir === "desc" ? timeB - timeA : timeA - timeB;
      });
  }, [auditTrail, actionFilter, roleFilter, search, sortDir, users, events]);

  // Sliced for Lazy Loading
  const visibleEntries = useMemo(() => {
    return filteredEntries.slice(0, visibleCount);
  }, [filteredEntries, visibleCount]);

  const hasMore = visibleCount < filteredEntries.length;

  function handleLoadMore() {
    setIsLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => prev + BATCH_INCREMENT);
      setIsLoadingMore(false);
    }, 250);
  }

  function handleExportPDF() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const docRef = `AUD-LEDGER-${Date.now().toString().slice(-6)}`;
    const generatedDate = formatDateTime(new Date().toISOString());

    const tableRowsHtml = filteredEntries.map((entry, idx) => {
      const evt = getAssociatedEvent(entry);
      const user = users.find((u) => u.id === entry.userId);
      const userName = user ? `${user.firstName} ${user.lastName}` : entry.userId;
      const userRole = user?.role || entry.actorRole || "student";

      return `
        <tr>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; color: #64748b;">${idx + 1}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-family: monospace; white-space: nowrap;">${formatDateTime(entry.timestamp)}</td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 600; color: #0f172a;">${evt ? evt.name : "Platform System Log"}</div>
            ${evt ? `<span style="font-size: 8px; font-family: monospace; background: #f1f5f9; padding: 2px 4px; border-radius: 3px; color: #475569;">${evt.status}</span>` : ""}
          </td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">
            <span style="background: #f0fdfa; color: #0f766e; font-weight: bold; padding: 3px 6px; border-radius: 4px; border: 1px solid #ccfbf1; font-size: 9px; font-family: monospace;">
              ${entry.action}
            </span>
          </td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">
            <div style="font-weight: bold;">${userName}</div>
            <div style="font-size: 9px; color: #64748b; font-family: monospace; text-transform: capitalize;">${userRole}</div>
          </td>
          <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0;">
            <div>${entry.details}</div>
            ${entry.remarks ? `<div style="margin-top: 4px; padding: 4px 6px; background: #f8fafc; border-left: 2px solid #0f766e; font-size: 9px; color: #334155;"><em>"${entry.remarks}"</em></div>` : ""}
          </td>
        </tr>
      `;
    }).join("");

    const deans = users.filter((u) => u.role === "dean");
    const deanName = deans.length > 0 ? `${deans[0].firstName} ${deans[0].lastName}${deans[0].suffix ? ", " + deans[0].suffix : ""}` : "Dr. Jocelyn B. Hipolito";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Audit_Trail_Security_Ledger_${docRef}</title>
        <style>
          @page { size: A4 landscape; margin: 12mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 20px;
            font-size: 10px;
            line-height: 1.35;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .brand { display: flex; align-items: center; gap: 10px; }
          .logo {
            width: 40px; height: 40px;
            border-radius: 8px;
            background-color: #134e4a;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 15px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 10px;
            border-radius: 6px;
            margin-bottom: 14px;
          }
          .kpi-label { font-size: 8.5px; color: #64748b; text-transform: uppercase; font-family: monospace; font-weight: bold; }
          .kpi-val { font-weight: bold; font-size: 13px; margin-top: 2px; color: #0f172a; font-family: monospace; }
          table { width: 100%; border-collapse: collapse; font-size: 9.5px; margin-bottom: 16px; }
          th { background: #f1f5f9; text-align: left; padding: 7px 8px; border-bottom: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #334155; }
          .signatory-section {
            margin-top: 24px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 14px;
          }
          .sig-line { border-bottom: 1px solid #334155; height: 30px; margin-bottom: 5px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <div class="logo">LCUP</div>
            <div>
              <h2 style="margin: 0; font-size: 14px; font-weight: 800; color: #134e4a; text-transform: uppercase;">La Consolacion University Philippines</h2>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569; font-weight: 600;">College of Information Technology & Engineering</p>
              <p style="margin: 2px 0 0 0; font-size: 10.5px; color: #0f766e; font-weight: bold;">System Audit Trail & Security Ledger</p>
            </div>
          </div>
          <div style="text-align: right; font-family: monospace;">
            <span style="background: #ccfbf1; color: #115e59; font-weight: bold; padding: 3px 6px; border-radius: 4px; border: 1px solid #99f6e4; font-size: 9.5px;">AUDIT TRAIL LEDGER</span>
            <p style="margin: 3px 0 0 0; font-size: 8.5px; color: #64748b;">Ref: ${docRef}</p>
            <p style="margin: 1px 0 0 0; font-size: 8.5px; color: #64748b;">Generated: ${generatedDate}</p>
          </div>
        </div>

        <div class="kpi-grid">
          <div><div class="kpi-label">Total Audit Records</div><div class="kpi-val">${auditTrail.length} Logged</div></div>
          <div><div class="kpi-label">Exported Entries</div><div class="kpi-val">${filteredEntries.length} Records</div></div>
          <div><div class="kpi-label">Action Filter</div><div class="kpi-val">${ACTION_FILTERS.find((f) => f.id === actionFilter)?.label || actionFilter}</div></div>
          <div><div class="kpi-label">Scope & Sort</div><div class="kpi-val" style="font-size: 11px; text-transform: capitalize;">${roleFilter === "all" ? "All Roles" : roleFilter + "s"} · ${sortDir === "desc" ? "Newest First" : "Oldest First"}</div></div>
        </div>

        ${search.trim() ? `<div style="background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 4px; font-size: 9px; font-family: monospace; margin-bottom: 12px; color: #334155;"><strong>Search Query Filter Applied:</strong> "${search}"</div>` : ""}

        <table>
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th style="width: 140px;">Timestamp</th>
              <th style="width: 190px;">Associated Event</th>
              <th style="width: 130px;">Action Type</th>
              <th style="width: 140px;">Actor</th>
              <th>Activity Details & Official Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div class="signatory-section">
          <div>
            <div style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase;">Audit Ledger Extracted by:</div>
            <div class="sig-line"></div>
            <div style="font-weight: bold; font-size: 10.5px;">${adminName}</div>
            <div style="font-size: 8.5px; color: #64748b;">System Administrator, CITE</div>
          </div>
          <div>
            <div style="font-size: 9px; color: #64748b; font-weight: bold; text-transform: uppercase;">Certified & Reviewed by:</div>
            <div class="sig-line"></div>
            <div style="font-weight: bold; font-size: 10.5px;">${deanName}</div>
            <div style="font-size: 8.5px; color: #64748b;">College Dean, CITE</div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    toast.success("Audit Log Exported", `Prepared ${filteredEntries.length} audit entries for print/PDF export.`);
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            System Audit Trail
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Immutable tabular record of all system events, administrative mutations, approvals, and financial logs.
          </p>
        </div>
        <Button onClick={handleExportPDF} variant="outline" className="gap-1.5 shadow-2xs font-semibold text-xs h-9">
          <Printer size={15} /> Export PDF
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search audit trail by event, actor, action, or details..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
            />
          </div>

          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as ActionFilterType)}
            className="px-3.5 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs"
          >
            {ACTION_FILTERS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs"
          >
            <option value="all">All Roles</option>
            <option value="student">Student Officers</option>
            <option value="adviser">Faculty Advisers</option>
            <option value="dean">College Dean</option>
            <option value="admin">Administrators</option>
          </select>

          {/* Sort Direction Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDir((p) => (p === "desc" ? "asc" : "desc"))}
            className="h-9 px-3 gap-1.5 text-xs shadow-2xs"
            title="Toggle chronological sort order"
          >
            {sortDir === "desc" ? (
              <>
                <ArrowDownWideNarrow size={14} /> Newest First
              </>
            ) : (
              <>
                <ArrowUpNarrowWide size={14} /> Oldest First
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabulated Audit Trail Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)]/50 border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Associated Event</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Action</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Actor</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Activity Details & Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-[var(--muted-foreground)]">
                    No matching audit trail records found.
                  </td>
                </tr>
              ) : (
                visibleEntries.map((entry) => {
                  const evt = getAssociatedEvent(entry);
                  const user = users.find((u) => u.id === entry.userId);
                  const userName = user ? `${user.firstName} ${user.lastName}` : entry.userId;
                  const userRole = user?.role || entry.actorRole || "student";

                  return (
                    <tr key={entry.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      {/* Timestamp */}
                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--muted-foreground)] whitespace-nowrap align-top">
                        {formatDateTime(entry.timestamp)}
                      </td>

                      {/* Associated Event (De-emphasized, non-clickable) */}
                      <td className="px-4 py-3.5 align-top min-w-[200px]">
                        {evt ? (
                          <div>
                            <p className="text-xs font-medium text-[var(--foreground)] leading-snug">
                              {evt.name}
                            </p>
                            <span className="inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]">
                              {evt.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)] font-mono">
                            Platform System Log
                          </span>
                        )}
                      </td>

                      {/* Action Pill Badge */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap">
                        <span
                          className={`text-xs font-mono font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 border shadow-2xs ${getActionBadgeClass(
                            entry.action
                          )}`}
                        >
                          {entry.action}
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3.5 align-top whitespace-nowrap text-xs">
                        <div className="flex items-center gap-2">
                          <UserAvatar
                            gender={user?.gender}
                            firstName={user?.firstName}
                            lastName={user?.lastName}
                            name={userName}
                            size="sm"
                          />
                          <div>
                            <p className="font-bold text-[var(--foreground)] leading-tight">{userName}</p>
                            <span className="text-[10px] font-mono text-[var(--muted-foreground)] capitalize">
                              {userRole}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Activity Details & Remarks */}
                      <td className="px-4 py-3.5 align-top text-xs space-y-1.5 min-w-[260px]">
                        <p className="text-[var(--foreground)] leading-relaxed">{entry.details}</p>
                        {entry.remarks && (
                          <div className="border-l-2 border-[var(--primary)] bg-[var(--primary)]/5 p-2 rounded-r-lg text-[11px] leading-relaxed text-[var(--foreground)]">
                            <span className="font-bold text-[var(--primary)] block font-mono text-[10px] uppercase">
                              Official Remark / Note
                            </span>
                            "{entry.remarks}"
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

        {/* Lazy Loading Action Footer */}
        {hasMore && (
          <div className="p-4 border-t border-[var(--border)] bg-[var(--muted)]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <span className="text-[var(--muted-foreground)] font-mono">
              Showing {visibleEntries.length} of {filteredEntries.length} matching entries
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
              className="gap-2 text-xs font-semibold shadow-2xs h-8 px-4"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Loading records...
                </>
              ) : (
                <>
                  <ChevronDown size={14} /> Load More Records ({filteredEntries.length - visibleEntries.length} remaining)
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
