import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (options: { type?: ToastType; title: string; message?: string; duration?: number }) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, message?: string) => void;
    error: (title: string, message?: string) => void;
    info: (title: string, message?: string) => void;
    warning: (title: string, message?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [exitingIds, setExitingIds] = useState<Set<string>>(new Set());
  const timersRef = useRef<Map<string, any>>(new Map());

  const removeToast = useCallback((id: string) => {
    // Start exit transition
    setExitingIds((prev) => new Set(prev).add(id));

    // Clear any existing timer for this toast
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }

    // After animation finishes (300ms), remove from state
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      setExitingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300);
  }, []);

  const showToast = useCallback(
    ({
      type = "success",
      title,
      message,
      duration = 3800,
    }: {
      type?: ToastType;
      title: string;
      message?: string;
      duration?: number;
    }) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep up to 5 simultaneous

      if (duration > 0) {
        const timer = setTimeout(() => {
          removeToast(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
    },
    [removeToast]
  );

  const toast = {
    success: (title: string, message?: string) => showToast({ type: "success", title, message }),
    error: (title: string, message?: string) => showToast({ type: "error", title, message }),
    info: (title: string, message?: string) => showToast({ type: "info", title, message }),
    warning: (title: string, message?: string) => showToast({ type: "warning", title, message }),
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} exitingIds={exitingIds} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

function ToastContainer({
  toasts,
  exitingIds,
  onRemove,
}: {
  toasts: ToastItem[];
  exitingIds: Set<string>;
  onRemove: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => {
        const isSuccess = t.type === "success";
        const isError = t.type === "error";
        const isWarning = t.type === "warning";
        const isExiting = exitingIds.has(t.id);

        const icon = isSuccess ? (
          <CheckCircle2 size={18} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
        ) : isError ? (
          <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
        ) : isWarning ? (
          <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
        ) : (
          <Info size={18} className="text-sky-600 dark:text-sky-400 flex-shrink-0" />
        );

        const borderStyle = isSuccess
          ? "border-teal-500/30 bg-teal-50/95 dark:bg-[#072421]/95 text-teal-950 dark:text-teal-100 shadow-teal-900/10"
          : isError
          ? "border-rose-500/30 bg-rose-50/95 dark:bg-[#2e0b11]/95 text-rose-950 dark:text-rose-100 shadow-rose-900/10"
          : isWarning
          ? "border-amber-500/30 bg-amber-50/95 dark:bg-[#2c1d07]/95 text-amber-950 dark:text-amber-100 shadow-amber-900/10"
          : "border-sky-500/30 bg-sky-50/95 dark:bg-[#0a1e30]/95 text-sky-950 dark:text-sky-100 shadow-sky-900/10";

        const animationClass = isExiting ? "animate-toast-out" : "animate-toast-in";

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl border shadow-xl backdrop-blur-md transition-all duration-300 ${animationClass} ${borderStyle}`}
          >
            <div className="mt-0.5">{icon}</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-snug tracking-tight">{t.title}</p>
              {t.message && (
                <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed break-words">
                  {t.message}
                </p>
              )}
            </div>
            <button
              onClick={() => onRemove(t.id)}
              className="opacity-60 hover:opacity-100 transition-opacity p-0.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 -mr-1 -mt-1 cursor-pointer"
              title="Close notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
