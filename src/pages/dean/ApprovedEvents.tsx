import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import { Card, CardHeader, StatCard, Dialog, Tabs, SignatoryProgress, Button } from "../../components/ui";
import { CalendarCheck, CreditCard, CheckCircle, ExternalLink, FileText, Calendar, MapPin, Video, LayoutGrid, List } from "lucide-react";
import {
  formatCurrency, formatDate, formatDateTime, statusColors, Event,
  getEventTypeById, isWebUrl, toWebUrl, resolvePdfUrl
} from "../../services/mockData";
import EventHistoryTimeline from "../../components/events/EventHistoryTimeline";
import EventClearanceTab from "../../components/events/EventClearanceTab";
import EventFinanceTab from "../../components/events/EventFinanceTab";

export default function DeanApprovedEvents() {
  const { events, transactions, organizations, defaultView, auditTrail, eventSignatories } = useApp();

  const getApprovalTimestamp = (eventId: string, createdAt: string) => {
    const deanSig = (eventSignatories || []).find(
      (s) => s.eventId === eventId && s.role === "dean" && s.status === "Approved"
    );
    if (deanSig?.signedAt) return new Date(deanSig.signedAt).getTime();
    if (deanSig?.createdAt) return new Date(deanSig.createdAt).getTime();

    const auditEntry = (auditTrail || []).find(
      (a) => a.eventId === eventId && (a.action === "Approved Event" || a.action === "Executive Approval" || a.statusTo === "Approved")
    );
    if (auditEntry?.timestamp) return new Date(auditEntry.timestamp).getTime();

    return new Date(createdAt).getTime();
  };

  const approved = events
    .filter((e) => ["Approved", "Completed", "Closed"].includes(e.status))
    .sort((a, b) => getApprovalTimestamp(b.id, b.createdAt) - getApprovalTimestamp(a.id, a.createdAt));

  const totalSpent = transactions.filter((t) => approved.some((e) => e.id === t.eventId) && !t.deleted).reduce((s, t) => s + t.amount, 0);

  const [view, setView] = useState<"grid" | "list">(defaultView || "grid");

  useEffect(() => {
    setView(defaultView || "grid");
  }, [defaultView]);

  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [viewTab, setViewTab] = useState("details");

  const viewTabs = [
    { id: "details", label: "Details" },
    { id: "compliance", label: "Compliance Docs" },
    { id: "clearance", label: "Event Clearance" },
    { id: "history", label: "History" },
    { id: "finance", label: "Finance" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">Approved Events</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">All approved events across CITE organizations (read-only).</p>
        </div>

        {approved.length > 0 && (
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
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Approved Events" value={approved.length} icon={<CalendarCheck size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<CreditCard size={18} />} />
        <StatCard label="Closed Events" value={events.filter((e) => e.status === "Closed").length} icon={<CheckCircle size={18} />} />
      </div>

      {approved.length === 0 ? (
        <Card>
          <div className="p-12 text-center text-[var(--muted-foreground)]">No approved events yet.</div>
        </Card>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {approved.map((e) => {
            const org = organizations.find((o) => o.id === e.organizationId);
            const orgColor = org?.logoColor || "#0d9488";
            const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
            return (
              <div
                key={e.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:shadow-md hover:border-[var(--primary)]/40 transition-all flex flex-col justify-between gap-4 shadow-2xs"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${statusColors[e.status]}`}>
                      {e.status}
                    </span>
                    <span
                      className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-2xs"
                      style={{
                        backgroundColor: `${orgColor}18`,
                        color: orgColor,
                        borderColor: `${orgColor}40`,
                      }}
                    >
                      {org?.code || "CITE"}
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

                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)] font-mono text-xs">
                    <div>
                      <span className="text-[var(--muted-foreground)] block text-[10px]">Budget:</span>
                      <span className="font-bold text-[var(--foreground)]">{formatCurrency(e.proposedBudget)}</span>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)] block text-[10px]">Spent:</span>
                      <span className="font-extrabold text-[var(--primary)]">{formatCurrency(spent)}</span>
                    </div>
                  </div>

                  <div className="pt-4 pb-1 border-t border-[var(--border)]/60">
                    <SignatoryProgress status={e.status} />
                  </div>
                </div>

                <div className="mt-auto pt-3 border-t border-[var(--border)]">
                  <Button
                    size="sm"
                    onClick={() => { setViewEvent(e); setViewTab("details"); }}
                    className="w-full h-8 px-3 text-xs font-bold flex items-center justify-center gap-1.5 rounded-lg shadow-2xs"
                  >
                    View Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {["Event", "Organization", "Date", "Budget", "Spent", "Status", "Action"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-mono font-semibold text-[var(--muted-foreground)] ${h === "Action" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {approved.map((e) => {
                  const org = organizations.find((o) => o.id === e.organizationId);
                  const orgColor = org?.logoColor || "#0d9488";
                  const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
                  return (
                    <tr key={e.id} className="hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="px-4 py-3.5 font-medium max-w-[240px]">
                        <button
                          type="button"
                          onClick={() => {
                            setViewEvent(e);
                            setViewTab("details");
                          }}
                          className="text-left font-semibold text-[var(--primary)] hover:underline cursor-pointer truncate max-w-full block"
                          title="Click to view event details"
                        >
                          {e.name}
                        </button>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-mono text-[var(--muted-foreground)]">
                        <span
                          className="font-bold px-2 py-0.5 rounded-md border"
                          style={{
                            backgroundColor: `${orgColor}18`,
                            color: orgColor,
                            borderColor: `${orgColor}40`,
                          }}
                        >
                          {org?.code || "CITE"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs">{formatDate(e.dateStart)}</td>
                      <td className="px-4 py-3.5 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--primary)] font-semibold">{formatCurrency(spent)}</td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold border ${statusColors[e.status]}`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Button
                          size="sm"
                          onClick={() => { setViewEvent(e); setViewTab("details"); }}
                          className="gap-1.5 font-semibold text-xs h-8"
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Event Details Dialog */}
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
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Event Name</p>
                    <p className="font-semibold text-[var(--foreground)]">{viewEvent.name}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Type</p>
                    <p className="font-medium">{getEventTypeById(viewEvent.typeId)?.name || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Description</p>
                    <p className="text-xs leading-relaxed text-[var(--foreground)]">{viewEvent.description || "—"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Proposed Budget</p>
                    <p className="font-mono font-bold text-[var(--primary)]">{formatCurrency(viewEvent.proposedBudget)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Mode</p>
                    <p className="font-medium">{viewEvent.mode === "Online/Virtual" ? "Online" : viewEvent.mode}</p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Date & Time</p>
                    <p className="font-medium">
                      {viewEvent.dateStart && viewEvent.dateEnd
                        ? `${formatDateTime(viewEvent.dateStart)} – ${formatDateTime(viewEvent.dateEnd)}`
                        : viewEvent.dateStart
                        ? formatDateTime(viewEvent.dateStart)
                        : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">
                      {viewEvent.mode === "Online/Virtual" ? "Platform / Link" : "Location"}
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
                      <p className="font-medium">{viewEvent.location || "—"}</p>
                    )}
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Attendee Requisites</p>
                    <p className="font-medium text-sm text-[var(--foreground)] leading-relaxed">{viewEvent.requisites || "—"}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-1">Organization</p>
                    <p className="font-semibold text-[var(--foreground)]">{organizations.find((o) => o.id === viewEvent.organizationId)?.name}</p>
                  </div>
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
                          <span>{viewEvent.apfUrl.replace(/^.*[\\/]/, "")}</span>
                          <ExternalLink size={13} className="flex-shrink-0 text-[var(--primary)]" />
                        </a>
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No APF uploaded.</p>
                    )}
                  </div>

                  <div className="bg-[var(--muted)] rounded-xl p-4">
                    <p className="text-xs font-mono text-[var(--muted-foreground)] mb-2">Appendices ({viewEvent.appendices?.length ?? 0})</p>
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
                              <span>{a.replace(/^.*[\\/]/, "")}</span>
                              <ExternalLink size={12} className="flex-shrink-0 text-[var(--primary)]" />
                            </a>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-[var(--muted-foreground)]">No appendices.</p>
                    )}
                  </div>
                </div>
              )}

              {viewTab === "clearance" && (
                <EventClearanceTab
                  event={viewEvent}
                  organizationName={organizations.find((o) => o.id === viewEvent.organizationId)?.name}
                  eventTypeName={getEventTypeById(viewEvent.typeId)?.name}
                />
              )}

              {viewTab === "history" && (
                <EventHistoryTimeline eventId={viewEvent.id} event={viewEvent} />
              )}

              {viewTab === "finance" && (
                <EventFinanceTab
                  event={viewEvent}
                  organizationName={organizations.find((o) => o.id === viewEvent.organizationId)?.name}
                  showOpenFinance={false}
                />
              )}
            </div>

            <div className="flex justify-between px-6 pb-6 pt-4 border-t border-[var(--border)] bg-white sticky bottom-0 z-10 mt-auto flex-wrap gap-3 flex-shrink-0">
              <Button variant="outline" onClick={() => setViewEvent(null)}>Close</Button>
              <div className="flex gap-2 flex-wrap">
                {(viewTab === "details" || viewTab === "compliance") && (
                  <Button variant="outline" onClick={() => setViewTab(viewTab === "details" ? "compliance" : "clearance")}>
                    Next →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
