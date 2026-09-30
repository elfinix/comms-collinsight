import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import {
  ShieldCheck,
  FileText,
  CheckCircle,
  AlertTriangle,
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
} from "../../services/dataService";
import { generateClearancePdfBlob, openPdfBlobInNewTab } from "../../services/pdfDocuments";
import { dispatchCmoClearanceEmail } from "../../services/mailerService";
import { Button, Textarea, Dialog } from "../../components/ui";

interface SignatoryActionPageProps {
  forcedRole?: "sds" | "cmo";
}

export default function SignatoryActionPage({ forcedRole }: SignatoryActionPageProps) {
  const [searchParams] = useSearchParams();
  const { events, organizations, users, eventTypes, setEventStatus, addAuditEntry, updateEvent, isLoading } = useApp();
  const { toast } = useToast();

  const eventId = searchParams.get("event") || searchParams.get("id") || "";
  const token = searchParams.get("token") || "";
  const actionParam = searchParams.get("action") as "accept" | "revision" | "reject" | null;

  // Determine signatory role from URL path or prop
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const resolvedRole: "sds" | "cmo" = forcedRole || (path.includes("cmo") ? "cmo" : "sds");

  const [activeAction, setActiveAction] = useState<"accept" | "revision" | "reject" | null>(actionParam);
  const [feedbackText, setFeedbackText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const event = events.find((e) => e.id === eventId);
  const org = organizations.find((o) => o.id === event?.organizationId);
  const typeObj = eventTypes.find((t) => t.id === event?.typeId);

  const roleTitle = resolvedRole === "cmo" ? "Crisis Management Office (CMO)" : "Student Development & Services (SDS)";
  const roleBadge = resolvedRole === "cmo" ? "Crisis Management Clearance" : "Institutional Student Affairs Clearance";

  const isOffCampus = event?.setting === "Off-campus";

  // Check if event is in valid state for this signatory
  const isSdsTurn = resolvedRole === "sds" && (event?.status === "Approved" || event?.status === "For Approval");
  const isCmoTurn = resolvedRole === "cmo" && isOffCampus && event?.status === "SDS Authorized";
  const isAlreadyProcessed = event
    ? resolvedRole === "sds"
      ? ["SDS Authorized", "CMO Authorized", "Completed", "Closed"].includes(event.status)
      : ["CMO Authorized", "Completed", "Closed"].includes(event.status)
    : false;

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
          // SDS Authorization
          setEventStatus(event.id, "SDS Authorized", feedbackText.trim() || undefined, "sds-external-token");

          // If off-campus, dispatch to CMO with secure token
          if (isOffCampus) {
            const cmoToken = event.cmoActionToken || `token_cmo_${Date.now()}`;
            updateEvent(event.id, { cmoActionToken: cmoToken });

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
        setActionSuccess(`Event proposal has been marked as Rejected and the proposed budget allocation has been revoked.`);
      }
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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0a1128] to-slate-900 text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Top Brand Bar ── */}
        <div className="flex items-center justify-between gap-4 flex-wrap pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-lg shadow-md">
              C
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">COLLinSight</span>
              <span className="text-xs text-orange-400 font-semibold block">Institutional Clearance Portal</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-bold uppercase tracking-wider">
              {roleBadge}
            </span>
          </div>
        </div>

        {/* ── Action Success Banner ── */}
        {actionSuccess && (
          <div className="bg-emerald-950/80 border-2 border-emerald-500/80 rounded-2xl p-6 shadow-xl text-emerald-100 animate-in fade-in slide-in-from-top-4 duration-300 space-y-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={22} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white">Action Completed Successfully</h3>
                <p className="text-sm text-emerald-200/90 leading-relaxed">{actionSuccess}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Event Summary Card ── */}
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-md bg-orange-500/20 text-orange-300 border border-orange-500/30">
                  {event.clearanceDocRef || `APF-${event.id.slice(-6).toUpperCase()}`}
                </span>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${getStatusBadgeClass(event.status, event.setting)}`}>
                  {event.status}
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {event.category || "Organizational"}
                </span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${isOffCampus ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"}`}>
                  {event.setting || "On-campus"}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight leading-snug">{event.name}</h1>
              <p className="text-sm text-slate-300 font-medium">
                {org?.name || "Student Organization"} ({org?.code || "CITE"}) · {typeObj?.name || "Institutional Event"}
              </p>
            </div>

            <div className="text-right sm:ml-auto">
              <span className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">Proposed Budget</span>
              <span className="text-2xl font-bold text-orange-400 font-mono">{formatCurrency(event.proposedBudget)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-y border-slate-800/80 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Calendar size={15} className="text-orange-400 flex-shrink-0" />
                <span className="font-medium text-slate-400">Schedule:</span>
                <span className="font-semibold text-white">{formatEventSchedule(event.dateStart, event.dateEnd)}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin size={15} className="text-orange-400 flex-shrink-0" />
                <span className="font-medium text-slate-400">Location:</span>
                <span className="font-semibold text-white">{event.location}</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-300">
                <Clock size={15} className="text-orange-400 flex-shrink-0" />
                <span className="font-medium text-slate-400">Mode:</span>
                <span className="font-semibold text-white">{event.mode}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Building2 size={15} className="text-orange-400 flex-shrink-0" />
                <span className="font-medium text-slate-400">Reviewing Office:</span>
                <span className="font-semibold text-orange-300">{roleTitle}</span>
              </div>
            </div>
          </div>

          {/* Description & Requisites */}
          {event.description && (
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Event Overview</span>
              <p className="text-sm text-slate-300 leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* ── Document Attachments Checklist ── */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Compliance Documents & Attachments</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Clearance PDF */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-600/20 text-orange-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    PDF
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">Clearance Certificate</p>
                    <p className="text-[11px] text-slate-400 truncate">Dean Endorsed</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handlePreviewClearance} className="text-xs h-7 gap-1 border-slate-600 text-slate-200 hover:bg-slate-700">
                  <Eye size={12} /> View
                </Button>
              </div>

              {/* APF */}
              {event.apfUrl && (
                <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      APF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">Activity Proposal Form</p>
                      <p className="text-[11px] text-slate-400 truncate">Official APF Submission</p>
                    </div>
                  </div>
                  <a href={resolvePdfUrl(event.apfUrl, "apf")} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="text-xs h-7 gap-1 border-slate-600 text-slate-200 hover:bg-slate-700">
                      <ExternalLink size={12} /> View
                    </Button>
                  </a>
                </div>
              )}

              {/* Parental Consent Form (PCF for Off-Campus) */}
              {isOffCampus && (
                <div className="bg-slate-800/80 border border-amber-500/40 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center font-bold text-xs flex-shrink-0">
                      PCF
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-300 truncate">Parental Consent Form (PCF)</p>
                      <p className="text-[11px] text-slate-400 truncate">Required Off-Campus Form</p>
                    </div>
                  </div>
                  {event.pcfUrl ? (
                    <a href={resolvePdfUrl(event.pcfUrl, "appendix")} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1 border-amber-500/50 text-amber-300 hover:bg-amber-950/40">
                        <ExternalLink size={12} /> View
                      </Button>
                    </a>
                  ) : (
                    <span className="text-[11px] text-rose-400 font-semibold">Not Uploaded</span>
                  )}
                </div>
              )}

              {/* Appendices */}
              {event.appendices && event.appendices.map((appUrl, idx) => {
                const isXls = appUrl.toLowerCase().includes(".xls") || appUrl.toLowerCase().includes(".csv");
                return (
                  <div key={idx} className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${isXls ? "bg-emerald-600/20 text-emerald-400" : "bg-purple-600/20 text-purple-400"}`}>
                        {isXls ? <FileSpreadsheet size={14} /> : "DOC"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">Appendix {idx + 1}</p>
                        <p className="text-[11px] text-slate-400 truncate">{appUrl.replace(/^.*[\\/]/, "")}</p>
                      </div>
                    </div>
                    <a href={resolvePdfUrl(appUrl, "appendix")} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="text-xs h-7 gap-1 border-slate-600 text-slate-200 hover:bg-slate-700">
                        <ExternalLink size={12} /> View
                      </Button>
                    </a>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Signatory Action Selector & Form ── */}
          {!actionSuccess && (
            <div className="pt-4 border-t border-slate-800 space-y-5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h3 className="text-base font-bold text-white">{roleTitle} Authorization</h3>
                  <p className="text-xs text-slate-400">Select an institutional action to record in the compliance ledger.</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveAction("accept")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeAction === "accept"
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-400/50 shadow-lg"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                    }`}
                  >
                    <CheckCircle size={14} /> Accept & Authorize
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveAction("revision")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeAction === "revision"
                        ? "bg-amber-600 text-white ring-2 ring-amber-400/50 shadow-lg"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                    }`}
                  >
                    <AlertTriangle size={14} /> Request Revision
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveAction("reject")}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      activeAction === "reject"
                        ? "bg-rose-600 text-white ring-2 ring-rose-400/50 shadow-lg"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                    }`}
                  >
                    <XCircle size={14} /> Reject Proposal
                  </button>
                </div>
              </div>

              {/* Action Details Form Box */}
              {activeAction && (
                <div className="bg-slate-950/80 rounded-xl p-5 border border-slate-800 space-y-4 animate-in fade-in-50 duration-200">
                  {activeAction === "accept" && (
                    <div className="space-y-3">
                      <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-lg p-3 text-xs text-emerald-200">
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
                            <strong>On Confirmation:</strong> This off-campus event will be granted final institutional clearance (<strong>CMO Authorized</strong>) and the <strong>Finance Ledger</strong> will be unlocked.
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Optional Authorization Remarks:
                        </label>
                        <Textarea
                          placeholder="Add any formal remarks, guidelines, or conditions for this authorization..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={2}
                          className="bg-slate-900 border-slate-700 text-white placeholder-slate-500 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {activeAction === "revision" && (
                    <div className="space-y-3">
                      <div className="bg-amber-950/40 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
                        <p>
                          <strong>Revision Request:</strong> The event proposal will be sent back to the student organizers with status <strong>Pending Revision</strong>.
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Required Revision Feedback: <span className="text-rose-400">*</span>
                        </label>
                        <Textarea
                          placeholder="Clearly specify which adjustments, safety protocols, or document updates are required before clearance can be granted..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={3}
                          required
                          className="bg-slate-900 border-slate-700 text-white placeholder-slate-500 text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {activeAction === "reject" && (
                    <div className="space-y-3">
                      <div className="bg-rose-950/40 border border-rose-500/30 rounded-lg p-3 text-xs text-rose-200">
                        <p>
                          <strong>Proposal Rejection:</strong> The event will be nullified (status <strong>Rejected</strong>) and its allocated proposed budget will be restored back to the organization treasury.
                        </p>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1">
                          Required Rejection Reason: <span className="text-rose-400">*</span>
                        </label>
                        <Textarea
                          placeholder="Provide the official justification for why this activity proposal cannot be cleared..."
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          rows={3}
                          required
                          className="bg-slate-900 border-slate-700 text-white placeholder-slate-500 text-xs"
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
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirmAction}
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

        {/* ── Footer ── */}
        <div className="text-center text-xs text-slate-500 space-y-1">
          <p>La Consolacion University Philippines · College of Information Technology & Engineering</p>
          <p>Valenzuela St., Capitol View Park, City of Malolos, Bulacan</p>
        </div>

      </div>
    </div>
  );
}
