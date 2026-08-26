import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Dialog, Input, Card, CardHeader, EmptyState } from "../../components/ui";
import { Plus, Pencil, Trash2, BookOpen } from "lucide-react";
import { Department } from "../../services/mockData";

export default function AdminDepartments() {
  const { departments, addDepartment, updateDepartment, deleteDepartment } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", code: "" });

  function handleAdd() {
    addDepartment({ id: `dept-${Date.now()}`, name: form.name, code: form.code });
    setForm({ name: "", code: "" });
    setShowAdd(false);
  }

  function handleEdit() {
    if (!editDept) return;
    updateDepartment(editDept.id, { name: editDept.name, code: editDept.code });
    setEditDept(null);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Departments</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage college departments under CITE.</p>
        </div>
        <Button onClick={() => { setForm({ name: "", code: "" }); setShowAdd(true); }}>
          <Plus size={16} /> Add Department
        </Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                {["Code", "Department Name", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {departments.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No departments configured.</td></tr>
              ) : departments.map((d) => (
                <tr key={d.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                  <td className="px-4 py-3 font-mono font-semibold text-[var(--primary)]">{d.code}</td>
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => setEditDept({ ...d })}><Pencil size={12} /></Button>
                      <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(d)}><Trash2 size={12} /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Department" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <Input label="Department Code" value={form.code} onChange={(e) => setForm(p => ({ ...p, code: e.target.value }))} placeholder="e.g., BSCS" />
          <Input label="Department Name" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Bachelor of Science in..." />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!form.name || !form.code}><Plus size={14} /> Add</Button>
          </div>
        </div>
      </Dialog>

      {editDept && (
        <Dialog open={!!editDept} onClose={() => setEditDept(null)} title="Edit Department" size="sm">
          <div className="p-6 flex flex-col gap-4">
            <Input label="Code" value={editDept.code} onChange={(e) => setEditDept(p => p && ({ ...p, code: e.target.value }))} />
            <Input label="Name" value={editDept.name} onChange={(e) => setEditDept(p => p && ({ ...p, name: e.target.value }))} />
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setEditDept(null)}>Cancel</Button>
              <Button onClick={handleEdit}>Save</Button>
            </div>
          </div>
        </Dialog>
      )}

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Department?" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm">Delete <strong>{deleteConfirm?.name}</strong>? Organizations under this department will be affected.</p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { if (deleteConfirm) deleteDepartment(deleteConfirm.id); setDeleteConfirm(null); }}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
