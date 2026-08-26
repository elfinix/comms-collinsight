import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Dialog, Input, Card, CardHeader, CardBody } from "../../components/ui";
import { Plus, Trash2, Tag } from "lucide-react";

export default function AdminConfigurations() {
  const { eventTypes, expenditureCategories, addEventType, deleteEventType, addCategory, deleteCategory } = useApp();
  const [showAddType, setShowAddType] = useState(false);
  const [showAddCat, setShowAddCat] = useState(false);
  const [typeName, setTypeName] = useState("");
  const [catName, setCatName] = useState("");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Configurations</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage event types and expenditure categories.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Event Types */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold">Event Types</h2>
            <Button size="sm" onClick={() => { setTypeName(""); setShowAddType(true); }}><Plus size={14} /></Button>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {eventTypes.map((et) => (
              <div key={et.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--muted)] hover:bg-teal-50 transition group">
                <div className="flex items-center gap-2">
                  <Tag size={13} className="text-[var(--primary)]" />
                  <span className="text-sm font-medium">{et.name}</span>
                </div>
                <button onClick={() => deleteEventType(et.id)} className="text-[var(--muted-foreground)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 rounded">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {eventTypes.length === 0 && <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No event types configured.</p>}
          </CardBody>
        </Card>

        {/* Expenditure Categories */}
        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="font-semibold">Expenditure Categories</h2>
            <Button size="sm" onClick={() => { setCatName(""); setShowAddCat(true); }}><Plus size={14} /></Button>
          </CardHeader>
          <CardBody className="flex flex-col gap-2">
            {expenditureCategories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-[var(--muted)] hover:bg-teal-50 transition group">
                <div className="flex items-center gap-2">
                  <Tag size={13} className="text-[var(--primary)]" />
                  <span className="text-sm font-medium">{cat.name}</span>
                </div>
                <button onClick={() => deleteCategory(cat.id)} className="text-[var(--muted-foreground)] hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-1 rounded">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {expenditureCategories.length === 0 && <p className="text-sm text-[var(--muted-foreground)] text-center py-4">No categories configured.</p>}
          </CardBody>
        </Card>
      </div>

      <Dialog open={showAddType} onClose={() => setShowAddType(false)} title="Add Event Type" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <Input label="Event Type Name" value={typeName} onChange={(e) => setTypeName(e.target.value)} placeholder="e.g., Sports Fest" />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowAddType(false)}>Cancel</Button>
            <Button onClick={() => { addEventType({ id: `et-${Date.now()}`, name: typeName }); setShowAddType(false); }} disabled={!typeName}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showAddCat} onClose={() => setShowAddCat(false)} title="Add Expenditure Category" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <Input label="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="e.g., Transportation" />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowAddCat(false)}>Cancel</Button>
            <Button onClick={() => { addCategory({ id: `ec-${Date.now()}`, name: catName }); setShowAddCat(false); }} disabled={!catName}>
              <Plus size={14} /> Add
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
