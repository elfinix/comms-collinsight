import { useApp } from "../../context/AppContext";
import { Card, CardHeader, CardBody, Button, StatCard } from "../../components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { FileDown, Users, Calendar, Activity } from "lucide-react";
import { formatDate, organizations } from "../../services/mockData";

export default function AdminReports() {
  const { users, events, auditTrail } = useApp();

  const activityByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const label = d.toLocaleDateString("default", { weekday: "short" });
    const count = auditTrail.filter((a) => {
      const ad = new Date(a.timestamp);
      return ad.toDateString() === d.toDateString();
    }).length;
    return { name: label, actions: count };
  });

  const orgData = organizations.map((o) => ({
    name: o.code,
    users: users.filter((u) => u.organizationId === o.id).length,
    events: events.filter((e) => e.organizationId === o.id).length,
  }));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">System Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">System-wide interaction and usage analytics.</p>
        </div>
        <Button variant="outline"><FileDown size={16} /> Export</Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Users" value={users.length} icon={<Users size={18} />} />
        <StatCard label="Total Events" value={events.length} icon={<Calendar size={18} />} />
        <StatCard label="Audit Entries" value={auditTrail.length} icon={<Activity size={18} />} />
        <StatCard label="Organizations" value={organizations.length} icon={<Calendar size={18} />} />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><h2 className="font-semibold">System Activity (Last 7 Days)</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityByDay} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="actions" fill="#0d9488" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-semibold">Users & Events per Organization</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={orgData} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="users" fill="#0d9488" radius={[4,4,0,0]} name="Users" />
                <Bar dataKey="events" fill="#0284c7" radius={[4,4,0,0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Role distribution */}
      <Card>
        <CardHeader><h2 className="font-semibold">User Distribution by Role</h2></CardHeader>
        <CardBody>
          <div className="grid sm:grid-cols-4 gap-4">
            {(["student", "adviser", "dean", "admin"] as const).map((role) => {
              const count = users.filter((u) => u.role === role).length;
              const colors = { student: "bg-teal-50 text-teal-700", adviser: "bg-blue-50 text-blue-700", dean: "bg-purple-50 text-purple-700", admin: "bg-amber-50 text-amber-700" };
              return (
                <div key={role} className={`${colors[role]} rounded-xl p-5 text-center`}>
                  <p className="text-3xl font-bold">{count}</p>
                  <p className="text-xs font-mono mt-1 capitalize">{role}s</p>
                  <p className="text-xs mt-1 opacity-70">{Math.round((count / users.length) * 100)}% of total</p>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
