import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import {
  Event,
  Transaction,
  User,
  Department,
  Organization,
  EventType,
  ExpenditureCategory,
  AuditEntry,
  EventStatus,
  ExportedReport,
  initialExportedReports,
  EventSignatory,
  eventSignatories as initialEventSignatories,
} from "../services/dataService";
import { supabaseApi } from "../services/supabaseService";

interface AppContextType {
  events: Event[];
  transactions: Transaction[];
  users: User[];
  departments: Department[];
  organizations: Organization[];
  eventTypes: EventType[];
  expenditureCategories: ExpenditureCategory[];
  auditTrail: AuditEntry[];
  exportedReports: ExportedReport[];
  eventSignatories: EventSignatory[];
  isLoading: boolean;
  isSupabaseConnected: boolean;
  refreshData: () => Promise<void>;
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
  addEventSignatory: (sig: EventSignatory) => void;
  resolvePendingSignatories: (eventId: string) => void;
  addAuditEntry: (entry: AuditEntry) => void;
  addExportedReport: (report: ExportedReport) => void;
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

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "id-" + Date.now() + "-" + Math.random().toString(36).substring(2, 9);
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [evts, setEvts] = useState<Event[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [usrs, setUsrs] = useState<User[]>([]);
  const [depts, setDepts] = useState<Department[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [etypes, setEtypes] = useState<EventType[]>([]);
  const [cats, setCats] = useState<ExpenditureCategory[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [eventSigs, setEventSigs] = useState<EventSignatory[]>(() => initialEventSignatories || []);
  const [reports, setReports] = useState<ExportedReport[]>(() => {
    try {
      const saved = localStorage.getItem("collinsight_exported_reports");
      return saved ? JSON.parse(saved) : initialExportedReports;
    } catch {
      return initialExportedReports;
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    try {
      const saved = localStorage.getItem("collinsight_theme");
      return (saved === "dark" || saved === "light") ? saved : "light";
    } catch {
      return "light";
    }
  });
  const [dataDensity, setDataDensity] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("collinsight_data_density");
      return saved ? Number(saved) : 10;
    } catch {
      return 10;
    }
  });
  const [tableDensity, setTableDensity] = useState<"comfortable" | "compact">(() => {
    try {
      const saved = localStorage.getItem("collinsight_table_density");
      return (saved === "compact" || saved === "comfortable") ? saved : "comfortable";
    } catch {
      return "comfortable";
    }
  });
  const [defaultView, setDefaultView] = useState<"grid" | "list">(() => {
    try {
      const saved = localStorage.getItem("collinsight_default_view");
      return (saved === "list" || saved === "grid") ? saved : "grid";
    } catch {
      return "grid";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("collinsight_theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("collinsight_data_density", String(dataDensity));
    } catch {}
  }, [dataDensity]);

  useEffect(() => {
    try {
      localStorage.setItem("collinsight_table_density", tableDensity);
    } catch {}
  }, [tableDensity]);

  useEffect(() => {
    try {
      localStorage.setItem("collinsight_default_view", defaultView);
    } catch {}
  }, [defaultView]);

  const addExportedReport = (report: ExportedReport) => {
    const newReport: ExportedReport = {
      ...report,
      id: report.id || generateId(),
      generatedAt: report.generatedAt || new Date().toISOString(),
    };
    setReports((prev) => {
      const updated = [newReport, ...prev.filter((r) => r.id !== newReport.id)];
      try {
        localStorage.setItem("collinsight_exported_reports", JSON.stringify(updated));
      } catch (e) {
        console.warn("Could not save to localStorage:", e);
      }
      return updated;
    });

    supabaseApi.createExportedReport(newReport).catch((err) =>
      console.warn("Supabase createExportedReport error:", err)
    );
  };

  // Fetch live state directly from Supabase as single source of truth
  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      const liveData = await supabaseApi.fetchAllState();
      if (liveData) {
        setDepts(liveData.departments);
        setOrgs(liveData.organizations);
        setUsrs(liveData.users);
        setEtypes(liveData.eventTypes);
        setCats(liveData.expenditureCategories);
        setEvts(liveData.events);
        setTxns(liveData.transactions);
        setAudit(liveData.auditTrail);
        if (liveData.eventSignatories && liveData.eventSignatories.length > 0) {
          setEventSigs(liveData.eventSignatories);
        }
        setIsSupabaseConnected(true);
      }
    } catch (err) {
      console.error("Failed to load Supabase state:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("compact-density", tableDensity === "compact");
    }
  }, [tableDensity]);

  const addAuditEntry = (entry: AuditEntry) => {
    const entryWithId = {
      ...entry,
      id: entry.id || generateId(),
      timestamp: entry.timestamp || new Date().toISOString(),
    };
    setAudit((p) => [entryWithId, ...p]);
    supabaseApi.createAuditEntry(entryWithId).catch((err) =>
      console.warn("Supabase audit log error:", err)
    );
  };

  const addEvent = (e: Event) => {
    const eventWithId = { ...e, id: e.id || generateId() };
    setEvts((p) => [eventWithId, ...p]);
    supabaseApi.createEvent(eventWithId).catch((err) =>
      console.warn("Supabase createEvent error:", err)
    );
    addAuditEntry({
      id: generateId(),
      eventId: eventWithId.id,
      organizationId: eventWithId.organizationId,
      userId: eventWithId.createdBy || "51000000-0000-0000-0000-000000000001",
      actorRole: "student",
      action: "Created Event",
      details: `Created event proposal for '${eventWithId.name}'`,
      statusTo: eventWithId.status || "Created",
      timestamp: new Date().toISOString(),
    });
  };

  const updateEvent = (id: string, u: Partial<Event>) => {
    const targetEvt = evts.find((e) => e.id === id);
    setEvts((p) =>
      p.map((e) => {
        if (e.id !== id) return e;
        return { ...e, ...u };
      })
    );
    supabaseApi.updateEvent(id, u).catch((err) =>
      console.warn("Supabase updateEvent error:", err)
    );

    if (targetEvt) {
      if (u.status === "Closed") {
        const rev = u.revenue !== undefined ? u.revenue : targetEvt.revenue;
        const revStr = rev !== undefined && rev > 0 ? ` (Revenue: ₱${rev.toLocaleString()})` : "";
        addAuditEntry({
          id: generateId(),
          eventId: id,
          organizationId: targetEvt.organizationId,
          userId: targetEvt.createdBy || "51000000-0000-0000-0000-000000000001",
          actorRole: "student",
          action: "Event Closed",
          details: `Finalized liquidation and closed event '${targetEvt.name}'${revStr}`,
          statusFrom: targetEvt.status,
          statusTo: "Closed",
          timestamp: new Date().toISOString(),
        });
      } else if (!u.status || u.status === targetEvt.status) {
        addAuditEntry({
          id: generateId(),
          eventId: id,
          organizationId: targetEvt.organizationId,
          userId: targetEvt.createdBy || "51000000-0000-0000-0000-000000000001",
          actorRole: "student",
          action: "Modified Proposal",
          details: `Updated proposal details for '${u.name || targetEvt.name}'`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  const deleteEvent = (id: string) => {
    const targetEvt = evts.find((e) => e.id === id);
    setEvts((p) => p.map((e) => (e.id === id ? { ...e, deleted: true } : e)));
    supabaseApi.softDeleteEvent(id).catch((err) =>
      console.warn("Supabase softDeleteEvent error:", err)
    );

    if (targetEvt) {
      addAuditEntry({
        id: generateId(),
        eventId: id,
        organizationId: targetEvt.organizationId,
        userId: targetEvt.createdBy || "51000000-0000-0000-0000-000000000001",
        actorRole: "student",
        action: "Deleted Proposal",
        details: `Deleted event proposal '${targetEvt.name}'`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const addTransaction = (t: Transaction) => {
    const txnWithId = { ...t, id: t.id || generateId() };
    setTxns((p) => [txnWithId, ...p]);
    supabaseApi.createTransaction(txnWithId).catch((err) =>
      console.warn("Supabase createTransaction error:", err)
    );

    const targetEvt = evts.find((e) => e.id === t.eventId);
    if (targetEvt) {
      addAuditEntry({
        id: generateId(),
        eventId: t.eventId,
        organizationId: targetEvt.organizationId,
        userId: targetEvt.createdBy || "51000000-0000-0000-0000-000000000001",
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
    supabaseApi.updateTransaction(id, u).catch((err) =>
      console.warn("Supabase updateTransaction error:", err)
    );

    if (targetTxn) {
      const targetEvt = evts.find((e) => e.id === (targetTxn as Transaction).eventId);
      if (targetEvt) {
        const newAmount = u.amount !== undefined ? u.amount : (targetTxn as Transaction).amount;
        addAuditEntry({
          id: generateId(),
          eventId: targetEvt.id,
          organizationId: targetEvt.organizationId,
          userId: targetEvt.createdBy || "51000000-0000-0000-0000-000000000001",
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
    supabaseApi.softDeleteTransaction(id).catch((err) =>
      console.warn("Supabase softDeleteTransaction error:", err)
    );

    if (targetTxn) {
      const targetEvt = evts.find((e) => e.id === targetTxn.eventId);
      if (targetEvt) {
        addAuditEntry({
          id: generateId(),
          eventId: targetEvt.id,
          organizationId: targetEvt.organizationId,
          userId: targetEvt.createdBy || "51000000-0000-0000-0000-000000000001",
          actorRole: "student",
          action: "Removed Expense",
          details: `Removed expense entry of ₱${targetTxn.amount.toLocaleString()} for '${targetEvt.name}'`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  };

  const addUser = (u: User) => {
    const userWithId = { ...u, id: u.id || generateId() };
    setUsrs((p) => [...p, userWithId]);
    supabaseApi.createUser(userWithId).catch((err) =>
      console.warn("Supabase createUser error:", err)
    );
  };

  const updateUser = (id: string, u: Partial<User>) => {
    setUsrs((p) => p.map((x) => (x.id === id ? { ...x, ...u } : x)));
    supabaseApi.updateUser(id, u).catch((err) =>
      console.warn("Supabase updateUser error:", err)
    );
  };

  const deleteUser = (id: string) => {
    setUsrs((p) => p.map((u) => (u.id === id ? { ...u, deleted: true } : u)));
    supabaseApi.softDeleteUser(id).catch((err) =>
      console.warn("Supabase softDeleteUser error:", err)
    );
  };

  const addDepartment = (d: Department) => {
    const deptWithId = { ...d, id: d.id || generateId() };
    setDepts((p) => [...p, deptWithId]);
    supabaseApi.createDepartment(deptWithId).catch((err) =>
      console.warn("Supabase createDepartment error:", err)
    );
  };

  const updateDepartment = (id: string, u: Partial<Department>) => {
    setDepts((p) => p.map((d) => (d.id === id ? { ...d, ...u } : d)));
    supabaseApi.updateDepartment(id, u).catch((err) =>
      console.warn("Supabase updateDepartment error:", err)
    );
  };

  const deleteDepartment = (id: string) => {
    setDepts((p) => p.map((d) => (d.id === id ? { ...d, deleted: true } : d)));
    supabaseApi.softDeleteDepartment(id).catch((err) =>
      console.warn("Supabase softDeleteDepartment error:", err)
    );
  };

  const addOrganization = (o: Organization) => {
    const orgWithId = { ...o, id: o.id || generateId() };
    setOrgs((p) => [...p, orgWithId]);
    supabaseApi.createOrganization(orgWithId).catch((err) =>
      console.warn("Supabase createOrganization error:", err)
    );
  };

  const updateOrganization = (id: string, u: Partial<Organization>) => {
    setOrgs((p) => p.map((o) => (o.id === id ? { ...o, ...u } : o)));
    supabaseApi.updateOrganization(id, u).catch((err) =>
      console.warn("Supabase updateOrganization error:", err)
    );
  };

  const deleteOrganization = (id: string) => {
    setOrgs((p) => p.map((o) => (o.id === id ? { ...o, deleted: true } : o)));
    supabaseApi.softDeleteOrganization(id).catch((err) =>
      console.warn("Supabase softDeleteOrganization error:", err)
    );
  };

  const addEventType = (et: EventType) => {
    const etWithId = { ...et, id: et.id || generateId() };
    setEtypes((p) => [...p, etWithId]);
    supabaseApi.createEventType(etWithId).catch((err) =>
      console.warn("Supabase createEventType error:", err)
    );
  };

  const deleteEventType = (id: string) => {
    setEtypes((p) => p.map((e) => (e.id === id ? { ...e, deleted: true } : e)));
    supabaseApi.softDeleteEventType(id).catch((err) =>
      console.warn("Supabase softDeleteEventType error:", err)
    );
  };

  const addCategory = (c: ExpenditureCategory) => {
    const catWithId = { ...c, id: c.id || generateId() };
    setCats((p) => [...p, catWithId]);
    supabaseApi.createCategory(catWithId).catch((err) =>
      console.warn("Supabase createCategory error:", err)
    );
  };

  const deleteCategory = (id: string) => {
    setCats((p) => p.map((c) => (c.id === id ? { ...c, deleted: true } : c)));
    supabaseApi.softDeleteCategory(id).catch((err) =>
      console.warn("Supabase softDeleteCategory error:", err)
    );
  };

  const addEventSignatory = (sig: EventSignatory) => {
    const sigWithId: EventSignatory = {
      ...sig,
      id: sig.id || generateId(),
      signedAt: sig.signedAt || new Date().toISOString(),
      createdAt: sig.createdAt || new Date().toISOString(),
    };
    setEventSigs((prev) => [sigWithId, ...prev.filter((s) => s.id !== sigWithId.id)]);
    supabaseApi.createEventSignatory(sigWithId).catch((err) =>
      console.warn("Supabase createEventSignatory error:", err)
    );
  };

  const resolvePendingSignatories = (eventId: string) => {
    setEventSigs((prev) =>
      prev.map((s) =>
        s.eventId === eventId && s.status === "Revision Requested"
          ? { ...s, status: "Resolved" as const }
          : s
      )
    );
    supabaseApi.resolvePendingSignatories(eventId).catch((err) =>
      console.warn("Supabase resolvePendingSignatories error:", err)
    );
  };

  const setEventStatus = (eventId: string, status: EventStatus, feedback?: string) => {
    const targetEvt = evts.find((e) => e.id === eventId);
    const cleanId = eventId.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
    const generatedDocRef = status === "Approved"
      ? (targetEvt?.clearanceDocRef || `CLR-${cleanId}-${new Date(targetEvt?.dateStart || Date.now()).getFullYear()}`)
      : undefined;

    setEvts((p) =>
      p.map((e) => {
        if (e.id !== eventId) return e;
        return {
          ...e,
          status,
          ...(generatedDocRef ? { clearanceDocRef: generatedDocRef } : {}),
        };
      })
    );

    const updatePayload: Partial<Event> = { status };
    if (generatedDocRef) {
      updatePayload.clearanceDocRef = generatedDocRef;
    }

    supabaseApi.updateEvent(eventId, updatePayload).catch((err) =>
      console.warn("Supabase setEventStatus error:", err)
    );

    if (targetEvt) {
      const isDeanApproval = status === "Approved";
      const isAdviserApproval = status === "For Approval";
      const isRevision = status === "Pending Revision";
      const isSubmission = status === "For Review";
      const isCompleted = status === "Completed";
      const isClosed = status === "Closed";

      // ── Event Signatory Iteration Record Creation ──
      if (isRevision && feedback) {
        const isFromDean = targetEvt.status === "For Approval";
        const sigRole = isFromDean ? "dean" : "adviser";
        const sigUserId = isFromDean
          ? "e1000000-0000-0000-0000-000000000001"
          : "ad100000-0000-0000-0000-000000000001";
        addEventSignatory({
          id: generateId(),
          eventId,
          userId: sigUserId,
          role: sigRole,
          status: "Revision Requested",
          feedback,
          signedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      } else if (isAdviserApproval) {
        addEventSignatory({
          id: generateId(),
          eventId,
          userId: "ad100000-0000-0000-0000-000000000001",
          role: "adviser",
          status: "Endorsed",
          feedback: feedback || undefined,
          signedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      } else if (isDeanApproval) {
        addEventSignatory({
          id: generateId(),
          eventId,
          userId: "e1000000-0000-0000-0000-000000000001",
          role: "dean",
          status: "Approved",
          feedback: feedback || undefined,
          signedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        });
      } else if (isSubmission && targetEvt.status === "Pending Revision") {
        resolvePendingSignatories(eventId);
      }

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
      const userId = isDeanApproval
        ? "e1000000-0000-0000-0000-000000000001"
        : isAdviserApproval || isRevision
        ? "ad100000-0000-0000-0000-000000000001"
        : targetEvt.createdBy || "51000000-0000-0000-0000-000000000001";

      let actionDetails = "";
      if (isDeanApproval) {
        actionDetails = `Granted executive approval for '${targetEvt.name}'`;
      } else if (isAdviserApproval) {
        actionDetails = `Endorsed and forwarded proposal '${targetEvt.name}' to Dean for approval`;
      } else if (isRevision) {
        actionDetails = `Requested revisions for proposal '${targetEvt.name}'`;
      } else if (isSubmission) {
        actionDetails = `Submitted proposal '${targetEvt.name}' to Adviser for review`;
      } else if (isCompleted) {
        actionDetails = `Completed event execution for '${targetEvt.name}'`;
      } else if (isClosed) {
        const rev = targetEvt.revenue;
        const revStr = rev !== undefined && rev > 0 ? ` (Revenue: ₱${rev.toLocaleString()})` : "";
        actionDetails = `Finalized liquidation and closed event '${targetEvt.name}'${revStr}`;
      } else {
        actionDetails = `Updated status to '${status}' for '${targetEvt.name}'`;
      }

      addAuditEntry({
        id: generateId(),
        eventId: targetEvt.id,
        organizationId: targetEvt.organizationId,
        userId,
        actorRole: role,
        action: actionName,
        details: actionDetails,
        statusFrom: targetEvt.status,
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
        exportedReports: reports,
        eventSignatories: eventSigs,
        addExportedReport,
        isLoading,
        isSupabaseConnected,
        refreshData,
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
        addEventSignatory,
        resolvePendingSignatories,
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
