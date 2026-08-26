import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody, EmptyState } from "../../components/ui";
import { DollarSign, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, formatDate, statusColors, getCategoryById } from "../../services/mockData";

export default function AdviserFinance() {
  const { currentUser } = useAuth();
  const { events, transactions, organizations } = useApp();
  const orgId = currentUser?.organizationId ?? "";
  const org = organizations.find((o) => o.id === orgId);
  const approvedEvents = events.filter((e) => e.organizationId === orgId && ["Approved", "Completed", "Closed"].includes(e.status));
  const allTxns = transactions.filter((t) => approvedEvents.some((e) => e.id === t.eventId) && !t.deleted);
  const totalSpent = allTxns.reduce((s, t) => s + t.amount, 0);

  const chartData = approvedEvents.map((e) => ({
    name: e.name.split(" ").slice(0, 2).join(" "),
    budget: e.proposedBudget,
    spent: transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0),
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Finance Overview</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Read-only view of organization financial activities.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Allocated Budget" value={formatCurrency(org?.allocatedBudget ?? 0)} icon={<DollarSign size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<DollarSign size={18} />} />
        <StatCard label="Remaining" value={formatCurrency((org?.allocatedBudget ?? 0) - totalSpent)} icon={<DollarSign size={18} />} />
        <StatCard label="Approved Events" value={approvedEvents.length} icon={<CheckCircle size={18} />} />
      </div>

      <Card className="mb-6">
        <CardHeader><h2 className="font-semibold">Budget vs. Spending per Event</h2></CardHeader>
        <CardBody>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ left: -20 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v: any) => formatCurrency(v)} />
              <Bar dataKey="budget" fill="#ccfbf1" radius={[4,4,0,0]} name="Budget" />
              <Bar dataKey="spent" fill="#0d9488" radius={[4,4,0,0]} name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        </CardBody>
      </Card>

      <Card>
        <CardHeader><h2 className="font-semibold">Approved Events</h2></CardHeader>
        {approvedEvents.length === 0 ? (
          <CardBody><EmptyState title="No approved events" description="Approved events will appear here." /></CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {["Event", "Date", "Budget", "Spent", "Remaining", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvedEvents.map((e) => {
                  const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
                  return (
                    <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition">
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{e.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatDate(e.dateStart)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--primary)] font-semibold">{formatCurrency(spent)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget - spent)}</td>
                      <td className="px-4 py-3"><span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
