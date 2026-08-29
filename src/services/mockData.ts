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
}

export interface Department {
  id: string;
  name: string;
  code: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  allocatedBudget: number;
  adviserId: string;
  logoColor: string;
}

export interface EventType {
  id: string;
  name: string;
}

export interface ExpenditureCategory {
  id: string;
  name: string;
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
  remarks?: string[];
  status: EventStatus;
  adviserFeedback?: string;
  deanFeedback?: string;
  revenue?: number;
  liquidatedBy?: string;
  liquidatedAt?: string;
  createdAt: string;
  createdBy: string;
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
}

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
    firstName: "Ricardo",
    middleName: "B.",
    lastName: "Cruz",
    suffix: "",
    email: "admin@cite.edu.ph",
    password: "cruz_882341",
    role: "admin",
    position: "System Administrator",
    gender: "male",
    memberSince: "2022-06-01",
  },
  {
    id: "user-dean-1",
    firstName: "Marilou",
    middleName: "C.",
    lastName: "Villanueva",
    suffix: "Ph.D.",
    email: "dean@cite.edu.ph",
    password: "villanueva_441209",
    role: "dean",
    position: "College Dean",
    gender: "female",
    memberSince: "2020-08-01",
  },
  {
    id: "user-adv-1",
    firstName: "Eduardo",
    middleName: "S.",
    lastName: "Reyes",
    suffix: "M.Sc.",
    email: "ereyes@cite.edu.ph",
    password: "reyes_773012",
    role: "adviser",
    position: "Faculty Adviser",
    gender: "male",
    organizationId: "org-1",
    memberSince: "2021-06-01",
  },
  {
    id: "user-adv-2",
    firstName: "Cynthia",
    middleName: "L.",
    lastName: "Domingo",
    suffix: "",
    email: "cdomingo@cite.edu.ph",
    password: "domingo_550874",
    role: "adviser",
    position: "Faculty Adviser",
    gender: "female",
    organizationId: "org-2",
    memberSince: "2021-06-01",
  },
  {
    id: "user-adv-3",
    firstName: "Jerome",
    middleName: "A.",
    lastName: "Santos",
    suffix: "M.Eng.",
    email: "jsantos@cite.edu.ph",
    password: "santos_330928",
    role: "adviser",
    position: "Faculty Adviser",
    gender: "male",
    organizationId: "org-3",
    memberSince: "2022-01-01",
  },
  {
    id: "user-stu-1",
    firstName: "Maria",
    middleName: "D.",
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
    middleName: "E.",
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
    firstName: "Ana",
    middleName: "R.",
    lastName: "Garcia",
    suffix: "",
    email: "agarcia@student.cite.edu.ph",
    password: "garcia_659012",
    role: "student",
    position: "Secretary",
    gender: "female",
    organizationId: "org-1",
    yearLevel: "2nd Year",
    memberSince: "2023-08-15",
  },
  {
    id: "user-stu-4",
    firstName: "Justin",
    middleName: "K.",
    lastName: "Tan",
    suffix: "",
    email: "jtan@student.cite.edu.ph",
    password: "tan_991023",
    role: "student",
    position: "Treasurer",
    gender: "male",
    organizationId: "org-1",
    yearLevel: "3rd Year",
    memberSince: "2022-08-15",
  },
];

export const events: Event[] = [
  {
    id: "evt-1",
    organizationId: "org-1",
    name: "TechFest 2026: IT Innovation Summit",
    typeId: "et-1",
    description: "An annual summit gathering IT students to showcase innovative projects and hear from industry leaders on the latest technology trends.",
    proposedBudget: 18500,
    requisites: "Projector, PA System, Registration Desk, Venue with 200-pax capacity",
    dateStart: "2026-09-15T08:00",
    dateEnd: "2026-09-15T18:00",
    mode: "FTF",
    location: "CITE Auditorium, LCUP Main Campus",
    apfUrl: "APF_TechFest_2026_Approved.pdf",
    appendices: ["Program_Matrix_TechFest2026.pdf", "Speaker_Profiles_and_Budgets.pdf", "Venue_Layout_CITE_Auditorium.png"],
    clearanceDetails: "TechFest 2026 organized by IT Student Guild with full backing of the Department of IT.",
    remarks: [],
    status: "Approved",
    createdAt: "2026-08-01T09:00:00",
    createdBy: "user-stu-1",
  },
  {
    id: "evt-2",
    organizationId: "org-1",
    name: "Leadership Development Workshop",
    typeId: "et-2",
    description: "A half-day interactive workshop aimed at developing leadership and communication skills among student organization officers.",
    proposedBudget: 8000,
    requisites: "Meeting room, whiteboard, printed modules",
    dateStart: "2026-09-22T13:00",
    dateEnd: "2026-09-22T17:00",
    mode: "FTF",
    location: "CITE Room 305",
    apfUrl: "APF_Leadership_Workshop_2026.pdf",
    appendices: ["Workshop_Modules_Outline.pdf", "Facilitator_CV.pdf"],
    clearanceDetails: "Officer leadership capability building for AY 2026-2027 student executive committees.",
    status: "For Review",
    createdAt: "2026-08-10T14:00:00",
    createdBy: "user-stu-1",
  },
  {
    id: "evt-3",
    organizationId: "org-1",
    name: "Community Code Outreach",
    typeId: "et-3",
    description: "Teaching basic programming concepts to high school students in the nearby community. Includes hands-on exercises.",
    proposedBudget: 5500,
    requisites: "Laptops (10 units), printed worksheets, transport",
    dateStart: "2026-09-26T08:00",
    dateEnd: "2026-09-26T15:00",
    mode: "FTF",
    location: "San Miguel National High School",
    apfUrl: "/fixtures/TechnoFest_2025_Activity_Proposal_Form_Sample.pdf",
    appendices: ["/fixtures/TechnoFest_2025_Appendices_Sample.pdf"],
    clearanceDetails: "Extension community service introducing basic programming and web literacy to junior high students.",
    status: "Created",
    createdAt: "2026-08-18T10:00:00",
    createdBy: "user-stu-2",
  },
  {
    id: "evt-4",
    organizationId: "org-1",
    name: "Webinar Series: Cloud Technologies",
    typeId: "et-6",
    description: "A 3-part webinar series on cloud platforms (AWS, Azure, GCP) delivered by certified industry practitioners.",
    proposedBudget: 3000,
    requisites: "Zoom Pro account, Canva graphics, promotion materials",
    dateStart: "2026-08-15T15:00",
    dateEnd: "2026-08-15T17:00",
    mode: "Online/Virtual",
    location: "https://meet.google.com/xyz-cloud-2026",
    apfUrl: "APF_Cloud_Webinar_Series_Signed.pdf",
    appendices: ["Speaker_Handouts_CloudAWS.pdf", "Participant_Attendance_Log.pdf", "Webinar_Evaluation_Summary.pdf"],
    clearanceDetails: "Completed 3-part online lecture on modern cloud architecture and cloud security.",
    status: "Completed",
    createdAt: "2026-07-15T08:00:00",
    createdBy: "user-stu-1",
  },
  {
    id: "evt-5",
    organizationId: "org-1",
    name: "CITE Tech Assembly & Officer Induction",
    typeId: "et-5",
    description: "Annual department-wide general assembly and ceremonial induction of incoming class officers and student leaders.",
    proposedBudget: 15000,
    requisites: "Venue, catering, sound system, photo wall",
    dateStart: "2026-09-29T18:00",
    dateEnd: "2026-09-29T22:00",
    mode: "FTF",
    location: "LCUP Events Center",
    apfUrl: "APF_Tech_Assembly_Revision_v2.pdf",
    appendices: ["Catering_Quotations_Comparative.pdf", "Program_Flow_Draft.pdf"],
    clearanceDetails: "Annual department-wide general assembly and ceremonial induction of incoming class officers.",
    status: "Pending Revision",
    adviserFeedback: "Please update the guest list and confirm the catering provider before resubmission.",
    createdAt: "2026-08-05T11:00:00",
    createdBy: "user-stu-1",
  },
];

export const transactions: Transaction[] = [
  {
    id: "txn-1",
    eventId: "evt-1",
    description: "Venue booking deposit",
    categoryId: "ec-1",
    amount: 5000,
    status: "Paid",
    receiptUrl: "/mock-receipt.jpg",
    createdAt: "2026-09-15T09:00:00",
  },
  {
    id: "txn-2",
    eventId: "evt-1",
    description: "Catering for 150 pax",
    categoryId: "ec-2",
    amount: 7500,
    status: "Paid",
    receiptUrl: "/mock-receipt.jpg",
    createdAt: "2026-09-15T10:00:00",
  },
  {
    id: "txn-3",
    eventId: "evt-1",
    description: "Event tarpaulin and streamers",
    categoryId: "ec-7",
    amount: 1800,
    status: "Paid",
    receiptUrl: "/mock-receipt.jpg",
    createdAt: "2026-09-15T11:00:00",
  },
  {
    id: "txn-4",
    eventId: "evt-4",
    description: "Zoom Pro subscription (1 month)",
    categoryId: "ec-3",
    amount: 1200,
    status: "Paid",
    receiptUrl: "/mock-receipt.jpg",
    createdAt: "2026-08-15T10:00:00",
  },
  {
    id: "txn-5",
    eventId: "evt-4",
    description: "Certificates printing",
    categoryId: "ec-5",
    amount: 600,
    status: "Paid",
    receiptUrl: "/mock-receipt.jpg",
    createdAt: "2026-08-15T16:00:00",
  },
];

export const auditTrail: AuditEntry[] = [
  { id: "audit-1", userId: "user-stu-1", action: "Created Event", details: "Created event 'TechFest 2026: IT Innovation Summit'", timestamp: "2026-08-01T09:00:00" },
  { id: "audit-2", userId: "user-stu-1", action: "Submitted Event", details: "Submitted 'TechFest 2026' to Adviser", timestamp: "2026-08-02T10:30:00" },
  { id: "audit-3", userId: "user-adv-1", action: "Approved Event", details: "Approved 'TechFest 2026' — forwarded to Dean", timestamp: "2026-08-05T14:00:00" },
  { id: "audit-4", userId: "user-dean-1", action: "Approved Event", details: "Approved 'TechFest 2026' — APF + CT sent to SDS", timestamp: "2026-08-07T09:00:00" },
  { id: "audit-5", userId: "user-stu-1", action: "Added Transaction", details: "Added ₱5,000 venue deposit for 'TechFest 2026'", timestamp: "2026-09-15T09:00:00" },
  { id: "audit-6", userId: "user-admin-1", action: "Added User", details: "Added new student officer: Ana Garcia", timestamp: "2026-08-15T08:00:00" },
  { id: "audit-7", userId: "user-stu-2", action: "Created Event", details: "Created event 'Community Code Outreach'", timestamp: "2026-08-18T10:00:00" },
];

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
  return eventTypes.find((e) => e.id === id);
}

export function getCategoryById(id: string): ExpenditureCategory | undefined {
  return expenditureCategories.find((c) => c.id === id);
}

export function getEventsByOrg(orgId: string): Event[] {
  return events.filter((e) => e.organizationId === orgId);
}

export function getTransactionsByEvent(eventId: string): Transaction[] {
  return transactions.filter((t) => t.eventId === eventId && !t.deleted);
}

export function getUsersByOrg(orgId: string): User[] {
  return users.filter((u) => u.organizationId === orgId && u.role === "student");
}

export function formatCurrency(amount: number): string {
  return "₱" + amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export const statusColors: Record<EventStatus, string> = {
  Created: "bg-slate-50 text-slate-600 border border-slate-200 font-medium",
  "For Review": "bg-amber-50 text-amber-700 border border-amber-200 font-medium",
  "For Approval": "bg-blue-50 text-blue-700 border border-blue-200 font-medium",
  "Pending Revision": "bg-orange-50 text-orange-700 border border-orange-200 font-medium",
  Approved: "bg-teal-50 text-teal-700 border border-teal-200 font-medium",
  Completed: "bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium",
  Closed: "bg-gray-50 text-gray-600 border border-gray-200 font-medium",
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
  apf: "/fixtures/TechnoFest_2025_Activity_Proposal_Form_Sample.pdf",
  appendix: "/fixtures/TechnoFest_2025_Appendices_Sample.pdf",
  receipt: "/fixtures/TechnoFest_2025_Official_Receipt_Sample.pdf",
};

export function resolvePdfUrl(urlOrName?: string, fallbackType: "apf" | "appendix" | "receipt" = "apf"): string {
  if (!urlOrName) return SAMPLE_FIXTURES[fallbackType];
  const trimmed = urlOrName.trim();
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:") || trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("/")) {
    return trimmed;
  }
  if (trimmed.toLowerCase().includes("activity_proposal_form") || trimmed.toLowerCase().includes("apf")) {
    return SAMPLE_FIXTURES.apf;
  }
  if (trimmed.toLowerCase().includes("appendices") || trimmed.toLowerCase().includes("appendix") || trimmed.toLowerCase().includes("syllabus") || trimmed.toLowerCase().includes("letter") || trimmed.toLowerCase().includes("doc")) {
    return SAMPLE_FIXTURES.appendix;
  }
  if (trimmed.toLowerCase().includes("receipt") || trimmed.toLowerCase().includes("invoice")) {
    return SAMPLE_FIXTURES.receipt;
  }
  return SAMPLE_FIXTURES[fallbackType];
}
