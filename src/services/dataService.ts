/**
 * ============================================================================
 * COLLinSight Core Data Service & Domain Models
 * ============================================================================
 * Primary source for application entity types, domain interfaces, formatting
 * utilities, and baseline lookup fallback services.
 */

// ============================================================================
// 1. DOMAIN TYPES & ENUMS
// ============================================================================

export type UserRole = "student" | "adviser" | "dean" | "admin";
export type Gender = "male" | "female" | "non-binary";
export type EventMode = "FTF" | "Online/Virtual";
export type EventStatus =
  | "Created"
  | "For Review"
  | "For Approval"
  | "Pending Revision"
  | "Approved"
  | "Completed"
  | "Closed";
export type TransactionStatus = "Pending" | "Paid" | "Reimbursed";

// ============================================================================
// 2. DOMAIN INTERFACES
// ============================================================================

export interface User {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  email: string;
  password: string;
  role: UserRole;
  position: string;
  gender: Gender;
  organizationId?: string;
  yearLevel?: string;
  memberSince: string;
  avatar?: string;
  settings?: {
    theme?: "light" | "dark" | "system";
    dataDensity?: "compact" | "comfortable";
    tableDensity?: "compact" | "normal" | "spacious";
    defaultView?: "list" | "card" | "board" | "timeline";
  };
  deleted?: boolean;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  color?: string;
  description?: string;
  deleted?: boolean;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  allocatedBudget: number;
  adviserId: string;
  logoColor: string;
  description?: string;
  avatar?: string;
  deleted?: boolean;
}

export interface EventType {
  id: string;
  name: string;
  description?: string;
  deleted?: boolean;
}

export interface ExpenditureCategory {
  id: string;
  name: string;
  description?: string;
  deleted?: boolean;
}

export interface OrganizationMember {
  id: string;
  organizationId: string;
  userId: string;
  position: string;
  role: "officer" | "member" | "adviser";
  isPrimary?: boolean;
  academicYear?: string;
  createdAt?: string;
}

export interface EventSignatory {
  id: string;
  eventId: string;
  userId: string;
  role: "student" | "adviser" | "dean" | "sds";
  status: "Pending" | "Endorsed" | "Approved" | "Revision Requested" | "Resolved";
  feedback?: string;
  signedAt?: string;
  createdAt?: string;
}

export interface Event {
  id: string;
  organizationId: string;
  name: string;
  typeId: string;
  description: string;
  proposedBudget: number;
  requisites: string;
  dateStart: string;
  dateEnd: string;
  mode: EventMode;
  location: string;
  apfUrl?: string;
  appendices?: string[];
  clearanceDetails?: string;
  clearanceDocRef?: string;
  remarks?: string[];
  status: EventStatus;
  revenue?: number;
  liquidatedBy?: string;
  liquidatedAt?: string;
  createdAt: string;
  createdBy: string;
  deleted?: boolean;
}

export interface Transaction {
  id: string;
  eventId: string;
  description: string;
  categoryId: string;
  amount: number;
  status: TransactionStatus;
  receiptUrl?: string;
  createdAt: string;
  deleted?: boolean;
}

export interface AuditEntry {
  id: string;
  userId: string;
  action: string;
  details: string;
  timestamp: string;
  eventId?: string;
  organizationId?: string;
  actorRole?: "student" | "adviser" | "dean" | "admin" | "sds";
  statusFrom?: EventStatus;
  statusTo?: EventStatus;
  remarks?: string;
}

export interface ExportedReport {
  id: string;
  title: string;
  docRef: string;
  category: "System Usage" | "Directorate Summary" | "Organization Financial Summary" | "Audit Trail Ledger";
  organizationName: string;
  generatedBy: string;
  generatedAt: string;
  fileUrl?: string;
  filePath?: string;
  format?: "PDF" | "HTML";
}

// ============================================================================
// 3. BASELINE DATASETS (Initial / Fallback Reference)
// ============================================================================

export const initialExportedReports: ExportedReport[] = [
  {
    id: "rep-001",
    title: "AY 2026-2027 Midyear Directorate Analytics Report",
    docRef: "REP-DEAN-CITE-2026",
    category: "Directorate Summary",
    organizationName: "College Administration",
    generatedBy: "Dr. Marilou Castro Villanueva, Ph.D.",
    generatedAt: "2026-08-28T09:30:00Z",
    fileUrl: "https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/reports/College%20Administration/2026-08-28/REP-DEAN-CITE-2026_Analytics_Report.pdf",
    filePath: "College Administration/2026-08-28/REP-DEAN-CITE-2026_Analytics_Report.pdf",
    format: "PDF",
  },
  {
    id: "rep-002",
    title: "System Usage & Activity Analytics Overview",
    docRef: "SYS-RPT-883012",
    category: "System Usage",
    organizationName: "Administration",
    generatedBy: "Team COLLinSight CITE",
    generatedAt: "2026-08-29T14:15:00Z",
    fileUrl: "https://snsqkogfrrtyloqetowx.supabase.co/storage/v1/object/public/reports/Administration/2026-08-29/SYS-RPT-883012_System_Report.pdf",
    filePath: "Administration/2026-08-29/SYS-RPT-883012_System_Report.pdf",
    format: "PDF",
  },
];

export const departments: Department[] = [
  { id: "dept-1", name: "Bachelor of Science in Information Technology", code: "BSIT" },
  { id: "dept-2", name: "Bachelor of Science in Computer Engineering", code: "BSCpE" },
  { id: "dept-3", name: "Bachelor of Science in Industrial Engineering", code: "BSIE" },
];

export const organizations: Organization[] = [
  { id: "org-1", name: "IT Student Guild", code: "ITSG", departmentId: "dept-1", allocatedBudget: 50000, adviserId: "user-adv-1", logoColor: "#0d9488" },
  { id: "org-2", name: "CompE Society", code: "CES", departmentId: "dept-2", allocatedBudget: 40000, adviserId: "user-adv-2", logoColor: "#0284c7" },
  { id: "org-3", name: "IE Innovation Club", code: "IEIC", departmentId: "dept-3", allocatedBudget: 35000, adviserId: "user-adv-3", logoColor: "#7c3aed" },
];

export const eventTypes: EventType[] = [
  { id: "et-1", name: "Academic Seminar" },
  { id: "et-2", name: "Leadership Training" },
  { id: "et-3", name: "Community Outreach" },
  { id: "et-4", name: "Sports Fest" },
  { id: "et-5", name: "Cultural Festival" },
  { id: "et-6", name: "Technical Workshop" },
];

export const expenditureCategories: ExpenditureCategory[] = [
  { id: "ec-1", name: "Venue & Logistics" },
  { id: "ec-2", name: "Food & Catering" },
  { id: "ec-3", name: "Supplies & Materials" },
  { id: "ec-4", name: "Transportation" },
  { id: "ec-5", name: "Printing & Documentation" },
  { id: "ec-6", name: "Speaker & Honorarium" },
  { id: "ec-7", name: "Promotional Materials" },
];

export const users: User[] = [
  {
    id: "user-admin-1",
    firstName: "Team COLLinSight",
    middleName: "",
    lastName: "CITE",
    suffix: "",
    email: "admin@cite.edu.ph",
    password: "collinsight_admins",
    role: "admin",
    position: "System Administrator",
    gender: "non-binary",
    yearLevel: "Faculty/Staff",
    memberSince: "2022-06-01",
  },
  {
    id: "user-dean-1",
    firstName: "Marilou",
    middleName: "Castro",
    lastName: "Villanueva",
    suffix: "Ph.D.",
    email: "dean@cite.edu.ph",
    password: "villanueva_441209",
    role: "dean",
    position: "College Dean",
    gender: "female",
    yearLevel: "Faculty/Staff",
    memberSince: "2020-08-01",
  },
  {
    id: "user-adv-1",
    firstName: "Eduardo",
    middleName: "Severino",
    lastName: "Reyes",
    suffix: "",
    email: "ereyes@cite.edu.ph",
    password: "reyes_773012",
    role: "adviser",
    position: "Faculty Adviser",
    gender: "male",
    yearLevel: "Faculty/Staff",
    organizationId: "org-1",
    memberSince: "2021-06-01",
  },
  {
    id: "user-adv-2",
    firstName: "Cynthia",
    middleName: "Lazaro",
    lastName: "Domingo",
    suffix: "",
    email: "cdomingo@cite.edu.ph",
    password: "domingo_550874",
    role: "adviser",
    position: "Faculty Adviser",
    gender: "female",
    yearLevel: "Faculty/Staff",
    organizationId: "org-2",
    memberSince: "2021-06-01",
  },
  {
    id: "user-adv-3",
    firstName: "Jerome",
    middleName: "Acapule",
    lastName: "Santos",
    suffix: "",
    email: "jsantos@cite.edu.ph",
    password: "santos_330928",
    role: "adviser",
    position: "Faculty Adviser",
    gender: "male",
    yearLevel: "Faculty/Staff",
    organizationId: "org-3",
    memberSince: "2022-01-01",
  },
  {
    id: "user-stu-1",
    firstName: "Maria",
    middleName: "Denise",
    lastName: "Lopez",
    suffix: "",
    email: "mlopez@student.cite.edu.ph",
    password: "lopez_124983",
    role: "student",
    position: "President",
    gender: "female",
    organizationId: "org-1",
    yearLevel: "3rd Year",
    memberSince: "2022-08-15",
  },
  {
    id: "user-stu-2",
    firstName: "Carlo",
    middleName: "Enrique",
    lastName: "Mendoza",
    suffix: "",
    email: "cmendoza@student.cite.edu.ph",
    password: "mendoza_875432",
    role: "student",
    position: "Vice President",
    gender: "male",
    organizationId: "org-1",
    yearLevel: "3rd Year",
    memberSince: "2022-08-15",
  },
  {
    id: "user-stu-3",
    firstName: "Bea",
    middleName: "Ramona",
    lastName: "Santos",
    suffix: "",
    email: "bsantos@student.cite.edu.ph",
    password: "santos_654321",
    role: "student",
    position: "Secretary",
    gender: "female",
    organizationId: "org-1",
    yearLevel: "2nd Year",
    memberSince: "2023-08-15",
  },
];

export const events: Event[] = [];
export const eventSignatories: EventSignatory[] = [];
export const transactions: Transaction[] = [];
export const auditTrail: AuditEntry[] = [];

// ============================================================================
// 4. LOOKUP FALLBACK HELPERS
// ============================================================================

export function getUserById(id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function getOrgById(id: string): Organization | undefined {
  return organizations.find((o) => o.id === id);
}

export function getDeptById(id: string): Department | undefined {
  return departments.find((d) => d.id === id);
}

export function getEventTypeById(id: string): EventType | undefined {
  return eventTypes.find((et) => et.id === id);
}

export function getCategoryById(id: string): ExpenditureCategory | undefined {
  return expenditureCategories.find((c) => c.id === id);
}

export function getEventsByOrg(orgId: string): Event[] {
  return events.filter((e) => e.organizationId === orgId && !e.deleted);
}

export function getTransactionsByEvent(eventId: string): Transaction[] {
  return transactions.filter((t) => t.eventId === eventId && !t.deleted);
}

export function getUsersByOrg(orgId: string): User[] {
  return users.filter((u) => u.organizationId === orgId && !u.deleted);
}

// ============================================================================
// 5. FORMATTING & UI UTILITIES
// ============================================================================

export function formatCurrency(amount: number): string {
  return `₱${(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return "—";
  try {
    const d = new Date(dateStr);
    return (
      d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) +
      " " +
      d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  } catch {
    return dateStr;
  }
}

/**
 * Formats an event's schedule taking single-day and multi-day spans into consideration.
 * - Same day with times: "Sep 7, 2026 · 8:00 AM – 5:00 PM"
 * - Same day without times / single date: "Sep 7, 2026"
 * - Multi-day span: "Sep 7, 2026, 8:00 AM – Sep 9, 2026, 5:00 PM" (or "Sep 7, 2026 – Sep 9, 2026")
 */
export function formatEventSchedule(dateStart?: string, dateEnd?: string): string {
  if (!dateStart && !dateEnd) return "—";
  if (!dateStart && dateEnd) return formatDateTime(dateEnd);
  if (dateStart && !dateEnd) return formatDateTime(dateStart);

  try {
    const s = new Date(dateStart!);
    const e = new Date(dateEnd!);

    const sDate = s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const eDate = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

    const sHasTime = dateStart!.includes("T");
    const eHasTime = dateEnd!.includes("T");

    const sTime = s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const eTime = e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    // Same calendar day
    if (sDate === eDate) {
      if (sHasTime && eHasTime && sTime !== eTime) {
        return `${sDate} · ${sTime} – ${eTime}`;
      }
      if (sHasTime) {
        return `${sDate} · ${sTime}`;
      }
      return sDate;
    }

    // Spanning multiple days
    if (sHasTime && eHasTime) {
      return `${sDate}, ${sTime} – ${eDate}, ${eTime}`;
    }
    return `${sDate} – ${eDate}`;
  } catch {
    return `${dateStart} – ${dateEnd}`;
  }
}

/**
 * Formats an event's date and time specifically for compact event cards:
 * "Sep 5, 2026 | 10:12 AM" or "Sep 5, 2026 | 10:12 AM – 11:12 PM"
 */
export function formatCardSchedule(dateStart?: string, dateEnd?: string): string {
  if (!dateStart) return "—";
  try {
    const s = new Date(dateStart);
    if (isNaN(s.getTime())) return dateStart;

    const dStr = s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const sTime = dateStart.includes("T") ? s.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

    if (!dateEnd || dateEnd === dateStart) {
      return sTime ? `${dStr} | ${sTime}` : dStr;
    }

    const e = new Date(dateEnd);
    if (isNaN(e.getTime())) {
      return sTime ? `${dStr} | ${sTime}` : dStr;
    }

    const eDateStr = e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const eTime = dateEnd.includes("T") ? e.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";

    if (dStr === eDateStr) {
      if (sTime && eTime && sTime !== eTime) {
        return `${dStr} | ${sTime} – ${eTime}`;
      }
      return sTime ? `${dStr} | ${sTime}` : dStr;
    }

    return `${dStr}${sTime ? ` (${sTime})` : ""} – ${eDateStr}${eTime ? ` (${eTime})` : ""}`;
  } catch {
    return dateStart;
  }
}

export const statusColors: Record<EventStatus, string> = {
  Created: "bg-slate-100 text-slate-700 border border-slate-300 font-medium",
  "For Review": "bg-amber-100 text-amber-800 border border-amber-300 font-medium",
  "For Approval": "bg-blue-100 text-blue-800 border border-blue-300 font-medium",
  "Pending Revision": "bg-orange-100 text-orange-800 border border-orange-300 font-medium",
  Approved: "bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium",
  Completed: "bg-emerald-100 text-emerald-800 border border-emerald-300 font-medium",
  Closed: "bg-gray-100 text-gray-700 border border-gray-300 font-medium",
};

export function isWebUrl(str?: string): boolean {
  if (!str) return false;
  const t = str.trim();
  return /^(https?:\/\/|www\.)/i.test(t) || /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(\/.*)?$/i.test(t) || t.includes("zoom.us") || t.includes("meet.google.com") || t.includes("teams.microsoft.com");
}

export function toWebUrl(str: string): string {
  const t = str.trim();
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export const SAMPLE_FIXTURES = {
  apf: "/fixtures/APF_Community_Code_Outreach_Vetted.pdf",
  clearance: "/fixtures/APF_Community_Code_Outreach_Vetted.pdf",
  appendix: "/fixtures/Program_Flow_and_Curriculum_Matrix.pdf",
  venue: "/fixtures/Venue_Clearance_and_Laboratories.pdf",
  receipt: "/fixtures/Program_Flow_and_Curriculum_Matrix.pdf",
} as const;

export function resolvePdfUrl(
  url?: string,
  fallbackType: "apf" | "clearance" | "appendix" | "venue" | "receipt" = "apf"
): string {
  if (!url) return SAMPLE_FIXTURES[fallbackType] || SAMPLE_FIXTURES.apf;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/fixtures")) {
    return url;
  }
  if (url.includes("/")) {
    const DEFAULT_SUPABASE_URL = "https://snsqkogfrrtyloqetowx.supabase.co";
    const base = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    return `${base}/storage/v1/object/public/attachments/${url}`;
  }
  return SAMPLE_FIXTURES[fallbackType] || SAMPLE_FIXTURES.apf;
}

export function getActionBadgeClass(action: string): string {
  const act = action.toLowerCase();
  if (act.includes("executive approval") || act.includes("executive approved")) {
    return "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold";
  }
  if (act.includes("approved & forwarded") || act.includes("endorsed") || act.includes("endors")) {
    return "bg-blue-100 text-blue-800 border border-blue-300 font-bold";
  }
  if (act.includes("approved") || act.includes("approv")) {
    return "bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold";
  }
  if (act.includes("revision") || act.includes("change") || act.includes("reject")) {
    return "bg-orange-100 text-orange-800 border border-orange-300 font-bold";
  }
  if (act.includes("delete") || act.includes("removed")) {
    return "bg-rose-100 text-rose-800 border border-rose-300 font-bold";
  }
  if (act.includes("modified") || act.includes("edit") || act.includes("update")) {
    return "bg-amber-100 text-amber-800 border border-amber-300 font-bold";
  }
  if (act.includes("submit") || act.includes("for review")) {
    return "bg-amber-100 text-amber-800 border border-amber-300 font-bold";
  }
  if (act.includes("disburs") || act.includes("expense") || act.includes("transaction")) {
    return "bg-purple-100 text-purple-800 border border-purple-300 font-bold";
  }
  if (act.includes("completed") || act.includes("closed") || act.includes("closure")) {
    return "bg-slate-100 text-slate-700 border border-slate-300 font-bold";
  }
  return "bg-slate-100 text-slate-700 border border-slate-300 font-bold";
}

export function formatUserRole(role?: string): string {
  if (!role) return "Student";
  const r = role.toLowerCase();
  switch (r) {
    case "student":
      return "Student";
    case "adviser":
      return "Adviser";
    case "dean":
      return "Dean";
    case "sds":
      return "SDS";
    case "admin":
      return "Admin";
    default:
      return r.charAt(0).toUpperCase() + r.slice(1);
  }
}

export function resolveEventSignatories(
  event: Event,
  allUsers: User[] = users,
  allOrgs: Organization[] = organizations
) {
  const org = allOrgs.find((o) => o.id === event.organizationId);
  const creator = allUsers.find((u) => u.id === event.createdBy) ||
                  allUsers.find((u) => u.organizationId === event.organizationId && u.role === "student" && u.position.toLowerCase().includes("president")) ||
                  allUsers.find((u) => u.organizationId === event.organizationId && u.role === "student");

  const adviser = allUsers.find((u) => u.id === org?.adviserId) ||
                  allUsers.find((u) => u.role === "adviser" && u.organizationId === event.organizationId) ||
                  allUsers.find((u) => u.role === "adviser");

  const dean = allUsers.find((u) => u.role === "dean");

  const formatPerson = (u?: User, fallback = "") => {
    if (!u) return fallback;
    const mid = u.middleName && u.middleName.trim().length > 0 ? `${u.middleName.trim().charAt(0)}. ` : "";
    const suffix = u.suffix && u.suffix.trim().length > 0 ? (u.suffix.startsWith(",") ? u.suffix : `, ${u.suffix}`) : "";
    return `${u.firstName} ${mid}${u.lastName}${suffix}`.trim();
  };

  const officerName = formatPerson(creator, "Student Project Lead");
  const adviserName = formatPerson(adviser, "Organization Adviser");
  const deanName = formatPerson(dean, "Dr. Marilou Castro Villanueva, Ph.D.");

  return {
    officerName,
    adviserName,
    deanName,
    organizationName: org?.name || "Student Organization",
  };
}

export { printClearanceDocument, printLiquidationDocument } from "./pdfDocuments";

