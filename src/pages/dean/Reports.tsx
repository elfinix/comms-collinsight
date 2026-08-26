import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card, CardHeader, CardBody, Button, StatCard } from "../../components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileDown, BarChart2, Calendar, DollarSign } from "lucide-react";
import { formatCurrency, formatDate, statusColors, organizations, getEventTypeById } from "../../services/mockData";

const COLORS = ["#0d9488", "#0284c7", "#7c3aed", "#f59e0b", "#ef4444"];

export default function DeanReports() {
  const { events, transactions } = useApp();
  const [tab, setTab] = useState<"events" | "finance">("events");

  const allEvents = events;
  const approved = events.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalBudget = organizations.reduce((s, o) => s + o.allocatedBudget, 0);
  const totalSpent = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

  const orgData = organizations.map((org) => {
    const orgEvents = events.filter((e) => e.organizationId === org.id);
    const spent = transactions.filter((t) => orgEvents.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);
    return { name: org.code, events: orgEvents.length, spent, budget: org.allocatedBudget };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Cross-Organizational Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">System-wide analytics for all CITE organizations.</p>
        </div>
        <Button variant="outline"><FileDown size={16} /> Export to PDF</Button>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-2 mb-6">
        <button onClick={() => setTab("events")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "events" ? "bg-[var(--primary)] text-white" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"}`}>
          Events Report
        </button>
        <button onClick={() => setTab("finance")} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === "finance" ? "bg-[var(--primary)] text-white" : "bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]"}`}>
          Finance Report
        </button>
      </div>

      {tab === "events" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Events" value={allEvents.length} icon={<Calendar size={18} />} />
            <StatCard label="Approved" value={approved.length} icon={<BarChart2 size={18} />} />
            <StatCard label="Pending" value={allEvents.filter(e => ["For Review","For Approval"].includes(e.status)).length} icon={<Calendar size={18} />} />
            <StatCard label="Closed" value={allEvents.filter(e => e.status === "Closed").length} icon={<BarChart2 size={18} />} />
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
              <CardHeader><h2 className="font-semibold">Events by Status</h2></CardHeader>
              <CardBody>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={["Approved","For Review","For Approval","Completed","Closed"].map(s => ({
                      name: s, value: allEvents.filter(e => e.status === s).length
                    })).filter(d => d.value > 0)} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({name}) => name}>
                      {allEvents.slice(0,5).map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardBody>
            </Card>
          </div>
        </>
      )}

      {tab === "finance" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <StatCard label="Total Budget" value={formatCurrency(totalBudget)} icon={<DollarSign size={18} />} />
            <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<DollarSign size={18} />} />
            <StatCard label="Remaining" value={formatCurrency(totalBudget - totalSpent)} icon={<DollarSign size={18} />} />
          </div>
          <Card className="mb-6">
            <CardHeader><h2 className="font-semibold">Budget vs. Spending by Organization</h2></CardHeader>
            <CardBody>
              <ResponsiveContainer width="100%" height={220}>
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
        </>
      )}

      {/* Events Table */}
      <Card>
        <CardHeader><h2 className="font-semibold">All Events</h2></CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                {["Event","Org","Type","Date","Budget","Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allEvents.map((e) => (
                <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                  <td className="px-4 py-3 font-medium max-w-[160px] truncate">{e.name}</td>
                  <td className="px-4 py-3 text-xs font-mono">{organizations.find(o => o.id === e.organizationId)?.code}</td>
                  <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{getEventTypeById(e.typeId)?.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatDate(e.dateStart)}</td>
                  <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                  <td className="px-4 py-3"><span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
