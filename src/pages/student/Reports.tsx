import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  StatCard,
  RefreshButton,
  SkeletonStatCard,
  SkeletonChart,
  SkeletonTable,
} from "../../components/ui";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend
} from "recharts";
import {
  FileDown, BarChart2, Calendar, Wallet, CreditCard,
  ChevronDown, ArrowUpDown, ArrowUpNarrowWide, ArrowDownWideNarrow, Filter, TrendingUp,
  PieChart as PieChartIcon, Coins, Check, CheckCircle2, Layers, MapPin, FileSpreadsheet
} from "lucide-react";
import {
  formatCurrency, formatDate, formatDateTime, statusColors, getStatusBadgeClass,
  getEventTypeById, getCategoryById, Initiative
} from "../../services/dataService";
import { uploadGeneratedReport } from "../../services/storageService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { getInitiativeSourceBadgeClass } from "./Finance";

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

type DateRangeFilter = "all" | "week" | "month" | "semester";

const DATE_RANGE_LABELS: Record<DateRangeFilter, string> = {
  all: "All Time",
  week: "This Week",
  month: "This Month",
  semester: "This Semester (6-Month)",
};

const SETTING_COLORS = {
  "On-campus": "#ea580c",   // Vibrant Orange
  "Off-campus": "#3b82f6",  // Blue
};

function isDateInRange(dateStr: string, range: DateRangeFilter): boolean {
  if (range === "all") return true;
  if (!dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  const now = new Date();

  if (range === "week") {
    // Current calendar week (Sunday to Saturday)
    const day = now.getDay();
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0, 0);
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day), 23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  }
  if (range === "month") {
    // Strict current calendar month (same year & month)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (range === "semester") {
    // Academic semester window (1st Sem: Aug 1 to Jan 31; 2nd Sem: Feb 1 to Jul 31)
    const curMonth = now.getMonth();
    let semStart: Date;
    let semEnd: Date;
    if (curMonth >= 7) {
      // Aug (7) to Jan (0 of next year) -> 1st Semester
      semStart = new Date(now.getFullYear(), 7, 1, 0, 0, 0, 0);
      semEnd = new Date(now.getFullYear() + 1, 0, 31, 23, 59, 59, 999);
    } else if (curMonth === 0) {
      // Jan (0) belongs to 1st Semester starting Aug of previous year
      semStart = new Date(now.getFullYear() - 1, 7, 1, 0, 0, 0, 0);
      semEnd = new Date(now.getFullYear(), 0, 31, 23, 59, 59, 999);
    } else {
      // Feb (1) to Jul (6) -> 2nd Semester
      semStart = new Date(now.getFullYear(), 1, 1, 0, 0, 0, 0);
      semEnd = new Date(now.getFullYear(), 6, 31, 23, 59, 59, 999);
    }
    return d >= semStart && d <= semEnd;
  }
  return true;
}

export default function StudentReports() {
  const { currentUser } = useAuth();
  const {
    events,
    transactions,
    organizations,
    users,
    eventTypes,
    expenditureCategories,
    initiatives,
    addExportedReport,
    isLoading
  } = useApp();
  const { toast } = useToast();
  const orgId = currentUser?.organizationId ?? "";
  const org = organizations.find((o) => o.id === orgId);

  // Global Date Filter State & Popover Control
  const [dateRange, setDateRange] = useState<DateRangeFilter>("all");
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Table Sub-Tab & Filters
  const [tableTab, setTableTab] = useState<"expenditure" | "initiatives">("expenditure");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState("dateStart");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  // Filtered Events for this Organization
  const rawOrgEvents = useMemo(() => {
    return events.filter((e) => e.organizationId === orgId && !e.deleted);
  }, [events, orgId]);

  const orgEvents = useMemo(() => {
    return rawOrgEvents.filter((e) => isDateInRange(e.dateStart, dateRange));
  }, [rawOrgEvents, dateRange]);

  const filteredEvents = useMemo(() => {
    return orgEvents
      .filter((e) => statusFilter === "All" || e.status === statusFilter)
      .sort((a, b) => {
        let comparison = 0;
        if (sortKey === "proposedBudget") {
          comparison = a.proposedBudget - b.proposedBudget;
        } else if (sortKey === "dateStart") {
          comparison = new Date(a.dateStart).getTime() - new Date(b.dateStart).getTime();
        } else if (sortKey === "status") {
          comparison = a.status.localeCompare(b.status);
        } else {
          comparison = (a.name || "").localeCompare(b.name || "");
        }
        return sortDir === "asc" ? comparison : -comparison;
      });
  }, [orgEvents, statusFilter, sortKey, sortDir]);

  // Filtered Initiatives for this Organization
  const orgInitiatives = useMemo(() => {
    return (initiatives || [])
      .filter((i) => i.organizationId === orgId && !i.deleted && isDateInRange(i.date, dateRange))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [initiatives, orgId, dateRange]);

  const approvedEvents = useMemo(() => {
    return orgEvents.filter((e) =>
      ["Approved", "SDS Authorized", "CMO Authorized", "Completed", "Closed"].includes(e.status)
    );
  }, [orgEvents]);

  // Financial Computations
  const departmentalBudget = org?.departmentalBudget ?? org?.allocatedBudget ?? 0;
  const organizationalBudget = org?.organizationalBudget ?? 0;
  const totalAvailableBudget = departmentalBudget + organizationalBudget;

  const totalProposedBudget = orgEvents.reduce((s, e) => s + (e.proposedBudget || 0), 0);
  const totalSpent = transactions
    .filter((t) => approvedEvents.some((e) => e.id === t.eventId) && !t.deleted)
    .reduce((s, t) => s + t.amount, 0);

  const totalInitiativesRevenue = orgInitiatives.reduce(
    (sum, i) => sum + (i.amount ?? i.netProfit ?? i.grossRevenue ?? 0),
    0
  );

  const remainingBalance = totalAvailableBudget - totalSpent;

  // Chart 1: Events per Month Data (Semester-aligned 6-Month Window)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const startMonth = curMonth >= 7 || curMonth === 0 ? 7 : 1;
    const baseYear = curMonth === 0 ? now.getFullYear() - 1 : now.getFullYear();

    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(baseYear, startMonth + i, 1);
      const label = d.toLocaleString("default", { month: "short" });
      const count = orgEvents.filter((e) => {
        const ed = new Date(e.dateStart);
        return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
      }).length;
      return { name: label, events: count };
    });
  }, [orgEvents]);

  // Chart 2: Event Setting Distribution Data (On-campus vs Off-campus)
  const settingDistributionData = useMemo(() => {
    const onCampusCount = orgEvents.filter((e) => (e.setting || "On-campus") === "On-campus").length;
    const offCampusCount = orgEvents.filter((e) => e.setting === "Off-campus").length;
    const total = onCampusCount + offCampusCount;

    return [
      {
        name: "On-campus",
        value: onCampusCount,
        pct: total > 0 ? Math.round((onCampusCount / total) * 100) : 0,
        color: SETTING_COLORS["On-campus"],
      },
      {
        name: "Off-campus",
        value: offCampusCount,
        pct: total > 0 ? Math.round((offCampusCount / total) * 100) : 0,
        color: SETTING_COLORS["Off-campus"],
      },
    ];
  }, [orgEvents]);

  // Dynamic Signatories Resolution
  const orgAdviser = users.find(
    (u) => u.role === "adviser" && (u.organizationId === orgId || u.id === org?.adviserId)
  ) || users.find((u) => u.role === "adviser");

  const adviserName = orgAdviser
    ? `${orgAdviser.firstName} ${orgAdviser.middleName ? orgAdviser.middleName + " " : ""}${orgAdviser.lastName}${orgAdviser.suffix ? ", " + orgAdviser.suffix : ""}`
    : "Organization Adviser";

  const deanUser = users.find((u) => u.role === "dean");
  const deanName = deanUser
    ? `${deanUser.firstName} ${deanUser.middleName ? deanUser.middleName + " " : ""}${deanUser.lastName}${deanUser.suffix ? ", " + deanUser.suffix : ""}`
    : "Dr. Marilou Castro Villanueva, Ph.D.";

  const studentOfficerName = currentUser
    ? `${currentUser.firstName} ${currentUser.middleName ? currentUser.middleName + " " : ""}${currentUser.lastName}${currentUser.suffix ? ", " + currentUser.suffix : ""}`
    : "Student Finance Officer";

  const resolveTypeName = (typeId: string) => {
    return eventTypes.find((t) => t.id === typeId)?.name || getEventTypeById(typeId)?.name || "General Event";
  };

  // PDF Export Generation
  async function handleExportPdf() {
    const orgName = org?.name || "Student Organization";
    const orgCode = org?.code || "CITE-ORG";
    const docRef = `REP-${orgCode.toUpperCase()}-${Date.now().toString().slice(-6)}`;
    const generatedDate = formatDateTime(new Date().toISOString());
    const filterLabel = DATE_RANGE_LABELS[dateRange];

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
      // LCUP Logo Square (Dark Navy)
      doc.setFillColor(30, 58, 138); // #1e3a8a Dark Navy
      doc.roundedRect(margin, 12, 11, 11, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("LCUP", margin + 1.6, 19);

      // University & Department Titles
      doc.setTextColor(15, 23, 42); // #0f172a
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("LA CONSOLACION UNIVERSITY PHILIPPINES", margin + 14, 16);

      doc.setTextColor(71, 85, 105); // #475569
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("College of Information Technology & Engineering", margin + 14, 20);

      doc.setTextColor(234, 88, 12); // #ea580c
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text(`${orgName} (${orgCode}) · Institutional Activity & Financial Report`, margin + 14, 24);

      // Top Right: ACTIVITY & FINANCE REPORT Pill Badge + Filter Window
      const badgeText = `ACTIVITY & FINANCE REPORT · ${filterLabel.toUpperCase()}`;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const badgeW = doc.getTextWidth(badgeText) + 6;
      const badgeX = pageWidth - margin - badgeW;

      doc.setFillColor(255, 237, 213); // #ffedd5
      doc.setDrawColor(254, 215, 170); // #fed7aa
      doc.setLineWidth(0.3);
      doc.roundedRect(badgeX, 11.5, badgeW, 5.5, 1.2, 1.2, "FD");

      doc.setTextColor(154, 52, 18); // #9a3412
      doc.text(badgeText, badgeX + 3, 15.5);

      // Ref and Date below pill badge
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105); // #475569
      doc.text(`Ref: ${docRef}`, pageWidth - margin, 20.5, { align: "right" });
      doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 24.5, { align: "right" });

      // Orange Header Line Divider
      doc.setDrawColor(234, 88, 12); // #ea580c
      doc.setLineWidth(0.5);
      doc.line(margin, 28, pageWidth - margin, 28);

      // ── 2. KPI SUMMARY 5 METRIC BOXES ──────────────────────────────
      const kpiY = 32;
      const kpiH = 12;
      doc.setFillColor(248, 250, 252); // #f8fafc
      doc.setDrawColor(226, 232, 240); // #e2e8f0
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, kpiY, contentWidth, kpiH, 1.5, 1.5, "FD");

      const kpiColW = contentWidth / 5;

      // Col 1: Departmental Budget
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text("DEPT. BUDGET", margin + 3, kpiY + 4.5);
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`PHP ${departmentalBudget.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + 3, kpiY + 9.5);

      // Col 2: Org Budget (Initiatives)
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text("ORG. INITIATIVES", margin + kpiColW + 3, kpiY + 4.5);
      doc.setFontSize(8.5);
      doc.setTextColor(16, 185, 129);
      doc.text(`PHP ${organizationalBudget.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + kpiColW + 3, kpiY + 9.5);

      // Col 3: Total Available Budget
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL AVAILABLE", margin + kpiColW * 2 + 3, kpiY + 4.5);
      doc.setFontSize(8.5);
      doc.setTextColor(30, 58, 138);
      doc.text(`PHP ${totalAvailableBudget.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + kpiColW * 2 + 3, kpiY + 9.5);

      // Col 4: Total Disbursed (Spent)
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL DISBURSED", margin + kpiColW * 3 + 3, kpiY + 4.5);
      doc.setFontSize(8.5);
      doc.setTextColor(234, 88, 12);
      doc.text(`PHP ${totalSpent.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + kpiColW * 3 + 3, kpiY + 9.5);

      // Col 5: Remaining Treasury Balance
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text("NET BALANCE", margin + kpiColW * 4 + 3, kpiY + 4.5);
      doc.setFontSize(8.5);
      doc.setTextColor(remainingBalance >= 0 ? 21 : 220, remainingBalance >= 0 ? 128 : 38, remainingBalance >= 0 ? 61 : 38);
      doc.text(`PHP ${remainingBalance.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + kpiColW * 4 + 3, kpiY + 9.5);

      // ── 3. VISUAL CHARTS OVERVIEW (VECTOR DRAWINGS) ────────────────
      const chartRowY = 48;
      const chartCardW = (contentWidth - 12) / 3; // 3 columns for Donut 1, Donut 2, and Trend Line
      const chartCardH = 43;

      // ── Chart 1: Spending by Category Donut Chart ──────────────────
      const c1X = margin;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(c1X, chartRowY, chartCardW, chartCardH, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text("DISBURSEMENT BY CATEGORY", c1X + 4, chartRowY + 5.5);

      const orgTxns = transactions.filter((t) => orgEvents.some((e) => e.id === t.eventId) && !t.deleted);
      const catSpendMap = orgTxns.reduce<Record<string, number>>((acc, t) => {
        const name = expenditureCategories.find((c) => c.id === t.categoryId)?.name ?? getCategoryById(t.categoryId)?.name ?? "Other";
        acc[name] = (acc[name] || 0) + t.amount;
        return acc;
      }, {});

      const catColors = [
        [2, 132, 199],   // #0284c7 Sky Blue
        [245, 158, 11],  // #f59e0b Amber
        [124, 58, 237],  // #7c3aed Purple
        [234, 88, 12],   // #ea580c Orange
        [239, 68, 68],   // #ef4444 Red
        [16, 185, 129],  // #10b981 Emerald
        [100, 116, 139], // #64748b Slate
      ];

      const catEntries = Object.entries(catSpendMap)
        .map(([name, value], idx) => ({
          name,
          value,
          pct: totalSpent > 0 ? (value / totalSpent) * 100 : 0,
          color: catColors[idx % catColors.length],
        }))
        .sort((a, b) => b.value - a.value);

      if (catEntries.length === 0 || totalSpent === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("No category disbursements.", c1X + chartCardW / 2, chartRowY + chartCardH / 2, { align: "center" });
      } else {
        const cx = c1X + 18;
        const cy = chartRowY + 24;
        const R = 11;
        const innerR = 5.5;

        let currentAngle = -Math.PI / 2;
        catEntries.forEach((cat) => {
          const sliceAngle = (cat.pct / 100) * (2 * Math.PI);
          const endAngle = currentAngle + sliceAngle;
          const steps = Math.max(6, Math.ceil(sliceAngle * 14));

          doc.setFillColor(cat.color[0], cat.color[1], cat.color[2]);
          for (let i = 0; i < steps; i++) {
            const a1 = currentAngle + (i / steps) * sliceAngle;
            const a2 = currentAngle + ((i + 1) / steps) * sliceAngle;
            const x1 = cx + R * Math.cos(a1);
            const y1 = cy + R * Math.sin(a1);
            const x2 = cx + R * Math.cos(a2);
            const y2 = cy + R * Math.sin(a2);
            doc.triangle(cx, cy, x1, y1, x2, y2, "F");
          }
          currentAngle = endAngle;
        });

        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy, innerR, "F");

        const topCats = catEntries.slice(0, 4);
        const legX = c1X + 34;
        const startLegY = chartRowY + 10;
        topCats.forEach((cat, idx) => {
          const ly = startLegY + idx * 7;
          doc.setFillColor(cat.color[0], cat.color[1], cat.color[2]);
          doc.circle(legX + 2, ly + 2.5, 1.5, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(6);
          doc.setTextColor(51, 65, 85);
          const truncatedCatName = cat.name.length > 14 ? cat.name.substring(0, 13) + "…" : cat.name;
          doc.text(truncatedCatName, legX + 5, ly + 3.2);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(15, 23, 42);
          doc.text(`${cat.pct.toFixed(0)}%`, c1X + chartCardW - 3, ly + 3.2, { align: "right" });
        });
      }

      // ── Chart 2: Event Setting Distribution Donut Chart (On vs Off-campus) ─
      const c2X = margin + chartCardW + 6;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(c2X, chartRowY, chartCardW, chartCardH, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text("EVENT SETTING DISTRIBUTION", c2X + 4, chartRowY + 5.5);

      const totalSettingsEvents = orgEvents.length;
      if (totalSettingsEvents === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("No events in filter period.", c2X + chartCardW / 2, chartRowY + chartCardH / 2, { align: "center" });
      } else {
        const cx = c2X + 20;
        const cy = chartRowY + 24;
        const R = 11;
        const innerR = 5.5;

        let currentAngle = -Math.PI / 2;
        settingDistributionData.forEach((s) => {
          const sliceAngle = (s.pct / 100) * (2 * Math.PI);
          const endAngle = currentAngle + sliceAngle;
          const steps = Math.max(6, Math.ceil(sliceAngle * 14));

          if (s.name === "On-campus") {
            doc.setFillColor(234, 88, 12); // Orange
          } else {
            doc.setFillColor(59, 130, 246); // Blue
          }

          for (let i = 0; i < steps; i++) {
            const a1 = currentAngle + (i / steps) * sliceAngle;
            const a2 = currentAngle + ((i + 1) / steps) * sliceAngle;
            const x1 = cx + R * Math.cos(a1);
            const y1 = cy + R * Math.sin(a1);
            const x2 = cx + R * Math.cos(a2);
            const y2 = cy + R * Math.sin(a2);
            doc.triangle(cx, cy, x1, y1, x2, y2, "F");
          }
          currentAngle = endAngle;
        });

        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy, innerR, "F");

        const legX = c2X + 38;
        const startLegY = chartRowY + 12;
        settingDistributionData.forEach((s, idx) => {
          const ly = startLegY + idx * 10;
          if (s.name === "On-campus") {
            doc.setFillColor(234, 88, 12);
          } else {
            doc.setFillColor(59, 130, 246);
          }
          doc.circle(legX + 2, ly + 2.5, 2, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(51, 65, 85);
          doc.text(s.name, legX + 6, ly + 3.2);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6);
          doc.setTextColor(15, 23, 42);
          doc.text(`${s.value} (${s.pct}%)`, c2X + chartCardW - 3, ly + 3.2, { align: "right" });
        });
      }

      // ── Chart 3: Budget vs. Spending Trend Line Chart ──────────────
      const c3X = margin + (chartCardW + 6) * 2;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(c3X, chartRowY, chartCardW, chartCardH, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text("BUDGET VS. SPENDING TREND", c3X + 4, chartRowY + 5.5);

      // Top Legend
      doc.setFillColor(37, 99, 235);
      doc.circle(c3X + chartCardW - 35, chartRowY + 5, 1.5, "F");
      doc.setFontSize(5.5);
      doc.setTextColor(30, 64, 175);
      doc.text("Budget", c3X + chartCardW - 31, chartRowY + 5.8);

      doc.setFillColor(234, 88, 12);
      doc.circle(c3X + chartCardW - 16, chartRowY + 5, 1.5, "F");
      doc.setTextColor(194, 65, 12);
      doc.text("Spent", c3X + chartCardW - 12, chartRowY + 5.8);

      const trendData = approvedEvents.map((e) => ({
        name: e.name.length > 8 ? e.name.substring(0, 7) + "…" : e.name,
        budget: e.proposedBudget,
        spent: transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0),
      }));

      if (trendData.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text("No approved event expenditures.", c3X + chartCardW / 2, chartRowY + chartCardH / 2, { align: "center" });
      } else {
        const plotX = c3X + 14;
        const plotY = chartRowY + 11;
        const plotW = chartCardW - 18;
        const plotH = 22;

        const maxVal = Math.max(1000, ...trendData.map((d) => Math.max(d.budget, d.spent)));

        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        [0, 0.5, 1].forEach((ratio) => {
          const gy = plotY + plotH - ratio * plotH;
          doc.line(plotX, gy, plotX + plotW, gy);

          const tickVal = Math.round(ratio * maxVal);
          const tickLabel = tickVal >= 1000 ? `${(tickVal / 1000).toFixed(0)}k` : `${tickVal}`;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5);
          doc.setTextColor(148, 163, 184);
          doc.text(tickLabel, plotX - 2, gy + 1.2, { align: "right" });
        });

        const step = trendData.length > 1 ? plotW / (trendData.length - 1) : plotW / 2;
        const budgetPts: { x: number; y: number }[] = [];
        const spentPts: { x: number; y: number }[] = [];

        trendData.forEach((d, i) => {
          const px = trendData.length === 1 ? plotX + plotW / 2 : plotX + i * step;
          const pyB = plotY + plotH - (d.budget / maxVal) * plotH;
          const pyS = plotY + plotH - (d.spent / maxVal) * plotH;

          budgetPts.push({ x: px, y: pyB });
          spentPts.push({ x: px, y: pyS });

          doc.setFont("helvetica", "normal");
          doc.setFontSize(4.5);
          doc.setTextColor(100, 116, 139);
          doc.text(d.name, px, plotY + plotH + 4.5, { align: "center" });
        });

        doc.setDrawColor(37, 99, 235);
        doc.setLineWidth(0.4);
        for (let i = 0; i < budgetPts.length - 1; i++) {
          doc.line(budgetPts[i].x, budgetPts[i].y, budgetPts[i + 1].x, budgetPts[i + 1].y);
        }
        budgetPts.forEach((pt) => {
          doc.setFillColor(37, 99, 235);
          doc.circle(pt.x, pt.y, 1, "F");
        });

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

      // ── 4. TABLE 1: EVENT EXPENDITURE SUMMARY ───────────────────────
      const getStatusPillColors = (status: string, setting?: string) => {
        const s = status.toLowerCase();
        if (s.includes("sds")) {
          if (setting === "Off-campus") {
            // Lighter soft indigo
            return { bg: [238, 242, 255], border: [199, 210, 254], text: [67, 56, 202] }; // indigo-50 / indigo-700
          }
          // On-campus: standard light indigo bg, dark indigo text
          return { bg: [224, 231, 255], border: [165, 180, 252], text: [49, 46, 129] }; // indigo-100 / indigo-900
        }
        if (s.includes("cmo")) {
          // Off-campus CMO: standard light indigo bg, dark indigo text
          return { bg: [224, 231, 255], border: [165, 180, 252], text: [49, 46, 129] }; // indigo-100 / indigo-900
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

      const rawEventRows = filteredEvents.map((e, idx) => {
        const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
        const variance = (e.proposedBudget || 0) - spent;
        const typeName = resolveTypeName(e.typeId);

        return {
          idx: idx + 1,
          name: e.name,
          category: (e.category || "Organizational") === "Organizational" ? "Org." : "Dept.",
          setting: e.setting || "On-campus",
          typeName,
          date: formatDate(e.dateStart),
          budget: `PHP ${Number(e.proposedBudget || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          spent: `PHP ${Number(spent || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          variance: `${variance >= 0 ? "+" : ""}PHP ${Number(variance || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          status: e.status,
        };
      });

      const eventsTableData: (string | number)[][] = rawEventRows.map((r) => [
        r.idx,
        r.name,
        r.category,
        r.setting,
        r.typeName,
        r.date,
        r.budget,
        r.spent,
        r.variance,
        r.status,
      ]);

      const filteredBudgetTotal = filteredEvents.reduce((s, e) => s + (e.proposedBudget || 0), 0);
      const filteredSpentTotal = filteredEvents.reduce((s, e) => {
        const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((st, t) => st + t.amount, 0);
        return s + spent;
      }, 0);
      const filteredVarianceTotal = filteredBudgetTotal - filteredSpentTotal;

      eventsTableData.push([
        "",
        `TOTAL (${filteredEvents.length} Events)`,
        "",
        "",
        "",
        "",
        `PHP ${Number(filteredBudgetTotal || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `PHP ${Number(filteredSpentTotal || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `${filteredVarianceTotal >= 0 ? "+" : ""}PHP ${Number(filteredVarianceTotal || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "RECONCILED",
      ]);

      // Table 1 Section Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text("1. EVENT EXPENDITURE SUMMARY", margin, 99);

      autoTable(doc, {
        startY: 103,
        head: [["#", "Event Proposal Name", "Category", "Setting", "Type", "Event Date", "Proposed Budget", "Disbursed", "Variance", "Status"]],
        body: eventsTableData,
        theme: "plain",
        styles: {
          font: "helvetica",
          fontStyle: "normal",
          fontSize: 6.5,
          textColor: [15, 23, 42],
          cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
          lineWidth: { bottom: 0.15 },
          lineColor: [226, 232, 240],
          valign: "middle",
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [51, 65, 85],
          fontSize: 6.5,
          fontStyle: "bold",
          font: "helvetica",
          lineWidth: { bottom: 0.3 },
          lineColor: [203, 213, 225],
        },
        columnStyles: {
          0: { cellWidth: 7, halign: "center", font: "helvetica", textColor: [100, 116, 139] },
          1: { cellWidth: 54, fontStyle: "bold" },
          2: { cellWidth: 24 },
          3: { cellWidth: 20 },
          4: { cellWidth: 30 },
          5: { cellWidth: 22 },
          6: { cellWidth: 28, halign: "right", fontStyle: "bold" },
          7: { cellWidth: 28, halign: "right", fontStyle: "bold", textColor: [15, 23, 42] },
          8: { cellWidth: 28, halign: "right", fontStyle: "bold" },
          9: { cellWidth: 28, halign: "center" },
        },
        margin: { left: margin, right: margin },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 9 && data.row.index < rawEventRows.length) {
            const rowObj = rawEventRows[data.row.index];
            if (rowObj) {
              const text = rowObj.status;
              const colors = getStatusPillColors(text, rowObj.setting);

              doc.setFont("helvetica", "bold");
              doc.setFontSize(5.5);
              const tw = doc.getTextWidth(text) + 3.5;
              const pillX = data.cell.x + (data.cell.width - tw) / 2;
              const pillY = data.cell.y + 1.8;

              doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2]);
              doc.setDrawColor(colors.border[0], colors.border[1], colors.border[2]);
              doc.setLineWidth(0.2);
              doc.roundedRect(pillX, pillY, tw, 4, 0.8, 0.8, "FD");

              doc.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
              doc.text(text, pillX + 1.8, pillY + 2.8);

              doc.setFont("helvetica", "normal");
              doc.setTextColor(15, 23, 42);
            }
          }
        },
      });

      // ── 5. TABLE 2: ORGANIZATIONAL INITIATIVES REVENUE ──────────────
      const lastTable1Y = (doc as any).lastAutoTable.finalY + 8;

      // Check if Table 2 needs a new page
      let startTable2Y = lastTable1Y;
      if (startTable2Y > 160) {
        doc.addPage();
        startTable2Y = 18;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text("2. ORGANIZATIONAL INITIATIVES REVENUE (SELF-GENERATED FUNDS)", margin, startTable2Y);

      const rawInitRows = orgInitiatives.map((init, idx) => {
        const cleanDesc = (init.description || init.notes || "—").replace(/₱\s*/g, "PHP ");
        const cleanTitle = (init.title || init.name || "Initiative").replace(/₱\s*/g, "PHP ");
        return {
          idx: idx + 1,
          title: cleanTitle,
          source: init.source,
          date: formatDate(init.date),
          amount: `+PHP ${Number(init.amount ?? init.netProfit ?? 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          description: cleanDesc,
        };
      });

      const initiativesTableData: (string | number)[][] = rawInitRows.map((r) => [
        r.idx,
        r.title,
        r.source,
        r.date,
        r.amount,
        r.description,
      ]);

      initiativesTableData.push([
        "",
        `TOTAL INITIATIVES REVENUE (${orgInitiatives.length} Logged)`,
        "",
        "",
        `+PHP ${Number(totalInitiativesRevenue || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "CREDITED TO ORGANIZATIONAL TREASURY",
      ]);

      autoTable(doc, {
        startY: startTable2Y + 3,
        head: [["#", "Activity / Initiative Title", "Revenue Source", "Date Logged", "Net Revenue", "Breakdown & Notes"]],
        body: initiativesTableData.length > 1 ? initiativesTableData : [["—", "No organizational initiatives recorded in this reporting period.", "—", "—", "PHP 0.00", "—"]],
        theme: "plain",
        styles: {
          font: "helvetica",
          fontStyle: "normal",
          fontSize: 6.5,
          textColor: [15, 23, 42],
          cellPadding: { top: 2.5, bottom: 2.5, left: 2.5, right: 2.5 },
          lineWidth: { bottom: 0.15 },
          lineColor: [226, 232, 240],
          valign: "middle",
        },
        headStyles: {
          fillColor: [236, 253, 245], // Emerald tint
          textColor: [6, 95, 70],
          fontSize: 6.5,
          fontStyle: "bold",
          font: "helvetica",
          lineWidth: { bottom: 0.3 },
          lineColor: [167, 243, 208],
        },
        columnStyles: {
          0: { cellWidth: 7, halign: "center", font: "helvetica", textColor: [100, 116, 139] },
          1: { cellWidth: 75, fontStyle: "bold" },
          2: { cellWidth: 42 },
          3: { cellWidth: 26 },
          4: { cellWidth: 32, halign: "right", fontStyle: "bold", textColor: [6, 95, 70] },
          5: { cellWidth: 87, fontStyle: "italic", textColor: [71, 85, 105] },
        },
        margin: { left: margin, right: margin, bottom: 36 },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.getHeight();

          // Signatories at bottom of every page
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);

          const sigColW = contentWidth / 3;

          // Signatory 1: Student Finance Officer
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("SUBMITTED & CERTIFIED BY:", margin + 2, pageHeight - 24);
          doc.setDrawColor(51, 65, 85);
          doc.setLineWidth(0.3);
          doc.line(margin + 2, pageHeight - 19, margin + sigColW - 10, pageHeight - 19);
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(studentOfficerName, margin + 2, pageHeight - 15.5);
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text(`Student Finance Officer, ${orgCode}`, margin + 2, pageHeight - 12);

          // Signatory 2: Adviser
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("REVIEWED & ENDORSED BY:", margin + sigColW + 2, pageHeight - 24);
          doc.setDrawColor(51, 65, 85);
          doc.line(margin + sigColW + 2, pageHeight - 19, margin + sigColW * 2 - 10, pageHeight - 19);
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(adviserName, margin + sigColW + 2, pageHeight - 15.5);
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text("Organization Adviser", margin + sigColW + 2, pageHeight - 12);

          // Signatory 3: Dean
          doc.setFontSize(6);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("CONFIRMED & APPROVED BY:", margin + sigColW * 2 + 2, pageHeight - 24);
          doc.setDrawColor(51, 65, 85);
          doc.line(margin + sigColW * 2 + 2, pageHeight - 19, pageWidth - margin - 2, pageHeight - 19);
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(deanName, margin + sigColW * 2 + 2, pageHeight - 15.5);
          doc.setFontSize(6);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text("College Dean, CITE", margin + sigColW * 2 + 2, pageHeight - 12);
        },
      });

      // Binary PDF output
      const pdfBlob = doc.output("blob");
      const fileName = `${docRef}_Institutional_Report.pdf`;
      const targetOrgName = org?.name || "Student Organization";

      uploadGeneratedReport({
        organizationName: targetOrgName,
        dateGenerated: new Date(),
        file: pdfBlob,
        fileName,
      }).then((res) => {
        addExportedReport({
          id: crypto.randomUUID(),
          title: `${orgName} Activity & Financial Report`,
          docRef,
          category: "Organization Financial Summary",
          organizationName: targetOrgName,
          generatedBy: studentOfficerName,
          generatedAt: new Date().toISOString(),
          fileUrl: res.publicUrl,
          filePath: res.path,
          format: "PDF",
        });
      }).catch((e) => console.warn("Storage archive error:", e));

      // Open valid PDF directly in new tab / download
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

      toast.success("Organization Report Exported", `PDF compiled with dual summary tables & verified signatories.`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Export Failed", "Could not compile Organization Report.");
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Global Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Reports & Analytics</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Real-time financial reconciliation, event setting metrics, and institutional reporting.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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
                  {dateRange === "week" ? "Week" : dateRange === "month" ? "Month" : "6-Mo"}
                </span>
              )}
              <ChevronDown size={14} className={`transition-transform duration-200 ${filterPopoverOpen ? "rotate-180" : ""}`} />
            </Button>

            {/* Filter Dropdown Popover */}
            {filterPopoverOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 p-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--border)]">
                  <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Date Window Filter</span>
                  <span className="text-[10px] font-mono text-[var(--muted-foreground)]">Global</span>
                </div>
                <div className="space-y-1">
                  {(Object.keys(DATE_RANGE_LABELS) as DateRangeFilter[]).map((rangeKey) => {
                    const isSelected = dateRange === rangeKey;
                    return (
                      <button
                        key={rangeKey}
                        onClick={() => {
                          setDateRange(rangeKey);
                          setFilterPopoverOpen(false);
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
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <Button variant="outline" onClick={handleExportPdf} className="gap-2 shadow-2xs">
            <FileDown size={15} />
            <span>Export to PDF</span>
          </Button>

          <RefreshButton />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <SkeletonChart />
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <SkeletonTable rows={5} cols={6} />
        </div>
      ) : (
        <>
          {/* Active Filter Indicator Pill (if filtered) */}
          {dateRange !== "all" && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-900 text-xs font-medium w-fit">
              <Filter size={13} className="text-orange-600" />
              <span>
                Filtering by <strong>{DATE_RANGE_LABELS[dateRange]}</strong> · {orgEvents.length} events, {orgInitiatives.length} initiatives
              </span>
              <button
                onClick={() => setDateRange("all")}
                className="ml-2 text-orange-700 hover:text-orange-950 font-bold underline text-[11px] cursor-pointer"
              >
                Reset to All Time
              </button>
            </div>
          )}

          {/* 5 Financial & Activity KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <StatCard
              label="Dept. Budget"
              value={formatCurrency(departmentalBudget)}
              icon={<Wallet size={18} />}
            />
            <StatCard
              label="Org. Initiatives"
              value={formatCurrency(organizationalBudget)}
              icon={<Coins size={18} />}
            />
            <StatCard
              label="Total Available"
              value={formatCurrency(totalAvailableBudget)}
              icon={<Layers size={18} />}
            />
            <StatCard
              label="Total Spent"
              value={formatCurrency(totalSpent)}
              icon={<CreditCard size={18} />}
            />
            <StatCard
              label="Net Balance"
              value={formatCurrency(remainingBalance)}
              icon={<CheckCircle2 size={18} />}
            />
          </div>

          {/* Charts Row: 3 Data Visualizations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Chart 1: Events per Month */}
            <Card className="rounded-2xl border border-[var(--border)] shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm text-[var(--foreground)]">Events per Month</h2>
                  <span className="text-[11px] font-mono text-[var(--muted-foreground)]">Monthly Count</span>
                </div>
              </CardHeader>
              <CardBody>
                {monthlyData.every((m) => m.events === 0) ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                    <Calendar size={28} className="text-[var(--muted-foreground)] opacity-40 mb-1.5" />
                    <p className="text-xs font-semibold text-[var(--foreground)]">No monthly event data</p>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Events in this window will appear here.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={monthlyData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <RechartsTooltip />
                      <Bar dataKey="events" name="Events" fill="#ea580c" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>

            {/* Chart 2: Event Setting Distribution (On-campus vs Off-campus) */}
            <Card className="rounded-2xl border border-[var(--border)] shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm text-[var(--foreground)]">Event Setting Distribution</h2>
                  <span className="text-[11px] font-mono text-[var(--muted-foreground)]">Venue Types</span>
                </div>
              </CardHeader>
              <CardBody>
                {orgEvents.length === 0 ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                    <MapPin size={28} className="text-[var(--muted-foreground)] opacity-40 mb-1.5" />
                    <p className="text-xs font-semibold text-[var(--foreground)]">No setting data</p>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">On vs Off-campus events will plot here.</p>
                  </div>
                ) : (
                  <div className="h-[200px] flex flex-col items-center justify-center">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={settingDistributionData}
                          innerRadius={45}
                          outerRadius={68}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {settingDistributionData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                          ))}
                        </Pie>
                        <RechartsTooltip
                          formatter={(value: any, name: any) => [`${value} Events`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex items-center justify-center gap-5 text-xs">
                      {settingDistributionData.map((item) => (
                        <div key={item.name} className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-medium text-[var(--foreground)]">
                            {item.name}: <strong>{item.value}</strong> ({item.pct}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Chart 3: Budget vs Spending Trend */}
            <Card className="rounded-2xl border border-[var(--border)] shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-sm text-[var(--foreground)]">Budget vs. Spending Trend</h2>
                  <span className="text-[11px] font-mono text-[var(--muted-foreground)]">Proposed vs Spent</span>
                </div>
              </CardHeader>
              <CardBody>
                {approvedEvents.length === 0 ? (
                  <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                    <TrendingUp size={28} className="text-[var(--muted-foreground)] opacity-40 mb-1.5" />
                    <p className="text-xs font-semibold text-[var(--foreground)]">No trend data available</p>
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Disbursement trends will plot here.</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                      data={approvedEvents.map((e) => ({
                        name: e.name.split(" ")[0],
                        budget: e.proposedBudget,
                        spent: transactions
                          .filter((t) => t.eventId === e.id && !t.deleted)
                          .reduce((s, t) => s + t.amount, 0),
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tick={{ fontSize: 9 }} />
                      <RechartsTooltip formatter={(v: any) => formatCurrency(v)} />
                      <Line type="monotone" dataKey="budget" stroke="#3b82f6" strokeWidth={2} dot={false} name="Budget" />
                      <Line type="monotone" dataKey="spent" stroke="#ea580c" strokeWidth={2} dot={false} name="Spent" />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardBody>
            </Card>
          </div>

          {/* Dual Summary Tables Switcher & Container */}
          <Card className="rounded-2xl border border-[var(--border)] shadow-sm overflow-hidden">
            <CardHeader className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border)] bg-[var(--card)]">
              {/* Segmented Table Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-[var(--muted)]/60 rounded-xl border border-[var(--border)]">
                <button
                  onClick={() => setTableTab("expenditure")}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    tableTab === "expenditure"
                      ? "bg-[var(--card)] text-[var(--foreground)] shadow-2xs"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <FileSpreadsheet size={14} className="text-orange-600" />
                  <span>Event Expenditure Summary ({filteredEvents.length})</span>
                </button>
                <button
                  onClick={() => setTableTab("initiatives")}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer flex items-center gap-1.5 ${
                    tableTab === "initiatives"
                      ? "bg-[var(--card)] text-[var(--foreground)] shadow-2xs"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <TrendingUp size={14} className="text-emerald-600" />
                  <span>Initiatives Revenue ({orgInitiatives.length})</span>
                </button>
              </div>

              {/* Table Controls (Visible on Event Expenditure) */}
              {tableTab === "expenditure" && (
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status Filter */}
                  <div className="relative flex items-center">
                    <Filter size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="pl-8 pr-8 py-1.5 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs"
                    >
                      {STATUS_FILTERS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 text-[var(--muted-foreground)] pointer-events-none" />
                  </div>

                  {/* Sort Key */}
                  <div className="relative flex items-center">
                    <ArrowUpDown size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
                    <select
                      value={sortKey}
                      onChange={(e) => setSortKey(e.target.value)}
                      className="pl-8 pr-8 py-1.5 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs"
                    >
                      <option value="dateStart">Date</option>
                      <option value="name">Name (A-Z)</option>
                      <option value="proposedBudget">Proposed Budget</option>
                      <option value="status">Status</option>
                    </select>
                    <ChevronDown size={13} className="absolute right-2.5 text-[var(--muted-foreground)] pointer-events-none" />
                  </div>

                  {/* Asc / Desc Toggle */}
                  <button
                    onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                    className="w-8 h-8 flex items-center justify-center border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition cursor-pointer shadow-2xs"
                    title={sortDir === "asc" ? "Ascending — Click to sort Descending" : "Descending — Click to sort Ascending"}
                  >
                    {sortDir === "asc" ? (
                      <ArrowUpNarrowWide size={14} className="text-[var(--primary)]" />
                    ) : (
                      <ArrowDownWideNarrow size={14} className="text-[var(--primary)]" />
                    )}
                  </button>
                </div>
              )}
            </CardHeader>

            {/* TAB 1: Event Expenditure Summary Table */}
            {tableTab === "expenditure" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--muted)] border-b border-[var(--border)] text-xs font-mono font-semibold text-[var(--muted-foreground)]">
                      <th className="px-4 py-3 text-left w-10">#</th>
                      <th className="px-4 py-3 text-left min-w-[200px]">Event Proposal Name</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Category</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap">Setting</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap min-w-[120px]">Type</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap min-w-[105px]">Date</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Proposed Budget</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Actual Spent</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap">Variance</th>
                      <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEvents.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                          No events match the selected criteria and date range.
                        </td>
                      </tr>
                    ) : (
                      filteredEvents.map((e, idx) => {
                        const spent = transactions
                          .filter((t) => t.eventId === e.id && !t.deleted)
                          .reduce((s, t) => s + t.amount, 0);
                        const variance = (e.proposedBudget || 0) - spent;
                        const typeName = resolveTypeName(e.typeId);

                        return (
                          <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/40 transition">
                            <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium min-w-[200px]">
                              <span className="font-semibold text-[var(--foreground)] block leading-snug">{e.name}</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full font-medium bg-orange-50 text-orange-800 border border-orange-200">
                                {(e.category || "Organizational") === "Organizational" ? "Org." : "Dept."}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-medium ${
                                e.setting === "Off-campus"
                                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                              }`}>
                                {e.setting || "On-campus"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap max-w-[140px] truncate" title={typeName}>
                              {typeName}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{formatDate(e.dateStart)}</td>
                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-right font-medium">
                              {formatCurrency(e.proposedBudget)}
                            </td>
                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-right text-[var(--primary)] font-bold">
                              {formatCurrency(spent)}
                            </td>
                            <td className={`px-4 py-3 font-mono text-xs whitespace-nowrap text-right font-bold ${
                              variance >= 0 ? "text-emerald-700" : "text-rose-700"
                            }`}>
                              {variance >= 0 ? "+" : ""}{formatCurrency(variance)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold shadow-2xs ${getStatusBadgeClass(e.status, e.setting)}`}>
                                {e.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredEvents.length > 0 && (
                    <tfoot className="border-t-2 border-orange-500/30 bg-gradient-to-r from-orange-50/70 via-[var(--muted)]/50 to-blue-50/70 text-xs font-semibold">
                      <tr>
                        <td className="px-4 py-3.5 text-[var(--foreground)] font-bold" colSpan={6}>
                          TOTAL ({filteredEvents.length} {filteredEvents.length === 1 ? "Event" : "Events"})
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-right text-[var(--foreground)]">
                          {formatCurrency(filteredEvents.reduce((s, e) => s + (e.proposedBudget || 0), 0))}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-right text-blue-700">
                          {formatCurrency(
                            filteredEvents.reduce((s, e) => {
                              const spent = transactions
                                .filter((t) => t.eventId === e.id && !t.deleted)
                                .reduce((st, t) => st + t.amount, 0);
                              return s + spent;
                            }, 0)
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-mono font-bold text-right text-emerald-800">
                          {formatCurrency(
                            filteredEvents.reduce((s, e) => {
                              const spent = transactions
                                .filter((t) => t.eventId === e.id && !t.deleted)
                                .reduce((st, t) => st + t.amount, 0);
                              return s + ((e.proposedBudget || 0) - spent);
                            }, 0)
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-[10px] font-mono font-bold text-orange-800 bg-orange-100/70 px-2 py-0.5 rounded-md border border-orange-200">
                            RECONCILED
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}

            {/* TAB 2: Initiatives Revenue Table */}
            {tableTab === "initiatives" && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--muted)] border-b border-[var(--border)] text-xs font-mono font-semibold text-[var(--muted-foreground)]">
                      <th className="px-4 py-3 text-left w-10">#</th>
                      <th className="px-4 py-3 text-left min-w-[220px]">Activity / Initiative Title</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap min-w-[140px]">Revenue Source</th>
                      <th className="px-4 py-3 text-left whitespace-nowrap min-w-[110px]">Date Logged</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap min-w-[130px]">Net Revenue</th>
                      <th className="px-4 py-3 text-left min-w-[250px]">Description / Breakdown Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgInitiatives.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                          No organizational initiatives recorded in this date range.
                        </td>
                      </tr>
                    ) : (
                      orgInitiatives.map((init, idx) => (
                        <tr key={init.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/40 transition">
                          <td className="px-4 py-3.5 font-mono text-xs text-[var(--muted-foreground)]">{idx + 1}</td>
                          <td className="px-4 py-3.5 font-bold text-[var(--foreground)] min-w-[220px] max-w-[320px] leading-snug">{init.title || init.name}</td>
                          <td className="px-4 py-3.5 whitespace-nowrap">
                            <span className={`inline-flex items-center text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs whitespace-nowrap ${getInitiativeSourceBadgeClass(init.source)}`}>
                              {init.source}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 font-mono text-xs whitespace-nowrap">{formatDate(init.date)}</td>
                          <td className="px-4 py-3.5 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300 text-right whitespace-nowrap">
                            +{formatCurrency(init.amount ?? init.netProfit ?? 0)}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-[var(--muted-foreground)] max-w-[260px] truncate leading-relaxed" title={init.description}>
                            {init.description || "—"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {orgInitiatives.length > 0 && (
                    <tfoot className="border-t border-[var(--border)] bg-[var(--muted)]/40 text-xs font-semibold">
                      <tr>
                        <td className="px-4 py-4 text-[var(--foreground)] font-bold uppercase tracking-wide whitespace-nowrap" colSpan={4}>
                          TOTAL INITIATIVES REVENUE ({orgInitiatives.length} {orgInitiatives.length === 1 ? "Item" : "Items"})
                        </td>
                        <td className="px-4 py-4 text-right font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm whitespace-nowrap">
                          +{formatCurrency(totalInitiativesRevenue)}
                        </td>
                        <td className="px-4 py-4 text-xs text-emerald-700 dark:text-emerald-300 italic">
                          Credited directly to Organizational Budget
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
