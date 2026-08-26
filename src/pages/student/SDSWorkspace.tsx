import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { Card, CardHeader, CardBody, Button } from "../../components/ui";
import { FileText, Mail, CheckCircle, Clock } from "lucide-react";
import { formatDate, statusColors } from "../../services/mockData";

export default function SDSWorkspace() {
  const { currentUser } = useAuth();
  const { events } = useApp();
  const orgId = currentUser?.organizationId ?? "";
  const sentEvents = events.filter((e) => e.organizationId === orgId && ["Approved", "Completed", "Closed"].includes(e.status));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">SDS Workspace</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Track APF submissions and clearances sent to the Student Development Services office.</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center text-[var(--primary)]"><Mail size={20} /></div>
          <div>
            <p className="text-2xl font-bold">{sentEvents.length}</p>
            <p className="text-xs font-mono text-[var(--muted-foreground)]">Documents Sent to SDS</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600"><CheckCircle size={20} /></div>
          <div>
            <p className="text-2xl font-bold">{sentEvents.filter((e) => e.status === "Closed").length}</p>
            <p className="text-xs font-mono text-[var(--muted-foreground)]">Liquidated Events</p>
          </div>
        </Card>
        <Card className="p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600"><Clock size={20} /></div>
          <div>
            <p className="text-2xl font-bold">{sentEvents.filter((e) => e.status === "Approved").length}</p>
            <p className="text-xs font-mono text-[var(--muted-foreground)]">Pending Liquidation</p>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Submitted Documents Log</h2>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                {["Event", "Date Submitted", "Documents", "Status"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sentEvents.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No documents sent to SDS yet.</td></tr>
              ) : (
                sentEvents.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition">
                    <td className="px-4 py-3 font-medium">{e.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDate(e.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {e.apfUrl && <span className="text-[10px] bg-teal-50 text-teal-600 font-mono px-2 py-0.5 rounded">APF</span>}
                        {(e.appendices?.length ?? 0) > 0 && <span className="text-[10px] bg-blue-50 text-blue-600 font-mono px-2 py-0.5 rounded">Appendix ({e.appendices?.length})</span>}
                        <span className="text-[10px] bg-purple-50 text-purple-600 font-mono px-2 py-0.5 rounded">Clearance</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 bg-[var(--card)] border border-[var(--border)] rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Mail size={18} className="text-[var(--primary)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-[var(--foreground)] mb-1">SDS Office Contact</p>
            <p className="text-sm text-[var(--muted-foreground)]">All APF and Clearance documents are automatically forwarded upon Dean approval.</p>
            <p className="text-sm font-mono text-[var(--primary)] mt-1">sds@email.lcup.edu.ph</p>
          </div>
        </div>
      </div>
    </div>
  );
}
