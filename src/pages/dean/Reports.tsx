import { useState, useMemo, useRef, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  StatCard,
  Dialog,
  Tabs,
  SignatoryProgress,
  RefreshButton,
  SkeletonStatCard,
  SkeletonChart,
  SkeletonTable,
} from "../../components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid
} from "recharts";
import {
  FileDown, CalendarDays, CalendarCheck, Clock, CheckCheck, Wallet, CreditCard, Coins,
  Search, Filter, ArrowUpDown, ChevronDown, ArrowUpNarrowWide, ArrowDownWideNarrow,
  Building2, FileText, FileSpreadsheet, ExternalLink, Check
} from "lucide-react";
import {
  formatCurrency, formatDate, formatDateTime, statusColors, getStatusBadgeClass, getEventTypeById,
  Event, EventStatus, EventSetting, isWebUrl, toWebUrl, resolvePdfUrl, isExcelFile,
  DateRangeFilter, DATE_RANGE_LABELS, getDefaultSchoolYears, formatSchoolYear, getCurrentSchoolYear, isDateInReportRange
} from "../../services/dataService";
import { uploadGeneratedReport } from "../../services/storageService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getLcupLogoDataUrl, getCiteLogoDataUrl, getImageUrlDataUrl, drawPdfHeader } from "../../services/pdfDocuments";
import EventHistoryTimeline from "../../components/events/EventHistoryTimeline";
import EventClearanceTab from "../../components/events/EventClearanceTab";
import EventFinanceTab from "../../components/events/EventFinanceTab";

const COLORS = ["#ea580c", "#3b82f6", "#6366f1", "#f59e0b", "#10b981", "#64748b"];

const PIE_RGB_COLORS: [number, number, number][] = [
  [234, 88, 12],   // #ea580c (Orange)
  [59, 130, 246],  // #3b82f6 (Blue)
  [99, 102, 241],  // #6366f1 (Indigo)
  [245, 158, 11],  // #f59e0b (Amber)
  [16, 185, 129],  // #10b981 (Emerald)
  [100, 116, 139], // #64748b (Slate)
];


const STATUS_FILTERS = [
  "All",
  "Created",
  "For Review",
  "For Approval",
  "Approved",
  "SDS Authorized",
  "CMO Authorized",
  "Pending Revision",
  "Rejected",
  "Completed",
  "Closed",
];

export default function DeanReports() {
  const { events, transactions, users, organizations, exportedReports, addExportedReport, isLoading } = useApp();
  const { toast } = useToast();
  const [tab, setTab] = useState<"events" | "finance">("events");

  // Global Date Filter State & Popover Control
  const defaultSY = getDefaultSchoolYears();
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [syStartYear, setSyStartYear] = useState<number | string>(defaultSY.startYear);
  const [syEndYear, setSyEndYear] = useState<number | string>(defaultSY.endYear);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter popover on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setFilterPopoverOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    { id: "details", label: "Event Details" },
    { id: "compliance", label: "Event Compliance" },
    { id: "clearance", label: "Event Clearance", dividerAfter: true },
    { id: "history", label: "History" },
    { id: "finance", label: "Finance" },
  ];

  const allEvents = useMemo(() => {
    return events.filter((e) => !e.deleted && isDateInReportRange(e.dateStart, dateRange, syStartYear, syEndYear));
  }, [events, dateRange, syStartYear, syEndYear]);

  const approved = useMemo(() => {
    return allEvents.filter((e) => ["Approved", "SDS Authorized", "CMO Authorized", "Completed", "Closed"].includes(e.status));
  }, [allEvents]);

  const pendingEvents = useMemo(() => {
    return allEvents.filter((e) => ["For Review", "For Approval"].includes(e.status));
  }, [allEvents]);

  const closedEvents = useMemo(() => {
    return allEvents.filter((e) => e.status === "Closed");
  }, [allEvents]);

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
    const orgEvents = allEvents.filter((e) => e.organizationId === org.id);
    const spent = transactions.filter((t) => orgEvents.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);
    return { name: org.code, events: orgEvents.length, spent, budget: org.allocatedBudget };
  });

  // Shared status distribution data for Events tab pie chart (matching UI and PDF)
  const statusPieData = useMemo(() => {
    return ["Approved", "For Review", "For Approval", "Completed", "Closed"]
      .map((s) => ({
        name: s,
        value: allEvents.filter((e) => e.status === s).length,
      }))
      .filter((d) => d.value > 0);
  }, [allEvents]);

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
    const isEventsTab = tab === "events";
    const docRef = `REP-DEAN-${isEventsTab ? "EVT" : "FIN"}-${Date.now().toString().slice(-6)}`;
    const generatedDate = formatDateTime(new Date().toISOString());
    const filterLabel =
      dateRange === "school_year"
        ? `S.Y. ${formatSchoolYear(syStartYear, syEndYear)}`
        : DATE_RANGE_LABELS[dateRange];

    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 297;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2; // 269mm

      // Load Official Logos (LCUP, CITE, and Organization)
      const selectedOrg = organizations.find((o) => o.id === orgFilter);
      const [lcupLogoDataUrl, citeLogoDataUrl, orgLogoDataUrl] = await Promise.all([
        getLcupLogoDataUrl(),
        getCiteLogoDataUrl(),
        getImageUrlDataUrl(selectedOrg?.logoUrl),
      ]);

      // ── 1. HEADER SECTION (TRIPLE LOGOS + HEADER LEFT + HEADER RIGHT) ──
      const badgeText = isEventsTab
        ? `DIRECTORATE EVENTS REPORT · ${filterLabel.toUpperCase()}`
        : `DIRECTORATE FINANCE REPORT · ${filterLabel.toUpperCase()}`;

      drawPdfHeader({
        doc,
        pageWidth,
        margin,
        lcupLogoDataUrl,
        citeLogoDataUrl,
        orgLogoDataUrl,
        orgCode: selectedOrg?.code || (orgFilter !== "All" ? orgFilter : "CITE"),
        subtitle: isEventsTab
          ? "Office of the College Dean · Cross-Organizational Directorate Events Report"
          : "Office of the College Dean · Cross-Organizational Directorate Financial Report",
        badgeText,
        docRef,
        generatedDate,
      });

      // Signatory footer drawer for autoTable
      const drawPdfFooter = () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("DIRECTORATE REPORT CERTIFIED BY:", margin + 2, pageHeight - 24);
        doc.setDrawColor(51, 65, 85);
        doc.setLineWidth(0.3);
        doc.line(margin + 2, pageHeight - 19, margin + 95, pageHeight - 19);
        doc.setFontSize(8);
        doc.setTextColor(15, 23, 42);
        doc.text(deanName, margin + 2, pageHeight - 15.5);
        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text("College Dean, CITE", margin + 2, pageHeight - 12);

        doc.setFontSize(6.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text(
          `COLLinSight Directorate ${isEventsTab ? "Events Analytics" : "Financial Audit"} · LCUP CITE Executive Ledger`,
          pageWidth - margin,
          pageHeight - 12,
          { align: "right" }
        );
      };

      const getStatusPillColors = (status: string, setting?: string) => {
        const s = status.toLowerCase();
        if (s.includes("sds") || s.includes("cmo")) {
          return { bg: [224, 231, 255], border: [165, 180, 252], text: [49, 46, 129] };
        }
        if (s.includes("approv") || s.includes("complet")) {
          return { bg: [236, 253, 245], border: [167, 243, 208], text: [4, 120, 87] };
        }
        if (s.includes("review") || s.includes("for app")) {
          return { bg: [239, 246, 255], border: [191, 219, 254], text: [29, 78, 216] };
        }
        if (s.includes("revis") || s.includes("reject")) {
          return { bg: [255, 241, 242], border: [254, 205, 211], text: [190, 18, 60] };
        }
        return { bg: [241, 245, 249], border: [203, 213, 225], text: [71, 85, 105] };
      };

      if (isEventsTab) {
        // ==============================================================
        // ── TAB A: EVENTS REPORT PDF GENERATION ───────────────────────
        // ==============================================================

        // 1. KPI Metric Boxes (4 columns)
        const kpiY = 43;
        const kpiH = 12;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, kpiY, contentWidth, kpiH, 1.5, 1.5, "FD");

        const colW = contentWidth / 4;

        // Total Events
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL PROPOSALS", margin + 4, kpiY + 4.5);
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`${allEvents.length} Events`, margin + 4, kpiY + 9.5);

        // Approved Events
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("APPROVED EVENTS", margin + colW + 4, kpiY + 4.5);
        doc.setFontSize(9.5);
        doc.setTextColor(16, 185, 129);
        doc.text(`${approved.length} Cleared`, margin + colW + 4, kpiY + 9.5);

        // In Signatory Flow
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("IN SIGNATORY FLOW", margin + colW * 2 + 4, kpiY + 4.5);
        doc.setFontSize(9.5);
        doc.setTextColor(217, 119, 6);
        doc.text(`${pendingEvents.length} In Review`, margin + colW * 2 + 4, kpiY + 9.5);

        // Closed / Reconciled
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("CLOSED / RECONCILED", margin + colW * 3 + 4, kpiY + 4.5);
        doc.setFontSize(9.5);
        doc.setTextColor(71, 85, 105);
        doc.text(`${closedEvents.length} Reconciled`, margin + colW * 3 + 4, kpiY + 9.5);

        // 2. Charts Row (2 visual cards)
        const chartRowY = 59;
        const chartCardW = (contentWidth - 6) / 2;
        const chartCardH = 40;

        // Chart 1: Events per Organization Bar Chart
        const c1X = margin;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(c1X, chartRowY, chartCardW, chartCardH, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text("EVENTS PER ORGANIZATION", c1X + 4, chartRowY + 5.5);

        const plotX1 = c1X + 16;
        const plotY1 = chartRowY + 10;
        const plotW1 = chartCardW - 24;
        const plotH1 = 24;

        const maxEventsCount = Math.max(1, ...orgData.map((o) => o.events));
        // Horizontal gridline
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        [0, 0.5, 1].forEach((r) => {
          const gy = plotY1 + plotH1 - r * plotH1;
          doc.line(plotX1, gy, plotX1 + plotW1, gy);
          const val = Math.round(r * maxEventsCount);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5);
          doc.setTextColor(148, 163, 184);
          doc.text(String(val), plotX1 - 2, gy + 1.2, { align: "right" });
        });

        const orgCount = orgData.length || 1;
        const step1 = plotW1 / orgCount;
        const barW1 = Math.min(14, step1 * 0.55);

        orgData.forEach((o, i) => {
          const bx = plotX1 + i * step1 + (step1 - barW1) / 2;
          const bh = (o.events / maxEventsCount) * plotH1;
          const by = plotY1 + plotH1 - bh;

          doc.setFillColor(234, 88, 12);
          doc.roundedRect(bx, by, barW1, Math.max(0.6, bh), 0.8, 0.8, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(5.5);
          doc.setTextColor(15, 23, 42);
          doc.text(String(o.events), bx + barW1 / 2, by - 1, { align: "center" });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(o.name, bx + barW1 / 2, plotY1 + plotH1 + 4, { align: "center" });
        });

        // Chart 2: Events by Status Distribution (Solid Pie Chart matching UI)
        const c2X = margin + chartCardW + 6;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(c2X, chartRowY, chartCardW, chartCardH, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text("EVENTS BY STATUS DISTRIBUTION", c2X + 4, chartRowY + 5.5);

        const totalPieSum = statusPieData.reduce((acc, d) => acc + d.value, 0);

        if (totalPieSum === 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text("No events in filter window.", c2X + chartCardW / 2, chartRowY + chartCardH / 2, { align: "center" });
        } else {
          const cx2 = c2X + 25;
          const cy2 = chartRowY + 24;
          const R2 = 13.5;

          let currentAngle = -Math.PI / 2;
          statusPieData.forEach((s, idx) => {
            const color = PIE_RGB_COLORS[idx % PIE_RGB_COLORS.length];
            const pct = s.value / totalPieSum;
            const sliceAngle = pct * (2 * Math.PI);
            const endAngle = currentAngle + sliceAngle;
            const steps = Math.max(16, Math.ceil(sliceAngle * 60));

            doc.setFillColor(color[0], color[1], color[2]);
            for (let i = 0; i < steps; i++) {
              const a1 = currentAngle + (i / steps) * sliceAngle;
              const a2 = currentAngle + ((i + 1) / steps) * sliceAngle;
              const x1 = cx2 + R2 * Math.cos(a1);
              const y1 = cy2 + R2 * Math.sin(a1);
              const x2 = cx2 + R2 * Math.cos(a2);
              const y2 = cy2 + R2 * Math.sin(a2);
              doc.triangle(cx2, cy2, x1, y1, x2, y2, "F");
            }
            currentAngle = endAngle;
          });

          // Legend on right side matching UI colors & percentages
          const legX2 = c2X + 46;
          const startLegY2 = chartRowY + 12;
          statusPieData.forEach((s, idx) => {
            const color = PIE_RGB_COLORS[idx % PIE_RGB_COLORS.length];
            const ly = startLegY2 + idx * 8.5;
            const pct = Math.round((s.value / totalPieSum) * 100);

            doc.setFillColor(color[0], color[1], color[2]);
            doc.circle(legX2 + 2, ly + 2.5, 2, "F");

            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.5);
            doc.setTextColor(51, 65, 85);
            doc.text(s.name, legX2 + 6, ly + 3.2);

            doc.setFont("helvetica", "normal");
            doc.setFontSize(6.5);
            doc.setTextColor(15, 23, 42);
            doc.text(`${s.value} (${pct}%)`, c2X + chartCardW - 4, ly + 3.2, { align: "right" });
          });
        }

        // 3. Events Table
        const rawEventRows = filteredEvents.map((e, idx) => {
          const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
          const orgCode = organizations.find((o) => o.id === e.organizationId)?.code || "CITE";
          const typeName = getEventTypeById(e.typeId)?.name || "General";

          return {
            idx: idx + 1,
            name: e.name,
            setting: e.setting,
            orgCode,
            typeName,
            date: formatDate(e.dateStart),
            budget: `PHP ${Number(e.proposedBudget || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            spent: `PHP ${Number(spent || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            status: e.status,
          };
        });

        const eventsTableData: (string | number)[][] = rawEventRows.map((r) => [
          r.idx,
          r.name,
          r.orgCode,
          r.typeName,
          r.date,
          r.budget,
          r.spent,
          r.status,
        ]);

        const totalEvtBudget = filteredEvents.reduce((s, e) => s + (e.proposedBudget || 0), 0);
        const totalEvtSpent = filteredEvents.reduce((s, e) => {
          const sp = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((st, t) => st + t.amount, 0);
          return s + sp;
        }, 0);

        eventsTableData.push([
          "",
          `TOTAL (${filteredEvents.length} Events)`,
          "",
          "",
          "",
          `PHP ${Number(totalEvtBudget || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `PHP ${Number(totalEvtSpent || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          "SUMMARY",
        ]);

        autoTable(doc, {
          startY: 104,
          head: [["#", "Event Proposal Name", "Org", "Event Type", "Event Date", "Allocated", "Disbursed", "Status"]],
          body: eventsTableData,
          theme: "plain",
          styles: {
            font: "helvetica",
            fontStyle: "normal",
            fontSize: 7.5,
            textColor: [15, 23, 42],
            cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
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
            2: { cellWidth: 20, fontStyle: "bold", textColor: [234, 88, 12] },
            3: { cellWidth: 32 },
            4: { cellWidth: 28 },
            5: { cellWidth: 32, halign: "right", fontStyle: "bold" },
            6: { cellWidth: 32, halign: "right", fontStyle: "bold", textColor: [15, 23, 42] },
            7: { cellWidth: 35, halign: "center" },
          },
          margin: { left: margin, right: margin, bottom: 34 },
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 7 && data.row.index < rawEventRows.length) {
              const rowObj = rawEventRows[data.row.index];
              if (rowObj) {
                const text = rowObj.status;
                const colors = getStatusPillColors(text, rowObj.setting);

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
          didDrawPage: drawPdfFooter,
        });
      } else {
        // ==============================================================
        // ── TAB B: FINANCE REPORT PDF GENERATION ──────────────────────
        // ==============================================================

        // 1. KPI Metric Boxes (3 columns)
        const kpiY = 43;
        const kpiH = 12;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, kpiY, contentWidth, kpiH, 1.5, 1.5, "FD");

        const colW = contentWidth / 3;

        // Total Budget Allocation
        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL BUDGET ALLOCATION", margin + 4, kpiY + 4.5);
        doc.setFontSize(9.5);
        doc.setTextColor(30, 64, 175);
        doc.text(
          `PHP ${Number(totalBudget || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          margin + 4,
          kpiY + 9.5
        );

        // Total Disbursed Expenses
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL DISBURSED EXPENSES", margin + colW + 4, kpiY + 4.5);
        doc.setFontSize(9.5);
        doc.setTextColor(194, 65, 12);
        doc.text(
          `PHP ${Number(totalSpent || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${spentPercentage}%)`,
          margin + colW + 4,
          kpiY + 9.5
        );

        // Remaining Treasury Balance
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text("REMAINING TREASURY BALANCE", margin + colW * 2 + 4, kpiY + 4.5);
        doc.setFontSize(9.5);
        doc.setTextColor(21, 128, 61);
        doc.text(
          `PHP ${Number(remainingTreasury || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${unspentPercentage}% Net)`,
          margin + colW * 2 + 4,
          kpiY + 9.5
        );

        // 2. Charts Row (2 visual cards)
        const chartRowY = 59;
        const chartCardW = (contentWidth - 6) / 2;
        const chartCardH = 40;

        // Chart 1: Budget vs. Spending by Organization (Grouped Bar Chart)
        const c1X = margin;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(c1X, chartRowY, chartCardW, chartCardH, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text("BUDGET VS. SPENDING BY ORGANIZATION", c1X + 4, chartRowY + 5.5);

        // Legend top right
        doc.setFillColor(147, 197, 253);
        doc.circle(c1X + chartCardW - 32, chartRowY + 5, 1.5, "F");
        doc.setFontSize(5.5);
        doc.setTextColor(30, 64, 175);
        doc.text("Budget", c1X + chartCardW - 28, chartRowY + 5.8);

        doc.setFillColor(234, 88, 12);
        doc.circle(c1X + chartCardW - 15, chartRowY + 5, 1.5, "F");
        doc.setTextColor(194, 65, 12);
        doc.text("Spent", c1X + chartCardW - 11, chartRowY + 5.8);

        const plotX1 = c1X + 16;
        const plotY1 = chartRowY + 10;
        const plotW1 = chartCardW - 24;
        const plotH1 = 24;

        const maxOrgFin = Math.max(1000, ...orgData.map((o) => Math.max(o.budget, o.spent)));

        // Horizontal gridlines & Y ticks
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        [0, 0.5, 1].forEach((r) => {
          const gy = plotY1 + plotH1 - r * plotH1;
          doc.line(plotX1, gy, plotX1 + plotW1, gy);
          const tickVal = Math.round(r * maxOrgFin);
          const tickLabel = tickVal >= 1000 ? `${(tickVal / 1000).toFixed(0)}k` : `${tickVal}`;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5);
          doc.setTextColor(148, 163, 184);
          doc.text(tickLabel, plotX1 - 2, gy + 1.2, { align: "right" });
        });

        const orgCount = orgData.length || 1;
        const step1 = plotW1 / orgCount;
        const pairBarW = Math.min(6, (step1 * 0.7) / 2);

        orgData.forEach((o, i) => {
          const centerX = plotX1 + i * step1 + step1 / 2;
          const bx = centerX - pairBarW - 0.5;
          const bh = (o.budget / maxOrgFin) * plotH1;
          const by = plotY1 + plotH1 - bh;

          const sx = centerX + 0.5;
          const sh = (o.spent / maxOrgFin) * plotH1;
          const sy = plotY1 + plotH1 - sh;

          // Budget bar
          doc.setFillColor(147, 197, 253);
          doc.roundedRect(bx, by, pairBarW, Math.max(0.5, bh), 0.5, 0.5, "F");

          // Spent bar
          doc.setFillColor(234, 88, 12);
          doc.roundedRect(sx, sy, pairBarW, Math.max(0.5, sh), 0.5, 0.5, "F");

          // Org Code label
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(o.name, centerX, plotY1 + plotH1 + 4, { align: "center" });
        });

        // Chart 2: Budget vs. Spending Timeline Trend (Line Chart)
        const c2X = margin + chartCardW + 6;
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(c2X, chartRowY, chartCardW, chartCardH, 1.5, 1.5, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text("BUDGET VS. SPENDING TIMELINE TREND", c2X + 4, chartRowY + 5.5);

        // Legend top right
        doc.setFillColor(59, 130, 246);
        doc.circle(c2X + chartCardW - 35, chartRowY + 5, 1.5, "F");
        doc.setFontSize(5.5);
        doc.setTextColor(30, 64, 175);
        doc.text("Budget", c2X + chartCardW - 31, chartRowY + 5.8);

        doc.setFillColor(234, 88, 12);
        doc.circle(c2X + chartCardW - 16, chartRowY + 5, 1.5, "F");
        doc.setTextColor(194, 65, 12);
        doc.text("Spent", c2X + chartCardW - 12, chartRowY + 5.8);

        if (financialTrendData.length === 0) {
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text("No approved event expenditures in filter period.", c2X + chartCardW / 2, chartRowY + chartCardH / 2, { align: "center" });
        } else {
          const plotX2 = c2X + 16;
          const plotY2 = chartRowY + 10;
          const plotW2 = chartCardW - 22;
          const plotH2 = 24;

          const maxTrend = Math.max(1000, ...financialTrendData.map((d) => Math.max(d.budget, d.spent)));

          // Gridlines
          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          [0, 0.5, 1].forEach((r) => {
            const gy = plotY2 + plotH2 - r * plotH2;
            doc.line(plotX2, gy, plotX2 + plotW2, gy);
            const tickVal = Math.round(r * maxTrend);
            const tickLabel = tickVal >= 1000 ? `${(tickVal / 1000).toFixed(0)}k` : `${tickVal}`;
            doc.setFont("helvetica", "normal");
            doc.setFontSize(5);
            doc.setTextColor(148, 163, 184);
            doc.text(tickLabel, plotX2 - 2, gy + 1.2, { align: "right" });
          });

          const step2 = financialTrendData.length > 1 ? plotW2 / (financialTrendData.length - 1) : plotW2 / 2;
          const budgetPts: { x: number; y: number }[] = [];
          const spentPts: { x: number; y: number }[] = [];

          financialTrendData.forEach((d, i) => {
            const px = financialTrendData.length === 1 ? plotX2 + plotW2 / 2 : plotX2 + i * step2;
            const pyB = plotY2 + plotH2 - (d.budget / maxTrend) * plotH2;
            const pyS = plotY2 + plotH2 - (d.spent / maxTrend) * plotH2;

            budgetPts.push({ x: px, y: pyB });
            spentPts.push({ x: px, y: pyS });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(4.5);
            doc.setTextColor(100, 116, 139);
            const shortName = d.name.length > 9 ? d.name.substring(0, 8) + "…" : d.name;
            doc.text(shortName, px, plotY2 + plotH2 + 4, { align: "center" });
          });

          // Draw Budget line (Blue)
          doc.setDrawColor(59, 130, 246);
          doc.setLineWidth(0.4);
          for (let i = 0; i < budgetPts.length - 1; i++) {
            doc.line(budgetPts[i].x, budgetPts[i].y, budgetPts[i + 1].x, budgetPts[i + 1].y);
          }
          budgetPts.forEach((pt) => {
            doc.setFillColor(59, 130, 246);
            doc.circle(pt.x, pt.y, 1, "F");
          });

          // Draw Spent line (Orange)
          doc.setDrawColor(234, 88, 12);
          doc.setLineWidth(0.4);
          for (let i = 0; i < spentPts.length - 1; i++) {
            doc.line(spentPts[i].x, spentPts[i].y, spentPts[i + 1].x, spentPts[i + 1].y);
          }
          spentPts.forEach((pt) => {
            doc.setFillColor(234, 88, 12);
            doc.circle(pt.x, pt.y, 1, "F");
          });
        }

        // 3. Finance Table 1: Cross-Organizational Allocation & Disbursement Breakdown
        const orgSummaryRows: (string | number)[][] = organizations.map((org, idx) => {
          const orgEvts = allEvents.filter((e) => e.organizationId === org.id);
          const spent = transactions
            .filter((t) => orgEvts.some((e) => e.id === t.eventId) && !t.deleted)
            .reduce((s, t) => s + t.amount, 0);
          const budget = org.allocatedBudget || 0;
          const balance = budget - spent;
          const utilPct = budget > 0 ? ((spent / budget) * 100).toFixed(1) + "%" : "0.0%";

          return [
            idx + 1,
            org.name,
            org.code,
            orgEvts.length,
            `PHP ${Number(budget).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `PHP ${Number(spent).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `PHP ${Number(balance).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            utilPct,
          ];
        });

        // Totals row
        orgSummaryRows.push([
          "",
          "INSTITUTIONAL TOTAL",
          "CITE",
          allEvents.length,
          `PHP ${Number(totalBudget || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `PHP ${Number(totalSpent || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `PHP ${Number(remainingTreasury || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `${spentPercentage}%`,
        ]);

        autoTable(doc, {
          startY: 104,
          head: [["#", "Organization Name", "Code", "Events", "Allocated Budget", "Total Disbursed", "Remaining Balance", "Utilization"]],
          body: orgSummaryRows,
          theme: "plain",
          styles: {
            font: "helvetica",
            fontStyle: "normal",
            fontSize: 7.5,
            textColor: [15, 23, 42],
            cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
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
            1: { cellWidth: 84, fontStyle: "bold" },
            2: { cellWidth: 18, fontStyle: "bold", textColor: [234, 88, 12] },
            3: { cellWidth: 16, halign: "center" },
            4: { cellWidth: 38, halign: "right", fontStyle: "bold" },
            5: { cellWidth: 38, halign: "right", fontStyle: "bold", textColor: [194, 65, 12] },
            6: { cellWidth: 38, halign: "right", fontStyle: "bold", textColor: [21, 128, 61] },
            7: { cellWidth: 28, halign: "center", fontStyle: "bold" },
          },
          margin: { left: margin, right: margin, bottom: 34 },
          didDrawPage: drawPdfFooter,
        });

        // 4. Finance Table 2: Event-Level Financial Audit & Variance Ledger
        const lastFinalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 120;
        const pageHeight = doc.internal.pageSize.getHeight();
        let secondTableStartY = lastFinalY + 7;

        // If not enough room on current page, create a new page
        if (secondTableStartY + 35 > pageHeight - 34) {
          doc.addPage();
          secondTableStartY = 20;
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(30, 64, 175);
        doc.text("EVENT-LEVEL FINANCIAL AUDIT & RECONCILIATION LEDGER", margin, secondTableStartY - 2);

        const eventFinanceRows: (string | number)[][] = filteredEvents.map((e, idx) => {
          const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
          const variance = (e.proposedBudget || 0) - spent;
          const orgCode = organizations.find((o) => o.id === e.organizationId)?.code || "CITE";

          return [
            idx + 1,
            e.name,
            orgCode,
            formatDate(e.dateStart),
            `PHP ${Number(e.proposedBudget || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `PHP ${Number(spent || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            `${variance >= 0 ? "+" : ""}PHP ${Number(variance).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            e.status,
          ];
        });

        const sumProposed = filteredEvents.reduce((s, e) => s + (e.proposedBudget || 0), 0);
        const sumSpent = filteredEvents.reduce((s, e) => {
          const sp = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((st, t) => st + t.amount, 0);
          return s + sp;
        }, 0);
        const sumVariance = sumProposed - sumSpent;

        eventFinanceRows.push([
          "",
          `TOTAL DISBURSEMENTS (${filteredEvents.length} Events)`,
          "",
          "",
          `PHP ${Number(sumProposed || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `PHP ${Number(sumSpent || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          `${sumVariance >= 0 ? "+" : ""}PHP ${Number(sumVariance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          "RECONCILED",
        ]);

        autoTable(doc, {
          startY: secondTableStartY,
          head: [["#", "Event Name", "Org", "Date", "Proposed Budget", "Disbursed Spent", "Net Variance", "Status"]],
          body: eventFinanceRows,
          theme: "plain",
          styles: {
            font: "helvetica",
            fontStyle: "normal",
            fontSize: 7.5,
            textColor: [15, 23, 42],
            cellPadding: { top: 3.2, bottom: 3.2, left: 3, right: 3 },
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
            2: { cellWidth: 18, fontStyle: "bold", textColor: [234, 88, 12] },
            3: { cellWidth: 26 },
            4: { cellWidth: 35, halign: "right", fontStyle: "bold" },
            5: { cellWidth: 35, halign: "right", fontStyle: "bold", textColor: [194, 65, 12] },
            6: { cellWidth: 35, halign: "right", fontStyle: "bold", textColor: [21, 128, 61] },
            7: { cellWidth: 30, halign: "center" },
          },
          margin: { left: margin, right: margin, bottom: 34 },
          didDrawCell: (data) => {
            if (data.section === "body" && data.column.index === 7 && data.row.index < eventFinanceRows.length - 1) {
              const rowObj = filteredEvents[data.row.index];
              if (rowObj) {
                const text = rowObj.status;
                const colors = getStatusPillColors(text, rowObj.setting);

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
          didDrawPage: drawPdfFooter,
        });
      }

      // Output real binary PDF
      const pdfBlob = doc.output("blob");
      const fileName = `${docRef}_Directorate_${isEventsTab ? "Events" : "Finance"}_Report.pdf`;

      // Upload genuine vector PDF to Supabase Storage
      const targetOrgName = selectedOrg ? selectedOrg.name : "Administration";

      uploadGeneratedReport({
        organizationName: targetOrgName,
        dateGenerated: new Date(),
        file: pdfBlob,
        fileName,
      })
        .then((res) => {
          addExportedReport({
            id: crypto.randomUUID(),
            title: isEventsTab
              ? `Executive Directorate Events Analytics Report (${filteredEvents.length} events)`
              : `Executive Directorate Financial Audit Report (${organizations.length} organizations)`,
            docRef,
            category: "Directorate Summary",
            organizationName: targetOrgName,
            generatedBy: deanName,
            generatedAt: new Date().toISOString(),
            fileUrl: res.publicUrl,
            filePath: res.path,
            format: "PDF",
          });
        })
        .catch((e) => console.warn("Storage archive error:", e));

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

      toast.success(
        `${isEventsTab ? "Events" : "Finance"} Report Exported`,
        `PDF (${(pdfBlob.size / 1024).toFixed(1)} KB) compiled and archived.`
      );
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Export Failed", `Could not compile ${isEventsTab ? "Events" : "Finance"} Report.`);
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
        <div className="flex items-center gap-2">
          {/* Global Filter Popover Button */}
          <div className="relative" ref={filterRef}>
            <Button
              variant={dateRange !== "all" ? "primary" : "outline"}
              onClick={() => setFilterPopoverOpen((prev) => !prev)}
              className="gap-2 shadow-2xs relative"
            >
              <Filter size={15} />
              <span>Filter</span>
              {dateRange !== "all" && (
                <span className="text-[10px] font-bold bg-white/20 text-white px-1.5 py-0.5 rounded-full">
                  {dateRange === "week"
                    ? "Week"
                    : dateRange === "month"
                    ? "Month"
                    : dateRange === "semester"
                    ? "6-Mo"
                    : `S.Y. ${formatSchoolYear(syStartYear, syEndYear)}`}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform duration-200 ${filterPopoverOpen ? "rotate-180" : ""}`} />
            </Button>

            {/* Filter Dropdown Popover */}
            {filterPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Date Window Filter</span>
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)]">Global</span>
                </div>
                <div className="space-y-1">
                  {(Object.keys(DATE_RANGE_LABELS) as DateRangeFilter[]).map((rangeKey) => {
                    const isSelected = dateRange === rangeKey;
                    return (
                      <div key={rangeKey} className="space-y-1.5">
                        <button
                          onClick={() => {
                            setDateRange(rangeKey);
                            if (rangeKey !== "school_year") {
                              setFilterPopoverOpen(false);
                            }
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl font-medium transition cursor-pointer ${
                            isSelected
                              ? "bg-[var(--primary)] text-white font-semibold"
                              : "text-[var(--foreground)] hover:bg-[var(--muted)]"
                          }`}
                        >
                          <span>{DATE_RANGE_LABELS[rangeKey]}</span>
                          {isSelected && <Check size={14} />}
                        </button>

                        {/* School Year two fields (Start and End) shown when School Year filter is selected */}
                        {rangeKey === "school_year" && isSelected && (
                          <div className="p-2.5 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] mt-1 space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-[10px] font-mono font-bold text-[var(--foreground)] uppercase">
                                Academic Year (S.Y.)
                              </label>
                              <span className="text-[9px] font-mono text-[var(--muted-foreground)]">Aug – May</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1">
                                <span className="block text-[9px] text-[var(--muted-foreground)] font-semibold mb-0.5">Start</span>
                                <input
                                  type="number"
                                  value={syStartYear}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSyStartYear(val);
                                    if (val && !isNaN(Number(val)) && Number(val) > 1900) {
                                      setSyEndYear(Number(val) + 1);
                                    }
                                  }}
                                  placeholder="2025"
                                  className="w-full text-xs font-mono font-semibold px-2 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--foreground)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)] text-center"
                                />
                              </div>
                              <span className="text-sm font-bold text-[var(--muted-foreground)] pt-3">–</span>
                              <div className="flex-1">
                                <span className="block text-[9px] text-[var(--muted-foreground)] font-semibold mb-0.5">End</span>
                                <input
                                  type="number"
                                  value={syEndYear}
                                  onChange={(e) => setSyEndYear(e.target.value)}
                                  placeholder="2026"
                                  className="w-full text-xs font-mono font-semibold px-2 py-1.5 rounded-lg border border-[var(--border)] bg-white text-[var(--foreground)] focus:outline-hidden focus:ring-1 focus:ring-[var(--primary)] text-center"
                                />
                              </div>
                              <div className="pt-3">
                                <Button
                                  size="sm"
                                  onClick={() => setFilterPopoverOpen(false)}
                                  className="text-xs px-2.5 py-1.5 h-auto flex-shrink-0"
                                >
                                  Apply
                                </Button>
                              </div>
                            </div>
                            <p className="text-[10px] text-[var(--muted-foreground)] leading-tight">
                              Covers August 1, {syStartYear || "YYYY"} through May 31, {syEndYear || "YYYY+1"}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" onClick={handleExportPdf} className="gap-2 shadow-2xs">
            <FileDown size={16} /> Export {tab === "events" ? "Events" : "Finance"} PDF
          </Button>
          <RefreshButton />
        </div>
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

      {/* Active Filter Indicator Pill (if filtered) */}
      {dateRange !== "all" && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs font-medium w-fit">
          <Filter size={13} className="text-orange-600" />
          <span>
            Filtering by{" "}
            <strong>
              {dateRange === "school_year"
                ? `S.Y. ${formatSchoolYear(syStartYear, syEndYear)}`
                : DATE_RANGE_LABELS[dateRange]}
            </strong>{" "}
            · {allEvents.length} events
          </span>
          <button
            onClick={() => setDateRange("all")}
            className="ml-2 text-orange-700 hover:text-orange-950 font-bold underline text-[11px] cursor-pointer"
          >
            Reset to All Time
          </button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <SkeletonTable rows={6} cols={6} />
        </div>
      ) : (
        <>
      {/* ── EVENTS TAB ── */}
      {tab === "events" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Total Events"
              value={allEvents.length}
              icon={<CalendarDays size={18} />}
              color="bg-slate-800 text-white"
              chip={<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-bold">All Orgs</span>}
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
                              <p className="font-mono text-slate-900 font-bold">{item.events} Events Registered</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="events" name="Events" fill="#ea580c" radius={[6, 6, 0, 0]} />
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
                      data={statusPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={75}
                      label={({ name, percent }) => `${name} ${percent !== undefined ? (percent * 100).toFixed(0) : 0}%`}
                    >
                      {statusPieData.map((_, i) => (
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
                              <p className="font-mono text-slate-900 font-bold">{item.value} Events</p>
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
              color="bg-slate-800 text-white"
              chip={<span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 font-bold">Allocated</span>}
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
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> Budget:
                                </span>
                                <span className="font-bold text-slate-900">{formatCurrency(item.budget)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-slate-700">
                                <span className="flex items-center gap-1.5 font-sans font-medium text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600" /> Spent:
                                </span>
                                <span className="font-bold text-orange-950">{formatCurrency(item.spent)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="budget" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Budget" />
                  <Bar dataKey="spent" fill="#ea580c" radius={[4, 4, 0, 0]} name="Spent" />
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
                                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" /> Proposed Budget:
                                </span>
                                <span className="font-bold text-slate-900">{formatCurrency(item.budget)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-slate-700">
                                <span className="flex items-center gap-1.5 font-sans font-medium text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600" /> Total Spent:
                                </span>
                                <span className="font-bold text-orange-950">{formatCurrency(item.spent)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="budget" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4, fill: "#3b82f6" }} activeDot={{ r: 6 }} name="Proposed Budget" />
                  <Line type="monotone" dataKey="spent" stroke="#ea580c" strokeWidth={2.5} dot={{ r: 4, fill: "#ea580c" }} activeDot={{ r: 6 }} name="Actual Spent" />
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
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap">{org?.code}</td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap max-w-[105px] truncate" title={getEventTypeById(e.typeId)?.name}>
                        {getEventTypeById(e.typeId)?.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap min-w-[105px]">{formatDate(e.dateStart)}</td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{formatCurrency(e.proposedBudget)}</td>
                      <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-[var(--primary)] font-semibold">{formatCurrency(spent)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${getStatusBadgeClass(e.status, e.setting)}`}>
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
        </>
      )}

      {/* Event Details Dialog */}
      {viewEvent && (
        <Dialog open={!!viewEvent} onClose={() => setViewEvent(null)} title={viewEvent.name} size="xl">
          <div className="flex flex-col min-h-0 flex-1">
            <div className="sticky top-0 z-20 bg-white px-6 pt-4 shadow-2xs">
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
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Category</p>
                    <p className="font-semibold text-orange-700">{viewEvent.category || "Organizational"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Setting</p>
                    <p className="font-semibold text-blue-700">{viewEvent.setting || "On-campus"}</p>
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
                        {isExcelFile(viewEvent.apfUrl) ? (
                          <FileSpreadsheet size={16} className="text-emerald-600 flex-shrink-0" />
                        ) : (
                          <FileText size={16} className="text-[var(--primary)] flex-shrink-0" />
                        )}
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

                  {/* Parental Consent Form (PCF) for Off-campus events */}
                  {viewEvent.setting === "Off-campus" && (
                    <div className="bg-[var(--muted)] rounded-xl p-4">
                      <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">
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
                            className="text-sm font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1.5 break-all"
                          >
                            <span>{viewEvent.pcfName || viewEvent.pcfUrl.replace(/^.*[\\/]/, "")}</span>
                            <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--muted-foreground)]">No PCF uploaded yet for this off-campus event.</p>
                      )}
                    </div>
                  )}

                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">Appendices ({viewEvent.appendices?.length ?? 0})</p>
                    {viewEvent.appendices && viewEvent.appendices.length > 0 ? (
                      <ul className="text-sm space-y-1.5">
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
