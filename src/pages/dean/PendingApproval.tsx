import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { Button, Dialog, Tabs, SignatoryProgress, EmptyState, Textarea } from "../../components/ui";
import { CheckCircle, MessageSquare, RotateCcw, Eye } from "lucide-react";
import { getEventTypeById, formatDate, formatDateTime, formatCurrency, statusColors, organizations, Event } from "../../services/mockData";

export default function DeanPendingApproval() {
  const { events, setEventStatus, updateEvent } = useApp();
  const pending = events.filter((e) => e.status === "For Approval");

  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [viewTab, setViewTab] = useState("details");
  const [showApproveRemarks, setShowApproveRemarks] = useState(false);
  const [showRequestChange, setShowRequestChange] = useState(false);
  const [feedback, setFeedback] = useState("");

  function handleApprove() {
    if (!viewEvent) return;
    setEventStatus(viewEvent.id, "Approved");
    if (feedback) updateEvent(viewEvent.id, { remarks: [...(viewEvent.remarks ?? []), `Dean's note: ${feedback}`] });
    // In production: generate PDF and email SDS
    setViewEvent(null);
    setFeedback("");
    setShowApproveRemarks(false);
  }

  function handleRequestChange() {
    if (!viewEvent || !feedback) return;
    setEventStatus(viewEvent.id, "Pending Revision", feedback);
    updateEvent(viewEvent.id, { deanFeedback: feedback });
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
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Pending Approval</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{pending.length} event(s) awaiting Dean's approval across all organizations.</p>
      </div>

      {pending.length === 0 ? (
        <EmptyState icon={<CheckCircle size={40} />} title="All clear!" description="No events pending your approval." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {pending.map((e) => {
            const org = organizations.find((o) => o.id === e.organizationId);
            return (
              <div key={e.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md transition flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                  <span className="text-xs font-mono bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{org?.code}</span>
                </div>
                <h3 className="font-semibold leading-snug">{e.name}</h3>
                <p className="text-xs text-[var(--muted-foreground)]">{formatDate(e.dateStart)} · {e.location}</p>
                <p className="text-xs font-mono text-[var(--primary)] font-semibold">{formatCurrency(e.proposedBudget)}</p>
                <SignatoryProgress status={e.status} />
                <Button size="sm" onClick={() => { setViewEvent(e); setViewTab("details"); }}>
                  <Eye size={12} /> Review & Approve
                </Button>
              </div>
            );
          })}
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
                  <div className="sm:col-span-2"><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Description</p><p>{viewEvent.description}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Budget</p><p className="font-mono font-semibold text-[var(--primary)]">{formatCurrency(viewEvent.proposedBudget)}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Mode</p><p>{viewEvent.mode}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Date</p><p>{formatDateTime(viewEvent.dateStart)}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Location</p><p>{viewEvent.location}</p></div>
                  <div className="sm:col-span-2"><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Organization</p><p>{organizations.find(o => o.id === viewEvent.organizationId)?.name}</p></div>
                </div>
              )}
              {viewTab === "compliance" && (
                <div className="flex flex-col gap-4">
                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">APF</p>
                    <p className="text-sm">{viewEvent.apfUrl || "No APF uploaded."}</p>
                  </div>
                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">Appendices ({viewEvent.appendices?.length ?? 0})</p>
                    {viewEvent.appendices?.map((a, i) => <p key={i} className="text-sm">{a}</p>)}
                  </div>
                </div>
              )}
              {viewTab === "clearance" && (
                <div className="bg-[var(--muted)] rounded-xl p-4 text-sm">
                  <p className="font-semibold mb-3">Clearance Template</p>
                  <div className="grid sm:grid-cols-2 gap-3 text-xs">
                    <div><p className="font-mono text-[var(--muted-foreground)]">Event Name</p><p>{viewEvent.name}</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)]">Type</p><p>{getEventTypeById(viewEvent.typeId)?.name}</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)]">Date</p><p>{formatDate(viewEvent.dateStart)}</p></div>
                    <div><p className="font-mono text-[var(--muted-foreground)]">Location</p><p>{viewEvent.location}</p></div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">Dean's Signatory</p>
                    <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-3 text-center text-xs text-[var(--muted-foreground)]">
                      Signature will be affixed upon approval
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-between px-6 pb-6 pt-4 border-t border-[var(--border)] flex-wrap gap-3">
              <Button variant="outline" onClick={() => setViewEvent(null)}>Close</Button>
              <div className="flex gap-2 flex-wrap">
                {viewTab !== "clearance" && <Button variant="outline" onClick={() => setViewTab(viewTab === "details" ? "compliance" : "clearance")}>Next →</Button>}
                {viewTab === "clearance" && (
                  <>
                    <Button variant="success" onClick={handleApprove}><CheckCircle size={14} /> Approve & Send to SDS</Button>
                    <Button variant="secondary" onClick={() => setShowApproveRemarks(true)}><MessageSquare size={14} /> Approve with Remarks</Button>
                    <Button variant="danger" onClick={() => setShowRequestChange(true)}><RotateCcw size={14} /> Request Change</Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      <Dialog open={showApproveRemarks} onClose={() => setShowApproveRemarks(false)} title="Approve with Remarks" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">Add remarks to be appended to the clearance. APF and clearance will be emailed to SDS.</p>
          <Textarea label="Remarks" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional notes..." />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowApproveRemarks(false)}>Cancel</Button>
            <Button variant="success" onClick={handleApprove}><CheckCircle size={14} /> Approve</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={showRequestChange} onClose={() => setShowRequestChange(false)} title="Request Changes" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <Textarea label="Feedback *" rows={4} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="State required changes clearly..." />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowRequestChange(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleRequestChange} disabled={!feedback}><RotateCcw size={14} /> Send Back</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
