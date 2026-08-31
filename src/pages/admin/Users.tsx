import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { Button, Dialog, Input, Select, Card, UserAvatar } from "../../components/ui";
import { Plus, Pencil, Trash2, Search, Users, Save, X, Building2, KeyRound, Copy, Check, RefreshCw, ArrowUpWideNarrow, ArrowDownWideNarrow, ArrowUpDown, Layers, Filter } from "lucide-react";
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
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [groupBy, setGroupBy] = useState<"role" | "org" | "none">("role");
  const [sortKey, setSortKey] = useState<"lastName" | "firstName" | "role" | "memberSince">("lastName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState<Omit<User, "id">>(emptyUser());

  // Filtered users list
  const filtered = users.filter((u) => {
    if (roleFilter !== "all" && u.role !== roleFilter) return false;
    if (orgFilter !== "all" && u.organizationId !== orgFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const fullName = `${u.firstName} ${u.middleName || ""} ${u.lastName} ${u.suffix || ""}`.toLowerCase();
    return (
      fullName.includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.position && u.position.toLowerCase().includes(q))
    );
  });

  // Comparator for sorting users
  function sortUsers(list: User[]) {
    return [...list].sort((a, b) => {
      // If flat table with no grouping, pin Admins first
      if (groupBy === "none") {
        if (a.role === "admin" && b.role !== "admin") return -1;
        if (b.role === "admin" && a.role !== "admin") return 1;
      }

      let comp = 0;
      if (sortKey === "lastName") {
        comp = (a.lastName || "").localeCompare(b.lastName || "");
        if (comp === 0) comp = (a.firstName || "").localeCompare(b.firstName || "");
      } else if (sortKey === "firstName") {
        comp = (a.firstName || "").localeCompare(b.firstName || "");
        if (comp === 0) comp = (a.lastName || "").localeCompare(b.lastName || "");
      } else if (sortKey === "role") {
        comp = a.role.localeCompare(b.role);
      } else if (sortKey === "memberSince") {
        const timeA = new Date(a.memberSince || 0).getTime();
        const timeB = new Date(b.memberSince || 0).getTime();
        comp = timeA - timeB;
      }
      return sortDir === "asc" ? comp : -comp;
    });
  }

  // Generate groups based on groupBy setting
  interface UserGroup {
    id: string;
    label: string;
    sublabel?: string;
    color?: string;
    users: User[];
  }

  let groups: UserGroup[] = [];

  if (groupBy === "role") {
    const roleOrder: { role: User["role"]; label: string; sublabel: string; color: string }[] = [
      { role: "admin", label: "Administrators", sublabel: "System Security & Platform Governance", color: "#f59e0b" },
      { role: "dean", label: "College Dean", sublabel: "Executive Leadership & Institutional Clearance", color: "#a855f7" },
      { role: "adviser", label: "Faculty Advisers", sublabel: "Academic Mentors & Proposal Reviewers", color: "#0284c7" },
      { role: "student", label: "Student Officers", sublabel: "Student Executive Committees", color: "#0d9488" },
    ];

    groups = roleOrder
      .map((r) => ({
        id: r.role,
        label: r.label,
        sublabel: r.sublabel,
        color: r.color,
        users: sortUsers(filtered.filter((u) => u.role === r.role)),
      }))
      .filter((g) => g.users.length > 0);
  } else if (groupBy === "org") {
    // Group by Organization
    const orgGroups: UserGroup[] = organizations.map((o) => ({
      id: o.id,
      label: `${o.code} — ${o.name}`,
      sublabel: `Allocated Budget: ₱${(o.allocatedBudget || 0).toLocaleString()}`,
      color: o.logoColor,
      users: sortUsers(filtered.filter((u) => u.organizationId === o.id)),
    }));

    const unassigned = filtered.filter((u) => !u.organizationId);
    if (unassigned.length > 0) {
      orgGroups.unshift({
        id: "unassigned",
        label: "College Administration & Dean's Office",
        sublabel: "Non-organization institutional accounts",
        color: "#64748b",
        users: sortUsers(unassigned),
      });
    }

    groups = orgGroups.filter((g) => g.users.length > 0);
  } else {
    // No grouping
    groups = [
      {
        id: "all",
        label: "All User Accounts",
        users: sortUsers(filtered),
      },
    ];
  }

  function handleAdd() {
    if (!form.firstName || !form.lastName || !form.email) return;
    const newUserId = crypto.randomUUID();
    const userPayload: User = {
      ...form,
      id: newUserId,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      position: form.role === "adviser" ? "Faculty Adviser" : form.position,
    };
    addUser(userPayload);

    // If an adviser was assigned to an organization, sync the organization's adviserId
    if (form.role === "adviser" && form.organizationId) {
      updateOrganization(form.organizationId, { adviserId: newUserId });
    }

    toast.success("User Account Created", `'${form.firstName} ${form.lastName}' has been added.`);
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

    toast.success("User Updated", `Profile and roles for '${editUser.firstName} ${editUser.lastName}' were saved.`);
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

      {/* Filter, Group, & Sort Toolbar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or position..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
            />
          </div>

          {/* Group By Selector */}
          <div className="relative">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as any)}
              className="pl-8 pr-3.5 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs cursor-pointer appearance-none"
              title="Group By"
            >
              <option value="role">Role</option>
              <option value="org">Organization</option>
              <option value="none">None</option>
            </select>
            <Layers size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="pl-8 pr-3.5 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs cursor-pointer appearance-none"
              title="Filter by Role"
            >
              <option value="all">All Roles</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
          </div>

          {/* Organization Filter */}
          <div className="relative">
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="pl-8 pr-3.5 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs cursor-pointer appearance-none"
              title="Filter by Organization"
            >
              <option value="all">All Organizations</option>
              {organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.code} — {o.name}
                </option>
              ))}
            </select>
            <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="pl-8 pr-3.5 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs cursor-pointer appearance-none"
              title="Sort By"
            >
              <option value="lastName">Sort: Last Name</option>
              <option value="firstName">Sort: First Name</option>
              <option value="role">Sort: System Role</option>
              <option value="memberSince">Sort: Member Since</option>
            </select>
            <ArrowUpDown size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
          </div>

          {/* Sort Direction Toggle Button */}
          <button
            type="button"
            onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
            className="p-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition cursor-pointer shadow-2xs flex items-center justify-center flex-shrink-0"
            title={sortDir === "asc" ? "Ascending — Click for Descending" : "Descending — Click for Ascending"}
          >
            {sortDir === "asc" ? (
              <ArrowUpWideNarrow size={14} className="text-[var(--primary)]" />
            ) : (
              <ArrowDownWideNarrow size={14} className="text-[var(--primary)]" />
            )}
          </button>
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
                groups.map((grp) => (
                  <div key={grp.id} style={{ display: "contents" }}>
                    {/* Section Header Row (shown when grouping is enabled) */}
                    {groupBy !== "none" && (
                      <tr className="bg-[var(--muted)]/40 border-y border-[var(--border)]">
                        <td colSpan={6} className="px-4 py-2 text-xs font-bold text-[var(--foreground)]">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-2xs"
                                style={{ backgroundColor: grp.color || "#0d9488" }}
                              />
                              <span>{grp.label}</span>
                              {grp.sublabel && (
                                <span className="text-[11px] font-normal text-[var(--muted-foreground)] hidden md:inline">
                                  — {grp.sublabel}
                                </span>
                              )}
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]">
                              {grp.users.length} {grp.users.length === 1 ? "user" : "users"}
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}

                    {grp.users.map((u) => {
                      const org = u.organizationId ? organizations.find((o) => o.id === u.organizationId) : null;
                      const totalAdmins = users.filter((usr) => usr.role === "admin").length;
                      const isSoleAdmin = u.role === "admin" && totalAdmins <= 1;

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
                                  {u.lastName}, {u.firstName} {u.middleName ? u.middleName + " " : ""}{u.suffix || ""}
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
                                onClick={() => {
                                  const autoPass = `lcup_${u.lastName.toLowerCase().replace(/[^a-z]/g, "") || "pass"}_${Math.floor(100000 + Math.random() * 900000)}`;
                                  setNewPassword(autoPass);
                                  setCopied(false);
                                  setResetPasswordUser(u);
                                }}
                                className="text-xs h-8 gap-1.5 font-medium shadow-2xs text-amber-700 border-amber-200 hover:bg-amber-50"
                                title="Reset Account Password"
                              >
                                <KeyRound size={12} /> Reset Pass
                              </Button>
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
                                disabled={isSoleAdmin}
                                onClick={() => !isSoleAdmin && setDeleteConfirm(u)}
                                className={`text-xs h-8 gap-1.5 font-medium shadow-2xs ${isSoleAdmin ? "opacity-50 cursor-not-allowed" : ""}`}
                                title={isSoleAdmin ? "Cannot remove the sole active administrator account" : "Remove user account"}
                              >
                                <Trash2 size={12} /> Remove
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </div>
                ))
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
          title: "Edit User Account",
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

          const totalAdmins = users.filter((usr) => usr.role === "admin").length;
          const isSoleAdmin = !ctx.isNew && ctx.user.role === "admin" && totalAdmins <= 1;

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
                  <div>
                    <Select
                      label="System Role *"
                      value={ctx.user.role}
                      disabled={isSoleAdmin}
                      onChange={(e: any) => {
                        if (isSoleAdmin) return;
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
                    {isSoleAdmin && (
                      <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-1">
                        * System role is locked because at least one administrator account is required.
                      </p>
                    )}
                  </div>
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
                if (deleteConfirm) {
                  deleteUser(deleteConfirm.id);
                  toast.info("User Removed", `'${deleteConfirm.firstName} ${deleteConfirm.lastName}' was removed from the active directory.`);
                }
                setDeleteConfirm(null);
              }}
              className="gap-1.5 text-xs font-bold"
            >
              <Trash2 size={14} /> Confirm Removal
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Reset Password Dialog */}
      {resetPasswordUser && (
        <Dialog
          open={!!resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          title="Reset User Password"
          size="sm"
        >
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 p-3 bg-[var(--muted)]/40 border border-[var(--border)] rounded-xl">
              <UserAvatar
                gender={resetPasswordUser.gender}
                firstName={resetPasswordUser.firstName}
                lastName={resetPasswordUser.lastName}
                name={`${resetPasswordUser.firstName} ${resetPasswordUser.lastName}`}
                size="md"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--foreground)] truncate">
                  {resetPasswordUser.firstName} {resetPasswordUser.lastName}
                </p>
                <p className="text-xs font-mono text-[var(--muted-foreground)] truncate">
                  {resetPasswordUser.email}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--foreground)] mb-1.5">
                New Temporary Password *
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setCopied(false);
                  }}
                  placeholder="Enter new password..."
                  className="font-mono text-xs flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const randomSuffix = Math.floor(100000 + Math.random() * 900000);
                    const base = resetPasswordUser.lastName.toLowerCase().replace(/[^a-z]/g, "") || "pass";
                    setNewPassword(`lcup_${base}_${randomSuffix}`);
                    setCopied(false);
                  }}
                  className="h-9 px-2.5 text-xs gap-1 flex-shrink-0"
                  title="Generate Random Password"
                >
                  <RefreshCw size={13} /> Gen
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs">
              <span className="font-mono truncate">{newPassword || "—"}</span>
              <button
                type="button"
                onClick={() => {
                  if (newPassword) {
                    navigator.clipboard.writeText(newPassword);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="flex items-center gap-1 font-bold text-amber-800 hover:text-amber-900 ml-2 flex-shrink-0 cursor-pointer"
              >
                {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setResetPasswordUser(null)} className="gap-1.5 text-xs">
                <X size={14} /> Cancel
              </Button>
              <Button
                onClick={() => {
                  if (!newPassword.trim()) return;
                  updateUser(resetPasswordUser.id, { password: newPassword.trim() });
                  toast.success(
                    "Password Reset Successfully",
                    `Password for '${resetPasswordUser.firstName} ${resetPasswordUser.lastName}' updated.`
                  );
                  setResetPasswordUser(null);
                }}
                disabled={!newPassword.trim()}
                className="gap-1.5 text-xs font-bold"
              >
                <Save size={14} /> Save New Password
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
