import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import {
  events as initialEvents,
  transactions as initialTransactions,
  users as initialUsers,
  departments as initialDepartments,
  organizations as initialOrganizations,
  eventTypes as initialEventTypes,
  expenditureCategories as initialCategories,
  auditTrail as initialAudit,
  Event,
  Transaction,
  User,
  Department,
  Organization,
  EventType,
  ExpenditureCategory,
  AuditEntry,
  EventStatus,
} from "../services/mockData";

interface AppContextType {
  events: Event[];
  transactions: Transaction[];
  users: User[];
  departments: Department[];
  organizations: Organization[];
  eventTypes: EventType[];
  expenditureCategories: ExpenditureCategory[];
  auditTrail: AuditEntry[];
  addEvent: (event: Event) => void;
  updateEvent: (id: string, updates: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  addTransaction: (txn: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  addDepartment: (dept: Department) => void;
  updateDepartment: (id: string, updates: Partial<Department>) => void;
  deleteDepartment: (id: string) => void;
  addOrganization: (org: Organization) => void;
  updateOrganization: (id: string, updates: Partial<Organization>) => void;
  deleteOrganization: (id: string) => void;
  addEventType: (et: EventType) => void;
  deleteEventType: (id: string) => void;
  addCategory: (cat: ExpenditureCategory) => void;
  deleteCategory: (id: string) => void;
  setEventStatus: (eventId: string, status: EventStatus, feedback?: string) => void;
  addAuditEntry: (entry: AuditEntry) => void;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  dataDensity: number;
  setDataDensity: (n: number) => void;
  tableDensity: "comfortable" | "compact";
  setTableDensity: (d: "comfortable" | "compact") => void;
  defaultView: "grid" | "list";
  setDefaultView: (v: "grid" | "list") => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [evts, setEvts] = useState<Event[]>(initialEvents);
  const [txns, setTxns] = useState<Transaction[]>(initialTransactions);
  const [usrs, setUsrs] = useState<User[]>(initialUsers);
  const [depts, setDepts] = useState<Department[]>(initialDepartments);
  const [orgs, setOrgs] = useState<Organization[]>(initialOrganizations);
  const [etypes, setEtypes] = useState<EventType[]>(initialEventTypes);
  const [cats, setCats] = useState<ExpenditureCategory[]>(initialCategories);
  const [audit, setAudit] = useState<AuditEntry[]>(initialAudit);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [dataDensity, setDataDensity] = useState(10);
  const [tableDensity, setTableDensity] = useState<"comfortable" | "compact">("comfortable");
  const [defaultView, setDefaultView] = useState<"grid" | "list">("grid");

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("compact-density", tableDensity === "compact");
    }
  }, [tableDensity]);

  const addAuditEntry = (entry: AuditEntry) => setAudit((p) => [entry, ...p]);

  const addEvent = (e: Event) => {
    setEvts((p) => [...p, e]);
    addAuditEntry({
      id: `audit-${Date.now()}`,
      eventId: e.id,
      organizationId: e.organizationId,
      userId: e.createdBy || "user-stu-1",
      actorRole: "student",
      action: "Created Event",
      details: `Created event proposal for '${e.name}'`,
      statusTo: e.status || "Created",
      timestamp: new Date().toISOString(),
    });
  };

  const updateEvent = (id: string, u: Partial<Event>) => {
    let targetEvt: Event | undefined;
    setEvts((p) =>
      p.map((e) => {
        if (e.id !== id) return e;
        targetEvt = e;
        return { ...e, ...u };
      })
    );
    if (targetEvt) {
      if (u.status === "Closed") {
        const rev = u.revenue !== undefined ? u.revenue : (targetEvt as Event).revenue;
        const revStr = rev !== undefined && rev > 0 ? ` (Revenue: ₱${rev.toLocaleString()})` : "";
        addAuditEntry({
          id: `audit-${Date.now()}`,
          eventId: id,
          organizationId: (targetEvt as Event).organizationId,
          userId: (targetEvt as Event).createdBy || "user-stu-1",
          actorRole: "student",
          action: "Event Closed",
          details: `Finalized liquidation and closed event '${(targetEvt as Event).name}'${revStr}`,
          statusFrom: (targetEvt as Event).status,
          statusTo: "Closed",
          timestamp: new Date().toISOString(),
        });
      } else if (!u.status || u.status === (targetEvt as Event).status) {
        addAuditEntry({
          id: `audit-${Date.now()}`,
          eventId: id,
          organizationId: (targetEvt as Event).organizationId,
          userId: (targetEvt as Event).createdBy || "user-stu-1",
          actorRole: "student",
          action: "Modified Proposal",
          details: `Updated proposal details for '${u.name || (targetEvt as Event).name}'`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  const deleteEvent = (id: string) => {
    const targetEvt = evts.find((e) => e.id === id);
    setEvts((p) => p.map((e) => (e.id === id ? { ...e, deleted: true } : e)));
    if (targetEvt) {
      addAuditEntry({
        id: `audit-${Date.now()}`,
        eventId: id,
        organizationId: targetEvt.organizationId,
        userId: targetEvt.createdBy || "user-stu-1",
        actorRole: "student",
        action: "Deleted Proposal",
        details: `Deleted event proposal '${targetEvt.name}'`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const addTransaction = (t: Transaction) => {
    setTxns((p) => [...p, t]);
    const targetEvt = evts.find((e) => e.id === t.eventId);
    if (targetEvt) {
      addAuditEntry({
        id: `audit-${Date.now()}`,
        eventId: t.eventId,
        organizationId: targetEvt.organizationId,
        userId: targetEvt.createdBy || "user-stu-1",
        actorRole: "student",
        action: "Disbursed Expense",
        details: `Recorded ₱${t.amount.toLocaleString()} expenditure for '${targetEvt.name}'`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const updateTransaction = (id: string, u: Partial<Transaction>) => {
    let targetTxn: Transaction | undefined;
    setTxns((p) =>
      p.map((t) => {
        if (t.id !== id) return t;
        targetTxn = t;
        return { ...t, ...u };
      })
    );
    if (targetTxn) {
      const targetEvt = evts.find((e) => e.id === (targetTxn as Transaction).eventId);
      if (targetEvt) {
        const newAmount = u.amount !== undefined ? u.amount : (targetTxn as Transaction).amount;
        addAuditEntry({
          id: `audit-${Date.now()}`,
          eventId: targetEvt.id,
          organizationId: targetEvt.organizationId,
          userId: targetEvt.createdBy || "user-stu-1",
          actorRole: "student",
          action: "Modified Expense",
          details: `Updated expense entry to ₱${newAmount.toLocaleString()} for '${targetEvt.name}'`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  const deleteTransaction = (id: string) => {
    const targetTxn = txns.find((t) => t.id === id);
    setTxns((p) => p.map((t) => (t.id === id ? { ...t, deleted: true } : t)));
    if (targetTxn) {
      const targetEvt = evts.find((e) => e.id === targetTxn.eventId);
      if (targetEvt) {
        addAuditEntry({
          id: `audit-${Date.now()}`,
          eventId: targetEvt.id,
          organizationId: targetEvt.organizationId,
          userId: targetEvt.createdBy || "user-stu-1",
          actorRole: "student",
          action: "Removed Expense",
          details: `Removed expense entry of ₱${targetTxn.amount.toLocaleString()} for '${targetEvt.name}'`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  const addUser = (u: User) => setUsrs((p) => [...p, u]);
  const updateUser = (id: string, u: Partial<User>) => setUsrs((p) => p.map((x) => (x.id === id ? { ...x, ...u } : x)));
  const deleteUser = (id: string) => setUsrs((p) => p.map((u) => (u.id === id ? { ...u, deleted: true } : u)));

  const addDepartment = (d: Department) => setDepts((p) => [...p, d]);
  const updateDepartment = (id: string, u: Partial<Department>) => setDepts((p) => p.map((d) => (d.id === id ? { ...d, ...u } : d)));
  const deleteDepartment = (id: string) => setDepts((p) => p.map((d) => (d.id === id ? { ...d, deleted: true } : d)));

  const addOrganization = (o: Organization) => setOrgs((p) => [...p, o]);
  const updateOrganization = (id: string, u: Partial<Organization>) => setOrgs((p) => p.map((o) => (o.id === id ? { ...o, ...u } : o)));
  const deleteOrganization = (id: string) => setOrgs((p) => p.map((o) => (o.id === id ? { ...o, deleted: true } : o)));

  const addEventType = (et: EventType) => setEtypes((p) => [...p, et]);
  const deleteEventType = (id: string) => setEtypes((p) => p.map((e) => (e.id === id ? { ...e, deleted: true } : e)));

  const addCategory = (c: ExpenditureCategory) => setCats((p) => [...p, c]);
  const deleteCategory = (id: string) => setCats((p) => p.map((c) => (c.id === id ? { ...c, deleted: true } : c)));

  const setEventStatus = (eventId: string, status: EventStatus, feedback?: string) => {
    let targetEvt: Event | undefined;
    setEvts((p) =>
      p.map((e) => {
        if (e.id !== eventId) return e;
        targetEvt = e;
        const updates: Partial<Event> = { status };
        if (feedback) {
          if (status === "Pending Revision") updates.adviserFeedback = feedback;
        }
        return { ...e, ...updates };
      })
    );
    if (targetEvt) {
      const isDeanApproval = status === "Approved";
      const isAdviserApproval = status === "For Approval";
      const isRevision = status === "Pending Revision";
      const isSubmission = status === "For Review";
      const isCompleted = status === "Completed";
      const isClosed = status === "Closed";

      const actionName = isDeanApproval
        ? "Executive Approval"
        : isAdviserApproval
        ? "Approved & Forwarded"
        : isRevision
        ? "Requested Revision"
        : isSubmission
        ? "Submitted for Review"
        : isCompleted
        ? "Event Completed"
        : isClosed
        ? "Event Closed"
        : `Status updated to ${status}`;
      const role = isDeanApproval ? "dean" : isAdviserApproval || isRevision ? "adviser" : "student";
      const userId = isDeanApproval ? "user-dean-1" : isAdviserApproval || isRevision ? "user-adv-1" : (targetEvt as Event).createdBy;

      let actionDetails = "";
      if (isDeanApproval) {
        actionDetails = `Granted executive approval for '${(targetEvt as Event).name}'`;
      } else if (isAdviserApproval) {
        actionDetails = `Endorsed and forwarded proposal '${(targetEvt as Event).name}' to Dean for approval`;
      } else if (isRevision) {
        actionDetails = `Requested revisions for proposal '${(targetEvt as Event).name}'`;
      } else if (isSubmission) {
        actionDetails = `Submitted proposal '${(targetEvt as Event).name}' to Adviser for review`;
      } else if (isCompleted) {
        actionDetails = `Completed event execution for '${(targetEvt as Event).name}'`;
      } else if (isClosed) {
        const rev = (targetEvt as Event).revenue;
        const revStr = rev !== undefined && rev > 0 ? ` (Revenue: ₱${rev.toLocaleString()})` : "";
        actionDetails = `Finalized liquidation and closed event '${(targetEvt as Event).name}'${revStr}`;
      } else {
        actionDetails = `Updated status to '${status}' for '${(targetEvt as Event).name}'`;
      }

      addAuditEntry({
        id: `audit-${Date.now()}`,
        eventId: (targetEvt as Event).id,
        organizationId: (targetEvt as Event).organizationId,
        userId,
        actorRole: role,
        action: actionName,
        details: actionDetails,
        statusFrom: (targetEvt as Event).status,
        statusTo: status,
        remarks: feedback,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const activeEvents = evts.filter((e) => !e.deleted);
  const activeUsers = usrs.filter((u) => !u.deleted);
  const activeDepts = depts.filter((d) => !d.deleted);
  const activeOrgs = orgs.filter((o) => !o.deleted);
  const activeEtypes = etypes.filter((t) => !t.deleted);
  const activeCats = cats.filter((c) => !c.deleted);
  const activeTxns = txns.filter((t) => !t.deleted);

  return (
    <AppContext.Provider
      value={{
        events: activeEvents,
        transactions: activeTxns,
        users: activeUsers,
        departments: activeDepts,
        organizations: activeOrgs,
        eventTypes: activeEtypes,
        expenditureCategories: activeCats,
        auditTrail: audit,
        addEvent,
        updateEvent,
        deleteEvent,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addUser,
        updateUser,
        deleteUser,
        addDepartment,
        updateDepartment,
        deleteDepartment,
        addOrganization,
        updateOrganization,
        deleteOrganization,
        addEventType,
        deleteEventType,
        addCategory,
        deleteCategory,
        setEventStatus,
        addAuditEntry,
        theme,
        setTheme,
        dataDensity,
        setDataDensity,
        tableDensity,
        setTableDensity,
        defaultView,
        setDefaultView,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
