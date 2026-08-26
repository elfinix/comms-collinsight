import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody } from "../../components/ui";
import { Users, Building2, Calendar, Shield } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { organizations, formatDate, statusColors } from "../../services/mockData";

export default function AdminDashboard() {
  const { events, users, departments, organizations: orgs, auditTrail } = useApp();

  const students = users.filter((u) => u.role === "student");
  const advisers = users.filter((u) => u.role === "adviser");
  const recentAudit = auditTrail.slice(0, 8);

  const orgData = orgs.map((o) => ({
    name: o.code,
    events: events.filter((e) => e.organizationId === o.id).length,
    users: users.filter((u) => u.organizationId === o.id).length,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Admin Dashboard</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">System-wide overview and management hub.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={users.length} icon={<Users size={18} />} />
        <StatCard label="Organizations" value={orgs.length} icon={<Building2 size={18} />} />
        <StatCard label="Departments" value={departments.length} icon={<Building2 size={18} />} />
        <StatCard label="Total Events" value={events.length} icon={<Calendar size={18} />} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><h2 className="font-semibold">Events & Users per Organization</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orgData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="events" fill="#0d9488" radius={[4,4,0,0]} name="Events" />
                <Bar dataKey="users" fill="#0284c7" radius={[4,4,0,0]} name="Users" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><h2 className="font-semibold">Recent Audit Trail</h2></CardHeader>
          <CardBody className="flex flex-col gap-2.5">
            {recentAudit.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-[var(--primary)] mt-1.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">{a.details}</p>
                  <p className="text-xs text-[var(--muted-foreground)] font-mono mt-0.5">{formatDate(a.timestamp)}</p>
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* User Role Breakdown */}
      <Card>
        <CardHeader><h2 className="font-semibold">User Breakdown</h2></CardHeader>
        <CardBody>
          <div className="grid sm:grid-cols-4 gap-4">
            {[
              { label: "Students", count: students.length, color: "bg-teal-100 text-teal-700" },
              { label: "Advisers", count: advisers.length, color: "bg-blue-100 text-blue-700" },
              { label: "Dean", count: users.filter(u => u.role === "dean").length, color: "bg-purple-100 text-purple-700" },
              { label: "Admins", count: users.filter(u => u.role === "admin").length, color: "bg-amber-100 text-amber-700" },
            ].map((item) => (
              <div key={item.label} className={`${item.color} rounded-xl p-4 text-center`}>
                <p className="text-2xl font-bold">{item.count}</p>
                <p className="text-xs font-mono mt-1">{item.label}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
