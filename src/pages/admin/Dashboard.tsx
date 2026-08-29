import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody } from "../../components/ui";
import { Users, Building2, Calendar, Shield, Landmark, Clock, ArrowRight, GraduationCap, UserCheck, Award } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { formatDate, getActionBadgeClass, formatCurrency } from "../../services/mockData";

const PIE_COLORS = [
  "#0d9488", "#0284c7", "#7c3aed", "#f59e0b", "#10b981",
  "#e11d48", "#6366f1", "#14b8a6", "#8b5cf6", "#f97316", "#64748b"
];

export default function AdminDashboard() {
  const { events, users, departments, organizations: orgs, auditTrail } = useApp();

  const students = users.filter((u) => u.role === "student");
  const advisers = users.filter((u) => u.role === "adviser");
  const deans = users.filter((u) => u.role === "dean");
  const admins = users.filter((u) => u.role === "admin");

  // Recent activities sorted by timestamp
  const recentActivities = auditTrail
    .slice()
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5);

  // Data per organization
  const orgStats = orgs.map((o, idx) => {
    const orgEvents = events.filter((e) => e.organizationId === o.id);
    const orgUsers = users.filter((u) => u.organizationId === o.id);
    const percent = events.length > 0 ? Math.round((orgEvents.length / events.length) * 100) : 0;
    return {
      id: o.id,
      name: o.code,
      fullName: o.name,
      allocatedBudget: o.allocatedBudget,
      eventsCount: orgEvents.length,
      usersCount: orgUsers.length,
      percent,
      color: PIE_COLORS[idx % PIE_COLORS.length],
    };
  });

  const pieData = orgStats.filter((d) => d.eventsCount > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-[var(--card)] via-[var(--card)] to-[var(--primary)]/10 border border-[var(--border)] rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            System Overview & Governance
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Manage user accounts, organizational configurations, expenditure categories, and security audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2 text-right shadow-2xs">
            <p className="text-[10px] font-mono uppercase text-[var(--muted-foreground)] font-bold">System Status</p>
            <p className="text-sm font-extrabold font-mono text-emerald-600">● Operational</p>
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
          label="Student Orgs"
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

      {/* Charts & Recent Activities */}
      <div className="grid md:grid-cols-2 gap-6 items-stretch">
        {/* Events per Organization Breakdown & Donut */}
        <Card className="flex flex-col">
          <CardHeader
            title="Events per Organization"
            subtitle="Initiatives distribution across recognized bodies"
          />
          <CardBody className="flex-1 flex flex-col gap-4">
            {/* Donut Chart with Centered Total Badge */}
            <div className="relative w-full h-[210px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="eventsCount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 shadow-xl p-2.5 rounded-xl text-xs space-y-0.5 z-50">
                            <p className="font-bold text-slate-900">{item.fullName} ({item.name})</p>
                            <p className="font-mono text-teal-800 font-bold">{item.eventsCount} Events ({item.percent}%)</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Centered Total Label inside Donut Hole */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-extrabold font-mono text-[var(--foreground)] leading-none">{events.length}</span>
                <span className="text-[10px] font-mono font-bold text-[var(--muted-foreground)] uppercase mt-1">Total Events</span>
              </div>
            </div>

            {/* Organization Breakdown List with Scrollable Container for 4+ Orgs */}
            <div className="border-t border-[var(--border)] pt-3">
              <div className="flex items-center justify-between text-[11px] font-mono font-bold text-[var(--muted-foreground)] uppercase mb-2">
                <span>Active Organizations ({orgs.length})</span>
                <span>Share Breakdown</span>
              </div>
              <div className="max-h-[220px] overflow-y-auto pr-1 space-y-2.5">
                {orgStats.map((o) => (
                  <div key={o.id} className="p-2.5 rounded-xl bg-[var(--muted)]/25 border border-[var(--border)] space-y-1.5 hover:bg-[var(--muted)]/40 transition">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 shadow-2xs font-mono"
                          style={{ backgroundColor: o.color }}
                        >
                          {o.name.substring(0, 3)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-[var(--foreground)] truncate text-xs">{o.name} · {o.fullName}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)] font-mono">
                            Budget: {formatCurrency(o.allocatedBudget)} · {o.usersCount} Officers
                          </p>
                        </div>
                      </div>
                      <div className="text-right font-mono flex-shrink-0">
                        <span className="text-xs font-bold text-[var(--foreground)]">{o.eventsCount} Events</span>
                        <span className="text-[10px] text-[var(--muted-foreground)] block font-medium">{o.percent}% Share</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-1.5 w-full bg-[var(--muted)] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(4, o.percent)}%`, backgroundColor: o.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Recent Activities */}
        <Card className="flex flex-col">
          <CardHeader
            title="Recent Activities"
            subtitle="System events, submissions, and approvals from History"
            action={
              <Link
                to="/history"
                className="text-xs font-mono text-[var(--primary)] hover:underline inline-flex items-center gap-1 font-bold"
              >
                Full History <ArrowRight size={12} />
              </Link>
            }
          />
          <CardBody className="flex-1 flex flex-col gap-3">
            {recentActivities.map((a) => {
              const actor = users.find((u) => u.id === a.userId);
              const actorName = actor ? `${actor.firstName} ${actor.lastName}` : (a.userId || "System");
              const actorRole = actor?.role || a.actorRole || "system";
              const evt = events.find((e) => e.id === a.eventId);

              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-3.5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--muted)]/30 transition shadow-2xs"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-2xs ${getActionBadgeClass(a.action)}`}
                      >
                        {a.action}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] font-mono flex items-center gap-1">
                        <Clock size={10} /> {formatDate(a.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs font-semibold text-[var(--foreground)] leading-snug">
                      {a.details}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)] font-mono flex-wrap gap-1">
                      <span>
                        Actor: <strong className="text-[var(--foreground)]">{actorName}</strong> ({actorRole})
                      </span>
                      {evt && (
                        <span className="text-teal-700 font-bold truncate max-w-[170px]">
                          {evt.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </CardBody>
        </Card>
      </div>

      {/* User Role Breakdown Card with High Contrast Colors */}
      <Card>
        <CardHeader title="User Account Distribution" subtitle="System role categorizations across college portals" />
        <CardBody>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              {
                label: "Student Officers",
                count: students.length,
                role: "student",
                icon: <GraduationCap size={16} className="text-teal-700" />,
                border: "border-teal-300",
                bg: "bg-teal-50",
                text: "text-teal-950",
                countColor: "text-teal-900",
                subColor: "text-teal-800",
              },
              {
                label: "Faculty Advisers",
                count: advisers.length,
                role: "adviser",
                icon: <UserCheck size={16} className="text-sky-700" />,
                border: "border-sky-300",
                bg: "bg-sky-50",
                text: "text-sky-950",
                countColor: "text-sky-900",
                subColor: "text-sky-800",
              },
              {
                label: "College Dean",
                count: deans.length,
                role: "dean",
                icon: <Award size={16} className="text-purple-700" />,
                border: "border-purple-300",
                bg: "bg-purple-50",
                text: "text-purple-950",
                countColor: "text-purple-900",
                subColor: "text-purple-800",
              },
              {
                label: "System Admins",
                count: admins.length,
                role: "admin",
                icon: <Shield size={16} className="text-amber-700" />,
                border: "border-amber-300",
                bg: "bg-amber-50",
                text: "text-amber-950",
                countColor: "text-amber-900",
                subColor: "text-amber-800",
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`${item.bg} border ${item.border} rounded-2xl p-5 text-center shadow-xs transition hover:shadow-md`}
              >
                <div className="flex items-center justify-center gap-1.5 mb-1.5">
                  {item.icon}
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider ${item.subColor}`}>
                    {item.label}
                  </span>
                </div>
                <p className={`text-3xl font-extrabold font-mono tracking-tight ${item.countColor}`}>
                  {item.count}
                </p>
                <p className={`text-[11px] font-medium mt-1 ${item.text}`}>
                  Active System {item.role === "dean" ? "Directorate" : "Accounts"}
                </p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
