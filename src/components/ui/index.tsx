import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes, useState, useEffect, useRef, Fragment } from "react";

// --- Button ---
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
  size?: "sm" | "md" | "lg";
  children: ReactNode;
}

export function Button({ variant = "primary", size = "md", className = "", children, ...props }: ButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--ring)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  const sizes = { sm: "px-3 py-1.5 text-sm rounded-md", md: "px-4 py-2 text-sm rounded-lg", lg: "px-6 py-2.5 text-base rounded-lg" };
  const variants = {
    primary: "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[#0f766e] shadow-sm",
    secondary: "bg-[var(--secondary)] text-[var(--secondary-foreground)] hover:bg-teal-200",
    outline: "border border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--muted)] bg-transparent",
    ghost: "text-[var(--foreground)] hover:bg-[var(--muted)] bg-transparent",
    danger: "bg-red-500 text-white hover:bg-red-600 shadow-sm",
    success: "bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm",
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
        className={`w-full px-3.5 py-2 text-sm border border-[var(--border)] rounded-xl bg-white text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-medium mt-0.5">{error}</p>}
    </div>
  );
}

// --- Custom DateTimePicker with MM/DD/YYYY Format ---
interface DateTimePickerProps {
  label?: string;
  error?: string;
  value: string; // ISO string like "2026-08-28T09:00"
  onChange: (val: string) => void;
  min?: string;
  className?: string;
  placeholder?: string;
}

function parseLocalDateTime(val?: string): Date | null {
  if (!val) return null;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
    const [dPart, tPart] = val.split("T");
    const [y, m, d] = dPart.split("-").map(Number);
    const [h, min] = tPart.split(":").map(Number);
    const dt = new Date(y, m - 1, d, h, min, 0);
    return isNaN(dt.getTime()) ? null : dt;
  }
  const dt = new Date(val);
  return isNaN(dt.getTime()) ? null : dt;
}

function formatLocalDateTime(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const h = String(dt.getHours()).padStart(2, "0");
  const min = String(dt.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d}T${h}:${min}`;
}

export function DateTimePicker({
  label,
  error,
  value,
  onChange,
  min,
  className = "",
  placeholder = "MM/DD/YYYY --:-- --",
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse ISO value
  const parsedDate = parseLocalDateTime(value);
  const isValidDate = parsedDate !== null;

  // View state for Month/Year in calendar
  const minDate = min ? parseLocalDateTime(min) : null;
  const [viewDate, setViewDate] = useState<Date>(
    isValidDate ? parsedDate : (minDate || new Date())
  );

  // Update viewDate when value changes
  useEffect(() => {
    if (isValidDate) {
      setViewDate(parsedDate);
    }
  }, [value]);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Format value into MM/DD/YYYY hh:mm A
  const formattedDisplay = isValidDate
    ? `${String(parsedDate.getMonth() + 1).padStart(2, "0")}/${String(parsedDate.getDate()).padStart(2, "0")}/${parsedDate.getFullYear()} ${String(
        parsedDate.getHours() % 12 || 12
      ).padStart(2, "0")}:${String(parsedDate.getMinutes()).padStart(2, "0")} ${parsedDate.getHours() >= 12 ? "PM" : "AM"}`
    : "";

  // Calendar calculations
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const days: { day: number; isCurrentMonth: boolean; dateObj: Date }[] = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    days.push({ day: d, isCurrentMonth: false, dateObj: new Date(year, month - 1, d) });
  }
  // Current month days
  for (let i = 1; i <= totalDaysInMonth; i++) {
    days.push({ day: i, isCurrentMonth: true, dateObj: new Date(year, month, i) });
  }
  // Next month leading days (fill up to 42 cells)
  const remaining = 42 - days.length;
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isCurrentMonth: false, dateObj: new Date(year, month + 1, i) });
  }

  // Time state helpers
  const defaultDate = minDate ? new Date(minDate.getTime() + 60 * 60 * 1000) : new Date();
  const currentHours24 = isValidDate ? parsedDate.getHours() : (minDate ? defaultDate.getHours() : 9);
  const currentHours12 = currentHours24 % 12 || 12;
  const currentMinutes = isValidDate ? parsedDate.getMinutes() : (minDate ? defaultDate.getMinutes() : 0);
  const currentPeriod = currentHours24 >= 12 ? "PM" : "AM";

  const [inputHour, setInputHour] = useState(String(currentHours12).padStart(2, "0"));
  const [inputMinute, setInputMinute] = useState(String(currentMinutes).padStart(2, "0"));
  const isHourFocused = useRef(false);
  const isMinuteFocused = useRef(false);
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isHourFocused.current) {
      setInputHour(String(currentHours12).padStart(2, "0"));
    }
  }, [currentHours12]);

  useEffect(() => {
    if (!isMinuteFocused.current) {
      setInputMinute(String(currentMinutes).padStart(2, "0"));
    }
  }, [currentMinutes]);

  function setDatePart(targetDate: Date) {
    const newY = targetDate.getFullYear();
    const newM = String(targetDate.getMonth() + 1).padStart(2, "0");
    const newD = String(targetDate.getDate()).padStart(2, "0");
    const hh = String(currentHours24).padStart(2, "0");
    const mm = String(currentMinutes).padStart(2, "0");
    onChange(`${newY}-${newM}-${newD}T${hh}:${mm}`);
  }

  function setTimePart(hour12: number, minNum: number, period: "AM" | "PM") {
    let safeH = Math.max(1, Math.min(12, hour12));
    let safeM = Math.max(0, Math.min(59, minNum));
    let hour24 = safeH % 12;
    if (period === "PM") hour24 += 12;

    const base = isValidDate ? parsedDate : (minDate || viewDate || new Date());
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    const d = String(base.getDate()).padStart(2, "0");
    const hh = String(hour24).padStart(2, "0");
    const mm = String(safeM).padStart(2, "0");
    onChange(`${y}-${m}-${d}T${hh}:${mm}`);
  }

  function handleHourChange(val: string) {
    const clean = val.replace(/\D/g, "").slice(0, 2);
    setInputHour(clean);
    if (clean) {
      const num = parseInt(clean, 10);
      if (num >= 1 && num <= 12) {
        setTimePart(num, currentMinutes, currentPeriod);
        if (clean.length === 2 || num >= 2) {
          minuteInputRef.current?.focus();
          minuteInputRef.current?.select();
        }
      } else if (num > 12) {
        setInputHour("12");
        setTimePart(12, currentMinutes, currentPeriod);
        minuteInputRef.current?.focus();
        minuteInputRef.current?.select();
      }
    }
  }

  function handleHourBlur() {
    let num = parseInt(inputHour, 10);
    if (isNaN(num) || num < 1) num = 12;
    if (num > 12) num = 12;
    setInputHour(String(num).padStart(2, "0"));
    setTimePart(num, currentMinutes, currentPeriod);
  }

  function handleMinuteChange(val: string) {
    const clean = val.replace(/\D/g, "").slice(0, 2);
    setInputMinute(clean);
    if (clean) {
      const num = parseInt(clean, 10);
      if (num >= 0 && num <= 59) {
        setTimePart(currentHours12, num, currentPeriod);
      } else if (num > 59) {
        setInputMinute("59");
        setTimePart(currentHours12, 59, currentPeriod);
      }
    }
  }

  function handleMinuteBlur() {
    let num = parseInt(inputMinute, 10);
    if (isNaN(num) || num < 0) num = 0;
    if (num > 59) num = 59;
    setInputMinute(String(num).padStart(2, "0"));
    setTimePart(currentHours12, num, currentPeriod);
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  return (
    <div className={`flex flex-col gap-1 ${className}`} ref={containerRef}>
      {label && <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>}

      <div className="relative flex items-center">
        <input
          type="text"
          readOnly
          value={formattedDisplay}
          placeholder={placeholder}
          onClick={() => setOpen((o) => !o)}
          className={`w-full pl-3.5 pr-10 py-2 text-sm font-mono border rounded-xl bg-white text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] cursor-pointer transition shadow-2xs ${
            error ? "border-red-400 focus:ring-red-200" : "border-[var(--border)] hover:border-[var(--primary)]/50"
          }`}
        />

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="absolute right-3 text-[var(--muted-foreground)] hover:text-[var(--primary)] transition cursor-pointer p-0.5"
          title="Pick date & time (MM/DD/YYYY)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
        </button>

        {/* Popover Calendar & Time Picker (Right-aligned above the picker icon) */}
        {open && (
          <div className="absolute bottom-full right-0 mb-1.5 z-50 bg-white border border-[var(--border)] rounded-2xl shadow-2xl p-4 w-76 max-w-[90vw] animate-in fade-in zoom-in-95 duration-150 select-none">
          {/* Month / Year Header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--foreground)] transition cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>

            <span className="font-bold text-xs font-mono text-[var(--foreground)]">
              {monthNames[month]} {year}
            </span>

            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--foreground)] transition cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          {/* Weekday Labels */}
          <div className="grid grid-cols-7 gap-1 pt-2 pb-1 text-center text-[10px] font-mono font-bold text-[var(--muted-foreground)]">
            <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
          </div>

          {/* Day Grid */}
          <div className="grid grid-cols-7 gap-1 text-xs font-mono">
            {days.map((item, idx) => {
              const isSelected =
                isValidDate &&
                item.dateObj.getFullYear() === parsedDate.getFullYear() &&
                item.dateObj.getMonth() === parsedDate.getMonth() &&
                item.dateObj.getDate() === parsedDate.getDate();

              const isToday =
                new Date().toDateString() === item.dateObj.toDateString();

              const isPastMin =
                minDate &&
                new Date(item.dateObj.getFullYear(), item.dateObj.getMonth(), item.dateObj.getDate()) <
                  new Date(minDate.getFullYear(), minDate.getMonth(), minDate.getDate());

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={!!isPastMin}
                  onClick={() => {
                    setDatePart(item.dateObj);
                  }}
                  className={`h-7 w-7 mx-auto flex items-center justify-center rounded-lg transition text-xs ${
                    isPastMin
                      ? "text-slate-300 cursor-not-allowed"
                      : isSelected
                      ? "bg-[var(--primary)] text-white font-bold shadow-2xs"
                      : isToday
                      ? "border border-[var(--primary)] text-[var(--primary)] font-bold hover:bg-[var(--primary)]/10"
                      : item.isCurrentMonth
                      ? "text-[var(--foreground)] hover:bg-[var(--muted)]"
                      : "text-[var(--muted-foreground)]/50 hover:bg-[var(--muted)]/30"
                  }`}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          {/* Time Picker Row with Direct Validated Inputs */}
          <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-[var(--muted-foreground)] font-bold">Time:</span>

            <div className="flex items-center gap-1.5">
              {/* Hour Input */}
              <div className="relative">
                <input
                  ref={hourInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={inputHour}
                  onFocus={(e) => {
                    isHourFocused.current = true;
                    e.target.select();
                  }}
                  onChange={(e) => handleHourChange(e.target.value)}
                  onBlur={() => {
                    isHourFocused.current = false;
                    handleHourBlur();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const next = (currentHours12 % 12) + 1;
                      setInputHour(String(next).padStart(2, "0"));
                      setTimePart(next, currentMinutes, currentPeriod);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const prev = currentHours12 <= 1 ? 12 : currentHours12 - 1;
                      setInputHour(String(prev).padStart(2, "0"));
                      setTimePart(prev, currentMinutes, currentPeriod);
                    } else if (e.key === "Enter" || e.key === ":" || e.key === "Tab") {
                      if (e.key === ":" || e.key === "Enter") {
                        e.preventDefault();
                        minuteInputRef.current?.focus();
                        minuteInputRef.current?.select();
                      }
                    }
                  }}
                  className="w-10 h-7 text-center font-mono text-xs font-bold border border-[var(--border)] rounded-lg bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] shadow-2xs transition select-all"
                  placeholder="12"
                  title="Hour (1-12)"
                />
              </div>

              <span className="font-bold text-xs text-[var(--foreground)]">:</span>

              {/* Minute Input */}
              <div className="relative">
                <input
                  ref={minuteInputRef}
                  type="text"
                  inputMode="numeric"
                  maxLength={2}
                  value={inputMinute}
                  onFocus={(e) => {
                    isMinuteFocused.current = true;
                    e.target.select();
                  }}
                  onChange={(e) => handleMinuteChange(e.target.value)}
                  onBlur={() => {
                    isMinuteFocused.current = false;
                    handleMinuteBlur();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp") {
                      e.preventDefault();
                      const next = (currentMinutes + 1) % 60;
                      setInputMinute(String(next).padStart(2, "0"));
                      setTimePart(currentHours12, next, currentPeriod);
                    } else if (e.key === "ArrowDown") {
                      e.preventDefault();
                      const prev = currentMinutes <= 0 ? 59 : currentMinutes - 1;
                      setInputMinute(String(prev).padStart(2, "0"));
                      setTimePart(currentHours12, prev, currentPeriod);
                    } else if (e.key === "Backspace" && inputMinute === "") {
                      hourInputRef.current?.focus();
                      hourInputRef.current?.select();
                    }
                  }}
                  className="w-10 h-7 text-center font-mono text-xs font-bold border border-[var(--border)] rounded-lg bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-[var(--primary)] shadow-2xs transition select-all"
                  placeholder="00"
                  title="Minute (00-59)"
                />
              </div>

              {/* AM / PM Toggle */}
              <div className="flex border border-[var(--border)] rounded-lg overflow-hidden ml-1 p-0.5 bg-[var(--muted)]/40 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setTimePart(currentHours12, currentMinutes, "AM")}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md transition cursor-pointer ${
                    currentPeriod === "AM" ? "bg-[var(--primary)] text-white shadow-2xs" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => setTimePart(currentHours12, currentMinutes, "PM")}
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md transition cursor-pointer ${
                    currentPeriod === "PM" ? "bg-[var(--primary)] text-white shadow-2xs" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* Quick Actions Footer */}
          <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                onChange(formatLocalDateTime(now));
              }}
              className="text-[var(--primary)] font-mono hover:underline cursor-pointer text-[11px]"
            >
              Now
            </button>

            <button
              type="button"
              onClick={() => {
                if (!isValidDate) {
                  const base = minDate || viewDate || new Date();
                  const newY = base.getFullYear();
                  const newM = String(base.getMonth() + 1).padStart(2, "0");
                  const newD = String(base.getDate()).padStart(2, "0");
                  const hh = String(currentHours24).padStart(2, "0");
                  const mm = String(currentMinutes).padStart(2, "0");
                  onChange(`${newY}-${newM}-${newD}T${hh}:${mm}`);
                }
                setOpen(false);
              }}
              className="px-3 py-1 bg-[var(--primary)] text-white rounded-lg font-mono text-[11px] font-bold shadow-2xs hover:bg-[#0f766e] cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
      </div>

      {error && <p className="text-xs text-red-500 font-medium mt-0.5">{error}</p>}
    </div>
  );
}

// --- Textarea ---
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  autoGrow?: boolean;
}

export function Textarea({
  label,
  error,
  className = "",
  autoGrow = true,
  onChange,
  value,
  rows = 3,
  ...props
}: TextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = () => {
    const el = textareaRef.current;
    if (el && autoGrow) {
      el.style.height = "auto";
      const scrollH = el.scrollHeight;
      const minHeight = (rows || 3) * 24 + 18;
      const targetHeight = Math.max(minHeight, Math.min(scrollH, 200));
      el.style.height = `${targetHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-[var(--foreground)]">{label}</label>}
      <textarea
        ref={textareaRef}
        rows={rows}
        value={value}
        onChange={(e) => {
          adjustHeight();
          onChange?.(e);
        }}
        className={`w-full px-3 py-2 text-sm border border-[var(--border)] rounded-xl bg-white text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition-all max-h-[200px] overflow-y-auto ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500 font-medium mt-0.5">{error}</p>}
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
      <div className="relative flex items-center">
        <select
          className={`w-full pl-3.5 pr-10 py-2 text-sm border border-[var(--border)] rounded-xl bg-white text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)] focus:border-transparent transition appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-[var(--muted)]/50 ${className}`}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="absolute right-3.5 pointer-events-none text-[var(--muted-foreground)] flex items-center justify-center">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
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
export function Card({
  children,
  className = "",
  variant = "default",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  variant?: "default" | "gradient" | "glass" | "bordered";
  onClick?: () => void;
}) {
  const variantStyles = {
    default:
      "bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--muted)]/40 border border-[var(--border)] rounded-2xl shadow-xs",
    gradient:
      "bg-gradient-to-br from-[var(--card)] via-[var(--muted)]/30 to-[var(--primary)]/10 border border-[var(--border)] rounded-2xl shadow-xs",
    glass:
      "bg-[var(--card)]/90 backdrop-blur-md border border-[var(--border)] rounded-2xl shadow-xs",
    bordered:
      "bg-[var(--card)] border-2 border-[var(--border)] rounded-2xl shadow-xs",
  };

  return (
    <div
      onClick={onClick}
      className={`${variantStyles[variant]} ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-[var(--primary)]/50 transition-all duration-200" : "transition-shadow"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className = "",
  title,
  subtitle,
  action,
}: {
  children?: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  if (title || subtitle || action) {
    return (
      <div className={`px-5 py-4 border-b border-[var(--border)]/70 bg-[var(--muted)]/25 rounded-t-2xl flex items-center justify-between gap-4 ${className}`}>
        <div>
          {title && <h3 className="font-bold text-base text-[var(--foreground)] tracking-tight">{title}</h3>}
          {subtitle && <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{subtitle}</p>}
        </div>
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    );
  }
  return <div className={`px-5 py-4 border-b border-[var(--border)]/70 bg-[var(--muted)]/25 rounded-t-2xl ${className}`}>{children}</div>;
}

export function CardBody({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`p-5 sm:p-6 ${className}`}>{children}</div>;
}

// --- Dialog / Modal ---
interface DialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  zIndex?: string;
}

export function Dialog({ open, onClose, title, children, size = "md", className = "", zIndex = "z-50" }: DialogProps) {
  const widths = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl", "2xl": "max-w-5xl" };
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4`}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity" onClick={onClose} />
      <div className={`relative bg-white border border-[var(--border)] rounded-2xl shadow-2xl w-full ${widths[size]} max-h-[90vh] flex flex-col z-10 overflow-hidden text-[var(--foreground)] ${className}`}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]/30 flex-shrink-0">
            <h2 className="text-lg font-bold text-[var(--foreground)]">{title}</h2>
            <button onClick={onClose} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition p-1.5 rounded-lg hover:bg-[var(--muted)] cursor-pointer">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1 flex flex-col min-h-0">{children}</div>
      </div>
    </div>
  );
}

// --- Tabs ---
export interface Tab {
  id: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  dividerAfter?: boolean;
}
export interface TabsProps {
  tabs: Tab[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  return (
    <div
      className={`flex items-center border-b border-[var(--border)] overflow-x-auto overflow-y-hidden [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${className}`}
    >
      {tabs.map((tab) => (
        <Fragment key={tab.id}>
          <button
            type="button"
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px flex-shrink-0 ${
              tab.disabled
                ? "border-transparent text-[var(--muted-foreground)] opacity-40 cursor-not-allowed select-none"
                : activeTab === tab.id
                ? "border-[var(--primary)] text-[var(--primary)] font-bold bg-[var(--primary)]/5 cursor-pointer"
                : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)]/30 cursor-pointer"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
          {tab.dividerAfter && (
            <div className="h-4 w-[1px] bg-[var(--border)] self-center mx-2 flex-shrink-0" />
          )}
        </Fragment>
      ))}
    </div>
  );
}

// --- Stat Card ---
interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  chip?: ReactNode;
  icon?: ReactNode;
  color?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  onClick?: () => void;
  badge?: string;
}

export function StatCard({
  label,
  value,
  sub,
  chip,
  icon,
  color = "bg-[var(--primary)] text-white",
  trend,
  trendValue,
  onClick,
  badge,
}: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-gradient-to-br from-[var(--card)] via-[var(--card)] to-[var(--muted)]/40 border border-[var(--border)] rounded-2xl p-5 shadow-xs transition-all duration-200 flex flex-col justify-between min-h-[118px] ${
        onClick ? "cursor-pointer hover:shadow-md hover:border-[var(--primary)]/40 hover:-translate-y-0.5" : "hover:border-[var(--primary)]/30"
      }`}
    >
      {/* Subtle top ambient shine */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-[var(--primary)]/40 to-transparent opacity-70" />

      {/* Header Row: Label & Top Badges / Icon */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-mono font-bold text-[var(--muted-foreground)] uppercase tracking-wider truncate">
          {label}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {trendValue && (
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full shadow-2xs ${
                trend === "up"
                  ? "bg-[var(--primary)] text-white"
                  : trend === "down"
                  ? "bg-rose-600 text-white"
                  : "bg-slate-700 text-white"
              }`}
            >
              {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}{trendValue}
            </span>
          )}
          {badge && (
            <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-[var(--primary)] text-white shadow-2xs">
              {badge}
            </span>
          )}
          {icon && (
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs flex-shrink-0 ${color}`}>
              {icon}
            </div>
          )}
        </div>
      </div>

      {/* Metric Value & Subtitle / Bottom-Right Chip */}
      <div className="mt-auto">
        <div className="flex items-baseline justify-between gap-2">
          <div className="text-xl sm:text-2xl font-extrabold text-[var(--foreground)] tracking-tight font-mono leading-none">
            {value}
          </div>
          {chip && (
            <div className="flex-shrink-0">
              {chip}
            </div>
          )}
        </div>
        {sub && (
          <p className="text-xs text-[var(--muted-foreground)] font-mono mt-2 flex items-center gap-1 truncate">
            {sub}
          </p>
        )}
      </div>
    </div>
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
export function UserAvatar({
  gender = "male",
  size = "md",
  name,
  firstName,
  lastName,
  avatar,
  className = "",
}: {
  gender?: "male" | "female" | "non-binary";
  size?: "sm" | "md" | "lg" | "xl";
  name?: string;
  firstName?: string;
  lastName?: string;
  avatar?: string;
  className?: string;
}) {
  const colors = {
    male: "bg-sky-100 text-sky-800 border-sky-300",
    female: "bg-pink-100 text-pink-700 border-pink-200",
    "non-binary": "bg-slate-100 text-slate-700 border-slate-300",
  };
  const sizes = {
    sm: "w-7 h-7 text-xs font-bold",
    md: "w-9 h-9 text-sm font-bold",
    lg: "w-12 h-12 text-base font-bold",
    xl: "w-20 h-20 text-2xl font-extrabold",
  };

  let initials = "?";
  if (firstName && lastName) {
    initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase();
  } else if (name && name.trim()) {
    const cleanName = name.replace(/,\s*(jr|sr|ii|iii|iv|m\.?sc|ph\.?d|m\.?eng).*$/i, "").trim();
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length === 1) {
      initials = parts[0].slice(0, 2).toUpperCase();
    } else if (parts.length >= 2) {
      const first = parts[0][0];
      const last = parts[parts.length - 1][0];
      initials = `${first}${last}`.toUpperCase();
    }
  }

  if (avatar) {
    return (
      <div className={`rounded-full overflow-hidden flex-shrink-0 border border-[var(--border)] shadow-2xs ${sizes[size]} ${className}`}>
        <img src={avatar} alt={name || "User Avatar"} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className={`rounded-full flex items-center justify-center flex-shrink-0 border shadow-2xs ${colors[gender] || colors.male} ${sizes[size]} ${className}`}>
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
  const isRevision = status === "Pending Revision";
  const steps = [
    { label: "Student", sub: isRevision ? "Revision Needed" : "APF Submission" },
    { label: "Adviser", sub: "Endorsement" },
    { label: "Dean", sub: "Approval" },
    { label: "SDS", sub: "Final Clearance" },
  ];
  const stepIndex = {
    Created: 0,
    "Pending Revision": 0,
    "For Review": 1,
    "For Approval": 2,
    Approved: 3,
    Completed: 3,
    Closed: 3,
  }[status] ?? 0;

  return (
    <div className="w-full py-1.5 overflow-hidden">
      <div className="relative flex items-start justify-between w-full">
        {/* Continuous connector track line behind nodes */}
        <div className="absolute left-[12.5%] right-[12.5%] top-4 h-0.5 bg-[var(--border)] -z-0" />
        <div
          className="absolute left-[12.5%] top-4 h-0.5 bg-[var(--primary)] transition-all duration-500 -z-0"
          style={{
            width: `${(stepIndex / (steps.length - 1)) * 75}%`,
          }}
        />

        {steps.map((step, i) => {
          const isPassed = i < stepIndex;
          const isCurrent = i === stepIndex;

          const nodeBg = isPassed
            ? "bg-[var(--primary)] text-white shadow-2xs"
            : isCurrent
            ? isRevision
              ? "bg-amber-500 text-white ring-3 ring-amber-400/30 ring-offset-2 ring-offset-[var(--card)] shadow-xs"
              : "bg-[var(--primary)] text-white ring-3 ring-[var(--primary)]/25 ring-offset-2 ring-offset-[var(--card)] shadow-xs"
            : "bg-[var(--card)] text-[var(--muted-foreground)] border-2 border-[var(--border)]";

          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center flex-1 min-w-0 px-0.5 text-center">
              {/* Circle node */}
              <div
                className={`w-8 h-8 rounded-full text-xs flex items-center justify-center font-bold transition-all ${nodeBg}`}
              >
                {isPassed ? "✓" : i + 1}
              </div>

              {/* Text labels */}
              <div className="flex flex-col items-center gap-0.5 mt-2 w-full">
                <span
                  className={`text-[11px] font-bold tracking-tight leading-tight truncate max-w-full ${
                    isPassed || isCurrent
                      ? isRevision && isCurrent
                        ? "text-amber-600 font-extrabold"
                        : "text-[var(--foreground)]"
                      : "text-[var(--muted-foreground)]"
                  }`}
                  title={step.label}
                >
                  {step.label}
                </span>
                <span
                  className={`text-[9px] font-mono leading-tight truncate max-w-full hidden sm:block ${
                    isRevision && isCurrent ? "text-amber-600 font-bold" : "text-[var(--muted-foreground)]"
                  }`}
                  title={step.sub}
                >
                  {step.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Re-export Skeleton components and PageHeader
export * from "./Skeleton";
export * from "./PageHeader";

