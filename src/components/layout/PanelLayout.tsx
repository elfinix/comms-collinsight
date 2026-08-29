import { ReactNode, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useApp } from "../../context/AppContext";
import { UserAvatar } from "../ui";
import {
  LayoutDashboard, Calendar, Wallet, BarChart2, Settings, LogOut, Menu, X,
  FileText, Users, Building2, Sliders, ClipboardList, ChevronRight,
  BookOpen, Shield, Landmark, History, ScrollText,
} from "lucide-react";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

interface PanelLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  panelLabel: string;
  orgName?: string;
}

export default function PanelLayout({ children, navItems, panelLabel, orgName }: PanelLayoutProps) {
  const { currentUser, logout } = useAuth();
  const { theme } = useApp();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate("/login");
  }

  const fullName = currentUser ? `${currentUser.firstName} ${currentUser.lastName}` : "";

  return (
    <div className={`flex h-screen bg-[var(--background)] overflow-hidden ${theme === "dark" ? "dark" : ""}`}>
      {/* Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[var(--card)] border-r border-[var(--border)] transition-all duration-300 ${collapsed ? "w-16" : "w-60"} flex-shrink-0`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-[var(--border)] ${collapsed ? "justify-center" : ""}`}>
          <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm">
            <Landmark size={16} strokeWidth={2} />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-[var(--foreground)] text-sm leading-none">COLLinSight</p>
              <p className="text-[10px] text-[var(--muted-foreground)] font-mono mt-0.5">{panelLabel}</p>
            </div>
          )}
        </div>

        {/* Org info */}
        {!collapsed && orgName && (
          <div className="px-4 py-3 bg-[var(--muted)] mx-3 mt-3 rounded-lg">
            <p className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase tracking-wider">Organization</p>
            <p className="text-sm font-semibold text-[var(--foreground)] mt-0.5 truncate">{orgName}</p>
          </div>
        )}

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.endsWith("dashboard")}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                    : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                } ${collapsed ? "justify-center" : ""}`
              }
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && item.badge !== undefined && item.badge > 0 && (
                <span className="bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full font-mono">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User Footer */}
        <div className={`px-3 py-3 border-t border-[var(--border)] ${collapsed ? "flex justify-center" : ""}`}>
          {currentUser && (
            <div className={`flex items-center gap-3 ${collapsed ? "" : "w-full"}`}>
              <div
                className={`flex items-center gap-3 flex-1 min-w-0 px-1 py-1 ${collapsed ? "justify-center" : ""}`}
              >
                <UserAvatar
                  gender={currentUser.gender}
                  firstName={currentUser.firstName}
                  lastName={currentUser.lastName}
                  name={fullName}
                  avatar={currentUser.avatar}
                  size="sm"
                />
                {!collapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{fullName}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] font-mono truncate">{currentUser.position}</p>
                  </div>
                )}
              </div>
              {!collapsed && (
                <button
                  onClick={handleLogout}
                  className="text-[var(--muted-foreground)] hover:text-red-500 transition p-1.5 rounded-lg hover:bg-[var(--muted)] flex-shrink-0 cursor-pointer"
                  title="Sign out"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center py-2 border-t border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition"
        >
          {collapsed ? <ChevronRight size={16} /> : <Menu size={16} />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-[var(--card)] border-r border-[var(--border)] flex flex-col h-full z-50">
            <div className="flex items-center justify-between px-4 py-5 border-b border-[var(--border)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                  <Landmark size={16} strokeWidth={2} />
                </div>
                <div>
                  <p className="font-bold text-[var(--foreground)] text-sm">COLLinSight</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono">{panelLabel}</p>
                </div>
              </div>
              <button onClick={() => setMobileOpen(false)} className="text-[var(--muted-foreground)]">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      isActive ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                    }`
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{item.badge}</span>
                  )}
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile-only top bar — just the hamburger */}
        <div className="md:hidden flex items-center px-4 py-3 bg-[var(--card)] border-b border-[var(--border)] flex-shrink-0">
          <button onClick={() => setMobileOpen(true)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <Menu size={20} />
          </button>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

// Nav item sets for each panel
export function studentNavItems(pendingCount = 0): NavItem[] {
  return [
    { to: "/student/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { to: "/student/events", label: "Events", icon: <Calendar size={16} /> },
    { to: "/student/finance", label: "Finance", icon: <Wallet size={16} /> },
    { to: "/student/history", label: "History", icon: <History size={16} /> },
    { to: "/student/reports", label: "Reports", icon: <BarChart2 size={16} /> },
    { to: "/student/sds", label: "SDS Workspace", icon: <FileText size={16} /> },
    { to: "/student/profile", label: "Profile & Settings", icon: <Settings size={16} /> },
  ];
}

export function adviserNavItems(pendingCount = 0): NavItem[] {
  return [
    { to: "/adviser/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { to: "/adviser/pending", label: "Pending Review", icon: <ClipboardList size={16} />, badge: pendingCount },
    { to: "/adviser/finance", label: "Finance", icon: <Wallet size={16} /> },
    { to: "/adviser/history", label: "History", icon: <History size={16} /> },
    { to: "/adviser/reports", label: "Reports", icon: <BarChart2 size={16} /> },
    { to: "/adviser/profile", label: "Profile & Settings", icon: <Settings size={16} /> },
  ];
}

export function deanNavItems(): NavItem[] {
  return [
    { to: "/dean/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { to: "/dean/pending", label: "Pending Approval", icon: <ClipboardList size={16} /> },
    { to: "/dean/approved", label: "Approved Events", icon: <Calendar size={16} /> },
    { to: "/dean/history", label: "History", icon: <History size={16} /> },
    { to: "/dean/reports", label: "Reports", icon: <BarChart2 size={16} /> },
    { to: "/dean/profile", label: "Profile & Settings", icon: <Settings size={16} /> },
  ];
}

export function adminNavItems(): NavItem[] {
  return [
    { to: "/admin/dashboard", label: "Dashboard", icon: <LayoutDashboard size={16} /> },
    { to: "/admin/departments", label: "Departments", icon: <BookOpen size={16} /> },
    { to: "/admin/organizations", label: "Organizations", icon: <Building2 size={16} /> },
    { to: "/admin/users", label: "Users", icon: <Users size={16} /> },
    { to: "/admin/configurations", label: "Configurations", icon: <Sliders size={16} /> },
    { to: "/admin/audit", label: "Audit Trail", icon: <ScrollText size={16} /> },
    { to: "/admin/reports", label: "Reports", icon: <BarChart2 size={16} /> },
    { to: "/admin/profile", label: "Profile & Settings", icon: <Settings size={16} /> },
  ];
}
