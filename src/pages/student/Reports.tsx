import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { Card, CardHeader, CardBody, Button, StatCard } from "../../components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { FileDown, BarChart2, Calendar, DollarSign } from "lucide-react";
import { formatCurrency, formatDate, statusColors, getEventTypeById } from "../../services/mockData";

const STATUS_FILTERS = ["All", "Created", "For Review", "For Approval", "Pending Revision", "Approved", "Completed", "Closed"];

export default function StudentReports() {
  const { currentUser } = useAuth();
  const { events, transactions, organizations } = useApp();
  const orgId = currentUser?.organizationId ?? "";

  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState("dateStart");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const orgEvents = events.filter((e) => e.organizationId === orgId);
  const filtered = orgEvents
    .filter((e) => statusFilter === "All" || e.status === statusFilter)
    .sort((a, b) => {
      const va = (a as any)[sortKey] ?? "";
      const vb = (b as any)[sortKey] ?? "";
      return sortDir === "asc" ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
    });

  const approvedEvents = orgEvents.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalBudget = orgEvents.reduce((s, e) => s + e.proposedBudget, 0);
  const totalSpent = transactions.filter((t) => approvedEvents.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

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

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Analytics and exportable reports for your organization.</p>
        </div>
        <Button variant="outline">
          <FileDown size={16} /> Export to PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Events" value={orgEvents.length} icon={<Calendar size={18} />} />
        <StatCard label="Approved Events" value={approvedEvents.length} icon={<BarChart2 size={18} />} />
        <StatCard label="Total Proposed Budget" value={formatCurrency(totalBudget)} icon={<DollarSign size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<DollarSign size={18} />} />
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
                <Bar dataKey="events" fill="#0d9488" radius={[4, 4, 0, 0]} />
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
        <CardHeader className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="font-semibold">Event Summary Table</h2>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-2 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-white focus:outline-none">
              {STATUS_FILTERS.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="px-2 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-white focus:outline-none">
              <option value="dateStart">Date</option>
              <option value="name">Name</option>
              <option value="proposedBudget">Budget</option>
            </select>
            <button onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} className="px-2 py-1.5 text-xs border border-[var(--border)] rounded-lg bg-white hover:bg-[var(--muted)] font-mono">
              {sortDir === "asc" ? "↑" : "↓"}
            </button>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                {["Event", "Type", "Date", "Budget", "Spent", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No events match the filter.</td></tr>
              ) : filtered.map((e) => {
                const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
                return (
                  <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition">
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{e.name}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{getEventTypeById(e.typeId)?.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDate(e.dateStart)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--primary)]">{formatCurrency(spent)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
