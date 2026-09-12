import { BadgeCheck, Stamp, CheckCircle, ExternalLink, Clock, Eye } from "lucide-react";
import { formatCurrency, formatDateTime, formatEventSchedule, isWebUrl, toWebUrl, Event, resolveEventSignatories } from "../../services/dataService";
import { generateClearancePdfBlob, openPdfBlobInNewTab } from "../../services/pdfDocuments";
import { buildAttachmentPath, getPublicStorageUrl, STORAGE_BUCKETS } from "../../services/storageService";
import { Button } from "../ui";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";

interface EventClearanceTabProps {
  event: Event;
  organizationName?: string;
  eventTypeName?: string;
  onViewPdf?: (url: string, title: string) => void;
}

export default function EventClearanceTab({
  event,
  organizationName,
  eventTypeName,
  onViewPdf,
}: EventClearanceTabProps) {
  const { organizations, eventTypes, users, eventSignatories } = useApp();
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const isApproved = ["Approved", "Completed", "Closed"].includes(event.status);
  const isDeanViewing = currentUser?.role === "dean" || currentUser?.role === "admin";
  const clearanceFileName = `Event_Clearance_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

  const org = organizations.find((o) => o.id === event.organizationId);
  const typeObj = eventTypes.find((t) => t.id === event.typeId);
  const resolvedOrgName = organizationName || org?.name || "Student Organization";
  const resolvedOrgCode = org?.code || "CITE";
  const resolvedTypeName = eventTypeName || typeObj?.name || "Institutional Event";
  const isOnline = event.mode === "Online/Virtual" || (event.mode as string) === "Online";

  // Resolve dynamic signatories from active users dataset
  const resolvedSig = resolveEventSignatories(event, users, organizations);

  // Feedbacks / Signatory actions for this event, sorted newest first
  const relevantSignatories = (eventSignatories || [])
    .filter((s) => s.eventId === event.id && s.feedback && s.feedback.trim().length > 0)
    .sort((a, b) => {
      const dateA = new Date(a.signedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.signedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

  // Official Clearance Viewer from Database Storage (for approved events)
  const handleViewClearance = () => {
    try {
      const storagePath = buildAttachmentPath(event.organizationId || resolvedOrgName, event.id || event.name, "Clearance", clearanceFileName);
      const storageUrl = getPublicStorageUrl(STORAGE_BUCKETS.ATTACHMENTS, storagePath);

      if (onViewPdf) {
        onViewPdf(storageUrl, `Event Clearance - ${event.name}`);
        return;
      }

      const approvedEvent = isApproved ? { ...event, status: "Approved" as const } : event;
      const openWindow = window.open(storageUrl, "_blank");
      if (!openWindow) {
        // Fallback to vector blob generation if popup blocked or offline
        const pdfBlob = generateClearancePdfBlob(approvedEvent, {
          organizationName: resolvedOrgName,
          eventTypeName: resolvedTypeName,
          officerName: resolvedSig.officerName,
          adviserName: resolvedSig.adviserName,
          deanName: resolvedSig.deanName,
          viewerRole: isApproved ? "dean" : currentUser?.role,
        });
        openPdfBlobInNewTab(pdfBlob, clearanceFileName);
      }
      toast.success("Clearance Certificate Opened", "Viewing official stored clearance from database.");
    } catch (err: any) {
      console.error("Clearance storage open error:", err);
      // Fallback
      const approvedEvent = isApproved ? { ...event, status: "Approved" as const } : event;
      const pdfBlob = generateClearancePdfBlob(approvedEvent, {
        organizationName: resolvedOrgName,
        eventTypeName: resolvedTypeName,
        officerName: resolvedSig.officerName,
        adviserName: resolvedSig.adviserName,
        deanName: resolvedSig.deanName,
        viewerRole: isApproved ? "dean" : currentUser?.role,
      });
      openPdfBlobInNewTab(pdfBlob, clearanceFileName);
    }
  };

  // Preview Clearance Generator (Draft / In-Preparation)
  const handlePreviewClearance = () => {
    try {
      const pdfBlob = generateClearancePdfBlob(event, {
        organizationName: resolvedOrgName,
        eventTypeName: resolvedTypeName,
        officerName: resolvedSig.officerName,
        adviserName: resolvedSig.adviserName,
        deanName: resolvedSig.deanName,
        viewerRole: currentUser?.role,
      });
      openPdfBlobInNewTab(pdfBlob, clearanceFileName);
      toast.success("Clearance Certificate Previewed", `Draft PDF (${(pdfBlob.size / 1024).toFixed(1)} KB) compiled.`);
    } catch (err: any) {
      console.error("Clearance preview error:", err);
      toast.error("Export Failed", "Could not compile Clearance Certificate PDF.");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. CLEARANCE PDF BANNER ── */}
      {isApproved ? (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-emerald-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 flex-shrink-0 shadow-inner">
              <BadgeCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white tracking-tight">
                  Event Clearance Granted
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-bold uppercase">
                  Dispatched to SDS
                </span>
              </div>
              <p className="text-xs text-teal-100/80 font-mono mt-0.5 break-all">
                {clearanceFileName}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 flex-shrink-0 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewClearance}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-medium text-xs gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
            >
              <Eye size={13} /> View Clearance
            </Button>
          </div>
        </div>
      ) : isDeanViewing ? (
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-emerald-900">
          <div className="flex items-start gap-3">
            <Clock size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-emerald-950">Clearance Template Ready for Approval</p>
              <p className="text-emerald-800/90 leading-relaxed">
                Institutional clearance certificate will be finalized and sealed with executive digital signatories upon approval.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviewClearance}
            className="border-emerald-300 bg-emerald-100/50 text-emerald-900 hover:bg-emerald-100 font-medium text-xs gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap flex-shrink-0 self-end sm:self-center"
          >
            <Eye size={13} /> Preview Clearance
          </Button>
        </div>
      ) : (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-900">
          <div className="flex items-start gap-3">
            <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-amber-950">Clearance Template in Preparation</p>
              <p className="text-amber-800/90 leading-relaxed">
                Clearance certificate will be finalized with executive digital signatories once approved by the College Dean.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviewClearance}
            className="border-amber-300 bg-amber-100/50 text-amber-900 hover:bg-amber-100 font-medium text-xs gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap flex-shrink-0 self-end sm:self-center"
          >
            <Eye size={13} /> Preview Clearance
          </Button>
        </div>
      )}

      {/* ── 2. CLEARANCE DETAILS & AUTHORIZATION SUMMARY ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-sm space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <p className="font-bold text-[var(--foreground)] text-sm">
            {isApproved ? "Clearance Authorization Summary" : "Clearance Template Summary"}
          </p>
          <span className="text-xs font-mono text-[var(--primary)] font-bold">
            {resolvedOrgCode}
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3 text-xs">
          <div>
            <p className="font-mono text-[var(--muted-foreground)] font-bold">Event Name</p>
            <p className="font-bold text-[var(--foreground)] mt-0.5">{event.name}</p>
          </div>
          <div>
            <p className="font-mono text-[var(--muted-foreground)] font-bold">Type</p>
            <p className="font-medium mt-0.5">{resolvedTypeName}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="font-mono text-[var(--muted-foreground)] font-bold">Scheduled Date & Time</p>
            <p className="font-medium mt-0.5">
              {formatEventSchedule(event.dateStart, event.dateEnd)}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="font-mono text-[var(--muted-foreground)] font-bold">
              {isOnline ? "Platform / Link" : "Venue / Location"}
            </p>
            {isWebUrl(event.location) ? (
              <a
                href={toWebUrl(event.location)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[var(--primary)] hover:underline font-medium break-all mt-0.5"
              >
                {event.location}
                <ExternalLink size={12} className="flex-shrink-0" />
              </a>
            ) : (
              <p className="font-medium mt-0.5">{event.location || (isOnline ? "Online Platform" : "Venue TBD")}</p>
            )}
          </div>
          <div>
            <p className="font-mono text-[var(--muted-foreground)] font-bold">Authorized Proposed Budget</p>
            <p className="font-mono font-bold text-[var(--primary)] mt-0.5">{formatCurrency(event.proposedBudget)}</p>
          </div>
          <div>
            <p className="font-mono text-[var(--muted-foreground)] font-bold">Attached APF</p>
            <p className="font-mono text-teal-800 font-bold mt-0.5 flex items-center gap-1">
              ✓ {event.apfUrl ? event.apfUrl.replace(/^.*[\\/]/, '') : "Activity Proposal Form Attached"}
            </p>
          </div>
        </div>

        {event.clearanceDetails && (
          <div className="pt-2 border-t border-[var(--border)] mt-3">
            <p className="font-mono text-[var(--muted-foreground)] text-xs font-bold mb-1">Additional Clearance Notes</p>
            <p className="text-xs text-[var(--foreground)] leading-relaxed bg-[var(--muted)]/40 p-3 rounded-xl border border-[var(--border)] whitespace-pre-wrap break-words">
              {event.clearanceDetails}
            </p>
          </div>
        )}
      </div>

      {/* ── 3. SIGNATORY STATUS BLOCK ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-xs shadow-2xs space-y-3">
        <p className="font-bold text-[var(--foreground)] text-xs uppercase font-mono tracking-wider">
          Signatory & Endorsement Verification
        </p>

        <div className="grid sm:grid-cols-2 gap-3">
          {/* 1. Faculty Adviser Verification (First / Left) */}
          <div className={`p-3.5 rounded-xl border ${
            isApproved || event.status === "For Approval"
              ? "bg-teal-50/80 border-teal-200 text-teal-950"
              : "bg-[var(--muted)]/40 border-[var(--border)] text-[var(--muted-foreground)]"
          }`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-xs font-sans text-[var(--foreground)]">Faculty Adviser Signatory</span>
              {isApproved || event.status === "For Approval" ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md border border-teal-300">
                  <CheckCircle size={10} /> Endorsed
                </span>
              ) : (
                <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 font-bold">
                  Pending Review
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-[var(--foreground)]">{resolvedSig.adviserName}</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">Designated Faculty Adviser, {resolvedOrgCode}</p>
            {(isApproved || event.status === "For Approval") && (
              <p className="text-[10px] font-mono text-teal-800 mt-2 pt-2 border-t border-teal-200/80">
                ✓ APF & Appendices Endorsed to Dean
              </p>
            )}
          </div>

          {/* 2. Dean Verification (Second / Right) */}
          <div className={`p-3.5 rounded-xl border ${
            isApproved
              ? "bg-emerald-50/80 border-emerald-200 text-emerald-950"
              : "bg-[var(--muted)]/40 border-[var(--border)] text-[var(--muted-foreground)]"
          }`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-bold text-xs font-sans text-[var(--foreground)]">College Dean Signatory</span>
              {isApproved ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-300">
                  <CheckCircle size={10} /> Cleared
                </span>
              ) : (
                <span className="text-[10px] font-mono text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 font-bold">
                  Pending Clearance
                </span>
              )}
            </div>
            <p className="text-xs font-semibold text-[var(--foreground)]">{resolvedSig.deanName}</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">College Dean, CITE</p>
            {isApproved && (
              <p className="text-[10px] font-mono text-emerald-800 mt-2 pt-2 border-t border-emerald-200/80">
                ✓ Official Executive Clearance Sealed & Transmitted
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ── 4. SIGNATORY FEEDBACK & COLLABORATION THREAD ── */}
      {relevantSignatories.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-xs shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold text-[var(--foreground)] text-xs uppercase font-mono tracking-wider">
              Feedback Thread
            </p>
            <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
              {relevantSignatories.length} {relevantSignatories.length === 1 ? "Entry" : "Entries"}
            </span>
          </div>

          <div className="space-y-3">
            {relevantSignatories.map((sig) => {
              const isRevision = sig.status === "Revision Requested";
              const isResolved = sig.status === "Resolved";
              const isApproval = sig.status === "Approved" || sig.status === "Endorsed";
              const sigUser = users.find((u) => u.id === sig.userId);
              const signatoryName = sigUser
                ? `${sigUser.firstName} ${sigUser.middleName ? sigUser.middleName.charAt(0) + '. ' : ''}${sigUser.lastName}${sigUser.suffix ? ', ' + sigUser.suffix : ''}`
                : sig.role === "dean"
                ? resolvedSig.deanName
                : sig.role === "adviser"
                ? resolvedSig.adviserName
                : resolvedSig.officerName;
              const roleTitle = sig.role === "dean" ? "College Dean, CITE" : sig.role === "adviser" ? `Faculty Adviser, ${resolvedOrgCode}` : "Student Officer";
              const titlePrefix = sig.role === "dean" ? "College Dean's" : sig.role === "adviser" ? "Adviser's" : "Signatory";

              return (
                <div
                  key={sig.id}
                  className={`p-4 rounded-xl border transition ${
                    isRevision
                      ? "bg-amber-50/80 border-amber-300 text-amber-950 shadow-xs"
                      : isResolved
                      ? "bg-teal-50/60 border-teal-200 text-teal-950"
                      : "bg-emerald-50/80 border-emerald-300 text-emerald-950 shadow-xs"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs">
                        {isApproval ? `${titlePrefix} Endorsement Remarks` : `${titlePrefix} Feedback`}
                      </span>
                      <span className="text-[10px] text-[var(--muted-foreground)] font-mono">
                        {sig.signedAt || sig.createdAt ? formatDateTime(sig.signedAt || sig.createdAt!) : ""}
                      </span>
                    </div>

                    {/* Status Chip / Badge */}
                    {isRevision && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-amber-200/90 text-amber-900 px-2 py-0.5 rounded-full border border-amber-400">
                        <Clock size={10} /> Pending
                      </span>
                    )}
                    {isResolved && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full border border-teal-300">
                        <CheckCircle size={10} /> Resolved
                      </span>
                    )}
                    {isApproval && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                        <CheckCircle size={10} /> {sig.status}
                      </span>
                    )}
                  </div>

                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words font-medium">
                    "{sig.feedback}"
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-black/10 flex items-center justify-between text-[10px] font-mono text-[var(--muted-foreground)]">
                    <span className="font-semibold">{signatoryName}</span>
                    <span>{roleTitle}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
