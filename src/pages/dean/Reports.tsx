import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { Card, CardHeader, CardBody, Button, StatCard, Dialog, Tabs, SignatoryProgress } from "../../components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from "recharts";
import {
  FileDown, CalendarDays, CalendarCheck, Clock, CheckCheck, Wallet, CreditCard, Coins,
  Search, Filter, ArrowUpDown, ChevronDown, ArrowUpNarrowWide, ArrowDownWideNarrow,
  Building2, FileText, ExternalLink
} from "lucide-react";
import {
  formatCurrency, formatDate, formatDateTime, statusColors, getEventTypeById,
  Event, isWebUrl, toWebUrl, resolvePdfUrl
} from "../../services/mockData";
import { uploadGeneratedReport } from "../../services/storageService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import EventHistoryTimeline from "../../components/events/EventHistoryTimeline";
import EventClearanceTab from "../../components/events/EventClearanceTab";
import EventFinanceTab from "../../components/events/EventFinanceTab";

const COLORS = ["#0d9488", "#0284c7", "#7c3aed", "#f59e0b", "#10b981", "#64748b"];

const STATUS_FILTERS = ["All", "Created", "For Review", "For Approval", "Pending Revision", "Approved", "Completed", "Closed"];

export default function DeanReports() {
  const { events, transactions, users, organizations, exportedReports, addExportedReport } = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState<"events" | "finance">("events");

  // Filtering & Sorting State for Events Table
  const [searchQuery, setSearchQuery] = useState("");
  const [orgFilter, setOrgFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState("dateStart");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Event Details Modal state
  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [viewTab, setViewTab] = useState("details");

  const viewTabs = [
    { id: "details", label: "Details" },
    { id: "compliance", label: "Compliance Docs" },
    { id: "clearance", label: "Event Clearance" },
    { id: "history", label: "History" },
    { id: "finance", label: "Finance" },
  ];

  const allEvents = events;
  const approved = events.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const pendingEvents = events.filter((e) => ["For Review", "For Approval"].includes(e.status));
  const closedEvents = events.filter((e) => e.status === "Closed");

  const totalBudget = organizations.reduce((s, o) => s + o.allocatedBudget, 0);
  const totalSpent = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);
  const remainingTreasury = totalBudget - totalSpent;
  const spentPercentage = totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(0) : "0";
  const unspentPercentage = totalBudget > 0 ? ((remainingTreasury / totalBudget) * 100).toFixed(0) : "0";

  const deanUser = users.find((u) => u.role === "dean");
  const deanName = deanUser
    ? `${deanUser.firstName} ${deanUser.middleName ? deanUser.middleName + " " : ""}${deanUser.lastName}${deanUser.suffix ? ", " + deanUser.suffix : ""}`
    : "Dr. Marilou C. Villanueva, Ph.D.";

  const orgData = organizations.map((org) => {
    const orgEvents = events.filter((e) => e.organizationId === org.id);
    const spent = transactions.filter((t) => orgEvents.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);
    return { name: org.code, events: orgEvents.length, spent, budget: org.allocatedBudget };
  });

  // Timeline trend data for Finance Report
  const financialTrendData = useMemo(() => {
    return approved
      .slice()
      .sort((a, b) => new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime())
      .map((e) => {
        const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
        const orgCode = organizations.find((o) => o.id === e.organizationId)?.code || "ORG";
        return {
          name: `${e.name.split(" ")[0]} (${orgCode})`,
          fullName: e.name,
          orgCode,
          budget: e.proposedBudget,
          spent,
          date: formatDate(e.dateStart),
        };
      });
  }, [approved, transactions]);

  // Filtered and Sorted Table Data
  const filteredEvents = useMemo(() => {
    return allEvents
      .filter((e) => {
        if (orgFilter !== "All" && e.organizationId !== orgFilter) return false;
        if (statusFilter !== "All" && e.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const org = organizations.find((o) => o.id === e.organizationId);
          const type = getEventTypeById(e.typeId);
          const matchName = e.name.toLowerCase().includes(q);
          const matchOrg = org?.name.toLowerCase().includes(q) || org?.code.toLowerCase().includes(q);
          const matchType = type?.name.toLowerCase().includes(q);
          if (!matchName && !matchOrg && !matchType) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let comp = 0;
        const orgA = organizations.find((o) => o.id === a.organizationId)?.code || "";
        const orgB = organizations.find((o) => o.id === b.organizationId)?.code || "";
        const spentA = transactions.filter((t) => t.eventId === a.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
        const spentB = transactions.filter((t) => t.eventId === b.id && !t.deleted).reduce((s, t) => s + t.amount, 0);

        if (sortKey === "name") {
          comp = a.name.localeCompare(b.name);
        } else if (sortKey === "org") {
          comp = orgA.localeCompare(orgB);
        } else if (sortKey === "proposedBudget") {
          comp = a.proposedBudget - b.proposedBudget;
        } else if (sortKey === "spent") {
          comp = spentA - spentB;
        } else if (sortKey === "status") {
          comp = a.status.localeCompare(b.status);
        } else {
          comp = new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
        }
        return sortDir === "asc" ? comp : -comp;
      });
  }, [allEvents, orgFilter, statusFilter, searchQuery, sortKey, sortDir, transactions]);

  async function handleExportPdf() {
    const docRef = `REP-DEAN-${Date.now().toString().slice(-6)}`;
    const generatedDate = formatDateTime(new Date().toISOString());

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

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
      doc.text("Office of the College Dean · Cross-Organizational Directorate Report", margin + 14, 24);

      // Top Right: DIRECTORATE REPORT Pill Badge
      const badgeText = "DIRECTORATE REPORT";
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

      // Ref and Date below pill badge (Normal Weight)
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

      // Col 1: Total Events
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL PROPOSALS", margin + 4, kpiY + 4.5);
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${allEvents.length} Events`, margin + 4, kpiY + 9.5);

      // Col 2: Approved Events
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("APPROVED & ACTIVE", margin + colW + 4, kpiY + 4.5);
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${approved.length} Events`, margin + colW + 4, kpiY + 9.5);

      // Col 3: Total Allocated Budget
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL ALLOCATION", margin + colW * 2 + 4, kpiY + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      doc.text(`PHP ${Number(totalBudget || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + colW * 2 + 4, kpiY + 9.5);

      // Col 4: Total Disbursed
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL DISBURSED", margin + colW * 3 + 4, kpiY + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(21, 128, 61);
      doc.text(`PHP ${Number(totalSpent || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${spentPercentage}%)`, margin + colW * 3 + 4, kpiY + 9.5);

      // ── 3. STATUS BADGE COLOR HELPER ────────────────────────────────
      const getStatusPillColors = (status: string) => {
        const s = status.toLowerCase();
        if (s.includes("approv") || s.includes("complet")) {
          return { bg: [240, 253, 250], border: [153, 246, 228], text: [15, 118, 110] }; // Teal
        }
        if (s.includes("review") || s.includes("for app")) {
          return { bg: [239, 246, 255], border: [191, 219, 254], text: [29, 78, 216] }; // Blue
        }
        if (s.includes("revis") || s.includes("reject")) {
          return { bg: [255, 241, 242], border: [254, 205, 211], text: [190, 18, 60] }; // Rose
        }
        if (s.includes("closed")) {
          return { bg: [241, 245, 249], border: [203, 213, 225], text: [71, 85, 105] }; // Slate
        }
        return { bg: [241, 245, 249], border: [203, 213, 225], text: [71, 85, 105] };
      };

      // ── 4. EVENTS TABLE DATA CONSTRUCTION ───────────────────────────
      const rawEventRows = filteredEvents.map((e, idx) => {
        const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
        const orgCode = organizations.find((o) => o.id === e.organizationId)?.code || "CITE";
        const typeName = getEventTypeById(e.typeId)?.name || "General";

        return {
          idx: idx + 1,
          name: e.name,
          orgCode,
          typeName,
          date: formatDate(e.dateStart),
          budget: `PHP ${Number(e.proposedBudget || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          spent: `PHP ${Number(spent || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          status: e.status,
        };
      });

      const eventsTableData = rawEventRows.map((r) => [
        r.idx,
        r.name,
        r.orgCode,
        r.typeName,
        r.date,
        r.budget,
        r.spent,
        r.status,
      ]);

      autoTable(doc, {
        startY: 48,
        head: [["#", "Event Proposal Name", "Org", "Event Type", "Event Date", "Allocated", "Disbursed", "Status"]],
        body: eventsTableData,
        theme: "plain",
        styles: {
          font: "helvetica",
          fontStyle: "normal",
          fontSize: 7.5,
          textColor: [15, 23, 42],
          cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 },
          lineWidth: { bottom: 0.15 },
          lineColor: [226, 232, 240],
          valign: "middle",
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [51, 65, 85],
          fontSize: 7,
          fontStyle: "bold",
          font: "helvetica",
          lineWidth: { bottom: 0.3 },
          lineColor: [203, 213, 225],
        },
        columnStyles: {
          0: { cellWidth: 9, halign: "center", font: "helvetica", textColor: [100, 116, 139] },
          1: { cellWidth: 81, fontStyle: "bold" },
          2: { cellWidth: 20, fontStyle: "bold", textColor: [15, 118, 110] },
          3: { cellWidth: 32 },
          4: { cellWidth: 28 },
          5: { cellWidth: 32, halign: "right", fontStyle: "bold" },
          6: { cellWidth: 32, halign: "right", fontStyle: "bold", textColor: [15, 118, 110] },
          7: { cellWidth: 35, halign: "center" },
        },
        margin: { left: margin, right: margin, bottom: 36 },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 7) {
            const rowObj = rawEventRows[data.row.index];
            if (rowObj) {
              const text = rowObj.status;
              const colors = getStatusPillColors(text);

              doc.setFont("helvetica", "bold");
              doc.setFontSize(6.5);
              const tw = doc.getTextWidth(text) + 4.5;
              const pillX = data.cell.x + (data.cell.width - tw) / 2;
              const pillY = data.cell.y + 2.5;

              doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
              doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
              doc.setLineWidth(0.25);
              doc.roundedRect(pillX, pillY, tw, 4.8, 1, 1, "FD");

              doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
              doc.text(text, pillX + 2.2, pillY + 3.4);

              doc.setFont("helvetica", "normal");
              doc.setTextColor(15, 23, 42);
            }
          }
        },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.getHeight();

          // Signatories at bottom (Raised up with comfortable 14mm page bottom margin)
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);

          // Left Dean Signature
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("DIRECTORATE REPORT CERTIFIED BY:", margin + 2, pageHeight - 26);
          doc.setDrawColor(51, 65, 85);
          doc.setLineWidth(0.3);
          doc.line(margin + 2, pageHeight - 21, margin + 95, pageHeight - 21);
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(deanName, margin + 2, pageHeight - 17.5);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text("College Dean, CITE", margin + 2, pageHeight - 14);

          // Right Footer Notes
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(148, 163, 184);
          doc.text("COLLinSight Directorate Analytics · LCUP CITE Executive Ledger", pageWidth - margin, pageHeight - 14, { align: "right" });
        },
      });

      // Output real binary PDF
      const pdfBlob = doc.output("blob");
      const fileName = `${docRef}_Directorate_Report.pdf`;

      // Upload genuine vector PDF to Supabase Storage
      const selectedOrg = organizations.find((o) => o.id === orgFilter);
      const targetOrgName = selectedOrg ? selectedOrg.name : "Administration";

      uploadGeneratedReport({
        organizationName: targetOrgName,
        dateGenerated: new Date(),
        file: pdfBlob,
        fileName,
      }).then((res) => {
        addExportedReport({
          id: crypto.randomUUID(),
          title: `Executive Directorate Analytics Report (${filteredEvents.length} events)`,
          docRef,
          category: "Directorate Summary",
          organizationName: targetOrgName,
          generatedBy: deanName,
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

      toast.success("Directorate Report Exported", `PDF (${(pdfBlob.size / 1024).toFixed(1)} KB) compiled and archived.`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Export Failed", "Could not compile Directorate Report.");
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Cross-Organizational Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">System-wide analytics and financial audit records for all CITE organizations.</p>
        </div>
        <Button variant="outline" onClick={handleExportPdf} className="gap-2 shadow-2xs">
          <FileDown size={16} /> Export to PDF
        </Button>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab("events")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-2xs ${
            tab === "events"
              ? "bg-[var(--primary)] text-white shadow-xs"
              : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Events Report
        </button>
        <button
          onClick={() => setTab("finance")}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-2xs ${
            tab === "finance"
              ? "bg-[var(--primary)] text-white shadow-xs"
              : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Finance Report
        </button>
      </div>

      {/* ── EVENTS TAB ── */}
      {tab === "events" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Events"
              value={allEvents.length}
              icon={<CalendarDays size={18} />}
              color="bg-teal-700 text-white"
              chip={<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-bold">All Orgs</span>}
            />
            <StatCard
              label="Approved Events"
              value={approved.length}
              icon={<CalendarCheck size={18} />}
              color="bg-emerald-600 text-white"
              chip={<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">Cleared</span>}
            />
            <StatCard
              label="In Signatory Flow"
              value={pendingEvents.length}
              icon={<Clock size={18} />}
              color="bg-amber-600 text-white"
              chip={<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">In Review</span>}
            />
            <StatCard
              label="Closed / Reconciled"
              value={closedEvents.length}
              icon={<CheckCheck size={18} />}
              color="bg-slate-700 text-white"
              chip={<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-300 font-bold">Reconciled</span>}
            />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader><h2 className="font-semibold text-[var(--foreground)]">Events per Organization</h2></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={orgData} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 shadow-xl p-3 rounded-xl text-xs space-y-1">
                              <p className="font-bold text-slate-900">{item.name}</p>
                              <p className="font-mono text-teal-800 font-bold">{item.events} Events Registered</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="events" name="Events" fill="#0d9488" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>

            <Card>
              <CardHeader><h2 className="font-semibold text-[var(--foreground)]">Events by Status Distribution</h2></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie
                      data={["Approved", "For Review", "For Approval", "Completed", "Closed"].map((s) => ({
                        name: s,
                        value: allEvents.filter((e) => e.status === s).length,
                      })).filter((d) => d.value > 0)}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ name, percent }) => `${name} ${percent !== undefined ? (percent * 100).toFixed(0) : 0}%`}
                    >
                      {allEvents.slice(0, 6).map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0];
                          return (
                            <div className="bg-white border border-slate-200 shadow-xl p-3 rounded-xl text-xs space-y-1">
                              <p className="font-bold text-slate-900">{item.name}</p>
                              <p className="font-mono text-teal-800 font-bold">{item.value} Events</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {/* ── FINANCE TAB ── */}
      {tab === "finance" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard
              label="Total Budget Allocation"
              value={formatCurrency(totalBudget)}
              icon={<Wallet size={18} />}
              color="bg-teal-700 text-white"
              chip={<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 font-bold">Allocated</span>}
            />
            <StatCard
              label="Total Disbursed Expenses"
              value={formatCurrency(totalSpent)}
              icon={<CreditCard size={18} />}
              color="bg-amber-600 text-white"
              chip={<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 font-bold">{spentPercentage}% Spent</span>}
            />
            <StatCard
              label="Remaining Treasury"
              value={formatCurrency(remainingTreasury)}
              icon={<Coins size={18} />}
              color="bg-emerald-600 text-white"
              chip={<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">{unspentPercentage}% Net</span>}
            />
          </div>

          {/* Bar Chart: Budget vs Spending by Organization */}
          <Card>
            <CardHeader><h2 className="font-semibold text-[var(--foreground)]">Budget vs. Spending by Organization</h2></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={orgData} margin={{ left: -10, right: 10, top: 10, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200/90 shadow-2xl p-3.5 rounded-2xl text-xs space-y-2 min-w-[200px] z-50">
                            <p className="font-bold text-[var(--foreground)] leading-snug border-b border-[var(--border)] pb-1.5">
                              {item.name}
                            </p>
                            <div className="space-y-1.5 font-mono">
                              <div className="flex items-center justify-between gap-3 text-slate-700">
                                <span className="flex items-center gap-1.5 font-sans font-medium text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400" /> Budget:
                                </span>
                                <span className="font-bold text-teal-800">{formatCurrency(item.budget)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-slate-700">
                                <span className="flex items-center gap-1.5 font-sans font-medium text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-teal-700" /> Spent:
                                </span>
                                <span className="font-bold text-teal-950">{formatCurrency(item.spent)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="budget" fill="#ccfbf1" radius={[4, 4, 0, 0]} name="Budget" />
                  <Bar dataKey="spent" fill="#0d9488" radius={[4, 4, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>

          {/* Line Chart: Budget vs Spending Trend Timeline */}
          <Card>
            <CardHeader className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">Budget vs. Spending Timeline Trend</h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Chronological comparison of proposed allocations versus actual disbursed expenditures across approved events.</p>
              </div>
            </CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart data={financialTrendData} margin={{ left: -10, right: 15, top: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.6} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200/90 shadow-2xl p-3.5 rounded-2xl text-xs space-y-2 min-w-[210px] z-50">
                            <div>
                              <p className="font-bold text-[var(--foreground)] leading-snug">{item.fullName}</p>
                              <p className="text-[10px] font-mono text-[var(--muted-foreground)]">{item.orgCode} · {item.date}</p>
                            </div>
                            <div className="space-y-1.5 font-mono border-t border-[var(--border)] pt-1.5">
                              <div className="flex items-center justify-between gap-3 text-slate-700">
                                <span className="flex items-center gap-1.5 font-sans font-medium text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-teal-600" /> Proposed Budget:
                                </span>
                                <span className="font-bold text-teal-800">{formatCurrency(item.budget)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-slate-700">
                                <span className="flex items-center gap-1.5 font-sans font-medium text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Total Spent:
                                </span>
                                <span className="font-bold text-amber-900">{formatCurrency(item.spent)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="budget" stroke="#0d9488" strokeWidth={2.5} dot={{ r: 4, fill: "#0d9488" }} activeDot={{ r: 6 }} name="Proposed Budget" />
                  <Line type="monotone" dataKey="spent" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4, fill: "#f59e0b" }} activeDot={{ r: 6 }} name="Actual Spent" />
                </LineChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </>
      )}

      {/* ── UNIFIED FILTER TOOLBAR & ALL EVENTS TABLE ── */}
      <Card>
        <CardHeader className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border)]">
          <div>
            <h2 className="font-semibold text-base text-[var(--foreground)]">All Events Record</h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Showing {filteredEvents.length} of {allEvents.length} total institutional initiatives</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Input */}
            <div className="relative flex items-center min-w-[180px]">
              <Search size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
              <input
                type="text"
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs hover:border-[var(--primary)]/40 transition"
              />
            </div>

            {/* Organization Filter Dropdown */}
            <div className="relative flex items-center">
              <Building2 size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
              <select
                value={orgFilter}
                onChange={(e) => setOrgFilter(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs hover:border-[var(--primary)]/40 transition"
              >
                <option value="All">All Organizations</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>{o.code}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 text-[var(--muted-foreground)] pointer-events-none" />
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative flex items-center">
              <Filter size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs hover:border-[var(--primary)]/40 transition"
              >
                {STATUS_FILTERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 text-[var(--muted-foreground)] pointer-events-none" />
            </div>

            {/* Sort Key Dropdown */}
            <div className="relative flex items-center">
              <ArrowUpDown size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="pl-8 pr-7 py-1.5 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs hover:border-[var(--primary)]/40 transition"
              >
                <option value="dateStart">Date</option>
                <option value="name">Event Name (A-Z)</option>
                <option value="org">Organization</option>
                <option value="proposedBudget">Budget</option>
                <option value="spent">Spent</option>
                <option value="status">Status</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 text-[var(--muted-foreground)] pointer-events-none" />
            </div>

            {/* Sort Direction Button */}
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="w-8 h-8 flex items-center justify-center border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 hover:border-[var(--primary)]/40 transition cursor-pointer shadow-2xs"
              title={sortDir === "asc" ? "Ascending — Click to sort Descending" : "Descending — Click to sort Ascending"}
            >
              {sortDir === "asc" ? (
                <ArrowUpNarrowWide size={14} className="text-[var(--primary)]" />
              ) : (
                <ArrowDownWideNarrow size={14} className="text-[var(--primary)]" />
              )}
            </button>
          </div>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] min-w-[200px]">Event</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap w-[60px]">Org</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap w-[100px]">Type</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap min-w-[105px]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap">Spent</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-xs text-[var(--muted-foreground)]">
                    No events matched the selected filters.
                  </td>
                </tr>
              ) : (
                filteredEvents.map((e) => {
                  const org = organizations.find((o) => o.id === e.organizationId);
                  const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
                  return (
                    <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/60 transition-colors">
                      <td className="px-4 py-3 font-medium min-w-[200px]">
                        <button
                          type="button"
                          onClick={() => {
                            setViewEvent(e);
                            setViewTab("details");
                          }}
                          className="text-left font-semibold text-[var(--primary)] hover:underline cursor-pointer block leading-snug"
                          title="Click to view event details"
                        >
                          {e.name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-teal-800 whitespace-nowrap">{org?.code}</td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap max-w-[105px] truncate" title={getEventTypeById(e.typeId)?.name}>
                        {getEventTypeById(e.typeId)?.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap min-w-[105px]">{formatDate(e.dateStart)}</td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{formatCurrency(e.proposedBudget)}</td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-[var(--primary)] font-semibold">{formatCurrency(spent)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${statusColors[e.status]}`}>
                          {e.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Event Details Dialog */}
      {viewEvent && (
        <Dialog open={!!viewEvent} onClose={() => setViewEvent(null)} title={viewEvent.name} size="xl">
          <div className="flex flex-col min-h-0 flex-1">
            <div className="sticky top-0 z-20 bg-white border-b border-[var(--border)] px-6 pt-4 shadow-2xs">
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

            <div className="p-6">
              {viewTab === "details" && (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Name</p>
                    <p className="font-semibold text-[var(--foreground)]">{viewEvent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Type</p>
                    <p className="font-medium">{getEventTypeById(viewEvent.typeId)?.name || "—"}</p>
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
                    <p className="font-medium">{viewEvent.mode === "Online/Virtual" ? "Online" : viewEvent.mode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Date & Time</p>
                    <p className="font-medium">
                      {viewEvent.dateStart && viewEvent.dateEnd
                        ? `${formatDateTime(viewEvent.dateStart)} – ${formatDateTime(viewEvent.dateEnd)}`
                        : viewEvent.dateStart
                        ? formatDateTime(viewEvent.dateStart)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">
                      {viewEvent.mode === "Online/Virtual" ? "Platform / Link" : "Location"}
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
                      <p className="font-medium">{viewEvent.location || "—"}</p>
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

            <div className="flex justify-between px-6 pb-6 pt-4 border-t border-[var(--border)] flex-wrap gap-3">
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
