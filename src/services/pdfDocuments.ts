import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Event, Transaction, formatDateTime, formatDate, getEventTypeById, getCategoryById } from "./mockData";

export interface ClearancePdfOptions {
  organizationName?: string;
  eventTypeName?: string;
  officerName?: string;
  adviserName?: string;
  deanName?: string;
  categories?: { id: string; name: string }[];
  viewerRole?: "student" | "adviser" | "dean" | "admin";
}

export interface LiquidationPdfOptions {
  organizationName?: string;
  officerName?: string;
  adviserName?: string;
  deanName?: string;
  categories?: { id: string; name: string }[];
}

/**
 * Formats a currency number with 2-decimal precision for financial PDF documents
 */
export function formatPdfCurrency(amount: number): string {
  return `PHP ${Number(amount || 0).toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Opens a PDF Blob in a new tab or triggers direct download if popup is blocked
 */
export function openPdfBlobInNewTab(pdfBlob: Blob, fileName: string) {
  const blobUrl = URL.createObjectURL(pdfBlob);
  const openWindow = window.open(blobUrl, "_blank");
  if (!openWindow) {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Generates a genuine vector PDF for Event Clearance Certificate
 */
export function generateClearancePdfBlob(event: Event, options?: ClearancePdfOptions): Blob {
  const orgName = options?.organizationName || "Student Organization";
  const typeName = options?.eventTypeName || getEventTypeById(event.typeId)?.name || "Institutional Event";
  const officerName = options?.officerName || "Student Project Lead";
  const adviserName = options?.adviserName || "Engr. Emmanuel S. Reyes, M.Sc.";
  const deanName = options?.deanName || "Dr. Marilou Castro Villanueva, Ph.D.";

  const cleanId = event.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  const docRef = `CLR-${cleanId}-${new Date(event.dateStart || Date.now()).getFullYear()}`;
  const generatedDate = formatDateTime(new Date().toISOString());

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // ── 1. HEADER SECTION ───────────────────────────────────────────
  // LCUP Logo Square
  doc.setFillColor(19, 78, 74); // #134e4a
  doc.roundedRect(margin, 12, 11, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("LCUP", margin + 1.6, 19);

  // University & Department Titles
  doc.setTextColor(19, 78, 74); // #134e4a
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text("LA CONSOLACION UNIVERSITY PHILIPPINES", margin + 14, 16);

  doc.setTextColor(71, 85, 105); // #475569
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("College of Information Technology & Engineering", margin + 14, 20);

  doc.setTextColor(15, 118, 110); // #0f766e
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("Event Clearance", margin + 14, 24);

  // Top Right: EVENT CLEARANCE Pill Badge
  const badgeText = "EVENT CLEARANCE CERTIFICATE";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  const badgeW = doc.getTextWidth(badgeText) + 5;
  const badgeX = pageWidth - margin - badgeW;

  doc.setFillColor(204, 251, 241); // #ccfbf1
  doc.setDrawColor(153, 246, 228); // #99f6e4
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, 11.5, badgeW, 5.5, 1.2, 1.2, "FD");

  doc.setTextColor(17, 94, 89); // #115e59
  doc.text(badgeText, badgeX + 2.5, 15.5);

  // Ref and Date below pill badge (Normal Weight)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // #475569
  doc.text(`Ref: ${docRef}`, pageWidth - margin, 20.5, { align: "right" });
  doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 24.5, { align: "right" });

  // Teal Header Line Divider
  doc.setDrawColor(15, 118, 110); // #0f766e
  doc.setLineWidth(0.5);
  doc.line(margin, 28, pageWidth - margin, 28);

  const isApproved = ["Approved", "Completed", "Closed"].includes(event.status);
  const viewerRole = options?.viewerRole;

  let showAdviserSign = false;
  let showDeanSign = false;

  if (isApproved || viewerRole === "dean") {
    showAdviserSign = true;
    showDeanSign = true;
  } else if (event.status === "For Approval" || viewerRole === "adviser") {
    showAdviserSign = true;
    showDeanSign = false;
  } else {
    showAdviserSign = false;
    showDeanSign = false;
  }

  // ── 2. EXECUTIVE STATUS BANNER (GENEROUS PADDING) ──────────────
  const bannerY = 34;
  const bannerH = 15;
  if (showDeanSign) {
    doc.setFillColor(240, 253, 250); // #f0fdfa
    doc.setDrawColor(153, 246, 228); // #99f6e4
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, bannerY, contentWidth, bannerH, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 118, 110);
    doc.text("EXECUTIVE CLEARANCE STATUS: OFFICIAL CLEARANCE GRANTED", margin + 4, bannerY + 5.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Dispatched to Student Development Services (SDS) & Academic Affairs", margin + 4, bannerY + 11);
  } else if (showAdviserSign) {
    doc.setFillColor(240, 253, 250); // #f0fdfa
    doc.setDrawColor(153, 246, 228); // #99f6e4
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, bannerY, contentWidth, bannerH, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 118, 110);
    doc.text("ADVISER REVIEW STATUS: ENDORSED FOR DEAN APPROVAL", margin + 4, bannerY + 5.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Activity Proposal Form (APF) & Appendices Endorsed to Dean's Office", margin + 4, bannerY + 11);
  } else {
    doc.setFillColor(248, 250, 252); // #f8fafc
    doc.setDrawColor(226, 232, 240); // #e2e8f0
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, bannerY, contentWidth, bannerH, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text("PROPOSAL CLEARANCE STATUS: PENDING ENDORSEMENT & CLEARANCE", margin + 4, bannerY + 5.8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Activity Proposal Form (APF) Prepared for Faculty Adviser Review", margin + 4, bannerY + 11);
  }

  // ── 3. EVENT IDENTIFICATION GRID (BALANCED PADDING) ────────────
  const gridY = 55;
  const gridH = 42;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, gridY, contentWidth, gridH, 1.5, 1.5, "FD");

  const midX = margin + contentWidth / 2;

  // Left Column
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("EVENT PROPOSAL NAME", margin + 4, gridY + 5.5);
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(event.name, margin + 4, gridY + 11);

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("ORGANIZING BODY", margin + 4, gridY + 19);
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text(orgName, margin + 4, gridY + 24.5);

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("EVENT TYPE & SCOPE", margin + 4, gridY + 32.5);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(typeName, margin + 4, gridY + 38);

  // Right Column: Date & Time Calculation
  let dateFormatted = "—";
  if (event.dateStart) {
    const startD = new Date(event.dateStart);
    const startDateFmt = formatDate(event.dateStart);
    const hasExplicitTime = event.dateStart.includes("T") || event.dateStart.includes(":");

    if (event.dateEnd && event.dateStart !== event.dateEnd) {
      const endD = new Date(event.dateEnd);
      const isSameDay = !isNaN(startD.getTime()) && !isNaN(endD.getTime()) &&
        startD.getFullYear() === endD.getFullYear() &&
        startD.getMonth() === endD.getMonth() &&
        startD.getDate() === endD.getDate();

      if (isSameDay) {
        if (hasExplicitTime) {
          const timeStart = startD.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
          const timeEnd = endD.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
          dateFormatted = `${startDateFmt} · ${timeStart} – ${timeEnd}`;
        } else {
          dateFormatted = startDateFmt;
        }
      } else {
        dateFormatted = `${formatDate(event.dateStart)} – ${formatDate(event.dateEnd)}`;
      }
    } else {
      if (hasExplicitTime && !isNaN(startD.getTime())) {
        const timeStart = startD.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit", hour12: true });
        dateFormatted = `${startDateFmt} · ${timeStart}`;
      } else {
        dateFormatted = startDateFmt;
      }
    }
  }

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("SCHEDULED EVENT DATE & TIME", midX + 4, gridY + 5.5);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(dateFormatted, midX + 4, gridY + 11);

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("VENUE / PLATFORM LOCATION", midX + 4, gridY + 19);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(event.location || "LCUP Main Campus / Designated Venue", midX + 4, gridY + 24.5);

  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text("PROPOSED ALLOCATED BUDGET", midX + 4, gridY + 32.5);
  doc.setFontSize(9);
  doc.setTextColor(15, 118, 110);
  doc.text(formatPdfCurrency(event.proposedBudget), midX + 4, gridY + 38);

  // ── 4. SCOPE & OBJECTIVES SUMMARY (GENEROUS SPACING & LINE HEIGHT) ─
  const descHeaderY = gridY + gridH + 8;
  const descBoxY = descHeaderY + 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110);
  doc.text("AUTHORIZED ACTIVITY SCOPE & DESCRIPTION", margin, descHeaderY);

  const cleanDescription = (event.description || "The student organization is granted clearance to execute all approved program mechanics, workshop schedules, and student engagements in accordance with LCUP CITE Student Development guidelines.").replace(/₱/g, "PHP ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const splitDesc = doc.splitTextToSize(cleanDescription, contentWidth - 10);
  const descBoxH = Math.max(22, splitDesc.length * 5.2 + 8.5);

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, descBoxY, contentWidth, descBoxH, 1.5, 1.5, "FD");

  doc.setTextColor(51, 65, 85);
  splitDesc.forEach((line: string, i: number) => {
    doc.text(line, margin + 5, descBoxY + 6.5 + i * 5.2);
  });

  // ── 5. CLEARANCE CERTIFICATION CLAUSE (SPACED & BALANCED) ──────
  const certHeaderY = descBoxY + descBoxH + 9;
  const certBoxY = certHeaderY + 5;
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 118, 110);
  doc.text("INSTITUTIONAL CLEARANCE CERTIFICATION CLAUSE", margin, certHeaderY);

  const certClause = "This certifies that the event proposal has satisfied all institutional clearance requirements, safety protocols, and adviser endorsements of the College of Information Technology & Engineering. The organization is authorized to execute the program mechanics, disburse allocated funds, and coordinate with Student Development Services (SDS).";
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const splitCert = doc.splitTextToSize(certClause, contentWidth - 16);
  const certBoxH = Math.max(24, splitCert.length * 4.5 + 9);

  doc.setFillColor(240, 253, 250);
  doc.setDrawColor(204, 251, 241);
  doc.roundedRect(margin, certBoxY, contentWidth, certBoxH, 1.5, 1.5, "FD");

  // Green left accent line
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(1.2);
  doc.line(margin + 2.5, certBoxY + 3.5, margin + 2.5, certBoxY + certBoxH - 5);

  doc.setTextColor(15, 23, 42);
  splitCert.forEach((line: string, i: number) => {
    doc.text(line, margin + 7.5, certBoxY + 6.8 + i * 5.2);
  });

  // ── 6. SIGNATORIES & SEAL SECTION ───────────────────────────────
  const pageHeight = doc.internal.pageSize.getHeight();

  // Divider above signatories
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 48, pageWidth - margin, pageHeight - 48);

  const sigColW = contentWidth / 3;

  // Signatory 1: Student Project Lead ("✓ Digitally Signed")
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("SUBMITTED BY:", margin + 2, pageHeight - 42);

  // Vector checkmark
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.4);
  doc.line(margin + 2, pageHeight - 36.2, margin + 3.4, pageHeight - 34.8);
  doc.line(margin + 3.4, pageHeight - 34.8, margin + 5.8, pageHeight - 37.6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(4, 120, 87);
  doc.text("Digitally Signed", margin + 7.5, pageHeight - 35.6);

  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.3);
  doc.line(margin + 2, pageHeight - 28, margin + sigColW - 8, pageHeight - 28);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(officerName, margin + 2, pageHeight - 23.5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Project Lead / Officer", margin + 2, pageHeight - 19.5);

  // Signatory 2: Organization Adviser ("✓ Reviewed & Endorsed")
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("REVIEWED & ENDORSED BY:", margin + sigColW + 2, pageHeight - 42);

  if (showAdviserSign) {
    // Vector checkmark
    doc.setDrawColor(4, 120, 87);
    doc.setLineWidth(0.4);
    doc.line(margin + sigColW + 2, pageHeight - 36.2, margin + sigColW + 3.4, pageHeight - 34.8);
    doc.line(margin + sigColW + 3.4, pageHeight - 34.8, margin + sigColW + 5.8, pageHeight - 37.6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87);
    doc.text("Reviewed & Endorsed", margin + sigColW + 7.5, pageHeight - 35.6);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("[ Pending Endorsement ]", margin + sigColW + 2, pageHeight - 35.6);
  }

  doc.setDrawColor(51, 65, 85);
  doc.line(margin + sigColW + 2, pageHeight - 28, margin + sigColW * 2 - 8, pageHeight - 28);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(adviserName, margin + sigColW + 2, pageHeight - 23.5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Organization Adviser", margin + sigColW + 2, pageHeight - 19.5);

  // Signatory 3: College Dean ("✓ Approved")
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(100, 116, 139);
  doc.text("EXECUTIVE CLEARANCE BY:", margin + sigColW * 2 + 2, pageHeight - 42);

  if (showDeanSign) {
    // Vector checkmark
    doc.setDrawColor(4, 120, 87);
    doc.setLineWidth(0.4);
    doc.line(margin + sigColW * 2 + 2, pageHeight - 36.2, margin + sigColW * 2 + 3.4, pageHeight - 34.8);
    doc.line(margin + sigColW * 2 + 3.4, pageHeight - 34.8, margin + sigColW * 2 + 5.8, pageHeight - 37.6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(4, 120, 87);
    doc.text("Approved", margin + sigColW * 2 + 7.5, pageHeight - 35.6);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("[ Pending Executive Clearance ]", margin + sigColW * 2 + 2, pageHeight - 35.6);
  }

  doc.setDrawColor(51, 65, 85);
  doc.line(margin + sigColW * 2 + 2, pageHeight - 28, pageWidth - margin - 2, pageHeight - 28);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(deanName, margin + sigColW * 2 + 2, pageHeight - 23.5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("College Dean, CITE", margin + sigColW * 2 + 2, pageHeight - 19.5);

  // Footer Tagline with 13mm bottom margin
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("COLLinSight Institutional Clearance · LCUP CITE Executive Directorate", pageWidth / 2, pageHeight - 13, { align: "center" });

  return doc.output("blob");
}

/**
 * Generates a genuine vector PDF for Financial Liquidation Report
 */
export function generateLiquidationPdfBlob(
  event: Event,
  transactions: Transaction[],
  options?: LiquidationPdfOptions
): Blob {
  const orgName = options?.organizationName || "Student Organization";
  const officerName = options?.officerName || "Student Finance Officer";
  const adviserName = options?.adviserName || "Engr. Emmanuel S. Reyes, M.Sc.";
  const deanName = options?.deanName || "Dr. Marilou Castro Villanueva, Ph.D.";

  const cleanId = event.id.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  const docRef = `LIQ-${cleanId}-${new Date(event.dateStart || Date.now()).getFullYear()}`;
  const generatedDate = formatDateTime(new Date().toISOString());

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // ── 1. HEADER SECTION ───────────────────────────────────────────
  // LCUP Logo Square
  doc.setFillColor(19, 78, 74); // #134e4a
  doc.roundedRect(margin, 12, 11, 11, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("LCUP", margin + 1.6, 19);

  // University & Department Titles
  doc.setTextColor(19, 78, 74); // #134e4a
  doc.setFontSize(10.5);
  doc.setFont("helvetica", "bold");
  doc.text("LA CONSOLACION UNIVERSITY PHILIPPINES", margin + 14, 16);

  doc.setTextColor(71, 85, 105); // #475569
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "normal");
  doc.text("College of Information Technology & Engineering", margin + 14, 20);

  doc.setTextColor(15, 118, 110); // #0f766e
  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text(`${orgName} · Post-Event Financial Liquidation Report`, margin + 14, 24);

  // Top Right: FINANCIAL LIQUIDATION REPORT Pill Badge
  const badgeText = "FINANCIAL LIQUIDATION REPORT";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  const badgeW = doc.getTextWidth(badgeText) + 5;
  const badgeX = pageWidth - margin - badgeW;

  doc.setFillColor(204, 251, 241); // #ccfbf1
  doc.setDrawColor(153, 246, 228); // #99f6e4
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, 11.5, badgeW, 5.5, 1.2, 1.2, "FD");

  doc.setTextColor(17, 94, 89); // #115e59
  doc.text(badgeText, badgeX + 2.5, 15.5);

  // Ref and Date below pill badge (Normal Weight)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // #475569
  doc.text(`Ref: ${docRef}`, pageWidth - margin, 20.5, { align: "right" });
  doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 24.5, { align: "right" });

  // Teal Header Line Divider
  doc.setDrawColor(15, 118, 110); // #0f766e
  doc.setLineWidth(0.5);
  doc.line(margin, 28, pageWidth - margin, 28);

  // ── 2. EVENT IDENTIFICATION & FINANCIAL METRIC BOXES ────────────
  const activeTxns = transactions.filter((t) => !t.deleted);
  const totalDisbursed = activeTxns.reduce((s, t) => s + t.amount, 0);
  const remaining = event.proposedBudget - totalDisbursed;
  const revenue = event.revenue || 0;
  const netSurplus = remaining + revenue;
  const varianceLabel = remaining >= 0 ? "SURPLUS" : "DEFICIT";

  // 2-Tier Event Details Box (Full Event Name Un-truncated & Generous Bottom Padding)
  const kpiY = 32;
  const kpiH = 24;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, kpiY, contentWidth, kpiH, 1.5, 1.5, "FD");

  // Top Tier: Complete Event Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  doc.setTextColor(100, 116, 139);
  doc.text("EVENT NAME & PROPOSAL TITLE", margin + 3.5, kpiY + 4.5);
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(event.name, margin + 3.5, kpiY + 9.5);

  // Divider inside card
  doc.setDrawColor(226, 232, 240);
  doc.line(margin + 3.5, kpiY + 12.5, margin + contentWidth - 3.5, kpiY + 12.5);

  // Bottom Tier: 4 Columns with Balanced Padding
  const colW = (contentWidth - 7) / 4;

  // Col 1: Date Conducted
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("DATE CONDUCTED", margin + 3.5, kpiY + 16.5);
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(formatDate(event.dateStart), margin + 3.5, kpiY + 20.8);

  // Col 2: Approved Budget
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("APPROVED BUDGET", margin + 3.5 + colW, kpiY + 16.5);
  doc.setFontSize(8);
  doc.setTextColor(15, 118, 110);
  doc.text(formatPdfCurrency(event.proposedBudget), margin + 3.5 + colW, kpiY + 20.8);

  // Col 3: Total Disbursed
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text("TOTAL DISBURSED", margin + 3.5 + colW * 2, kpiY + 16.5);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(formatPdfCurrency(totalDisbursed), margin + 3.5 + colW * 2, kpiY + 20.8);

  // Col 4: Variance
  doc.setFontSize(5.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`VARIANCE (${varianceLabel})`, margin + 3.5 + colW * 3, kpiY + 16.5);
  doc.setFontSize(8);
  doc.setTextColor(remaining >= 0 ? 21 : 185, remaining >= 0 ? 128 : 28, remaining >= 0 ? 61 : 28);
  doc.text(formatPdfCurrency(Math.abs(remaining)), margin + 3.5 + colW * 3, kpiY + 20.8);

  // ── 3. ITEMIZED FINANCIAL STATEMENT TABLE ───────────────────────
  const txnTableData = activeTxns.map((t, idx) => {
    const catName = options?.categories?.find((c) => c.id === t.categoryId)?.name || getCategoryById(t.categoryId)?.name || "General";
    const cleanDesc = (t.description || "").replace(/₱/g, "PHP ");

    return [
      idx + 1,
      cleanDesc,
      catName,
      formatPdfCurrency(t.amount),
      t.status,
    ];
  });

  txnTableData.push([
    "",
    "TOTAL EXPENDITURES:",
    "",
    formatPdfCurrency(totalDisbursed),
    "100% RECONCILED",
  ]);

  let finalTableY = 59;

  autoTable(doc, {
    startY: 59,
    head: [["#", "Description", "Category", "Amount (PHP)", "Status"]],
    body: txnTableData,
    theme: "plain",
    styles: {
      font: "helvetica",
      fontStyle: "normal",
      fontSize: 7.5,
      textColor: [15, 23, 42],
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      lineWidth: { bottom: 0.15 },
      lineColor: [226, 232, 240],
      valign: "middle",
    },
    headStyles: {
      fillColor: [241, 245, 249],
      textColor: [51, 65, 85],
      fontSize: 7,
      fontStyle: "bold",
      font: "helvetica",
      lineWidth: { bottom: 0.3 },
      lineColor: [203, 213, 225],
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", font: "helvetica", textColor: [100, 116, 139] },
      1: { cellWidth: 72 },
      2: { cellWidth: 35, textColor: [71, 85, 105] },
      3: { cellWidth: 35, halign: "right", fontStyle: "bold" },
      4: { cellWidth: 30, halign: "center", fontStyle: "bold", textColor: [15, 118, 110] },
    },
    margin: { left: margin, right: margin, bottom: 50 },
    didDrawPage: (data) => {
      finalTableY = data.cursor?.y || 120;
    },
  });

  // ── 4. RECONCILIATION SUMMARY BOXES (MATCHING DIALOG) ───────────
  let reconY = finalTableY + 4;
  if (reconY > 210) {
    doc.addPage();
    reconY = 20;
  }

  // Box 1: Net Balance Remaining (Surplus / Reversion)
  doc.setFillColor(241, 245, 249); // #f1f5f9
  doc.setDrawColor(226, 232, 240); // #e2e8f0
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, reconY, contentWidth, 8, 1.2, 1.2, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Net Balance Remaining (Surplus / Reversion):", margin + 3.5, reconY + 5.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 118, 110);
  doc.text(formatPdfCurrency(remaining), pageWidth - margin - 3.5, reconY + 5.2, { align: "right" });

  reconY += 9.5;

  // Box 2 & 3: Gross Revenue & Total Surplus (if revenue > 0)
  if (revenue > 0) {
    // Gross Revenue
    doc.setFillColor(240, 253, 250); // #f0fdfa
    doc.setDrawColor(153, 246, 228); // #99f6e4
    doc.roundedRect(margin, reconY, contentWidth, 8, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(17, 94, 89);
    doc.text("Total Gross Event Revenue Generated:", margin + 3.5, reconY + 5.2);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(15, 118, 110);
    doc.text(formatPdfCurrency(revenue), pageWidth - margin - 3.5, reconY + 5.2, { align: "right" });

    reconY += 9.5;

    // Net Total Surplus Reconciled
    doc.setFillColor(236, 253, 245); // #ecfdf5
    doc.setDrawColor(167, 243, 208); // #a7f3d0
    doc.roundedRect(margin, reconY, contentWidth, 8, 1.2, 1.2, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(6, 95, 70);
    doc.text("Net Total Surplus Reconciled to Treasury:", margin + 3.5, reconY + 5.2);

    doc.setFontSize(8.5);
    doc.setTextColor(4, 120, 87);
    doc.text(formatPdfCurrency(netSurplus), pageWidth - margin - 3.5, reconY + 5.2, { align: "right" });

    reconY += 9.5;
  }

  // ── 5. AUTHORIZED SIGNATORIES SIGN-OFF WITH DIGITAL CERTIFICATION ──
  const pageHeight = doc.internal.pageSize.getHeight();

  // Divider above signatories
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34);

  const sigColW = contentWidth / 3;

  // Signatory 1: Student Finance Officer with Vector Checkmark & Clean Helvetica Text
  doc.setDrawColor(4, 120, 87);
  doc.setLineWidth(0.4);
  doc.line(margin + 2, pageHeight - 26.8, margin + 3.4, pageHeight - 25.4);
  doc.line(margin + 3.4, pageHeight - 25.4, margin + 5.8, pageHeight - 28.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(4, 120, 87); // emerald
  doc.text("Digitally Certified", margin + 7.5, pageHeight - 26.2);

  doc.setDrawColor(51, 65, 85);
  doc.setLineWidth(0.3);
  doc.line(margin + 2, pageHeight - 21, margin + sigColW - 8, pageHeight - 21);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(officerName, margin + 2, pageHeight - 17.5);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text(`Student Finance Officer, ${orgName}`, margin + 2, pageHeight - 14);

  // Signatory 2: Adviser
  doc.setDrawColor(51, 65, 85);
  doc.line(margin + sigColW + 2, pageHeight - 21, margin + sigColW * 2 - 8, pageHeight - 21);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(adviserName, margin + sigColW + 2, pageHeight - 17.5);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("Organization Adviser", margin + sigColW + 2, pageHeight - 14);

  // Signatory 3: Dean
  doc.setDrawColor(51, 65, 85);
  doc.line(margin + sigColW * 2 + 2, pageHeight - 21, pageWidth - margin - 2, pageHeight - 21);
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(deanName, margin + sigColW * 2 + 2, pageHeight - 17.5);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 116, 139);
  doc.text("College Dean, CITE", margin + sigColW * 2 + 2, pageHeight - 14);

  return doc.output("blob");
}

/**
 * Direct print/preview wrapper for Event Clearance Certificate
 */
export function printClearanceDocument(event: Event, organizationName?: string, eventTypeName?: string) {
  const fileName = `Event_Clearance_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  const blob = generateClearancePdfBlob(event, { organizationName, eventTypeName });
  openPdfBlobInNewTab(blob, fileName);
}

/**
 * Direct print/preview wrapper for Financial Liquidation Statement
 */
export function printLiquidationDocument(
  event: Event,
  eventTransactions: Transaction[],
  optionsOrOrgName?: string | LiquidationPdfOptions,
  liquidatorName?: string,
  adviserName?: string,
  deanName?: string
) {
  const options: LiquidationPdfOptions = typeof optionsOrOrgName === "string"
    ? { organizationName: optionsOrOrgName, officerName: liquidatorName, adviserName, deanName }
    : (optionsOrOrgName || {});
  const fileName = `Liquidation_Report_${event.name.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
  const blob = generateLiquidationPdfBlob(event, eventTransactions, options);
  openPdfBlobInNewTab(blob, fileName);
}
