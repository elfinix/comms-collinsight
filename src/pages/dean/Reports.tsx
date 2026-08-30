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
import EventHistoryTimeline from "../../components/events/EventHistoryTimeline";
import EventClearanceTab from "../../components/events/EventClearanceTab";
import EventFinanceTab from "../../components/events/EventFinanceTab";

const COLORS = ["#0d9488", "#0284c7", "#7c3aed", "#f59e0b", "#10b981", "#64748b"];

const STATUS_FILTERS = ["All", "Created", "For Review", "For Approval", "Pending Revision", "Approved", "Completed", "Closed"];

export default function DeanReports() {
  const { events, transactions, users, organizations } = useApp();
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

    const tableRowsHtml = filteredEvents.map((e, idx) => {
      const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
      const orgCode = organizations.find((o) => o.id === e.organizationId)?.code || "CITE";
      const stStyle = statusReportStyles[e.status] || "background: #f1f5f9; color: #475569;";
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${e.name}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f766e;">${orgCode}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; color: #475569; white-space: nowrap;">${getEventTypeById(e.typeId)?.name || "General"}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e2e8f0; white-space: nowrap;">${formatDate(e.dateStart)}</td>
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

        <h4 style="font-family: monospace; font-size: 11px; font-weight: bold; text-transform: uppercase; margin: 0 0 8px 0; color: #334155;">All Events Record (${filteredEvents.length})</h4>
        <table>
          <thead>
            <tr>
              <th style="width: 30px;">#</th>
              <th>Event Name</th>
              <th>Org</th>
              <th style="white-space: nowrap;">Type</th>
              <th style="white-space: nowrap;">Date</th>
              <th style="text-align: right;">Budget</th>
              <th style="text-align: right;">Spent</th>
              <th style="text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div style="margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 11px;">
          <div>
            <p style="margin: 0; font-weight: bold;">Report Generated by:</p>
            <p style="margin: 20px 0 0 0; font-weight: bold; text-decoration: underline;">${deanName}</p>
            <p style="margin: 2px 0 0 0; color: #64748b;">College Dean, CITE</p>
          </div>
          <div style="text-align: right; color: #94a3b8; font-size: 9px; font-family: monospace; align-self: flex-end;">
            CollsInsight Directorate Analytics · System Generated Report
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    toast.success("Directorate Report Exported", "Comprehensive analytics report prepared for PDF/print export.");
    setTimeout(() => {
      printWindow.print();
    }, 400);
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
