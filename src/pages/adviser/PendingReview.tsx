import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import {
  Button,
  Dialog,
  Tabs,
  Card,
  SignatoryProgress,
  EmptyState,
  Textarea,
  RefreshButton,
  SkeletonEventCard,
  SkeletonTable,
} from "../../components/ui";
import { CheckCircle, MessageSquare, RotateCcw, Eye, FileText, UploadCloud, Calendar, MapPin, Video, ExternalLink, LayoutGrid, List } from "lucide-react";
import { getEventTypeById, formatDate, formatDateTime, formatEventSchedule, formatCurrency, statusColors, Event, isWebUrl, toWebUrl, resolvePdfUrl } from "../../services/dataService";
import EventHistoryTimeline from "../../components/events/EventHistoryTimeline";
import EventClearanceTab from "../../components/events/EventClearanceTab";
import EventFinanceTab from "../../components/events/EventFinanceTab";

export default function AdviserPendingReview() {
  const { currentUser } = useAuth();
  const { events, eventTypes, setEventStatus, updateEvent, defaultView, isLoading } = useApp();
  const { toast } = useToast();
  const orgId = currentUser?.organizationId ?? "";
  const pending = events.filter((e) => e.organizationId === orgId && e.status === "For Review");

  const [view, setView] = useState<"grid" | "list">(defaultView || "grid");

  useEffect(() => {
    setView(defaultView || "grid");
  }, [defaultView]);

  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [viewTab, setViewTab] = useState("details");
  const [showApproveRemarks, setShowApproveRemarks] = useState(false);
  const [showRequestChange, setShowRequestChange] = useState(false);
  const [feedback, setFeedback] = useState("");

  function handleApprove() {
    if (!viewEvent) return;
    const targetEvent = { ...viewEvent, status: "For Approval" as const };
    const trimmed = feedback.trim();
    setEventStatus(viewEvent.id, "For Approval", trimmed || undefined, currentUser?.id);
    toast.success("Proposal Endorsed", `'${viewEvent.name}' endorsed and forwarded to the College Dean.`, {
      action: {
        label: "Click here to view event details",
        onClick: () => {
          setViewEvent(targetEvent);
          setViewTab("details");
        },
      },
    });
    setViewEvent(null);
    setFeedback("");
    setShowApproveRemarks(false);
  }

  function handleRequestChange() {
    if (!viewEvent || !feedback.trim()) return;
    const targetEvent = { ...viewEvent, status: "Pending Revision" as const };
    const trimmed = feedback.trim();
    setEventStatus(viewEvent.id, "Pending Revision", trimmed, currentUser?.id);
    toast.warning("Revision Requested", `'${viewEvent.name}' returned to student officers with revision notes.`, {
      icon: "check",
      action: {
        label: "Click here to view event details",
        onClick: () => {
          setViewEvent(targetEvent);
          setViewTab("details");
        },
      },
    });
    setViewEvent(null);
    setFeedback("");
    setShowRequestChange(false);
  }

  const viewTabs = [
    { id: "details", label: "Event Details" },
    { id: "compliance", label: "Event Compliance" },
    { id: "clearance", label: "Event Clearance", dividerAfter: true },
    { id: "history", label: "History" },
    { id: "finance", label: "Finance" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">Pending Review</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {pending.length} event proposal{pending.length !== 1 ? "s" : ""} awaiting your endorsement.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pending.length > 0 && !isLoading && (
            <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] p-1 rounded-xl shadow-2xs">
              <button
                type="button"
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  view === "grid"
                    ? "bg-[var(--primary)] text-white shadow-xs font-bold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
                title="Grid View"
              >
                <LayoutGrid size={15} />
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  view === "list"
                    ? "bg-[var(--primary)] text-white shadow-xs font-bold"
                    : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
                title="List View"
              >
                <List size={15} />
              </button>
            </div>
          )}
          <RefreshButton />
        </div>
      </div>

      {isLoading ? (
        view === "grid" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonEventCard key={i} />
            ))}
          </div>
        ) : (
          <SkeletonTable rows={5} cols={5} />
        )
      ) : pending.length === 0 ? (
        <EmptyState icon={<CheckCircle size={40} />} title="All clear!" description="No pending proposals to review at this time." />
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {pending.map((e) => (
            <div
              key={e.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md hover:border-[var(--primary)]/40 transition-all flex flex-col justify-between gap-4 shadow-2xs"
            >
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${statusColors[e.status]}`}>
                    {e.status}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--muted-foreground)] bg-[var(--muted)]/60 px-2 py-0.5 rounded-md border border-[var(--border)] font-medium">
                    {e.mode === "Online/Virtual" ? "Online" : e.mode}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-[var(--foreground)] leading-snug">
                    {e.name}
                  </h3>
                  <div className="flex flex-col gap-1 text-xs text-[var(--muted-foreground)] mt-1.5 font-mono">
                    <p className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-[var(--primary)] flex-shrink-0" />
                      <span>{formatDate(e.dateStart)}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      {e.mode === "Online/Virtual" ? (
                        <Video size={13} className="text-[var(--muted-foreground)] flex-shrink-0" />
                      ) : (
                        <MapPin size={13} className="text-[var(--muted-foreground)] flex-shrink-0" />
                      )}
                      <span className="truncate">{e.location}</span>
                    </p>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)] flex items-center justify-between font-mono text-xs">
                  <span className="text-[var(--muted-foreground)] font-medium">Proposed Budget:</span>
                  <span className="font-extrabold text-[var(--primary)] text-sm">{formatCurrency(e.proposedBudget)}</span>
                </div>

                {/* Signatory Progress Stepper */}
                <div className="pt-4 pb-1 border-t border-[var(--border)]/60">
                  <SignatoryProgress status={e.status} />
                </div>
              </div>

              <div className="mt-auto pt-3 border-t border-[var(--border)]">
                <Button
                  size="sm"
                  onClick={() => { setViewEvent(e); setViewTab("details"); }}
                  className="w-full flex items-center justify-center gap-2 font-semibold shadow-2xs"
                >
                  <Eye size={14} /> Review Proposal
                </Button>
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
                  <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Proposal Name</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Schedule & Location</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Proposed Budget</th>
                  <th className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-mono font-semibold text-[var(--muted-foreground)]">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {pending.map((e) => (
                  <tr key={e.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-[var(--foreground)]">{e.name}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">{e.mode}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-[var(--muted-foreground)]">
                      <div>{formatDate(e.dateStart)}</div>
                      <div className="text-[11px] truncate max-w-[200px]">{e.location}</div>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-[var(--primary)]">
                      {formatCurrency(e.proposedBudget)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${statusColors[e.status]}`}>
                        {e.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex justify-center">
                        <Button
                          size="sm"
                          onClick={() => { setViewEvent(e); setViewTab("details"); }}
                          className="gap-1.5 font-semibold text-xs h-8"
                        >
                          <Eye size={13} /> Review Proposal
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Review Dialog */}
      {viewEvent && (
        <Dialog open={!!viewEvent} onClose={() => setViewEvent(null)} title={viewEvent.name} size="xl">
          <div className="flex flex-col min-h-0 flex-1 h-full">
            <div className="sticky top-0 z-20 bg-white border-b border-[var(--border)] px-6 pt-4 shadow-2xs flex-shrink-0">
              <div className="flex items-center gap-3 pb-3">
                <span className={`text-xs font-mono px-3 py-1 rounded-full whitespace-nowrap text-center inline-flex items-center justify-center font-semibold shadow-2xs flex-shrink-0 ${statusColors[viewEvent.status]}`}>
                  {viewEvent.status}
                </span>
                <div className="flex-1 min-w-0">
                  <SignatoryProgress status={viewEvent.status} />
                </div>
              </div>
              <Tabs tabs={viewTabs} activeTab={viewTab} onChange={setViewTab} />
            </div>
            <div className="p-6 flex-1">
              {viewTab === "details" && (
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Name</p><p className="font-medium">{viewEvent.name}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Type</p><p className="font-medium">{eventTypes.find((t) => t.id === viewEvent.typeId)?.name || getEventTypeById(viewEvent.typeId)?.name || "General Event"}</p></div>
                  <div className="sm:col-span-2"><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Description</p><p className="leading-relaxed">{viewEvent.description}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Proposed Budget</p><p className="font-mono font-semibold text-[var(--primary)]">{formatCurrency(viewEvent.proposedBudget)}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Mode</p><p>{viewEvent.mode === "Online/Virtual" ? "Online / Virtual" : "Face-to-Face (FTF)"}</p></div>
                  <div><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Scheduled Date & Time</p><p className="font-medium">{formatEventSchedule(viewEvent.dateStart, viewEvent.dateEnd)}</p></div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">
                      {viewEvent.mode === "Online/Virtual" ? "Platform / Link" : "Venue / Location"}
                    </p>
                    {isWebUrl(viewEvent.location) ? (
                      <a
                        href={toWebUrl(viewEvent.location!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline underline-offset-2 font-medium break-all"
                      >
                        {viewEvent.location}
                        <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                      </a>
                    ) : (
                      <p className="font-medium">{viewEvent.location || (viewEvent.mode === "Online/Virtual" ? "Online Platform" : "Venue TBD")}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2"><p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Requisites</p><p>{viewEvent.requisites || "—"}</p></div>
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
                          <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                        </a>
                      </div>
                    ) : <p className="text-sm text-[var(--muted-foreground)]">No APF uploaded.</p>}
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
                              <ExternalLink size={12} className="flex-shrink-0 text-[var(--primary)]" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : <p className="text-sm text-[var(--muted-foreground)]">No appendices.</p>}
                  </div>
                </div>
              )}
              {viewTab === "clearance" && (
                <EventClearanceTab
                  event={viewEvent}
                  eventTypeName={getEventTypeById(viewEvent.typeId)?.name}
                />
              )}
              {viewTab === "history" && (
                <EventHistoryTimeline eventId={viewEvent.id} event={viewEvent} />
              )}
              {viewTab === "finance" && (
                <EventFinanceTab
                  event={viewEvent}
                  onOpenFinance={() => setViewEvent(null)}
                  showOpenFinance={true}
                />
              )}
            </div>

            <div className="flex items-center justify-between px-6 pb-6 pt-4 border-t border-[var(--border)] bg-white sticky bottom-0 z-10 mt-auto flex-wrap gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setViewEvent(null)}>Close</Button>
              <div className="flex gap-2 flex-wrap">
                {(viewTab === "details" || viewTab === "compliance") && (
                  <Button variant="outline" onClick={() => setViewTab(viewTab === "details" ? "compliance" : "clearance")}>Next →</Button>
                )}
                {viewTab === "clearance" && viewEvent.status === "For Review" && (
                  <>
                    <Button variant="danger" onClick={() => setShowRequestChange(true)}>
                      <RotateCcw size={14} /> Request Change
                    </Button>
                    <Button variant="secondary" onClick={() => setShowApproveRemarks(true)}>
                      <MessageSquare size={14} /> Approve with Remarks
                    </Button>
                    <Button variant="success" onClick={handleApprove} className="!bg-emerald-700 hover:!bg-emerald-800 text-white shadow-2xs">
                      <CheckCircle size={14} /> Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Approve with Remarks Dialog */}
      <Dialog open={showApproveRemarks} onClose={() => setShowApproveRemarks(false)} title="Approve with Remarks" size="sm" zIndex="z-[60]">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-sm text-[var(--muted-foreground)]">Add optional remarks to be included in the event clearance. The event will be forwarded to the Dean.</p>
          <Textarea label="Remarks" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Add any notes or conditions..." />
          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowApproveRemarks(false)}>Cancel</Button>
            <Button variant="success" onClick={handleApprove} className="!bg-emerald-700 hover:!bg-emerald-800 text-white shadow-2xs">
              <CheckCircle size={14} /> Approve & Forward to Dean
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Request Change Dialog */}
      <Dialog open={showRequestChange} onClose={() => setShowRequestChange(false)} title="Request Changes" size="sm" zIndex="z-[60]">
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
