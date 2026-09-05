import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { Button, Dialog, Input, Card, CardHeader, CardBody, RefreshButton, SkeletonTable } from "../../components/ui";
import { Plus, Trash2, Tag, Layers, X, Search, ArrowUpWideNarrow, ArrowDownWideNarrow, ArrowUpDown } from "lucide-react";

export default function AdminConfigurations() {
  const { eventTypes, expenditureCategories, addEventType, deleteEventType, addCategory, deleteCategory, isLoading } = useApp();
  const { toast } = useToast();
  const [showAddType, setShowAddType] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [typeDesc, setTypeDesc] = useState("");
  const [catName, setCatName] = useState("");
  const [catDesc, setCatDesc] = useState("");
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<{ id: string; name: string } | null>(null);

  // Event Types Toolbar State
  const [typeSearch, setTypeSearch] = useState("");
  const [typeSortKey, setTypeSortKey] = useState<"name" | "createdAt">("name");
  const [typeSortDir, setTypeSortDir] = useState<"asc" | "desc">("asc");

  // Expenditure Categories Toolbar State
  const [catSearch, setCatSearch] = useState("");
  const [catSortKey, setCatSortKey] = useState<"name" | "createdAt">("name");
  const [catSortDir, setCatSortDir] = useState<"asc" | "desc">("asc");

  // Filter & Sort Event Types
  const filteredTypes = eventTypes
    .filter((et) => {
      const q = typeSearch.toLowerCase();
      return et.name.toLowerCase().includes(q) || (et.description && et.description.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      let comp = 0;
      if (typeSortKey === "name") {
        comp = a.name.localeCompare(b.name);
      } else {
        // Fallback or ID comparison for order
        comp = a.id.localeCompare(b.id);
      }
      return typeSortDir === "asc" ? comp : -comp;
    });

  // Filter & Sort Expenditure Categories
  const filteredCats = expenditureCategories
    .filter((ec) => {
      const q = catSearch.toLowerCase();
      return ec.name.toLowerCase().includes(q) || (ec.description && ec.description.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      let comp = 0;
      if (catSortKey === "name") {
        comp = a.name.localeCompare(b.name);
      } else {
        comp = a.id.localeCompare(b.id);
      }
      return catSortDir === "asc" ? comp : -comp;
    });

  function handleAddType() {
    if (!typeName.trim()) return;
    addEventType({
      id: crypto.randomUUID(),
      name: typeName.trim(),
      description: typeDesc.trim(),
    });
    toast.success("Event Type Added", `'${typeName.trim()}' added to proposal classifications.`);
    setTypeName("");
    setTypeDesc("");
    setShowAddType(false);
  }

  function handleAddCat() {
    if (!catName.trim()) return;
    addCategory({
      id: crypto.randomUUID(),
      name: catName.trim(),
      description: catDesc.trim(),
    });
    toast.success("Expenditure Category Added", `'${catName.trim()}' added to financial categories.`);
    setCatName("");
    setCatDesc("");
    setShowAddCat(false);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            System Configurations
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Manage proposal event classifications and itemized financial expenditure categories.
          </p>
        </div>
        <RefreshButton />
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6 items-start">
          <SkeletonTable rows={5} cols={3} />
          <SkeletonTable rows={5} cols={3} />
        </div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-6 items-start">
        {/* ── 1. EVENT TYPES CARD ── */}
        <Card className="flex flex-col">
          <CardHeader
            title="Event Classification Types"
            subtitle={`${eventTypes.length} configured proposal event types`}
            action={
              <Button
                size="sm"
                onClick={() => {
                  setTypeName("");
                  setTypeDesc("");
                  setShowAddType(true);
                }}
                className="gap-1.5 text-xs font-bold shadow-2xs h-8"
              >
                <Plus size={14} /> Add Event Type
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {/* Search and Sort Toolbar for Event Types */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  value={typeSearch}
                  onChange={(e) => setTypeSearch(e.target.value)}
                  placeholder="Search event types..."
                  className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
                />
              </div>

              {/* Sort Selector */}
              <div className="relative">
                <select
                  value={typeSortKey}
                  onChange={(e) => setTypeSortKey(e.target.value as any)}
                  className="pl-7 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs cursor-pointer appearance-none"
                >
                  <option value="name">Sort: Name</option>
                  <option value="createdAt">Sort: Date Created</option>
                </select>
                <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
              </div>

              {/* Sort Direction Toggle Button */}
              <button
                type="button"
                onClick={() => setTypeSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="p-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition cursor-pointer shadow-2xs flex items-center justify-center flex-shrink-0"
                title={typeSortDir === "asc" ? "Ascending — Click for Descending" : "Descending — Click for Ascending"}
              >
                {typeSortDir === "asc" ? (
                  <ArrowUpWideNarrow size={14} className="text-[var(--primary)]" />
                ) : (
                  <ArrowDownWideNarrow size={14} className="text-[var(--primary)]" />
                )}
              </button>
            </div>

            <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)]">
              {filteredTypes.length === 0 ? (
                <p className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                  No matching event types found.
                </p>
              ) : (
                filteredTypes.map((et, idx) => (
                  <div
                    key={et.id}
                    className="flex items-center justify-between p-3 hover:bg-[var(--muted)]/40 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 flex items-center justify-center flex-shrink-0">
                        <Tag size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--foreground)] truncate">{et.name}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 pr-1">
                          {et.description?.trim() ? (
                            et.description
                          ) : (
                            <span className="italic opacity-70">No description provided</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTypeConfirm(et)}
                      className="text-[var(--muted-foreground)] hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Remove event type"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>

        {/* ── 2. EXPENDITURE CATEGORIES CARD ── */}
        <Card className="flex flex-col">
          <CardHeader
            title="Expenditure Categories"
            subtitle={`${expenditureCategories.length} standard budget line categories`}
            action={
              <Button
                size="sm"
                onClick={() => {
                  setCatName("");
                  setCatDesc("");
                  setShowAddCat(true);
                }}
                className="gap-1.5 text-xs font-bold shadow-2xs h-8"
              >
                <Plus size={14} /> Add Category
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {/* Search and Sort Toolbar for Categories */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[160px]">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <input
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Search expenditure categories..."
                  className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
                />
              </div>

              {/* Sort Selector */}
              <div className="relative">
                <select
                  value={catSortKey}
                  onChange={(e) => setCatSortKey(e.target.value as any)}
                  className="pl-7 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none shadow-2xs cursor-pointer appearance-none"
                >
                  <option value="name">Sort: Name</option>
                  <option value="createdAt">Sort: Date Created</option>
                </select>
                <ArrowUpDown size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
              </div>

              {/* Sort Direction Toggle Button */}
              <button
                type="button"
                onClick={() => setCatSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                className="p-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 transition cursor-pointer shadow-2xs flex items-center justify-center flex-shrink-0"
                title={catSortDir === "asc" ? "Ascending — Click for Descending" : "Descending — Click for Ascending"}
              >
                {catSortDir === "asc" ? (
                  <ArrowUpWideNarrow size={14} className="text-[var(--primary)]" />
                ) : (
                  <ArrowDownWideNarrow size={14} className="text-[var(--primary)]" />
                )}
              </button>
            </div>

            <div className="divide-y divide-[var(--border)] border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--card)]">
              {filteredCats.length === 0 ? (
                <p className="p-8 text-center text-xs text-[var(--muted-foreground)]">
                  No matching expenditure categories found.
                </p>
              ) : (
                filteredCats.map((cat, idx) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 hover:bg-[var(--muted)]/40 transition group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-800 border border-sky-200 flex items-center justify-center flex-shrink-0">
                        <Layers size={13} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--foreground)] truncate">{cat.name}</p>
                        <p className="text-[11px] text-[var(--muted-foreground)] line-clamp-1 pr-1">
                          {cat.description?.trim() ? (
                            cat.description
                          ) : (
                            <span className="italic opacity-70">No description provided</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteCatConfirm(cat)}
                      className="text-[var(--muted-foreground)] hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title="Remove category"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </CardBody>
        </Card>
      </div>
        </>
      )}

      {/* Add Event Type Dialog */}
      <Dialog open={showAddType} onClose={() => setShowAddType(false)} title="Add Event Classification Type" size="md">
        <div className="p-6 flex flex-col gap-4">
          <Input
            label="Event Type Title *"
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            placeholder="e.g., Hackathon, Academic Seminar"
          />
          <Input
            label="Description"
            value={typeDesc}
            onChange={(e) => setTypeDesc(e.target.value)}
            placeholder="Brief scope or purpose of this classification..."
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowAddType(false)} className="gap-1.5 text-xs">
              <X size={14} /> Cancel
            </Button>
            <Button onClick={handleAddType} disabled={!typeName.trim()} className="gap-1.5 text-xs font-bold">
              <Plus size={14} /> Add Event Type
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={showAddCat} onClose={() => setShowAddCat(false)} title="Add Expenditure Category" size="md">
        <div className="p-6 flex flex-col gap-4">
          <Input
            label="Expenditure Category Title *"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="e.g., Transportation, Venue Rental"
          />
          <Input
            label="Description"
            value={catDesc}
            onChange={(e) => setCatDesc(e.target.value)}
            placeholder="Itemized expenses covered under this category..."
          />
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowAddCat(false)} className="gap-1.5 text-xs">
              <X size={14} /> Cancel
            </Button>
            <Button onClick={handleAddCat} disabled={!catName.trim()} className="gap-1.5 text-xs font-bold">
              <Plus size={14} /> Add Category
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Event Type Confirmation */}
      <Dialog open={!!deleteTypeConfirm} onClose={() => setDeleteTypeConfirm(null)} title="Remove Event Type?" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm">
            Are you sure you want to remove <strong>{deleteTypeConfirm?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setDeleteTypeConfirm(null)} className="gap-1.5 text-xs">
              <X size={14} /> Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteTypeConfirm) {
                  deleteEventType(deleteTypeConfirm.id);
                  toast.info("Event Type Removed", `'${deleteTypeConfirm.name}' removed from classifications.`);
                }
                setDeleteTypeConfirm(null);
              }}
              className="gap-1.5 text-xs font-bold"
            >
              <Trash2 size={14} /> Confirm Removal
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Delete Category Confirmation */}
      <Dialog open={!!deleteCatConfirm} onClose={() => setDeleteCatConfirm(null)} title="Remove Expenditure Category?" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm">
            Are you sure you want to remove <strong>{deleteCatConfirm?.name}</strong>?
          </p>
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setDeleteCatConfirm(null)} className="gap-1.5 text-xs">
              <X size={14} /> Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (deleteCatConfirm) {
                  deleteCategory(deleteCatConfirm.id);
                  toast.info("Category Removed", `'${deleteCatConfirm.name}' removed from expenditure categories.`);
                }
                setDeleteCatConfirm(null);
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
