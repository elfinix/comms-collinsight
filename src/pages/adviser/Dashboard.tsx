import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody, SignatoryProgress } from "../../components/ui";
import { Calendar, CheckCircle, Clock, Wallet, Activity, ShieldCheck } from "lucide-react";
import { getOrgById, formatCurrency, formatDate, statusColors } from "../../services/mockData";

export default function AdviserDashboard() {
  const { currentUser } = useAuth();
  const { events, transactions } = useApp();

  const orgId = currentUser?.organizationId ?? "";
  const org = getOrgById(orgId);
  const orgEvents = events.filter((e) => e.organizationId === orgId);
  const pending = orgEvents.filter((e) => e.status === "For Review");
  const approved = orgEvents.filter((e) => ["Approved", "Completed", "Closed"].includes(e.status));
  const totalSpent = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

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
            <span className="text-xs text-[var(--muted-foreground)] font-mono">
              CITE Department
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
          badge={pending.length > 0 ? "Action needed" : undefined}
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
        <Card variant="gradient">
          <CardHeader title="Budget Snapshot" subtitle="Guild annual fund allocation" />
          <CardBody>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-[var(--card)]/80 border border-[var(--border)] rounded-xl">
                <p className="text-[10px] font-mono uppercase font-bold text-[var(--muted-foreground)] mb-1">Allocated Budget</p>
                <p className="text-xl font-extrabold font-mono text-[var(--foreground)]">{formatCurrency(org?.allocatedBudget ?? 0)}</p>
              </div>
              <div className="p-3 bg-[var(--card)]/80 border border-[var(--border)] rounded-xl">
                <p className="text-[10px] font-mono uppercase font-bold text-[var(--muted-foreground)] mb-1">Total Spent</p>
                <p className="text-xl font-extrabold font-mono text-[var(--primary)]">{formatCurrency(totalSpent)}</p>
              </div>
            </div>
            <div className="h-2.5 bg-[var(--muted)] rounded-full overflow-hidden p-0.5 border border-[var(--border)]/50">
              <div
                className="h-full bg-[var(--primary)] rounded-full transition-all"
                style={{ width: `${Math.min(100, (org?.allocatedBudget ?? 1) > 0 ? (totalSpent / (org?.allocatedBudget ?? 1)) * 100 : 0)}%` }}
              />
            </div>
          </CardBody>
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
