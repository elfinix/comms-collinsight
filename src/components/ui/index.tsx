import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, useState, useEffect, useRef } from "react";

// --- Button ---
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center gap-2 font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const sizes = { sm: "px-3 py-1.5 text-sm rounded-md", md: "px-4 py-2 text-sm rounded-lg", lg: "px-6 py-2.5 text-base rounded-lg" };
  const variants = {
    primary: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#0f766e] shadow-sm",
    secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-teal-200",
    outline: "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] bg-transparent",
    ghost: "text-[var(--foreground)] hover:bg-[var(--muted)] bg-transparent",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    success: "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm",
  };
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// --- Input ---
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = "", ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>}
      <input
        className={`w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// --- Textarea ---
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className = "", ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>}
      <textarea
        className={`w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition resize-none ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// --- Select ---
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = "", ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>}
      <select
        className={`w-full px-3 py-2 text-sm border border-[var(--border)] rounded-lg bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition ${className}`}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// --- Badge ---
interface BadgeProps {
  children: ReactNode;
  className?: string;
  variant?: "default" | "teal" | "amber" | "red" | "green" | "blue" | "purple" | "gray";
}

export function Badge({ children, className = "", variant = "default" }: BadgeProps) {
  const variants = {
    default: "bg-[var(--secondary)] text-[var(--secondary-foreground)]",
    teal: "bg-teal-100 text-teal-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
    green: "bg-green-100 text-green-700",
    blue: "bg-blue-100 text-blue-700",
    purple: "bg-purple-100 text-purple-700",
    gray: "bg-gray-100 text-gray-600",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
}

// --- Card ---
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 border-b border-[var(--border)] ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

// --- Dialog / Modal ---
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
}

export function Dialog({ open, onClose, title, children, size = "md" }: DialogProps) {
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl", "2xl": "max-w-5xl" };
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-[var(--card)] rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[90vh] flex flex-col z-10`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">{title}</h2>
            <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition p-1 rounded-md hover:bg-[var(--muted)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}

// --- Tabs ---
interface Tab { id: string; label: string; icon?: ReactNode }
interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  return (
    <div className={`flex border-b border-[var(--border)] ${className}`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
            activeTab === tab.id
              ? "border-[var(--primary)] text-[var(--primary)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// --- Stat Card ---
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: ReactNode;
  color?: string;
  trend?: "up" | "down" | "neutral";
}

export function StatCard({ label, value, sub, icon, color = "bg-teal-50", trend }: StatCardProps) {
  return (
    <Card className="flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[var(--muted-foreground)] font-medium">{label}</span>
        {icon && <div className={`${color} rounded-lg p-2 text-[var(--primary)]`}>{icon}</div>}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-2xl font-bold text-[var(--foreground)]">{value}</span>
        {sub && (
          <span className={`text-xs font-mono ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-500" : "text-[var(--muted-foreground)]"}`}>
            {sub}
          </span>
        )}
      </div>
    </Card>
  );
}

// --- Table ---
interface Column<T> { key: string; label: string; render?: (row: T) => ReactNode; className?: string }
interface TableProps<T> { columns: Column<T>[]; data: T[]; keyExtractor: (row: T) => string; onRowClick?: (row: T) => void; emptyText?: string }

export function Table<T>({ columns, data, keyExtractor, onRowClick, emptyText = "No data found." }: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 text-left text-xs font-semibold font-mono uppercase tracking-wider text-[var(--muted-foreground)] ${col.className || ""}`}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-[var(--muted-foreground)]">
                {emptyText}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-[var(--foreground)] ${col.className || ""}`}>
                    {col.render ? col.render(row) : String((row as any)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

// --- Avatar / User Icon ---
export function UserAvatar({ gender, size = "md", name }: { gender: "male" | "female" | "non-binary"; size?: "sm" | "md" | "lg"; name?: string }) {
  const colors = { male: "bg-blue-100 text-blue-600", female: "bg-pink-100 text-pink-600", "non-binary": "bg-purple-100 text-purple-600" };
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };
  const initials = name ? name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() : "?";
  return (
    <div className={`rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${colors[gender]} ${sizes[size]}`}>
      {initials}
    </div>
  );
}

// --- Password Input ---
export function PasswordInput({ label, error, className = "", ...props }: InputProps) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>}
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          className={`w-full px-3 py-2 pr-10 text-sm border border-[var(--border)] rounded-lg bg-white text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition ${className}`}
          {...props}
        />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
          {show ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          )}
        </button>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// --- Dropdown Menu ---
interface DropdownItem { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean }
interface DropdownProps { trigger: ReactNode; items: DropdownItem[] }

export function Dropdown({ trigger, items }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <div onClick={() => setOpen((s) => !s)} className="cursor-pointer">{trigger}</div>
      {open && (
        <div className="absolute right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg py-1 min-w-[160px] z-30">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false); }}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors hover:bg-[var(--muted)] ${item.danger ? "text-red-500" : "text-[var(--foreground)]"}`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Empty State ---
export function EmptyState({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
      {icon && <div className="text-[var(--muted-foreground)] mb-2">{icon}</div>}
      <h3 className="text-lg font-semibold text-[var(--foreground)]">{title}</h3>
      {description && <p className="text-sm text-[var(--muted-foreground)] max-w-xs">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// --- Signatory Progress ---
export function SignatoryProgress({ status }: { status: string }) {
  const steps = ["Student", "Adviser", "Dean", "SDS"];
  const stepIndex = {
    Created: 0, "For Review": 1, "Pending Revision": 1, "For Approval": 2, Approved: 3, Completed: 3, Closed: 3,
  }[status] ?? 0;
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step} className="flex items-center">
          <div className={`flex flex-col items-center gap-1`}>
            <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-bold ${i < stepIndex ? "bg-[var(--primary)] text-white" : i === stepIndex ? "bg-[var(--primary)] text-white ring-2 ring-offset-1 ring-[var(--primary)]" : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}>
              {i < stepIndex ? "✓" : i + 1}
            </div>
            <span className="text-[10px] text-[var(--muted-foreground)] font-mono">{step}</span>
          </div>
          {i < steps.length - 1 && <div className={`h-0.5 w-8 mx-1 mb-4 ${i < stepIndex ? "bg-[var(--primary)]" : "bg-[var(--border)]"}`} />}
        </div>
      ))}
    </div>
  );
}
