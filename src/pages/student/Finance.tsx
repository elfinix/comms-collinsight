import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { StatCard, Card, CardHeader, CardBody, Button, Dialog, Input, Select, EmptyState } from "../../components/ui";
import { DollarSign, Plus, Eye, Trash2, Edit2, FileText, CheckCircle, UploadCloud, RotateCcw } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from "recharts";
import { formatCurrency, formatDate, formatDateTime, statusColors, getCategoryById, expenditureCategories, Transaction } from "../../services/mockData";

const COLORS = ["#0d9488", "#0284c7", "#7c3aed", "#f59e0b", "#ef4444", "#10b981", "#f97316"];

export default function StudentFinance() {
  const { currentUser } = useAuth();
  const { events, transactions, organizations, addTransaction, updateTransaction, deleteTransaction, updateEvent } = useApp();
  const navigate = useNavigate();

  const orgId = currentUser?.organizationId ?? "";
  const org = organizations.find((o) => o.id === orgId);
  const approvedEvents = events.filter((e) => e.organizationId === orgId && ["Approved", "Completed", "Closed"].includes(e.status));
  const allTxns = transactions.filter((t) => approvedEvents.some((e) => e.id === t.eventId) && !t.deleted);

  const totalSpent = allTxns.reduce((s, t) => s + t.amount, 0);
  const allocatedBudget = org?.allocatedBudget ?? 0;
  const remaining = allocatedBudget - totalSpent;

  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [showAddRecord, setShowAddRecord] = useState(false);
  const [showLiquidationConfirm, setShowLiquidationConfirm] = useState(false);
  const [revenue, setRevenue] = useState("0");
  const [editTxn, setEditTxn] = useState<Transaction | null>(null);
  const [newTxn, setNewTxn] = useState({ description: "", categoryId: expenditureCategories[0].id, amount: "", status: "Paid", receiptUrl: "" });

  const activeEvent = selectedEvent ? events.find((e) => e.id === selectedEvent) : null;
  const eventTxns = selectedEvent ? transactions.filter((t) => t.eventId === selectedEvent && !t.deleted) : [];
  const eventSpent = eventTxns.reduce((s, t) => s + t.amount, 0);

  const byCategory = Object.entries(
    allTxns.reduce<Record<string, number>>((acc, t) => {
      const name = getCategoryById(t.categoryId)?.name ?? "Other";
      acc[name] = (acc[name] || 0) + t.amount;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  function handleAddRecord() {
    if (!selectedEvent || !newTxn.description || !newTxn.amount) return;
    addTransaction({
      id: `txn-${Date.now()}`,
      eventId: selectedEvent,
      description: newTxn.description,
      categoryId: newTxn.categoryId,
      amount: parseFloat(newTxn.amount),
      status: newTxn.status as any,
      receiptUrl: newTxn.receiptUrl || undefined,
      createdAt: new Date().toISOString(),
    });
    setNewTxn({ description: "", categoryId: expenditureCategories[0].id, amount: "", status: "Paid", receiptUrl: "" });
    setShowAddRecord(false);
  }

  function handleCompleteLiquidation() {
    if (!selectedEvent) return;
    updateEvent(selectedEvent, { status: "Closed" });
    setShowLiquidationConfirm(false);
  }

  if (selectedEvent && activeEvent) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={() => setSelectedEvent(null)}>← Back</Button>
          <div>
            <h1 className="text-2xl font-bold text-[var(--foreground)]">{activeEvent.name}</h1>
            <p className="text-sm text-[var(--muted-foreground)] font-mono mt-0.5">Finance Ledger</p>
          </div>
          <span className={`ml-auto text-xs font-mono px-2 py-0.5 rounded-full ${statusColors[activeEvent.status]}`}>{activeEvent.status}</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Approved Budget" value={formatCurrency(activeEvent.proposedBudget)} icon={<DollarSign size={18} />} />
          <StatCard label="Total Spent" value={formatCurrency(eventSpent)} sub={`${Math.round((eventSpent / activeEvent.proposedBudget) * 100)}% used`} icon={<DollarSign size={18} />} />
          <StatCard label="Remaining" value={formatCurrency(activeEvent.proposedBudget - eventSpent)} icon={<DollarSign size={18} />} />
          <StatCard label="Transactions" value={eventTxns.length} icon={<FileText size={18} />} />
        </div>

        <div className="flex gap-3 flex-wrap mb-6">
          {activeEvent.status !== "Closed" && (
            <Button onClick={() => setShowAddRecord(true)}>
              <Plus size={16} /> Add Record
            </Button>
          )}
          <Button variant="outline" onClick={() => {
            updateEvent(activeEvent.id, { remarks: [...(activeEvent.remarks ?? []), `Rescheduled on ${formatDate(new Date().toISOString())}`] });
          }}>
            <RotateCcw size={14} /> Reschedule
          </Button>
          {activeEvent.status === "Completed" && (
            <Button variant="success" onClick={() => setShowLiquidationConfirm(true)}>
              <CheckCircle size={14} /> Complete Liquidation
            </Button>
          )}
          {activeEvent.status === "Closed" && (
            <Button variant="outline" onClick={() => {
              updateEvent(activeEvent.id, { remarks: [...(activeEvent.remarks ?? []), `Amendment added on ${formatDate(new Date().toISOString())}`] });
            }}>
              Add Amendment
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-semibold">Transaction Records</h2>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {["Date", "Description", "Category", "Amount", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventTxns.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--muted-foreground)]">No records yet. Add your first transaction.</td></tr>
                ) : (
                  eventTxns.map((t) => (
                    <tr key={t.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition">
                      <td className="px-4 py-3 font-mono text-xs">{formatDate(t.createdAt)}</td>
                      <td className="px-4 py-3 font-medium">{t.description}</td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">{getCategoryById(t.categoryId)?.name}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-[var(--primary)]">{formatCurrency(t.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${t.status === "Paid" ? "bg-green-100 text-green-700" : t.status === "Pending" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {activeEvent.status !== "Closed" && (
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="outline" onClick={() => setEditTxn(t)}><Edit2 size={12} /></Button>
                            <Button size="sm" variant="danger" onClick={() => deleteTransaction(t.id)}><Trash2 size={12} /></Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {eventTxns.length > 0 && (
            <div className="px-4 py-3 bg-[var(--muted)] border-t border-[var(--border)] flex justify-end">
              <span className="text-sm font-mono font-bold text-[var(--foreground)]">Total: {formatCurrency(eventSpent)}</span>
            </div>
          )}
        </Card>

        {/* Add Record Dialog */}
        <Dialog open={showAddRecord} onClose={() => setShowAddRecord(false)} title="Add Transaction Record" size="md">
          <div className="p-6 flex flex-col gap-4">
            <Input label="Description *" value={newTxn.description} onChange={(e) => setNewTxn((p) => ({ ...p, description: e.target.value }))} placeholder="e.g., Venue booking deposit" />
            <Select label="Expenditure Category *" value={newTxn.categoryId} onChange={(e) => setNewTxn((p) => ({ ...p, categoryId: e.target.value }))}
              options={expenditureCategories.map((c) => ({ value: c.id, label: c.name }))} />
            <Input label="Amount (₱) *" type="number" value={newTxn.amount} onChange={(e) => setNewTxn((p) => ({ ...p, amount: e.target.value }))} placeholder="0.00" />
            <Select label="Status *" value={newTxn.status} onChange={(e) => setNewTxn((p) => ({ ...p, status: e.target.value }))}
              options={[{ value: "Pending", label: "Pending" }, { value: "Paid", label: "Paid" }, { value: "Reimbursed", label: "Reimbursed" }]} />
            <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center">
              <UploadCloud size={24} className="mx-auto text-[var(--muted-foreground)] mb-2" />
              <p className="text-xs text-[var(--muted-foreground)] mb-2">Upload Receipt (required)</p>
              <Button variant="outline" size="sm">Choose Receipt</Button>
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setShowAddRecord(false)}>Cancel</Button>
              <Button onClick={handleAddRecord} disabled={!newTxn.description || !newTxn.amount}>
                <Plus size={14} /> Add Record
              </Button>
            </div>
          </div>
        </Dialog>

        {/* Liquidation Confirm */}
        <Dialog open={showLiquidationConfirm} onClose={() => setShowLiquidationConfirm(false)} title="Complete Liquidation" size="sm">
          <div className="p-6 flex flex-col gap-4">
            <p className="text-sm text-[var(--foreground)]">Please enter the revenue generated from this event (if any).</p>
            <Input label="Revenue (₱)" type="number" value={revenue} onChange={(e) => setRevenue(e.target.value)} placeholder="0.00" />
            <p className="text-xs text-[var(--muted-foreground)]">A liquidation report PDF will be generated for officers, advisers, and the Dean.</p>
            <div className="flex justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <Button variant="outline" onClick={() => setShowLiquidationConfirm(false)}>Cancel</Button>
              <Button variant="success" onClick={handleCompleteLiquidation}>
                <CheckCircle size={14} /> Complete Liquidation
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Finance</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Organizational financial overview and event ledgers.</p>
      </div>

      {/* Org Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Allocated Budget" value={formatCurrency(allocatedBudget)} icon={<DollarSign size={18} />} />
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={<DollarSign size={18} />} />
        <StatCard label="Remaining" value={formatCurrency(remaining)} icon={<DollarSign size={18} />} trend={remaining < 0 ? "down" : "up"} />
        <StatCard label="Approved Events" value={approvedEvents.length} icon={<CheckCircle size={18} />} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader><h2 className="font-semibold">Spending by Category</h2></CardHeader>
          <CardBody>
            {byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label={({ name }: { name?: string }) => (name ?? "").split(" ")[0]}>
                    {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-[var(--muted-foreground)] text-sm">No data yet.</div>
            )}
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-semibold">Spending per Event</h2></CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={approvedEvents.map((e) => ({
                name: e.name.split(" ").slice(0, 2).join(" "),
                spent: transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0),
                budget: e.proposedBudget,
              }))} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v: any) => formatCurrency(v)} />
                <Bar dataKey="budget" fill="#ccfbf1" radius={[4, 4, 0, 0]} name="Budget" />
                <Bar dataKey="spent" fill="#0d9488" radius={[4, 4, 0, 0]} name="Spent" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Approved Events */}
      <Card>
        <CardHeader><h2 className="font-semibold">Approved Events — Financial Ledger</h2></CardHeader>
        {approvedEvents.length === 0 ? (
          <CardBody>
            <EmptyState title="No approved events yet" description="Events will appear here once approved by the Dean." />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {["Event", "Date", "Budget", "Spent", "Remaining", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-mono font-semibold text-[var(--muted-foreground)]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {approvedEvents.map((e) => {
                  const spent = transactions.filter((t) => t.eventId === e.id && !t.deleted).reduce((s, t) => s + t.amount, 0);
                  const rem = e.proposedBudget - spent;
                  return (
                    <tr key={e.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition cursor-pointer" onClick={() => setSelectedEvent(e.id)}>
                      <td className="px-4 py-3 font-medium max-w-[200px] truncate">{e.name}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatDate(e.dateStart)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatCurrency(e.proposedBudget)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--primary)] font-semibold">{formatCurrency(spent)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{formatCurrency(rem)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${statusColors[e.status]}`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {e.status === "Closed" && (
                          <Button size="sm" variant="outline" onClick={(ev) => { ev.stopPropagation(); }}>
                            <FileText size={12} /> PDF
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
