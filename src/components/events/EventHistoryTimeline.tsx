import { useApp } from "../../context/AppContext";
import { formatDateTime, Event, getActionBadgeClass, formatUserRole } from "../../services/dataService";
import {
  Clock, CheckCircle, RotateCcw, MessageSquareQuote, FileText,
  User, Shield, DollarSign, Send, ArrowRight, Edit2, Trash2
} from "lucide-react";

interface EventHistoryTimelineProps {
  eventId: string;
  event?: Event;
}

export default function EventHistoryTimeline({ eventId, event: passedEvent }: EventHistoryTimelineProps) {
  const { auditTrail, users, events } = useApp();
  const activeEvent = passedEvent || events.find((e) => e.id === eventId);

  // Filter audit entries directly related to this event
  const rawEntries = auditTrail.filter((a) => {
    if (a.eventId && a.eventId === eventId) return true;
    if (activeEvent && a.details && a.details.toLowerCase().includes(activeEvent.name.toLowerCase())) return true;
    return false;
  });

  // Sort chronological with most recent happenings first
  const eventEntries = [...rawEntries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  function getActionIcon(action: string) {
    const act = action.toLowerCase();
    if (act.includes("approve") || act.includes("endors")) {
      return <CheckCircle size={13} className="text-emerald-600" />;
    }
    if (act.includes("revision") || act.includes("change") || act.includes("reject")) {
      return <RotateCcw size={13} className="text-rose-600" />;
    }
    if (act.includes("modified") || act.includes("edit")) {
      return <Edit2 size={12} className="text-amber-600" />;
    }
    if (act.includes("delete") || act.includes("removed")) {
      return <Trash2 size={12} className="text-rose-600" />;
    }
    if (act.includes("completed") || act.includes("closed") || act.includes("closure")) {
      return <CheckCircle size={13} className="text-slate-600" />;
    }
    if (act.includes("submit") || act.includes("for review")) {
      return <FileText size={12} className="text-blue-600" />;
    }
    if (act.includes("disburs") || act.includes("expense") || act.includes("transaction")) {
      return <DollarSign size={13} className="text-emerald-600" />;
    }
    if (act.includes("create")) {
      return <FileText size={12} className="text-[var(--primary)]" />;
    }
    return <Clock size={12} className="text-slate-600" />;
  }

  if (eventEntries.length === 0) {
    return (
      <div className="bg-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-8 text-center">
        <Clock size={32} className="mx-auto text-[var(--muted-foreground)] mb-2 opacity-60" />
        <p className="text-sm font-semibold text-[var(--foreground)]">No Recorded Activity Yet</p>
        <p className="text-xs text-[var(--muted-foreground)] mt-1">
          Activity log entries will appear automatically as signatories review, approve, or comment on this event.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Summary */}
      <div className="flex items-center justify-between bg-[var(--muted)]/50 border border-[var(--border)] rounded-xl px-4 py-2.5 text-xs">
        <span className="font-mono text-[var(--muted-foreground)]">
          Total Recorded Milestones: <strong className="text-[var(--foreground)]">{eventEntries.length}</strong>
        </span>
        {activeEvent && (
          <span className="font-mono text-xs">
            Current Status: <span className="font-bold text-[var(--primary)]">{activeEvent.status}</span>
          </span>
        )}
      </div>

      {/* Vertical Timeline */}
      <div className="relative pl-7 space-y-6 before:absolute before:left-[11px] before:top-3 before:bottom-3 before:w-[2px] before:bg-[var(--border)]">
        {eventEntries.map((entry, idx) => {
          const matchedUser = users.find((u) => u.id === entry.userId) || users.find((u) => u.email === entry.userId);
          const resolvedUser = matchedUser || (
            entry.actorRole === "dean"
              ? users.find((u) => u.role === "dean")
              : entry.actorRole === "adviser"
              ? (activeEvent ? users.find((u) => u.role === "adviser" && u.organizationId === activeEvent.organizationId) : users.find((u) => u.role === "adviser"))
              : entry.actorRole === "student" && activeEvent
              ? users.find((u) => u.id === activeEvent.createdBy || (u.organizationId === activeEvent.organizationId && u.role === "student"))
              : undefined
          );

          const userName = resolvedUser
            ? `${resolvedUser.firstName} ${resolvedUser.middleName ? resolvedUser.middleName.charAt(0) + '. ' : ''}${resolvedUser.lastName}${resolvedUser.suffix ? ', ' + resolvedUser.suffix : ''}`.trim()
            : entry.userId && !entry.userId.includes("-0000-") && !entry.userId.startsWith("id-")
            ? entry.userId
            : formatUserRole(entry.actorRole || "student");

          const userRole = resolvedUser?.role || entry.actorRole || "student";

          return (
            <div key={entry.id || idx} className="relative group">
              {/* Timeline Node Icon */}
              <div className="absolute -left-7 top-1.5 w-6 h-6 rounded-full bg-white border-2 border-[var(--border)] shadow-2xs flex items-center justify-center group-hover:border-[var(--primary)] transition-colors">
                {getActionIcon(entry.action)}
              </div>

              {/* Entry Card */}
              <div className="bg-white border border-[var(--border)] rounded-xl p-4 shadow-2xs hover:shadow-xs transition-shadow space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-full border shadow-2xs ${getActionBadgeClass(entry.action)}`}>
                    {entry.action}
                  </span>
                  <span className="text-[11px] font-mono text-[var(--muted-foreground)] flex items-center gap-1">
                    <Clock size={12} /> {formatDateTime(entry.timestamp)}
                  </span>
                </div>

                <p className="text-xs text-[var(--foreground)] leading-relaxed">{entry.details}</p>

                {/* Status Transition Pill if recorded */}
                {(entry.statusFrom || entry.statusTo) && (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--muted-foreground)] pt-1">
                    <span>Stage transition:</span>
                    {entry.statusFrom && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold">{entry.statusFrom}</span>
                    )}
                    {entry.statusFrom && entry.statusTo && <ArrowRight size={11} className="text-[var(--muted-foreground)]" />}
                    {entry.statusTo && (
                      <span className={`px-1.5 py-0.5 rounded font-bold border ${entry.statusTo === "Approved" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-teal-50 text-[var(--primary)] border-teal-200"}`}>
                        {entry.statusTo}
                      </span>
                    )}
                  </div>
                )}

                {/* Attached Remarks / Feedback Callout */}
                {entry.remarks && (
                  <div
                    className={`mt-2 border-l-4 rounded-r-lg p-2.5 text-xs flex items-start gap-2 ${
                      entry.action.toLowerCase().includes("approve") || entry.action.toLowerCase().includes("endors") || entry.action.toLowerCase().includes("executive") || entry.statusTo === "Approved"
                        ? "bg-emerald-50/80 border-emerald-500 text-emerald-950"
                        : "bg-amber-50/70 border-amber-400 text-amber-900"
                    }`}
                  >
                    <MessageSquareQuote
                      size={14}
                      className={`flex-shrink-0 mt-0.5 ${
                        entry.action.toLowerCase().includes("approve") || entry.action.toLowerCase().includes("endors") || entry.action.toLowerCase().includes("executive") || entry.statusTo === "Approved"
                          ? "text-emerald-600"
                          : "text-amber-600"
                      }`}
                    />
                    <p className="leading-relaxed min-w-0">{entry.remarks}</p>
                  </div>
                )}

                {/* Footer User Meta */}
                <div className="pt-2 border-t border-[var(--border)]/60 flex items-center justify-between text-xs text-[var(--muted-foreground)] flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <User size={13} />
                    <span>Performed by: <strong className="text-[var(--foreground)] font-medium">{userName}</strong> ({formatUserRole(userRole)})</span>
                  </div>
                  <span className="font-mono text-[10px]">#{entry.id}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

