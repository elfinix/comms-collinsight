import { ReactNode, useState } from "react";
import { RefreshCw } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";

export interface RefreshButtonProps {
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function RefreshButton({
  onRefresh,
  isRefreshing: customIsRefreshing,
  className = "",
  size = "md",
}: RefreshButtonProps) {
  const { refreshData, isRefreshing: appIsRefreshing } = useApp();
  const { toast } = useToast();
  const [localSpinning, setLocalSpinning] = useState(false);

  const isSpinning =
    customIsRefreshing !== undefined
      ? customIsRefreshing
      : appIsRefreshing || localSpinning;

  async function handleRefresh() {
    if (isSpinning) return;
    setLocalSpinning(true);
    const start = Date.now();
    try {
      if (onRefresh) {
        await onRefresh();
      } else {
        await refreshData();
      }
      toast.success("Data Refreshed", "System records and metrics are up to date.");
    } catch (err) {
      console.error("Refresh error:", err);
      toast.error("Refresh Failed", "Could not sync latest records with the server.");
    } finally {
      const elapsed = Date.now() - start;
      if (elapsed < 400) {
        await new Promise((r) => setTimeout(r, 400 - elapsed));
      }
      setLocalSpinning(false);
    }
  }

  const sizeClasses =
    size === "sm"
      ? "h-8 w-8 text-xs rounded-lg"
      : "h-9 w-9 text-sm rounded-xl";

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isSpinning}
      title="Refresh data"
      aria-label="Refresh data"
      className={`inline-flex items-center justify-center bg-white dark:bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] hover:text-[var(--primary)] hover:border-[var(--primary)]/40 hover:bg-slate-50 dark:hover:bg-[var(--muted)]/60 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:opacity-80 active:scale-95 shadow-2xs flex-shrink-0 ${sizeClasses} ${className}`}
    >
      <RefreshCw
        size={size === "sm" ? 14 : 16}
        className={`transition-transform duration-500 ${
          isSpinning ? "animate-spin text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--primary)]"
        }`}
      />
    </button>
  );
}

export interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  showRefresh?: boolean;
  onRefresh?: () => Promise<void> | void;
  isRefreshing?: boolean;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  badge,
  actions,
  showRefresh = true,
  onRefresh,
  isRefreshing,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[var(--border)] mb-6 ${className}`}
    >
      <div className="space-y-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            {title}
          </h1>
          {badge}
        </div>
        {subtitle && (
          <p className="text-xs text-[var(--muted-foreground)] max-w-2xl leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0">
        {actions}
        {showRefresh && (
          <RefreshButton
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
          />
        )}
      </div>
    </div>
  );
}
