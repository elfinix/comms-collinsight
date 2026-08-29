import { BadgeCheck, Stamp, CheckCircle, ExternalLink, Clock, Printer } from "lucide-react";
import { formatCurrency, formatDateTime, isWebUrl, toWebUrl, Event, organizations, getEventTypeById, printClearanceDocument } from "../../services/mockData";
import { Button } from "../ui";

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
}: EventClearanceTabProps) {
  const isApproved = ["Approved", "Completed", "Closed"].includes(event.status);
  const clearanceFileName = `Event_Clearance_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

  const org = organizations.find((o) => o.id === event.organizationId);
  const resolvedOrgName = organizationName || org?.name || "Student Organization";
  const resolvedOrgCode = org?.code || "CITE";
  const resolvedTypeName = eventTypeName || getEventTypeById(event.typeId)?.name || "Institutional Event";

  const handlePrint = () => {
    printClearanceDocument(event, resolvedOrgName, resolvedTypeName);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. OFFICIAL CLEARANCE PDF BANNER (WHEN APPROVED) ── */}
      {isApproved ? (
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-emerald-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-emerald-300 flex-shrink-0 shadow-inner">
              <BadgeCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white tracking-tight">Official Event Clearance Granted</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 font-bold uppercase">
                  Dispatched to SDS
                </span>
              </div>
              <p className="text-xs text-teal-100/80 font-mono mt-0.5 break-all">
                {clearanceFileName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-medium text-xs gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer size={13} /> Print / Preview Clearance
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
          <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-amber-950">Clearance Template in Preparation</p>
            <p className="text-amber-800/90 leading-relaxed">
              Official institutional clearance certificate will be finalized and sealed with executive digital signatories once approved by the College Dean.
            </p>
          </div>
        </div>
      )}

      {/* ── 2. CLEARANCE DETAILS & AUTHORIZATION SUMMARY ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-sm space-y-3.5 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <p className="font-bold text-[var(--foreground)] text-sm">
            {isApproved ? "Clearance Authorization Summary" : "Clearance Template Summary"}
          </p>
          <span className="text-xs font-mono text-[var(--primary)] font-bold">
            {resolvedOrgName}
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
            <p className="font-mono text-[var(--muted-foreground)] font-bold">Event Date & Time</p>
            <p className="font-medium mt-0.5">
              {event.dateStart && event.dateEnd
                ? `${formatDateTime(event.dateStart)} – ${formatDateTime(event.dateEnd)}`
                : event.dateStart
                ? formatDateTime(event.dateStart)
                : "—"}
            </p>
          </div>
          <div className="sm:col-span-2">
            <p className="font-mono text-[var(--muted-foreground)] font-bold">
              {event.mode === "Online/Virtual" ? "Platform / Meeting Link" : "Venue / Location"}
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
              <p className="font-medium mt-0.5">{event.location || "—"}</p>
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
            <p className="text-xs text-[var(--foreground)] leading-relaxed bg-[var(--muted)]/40 p-2.5 rounded-xl border border-[var(--border)]">
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
            <p className="text-xs font-semibold text-[var(--foreground)]">Engr. Eduardo S. Reyes, M.Sc.</p>
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
            <p className="text-xs font-semibold text-[var(--foreground)]">Dr. Marilou C. Villanueva, Ph.D.</p>
            <p className="text-[11px] text-[var(--muted-foreground)]">College Dean, CITE</p>
            {isApproved && (
              <p className="text-[10px] font-mono text-emerald-800 mt-2 pt-2 border-t border-emerald-200/80">
                ✓ Official Executive Clearance Sealed & Transmitted
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
