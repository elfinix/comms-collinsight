import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { Button, Dialog, Input, Textarea, Select, Badge, Tabs, Card, CardHeader, CardBody, SignatoryProgress, EmptyState } from "../../components/ui";
import {
  Plus, Search, Grid, List, Filter, Trash2, Eye, Edit2, Send, AlertCircle, CheckCircle, UploadCloud,
} from "lucide-react";
import {
  getEventTypeById, formatCurrency, formatDate, formatDateTime, statusColors, eventTypes, expenditureCategories,
  Event, EventStatus,
} from "../../services/mockData";

const MODES = [
  { value: "FTF", label: "FTF (Face-to-Face)" },
  { value: "Online/Virtual", label: "Online/Virtual" },
];

const STATUS_FILTERS = ["All", "Created", "For Review", "For Approval", "Pending Revision", "Approved", "Completed", "Closed"];

function newEventShell(createdBy: string, orgId: string): Omit<Event, "id"> {
  return {
    organizationId: orgId,
    name: "",
    typeId: eventTypes[0].id,
    description: "",
    proposedBudget: 0,
    requisites: "",
    dateStart: "",
    dateEnd: "",
    mode: "FTF",
    location: "",
    apfUrl: "",
    appendices: [],
    clearanceDetails: "",
    remarks: [],
    status: "Created",
    createdAt: new Date().toISOString(),
    createdBy,
  };
}

export default function StudentEvents() {
  const { currentUser } = useAuth();
  const { events, addEvent, updateEvent, deleteEvent, organizations, setEventStatus, addAuditEntry } = useApp();

  const orgId = currentUser?.organizationId ?? "";
  const org = organizations.find((o) => o.id === orgId);
  const orgEvents = events.filter((e) => e.organizationId === orgId);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortKey, setSortKey] = useState("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [showCreate, setShowCreate] = useState(false);
  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Event | null>(null);
  const [submitConfirm, setSubmitConfirm] = useState<Event | null>(null);

  const [createTab, setCreateTab] = useState("details");
  const [viewTab, setViewTab] = useState("details");
  const [draft, setDraft] = useState<Omit<Event, "id">>(newEventShell(currentUser?.id ?? "", orgId));

  const filtered = orgEvents
    .filter((e) => {
      if (statusFilter !== "All" && e.status !== statusFilter) return false;
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      let va: any = a[sortKey as keyof Event] ?? "";
      let vb: any = b[sortKey as keyof Event] ?? "";
      if (typeof va === "string") va = va.toLowerCase();
      if (typeof vb === "string") vb = vb.toLowerCase();
      return sortDir === "asc" ? (va > vb ? 1 : -1) : va < vb ? 1 : -1;
    });

  function handleCreate() {
    setDraft(newEventShell(currentUser?.id ?? "", orgId));
    setCreateTab("details");
    setShowCreate(true);
  }

  function handleSaveDraft() {
    if (!draft.name) return;
    const id = `evt-${Date.now()}`;
    addEvent({ ...draft, id });
    addAuditEntry({ id: `aud-${Date.now()}`, userId: currentUser?.id ?? "", action: "Created Event", details: `Created event '${draft.name}'`, timestamp: new Date().toISOString() });
    setShowCreate(false);
  }

  function handleSaveEdit() {
    if (!editEvent) return;
    updateEvent(editEvent.id, { ...editEvent });
    addAuditEntry({ id: `aud-${Date.now()}`, userId: currentUser?.id ?? "", action: "Updated Event", details: `Updated event '${editEvent.name}'`, timestamp: new Date().toISOString() });
    setEditEvent(null);
  }

  function handleSubmitToAdviser(evt: Event) {
    setEventStatus(evt.id, "For Review");
    addAuditEntry({ id: `aud-${Date.now()}`, userId: currentUser?.id ?? "", action: "Submitted Event", details: `Submitted '${evt.name}' to Adviser`, timestamp: new Date().toISOString() });
    setSubmitConfirm(null);
  }

  function handleDelete(evt: Event) {
    deleteEvent(evt.id);
    setDeleteConfirm(null);
  }

  const canEdit = (e: Event) => e.status === "Created" || e.status === "Pending Revision";
  const canDelete = (e: Event) => e.status === "Created";
  const canSubmit = (e: Event) => e.status === "Created" || e.status === "Pending Revision";

  const eventTabsDef = [
    { id: "details", label: "Event Details" },
    { id: "compliance", label: "Event Compliance" },
    { id: "clearance", label: "Event Clearance" },
  ];

  const viewTabsDef = [
    { id: "details", label: "Event Details" },
    { id: "compliance", label: "Event Compliance" },
    { id: "clearance", label: "Event Clearance" },
    { id: "finance", label: "Finance" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Events</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage and track your organization's events.</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus size={16} /> Add Event
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
          {STATUS_FILTERS.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value)} className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
          <option value="createdAt">Sort: Date Created</option>
          <option value="name">Sort: Name</option>
          <option value="proposedBudget">Sort: Budget</option>
          <option value="dateStart">Sort: Event Date</option>
        </select>
        <button onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))} className="px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white hover:bg-[var(--muted)] transition font-mono">
          {sortDir === "asc" ? "↑ Asc" : "↓ Desc"}
        </button>
        <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
          <button onClick={() => setView("grid")} className={`px-3 py-2 transition ${view === "grid" ? "bg-[var(--primary)] text-white" : "bg-white text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}><Grid size={14} /></button>
          <button onClick={() => setView("list")} className={`px-3 py-2 transition ${view === "list" ? "bg-[var(--primary)] text-white" : "bg-white text-[var(--muted-foreground)] hover:bg-[var(--muted)]"}`}><List size={14} /></button>
        </div>
      </div>

      {/* Events Grid / List */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Plus size={40} />} title="No events yet" description="Create your first event proposal to get started." action={<Button onClick={handleCreate}><Plus size={14} /> Add Event</Button>} />
      ) : view === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <div key={e.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md transition flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                <span className="text-xs text-[var(--muted-foreground)] font-mono">{e.mode}</span>
              </div>
              <h3 className="font-semibold text-[var(--foreground)] leading-snug">{e.name}</h3>
              <p className="text-xs text-[var(--muted-foreground)]">{formatDate(e.dateStart)} · {e.location}</p>
              <p className="text-xs font-mono text-[var(--primary)] font-semibold">{formatCurrency(e.proposedBudget)}</p>
              {e.status === "Pending Revision" && e.adviserFeedback && (
                <div className="flex gap-2 bg-orange-50 border border-orange-200 rounded-lg p-2 text-xs text-orange-700">
                  <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                  <span>{e.adviserFeedback}</span>
                </div>
              )}
              <div className="flex gap-2 flex-wrap mt-auto pt-2 border-t border-[var(--border)]">
                {canSubmit(e) && (
                  <Button size="sm" onClick={() => setSubmitConfirm(e)} className="text-[10px] px-2 py-1">
                    <Send size={12} /> Submit
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => { setViewEvent(e); setViewTab("details"); }}>
                  <Eye size={12} />
                </Button>
                {canEdit(e) && (
                  <Button size="sm" variant="outline" onClick={() => setEditEvent({ ...e })}>
                    <Edit2 size={12} />
                  </Button>
                )}
                {canDelete(e) && (
                  <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(e)}>
                    <Trash2 size={12} />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {["Event Name", "Type", "Date", "Budget", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition">
                    <td className="px-4 py-3 font-medium max-w-[200px] truncate">{e.name}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{getEventTypeById(e.typeId)?.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatDate(e.dateStart)}</td>
                    <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                    <td className="px-4 py-3"><span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {canSubmit(e) && <Button size="sm" onClick={() => setSubmitConfirm(e)} className="text-[10px] px-2 py-1"><Send size={10} /></Button>}
                        <Button size="sm" variant="outline" onClick={() => { setViewEvent(e); setViewTab("details"); }}><Eye size={12} /></Button>
                        {canEdit(e) && <Button size="sm" variant="outline" onClick={() => setEditEvent({ ...e })}><Edit2 size={12} /></Button>}
                        {canDelete(e) && <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(e)}><Trash2 size={12} /></Button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Create Event Dialog */}
      <Dialog open={showCreate} onClose={() => setShowCreate(false)} title="Create New Event" size="xl">
        <div className="flex flex-col">
          <Tabs tabs={eventTabsDef} activeTab={createTab} onChange={setCreateTab} className="px-6" />
          <div className="p-6">
            {createTab === "details" && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input label="Event Name *" value={draft.name} onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))} placeholder="e.g., TechFest 2025" />
                </div>
                <Select label="Event Type *" value={draft.typeId} onChange={(e) => setDraft((d) => ({ ...d, typeId: e.target.value }))}
                  options={eventTypes.map((t) => ({ value: t.id, label: t.name }))} />
                <Input label="Proposed Budget (₱) *" type="number" value={draft.proposedBudget} onChange={(e) => setDraft((d) => ({ ...d, proposedBudget: parseFloat(e.target.value) || 0 }))}
                  placeholder="0.00" />
                {draft.proposedBudget > (org?.allocatedBudget ?? 0) && (
                  <div className="sm:col-span-2 flex gap-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg border border-red-200">
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    Proposed budget exceeds allocated budget of {formatCurrency(org?.allocatedBudget ?? 0)}.
                  </div>
                )}
                <div className="sm:col-span-2">
                  <Textarea label="Description *" rows={3} value={draft.description} onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))} placeholder="Brief description of the event..." />
                </div>
                <div className="sm:col-span-2">
                  <Textarea label="Requisites" rows={2} value={draft.requisites} onChange={(e) => setDraft((d) => ({ ...d, requisites: e.target.value }))} placeholder="Equipment, rooms, materials needed..." />
                </div>
                <Input label="Date & Time Start *" type="datetime-local" value={draft.dateStart} onChange={(e) => setDraft((d) => ({ ...d, dateStart: e.target.value }))} />
                <Input label="Date & Time End *" type="datetime-local" value={draft.dateEnd} onChange={(e) => setDraft((d) => ({ ...d, dateEnd: e.target.value }))} />
                <Select label="Mode *" value={draft.mode} onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value as "FTF" | "Online/Virtual" }))}
                  options={MODES} />
                <Input label="Location *" value={draft.location} onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} placeholder="Venue or online platform" />
              </div>
            )}
            {createTab === "compliance" && (
              <div className="flex flex-col gap-5">
                <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center">
                  <UploadCloud size={32} className="mx-auto text-[var(--muted-foreground)] mb-3" />
                  <p className="font-medium text-[var(--foreground)] mb-1">Upload APF (Activity Proposal Form)</p>
                  <p className="text-xs text-[var(--muted-foreground)] mb-3">PDF, DOC, DOCX up to 10MB</p>
                  <Button variant="outline" size="sm">Choose File</Button>
                  {draft.apfUrl && <p className="mt-2 text-xs text-[var(--primary)] font-mono">✓ {draft.apfUrl}</p>}
                </div>
                <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center">
                  <UploadCloud size={32} className="mx-auto text-[var(--muted-foreground)] mb-3" />
                  <p className="font-medium text-[var(--foreground)] mb-1">Upload Appendices</p>
                  <p className="text-xs text-[var(--muted-foreground)] mb-3">Multiple files allowed (PDF, images)</p>
                  <Button variant="outline" size="sm">Choose Files</Button>
                </div>
              </div>
            )}
            {createTab === "clearance" && (
              <div className="flex flex-col gap-4">
                <div className="bg-[var(--muted)] rounded-xl p-4 text-sm">
                  <p className="font-semibold text-[var(--foreground)] mb-3">Clearance Template Preview</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div><p className="font-mono text-[var(--muted-foreground)]">Event Name</p><p className="font-medium">{draft.name || "—"}</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)]">Type</p><p className="font-medium">{getEventTypeById(draft.typeId)?.name || "—"}</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)]">Date</p><p className="font-medium">{draft.dateStart ? formatDate(draft.dateStart) : "—"}</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)]">Location</p><p className="font-medium">{draft.location || "—"}</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)]">Mode</p><p className="font-medium">{draft.mode}</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)]">Proposed Budget</p><p className="font-medium">{formatCurrency(draft.proposedBudget)}</p></div>
                  </div>
                </div>
                <Textarea label="Additional Clearance Details" rows={3} value={draft.clearanceDetails ?? ""} onChange={(e) => setDraft((d) => ({ ...d, clearanceDetails: e.target.value }))} placeholder="Any additional notes for the clearance..." />
                <div>
                  <p className="text-sm font-medium text-[var(--foreground)] mb-1">Remarks</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Initially empty. Will be updated by adviser/dean approvals.</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-between items-center px-6 pb-6 border-t border-[var(--border)] pt-4">
            <div className="flex gap-2">
              {createTab !== "details" && <Button variant="outline" onClick={() => setCreateTab(createTab === "compliance" ? "details" : "compliance")}>← Back</Button>}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              {createTab === "clearance" ? (
                <Button onClick={handleSaveDraft} disabled={!draft.name}>
                  <CheckCircle size={14} /> Save as Draft
                </Button>
              ) : (
                <Button onClick={() => setCreateTab(createTab === "details" ? "compliance" : "clearance")}>Next →</Button>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* View Event Dialog */}
      {viewEvent && (
        <Dialog open={!!viewEvent} onClose={() => setViewEvent(null)} title={viewEvent.name} size="xl">
          <div className="flex flex-col">
            <div className="px-6 pt-4 flex items-center gap-3">
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${statusColors[viewEvent.status]}`}>{viewEvent.status}</span>
              <SignatoryProgress status={viewEvent.status} />
            </div>
            <Tabs tabs={viewTabsDef} activeTab={viewTab} onChange={setViewTab} className="px-6 mt-3" />
            <div className="p-6">
              {viewTab === "details" && (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Name</p><p className="font-medium">{viewEvent.name}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Type</p><p>{getEventTypeById(viewEvent.typeId)?.name}</p></div>
                  <div className="sm:col-span-2"><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Description</p><p className="leading-relaxed">{viewEvent.description}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Proposed Budget</p><p className="font-mono font-semibold text-[var(--primary)]">{formatCurrency(viewEvent.proposedBudget)}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Mode</p><p>{viewEvent.mode}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Date Start</p><p>{formatDateTime(viewEvent.dateStart)}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Date End</p><p>{formatDateTime(viewEvent.dateEnd)}</p></div>
                  <div className="sm:col-span-2"><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Location</p><p>{viewEvent.location}</p></div>
                  <div className="sm:col-span-2"><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Requisites</p><p>{viewEvent.requisites || "—"}</p></div>
                  {viewEvent.adviserFeedback && (
                    <div className="sm:col-span-2 bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <p className="text-xs font-mono text-orange-600 mb-1">Adviser Feedback</p>
                      <p className="text-sm text-orange-700">{viewEvent.adviserFeedback}</p>
                    </div>
                  )}
                </div>
              )}
              {viewTab === "compliance" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">APF (Activity Proposal Form)</p>
                    {viewEvent.apfUrl ? (
                      <a href={viewEvent.apfUrl} className="text-sm text-[var(--primary)] hover:underline">{viewEvent.apfUrl}</a>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No APF uploaded.</p>
                    )}
                  </div>
                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">Appendices</p>
                    {viewEvent.appendices && viewEvent.appendices.length > 0 ? (
                      <ul className="text-sm text-[var(--foreground)] list-disc list-inside">{viewEvent.appendices.map((a, i) => <li key={i}>{a}</li>)}</ul>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No appendices uploaded.</p>
                    )}
                  </div>
                </div>
              )}
              {viewTab === "clearance" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--muted)] rounded-xl p-4 text-sm">
                    <p className="font-semibold text-[var(--foreground)] mb-3">Clearance Details</p>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div><p className="font-mono text-[var(--muted-foreground)]">Event Name</p><p className="font-medium">{viewEvent.name}</p></div>
                      <div><p className="font-mono text-[var(--muted-foreground)]">Type</p><p>{getEventTypeById(viewEvent.typeId)?.name}</p></div>
                      <div><p className="font-mono text-[var(--muted-foreground)]">Date</p><p>{formatDate(viewEvent.dateStart)}</p></div>
                      <div><p className="font-mono text-[var(--muted-foreground)]">Location</p><p>{viewEvent.location}</p></div>
                    </div>
                    {viewEvent.clearanceDetails && <p className="mt-3 text-xs">{viewEvent.clearanceDetails}</p>}
                  </div>
                  {viewEvent.remarks && viewEvent.remarks.length > 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                      <p className="text-xs font-mono font-semibold text-amber-700 mb-2">Remarks / Amendments</p>
                      <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                        {viewEvent.remarks.map((r, i) => <li key={i}>{r}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {viewTab === "finance" && (
                <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                  {["Approved", "Completed", "Closed"].includes(viewEvent.status) ? (
                    <>
                      <CheckCircle size={40} className="text-[var(--primary)]" />
                      <p className="font-semibold text-[var(--foreground)]">Finance Records Available</p>
                      <p className="text-sm text-[var(--muted-foreground)]">View and manage financial transactions for this event.</p>
                      <Button onClick={() => setViewEvent(null)}>Go to Finance Page</Button>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">₱</div>
                      <p className="font-semibold text-[var(--muted-foreground)]">Finance Not Yet Available</p>
                      <p className="text-sm text-[var(--muted-foreground)]">Finance records will be available once the event is approved by the Dean.</p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Edit Event Dialog */}
      {editEvent && (
        <Dialog open={!!editEvent} onClose={() => setEditEvent(null)} title={`Edit: ${editEvent.name}`} size="xl">
          <div className="p-6 flex flex-col gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Input label="Event Name *" value={editEvent.name} onChange={(e) => setEditEvent((p) => p && ({ ...p, name: e.target.value }))} />
              </div>
              <Select label="Event Type" value={editEvent.typeId} onChange={(e) => setEditEvent((p) => p && ({ ...p, typeId: e.target.value }))}
                options={eventTypes.map((t) => ({ value: t.id, label: t.name }))} />
              <Input label="Proposed Budget (₱)" type="number" value={editEvent.proposedBudget} onChange={(e) => setEditEvent((p) => p && ({ ...p, proposedBudget: parseFloat(e.target.value) || 0 }))} />
              <div className="sm:col-span-2">
                <Textarea label="Description" rows={3} value={editEvent.description} onChange={(e) => setEditEvent((p) => p && ({ ...p, description: e.target.value }))} />
              </div>
              <Input label="Date Start" type="datetime-local" value={editEvent.dateStart} onChange={(e) => setEditEvent((p) => p && ({ ...p, dateStart: e.target.value }))} />
              <Input label="Date End" type="datetime-local" value={editEvent.dateEnd} onChange={(e) => setEditEvent((p) => p && ({ ...p, dateEnd: e.target.value }))} />
              <Select label="Mode" value={editEvent.mode} onChange={(e) => setEditEvent((p) => p && ({ ...p, mode: e.target.value as "FTF" | "Online/Virtual" }))} options={MODES} />
              <Input label="Location" value={editEvent.location} onChange={(e) => setEditEvent((p) => p && ({ ...p, location: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setEditEvent(null)}>Cancel</Button>
              <Button onClick={handleSaveEdit}><CheckCircle size={14} /> Save Changes</Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Event?" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-[var(--foreground)]">Are you sure you want to delete <strong>"{deleteConfirm?.name}"</strong>? This action cannot be undone.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
            <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Submit Confirm */}
      <Dialog open={!!submitConfirm} onClose={() => setSubmitConfirm(null)} title="Submit to Adviser?" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-[var(--foreground)]">
            Once submitted, <strong>"{submitConfirm?.name}"</strong> will be sent to the Faculty Adviser for review and will no longer be editable until returned.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSubmitConfirm(null)}>Cancel</Button>
            <Button onClick={() => submitConfirm && handleSubmitToAdviser(submitConfirm)}>
              <Send size={14} /> Submit to Adviser
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
