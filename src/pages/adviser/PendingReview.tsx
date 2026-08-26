import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { Button, Dialog, Tabs, Card, SignatoryProgress, EmptyState, Textarea } from "../../components/ui";
import { CheckCircle, MessageSquare, RotateCcw, Eye, FileText, UploadCloud } from "lucide-react";
import { getEventTypeById, formatDate, formatDateTime, formatCurrency, statusColors, Event } from "../../services/mockData";

export default function AdviserPendingReview() {
  const { currentUser } = useAuth();
  const { events, setEventStatus, updateEvent } = useApp();
  const orgId = currentUser?.organizationId ?? "";
  const pending = events.filter((e) => e.organizationId === orgId && e.status === "For Review");

  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [viewTab, setViewTab] = useState("details");
  const [showApproveRemarks, setShowApproveRemarks] = useState(false);
  const [showRequestChange, setShowRequestChange] = useState(false);
  const [feedback, setFeedback] = useState("");

  function handleApprove() {
    if (!viewEvent) return;
    setEventStatus(viewEvent.id, "For Approval");
    if (feedback) updateEvent(viewEvent.id, { remarks: [...(viewEvent.remarks ?? []), `Adviser note: ${feedback}`] });
    setViewEvent(null);
    setFeedback("");
    setShowApproveRemarks(false);
  }

  function handleRequestChange() {
    if (!viewEvent || !feedback) return;
    setEventStatus(viewEvent.id, "Pending Revision", feedback);
    setViewEvent(null);
    setFeedback("");
    setShowRequestChange(false);
  }

  const viewTabs = [
    { id: "details", label: "Event Details" },
    { id: "compliance", label: "Event Compliance" },
    { id: "clearance", label: "Event Clearance" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Pending Review</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {pending.length} event proposal{pending.length !== 1 ? "s" : ""} awaiting your review.
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState icon={<CheckCircle size={40} />} title="All clear!" description="No pending proposals to review at this time." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pending.map((e) => (
            <div key={e.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md transition flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                <span className="text-xs text-[var(--muted-foreground)] font-mono">{e.mode}</span>
              </div>
              <h3 className="font-semibold text-[var(--foreground)] leading-snug">{e.name}</h3>
              <p className="text-xs text-[var(--muted-foreground)]">{formatDate(e.dateStart)} · {e.location}</p>
              <p className="text-xs font-mono text-[var(--primary)] font-semibold">{formatCurrency(e.proposedBudget)}</p>
              <SignatoryProgress status={e.status} />
              <Button size="sm" onClick={() => { setViewEvent(e); setViewTab("details"); }}>
                <Eye size={12} /> Review
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      {viewEvent && (
        <Dialog open={!!viewEvent} onClose={() => setViewEvent(null)} title={viewEvent.name} size="xl">
          <div className="flex flex-col">
            <div className="px-6 pt-4 flex items-center gap-3">
              <span className={`text-xs font-mono px-2 py-0.5 rounded-full ${statusColors[viewEvent.status]}`}>{viewEvent.status}</span>
              <SignatoryProgress status={viewEvent.status} />
            </div>
            <Tabs tabs={viewTabs} activeTab={viewTab} onChange={setViewTab} className="px-6 mt-3" />
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
                </div>
              )}
              {viewTab === "compliance" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">APF (Activity Proposal Form)</p>
                    {viewEvent.apfUrl ? (
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-[var(--primary)]" />
                        <a href={viewEvent.apfUrl} className="text-sm text-[var(--primary)] hover:underline">{viewEvent.apfUrl}</a>
                      </div>
                    ) : <p className="text-sm text-[var(--muted-foreground)]">No APF uploaded.</p>}
                  </div>
                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">Appendices</p>
                    {viewEvent.appendices && viewEvent.appendices.length > 0 ? (
                      <ul className="text-sm list-disc list-inside">{viewEvent.appendices.map((a, i) => <li key={i}>{a}</li>)}</ul>
                    ) : <p className="text-sm text-[var(--muted-foreground)]">No appendices.</p>}
                  </div>
                </div>
              )}
              {viewTab === "clearance" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--muted)] rounded-xl p-4 text-sm">
                    <p className="font-semibold mb-3">Clearance Details</p>
                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                      <div><p className="font-mono text-[var(--muted-foreground)]">Event Name</p><p className="font-medium">{viewEvent.name}</p></div>
                      <div><p className="font-mono text-[var(--muted-foreground)]">Type</p><p>{getEventTypeById(viewEvent.typeId)?.name}</p></div>
                      <div><p className="font-mono text-[var(--muted-foreground)]">Date</p><p>{formatDate(viewEvent.dateStart)}</p></div>
                      <div><p className="font-mono text-[var(--muted-foreground)]">Location</p><p>{viewEvent.location}</p></div>
                    </div>
                    {viewEvent.clearanceDetails && <p className="mt-3 text-xs">{viewEvent.clearanceDetails}</p>}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 pb-6 pt-4 border-t border-[var(--border)] flex-wrap gap-3">
              <Button variant="outline" onClick={() => setViewEvent(null)}>Close</Button>
              <div className="flex gap-2 flex-wrap">
                {viewTab !== "clearance" && <Button variant="outline" onClick={() => setViewTab(viewTab === "details" ? "compliance" : "clearance")}>Next →</Button>}
                {viewTab === "clearance" && (
                  <>
                    <Button variant="success" onClick={handleApprove}><CheckCircle size={14} /> Approve</Button>
                    <Button variant="secondary" onClick={() => setShowApproveRemarks(true)}><MessageSquare size={14} /> Approve with Remarks</Button>
                    <Button variant="danger" onClick={() => setShowRequestChange(true)}><RotateCcw size={14} /> Request Change</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Approve with Remarks Dialog */}
      <Dialog open={showApproveRemarks} onClose={() => setShowApproveRemarks(false)} title="Approve with Remarks" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">Add optional remarks to be included in the event clearance. The event will be forwarded to the Dean.</p>
          <Textarea label="Remarks" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Add any notes or conditions..." />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowApproveRemarks(false)}>Cancel</Button>
            <Button variant="success" onClick={handleApprove}><CheckCircle size={14} /> Approve & Forward to Dean</Button>
          </div>
        </div>
      </Dialog>

      {/* Request Change Dialog */}
      <Dialog open={showRequestChange} onClose={() => setShowRequestChange(false)} title="Request Changes" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">Provide specific feedback for the student officers to address before resubmission.</p>
          <Textarea label="Feedback / Comments *" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Describe what needs to be changed..." />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowRequestChange(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleRequestChange} disabled={!feedback}><RotateCcw size={14} /> Send Back for Revision</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
