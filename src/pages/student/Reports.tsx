import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { Card, CardHeader, CardBody, Button, StatCard } from "../../components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import {
  FileDown, BarChart2, Calendar, Wallet, CreditCard,
  ChevronDown, ArrowUpDown, ArrowUpNarrowWide, ArrowDownWideNarrow, Filter, TrendingUp
} from "lucide-react";
import { formatCurrency, formatDate, formatDateTime, statusColors, getEventTypeById, getCategoryById } from "../../services/dataService";
import { uploadGeneratedReport } from "../../services/storageService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const STATUS_FILTERS = ["All", "Created", "For Review", "For Approval", "Pending Revision", "Approved", "Completed", "Closed"];

export default function StudentReports() {
  const { currentUser } = useAuth();
  const { events, transactions, organizations, users, expenditureCategories, exportedReports, addExportedReport } = useApp();
  const { toast } = useToast();
  const orgId = currentUser?.organizationId ?? "";
  const org = organizations.find((o) => o.id === orgId);

  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState("dateStart");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const orgEvents = events.filter((e) => e.organizationId === orgId);
  const filtered = orgEvents
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

  const approvedEvents = orgEvents.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalBudget = orgEvents.reduce((s, e) => s + e.proposedBudget, 0);
  const totalSpent = transactions.filter((t) => approvedEvents.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

  // Dynamic Signatories
  const orgAdviser = users.find((u) => u.role === "adviser" && (u.organizationId === orgId || u.id === org?.adviserId));
  const adviserName = orgAdviser
    ? `${orgAdviser.firstName} ${orgAdviser.middleName ? orgAdviser.middleName + " " : ""}${orgAdviser.lastName}${orgAdviser.suffix ? ", " + orgAdviser.suffix : ""}`
    : "Engr. Emmanuel S. Reyes, M.Sc.";

  const deanUser = users.find((u) => u.role === "dean");
  const deanName = deanUser
    ? `${deanUser.firstName} ${deanUser.middleName ? deanUser.middleName + " " : ""}${deanUser.lastName}${deanUser.suffix ? ", " + deanUser.suffix : ""}`
    : "Dr. Marilou Castro Villanueva, Ph.D.";

  const studentOfficerName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}${currentUser.suffix ? " " + currentUser.suffix : ""}`
    : "Student Finance Officer";

  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleString("default", { month: "short" });
    const count = orgEvents.filter((e) => {
      const ed = new Date(e.dateStart);
      return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
    }).length;
    return { name: label, events: count };
  });

  async function handleExportPdf() {
    const orgName = org?.name || "Student Organization";
    const orgCode = org?.code || "CITE-ORG";
    const docRef = `REP-${orgCode.toUpperCase()}-${Date.now().toString().slice(-6)}`;
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
      doc.text(`${orgName} (${orgCode}) · Activity & Finance Report`, margin + 14, 24);

      // Top Right: ACTIVITY & FINANCE REPORT Pill Badge
      const badgeText = "ACTIVITY & FINANCE REPORT";
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
      doc.text(`${orgEvents.length} Events`, margin + 4, kpiY + 9.5);

      // Col 2: Approved Events
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("APPROVED & ACTIVE", margin + colW + 4, kpiY + 4.5);
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${approvedEvents.length} Events`, margin + colW + 4, kpiY + 9.5);

      // Col 3: Total Proposed Budget
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("PROPOSED BUDGET", margin + colW * 2 + 4, kpiY + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(15, 118, 110);
      doc.text(`PHP ${Number(totalBudget || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + colW * 2 + 4, kpiY + 9.5);

      // Col 4: Total Spent
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("TOTAL DISBURSED", margin + colW * 3 + 4, kpiY + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(21, 128, 61);
      doc.text(`PHP ${Number(totalSpent || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, margin + colW * 3 + 4, kpiY + 9.5);

      // ── 3. VISUAL CHARTS OVERVIEW (VECTOR DRAWINGS) ────────────────
      const chartRowY = 48;
      const chartCardW = (contentWidth - 8) / 2; // 130.5mm
      const chartCardH = 45;

      // ── Chart 1: Spending by Category Donut Chart ──────────────────
      const c1X = margin;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(c1X, chartRowY, chartCardW, chartCardH, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text("SPENDING BY CATEGORY", c1X + 4, chartRowY + 5.5);

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
        [13, 148, 136],  // #0d9488 Teal
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
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("No category disbursements recorded yet.", c1X + chartCardW / 2, chartRowY + chartCardH / 2, { align: "center" });
      } else {
        const cx = c1X + 22;
        const cy = chartRowY + 25;
        const R = 12.5;
        const innerR = 6;

        // Draw Donut Wedges
        let currentAngle = -Math.PI / 2;
        catEntries.forEach((cat) => {
          const sliceAngle = (cat.pct / 100) * (2 * Math.PI);
          const endAngle = currentAngle + sliceAngle;
          const steps = Math.max(8, Math.ceil(sliceAngle * 16));

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

        // Donut Inner Hole
        doc.setFillColor(255, 255, 255);
        doc.circle(cx, cy, innerR, "F");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(5);
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL", cx, cy - 1, { align: "center" });
        doc.setFontSize(5.5);
        doc.setTextColor(15, 23, 42);
        const shortSpent = totalSpent >= 1000 ? `PHP ${(totalSpent / 1000).toFixed(1)}k` : `PHP ${totalSpent}`;
        doc.text(shortSpent, cx, cy + 2.5, { align: "center" });

        // Donut Legend List (Complete Full Category Names)
        const topCats = catEntries.slice(0, 5);
        const legX = c1X + 40;
        const startLegY = chartRowY + 10.5;
        topCats.forEach((cat, idx) => {
          const ly = startLegY + idx * 6.5;
          doc.setFillColor(cat.color[0], cat.color[1], cat.color[2]);
          doc.circle(legX + 2, ly + 2.5, 1.8, "F");

          doc.setFont("helvetica", "bold");
          doc.setFontSize(6.5);
          doc.setTextColor(51, 65, 85);
          doc.text(cat.name, legX + 6, ly + 3.3);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(15, 118, 110);
          doc.text(`${cat.pct.toFixed(0)}% (PHP ${cat.value.toLocaleString()})`, c1X + chartCardW - 4, ly + 3.3, { align: "right" });
        });
      }

      // ── Chart 2: Budget vs. Spending Trend Line Chart ──────────────
      const c2X = margin + chartCardW + 8;
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(c2X, chartRowY, chartCardW, chartCardH, 1.5, 1.5, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text("BUDGET VS. SPENDING TREND", c2X + 4, chartRowY + 5.5);

      // Top Legend
      doc.setFillColor(13, 148, 136); // Teal
      doc.circle(c2X + 78, chartRowY + 5, 1.8, "F");
      doc.setFontSize(6);
      doc.setTextColor(15, 118, 110);
      doc.text("Budget", c2X + 82, chartRowY + 5.8);

      doc.setFillColor(245, 158, 11); // Amber
      doc.circle(c2X + 104, chartRowY + 5, 1.8, "F");
      doc.setTextColor(180, 83, 9);
      doc.text("Spent", c2X + 108, chartRowY + 5.8);

      const trendData = approvedEvents.map((e) => ({
        name: e.name.length > 12 ? e.name.substring(0, 11) + "…" : e.name,
        budget: e.proposedBudget,
        spent: transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0),
      }));

      if (trendData.length === 0) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text("No approved event expenditures to trend yet.", c2X + chartCardW / 2, chartRowY + chartCardH / 2, { align: "center" });
      } else {
        const plotX = c2X + 18;
        const plotY = chartRowY + 11;
        const plotW = chartCardW - 24;
        const plotH = 24;

        const maxVal = Math.max(1000, ...trendData.map((d) => Math.max(d.budget, d.spent)));

        // Grid lines & Y-ticks
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.2);
        [0, 0.5, 1].forEach((ratio) => {
          const gy = plotY + plotH - ratio * plotH;
          doc.line(plotX, gy, plotX + plotW, gy);

          const tickVal = Math.round(ratio * maxVal);
          const tickLabel = tickVal >= 1000 ? `${(tickVal / 1000).toFixed(0)}k` : `${tickVal}`;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.5);
          doc.setTextColor(148, 163, 184);
          doc.text(tickLabel, plotX - 2, gy + 1.5, { align: "right" });
        });

        // Compute Points
        const step = trendData.length > 1 ? plotW / (trendData.length - 1) : plotW / 2;
        const budgetPts: { x: number; y: number }[] = [];
        const spentPts: { x: number; y: number }[] = [];

        trendData.forEach((d, i) => {
          const px = trendData.length === 1 ? plotX + plotW / 2 : plotX + i * step;
          const pyB = plotY + plotH - (d.budget / maxVal) * plotH;
          const pyS = plotY + plotH - (d.spent / maxVal) * plotH;

          budgetPts.push({ x: px, y: pyB });
          spentPts.push({ x: px, y: pyS });

          // X-label
          doc.setFont("helvetica", "normal");
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(d.name, px, plotY + plotH + 5, { align: "center" });
        });

        // Draw Budget Line (Teal)
        doc.setDrawColor(13, 148, 136);
        doc.setLineWidth(0.5);
        for (let i = 0; i < budgetPts.length - 1; i++) {
          doc.line(budgetPts[i].x, budgetPts[i].y, budgetPts[i + 1].x, budgetPts[i + 1].y);
        }
        budgetPts.forEach((pt) => {
          doc.setFillColor(13, 148, 136);
          doc.circle(pt.x, pt.y, 1.2, "F");
        });

        // Draw Spent Line (Amber)
        doc.setDrawColor(245, 158, 11);
        doc.setLineWidth(0.5);
        for (let i = 0; i < spentPts.length - 1; i++) {
          doc.line(spentPts[i].x, spentPts[i].y, spentPts[i + 1].x, spentPts[i + 1].y);
        }
        spentPts.forEach((pt) => {
          doc.setFillColor(245, 158, 11);
          doc.circle(pt.x, pt.y, 1.2, "F");
        });
      }

      // ── 4. STATUS BADGE COLOR HELPER ────────────────────────────────
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

      // ── 5. EVENTS TABLE DATA CONSTRUCTION ───────────────────────────
      const rawEventRows = filtered.map((e, idx) => {
        const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
        const typeName = getEventTypeById(e.typeId)?.name || "General";

        return {
          idx: idx + 1,
          name: e.name,
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
        r.typeName,
        r.date,
        r.budget,
        r.spent,
        r.status,
      ]);

      // Total Summary Row
      const filteredBudgetTotal = filtered.reduce((s, e) => s + e.proposedBudget, 0);
      const filteredSpentTotal = filtered.reduce((s, e) => {
        const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((st, t) => st + t.amount, 0);
        return s + spent;
      }, 0);

      eventsTableData.push([
        "",
        `TOTAL (${filtered.length} Events)`,
        "",
        "",
        `PHP ${Number(filteredBudgetTotal || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        `PHP ${Number(filteredSpentTotal || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        "RECONCILED",
      ]);

      autoTable(doc, {
        startY: 97,
        head: [["#", "Event Proposal Name", "Event Type", "Event Date", "Proposed Budget", "Total Disbursed", "Status"]],
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
          1: { cellWidth: 85, fontStyle: "bold" },
          2: { cellWidth: 35 },
          3: { cellWidth: 30 },
          4: { cellWidth: 35, halign: "right", fontStyle: "bold" },
          5: { cellWidth: 35, halign: "right", fontStyle: "bold", textColor: [15, 118, 110] },
          6: { cellWidth: 40, halign: "center" },
        },
        margin: { left: margin, right: margin, bottom: 36 },
        didDrawCell: (data) => {
          if (data.section === "body" && data.column.index === 6 && data.row.index < rawEventRows.length) {
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

          const sigColW = contentWidth / 3;

          // Signatory 1: Student Finance Officer
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("SUBMITTED & CERTIFIED BY:", margin + 2, pageHeight - 26);
          doc.setDrawColor(51, 65, 85);
          doc.setLineWidth(0.3);
          doc.line(margin + 2, pageHeight - 21, margin + sigColW - 10, pageHeight - 21);
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(studentOfficerName, margin + 2, pageHeight - 17.5);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text(`Student Officer, ${orgCode}`, margin + 2, pageHeight - 14);

          // Signatory 2: Adviser
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("REVIEWED & ENDORSED BY:", margin + sigColW + 2, pageHeight - 26);
          doc.setDrawColor(51, 65, 85);
          doc.line(margin + sigColW + 2, pageHeight - 21, margin + sigColW * 2 - 10, pageHeight - 21);
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(adviserName, margin + sigColW + 2, pageHeight - 17.5);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text("Organization Adviser", margin + sigColW + 2, pageHeight - 14);

          // Signatory 3: Dean
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("CONFIRMED BY:", margin + sigColW * 2 + 2, pageHeight - 26);
          doc.setDrawColor(51, 65, 85);
          doc.line(margin + sigColW * 2 + 2, pageHeight - 21, pageWidth - margin - 2, pageHeight - 21);
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(deanName, margin + sigColW * 2 + 2, pageHeight - 17.5);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text("College Dean, CITE", margin + sigColW * 2 + 2, pageHeight - 14);
        },
      });

      // Output real binary PDF
      const pdfBlob = doc.output("blob");
      const fileName = `${docRef}_Activity_Report.pdf`;

      // Upload genuine vector PDF to Supabase Storage
      const targetOrgName = org?.name || "Student Organization";

      uploadGeneratedReport({
        organizationName: targetOrgName,
        dateGenerated: new Date(),
        file: pdfBlob,
        fileName,
      }).then((res) => {
        addExportedReport({
          id: crypto.randomUUID(),
          title: `${orgName} Financial & Activity Report`,
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

      toast.success("Organization Report Exported", `PDF (${(pdfBlob.size / 1024).toFixed(1)} KB) compiled and archived.`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      toast.error("Export Failed", "Could not compile Organization Report.");
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Analytics and exportable reports for your organization.</p>
        </div>
        <Button variant="outline" onClick={handleExportPdf}>
          <FileDown size={16} /> Export to PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Events" value={orgEvents.length} icon={<Calendar size={18} />} />
        <StatCard label="Approved Events" value={approvedEvents.length} icon={<BarChart2 size={18} />} />
        <StatCard label="Total Proposed Budget" value={formatCurrency(totalBudget)} icon={<Wallet size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<CreditCard size={18} />} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><h2 className="font-semibold">Events per Month</h2></CardHeader>
          <CardBody>
            {monthlyData.every((m) => m.events === 0) ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                <Calendar size={28} className="text-[var(--muted-foreground)] opacity-40 mb-1.5" />
                <p className="text-xs font-semibold text-[var(--foreground)]">No monthly event data</p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">No initiatives recorded for the academic year.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlyData}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="events" name="Events" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-semibold">Budget vs. Spending Trend</h2></CardHeader>
          <CardBody>
            {approvedEvents.length === 0 ? (
              <div className="h-[200px] flex flex-col items-center justify-center text-center p-4">
                <TrendingUp size={28} className="text-[var(--muted-foreground)] opacity-40 mb-1.5" />
                <p className="text-xs font-semibold text-[var(--foreground)]">No trend data available</p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Approved events and disbursement trends will plot here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={approvedEvents.map((e) => ({
                  name: e.name.split(" ")[0],
                  budget: e.proposedBudget,
                  spent: transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0),
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 9 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="budget" stroke="#0d9488" strokeWidth={2} dot={false} name="Budget" />
                  <Line type="monotone" dataKey="spent" stroke="#f59e0b" strokeWidth={2} dot={false} name="Spent" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex items-center justify-between flex-wrap gap-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-base text-[var(--foreground)]">Event Summary Table</h2>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Status Filter Dropdown */}
            <div className="relative flex items-center">
              <Filter size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-8 pr-8 py-2 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs hover:border-[var(--primary)]/40 transition"
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
                className="pl-8 pr-8 py-2 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs hover:border-[var(--primary)]/40 transition"
              >
                <option value="dateStart">Date</option>
                <option value="name">Name (A-Z)</option>
                <option value="proposedBudget">Proposed Budget</option>
                <option value="status">Status</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 text-[var(--muted-foreground)] pointer-events-none" />
            </div>

            {/* Asc / Desc Icon Toggle Button */}
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
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] min-w-[200px]">Event</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap w-[100px]">Type</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap min-w-[105px]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap">Spent</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)] whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No events match the filter.</td></tr>
              ) : filtered.map((e) => {
                const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
                return (
                  <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition">
                    <td className="px-4 py-3 font-medium min-w-[200px]">
                      <span className="font-semibold text-[var(--foreground)] block leading-snug">{e.name}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] whitespace-nowrap max-w-[105px] truncate" title={getEventTypeById(e.typeId)?.name}>
                      {getEventTypeById(e.typeId)?.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap min-w-[105px]">{formatDate(e.dateStart)}</td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{formatCurrency(e.proposedBudget)}</td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-[var(--primary)] font-semibold">{formatCurrency(spent)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold shadow-2xs ${statusColors[e.status]}`}>{e.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot className="border-t-2 border-teal-600/30 bg-gradient-to-r from-teal-50/70 via-[var(--muted)]/50 to-teal-50/70">
                <tr className="font-semibold text-xs">
                  <td className="px-4 py-3.5 text-[var(--foreground)] font-bold">
                    TOTAL ({filtered.length} {filtered.length === 1 ? "Event" : "Events"})
                  </td>
                  <td className="px-4 py-3.5 text-[var(--muted-foreground)]">—</td>
                  <td className="px-4 py-3.5 text-[var(--muted-foreground)]">—</td>
                  <td className="px-4 py-3.5 font-mono font-bold text-[var(--foreground)]">
                    {formatCurrency(filtered.reduce((s, e) => s + e.proposedBudget, 0))}
                  </td>
                  <td className="px-4 py-3.5 font-mono font-bold text-teal-800">
                    {formatCurrency(
                      filtered.reduce((s, e) => {
                        const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((st, t) => st + t.amount, 0);
                        return s + spent;
                      }, 0)
                    )}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[10px] font-mono font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-md border border-teal-200">
                      SUMMARY
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>
    </div>
  );
}
