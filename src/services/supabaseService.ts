import { supabase } from "./supabaseClient";
import {
  Department,
  Organization,
  User,
  EventType,
  ExpenditureCategory,
  Event,
  Transaction,
  AuditEntry,
  OrganizationMember,
  EventSignatory,
} from "./mockData";

// ============================================================================
// DATA MAPPERS (Database snake_case <--> Application camelCase)
// ============================================================================

export function mapDepartmentFromDb(row: any): Department {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    color: row.color || "#0d9488",
    description: row.description || "",
    deleted: row.deleted ?? false,
  };
}

export function mapOrganizationFromDb(row: any): Organization {
  return {
    id: row.id,
    name: row.name,
    code: row.code,
    departmentId: row.department_id,
    allocatedBudget: Number(row.allocated_budget || 0),
    adviserId: row.adviser_id || "",
    logoColor: row.logo_color || "#0d9488",
    description: row.description || "",
    avatar: row.avatar || undefined,
    deleted: row.deleted ?? false,
  };
}

export function mapUserFromDb(row: any): User {
  return {
    id: row.id,
    firstName: row.first_name,
    middleName: row.middle_name || "",
    lastName: row.last_name,
    suffix: row.suffix || "",
    email: row.email,
    password: row.password,
    role: row.role,
    position: row.position,
    gender: row.gender || "male",
    organizationId: row.organization_id || undefined,
    yearLevel: row.year_level || undefined,
    memberSince: row.member_since || "2023-01-01",
    avatar: row.avatar || undefined,
    deleted: row.deleted ?? false,
  };
}

export function mapEventTypeFromDb(row: any): EventType {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    deleted: row.deleted ?? false,
  };
}

export function mapCategoryFromDb(row: any): ExpenditureCategory {
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    deleted: row.deleted ?? false,
  };
}

export function mapEventFromDb(row: any): Event {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    typeId: row.type_id,
    description: row.description || "",
    proposedBudget: Number(row.proposed_budget || 0),
    requisites: row.requisites || "",
    dateStart: row.date_start,
    dateEnd: row.date_end,
    mode: row.mode || "FTF",
    location: row.location || "",
    apfUrl: row.apf_url || undefined,
    appendices: Array.isArray(row.appendices) ? row.appendices : [],
    clearanceDetails: row.clearance_details || undefined,
    remarks: Array.isArray(row.remarks) ? row.remarks : [],
    status: row.status || "Created",
    adviserFeedback: row.adviser_feedback || undefined,
    deanFeedback: row.dean_feedback || undefined,
    revenue: row.revenue !== null && row.revenue !== undefined ? Number(row.revenue) : undefined,
    liquidatedBy: row.liquidated_by || undefined,
    liquidatedAt: row.liquidated_at || undefined,
    createdAt: row.created_at,
    createdBy: row.created_by || "",
    deleted: row.deleted ?? false,
  };
}

export function mapTransactionFromDb(row: any): Transaction {
  return {
    id: row.id,
    eventId: row.event_id,
    description: row.description,
    categoryId: row.category_id,
    amount: Number(row.amount || 0),
    status: row.status || "Pending",
    receiptUrl: row.receipt_url || undefined,
    createdAt: row.created_at,
    deleted: row.deleted ?? false,
  };
}

export function mapAuditEntryFromDb(row: any): AuditEntry {
  return {
    id: row.id,
    userId: row.user_id,
    action: row.action,
    details: row.details,
    timestamp: row.timestamp,
    eventId: row.event_id || undefined,
    organizationId: row.organization_id || undefined,
    actorRole: row.actor_role || undefined,
    statusFrom: row.status_from || undefined,
    statusTo: row.status_to || undefined,
    remarks: row.remarks || undefined,
  };
}

export function mapOrgMemberFromDb(row: any): OrganizationMember {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    position: row.position || "Member",
    role: row.role || "member",
    isPrimary: row.is_primary ?? true,
    academicYear: row.academic_year || "2025-2026",
    createdAt: row.created_at,
  };
}

export function mapEventSignatoryFromDb(row: any): EventSignatory {
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    role: row.role,
    status: row.status,
    feedback: row.feedback || undefined,
    signedAt: row.signed_at || undefined,
  };
}

// ============================================================================
// API CLIENT METHODS
// ============================================================================

export const supabaseApi = {
  // Fetch All Initial App Data in Parallel
  async fetchAllState() {
    try {
      const [
        deptsRes,
        orgsRes,
        usersRes,
        etypesRes,
        catsRes,
        eventsRes,
        txnsRes,
        auditRes,
      ] = await Promise.all([
        supabase.from("departments").select("*").order("name"),
        supabase.from("organizations").select("*").order("name"),
        supabase.from("users").select("*").order("first_name"),
        supabase.from("event_types").select("*").order("name"),
        supabase.from("expenditure_categories").select("*").order("name"),
        supabase.from("events").select("*").order("date_start", { ascending: false }),
        supabase.from("transactions").select("*").order("created_at", { ascending: false }),
        supabase.from("audit_trail").select("*").order("timestamp", { ascending: false }),
      ]);

      if (deptsRes.error) {
        console.warn("Supabase departments error:", deptsRes.error);
      }

      return {
        departments: (deptsRes.data || []).map(mapDepartmentFromDb),
        organizations: (orgsRes.data || []).map(mapOrganizationFromDb),
        users: (usersRes.data || []).map(mapUserFromDb),
        eventTypes: (etypesRes.data || []).map(mapEventTypeFromDb),
        expenditureCategories: (catsRes.data || []).map(mapCategoryFromDb),
        events: (eventsRes.data || []).map(mapEventFromDb),
        transactions: (txnsRes.data || []).map(mapTransactionFromDb),
        auditTrail: (auditRes.data || []).map(mapAuditEntryFromDb),
      };
    } catch (err) {
      console.error("Supabase fetchAllState failed:", err);
      return null;
    }
  },

  // --------------------------------------------------------------------------
  // Events API
  // --------------------------------------------------------------------------
  async createEvent(event: Event) {
    const dbPayload = {
      id: event.id,
      organization_id: event.organizationId,
      name: event.name,
      type_id: event.typeId,
      description: event.description,
      proposed_budget: event.proposedBudget,
      requisites: event.requisites,
      date_start: event.dateStart,
      date_end: event.dateEnd,
      mode: event.mode,
      location: event.location,
      apf_url: event.apfUrl || null,
      appendices: event.appendices || [],
      clearance_details: event.clearanceDetails || null,
      remarks: event.remarks || [],
      status: event.status,
      adviser_feedback: event.adviserFeedback || null,
      dean_feedback: event.deanFeedback || null,
      revenue: event.revenue || 0,
      liquidated_by: event.liquidatedBy || null,
      liquidated_at: event.liquidatedAt || null,
      created_at: event.createdAt,
      created_by: event.createdBy,
      deleted: event.deleted || false,
    };
    return supabase.from("events").upsert(dbPayload).select();
  },

  async updateEvent(id: string, updates: Partial<Event>) {
    const dbPayload: any = {};
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.typeId !== undefined) dbPayload.type_id = updates.typeId;
    if (updates.description !== undefined) dbPayload.description = updates.description;
    if (updates.proposedBudget !== undefined) dbPayload.proposed_budget = updates.proposedBudget;
    if (updates.requisites !== undefined) dbPayload.requisites = updates.requisites;
    if (updates.dateStart !== undefined) dbPayload.date_start = updates.dateStart;
    if (updates.dateEnd !== undefined) dbPayload.date_end = updates.dateEnd;
    if (updates.mode !== undefined) dbPayload.mode = updates.mode;
    if (updates.location !== undefined) dbPayload.location = updates.location;
    if (updates.apfUrl !== undefined) dbPayload.apf_url = updates.apfUrl;
    if (updates.appendices !== undefined) dbPayload.appendices = updates.appendices;
    if (updates.clearanceDetails !== undefined) dbPayload.clearance_details = updates.clearanceDetails;
    if (updates.remarks !== undefined) dbPayload.remarks = updates.remarks;
    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.adviserFeedback !== undefined) dbPayload.adviser_feedback = updates.adviserFeedback;
    if (updates.deanFeedback !== undefined) dbPayload.dean_feedback = updates.deanFeedback;
    if (updates.revenue !== undefined) dbPayload.revenue = updates.revenue;
    if (updates.liquidatedBy !== undefined) dbPayload.liquidated_by = updates.liquidatedBy;
    if (updates.liquidatedAt !== undefined) dbPayload.liquidated_at = updates.liquidatedAt;
    if (updates.deleted !== undefined) dbPayload.deleted = updates.deleted;

    return supabase.from("events").update(dbPayload).eq("id", id).select();
  },

  async softDeleteEvent(id: string) {
    return supabase.from("events").update({ deleted: true }).eq("id", id);
  },

  // --------------------------------------------------------------------------
  // Transactions API
  // --------------------------------------------------------------------------
  async createTransaction(txn: Transaction) {
    const dbPayload = {
      id: txn.id,
      event_id: txn.eventId,
      description: txn.description,
      category_id: txn.categoryId,
      amount: txn.amount,
      status: txn.status,
      receipt_url: txn.receiptUrl || null,
      created_at: txn.createdAt,
      deleted: txn.deleted || false,
    };
    return supabase.from("transactions").upsert(dbPayload).select();
  },

  async updateTransaction(id: string, updates: Partial<Transaction>) {
    const dbPayload: any = {};
    if (updates.description !== undefined) dbPayload.description = updates.description;
    if (updates.categoryId !== undefined) dbPayload.category_id = updates.categoryId;
    if (updates.amount !== undefined) dbPayload.amount = updates.amount;
    if (updates.status !== undefined) dbPayload.status = updates.status;
    if (updates.receiptUrl !== undefined) dbPayload.receipt_url = updates.receiptUrl;
    if (updates.deleted !== undefined) dbPayload.deleted = updates.deleted;

    return supabase.from("transactions").update(dbPayload).eq("id", id).select();
  },

  async softDeleteTransaction(id: string) {
    return supabase.from("transactions").update({ deleted: true }).eq("id", id);
  },

  // --------------------------------------------------------------------------
  // Users API
  // --------------------------------------------------------------------------
  async createUser(user: User) {
    const dbPayload = {
      id: user.id,
      first_name: user.firstName,
      middle_name: user.middleName || "",
      last_name: user.lastName,
      suffix: user.suffix || "",
      email: user.email,
      password: user.password,
      role: user.role,
      position: user.position,
      gender: user.gender || "male",
      organization_id: user.organizationId || null,
      year_level: user.yearLevel || "3rd Year",
      member_since: user.memberSince || "2023-01-01",
      avatar: user.avatar || null,
      deleted: user.deleted || false,
    };
    return supabase.from("users").upsert(dbPayload).select();
  },

  async updateUser(id: string, updates: Partial<User>) {
    const dbPayload: any = {};
    if (updates.firstName !== undefined) dbPayload.first_name = updates.firstName;
    if (updates.middleName !== undefined) dbPayload.middle_name = updates.middleName;
    if (updates.lastName !== undefined) dbPayload.last_name = updates.lastName;
    if (updates.suffix !== undefined) dbPayload.suffix = updates.suffix;
    if (updates.email !== undefined) dbPayload.email = updates.email;
    if (updates.password !== undefined) dbPayload.password = updates.password;
    if (updates.role !== undefined) dbPayload.role = updates.role;
    if (updates.position !== undefined) dbPayload.position = updates.position;
    if (updates.gender !== undefined) dbPayload.gender = updates.gender;
    if (updates.organizationId !== undefined) dbPayload.organization_id = updates.organizationId || null;
    if (updates.yearLevel !== undefined) dbPayload.year_level = updates.yearLevel;
    if (updates.avatar !== undefined) dbPayload.avatar = updates.avatar || null;
    if (updates.deleted !== undefined) dbPayload.deleted = updates.deleted;

    return supabase.from("users").update(dbPayload).eq("id", id).select();
  },

  async softDeleteUser(id: string) {
    return supabase.from("users").update({ deleted: true }).eq("id", id);
  },

  // --------------------------------------------------------------------------
  // Organizations API
  // --------------------------------------------------------------------------
  async createOrganization(org: Organization) {
    const dbPayload = {
      id: org.id,
      name: org.name,
      code: org.code,
      department_id: org.departmentId || null,
      allocated_budget: org.allocatedBudget,
      adviser_id: org.adviserId || null,
      logo_color: org.logoColor || "#0d9488",
      description: org.description || "",
      avatar: org.avatar || null,
      deleted: org.deleted || false,
    };
    return supabase.from("organizations").upsert(dbPayload).select();
  },

  async updateOrganization(id: string, updates: Partial<Organization>) {
    const dbPayload: any = {};
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.code !== undefined) dbPayload.code = updates.code;
    if (updates.departmentId !== undefined) dbPayload.department_id = updates.departmentId;
    if (updates.allocatedBudget !== undefined) dbPayload.allocated_budget = updates.allocatedBudget;
    if (updates.adviserId !== undefined) dbPayload.adviser_id = updates.adviserId || null;
    if (updates.logoColor !== undefined) dbPayload.logo_color = updates.logoColor;
    if (updates.description !== undefined) dbPayload.description = updates.description;
    if (updates.avatar !== undefined) dbPayload.avatar = updates.avatar || null;
    if (updates.deleted !== undefined) dbPayload.deleted = updates.deleted;

    return supabase.from("organizations").update(dbPayload).eq("id", id).select();
  },

  async softDeleteOrganization(id: string) {
    return supabase.from("organizations").update({ deleted: true }).eq("id", id);
  },

  // --------------------------------------------------------------------------
  // Departments API
  // --------------------------------------------------------------------------
  async createDepartment(dept: Department) {
    const dbPayload = {
      id: dept.id,
      name: dept.name,
      code: dept.code,
      color: dept.color || "#0d9488",
      description: dept.description || "",
      deleted: dept.deleted || false,
    };
    return supabase.from("departments").upsert(dbPayload).select();
  },

  async updateDepartment(id: string, updates: Partial<Department>) {
    const dbPayload: any = {};
    if (updates.name !== undefined) dbPayload.name = updates.name;
    if (updates.code !== undefined) dbPayload.code = updates.code;
    if (updates.color !== undefined) dbPayload.color = updates.color;
    if (updates.description !== undefined) dbPayload.description = updates.description;
    if (updates.deleted !== undefined) dbPayload.deleted = updates.deleted;

    return supabase.from("departments").update(dbPayload).eq("id", id).select();
  },

  async softDeleteDepartment(id: string) {
    return supabase.from("departments").update({ deleted: true }).eq("id", id);
  },

  // --------------------------------------------------------------------------
  // Configurations API (Event Types & Categories)
  // --------------------------------------------------------------------------
  async createEventType(et: EventType) {
    return supabase.from("event_types").upsert({
      id: et.id,
      name: et.name,
      description: et.description || "",
      deleted: false,
    }).select();
  },

  async softDeleteEventType(id: string) {
    return supabase.from("event_types").update({ deleted: true }).eq("id", id);
  },

  async createCategory(cat: ExpenditureCategory) {
    return supabase.from("expenditure_categories").upsert({
      id: cat.id,
      name: cat.name,
      description: cat.description || "",
      deleted: false,
    }).select();
  },

  async softDeleteCategory(id: string) {
    return supabase.from("expenditure_categories").update({ deleted: true }).eq("id", id);
  },

  // --------------------------------------------------------------------------
  // Audit Trail API
  // --------------------------------------------------------------------------
  async createAuditEntry(entry: AuditEntry) {
    const dbPayload = {
      id: entry.id,
      user_id: entry.userId,
      action: entry.action,
      details: entry.details,
      timestamp: entry.timestamp,
      event_id: entry.eventId || null,
      organization_id: entry.organizationId || null,
      actor_role: entry.actorRole || null,
      status_from: entry.statusFrom || null,
      status_to: entry.statusTo || null,
      remarks: entry.remarks || null,
    };
    return supabase.from("audit_trail").insert(dbPayload);
  },

  // --------------------------------------------------------------------------
  // Exported Reports Tracking API
  // --------------------------------------------------------------------------
  async createExportedReport(report: any) {
    const dbPayload = {
      id: report.id,
      title: report.title,
      doc_ref: report.docRef,
      category: report.category,
      organization_name: report.organizationName,
      generated_by: report.generatedBy,
      generated_at: report.generatedAt,
      file_url: report.fileUrl || null,
      file_path: report.filePath || null,
      format: report.format || "PDF",
    };
    return supabase.from("exported_reports").insert(dbPayload);
  },

  async fetchExportedReports() {
    return supabase.from("exported_reports").select("*").order("generated_at", { ascending: false });
  },
};
