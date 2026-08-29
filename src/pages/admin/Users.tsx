import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Dialog, Input, Select, Card, UserAvatar } from "../../components/ui";
import { Plus, Pencil, Trash2, Search, Users, Save, X, Building2 } from "lucide-react";
import { User } from "../../services/mockData";

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

const STUDENT_OFFICER_POSITIONS = [
  "President",
  "Vice President",
  "Secretariat",
  "Treasury",
  "Public Relations",
  "Business Management",
  "Creatives & Media",
  "Logistics",
  "Office Committee",
];

function emptyUser(): Omit<User, "id"> {
  return {
    firstName: "",
    middleName: "",
    lastName: "",
    suffix: "",
    email: "",
    password: "",
    role: "student",
    position: "President",
    gender: "male",
    organizationId: "",
    yearLevel: "1st Year",
    memberSince: new Date().toISOString().split("T")[0],
  };
}

export default function AdminUsers() {
  const { users, organizations, addUser, updateUser, deleteUser, updateOrganization } = useApp();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [form, setForm] = useState<Omit<User, "id">>(emptyUser());

  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (orgFilter !== "all" && u.organizationId !== orgFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const fullName = `${u.firstName} ${u.lastName}`.toLowerCase();
      const pos = (u.position || "").toLowerCase();
      const email = u.email.toLowerCase();
      return fullName.includes(q) || pos.includes(q) || email.includes(q);
    }
    return true;
  });

  function handleAdd() {
    if (!form.firstName || !form.lastName || !form.email) return;
    const newUserId = `user-${Date.now()}`;
    const userPayload: User = {
      ...form,
      id: newUserId,
      position: form.role === "adviser" ? "Faculty Adviser" : form.position,
      password: form.password || `${form.lastName.toLowerCase()}_${Math.floor(100000 + Math.random() * 900000)}`,
    };
    addUser(userPayload);

    // If an adviser was assigned to an organization, sync the organization's adviserId
    if (form.role === "adviser" && form.organizationId) {
      updateOrganization(form.organizationId, { adviserId: newUserId });
    }

    setForm(emptyUser());
    setShowAdd(false);
  }

  function handleEditSave() {
    if (!editUser || !editUser.firstName || !editUser.lastName || !editUser.email) return;
    const updatedPayload = {
      ...editUser,
      position: editUser.role === "adviser" ? "Faculty Adviser" : editUser.position,
    };
    updateUser(editUser.id, updatedPayload);

    if (editUser.role === "adviser") {
      // Clear previous organization assignment if adviser moved to a different org
      const prevOrg = organizations.find((o) => o.adviserId === editUser.id && o.id !== editUser.organizationId);
      if (prevOrg) {
        updateOrganization(prevOrg.id, { adviserId: "" });
      }
      if (editUser.organizationId) {
        updateOrganization(editUser.organizationId, { adviserId: editUser.id });
      }
    }

    setEditUser(null);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            User Accounts & Roles
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Manage credentials, appoint student executive officers, and assign organizational responsibilities.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyUser());
            setShowAdd(true);
          }}
          className="gap-1.5 shadow-2xs"
        >
          <Plus size={15} /> Add User
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[240px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or position..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3.5 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs"
          >
            <option value="all">All Roles</option>
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="px-3.5 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs"
          >
            <option value="all">All Organizations</option>
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.code} — {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Users Table Card */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)]/50 border-b border-[var(--border)]">
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)]">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)]">System Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)]">Assigned Organization</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)]">Officer Position</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)]">Email</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-xs text-[var(--muted-foreground)]">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filtered.map((u) => {
                  const org = u.organizationId ? organizations.find((o) => o.id === u.organizationId) : null;
                  return (
                    <tr key={u.id} className="hover:bg-[var(--muted)]/40 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            gender={u.gender}
                            firstName={u.firstName}
                            lastName={u.lastName}
                            name={`${u.firstName} ${u.lastName}`}
                            size="sm"
                          />
                          <div>
                            <p className="font-bold text-[var(--foreground)] text-xs">
                              {u.firstName} {u.middleName ? u.middleName + " " : ""}{u.lastName} {u.suffix || ""}
                            </p>
                            <span className="text-[10px] text-[var(--muted-foreground)]">
                              {u.yearLevel || "—"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            u.role === "student"
                              ? "bg-teal-50 text-teal-800 border-teal-200"
                              : u.role === "adviser"
                              ? "bg-sky-50 text-sky-800 border-sky-200"
                              : u.role === "dean"
                              ? "bg-purple-50 text-purple-800 border-purple-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {u.role === "student"
                            ? "Student Officer"
                            : u.role === "adviser"
                            ? "Faculty Adviser"
                            : u.role === "dean"
                            ? "College Dean"
                            : "Administrator"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {org ? (
                          <div className="flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: org.logoColor }}
                            />
                            <span className="font-bold text-[var(--foreground)]">{org.code}</span>
                            <span className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[120px] hidden sm:inline">
                              ({org.name})
                            </span>
                          </div>
                        ) : (
                          <span className="text-[var(--muted-foreground)] text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-medium text-[var(--foreground)]">
                          {u.role === "adviser" ? "Faculty Adviser" : u.position || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--muted-foreground)]">
                        {u.email}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditUser({ ...u })}
                            className="text-xs h-8 gap-1.5 font-medium shadow-2xs"
                          >
                            <Pencil size={12} /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteConfirm(u)}
                            className="text-xs h-8 gap-1.5 font-medium shadow-2xs"
                          >
                            <Trash2 size={12} /> Remove
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

      {/* Add / Edit User Dialog */}
      {[
        showAdd && {
          title: "Add New User Account",
          user: form,
          setUser: (u: any) => setForm(u),
          onSave: handleAdd,
          onClose: () => setShowAdd(false),
          isNew: true,
        },
        editUser && {
          title: "Edit User Profile & Role Assignments",
          user: editUser,
          setUser: (u: any) => setEditUser(u),
          onSave: handleEditSave,
          onClose: () => setEditUser(null),
          isNew: false,
        },
      ]
        .filter(Boolean)
        .map((ctx: any, i) => {
          // Internal Validation: For Advisers, only organizations without an adviser OR assigned to this user are selectable
          const availableOrgs = organizations.filter((o) => {
            if (ctx.user.role === "student") return true;
            // For advisers: show if organization has no adviser, or is currently assigned to this user
            return (
              !o.adviserId ||
              o.adviserId === ctx.user.id ||
              !users.some((u) => u.id === o.adviserId && u.id !== ctx.user.id && u.role === "adviser")
            );
          });

          return (
            <Dialog key={i} open={true} onClose={ctx.onClose} title={ctx.title} size="lg">
              <div className="p-6 flex flex-col gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    value={ctx.user.firstName}
                    onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, firstName: e.target.value }))}
                  />
                  <Input
                    label="Middle Name"
                    value={ctx.user.middleName}
                    onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, middleName: e.target.value }))}
                  />
                  <Input
                    label="Last Name *"
                    value={ctx.user.lastName}
                    onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, lastName: e.target.value }))}
                  />
                  <Input
                    label="Suffix"
                    value={ctx.user.suffix}
                    onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, suffix: e.target.value }))}
                    placeholder="Jr., III, Ph.D., M.Sc."
                  />
                  <Input
                    label="Email Address *"
                    type="email"
                    value={ctx.user.email}
                    onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, email: e.target.value }))}
                  />
                  <Input
                    label="Password"
                    type="password"
                    value={ctx.user.password}
                    onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, password: e.target.value }))}
                    placeholder="Leave blank for auto-generated password"
                  />
                  <Select
                    label="System Role *"
                    value={ctx.user.role}
                    onChange={(e: any) => {
                      const newRole = e.target.value;
                      ctx.setUser((p: any) => ({
                        ...p,
                        role: newRole,
                        yearLevel: newRole === "student" ? "1st Year" : "Faculty/Staff",
                        position:
                          newRole === "dean"
                            ? "College Dean"
                            : newRole === "adviser"
                            ? "Faculty Adviser"
                            : newRole === "admin"
                            ? "System Administrator"
                            : p.position || "President",
                      }));
                    }}
                    options={ROLES}
                  />
                  <Select
                    label="Gender"
                    value={ctx.user.gender}
                    onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, gender: e.target.value }))}
                    options={GENDERS}
                  />

                  {/* Organization & Role Assignment Section */}
                  {(ctx.user.role === "student" || ctx.user.role === "adviser") && (
                    <div className="sm:col-span-2 p-4 bg-[var(--muted)]/30 border border-[var(--border)] rounded-xl space-y-3">
                      <p className="text-xs font-mono font-bold uppercase text-[var(--foreground)] flex items-center gap-1.5">
                        <Building2 size={14} className="text-[var(--primary)]" />
                        Organizational Affiliation & Role Assignment
                      </p>

                      <div className={`grid ${ctx.user.role === "student" ? "sm:grid-cols-2" : "grid-cols-1"} gap-3`}>
                        <div>
                          <Select
                            label={ctx.user.role === "adviser" ? "Advised Organization *" : "Assigned Organization *"}
                            value={ctx.user.organizationId ?? ""}
                            onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, organizationId: e.target.value }))}
                            options={[
                              { value: "", label: "— Select Organization —" },
                              ...availableOrgs.map((o) => ({ value: o.id, label: `${o.code} — ${o.name}` })),
                            ]}
                          />
                          {ctx.user.role === "adviser" && availableOrgs.length < organizations.length && (
                            <p className="text-[10px] text-[var(--muted-foreground)] font-mono mt-1">
                              * Only organizations without an appointed adviser are available.
                            </p>
                          )}
                        </div>

                        {ctx.user.role === "student" && (
                          <div>
                            <Select
                              label="Executive Position / Role *"
                              value={
                                STUDENT_OFFICER_POSITIONS.includes(ctx.user.position)
                                  ? ctx.user.position
                                  : "Custom"
                              }
                              onChange={(e: any) => {
                                if (e.target.value === "Custom") {
                                  ctx.setUser((p: any) => ({ ...p, position: "" }));
                                } else {
                                  ctx.setUser((p: any) => ({ ...p, position: e.target.value }));
                                }
                              }}
                              options={[
                                ...STUDENT_OFFICER_POSITIONS.map((pos) => ({ value: pos, label: pos })),
                                { value: "Custom", label: "— Custom Position Title —" },
                              ]}
                            />
                            {(!STUDENT_OFFICER_POSITIONS.includes(ctx.user.position) || ctx.user.position === "") && (
                              <div className="mt-2">
                                <Input
                                  value={ctx.user.position || ""}
                                  onChange={(e: any) => ctx.setUser((p: any) => ({ ...p, position: e.target.value }))}
                                  placeholder="Type custom position title..."
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
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

                <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
                  <Button variant="outline" onClick={ctx.onClose} className="gap-1.5 text-xs">
                    <X size={14} /> Cancel
                  </Button>
                  <Button
                    onClick={ctx.onSave}
                    disabled={!ctx.user.firstName.trim() || !ctx.user.lastName.trim() || !ctx.user.email.trim()}
                    className="gap-1.5 text-xs font-bold"
                  >
                    {ctx.isNew ? (
                      <>
                        <Plus size={14} /> Add User Account
                      </>
                    ) : (
                      <>
                        <Save size={14} /> Save Changes
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Dialog>
          );
        })}

      {/* Delete User Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Remove User Account?" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm">
            Are you sure you want to remove{" "}
            <strong>
              {deleteConfirm?.firstName} {deleteConfirm?.lastName}
            </strong>{" "}
            from the system?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="gap-1.5 text-xs">
              <X size={14} /> Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteConfirm) deleteUser(deleteConfirm.id);
                setDeleteConfirm(null);
              }}
              className="gap-1.5 text-xs font-bold"
            >
              <Trash2 size={14} /> Confirm Removal
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
