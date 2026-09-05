import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody } from "../../components/ui";
import { Calendar, CheckCircle, Clock, Wallet, Landmark, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { formatCurrency, statusColors, formatDate } from "../../services/dataService";

export default function DeanDashboard() {
  const { events, transactions, organizations } = useApp();

  const allEvents = events;
  const pending = allEvents.filter((e) => e.status === "For Approval");
  const approved = allEvents.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalSpent = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

  const orgData = organizations.map((org) => {
    const orgEvents = events.filter((e) => e.organizationId === org.id);
    const spent = transactions.filter((t) => orgEvents.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);
    return {
      name: org.code,
      fullName: org.name,
      events: orgEvents.length,
      spent,
      budget: org.allocatedBudget,
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[var(--card)] via-[var(--card)] to-[var(--primary)]/10 border border-[var(--border)] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-widest bg-[var(--primary)]/10 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Landmark size={13} /> College Dean Executive Portal
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] mt-1.5 tracking-tight">
            CITE Executive Overview
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Cross-organizational governance, APF clearances, and budgetary oversight.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2 text-right shadow-2xs">
            <p className="text-[10px] font-mono uppercase text-[var(--muted-foreground)] font-bold">Active Guilds</p>
            <p className="text-sm font-extrabold font-mono text-[var(--primary)]">{organizations.length} Organizations</p>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Approval"
          value={pending.length}
          sub="Requires endorsement & dispatch"
          icon={<Clock size={18} />}
          color="bg-amber-500 text-white"
        />
        <StatCard
          label="College Initiatives"
          value={allEvents.length}
          sub="Total registered events"
          icon={<Calendar size={18} />}
          color="bg-[var(--primary)] text-white"
        />
        <StatCard
          label="Approved & Cleared"
          value={approved.length}
          sub="Dispatched to SDS Office"
          icon={<CheckCircle size={18} />}
          color="bg-emerald-600 text-white"
        />
        <StatCard
          label="Total College Spent"
          value={formatCurrency(totalSpent)}
          sub="Aggregated ledger expenses"
          icon={<Wallet size={18} />}
          color="bg-sky-600 text-white"
        />
      </div>

      {/* Pending Approval List (Placed First before Charts) */}
      <Card>
        <CardHeader
          title="Proposals Awaiting Dean Approval"
          subtitle="Final college clearance before dispatching to Student Development Services (SDS)"
          action={
            <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
              {pending.length} pending
            </span>
          }
        />
        {pending.length === 0 ? (
          <CardBody className="text-center text-[var(--muted-foreground)] text-xs font-mono py-10">
            No events pending dean approval at this time.
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)]/40 border-b border-[var(--border)]">
                  <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Event Title</th>
                  <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Organization</th>
                  <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Proposed Budget</th>
                  <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {pending.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--muted)]/30 transition">
                    <td className="px-5 py-4 font-bold text-[var(--foreground)]">{e.name}</td>
                    <td className="px-5 py-4 text-xs font-semibold text-[var(--primary)]">{organizations.find((o) => o.id === e.organizationId)?.name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-[var(--foreground)]">{formatDate(e.dateStart)}</td>
                    <td className="px-5 py-4 font-mono text-xs font-bold text-[var(--primary)]">{formatCurrency(e.proposedBudget)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold ${statusColors[e.status]}`}>{e.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Analytics Charts */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Events per Student Organization" subtitle="Initiatives distribution across academic bodies" />
          <CardBody>
            {orgData.every((d) => d.events === 0) ? (
              <div className="h-[210px] flex flex-col items-center justify-center text-center p-4">
                <Calendar size={32} className="text-[var(--muted-foreground)] opacity-40 mb-2" />
                <p className="text-xs font-semibold text-[var(--foreground)]">No organizational event activity</p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Events scheduled across recognized guilds will display here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={orgData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200/90 shadow-2xl p-3.5 rounded-2xl text-xs space-y-1.5 min-w-[160px] z-50">
                            <p className="font-bold text-[var(--foreground)] leading-snug border-b border-[var(--border)] pb-1">
                              {item.fullName || item.name}
                            </p>
                            <div className="flex items-center justify-between gap-3 font-mono text-slate-700">
                              <span className="font-sans font-medium text-xs">Events:</span>
                              <span className="font-bold text-teal-900">{item.events}</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="events" fill="#0a6b64" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Allocated Budget vs. Disbursed Spending" subtitle="Fund compliance comparison by guild" />
          <CardBody>
            {orgData.every((d) => d.budget === 0 && d.spent === 0) ? (
              <div className="h-[210px] flex flex-col items-center justify-center text-center p-4">
                <Wallet size={32} className="text-[var(--muted-foreground)] opacity-40 mb-2" />
                <p className="text-xs font-semibold text-[var(--foreground)]">No organizational financial records</p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Budget allocations and disbursement metrics will display here.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={orgData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₱${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
                  <Tooltip
                    wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200/90 shadow-2xl p-3.5 rounded-2xl text-xs space-y-2 min-w-[200px] z-50">
                            <p className="font-bold text-[var(--foreground)] leading-snug border-b border-[var(--border)] pb-1.5">
                              {item.fullName || item.name}
                            </p>
                            <div className="space-y-1.5 font-mono">
                              <div className="flex items-center justify-between gap-3 text-slate-700">
                                <span className="flex items-center gap-1.5 font-sans font-medium text-xs">
                                  <span className="w-2.5 h-2.5 rounded-full bg-teal-400" /> Budget:
                                </span>
                                <span className="font-bold text-teal-800">{formatCurrency(item.budget)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3 text-slate-700">
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
                  <Bar dataKey="budget" fill="#bfe3dd" radius={[6, 6, 0, 0]} name="Budget" />
                  <Bar dataKey="spent" fill="#0a6b64" radius={[6, 6, 0, 0]} name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
