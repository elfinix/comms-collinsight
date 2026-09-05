import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody, Button, EmptyState } from "../../components/ui";
import {
  Wallet, CreditCard, Coins, CalendarCheck, Search, Grid, List, ChevronDown,
  ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowRight, ArrowUpDown, Building2, CheckCircle,
  Lock, Clock,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { formatCurrency, formatDate, statusColors, getCategoryById } from "../../services/mockData";
import FinanceLedgerView from "./FinanceLedgerView";

const COLORS = ["#0d9488", "#0284c7", "#7c3aed", "#f59e0b", "#ef4444", "#10b981", "#f97316"];

export default function StudentFinance() {
  const { currentUser } = useAuth();
  const { events, transactions, organizations, expenditureCategories, defaultView } = useApp();
  const navigate = useNavigate();

  const orgId = currentUser?.organizationId ?? "";
  const org = organizations.find((o) => o.id === orgId);
  const orgEvents = events.filter((e) => e.organizationId === orgId && !e.deleted);
  const approvedEvents = orgEvents.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const allTxns = transactions.filter((t) => approvedEvents.some((e) => e.id === t.eventId) && !t.deleted);

  const organizationBudget = org?.allocatedBudget ?? 0;
  const totalSpent = allTxns.reduce((s, t) => s + t.amount, 0);

  // Allocated Budget = total sum of committed funds among proposed events so far
  // For Closed events, the unspent surplus has reverted to treasury, so committed cost is actual spent
  const allocatedBudget = orgEvents.reduce((sum, e) => {
    if (e.status === "Closed") {
      const eventTxns = transactions.filter((t) => t.eventId === e.id && !t.deleted);
      const spent = eventTxns.reduce((s, t) => s + t.amount, 0);
      return sum + spent;
    }
    return sum + (e.proposedBudget || 0);
  }, 0);

  const remaining = organizationBudget - allocatedBudget;

  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const [view, setView] = useState<"grid" | "list">(defaultView || "grid");
  const [approvedExpanded, setApprovedExpanded] = useState(true);
  const [pendingExpanded, setPendingExpanded] = useState(false);

  useEffect(() => {
    setView(defaultView || "grid");
  }, [defaultView]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("dateStart");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const byCategory = Object.entries(
    allTxns.reduce<Record<string, number>>((acc, t) => {
      const name = expenditureCategories.find((c) => c.id === t.categoryId)?.name ?? getCategoryById(t.categoryId)?.name ?? "Other";
      acc[name] = (acc[name] || 0) + t.amount;
      return acc;
    }, {})
  )
    .map(([name, value], idx) => {
      const pct = totalSpent > 0 ? (value / totalSpent) * 100 : 0;
      return {
        name,
        value,
        pct,
        color: COLORS[idx % COLORS.length],
      };
    })
    .sort((a, b) => b.value - a.value);

  const chartData = approvedEvents.map((e) => {
    const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
    const cleanName = e.name.replace(/[:,-]/g, " ").trim();
    const shortName = cleanName.length > 14 ? cleanName.slice(0, 12).trim() + "…" : cleanName;
    return {
      id: e.id,
      shortName,
      fullName: e.name,
      budget: e.proposedBudget,
      spent,
    };
  });

  const enrichedOrgEvents = orgEvents.map((e) => {
    const isApproved = ["Approved", "Completed", "Closed"].includes(e.status);
    const eventTxnsList = transactions.filter((t) => t.eventId === e.id && !t.deleted);
    const spent = isApproved ? eventTxnsList.reduce((s, t) => s + t.amount, 0) : 0;
    const budget = e.proposedBudget || 0;
    const rem = isApproved ? budget - spent : budget;
    const utilizationRate = isApproved && budget > 0 ? (spent / budget) * 100 : 0;
    const netSurplus = isApproved ? Math.max(0, rem) + (e.revenue || 0) : 0;
    return {
      ...e,
      isApproved,
      spent,
      remaining: rem,
      utilizationRate,
      netSurplus,
      txnCount: eventTxnsList.length,
    };
  });

  const filteredEvents = enrichedOrgEvents
    .filter((e) => {
      if (search && !e.name.toLowerCase().includes(search.toLowerCase()) && !e.location.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let va: any = a[sortKey as keyof typeof a] ?? "";
      let vb: any = b[sortKey as keyof typeof b] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      return sortDir === "asc" ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
    });

  const approvedGroup = filteredEvents.filter((e) => e.isApproved);
  const pendingGroup = filteredEvents.filter((e) => !e.isApproved);
  const totalPendingBudget = pendingGroup.reduce((s, e) => s + (e.proposedBudget || 0), 0);

  // Render modular ledger view when a specific event is selected
  if (selectedEvent) {
    return (
      <FinanceLedgerView
        selectedEventId={selectedEvent}
        onBack={() => setSelectedEvent(null)}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Finance</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Organizational financial overview and event ledgers.</p>
      </div>

      {/* Org Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Organization Budget" value={formatCurrency(organizationBudget)} icon={<Building2 size={18} />} />
        <StatCard label="Allocated Budget" value={formatCurrency(allocatedBudget)} icon={<Wallet size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<CreditCard size={18} />} />
        <StatCard label="Remaining" value={formatCurrency(remaining)} icon={<Coins size={18} />} trend={remaining < 0 ? "down" : "up"} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Spending by Category Card */}
        <Card className="flex flex-col">
          <CardHeader className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <h2 className="font-semibold text-sm text-[var(--foreground)]">Spending by Category</h2>
            {byCategory.length > 0 && (
              <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-bold">
                {byCategory.length} Categories
              </span>
            )}
          </CardHeader>
          <CardBody className="flex-1 flex flex-col justify-center p-4">
            {byCategory.length > 0 ? (
              <div className="grid sm:grid-cols-12 gap-4 items-center">
                {/* Donut Chart with Center Total */}
                <div className="sm:col-span-5 relative flex items-center justify-center min-h-[190px]">
                  <ResponsiveContainer width="100%" height={190}>
                    <PieChart>
                      <Pie
                        data={byCategory}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={52}
                        outerRadius={78}
                        paddingAngle={3}
                        cornerRadius={4}
                      >
                        {byCategory.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip
                        wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-white border border-slate-200/90 shadow-2xl px-3.5 py-2.5 rounded-xl text-xs space-y-1 z-50 min-w-[160px]">
                                <div className="flex items-center gap-1.5 font-bold text-[var(--foreground)]">
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: data.color }} />
                                  <span className="truncate">{data.name}</span>
                                </div>
                                <div className="flex items-center justify-between gap-4 font-mono">
                                  <span className="text-teal-900 font-bold">{formatCurrency(data.value)}</span>
                                  <span className="text-[var(--muted-foreground)]">({data.pct.toFixed(1)}%)</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Total</span>
                    <span className="text-sm font-extrabold font-mono text-[var(--foreground)] mt-0.5">{formatCurrency(totalSpent)}</span>
                  </div>
                </div>

                {/* Legend List */}
                <div className="sm:col-span-7 flex flex-col gap-2 max-h-[200px] overflow-y-auto pr-1">
                  {byCategory.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-[var(--border)]/40 last:border-0">
                      <div className="flex items-center gap-2 min-w-0 pr-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-2xs" style={{ backgroundColor: item.color }} />
                        <span className="text-[var(--foreground)] font-medium truncate">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono shrink-0">
                        <span className="font-bold text-[var(--foreground)]">{formatCurrency(item.value)}</span>
                        <span className="text-[var(--muted-foreground)] text-[10px] w-9 text-right font-medium">{item.pct.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState title="No spending records" description="Expenses recorded on approved event ledgers will appear here." />
            )}
          </CardBody>
        </Card>

        {/* Spending per Event Card */}
        <Card className="flex flex-col">
          <CardHeader className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <h2 className="font-semibold text-sm text-[var(--foreground)]">Spending per Event</h2>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#4db8b0]" /> Budget</span>
              <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#0a6b64]" /> Spent</span>
            </div>
          </CardHeader>
          <CardBody className="flex-1 flex flex-col justify-center p-4">
            {chartData.length === 0 ? (
              <EmptyState title="No approved events" description="Approved events will populate this chart." />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="shortName"
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={{ stroke: "var(--border)" }}
                    tickLine={false}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₱${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`}
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                    wrapperStyle={{ zIndex: 50 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200/90 shadow-2xl px-3.5 py-2.5 rounded-xl text-xs space-y-1.5 z-50 min-w-[180px]">
                            <p className="font-bold text-[var(--foreground)] truncate max-w-[200px]">{data.fullName}</p>
                            <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
                              <span className="text-[#4db8b0] font-bold">Budget:</span>
                              <span className="font-bold">{formatCurrency(data.budget)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
                              <span className="text-[#0a6b64] font-bold">Spent:</span>
                              <span className="font-bold text-[#0a6b64]">{formatCurrency(data.spent)}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="budget" fill="#4db8b0" radius={[4, 4, 0, 0]} name="Budget" />
                  <Bar dataKey="spent" fill="#0a6b64" radius={[4, 4, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* UX-Friendly Toolbar (Search, Filter, Sort, View Toggle) */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-6 shadow-2xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search events or venues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--background)] text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition shadow-2xs"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] text-xs cursor-pointer p-0.5"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Dropdown */}
            <div className="relative flex items-center">
              <ArrowUpDown size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="pl-8 pr-7 py-2 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs hover:border-[var(--primary)]/40 transition"
              >
                <option value="dateStart">Event Date</option>
                <option value="name">Name (A-Z)</option>
                <option value="proposedBudget">Budget</option>
                <option value="spent">Total Spent</option>
                <option value="remaining">Remaining Balance</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 text-[var(--muted-foreground)] pointer-events-none" />
            </div>

            {/* Asc / Desc Toggle */}
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

            {/* Grid vs List Toggle */}
            <div className="flex border border-[var(--border)] rounded-xl overflow-hidden p-0.5 bg-[var(--muted)]/30">
              <button
                onClick={() => setView("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  view === "grid"
                    ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Grid size={13} />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  view === "list"
                    ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <List size={13} />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Events (Approved first, Pending below) */}
      {filteredEvents.length === 0 ? (
        <EmptyState
          title="No events found"
          description={search ? `No events match "${search}". Try another search term.` : "No events available for this organization."}
        />
      ) : (
        <div className="space-y-8">
          {/* SECTION 1: APPROVED EVENTS (Default Extended) */}
          {approvedGroup.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setApprovedExpanded((prev) => !prev)}
                  className="flex items-center gap-2.5 text-left transition cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-xl bg-teal-100 text-teal-800 border border-teal-200 flex items-center justify-center transition-all group-hover:bg-teal-200 group-hover:border-teal-400 group-hover:text-teal-950 shadow-2xs">
                    <ChevronDown size={16} className={`transition-transform duration-200 ${approvedExpanded ? "rotate-0" : "-rotate-90"}`} />
                  </div>
                  <h2 className="text-base font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition">Approved Events</h2>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 border border-teal-200">
                    {approvedGroup.length}
                  </span>
                </button>
              </div>

              {approvedExpanded && (
                view === "grid" ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {approvedGroup.map((e) => (
                      <div
                        key={e.id}
                        onClick={() => setSelectedEvent(e.id)}
                        className="bg-white border border-[var(--border)] rounded-2xl p-5 hover:shadow-md hover:border-[var(--primary)]/50 transition cursor-pointer flex flex-col gap-3 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                          <span className="text-xs text-[var(--muted-foreground)] font-mono">{e.mode}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--foreground)] leading-snug group-hover:text-[var(--primary)] transition line-clamp-1">{e.name}</h3>
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{formatDate(e.dateStart)} · {e.location}</p>
                        </div>

                        {/* Financial Metrics Mini-Grid */}
                        <div className="grid grid-cols-2 gap-2 bg-[var(--muted)]/40 p-3 rounded-xl border border-[var(--border)] text-xs">
                          <div>
                            <p className="text-[10px] font-mono text-[var(--muted-foreground)] font-bold">Proposed Budget</p>
                            <p className="font-mono font-bold text-[var(--foreground)] mt-0.5">{formatCurrency(e.proposedBudget)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-[var(--muted-foreground)] font-bold">Total Spent</p>
                            <p className="font-mono font-bold text-teal-700 mt-0.5">{formatCurrency(e.spent)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-[var(--muted-foreground)] font-bold">Remaining</p>
                            <p className={`font-mono font-bold mt-0.5 ${e.remaining >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                              {formatCurrency(e.remaining)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-[var(--muted-foreground)] font-bold">Utilization</p>
                            <p className="font-mono font-bold text-[var(--primary)] mt-0.5">{e.utilizationRate.toFixed(1)}%</p>
                          </div>
                        </div>

                        {/* If Closed, show Proposal Surplus Reconciled Banner */}
                        {e.status === "Closed" && (
                          <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium">
                            <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                            <span className="leading-tight text-[11px]">
                              Proposal Surplus Reconciled: <strong className="font-mono text-emerald-950 font-bold">{formatCurrency(e.remaining)}</strong>
                            </span>
                          </div>
                        )}

                        {/* Footer with Ledger CTA */}
                        <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-[var(--border)]">
                          <span className="text-xs font-mono text-[var(--muted-foreground)]">
                            {e.txnCount} transaction{e.txnCount === 1 ? "" : "s"}
                          </span>
                          <span className="text-xs font-bold text-[var(--primary)] flex items-center gap-1 group-hover:translate-x-0.5 transition">
                            Open Ledger <ArrowRight size={13} />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[var(--muted)]/40 border-b border-[var(--border)]">
                            {["Event", "Date", "Budget", "Spent", "Remaining", "Status", "Actions"].map((h) => (
                              <th key={h} className={`px-4 py-3 text-xs font-mono font-semibold text-[var(--muted-foreground)] ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {approvedGroup.map((e) => (
                            <tr
                              key={e.id}
                              className="hover:bg-[var(--muted)]/30 transition cursor-pointer"
                              onClick={() => setSelectedEvent(e.id)}
                            >
                              <td className="px-4 py-3 font-bold text-[var(--foreground)] max-w-[220px]">
                                <div className="truncate">{e.name}</div>
                                {e.status === "Closed" && (
                                  <span className="text-[10px] font-mono text-emerald-700 font-semibold block mt-0.5">
                                    Proposal Surplus Reconciled: {formatCurrency(e.remaining)}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">{formatDate(e.dateStart)}</td>
                              <td className="px-4 py-3 font-mono text-xs font-semibold">{formatCurrency(e.proposedBudget)}</td>
                              <td className="px-4 py-3 font-mono text-xs text-teal-700 font-bold">{formatCurrency(e.spent)}</td>
                              <td className={`px-4 py-3 font-mono text-xs font-semibold ${e.remaining >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                                {formatCurrency(e.remaining)}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${statusColors[e.status]}`}>{e.status}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 font-mono shadow-2xs">
                                  Ledger <ArrowRight size={11} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )
              )}
            </div>
          )}

          {/* SECTION 2: PENDING PROPOSALS (Default Collapsed, Ghost Card Styling) */}
          {pendingGroup.length > 0 && (
            <div>
              <div className="flex items-center justify-between gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setPendingExpanded((prev) => !prev)}
                  className="flex items-center gap-2.5 text-left transition cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 border border-amber-300 flex items-center justify-center transition-all group-hover:bg-amber-200 group-hover:border-amber-400 group-hover:text-amber-950 shadow-2xs">
                    <ChevronDown size={16} className={`transition-transform duration-200 ${pendingExpanded ? "rotate-0" : "-rotate-90"}`} />
                  </div>
                  <h2 className="text-base font-bold text-[var(--foreground)] group-hover:text-amber-700 transition">Pending Proposals</h2>
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    {pendingGroup.length}
                  </span>
                </button>

                <div className="flex items-center gap-3">
                  <p className="text-xs text-[var(--muted-foreground)] font-mono hidden sm:block">
                    Reserving <strong className="text-[var(--primary)] font-bold">{formatCurrency(totalPendingBudget)}</strong> in budget headroom
                  </p>
                </div>
              </div>

              {pendingExpanded && (
                view === "grid" ? (
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingGroup.map((e) => (
                      <div
                        key={e.id}
                        className="bg-[#f8fcfc] border-2 border-dashed border-slate-300 rounded-2xl p-5 shadow-2xs flex flex-col gap-3.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${statusColors[e.status]}`}>
                            {e.status}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)] font-mono">{e.mode}</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-[var(--foreground)] leading-snug line-clamp-1">{e.name}</h3>
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{formatDate(e.dateStart)} · {e.location}</p>
                        </div>

                        {/* Financial Metrics Mini-Grid */}
                        <div className="grid grid-cols-2 gap-2 bg-[var(--muted)]/40 p-3 rounded-xl border border-dashed border-[var(--border)] text-xs">
                          <div>
                            <p className="text-[10px] font-mono text-[var(--muted-foreground)] font-bold uppercase tracking-wider">Proposed Budget</p>
                            <p className="font-mono font-bold text-[var(--primary)] text-sm mt-0.5">{formatCurrency(e.proposedBudget)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-[var(--muted-foreground)] font-bold uppercase tracking-wider">Total Spent</p>
                            <p className="font-mono font-medium text-slate-400 dark:text-slate-500 mt-0.5">—</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-[var(--muted-foreground)] font-bold uppercase tracking-wider">Remaining</p>
                            <p className="font-mono font-medium text-slate-400 dark:text-slate-500 mt-0.5">—</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-mono text-[var(--muted-foreground)] font-bold uppercase tracking-wider">Utilization</p>
                            <p className="font-mono font-medium text-slate-400 dark:text-slate-500 mt-0.5">—</p>
                          </div>
                        </div>

                        {/* Notice */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                          <Clock size={14} className="text-amber-600 shrink-0" />
                          <span>Ledger locked · Activates upon Dean approval</span>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-[var(--border)]">
                          <span className="text-xs font-mono text-[var(--muted-foreground)]">Budget Reserved</span>
                          <span className="text-xs font-semibold text-[var(--muted-foreground)] flex items-center gap-1.5">
                            <Lock size={12} /> Locked
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-[var(--muted)]/40 border-b border-[var(--border)]">
                            {["Event", "Date", "Proposed Budget", "Spent", "Remaining", "Status", "Actions"].map((h) => (
                              <th key={h} className={`px-4 py-3 text-xs font-mono font-semibold text-[var(--muted-foreground)] ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border)]">
                          {pendingGroup.map((e) => (
                            <tr key={e.id}>
                              <td className="px-4 py-3 font-semibold text-[var(--foreground)] max-w-[220px]">
                                <div className="truncate">{e.name}</div>
                                <span className="text-[10px] font-mono text-amber-700 font-medium block mt-0.5">Pending Dean Approval</span>
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">{formatDate(e.dateStart)}</td>
                              <td className="px-4 py-3 font-mono text-xs font-bold text-[var(--primary)]">{formatCurrency(e.proposedBudget)}</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-400 dark:text-slate-500">—</td>
                              <td className="px-4 py-3 font-mono text-xs text-slate-400 dark:text-slate-500">—</td>
                              <td className="px-4 py-3">
                                <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${statusColors[e.status]}`}>{e.status}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-xs font-mono text-[var(--muted-foreground)] inline-flex items-center gap-1">
                                  <Lock size={11} /> Locked
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
