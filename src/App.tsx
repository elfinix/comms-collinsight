import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppProvider } from "./context/AppContext";
import PanelLayout, { studentNavItems, adviserNavItems, deanNavItems, adminNavItems } from "./components/layout/PanelLayout";

import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import OrganizationsPage from "./pages/OrganizationsPage";
import CalendarPage from "./pages/CalendarPage";

import StudentDashboard from "./pages/student/Dashboard";
import StudentEvents from "./pages/student/Events";
import StudentFinance from "./pages/student/Finance";
import StudentReports from "./pages/student/Reports";
import SDSWorkspace from "./pages/student/SDSWorkspace";
import StudentProfile from "./pages/student/Profile";

import AdviserDashboard from "./pages/adviser/Dashboard";
import AdviserPendingReview from "./pages/adviser/PendingReview";
import AdviserFinance from "./pages/adviser/Finance";
import AdviserReports from "./pages/adviser/Reports";
import AdviserProfile from "./pages/adviser/Profile";

import DeanDashboard from "./pages/dean/Dashboard";
import DeanPendingApproval from "./pages/dean/PendingApproval";
import DeanApprovedEvents from "./pages/dean/ApprovedEvents";
import DeanReports from "./pages/dean/Reports";
import DeanProfile from "./pages/dean/Profile";

import AdminDashboard from "./pages/admin/Dashboard";
import AdminDepartments from "./pages/admin/Departments";
import AdminOrganizations from "./pages/admin/Organizations";
import AdminUsers from "./pages/admin/Users";
import AdminConfigurations from "./pages/admin/Configurations";
import AdminAuditTrail from "./pages/admin/AuditTrail";
import AdminReports from "./pages/admin/Reports";
import AdminProfile from "./pages/admin/Profile";
import { useApp } from "./context/AppContext";

function ProtectedRoute({ role }: { role: string }) {
  const { currentUser } = useAuth();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}

function StudentPanel() {
  const { events } = useApp();
  const { currentUser } = useAuth();
  const orgEvents = events.filter((e) => e.organizationId === currentUser?.organizationId);
  return (
    <PanelLayout navItems={studentNavItems()} panelLabel="Student Panel" orgName={orgEvents.length > 0 ? undefined : undefined}>
      <Outlet />
    </PanelLayout>
  );
}

function AdviserPanel() {
  const { events } = useApp();
  const { currentUser } = useAuth();
  const pending = events.filter((e) => e.organizationId === currentUser?.organizationId && e.status === "For Review").length;
  return (
    <PanelLayout navItems={adviserNavItems(pending)} panelLabel="Adviser Panel">
      <Outlet />
    </PanelLayout>
  );
}

function DeanPanel() {
  return (
    <PanelLayout navItems={deanNavItems()} panelLabel="Dean's Panel">
      <Outlet />
    </PanelLayout>
  );
}

function AdminPanel() {
  return (
    <PanelLayout navItems={adminNavItems()} panelLabel="Admin Panel">
      <Outlet />
    </PanelLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/organizations" element={<OrganizationsPage />} />
            <Route path="/calendar" element={<CalendarPage />} />

            {/* Student Routes */}
            <Route element={<ProtectedRoute role="student" />}>
              <Route element={<StudentPanel />}>
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/events" element={<StudentEvents />} />
                <Route path="/student/finance" element={<StudentFinance />} />
                <Route path="/student/reports" element={<StudentReports />} />
                <Route path="/student/sds" element={<SDSWorkspace />} />
                <Route path="/student/profile" element={<StudentProfile />} />
              </Route>
            </Route>

            {/* Adviser Routes */}
            <Route element={<ProtectedRoute role="adviser" />}>
              <Route element={<AdviserPanel />}>
                <Route path="/adviser/dashboard" element={<AdviserDashboard />} />
                <Route path="/adviser/pending" element={<AdviserPendingReview />} />
                <Route path="/adviser/finance" element={<AdviserFinance />} />
                <Route path="/adviser/reports" element={<AdviserReports />} />
                <Route path="/adviser/profile" element={<AdviserProfile />} />
              </Route>
            </Route>

            {/* Dean Routes */}
            <Route element={<ProtectedRoute role="dean" />}>
              <Route element={<DeanPanel />}>
                <Route path="/dean/dashboard" element={<DeanDashboard />} />
                <Route path="/dean/pending" element={<DeanPendingApproval />} />
                <Route path="/dean/approved" element={<DeanApprovedEvents />} />
                <Route path="/dean/reports" element={<DeanReports />} />
                <Route path="/dean/profile" element={<DeanProfile />} />
              </Route>
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute role="admin" />}>
              <Route element={<AdminPanel />}>
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/departments" element={<AdminDepartments />} />
                <Route path="/admin/organizations" element={<AdminOrganizations />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/configurations" element={<AdminConfigurations />} />
                <Route path="/admin/audit" element={<AdminAuditTrail />} />
                <Route path="/admin/reports" element={<AdminReports />} />
                <Route path="/admin/profile" element={<AdminProfile />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
