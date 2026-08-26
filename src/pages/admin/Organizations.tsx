import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Dialog, Input, Select, Card } from "../../components/ui";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Organization } from "../../services/mockData";
import { formatCurrency } from "../../services/mockData";

export default function AdminOrganizations() {
  const { organizations, departments, users, addOrganization, updateOrganization, deleteOrganization } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Organization | null>(null);
  const [form, setForm] = useState({ name: "", code: "", departmentId: departments[0]?.id ?? "", adviserId: "", allocatedBudget: "0", logoColor: "#0d9488" });

  const advisers = users.filter((u) => u.role === "adviser");

  function handleAdd() {
    addOrganization({
      id: `org-${Date.now()}`,
      name: form.name,
      code: form.code,
      departmentId: form.departmentId,
      adviserId: form.adviserId,
      allocatedBudget: parseFloat(form.allocatedBudget) || 0,
      logoColor: form.logoColor,
    });
    setShowAdd(false);
  }

  function handleEdit() {
    if (!editOrg) return;
    updateOrganization(editOrg.id, editOrg);
    setEditOrg(null);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Organizations</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage student organizations and their budgets.</p>
        </div>
        <Button onClick={() => setShowAdd(true)}><Plus size={16} /> Add Organization</Button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {organizations.map((org) => {
          const dept = departments.find((d) => d.id === org.departmentId);
          const adviser = users.find((u) => u.id === org.adviserId);
          const members = users.filter((u) => u.organizationId === org.id && u.role === "student");
          return (
            <div key={org.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: org.logoColor }}>
                  {org.code.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">{org.name}</h3>
                  <p className="text-xs font-mono text-[var(--muted-foreground)]">{org.code} · {dept?.code}</p>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 text-xs mb-4">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)] font-mono">Allocated Budget</span>
                  <span className="font-semibold text-[var(--primary)]">{formatCurrency(org.allocatedBudget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)] font-mono">Adviser</span>
                  <span>{adviser ? `${adviser.firstName} ${adviser.lastName}` : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)] font-mono">Members</span>
                  <span>{members.length} students</span>
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-[var(--border)]">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditOrg({ ...org })}>
                  <Pencil size={12} /> Edit
                </Button>
                <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(org)}><Trash2 size={12} /></Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Organization" size="md">
        <div className="p-6 flex flex-col gap-4">
          <Input label="Organization Name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Code/Acronym" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} />
          <Select label="Department" value={form.departmentId} onChange={(e) => setForm(p => ({ ...p, departmentId: e.target.value }))}
            options={departments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }))} />
          <Select label="Faculty Adviser" value={form.adviserId} onChange={(e) => setForm(p => ({ ...p, adviserId: e.target.value }))}
            options={[{ value: "", label: "— Select Adviser —" }, ...advisers.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}` }))]} />
          <Input label="Allocated Budget (₱)" type="number" value={form.allocatedBudget} onChange={(e) => setForm(p => ({ ...p, allocatedBudget: e.target.value }))} />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name || !form.code}><Plus size={14} /> Add</Button>
          </div>
        </div>
      </Dialog>

      {editOrg && (
        <Dialog open={!!editOrg} onClose={() => setEditOrg(null)} title="Edit Organization" size="md">
          <div className="p-6 flex flex-col gap-4">
            <Input label="Name" value={editOrg.name} onChange={(e) => setEditOrg(p => p && ({ ...p, name: e.target.value }))} />
            <Input label="Code" value={editOrg.code} onChange={(e) => setEditOrg(p => p && ({ ...p, code: e.target.value }))} />
            <Input label="Allocated Budget (₱)" type="number" value={editOrg.allocatedBudget} onChange={(e) => setEditOrg(p => p && ({ ...p, allocatedBudget: parseFloat(e.target.value) || 0 }))} />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setEditOrg(null)}>Cancel</Button>
              <Button onClick={handleEdit}>Save Changes</Button>
            </div>
          </div>
        </Dialog>
      )}

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Organization?" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm">Delete <strong>{deleteConfirm?.name}</strong>? All associated data will be affected.</p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { if (deleteConfirm) deleteOrganization(deleteConfirm.id); setDeleteConfirm(null); }}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
