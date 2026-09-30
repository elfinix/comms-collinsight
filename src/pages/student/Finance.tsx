import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import {
  StatCard,
  Card,
  CardHeader,
  CardBody,
  Button,
  Dialog,
  Input,
  Textarea,
  Select,
  EmptyState,
  RefreshButton,
  SkeletonStatCard,
  SkeletonChart,
  SkeletonTable,
  SkeletonEventCard,
} from "../../components/ui";
import {
  Wallet, CreditCard, Coins, CalendarCheck, Search, Grid, List, ChevronDown,
  ArrowDownWideNarrow, ArrowUpNarrowWide, ArrowRight, ArrowUpDown, Building2, CheckCircle,
  Lock, Clock, Plus, Trash2, Edit2, TrendingUp, DollarSign, Calendar,
  HeartHandshake, ShoppingBag, Users, CircleDot, Sparkles
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { formatCurrency, formatDate, statusColors, getStatusBadgeClass, getCategoryById, Initiative, InitiativeSource } from "../../services/dataService";
import FinanceLedgerView from "./FinanceLedgerView";

const COLORS = ["#ea580c", "#3b82f6", "#6366f1", "#f59e0b", "#ef4444", "#10b981", "#f97316"];

export function getInitiativeSourceBadgeClass(source: string): string {
  switch (source) {
    case "Fundraising":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "Sponsorship":
      return "bg-indigo-50 text-indigo-800 border-indigo-200";
    case "Donation":
      return "bg-pink-50 text-pink-800 border-pink-200";
    case "Merchandise Sales":
      return "bg-purple-50 text-purple-800 border-purple-200";
    case "Membership Fee":
    case "Membership Fees":
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case "Event Revenue":
      return "bg-blue-50 text-blue-800 border-blue-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

const INITIATIVE_SOURCES: { value: InitiativeSource; label: string; icon?: React.ReactNode }[] = [
  { value: "Fundraising", label: "Fundraising", icon: <Coins size={15} className="text-amber-600" /> },
  { value: "Sponsorship", label: "Sponsorship", icon: <Building2 size={15} className="text-blue-600" /> },
  { value: "Donation", label: "Donation", icon: <HeartHandshake size={15} className="text-pink-600" /> },
  { value: "Merchandise Sales", label: "Merchandise Sales", icon: <ShoppingBag size={15} className="text-emerald-600" /> },
  { value: "Membership Fee", label: "Membership Fee", icon: <Users size={15} className="text-indigo-600" /> },
  { value: "Event Revenue", label: "Event Revenue", icon: <TrendingUp size={15} className="text-purple-600" /> },
  { value: "Other", label: "Other", icon: <CircleDot size={15} className="text-slate-500" /> },
];

function isEventFinanceUnlocked(status: string, setting?: string): boolean {
  if (status === "Completed" || status === "Closed" || status === "Approved") return true;
  if (setting === "Off-campus") {
    return status === "CMO Authorized";
  }
  return status === "SDS Authorized" || status === "CMO Authorized";
}

export default function StudentFinance() {
  const { currentUser } = useAuth();
  const {
    events,
    transactions,
    organizations,
    initiatives,
    addInitiative,
    updateInitiative,
    deleteInitiative,
    expenditureCategories,
    defaultView,
    isLoading
  } = useApp();
  const { toast } = useToast();
  const navigate = useNavigate();

  const orgId = currentUser?.organizationId ?? "";
  const org = organizations.find((o) => o.id === orgId);

  // Exclude deleted & rejected events from finance calculations
  const orgEvents = events.filter((e) => e.organizationId === orgId && !e.deleted && e.status !== "Rejected");
  const approvedEvents = orgEvents.filter((e) => isEventFinanceUnlocked(e.status, e.setting));
  const allTxns = transactions.filter((t) => approvedEvents.some((e) => e.id === t.eventId) && !t.deleted);

  // Dual Budgets
  const departmentalBudget = org?.departmentalBudget ?? 0;
  const organizationalBudget = org?.organizationalBudget ?? 0;
  const totalAvailableBudget = departmentalBudget + organizationalBudget || (org?.allocatedBudget ?? 0);
  const totalSpent = allTxns.reduce((s, t) => s + t.amount, 0);

  // Total allocated among proposed active events + actual spent for closed
  const allocatedBudget = orgEvents.reduce((sum, e) => {
    if (e.status === "Closed") {
      const eventTxns = transactions.filter((t) => t.eventId === e.id && !t.deleted);
      const spent = eventTxns.reduce((s, t) => s + t.amount, 0);
      return sum + spent;
    }
    return sum + (e.proposedBudget || 0);
  }, 0);

  const remaining = totalAvailableBudget - allocatedBudget;

  // Org Initiatives
  const orgInitiatives = (initiatives || []).filter((i) => i.organizationId === orgId && !i.deleted);
  const totalInitiativesRevenue = orgInitiatives.reduce((sum, i) => sum + i.amount, 0);

  const [activeSubTab, setActiveSubTab] = useState<"events" | "initiatives">("events");
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

  // Add / Edit Initiative Modal State
  const [showAddInitiative, setShowAddInitiative] = useState(false);
  const [initTitle, setInitTitle] = useState("");
  const [initDate, setInitDate] = useState(new Date().toISOString().split("T")[0]);
  const [initSource, setInitSource] = useState<InitiativeSource>("Fundraising");
  const [initAmount, setInitAmount] = useState("");
  const [initDesc, setInitDesc] = useState("");
  const [deleteInitConfirm, setDeleteInitConfirm] = useState<Initiative | null>(null);

  const [editingInitiative, setEditingInitiative] = useState<Initiative | null>(null);
  const [editInitTitle, setEditInitTitle] = useState("");
  const [editInitDate, setEditInitDate] = useState("");
  const [editInitSource, setEditInitSource] = useState<InitiativeSource>("Fundraising");
  const [editInitAmount, setEditInitAmount] = useState("");
  const [editInitDesc, setEditInitDesc] = useState("");

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
    const isApproved = isEventFinanceUnlocked(e.status, e.setting);
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

  function handleSaveInitiative() {
    const amt = parseFloat(initAmount);
    if (!initTitle.trim() || isNaN(amt) || amt <= 0) return;

    addInitiative({
      id: crypto.randomUUID(),
      organizationId: orgId,
      title: initTitle.trim(),
      date: initDate || new Date().toISOString(),
      source: initSource,
      amount: amt,
      description: initDesc.trim(),
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id,
    });

    toast.success("Initiative Logged", `Added ₱${amt.toLocaleString()} from '${initTitle.trim()}' to Organizational Budget.`);
    setShowAddInitiative(false);
    setInitTitle("");
    setInitAmount("");
    setInitDesc("");
  }

  function handleOpenEditInitiative(init: Initiative) {
    setEditingInitiative(init);
    setEditInitTitle(init.title || init.name || "");
    setEditInitSource((init.source as InitiativeSource) || "Fundraising");
    setEditInitDate(init.date ? init.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setEditInitAmount(String(init.amount ?? init.netProfit ?? 0));
    setEditInitDesc(init.description || "");
  }

  function handleSaveEditInitiative() {
    if (!editingInitiative) return;
    const amt = parseFloat(editInitAmount);
    if (!editInitTitle.trim() || isNaN(amt) || amt <= 0) return;

    updateInitiative(editingInitiative.id, {
      title: editInitTitle.trim(),
      source: editInitSource,
      date: editInitDate ? new Date(editInitDate).toISOString() : new Date().toISOString(),
      amount: amt,
      description: editInitDesc.trim(),
    });

    toast.success("Initiative Updated", `Updated '${editInitTitle.trim()}'.`);
    setEditingInitiative(null);
  }

  function handleDeleteInitiative(init: Initiative) {
    deleteInitiative(init.id);
    toast.info("Initiative Removed", `'${init.title}' removed from ledger.`);
    setDeleteInitConfirm(null);
  }

  // Render modular ledger view when a specific event is selected
  if (selectedEvent) {
    return (
      <FinanceLedgerView
        selectedEventId={selectedEvent}
        onBack={() => {
          setSelectedEvent(null);
          const mainElem = document.querySelector("main");
          if (mainElem) {
            mainElem.scrollTo({ top: 0, left: 0, behavior: "instant" });
          }
          window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        }}
      />
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Finance</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Dual-budget overview, event ledgers, and revenue initiatives.</p>
        </div>
        <div className="flex items-center gap-2">
          {activeSubTab === "initiatives" && (
            <Button onClick={() => setShowAddInitiative(true)}>
              <Plus size={16} /> Add Initiative
            </Button>
          )}
          <RefreshButton />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
          <SkeletonTable rows={5} cols={6} />
        </div>
      ) : (
        <>
          {/* 5 Top Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mb-6">
            <StatCard
              label="Departmental Budget"
              value={formatCurrency(departmentalBudget)}
              icon={<Building2 size={17} />}
            />
            <StatCard
              label="Organizational Budget"
              value={formatCurrency(organizationalBudget)}
              icon={<Coins size={17} />}
            />
            <StatCard
              label="Allocated Budget"
              value={formatCurrency(allocatedBudget)}
              icon={<Wallet size={17} />}
            />
            <StatCard
              label="Total Spent"
              value={formatCurrency(totalSpent)}
              icon={<CreditCard size={17} />}
            />
            <StatCard
              label="Remaining Balance"
              value={formatCurrency(remaining)}
              icon={<Coins size={17} />}
              trend={remaining < 0 ? "down" : "up"}
            />
          </div>

          {/* Sub-Tabs: Organizational Events vs Organizational Initiatives */}
          <div className="flex border-b border-[var(--border)] mb-6 gap-2">
            <button
              onClick={() => setActiveSubTab("events")}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition cursor-pointer flex items-center gap-2 ${
                activeSubTab === "events"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <CalendarCheck size={16} />
              <span>Organizational Events</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--foreground)]">
                {orgEvents.length}
              </span>
            </button>
            <button
              onClick={() => setActiveSubTab("initiatives")}
              className={`px-4 py-2.5 text-sm font-bold border-b-2 -mb-px transition cursor-pointer flex items-center gap-2 ${
                activeSubTab === "initiatives"
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <TrendingUp size={16} />
              <span>Organizational Initiatives</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--foreground)]">
                {orgInitiatives.length}
              </span>
            </button>
          </div>

          {activeSubTab === "events" && (
            <>
              {/* Charts */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Spending by Category Card */}
                <Card className="flex flex-col">
                  <CardHeader className="flex items-center justify-between pb-2 border-b border-[var(--border)]">
                    <h2 className="font-semibold text-sm text-[var(--foreground)]">Spending by Category</h2>
                    {byCategory.length > 0 && (
                      <span className="text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-800 border border-orange-200 font-bold">
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
                                          <span className="text-slate-900 font-bold">{formatCurrency(data.value)}</span>
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
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#3b82f6]" /> Budget</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-xs bg-[#ea580c]" /> Spent</span>
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
                                      <span className="text-[#3b82f6] font-bold">Budget:</span>
                                      <span className="font-bold">{formatCurrency(data.budget)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-4 font-mono text-[11px]">
                                      <span className="text-[#ea580c] font-bold">Spent:</span>
                                      <span className="font-bold text-[#ea580c]">{formatCurrency(data.spent)}</span>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="budget" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Budget" />
                          <Bar dataKey="spent" fill="#ea580c" radius={[4, 4, 0, 0]} name="Spent" />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardBody>
                </Card>
              </div>

              {/* UX Toolbar */}
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

              {/* Events List */}
              {filteredEvents.length === 0 ? (
                <EmptyState
                  title="No events found"
                  description={search ? `No events match "${search}". Try another search term.` : "No events available for this organization."}
                />
              ) : (
                <div className="space-y-8">
                  {/* SECTION 1: APPROVED EVENTS */}
                  {approvedGroup.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between gap-3 mb-4">
                        <button
                          type="button"
                          onClick={() => setApprovedExpanded((prev) => !prev)}
                          className="flex items-center gap-2.5 text-left transition cursor-pointer group"
                        >
                          <div className="w-7 h-7 rounded-xl bg-blue-50 text-blue-800 border border-blue-200 flex items-center justify-center transition-all group-hover:bg-blue-100 group-hover:border-blue-300 group-hover:text-blue-950 shadow-2xs">
                            <ChevronDown size={16} className={`transition-transform duration-200 ${approvedExpanded ? "rotate-0" : "-rotate-90"}`} />
                          </div>
                          <h2 className="text-base font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition">Approved & Active Events</h2>
                          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
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
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(e.status, e.setting)}`}>{e.status}</span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                      {e.category || "Organizational"}
                                    </span>
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${e.setting === "Off-campus" ? "bg-amber-50 text-amber-800 border-amber-200 font-bold" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                      {e.setting || "On-campus"}
                                    </span>
                                  </div>
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
                                    <p className="font-mono font-bold text-blue-700 dark:text-blue-400 mt-0.5">{formatCurrency(e.spent)}</p>
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

                                {/* Surplus Reconciled Banner */}
                                {e.status === "Closed" && (
                                  <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                                    <CheckCircle size={14} className="text-emerald-600 shrink-0" />
                                    <span className="leading-tight text-[11px]">
                                      Surplus Reconciled: <strong className="font-mono text-emerald-950 font-bold">{formatCurrency(e.remaining)}</strong>
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
                                    {["Event", "Classification", "Date", "Budget", "Spent", "Remaining", "Status", "Actions"].map((h) => (
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
                                            Surplus Reconciled: {formatCurrency(e.remaining)}
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-xs">
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 mr-1">
                                          {e.category || "Organizational"}
                                        </span>
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${e.setting === "Off-campus" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                          {e.setting || "On-campus"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">{formatDate(e.dateStart)}</td>
                                      <td className="px-4 py-3 font-mono text-xs font-semibold">{formatCurrency(e.proposedBudget)}</td>
                                      <td className="px-4 py-3 font-mono text-xs text-blue-700 dark:text-blue-400 font-bold">{formatCurrency(e.spent)}</td>
                                      <td className={`px-4 py-3 font-mono text-xs font-semibold ${e.remaining >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                                        {formatCurrency(e.remaining)}
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${getStatusBadgeClass(e.status, e.setting)}`}>{e.status}</span>
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

                  {/* SECTION 2: PENDING PROPOSALS */}
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
                          <h2 className="text-base font-bold text-[var(--foreground)] group-hover:text-amber-700 transition">Pending Proposals (Ledger Locked)</h2>
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
                                <div className="flex items-start justify-between gap-2 flex-wrap">
                                  <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${getStatusBadgeClass(e.status, e.setting)}`}>
                                    {e.status}
                                  </span>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                      {e.category || "Organizational"}
                                    </span>
                                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${e.setting === "Off-campus" ? "bg-amber-50 text-amber-800 border-amber-200 font-bold" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                      {e.setting || "On-campus"}
                                    </span>
                                  </div>
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
                                  <span>Ledger locked · Activates on {e.setting === "Off-campus" ? "CMO" : "SDS"} authorization</span>
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
                                    {["Event", "Classification", "Date", "Proposed Budget", "Spent", "Remaining", "Status", "Actions"].map((h) => (
                                      <th key={h} className={`px-4 py-3 text-xs font-mono font-semibold text-[var(--muted-foreground)] ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                  {pendingGroup.map((e) => (
                                    <tr key={e.id}>
                                      <td className="px-4 py-3 font-semibold text-[var(--foreground)] max-w-[220px]">
                                        <div className="truncate">{e.name}</div>
                                        <span className="text-[10px] font-mono text-amber-700 font-medium block mt-0.5">
                                          Awaiting {e.setting === "Off-campus" ? "CMO" : "SDS"} Authorization
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-xs">
                                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 mr-1">
                                          {e.category || "Organizational"}
                                        </span>
                                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${e.setting === "Off-campus" ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200"}`}>
                                          {e.setting || "On-campus"}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">{formatDate(e.dateStart)}</td>
                                      <td className="px-4 py-3 font-mono text-xs font-bold text-[var(--primary)]">{formatCurrency(e.proposedBudget)}</td>
                                      <td className="px-4 py-3 font-mono text-xs text-slate-400 dark:text-slate-500">—</td>
                                      <td className="px-4 py-3 font-mono text-xs text-slate-400 dark:text-slate-500">—</td>
                                      <td className="px-4 py-3">
                                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold ${getStatusBadgeClass(e.status, e.setting)}`}>{e.status}</span>
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
            </>
          )}

          {activeSubTab === "initiatives" && (
            <div className="space-y-6">
              {/* Initiatives Summary Top Card */}
              <div className="bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-blue-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp size={18} className="text-amber-300" />
                    <h2 className="text-lg font-bold">Organizational Revenue & Initiatives</h2>
                  </div>
                  <p className="text-xs text-blue-200 max-w-xl leading-relaxed">
                    Track non-event revenue including fundraisings, external sponsorships, merchandise sales, and surplus deposited from closed events. Revenue directly increases the Organizational Budget.
                  </p>
                </div>
                <div className="flex items-center gap-6 bg-white/10 px-5 py-3 rounded-xl border border-white/15">
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-blue-200">Total Initiatives</p>
                    <p className="text-xl font-bold font-mono">{orgInitiatives.length}</p>
                  </div>
                  <div className="h-8 w-[1px] bg-white/20" />
                  <div>
                    <p className="text-[10px] font-mono uppercase tracking-wider text-blue-200">Total Revenue</p>
                    <p className="text-xl font-bold font-mono text-emerald-300">{formatCurrency(totalInitiativesRevenue)}</p>
                  </div>
                </div>
              </div>

              {/* Initiatives Table */}
              <Card>
                <CardHeader className="flex items-center justify-between gap-3 border-b border-[var(--border)]">
                  <div>
                    <h3 className="font-bold text-base text-[var(--foreground)]">Initiatives Ledger</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">All recorded organizational revenue streams.</p>
                  </div>
                  <Button size="sm" onClick={() => setShowAddInitiative(true)}>
                    <Plus size={14} /> Add Initiative
                  </Button>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[var(--muted)]/60 border-b border-[var(--border)] text-xs font-mono text-[var(--muted-foreground)]">
                        <th className="px-4 py-3.5 text-center w-12 whitespace-nowrap">#</th>
                        <th className="px-4 py-3.5 text-left whitespace-nowrap min-w-[220px]">Initiative / Source Title</th>
                        <th className="px-4 py-3.5 text-left whitespace-nowrap min-w-[150px]">Category / Source</th>
                        <th className="px-4 py-3.5 text-left whitespace-nowrap min-w-[120px]">Date Recorded</th>
                        <th className="px-4 py-3.5 text-right whitespace-nowrap min-w-[140px]">Amount (₱)</th>
                        <th className="px-4 py-3.5 text-left min-w-[240px]">Description</th>
                        <th className="px-4 py-3.5 text-right whitespace-nowrap w-28">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {orgInitiatives.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                            <EmptyState
                              icon={<Coins size={36} />}
                              title="No initiatives recorded"
                              description="Add a fundraising, sponsorship, or donation to augment your organizational budget."
                              action={<Button size="sm" onClick={() => setShowAddInitiative(true)}><Plus size={13} /> Add Initiative</Button>}
                            />
                          </td>
                        </tr>
                      ) : (
                        orgInitiatives.map((init, idx) => (
                          <tr key={init.id} className="hover:bg-[var(--muted)]/30 transition">
                            <td className="px-4 py-4 text-center font-mono text-xs text-[var(--muted-foreground)] whitespace-nowrap">{idx + 1}</td>
                            <td className="px-4 py-4 font-bold text-[var(--foreground)] min-w-[220px] max-w-[320px] leading-snug">
                              {init.title || init.name}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs whitespace-nowrap ${getInitiativeSourceBadgeClass(init.source)}`}>
                                {init.source}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-mono text-xs text-[var(--muted-foreground)] whitespace-nowrap">{formatDate(init.date)}</td>
                            <td className="px-4 py-4 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300 text-right whitespace-nowrap">
                              +{formatCurrency(init.amount ?? init.netProfit ?? 0)}
                            </td>
                            <td className="px-4 py-4 text-xs text-[var(--muted-foreground)] max-w-[260px] truncate leading-relaxed" title={init.description}>
                              {init.description || "—"}
                            </td>
                            <td className="px-4 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {init.source === "Event Revenue" ? (
                                  <span className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] text-xs font-mono font-medium shadow-2xs" title="Auto-generated surplus from closed event">
                                    Automated
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEditInitiative(init)}
                                      className="w-8 h-8 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)]/40 hover:bg-[var(--muted)]/60 flex items-center justify-center transition cursor-pointer shadow-2xs"
                                      title="Edit Initiative"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteInitConfirm(init)}
                                      className="w-8 h-8 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 flex items-center justify-center transition cursor-pointer shadow-2xs"
                                      title="Delete Initiative"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                    {orgInitiatives.length > 0 && (
                      <tfoot className="border-t border-[var(--border)] bg-[var(--muted)]/40 font-semibold text-xs">
                        <tr>
                          <td className="px-4 py-4 text-[var(--foreground)] font-bold uppercase tracking-wide whitespace-nowrap" colSpan={4}>
                            TOTAL INITIATIVES REVENUE
                          </td>
                          <td className="px-4 py-4 text-right font-mono font-extrabold text-emerald-700 dark:text-emerald-300 text-sm whitespace-nowrap">
                            +{formatCurrency(totalInitiativesRevenue)}
                          </td>
                          <td colSpan={2}></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {/* Add Initiative Dialog */}
      <Dialog open={showAddInitiative} onClose={() => setShowAddInitiative(false)} title="Add Organizational Initiative / Revenue" size="lg">
        <div className="p-6 space-y-4">
          <Input
            label="Initiative Title *"
            value={initTitle}
            onChange={(e) => setInitTitle(e.target.value)}
            placeholder="e.g., Tech Summit Sponsorship, Year-End Merchandise Sale"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Revenue Source *"
              value={initSource}
              onChange={(e) => setInitSource(e.target.value as InitiativeSource)}
              options={INITIATIVE_SOURCES}
            />

            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">Date Recorded *</label>
              <input
                type="date"
                value={initDate}
                onChange={(e) => setInitDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">Amount (₱) *</label>
            <Input
              type="number"
              min="0"
              step="any"
              value={initAmount}
              onChange={(e) => setInitAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <Textarea
            label="Description / Purpose (Optional)"
            rows={3}
            value={initDesc}
            onChange={(e) => setInitDesc(e.target.value)}
            placeholder="Details about donors, sponsors, ticket sales, or merchandise items..."
          />

          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-900 leading-relaxed">
            <p className="font-bold">Budget Increment Notice</p>
            <p className="mt-0.5">Adding this initiative will automatically credit <strong>₱{Number(initAmount || 0).toLocaleString()}</strong> into your <strong>Organizational Budget</strong>.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowAddInitiative(false)}>Cancel</Button>
            <Button onClick={handleSaveInitiative} disabled={!initTitle.trim() || !initAmount || parseFloat(initAmount) <= 0}>
              <CheckCircle size={14} /> Save Initiative
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Initiative Dialog */}
      <Dialog open={!!editingInitiative} onClose={() => setEditingInitiative(null)} title="Edit Organizational Initiative / Revenue" size="lg">
        <div className="p-6 space-y-4">
          <Input
            label="Initiative Title *"
            value={editInitTitle}
            onChange={(e) => setEditInitTitle(e.target.value)}
            placeholder="e.g., Tech Summit Sponsorship, Year-End Merchandise Sale"
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Revenue Source *"
              value={editInitSource}
              onChange={(e) => setEditInitSource(e.target.value as InitiativeSource)}
              options={INITIATIVE_SOURCES}
            />

            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">Date Recorded *</label>
              <input
                type="date"
                value={editInitDate}
                onChange={(e) => setEditInitDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">Amount (₱) *</label>
            <Input
              type="number"
              min="0"
              step="any"
              value={editInitAmount}
              onChange={(e) => setEditInitAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <Textarea
            label="Description / Purpose (Optional)"
            rows={3}
            value={editInitDesc}
            onChange={(e) => setEditInitDesc(e.target.value)}
            placeholder="Details about donors, sponsors, ticket sales, or merchandise items..."
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setEditingInitiative(null)}>Cancel</Button>
            <Button onClick={handleSaveEditInitiative} disabled={!editInitTitle.trim() || !editInitAmount || parseFloat(editInitAmount) <= 0}>
              <CheckCircle size={14} /> Update Initiative
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Initiative Confirm */}
      <Dialog open={!!deleteInitConfirm} onClose={() => setDeleteInitConfirm(null)} title="Delete Initiative" size="sm" zIndex="z-[60]">
        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--foreground)]">
            Are you sure you want to remove <strong>"{deleteInitConfirm?.title || deleteInitConfirm?.name}"</strong> (₱{(deleteInitConfirm?.amount ?? deleteInitConfirm?.netProfit ?? 0).toLocaleString()})?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteInitConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteInitConfirm && handleDeleteInitiative(deleteInitConfirm)}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
