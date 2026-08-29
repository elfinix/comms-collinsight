import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Dialog, Input, Card } from "../../components/ui";
import { Plus, Pencil, Trash2, Search, Landmark, Save, X, AlertTriangle } from "lucide-react";
import { Department } from "../../services/mockData";

export default function AdminDepartments() {
  const { departments, organizations, addDepartment, updateDepartment, deleteDepartment } = useApp();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Department | null>(null);
  const [form, setForm] = useState({ name: "", code: "" });

  // Only display active (non-soft-deleted) departments
  const activeDepartments = departments.filter((d) => !d.deleted);

  const filtered = activeDepartments.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return d.name.toLowerCase().includes(q) || d.code.toLowerCase().includes(q);
  });

  function handleAdd() {
    if (!form.name || !form.code) return;
    addDepartment({
      id: `dept-${Date.now()}`,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
    });
    setForm({ name: "", code: "" });
    setShowAdd(false);
  }

  function handleEdit() {
    if (!editDept || !editDept.name || !editDept.code) return;
    updateDepartment(editDept.id, {
      name: editDept.name.trim(),
      code: editDept.code.trim().toUpperCase(),
    });
    setEditDept(null);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            Academic Departments
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Configure collegiate departments under the College of Information Technology & Engineering.
          </p>
        </div>
        <Button onClick={() => { setForm({ name: "", code: "" }); setShowAdd(true); }} className="gap-1.5 shadow-2xs">
          <Plus size={15} /> Add Department
        </Button>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search departments by code or title..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
          />
        </div>
      </div>

      {/* Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)]/50 border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Code</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Department Title</th>
                <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Linked Student Orgs</th>
                <th className="px-4 py-3 text-right text-xs font-mono font-semibold text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-xs text-[var(--muted-foreground)]">
                    No matching departments found.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const linkedOrgs = organizations.filter((o) => o.departmentId === d.id);
                  return (
                    <tr key={d.id} className="hover:bg-[var(--muted)]/40 transition-colors">
                      <td className="px-4 py-3.5 font-mono font-bold text-[var(--primary)] whitespace-nowrap">
                        {d.code}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-[var(--foreground)]">
                        {d.name}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[var(--muted-foreground)] font-mono">
                        {linkedOrgs.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {linkedOrgs.map((o) => (
                              <span key={o.id} className="px-2 py-0.5 rounded-md bg-[var(--muted)] border border-[var(--border)] font-bold text-[var(--foreground)]">
                                {o.code}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span>0 organizations</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditDept({ ...d })}
                            className="text-xs h-8 gap-1.5 font-medium shadow-2xs"
                          >
                            <Pencil size={12} /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteConfirm(d)}
                            className="text-xs h-8 gap-1.5 font-medium shadow-2xs"
                          >
                            <Trash2 size={12} /> Deactivate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Department Dialog */}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Department" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <Input
            label="Department Code *"
            value={form.code}
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="e.g., BSIT, BSCS, BSCpE"
          />
          <Input
            label="Department Title *"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="Bachelor of Science in Information Technology"
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="gap-1.5 text-xs">
              <X size={14} /> Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!form.name.trim() || !form.code.trim()} className="gap-1.5 text-xs">
              <Plus size={14} /> Add Department
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Department Dialog */}
      {editDept && (
        <Dialog open={!!editDept} onClose={() => setEditDept(null)} title="Edit Department" size="sm">
          <div className="p-6 flex flex-col gap-4">
            <Input
              label="Department Code *"
              value={editDept.code}
              onChange={(e) => setEditDept((p) => p && { ...p, code: e.target.value })}
            />
            <Input
              label="Department Title *"
              value={editDept.name}
              onChange={(e) => setEditDept((p) => p && { ...p, name: e.target.value })}
            />
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setEditDept(null)} className="gap-1.5 text-xs">
                <X size={14} /> Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!editDept.name.trim() || !editDept.code.trim()} className="gap-1.5 text-xs">
                <Save size={14} /> Save Changes
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Soft Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Deactivate Department?" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs leading-relaxed">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Soft Delete (Archive Safeguard)</p>
              <p className="mt-0.5 text-amber-800">
                Deactivating <strong>{deleteConfirm?.name} ({deleteConfirm?.code})</strong> will safely archive it without permanently deleting existing student proposals or organizational histories.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="gap-1.5 text-xs">
              <X size={14} /> Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteConfirm) deleteDepartment(deleteConfirm.id);
                setDeleteConfirm(null);
              }}
              className="gap-1.5 text-xs font-bold"
            >
              <Trash2 size={14} /> Confirm Deactivation
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
