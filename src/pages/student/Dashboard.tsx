import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody, SignatoryProgress } from "../../components/ui";
import { Calendar, Wallet, CheckCircle, Clock, TrendingUp, Shapes, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { formatCurrency, formatDate, statusColors } from "../../services/dataService";

const COLORS = ["#0d9488", "#0284c7", "#7c3aed", "#f59e0b", "#10b981"];

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const { events, transactions, organizations, eventTypes } = useApp();

  const orgId = currentUser?.organizationId;
  const org = orgId ? organizations.find((o) => o.id === orgId) : null;
  const orgEvents = events.filter((e) => e.organizationId === orgId);
  const approvedEvents = orgEvents.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalSpent = transactions.filter((t) => approvedEvents.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);
  const allocatedBudget = org?.allocatedBudget ?? 0;
  const remainingBudget = Math.max(0, allocatedBudget - totalSpent);
  const totalProposed = orgEvents.reduce((s, e) => s + (e.proposedBudget || 0), 0);

  const byStatus = ["Created", "For Review", "For Approval", "Pending Revision", "Approved", "Completed", "Closed"].map((s) => ({
    name: s,
    count: orgEvents.filter((e) => e.status === s).length,
  })).filter((s) => s.count > 0);

  const byType = Object.entries(
    orgEvents.reduce<Record<string, number>>((acc, e) => {
      const typeName = eventTypes.find((t) => t.id === e.typeId)?.name ?? "Other";
      acc[typeName] = (acc[typeName] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const recent = [...orgEvents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner Card */}
      <div className="bg-gradient-to-r from-[var(--card)] via-[var(--card)] to-[var(--primary)]/10 border border-[var(--border)] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-widest bg-[var(--primary)]/10 px-2.5 py-0.5 rounded-full font-bold">
              Student Officer Portal
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] mt-1.5 tracking-tight">
            Welcome back, {currentUser?.firstName}!
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            <strong className="text-[var(--foreground)]">{currentUser?.position}</strong> · {org?.name ?? "Student Guild"} ({org?.code})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2 text-right shadow-2xs">
            <p className="text-[10px] font-mono uppercase text-[var(--muted-foreground)] font-bold">Current Budget</p>
            <p className="text-sm font-extrabold font-mono text-[var(--primary)]">{formatCurrency(remainingBudget)}</p>
          </div>
        </div>
      </div>

      {/* Metrics StatCards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Proposals"
          value={orgEvents.length}
          sub="All event stages"
          icon={<Calendar size={18} />}
          color="bg-[var(--primary)] text-white"
        />
        <StatCard
          label="Approved Activities"
          value={approvedEvents.length}
          sub="Cleared & ready"
          icon={<CheckCircle size={18} />}
          color="bg-emerald-600 text-white"
        />
        <StatCard
          label="Total Disbursed"
          value={formatCurrency(totalSpent)}
          sub={`of ${formatCurrency(allocatedBudget)} allocation`}
          icon={<Wallet size={18} />}
          color="bg-sky-600 text-white"
          trend={totalSpent > allocatedBudget * 0.8 ? "down" : "up"}
          trendValue={`${allocatedBudget > 0 ? Math.round((totalSpent / allocatedBudget) * 100) : 0}% used`}
        />
        <StatCard
          label="Pending Review"
          value={orgEvents.filter((e) => e.status === "For Review" || e.status === "For Approval").length}
          sub="Awaiting endorsement"
          icon={<Clock size={18} />}
          color="bg-amber-500 text-white"
        />
      </div>

      {/* Budget Snapshot */}
      <Card variant="gradient">
        <CardHeader
          title="Organization Financial Snapshot"
          subtitle="Real-time fund tracking and expenditure ledger"
        />
        <CardBody>
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-[var(--card)]/80 border border-[var(--border)] shadow-2xs">
              <p className="text-[11px] text-[var(--muted-foreground)] font-mono mb-1 font-bold uppercase tracking-wider">Allocated Cap</p>
              <p className="text-2xl font-extrabold font-mono text-[var(--foreground)]">{formatCurrency(allocatedBudget)}</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--card)]/80 border border-[var(--border)] shadow-2xs">
              <p className="text-[11px] text-[var(--muted-foreground)] font-mono mb-1 font-bold uppercase tracking-wider">Proposed Total</p>
              <p className="text-2xl font-extrabold font-mono text-amber-600">{formatCurrency(totalProposed)}</p>
            </div>
            <div className="p-4 rounded-xl bg-[var(--card)]/80 border border-[var(--border)] shadow-2xs">
              <p className="text-[11px] text-[var(--muted-foreground)] font-mono mb-1 font-bold uppercase tracking-wider">Recorded Expenses</p>
              <p className="text-2xl font-extrabold font-mono text-[var(--primary)]">{formatCurrency(totalSpent)}</p>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-[var(--border)]/70">
            <div className="flex justify-between text-xs text-[var(--foreground)] font-mono mb-1.5 font-bold">
              <span>Budget Utilization Rate</span>
              <span>{allocatedBudget > 0 ? Math.round((totalSpent / allocatedBudget) * 100) : 0}%</span>
            </div>
            <div className="h-3 bg-[var(--muted)] rounded-full overflow-hidden p-0.5 border border-[var(--border)]/60">
              <div
                className="h-full bg-gradient-to-r from-[var(--primary)] to-teal-400 rounded-full transition-all shadow-xs"
                style={{ width: `${Math.min(100, allocatedBudget > 0 ? (totalSpent / allocatedBudget) * 100 : 0)}%` }}
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Analytics Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Events by Status" subtitle="Activity distribution across clearance stages" />
          <CardBody>
            {byStatus.every((d) => d.count === 0) ? (
              <div className="h-[210px] flex flex-col items-center justify-center text-center p-4">
                <FileText size={32} className="text-[var(--muted-foreground)] opacity-40 mb-2" />
                <p className="text-xs font-semibold text-[var(--foreground)]">No event status records</p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Submit event proposals to track clearance progress.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={byStatus} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0a6b64" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Events by Type" subtitle="Categorical breakdown of scheduled initiatives" />
          <CardBody>
            {byType.length === 0 || byType.every((d) => d.value === 0) ? (
              <div className="h-[210px] flex flex-col items-center justify-center text-center p-4">
                <Shapes size={32} className="text-[var(--muted-foreground)] opacity-40 mb-2" />
                <p className="text-xs font-semibold text-[var(--foreground)]">No event classification data</p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">No scheduled initiatives in this period.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={byType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={72} label={({ name }) => name}>
                    {byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Recent Proposals Table */}
      <Card>
        <CardHeader
          title="Recent Activity Proposals"
          subtitle="Latest organizational submissions and approval progression"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)]/40 border-b border-[var(--border)]">
                <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Event</th>
                <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Date</th>
                <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Budget</th>
                <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)] min-w-[280px]">Signatory Progression</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {recent.map((e) => (
                <tr key={e.id} className="hover:bg-[var(--muted)]/30 transition">
                  <td className="px-5 py-4 font-bold text-[var(--foreground)]">{e.name}</td>
                  <td className="px-5 py-4 font-mono text-xs text-[var(--foreground)]">{formatDate(e.dateStart)}</td>
                  <td className="px-5 py-4 font-mono text-xs font-bold text-[var(--primary)]">{formatCurrency(e.proposedBudget)}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold ${statusColors[e.status]}`}>{e.status}</span>
                  </td>
                  <td className="px-5 py-4">
                    <SignatoryProgress status={e.status} />
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-xs font-mono text-[var(--muted-foreground)]">No proposals submitted yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
