import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody, SignatoryProgress } from "../../components/ui";
import { Calendar, CheckCircle, Clock, DollarSign, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { getOrgById, formatCurrency, formatDate, statusColors } from "../../services/mockData";

export default function AdviserDashboard() {
  const { currentUser } = useAuth();
  const { events, transactions, organizations } = useApp();

  const orgId = currentUser?.organizationId ?? "";
  const org = getOrgById(orgId);
  const orgEvents = events.filter((e) => e.organizationId === orgId);
  const pending = orgEvents.filter((e) => e.status === "For Review");
  const approved = orgEvents.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalSpent = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

  const byStatus = ["For Review", "For Approval", "Approved", "Completed", "Closed"].map((s) => ({
    name: s, count: orgEvents.filter((e) => e.status === s).length,
  })).filter((s) => s.count > 0);

  const recentActivity = [...orgEvents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Adviser Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Welcome, <span className="font-medium">{currentUser?.firstName}</span> · {org?.name ?? "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Review" value={pending.length} sub="awaiting action" icon={<Clock size={18} />} />
        <StatCard label="Total Events" value={orgEvents.length} icon={<Calendar size={18} />} />
        <StatCard label="Approved" value={approved.length} icon={<CheckCircle size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} sub={`of ${formatCurrency(org?.allocatedBudget ?? 0)}`} icon={<DollarSign size={18} />} />
      </div>

      {/* Pending Review Snapshot */}
      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-semibold">Pending Review</h2>
          <span className="text-xs font-mono text-[var(--muted-foreground)]">{pending.length} proposal(s)</span>
        </CardHeader>
        {pending.length === 0 ? (
          <CardBody className="text-center text-[var(--muted-foreground)] text-sm py-8">No pending proposals at this time.</CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {["Event", "Date", "Budget", "Status", "Progress"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition">
                    <td className="px-4 py-3 font-medium max-w-[180px] truncate">{e.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDate(e.dateStart)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                    </td>
                    <td className="px-4 py-3"><SignatoryProgress status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Budget Snapshot */}
        <Card>
          <CardHeader><h2 className="font-semibold">Budget Snapshot</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Allocated</p><p className="text-xl font-bold">{formatCurrency(org?.allocatedBudget ?? 0)}</p></div>
              <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Total Spent</p><p className="text-xl font-bold text-[var(--primary)]">{formatCurrency(totalSpent)}</p></div>
            </div>
            <div className="h-2.5 bg-[var(--muted)] rounded-full">
              <div className="h-full bg-[var(--primary)] rounded-full" style={{ width: `${Math.min(100, (org?.allocatedBudget ?? 1) > 0 ? (totalSpent / (org?.allocatedBudget ?? 1)) * 100 : 0)}%` }} />
            </div>
          </CardBody>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader><h2 className="font-semibold">Recent Activities</h2></CardHeader>
          <CardBody className="flex flex-col gap-3">
            {recentActivity.map((e) => (
              <div key={e.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)]">{e.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)] font-mono mt-0.5">{formatDate(e.createdAt)} · {e.status}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
