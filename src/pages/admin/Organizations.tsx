import { useState, useRef } from "react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { Button, Dialog, Input, Select, Card, RefreshButton, SkeletonEventCard, SkeletonToolbox } from "../../components/ui";
import { Plus, Pencil, Trash2, Building2, UserCheck, Wallet, Users, Search, Save, X, ArrowUpWideNarrow, ArrowDownWideNarrow, ArrowUpDown, Upload, Loader2 } from "lucide-react";
import { Organization, formatCurrency } from "../../services/dataService";
import { uploadOrgLogo } from "../../services/storageService";

export default function AdminOrganizations() {
  const { organizations, departments, users, addOrganization, updateOrganization, deleteOrganization, updateUser, isLoading } = useApp();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"name" | "code" | "budget">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [showAdd, setShowAdd] = useState(false);
  const [editOrg, setEditOrg] = useState<Organization | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Organization | null>(null);

  const addLogoInputRef = useRef<HTMLInputElement>(null);
  const editLogoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAddLogo, setIsUploadingAddLogo] = useState(false);
  const [isUploadingEditLogo, setIsUploadingEditLogo] = useState(false);

  const activeDepartments = departments.filter((d) => !d.deleted);
  
  // Advisers not assigned to any organization yet (for Add Organization)
  const unassignedAdvisers = users.filter(
    (u) =>
      u.role === "adviser" &&
      !u.deleted &&
      !u.organizationId &&
      !organizations.some((o) => o.adviserId === u.id && !o.deleted)
  );

  // Advisers available for editing an existing organization (unassigned + current org's adviser)
  const availableAdvisersForEdit = users.filter(
    (u) =>
      u.role === "adviser" &&
      !u.deleted &&
      (!u.organizationId || u.organizationId === editOrg?.id || editOrg?.adviserId === u.id) &&
      !organizations.some((o) => o.adviserId === u.id && o.id !== editOrg?.id && !o.deleted)
  );

  const [form, setForm] = useState({
    name: "",
    code: "",
    departmentId: activeDepartments[0]?.id ?? "",
    adviserId: "",
    allocatedBudget: "50000",
    logoColor: "#ea580c",
    logoUrl: "",
    description: "",
  });

  async function handleAddLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File Type", "Please upload an image file (PNG, JPG, SVG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", "Maximum logo image size is 5MB.");
      return;
    }

    setIsUploadingAddLogo(true);
    const localUrl = URL.createObjectURL(file);
    setForm((p) => ({ ...p, logoUrl: localUrl }));

    const ext = file.name.split(".").pop() || "png";
    const fileName = `logo_${Date.now()}.${ext}`;
    const uploadRes = await uploadOrgLogo({
      organizationName: form.name || form.code || "new_org",
      file,
      fileName,
    });

    setIsUploadingAddLogo(false);

    if (uploadRes.error) {
      toast.error("Upload Warning", "Storage upload had an issue; preview is temporarily kept.");
    } else {
      const finalUrl = uploadRes.publicUrl || localUrl;
      setForm((p) => ({ ...p, logoUrl: finalUrl }));
      toast.success("Logo Uploaded", "Organization logo uploaded to media storage.");
    }
  }

  function handleRemoveAddLogo() {
    setForm((p) => ({ ...p, logoUrl: "" }));
    if (addLogoInputRef.current) addLogoInputRef.current.value = "";
  }

  async function handleEditLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !editOrg) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Invalid File Type", "Please upload an image file (PNG, JPG, SVG, WEBP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", "Maximum logo image size is 5MB.");
      return;
    }

    setIsUploadingEditLogo(true);
    const localUrl = URL.createObjectURL(file);
    setEditOrg((p) => p && { ...p, logoUrl: localUrl, avatar: localUrl });

    const ext = file.name.split(".").pop() || "png";
    const fileName = `logo_${Date.now()}.${ext}`;
    const uploadRes = await uploadOrgLogo({
      organizationId: editOrg.id,
      organizationName: editOrg.name,
      file,
      fileName,
    });

    setIsUploadingEditLogo(false);

    if (uploadRes.error) {
      toast.error("Upload Warning", "Storage upload had an issue; preview is temporarily kept.");
    } else {
      const finalUrl = uploadRes.publicUrl || localUrl;
      setEditOrg((p) => p && { ...p, logoUrl: finalUrl, avatar: finalUrl });
      toast.success("Logo Uploaded", "Organization logo updated in media storage.");
    }
  }

  function handleRemoveEditLogo() {
    setEditOrg((p) => p && { ...p, logoUrl: "", avatar: "" });
    if (editLogoInputRef.current) editLogoInputRef.current.value = "";
  }

  const filteredOrgs = organizations
    .filter((o) => {
      if (deptFilter !== "all" && o.departmentId !== deptFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        o.name.toLowerCase().includes(q) ||
        o.code.toLowerCase().includes(q) ||
        (o.description && o.description.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let comp = 0;
      if (sortKey === "name") {
        comp = a.name.localeCompare(b.name);
      } else if (sortKey === "code") {
        comp = a.code.localeCompare(b.code);
      } else if (sortKey === "budget") {
        comp = (a.allocatedBudget || 0) - (b.allocatedBudget || 0);
      }
      return sortDir === "asc" ? comp : -comp;
    });

  function handleAdd() {
    if (!form.name || !form.code) return;
    const newOrgId = crypto.randomUUID();
    addOrganization({
      id: newOrgId,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      departmentId: form.departmentId,
      adviserId: form.adviserId,
      allocatedBudget: parseFloat(form.allocatedBudget) || 0,
      logoColor: form.logoColor,
      logoUrl: form.logoUrl || undefined,
      avatar: form.logoUrl || undefined,
      description: form.description.trim(),
    });

    // If an adviser was assigned, sync their organizationId
    if (form.adviserId) {
      updateUser(form.adviserId, { organizationId: newOrgId });
    }

    toast.success("Organization Created", `'${form.name.trim()}' established with code '${form.code.trim().toUpperCase()}'.`);

    setForm({
      name: "",
      code: "",
      departmentId: activeDepartments[0]?.id ?? "",
      adviserId: "",
      allocatedBudget: "50000",
      logoColor: "#ea580c",
      logoUrl: "",
      description: "",
    });
    if (addLogoInputRef.current) addLogoInputRef.current.value = "";
    setShowAdd(false);
  }

  function handleEdit() {
    if (!editOrg || !editOrg.name || !editOrg.code) return;
    const oldOrg = organizations.find((o) => o.id === editOrg.id);
    updateOrganization(editOrg.id, editOrg);

    // Sync adviser's organization assignment
    if (oldOrg?.adviserId && oldOrg.adviserId !== editOrg.adviserId) {
      updateUser(oldOrg.adviserId, { organizationId: undefined });
    }
    if (editOrg.adviserId) {
      updateUser(editOrg.adviserId, { organizationId: editOrg.id });
    }

    toast.success("Organization Updated", `'${editOrg.name}' profile & budget updated.`);
    setEditOrg(null);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            Student Organizations
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Manage recognized student bodies, annual budget allocations, and appointed faculty advisers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowAdd(true)} className="gap-1.5 shadow-2xs">
            <Plus size={15} /> Add Organization
          </Button>
          <RefreshButton />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <SkeletonToolbox />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonEventCard key={i} />
            ))}
          </div>
        </div>
      ) : (
        <>

      {/* Filter & Sort Toolbar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search organizations by name or acronym..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
            />
          </div>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3.5 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs cursor-pointer"
          >
            <option value="all">All Departments</option>
            {activeDepartments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name}
              </option>
            ))}
          </select>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="pl-8 pr-3.5 py-2 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs cursor-pointer appearance-none"
            >
              <option value="name">Sort: Full Name</option>
              <option value="code">Sort: Acronym / Code</option>
              <option value="budget">Sort: Allocated Budget</option>
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

      {/* Organizations Grid Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredOrgs.map((org) => {
          const dept = departments.find((d) => d.id === org.departmentId);
          const adviser = users.find((u) => u.id === org.adviserId);
          const members = users.filter((u) => u.organizationId === org.id && u.role === "student");

          return (
            <div
              key={org.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md transition flex flex-col justify-between shadow-2xs space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {org.logoUrl ? (
                      <img
                        src={org.logoUrl}
                        alt={org.name}
                        className="w-11 h-11 rounded-xl object-contain bg-white dark:bg-zinc-800 p-1 flex-shrink-0 border border-[var(--border)] shadow-xs mt-0.5"
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-extrabold text-sm flex-shrink-0 shadow-xs font-mono mt-0.5"
                        style={{ backgroundColor: org.logoColor || "#ea580c" }}
                      >
                        {org.code.slice(0, 3)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[var(--foreground)] text-sm sm:text-base leading-snug break-words">
                        {org.name}
                      </h3>
                      <p className="text-xs font-mono text-[var(--muted-foreground)] mt-1">
                        {org.code} · {dept?.code || "CITE"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs pt-3 border-t border-[var(--border)]">
                  <div className="flex justify-between items-center bg-[var(--muted)]/30 px-3 py-2 rounded-xl">
                    <span className="text-[var(--muted-foreground)] font-mono flex items-center gap-1.5">
                      <Wallet size={13} className="text-orange-600" /> Allocated Budget
                    </span>
                    <span className="font-bold font-mono text-[var(--primary)]">{formatCurrency(org.allocatedBudget)}</span>
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <span className="text-[var(--muted-foreground)] flex items-center gap-1.5">
                      <UserCheck size={13} className="text-sky-600" /> Faculty Adviser
                    </span>
                    <span className="font-medium text-[var(--foreground)] truncate max-w-[160px]">
                      {adviser ? `${adviser.firstName} ${adviser.lastName}` : <span className="text-amber-600 text-[11px] font-bold">Unassigned</span>}
                    </span>
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <span className="text-[var(--muted-foreground)] flex items-center gap-1.5">
                      <Users size={13} className="text-purple-600" /> Enrolled Officers
                    </span>
                    <span className="font-bold text-[var(--foreground)]">{members.length} student(s)</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-8 gap-1.5 font-semibold shadow-2xs"
                  onClick={() => setEditOrg({ ...org })}
                >
                  <Pencil size={12} /> Edit Configuration
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  className="text-xs h-8 px-2.5 font-semibold shadow-2xs"
                  onClick={() => setDeleteConfirm(org)}
                  title="Delete Organization"
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
        </>
      )}

      {/* Add Organization Dialog */}
      <Dialog open={showAdd} onClose={() => setShowAdd(false)} title="Add Organization" size="lg">
        <div className="p-6 flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <Input
                label="Organization Full Name *"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., Information Technology Student Guild"
              />
            </div>
            <div className="sm:col-span-4">
              <Input
                label="Acronym / Code *"
                value={form.code}
                onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                placeholder="e.g., ITSG"
              />
            </div>
            <div className="sm:col-span-6">
              <Select
                label="Academic Department"
                value={form.departmentId}
                onChange={(e) => setForm((p) => ({ ...p, departmentId: e.target.value }))}
                options={activeDepartments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }))}
              />
            </div>
            <div className="sm:col-span-6">
              <Select
                label="Appointed Faculty Adviser"
                value={form.adviserId}
                onChange={(e) => setForm((p) => ({ ...p, adviserId: e.target.value }))}
                options={[
                  {
                    value: "",
                    label:
                      unassignedAdvisers.length === 0
                        ? "— No unassigned faculty advisers available —"
                        : "— Unassigned / Select Adviser —",
                  },
                  ...unassignedAdvisers.map((a) => ({
                    value: a.id,
                    label: `${a.firstName} ${a.lastName}${a.suffix ? ", " + a.suffix : ""} (${a.email})`,
                  })),
                ]}
              />
            </div>
            <div className="sm:col-span-12">
              <Input
                label="Organization Description"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="Brief description of organization mission and objectives..."
              />
            </div>
            <div className="sm:col-span-12">
              <Input
                label="Allocated Budget (₱)"
                type="number"
                value={form.allocatedBudget}
                onChange={(e) => setForm((p) => ({ ...p, allocatedBudget: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-12">
              <label className="block text-xs font-mono font-semibold text-[var(--foreground)] mb-2">
                Organization Logo
              </label>
              <div className="flex items-center gap-4 p-4 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl flex-wrap">
                <div className="w-16 h-16 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xs flex items-center justify-center overflow-hidden flex-shrink-0">
                  {form.logoUrl ? (
                    <img src={form.logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building2 className="text-[var(--muted-foreground)]" size={28} />
                  )}
                </div>

                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="file"
                      ref={addLogoInputRef}
                      className="hidden"
                      accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                      onChange={handleAddLogoChange}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 gap-1.5 font-semibold"
                      onClick={() => addLogoInputRef.current?.click()}
                      disabled={isUploadingAddLogo}
                    >
                      {isUploadingAddLogo ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={13} /> {form.logoUrl ? "Change Logo" : "Upload Logo"}
                        </>
                      )}
                    </Button>
                    {form.logoUrl && !isUploadingAddLogo && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1"
                        onClick={handleRemoveAddLogo}
                      >
                        <X size={13} /> Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--muted-foreground)]">
                    Upload organization logo image (.png, .jpg, .svg).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 pb-6 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowAdd(false)} className="gap-1.5 text-xs">
              <X size={14} /> Cancel
            </Button>
            <Button onClick={handleAdd} disabled={!form.name.trim() || !form.code.trim()} className="gap-1.5 text-xs font-bold">
              <Plus size={14} /> Add Organization
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Organization Dialog (with Adviser Modifier) */}
      {editOrg && (
        <Dialog open={!!editOrg} onClose={() => setEditOrg(null)} title="Edit Organization" size="lg">
          <div className="p-6 flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-8">
                <Input
                  label="Organization Full Name *"
                  value={editOrg.name}
                  onChange={(e) => setEditOrg((p) => p && { ...p, name: e.target.value })}
                />
              </div>
              <div className="sm:col-span-4">
                <Input
                  label="Acronym / Code *"
                  value={editOrg.code}
                  onChange={(e) => setEditOrg((p) => p && { ...p, code: e.target.value })}
                />
              </div>
              <div className="sm:col-span-6">
                <Select
                  label="Academic Department"
                  value={editOrg.departmentId}
                  onChange={(e) => setEditOrg((p) => p && { ...p, departmentId: e.target.value })}
                  options={activeDepartments.map((d) => ({ value: d.id, label: `${d.code} — ${d.name}` }))}
                />
              </div>
              <div className="sm:col-span-6">
                <Select
                  label="Faculty Adviser (Appointed / Modified)"
                  value={editOrg.adviserId || ""}
                  onChange={(e) => setEditOrg((p) => p && { ...p, adviserId: e.target.value })}
                  options={[
                    { value: "", label: "— Unassigned / Select Adviser —" },
                    ...availableAdvisersForEdit.map((a) => {
                      const isCurrent = a.id === editOrg.adviserId;
                      return {
                        value: a.id,
                        label: `${a.firstName} ${a.lastName}${a.suffix ? ", " + a.suffix : ""} (${a.email})${
                          isCurrent ? " — (Currently Appointed)" : ""
                        }`,
                      };
                    }),
                  ]}
                />
              </div>
              <div className="sm:col-span-12">
                <Input
                  label="Organization Description"
                  value={editOrg.description || ""}
                  onChange={(e) => setEditOrg((p) => p && { ...p, description: e.target.value })}
                  placeholder="Brief description..."
                />
              </div>
              <div className="sm:col-span-12">
                <Input
                  label="Allocated Budget (₱)"
                  type="number"
                  value={editOrg.allocatedBudget}
                  onChange={(e) => setEditOrg((p) => p && { ...p, allocatedBudget: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="sm:col-span-12">
                <label className="block text-xs font-mono font-semibold text-[var(--foreground)] mb-2">
                  Organization Logo
                </label>
                <div className="flex items-center gap-4 p-4 bg-[var(--muted)]/20 border border-[var(--border)] rounded-xl flex-wrap">
                  <div className="w-16 h-16 rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xs flex items-center justify-center overflow-hidden flex-shrink-0">
                    {editOrg.logoUrl ? (
                      <img src={editOrg.logoUrl} alt="Logo preview" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 className="text-[var(--muted-foreground)]" size={28} />
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="file"
                        ref={editLogoInputRef}
                        className="hidden"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        onChange={handleEditLogoChange}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs h-8 gap-1.5 font-semibold"
                        onClick={() => editLogoInputRef.current?.click()}
                        disabled={isUploadingEditLogo}
                      >
                        {isUploadingEditLogo ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> Uploading...
                          </>
                        ) : (
                          <>
                            <Upload size={13} /> {editOrg.logoUrl ? "Change Logo" : "Upload Logo"}
                          </>
                        )}
                      </Button>
                      {editOrg.logoUrl && !isUploadingEditLogo && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs h-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1"
                          onClick={handleRemoveEditLogo}
                        >
                          <X size={13} /> Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      Upload organization logo image (.png, .jpg, .svg).
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setEditOrg(null)} className="gap-1.5 text-xs">
                <X size={14} /> Cancel
              </Button>
              <Button onClick={handleEdit} disabled={!editOrg.name.trim() || !editOrg.code.trim()} className="gap-1.5 text-xs font-bold">
                <Save size={14} /> Save Changes
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Organization?" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm">
            Are you sure you want to delete <strong>{deleteConfirm?.name}</strong>? All associated events, transactions, and officer assignments will be detached.
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="gap-1.5 text-xs">
              <X size={14} /> Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteConfirm) {
                  deleteOrganization(deleteConfirm.id);
                  toast.info("Organization Removed", `'${deleteConfirm.name}' was removed from the active roster.`);
                }
                setDeleteConfirm(null);
              }}
              className="gap-1.5 text-xs font-bold"
            >
              <Trash2 size={14} /> Delete Organization
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
