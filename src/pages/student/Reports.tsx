import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { Card, CardHeader, CardBody, Button, StatCard } from "../../components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import {
  FileDown, BarChart2, Calendar, Wallet, CreditCard,
  ChevronDown, ArrowUpDown, ArrowUpNarrowWide, ArrowDownWideNarrow, Filter
} from "lucide-react";
import { formatCurrency, formatDate, statusColors, getEventTypeById, getCategoryById } from "../../services/mockData";

const STATUS_FILTERS = ["All", "Created", "For Review", "For Approval", "Pending Revision", "Approved", "Completed", "Closed"];

export default function StudentReports() {
  const { currentUser } = useAuth();
  const { events, transactions, organizations, users } = useApp();
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
    : "Dr. Aris S. Gonzales";

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

  function handleExportPdf() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const orgName = org?.name || "Student Organization";
    const orgCode = org?.code || "CITE-ORG";
    const docRef = `REP-${orgCode.toUpperCase()}-${new Date().getFullYear()}`;
    const generatedDate = formatDate(new Date().toISOString());

    const statusReportStyles: Record<string, string> = {
      Created: "background: #f8fafc; color: #475569; border: 1px solid #e2e8f0;",
      "For Review": "background: #fffbeb; color: #b45309; border: 1px solid #fde68a;",
      "For Approval": "background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe;",
      "Pending Revision": "background: #fff7ed; color: #c2410c; border: 1px solid #fed7aa;",
      Approved: "background: #f0fdfa; color: #0f766e; border: 1px solid #99f6e4;",
      Completed: "background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;",
      Closed: "background: #f9fafb; color: #4b5563; border: 1px solid #e5e7eb;",
    };

    const tableRowsHtml = filtered.map((e, idx) => {
      const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
      const stStyle = statusReportStyles[e.status] || "background: #f1f5f9; color: #475569;";
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${e.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #475569;">${getEventTypeById(e.typeId)?.name || "General"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${formatDate(e.dateStart)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatCurrency(e.proposedBudget)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f766e;">${formatCurrency(spent)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">
            <span style="${stStyle} padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; display: inline-block;">${e.status}</span>
          </td>
        </tr>
      `;
    }).join("");

    const filteredBudgetTotal = filtered.reduce((s, e) => s + e.proposedBudget, 0);
    const filteredSpentTotal = filtered.reduce((s, e) => {
      const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((st, t) => st + t.amount, 0);
      return s + spent;
    }, 0);

    // SVG Chart 1: Events per Month (Bar Chart)
    const barWidth = 340;
    const barHeight = 140;
    const barTop = 15;
    const barBottom = 25;
    const barLeft = 25;
    const barRight = 10;
    const barPlotW = barWidth - barLeft - barRight;
    const barPlotH = barHeight - barTop - barBottom;
    const maxEventsVal = Math.max(3, ...monthlyData.map((d) => d.events));
    const barW = Math.max(16, Math.min(32, (barPlotW / monthlyData.length) * 0.55));
    const barStep = barPlotW / monthlyData.length;

    let barGridHtml = "";
    [0, Math.ceil(maxEventsVal / 2), maxEventsVal].forEach((tickVal) => {
      const y = barTop + barPlotH - (tickVal / maxEventsVal) * barPlotH;
      barGridHtml += `<line x1="${barLeft}" y1="${y}" x2="${barWidth - barRight}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="3,3" stroke-width="1" />`;
      barGridHtml += `<text x="${barLeft - 6}" y="${y + 3}" fill="#64748b" font-size="8" text-anchor="end" font-family="monospace">${tickVal}</text>`;
    });

    let barsHtml = "";
    let barXLabelsHtml = "";
    monthlyData.forEach((d, i) => {
      const h = (d.events / maxEventsVal) * barPlotH;
      const x = barLeft + i * barStep + (barStep - barW) / 2;
      const y = barTop + barPlotH - h;
      barsHtml += `
        <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="#0d9488" />
        ${d.events > 0 ? `<text x="${x + barW / 2}" y="${y - 4}" fill="#0f766e" font-size="8" font-weight="bold" text-anchor="middle" font-family="monospace">${d.events}</text>` : ""}
      `;
      barXLabelsHtml += `
        <text x="${x + barW / 2}" y="${barHeight - 6}" fill="#475569" font-size="8" font-weight="500" text-anchor="middle" font-family="monospace">${d.name}</text>
      `;
    });

    const barChartSvg = `
      <svg width="100%" height="140" viewBox="0 0 ${barWidth} ${barHeight}" xmlns="http://www.w3.org/2000/svg" style="background: #ffffff;">
        ${barGridHtml}
        <line x1="${barLeft}" y1="${barTop + barPlotH}" x2="${barWidth - barRight}" y2="${barTop + barPlotH}" stroke="#cbd5e1" stroke-width="1" />
        ${barsHtml}
        ${barXLabelsHtml}
      </svg>
    `;

    // SVG Chart 2: Spending by Category (Donut/Pie Chart)
    const orgTxns = transactions.filter((t) => orgEvents.some((e) => e.id === t.eventId) && !t.deleted);
    const byCategory = Object.entries(
      orgTxns.reduce<Record<string, number>>((acc, t) => {
        const name = getCategoryById(t.categoryId)?.name ?? "Other";
        acc[name] = (acc[name] || 0) + t.amount;
        return acc;
      }, {})
    )
      .map(([name, value], idx) => {
        const pct = totalSpent > 0 ? (value / totalSpent) * 100 : 0;
        const catColors = ["#0d9488", "#0284c7", "#7c3aed", "#f59e0b", "#ef4444", "#10b981", "#f97316", "#64748b"];
        return {
          name,
          value,
          pct,
          color: catColors[idx % catColors.length],
        };
      })
      .sort((a, b) => b.value - a.value);

    const pieW = 340;
    const pieH = 140;
    let pieChartSvg = "";

    if (byCategory.length === 0) {
      pieChartSvg = `
        <div style="height: 140px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; font-family: monospace; background: #f8fafc; border-radius: 6px; border: 1px dashed #cbd5e1;">
          No category spending recorded yet.
        </div>
      `;
    } else {
      const cx = 65;
      const cy = 70;
      const r = 42;
      const C = 2 * Math.PI * r;
      let accumulated = 0;
      let circlesHtml = "";

      byCategory.forEach((cat) => {
        const segLen = (cat.pct / 100) * C;
        circlesHtml += `
          <circle
            cx="${cx}"
            cy="${cy}"
            r="${r}"
            fill="none"
            stroke="${cat.color}"
            stroke-width="18"
            stroke-dasharray="${segLen} ${C - segLen}"
            stroke-dashoffset="${-accumulated}"
            transform="rotate(-90 ${cx} ${cy})"
          />
        `;
        accumulated += segLen;
      });

      const topCats = byCategory.slice(0, 5);
      let legendRows = "";
      const startY = Math.max(14, 70 - (topCats.length * 21) / 2 + 8);
      topCats.forEach((cat, idx) => {
        const y = startY + idx * 21;
        legendRows += `
          <g transform="translate(130, ${y})">
            <circle cx="4" cy="4" r="3.5" fill="${cat.color}" />
            <text x="12" y="7" fill="#334155" font-size="8" font-weight="600" font-family="monospace">${cat.name.length > 12 ? cat.name.slice(0, 11) + "…" : cat.name}</text>
            <text x="200" y="7" fill="#0f766e" font-size="8" font-weight="bold" text-anchor="end" font-family="monospace">${cat.pct.toFixed(0)}% (${formatCurrency(cat.value)})</text>
          </g>
        `;
      });

      pieChartSvg = `
        <svg width="100%" height="140" viewBox="0 0 ${pieW} ${pieH}" xmlns="http://www.w3.org/2000/svg" style="background: #ffffff;">
          ${circlesHtml}
          <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-size="7.5" fill="#64748b" font-weight="bold" font-family="monospace">SPENT</text>
          <text x="${cx}" y="${cy + 8}" text-anchor="middle" font-size="9" font-weight="bold" fill="#0f766e" font-family="monospace">${totalSpent >= 1000 ? `₱${(totalSpent / 1000).toFixed(0)}k` : `₱${totalSpent}`}</text>
          ${legendRows}
        </svg>
      `;
    }

    // SVG Chart 3: Budget vs. Spending Trend (Full Width Line Chart)
    const trendData = approvedEvents.map((e) => ({
      name: e.name.length > 14 ? e.name.substring(0, 13) + "…" : e.name,
      budget: e.proposedBudget,
      spent: transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0),
    }));

    const lineW = 700;
    const lineH = 135;
    const lineTop = 22;
    const lineBottom = 25;
    const lineLeft = 50;
    const lineRight = 20;
    const linePlotW = lineW - lineLeft - lineRight;
    const linePlotH = lineH - lineTop - lineBottom;

    let lineChartSvg = "";
    if (trendData.length === 0) {
      lineChartSvg = `
        <div style="height: 135px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 11px; font-family: monospace; background: #f8fafc; border-radius: 6px; border: 1px dashed #cbd5e1;">
          No approved events data to chart yet.
        </div>
      `;
    } else {
      const maxTrendVal = Math.max(1000, ...trendData.map((d) => Math.max(d.budget, d.spent)));
      const lineStep = trendData.length > 1 ? linePlotW / (trendData.length - 1) : linePlotW / 2;

      let lineGridHtml = "";
      [0, Math.round(maxTrendVal / 2), maxTrendVal].forEach((tickVal) => {
        const y = lineTop + linePlotH - (tickVal / maxTrendVal) * linePlotH;
        lineGridHtml += `<line x1="${lineLeft}" y1="${y}" x2="${lineW - lineRight}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="3,3" stroke-width="1" />`;
        const tickStr = tickVal >= 1000 ? `₱${(tickVal / 1000).toFixed(0)}k` : `₱${tickVal}`;
        lineGridHtml += `<text x="${lineLeft - 6}" y="${y + 3}" fill="#64748b" font-size="8" text-anchor="end" font-family="monospace">${tickStr}</text>`;
      });

      const budgetPoints: string[] = [];
      const spentPoints: string[] = [];
      let dotsHtml = "";
      let lineXLabelsHtml = "";

      trendData.forEach((d, i) => {
        const x = trendData.length === 1 ? lineLeft + linePlotW / 2 : lineLeft + i * lineStep;
        const yBudget = lineTop + linePlotH - (d.budget / maxTrendVal) * linePlotH;
        const ySpent = lineTop + linePlotH - (d.spent / maxTrendVal) * linePlotH;

        budgetPoints.push(`${x},${yBudget}`);
        spentPoints.push(`${x},${ySpent}`);

        dotsHtml += `
          <circle cx="${x}" cy="${yBudget}" r="3" fill="#0d9488" />
          <circle cx="${x}" cy="${ySpent}" r="3" fill="#f59e0b" />
        `;

        lineXLabelsHtml += `
          <text x="${x}" y="${lineH - 6}" fill="#475569" font-size="8" text-anchor="middle" font-family="monospace">${d.name}</text>
        `;
      });

      const legendHtml = `
        <g transform="translate(${lineLeft}, 8)">
          <circle cx="4" cy="4" r="3" fill="#0d9488" />
          <text x="12" y="7" fill="#0f766e" font-size="8" font-weight="bold" font-family="monospace">Budget</text>
          <circle cx="65" cy="4" r="3" fill="#f59e0b" />
          <text x="73" y="7" fill="#b45309" font-size="8" font-weight="bold" font-family="monospace">Spent</text>
        </g>
      `;

      lineChartSvg = `
        <svg width="100%" height="135" viewBox="0 0 ${lineW} ${lineH}" xmlns="http://www.w3.org/2000/svg" style="background: #ffffff;">
          ${legendHtml}
          ${lineGridHtml}
          <line x1="${lineLeft}" y1="${lineTop + linePlotH}" x2="${lineW - lineRight}" y2="${lineTop + linePlotH}" stroke="#cbd5e1" stroke-width="1" />
          <polyline points="${budgetPoints.join(" ")}" fill="none" stroke="#0d9488" stroke-width="2" stroke-linejoin="round" />
          <polyline points="${spentPoints.join(" ")}" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linejoin="round" />
          ${dotsHtml}
          ${lineXLabelsHtml}
        </svg>
      `;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Activity_and_Finance_Report_${orgCode}_${new Date().getFullYear()}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 14px; margin-bottom: 16px; }
          .brand { display: flex; align-items: center; gap: 12px; }
          .logo { width: 44px; height: 44px; border-radius: 8px; background-color: #134e4a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-family: monospace; }
          .grid-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .grid-val { font-weight: bold; font-size: 12px; margin-top: 2px; }
          .charts-row-top { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 14px; }
          .chart-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
          table { width: 100%; border-collapse: collapse; font-family: monospace; font-size: 11px; margin-bottom: 16px; }
          th { background: #f1f5f9; text-align: left; padding: 8px; border-bottom: 1px solid #cbd5e1; font-weight: bold; }
          .total-row { background: #f0fdfa; font-weight: bold; border-top: 2px solid #0f766e; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <div class="logo">LCUP</div>
            <div>
              <h2 style="margin: 0; font-size: 16px; font-weight: 800; color: #134e4a; text-transform: uppercase;">La Consolacion University Philippines</h2>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">College of Information Technology & Engineering</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #0f766e;">${orgName} (${orgCode})</p>
            </div>
          </div>
          <div style="text-align: right; font-family: monospace;">
            <span style="background: #ccfbf1; color: #115e59; font-weight: bold; padding: 4px 8px; border-radius: 4px; border: 1px solid #99f6e4; font-size: 10px;">ACTIVITY & FINANCE REPORT</span>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b;">Doc Ref: ${docRef}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Generated: ${generatedDate}</p>
          </div>
        </div>

        <div class="grid">
          <div><span class="grid-label">Total Events</span><div class="grid-val">${orgEvents.length} Events</div></div>
          <div><span class="grid-label">Approved/Active</span><div class="grid-val">${approvedEvents.length} Events</div></div>
          <div><span class="grid-label">Total Budget</span><div class="grid-val" style="color: #0f766e;">${formatCurrency(totalBudget)}</div></div>
          <div><span class="grid-label">Total Spent</span><div class="grid-val" style="color: #047857;">${formatCurrency(totalSpent)}</div></div>
        </div>

        <!-- Visual Charts Overview -->
        <div class="charts-row-top">
          <div class="chart-card">
            <h4 style="font-family: monospace; font-size: 10px; font-weight: bold; text-transform: uppercase; margin: 0 0 6px 0; color: #334155;">Events per Month</h4>
            ${barChartSvg}
          </div>
          <div class="chart-card">
            <h4 style="font-family: monospace; font-size: 10px; font-weight: bold; text-transform: uppercase; margin: 0 0 6px 0; color: #334155;">Spending by Category</h4>
            ${pieChartSvg}
          </div>
        </div>

        <div class="chart-card" style="margin-bottom: 16px;">
          <h4 style="font-family: monospace; font-size: 10px; font-weight: bold; text-transform: uppercase; margin: 0 0 6px 0; color: #334155;">Budget vs. Spending Trend</h4>
          ${lineChartSvg}
        </div>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; font-family: monospace;">
          <h4 style="font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 0; color: #334155;">Comprehensive Event Summary</h4>
          <span style="font-size: 9.5px; color: #64748b;">
            Scope: <strong>${statusFilter === "All" ? "All Statuses" : statusFilter}</strong> • Sorted by: <strong>${sortKey === "dateStart" ? "Date" : sortKey === "proposedBudget" ? "Budget" : sortKey === "status" ? "Status" : "Name"}</strong> (${sortDir.toUpperCase()}) • Showing ${filtered.length} of ${orgEvents.length} Events
          </span>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Event Name</th>
              <th>Type</th>
              <th>Date</th>
              <th style="text-align: right;">Proposed Budget</th>
              <th style="text-align: right;">Total Spent</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || `<tr><td colspan="7" style="padding: 18px; text-align: center; color: #94a3b8; font-style: italic;">No events match the status filter "${statusFilter}".</td></tr>`}
            <tr class="total-row">
              <td colspan="4" style="padding: 8px; text-align: right; color: #134e4a;">TOTAL (${filtered.length} ${filtered.length === 1 ? 'Event' : 'Events'}):</td>
              <td style="padding: 8px; text-align: right; color: #134e4a;">${formatCurrency(filteredBudgetTotal)}</td>
              <td style="padding: 8px; text-align: right; color: #0f766e;">${formatCurrency(filteredSpentTotal)}</td>
              <td style="padding: 8px; text-align: center; color: #0f766e; font-size: 10px;">RECONCILED</td>
            </tr>
          </tbody>
        </table>

        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-family: monospace;">
          <div>
            <div style="height: 26px; display: flex; align-items: center; justify-content: center; color: #047857; font-weight: bold; font-size: 11px;">✓ Digitally Certified</div>
            <div style="border-top: 1px solid #94a3b8; padding-top: 6px; font-weight: bold; font-size: 11px;">${studentOfficerName}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Student Finance Officer, ${orgName}</div>
          </div>
          <div>
            <div style="height: 26px;"></div>
            <div style="border-top: 1px solid #94a3b8; padding-top: 6px; font-weight: bold; font-size: 11px;">${adviserName}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">Organization Adviser</div>
          </div>
          <div>
            <div style="height: 26px;"></div>
            <div style="border-top: 1px solid #94a3b8; padding-top: 6px; font-weight: bold; font-size: 11px;">${deanName}</div>
            <div style="font-size: 10px; color: #64748b; margin-top: 2px;">College Dean, CITE</div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
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
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={monthlyData}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="events" name="Events" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-semibold">Budget vs. Spending Trend</h2></CardHeader>
          <CardBody>
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
