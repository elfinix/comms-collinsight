import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { Button } from "../ui";
import {
  Wallet, CreditCard, Coins, FileSpreadsheet, ArrowRight, Printer,
  CheckCircle, Clock, Scale
} from "lucide-react";
import {
  formatCurrency, formatDate, getCategoryById, Event, organizations,
  printLiquidationDocument
} from "../../services/mockData";

interface EventFinanceTabProps {
  event: Event;
  organizationName?: string;
  onOpenFinance?: () => void;
  showOpenFinance?: boolean;
}

export default function EventFinanceTab({
  event,
  organizationName,
  onOpenFinance,
  showOpenFinance,
}: EventFinanceTabProps) {
  const { transactions, users } = useApp();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const isApproved = ["Approved", "Completed", "Closed"].includes(event.status);
  const isClosed = event.status === "Closed";

  const eventTxns = transactions.filter((t) => t.eventId === event.id && !t.deleted);
  const eventSpent = eventTxns.reduce((s, t) => s + t.amount, 0);
  const budget = event.proposedBudget;
  const remaining = budget - eventSpent;
  const utilizationPercent = budget > 0 ? Math.min(100, Math.round((eventSpent / budget) * 100)) : 0;

  const org = organizations.find((o) => o.id === event.organizationId);
  const resolvedOrgName = organizationName || org?.name || "Student Organization";
  const resolvedOrgCode = org?.code || "CITE";

  // Dynamic Signatories for Print Liquidation
  const orgAdviser = users.find((u) => u.role === "adviser" && (u.organizationId === event.organizationId || u.id === org?.adviserId));
  const adviserName = orgAdviser
    ? `${orgAdviser.firstName} ${orgAdviser.middleName ? orgAdviser.middleName + " " : ""}${orgAdviser.lastName}${orgAdviser.suffix ? ", " + orgAdviser.suffix : ""}`
    : "Engr. Eduardo S. Reyes, M.Sc.";

  const deanUser = users.find((u) => u.role === "dean");
  const deanName = deanUser
    ? `${deanUser.firstName} ${deanUser.middleName ? deanUser.middleName + " " : ""}${deanUser.lastName}${deanUser.suffix ? ", " + deanUser.suffix : ""}`
    : "Dr. Marilou C. Villanueva, Ph.D.";

  const studentFinanceOfficer = users.find((u) => u.role === "student" && u.organizationId === event.organizationId && u.position?.toLowerCase().includes("finance"));
  const liquidatorName = studentFinanceOfficer
    ? `${studentFinanceOfficer.firstName} ${studentFinanceOfficer.lastName}${studentFinanceOfficer.suffix ? " " + studentFinanceOfficer.suffix : ""}`
    : currentUser?.role === "student"
    ? `${currentUser.firstName} ${currentUser.lastName}`
    : "Student Finance Officer";

  const canOpenFinancePage = showOpenFinance ?? (currentUser?.role === "student" || currentUser?.role === "adviser");

  const handleOpenFinancePage = () => {
    if (onOpenFinance) {
      onOpenFinance();
      return;
    }
    if (currentUser?.role === "adviser") {
      navigate("/adviser/finance");
    } else {
      navigate("/student/finance");
    }
  };

  const handlePrintLiquidation = () => {
    printLiquidationDocument(event, eventTxns, resolvedOrgName, liquidatorName, adviserName, deanName);
  };

  if (!isApproved) {
    return (
      <div className="flex flex-col gap-4">
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-start gap-3 text-amber-900">
          <Clock size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-amber-950">Finance Ledger Inactive</p>
            <p className="text-amber-800/90 leading-relaxed">
              Disbursement ledger, itemized transaction vouchers, and budget liquidation activate automatically once the event proposal receives executive Dean approval.
            </p>
          </div>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-sm space-y-3 shadow-2xs">
          <p className="font-bold text-[var(--foreground)] text-xs font-mono uppercase tracking-wider">
            Proposed Budget Allocation
          </p>
          <div className="p-4 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)] flex items-center justify-between">
            <div>
              <p className="text-xs font-mono text-[var(--muted-foreground)]">Proposed Allocation</p>
              <p className="text-lg font-mono font-bold text-[var(--primary)] mt-0.5">{formatCurrency(event.proposedBudget)}</p>
            </div>
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-md bg-amber-100 text-amber-800 border border-amber-300">
              Pending Approval
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ── 1. DIGITAL LIQUIDATION REPORT RECONCILED BANNER (WHEN CLOSED) ── */}
      {isClosed && (
        <div className="bg-gradient-to-r from-teal-950 via-teal-900 to-slate-900 text-white rounded-2xl p-5 shadow-md border border-teal-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-200 flex-shrink-0 shadow-inner">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white tracking-tight">Digital Liquidation Report Reconciled</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-200 border border-teal-400/30 font-bold uppercase">
                  Audited & Archived
                </span>
              </div>
              <p className="text-xs text-teal-100/80 font-mono mt-0.5 break-all">
                Liquidation_Report_{event.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintLiquidation}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-medium text-xs gap-1.5 cursor-pointer shadow-2xs"
            >
              <Printer size={13} /> Print / Preview Liquidation
            </Button>
          </div>
        </div>
      )}

      {/* ── 2. FINANCIAL MINI-OVERVIEW SUMMARY ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 text-sm space-y-4 shadow-2xs">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
          <p className="font-bold text-[var(--foreground)] text-sm">
            Financial Ledger Mini-Overview
          </p>
          <span className="text-xs font-mono text-[var(--primary)] font-bold">
            {resolvedOrgCode}
          </span>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)]">
            <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase font-bold flex items-center gap-1.5">
              <Wallet size={13} className="text-teal-700" /> Approved Allocation
            </p>
            <p className="text-base font-mono font-bold text-[var(--foreground)] mt-1">{formatCurrency(budget)}</p>
          </div>

          <div className="p-3.5 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)]">
            <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase font-bold flex items-center gap-1.5">
              <CreditCard size={13} className="text-amber-600" /> Total Disbursed
            </p>
            <p className="text-base font-mono font-bold text-teal-800 mt-1">{formatCurrency(eventSpent)}</p>
          </div>

          <div className="p-3.5 bg-[var(--muted)]/40 rounded-xl border border-[var(--border)]">
            <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase font-bold flex items-center gap-1.5">
              <Coins size={13} className={remaining >= 0 ? "text-emerald-600" : "text-rose-600"} /> Net Remaining
            </p>
            <p className={`text-base font-mono font-bold mt-1 ${remaining >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Budget Utilization Bar */}
        <div className="p-3 bg-[var(--muted)]/20 rounded-xl border border-[var(--border)] space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[var(--muted-foreground)] font-medium">Budget Utilization</span>
            <span className="font-bold text-[var(--foreground)]">{utilizationPercent}% ({formatCurrency(eventSpent)} of {formatCurrency(budget)})</span>
          </div>
          <div className="h-2 w-full bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                utilizationPercent > 90 ? "bg-rose-500" : utilizationPercent > 70 ? "bg-amber-500" : "bg-teal-600"
              }`}
              style={{ width: `${utilizationPercent}%` }}
            />
          </div>
        </div>

        {/* Gross Revenue Banner if recorded */}
        {event.revenue !== undefined && event.revenue > 0 && (
          <div className="p-3.5 bg-gradient-to-r from-teal-50 to-emerald-50 rounded-xl border border-teal-200 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center flex-shrink-0">
                <Coins size={16} />
              </div>
              <div>
                <p className="text-[11px] font-bold text-teal-900 uppercase">Gross Event Revenue Generated</p>
                <p className="text-[11px] text-teal-700">Official proceeds deposited into organization treasury</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-base font-mono font-extrabold text-teal-900">{formatCurrency(event.revenue)}</p>
              <p className="text-[10px] text-emerald-700 font-bold">Total Surplus: {formatCurrency(remaining + event.revenue)}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── 3. ITEMIZED DISBURSEMENTS / TRANSACTIONS LIST ── */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xs">
        <div className="p-4 bg-[var(--muted)]/30 border-b border-[var(--border)] flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-xs font-mono font-bold text-[var(--foreground)] uppercase tracking-wider">
              Itemized Disbursement Records ({eventTxns.length})
            </p>
            <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">
              Expense vouchers & receipt audit logs
            </p>
          </div>

          {canOpenFinancePage && (
            <Button
              size="sm"
              onClick={handleOpenFinancePage}
              className="h-8 text-xs font-bold gap-1.5 cursor-pointer shadow-2xs"
            >
              Open Full Finance Page <ArrowRight size={13} />
            </Button>
          )}
        </div>

        {eventTxns.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--muted-foreground)]">
            No disbursement transactions logged yet for this event.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)] text-xs">
            {eventTxns.map((t, idx) => (
              <div key={t.id} className="p-3.5 flex items-center justify-between hover:bg-[var(--muted)]/40 transition">
                <div className="space-y-0.5">
                  <p className="font-medium text-[var(--foreground)]">{t.description}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono">
                    #{idx + 1} · {formatDate(t.createdAt)} · {getCategoryById(t.categoryId)?.name || "General"}
                  </p>
                </div>
                <div className="text-right font-mono">
                  <p className="font-bold text-[var(--foreground)]">{formatCurrency(t.amount)}</p>
                  <span className="text-[9px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
