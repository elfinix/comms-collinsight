import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Card, Input } from "../../components/ui";
import { Search, Shield } from "lucide-react";
import { formatDateTime, getUserById } from "../../services/mockData";

export default function AdminAuditTrail() {
  const { auditTrail, users } = useApp();
  const [search, setSearch] = useState("");

  const filtered = auditTrail.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return a.action.toLowerCase().includes(q) || a.details.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Audit Trail</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Complete log of system interactions and user actions.</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[var(--muted-foreground)] bg-[var(--muted)] px-3 py-2 rounded-lg">
          <Shield size={14} className="text-[var(--primary)]" />
          {auditTrail.length} total entries
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search audit log..." className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                {["Timestamp", "User", "Action", "Details"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No entries found.</td></tr>
              ) : filtered.map((a) => {
                const user = users.find((u) => u.id === a.userId);
                return (
                  <tr key={a.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                    <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)] whitespace-nowrap">{formatDateTime(a.timestamp)}</td>
                    <td className="px-4 py-3 text-xs">{user ? `${user.firstName} ${user.lastName}` : a.userId}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{a.action}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--foreground)]">{a.details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
