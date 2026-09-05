import { HTMLAttributes } from "react";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = "", ...props }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-[var(--muted)]/90 rounded-lg ${className}`}
      {...props}
    />
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${
            i === lines - 1 && lines > 1 ? "w-3/4" : "w-full"
          }`}
        />
      ))}
    </div>
  );
}

export function SkeletonStatCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-2xs space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-36 rounded-md" />
      <Skeleton className="h-3 w-20 rounded-md" />
    </div>
  );
}

export function SkeletonTable({
  rows = 5,
  cols = 5,
  showHeader = true,
  className = "",
}: {
  rows?: number;
  cols?: number;
  showHeader?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xs ${className}`}
    >
      {showHeader && (
        <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-3.5 w-64 rounded-md" />
          </div>
          <Skeleton className="h-8 w-24 rounded-lg" />
        </div>
      )}
      <div className="overflow-x-auto p-4">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)]">
              {Array.from({ length: cols }).map((_, i) => (
                <th key={i} className="px-4 py-3 text-left">
                  <Skeleton className="h-4 w-20 rounded" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]/60">
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                {Array.from({ length: cols }).map((_, c) => (
                  <td key={c} className="px-4 py-3.5">
                    <Skeleton
                      className={`h-4 ${
                        c === 0
                          ? "w-40"
                          : c === cols - 1
                          ? "w-16 ml-auto"
                          : "w-24"
                      } rounded`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function SkeletonEventCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-2xs flex flex-col justify-between gap-4 ${className}`}
    >
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4 rounded-md" />
          <Skeleton className="h-3.5 w-1/2 rounded-md" />
          <Skeleton className="h-3.5 w-2/3 rounded-md" />
        </div>
        <div className="p-3 rounded-xl bg-[var(--muted)]/40 border border-[var(--border)]/60 grid grid-cols-2 gap-2">
          <div>
            <Skeleton className="h-2.5 w-12 mb-1 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div>
            <Skeleton className="h-2.5 w-12 mb-1 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        </div>
        <div className="pt-3 border-t border-[var(--border)]/60 space-y-1.5">
          <Skeleton className="h-3 w-full rounded" />
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
      </div>
      <Skeleton className="h-8 w-full rounded-lg mt-auto" />
    </div>
  );
}

export function SkeletonChart({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xs space-y-6 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-3.5 w-56 rounded-md" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="h-64 flex items-end gap-3 pt-6 px-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
            <Skeleton
              className="w-full rounded-t-md"
              style={{ height: `${25 + ((i * 19) % 65)}%` }}
            />
            <Skeleton className="h-3 w-8 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonForm({ fields = 4, className = "" }: { fields?: number; className?: string }) {
  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xs space-y-5 ${className}`}
    >
      <div className="space-y-1.5 pb-2 border-b border-[var(--border)]">
        <Skeleton className="h-5 w-44 rounded-md" />
        <Skeleton className="h-3.5 w-60 rounded-md" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-3 pt-3 border-t border-[var(--border)]">
        <Skeleton className="h-9 w-24 rounded-lg" />
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}

export interface SkeletonToolboxProps {
  variant?: "default" | "simple" | "roster" | "two-tier";
  hasBottomFilters?: boolean;
  className?: string;
}

export function SkeletonToolbox({
  variant = "simple",
  hasBottomFilters,
  className = "",
}: SkeletonToolboxProps) {
  // If variant is "roster", render the Department pills on left + Search bar on right
  if (variant === "roster") {
    return (
      <div
        className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 shadow-2xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${className}`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <Skeleton className="h-4 w-20 rounded mr-1" />
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>
        <Skeleton className="h-9 w-full md:w-80 rounded-xl" />
      </div>
    );
  }

  const showBottom = hasBottomFilters ?? (variant === "two-tier");

  if (!showBottom) {
    return (
      <div
        className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${className}`}
      >
        <Skeleton className="h-9 w-full sm:max-w-md rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-10 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 shadow-2xs space-y-3 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Skeleton className="h-9 w-full sm:max-w-md rounded-xl" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
          <Skeleton className="h-9 w-16 rounded-xl" />
        </div>
      </div>
      <div className="flex items-center gap-2 pt-2 border-t border-[var(--border)]/60 overflow-hidden">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
    </div>
  );
}

export function SkeletonProfile({ className = "" }: { className?: string }) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Profile Banner Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-2xs">
        <div className="h-20 bg-[var(--muted)]/50" />
        <div className="px-6 pb-6 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 -mt-10 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <Skeleton className="w-20 h-20 rounded-full ring-4 ring-[var(--card)] flex-shrink-0" />
              <div className="space-y-1.5 pt-2 sm:pt-0">
                <Skeleton className="h-6 w-48 rounded-md" />
                <Skeleton className="h-3.5 w-36 rounded-md" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      {/* 1. Personal Information Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="space-y-1.5 pb-2 border-b border-[var(--border)]">
          <Skeleton className="h-5 w-48 rounded-md" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5"><Skeleton className="h-3 w-20 rounded" /><Skeleton className="h-9 w-full rounded-xl" /></div>
          <div className="space-y-1.5"><Skeleton className="h-3 w-20 rounded" /><Skeleton className="h-9 w-full rounded-xl" /></div>
          <div className="space-y-1.5"><Skeleton className="h-3 w-20 rounded" /><Skeleton className="h-9 w-full rounded-xl" /></div>
          <div className="space-y-1.5"><Skeleton className="h-3 w-16 rounded" /><Skeleton className="h-9 w-full rounded-xl" /></div>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5 sm:col-span-1"><Skeleton className="h-3 w-28 rounded" /><Skeleton className="h-9 w-full rounded-xl" /></div>
          <div className="space-y-1.5"><Skeleton className="h-3 w-16 rounded" /><Skeleton className="h-9 w-full rounded-xl" /></div>
          <div className="space-y-1.5"><Skeleton className="h-3 w-20 rounded" /><Skeleton className="h-9 w-full rounded-xl" /></div>
        </div>
        <div className="flex justify-end pt-3 border-t border-[var(--border)]">
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* 2. Security & Password Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="space-y-1.5 pb-2 border-b border-[var(--border)]">
          <Skeleton className="h-5 w-44 rounded-md" />
          <Skeleton className="h-3.5 w-64 rounded-md" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="space-y-1.5"><Skeleton className="h-3 w-28 rounded" /><Skeleton className="h-9 w-full rounded-xl" /></div>
          <div className="space-y-1.5"><Skeleton className="h-3 w-24 rounded" /><Skeleton className="h-9 w-full rounded-xl" /></div>
          <div className="space-y-1.5"><Skeleton className="h-3 w-32 rounded" /><Skeleton className="h-9 w-full rounded-xl" /></div>
        </div>
        <div className="flex justify-end pt-3 border-t border-[var(--border)]">
          <Skeleton className="h-9 w-36 rounded-xl" />
        </div>
      </div>

      {/* 3. System Preferences Card */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-2xs space-y-5">
        <div className="space-y-1.5 pb-2 border-b border-[var(--border)]">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-3.5 w-56 rounded-md" />
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
