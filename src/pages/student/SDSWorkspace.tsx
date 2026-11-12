import { useMemo } from "react";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { Card, CardHeader, Button, RefreshButton, Skeleton, SkeletonStatCard, SkeletonTable } from "../../components/ui";
import { FileText, Mail, CheckCircle, Clock, FileSpreadsheet, ExternalLink, ShieldCheck } from "lucide-react";
import {
  formatDate,
  formatDateTime,
  getStatusBadgeClass,
  isEventSentToSds,
  isEventLiquidated,
  isEventPendingLiquidation,
  isEventPendingSdsClearance,
  getDeanDispatchedAt,
  resolvePdfUrl,
  resolveEventSignatories,
  Event,
} from "../../services/dataService";
import { generateClearancePdfBlob, openPdfBlobInNewTab } from "../../services/pdfDocuments";

export default function SDSWorkspace() {
  const { currentUser } = useAuth();
  const { events, eventSignatories, auditTrail, organizations, eventTypes, isLoading } = useApp();
  const orgId = currentUser?.organizationId ?? "";
  const org = organizations.find((o) => o.id === orgId);

  const sentEvents = useMemo(() => {
    return events
      .filter((e) => e.organizationId === orgId && isEventSentToSds(e))
      .sort((a, b) => {
        const timeA = new Date(getDeanDispatchedAt(a.id, eventSignatories, auditTrail) || a.createdAt).getTime();
        const timeB = new Date(getDeanDispatchedAt(b.id, eventSignatories, auditTrail) || b.createdAt).getTime();
        return timeB - timeA;
      });
  }, [events, orgId, eventSignatories, auditTrail]);

  const totalSent = sentEvents.length;
  const pendingSdsCount = sentEvents.filter((e) => isEventPendingSdsClearance(e)).length;
  const pendingLiquidationCount = sentEvents.filter((e) => isEventPendingLiquidation(e)).length;
  const liquidatedCount = sentEvents.filter((e) => isEventLiquidated(e)).length;

  function handleOpenClearance(event: Event) {
    const defaults = resolveEventSignatories(event);
    const typeName = eventTypes.find((t) => t.id === event.typeId)?.name || "Academic Seminar";

    const pdfBlob = generateClearancePdfBlob(event, {
      organizationName: org?.name || defaults.organizationName,
      organizationLogoUrl: org?.logoUrl,
      organizationCode: org?.code,
      eventTypeName: typeName,
      officerName: defaults.officerName,
      adviserName: defaults.adviserName,
      deanName: defaults.deanName,
      viewerRole: "student",
    });

    const cleanFileName = `Clearance_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    openPdfBlobInNewTab(pdfBlob, cleanFileName);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">SDS Workspace</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Track APF submissions, activity clearances, and liquidation compliance dispatched to Student Development Services (SDS).
          </p>
        </div>
        <RefreshButton />
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <SkeletonTable rows={5} cols={4} />
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 flex items-start gap-3">
            <Skeleton className="w-5 h-5 rounded-full flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-3.5 w-3/4 rounded" />
              <Skeleton className="h-3.5 w-44 rounded" />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Key Metrics Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-5 flex items-center gap-4 border border-[var(--border)] shadow-2xs">
              <div className="w-11 h-11 bg-orange-50 dark:bg-orange-950/40 rounded-xl flex items-center justify-center text-[var(--primary)] flex-shrink-0">
                <Mail size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{totalSent}</p>
                <p className="text-xs font-mono text-[var(--muted-foreground)]">Documents Sent to SDS</p>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4 border border-[var(--border)] shadow-2xs">
              <div className="w-11 h-11 bg-blue-50 dark:bg-blue-950/40 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 flex-shrink-0">
                <Clock size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{pendingSdsCount}</p>
                <p className="text-xs font-mono text-[var(--muted-foreground)]">Awaiting SDS Clearance</p>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4 border border-[var(--border)] shadow-2xs">
              <div className="w-11 h-11 bg-amber-50 dark:bg-amber-950/40 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400 flex-shrink-0">
                <FileSpreadsheet size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{pendingLiquidationCount}</p>
                <p className="text-xs font-mono text-[var(--muted-foreground)]">Pending Liquidation</p>
              </div>
            </Card>

            <Card className="p-5 flex items-center gap-4 border border-[var(--border)] shadow-2xs">
              <div className="w-11 h-11 bg-green-50 dark:bg-green-950/40 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                <CheckCircle size={22} />
              </div>
              <div>
                <p className="text-2xl font-bold text-[var(--foreground)]">{liquidatedCount}</p>
                <p className="text-xs font-mono text-[var(--muted-foreground)]">Liquidated Events</p>
              </div>
            </Card>
          </div>

          {/* Submitted Documents Log Table */}
          <Card className="border border-[var(--border)] shadow-2xs overflow-hidden">
            <CardHeader className="border-b border-[var(--border)] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="font-semibold text-[var(--foreground)]">Submitted Documents Log</h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Official APF packages dispatched to Student Development Services upon Dean executive endorsement.
                </p>
              </div>
              <span className="text-xs font-mono text-[var(--muted-foreground)] bg-[var(--muted)] px-2.5 py-1 rounded-md border border-[var(--border)] w-fit">
                {sentEvents.length} {sentEvents.length === 1 ? "record" : "records"} logged
              </span>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[var(--muted)]/60 border-b border-[var(--border)]">
                    <th className="px-5 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Event Proposal</th>
                    <th className="px-5 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Date Dispatched</th>
                    <th className="px-5 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Documents</th>
                    <th className="px-5 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {sentEvents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-12 text-center text-[var(--muted-foreground)]">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Mail size={32} className="opacity-40 text-[var(--muted-foreground)]" />
                          <p className="font-medium text-sm">No documents sent to SDS yet.</p>
                          <p className="text-xs text-[var(--muted-foreground)] max-w-sm">
                            When an activity proposal receives Dean approval, it is automatically dispatched to SDS and appears in this workspace.
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    sentEvents.map((e) => {
                      const dispatchedTimestamp = getDeanDispatchedAt(e.id, eventSignatories, auditTrail);
                      const displayDate = dispatchedTimestamp ? formatDate(dispatchedTimestamp) : formatDate(e.createdAt);
                      const fullDateTip = dispatchedTimestamp ? formatDateTime(dispatchedTimestamp) : formatDateTime(e.createdAt);

                      return (
                        <tr key={e.id} className="hover:bg-[var(--muted)]/40 transition">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-[var(--foreground)]">{e.name}</div>
                            <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--muted-foreground)] font-mono">
                              <span>{e.category || "Organizational"}</span>
                              <span>·</span>
                              <span>{e.setting || "On-campus"}</span>
                              {e.mode && (
                                <>
                                  <span>·</span>
                                  <span>{e.mode}</span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4 font-mono text-xs text-[var(--foreground)]" title={fullDateTip}>
                            <div>{displayDate}</div>
                            {dispatchedTimestamp && (
                              <span className="text-[10px] text-[var(--muted-foreground)]">
                                Dispatched
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* APF Document Link */}
                              {e.apfUrl ? (
                                <a
                                  href={resolvePdfUrl(e.apfUrl, "apf")}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] bg-orange-50 hover:bg-orange-100 text-orange-700 font-mono px-2 py-0.5 rounded border border-orange-200 transition"
                                  title="View Activity Proposal Form (APF)"
                                >
                                  <span>APF</span>
                                  <ExternalLink size={10} />
                                </a>
                              ) : (
                                <span className="text-[10px] bg-gray-50 text-gray-500 font-mono px-2 py-0.5 rounded border border-gray-200">
                                  APF
                                </span>
                              )}

                              {/* Appendices Link */}
                              {(e.appendices?.length ?? 0) > 0 && (
                                <a
                                  href={resolvePdfUrl(e.appendices![0], "appendix")}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[10px] bg-blue-50 hover:bg-blue-100 text-blue-700 font-mono px-2 py-0.5 rounded border border-blue-200 transition"
                                  title={`View Appendices (${e.appendices!.length})`}
                                >
                                  <span>Appendix ({e.appendices!.length})</span>
                                  <ExternalLink size={10} />
                                </a>
                              )}

                              {/* Activity Clearance Certificate PDF Generator */}
                              <button
                                type="button"
                                onClick={() => handleOpenClearance(e)}
                                className="inline-flex items-center gap-1 text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-700 font-mono px-2 py-0.5 rounded border border-purple-200 transition cursor-pointer"
                                title="Open Official Activity Clearance Certificate PDF"
                              >
                                <ShieldCheck size={11} />
                                <span>Clearance</span>
                              </button>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span className={`inline-block text-[11px] font-mono px-2.5 py-0.5 rounded-full font-semibold border ${getStatusBadgeClass(e.status, e.setting)}`}>
                              {e.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* SDS Office Contact & Protocol Banner */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[var(--primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
            <Mail size={18} />
          </div>
          <div>
            <p className="font-semibold text-[var(--foreground)] text-sm">Student Development Services (SDS) Office</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              All Activity Proposal Forms (APF) and Appendices are automatically forwarded to SDS upon Dean executive endorsement. Activity clearances and finance ledgers unlock upon SDS authorization.
            </p>
            <p className="text-xs font-mono text-[var(--primary)] mt-1.5 font-medium">sds@email.lcup.edu.ph</p>
          </div>
        </div>
      </div>
    </div>
  );
}