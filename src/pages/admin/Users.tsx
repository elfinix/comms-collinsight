import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Dialog, Input, Select, Card, UserAvatar } from "../../components/ui";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { User, Gender } from "../../services/mockData";

const ROLES = [
  { value: "student", label: "Student Officer" },
  { value: "adviser", label: "Faculty Adviser" },
  { value: "dean", label: "College Dean" },
  { value: "admin", label: "Administrator" },
];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
];

function emptyUser(): Omit<User, "id"> {
  return { firstName: "", middleName: "", lastName: "", suffix: "", email: "", password: "", role: "student", position: "", gender: "male", organizationId: "", yearLevel: "", memberSince: new Date().toISOString().split("T")[0] };
}

export default function AdminUsers() {
  const { users, organizations, addUser, updateUser, deleteUser } = useApp();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [form, setForm] = useState<Omit<User, "id">>(emptyUser());

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  function handleAdd() {
    addUser({ ...form, id: `user-${Date.now()}`, password: form.password || `${form.lastName.toLowerCase()}_${Math.floor(100000 + Math.random() * 900000)}` });
    setForm(emptyUser());
    setShowAdd(false);
  }

  function handleEditSave() {
    if (!editUser) return;
    updateUser(editUser.id, editUser);
    setEditUser(null);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Users</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage all system users: officers, advisers, dean, and admins.</p>
        </div>
        <Button onClick={() => { setForm(emptyUser()); setShowAdd(true); }}><Plus size={16} /> Add User</Button>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users..." className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ring)]" />
        </div>
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white focus:outline-none">
          <option value="all">All Roles</option>
          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                {["User", "Role", "Position", "Organization/Dept", "Email", "Actions"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No users found.</td></tr>
              ) : filtered.map((u) => {
                const org = u.organizationId ? organizations.find((o) => o.id === u.organizationId) : null;
                return (
                  <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <UserAvatar gender={u.gender} firstName={u.firstName} lastName={u.lastName} name={`${u.firstName} ${u.lastName}`} size="sm" />
                        <span className="font-medium">{u.firstName} {u.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${u.role === "student" ? "bg-teal-100 text-teal-700" : u.role === "adviser" ? "bg-blue-100 text-blue-700" : u.role === "dean" ? "bg-purple-100 text-purple-700" : "bg-amber-100 text-amber-700"}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{u.position}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{org?.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => setEditUser({ ...u })}><Pencil size={12} /></Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(u)}><Trash2 size={12} /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit User Dialog */}
      {[showAdd && { title: "Add User", user: form, setUser: (u: any) => setForm(u), onSave: handleAdd, onClose: () => setShowAdd(false) },
        editUser && { title: "Edit User", user: editUser, setUser: (u: any) => setEditUser(u), onSave: handleEditSave, onClose: () => setEditUser(null) }
      ].filter(Boolean).map((ctx: any, i) => (
        <Dialog key={i} open={true} onClose={ctx.onClose} title={ctx.title} size="lg">
          <div className="p-6 flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="First Name *" value={ctx.user.firstName} onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, firstName: e.target.value }))} />
              <Input label="Middle Name" value={ctx.user.middleName} onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, middleName: e.target.value }))} />
              <Input label="Last Name *" value={ctx.user.lastName} onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, lastName: e.target.value }))} />
              <Input label="Suffix" value={ctx.user.suffix} onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, suffix: e.target.value }))} placeholder="Jr., Ph.D." />
              <Input label="Email *" type="email" value={ctx.user.email} onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, email: e.target.value }))} />
              <Input label="Password" type="password" value={ctx.user.password} onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, password: e.target.value }))} placeholder="Auto-generated if blank" />
              <Select label="Role *" value={ctx.user.role} onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, role: e.target.value }))} options={ROLES} />
              <Select label="Gender" value={ctx.user.gender} onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, gender: e.target.value }))} options={GENDERS} />
              <div className="sm:col-span-2">
                <Input label="Position/Role in Org" value={ctx.user.position} onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, position: e.target.value }))} placeholder="e.g., President, Vice President" />
              </div>
              {(ctx.user.role === "student" || ctx.user.role === "adviser") && (
                <div className="sm:col-span-2">
                  <Select label="Organization" value={ctx.user.organizationId ?? ""} onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, organizationId: e.target.value }))}
                    options={[{ value: "", label: "— Select Organization —" }, ...organizations.map((o) => ({ value: o.id, label: o.name }))]} />
                </div>
              )}
              <div className="sm:col-span-2">
                <Select
                  label="Year / Academic Level"
                  value={ctx.user.yearLevel ?? (ctx.user.role === "student" ? "1st Year" : "Faculty/Staff")}
                  onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, yearLevel: e.target.value }))}
                  options={
                    ctx.user.role === "student"
                      ? [
                          { value: "1st Year", label: "1st Year" },
                          { value: "2nd Year", label: "2nd Year" },
                          { value: "3rd Year", label: "3rd Year" },
                          { value: "4th Year", label: "4th Year" },
                          { value: "5th Year", label: "5th Year" },
                        ]
                      : [
                          { value: "Faculty/Staff", label: "Faculty/Staff" },
                          { value: "Not Applicable", label: "Not Applicable" },
                        ]
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="outline" onClick={ctx.onClose}>Cancel</Button>
              <Button onClick={ctx.onSave} disabled={!ctx.user.firstName || !ctx.user.lastName || !ctx.user.email}>
                {ctx.title === "Add User" ? <><Plus size={14} /> Add User</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </Dialog>
      ))}

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Remove User?" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm">Remove <strong>{deleteConfirm?.firstName} {deleteConfirm?.lastName}</strong> from the system?</p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => { if (deleteConfirm) deleteUser(deleteConfirm.id); setDeleteConfirm(null); }}>
              <Trash2 size={14} /> Remove
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
