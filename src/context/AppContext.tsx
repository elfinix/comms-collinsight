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

  const addEvent = (e: Event) => setEvts((p) => [...p, e]);
  const updateEvent = (id: string, u: Partial<Event>) => setEvts((p) => p.map((e) => (e.id === id ? { ...e, ...u } : e)));
  const deleteEvent = (id: string) => setEvts((p) => p.filter((e) => e.id !== id));

  const addTransaction = (t: Transaction) => setTxns((p) => [...p, t]);
  const updateTransaction = (id: string, u: Partial<Transaction>) => setTxns((p) => p.map((t) => (t.id === id ? { ...t, ...u } : t)));
  const deleteTransaction = (id: string) => setTxns((p) => p.map((t) => (t.id === id ? { ...t, deleted: true } : t)));

  const addUser = (u: User) => setUsrs((p) => [...p, u]);
  const updateUser = (id: string, u: Partial<User>) => setUsrs((p) => p.map((x) => (x.id === id ? { ...x, ...u } : x)));
  const deleteUser = (id: string) => setUsrs((p) => p.filter((u) => u.id !== id));

  const addDepartment = (d: Department) => setDepts((p) => [...p, d]);
  const updateDepartment = (id: string, u: Partial<Department>) => setDepts((p) => p.map((d) => (d.id === id ? { ...d, ...u } : d)));
  const deleteDepartment = (id: string) => setDepts((p) => p.filter((d) => d.id !== id));

  const addOrganization = (o: Organization) => setOrgs((p) => [...p, o]);
  const updateOrganization = (id: string, u: Partial<Organization>) => setOrgs((p) => p.map((o) => (o.id === id ? { ...o, ...u } : o)));
  const deleteOrganization = (id: string) => setOrgs((p) => p.filter((o) => o.id !== id));

  const addEventType = (et: EventType) => setEtypes((p) => [...p, et]);
  const deleteEventType = (id: string) => setEtypes((p) => p.filter((e) => e.id !== id));

  const addCategory = (c: ExpenditureCategory) => setCats((p) => [...p, c]);
  const deleteCategory = (id: string) => setCats((p) => p.filter((c) => c.id !== id));

  const setEventStatus = (eventId: string, status: EventStatus, feedback?: string) => {
    setEvts((p) =>
      p.map((e) => {
        if (e.id !== eventId) return e;
        const updates: Partial<Event> = { status };
        if (feedback) {
          if (status === "Pending Revision") updates.adviserFeedback = feedback;
        }
        return { ...e, ...updates };
      })
    );
  };

  const addAuditEntry = (entry: AuditEntry) => setAudit((p) => [entry, ...p]);

  return (
    <AppContext.Provider
      value={{
        events: evts,
        transactions: txns,
        users: usrs,
        departments: depts,
        organizations: orgs,
        eventTypes: etypes,
        expenditureCategories: cats,
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
