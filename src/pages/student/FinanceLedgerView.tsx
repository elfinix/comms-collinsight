import { useState, useRef, ChangeEvent } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { StatCard, Card, CardHeader, CardBody, Button, Dialog, Input, Select } from "../../components/ui";
import {
  Wallet, CreditCard, Coins, Scale, FileSpreadsheet, Plus, Edit2, Trash2, FileText, CheckCircle, UploadCloud,
  ArrowLeft, ChevronRight, Download, Eye, X, AlertTriangle,
  Paperclip, FileCheck, ExternalLink, Calendar, MapPin
} from "lucide-react";
import {
  formatCurrency, formatDate, formatDateTime, statusColors,
  getCategoryById, expenditureCategories, Transaction, Event, resolvePdfUrl
} from "../../services/mockData";
import {
  uploadEventAttachment,
  buildAttachmentPath,
  getPublicStorageUrl,
  STORAGE_BUCKETS,
} from "../../services/storageService";
import { generateLiquidationPdfBlob, openPdfBlobInNewTab } from "../../services/pdfDocuments";

interface FinanceLedgerViewProps {
  selectedEventId: string;
  onBack: () => void;
  readOnly?: boolean;
}

export default function FinanceLedgerView({ selectedEventId, onBack, readOnly = false }: FinanceLedgerViewProps) {
  const { currentUser } = useAuth();
  const { events, transactions, organizations, users, expenditureCategories, updateEvent, setEventStatus, addTransaction, updateTransaction, deleteTransaction } = useApp();
  const { toast } = useToast();

  const activeEvent = events.find((e) => e.id === selectedEventId);
  const org = organizations.find((o) => o.id === activeEvent?.organizationId);
  const eventTxns = transactions.filter((t) => t.eventId === selectedEventId && !t.deleted);
  const eventSpent = eventTxns.reduce((s, t) => s + t.amount, 0);

  const cleanDocRef = activeEvent
    ? `LIQ-${activeEvent.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase()}-${new Date(activeEvent.dateStart || Date.now()).getFullYear()}`
    : "LIQ-000000-2026";

  // Dynamic Signatories
  const orgAdviser = users.find((u) => u.role === "adviser" && (u.organizationId === activeEvent?.organizationId || u.id === org?.adviserId));
  const adviserName = orgAdviser
    ? `${orgAdviser.firstName} ${orgAdviser.middleName ? orgAdviser.middleName + " " : ""}${orgAdviser.lastName}${orgAdviser.suffix ? ", " + orgAdviser.suffix : ""}`
    : "Engr. Emmanuel S. Reyes, M.Sc.";

  const deanUser = users.find((u) => u.role === "dean");
  const deanName = deanUser
    ? `${deanUser.firstName} ${deanUser.middleName ? deanUser.middleName + " " : ""}${deanUser.lastName}${deanUser.suffix ? ", " + deanUser.suffix : ""}`
    : "Dr. Marilou Castro Villanueva, Ph.D.";

  const liquidatorName = activeEvent?.liquidatedBy || (currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}${currentUser.suffix ? " " + currentUser.suffix : ""}`
    : "Student Finance Officer");

  // Add Transaction State
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newTxn, setNewTxn] = useState<{
    description: string;
    categoryId: string;
    amount: string;
    status: "Pending" | "Paid";
    receiptName: string;
    receiptPreviewUrl: string;
  }>({
    description: "",
    categoryId: expenditureCategories[0]?.id ?? "ec-1",
    amount: "",
    status: "Paid",
    receiptName: "",
    receiptPreviewUrl: "",
  });
  const addReceiptInputRef = useRef<HTMLInputElement>(null);

  // Edit Transaction State
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [editTxnForm, setEditTxnForm] = useState<{
    description: string;
    categoryId: string;
    amount: string;
    status: "Pending" | "Paid";
    receiptName: string;
    receiptPreviewUrl: string;
  }>({
    description: "",
    categoryId: "",
    amount: "",
    status: "Paid",
    receiptName: "",
    receiptPreviewUrl: "",
  });
  const editReceiptInputRef = useRef<HTMLInputElement>(null);

  // Delete Confirmation State
  const [deleteConfirmTxn, setDeleteConfirmTxn] = useState<Transaction | null>(null);

  // Complete Event & Liquidation State
  const [showCompleteEventConfirm, setShowCompleteEventConfirm] = useState(false);
  const [showLiquidationConfirm, setShowLiquidationConfirm] = useState(false);
  const [revenue, setRevenue] = useState("");

  // Add Amendment State
  const [showAddAmendment, setShowAddAmendment] = useState(false);
  const [amendmentNote, setAmendmentNote] = useState("");
  const [amendmentAmount, setAmendmentAmount] = useState("");

  // PDF Preview & Receipt Lightbox State
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [previewReceipt, setPreviewReceipt] = useState<{ title: string; url: string; fileName?: string } | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!activeEvent) {
    return (
      <div className="p-8 text-center">
        <p className="text-[var(--muted-foreground)]">Event record not found.</p>
        <Button variant="outline" size="sm" onClick={onBack} className="mt-4">
          <ArrowLeft size={14} /> Back to Overview
        </Button>
      </div>
    );
  }

  const budget = activeEvent.proposedBudget;
  const remaining = budget - eventSpent;
  const percentUsed = budget > 0 ? Math.round((eventSpent / budget) * 100) : 0;
  const isClosedOrCompleted = activeEvent.status === "Closed" || activeEvent.status === "Completed";

  // Validation flags
  const addAmountNum = parseFloat(newTxn.amount);
  const isAddOverBudget = !isNaN(addAmountNum) && addAmountNum > budget;
  const isAddRecordValid = Boolean(
    newTxn.description.trim() &&
    newTxn.amount &&
    !isNaN(addAmountNum) &&
    addAmountNum > 0 &&
    !isAddOverBudget &&
    (newTxn.receiptName || newTxn.receiptPreviewUrl)
  );

  const editAmountNum = parseFloat(editTxnForm.amount);
  const isEditOverBudget = !isNaN(editAmountNum) && editAmountNum > budget;
  const isEditRecordValid = Boolean(
    editTxnForm.description.trim() &&
    editTxnForm.amount &&
    !isNaN(editAmountNum) &&
    editAmountNum > 0 &&
    !isEditOverBudget &&
    (editTxnForm.receiptName || editTxnForm.receiptPreviewUrl)
  );

  // Handle Add Record
  function handleOpenAddRecord() {
    setNewTxn({
      description: "",
      categoryId: expenditureCategories[0]?.id ?? "ec-1",
      amount: "",
      status: "Paid",
      receiptName: "",
      receiptPreviewUrl: "",
    });
    if (addReceiptInputRef.current) {
      addReceiptInputRef.current.value = "";
    }
    setShowAddRecord(true);
  }

  function handleCloseAddRecord() {
    setNewTxn({
      description: "",
      categoryId: expenditureCategories[0]?.id ?? "ec-1",
      amount: "",
      status: "Paid",
      receiptName: "",
      receiptPreviewUrl: "",
    });
    if (addReceiptInputRef.current) {
      addReceiptInputRef.current.value = "";
    }
    setShowAddRecord(false);
  }

  function handleAddReceiptChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setNewTxn((prev) => ({
          ...prev,
          receiptName: file.name,
          receiptPreviewUrl: dataUrl,
        }));
      };
      reader.readAsDataURL(file);
    }
  }

  function handleAddRecordSubmit() {
    if (!isAddRecordValid) return;
    const amountNum = parseFloat(newTxn.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    addTransaction({
      id: crypto.randomUUID(),
      eventId: activeEvent!.id,
      description: newTxn.description.trim(),
      categoryId: newTxn.categoryId,
      amount: amountNum,
      status: newTxn.status,
      receiptUrl: newTxn.receiptPreviewUrl || newTxn.receiptName || "/mock-receipt.jpg",
      createdAt: new Date().toISOString(),
    });

    toast.success("Expense Disbursed", `Recorded ₱${amountNum.toLocaleString()} for '${newTxn.description.trim()}'.`);

    setNewTxn({
      description: "",
      categoryId: expenditureCategories[0]?.id ?? "ec-1",
      amount: "",
      status: "Paid",
      receiptName: "",
      receiptPreviewUrl: "",
    });
    if (addReceiptInputRef.current) {
      addReceiptInputRef.current.value = "";
    }
    setShowAddRecord(false);
  }

  // Handle Edit Record
  function handleOpenEdit(txn: Transaction) {
    setEditTxn(txn);
    setEditTxnForm({
      description: txn.description,
      categoryId: txn.categoryId,
      amount: String(txn.amount),
      status: txn.status === "Pending" ? "Pending" : "Paid",
      receiptName: txn.receiptUrl ? (txn.receiptUrl.startsWith("data:") ? "Uploaded Receipt" : txn.receiptUrl.split("/").pop() || "receipt.jpg") : "",
      receiptPreviewUrl: txn.receiptUrl || "",
    });
  }

  function handleEditReceiptChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setEditTxnForm((prev) => ({
          ...prev,
          receiptName: file.name,
          receiptPreviewUrl: dataUrl,
        }));
      };
      reader.readAsDataURL(file);
    }
  }

  function handleEditRecordSubmit() {
    if (!editTxn || !isEditRecordValid) return;
    const amountNum = parseFloat(editTxnForm.amount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    updateTransaction(editTxn.id, {
      description: editTxnForm.description.trim(),
      categoryId: editTxnForm.categoryId,
      amount: amountNum,
      status: editTxnForm.status,
      receiptUrl: editTxnForm.receiptPreviewUrl || editTxnForm.receiptName || editTxn.receiptUrl,
    });

    toast.success("Expense Updated", `Transaction '${editTxnForm.description.trim()}' was successfully updated.`);
    setEditTxn(null);
  }

  // Handle Delete Record
  function handleDeleteConfirm() {
    if (deleteConfirmTxn) {
      deleteTransaction(deleteConfirmTxn.id);
      toast.info("Expense Removed", `Expense entry '${deleteConfirmTxn.description}' was removed.`);
      setDeleteConfirmTxn(null);
    }
  }

  // Handle Complete Event
  function handleCompleteEvent() {
    if (!activeEvent) return;
    setEventStatus(activeEvent.id, "Completed");
    setShowCompleteEventConfirm(false);
    toast.success(
      "Event Marked as Completed",
      `'${activeEvent.name}' has been marked as Completed. You can now finalize liquidation.`
    );
  }

  // Handle Liquidation
  async function handleCompleteLiquidation() {
    const revNum = parseFloat(revenue);
    const hasRev = !isNaN(revNum) && revNum > 0;
    const remarksArr = activeEvent!.remarks ? [...activeEvent!.remarks] : [];
    remarksArr.push(
      `Liquidation completed on ${formatDate(new Date().toISOString())}${
        hasRev ? ` (Revenue reported: ${formatCurrency(revNum)})` : ""
      }`
    );

    const activeLiquidator = currentUser
      ? `${currentUser.firstName} ${currentUser.lastName}${currentUser.suffix ? " " + currentUser.suffix : ""}`
      : "Student Finance Officer";

    const orgName = org?.name || org?.code || "Organization";

    // Generate & upload official liquidation statement to Supabase Storage
    try {
      const liquidationDocName = `Liquidation_Report_${activeEvent!.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      const adviserUser = users.find((u) => u.role === "adviser" && (u.organizationId === activeEvent!.organizationId || u.id === org?.adviserId));
      const adviserName = adviserUser
        ? `${adviserUser.firstName} ${adviserUser.middleName ? adviserUser.middleName + " " : ""}${adviserUser.lastName}${adviserUser.suffix ? ", " + adviserUser.suffix : ""}`
        : "Engr. Emmanuel S. Reyes, M.Sc.";
      const deanUser = users.find((u) => u.role === "dean");
      const deanName = deanUser
        ? `${deanUser.firstName} ${deanUser.middleName ? deanUser.middleName + " " : ""}${deanUser.lastName}${deanUser.suffix ? ", " + deanUser.suffix : ""}`
        : "Dr. Marilou Castro Villanueva, Ph.D.";

      const pdfBlob = generateLiquidationPdfBlob(activeEvent!, eventTxns, {
        organizationName: orgName,
        officerName: activeLiquidator,
        adviserName,
        deanName,
        categories: expenditureCategories,
      });

      await uploadEventAttachment({
        organizationId: activeEvent!.organizationId || org?.id,
        organizationName: orgName,
        eventId: activeEvent!.id,
        eventName: activeEvent!.name,
        category: "Liquidation",
        file: pdfBlob,
        fileName: liquidationDocName,
      });
    } catch (e) {
      console.warn("Liquidation cloud archive notice:", e);
    }

    updateEvent(activeEvent!.id, {
      status: "Closed",
      remarks: remarksArr,
      revenue: hasRev ? revNum : activeEvent!.revenue,
      liquidatedBy: activeLiquidator,
      liquidatedAt: new Date().toISOString(),
    });
    toast.success("Liquidation Finalized", `'${activeEvent!.name}' has been liquidated and closed.`);
    setShowLiquidationConfirm(false);
    setShowPdfModal(true);
  }

  // Handle Amendment
  function handleAddAmendmentSubmit() {
    if (!amendmentNote.trim()) return;
    const dateStr = formatDate(new Date().toISOString());
    const adjStr = amendmentAmount && !isNaN(parseFloat(amendmentAmount)) ? ` [Adjustment: ${formatCurrency(parseFloat(amendmentAmount))}]` : "";
    const newRemark = `Amendment (${dateStr}): ${amendmentNote.trim()}${adjStr}`;

    updateEvent(activeEvent!.id, {
      remarks: [...(activeEvent!.remarks ?? []), newRemark],
    });

    toast.info("Ledger Amendment Logged", "Audit amendment note successfully appended to ledger.");
    setAmendmentNote("");
    setAmendmentAmount("");
    setShowAddAmendment(false);
  }

  async function handleTriggerOpenPdf() {
    if (!activeEvent) return;
    const orgName = org?.name || org?.code || "Student Organization";
    const fileName = `Liquidation_Report_${activeEvent.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    try {
      const orgIdentifier = activeEvent.organizationId || org?.id;
      const eventIdentifier = activeEvent.id;
      const storagePath = buildAttachmentPath(orgIdentifier, eventIdentifier, "Liquidation", fileName);
      const publicUrl = getPublicStorageUrl(STORAGE_BUCKETS.ATTACHMENTS, storagePath);

      let opened = false;
      if (publicUrl) {
        try {
          const resp = await fetch(publicUrl, { method: "HEAD" });
          if (resp.ok) {
            window.open(publicUrl, "_blank", "noopener,noreferrer");
            opened = true;
          }
        } catch {
          // Fallback to blob in new tab
        }
      }

      if (!opened) {
        const pdfBlob = generateLiquidationPdfBlob(activeEvent, eventTxns, {
          organizationName: orgName,
          officerName: liquidatorName,
          adviserName,
          deanName,
          categories: expenditureCategories,
        });
        openPdfBlobInNewTab(pdfBlob, fileName);
      }

      toast.success("Liquidation Report Opened", `'${activeEvent.name}' PDF document opened in a new tab.`);
    } catch (err: any) {
      console.error("Liquidation open error:", err);
      toast.error("Open Failed", "Could not open Liquidation Report PDF.");
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb Navigation Trail */}
      <nav className="flex items-center gap-1.5 text-xs font-mono text-[var(--muted-foreground)] mb-4">
        <button
          onClick={onBack}
          className="hover:text-[var(--primary)] transition cursor-pointer font-medium"
        >
          Finance Overview
        </button>
      </nav>

      {/* Ledger Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[var(--border)]">
        <div className="flex items-start sm:items-center gap-3.5">
          <button
            onClick={onBack}
            className="group h-9 px-3.5 inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-xs font-mono font-bold text-[var(--foreground)] hover:border-[var(--primary)]/50 hover:bg-[var(--muted)]/40 hover:text-[var(--primary)] transition shadow-2xs cursor-pointer flex-shrink-0"
            title="Return to Finance Overview"
          >
            <ArrowLeft size={14} className="text-[var(--primary)] group-hover:-translate-x-0.5 transition" />
          </button>
          <div className="h-6 w-[1px] bg-[var(--border)] hidden sm:block" />
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold text-[var(--foreground)] leading-tight">{activeEvent.name}</h1>
              <span className={`text-xs font-mono px-2.5 py-0.5 rounded-full font-bold shadow-2xs flex-shrink-0 ${statusColors[activeEvent.status]}`}>
                {activeEvent.status}
              </span>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] font-mono mt-1">
              Event Finance Ledger · {formatDate(activeEvent.dateStart)} · {activeEvent.location}
            </p>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards — Varied semantic icons & % used aligned on bottom-right */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Approved Budget"
          value={formatCurrency(budget)}
          icon={<Wallet size={18} />}
        />

        {/* Total Spent with % used neatly positioned at bottom-right */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-5 shadow-xs transition-all duration-200 flex flex-col justify-between min-h-[118px] hover:border-[var(--primary)]/30">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--primary)]/40 to-transparent opacity-70" />
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-xs font-mono font-bold text-[var(--muted-foreground)] uppercase tracking-wider truncate">
              Total Spent
            </span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0 bg-[var(--primary)] text-white">
              <CreditCard size={18} />
            </div>
          </div>
          <div className="flex items-end justify-between gap-2">
            <div className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight font-mono leading-none">
              {formatCurrency(eventSpent)}
            </div>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${
              percentUsed > 100
                ? "bg-rose-50 text-rose-700 border-rose-200"
                : "bg-teal-50 text-teal-700 border-teal-200"
            }`}>
              {percentUsed}% used
            </span>
          </div>
        </div>

        <StatCard
          label="Remaining"
          value={formatCurrency(remaining)}
          trend={remaining < 0 ? "down" : "up"}
          icon={<Coins size={18} />}
        />

        <StatCard
          label="Transactions"
          value={eventTxns.length}
          icon={<FileSpreadsheet size={18} />}
        />
      </div>

      {/* Action Bar */}
      {!readOnly && (
        <div className="flex items-center justify-end gap-3 flex-wrap mb-6">
          {activeEvent.status === "Approved" && (
            <Button
              variant="ghost"
              onClick={() => setShowCompleteEventConfirm(true)}
              className="text-[var(--primary)] hover:bg-[var(--primary)]/10 font-bold border border-[var(--border)] shadow-2xs"
            >
              <CheckCircle size={15} /> Complete Event
            </Button>
          )}
          {activeEvent.status === "Completed" && (
            <Button variant="success" onClick={() => setShowLiquidationConfirm(true)}>
              <CheckCircle size={14} /> Complete Liquidation
            </Button>
          )}
          {activeEvent.status !== "Closed" && (
            <Button onClick={handleOpenAddRecord}>
              <Plus size={16} /> Add Record
            </Button>
          )}
          {activeEvent.status === "Closed" && (
            <Button variant="outline" onClick={() => setShowAddAmendment(true)}>
              <Plus size={14} /> Add Amendment
            </Button>
          )}
        </div>
      )}

      {/* Generated Liquidation PDF Banner for Closed / Reconciled Events */}
      {activeEvent.status === "Closed" && (
        <div className="bg-gradient-to-r from-teal-900 via-teal-800 to-teal-900 text-white rounded-2xl p-5 mb-6 shadow-md border border-teal-700 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-teal-200 flex-shrink-0">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">Digital Liquidation Report Reconciled</span>
              </div>
              <p className="text-xs text-teal-100/80 font-mono mt-0.5">
                Liquidation_Report_{activeEvent.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf · Generated and archived
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPdfModal(true)}
              className="bg-white/10 hover:bg-white/20 border-white/20 text-white font-medium text-xs gap-1.5"
            >
              <FileText size={13} /> View Report
            </Button>
          </div>
        </div>
      )}

      {/* Download notification feedback */}
      {downloadSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono px-4 py-2.5 rounded-xl mb-4 flex items-center gap-2 animate-fade-in shadow-2xs">
          <CheckCircle size={14} className="text-emerald-600" />
          <span>Downloading <strong>Liquidation_Report_{activeEvent.name.replace(/[^a-zA-Z0-9]/g, '_')}.html</strong> to your local device...</span>
        </div>
      )}

      {/* Transaction Records Table Card */}
      <Card className="mb-6">
        <CardHeader className="flex items-center justify-between border-b border-[var(--border)]">
          <h2 className="font-semibold text-sm text-[var(--foreground)]">Transaction Records</h2>
          <span className="text-xs font-mono text-[var(--muted-foreground)] font-medium">
            {eventTxns.length} logged
          </span>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[var(--muted)]/50 border-b border-[var(--border)]">
                {["Date", "Description", "Category", "Amount", "Status", "Receipt", ...(!readOnly ? ["Actions"] : [])].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {eventTxns.length === 0 ? (
                <tr>
                  <td colSpan={readOnly ? 6 : 7} className="px-4 py-10 text-center text-[var(--muted-foreground)]">
                    <FileText size={28} className="mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-medium">No financial transactions recorded yet.</p>
                    {!readOnly && activeEvent.status !== "Closed" && (
                      <Button size="sm" variant="outline" onClick={handleOpenAddRecord} className="mt-3">
                        <Plus size={13} /> Add First Record
                      </Button>
                    )}
                  </td>
                </tr>
              ) : (
                eventTxns.map((t) => (
                  <tr key={t.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)]/30 transition">
                    <td className="px-4 py-3 font-mono text-xs">{formatDate(t.createdAt)}</td>
                    <td className="px-4 py-3 font-medium text-[var(--foreground)]">{t.description}</td>
                    <td className="px-4 py-3 text-xs text-[var(--muted-foreground)] font-mono">
                      {getCategoryById(t.categoryId)?.name ?? "Other"}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-[var(--foreground)]">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full font-bold shadow-2xs ${
                        t.status === "Paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {t.receiptUrl ? (
                        <button
                          onClick={() => setPreviewReceipt({
                            title: t.description,
                            url: resolvePdfUrl(t.receiptUrl, "receipt"),
                            fileName: t.receiptUrl?.startsWith("data:") ? "Uploaded Receipt" : t.receiptUrl?.split("/").pop() || "Official Receipt"
                          })}
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--primary)] hover:underline bg-[var(--muted)]/60 border border-[var(--border)] px-2.5 py-1 rounded-lg transition cursor-pointer"
                          title="View attached receipt"
                        >
                          <Paperclip size={12} />
                          <span>Receipt</span>
                        </button>
                      ) : (
                        <span className="text-[11px] font-mono text-[var(--muted-foreground)]">—</span>
                      )}
                    </td>
                    {!readOnly && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(t)}
                            className="w-7 h-7 rounded-lg border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] flex items-center justify-center transition cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Edit transaction"
                            disabled={activeEvent.status === "Closed"}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmTxn(t)}
                            className="w-7 h-7 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Delete transaction"
                            disabled={activeEvent.status === "Closed"}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Student Amendments & Adjustments History Card (Clean sans typography) */}
      {activeEvent.remarks && activeEvent.remarks.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="border-b border-[var(--border)] pb-2 flex items-center justify-between">
            <h2 className="font-semibold text-sm text-[var(--foreground)]">Student Ledger Amendments & Adjustments History</h2>
            <span className="text-xs text-[var(--muted-foreground)] font-medium">{activeEvent.remarks.length} entries</span>
          </CardHeader>
          <CardBody className="p-4 flex flex-col gap-2.5">
            {activeEvent.remarks.map((r, i) => (
              <div key={i} className="p-3 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)] flex items-start gap-2.5 text-xs">
                <span className="w-2 h-2 rounded-full bg-teal-600 mt-1.5 flex-shrink-0" />
                <span className="leading-relaxed text-[var(--foreground)] font-normal">{r}</span>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {/* Event Revenue & Proceeds Summary Card */}
      {activeEvent.revenue !== undefined && activeEvent.revenue > 0 && (
        <Card className="mb-6 border-teal-200 bg-gradient-to-br from-teal-50/50 via-[var(--card)] to-teal-50/30">
          <CardHeader className="border-b border-teal-100 pb-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                <Coins size={14} />
              </div>
              <h2 className="font-semibold text-sm text-[var(--foreground)]">Event Revenue & Proceeds Summary</h2>
            </div>
            <span className="text-xs font-bold text-teal-800 bg-teal-100/80 px-2.5 py-0.5 rounded-full border border-teal-200">
              Official Proceeds Logged
            </span>
          </CardHeader>
          <CardBody className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">Total Gross Revenue</span>
                <span className="text-lg font-extrabold text-teal-900 font-mono">{formatCurrency(activeEvent.revenue)}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">Net Treasury Surplus</span>
                <span className="text-lg font-extrabold text-emerald-800 font-mono">{formatCurrency(remaining + activeEvent.revenue)}</span>
              </div>
              <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <span className="text-[11px] font-medium text-[var(--muted-foreground)] block mb-1">Status</span>
                <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1 mt-1">
                  <CheckCircle size={13} /> Reconciled to Treasury
                </span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* ── DIALOG: ADD TRANSACTION RECORD ──────────────────────────────── */}
      <Dialog open={showAddRecord} onClose={handleCloseAddRecord} title="Add Transaction Record" size="md">
        <div className="p-6 flex flex-col gap-4">
          <Input
            label="Description *"
            value={newTxn.description}
            onChange={(e) => setNewTxn((p) => ({ ...p, description: e.target.value }))}
            placeholder="e.g., Venue booking deposit"
          />

          <Select
            label="Expenditure Category *"
            value={newTxn.categoryId}
            onChange={(e) => setNewTxn((p) => ({ ...p, categoryId: e.target.value }))}
            options={expenditureCategories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div>
            <Input
              label="Amount (₱) *"
              type="text"
              inputMode="decimal"
              value={newTxn.amount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  setNewTxn((p) => ({ ...p, amount: val }));
                }
              }}
              placeholder="0.00"
            />
            <div className="flex items-center justify-between text-[11px] font-mono mt-1 px-1">
              <span className="text-[var(--muted-foreground)]">
                Allocated Budget: <strong className="text-[var(--foreground)]">{formatCurrency(budget)}</strong>
              </span>
              {isAddOverBudget ? (
                <span className="text-rose-600 font-bold">
                  ⚠ Exceeds Event Budget ({formatCurrency(budget)})
                </span>
              ) : (
                <span className="text-[var(--muted-foreground)]">
                  Remaining: <strong className="text-emerald-700 dark:text-emerald-600">{formatCurrency(remaining)}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Status strictly limited to Pending and Paid */}
          <Select
            label="Status *"
            value={newTxn.status}
            onChange={(e) => setNewTxn((p) => ({ ...p, status: e.target.value as "Pending" | "Paid" }))}
            options={[
              { value: "Paid", label: "Paid" },
              { value: "Pending", label: "Pending" },
            ]}
          />

          {/* Working Receipt File Upload */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--foreground)]">
                Receipt Attachment *
              </label>
              <span className="text-[10px] font-mono text-[var(--primary)] font-bold">
                Required
              </span>
            </div>
            <input
              type="file"
              ref={addReceiptInputRef}
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleAddReceiptChange}
            />
            {newTxn.receiptName || newTxn.receiptPreviewUrl ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-teal-200 bg-teal-50/60 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCheck size={16} className="text-teal-700 flex-shrink-0" />
                  <span className="font-mono font-medium text-teal-900 truncate">
                    {newTxn.receiptName || "Attached Receipt"}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => addReceiptInputRef.current?.click()}
                    className="text-xs font-mono text-teal-700 hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTxn((p) => ({ ...p, receiptName: "", receiptPreviewUrl: "" }))}
                    className="text-xs font-mono text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => addReceiptInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] rounded-xl p-5 text-center transition cursor-pointer hover:bg-[var(--muted)]/20"
              >
                <UploadCloud size={24} className="mx-auto text-[var(--muted-foreground)] mb-1.5" />
                <p className="text-xs font-medium text-[var(--foreground)]">Click to upload official receipt (PNG, JPG, or PDF) *</p>
                <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5">Maximum file size 10MB</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="outline" onClick={handleCloseAddRecord}>Cancel</Button>
            <Button
              onClick={handleAddRecordSubmit}
              disabled={!isAddRecordValid}
              title={
                !isAddRecordValid
                  ? !newTxn.description.trim()
                    ? "Please enter transaction description"
                    : isAddOverBudget
                    ? `Amount exceeds event allocated budget of ${formatCurrency(budget)}`
                    : !newTxn.amount || isNaN(parseFloat(newTxn.amount)) || parseFloat(newTxn.amount) <= 0
                    ? "Please enter a valid numeric amount"
                    : "Please attach a receipt document"
                  : undefined
              }
            >
              <Plus size={14} /> Add Record
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── DIALOG: EDIT TRANSACTION RECORD ──────────────────────────────── */}
      <Dialog open={!!editTxn} onClose={() => setEditTxn(null)} title="Edit Transaction Record" size="md">
        <div className="p-6 flex flex-col gap-4">
          <Input
            label="Description *"
            value={editTxnForm.description}
            onChange={(e) => setEditTxnForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="e.g., Venue booking deposit"
          />

          <Select
            label="Expenditure Category *"
            value={editTxnForm.categoryId}
            onChange={(e) => setEditTxnForm((p) => ({ ...p, categoryId: e.target.value }))}
            options={expenditureCategories.map((c) => ({ value: c.id, label: c.name }))}
          />

          <div>
            <Input
              label="Amount (₱) *"
              type="text"
              inputMode="decimal"
              value={editTxnForm.amount}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d*\.?\d*$/.test(val)) {
                  setEditTxnForm((p) => ({ ...p, amount: val }));
                }
              }}
              placeholder="0.00"
            />
            <div className="flex items-center justify-between text-[11px] font-mono mt-1 px-1">
              <span className="text-[var(--muted-foreground)]">
                Allocated Budget: <strong className="text-[var(--foreground)]">{formatCurrency(budget)}</strong>
              </span>
              {isEditOverBudget ? (
                <span className="text-rose-600 font-bold">
                  ⚠ Exceeds Event Budget ({formatCurrency(budget)})
                </span>
              ) : null}
            </div>
          </div>

          {/* Status strictly limited to Pending and Paid */}
          <Select
            label="Status *"
            value={editTxnForm.status}
            onChange={(e) => setEditTxnForm((p) => ({ ...p, status: e.target.value as "Pending" | "Paid" }))}
            options={[
              { value: "Paid", label: "Paid" },
              { value: "Pending", label: "Pending" },
            ]}
          />

          {/* Working Receipt File Upload in Edit Mode */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--foreground)]">
                Receipt Attachment *
              </label>
              <span className="text-[10px] font-mono text-[var(--primary)] font-bold">
                Required
              </span>
            </div>
            <input
              type="file"
              ref={editReceiptInputRef}
              accept="image/*,.pdf"
              className="hidden"
              onChange={handleEditReceiptChange}
            />
            {editTxnForm.receiptName || editTxnForm.receiptPreviewUrl ? (
              <div className="flex items-center justify-between p-3 rounded-xl border border-teal-200 bg-teal-50/60 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCheck size={16} className="text-teal-700 flex-shrink-0" />
                  <span className="font-mono font-medium text-teal-900 truncate">
                    {editTxnForm.receiptName || "Attached Receipt"}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => editReceiptInputRef.current?.click()}
                    className="text-xs font-mono text-teal-700 hover:underline cursor-pointer"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTxnForm((p) => ({ ...p, receiptName: "", receiptPreviewUrl: "" }))}
                    className="text-xs font-mono text-rose-600 hover:underline cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => editReceiptInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--primary)] rounded-xl p-5 text-center transition cursor-pointer hover:bg-[var(--muted)]/20"
              >
                <UploadCloud size={24} className="mx-auto text-[var(--muted-foreground)] mb-1.5" />
                <p className="text-xs font-medium text-[var(--foreground)]">Click to attach or replace receipt *</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setEditTxn(null)}>Cancel</Button>
            <Button onClick={handleEditRecordSubmit} disabled={!isEditRecordValid}>
              Save Changes
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── DIALOG: DELETE CONFIRMATION ──────────────────────────────── */}
      <Dialog open={!!deleteConfirmTxn} onClose={() => setDeleteConfirmTxn(null)} title="Confirm Transaction Deletion" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-[var(--foreground)]">Delete this record?</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Are you sure you want to remove this transaction from the ledger? It will be archived and removed from expense totals.
              </p>
            </div>
          </div>

          {deleteConfirmTxn && (
            <div className="p-3 bg-[var(--muted)]/50 rounded-xl border border-[var(--border)] text-xs font-mono space-y-1">
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Item:</span>
                <span className="font-bold text-[var(--foreground)]">{deleteConfirmTxn.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--muted-foreground)]">Amount:</span>
                <span className="font-bold text-rose-600">{formatCurrency(deleteConfirmTxn.amount)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setDeleteConfirmTxn(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              <Trash2 size={13} /> Delete Record
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── DIALOG: COMPLETE EVENT CONFIRMATION ──────────────────────────── */}
      <Dialog
        open={showCompleteEventConfirm}
        onClose={() => setShowCompleteEventConfirm(false)}
        title="Mark Event as Completed"
        size="sm"
      >
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-teal-50 border border-teal-200">
            <CheckCircle size={20} className="text-teal-700 flex-shrink-0" />
            <p className="text-xs text-teal-900 leading-relaxed">
              Marking <strong>'{activeEvent.name}'</strong> as completed transitions the event to the post-event stage and enables the <strong>Complete Liquidation</strong> workflow.
            </p>
          </div>

          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            Are you sure you want to change this event's status from <strong>Approved</strong> to <strong>Completed</strong>?
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowCompleteEventConfirm(false)}>
              Cancel
            </Button>
            <Button variant="success" onClick={handleCompleteEvent}>
              <CheckCircle size={14} /> Yes, Complete Event
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── DIALOG: COMPLETE LIQUIDATION ──────────────────────────────── */}
      <Dialog open={showLiquidationConfirm} onClose={() => setShowLiquidationConfirm(false)} title="Complete Event Liquidation" size="sm">
        <div className="p-6 flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-teal-50 border border-teal-200">
            <CheckCircle size={20} className="text-teal-700 flex-shrink-0" />
            <p className="text-xs text-teal-900 leading-relaxed">
              Completing liquidation will finalize the event ledger and generate an official PDF Liquidation Certificate.
            </p>
          </div>

          <Input
            label="Total Event Revenue Generated (Optional)"
            type="number"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            placeholder="0.00"
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowLiquidationConfirm(false)}>Cancel</Button>
            <Button variant="success" onClick={handleCompleteLiquidation}>
              <CheckCircle size={14} /> Finalize & Generate PDF
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── DIALOG: ADD AMENDMENT ──────────────────────────────── */}
      <Dialog open={showAddAmendment} onClose={() => setShowAddAmendment(false)} title="Add Financial Amendment" size="md">
        <div className="p-6 flex flex-col gap-4">
          <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
            Amendments allow recording post-liquidation adjustments, supplementary reimbursements, or official audit remarks.
          </p>

          <Input
            label="Amendment Note / Description *"
            value={amendmentNote}
            onChange={(e) => setAmendmentNote(e.target.value)}
            placeholder="e.g., Post-event reimbursement for extra audio cable receipt"
          />

          <Input
            label="Adjustment Amount (₱, Optional)"
            type="number"
            value={amendmentAmount}
            onChange={(e) => setAmendmentAmount(e.target.value)}
            placeholder="0.00"
          />

          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setShowAddAmendment(false)}>Cancel</Button>
            <Button onClick={handleAddAmendmentSubmit} disabled={!amendmentNote.trim()}>
              Save Amendment
            </Button>
          </div>
        </div>
      </Dialog>

      {/* ── DIALOG: RECEIPT LIGHTBOX MODAL ──────────────────────────────── */}
      {previewReceipt && (
        <Dialog open={!!previewReceipt} onClose={() => setPreviewReceipt(null)} title={`Transaction Receipt: ${previewReceipt.title}`} size="lg">
          <div className="p-6 flex flex-col items-center gap-4">
            {previewReceipt.url.startsWith("data:image/") || previewReceipt.url.startsWith("blob:") || /\.(png|jpe?g|webp|gif|svg)$/i.test(previewReceipt.url) ? (
              <div className="w-full flex flex-col items-center gap-3">
                <div className="max-h-[60vh] w-full overflow-auto flex items-center justify-center bg-slate-900/5 p-3 rounded-2xl border border-[var(--border)]">
                  <img
                    src={previewReceipt.url}
                    alt={previewReceipt.title}
                    className="max-h-[50vh] max-w-full object-contain rounded-xl shadow-md bg-white border border-[var(--border)]"
                  />
                </div>
                <div className="flex items-center justify-between w-full text-xs text-[var(--muted-foreground)] px-1">
                  <span className="font-mono truncate max-w-[240px]">{previewReceipt.fileName || previewReceipt.title}</span>
                  <a
                    href={previewReceipt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={previewReceipt.fileName || "receipt"}
                    className="inline-flex items-center gap-1 text-[var(--primary)] font-mono hover:underline font-bold"
                  >
                    <ExternalLink size={12} /> Open Full Size
                  </a>
                </div>
              </div>
            ) : previewReceipt.url.startsWith("data:application/pdf") || previewReceipt.url.endsWith(".pdf") ? (
              <div className="w-full flex flex-col items-center gap-3">
                <iframe
                  src={previewReceipt.url}
                  title={previewReceipt.title}
                  className="w-full h-[50vh] rounded-2xl border border-[var(--border)] bg-white shadow-xs"
                />
                <div className="flex items-center justify-between w-full text-xs text-[var(--muted-foreground)] px-1">
                  <span className="font-mono truncate">{previewReceipt.fileName || previewReceipt.title}</span>
                  <a
                    href={previewReceipt.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={previewReceipt.fileName || "receipt.pdf"}
                    className="inline-flex items-center gap-1 text-[var(--primary)] font-mono hover:underline font-bold"
                  >
                    <ExternalLink size={12} /> Download PDF
                  </a>
                </div>
              </div>
            ) : (
              <div className="w-full bg-[var(--muted)]/50 rounded-2xl p-6 border border-[var(--border)] text-center">
                <FileText size={48} className="mx-auto text-teal-700 mb-3" />
                <p className="text-sm font-bold text-[var(--foreground)]">{previewReceipt.title}</p>
                <p className="text-xs font-mono text-[var(--muted-foreground)] mt-1">Official Voucher / Tax Invoice Attached</p>
                <div className="mt-4 p-3 bg-white rounded-xl border border-[var(--border)] text-xs font-mono inline-flex items-center gap-2">
                  <CheckCircle size={14} className="text-emerald-600" />
                  <span>Verified Receipt Document Stored in Cloud Ledger</span>
                </div>
              </div>
            )}

            <div className="flex justify-end w-full pt-2 border-t border-[var(--border)]">
              <Button variant="outline" size="sm" onClick={() => setPreviewReceipt(null)}>Close</Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* ── DIALOG: GENERATED LIQUIDATION REPORT PDF PREVIEW ──────────────────────────────── */}
      <Dialog open={showPdfModal} onClose={() => setShowPdfModal(false)} title="Digital Liquidation Report (PDF)" size="2xl">
        <div className="p-6 flex flex-col gap-6 max-h-[80vh] overflow-y-auto">
          {/* Simulated PDF Document Header */}
          <div className="bg-white border-2 border-slate-300 rounded-2xl p-8 shadow-sm text-slate-800 font-sans space-y-6">
            {/* University Letterhead */}
            <div className="flex items-center justify-between border-b-2 border-teal-800 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-teal-900 text-white flex items-center justify-center font-extrabold text-xl shadow-md">
                  LCUP
                </div>
                <div>
                  <h3 className="font-extrabold text-lg uppercase tracking-wide text-teal-950">
                    La Consolacion University Philippines
                  </h3>
                  <p className="text-xs font-medium text-slate-600">College of Information Technology & Engineering</p>
                  <p className="text-[11px] font-mono text-teal-800 font-bold">{org?.name || "Student Organization"}</p>
                </div>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="px-3 py-1 rounded-md bg-teal-100 text-teal-900 font-bold border border-teal-300">
                  DIGITAL LIQUIDATION
                </span>
                <p className="text-[11px] text-slate-500 mt-1.5">Doc Ref: {cleanDocRef}</p>
              </div>
            </div>

            {/* Event Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono">
              <div>
                <span className="text-slate-500 block uppercase text-[10px] font-bold">Event Name</span>
                <span className="font-bold text-slate-900">{activeEvent.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[10px] font-bold">Date Conducted</span>
                <span className="font-bold text-slate-900">{formatDate(activeEvent.dateStart)}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[10px] font-bold">Approved Budget</span>
                <span className="font-bold text-teal-800">{formatCurrency(budget)}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase text-[10px] font-bold">Total Disbursed</span>
                <span className="font-bold text-slate-950">{formatCurrency(eventSpent)}</span>
              </div>
            </div>

            {/* Itemized Table */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-700 mb-2">
                Itemized Financial Statement
              </h4>
              <table className="w-full text-xs font-mono border border-slate-200 rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                    <th className="p-2.5 text-left">#</th>
                    <th className="p-2.5 text-left">Description</th>
                    <th className="p-2.5 text-left">Category</th>
                    <th className="p-2.5 text-right">Amount (₱)</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {eventTxns.map((t, idx) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-500">{idx + 1}</td>
                      <td className="p-2.5 font-medium">{t.description}</td>
                      <td className="p-2.5 text-slate-600">{getCategoryById(t.categoryId)?.name}</td>
                      <td className="p-2.5 text-right font-bold">{formatCurrency(t.amount)}</td>
                      <td className="p-2.5 text-center">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-teal-50/80 font-bold border-t-2 border-teal-700">
                    <td colSpan={3} className="p-2.5 text-right text-teal-950">TOTAL EXPENDITURES:</td>
                    <td className="p-2.5 text-right text-teal-950">{formatCurrency(eventSpent)}</td>
                    <td className="p-2.5 text-center text-teal-800 text-[10px]">100% RECONCILED</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Reconciliation Balance */}
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono">
                <span className="text-slate-600">Net Balance Remaining (Surplus / Reversion):</span>
                <span className="font-bold text-teal-900 text-sm">{formatCurrency(remaining)}</span>
              </div>

              {activeEvent.revenue !== undefined && activeEvent.revenue > 0 && (
                <>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-teal-50 border border-teal-200 text-xs font-mono">
                    <span className="text-teal-900">Total Gross Event Revenue Generated:</span>
                    <span className="font-bold text-teal-900 text-sm">{formatCurrency(activeEvent.revenue)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-xs font-mono">
                    <span className="text-emerald-950 font-bold">Net Total Surplus Reconciled to Treasury:</span>
                    <span className="font-extrabold text-emerald-800 text-sm">{formatCurrency(remaining + activeEvent.revenue)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Official Signatories Sign-off */}
            <div className="pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs font-mono">
              <div className="text-center">
                <div className="h-9 flex items-center justify-center">
                  <span className="text-[11px] font-mono text-emerald-700 font-bold border-b border-emerald-500 pb-0.5">
                    ✓ Digitally Certified
                  </span>
                </div>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1.5">{liquidatorName}</p>
                <p className="text-[10px] text-slate-500">Student Finance Officer, {org?.name || "Student Organization"}</p>
              </div>

              <div className="text-center">
                <div className="h-9 flex items-center justify-center">
                  {/* Blank signature space for adviser */}
                </div>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1.5">{adviserName}</p>
                <p className="text-[10px] text-slate-500">Organization Adviser</p>
              </div>

              <div className="text-center">
                <div className="h-9 flex items-center justify-center">
                  {/* Blank signature space for dean */}
                </div>
                <p className="font-bold text-slate-900 border-t border-slate-400 pt-1.5">{deanName}</p>
                <p className="text-[10px] text-slate-500">College Dean, CITE</p>
              </div>
            </div>
          </div>

          {/* Dialog Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="outline" size="sm" onClick={() => setShowPdfModal(false)}>
              Close
            </Button>
            <Button variant="success" size="sm" onClick={handleTriggerOpenPdf} className="gap-1.5">
              <ExternalLink size={14} /> Open PDF
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
