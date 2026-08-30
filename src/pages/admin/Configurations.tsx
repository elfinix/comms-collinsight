import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { Button, Dialog, Input, Card, CardHeader, CardBody } from "../../components/ui";
import { Plus, Trash2, Tag, Layers, Sliders, Save, X, Search } from "lucide-react";

export default function AdminConfigurations() {
  const { eventTypes, expenditureCategories, addEventType, deleteEventType, addCategory, deleteCategory } = useApp();
  const { toast } = useToast();
  const [showAddType, setShowAddType] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [catName, setCatName] = useState("");
  const [deleteTypeConfirm, setDeleteTypeConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteCatConfirm, setDeleteCatConfirm] = useState<{ id: string; name: string } | null>(null);

  const [typeSearch, setTypeSearch] = useState("");
  const [catSearch, setCatSearch] = useState("");

  const filteredTypes = eventTypes.filter((et) =>
    et.name.toLowerCase().includes(typeSearch.toLowerCase())
  );

  const filteredCats = expenditureCategories.filter((ec) =>
    ec.name.toLowerCase().includes(catSearch.toLowerCase())
  );

  function handleAddType() {
    if (!typeName.trim()) return;
    addEventType({
      id: `et-${Date.now()}`,
      name: typeName.trim(),
    });
    toast.success("Event Type Added", `'${typeName.trim()}' added to proposal classifications.`);
    setTypeName("");
    setShowAddType(false);
  }

  function handleAddCat() {
    if (!catName.trim()) return;
    addCategory({
      id: `ec-${Date.now()}`,
      name: catName.trim(),
    });
    toast.success("Expenditure Category Added", `'${catName.trim()}' added to financial categories.`);
    setCatName("");
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
      </div>

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
                  setShowAddType(true);
                }}
                className="gap-1.5 text-xs font-bold shadow-2xs h-8"
              >
                <Plus size={14} /> Add Event Type
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {/* Search filter for Event Types */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                value={typeSearch}
                onChange={(e) => setTypeSearch(e.target.value)}
                placeholder="Search event types..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
              />
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
                        <p className="text-[10px] font-mono text-[var(--muted-foreground)]">#{idx + 1} · {et.id}</p>
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
                  setShowAddCat(true);
                }}
                className="gap-1.5 text-xs font-bold shadow-2xs h-8"
              >
                <Plus size={14} /> Add Category
              </Button>
            }
          />
          <CardBody className="space-y-3">
            {/* Search filter for Categories */}
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
              <input
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                placeholder="Search expenditure categories..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] shadow-2xs"
              />
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
                        <p className="text-[10px] font-mono text-[var(--muted-foreground)]">#{idx + 1} · {cat.id}</p>
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

      {/* Add Event Type Dialog */}
      <Dialog open={showAddType} onClose={() => setShowAddType(false)} title="Add Event Classification Type" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <Input
            label="Event Type Title *"
            value={typeName}
            onChange={(e) => setTypeName(e.target.value)}
            placeholder="e.g., Hackathon, Academic Seminar"
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
      <Dialog open={showAddCat} onClose={() => setShowAddCat(false)} title="Add Expenditure Category" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <Input
            label="Expenditure Category Title *"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="e.g., Transportation, Venue Rental"
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
