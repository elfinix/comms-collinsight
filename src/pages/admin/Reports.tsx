import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { Card, CardHeader, CardBody, Button, StatCard } from "../../components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Calendar, Activity, Building2, Printer } from "lucide-react";
import { formatCurrency, formatDateTime } from "../../services/mockData";

export default function AdminReports() {
  const { users, events, auditTrail, organizations, departments } = useApp();
  const { currentUser } = useAuth();

  const adminName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}${currentUser.suffix ? ", " + currentUser.suffix : ""}`
    : "Engr. Marco D. Villanueva";

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

  function handleExportPDF() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.print();
      return;
    }

    const docRef = `SYS-RPT-${Date.now().toString().slice(-6)}`;
    const generatedDate = formatDateTime(new Date().toISOString());

    const orgRowsHtml = organizations.map((org) => {
      const dept = departments.find((d) => d.id === org.departmentId);
      const adviser = users.find((u) => u.id === org.adviserId);
      const members = users.filter((u) => u.organizationId === org.id && u.role === "student");
      const orgEvents = events.filter((e) => e.organizationId === org.id);
      return `
        <tr>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #0f766e;">${org.code}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0;">${org.name}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-family: monospace;">${dept?.code || "CITE"}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: monospace; font-weight: bold;">${formatCurrency(org.allocatedBudget)}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0;">${adviser ? `${adviser.firstName} ${adviser.lastName}` : "—"}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace;">${members.length}</td>
          <td style="padding: 7px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-family: monospace; font-weight: bold;">${orgEvents.length}</td>
        </tr>
      `;
    }).join("");

    const activityRowsHtml = activityByDay.map((d) => `
      <div style="flex: 1; text-align: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 4px;">
        <div style="font-size: 10px; font-weight: bold; color: #64748b; font-family: monospace;">${d.name}</div>
        <div style="font-size: 14px; font-weight: bold; color: #0f766e; margin-top: 2px; font-family: monospace;">${d.actions}</div>
      </div>
    `).join("");

    const deans = users.filter((u) => u.role === "dean");
    const deanName = deans.length > 0 ? `${deans[0].firstName} ${deans[0].lastName}${deans[0].suffix ? ", " + deans[0].suffix : ""}` : "Dr. Jocelyn B. Hipolito";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>System_Usage_Analytics_Report_${docRef}</title>
        <style>
          @page { size: A4 portrait; margin: 15mm; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #0f172a;
            margin: 0;
            padding: 24px;
            font-size: 11px;
            line-height: 1.4;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #0f766e;
            padding-bottom: 14px;
            margin-bottom: 16px;
          }
          .brand { display: flex; align-items: center; gap: 12px; }
          .logo {
            width: 44px; height: 44px;
            border-radius: 8px;
            background-color: #134e4a;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 800;
            font-size: 16px;
            letter-spacing: 0.5px;
          }
          .kpi-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            padding: 12px;
            border-radius: 8px;
            margin-bottom: 16px;
          }
          .kpi-label { font-size: 9px; color: #64748b; text-transform: uppercase; font-family: monospace; font-weight: bold; }
          .kpi-val { font-weight: bold; font-size: 15px; margin-top: 2px; color: #0f172a; font-family: monospace; }
          .section-title {
            font-size: 11px;
            font-weight: bold;
            color: #0f766e;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin: 16px 0 10px 0;
            font-family: monospace;
          }
          table { width: 100%; border-collapse: collapse; font-size: 10px; margin-bottom: 16px; }
          th { background: #f1f5f9; text-align: left; padding: 8px 10px; border-bottom: 1px solid #cbd5e1; font-family: monospace; font-weight: bold; color: #334155; }
          .signatory-section {
            margin-top: 28px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            border-top: 1px solid #e2e8f0;
            padding-top: 16px;
          }
          .sig-line { border-bottom: 1px solid #334155; height: 35px; margin-bottom: 6px; }
          @media print {
            body { padding: 0; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="brand">
            <div class="logo">LCUP</div>
            <div>
              <h2 style="margin: 0; font-size: 15px; font-weight: 800; color: #134e4a; text-transform: uppercase;">La Consolacion University Philippines</h2>
              <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569; font-weight: 600;">College of Information Technology & Engineering</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #0f766e; font-weight: bold;">System Usage & Activity Analytics Report</p>
            </div>
          </div>
          <div style="text-align: right; font-family: monospace;">
            <span style="background: #ccfbf1; color: #115e59; font-weight: bold; padding: 4px 8px; border-radius: 4px; border: 1px solid #99f6e4; font-size: 10px;">SYSTEM REPORT</span>
            <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b;">Ref: ${docRef}</p>
            <p style="margin: 2px 0 0 0; font-size: 9px; color: #64748b;">Date: ${generatedDate}</p>
          </div>
        </div>

        <div class="kpi-grid">
          <div><div class="kpi-label">Total Accounts</div><div class="kpi-val">${users.length} Users</div></div>
          <div><div class="kpi-label">Total Events</div><div class="kpi-val">${events.length} Events</div></div>
          <div><div class="kpi-label">Audit Ledger</div><div class="kpi-val">${auditTrail.length} Logs</div></div>
          <div><div class="kpi-label">Recognized Orgs</div><div class="kpi-val">${organizations.length} Orgs</div></div>
        </div>

        <div class="section-title">Weekly System Activity (Last 7 Days)</div>
        <div style="display: flex; gap: 8px; margin-bottom: 16px;">
          ${activityRowsHtml}
        </div>

        <div class="section-title">Organizations Engagement & Allocations</div>
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Organization Full Title</th>
              <th>Dept</th>
              <th style="text-align: right;">Allocated Budget</th>
              <th>Faculty Adviser</th>
              <th style="text-align: center;">Officers</th>
              <th style="text-align: center;">Events</th>
            </tr>
          </thead>
          <tbody>
            ${orgRowsHtml}
          </tbody>
        </table>

        <div class="section-title">User Account Distribution by Role</div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
          ${(["student", "adviser", "dean", "admin"] as const).map((r) => {
            const count = users.filter((u) => u.role === r).length;
            const pct = Math.round((count / users.length) * 100);
            const titles = { student: "Student Officers", adviser: "Faculty Advisers", dean: "College Dean", admin: "System Admins" };
            return `
              <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; text-align: center;">
                <div style="font-size: 15px; font-weight: bold; color: #0f766e; font-family: monospace;">${count}</div>
                <div style="font-size: 10px; font-weight: bold; color: #334155; margin-top: 2px;">${titles[r]}</div>
                <div style="font-size: 9px; color: #64748b; font-family: monospace;">${pct}% of system</div>
              </div>
            `;
          }).join("")}
        </div>

        <div class="signatory-section">
          <div>
            <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Report Generated by:</div>
            <div class="sig-line"></div>
            <div style="font-weight: bold; font-size: 11px;">${adminName}</div>
            <div style="font-size: 9px; color: #64748b;">System Administrator, CITE</div>
          </div>
          <div>
            <div style="font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase;">Certified & Endorsed by:</div>
            <div class="sig-line"></div>
            <div style="font-weight: bold; font-size: 11px;">${deanName}</div>
            <div style="font-size: 9px; color: #64748b;">College Dean, CITE</div>
          </div>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            System Reports
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            System-wide interaction, organizational budget, and usage analytics.
          </p>
        </div>
        <Button onClick={handleExportPDF} variant="outline" className="gap-1.5 shadow-2xs font-semibold text-xs h-9">
          <Printer size={15} /> Export PDF
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={users.length} icon={<Users size={18} />} />
        <StatCard label="Total Events" value={events.length} icon={<Calendar size={18} />} />
        <StatCard label="Audit Entries" value={auditTrail.length} icon={<Activity size={18} />} />
        <StatCard label="Organizations" value={organizations.length} icon={<Building2 size={18} />} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><h2 className="font-semibold">System Activity (Last 7 Days)</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityByDay} margin={{ left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="actions" name="Actions" fill="#0d9488" radius={[4, 4, 0, 0]} />
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
                <Bar dataKey="users" fill="#0d9488" radius={[4, 4, 0, 0]} name="Users" />
                <Bar dataKey="events" fill="#0284c7" radius={[4, 4, 0, 0]} name="Events" />
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
              const colors = {
                student: "bg-teal-50 text-teal-800 border border-teal-200",
                adviser: "bg-sky-50 text-sky-800 border border-sky-200",
                dean: "bg-purple-50 text-purple-800 border border-purple-200",
                admin: "bg-amber-50 text-amber-800 border border-amber-200",
              };
              return (
                <div key={role} className={`${colors[role]} rounded-xl p-5 text-center shadow-2xs`}>
                  <p className="text-3xl font-extrabold font-mono">{count}</p>
                  <p className="text-xs font-mono font-bold mt-1 uppercase tracking-wider">{role}s</p>
                  <p className="text-xs mt-1 opacity-75 font-mono">{Math.round((count / users.length) * 100)}% of total</p>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
