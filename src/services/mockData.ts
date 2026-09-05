/**
 * @deprecated This module is deprecated in favor of `dataService.ts`.
 * Please import types, models, and utility functions from `../services/dataService`.
 * This file is retained solely for legacy seed data reference.
 */

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
  {
    id: "user-stu-4",
    firstName: "Angelo",
    middleName: "Miguel",
    lastName: "Bautista",
    suffix: "",
    email: "abautista@student.cite.edu.ph",
    password: "bautista_987654",
    role: "student",
    position: "Treasurer",
    gender: "male",
    organizationId: "org-1",
    yearLevel: "3rd Year",
    memberSince: "2022-08-15",
  },
  {
    id: "user-stu-5",
    firstName: "Patricia",
    middleName: "Katrina",
    lastName: "Ramos",
    suffix: "",
    email: "pramos@student.cite.edu.ph",
    password: "ramos_112233",
    role: "student",
    position: "President",
    gender: "female",
    organizationId: "org-2",
    yearLevel: "4th Year",
    memberSince: "2021-08-15",
  },
  {
    id: "user-stu-6",
    firstName: "Joshua",
    middleName: "Vicente",
    lastName: "Ocampo",
    suffix: "",
    email: "jocampo@student.cite.edu.ph",
    password: "ocampo_445566",
    role: "student",
    position: "Vice President",
    gender: "male",
    organizationId: "org-2",
    yearLevel: "3rd Year",
    memberSince: "2022-08-15",
  },
  {
    id: "user-stu-7",
    firstName: "Samantha",
    middleName: "Clarisse",
    lastName: "Dela Cruz",
    suffix: "",
    email: "sdelacruz@student.cite.edu.ph",
    password: "delacruz_554433",
    role: "student",
    position: "Secretary",
    gender: "female",
    organizationId: "org-2",
    yearLevel: "2nd Year",
    memberSince: "2023-08-15",
  },
  {
    id: "user-stu-8",
    firstName: "Mark",
    middleName: "Laurence",
    lastName: "Tan",
    suffix: "",
    email: "mtan@student.cite.edu.ph",
    password: "tan_778899",
    role: "student",
    position: "President",
    gender: "male",
    organizationId: "org-3",
    yearLevel: "3rd Year",
    memberSince: "2022-08-15",
  },
  {
    id: "user-stu-9",
    firstName: "Andrea",
    middleName: "Grace",
    lastName: "Perez",
    suffix: "",
    email: "aperez@student.cite.edu.ph",
    password: "perez_998877",
    role: "student",
    position: "Vice President",
    gender: "female",
    organizationId: "org-3",
    yearLevel: "2nd Year",
    memberSince: "2023-08-15",
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
    createdAt: "2026-08-05T11:00:00",
    createdBy: "user-stu-1",
  },
  {
    id: "evt-6",
    organizationId: "org-2",
    name: "Embedded Systems & IoT Hackathon",
    typeId: "et-6",
    description: "An intensive 24-hour hardware and IoT development hackathon featuring microcontrollers and sensors.",
    proposedBudget: 16000,
    requisites: "Engineering Lab 2, breadboards, power supplies, high-speed Wi-Fi",
    dateStart: "2026-10-05T08:00",
    dateEnd: "2026-10-06T12:00",
    mode: "FTF",
    location: "CITE Hardware & Robotics Laboratory",
    apfUrl: "APF_IoT_Hackathon_Approved.pdf",
    appendices: ["Hardware_Requirements_Matrix.pdf", "Judging_Criteria.pdf"],
    clearanceDetails: "Cross-disciplinary microcontroller innovation challenge endorsed by CpE faculty.",
    remarks: [],
    status: "Approved",
    createdAt: "2026-08-12T10:00:00",
    createdBy: "user-adv-2",
  },
  {
    id: "evt-7",
    organizationId: "org-2",
    name: "Robotics & Circuits Tech Showcase",
    typeId: "et-6",
    description: "Exhibition of automated robotic projects and circuit designs engineered by Computer Engineering students.",
    proposedBudget: 9500,
    requisites: "Auditorium display tables, safety barriers, power strips",
    dateStart: "2026-10-20T09:00",
    dateEnd: "2026-10-20T17:00",
    mode: "FTF",
    location: "CITE Lobby Exhibition Area",
    apfUrl: "APF_Robotics_Showcase_2026.pdf",
    appendices: ["Exhibitor_List.pdf"],
    clearanceDetails: "Annual technical project exhibition open to all CITE students.",
    remarks: [],
    status: "For Review",
    createdAt: "2026-08-18T14:30:00",
    createdBy: "user-adv-2",
  },
  {
    id: "evt-8",
    organizationId: "org-3",
    name: "Lean Process Optimization Summit",
    typeId: "et-1",
    description: "Industry lecture and workshop on continuous improvement and lean manufacturing frameworks.",
    proposedBudget: 12000,
    requisites: "Projector, sound system, breakout room materials",
    dateStart: "2026-10-12T13:00",
    dateEnd: "2026-10-12T18:00",
    mode: "FTF",
    location: "CITE Amphitheater",
    apfUrl: "APF_Lean_Summit_Approved.pdf",
    appendices: ["Speaker_Profile_LeanExpert.pdf"],
    clearanceDetails: "Professional engineering operations seminar series.",
    remarks: [],
    status: "Approved",
    createdAt: "2026-08-14T09:15:00",
    createdBy: "user-adv-3",
  },
  {
    id: "evt-9",
    organizationId: "org-3",
    name: "Supply Chain Simulation Challenge",
    typeId: "et-6",
    description: "Interactive simulation gaming tournament modeling warehouse logistics and supply chain optimization.",
    proposedBudget: 7000,
    requisites: "Computer Lab 1, simulation software licenses",
    dateStart: "2026-08-20T10:00",
    dateEnd: "2026-08-20T16:00",
    mode: "FTF",
    location: "CITE Computer Laboratory 1",
    apfUrl: "APF_SupplyChain_Challenge_Closed.pdf",
    appendices: ["Tournament_Rules.pdf", "Scoring_Rubrics.pdf"],
    clearanceDetails: "Inter-year competition on industrial optimization simulations.",
    remarks: [],
    status: "Completed",
    createdAt: "2026-07-28T16:00:00",
    createdBy: "user-adv-3",
  },
];

export const eventSignatories: EventSignatory[] = [
  {
    id: "sig-1",
    eventId: "evt-1",
    userId: "user-adv-1",
    role: "adviser",
    status: "Endorsed",
    feedback: "Strong technical relevance for 3rd and 4th-year students.",
    signedAt: "2026-08-16T01:15:00",
    createdAt: "2026-08-16T01:15:00",
  },
  {
    id: "sig-2",
    eventId: "evt-1",
    userId: "user-dean",
    role: "dean",
    status: "Approved",
    feedback: "Approved. Ensure virtual lab guidelines are maintained.",
    signedAt: "2026-08-17T06:45:00",
    createdAt: "2026-08-17T06:45:00",
  },
  {
    id: "sig-3",
    eventId: "evt-2",
    userId: "user-adv-1",
    role: "adviser",
    status: "Endorsed",
    feedback: "Endorsed. Great initiative for cross-year knowledge transfer.",
    signedAt: "2026-08-21T02:00:00",
    createdAt: "2026-08-21T02:00:00",
  },
  {
    id: "sig-4",
    eventId: "evt-6",
    userId: "user-adv-2",
    role: "adviser",
    status: "Revision Requested",
    feedback: "Please adjust the trophy expenditure and clarify external judge compensation.",
    signedAt: "2026-08-23T03:00:00",
    createdAt: "2026-08-23T03:00:00",
  },
  {
    id: "sig-5",
    eventId: "evt-5",
    userId: "user-adv-1",
    role: "adviser",
    status: "Revision Requested",
    feedback: "Please update the guest list and confirm the catering provider before resubmission.",
    signedAt: "2026-08-06T10:00:00",
    createdAt: "2026-08-06T10:00:00",
  },
  {
    id: "sig-6",
    eventId: "evt-8",
    userId: "user-adv-3",
    role: "adviser",
    status: "Endorsed",
    feedback: "Highly recommended for industrial engineering accreditation.",
    signedAt: "2026-08-15T09:00:00",
    createdAt: "2026-08-15T09:00:00",
  },
  {
    id: "sig-7",
    eventId: "evt-8",
    userId: "user-dean",
    role: "dean",
    status: "Approved",
    feedback: "Approved for professional development credit.",
    signedAt: "2026-08-16T11:00:00",
    createdAt: "2026-08-16T11:00:00",
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
  // TechFest 2026 (evt-1)
  {
    id: "audit-1",
    eventId: "evt-1",
    organizationId: "org-1",
    userId: "user-stu-1",
    actorRole: "student",
    action: "Created Event",
    details: "Created event proposal for 'TechFest 2026: IT Innovation Summit'",
    statusTo: "Created",
    timestamp: "2026-08-01T09:00:00",
  },
  {
    id: "audit-2",
    eventId: "evt-1",
    organizationId: "org-1",
    userId: "user-stu-1",
    actorRole: "student",
    action: "Submitted for Review",
    details: "Submitted proposal 'TechFest 2026: IT Innovation Summit' to Adviser for review",
    statusFrom: "Created",
    statusTo: "For Review",
    timestamp: "2026-08-02T10:30:00",
  },
  {
    id: "audit-3",
    eventId: "evt-1",
    organizationId: "org-1",
    userId: "user-adv-1",
    actorRole: "adviser",
    action: "Approved & Forwarded",
    details: "Endorsed and forwarded proposal 'TechFest 2026: IT Innovation Summit' to Dean for approval",
    statusFrom: "For Review",
    statusTo: "For Approval",
    remarks: "Activity proposal meets all departmental requirements and budget allocation guidelines.",
    timestamp: "2026-08-05T14:00:00",
  },
  {
    id: "audit-4",
    eventId: "evt-1",
    organizationId: "org-1",
    userId: "user-dean-1",
    actorRole: "dean",
    action: "Executive Approval",
    details: "Granted executive approval for 'TechFest 2026: IT Innovation Summit'",
    statusFrom: "For Approval",
    statusTo: "Approved",
    remarks: "Approved with high commendation for technology innovation initiatives.",
    timestamp: "2026-08-07T09:00:00",
  },
  {
    id: "audit-5",
    eventId: "evt-1",
    organizationId: "org-1",
    userId: "user-stu-1",
    actorRole: "student",
    action: "Disbursed Expense",
    details: "Recorded ₱5,000 expenditure for 'TechFest 2026: IT Innovation Summit'",
    timestamp: "2026-08-10T11:15:00",
  },

  // Leadership Development Workshop (evt-2)
  {
    id: "audit-6",
    eventId: "evt-2",
    organizationId: "org-1",
    userId: "user-stu-1",
    actorRole: "student",
    action: "Created Event",
    details: "Created event proposal for 'Leadership Development Workshop'",
    statusTo: "Created",
    timestamp: "2026-08-10T14:00:00",
  },
  {
    id: "audit-7",
    eventId: "evt-2",
    organizationId: "org-1",
    userId: "user-stu-1",
    actorRole: "student",
    action: "Submitted for Review",
    details: "Submitted proposal 'Leadership Development Workshop' to Adviser for review",
    statusFrom: "Created",
    statusTo: "For Review",
    timestamp: "2026-08-12T16:20:00",
  },

  // Community Code Outreach (evt-3)
  {
    id: "audit-8",
    eventId: "evt-3",
    organizationId: "org-1",
    userId: "user-stu-2",
    actorRole: "student",
    action: "Created Event",
    details: "Created event proposal for 'Community Code Outreach'",
    statusTo: "Created",
    timestamp: "2026-08-18T10:00:00",
  },

  // Webinar Series: Cloud Technologies (evt-4)
  {
    id: "audit-9",
    eventId: "evt-4",
    organizationId: "org-1",
    userId: "user-stu-1",
    actorRole: "student",
    action: "Created Event",
    details: "Created event proposal for 'Webinar Series: Cloud Technologies'",
    statusTo: "Created",
    timestamp: "2026-07-15T08:00:00",
  },
  {
    id: "audit-10",
    eventId: "evt-4",
    organizationId: "org-1",
    userId: "user-stu-1",
    actorRole: "student",
    action: "Submitted for Review",
    details: "Submitted proposal 'Webinar Series: Cloud Technologies' to Adviser for review",
    statusFrom: "Created",
    statusTo: "For Review",
    timestamp: "2026-07-16T11:00:00",
  },
  {
    id: "audit-11",
    eventId: "evt-4",
    organizationId: "org-1",
    userId: "user-adv-1",
    actorRole: "adviser",
    action: "Approved & Forwarded",
    details: "Endorsed and forwarded proposal 'Webinar Series: Cloud Technologies' to Dean for approval",
    statusFrom: "For Review",
    statusTo: "For Approval",
    timestamp: "2026-07-18T15:30:00",
  },
  {
    id: "audit-12",
    eventId: "evt-4",
    organizationId: "org-1",
    userId: "user-dean-1",
    actorRole: "dean",
    action: "Executive Approval",
    details: "Granted executive approval for 'Webinar Series: Cloud Technologies'",
    statusFrom: "For Approval",
    statusTo: "Approved",
    timestamp: "2026-07-20T09:45:00",
  },
  {
    id: "audit-13",
    eventId: "evt-4",
    organizationId: "org-1",
    userId: "user-stu-1",
    actorRole: "student",
    action: "Event Completed",
    details: "Completed event execution for 'Webinar Series: Cloud Technologies'",
    statusFrom: "Approved",
    statusTo: "Completed",
    timestamp: "2026-08-16T18:00:00",
  },

  // CITE Tech Assembly & Officer Induction (evt-5)
  {
    id: "audit-14",
    eventId: "evt-5",
    organizationId: "org-1",
    userId: "user-stu-1",
    actorRole: "student",
    action: "Created Event",
    details: "Created event proposal for 'CITE Tech Assembly & Officer Induction'",
    statusTo: "Created",
    timestamp: "2026-08-05T11:00:00",
  },
  {
    id: "audit-15",
    eventId: "evt-5",
    organizationId: "org-1",
    userId: "user-stu-1",
    actorRole: "student",
    action: "Submitted for Review",
    details: "Submitted proposal 'CITE Tech Assembly & Officer Induction' to Adviser for review",
    statusFrom: "Created",
    statusTo: "For Review",
    timestamp: "2026-08-06T14:30:00",
  },
  {
    id: "audit-16",
    eventId: "evt-5",
    organizationId: "org-1",
    userId: "user-adv-1",
    actorRole: "adviser",
    action: "Requested Revision",
    details: "Requested revisions for proposal 'CITE Tech Assembly & Officer Induction'",
    statusFrom: "For Review",
    statusTo: "Pending Revision",
    remarks: "Please update the guest list and confirm the catering provider before resubmission.",
    timestamp: "2026-08-08T10:15:00",
  },

  // Admin and General system actions
  {
    id: "audit-17",
    userId: "user-admin-1",
    actorRole: "admin",
    action: "Added User",
    details: "Enrolled user 'Ana Garcia' as student officer (Vice President)",
    timestamp: "2026-08-15T08:00:00",
  },
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

export function formatEventSchedule(dateStart?: string, dateEnd?: string): string {
  if (!dateStart) return "—";
  try {
    const s = new Date(dateStart);
    if (isNaN(s.getTime())) return dateStart;

    const startDateStr = s.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    const hasTime = dateStart.includes("T") || dateStart.includes(":");
    const startTimeStr = hasTime ? s.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }) : "";

    if (!dateEnd || dateEnd === dateStart) {
      return startTimeStr ? `${startDateStr} · ${startTimeStr}` : startDateStr;
    }

    const e = new Date(dateEnd);
    if (isNaN(e.getTime())) {
      return startTimeStr ? `${startDateStr} · ${startTimeStr}` : startDateStr;
    }

    const endDateStr = e.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
    const endTimeStr = (dateEnd.includes("T") || dateEnd.includes(":")) ? e.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true }) : "";

    const isSameDay = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate();

    if (isSameDay) {
      if (startTimeStr && endTimeStr) {
        return `${startDateStr} · ${startTimeStr} – ${endTimeStr}`;
      } else if (startTimeStr) {
        return `${startDateStr} · ${startTimeStr}`;
      } else {
        return startDateStr;
      }
    } else {
      // Multi-day event spanning different dates
      if (startTimeStr && endTimeStr) {
        return `${startDateStr}, ${startTimeStr} – ${endDateStr}, ${endTimeStr}`;
      } else {
        return `${startDateStr} – ${endDateStr}`;
      }
    }
  } catch {
    return dateStart + (dateEnd ? ` – ${dateEnd}` : "");
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
};

export function resolvePdfUrl(url?: string, fallbackType: "apf" | "clearance" | "appendix" | "venue" | "receipt" = "apf"): string {
  if (!url) return SAMPLE_FIXTURES[fallbackType];
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  if (url.startsWith("/fixtures")) {
    return url;
  }
  // Resolve Supabase Storage attachments bucket path
  if (url.includes("/")) {
    const DEFAULT_SUPABASE_URL = "https://snsqkogfrrtyloqetowx.supabase.co";
    const base = import.meta.env.VITE_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    return `${base}/storage/v1/object/public/attachments/${url}`;
  }
  return SAMPLE_FIXTURES[fallbackType];
}

export function getActionBadgeClass(action: string): string {
  const act = action.toLowerCase();
  if (act.includes("executive approval") || act.includes("executive approved")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
  }
  if (act.includes("endorsed") || act.includes("endors")) {
    return "bg-blue-100 text-blue-800 border-blue-300 font-bold";
  }
  if (act.includes("approved") || act.includes("approv")) {
    return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
  }
  if (act.includes("revision") || act.includes("change") || act.includes("reject")) {
    return "bg-orange-100 text-orange-800 border-orange-300 font-bold";
  }
  if (act.includes("delete") || act.includes("removed")) {
    return "bg-rose-100 text-rose-800 border-rose-300 font-bold";
  }
  if (act.includes("modified") || act.includes("edit") || act.includes("update")) {
    return "bg-amber-100 text-amber-800 border-amber-300 font-bold";
  }
  if (act.includes("submit") || act.includes("for review")) {
    return "bg-amber-100 text-amber-800 border-amber-300 font-bold";
  }
  if (act.includes("disburs") || act.includes("expense") || act.includes("transaction")) {
    return "bg-purple-100 text-purple-800 border-purple-300 font-bold";
  }
  if (act.includes("completed") || act.includes("closed") || act.includes("closure")) {
    return "bg-slate-100 text-slate-700 border-slate-300 font-bold";
  }
  if (act.includes("create")) {
    return "bg-slate-100 text-slate-700 border-slate-300 font-bold";
  }
  return "bg-slate-100 text-slate-700 border-slate-300 font-bold";
}

export function printClearanceDocument(event: Event, organizationName?: string, eventTypeName?: string) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  const org = organizations.find((o) => o.id === event.organizationId);
  const orgName = organizationName || org?.name || "Student Organization";
  const orgCode = org?.code || "CITE";
  const type = getEventTypeById(event.typeId);
  const typeName = eventTypeName || type?.name || "Institutional Event";
  const cleanId = event.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  const docRef = event.clearanceDocRef || `CLR-${cleanId}-${new Date(event.dateStart || Date.now()).getFullYear()}`;
  const formattedDate = event.dateStart && event.dateEnd
    ? `${formatDateTime(event.dateStart)} – ${formatDateTime(event.dateEnd)}`
    : event.dateStart
    ? formatDateTime(event.dateStart)
    : "—";

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Event_Clearance_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 24px;
          font-size: 12px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 2px solid #0d9488;
          padding-bottom: 14px;
          margin-bottom: 18px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background-color: #115e59;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 15px;
        }
        .title {
          font-size: 16px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
        }
        .subtitle {
          font-size: 11px;
          color: #475569;
          margin: 2px 0 0 0;
        }
        .ref-box {
          text-align: right;
          font-family: monospace;
          font-size: 10px;
          color: #64748b;
        }
        .badge-dispatched {
          display: inline-block;
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
          padding: 3px 8px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 10px;
          margin-top: 4px;
          text-transform: uppercase;
        }
        .section-title {
          font-size: 11px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #0d9488;
          margin: 16px 0 8px 0;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 14px;
          border-radius: 8px;
          margin-bottom: 14px;
          font-size: 11px;
        }
        .grid-full {
          grid-column: span 2;
        }
        .label {
          font-size: 9px;
          text-transform: uppercase;
          font-weight: bold;
          color: #64748b;
          margin-bottom: 2px;
        }
        .value {
          font-weight: 600;
          color: #0f172a;
        }
        .desc-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 12px;
          border-radius: 8px;
          font-size: 11px;
          color: #1e293b;
          margin-bottom: 14px;
        }
        .signatories {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sig-card {
          border: 1px solid #cbd5e1;
          background: #fcfcfd;
          border-radius: 8px;
          padding: 14px;
          text-align: center;
        }
        .sig-role {
          font-size: 10px;
          text-transform: uppercase;
          color: #64748b;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .sig-stamp {
          background: #f0fdf4;
          border: 1px dashed #22c55e;
          color: #15803d;
          padding: 6px;
          border-radius: 6px;
          font-size: 10px;
          font-weight: bold;
          margin-bottom: 8px;
          font-family: monospace;
        }
        .sig-name {
          font-size: 12px;
          font-weight: bold;
          color: #0f172a;
        }
        .sig-title {
          font-size: 10px;
          color: #64748b;
        }
        .footer {
          margin-top: 28px;
          border-top: 1px solid #e2e8f0;
          padding-top: 10px;
          text-align: center;
          font-size: 9px;
          color: #94a3b8;
          font-family: monospace;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <div class="logo">LCUP</div>
          <div>
            <h1 class="title">OFFICIAL EVENT CLEARANCE CERTIFICATE</h1>
            <p class="subtitle">La Consolacion University Philippines · College of Information Technology & Engineering</p>
          </div>
        </div>
        <div class="ref-box">
          <div>Ref: <strong>${docRef}</strong></div>
          <div>Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
          <div class="badge-dispatched">✓ Cleared & Dispatched to SDS</div>
        </div>
      </div>

      <div class="section-title">Event Information & Authorization</div>
      <div class="grid">
        <div>
          <div class="label">Event Name</div>
          <div class="value">${event.name}</div>
        </div>
        <div>
          <div class="label">Event Type</div>
          <div class="value">${typeName}</div>
        </div>
        <div>
          <div class="label">Hosting Organization</div>
          <div class="value">${orgName}</div>
        </div>
        <div>
          <div class="label">Authorized Budget Allocation</div>
          <div class="value" style="color: #0d9488; font-family: monospace; font-size: 12px;">${formatCurrency(event.proposedBudget)}</div>
        </div>
        <div class="grid-full">
          <div class="label">Schedule & Duration</div>
          <div class="value">${formattedDate}</div>
        </div>
        <div class="grid-full">
          <div class="label">Mode & Venue / Link</div>
          <div class="value">${event.location || (event.mode === "Online/Virtual" ? "Online Platform" : "Venue TBD")} (${event.mode})</div>
        </div>
        <div class="grid-full">
          <div class="label">Attached Activity Proposal Form (APF)</div>
          <div class="value" style="font-family: monospace; color: #047857;">✓ ${event.apfUrl ? event.apfUrl.replace(/^.*[\\/]/, '') : "APF_Vetted.pdf"}</div>
        </div>
      </div>

      <div class="section-title">Event Overview & Objectives</div>
      <div class="desc-box">
        ${event.description || "Official organization event vetted and cleared for execution under college guidelines."}
      </div>

      ${event.clearanceDetails ? `
        <div class="section-title">Additional Clearance Details & Logistics</div>
        <div class="desc-box" style="font-family: monospace; font-size: 10px;">
          ${event.clearanceDetails}
        </div>
      ` : ""}

      <div class="section-title">Institutional Signatory Seals & Verification</div>
      <div class="signatories">
        <!-- 1. Faculty Adviser on Left -->
        <div class="sig-card">
          <div class="sig-role">Faculty Adviser Endorsement</div>
          <div class="sig-stamp">✓ ENDORSED TO DEAN</div>
          <div class="sig-name">Engr. Eduardo S. Reyes, M.Sc.</div>
          <div class="sig-title">Designated Faculty Adviser, ${orgCode}</div>
        </div>

        <!-- 2. Dean on Right -->
        <div class="sig-card">
          <div class="sig-role">Executive Approval & Clearance</div>
          <div class="sig-stamp" style="border-color: #0d9488; background: #f0fdfa; color: #0f766e;">✓ EXECUTIVE CLEARANCE GRANTED</div>
          <div class="sig-name">Dr. Marilou C. Villanueva, Ph.D.</div>
          <div class="sig-title">College Dean, CITE</div>
        </div>
      </div>

      <div class="footer">
        CollsInsight Institutional Management System · Official Digital Clearance Document · System Generated on ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

export function printLiquidationDocument(
  event: Event,
  eventTransactions: Transaction[],
  organizationName?: string,
  liquidatorName?: string,
  adviserName?: string,
  deanName?: string
) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    window.print();
    return;
  }

  const org = organizations.find((o) => o.id === event.organizationId);
  const orgName = organizationName || org?.name || "Student Organization";
  const orgCode = org?.code || "CITE";
  const docRef = `LQ-${event.id.toUpperCase()}-2026`;
  const totalSpent = eventTransactions.reduce((s, t) => s + t.amount, 0);
  const remaining = event.proposedBudget - totalSpent;
  const netSurplus = remaining + (event.revenue || 0);

  const txnRowsHtml = eventTransactions.map((t, idx) => {
    const cat = getCategoryById(t.categoryId)?.name || "General Expense";
    return `
      <tr>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">${idx + 1}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; font-weight: 500;">${t.description}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${cat}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">${formatCurrency(t.amount)}</td>
        <td style="padding: 7px 8px; border-bottom: 1px solid #e2e8f0; text-align: center;">
          <span style="background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold;">${t.status}</span>
        </td>
      </tr>
    `;
  }).join("");

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Liquidation_Report_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 24px;
          font-size: 11px;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #0f766e;
          padding-bottom: 14px;
          margin-bottom: 16px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          width: 44px;
          height: 44px;
          border-radius: 8px;
          background-color: #134e4a;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 16px;
          letter-spacing: 0.5px;
        }
        .title {
          font-size: 15px;
          font-weight: 800;
          color: #134e4a;
          margin: 0;
          text-transform: uppercase;
        }
        .subtitle {
          font-size: 11px;
          color: #475569;
          margin: 2px 0 0 0;
        }
        .ref-box {
          text-align: right;
          font-family: monospace;
          font-size: 10px;
          color: #475569;
        }
        .badge-reconciled {
          background: #ccfbf1;
          color: #115e59;
          font-weight: bold;
          padding: 3px 8px;
          border-radius: 4px;
          border: 1px solid #99f6e4;
          display: inline-block;
          margin-top: 4px;
          font-size: 9.5px;
          text-transform: uppercase;
        }
        .section-title {
          font-family: monospace;
          font-size: 10px;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #334155;
          margin: 14px 0 6px 0;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 4px;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 10px 12px;
          border-radius: 8px;
          margin-bottom: 12px;
          font-family: monospace;
        }
        .label {
          font-size: 8.5px;
          color: #64748b;
          text-transform: uppercase;
          font-weight: bold;
        }
        .value {
          font-size: 11px;
          font-weight: bold;
          color: #0f172a;
          margin-top: 2px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-family: monospace;
          font-size: 10.5px;
          margin-bottom: 14px;
          border: 1px solid #e2e8f0;
        }
        th {
          background: #f1f5f9;
          text-align: left;
          padding: 7px 8px;
          border-bottom: 1px solid #cbd5e1;
          font-weight: bold;
          color: #334155;
        }
        .total-row {
          background: #f0fdfa;
          font-weight: bold;
          border-top: 2px solid #0f766e;
        }
        .signatories {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-top: 20px;
        }
        .sig-card {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 10px 12px;
          background: #f8fafc;
          text-align: center;
        }
        .sig-role {
          font-size: 9px;
          font-family: monospace;
          color: #64748b;
          text-transform: uppercase;
          font-weight: bold;
          margin-bottom: 6px;
        }
        .sig-stamp {
          display: inline-block;
          font-size: 9px;
          font-family: monospace;
          font-weight: bold;
          padding: 2px 6px;
          border-radius: 4px;
          border: 1px dashed #0f766e;
          background: #f0fdfa;
          color: #0f766e;
          margin-bottom: 6px;
        }
        .sig-name {
          font-weight: bold;
          font-size: 11px;
          color: #0f172a;
          border-top: 1px solid #cbd5e1;
          padding-top: 6px;
          margin-top: 4px;
        }
        .sig-title {
          font-size: 9.5px;
          color: #64748b;
          margin-top: 2px;
        }
        .footer {
          margin-top: 24px;
          border-top: 1px solid #e2e8f0;
          padding-top: 8px;
          text-align: center;
          font-size: 8.5px;
          color: #94a3b8;
          font-family: monospace;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <div class="logo">LCUP</div>
          <div>
            <h1 class="title">OFFICIAL FINANCIAL LIQUIDATION REPORT</h1>
            <p class="subtitle">La Consolacion University Philippines · College of Information Technology & Engineering</p>
            <p style="margin: 2px 0 0 0; font-size: 10px; font-weight: bold; color: #0f766e;">${orgName} (${orgCode})</p>
          </div>
        </div>
        <div class="ref-box">
          <div>Ref: <strong>${docRef}</strong></div>
          <div>Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}</div>
          <div class="badge-reconciled">✓ Audited & Liquidated</div>
        </div>
      </div>

      <div class="section-title">Event Financial Profile</div>
      <div class="grid">
        <div>
          <div class="label">Event Name</div>
          <div class="value">${event.name}</div>
        </div>
        <div>
          <div class="label">Date Conducted</div>
          <div class="value">${formatDate(event.dateStart)}</div>
        </div>
        <div>
          <div class="label">Approved Allocation</div>
          <div class="value" style="color: #0f766e;">${formatCurrency(event.proposedBudget)}</div>
        </div>
        <div>
          <div class="label">Total Disbursed</div>
          <div class="value" style="color: #047857;">${formatCurrency(totalSpent)}</div>
        </div>
      </div>

      <div class="section-title">Itemized Statement of Expenditures (${eventTransactions.length} Items)</div>
      <table>
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">#</th>
            <th>Disbursement Description</th>
            <th style="width: 140px;">Category</th>
            <th style="width: 100px; text-align: right;">Amount</th>
            <th style="width: 80px; text-align: center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${txnRowsHtml}
          <tr class="total-row">
            <td colspan="3" style="padding: 8px; text-align: right; color: #134e4a;">TOTAL DISBURSED EXPENDITURES:</td>
            <td style="padding: 8px; text-align: right; color: #134e4a;">${formatCurrency(totalSpent)}</td>
            <td style="padding: 8px; text-align: center; color: #047857; font-size: 9px;">100% RECONCILED</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Treasury Settlement & Balance Reversion</div>
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-family: monospace; font-size: 11px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
          <span style="color: #475569;">Unexpended Budget Allocation (Reverted to Treasury):</span>
          <strong style="color: #0f766e;">${formatCurrency(remaining)}</strong>
        </div>
        ${event.revenue !== undefined && event.revenue > 0 ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #475569;">Total Gross Event Revenue Deposited:</span>
            <strong style="color: #0d9488;">${formatCurrency(event.revenue)}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 4px;">
            <span style="color: #065f46; font-weight: bold;">Net Surplus Reconciled into Organization Treasury:</span>
            <strong style="color: #047857; font-size: 12px;">${formatCurrency(netSurplus)}</strong>
          </div>
        ` : ""}
      </div>

      <div class="section-title">Institutional Signatories & Financial Clearance Verification</div>
      <div class="signatories">
        <!-- 1. Student Finance Officer -->
        <div class="sig-card">
          <div class="sig-role">Prepared & Liquidated by</div>
          <div class="sig-stamp">✓ DIGITALLY CERTIFIED</div>
          <div class="sig-name">${liquidatorName || "Student Finance Officer"}</div>
          <div class="sig-title">Finance Officer, ${orgCode}</div>
        </div>

        <!-- 2. Faculty Adviser -->
        <div class="sig-card">
          <div class="sig-role">Audited & Verified by</div>
          <div class="sig-stamp">✓ AUDIT VERIFIED</div>
          <div class="sig-name">${adviserName || "Engr. Eduardo S. Reyes, M.Sc."}</div>
          <div class="sig-title">Designated Faculty Adviser, ${orgCode}</div>
        </div>

        <!-- 3. Dean -->
        <div class="sig-card">
          <div class="sig-role">Executive Acceptance</div>
          <div class="sig-stamp">✓ ARCHIVED & CLEARED</div>
          <div class="sig-name">${deanName || "Dr. Marilou C. Villanueva, Ph.D."}</div>
          <div class="sig-title">College Dean, CITE</div>
        </div>
      </div>

      <div class="footer">
        CollsInsight Financial Management · Official Digital Liquidation Statement · System Generated on ${new Date().toLocaleString()}
      </div>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}
