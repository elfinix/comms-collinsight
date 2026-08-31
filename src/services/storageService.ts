import { supabase } from "./supabaseClient";

/**
 * Supabase Storage Buckets
 * - attachments: APF, Appendices, Clearance, and Liquidation documents
 * - media: User profile avatars
 * - reports: System-generated executive and financial reports
 * - team_images: Landing page team and developer assets (read-only)
 */
export const STORAGE_BUCKETS = {
  ATTACHMENTS: "attachments",
  MEDIA: "media",
  REPORTS: "reports",
  TEAM_IMAGES: "team_images",
} as const;

export type AttachmentCategory = "APF" | "Appendices" | "Clearance" | "Liquidation";

/**
 * Generates an 8-character ID-based storage segment (e.g., org_01000000, event_e1000000, user_51000000)
 * Uses "org_administration" for institutional / admin / cross-org files.
 */
export function toIdSegment(prefix: "org" | "event" | "user", idOrName?: string | null): string {
  if (!idOrName || !idOrName.trim()) {
    return prefix === "org" ? "org_administration" : `${prefix}_general`;
  }
  const str = idOrName.trim();
  const lower = str.toLowerCase();
  if (
    prefix === "org" &&
    (lower === "administration" || lower === "admin" || lower === "institutional" || lower === "general" || lower === "cross-org")
  ) {
    return "org_administration";
  }
  const cleanId = str.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
  return `${prefix}_${cleanId || (prefix === "org" ? "administration" : "general")}`;
}

/**
 * Sanitizes file names for cloud storage path safety
 */
export function sanitizeStorageSegment(name: string): string {
  if (!name || !name.trim()) return "file.pdf";
  return name
    .trim()
    .replace(/[\\/:*?"<>|#%]/g, "_")
    .replace(/\s+/g, "_");
}

/**
 * Returns formatted date folder string (YYYY-MM-DD)
 */
export function getReportDateFolder(date?: Date | string): string {
  const d = date ? new Date(date) : new Date();
  if (isNaN(d.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  return d.toISOString().split("T")[0];
}

/**
 * Builds the exact cloud storage path for event attachments
 * Pattern: attachments / org_{first_8_id_digits} / event_{first_8_id_digits} / {category} / {fileName}
 */
export function buildAttachmentPath(
  organizationIdOrName: string | undefined | null,
  eventIdOrName: string | undefined | null,
  category: AttachmentCategory,
  fileName: string
): string {
  const orgSegment = toIdSegment("org", organizationIdOrName);
  const eventSegment = toIdSegment("event", eventIdOrName);
  const cleanFileName = sanitizeStorageSegment(fileName);
  return `${orgSegment}/${eventSegment}/${category}/${cleanFileName}`;
}

/**
 * Builds the cloud storage path for user avatars / media
 * Pattern: media / org_{first_8_id_digits} / user_{first_8_id_digits} / {fileName}
 */
export function buildUserMediaPath(
  organizationIdOrName: string | undefined | null,
  userId: string,
  fileName: string
): string {
  const orgSegment = toIdSegment("org", organizationIdOrName);
  const userSegment = toIdSegment("user", userId);
  const cleanFileName = sanitizeStorageSegment(fileName);
  return `${orgSegment}/${userSegment}/${cleanFileName}`;
}

/**
 * Builds the cloud storage path for system-generated reports
 * Pattern: reports / org_{first_8_id_digits} / {YYYY-MM-DD} / {fileName}
 */
export function buildReportPath(
  organizationIdOrName: string | undefined | null,
  dateGenerated: string | Date | undefined,
  fileName: string
): string {
  const orgSegment = toIdSegment("org", organizationIdOrName);
  const dateFolder = getReportDateFolder(dateGenerated);
  const cleanFileName = sanitizeStorageSegment(fileName);
  return `${orgSegment}/${dateFolder}/${cleanFileName}`;
}

/**
 * Retrieves the public URL for any object in a Supabase Storage bucket
 */
export function getPublicStorageUrl(bucket: string, path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads an event attachment (APF, Appendices, Clearance, or Liquidation)
 * Path: attachments / org_{first_8_id_digits} / event_{first_8_id_digits} / {category} / {fileName}
 */
export async function uploadEventAttachment(params: {
  organizationId?: string;
  organizationName?: string;
  eventId?: string;
  eventName?: string;
  category: AttachmentCategory;
  file: File | Blob;
  fileName?: string;
}): Promise<{ path: string; publicUrl: string; error: Error | null }> {
  try {
    const rawName = params.fileName || (params.file instanceof File ? params.file.name : "attachment.pdf");
    const orgIdentifier = params.organizationId || params.organizationName;
    const eventIdentifier = params.eventId || params.eventName;
    const path = buildAttachmentPath(orgIdentifier, eventIdentifier, params.category, rawName);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.ATTACHMENTS)
      .upload(path, params.file, {
        upsert: true,
        cacheControl: "3600",
        contentType: params.file.type || undefined,
      });

    if (error) {
      console.warn(`[Storage] Upload failed for ${path}:`, error.message);
      return { path: "", publicUrl: "", error: new Error(error.message) };
    }

    const publicUrl = getPublicStorageUrl(STORAGE_BUCKETS.ATTACHMENTS, data.path);
    return { path: data.path, publicUrl, error: null };
  } catch (err: any) {
    console.error("[Storage] Unexpected error during attachment upload:", err);
    return { path: "", publicUrl: "", error: err };
  }
}

/**
 * Uploads multiple event appendices in parallel
 */
export async function uploadEventAppendices(params: {
  organizationId?: string;
  organizationName?: string;
  eventId?: string;
  eventName?: string;
  files: (File | Blob)[];
  fileNames?: string[];
}): Promise<{ paths: string[]; publicUrls: string[]; errors: Error[] }> {
  const paths: string[] = [];
  const publicUrls: string[] = [];
  const errors: Error[] = [];

  await Promise.all(
    params.files.map(async (file, idx) => {
      const fileName = params.fileNames?.[idx] || (file instanceof File ? file.name : `appendix_${idx + 1}.pdf`);
      const res = await uploadEventAttachment({
        organizationId: params.organizationId,
        organizationName: params.organizationName,
        eventId: params.eventId,
        eventName: params.eventName,
        category: "Appendices",
        file,
        fileName,
      });
      if (res.error) {
        errors.push(res.error);
      } else {
        paths.push(res.path);
        publicUrls.push(res.publicUrl);
      }
    })
  );

  return { paths, publicUrls, errors };
}

/**
 * Uploads a user avatar image to the `media` bucket
 */
export async function uploadUserMedia(params: {
  organizationId?: string | null;
  organizationName?: string | null;
  userId: string;
  file: File | Blob;
  fileName?: string;
}): Promise<{ path: string; publicUrl: string; error: Error | null }> {
  try {
    const rawName = params.fileName || (params.file instanceof File ? params.file.name : "avatar.png");
    const orgIdentifier = params.organizationId || params.organizationName;
    const path = buildUserMediaPath(orgIdentifier, params.userId, rawName);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.MEDIA)
      .upload(path, params.file, {
        upsert: true,
        cacheControl: "3600",
        contentType: params.file.type || undefined,
      });

    if (error) {
      console.warn(`[Storage] Media upload failed for ${path}:`, error.message);
      return { path: "", publicUrl: "", error: new Error(error.message) };
    }

    const publicUrl = getPublicStorageUrl(STORAGE_BUCKETS.MEDIA, data.path);
    return { path: data.path, publicUrl, error: null };
  } catch (err: any) {
    console.error("[Storage] Unexpected error during media upload:", err);
    return { path: "", publicUrl: "", error: err };
  }
}

/**
 * Uploads a generated report to the `reports` bucket
 */
export async function uploadGeneratedReport(params: {
  organizationId?: string | null;
  organizationName?: string | null;
  dateGenerated?: string | Date;
  file: File | Blob;
  fileName: string;
}): Promise<{ path: string; publicUrl: string; error: Error | null }> {
  try {
    const orgIdentifier = params.organizationId || params.organizationName;
    const path = buildReportPath(orgIdentifier, params.dateGenerated, params.fileName);

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.REPORTS)
      .upload(path, params.file, {
        upsert: true,
        cacheControl: "3600",
        contentType: params.file.type || "application/pdf",
      });

    if (error) {
      console.warn(`[Storage] Report upload failed for ${path}:`, error.message);
      return { path: "", publicUrl: "", error: new Error(error.message) };
    }

    const publicUrl = getPublicStorageUrl(STORAGE_BUCKETS.REPORTS, data.path);
    return { path: data.path, publicUrl, error: null };
  } catch (err: any) {
    console.error("[Storage] Unexpected error during report upload:", err);
    return { path: "", publicUrl: "", error: err };
  }
}

/**
 * Gets a developer / landing page image URL from `team_images` bucket
 */
export function getTeamImageUrl(fileName: string): string {
  return getPublicStorageUrl(STORAGE_BUCKETS.TEAM_IMAGES, sanitizeStorageSegment(fileName));
}
