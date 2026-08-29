import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody, Button, EmptyState } from "../../components/ui";
import {
  Wallet, CreditCard, Coins, CalendarCheck, Search, Grid, List, ChevronDown,
  ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowRight, ArrowUpDown,
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
  const approvedEvents = events.filter((e) => e.organizationId === orgId && ["Approved", "Completed", "Closed"].includes(e.status));
  const allTxns = transactions.filter((t) => approvedEvents.some((e) => e.id === t.eventId) && !t.deleted);

  const totalSpent = allTxns.reduce((s, t) => s + t.amount, 0);
  const allocatedBudget = org?.allocatedBudget ?? 0;
  const remaining = allocatedBudget - totalSpent;

  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  const [view, setView] = useState<"grid" | "list">(defaultView || "grid");

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

  const enrichedApprovedEvents = approvedEvents.map((e) => {
    const eventTxnsList = transactions.filter((t) => t.eventId === e.id && !t.deleted);
    const spent = eventTxnsList.reduce((s, t) => s + t.amount, 0);
    const budget = e.proposedBudget;
    const remaining = budget - spent;
    const utilizationRate = budget > 0 ? (spent / budget) * 100 : 0;
    return {
      ...e,
      spent,
      remaining,
      utilizationRate,
      txnCount: eventTxnsList.length,
    };
  });

  const filteredApprovedEvents = enrichedApprovedEvents
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
        <StatCard label="Allocated Budget" value={formatCurrency(allocatedBudget)} icon={<Wallet size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<CreditCard size={18} />} />
        <StatCard label="Remaining" value={formatCurrency(remaining)} icon={<Coins size={18} />} trend={remaining < 0 ? "down" : "up"} />
        <StatCard label="Approved Events" value={approvedEvents.length} icon={<CalendarCheck size={18} />} />
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
                  {/* Center Text inside Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center z-0">
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)] font-bold uppercase tracking-wider">Total</span>
                    <span className="text-xs font-mono font-extrabold text-[var(--foreground)]">
                      {totalSpent >= 1000 ? `₱${(totalSpent / 1000).toFixed(1)}k` : formatCurrency(totalSpent)}
                    </span>
                  </div>
                </div>

                {/* Rich Category Breakdown Bars & List */}
                <div className="sm:col-span-7 flex flex-col gap-2.5 max-h-[210px] overflow-y-auto pr-1">
                  {byCategory.map((cat, i) => (
                    <div key={i} className="group flex flex-col gap-1 p-1.5 rounded-xl hover:bg-[var(--muted)]/30 transition">
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 font-medium text-[var(--foreground)] truncate max-w-[120px]" title={cat.name}>
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="truncate">{cat.name}</span>
                        </span>
                        <div className="flex items-center gap-2 font-mono flex-shrink-0">
                          <span className="font-bold text-[var(--foreground)]">{formatCurrency(cat.value)}</span>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded-md">
                            {cat.pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      {/* Mini Progress Bar */}
                      <div className="w-full h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${cat.pct}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[190px] text-[var(--muted-foreground)] text-sm">No expenses recorded yet.</div>
            )}
          </CardBody>
        </Card>

        {/* Spending per Event Card */}
        <Card className="flex flex-col">
          <CardHeader className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
            <h2 className="font-semibold text-sm text-[var(--foreground)]">Spending per Event</h2>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-300" /> Budget
              </span>
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-600" /> Spent
              </span>
            </div>
          </CardHeader>
          <CardBody className="flex-1 flex flex-col justify-center p-4">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 5 }}>
                <XAxis dataKey="shortName" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} />
                <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                <Tooltip
                  wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      return (
                        <div className="bg-white border border-slate-200/90 shadow-2xl p-3.5 rounded-2xl text-xs space-y-2 min-w-[200px] z-50">
                          <p className="font-bold text-[var(--foreground)] leading-snug border-b border-[var(--border)] pb-1.5">{item.fullName}</p>
                          <div className="space-y-1.5 font-mono">
                            <div className="flex items-center justify-between gap-3 text-slate-600">
                              <span className="flex items-center gap-1.5 font-sans font-medium text-xs">
                                <span className="w-2.5 h-2.5 rounded-full bg-teal-400" /> Budget:
                              </span>
                              <span className="font-bold text-teal-800">{formatCurrency(item.budget)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 text-slate-600">
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
                <Bar dataKey="budget" fill="#5eead4" radius={[4, 4, 0, 0]} name="Budget" />
                <Bar dataKey="spent" fill="#0d9488" radius={[4, 4, 0, 0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* UX-Friendly Toolbar (Search, Sort, View Toggle) */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 mb-6 shadow-2xs flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search approved events or venues..."
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

      {/* Approved Events (Grid / List Views) */}
      {filteredApprovedEvents.length === 0 ? (
        <EmptyState
          title="No approved events found"
          description={search ? `No events match "${search}". Try another search term.` : "Approved events with financial ledgers will appear here."}
        />
      ) : view === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredApprovedEvents.map((e) => (
            <div
              key={e.id}
              onClick={() => setSelectedEvent(e.id)}
              className="bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--muted)]/30 border border-[var(--border)] rounded-2xl p-5 hover:shadow-md hover:border-[var(--primary)]/50 transition cursor-pointer flex flex-col gap-3 group"
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
                {filteredApprovedEvents.map((e) => (
                  <tr
                    key={e.id}
                    className="hover:bg-[var(--muted)]/30 transition cursor-pointer"
                    onClick={() => setSelectedEvent(e.id)}
                  >
                    <td className="px-4 py-3 font-bold text-[var(--foreground)] max-w-[220px] truncate">{e.name}</td>
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
      )}
    </div>
  );
}
