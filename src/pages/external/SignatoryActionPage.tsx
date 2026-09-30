import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import {
  ShieldCheck,
  FileText,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  XCircle,
  ArrowRight,
  ExternalLink,
  Calendar,
  MapPin,
  Clock,
  Building2,
  Lock,
  Download,
  Eye,
  Send,
  Loader2,
  FileSpreadsheet,
  Tag,
  Compass,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatEventSchedule,
  statusColors,
  getStatusBadgeClass,
  resolvePdfUrl,
  Event,
  getEventTypeById,
  resolveEventSignatories,
  isWebUrl,
  toWebUrl,
} from "../../services/dataService";
import { generateClearancePdfBlob, openPdfBlobInNewTab } from "../../services/pdfDocuments";
import { dispatchCmoClearanceEmail } from "../../services/mailerService";
import { Button, Textarea, Dialog } from "../../components/ui";

interface SignatoryActionPageProps {
  forcedRole?: "sds" | "cmo";
}

export default function SignatoryActionPage({ forcedRole }: SignatoryActionPageProps) {
  const [searchParams] = useSearchParams();
  const { events, organizations, users, eventTypes, eventSignatories, auditTrail, setEventStatus, isLoading } = useApp();
  const { toast } = useToast();

  const eventId = searchParams.get("event") || searchParams.get("id") || "";
  const token = searchParams.get("token") || "";
  const actionParam = searchParams.get("action") as "accept" | "revision" | "reject" | null;

  // Determine signatory role from URL path or prop
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const resolvedRole: "sds" | "cmo" = forcedRole || (path.includes("cmo") ? "cmo" : "sds");

  const event = events.find((e) => e.id === eventId);
  const org = organizations.find((o) => o.id === event?.organizationId);
  const typeObj = eventTypes.find((t) => t.id === event?.typeId);

  const roleTitle = resolvedRole === "cmo" ? "Crisis Management Office (CMO)" : "Student Development & Services (SDS)";
  const roleBadge = resolvedRole === "cmo" ? "Crisis Management Clearance" : "Institutional Student Affairs Clearance";

  const isOffCampus = event?.setting === "Off-campus";

  // Check role-specific actions from eventSignatories and auditTrail
  const roleSignatories = (eventSignatories || [])
    .filter((s) => s.eventId === event?.id && (s.role === resolvedRole || (resolvedRole === "sds" && (s.role as string) === "sds") || (resolvedRole === "cmo" && (s.role as string) === "cmo")))
    .sort((a, b) => new Date(b.signedAt || b.createdAt || 0).getTime() - new Date(a.signedAt || a.createdAt || 0).getTime());
  const latestRoleSig = roleSignatories[0];

  const roleAudits = (auditTrail || [])
    .filter((a) => a.eventId === event?.id && (
      resolvedRole === "sds"
        ? (a.actorRole === "sds" || a.userId === "sds-external-token" || a.action === "SDS Authorized" || (a.details && a.details.toLowerCase().includes("sds")))
        : (a.actorRole === "cmo" || a.userId === "cmo-external-token" || a.action === "CMO Authorized" || (a.details && a.details.toLowerCase().includes("cmo")))
    ))
    .sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  const latestRoleAudit = roleAudits[0];

  // Check token match if token was provided in URL query string (ensures old email links cannot action new rounds)
  const isTokenObsolete = Boolean(
    (resolvedRole === "sds" && token && event?.sdsActionToken && token !== event.sdsActionToken) ||
    (resolvedRole === "cmo" && token && event?.cmoActionToken && token !== event.cmoActionToken)
  );

  // Check if event is in an active actionable state for this signatory in the CURRENT round
  const isSdsTurn = !isTokenObsolete && resolvedRole === "sds" && (event?.status === "Approved" || event?.status === "For Approval");
  const isCmoTurn = !isTokenObsolete && resolvedRole === "cmo" && isOffCampus && event?.status === "SDS Authorized";
  const canPerformAction = isSdsTurn || isCmoTurn;

  // If not currently actionable, determine why (already approved in current round, requested revision, rejected, or awaiting preceding stages)
  const sdsAlreadyApproved = !canPerformAction && resolvedRole === "sds" && (
    event?.status === "SDS Authorized" ||
    event?.status === "CMO Authorized" ||
    event?.status === "Completed" ||
    event?.status === "Closed" ||
    (event?.status === "Pending Revision" && isOffCampus && latestRoleAudit?.action === "SDS Authorized")
  );

  const cmoAlreadyApproved = !canPerformAction && resolvedRole === "cmo" && (
    event?.status === "CMO Authorized" ||
    event?.status === "Completed" ||
    event?.status === "Closed"
  );

  const isApprovedByThisRole = !isTokenObsolete && (sdsAlreadyApproved || cmoAlreadyApproved);

  const roleRequestedRevision = !canPerformAction && !isApprovedByThisRole && !isTokenObsolete && (
    latestRoleSig?.status === "Revision Requested" ||
    latestRoleAudit?.action === "Requested Revision" ||
    (event?.status === "Pending Revision" && (
      resolvedRole === "cmo"
        ? (latestRoleAudit?.details?.toLowerCase().includes("cmo") || false)
        : (latestRoleAudit?.details?.toLowerCase().includes("sds") || !isOffCampus)
    ))
  );

  const roleRejected = !canPerformAction && !isApprovedByThisRole && !isTokenObsolete && (
    latestRoleSig?.status === "Rejected" ||
    latestRoleAudit?.action === "Proposal Rejected" ||
    (event?.status === "Rejected" && (
      resolvedRole === "cmo"
        ? (latestRoleAudit?.details?.toLowerCase().includes("cmo") || false)
        : (latestRoleAudit?.details?.toLowerCase().includes("sds") || false)
    ))
  );

  const [activeAction, setActiveAction] = useState<"accept" | "revision" | "reject" | null>(
    canPerformAction ? actionParam : null
  );
  const [feedbackText, setFeedbackText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Sync activeAction if event status changes
  useEffect(() => {
    if (!canPerformAction) {
      setActiveAction(null);
    }
  }, [canPerformAction]);

  // Find latest recorded feedback / remarks for this role specifically
  const existingFeedback =
    latestRoleSig?.feedback ||
    (resolvedRole === "sds" ? event?.sdsFeedback : event?.cmoFeedback) ||
    latestRoleAudit?.remarks ||
    (latestRoleAudit?.details?.includes("Remarks:") ? latestRoleAudit.details.split("Remarks:")[1]?.trim() : undefined);

  function handlePreConfirm() {
    if (!event || !activeAction) return;
    if ((activeAction === "revision" || activeAction === "reject") && !feedbackText.trim()) {
      toast.error("Feedback Required", "Please provide detailed notes or remarks for this action.");
      return;
    }
    setShowConfirmModal(true);
  }

  async function handleConfirmAction() {
    if (!event) return;
    if (!activeAction) return;

    if ((activeAction === "revision" || activeAction === "reject") && !feedbackText.trim()) {
      toast.error("Feedback Required", "Please provide detailed notes or remarks for this action.");
      return;
    }

    setIsProcessing(true);
    try {
      if (activeAction === "accept") {
        if (resolvedRole === "sds") {
          const cmoToken = isOffCampus ? (event.cmoActionToken || `token_cmo_${Date.now()}`) : undefined;
          
          // SDS Authorization (atomic with cmoActionToken if off-campus)
          setEventStatus(
            event.id,
            "SDS Authorized",
            feedbackText.trim() || undefined,
            "sds-external-token",
            cmoToken ? { cmoActionToken: cmoToken } : undefined
          );

          // If off-campus, dispatch to CMO with secure token
          if (isOffCampus && cmoToken) {
            const sig = resolveEventSignatories(event, users, organizations);
            await dispatchCmoClearanceEmail({
              event: { ...event, status: "SDS Authorized", cmoActionToken: cmoToken },
              organizationName: org?.name || "Student Organization",
              eventTypeName: typeObj?.name || "Institutional Event",
              officerName: sig.officerName,
              adviserName: sig.adviserName,
              deanName: sig.deanName,
              actionToken: cmoToken,
            });

            setActionSuccess("Event Authorized by SDS. The clearance transmission has been forwarded to the Crisis Management Office (CMO) for off-campus review.");
          } else {
            setActionSuccess("Event Authorized by SDS. Institutional clearance has been granted and the Finance Ledger has been unlocked.");
          }
        } else {
          // CMO Authorization (Off-campus)
          setEventStatus(event.id, "CMO Authorized", feedbackText.trim() || undefined, "cmo-external-token");
          setActionSuccess("Crisis Management Office clearance granted. Institutional clearance is complete and the Finance Ledger is now unlocked.");
        }
      } else if (activeAction === "revision") {
        setEventStatus(event.id, "Pending Revision", feedbackText.trim(), resolvedRole === "cmo" ? "cmo-external-token" : "sds-external-token");
        setActionSuccess(`Revision request transmitted to student organizers with your feedback notes.`);
      } else if (activeAction === "reject") {
        setEventStatus(event.id, "Rejected", feedbackText.trim(), resolvedRole === "cmo" ? "cmo-external-token" : "sds-external-token");
        setActionSuccess(`Event proposal has been marked as Rejected.`);
      }
      setShowConfirmModal(false);
      toast.success("Action Recorded", "Clearance status updated successfully.");
    } catch (err: any) {
      console.error("Signatory action error:", err);
      toast.error("Action Failed", err.message || "Could not complete signatory action.");
    } finally {
      setIsProcessing(false);
    }
  }

  function handlePreviewClearance() {
    if (!event) return;
    try {
      const sig = resolveEventSignatories(event, users, organizations);
      const pdfBlob = generateClearancePdfBlob(event, {
        organizationName: org?.name || "Student Organization",
        eventTypeName: typeObj?.name || "Institutional Event",
        officerName: sig.officerName,
        adviserName: sig.adviserName,
        deanName: sig.deanName,
        viewerRole: "dean",
      });
      openPdfBlobInNewTab(pdfBlob, `Event_Clearance_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`);
    } catch (err) {
      toast.error("Preview Failed", "Could not compile Clearance Certificate PDF.");
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <Loader2 size={36} className="animate-spin text-orange-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Loading Clearance Action Portal...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Event Record Not Found</h2>
          <p className="text-sm text-slate-600">
            The verification token or event identifier in this link is invalid or may have expired.
          </p>
          <Link to="/" className="inline-block">
            <Button variant="outline" size="sm">Return to COLLinSight Portal</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Top Brand Bar ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-lg shadow-sm">
              C
            </div>
            <div>
              <span className="text-lg font-bold text-slate-900 tracking-tight">COLLinSight</span>
              <span className="text-xs text-orange-600 font-semibold block">Institutional Clearance Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-white border border-slate-200 text-slate-700 font-bold uppercase tracking-wider shadow-xs">
              {roleBadge}
            </span>
          </div>
        </div>

        {/* ── Action Success Banner ── */}
        {actionSuccess && (
          <div className="bg-emerald-50 border-2 border-emerald-500/60 rounded-2xl p-6 shadow-sm text-emerald-950 animate-in fade-in slide-in-from-top-4 duration-300 space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-emerald-950">Action Completed Successfully</h3>
                <p className="text-sm text-emerald-800 leading-relaxed">{actionSuccess}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Event Summary Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200">
                  {event.clearanceDocRef || `APF-${event.id.slice(-6).toUpperCase()}`}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${getStatusBadgeClass(event.status, event.setting)}`}>
                  {event.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight leading-snug">{event.name}</h1>
              <p className="text-sm text-slate-600 font-medium">
                {org?.name || "Student Organization"} ({org?.code || "CITE"}) · {typeObj?.name || "Institutional Event"}
              </p>
            </div>

            <div className="text-right sm:ml-auto">
              <span className="text-xs font-semibold text-slate-500 block uppercase tracking-wider">Proposed Budget</span>
              <span className="text-2xl font-bold text-orange-600 font-mono">{formatCurrency(event.proposedBudget)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-slate-100 text-sm">
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Calendar size={15} className="text-orange-500 flex-shrink-0" />
                <span className="font-medium text-slate-500 min-w-[70px]">Schedule:</span>
                <span className="font-semibold text-slate-900">{formatEventSchedule(event.dateStart, event.dateEnd)}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Tag size={15} className="text-orange-500 flex-shrink-0" />
                <span className="font-medium text-slate-500 min-w-[70px]">Category:</span>
                <span className="font-semibold text-slate-900">{event.category || "Organizational"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <MapPin size={15} className="text-orange-500 flex-shrink-0" />
                <span className="font-medium text-slate-500 min-w-[70px]">Location:</span>
                <span className="font-semibold text-slate-900">
                  {isWebUrl(event.location) ? (
                    <a href={toWebUrl(event.location)} target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline inline-flex items-center gap-1">
                      {event.location} <ExternalLink size={12} />
                    </a>
                  ) : (
                    event.location || (event.mode === "Online/Virtual" ? "Online Platform" : "Venue TBD")
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Clock size={15} className="text-orange-500 flex-shrink-0" />
                <span className="font-medium text-slate-500 min-w-[95px]">Mode:</span>
                <span className="font-semibold text-slate-900">{event.mode}</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Compass size={15} className="text-orange-500 flex-shrink-0" />
                <span className="font-medium text-slate-500 min-w-[95px]">Setting:</span>
                <span className={`font-semibold ${isOffCampus ? "text-orange-600 font-bold" : "text-emerald-700 font-semibold"}`}>
                  {event.setting || "On-campus"}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Building2 size={15} className="text-orange-500 flex-shrink-0" />
                <span className="font-medium text-slate-500 min-w-[95px]">Reviewing Office:</span>
                <span className="font-semibold text-orange-600">{roleTitle}</span>
              </div>
            </div>
          </div>

          {/* Description & Requisites */}
          {event.description && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Event Overview</span>
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{event.description}</p>
              </div>
            </div>
          )}

          {/* ── Document Attachments Checklist ── */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Compliance Documents & Attachments</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Clearance PDF - Prominent Accent */}
              <div className="bg-orange-50/50 border-2 border-orange-400/80 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">Clearance Certificate</p>
                    <p className="text-[11px] text-orange-700 font-medium truncate">Dean Endorsed</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handlePreviewClearance} className="text-xs h-7 gap-1 border-orange-300 text-orange-700 bg-white hover:bg-orange-100 hover:text-orange-800 shadow-xs">
                  <Eye size={12} /> View
                </Button>
              </div>

              {/* APF */}
              {event.apfUrl && (
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      APF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">Activity Proposal Form</p>
                      <p className="text-[11px] text-slate-500 truncate">Official APF Submission</p>
                    </div>
                  </div>
                  <a href={resolvePdfUrl(event.apfUrl, "apf")} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1 border-slate-200 text-slate-700 hover:bg-slate-50">
                      <ExternalLink size={12} /> View
                    </Button>
                  </a>
                </div>
              )}

              {/* Parental Consent Form (PCF for Off-Campus) */}
              {isOffCampus && (
                <div className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      PCF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">Parental Consent Form (PCF)</p>
                      <p className="text-[11px] text-slate-500 truncate">Required Off-Campus Form</p>
                    </div>
                  </div>
                  {event.pcfUrl ? (
                    <a href={resolvePdfUrl(event.pcfUrl, "appendix")} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1 border-slate-200 text-slate-700 hover:bg-slate-50">
                        <ExternalLink size={12} /> View
                      </Button>
                    </a>
                  ) : (
                    <span className="text-[11px] text-rose-500 font-semibold px-2 py-0.5 rounded bg-rose-50 border border-rose-200">Not Uploaded</span>
                  )}
                </div>
              )}

              {/* Appendices */}
              {event.appendices && event.appendices.map((appUrl, idx) => {
                const isXls = appUrl.toLowerCase().includes(".xls") || appUrl.toLowerCase().includes(".csv");
                return (
                  <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3.5 flex items-center justify-between gap-3 shadow-xs hover:border-slate-300 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${isXls ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-purple-50 text-purple-700 border border-purple-200"}`}>
                        {isXls ? <FileSpreadsheet size={14} /> : "APX"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">Appendix {idx + 1}</p>
                        <p className="text-[11px] text-slate-500 truncate">{appUrl.replace(/^.*[\\/]/, "")}</p>
                      </div>
                    </div>
                    <a href={resolvePdfUrl(appUrl, "appendix")} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1 border-slate-200 text-slate-700 hover:bg-slate-50">
                        <ExternalLink size={12} /> View
                      </Button>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Status Banner for Already-Actioned or Non-Actionable Events ── */}
          {!canPerformAction && !actionSuccess && event && (
            <div className="pt-4 border-t border-slate-100 space-y-4">
              {/* 0. Obsolete Link / Token Check */}
              {isTokenObsolete && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs text-amber-950 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle size={22} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-amber-950">Authorization Link Superseded</h3>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        This authorization link is from a previous clearance round that has already been superseded by a newer request. Please use the newest email link dispatched to your inbox for the current proposal round.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 1. This Specific Role Already Approved */}
              {!isTokenObsolete && isApprovedByThisRole && (
                <div className="bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl p-5 shadow-xs text-emerald-950 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-700 flex items-center justify-center flex-shrink-0">
                      <CheckCircle size={22} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-emerald-950">
                        {resolvedRole === "sds"
                          ? isOffCampus && event.status === "SDS Authorized"
                            ? "SDS Authorized · Dispatched to CMO"
                            : "SDS Clearance Authorization Complete"
                          : "Crisis & Risk Safety Clearance Granted"}
                      </h3>
                      <p className="text-xs text-emerald-800 leading-relaxed">
                        {resolvedRole === "sds"
                          ? isOffCampus && event.status === "SDS Authorized"
                            ? "You have already authorized this event. The clearance transmission has been forwarded to the Crisis Management Office (CMO) for off-campus safety review."
                            : "You have already granted SDS authorization for this event. Institutional clearance is complete and the finance ledger has been unlocked."
                          : "The Crisis Management Office has already endorsed and granted safety clearance for this off-campus event."}
                      </p>
                      {/* Secondary note if SDS approved but event is currently with CMO or undergoing CMO revisions */}
                      {resolvedRole === "sds" && event.status === "Pending Revision" && (
                        <div className="mt-2 text-[11px] font-semibold text-amber-900 bg-amber-100/80 border border-amber-300 rounded-lg p-2.5">
                          Status Notice: This off-campus proposal is currently undergoing revisions requested by the Crisis Management Office (CMO). Your prior SDS authorization remains active.
                        </div>
                      )}
                    </div>
                  </div>
                  {existingFeedback && (
                    <div className="bg-white/90 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900">
                      <span className="font-bold block mb-1 uppercase tracking-wider text-[10px] text-emerald-700 font-mono">Recorded Authorization Remarks:</span>
                      <p className="italic leading-relaxed">"{existingFeedback}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* 2. This Specific Role Requested Revision */}
              {!isApprovedByThisRole && roleRequestedRevision && (
                <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 shadow-xs text-amber-950 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center flex-shrink-0">
                      <RotateCcw size={22} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-amber-950">Performed Action: Revision Requested</h3>
                      <p className="text-xs text-amber-800 leading-relaxed">
                        This activity proposal has already been returned to the student organizers with your revision feedback. No further signatory action is required at this time until the revisions are resubmitted.
                      </p>
                    </div>
                  </div>
                  {existingFeedback && (
                    <div className="bg-white/90 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900">
                      <span className="font-bold block mb-1 uppercase tracking-wider text-[10px] text-amber-700 font-mono">Recorded Revision Remarks:</span>
                      <p className="italic leading-relaxed">"{existingFeedback}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* 3. This Specific Role Rejected */}
              {!isApprovedByThisRole && !roleRequestedRevision && roleRejected && (
                <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-5 shadow-xs text-rose-950 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 border border-rose-300 text-rose-700 flex items-center justify-center flex-shrink-0">
                      <XCircle size={22} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-rose-950">Performed Action: Proposal Rejected</h3>
                      <p className="text-xs text-rose-800 leading-relaxed">
                        This event proposal was marked as Rejected and its allocated proposed budget was revoked.
                      </p>
                    </div>
                  </div>
                  {existingFeedback && (
                    <div className="bg-white/90 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900">
                      <span className="font-bold block mb-1 uppercase tracking-wider text-[10px] text-rose-700 font-mono">Recorded Rejection Reason:</span>
                      <p className="italic leading-relaxed">"{existingFeedback}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. Awaiting Preceding Stages */}
              {!isTokenObsolete && !isApprovedByThisRole && !roleRequestedRevision && !roleRejected && (
                <div className="bg-slate-50 border-2 border-slate-200 rounded-2xl p-5 shadow-xs text-slate-800 space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-200/80 text-slate-600 flex items-center justify-center flex-shrink-0">
                      <Clock size={22} />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-base font-bold text-slate-900">Awaiting Preceding Clearance Stages</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">
                        This proposal is currently in the <strong>{event.status}</strong> stage and has not yet reached {roleTitle} authorization.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Signatory Action Selector & Form (Only when actionable) ── */}
          {canPerformAction && !actionSuccess && (
            <div className="pt-4 border-t border-slate-100 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{roleTitle} Authorization</h3>
                  <p className="text-xs text-slate-500">Select an institutional action to record in the compliance ledger.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveAction("accept")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeAction === "accept"
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-500/30 shadow-md"
                        : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs"
                    }`}
                  >
                    <CheckCircle size={14} /> Accept & Authorize
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveAction("revision")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeAction === "revision"
                        ? "bg-amber-600 text-white ring-2 ring-amber-500/30 shadow-md"
                        : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs"
                    }`}
                  >
                    <RotateCcw size={14} /> Request Revision
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveAction("reject")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeAction === "reject"
                        ? "bg-rose-600 text-white ring-2 ring-rose-500/30 shadow-md"
                        : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-xs"
                    }`}
                  >
                    <XCircle size={14} /> Reject Proposal
                  </button>
                </div>
              </div>

              {/* Action Details Form Box */}
              {activeAction && (
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 space-y-4 animate-in fade-in-50 duration-200">
                  {activeAction === "accept" && (
                    <div className="space-y-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-xs text-emerald-900">
                        {resolvedRole === "sds" ? (
                          isOffCampus ? (
                            <p>
                              <strong>On Confirmation:</strong> This event will be marked as <strong>SDS Authorized</strong> and dispatched to the <strong>Crisis Management Office (CMO)</strong> for off-campus clearance.
                            </p>
                          ) : (
                            <p>
                              <strong>On Confirmation:</strong> This event will be marked as <strong>SDS Authorized</strong> and the <strong>Finance Ledger</strong> will be unlocked for student disbursements.
                            </p>
                          )
                        ) : (
                          <p>
                            <strong>On Confirmation:</strong> This off-campus event will be granted final institutional clearance (<strong>CMO Authorized</strong>).
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Optional Authorization Remarks:
                        </label>
                        <Textarea
                          placeholder="Add any formal remarks, guidelines, or conditions for this authorization..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={2}
                          className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {activeAction === "revision" && (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                        <p>
                          <strong>Revision Request:</strong> The event proposal will be sent back to the student organizers with status <strong>Pending Revision</strong>.
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Required Revision Feedback: <span className="text-rose-500">*</span>
                        </label>
                        <Textarea
                          placeholder="Clearly specify which adjustments, safety protocols, or document updates are required before clearance can be granted..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={3}
                          required
                          className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  {activeAction === "reject" && (
                    <div className="space-y-3">
                      <div className="bg-rose-50 border border-rose-200 rounded-lg p-3 text-xs text-rose-900">
                        <p>
                          <strong>Proposal Rejection:</strong> The event will be nullified (status <strong>Rejected</strong>).
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 block mb-1">
                          Required Rejection Reason: <span className="text-rose-500">*</span>
                        </label>
                        <Textarea
                          placeholder="Provide the official justification for why this activity proposal cannot be cleared..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={3}
                          required
                          className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 text-xs focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setActiveAction(null)}
                      disabled={isProcessing}
                      className="text-xs text-slate-600 hover:text-slate-900"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handlePreConfirm}
                      disabled={isProcessing || ((activeAction === "revision" || activeAction === "reject") && !feedbackText.trim())}
                      className={`text-xs font-bold gap-1.5 cursor-pointer ${
                        activeAction === "accept"
                          ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                          : activeAction === "revision"
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : "bg-rose-600 hover:bg-rose-500 text-white"
                      }`}
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 size={13} className="animate-spin" /> Processing...
                        </>
                      ) : activeAction === "accept" ? (
                        <>
                          <CheckCircle size={13} /> Confirm Authorization
                        </>
                      ) : activeAction === "revision" ? (
                        <>
                          <Send size={13} /> Submit Revision Request
                        </>
                      ) : (
                        <>
                          <XCircle size={13} /> Confirm Rejection
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Action Confirmation Dialog ── */}
        <Dialog
          open={showConfirmModal}
          onClose={() => {
            if (!isProcessing) setShowConfirmModal(false);
          }}
          size="md"
          title={
            activeAction === "accept"
              ? `Confirm ${resolvedRole === "cmo" ? "CMO Clearance" : "SDS Authorization"}`
              : activeAction === "revision"
              ? "Confirm Revision Request"
              : "Confirm Proposal Rejection"
          }
        >
          <div className="p-6 space-y-5">
            {/* Visual Icon & Explanatory Text */}
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-xs ${
                  activeAction === "accept"
                    ? "bg-emerald-100 text-emerald-700 border border-emerald-300"
                    : activeAction === "revision"
                    ? "bg-amber-100 text-amber-700 border border-amber-300"
                    : "bg-rose-100 text-rose-700 border border-rose-300"
                }`}
              >
                {activeAction === "accept" && <CheckCircle size={24} />}
                {activeAction === "revision" && <AlertTriangle size={24} />}
                {activeAction === "reject" && <XCircle size={24} />}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-900">
                  {activeAction === "accept"
                    ? `Authorize '${event.name}'?`
                    : activeAction === "revision"
                    ? `Return '${event.name}' for Revision?`
                    : `Reject Proposal '${event.name}'?`}
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeAction === "accept"
                    ? resolvedRole === "sds"
                      ? isOffCampus
                        ? "Granting SDS authorization will endorse this off-campus activity and dispatch it to the Crisis Management Office (CMO) for off-campus safety review."
                        : "Granting SDS authorization will finalize institutional student affairs clearance and unlock the organization's finance ledger."
                      : "Endorsing this proposal will finalize Crisis Management safety clearance and complete institutional clearance."
                    : activeAction === "revision"
                    ? "This activity proposal will be returned to the student organizers with your revision feedback notes. Signatory review will resume once revised."
                    : "This will mark the activity proposal as Rejected and prevent further clearance processing."}
                </p>
              </div>
            </div>

            {/* Feedback / Remarks Callout Box */}
            {feedbackText.trim() && (
              <div
                className={`rounded-xl p-3.5 text-xs border ${
                  activeAction === "accept"
                    ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                    : activeAction === "revision"
                    ? "bg-amber-50/70 border-amber-200 text-amber-950"
                    : "bg-rose-50/70 border-rose-200 text-rose-950"
                }`}
              >
                <span className="font-bold block uppercase tracking-wider text-[10px] opacity-80 mb-1 font-mono">
                  {activeAction === "accept"
                    ? "Attached Endorsement Remarks:"
                    : activeAction === "revision"
                    ? "Attached Revision Notes:"
                    : "Attached Rejection Reason:"}
                </span>
                <p className="italic leading-relaxed whitespace-pre-wrap">"{feedbackText.trim()}"</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
                disabled={isProcessing}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleConfirmAction}
                disabled={isProcessing}
                className={`text-xs font-bold gap-1.5 cursor-pointer text-white ${
                  activeAction === "accept"
                    ? "bg-emerald-600 hover:bg-emerald-500"
                    : activeAction === "revision"
                    ? "bg-amber-600 hover:bg-amber-500"
                    : "bg-rose-600 hover:bg-rose-500"
                }`}
              >
                {isProcessing ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Processing...
                  </>
                ) : activeAction === "accept" ? (
                  <>
                    <CheckCircle size={13} /> Confirm & Authorize
                  </>
                ) : activeAction === "revision" ? (
                  <>
                    <Send size={13} /> Send Revision Request
                  </>
                ) : (
                  <>
                    <XCircle size={13} /> Confirm Rejection
                  </>
                )}
              </Button>
            </div>
          </div>
        </Dialog>

        {/* ── Footer ── */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p>La Consolacion University Philippines · College of Information Technology & Engineering</p>
          <p>Valenzuela St., Capitol View Park, City of Malolos, Bulacan</p>
        </div>

      </div>
    </div>
  );
}
