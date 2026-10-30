import { useApp } from "../../context/AppContext";
import { Link } from "react-router-dom";
import {
  StatCard,
  Card,
  CardHeader,
  CardBody,
  Button,
  RefreshButton,
  SkeletonStatCard,
  SkeletonTable,
  SkeletonChart,
} from "../../components/ui";
import {
  ClipboardList,
  CheckCircle,
  Clock,
  ShieldCheck,
  Calendar,
  Building2,
  ArrowRight,
  MapPin,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  formatDate,
  getStatusBadgeClass,
  getEventTypeById,
  Event,
} from "../../services/dataService";

export default function SDSDashboard() {
  const { events, organizations, isLoading } = useApp();

  const studentEvents = events.filter(
    (e) => !e.isInstitutional && e.category !== "Institutional" && Boolean(e.organizationId)
  );

  const pendingClearances = studentEvents.filter((e) => e.status === "Approved" || e.status === "For Review (SDS)");
  const authorizedEvents = studentEvents.filter((e) =>
    ["SDS Authorized", "CMO Authorized", "Completed", "Closed"].includes(e.status)
  );
  const pendingRevisions = studentEvents.filter((e) => e.status === "Pending Revision");

  const todayStr = new Date().toISOString().split("T")[0];
  const activeToday = studentEvents.filter((e) => {
    const startStr = e.dateStart ? e.dateStart.split("T")[0] : "";
    const endStr = e.dateEnd ? e.dateEnd.split("T")[0] : startStr;
    return startStr <= todayStr && todayStr <= endStr;
  });

  const orgData = organizations.map((org) => {
    const orgEvts = studentEvents.filter((e) => e.organizationId === org.id);
    const cleared = orgEvts.filter((e) =>
      ["SDS Authorized", "CMO Authorized", "Completed", "Closed"].includes(e.status)
    );
    const pendingOrg = orgEvts.filter((e) => e.status === "Approved" || e.status === "For Review (SDS)");
    return {
      name: org.code,
      fullName: org.name,
      total: orgEvts.length,
      cleared: cleared.length,
      pending: pendingOrg.length,
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[var(--card)] via-[var(--card)] to-[var(--primary)]/10 border border-[var(--border)] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            Institutional Clearance Overview
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Evaluate Dean-approved proposals, authorize campus activities, and issue official event clearances.
          </p>
        </div>

        <RefreshButton />
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <SkeletonTable rows={4} cols={5} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <SkeletonChart />
            <SkeletonChart />
          </div>
        </div>
      ) : (
        <>
          {/* Metrics Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Pending Clearance"
              value={pendingClearances.length}
              sub="Awaiting SDS verification"
              icon={<ClipboardList size={18} />}
              color="bg-amber-500 text-white"
            />
            <StatCard
              label="SDS Authorized"
              value={authorizedEvents.length}
              sub="Cleared campus events"
              icon={<CheckCircle size={18} />}
              color="bg-emerald-600 text-white"
            />
            <StatCard
              label="In Revision"
              value={pendingRevisions.length}
              sub="Returned to organizers"
              icon={<RotateCcw size={18} />}
              color="bg-orange-500 text-white"
            />
            <StatCard
              label="Active Today"
              value={activeToday.length}
              sub="Events currently live"
              icon={<Calendar size={18} />}
              color="bg-[var(--primary)] text-white"
            />
          </div>

          {/* Pending Clearance Queue Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <h3 className="font-bold text-base text-[var(--foreground)]">Pending Clearance Queue</h3>
                <p className="text-xs text-[var(--muted-foreground)]">Proposals with Dean approval dispatched for SDS evaluation</p>
              </div>
              <Link to="/sds/pending">
                <Button size="sm" variant="outline" className="gap-1.5 text-xs font-mono">
                  View Full Queue <ArrowRight size={13} />
                </Button>
              </Link>
            </CardHeader>
            <CardBody className="p-0">
              {pendingClearances.length === 0 ? (
                <div className="py-12 text-center text-sm text-[var(--muted-foreground)]">
                  <ShieldCheck size={36} className="mx-auto text-emerald-500 mb-2 opacity-80" />
                  <p className="font-semibold text-[var(--foreground)]">Clearance Queue is Clear</p>
                  <p className="text-xs mt-1 text-[var(--muted-foreground)]">No pending proposals awaiting SDS authorization right now.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[var(--muted)]/50 border-y border-[var(--border)] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2.5 font-semibold">Event Proposal</th>
                        <th className="px-4 py-2.5 font-semibold">Organization</th>
                        <th className="px-4 py-2.5 font-semibold">Setting & Venue</th>
                        <th className="px-4 py-2.5 font-semibold">Schedule</th>
                        <th className="px-4 py-2.5 font-semibold text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {pendingClearances.slice(0, 5).map((evt) => {
                        const org = organizations.find((o) => o.id === evt.organizationId);
                        const type = getEventTypeById(evt.typeId);
                        return (
                          <tr key={evt.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                            <td className="px-4 py-3 font-medium text-[var(--foreground)]">
                              <p className="font-bold truncate max-w-xs">{evt.name}</p>
                              {type && <span className="text-[10px] text-[var(--muted-foreground)] font-mono">{type.name}</span>}
                            </td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)] font-mono">
                              <div className="flex items-center gap-1.5">
                                <Building2 size={13} className="text-[var(--primary)] flex-shrink-0" />
                                <span className="truncate max-w-[140px]">{org?.code || "LCUP"}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[var(--foreground)]">
                              <div className="flex items-center gap-1">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                                  evt.setting === "Off-campus" ? "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300" : "bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300"
                                }`}>
                                  {evt.setting || "On-campus"}
                                </span>
                              </div>
                              <span className="text-[11px] text-[var(--muted-foreground)] block mt-0.5 truncate max-w-[150px]">
                                {evt.location || "LCUP Main Campus"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-[var(--muted-foreground)] font-mono whitespace-nowrap">
                              {formatDate(evt.dateStart)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link to={`/sds/pending?event=${evt.id}`}>
                                <Button size="sm" variant="primary" className="gap-1 font-mono text-xs">
                                  Review <ArrowRight size={11} />
                                </Button>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Graphical Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-bold text-sm text-[var(--foreground)] mb-1">Clearances by Student Organization</h3>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">Total initiatives vs. authorized clearances</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orgData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        borderColor: "var(--border)",
                        borderRadius: "0.75rem",
                        fontSize: "0.75rem",
                        color: "var(--foreground)",
                      }}
                    />
                    <Bar dataKey="cleared" name="SDS Authorized" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="total" name="Total Proposals" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-bold text-sm text-[var(--foreground)] mb-1">Recent Authorizations</h3>
              <p className="text-xs text-[var(--muted-foreground)] mb-4">Latest activities cleared for university execution</p>
              <div className="space-y-3">
                {authorizedEvents.slice(0, 4).map((evt) => {
                  const org = organizations.find((o) => o.id === evt.organizationId);
                  return (
                    <div key={evt.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)] gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-[var(--foreground)] truncate">{evt.name}</p>
                        <p className="text-[11px] font-mono text-[var(--muted-foreground)] truncate">
                          {org?.name || "LCUP"} • {formatDate(evt.dateStart)}
                        </p>
                      </div>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${getStatusBadgeClass(evt.status, evt.setting)}`}>
                        {evt.status}
                      </span>
                    </div>
                  );
                })}
                {authorizedEvents.length === 0 && (
                  <p className="text-xs text-[var(--muted-foreground)] text-center py-8">No authorizations logged yet.</p>
                )}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
