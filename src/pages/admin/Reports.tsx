import { useState } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Card, CardHeader, CardBody, Button, StatCard, Dialog } from "../../components/ui";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Users, Calendar, Activity, Building2, FileDown, ExternalLink, FileText, CheckCircle } from "lucide-react";
import { formatCurrency, formatDateTime, formatDate } from "../../services/mockData";
import { uploadGeneratedReport, getPublicStorageUrl } from "../../services/storageService";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export default function AdminReports() {
  const { users, events, auditTrail, organizations, departments, exportedReports, addExportedReport } = useApp();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [currentDocRef, setCurrentDocRef] = useState<string>("");
  const [currentFileUrl, setCurrentFileUrl] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const adminName = currentUser
    ? `${currentUser.firstName} ${currentUser.lastName}${currentUser.suffix ? ", " + currentUser.suffix : ""}`
    : "Team COLLinSight CITE";

  const activityByDay = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dayStr = d.toISOString().split("T")[0];
    const actions = auditTrail.filter((a) => a.timestamp.startsWith(dayStr)).length;
    return { name: d.toLocaleDateString("en-US", { weekday: "short" }), actions };
  });

  const orgData = organizations.map((o) => ({
    name: o.code,
    users: users.filter((u) => u.organizationId === o.id).length,
    events: events.filter((e) => e.organizationId === o.id).length,
  }));

  async function handleGenerateReport() {
    setIsExporting(true);
    const docRef = `SYS-RPT-${Date.now().toString().slice(-6)}`;
    const generatedDate = formatDateTime(new Date().toISOString());
    const deans = users.filter((u) => u.role === "dean");
    const deanName = deans.length > 0 ? `${deans[0].firstName} ${deans[0].middleName ? deans[0].middleName + " " : ""}${deans[0].lastName}${deans[0].suffix ? ", " + deans[0].suffix : ""}` : "Dr. Marilou Castro Villanueva, Ph.D.";

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = 210;
      const margin = 14;
      const contentWidth = pageWidth - margin * 2; 

      doc.setFillColor(19, 78, 74);
      doc.roundedRect(margin, 12, 11, 11, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.text("LCUP", margin + 1.6, 19);

      doc.setTextColor(19, 78, 74);
      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.text("LA CONSOLACION UNIVERSITY PHILIPPINES", margin + 14, 16);

      doc.setTextColor(71, 85, 105);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.text("College of Information Technology & Engineering", margin + 14, 20);

      doc.setTextColor(15, 118, 110);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.text("System Usage & Activity Analytics Report", margin + 14, 24);

      const badgeText = "SYSTEM USAGE REPORT";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      const badgeW = doc.getTextWidth(badgeText) + 5;
      const badgeX = pageWidth - margin - badgeW;

      doc.setFillColor(204, 251, 241);
      doc.setDrawColor(153, 246, 228);
      doc.setLineWidth(0.3);
      doc.roundedRect(badgeX, 11.5, badgeW, 5.5, 1.2, 1.2, "FD");

      doc.setTextColor(17, 94, 89);
      doc.text(badgeText, badgeX + 2.5, 15.5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Ref: ${docRef}`, pageWidth - margin, 20.5, { align: "right" });
      doc.text(`Generated: ${generatedDate}`, pageWidth - margin, 24.5, { align: "right" });

      doc.setDrawColor(15, 118, 110);
      doc.setLineWidth(0.5);
      doc.line(margin, 28, pageWidth - margin, 28);

      const kpiY = 32;
      const kpiH = 12;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, kpiY, contentWidth, kpiH, 1.5, 1.5, "FD");

      const colW = contentWidth / 4;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("REGISTERED USERS", margin + 3.5, kpiY + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${users.length} Users`, margin + 3.5, kpiY + 9.5);

      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("EVENTS TRACKED", margin + colW + 3.5, kpiY + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${events.length} Events`, margin + colW + 3.5, kpiY + 9.5);

      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("AUDIT TRAIL LOGS", margin + colW * 2 + 3.5, kpiY + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${auditTrail.length} Logs`, margin + colW * 2 + 3.5, kpiY + 9.5);

      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text("ORGANIZATIONS", margin + colW * 3 + 3.5, kpiY + 4.5);
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(`${organizations.length} Active`, margin + colW * 3 + 3.5, kpiY + 9.5);

      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 118, 110);
      doc.text("WEEKLY SYSTEM ACTIVITY BREAKDOWN", margin, 49);

      const dayCardW = (contentWidth - 6 * 2) / 7;
      const dayY = 52;
      const dayH = 10;
      activityByDay.forEach((d, idx) => {
        const x = margin + idx * (dayCardW + 2);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, dayY, dayCardW, dayH, 1, 1, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(d.name, x + dayCardW / 2, dayY + 3.8, { align: "center" });

        doc.setFontSize(8.5);
        doc.setTextColor(15, 118, 110);
        doc.text(`${d.actions}`, x + dayCardW / 2, dayY + 8, { align: "center" });
      });

      // ── 3. USER ACCOUNT DISTRIBUTION BY ROLE ───────────────────────
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 118, 110);
      doc.text("USER ACCOUNT DISTRIBUTION BY ROLE", margin, 66);

      const roleStats = [
        { label: "STUDENT OFFICERS", count: users.filter((u) => u.role === "student").length },
        { label: "ORG ADVISERS", count: users.filter((u) => u.role === "adviser").length },
        { label: "COLLEGE DEAN", count: users.filter((u) => u.role === "dean").length },
        { label: "ADMINISTRATORS", count: users.filter((u) => u.role === "admin").length },
      ];

      const roleCardW = (contentWidth - 3 * 2.5) / 4;
      const roleY = 69;
      const roleH = 11;
      roleStats.forEach((r, idx) => {
        const x = margin + idx * (roleCardW + 2.5);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.roundedRect(x, roleY, roleCardW, roleH, 1, 1, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(6);
        doc.setTextColor(100, 116, 139);
        doc.text(r.label, x + roleCardW / 2, roleY + 4, { align: "center" });

        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        const pct = Math.round((r.count / (users.length || 1)) * 100);
        doc.text(`${r.count} (${pct}%)`, x + roleCardW / 2, roleY + 8.5, { align: "center" });
      });

      // ── 4. ORGANIZATIONAL BUDGET ENGAGEMENT TABLE ───────────────────
      const orgTableData = organizations.map((org) => {
        const orgDept = departments.find((d) => d.id === org.departmentId)?.name || "Information Tech.";
        const orgEvents = events.filter((e) => e.organizationId === org.id);
        const orgAdv = users.find((u) => u.id === org.adviserId);
        const advName = orgAdv ? `${orgAdv.firstName} ${orgAdv.lastName}` : "Unassigned";
        const orgOfficers = users.filter((u) => u.organizationId === org.id && u.role === "student").length;

        return [
          org.code,
          org.name,
          orgDept,
          `PHP ${org.allocatedBudget.toLocaleString()}`,
          advName,
          orgOfficers,
          orgEvents.length,
        ];
      });

      autoTable(doc, {
        startY: 84,
        head: [["Code", "Organization Name", "Department", "Allocation", "Assigned Adviser", "Officers", "Events"]],
        body: orgTableData,
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
          0: { cellWidth: 16, font: "helvetica", fontStyle: "bold", textColor: [15, 118, 110] },
          1: { cellWidth: 48 },
          2: { cellWidth: 22, halign: "center" },
          3: { cellWidth: 26, halign: "right", fontStyle: "bold" },
          4: { cellWidth: 38 },
          5: { cellWidth: 16, halign: "center" },
          6: { cellWidth: 16, halign: "center", fontStyle: "bold" },
        },
        margin: { left: margin, right: margin, bottom: 36 },
        didDrawPage: () => {
          const pageHeight = doc.internal.pageSize.getHeight();
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.3);
          doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);

          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("SYSTEM USAGE REPORT EXTRACTED BY:", margin + 2, pageHeight - 26);
          doc.setDrawColor(51, 65, 85);
          doc.setLineWidth(0.3);
          doc.line(margin + 2, pageHeight - 21, margin + 75, pageHeight - 21);
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(adminName, margin + 2, pageHeight - 17.5);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text("System Administrator, CITE", margin + 2, pageHeight - 14);

          doc.setFontSize(6.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(100, 116, 139);
          doc.text("CERTIFIED & REVIEWED BY:", 120, pageHeight - 26);
          doc.setDrawColor(51, 65, 85);
          doc.line(120, pageHeight - 21, pageWidth - margin - 2, pageHeight - 21);
          doc.setFontSize(8);
          doc.setTextColor(15, 23, 42);
          doc.text(deanName, 120, pageHeight - 17.5);
          doc.setFontSize(6.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 116, 139);
          doc.text("College Dean, CITE", 120, pageHeight - 14);
        },
      });

      const pdfBlob = doc.output("blob");
      const fileName = `${docRef}_System_Usage_Report.pdf`;

      const storageRes = await uploadGeneratedReport({
        organizationName: "Administration",
        dateGenerated: new Date(),
        file: pdfBlob,
        fileName,
      });

      const publicUrl = storageRes.publicUrl || getPublicStorageUrl("reports", `Administration/${new Date().toISOString().split("T")[0]}/${fileName}`);

      addExportedReport({
        id: crypto.randomUUID(),
        title: "System Usage & Activity Analytics Report",
        docRef,
        category: "System Usage",
        organizationName: "Administration",
        generatedBy: adminName,
        generatedAt: new Date().toISOString(),
        fileUrl: publicUrl,
        filePath: storageRes.path || `Administration/${new Date().toISOString().split("T")[0]}/${fileName}`,
        format: "PDF",
      });

      const blobUrl = URL.createObjectURL(pdfBlob);
      setCurrentDocRef(docRef);
      setCurrentFileUrl(publicUrl);
      setPreviewPdfUrl(blobUrl);
      setIsExporting(false);

      toast.success("System Activity Report Generated", `Vector PDF (${(pdfBlob.size / 1024).toFixed(1)} KB) compiled and archived.`);
    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setIsExporting(false);
      toast.error("Export Failed", "Could not compile system report.");
    }
  }


  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">System Reports</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">System-wide interaction and usage analytics.</p>
        </div>
        <Button onClick={handleGenerateReport} disabled={isExporting} className="gap-1.5 h-9">
          <FileDown size={14} /> {isExporting ? "Generating..." : "Generate & Export Report"}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Accounts" value={users.length} sub="Active users in system" icon={<Users size={18} />} />
        <StatCard label="Events Organized" value={events.length} sub="Total event proposals" icon={<Calendar size={18} />} />
        <StatCard label="Audit Entries" value={auditTrail.length} sub="System audit entries" icon={<Activity size={18} />} />
        <StatCard label="Student Orgs" value={organizations.length} sub="Recognized bodies" icon={<Building2 size={18} />} />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="System Activity (Last 7 Days)" subtitle="Audit trail volume per day" />
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityByDay}>
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px" }} />
                  <Bar dataKey="actions" name="Actions Logged" fill="#0d9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Events per Organization" subtitle="Comparison of proposal frequency" />
          <CardBody>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={orgData}>
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} />
                  <Tooltip contentStyle={{ backgroundColor: "var(--card)", borderColor: "var(--border)", borderRadius: "8px", fontSize: "11px" }} />
                  <Bar dataKey="users" fill="#0d9488" radius={[4, 4, 0, 0]} name="Users" />
                  <Bar dataKey="events" fill="#0284c7" radius={[4, 4, 0, 0]} name="Events" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="User Account Distribution by Role" subtitle="System composition breakdown" />
        <CardBody>
          <div className="grid sm:grid-cols-4 gap-4">
            {(["student", "adviser", "dean", "admin"] as const).map((role) => {
              const count = users.filter((u) => u.role === role).length;
              const colors = {
                student: "bg-teal-50 text-teal-800 border border-teal-200",
                adviser: "bg-sky-50 text-sky-800 border border-sky-200",
                dean: "bg-purple-50 text-purple-800 border border-purple-200",
                admin: "bg-amber-50 text-amber-800 border border-amber-200",
              };
              return (
                <div key={role} className={`${colors[role]} rounded-xl p-5 text-center shadow-2xs`}>
                  <p className="text-3xl font-extrabold font-mono">{count}</p>
                  <p className="text-xs font-mono font-bold mt-1 uppercase tracking-wider">{role}s</p>
                  <p className="text-xs mt-1 opacity-75 font-mono">{Math.round((count / (users.length || 1)) * 100)}% of total</p>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      {/* ── REPORT PREVIEW & ACTION DIALOG ── */}
      {previewPdfUrl && (
        <Dialog
          open={!!previewPdfUrl}
          onClose={() => setPreviewPdfUrl(null)}
          title={`Report Document — ${currentDocRef}`}
          size="xl"
        >
          <div className="p-6 flex flex-col gap-4">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
                <span>
                  Report <strong>{currentDocRef}</strong> has been compiled as a genuine Vector PDF and archived to Supabase Storage (<code>reports/Administration/</code>).
                </span>
              </div>
              {currentFileUrl && (
                <a
                  href={currentFileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-800 hover:underline ml-2"
                >
                  <ExternalLink size={12} /> Open
                </a>
              )}
            </div>

            <div className="border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xs bg-white h-[520px]">
              <iframe
                title="Report PDF Preview"
                src={previewPdfUrl}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
