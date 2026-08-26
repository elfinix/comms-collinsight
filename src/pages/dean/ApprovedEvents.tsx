import { useApp } from "../../context/AppContext";
import { Card, CardHeader, StatCard } from "../../components/ui";
import { DollarSign, CheckCircle } from "lucide-react";
import { formatCurrency, formatDate, statusColors, organizations } from "../../services/mockData";

export default function DeanApprovedEvents() {
  const { events, transactions } = useApp();
  const approved = events.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalSpent = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Approved Events</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">All approved events across CITE organizations (read-only).</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <StatCard label="Approved Events" value={approved.length} icon={<CheckCircle size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<DollarSign size={18} />} />
        <StatCard label="Closed Events" value={events.filter((e) => e.status === "Closed").length} icon={<CheckCircle size={18} />} />
      </div>

      <Card>
        <CardHeader><h2 className="font-semibold">Approved Event List</h2></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                {["Event", "Organization", "Date", "Budget", "Spent", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {approved.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No approved events yet.</td></tr>
              ) : approved.map((e) => {
                const org = organizations.find((o) => o.id === e.organizationId);
                const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
                return (
                  <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{e.name}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{org?.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDate(e.dateStart)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--primary)] font-semibold">{formatCurrency(spent)}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span></td>
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
