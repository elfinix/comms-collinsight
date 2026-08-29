import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody, SignatoryProgress } from "../../components/ui";
import { Calendar, CheckCircle, Clock, Wallet, Activity, ShieldCheck } from "lucide-react";
import { formatCurrency, formatDate, statusColors } from "../../services/mockData";

export default function AdviserDashboard() {
  const { currentUser } = useAuth();
  const { events, transactions, organizations, expenditureCategories } = useApp();

  const orgId = currentUser?.organizationId ?? "";
  const org = organizations.find((o) => o.id === orgId);
  const orgEvents = events.filter((e) => e.organizationId === orgId);
  const pending = orgEvents.filter((e) => e.status === "For Review");
  const approved = orgEvents.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalSpent = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

  const allocated = org?.allocatedBudget ?? 0;
  const remaining = allocated - totalSpent;
  const utilizationPct = allocated > 0 ? (totalSpent / allocated) * 100 : 0;

  const orgTxns = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted);
  const byCategory = Object.entries(
    orgTxns.reduce<Record<string, number>>((acc, t) => {
      const name = expenditureCategories.find((c) => c.id === t.categoryId)?.name ?? "General Operations";
      acc[name] = (acc[name] || 0) + t.amount;
      return acc;
    }, {})
  )
    .map(([name, value]) => ({
      name,
      value,
      pct: totalSpent > 0 ? (value / totalSpent) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);

  const recentActivity = [...orgEvents].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[var(--card)] via-[var(--card)] to-[var(--primary)]/10 border border-[var(--border)] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-widest bg-[var(--primary)]/10 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <ShieldCheck size={13} /> Faculty Adviser Portal
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] mt-1.5 tracking-tight">
            Welcome, Prof. {currentUser?.lastName}!
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Advising Organization: <strong className="text-[var(--foreground)]">{org?.name ?? "Student Guild"}</strong> ({org?.code})
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2 text-right shadow-2xs">
            <p className="text-[10px] font-mono uppercase text-[var(--muted-foreground)] font-bold">Allocated Budget</p>
            <p className="text-sm font-extrabold font-mono text-[var(--primary)]">{formatCurrency(org?.allocatedBudget ?? 0)}</p>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Pending Review"
          value={pending.length}
          sub="Requires your endorsement"
          icon={<Clock size={18} />}
          color="bg-amber-500 text-white"
        />
        <StatCard
          label="Total Proposals"
          value={orgEvents.length}
          sub="Annual submissions"
          icon={<Calendar size={18} />}
          color="bg-[var(--primary)] text-white"
        />
        <StatCard
          label="Endorsed & Approved"
          value={approved.length}
          sub="Cleared activities"
          icon={<CheckCircle size={18} />}
          color="bg-emerald-600 text-white"
        />
        <StatCard
          label="Total Disbursed"
          value={formatCurrency(totalSpent)}
          sub={`of ${formatCurrency(org?.allocatedBudget ?? 0)} allocation`}
          icon={<Wallet size={18} />}
          color="bg-sky-600 text-white"
        />
      </div>

      {/* Pending Review Table Card */}
      <Card>
        <CardHeader
          title="Proposals Awaiting Adviser Endorsement"
          subtitle="Review Activity Proposal Forms (APFs) and append remarks"
          action={
            <span className="text-xs font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full">
              {pending.length} pending
            </span>
          }
        />
        {pending.length === 0 ? (
          <CardBody className="text-center text-[var(--muted-foreground)] text-xs font-mono py-10">
            No pending proposals awaiting review at this time.
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)]/40 border-b border-[var(--border)]">
                  <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Event</th>
                  <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Date</th>
                  <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Proposed Budget</th>
                  <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)]">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)] min-w-[280px]">Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {pending.map((e) => (
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
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Budget Snapshot */}
        <Card variant="gradient" className="flex flex-col justify-between">
          <div>
            <CardHeader
              title="Budget Snapshot"
              subtitle="Guild annual fund allocation & utilization"
              action={
                <span className="text-[10px] font-mono font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full">
                  {utilizationPct.toFixed(1)}% Utilized
                </span>
              }
            />
            <CardBody className="space-y-4">
              {/* 4-stat metric grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[var(--card)]/90 border border-[var(--border)] rounded-xl shadow-2xs">
                  <p className="text-[10px] font-mono uppercase font-bold text-[var(--muted-foreground)] mb-1">Allocated Fund</p>
                  <p className="text-lg font-extrabold font-mono text-[var(--foreground)] leading-none">{formatCurrency(allocated)}</p>
                </div>
                <div className="p-3 bg-[var(--card)]/90 border border-[var(--border)] rounded-xl shadow-2xs">
                  <p className="text-[10px] font-mono uppercase font-bold text-[var(--muted-foreground)] mb-1">Total Disbursed</p>
                  <p className="text-lg font-extrabold font-mono text-amber-700 leading-none">{formatCurrency(totalSpent)}</p>
                </div>
                <div className="p-3 bg-[var(--card)]/90 border border-[var(--border)] rounded-xl shadow-2xs">
                  <p className="text-[10px] font-mono uppercase font-bold text-[var(--muted-foreground)] mb-1">Remaining Balance</p>
                  <p className="text-lg font-extrabold font-mono text-emerald-700 leading-none">{formatCurrency(remaining)}</p>
                </div>
                <div className="p-3 bg-[var(--card)]/90 border border-[var(--border)] rounded-xl shadow-2xs">
                  <p className="text-[10px] font-mono uppercase font-bold text-[var(--muted-foreground)] mb-1">Fund Burn Rate</p>
                  <p className="text-lg font-extrabold font-mono text-[var(--primary)] leading-none">{utilizationPct.toFixed(1)}%</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs font-mono font-medium text-[var(--muted-foreground)]">
                  <span>Disbursed: {formatCurrency(totalSpent)}</span>
                  <span>Available: {formatCurrency(remaining)}</span>
                </div>
                <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden p-0.5 border border-[var(--border)]/60">
                  <div
                    className="h-full bg-gradient-to-r from-teal-600 to-emerald-500 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, utilizationPct))}%` }}
                  />
                </div>
              </div>

              {/* Top spending categories breakdown */}
              <div className="pt-2 border-t border-[var(--border)]/60 space-y-2">
                <p className="text-[10px] font-mono uppercase font-bold text-[var(--muted-foreground)]">Top Spending Breakdown</p>
                {byCategory.length === 0 ? (
                  <p className="text-xs text-[var(--muted-foreground)] font-mono">No category spending recorded yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {byCategory.map((cat) => (
                      <div key={cat.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[var(--card)]/60 border border-[var(--border)]/50">
                        <span className="font-medium text-[var(--foreground)] truncate max-w-[150px]">{cat.name}</span>
                        <div className="flex items-center gap-2 font-mono flex-shrink-0">
                          <span className="text-xs font-bold text-[var(--foreground)]">{formatCurrency(cat.value)}</span>
                          <span className="text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded font-bold border border-teal-200/60">{cat.pct.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </div>
        </Card>

        {/* Recent Activities */}
        <Card>
          <CardHeader title="Recent Proposal Activity" subtitle="Submission logs and status changes" />
          <CardBody className="flex flex-col gap-3.5">
            {recentActivity.map((e) => (
              <div key={e.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-2xs">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--foreground)] truncate">{e.name}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono mt-0.5">
                    {formatDate(e.createdAt)} · <span className="font-bold text-[var(--primary)]">{e.status}</span>
                  </p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
