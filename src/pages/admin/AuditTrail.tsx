import { useState, useMemo, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Card, Button, UserAvatar, RefreshButton, SkeletonTable, SkeletonToolbox } from "../../components/ui";
import {
  History, Search, Filter, Clock, ArrowDownWideNarrow, ArrowUpNarrowWide,
  ScrollText, FileText, ArrowRight, Activity, Building2, CheckCircle,
  ChevronDown, Loader2
} from "lucide-react";
import { formatDateTime, getActionBadgeClass, Event, statusColors } from "../../services/dataService";
import { uploadGeneratedReport } from "../../services/storageService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

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
const BATCH_INCREMENT = 20;

export default function AdminAuditTrail() {
  const { auditTrail, users, events, addExportedReport, isLoading } = useApp();
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
    : "Team COLLInsight";

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
    const docRef = `AUD-LEDGER-${Date.now().toString().slice(-6)}`;
    const generatedDate = formatDateTime(new Date().toISOString());
    const deans = users.filter((u) => u.role === "dean");
    const deanName = deans.length > 0 ? `${deans[0].firstName} ${deans[0].middleName ? deans[0].middleName + " " : ""}${deans[0].lastName}${deans[0].suffix ? ", " + deans[0].suffix : ""}` : "Dr. Marilou Castro Villanueva, Ph.D.";

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      // Page dimensions in landscape A4: 297mm x 210mm
      const pageWidth = 297;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2; // 269mm

      // ── 1. HEADER SECTION ───────────────────────────────────────────
      // LCUP Logo Square
      doc.setFillColor(19, 78, 74); // #134e4a
      doc.roundedRect(margin, 12, 11, 11, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("LCUP", margin + 1.6, 19);

      // University & Department Titles
      doc.setTextColor(19, 78, 74); // #134e4a
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("LA CONSOLACION UNIVERSITY PHILIPPINES", margin + 14, 16);

      doc.setTextColor(71, 85, 105); // #475569
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("College of Information Technology & Engineering", margin + 14, 20);

      doc.setTextColor(15, 118, 110); // #0f766e
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("System Audit Trail & Security Ledger", margin + 14, 24);

      // Top Right: AUDIT TRAIL LEDGER Pill Badge
      const badgeText = "AUDIT TRAIL LEDGER";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const badgeW = doc.getTextWidth(badgeText) + 6;
      const badgeX = pageWidth - margin - badgeW;
      
      doc.setFillColor(204, 251, 241); // #ccfbf1
      doc.setDrawColor(153, 246, 228); // #99f6e4
      doc.setLineWidth(0.3);
      doc.roundedRect(badgeX, 11.5, badgeW, 5.5, 1.2, 1.2, "FD");

      doc.setTextColor(17, 94, 89); // #115e59
      doc.text(badgeText, badgeX + 3, 15.5);

      // Ref and Date below pill badge (Normal Weight & Crisp Slate)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // #475569
      doc.text(`Ref: ${docRef}`, pageWidth - margin, 20.5, { align: "right" });
      doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 24.5, { align: "right" });

      // Teal Header Line Divider
      doc.setDrawColor(15, 118, 110); // #0f766e
      doc.setLineWidth(0.5);
      doc.line(margin, 28, pageWidth - margin, 28);

      // ── 2. KPI SUMMARY METRIC BOXES ────────────────────────────────
      const kpiY = 32;
      const kpiH = 12;
      doc.setFillColor(248, 250, 252); // #f8fafc
      doc.setDrawColor(226, 232, 240); // #e2e8f0
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, kpiY, contentWidth, kpiH, 1.5, 1.5, "FD");

      const colW = contentWidth / 4;

      // Col 1: Total Audit Records
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL AUDIT RECORDS", margin + 4, kpiY + 4.5);
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${auditTrail.length} Logged`, margin + 4, kpiY + 9.5);

      // Col 2: Exported Entries
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("EXPORTED ENTRIES", margin + colW + 4, kpiY + 4.5);
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${filteredEntries.length} Records`, margin + colW + 4, kpiY + 9.5);

      // Col 3: Action Filter
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("ACTION FILTER", margin + colW * 2 + 4, kpiY + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${ACTION_FILTERS.find((f) => f.id === actionFilter)?.label || actionFilter}`, margin + colW * 2 + 4, kpiY + 9.5);

      // Col 4: Scope & Sort
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("SCOPE & SORT", margin + colW * 3 + 4, kpiY + 4.5);
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${roleFilter === "all" ? "All Roles" : roleFilter + "s"} · ${sortDir === "desc" ? "Newest First" : "Oldest First"}`, margin + colW * 3 + 4, kpiY + 9.5);

      // ── 3. SEARCH FILTER NOTICE (IF ACTIVE) ──────────────────────────
      let startTableY = 47;
      if (search.trim()) {
        doc.setFillColor(241, 245, 249);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, 46, contentWidth, 5.5, 1, 1, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text(`Search Query Filter Applied: "${search}"`, margin + 3, 49.8);
        startTableY = 54;
      }

      // ── 4. BADGE COLOR MAPPER (MATCHES EXACT UI THEME) ───────────────
      const getPillColors = (action: string) => {
        const act = action.toLowerCase();
        if (act.includes("approve") || act.includes("endors") || act.includes("executive")) {
          return { bg: [240, 253, 250], border: [153, 246, 228], text: [15, 118, 110] }; // Teal
        }
        if (act.includes("revision") || act.includes("change") || act.includes("reject")) {
          return { bg: [255, 241, 242], border: [254, 205, 211], text: [190, 18, 60] }; // Rose
        }
        if (act.includes("delete") || act.includes("removed")) {
          return { bg: [254, 242, 242], border: [254, 202, 202], text: [185, 28, 28] }; // Red
        }
        if (act.includes("modified") || act.includes("edit") || act.includes("update")) {
          return { bg: [255, 251, 235], border: [253, 230, 138], text: [180, 83, 9] }; // Amber
        }
        if (act.includes("submit") || act.includes("for review")) {
          return { bg: [239, 246, 255], border: [191, 219, 254], text: [29, 78, 216] }; // Blue
        }
        if (act.includes("disburs") || act.includes("expense") || act.includes("financ") || act.includes("record")) {
          return { bg: [240, 253, 244], border: [187, 247, 208], text: [21, 128, 61] }; // Emerald Green
        }
        if (act.includes("completed") || act.includes("closed") || act.includes("closure")) {
          return { bg: [241, 245, 249], border: [203, 213, 225], text: [51, 65, 85] }; // Slate
        }
        return { bg: [241, 245, 249], border: [203, 213, 225], text: [51, 65, 85] }; // Default Slate (Created Event)
      };

      const formatRoleName = (role: string) => {
        const r = role.toLowerCase();
        return r.charAt(0).toUpperCase() + r.slice(1);
      };

      // ── 5. TABLE DATA CONSTRUCTION ──────────────────────────────────
      const rawRows = filteredEntries.map((entry, idx) => {
        const evt = getAssociatedEvent(entry);
        const user = users.find((u) => u.id === entry.userId);
        const userName = user ? `${user.firstName} ${user.lastName}` : entry.userId;
        const userRole = (user?.role || entry.actorRole || "student").toLowerCase();

        // Sanitize ₱ to PHP to avoid standard font character corruption (±)
        const cleanDetails = (entry.details || "").replace(/₱/g, "PHP ");
        const cleanRemarks = (entry.remarks || "").replace(/₱/g, "PHP ");

        return {
          idx: idx + 1,
          timestamp: formatDateTime(entry.timestamp),
          eventName: evt ? evt.name : "Platform System Log",
          eventStatus: evt ? evt.status : "",
          action: entry.action,
          userName,
          userRole,
          details: cleanDetails,
          remarks: cleanRemarks,
        };
      });

      const tableData = rawRows.map((r) => [
        r.idx,
        r.timestamp,
        r.eventName + (r.eventStatus ? `\n${r.eventStatus}` : ""),
        r.action,
        `${r.userName}\n[ ${formatRoleName(r.userRole)} ]`,
        r.details + (r.remarks ? `\n\n"${r.remarks}"` : ""),
      ]);

      autoTable(doc, {
        startY: startTableY,
        head: [["#", "Timestamp", "Associated Event", "Action Type", "Actor", "Activity Details & Remarks"]],
        body: tableData,
        theme: "plain",
        styles: {
          font: "helvetica",
          fontStyle: "normal",
          fontSize: 7.5,
          textColor: [15, 23, 42],
          cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
          lineWidth: { bottom: 0.15 },
          lineColor: [226, 232, 240], // #e2e8f0 bottom border
          valign: "top",
        },
        headStyles: {
          fillColor: [241, 245, 249], // #f1f5f9
          textColor: [51, 65, 85], // #334155
          fontSize: 7,
          fontStyle: "bold",
          font: "helvetica",
          lineWidth: { bottom: 0.3 },
          lineColor: [203, 213, 225],
        },
        columnStyles: {
          0: { cellWidth: 9, halign: "center", font: "helvetica", textColor: [100, 116, 139] },
          1: { cellWidth: 32, font: "helvetica", textColor: [71, 85, 105] },
          2: { cellWidth: 48, font: "helvetica" },
          3: { cellWidth: 34, font: "helvetica" },
          4: { cellWidth: 32, font: "helvetica" },
          5: { cellWidth: "auto", font: "helvetica" },
        },
        margin: { left: margin, right: margin, bottom: 36 },
        didDrawCell: (data) => {
          if (data.section === "body") {
            const rowObj = rawRows[data.row.index];

            // Column 3: Action Type Custom Colored Badge Pill
            if (data.column.index === 3 && rowObj) {
              const text = rowObj.action;
              const colors = getPillColors(text);

              doc.setFont("helvetica", "bold");
              doc.setFontSize(6.5);
              const tw = doc.getTextWidth(text) + 4.5;
              const pillX = data.cell.x + 2;
              const pillY = data.cell.y + 2.5;

              // Draw Rounded Pill
              doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
              doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
              doc.setLineWidth(0.25);
              doc.roundedRect(pillX, pillY, tw, 4.8, 1, 1, "FD");

              // Text inside pill
              doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
              doc.text(text, pillX + 2.2, pillY + 3.4);

              // Reset font back to helvetica normal for safety
              doc.setFont("helvetica", "normal");
              doc.setTextColor(15, 23, 42);
            }

            // Column 5: Remarks Compact Left-Accent Quote Line
            if (data.column.index === 5 && rowObj && rowObj.remarks) {
              const cellX = data.cell.x + 2;
              const lineBottom = data.cell.y + data.cell.height - 3;
              const lineTop = lineBottom - 3.8; // Compact neat height

              doc.setDrawColor(15, 118, 110); // #0f766e teal accent line
              doc.setLineWidth(0.7);
              doc.line(cellX, lineTop, cellX, lineBottom);
            }

            // Always reset active font and colors
            doc.setFont("helvetica", "normal");
            doc.setTextColor(15, 23, 42);
          }
        },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.getHeight();

          // Signatories at bottom (Raised up with comfortable 14mm page bottom margin)
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);

          // Left Signatory (Admin)
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("AUDIT LEDGER EXTRACTED BY:", margin + 2, pageHeight - 26);
          doc.setDrawColor(51, 65, 85);
          doc.setLineWidth(0.3);
          doc.line(margin + 2, pageHeight - 21, margin + 95, pageHeight - 21);
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(adminName, margin + 2, pageHeight - 17.5);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text("System Administrator, CITE", margin + 2, pageHeight - 14);

          // Right Signatory (Dean)
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("CERTIFIED & REVIEWED BY:", 175, pageHeight - 26);
          doc.setDrawColor(51, 65, 85);
          doc.line(175, pageHeight - 21, 268, pageHeight - 21);
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(deanName, 175, pageHeight - 17.5);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text("College Dean, CITE", 175, pageHeight - 14);
        },
      });

      // Output real binary PDF
      const pdfBlob = doc.output("blob");
      const fileName = `${docRef}_Audit_Ledger.pdf`;

      // Upload genuine vector PDF to Supabase Storage
      uploadGeneratedReport({
        organizationName: "Administration",
        dateGenerated: new Date(),
        file: pdfBlob,
        fileName,
      }).then((res) => {
        addExportedReport({
          id: crypto.randomUUID(),
          title: `System Audit Trail Ledger (${filteredEntries.length} entries)`,
          docRef,
          category: "Audit Trail Ledger",
          organizationName: "Administration",
          generatedBy: adminName,
          generatedAt: new Date().toISOString(),
          fileUrl: res.publicUrl,
          filePath: res.path,
          format: "PDF",
        });
      }).catch((e) => console.warn("Storage archive error:", e));

      // Open valid PDF directly in new tab
      const blobUrl = URL.createObjectURL(pdfBlob);
      const openWindow = window.open(blobUrl, "_blank");
      if (!openWindow) {
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      toast.success("Audit Log Exported", `PDF (${(pdfBlob.size / 1024).toFixed(1)} KB) created with authentic visual styling.`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Export Failed", "Could not compile PDF document.");
    }
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
        <div className="flex items-center gap-2">
          <Button onClick={handleExportPDF} variant="outline" className="gap-1.5 shadow-2xs font-semibold text-xs h-9">
            <FileText size={15} /> Export PDF
          </Button>
          <RefreshButton />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <SkeletonToolbox />
          <SkeletonTable rows={8} cols={5} />
        </div>
      ) : (
        <>

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
                            <span className={`inline-block mt-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${statusColors[evt.status] || "bg-slate-100 text-slate-700 border-slate-300"}`}>
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
        </>
      )}
    </div>
  );
}
