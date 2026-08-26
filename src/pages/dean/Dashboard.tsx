import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody } from "../../components/ui";
import { Calendar, CheckCircle, Clock, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, statusColors, organizations, formatDate } from "../../services/mockData";

export default function DeanDashboard() {
  const { events, transactions } = useApp();

  const allEvents = events;
  const pending = allEvents.filter((e) => e.status === "For Approval");
  const approved = allEvents.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalSpent = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

  const orgData = organizations.map((org) => {
    const orgEvents = events.filter((e) => e.organizationId === org.id);
    const spent = transactions.filter((t) => orgEvents.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);
    return { name: org.code, events: orgEvents.length, spent, budget: org.allocatedBudget };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Dean's Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Cross-organizational overview for CITE organizations.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Pending Approval" value={pending.length} icon={<Clock size={18} />} />
        <StatCard label="Total Events" value={allEvents.length} icon={<Calendar size={18} />} />
        <StatCard label="Approved Events" value={approved.length} icon={<CheckCircle size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<DollarSign size={18} />} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><h2 className="font-semibold">Events per Organization</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orgData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="events" fill="#0d9488" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-semibold">Budget vs. Spending by Org</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orgData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="budget" fill="#ccfbf1" radius={[4,4,0,0]} name="Budget" />
                <Bar dataKey="spent" fill="#0d9488" radius={[4,4,0,0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Pending Approval list */}
      <Card>
        <CardHeader>
          <h2 className="font-semibold">Pending Approval</h2>
        </CardHeader>
        {pending.length === 0 ? (
          <CardBody className="text-center text-[var(--muted-foreground)] text-sm py-8">No events pending approval.</CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {["Event", "Organization", "Date", "Budget", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{organizations.find(o => o.id === e.organizationId)?.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDate(e.dateStart)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
