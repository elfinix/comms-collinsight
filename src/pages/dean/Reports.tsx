import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card, CardHeader, CardBody, Button, StatCard } from "../../components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileDown, BarChart2, Calendar, Wallet, CreditCard, Coins } from "lucide-react";
import { formatCurrency, formatDate, statusColors, organizations, getEventTypeById } from "../../services/mockData";

const COLORS = ["#0d9488", "#0284c7", "#7c3aed", "#f59e0b", "#ef4444"];

export default function DeanReports() {
  const { events, transactions, users } = useApp();
  const [tab, setTab] = useState<"events" | "finance">("events");

  const allEvents = events;
  const approved = events.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalBudget = organizations.reduce((s, o) => s + o.allocatedBudget, 0);
  const totalSpent = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

  const deanUser = users.find((u) => u.role === "dean");
  const deanName = deanUser
    ? `${deanUser.firstName} ${deanUser.middleName ? deanUser.middleName + " " : ""}${deanUser.lastName}${deanUser.suffix ? ", " + deanUser.suffix : ""}`
    : "Dr. Aris S. Gonzales";

  const orgData = organizations.map((org) => {
    const orgEvents = events.filter((e) => e.organizationId === org.id);
    const spent = transactions.filter((t) => orgEvents.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);
    return { name: org.code, events: orgEvents.length, spent, budget: org.allocatedBudget };
  });

  function handleExportPdf() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const docRef = `REP-DEAN-CITE-${new Date().getFullYear()}`;
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

    const tableRowsHtml = allEvents.map((e, idx) => {
      const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
      const orgCode = organizations.find((o) => o.id === e.organizationId)?.code || "CITE";
      const stStyle = statusReportStyles[e.status] || "background: #f1f5f9; color: #475569;";
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${e.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f766e;">${orgCode}</td>
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

    const orgSummaryRowsHtml = orgData.map((o) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold;">${o.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${o.events}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatCurrency(o.budget)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #0f766e;">${formatCurrency(o.spent)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: #047857;">${formatCurrency(o.budget - o.spent)}</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Dean_Cross_Organizational_Report_CITE_${new Date().getFullYear()}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; margin: 0; padding: 24px; font-size: 12px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f766e; padding-bottom: 14px; margin-bottom: 16px; }
          .brand { display: flex; align-items: center; gap: 12px; }
          .logo { width: 44px; height: 44px; border-radius: 8px; background-color: #134e4a; color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 16px; }
          .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; margin-bottom: 16px; font-family: monospace; }
          .grid-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; }
          .grid-val { font-weight: bold; font-size: 12px; margin-top: 2px; }
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
              <p style="margin: 2px 0 0 0; font-size: 11px; font-weight: bold; color: #0f766e;">Office of the College Dean · Cross-Organizational Directorate</p>
            </div>
          </div>
          <div style="text-align: right; font-family: monospace;">
            <span style="background: #ccfbf1; color: #115e59; font-weight: bold; padding: 4px 8px; border-radius: 4px; border: 1px solid #99f6e4; font-size: 10px;">DIRECTORATE REPORT</span>
            <p style="margin: 4px 0 0 0; font-size: 10px; color: #64748b;">Doc Ref: ${docRef}</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; color: #64748b;">Generated: ${generatedDate}</p>
          </div>
        </div>

        <div class="grid">
          <div><span class="grid-label">Total Events</span><div class="grid-val">${allEvents.length} Events</div></div>
          <div><span class="grid-label">Approved Events</span><div class="grid-val">${approved.length} Events</div></div>
          <div><span class="grid-label">Total Allocated</span><div class="grid-val" style="color: #0f766e;">${formatCurrency(totalBudget)}</div></div>
          <div><span class="grid-label">Total Disbursed</span><div class="grid-val" style="color: #047857;">${formatCurrency(totalSpent)}</div></div>
        </div>

        <div style="margin-bottom: 16px;">
          <h4 style="font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0; color: #334155;">Budget vs. Spending Breakdown by Organization</h4>
          <table>
            <thead>
              <tr>
                <th>Organization</th>
                <th style="text-align: center;">Events</th>
                <th style="text-align: right;">Allocated Budget</th>
                <th style="text-align: right;">Total Disbursed</th>
                <th style="text-align: right;">Remaining Balance</th>
              </tr>
            </thead>
            <tbody>
              ${orgSummaryRowsHtml}
            </tbody>
          </table>
        </div>

        <h4 style="font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0; color: #334155;">All Events Record</h4>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Event Name</th>
              <th>Org</th>
              <th>Type</th>
              <th>Date</th>
              <th style="text-align: right;">Budget</th>
              <th style="text-align: right;">Disbursed</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-top: 36px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-family: monospace;">
          <div style="width: 260px;">
            <div style="height: 26px; display: flex; align-items: center; justify-content: center; color: #047857; font-weight: bold; font-size: 11px;">✓ Digitally Certified</div>
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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Cross-Organizational Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">System-wide analytics for all CITE organizations.</p>
        </div>
        <Button variant="outline" onClick={handleExportPdf}><FileDown size={16} /> Export to PDF</Button>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("events")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "events" ? "bg-[var(--primary)] text-white" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"}`}>
          Events Report
        </button>
        <button onClick={() => setTab("finance")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "finance" ? "bg-[var(--primary)] text-white" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"}`}>
          Finance Report
        </button>
      </div>

      {tab === "events" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Events" value={allEvents.length} icon={<Calendar size={18} />} />
            <StatCard label="Approved" value={approved.length} icon={<BarChart2 size={18} />} />
            <StatCard label="Pending" value={allEvents.filter(e => ["For Review","For Approval"].includes(e.status)).length} icon={<Calendar size={18} />} />
            <StatCard label="Closed" value={allEvents.filter(e => e.status === "Closed").length} icon={<BarChart2 size={18} />} />
          </div>
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader><h2 className="font-semibold">Events per Organization</h2></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={orgData} margin={{ left: -20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="events" name="Events" fill="#0d9488" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><h2 className="font-semibold">Events by Status</h2></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={["Approved","For Review","For Approval","Completed","Closed"].map(s => ({
                      name: s, value: allEvents.filter(e => e.status === s).length
                    })).filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name}) => name}>
                      {allEvents.slice(0,5).map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {tab === "finance" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Budget" value={formatCurrency(totalBudget)} icon={<Wallet size={18} />} />
            <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<CreditCard size={18} />} />
            <StatCard label="Remaining" value={formatCurrency(totalBudget - totalSpent)} icon={<Coins size={18} />} />
          </div>
          <Card className="mb-6">
            <CardHeader><h2 className="font-semibold">Budget vs. Spending by Organization</h2></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={orgData} margin={{ left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                  <Bar dataKey="budget" fill="#ccfbf1" radius={[4,4,0,0]} name="Budget" />
                  <Bar dataKey="spent" fill="#0d9488" radius={[4,4,0,0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </CardBody>
          </Card>
        </>
      )}

      {/* Events Table */}
      <Card>
        <CardHeader><h2 className="font-semibold">All Events</h2></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                {["Event","Org","Type","Date","Budget","Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allEvents.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                  <td className="px-4 py-3 font-medium max-w-[160px] truncate">{e.name}</td>
                  <td className="px-4 py-3 text-xs font-mono">{organizations.find(o => o.id === e.organizationId)?.code}</td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{getEventTypeById(e.typeId)?.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatDate(e.dateStart)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
