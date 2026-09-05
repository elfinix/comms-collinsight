import { Event, formatCurrency, formatDate, formatDateTime, formatEventSchedule, isWebUrl, toWebUrl, getEventTypeById, resolvePdfUrl } from "./dataService";
import { generateClearancePdfBlob } from "./pdfDocuments";

export interface ClearanceEmailAttachment {
  filename: string;
  contentBase64: string;
  contentType: string;
}

export interface SendClearanceEmailParams {
  event: Event;
  organizationName?: string;
  eventTypeName?: string;
  deanName?: string;
  feedback?: string;
  recipientEmail?: string;
}

/**
 * Converts a Blob to a raw base64 string
 */
export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1] || "";
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Fetches a URL (local fixture, storage URL, or blob) and converts it to Base64
 */
export async function urlToBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await blobToBase64(blob);
  } catch (err) {
    console.warn("[Mailer] Could not fetch document for attachment:", url, err);
    return null;
  }
}

/**
 * Generates the responsive, professional HTML email body for Dean Event Clearance Approval
 */
export function generateClearanceEmailHtml(params: {
  event: Event;
  organizationName: string;
  eventTypeName: string;
  deanName: string;
  feedback?: string;
  attachmentNames: string[];
}): string {
  const { event, organizationName, eventTypeName, deanName, feedback, attachmentNames } = params;
  const cleanId = event.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  const docRef = event.clearanceDocRef || `CLR-${cleanId}-${new Date(event.dateStart || Date.now()).getFullYear()}`;
  const approvalDate = new Date().toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const isOnline = event.mode === "Online/Virtual" || (event.mode as string) === "Online";
  const locationLabel = isOnline ? "Platform / Link" : "Venue / Location";
  const formattedSchedule = formatEventSchedule(event.dateStart, event.dateEnd);
  const locationDisplay = isWebUrl(event.location)
    ? `<a href="${toWebUrl(event.location)}" target="_blank" style="color: #0a6b64; text-decoration: underline; word-break: break-all;">${event.location}</a>`
    : (event.location || (isOnline ? "Online Platform" : "Venue TBD"));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Executive Event Clearance - ${event.name}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f9f8;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #0d201e;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #f4f9f8;
      padding: 36px 16px;
      box-sizing: border-box;
    }
    .container {
      max-width: 620px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #c4deda;
      box-shadow: 0 4px 20px rgba(10, 107, 100, 0.06);
    }
    .header {
      background: linear-gradient(135deg, #0a6b64 0%, #064e48 100%);
      padding: 32px 28px;
      text-align: left;
      color: #ffffff;
    }
    .header-badge {
      display: inline-block;
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: #ffffff;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .header h1 {
      margin: 0 0 6px 0;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.3px;
      line-height: 1.3;
    }
    .header p {
      margin: 0;
      font-size: 13px;
      color: #d0f0eb;
      font-weight: 500;
    }
    .content {
      padding: 28px;
    }
    .status-card {
      background-color: #ecfdf5;
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 24px;
      display: flex;
      align-items: center;
    }
    .status-pill {
      display: inline-block;
      background-color: #059669;
      color: #ffffff;
      font-size: 11px;
      font-weight: 800;
      padding: 4px 10px;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .status-title {
      font-size: 14px;
      font-weight: 700;
      color: #065f46;
      margin: 0;
    }
    .status-desc {
      font-size: 12px;
      color: #047857;
      margin: 2px 0 0 0;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      color: #4a7c79;
      margin: 0 0 12px 0;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }
    .meta-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-bottom: 24px;
      border: 1px solid #e2ecea;
      border-radius: 12px;
      overflow: hidden;
    }
    .meta-table tr:not(:last-child) td {
      border-bottom: 1px solid #eef5f4;
    }
    .meta-table td {
      padding: 12px 16px;
      font-size: 13px;
    }
    .meta-label {
      width: 35%;
      color: #58807d;
      font-weight: 600;
      background-color: #fbfdfd;
    }
    .meta-value {
      width: 65%;
      color: #0d201e;
      font-weight: 700;
      background-color: #ffffff;
    }
    .remarks-box {
      background-color: #f8fafc;
      border-left: 4px solid #0a6b64;
      border-radius: 0 10px 10px 0;
      padding: 14px 16px;
      margin-bottom: 24px;
    }
    .remarks-box p {
      margin: 0;
      font-size: 13px;
      color: #334155;
      font-style: italic;
      line-height: 1.5;
    }
    .attachments-card {
      background-color: #f0f7f6;
      border: 1px dashed #0a6b64;
      border-radius: 12px;
      padding: 18px 20px;
      margin-bottom: 24px;
    }
    .attachment-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      font-size: 13px;
      color: #0f4d48;
      font-weight: 600;
    }
    .attachment-item:not(:last-child) {
      border-bottom: 1px solid #d8e8e6;
    }
    .attachment-icon {
      display: inline-block;
      width: 24px;
      height: 18px;
      background-color: #0a6b64;
      color: #ffffff;
      border-radius: 4px;
      text-align: center;
      line-height: 18px;
      font-size: 10px;
      margin-right: 10px;
      font-weight: bold;
    }
    .footer {
      background-color: #064e48;
      padding: 24px 28px;
      text-align: center;
      color: #cceae7;
      border-top: 1px solid #043834;
    }
    .brand-logo-container {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .brand-box {
      background: #14b8a6;
      color: #cceae7;
      font-weight: 900;
      font-size: 11px;
      padding: 3px 7px;
      border-radius: 5px;
      display: inline-block;
      letter-spacing: 0.5px;
    }
    .brand-name {
      font-size: 14px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 0.3px;
    }
    .footer-text {
      font-size: 11px;
      color: #8ec7c2;
      margin: 4px 0 0 0;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      
      <!-- Header -->
      <div class="header">
        <div class="header-badge">Digital Document Transmission</div>
        <h1>Event Clearance Approved</h1>
        <p>College of Information Technology & Engineering · LCUP</p>
      </div>

      <!-- Main Content -->
      <div class="content">
        
        <!-- Status Card -->
        <div class="status-card">
          <div>
            <span class="status-pill">✓ Approved by Dean</span>
            <p class="status-title">Executive Clearance Granted</p>
            <p class="status-desc">The digital clearance certificate and endorsed activity proposal have been transmitted for SDS compliance archiving.</p>
          </div>
        </div>

        <!-- Event Metadata -->
        <div class="section-title">Event Summary & Clearance Details</div>
        <table class="meta-table">
          <tr>
            <td class="meta-label">Document Reference</td>
            <td class="meta-value" style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; color: #0a6b64;">${docRef}</td>
          </tr>
          <tr>
            <td class="meta-label">Event Name</td>
            <td class="meta-value">${event.name}</td>
          </tr>
          <tr>
            <td class="meta-label">Organization</td>
            <td class="meta-value">${organizationName}</td>
          </tr>
          <tr>
            <td class="meta-label">Classification / Type</td>
            <td class="meta-value">${eventTypeName}</td>
          </tr>
          <tr>
            <td class="meta-label">Event Mode</td>
            <td class="meta-value">${event.mode === "FTF" ? "Face-to-Face (FTF)" : "Online / Virtual"}</td>
          </tr>
          <tr>
            <td class="meta-label">Scheduled Date & Time</td>
            <td class="meta-value">${formattedSchedule}</td>
          </tr>
          <tr>
            <td class="meta-label">${locationLabel}</td>
            <td class="meta-value">${locationDisplay}</td>
          </tr>
          <tr>
            <td class="meta-label">Proposed Budget</td>
            <td class="meta-value" style="color: #0a6b64;">${formatCurrency(event.proposedBudget)}</td>
          </tr>
          <tr>
            <td class="meta-label">Executive Approver</td>
            <td class="meta-value">${deanName} (College Dean)</td>
          </tr>
          <tr>
            <td class="meta-label">Approval Timestamp</td>
            <td class="meta-value">${approvalDate}</td>
          </tr>
        </table>

        ${
          feedback && feedback.trim()
            ? `
        <!-- Dean Remarks -->
        <div class="section-title">Dean's Endorsement Remarks</div>
        <div class="remarks-box">
          <p>"${feedback.trim()}"</p>
        </div>
        `
            : ""
        }

        <!-- Attached Documents -->
        <div class="section-title">Attached Digital Documents (${attachmentNames.length})</div>
        <div class="attachments-card">
          ${attachmentNames
            .map(
              (name) => `
          <div class="attachment-item">
            <span class="attachment-icon">PDF</span>
            <span>${name}</span>
          </div>`
            )
            .join("")}
        </div>

        <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
          <strong>Note for Student Development & Services (SDS):</strong> The attached Clearance Certificate and Activity Proposal Form (APF) represent verified, finalized executive clearance from the College Dean.
        </p>

      </div>

      <!-- Footer -->
      <div class="footer">
        <div class="brand-logo-container">
          <span class="brand-box">C</span>
          &nbsp;
          <span class="brand-name">COLLinSight</span>
        </div>
        <p class="footer-text">
          Powered by <strong>COLLinSight</strong> · College Student Organization Management & Compliance Portal<br>
          La Consolacion University Philippines · Valenzuela St., Capitol View Park, City of Malolos, Bulacan<br>
          <br>
          <em>This is an automated system dispatch. Please do not reply directly to this automated email.</em>
        </p>
      </div>

    </div>
  </div>
</body>
</html>`;
}

/**
 * Dispatches the complete Clearance email with all attachments (Clearance, APF, Appendices)
 */
export async function dispatchClearanceEmail(params: SendClearanceEmailParams): Promise<{
  success: boolean;
  to?: string;
  messageId?: string;
  error?: string;
}> {
  const resolvedEventTypeName = params.eventTypeName || getEventTypeById(params.event.typeId)?.name || "Academic Seminar";
  const { event, organizationName = "Student Organization", eventTypeName = resolvedEventTypeName, deanName = "Dr. Marilou Castro Villanueva, Ph.D.", feedback, recipientEmail } = params;

  try {
    const attachments: ClearanceEmailAttachment[] = [];

    // 1. Generate Clearance Certificate PDF Blob and convert to Base64
    const targetApprovedEvent: Event = { ...event, status: "Approved" };
    const clearancePdfBlob = generateClearancePdfBlob(targetApprovedEvent, {
      organizationName,
      eventTypeName,
      deanName,
      viewerRole: "dean",
    });
    const clearanceBase64 = await blobToBase64(clearancePdfBlob);
    const clearanceDocName = `Event_Clearance_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;

    attachments.push({
      filename: clearanceDocName,
      contentBase64: clearanceBase64,
      contentType: "application/pdf",
    });

    // 2. Fetch and attach APF (Activity Proposal Form)
    if (event.apfUrl) {
      const apfResolvedUrl = resolvePdfUrl(event.apfUrl, "apf");
      const apfBase64 = await urlToBase64(apfResolvedUrl);
      if (apfBase64) {
        const apfCleanName = `APF_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
        attachments.push({
          filename: apfCleanName,
          contentBase64: apfBase64,
          contentType: "application/pdf",
        });
      }
    }

    // 3. Fetch and attach all Appendices (if any, preserving numerical order)
    if (event.appendices && event.appendices.length > 0) {
      const appendixAttachments = await Promise.all(
        event.appendices.map(async (appendixUrl, idx) => {
          const resolvedUrl = resolvePdfUrl(appendixUrl, "appendix");
          const appendixBase64 = await urlToBase64(resolvedUrl);
          if (appendixBase64) {
            const rawFilename = appendixUrl.replace(/^.*[\\/]/, "");
            const filename = rawFilename.toLowerCase().endsWith(".pdf")
              ? `Appendix_${idx + 1}_${rawFilename}`
              : `Appendix_${idx + 1}_${rawFilename}.pdf`;

            return {
              filename,
              contentBase64: appendixBase64,
              contentType: "application/pdf",
            };
          }
          return null;
        })
      );

      for (const item of appendixAttachments) {
        if (item) {
          attachments.push(item);
        }
      }
    }

    // 4. Generate Branded HTML Body
    const attachmentNames = attachments.map((a) => a.filename);
    const html = generateClearanceEmailHtml({
      event,
      organizationName,
      eventTypeName,
      deanName,
      feedback,
      attachmentNames,
    });

    const subject = `[CLEARANCE APPROVED] ${event.name} — ${organizationName}`;

    // 5. Send to API endpoint
    const response = await fetch("/api/send-clearance-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: recipientEmail, // If empty, backend defaults to GMAIL_TO_EMAIL or projectcollinsight@gmail.com
        subject,
        html,
        attachments,
      }),
    });

    const result = await response.json();
    if (!response.ok || !result.success) {
      console.warn("[Mailer] Server dispatch warning:", result);
      return { success: false, error: result.error || "Email dispatch failed." };
    }

    console.log("[Mailer] Successfully dispatched email:", result);
    return {
      success: true,
      to: result.to,
      messageId: result.messageId,
    };
  } catch (err: any) {
    console.error("[Mailer] Unexpected error during clearance email dispatch:", err);
    return { success: false, error: err.message || "Failed to dispatch clearance email." };
  }
}
