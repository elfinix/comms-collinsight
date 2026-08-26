import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody, Badge, SignatoryProgress } from "../../components/ui";
import { Calendar, DollarSign, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { getOrgById, getEventTypeById, formatCurrency, formatDate, statusColors } from "../../services/mockData";

const COLORS = ["#0d9488", "#0284c7", "#7c3aed", "#f59e0b", "#ef4444"];

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const { events, transactions, organizations } = useApp();

  const orgId = currentUser?.organizationId;
  const org = orgId ? getOrgById(orgId) : null;
  const orgEvents = events.filter((e) => e.organizationId === orgId);
  const approvedEvents = orgEvents.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalSpent = transactions.filter((t) => approvedEvents.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);
  const allocatedBudget = org?.allocatedBudget ?? 0;
  const totalProposed = orgEvents.reduce((s, e) => s + (e.proposedBudget || 0), 0);

  const byStatus = ["Created", "For Review", "For Approval", "Pending Revision", "Approved", "Completed", "Closed"].map((s) => ({
    name: s,
    count: orgEvents.filter((e) => e.status === s).length,
  })).filter((s) => s.count > 0);

  const byType = Object.entries(
    orgEvents.reduce<Record<string, number>>((acc, e) => {
      const typeName = getEventTypeById(e.typeId)?.name ?? "Other";
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const recent = [...orgEvents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Welcome back, <span className="font-medium">{currentUser?.firstName}</span> · {org?.name ?? "—"}
        </p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Events" value={orgEvents.length} sub="all statuses" icon={<Calendar size={18} />} />
        <StatCard label="Approved Events" value={approvedEvents.length} sub="active" icon={<CheckCircle size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} sub={`of ${formatCurrency(allocatedBudget)}`} icon={<DollarSign size={18} />} trend={totalSpent > allocatedBudget * 0.8 ? "down" : "up"} />
        <StatCard label="Pending Review" value={orgEvents.filter((e) => e.status === "For Review" || e.status === "For Approval").length} sub="awaiting action" icon={<Clock size={18} />} />
      </div>

      {/* Budget Snapshot */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="font-semibold text-[var(--foreground)]">Budget Snapshot</h2>
        </CardHeader>
        <CardBody>
          <div className="grid sm:grid-cols-3 gap-6">
            <div>
              <p className="text-xs text-[var(--muted-foreground)] font-mono mb-1">Allocated Budget</p>
              <p className="text-2xl font-bold text-[var(--foreground)]">{formatCurrency(allocatedBudget)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] font-mono mb-1">Total Proposed</p>
              <p className="text-2xl font-bold text-amber-600">{formatCurrency(totalProposed)}</p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted-foreground)] font-mono mb-1">Total Spent</p>
              <p className="text-2xl font-bold text-[var(--primary)]">{formatCurrency(totalSpent)}</p>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-xs text-[var(--muted-foreground)] font-mono mb-1">
              <span>Budget Utilization</span>
              <span>{allocatedBudget > 0 ? Math.round((totalSpent / allocatedBudget) * 100) : 0}%</span>
            </div>
            <div className="h-2.5 bg-[var(--muted)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] rounded-full transition-all"
                style={{ width: `${Math.min(100, allocatedBudget > 0 ? (totalSpent / allocatedBudget) * 100 : 0)}%` }}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><h2 className="font-semibold">Events by Status</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={byStatus} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-semibold">Events by Type</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }) => name}>
                  {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Recent Proposals */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Recent Proposals</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Event</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Budget</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Status</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Progress</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition">
                  <td className="px-4 py-3 font-medium text-[var(--foreground)]">{e.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">{formatDate(e.dateStart)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <SignatoryProgress status={e.status} />
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No proposals yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
