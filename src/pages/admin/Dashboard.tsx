import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody } from "../../components/ui";
import { Users, Building2, Calendar, Shield, Activity, Landmark } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { organizations, formatDate, statusColors } from "../../services/mockData";

export default function AdminDashboard() {
  const { events, users, departments, organizations: orgs, auditTrail } = useApp();

  const students = users.filter((u) => u.role === "student");
  const advisers = users.filter((u) => u.role === "adviser");
  const recentAudit = auditTrail.slice(0, 6);

  const orgData = orgs.map((o) => ({
    name: o.code,
    events: events.filter((e) => e.organizationId === o.id).length,
    users: users.filter((u) => u.organizationId === o.id).length,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[var(--card)] via-[var(--card)] to-[var(--primary)]/10 border border-[var(--border)] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[var(--primary)] uppercase tracking-widest bg-[var(--primary)]/10 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
              <Shield size={13} /> System Administration Hub
            </span>
            <span className="text-xs text-[var(--muted-foreground)] font-mono">
              CITE · LCUP Infrastructure
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] mt-1.5 tracking-tight">
            System Overview & Governance
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Manage user accounts, organizational configurations, expenditure categories, and security audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2 text-right shadow-2xs">
            <p className="text-[10px] font-mono uppercase text-[var(--muted-foreground)] font-bold">System Status</p>
            <p className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">● Operational</p>
          </div>
        </div>
      </div>

      {/* Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Registered Users"
          value={users.length}
          sub="Students, Advisers & Admins"
          icon={<Users size={18} />}
          color="bg-[var(--primary)] text-white"
        />
        <StatCard
          label="Student Guilds"
          value={orgs.length}
          sub="Configured organizations"
          icon={<Building2 size={18} />}
          color="bg-sky-600 text-white"
        />
        <StatCard
          label="Academic Depts"
          value={departments.length}
          sub="Information Technology & Engineering"
          icon={<Landmark size={18} />}
          color="bg-purple-600 text-white"
        />
        <StatCard
          label="Total Events"
          value={events.length}
          sub="Lifetime platform initiatives"
          icon={<Calendar size={18} />}
          color="bg-emerald-600 text-white"
        />
      </div>

      {/* Charts & Audit Logs */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Events & Officers per Organization" subtitle="Engagement metrics by recognized body" />
          <CardBody>
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={orgData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="events" fill="#0a6b64" radius={[6, 6, 0, 0]} name="Events" />
                <Bar dataKey="users" fill="#0284c7" radius={[6, 6, 0, 0]} name="Officers" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recent Security & Audit Trail" subtitle="System events, submissions, and approvals" />
          <CardBody className="flex flex-col gap-3">
            {recentAudit.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-2xs">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-[var(--foreground)] truncate">{a.details}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono mt-0.5">{formatDate(a.timestamp)} · <span className="font-semibold text-[var(--primary)]">{a.action}</span></p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* User Role Breakdown Card */}
      <Card variant="gradient">
        <CardHeader title="User Account Distribution" subtitle="System role categorizations across college portals" />
        <CardBody>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: "Student Officers", count: students.length, role: "student", border: "border-teal-200 dark:border-teal-800", bg: "bg-teal-50/70 dark:bg-teal-950/40 text-teal-800 dark:text-teal-200" },
              { label: "Faculty Advisers", count: advisers.length, role: "adviser", border: "border-sky-200 dark:border-sky-800", bg: "bg-sky-50/70 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200" },
              { label: "College Dean", count: users.filter((u) => u.role === "dean").length, role: "dean", border: "border-purple-200 dark:border-purple-800", bg: "bg-purple-50/70 dark:bg-purple-950/40 text-purple-800 dark:text-purple-200" },
              { label: "System Admins", count: users.filter((u) => u.role === "admin").length, role: "admin", border: "border-amber-200 dark:border-amber-800", bg: "bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200" },
            ].map((item) => (
              <div key={item.label} className={`${item.bg} border ${item.border} rounded-2xl p-5 text-center shadow-2xs`}>
                <p className="text-3xl font-extrabold font-mono tracking-tight">{item.count}</p>
                <p className="text-xs font-mono font-bold mt-1 uppercase tracking-wider">{item.label}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
