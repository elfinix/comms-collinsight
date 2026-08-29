import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { Button, Dialog, Input, Textarea, Select, Tabs, Card, CardHeader, CardBody, SignatoryProgress, EmptyState, DateTimePicker } from "../../components/ui";
import {
  Plus, Search, Grid, List, Filter, Trash2, Eye, Edit2, Send, AlertCircle, CheckCircle, UploadCloud,
  ArrowUpDown, ChevronDown, ArrowDownWideNarrow, ArrowUpNarrowWide, FileText, ExternalLink, ArrowRight, MessageSquareQuote,
  Wallet, CreditCard, Coins,
} from "lucide-react";
import {
  getEventTypeById, getCategoryById, formatCurrency, formatDate, formatDateTime, statusColors, eventTypes, expenditureCategories,
  Event, EventStatus, resolvePdfUrl,
} from "../../services/mockData";
import EventHistoryTimeline from "../../components/events/EventHistoryTimeline";
import EventClearanceTab from "../../components/events/EventClearanceTab";
import EventFinanceTab from "../../components/events/EventFinanceTab";

const MODES = [
  { value: "FTF", label: "FTF (Face-to-Face)" },
  { value: "Online/Virtual", label: "Online/Virtual" },
];

const STATUS_FILTERS = ["All", "Created", "For Review", "For Approval", "Pending Revision", "Approved", "Completed", "Closed"];

function formatNumberWithCommas(num: number | string): string {
  if (num === "" || num === 0 || num === "0") return "";
  const str = String(num);
  const parts = str.split(".");
  const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.length > 1 ? `${integerPart}.${parts[1]}` : integerPart;
}

function isWebUrl(str?: string): boolean {
  if (!str) return false;
  const t = str.trim();
  return /^(https?:\/\/|www\.)/i.test(t) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(t);
}

function toWebUrl(str: string): string {
  const t = str.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function newEventShell(createdBy: string, orgId: string, defaultTypeId: string = ""): Omit<Event, "id"> {
  return {
    organizationId: orgId,
    name: "",
    typeId: defaultTypeId,
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
  const { events, addEvent, updateEvent, deleteEvent, organizations, setEventStatus, addAuditEntry, eventTypes, transactions, defaultView } = useApp();
  const navigate = useNavigate();

  const orgId = currentUser?.organizationId ?? "";
  const org = organizations.find((o) => o.id === orgId);
  const orgEvents = events.filter((e) => e.organizationId === orgId);

  const getEventType = (id: string) => eventTypes.find((t) => t.id === id) || getEventTypeById(id);

  const [view, setView] = useState<"grid" | "list">(defaultView || "grid");
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
  const [editTab, setEditTab] = useState("details");
  const [viewTab, setViewTab] = useState("details");
  const [draft, setDraft] = useState<Omit<Event, "id">>(newEventShell(currentUser?.id ?? "", orgId, eventTypes[0]?.id ?? ""));

  const apfInputRef = useRef<HTMLInputElement>(null);
  const appendicesInputRef = useRef<HTMLInputElement>(null);
  const editApfInputRef = useRef<HTMLInputElement>(null);
  const editAppendicesInputRef = useRef<HTMLInputElement>(null);

  const isDateRangeValid = !draft.dateStart || !draft.dateEnd || new Date(draft.dateEnd) > new Date(draft.dateStart);

  // Organization Remaining Available Budget Calculation
  const orgApprovedEvents = events.filter((e) => e.organizationId === orgId && ["Approved", "Completed", "Closed"].includes(e.status));
  const orgTxns = transactions.filter((t) => orgApprovedEvents.some((e) => e.id === t.eventId) && !t.deleted);
  const totalOrgSpent = orgTxns.reduce((sum, t) => sum + t.amount, 0);
  const allocatedBudget = org?.allocatedBudget ?? 0;
  const remainingBudget = Math.max(0, allocatedBudget - totalOrgSpent);

  // Available budget headroom when editing an existing event
  const isEditEventApproved = editEvent && ["Approved", "Completed", "Closed"].includes(editEvent.status);
  const editAvailableBudget = isEditEventApproved
    ? remainingBudget + (editEvent.proposedBudget ?? 0)
    : remainingBudget;

  const isDetailsValid = !!(
    draft.name.trim() &&
    draft.typeId &&
    draft.proposedBudget > 0 &&
    draft.proposedBudget <= remainingBudget &&
    draft.description.trim() &&
    draft.dateStart &&
    draft.dateEnd &&
    isDateRangeValid &&
    draft.mode &&
    draft.location.trim()
  );

  const isComplianceValid = isDetailsValid && !!draft.apfUrl;

  const isEditDateRangeValid = !editEvent?.dateStart || !editEvent?.dateEnd || new Date(editEvent.dateEnd) > new Date(editEvent.dateStart);

  const isEditDetailsValid = !!(
    editEvent &&
    editEvent.name.trim() &&
    editEvent.typeId &&
    editEvent.proposedBudget > 0 &&
    editEvent.proposedBudget <= editAvailableBudget &&
    editEvent.description.trim() &&
    editEvent.dateStart &&
    editEvent.dateEnd &&
    isEditDateRangeValid &&
    editEvent.mode &&
    editEvent.location.trim()
  );

  const isEditComplianceValid = isEditDetailsValid && !!(editEvent?.apfUrl && editEvent.apfUrl.trim());

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
    setDraft(newEventShell(currentUser?.id ?? "", orgId, eventTypes[0]?.id ?? ""));
    setCreateTab("details");
    setShowCreate(true);
  }

  function handleOpenEdit(e: Event) {
    setEditEvent({ ...e, appendices: e.appendices ? [...e.appendices] : [] });
    setEditTab("details");
  }

  function handleSaveDraft() {
    if (!draft.name) return;
    const id = `evt-${Date.now()}`;
    addEvent({ ...draft, id });
    setShowCreate(false);
  }

  function handleSaveEdit() {
    if (!editEvent) return;
    updateEvent(editEvent.id, { ...editEvent });
    setEditEvent(null);
  }

  function handleSubmitToAdviser(evt: Event) {
    setEventStatus(evt.id, "For Review");
    setSubmitConfirm(null);
  }

  function handleDelete(evt: Event) {
    deleteEvent(evt.id);
    setDeleteConfirm(null);
  }

  const canEdit = (e: Event) => e.status === "Created" || e.status === "Pending Revision";
  const canDelete = (e: Event) => e.status === "Created";
  const canSubmit = (e: Event) => e.status === "Created" || e.status === "Pending Revision";

  const createEventTabsDef = [
    { id: "details", label: "Event Details", disabled: false },
    { id: "compliance", label: "Event Compliance", disabled: !isDetailsValid },
    { id: "clearance", label: "Event Clearance", disabled: !isComplianceValid },
  ];

  const editEventTabsDef = [
    { id: "details", label: "Event Details", disabled: false },
    { id: "compliance", label: "Event Compliance", disabled: !isEditDetailsValid },
    { id: "clearance", label: "Event Clearance", disabled: !isEditComplianceValid },
  ];

  const viewTabsDef = [
    { id: "details", label: "Event Details" },
    { id: "compliance", label: "Event Compliance" },
    { id: "clearance", label: "Event Clearance" },
    { id: "history", label: "History" },
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

      {/* 2-Tier UX-Friendly Toolbar */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-xs space-y-3 mb-6">
        {/* Tier 1: Search & Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search events by title..."
              className="w-full pl-9 pr-8 py-2 text-sm border border-[var(--border)] rounded-xl bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] transition text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Field with Leading Icon & Trailing Chevron */}
            <div className="relative flex items-center">
              <ArrowUpDown size={13} className="absolute left-3 text-[var(--muted-foreground)] pointer-events-none" />
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value)}
                className="pl-8 pr-7 py-2 text-xs font-medium border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer appearance-none shadow-2xs hover:border-[var(--primary)]/40 transition"
              >
                <option value="createdAt">Date Created</option>
                <option value="name">Name (A-Z)</option>
                <option value="proposedBudget">Proposed Budget</option>
                <option value="dateStart">Event Date</option>
              </select>
              <ChevronDown size={12} className="absolute right-2.5 text-[var(--muted-foreground)] pointer-events-none" />
            </div>

            {/* Asc / Desc Icon Toggle Button */}
            <button
              onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="w-8.5 h-8.5 flex items-center justify-center border border-[var(--border)] rounded-xl bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]/50 hover:border-[var(--primary)]/40 transition cursor-pointer shadow-2xs"
              title={sortDir === "asc" ? "Ascending — Click to sort Descending" : "Descending — Click to sort Ascending"}
            >
              {sortDir === "asc" ? (
                <ArrowUpNarrowWide size={15} className="text-[var(--primary)]" />
              ) : (
                <ArrowDownWideNarrow size={15} className="text-[var(--primary)]" />
              )}
            </button>

            <div className="flex border border-[var(--border)] rounded-xl overflow-hidden p-0.5 bg-[var(--muted)]/30">
              <button
                onClick={() => setView("grid")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  view === "grid"
                    ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Grid size={13} />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setView("list")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition cursor-pointer ${
                  view === "list"
                    ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <List size={13} />
                <span>List</span>
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-[var(--border)]/70" />

        {/* Tier 2: Status Pills Filter */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--muted-foreground)] mr-1 flex items-center gap-1">
              <Filter size={12} /> Status:
            </span>
            {STATUS_FILTERS.map((s) => {
              const isActive = statusFilter === s;
              const count = s === "All" ? orgEvents.length : orgEvents.filter((e) => e.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1 text-xs font-medium rounded-full transition cursor-pointer flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                      : "bg-[var(--muted)]/50 text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <span>{s}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? "bg-white/20 text-white" : "bg-[var(--border)]/60 text-[var(--muted-foreground)]"}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {statusFilter !== "All" && (
            <button
              onClick={() => setStatusFilter("All")}
              className="text-xs font-medium text-[var(--primary)] hover:underline cursor-pointer ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* Events Grid / List */}
      {filtered.length === 0 ? (
        <EmptyState icon={<Plus size={40} />} title="No events yet" description="Create your first event proposal to get started." action={<Button onClick={handleCreate}><Plus size={14} /> Add Event</Button>} />
      ) : view === "grid" ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => (
            <div key={e.id} className="bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-5 hover:shadow-md transition flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                <span className="text-xs text-[var(--muted-foreground)] font-mono">{e.mode === "Online/Virtual" ? "Virtual" : e.mode}</span>
              </div>
              <h3 className="font-bold text-[var(--foreground)] leading-snug">{e.name}</h3>
              <p className="text-xs text-[var(--muted-foreground)]">{formatDate(e.dateStart)} · {e.location}</p>
              <p className="text-sm font-mono text-[var(--primary)] font-extrabold">{formatCurrency(e.proposedBudget)}</p>
              {e.status === "Pending Revision" && e.adviserFeedback && (
                <div className="flex gap-2 bg-orange-50 border border-orange-200 rounded-xl p-2.5 text-xs text-orange-800">
                  <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                  <span className="line-clamp-2 leading-relaxed" title={e.adviserFeedback}>
                    {e.adviserFeedback.length > 100 ? `${e.adviserFeedback.slice(0, 100)}...` : e.adviserFeedback}
                  </span>
                </div>
              )}
              {/* Right-aligned action buttons in exact sequence: [Delete] [Edit] [View] [Submit] */}
              <div className="flex items-center justify-end gap-1.5 mt-auto pt-3 border-t border-[var(--border)]">
                {canDelete(e) && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => setDeleteConfirm(e)}
                    title="Delete Proposal"
                    className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg shadow-2xs"
                  >
                    <Trash2 size={15} className="stroke-[1.8]" />
                  </Button>
                )}
                {canEdit(e) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(e)}
                    title="Edit Proposal"
                    className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg bg-white hover:bg-[var(--muted)]/60 shadow-2xs text-[var(--foreground)]"
                  >
                    <Edit2 size={15} className="stroke-[1.8]" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setViewEvent(e); setViewTab("details"); }}
                  title="View Details"
                  className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg bg-white hover:bg-[var(--muted)]/60 shadow-2xs text-[var(--foreground)]"
                >
                  <Eye size={15} className="stroke-[1.8]" />
                </Button>
                {canSubmit(e) && (
                  <Button
                    size="sm"
                    onClick={() => setSubmitConfirm(e)}
                    className="h-8 px-3 text-xs font-bold flex items-center gap-1.5 rounded-lg shadow-2xs"
                  >
                    <Send size={13.5} className="stroke-[1.8]" /> Submit
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
                <tr className="bg-[var(--muted)]/40 border-b border-[var(--border)]">
                  {["Event Name", "Type", "Date", "Budget", "Status", "Actions"].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-mono font-bold uppercase tracking-wider text-[var(--muted-foreground)] ${h === "Actions" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filtered.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--muted)]/30 transition">
                    <td className="px-5 py-3.5 font-bold text-[var(--foreground)] max-w-[220px] truncate">{e.name}</td>
                    <td className="px-5 py-3.5 text-xs text-[var(--muted-foreground)]">{getEventType(e.typeId)?.name}</td>
                    <td className="px-5 py-3.5 font-mono text-xs text-[var(--foreground)]">{formatDate(e.dateStart)}</td>
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-[var(--primary)]">{formatCurrency(e.proposedBudget)}</td>
                    <td className="px-5 py-3.5"><span className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold ${statusColors[e.status]}`}>{e.status}</span></td>
                    <td className="px-5 py-3.5 text-right">
                      {/* Right-aligned action buttons in exact sequence: [Delete] [Edit] [View] [Submit] */}
                      <div className="flex items-center justify-end gap-1.5">
                        {canDelete(e) && (
                          <Button size="sm" variant="danger" onClick={() => setDeleteConfirm(e)} title="Delete Proposal" className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg shadow-2xs">
                            <Trash2 size={15} className="stroke-[1.8]" />
                          </Button>
                        )}
                        {canEdit(e) && (
                          <Button size="sm" variant="outline" onClick={() => handleOpenEdit(e)} title="Edit Proposal" className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg bg-white hover:bg-[var(--muted)]/60 shadow-2xs text-[var(--foreground)]">
                            <Edit2 size={15} className="stroke-[1.8]" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => { setViewEvent(e); setViewTab("details"); }} title="View Details" className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg bg-white hover:bg-[var(--muted)]/60 shadow-2xs text-[var(--foreground)]">
                          <Eye size={15} className="stroke-[1.8]" />
                        </Button>
                        {canSubmit(e) && (
                          <Button size="sm" onClick={() => setSubmitConfirm(e)} className="h-8 px-3 text-xs font-bold flex items-center gap-1.5 rounded-lg shadow-2xs">
                            <Send size={13.5} className="stroke-[1.8]" /> Submit
                          </Button>
                        )}
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
        <div className="flex flex-col min-h-0 flex-1">
          <div className="sticky top-0 z-20 bg-white border-b border-[var(--border)] px-6 shadow-2xs">
            <Tabs tabs={createEventTabsDef} activeTab={createTab} onChange={setCreateTab} />
          </div>
          
          <div className="p-6">
            {/* Step 1: Event Details */}
            {createTab === "details" && (
              <div className="grid sm:grid-cols-2 gap-4 pb-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Event Name *"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                    placeholder="e.g., TechFest 2026: Innovation Summit"
                  />
                </div>

                <Select
                  label="Event Type *"
                  value={draft.typeId}
                  onChange={(e) => setDraft((d) => ({ ...d, typeId: e.target.value }))}
                  options={eventTypes.map((t) => ({ value: t.id, label: t.name }))}
                />

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-[var(--foreground)]">
                      Proposed Budget (₱) *
                    </label>
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                      Available: <strong className="text-teal-700 font-bold">{formatCurrency(remainingBudget)}</strong>
                    </span>
                  </div>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatNumberWithCommas(draft.proposedBudget)}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9.]/g, "");
                      const parts = raw.split(".");
                      const cleanStr = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
                      const num = parseFloat(cleanStr);
                      setDraft((d) => ({ ...d, proposedBudget: isNaN(num) ? 0 : num }));
                    }}
                    placeholder="0.00"
                  />
                </div>

                {draft.proposedBudget > remainingBudget && (
                  <div className="sm:col-span-2 flex gap-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl border border-red-200">
                    <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                    <span>
                      Proposed budget of <strong>{formatCurrency(draft.proposedBudget)}</strong> exceeds your organization's available remaining balance of <strong>{formatCurrency(remainingBudget)}</strong>.
                    </span>
                  </div>
                )}

                <div className="sm:col-span-2">
                  <Textarea
                    label="Description *"
                    rows={3}
                    value={draft.description}
                    onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
                    placeholder="Provide a comprehensive summary of the event objectives and activities..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <Textarea
                    label="Attendee Requisites"
                    rows={2}
                    value={draft.requisites}
                    onChange={(e) => setDraft((d) => ({ ...d, requisites: e.target.value }))}
                    placeholder="e.g., Valid Student ID, Laptop, pre-installed tools, formal attire, parental waiver..."
                  />
                </div>

                <DateTimePicker
                  label="Date & Time Start *"
                  value={draft.dateStart}
                  onChange={(val) => setDraft((d) => ({ ...d, dateStart: val }))}
                />

                <DateTimePicker
                  label="Date & Time End *"
                  min={draft.dateStart || undefined}
                  value={draft.dateEnd}
                  onChange={(val) => setDraft((d) => ({ ...d, dateEnd: val }))}
                  error={
                    draft.dateStart && draft.dateEnd && new Date(draft.dateEnd) <= new Date(draft.dateStart)
                      ? "End date & time must be after the start date & time."
                      : undefined
                  }
                />

                <Select
                  label="Mode *"
                  value={draft.mode}
                  onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value as "FTF" | "Online/Virtual" }))}
                  options={MODES}
                />

                <Input
                  label={draft.mode === "Online/Virtual" ? "Meeting Link *" : "Location *"}
                  value={draft.location}
                  onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                  placeholder={
                    draft.mode === "Online/Virtual"
                      ? "e.g., https://meet.google.com/abc-defg-hij or Zoom link"
                      : "Campus venue, auditorium, or room assignment"
                  }
                />
              </div>
            )}

            {/* Step 2: Event Compliance */}
            {createTab === "compliance" && (
              <div className="flex flex-col gap-5">
                {/* Hidden File Inputs */}
                <input
                  type="file"
                  ref={apfInputRef}
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setDraft((d) => ({ ...d, apfUrl: file.name }));
                    }
                  }}
                />
                <input
                  type="file"
                  ref={appendicesInputRef}
                  className="hidden"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files && files.length > 0) {
                      const newFileNames = Array.from(files).map((f) => f.name);
                      setDraft((d) => ({
                        ...d,
                        appendices: [...(d.appendices || []), ...newFileNames],
                      }));
                    }
                  }}
                />

                {/* APF Upload Section */}
                <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${draft.apfUrl ? "border-emerald-300 bg-emerald-50/30" : "border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--card)]"}`}>
                  <UploadCloud size={36} className={`mx-auto mb-2.5 ${draft.apfUrl ? "text-emerald-600" : "text-[var(--muted-foreground)]"}`} />
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <p className="font-bold text-sm text-[var(--foreground)]">Upload APF (Activity Proposal Form) *</p>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-50 text-[var(--primary)] border border-teal-200">
                      Required
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mb-3">PDF, DOC, or DOCX document up to 10MB</p>

                  {draft.apfUrl ? (
                    <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-mono shadow-2xs">
                      <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                      <span className="font-bold truncate max-w-[260px]">{draft.apfUrl}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setDraft((d) => ({ ...d, apfUrl: "" }));
                          if (apfInputRef.current) apfInputRef.current.value = "";
                        }}
                        className="text-emerald-700 hover:text-red-600 ml-1 p-0.5 cursor-pointer font-bold"
                        title="Remove file"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => apfInputRef.current?.click()}
                      className="bg-white shadow-2xs font-bold text-xs"
                    >
                      <UploadCloud size={14} /> Choose APF File
                    </Button>
                  )}
                </div>

                {/* Appendices Upload Section (Optional) */}
                <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-6 text-center bg-[var(--card)] hover:border-[var(--primary)]/40 transition">
                  <UploadCloud size={36} className="mx-auto text-[var(--muted-foreground)] mb-2.5" />
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <p className="font-bold text-sm text-[var(--foreground)]">Upload Appendices</p>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      Optional
                    </span>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mb-3">
                    Supplementary documents (program matrix, poster drafts, speaker profiles, budget quotations)
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendicesInputRef.current?.click()}
                    className="bg-white shadow-2xs font-bold text-xs"
                  >
                    <Plus size={14} /> Choose Appendix Files
                  </Button>

                  {draft.appendices && draft.appendices.length > 0 && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {draft.appendices.map((file, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-xs font-mono text-[var(--foreground)] border border-[var(--border)] shadow-2xs">
                          <FileText size={13} className="text-[var(--primary)]" />
                          <span className="truncate max-w-[200px]">{file}</span>
                          <button
                            type="button"
                            onClick={() => setDraft((d) => ({ ...d, appendices: (d.appendices ?? []).filter((_, i) => i !== idx) }))}
                            className="text-[var(--muted-foreground)] hover:text-red-600 cursor-pointer ml-1"
                            title="Remove attachment"
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Event Clearance Preview */}
            {createTab === "clearance" && (
              <div className="flex flex-col gap-4">
                <div className="bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-5 text-sm space-y-3">
                  <p className="font-bold text-[var(--foreground)] text-sm">Clearance Template Summary</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div><p className="font-mono text-[var(--muted-foreground)] font-bold">Event Name</p><p className="font-bold text-[var(--foreground)] mt-0.5">{draft.name || "—"}</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)] font-bold">Type</p><p className="font-medium mt-0.5">{getEventType(draft.typeId)?.name || "—"}</p></div>
                    <div className="sm:col-span-2"><p className="font-mono text-[var(--muted-foreground)] font-bold">Event Description</p><p className="font-medium mt-0.5 text-xs leading-relaxed text-[var(--foreground)]">{draft.description || "—"}</p></div>
                    <div className="sm:col-span-2"><p className="font-mono text-[var(--muted-foreground)] font-bold">Event Date & Time</p><p className="font-medium mt-0.5">{draft.dateStart && draft.dateEnd ? `${formatDateTime(draft.dateStart)} – ${formatDateTime(draft.dateEnd)}` : draft.dateStart ? formatDateTime(draft.dateStart) : "—"}</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)] font-bold">{draft.mode === "Online/Virtual" ? "Meeting Link & Mode" : "Location & Mode"}</p><p className="font-medium mt-0.5">{draft.location || "—"} ({draft.mode === "Online/Virtual" ? "Virtual" : draft.mode})</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)] font-bold">Proposed Budget</p><p className="font-mono font-bold text-[var(--primary)] mt-0.5">{formatCurrency(draft.proposedBudget)}</p></div>
                    <div className="sm:col-span-2"><p className="font-mono text-[var(--muted-foreground)] font-bold">Attached APF</p><p className="font-mono text-emerald-700 font-bold mt-0.5">✓ {draft.apfUrl}</p></div>
                  </div>
                </div>

                <Textarea
                  label="Additional Clearance Details (Optional)"
                  rows={3}
                  value={draft.clearanceDetails ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, clearanceDetails: e.target.value }))}
                  placeholder="Any supplementary clearance notes or instructions for the Faculty Adviser..."
                />

                <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/70 text-xs text-amber-800">
                  <p className="font-bold">Signatory Flow Reminder</p>
                  <p className="mt-0.5">Saving as draft creates the proposal in <strong>Created</strong> status. You can review and submit it to your Faculty Adviser whenever you are ready.</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Navigation */}
          <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-xs flex justify-between items-center px-6 py-4 border-t border-[var(--border)] shadow-2xs">
            <div>
              {createTab !== "details" && (
                <Button
                  variant="outline"
                  onClick={() => setCreateTab(createTab === "clearance" ? "compliance" : "details")}
                >
                  ← Back
                </Button>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              
              {createTab === "details" && (
                <Button
                  onClick={() => setCreateTab("compliance")}
                  disabled={!isDetailsValid}
                  title={!isDetailsValid ? "Fill out all mandatory fields to proceed" : undefined}
                >
                  Next: Compliance →
                </Button>
              )}

              {createTab === "compliance" && (
                <Button
                  onClick={() => setCreateTab("clearance")}
                  disabled={!isComplianceValid}
                  title={!draft.apfUrl ? "Upload the Activity Proposal Form (APF) to proceed" : undefined}
                >
                  Next: Clearance →
                </Button>
              )}

              {createTab === "clearance" && (
                <Button onClick={handleSaveDraft} disabled={!draft.name}>
                  <CheckCircle size={15} /> Save as Draft
                </Button>
              )}
            </div>
          </div>
        </div>
      </Dialog>

      {/* Edit Event Dialog */}
      {editEvent && (
        <Dialog open={!!editEvent} onClose={() => setEditEvent(null)} title={`Edit Event: ${editEvent.name}`} size="xl">
          <div className="flex flex-col min-h-0 flex-1">
            <div className="sticky top-0 z-20 bg-white border-b border-[var(--border)] px-6 shadow-2xs">
              <Tabs tabs={editEventTabsDef} activeTab={editTab} onChange={setEditTab} />
            </div>

            <div className="p-6">
              {/* If pending revision, show feedback alert banner */}
              {editEvent.status === "Pending Revision" && editEvent.adviserFeedback && (
                <div className="mb-4 flex gap-2.5 bg-orange-50 border border-orange-200 rounded-2xl p-3.5 text-xs text-orange-800">
                  <AlertCircle size={16} className="flex-shrink-0 text-orange-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-orange-900">Faculty Adviser Feedback & Revision Guidance</p>
                    <p className="mt-0.5 leading-relaxed">{editEvent.adviserFeedback}</p>
                  </div>
                </div>
              )}

              {/* Step 1: Event Details */}
              {editTab === "details" && (
                <div className="grid sm:grid-cols-2 gap-4 pb-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Event Name *"
                      value={editEvent.name}
                      onChange={(e) => setEditEvent((d) => (d ? { ...d, name: e.target.value } : null))}
                      placeholder="e.g., TechFest 2026: Innovation Summit"
                    />
                  </div>

                  <Select
                    label="Event Type *"
                    value={editEvent.typeId}
                    onChange={(e) => setEditEvent((d) => (d ? { ...d, typeId: e.target.value } : null))}
                    options={eventTypes.map((t) => ({ value: t.id, label: t.name }))}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-medium text-[var(--foreground)]">
                        Proposed Budget (₱) *
                      </label>
                      <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
                        Available: <strong className="text-teal-700 font-bold">{formatCurrency(editAvailableBudget)}</strong>
                      </span>
                    </div>
                    <Input
                      type="text"
                      inputMode="decimal"
                      value={formatNumberWithCommas(editEvent.proposedBudget)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^0-9.]/g, "");
                        const parts = raw.split(".");
                        const cleanStr = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : raw;
                        const num = parseFloat(cleanStr);
                        setEditEvent((d) => (d ? { ...d, proposedBudget: isNaN(num) ? 0 : num } : null));
                      }}
                      placeholder="0.00"
                    />
                  </div>

                  {editEvent.proposedBudget > editAvailableBudget && (
                    <div className="sm:col-span-2 flex gap-2 bg-red-50 text-red-600 text-xs px-3 py-2 rounded-xl border border-red-200">
                      <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                      <span>
                        Proposed budget of <strong>{formatCurrency(editEvent.proposedBudget)}</strong> exceeds your organization's available remaining balance of <strong>{formatCurrency(editAvailableBudget)}</strong>.
                      </span>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <Textarea
                      label="Description *"
                      rows={3}
                      value={editEvent.description}
                      onChange={(e) => setEditEvent((d) => (d ? { ...d, description: e.target.value } : null))}
                      placeholder="Provide a comprehensive summary of the event objectives and activities..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Textarea
                      label="Attendee Requisites"
                      rows={2}
                      value={editEvent.requisites || ""}
                      onChange={(e) => setEditEvent((d) => (d ? { ...d, requisites: e.target.value } : null))}
                      placeholder="e.g., Valid Student ID, Laptop, pre-installed tools, formal attire, parental waiver..."
                    />
                  </div>

                  <DateTimePicker
                    label="Date & Time Start *"
                    value={editEvent.dateStart}
                    onChange={(val) => setEditEvent((d) => (d ? { ...d, dateStart: val } : null))}
                  />

                  <DateTimePicker
                    label="Date & Time End *"
                    min={editEvent.dateStart || undefined}
                    value={editEvent.dateEnd}
                    onChange={(val) => setEditEvent((d) => (d ? { ...d, dateEnd: val } : null))}
                    error={
                      editEvent.dateStart && editEvent.dateEnd && new Date(editEvent.dateEnd) <= new Date(editEvent.dateStart)
                        ? "End date & time must be after the start date & time."
                        : undefined
                    }
                  />

                  <Select
                    label="Mode *"
                    value={editEvent.mode}
                    onChange={(e) => setEditEvent((d) => (d ? { ...d, mode: e.target.value as "FTF" | "Online/Virtual" } : null))}
                    options={MODES}
                  />

                  <Input
                    label={editEvent.mode === "Online/Virtual" ? "Meeting Link *" : "Location *"}
                    value={editEvent.location}
                    onChange={(e) => setEditEvent((d) => (d ? { ...d, location: e.target.value } : null))}
                    placeholder={
                      editEvent.mode === "Online/Virtual"
                        ? "e.g., https://meet.google.com/abc-defg-hij or Zoom link"
                        : "Campus venue, auditorium, or room assignment"
                    }
                  />
                </div>
              )}

              {/* Step 2: Event Compliance */}
              {editTab === "compliance" && (
                <div className="flex flex-col gap-5">
                  {/* Hidden File Inputs */}
                  <input
                    type="file"
                    ref={editApfInputRef}
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditEvent((d) => (d ? { ...d, apfUrl: file.name } : null));
                      }
                    }}
                  />
                  <input
                    type="file"
                    ref={editAppendicesInputRef}
                    className="hidden"
                    multiple
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        const newFileNames = Array.from(files).map((f) => f.name);
                        setEditEvent((d) => (d ? { ...d, appendices: [...(d.appendices || []), ...newFileNames] } : null));
                      }
                    }}
                  />

                  {/* APF Upload Section */}
                  <div className={`border-2 border-dashed rounded-2xl p-6 text-center transition ${editEvent.apfUrl ? "border-emerald-300 bg-emerald-50/30" : "border-[var(--border)] hover:border-[var(--primary)]/50 bg-[var(--card)]"}`}>
                    <UploadCloud size={36} className={`mx-auto mb-2.5 ${editEvent.apfUrl ? "text-emerald-600" : "text-[var(--muted-foreground)]"}`} />
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <p className="font-bold text-sm text-[var(--foreground)]">Upload APF (Activity Proposal Form) *</p>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-50 text-[var(--primary)] border border-teal-200">
                        Required
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-3">PDF, DOC, or DOCX document up to 10MB</p>

                    {editEvent.apfUrl ? (
                      <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-xs font-mono shadow-2xs">
                        <CheckCircle size={15} className="text-emerald-600 flex-shrink-0" />
                        <span className="font-bold truncate max-w-[260px]">{editEvent.apfUrl}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setEditEvent((d) => (d ? { ...d, apfUrl: "" } : null));
                            if (editApfInputRef.current) editApfInputRef.current.value = "";
                          }}
                          className="text-emerald-700 hover:text-red-600 ml-1 p-0.5 cursor-pointer font-bold"
                          title="Remove file"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => editApfInputRef.current?.click()}
                        className="bg-white shadow-2xs font-bold text-xs"
                      >
                        <UploadCloud size={14} /> Choose APF File
                      </Button>
                    )}
                  </div>

                  {/* Appendices Upload Section */}
                  <div className="border-2 border-dashed border-[var(--border)] rounded-2xl p-6 text-center bg-[var(--card)] hover:border-[var(--primary)]/40 transition">
                    <UploadCloud size={36} className="mx-auto text-[var(--muted-foreground)] mb-2.5" />
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <p className="font-bold text-sm text-[var(--foreground)]">Upload Appendices</p>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        Optional
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mb-3">
                      Supplementary documents (program matrix, poster drafts, speaker profiles, budget quotations)
                    </p>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => editAppendicesInputRef.current?.click()}
                      className="bg-white shadow-2xs font-bold text-xs"
                    >
                      <Plus size={14} /> Choose Appendix Files
                    </Button>

                    {editEvent.appendices && editEvent.appendices.length > 0 && (
                      <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {editEvent.appendices.map((file, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-xs font-mono text-[var(--foreground)] border border-[var(--border)] shadow-2xs">
                            <FileText size={13} className="text-[var(--primary)]" />
                            <span className="truncate max-w-[200px]">{file}</span>
                            <button
                              type="button"
                              onClick={() => setEditEvent((d) => (d ? { ...d, appendices: (d.appendices ?? []).filter((_, i) => i !== idx) } : null))}
                              className="text-[var(--muted-foreground)] hover:text-red-600 cursor-pointer ml-1"
                              title="Remove attachment"
                            >
                              ✕
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Step 3: Event Clearance Preview */}
              {editTab === "clearance" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-5 text-sm space-y-3">
                    <p className="font-bold text-[var(--foreground)] text-sm">Clearance Template Summary</p>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div><p className="font-mono text-[var(--muted-foreground)] font-bold">Event Name</p><p className="font-bold text-[var(--foreground)] mt-0.5">{editEvent.name || "—"}</p></div>
                      <div><p className="font-mono text-[var(--muted-foreground)] font-bold">Type</p><p className="font-medium mt-0.5">{getEventType(editEvent.typeId)?.name || "—"}</p></div>
                      <div className="sm:col-span-2"><p className="font-mono text-[var(--muted-foreground)] font-bold">Event Description</p><p className="font-medium mt-0.5 text-xs leading-relaxed text-[var(--foreground)]">{editEvent.description || "—"}</p></div>
                      <div className="sm:col-span-2"><p className="font-mono text-[var(--muted-foreground)] font-bold">Event Date & Time</p><p className="font-medium mt-0.5">{editEvent.dateStart && editEvent.dateEnd ? `${formatDateTime(editEvent.dateStart)} – ${formatDateTime(editEvent.dateEnd)}` : editEvent.dateStart ? formatDateTime(editEvent.dateStart) : "—"}</p></div>
                      <div><p className="font-mono text-[var(--muted-foreground)] font-bold">{editEvent.mode === "Online/Virtual" ? "Meeting Link & Mode" : "Location & Mode"}</p><p className="font-medium mt-0.5">{editEvent.location || "—"} ({editEvent.mode === "Online/Virtual" ? "Virtual" : editEvent.mode})</p></div>
                      <div><p className="font-mono text-[var(--muted-foreground)] font-bold">Proposed Budget</p><p className="font-mono font-bold text-[var(--primary)] mt-0.5">{formatCurrency(editEvent.proposedBudget)}</p></div>
                      <div className="sm:col-span-2"><p className="font-mono text-[var(--muted-foreground)] font-bold">Attached APF</p><p className="font-mono text-emerald-700 font-bold mt-0.5">✓ {editEvent.apfUrl}</p></div>
                    </div>
                  </div>

                  <Textarea
                    label="Additional Clearance Details (Optional)"
                    rows={3}
                    value={editEvent.clearanceDetails ?? ""}
                    onChange={(e) => setEditEvent((d) => (d ? { ...d, clearanceDetails: e.target.value } : null))}
                    placeholder="Any supplementary clearance notes or instructions for the Faculty Adviser..."
                  />
                </div>
              )}
            </div>

            {/* Footer Navigation */}
            <div className="sticky bottom-0 z-20 bg-white/95 backdrop-blur-xs flex justify-between items-center px-6 py-4 border-t border-[var(--border)] shadow-2xs">
              <div>
                {editTab !== "details" && (
                  <Button
                    variant="outline"
                    onClick={() => setEditTab(editTab === "clearance" ? "compliance" : "details")}
                  >
                    ← Back
                  </Button>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <Button variant="outline" onClick={() => setEditEvent(null)}>Cancel</Button>
                
                {editTab === "details" && (
                  <Button
                    onClick={() => setEditTab("compliance")}
                    disabled={!isEditDetailsValid}
                    title={!isEditDetailsValid ? "Fill out all mandatory fields to proceed" : undefined}
                  >
                    Next: Compliance →
                  </Button>
                )}

                {editTab === "compliance" && (
                  <Button
                    onClick={() => setEditTab("clearance")}
                    disabled={!isEditComplianceValid}
                    title={!editEvent.apfUrl ? "Upload the Activity Proposal Form (APF) to proceed" : undefined}
                  >
                    Next: Clearance →
                  </Button>
                )}

                {editTab === "clearance" && (
                  <Button onClick={handleSaveEdit} disabled={!editEvent.name}>
                    <CheckCircle size={15} /> Save Changes
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* View Event Dialog */}
      {viewEvent && (
        <Dialog open={!!viewEvent} onClose={() => setViewEvent(null)} title={viewEvent.name} size="xl">
          <div className="flex flex-col min-h-0 flex-1">
            <div className="sticky top-0 z-20 bg-white border-b border-[var(--border)] px-6 pt-4 shadow-2xs">
              <div className="flex items-center gap-3 pb-3">
                <span className={`text-xs font-mono px-3 py-1 rounded-full whitespace-nowrap text-center inline-flex items-center justify-center font-semibold shadow-2xs flex-shrink-0 ${statusColors[viewEvent.status]}`}>
                  {viewEvent.status}
                </span>
                <div className="flex-1 min-w-0">
                  <SignatoryProgress status={viewEvent.status} />
                </div>
              </div>
              <Tabs tabs={viewTabsDef} activeTab={viewTab} onChange={setViewTab} />
            </div>
            <div className="p-6">
              {viewTab === "details" && (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Name</p><p className="font-medium">{viewEvent.name}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Type</p><p>{getEventType(viewEvent.typeId)?.name}</p></div>
                  <div className="sm:col-span-2"><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Description</p><p className="leading-relaxed">{viewEvent.description}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Proposed Budget</p><p className="font-mono font-semibold text-[var(--primary)]">{formatCurrency(viewEvent.proposedBudget)}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Mode</p><p>{viewEvent.mode === "Online/Virtual" ? "Virtual" : viewEvent.mode}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Date Start</p><p>{formatDateTime(viewEvent.dateStart)}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Date End</p><p>{formatDateTime(viewEvent.dateEnd)}</p></div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">
                      {viewEvent.mode === "Online/Virtual" ? "Meeting Link" : "Location"}
                    </p>
                    {isWebUrl(viewEvent.location) ? (
                      <a
                        href={toWebUrl(viewEvent.location)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline font-medium break-all"
                      >
                        {viewEvent.location}
                        <ExternalLink size={13} className="flex-shrink-0" />
                      </a>
                    ) : (
                      <p className="font-medium">{viewEvent.location || "—"}</p>
                    )}
                  </div>
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
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[var(--primary)] flex-shrink-0" />
                        <a
                          href={resolvePdfUrl(viewEvent.apfUrl, "apf")}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1.5 break-all"
                        >
                          <span>{viewEvent.apfUrl.replace(/^.*[\\/]/, '')}</span>
                          <ExternalLink size={13} className="flex-shrink-0" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No APF uploaded.</p>
                    )}
                  </div>
                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">Appendices</p>
                    {viewEvent.appendices && viewEvent.appendices.length > 0 ? (
                      <ul className="text-sm space-y-1.5">
                        {viewEvent.appendices.map((a, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <FileText size={14} className="text-[var(--primary)] flex-shrink-0" />
                            <a
                              href={resolvePdfUrl(a, "appendix")}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-medium text-[var(--primary)] hover:underline inline-flex items-center gap-1 break-all"
                            >
                              <span>{a.replace(/^.*[\\/]/, '')}</span>
                              <ExternalLink size={12} className="flex-shrink-0" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No appendices uploaded.</p>
                    )}
                  </div>
                </div>
              )}
              {viewTab === "clearance" && (
                <div className="flex flex-col gap-4">
                  <EventClearanceTab
                    event={viewEvent}
                    organizationName={org?.name}
                    eventTypeName={getEventType(viewEvent.typeId)?.name}
                  />

                  {/* Faculty Adviser Feedback */}
                  {viewEvent.adviserFeedback && (
                    <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <MessageSquareQuote size={15} className="text-orange-600" />
                        <p className="text-xs font-mono font-bold text-orange-800">Faculty Adviser Feedback & Revision Guidance</p>
                      </div>
                      <p className="text-sm text-orange-800 leading-relaxed pl-5">{viewEvent.adviserFeedback}</p>
                    </div>
                  )}

                  {/* Dean Feedback / Executive Approval Notes */}
                  {viewEvent.deanFeedback && (
                    <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-1.5">
                        <MessageSquareQuote size={15} className="text-emerald-600" />
                        <p className="text-xs font-mono font-bold text-emerald-800">Dean / Executive Approval Notes</p>
                      </div>
                      <p className="text-sm text-emerald-900 leading-relaxed pl-5">{viewEvent.deanFeedback}</p>
                    </div>
                  )}

                  {/* Signatory Remarks & Amendments */}
                  {viewEvent.remarks && viewEvent.remarks.length > 0 ? (
                    <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4">
                      <p className="text-xs font-mono font-bold text-amber-800 mb-2">Remarks & Amendments by Signatories</p>
                      <ul className="text-sm text-amber-800 list-disc list-inside space-y-1 pl-1">
                        {viewEvent.remarks.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    !viewEvent.adviserFeedback && !viewEvent.deanFeedback && (
                      <div className="p-4 rounded-2xl bg-[var(--muted)]/20 border border-dashed border-[var(--border)] text-center text-xs text-[var(--muted-foreground)]">
                        No signatory remarks logged yet.
                      </div>
                    )
                  )}
                </div>
              )}
              {viewTab === "history" && (
                <EventHistoryTimeline eventId={viewEvent.id} event={viewEvent} />
              )}
              {viewTab === "finance" && (
                <EventFinanceTab
                  event={viewEvent}
                  organizationName={organizations.find((o) => o.id === viewEvent.organizationId)?.name}
                  onOpenFinance={() => {
                    setViewEvent(null);
                    navigate("/student/finance");
                  }}
                  showOpenFinance={true}
                />
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* Delete Confirm */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Delete Event Proposal" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-[var(--foreground)]">Are you sure you want to delete <strong>"{deleteConfirm?.name}"</strong>?</p>
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
