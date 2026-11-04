import { useState, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  Button,
  Dialog,
  Input,
  Textarea,
  Select,
  DateTimePicker,
  DatePicker,
  Card,
  StatCard,
  RefreshButton,
  SkeletonStatCard,
  SkeletonEventCard,
  SkeletonTable,
  SkeletonToolbox,
} from "../../components/ui";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Save,
  X,
  AlertTriangle,
  Calendar,
  CalendarCheck,
  Clock,
  MapPin,
  Video,
  Building2,
  ExternalLink,
  Eye,
  Filter,
  LayoutGrid,
  List,
  Sparkles,
  Link2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Event,
  EventMode,
  EventSetting,
  EventStatus,
  formatDate,
  formatDateTime,
  formatEventSchedule,
  getEventTypeById,
  getStatusBadgeClass,
  isGoogleDocsUrl,
  toWebUrl,
} from "../../services/dataService";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminInstitutionalEvents() {
  const { events, organizations, eventTypes, addEvent, updateEvent, deleteEvent, defaultView, isLoading } = useApp();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [settingFilter, setSettingFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "list">(defaultView || "grid");
  const [selectedDay, setSelectedDay] = useState<{ year: number; month: number; day: number } | null>(null);

  // Calendar View Month/Year State
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = useMemo(() => {
    const arr: (number | null)[] = Array.from({ length: firstDay + daysInMonth }, (_, i) =>
      i < firstDay ? null : i - firstDay + 1
    );
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [firstDay, daysInMonth]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [viewingEvent, setViewingEvent] = useState<Event | null>(null);
  const [deleteConfirmEvent, setDeleteConfirmEvent] = useState<Event | null>(null);
  const [isAllDay, setIsAllDay] = useState(false);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    name: "",
    typeId: "",
    setting: "On-campus" as EventSetting,
    mode: "FTF" as EventMode,
    dateStart: "",
    dateEnd: "",
    location: "",
    description: "",
    requisites: "",
    memoUrl: "",
    status: "Event Authorized" as EventStatus,
  });

  // Filter only Institutional events (not deleted)
  const institutionalEvents = useMemo(() => {
    return events.filter(
      (e) => !e.deleted && (e.isInstitutional || e.category === "Institutional" || !e.organizationId)
    );
  }, [events]);

  // All active campus events for calendar indicator view (MegaFest, ITSG, Institutional, etc.)
  const calendarEvents = useMemo(() => {
    return events.filter((e) => !e.deleted);
  }, [events]);

  const now = new Date();

  // Metrics
  const stats = useMemo(() => {
    const total = institutionalEvents.length;
    const upcoming = institutionalEvents.filter((e) => new Date(e.dateStart) > now).length;
    const ongoing = institutionalEvents.filter(
      (e) => new Date(e.dateStart) <= now && new Date(e.dateEnd) >= now
    ).length;
    const completed = institutionalEvents.filter((e) => new Date(e.dateEnd) < now).length;
    return { total, upcoming, ongoing, completed };
  }, [institutionalEvents, now]);

  function eventsOnDay(day: number) {
    const dayStart = new Date(viewYear, viewMonth, day, 0, 0, 0, 0).getTime();
    const dayEnd = new Date(viewYear, viewMonth, day, 23, 59, 59, 999).getTime();

    return calendarEvents.filter((e) => {
      const s = new Date(e.dateStart).getTime();
      const end = new Date(e.dateEnd).getTime();
      if (isNaN(s) || isNaN(end)) return false;
      return s <= dayEnd && end >= dayStart;
    });
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function goToToday() {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDay({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() });
  }

  const isToday = (day: number) =>
    day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const isDaySelected = (day: number) =>
    selectedDay !== null &&
    selectedDay.day === day &&
    selectedDay.month === viewMonth &&
    selectedDay.year === viewYear;

  // Filtered list
  const filteredEvents = useMemo(() => {
    return institutionalEvents
      .filter((e) => {
        if (settingFilter !== "ALL" && e.setting !== settingFilter) return false;
        
        const isPast = new Date(e.dateEnd).getTime() < Date.now() || e.status === "Completed" || e.status === "Closed";
        if (statusFilter === "ACTIVE" && isPast) return false;
        if (statusFilter === "CONCLUDED" && !isPast) return false;

        if (selectedDay) {
          const d = new Date(e.dateStart);
          if (
            d.getFullYear() !== selectedDay.year ||
            d.getMonth() !== selectedDay.month ||
            d.getDate() !== selectedDay.day
          ) {
            return false;
          }
        }

        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          e.name.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.location.toLowerCase().includes(q) ||
          (e.requisites && e.requisites.toLowerCase().includes(q))
        );
      })
      .sort((a, b) => {
        const aPast = new Date(a.dateEnd).getTime() < Date.now() || a.status === "Completed" || a.status === "Closed";
        const bPast = new Date(b.dateEnd).getTime() < Date.now() || b.status === "Completed" || b.status === "Closed";
        if (aPast !== bPast) return aPast ? 1 : -1;
        return new Date(b.dateStart).getTime() - new Date(a.dateStart).getTime();
      });
  }, [institutionalEvents, search, settingFilter, statusFilter, selectedDay]);

  // Open Create Modal for a specific date
  function handleOpenCreateForDate(year: number, month: number, day: number) {
    const defaultType =
      eventTypes.find((t) => t.name.toLowerCase().includes("institutional"))?.id ||
      eventTypes[0]?.id ||
      "";

    const start = new Date(year, month, day, 8, 0, 0, 0);
    const end = new Date(year, month, day, 17, 0, 0, 0);

    const pad = (n: number) => String(n).padStart(2, "0");
    const toIsoLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    setFormData({
      name: "",
      typeId: defaultType,
      setting: "On-campus",
      mode: "FTF",
      dateStart: toIsoLocal(start),
      dateEnd: toIsoLocal(end),
      location: "LCUP Main Campus",
      description: "",
      requisites: "Open to all CITE students, faculty, and administrative personnel.",
      memoUrl: "",
      status: "Event Authorized",
    });
    setIsAllDay(false);
    setShowAddModal(true);
  }

  // Open Create Modal (default tomorrow)
  function handleOpenCreate() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    handleOpenCreateForDate(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // Open Edit Modal
  function handleOpenEdit(e: Event) {
    const pad = (n: number) => String(n).padStart(2, "0");
    const toIsoLocal = (dStr: string) => {
      const d = new Date(dStr);
      return isNaN(d.getTime())
        ? ""
        : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const dS = new Date(e.dateStart);
    const dE = new Date(e.dateEnd);
    const isAllDaySpan = Boolean(e.isAllDay);

    setFormData({
      name: e.name,
      typeId: e.typeId || "",
      setting: (e.setting as EventSetting) || "On-campus",
      mode: (e.mode as EventMode) || "FTF",
      dateStart: toIsoLocal(e.dateStart),
      dateEnd: toIsoLocal(e.dateEnd),
      location: e.location || "",
      description: e.description || "",
      requisites: e.requisites || "",
      memoUrl: e.apfUrl || "",
      status: e.status === "Approved" ? "Event Authorized" : (e.status || "Event Authorized"),
    });
    setIsAllDay(isAllDaySpan);
    setEditingEvent(e);
  }

  // Save New Institutional Event
  function handleSaveCreate() {
    if (!formData.name.trim()) {
      toast.error("Missing Field", "Please enter an event name.");
      return;
    }
    if (!formData.dateStart || !formData.dateEnd) {
      toast.error("Missing Dates", "Please specify both starting and ending schedules.");
      return;
    }
    if (new Date(formData.dateStart) >= new Date(formData.dateEnd)) {
      toast.error("Invalid Schedule", "The end date/time must be strictly after the start date/time.");
      return;
    }

    const instTypeId =
      eventTypes.find((t) => t.name.toLowerCase().includes("institutional"))?.id ||
      formData.typeId ||
      undefined;

    const newEvent: Event = {
      id: crypto.randomUUID(),
      name: formData.name.trim(),
      typeId: instTypeId,
      category: "Institutional",
      isInstitutional: true,
      isAllDay: isAllDay,
      setting: formData.setting,
      mode: formData.mode,
      dateStart: new Date(formData.dateStart).toISOString(),
      dateEnd: new Date(formData.dateEnd).toISOString(),
      location: formData.location.trim() || "LCUP Main Campus",
      description: formData.description.trim(),
      requisites: formData.requisites.trim(),
      proposedBudget: 0,
      status: formData.status,
      apfUrl: formData.memoUrl.trim() ? toWebUrl(formData.memoUrl.trim()) : undefined,
      createdAt: new Date().toISOString(),
      createdBy: currentUser?.id || "a1000000-0000-0000-0000-000000000001",
      deleted: false,
    };

    addEvent(newEvent);
    toast.success("Institutional Event Published", `'${newEvent.name}' has been created and published to the university calendar.`);
    setShowAddModal(false);
  }

  // Save Edit
  function handleSaveEdit() {
    if (!editingEvent) return;
    if (!formData.name.trim()) {
      toast.error("Missing Field", "Please enter an event name.");
      return;
    }
    if (!formData.dateStart || !formData.dateEnd) {
      toast.error("Missing Dates", "Please specify both starting and ending schedules.");
      return;
    }
    if (new Date(formData.dateStart) >= new Date(formData.dateEnd)) {
      toast.error("Invalid Schedule", "The end date/time must be strictly after the start date/time.");
      return;
    }

    const instTypeId =
      eventTypes.find((t) => t.name.toLowerCase().includes("institutional"))?.id ||
      formData.typeId ||
      undefined;

    updateEvent(editingEvent.id, {
      name: formData.name.trim(),
      typeId: instTypeId,
      category: "Institutional",
      isInstitutional: true,
      isAllDay: isAllDay,
      setting: formData.setting,
      mode: formData.mode,
      dateStart: new Date(formData.dateStart).toISOString(),
      dateEnd: new Date(formData.dateEnd).toISOString(),
      location: formData.location.trim(),
      description: formData.description.trim(),
      requisites: formData.requisites.trim(),
      apfUrl: formData.memoUrl.trim() ? toWebUrl(formData.memoUrl.trim()) : undefined,
      status: formData.status,
    });

    toast.success("Institutional Event Updated", `'${formData.name.trim()}' has been updated.`);
    setEditingEvent(null);
  }

  // Delete / Archive
  function handleDeleteConfirm() {
    if (!deleteConfirmEvent) return;
    deleteEvent(deleteConfirmEvent.id);
    toast.success("Event Archived", `'${deleteConfirmEvent.name}' has been removed from active institutional calendars.`);
    setDeleteConfirmEvent(null);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)] tracking-tight">
            Institutional Events
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">
            Create and manage university-wide official events, examinations (e.g. Midterm & Final Exams), academic ceremonies, and campus assemblies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            className="gap-1.5 shadow-2xs font-semibold text-xs h-9"
          >
            <Plus size={15} />
            Create Institutional Event
          </Button>
          <RefreshButton />
        </div>
      </div>

      {/* Metrics Row - High-Contrast Solid White Icons on Dedicated Backgrounds */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard
              label="Total Published"
              value={stats.total}
              sub="All institutional initiatives"
              icon={<Building2 size={18} className="text-white" />}
              color="bg-[var(--primary)] text-white"
            />
            <StatCard
              label="Upcoming"
              value={stats.upcoming}
              sub="Scheduled ahead"
              icon={<Calendar size={18} className="text-white" />}
              color="bg-amber-600 text-white"
            />
            <StatCard
              label="Ongoing Now"
              value={stats.ongoing}
              sub="Active today"
              icon={<Clock size={18} className="text-white" />}
              color="bg-emerald-600 text-white"
            />
            <StatCard
              label="Concluded"
              value={stats.completed}
              sub="Past institutional events"
              icon={<CheckCircle size={18} className="text-white" />}
              color="bg-slate-600 text-white"
            />
          </>
        )}
      </div>

      {/* Month Calendar View */}
      {isLoading ? (
        <div className="p-6 h-72 animate-pulse bg-[var(--muted)]/30 border border-[var(--border)] rounded-2xl" />
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xs">
          {/* Calendar Header / Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]/30 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-lg text-[var(--foreground)] tracking-tight">
                {MONTH_NAMES[viewMonth]} <span className="text-[var(--primary)]">{viewYear}</span>
              </h3>
              {selectedDay && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="inline-flex items-center gap-1 text-xs font-mono bg-[var(--primary)]/10 text-[var(--primary)] px-2.5 py-1 rounded-full hover:bg-[var(--primary)]/20 transition cursor-pointer font-bold"
                >
                  Filtering: {MONTH_NAMES[selectedDay.month].slice(0, 3)} {selectedDay.day}
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] rounded-lg hover:bg-[var(--muted)] hover:border-[var(--primary)]/50 transition cursor-pointer shadow-2xs"
              >
                Today
              </button>
              <div className="flex items-center gap-1 bg-[var(--card)] border border-[var(--border)] rounded-lg p-0.5">
                <button
                  onClick={prevMonth}
                  aria-label="Previous month"
                  className="p-1.5 rounded-md hover:bg-[var(--muted)] transition text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={nextMonth}
                  aria-label="Next month"
                  className="p-1.5 rounded-md hover:bg-[var(--muted)] transition text-[var(--muted-foreground)] hover:text-[var(--foreground)] cursor-pointer"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-[var(--border)] bg-[var(--muted)]/50">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="py-2.5 text-center text-[11px] font-mono font-semibold uppercase tracking-wider text-[var(--muted-foreground)]"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dayEvents = day ? eventsOnDay(day) : [];
              const isCurrentDay = day ? isToday(day) : false;
              const isSelected = day ? isDaySelected(day) : false;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (day) {
                      if (isSelected) {
                        setSelectedDay(null);
                      } else {
                        setSelectedDay({ year: viewYear, month: viewMonth, day });
                      }
                    }
                  }}
                  className={`min-h-[100px] p-2 border-r border-b border-[var(--border)] transition-all group relative ${
                    day ? "cursor-pointer hover:bg-[var(--primary)]/5" : "bg-[var(--muted)]/20"
                  } ${idx % 7 === 6 ? "border-r-0" : ""} ${
                    isSelected ? "bg-[var(--primary)]/10 ring-2 ring-[var(--primary)] ring-inset" : ""
                  }`}
                >
                  {day && (
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-semibold ${
                              isCurrentDay
                                ? "bg-[var(--primary)] text-white shadow-xs"
                                : isSelected
                                ? "bg-[var(--primary)]/20 text-[var(--primary)] font-bold"
                                : "text-[var(--muted-foreground)]"
                            }`}
                          >
                            {day}
                          </span>
                          {dayEvents.length > 0 && (
                            <span className="text-[10px] font-mono font-bold text-[var(--primary)]">
                              {dayEvents.length} {dayEvents.length === 1 ? "evt" : "evts"}
                            </span>
                          )}
                        </div>

                        {/* Hover [+] Button to quickly add Institutional Event on this date */}
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleOpenCreateForDate(viewYear, viewMonth, day);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 shadow-2xs cursor-pointer flex items-center justify-center"
                          title={`Add Institutional Event starting ${MONTH_NAMES[viewMonth]} ${day}, ${viewYear}`}
                        >
                          <Plus size={12} strokeWidth={2.5} />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1 flex-1">
                        {dayEvents.slice(0, 2).map((e) => {
                          const isInst = e.isInstitutional || e.category === "Institutional" || !e.organizationId;
                          const org = organizations.find((o) => o.id === e.organizationId);
                          const badgeColor = isInst ? "#3f3f46" : (org?.logoColor ?? "var(--primary)");
                          const prefix = isInst ? "LCUP" : (org?.code?.substring(0, 3) ?? "ORG");
                          const isEvtPast = new Date(e.dateEnd).getTime() < Date.now() || e.status === "Completed" || e.status === "Closed";

                          return (
                            <button
                              key={e.id}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                if (isInst) {
                                  setViewingEvent(e);
                                }
                              }}
                              className={`w-full text-left text-[10px] font-medium px-2 py-1 rounded-md truncate leading-tight transition ${
                                isInst
                                  ? isEvtPast
                                    ? "bg-zinc-700/60 text-zinc-300 opacity-70 border border-zinc-600/60 hover:brightness-110 cursor-pointer shadow-2xs"
                                    : "bg-zinc-700 text-white border border-zinc-600 font-semibold hover:brightness-110 cursor-pointer shadow-2xs"
                                  : "text-white opacity-95 cursor-default hover:opacity-100 shadow-2xs"
                              }`}
                              style={!isInst ? { backgroundColor: badgeColor } : undefined}
                              title={
                                isInst
                                  ? `[Institutional Event] ${e.name}`
                                  : `[${org?.name || prefix}] ${e.name} (${e.status})`
                              }
                            >
                              {!isInst && org?.logoUrl ? (
                                <img src={org.logoUrl} alt="" className="w-3.5 h-3.5 rounded-sm object-contain inline-block mr-1 bg-white/20" />
                              ) : (
                                <span className="font-bold opacity-90 mr-1">{prefix}:</span>
                              )}
                              {e.name}
                            </button>
                          );
                        })}
                        {dayEvents.length > 2 && (
                          <div className="relative group/more mt-auto">
                            <span className="text-[10px] font-mono font-bold text-[var(--primary)] hover:underline px-1 cursor-pointer inline-flex items-center gap-0.5">
                              +{dayEvents.length - 2} more
                            </span>
                            <div className={`absolute ${idx % 7 >= 5 ? "right-0" : "left-0"} top-full mt-1.5 z-50 hidden group-hover/more:flex flex-col gap-1 p-2.5 bg-white dark:bg-zinc-800 border border-[var(--border)] rounded-xl shadow-xl min-w-[210px] max-w-[270px] pointer-events-auto`}>
                              <div className="text-[10px] font-mono uppercase text-[var(--muted-foreground)] font-bold pb-1 border-b border-[var(--border)]">
                                More Events on this day ({dayEvents.length - 2})
                              </div>
                              <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pt-1">
                                {dayEvents.slice(2).map((extra) => {
                                  const isInst = extra.isInstitutional || extra.category === "Institutional" || !extra.organizationId;
                                  const org = organizations.find((o) => o.id === extra.organizationId);
                                  const prefix = isInst ? "LCUP" : (org?.code?.substring(0, 3) ?? "ORG");
                                  const isEvtPast = new Date(extra.dateEnd).getTime() < Date.now() || extra.status === "Completed" || extra.status === "Closed";
                                  const badgeColor = isInst ? "#3f3f46" : (org?.logoColor ?? "var(--primary)");

                                  return (
                                    <button
                                      key={extra.id}
                                      type="button"
                                      onClick={(ev) => {
                                        ev.stopPropagation();
                                        if (isInst) {
                                          setViewingEvent(extra);
                                        }
                                      }}
                                      className={`w-full text-left text-[10px] font-medium px-2 py-1 rounded-md truncate transition leading-tight ${
                                        isInst
                                          ? isEvtPast
                                            ? "bg-zinc-700/60 text-zinc-300 opacity-70 border border-zinc-600/60 hover:brightness-110 cursor-pointer shadow-2xs"
                                            : "bg-zinc-700 text-white border border-zinc-600 font-semibold hover:brightness-110 cursor-pointer shadow-2xs"
                                          : "text-white opacity-95 cursor-default hover:opacity-100 shadow-2xs"
                                      }`}
                                      style={!isInst ? { backgroundColor: badgeColor } : undefined}
                                      title={extra.name}
                                    >
                                      <span className="font-bold mr-1 opacity-90">{prefix}:</span>
                                      {extra.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Toolbox & Controls */}
      {isLoading ? (
        <SkeletonToolbox />
      ) : (
        <Card className="p-4 bg-[var(--card)] border border-[var(--border)] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 flex-wrap">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
                <Input
                  placeholder="Search institutional event, venue, or requisites..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 text-sm"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--muted-foreground)] font-mono font-medium hidden sm:inline">Setting:</span>
                <select
                  value={settingFilter}
                  onChange={(e) => setSettingFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  <option value="ALL">All Settings</option>
                  <option value="On-campus">On-campus</option>
                  <option value="Off-campus">Off-campus</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[var(--muted-foreground)] font-mono font-medium hidden sm:inline">Status:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] font-medium focus:outline-hidden focus:ring-2 focus:ring-[var(--primary)]/20"
                >
                  <option value="ALL">All Status</option>
                  <option value="ACTIVE">Upcoming / Ongoing</option>
                  <option value="CONCLUDED">Finished</option>
                </select>
              </div>

              {selectedDay && (
                <button
                  onClick={() => setSelectedDay(null)}
                  className="inline-flex items-center gap-1 text-xs font-mono bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 px-2.5 py-1 rounded-md font-bold hover:bg-orange-200 transition cursor-pointer"
                >
                  Day: {MONTH_NAMES[selectedDay.month].slice(0, 3)} {selectedDay.day}
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <div className="flex items-center border border-[var(--border)] rounded-lg p-0.5 bg-[var(--muted)]/50">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-md transition ${viewMode === "grid" ? "bg-[var(--card)] shadow-2xs text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                  title="Grid View"
                >
                  <LayoutGrid size={15} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-md transition ${viewMode === "list" ? "bg-[var(--card)] shadow-2xs text-[var(--primary)]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                  title="Table View"
                >
                  <List size={15} />
                </button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Event Listing */}
      {isLoading ? (
        viewMode === "grid" ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SkeletonEventCard />
            <SkeletonEventCard />
            <SkeletonEventCard />
          </div>
        ) : (
          <SkeletonTable rows={5} />
        )
      ) : filteredEvents.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <CalendarCheck size={40} className="mx-auto text-[var(--muted-foreground)] opacity-50 mb-3" />
          <h3 className="text-base font-bold text-[var(--foreground)]">No Institutional Events Found</h3>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-sm mx-auto">
            {search || settingFilter !== "ALL" || statusFilter !== "ALL" || selectedDay
              ? "No institutional events match your search or filter criteria."
              : "No institutional events have been created yet. Click '+ Create Institutional Event' to post academic examinations, holidays, or ceremonies."}
          </p>
          {(search || settingFilter !== "ALL" || statusFilter !== "ALL" || selectedDay) ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setSettingFilter("ALL");
                setStatusFilter("ALL");
                setSelectedDay(null);
              }}
              className="mt-4 gap-1.5"
            >
              Clear Filters
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCreate}
              className="mt-4 gap-1.5"
            >
              <Plus size={14} />
              Publish First Institutional Event
            </Button>
          )}
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEvents.map((evt) => {
            const type = getEventTypeById(evt.typeId || "");
            const isPast = new Date(evt.dateEnd).getTime() < Date.now() || evt.status === "Completed" || evt.status === "Closed";
            const isOngoing =
              !isPast &&
              new Date(evt.dateStart).getTime() <= Date.now() &&
              new Date(evt.dateEnd).getTime() >= Date.now();

            return (
              <Card
                key={evt.id}
                className={`flex flex-col justify-between overflow-hidden transition-all group ${
                  isPast
                    ? "bg-slate-50/70 dark:bg-zinc-900/40 border-slate-200 dark:border-zinc-800 opacity-60 hover:opacity-100 hover:shadow-xs"
                    : "border border-[var(--border)] hover:border-[var(--primary)]/50 hover:shadow-md bg-[var(--card)]"
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
                        {evt.setting}
                      </span>
                      {isPast ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400">
                          Finished
                        </span>
                      ) : isOngoing ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 animate-pulse">
                          ● Happening Now
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Upcoming
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${getStatusBadgeClass(evt.status, evt.setting)}`}>
                      {evt.status}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors line-clamp-2">
                    {evt.name}
                  </h3>
                  <p className="text-xs text-[var(--muted-foreground)] font-mono mt-0.5">
                    {type?.name || "Official Campus Initiative"}
                  </p>

                  <div className="mt-3.5 space-y-1.5 text-xs text-[var(--foreground)]/80">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className={isPast ? "text-[var(--muted-foreground)] flex-shrink-0" : "text-[var(--primary)] flex-shrink-0"} />
                      <span className="font-mono text-[11px] truncate">{formatEventSchedule(evt.dateStart, evt.dateEnd, evt.isAllDay)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {evt.mode === "Online/Virtual" ? (
                        <Video size={13} className={isPast ? "text-[var(--muted-foreground)] flex-shrink-0" : "text-blue-500 flex-shrink-0"} />
                      ) : (
                        <MapPin size={13} className={isPast ? "text-[var(--muted-foreground)] flex-shrink-0" : "text-emerald-500 flex-shrink-0"} />
                      )}
                      <span className="truncate">{evt.location} ({evt.mode})</span>
                    </div>
                  </div>

                  {evt.description && (
                    <p className="text-xs text-[var(--muted-foreground)] mt-3 line-clamp-2 leading-relaxed">
                      {evt.description}
                    </p>
                  )}
                </div>

                <div className="px-5 py-3 bg-[var(--muted)]/40 border-t border-[var(--border)] flex items-center justify-between gap-2 mt-auto">
                  <div className="flex items-center gap-1.5">
                    {evt.apfUrl && (
                      <a
                        href={toWebUrl(evt.apfUrl)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--primary)] hover:underline"
                        title="Attached Memo / Guidelines"
                      >
                        <Link2 size={12} />
                        <span>Memo Link</span>
                      </a>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => setDeleteConfirmEvent(evt)}
                      title="Archive Event"
                      className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg shadow-2xs"
                    >
                      <Trash2 size={15} className="stroke-[1.8]" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenEdit(evt)}
                      title="Edit Event"
                      className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg bg-white hover:bg-[var(--muted)]/60 shadow-2xs text-[var(--foreground)]"
                    >
                      <Pencil size={15} className="stroke-[1.8]" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewingEvent(evt)}
                      title="View Details"
                      className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg bg-white hover:bg-[var(--muted)]/60 shadow-2xs text-[var(--foreground)]"
                    >
                      <Eye size={15} className="stroke-[1.8]" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-hidden border border-[var(--border)] shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--muted)]/70 border-b border-[var(--border)] text-xs font-mono uppercase text-[var(--muted-foreground)]">
                <tr>
                  <th className="px-5 py-3">Event Name & Type</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Venue / Mode</th>
                  <th className="px-4 py-3">Setting</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredEvents.map((evt) => {
                  const type = getEventTypeById(evt.typeId || "");
                  const isPast = new Date(evt.dateEnd).getTime() < Date.now() || evt.status === "Completed" || evt.status === "Closed";
                  return (
                    <tr key={evt.id} className={`border-b border-[var(--border)] transition ${isPast ? "opacity-60 bg-slate-50/50 dark:bg-zinc-900/30 hover:opacity-100" : "hover:bg-[var(--muted)]/30"}`}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-zinc-700 flex-shrink-0" />
                          <div className="font-bold text-[var(--foreground)]">{evt.name}</div>
                        </div>
                        <div className="text-xs font-mono text-[var(--muted-foreground)] pl-4">
                          {type?.name || "Institutional Event"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-[var(--foreground)]/80">
                        {formatEventSchedule(evt.dateStart, evt.dateEnd, evt.isAllDay)}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className="font-medium truncate max-w-[200px]">{evt.location}</div>
                        <div className="font-mono text-[11px] text-[var(--muted-foreground)]">{evt.mode}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
                          {evt.setting}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-medium ${getStatusBadgeClass(evt.status, evt.setting)}`}>
                            {evt.status}
                          </span>
                          {isPast && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-700 dark:bg-zinc-800 dark:text-zinc-400">
                              Finished
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => setDeleteConfirmEvent(evt)}
                            title="Archive Event"
                            className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg shadow-2xs"
                          >
                            <Trash2 size={14} className="stroke-[1.8]" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(evt)}
                            title="Edit Event"
                            className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg bg-white hover:bg-[var(--muted)]/60 shadow-2xs text-[var(--foreground)]"
                          >
                            <Pencil size={14} className="stroke-[1.8]" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setViewingEvent(evt)}
                            title="View Details"
                            className="h-8 w-8 !p-0 flex items-center justify-center rounded-lg bg-white hover:bg-[var(--muted)]/60 shadow-2xs text-[var(--foreground)]"
                          >
                            <Eye size={14} className="stroke-[1.8]" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Modal: Create Institutional Event */}
      <Dialog
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Create Institutional Event"
        size="xl"
      >
        <div className="p-6">
          <div className="grid sm:grid-cols-2 gap-4 pb-2">
            <div className="sm:col-span-2">
              <Input
                label="Event Name *"
                placeholder="e.g., 1st Semester Midterm Examination Week"
                value={formData.name}
                onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">
                Category *
              </label>
              <div className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 text-[var(--foreground)] font-semibold flex items-center cursor-not-allowed select-none">
                <span>🏛️ Institutional</span>
              </div>
            </div>

            <Select
              label="Setting *"
              value={formData.setting}
              onChange={(e) => setFormData((d) => ({ ...d, setting: e.target.value as EventSetting }))}
              options={[
                { value: "On-campus", label: "On-campus" },
                { value: "Off-campus", label: "Off-campus" },
              ]}
            />

            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">
                Event Classification Type *
              </label>
              <div className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 text-[var(--foreground)] font-semibold flex items-center cursor-not-allowed select-none">
                <span>Institutional Event</span>
              </div>
            </div>

            <Select
              label="Delivery Mode *"
              value={formData.mode}
              onChange={(e) => setFormData((d) => ({ ...d, mode: e.target.value as EventMode }))}
              options={[
                { value: "FTF", label: "Face-to-Face (FTF)" },
                { value: "Online/Virtual", label: "Online/Virtual" },
                { value: "Hybrid", label: "Hybrid" },
              ]}
            />

            <div className="sm:col-span-2">
              <Input
                label={formData.mode === "Online/Virtual" ? "Meeting Link *" : "Location / Venue *"}
                placeholder={
                  formData.mode === "Online/Virtual"
                    ? "e.g., https://meet.google.com/abc-defg-hij or Zoom link"
                    : "e.g., LCUP Main Campus / University Gymnasium"
                }
                value={formData.location}
                onChange={(e) => setFormData((d) => ({ ...d, location: e.target.value }))}
              />
            </div>

            {/* All Day Event Option */}
            <div className="sm:col-span-2 flex items-center justify-between py-2 px-3 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)]/70">
              <label className="text-xs font-bold text-[var(--foreground)] cursor-pointer flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsAllDay(checked);
                    if (checked) {
                      const startDateStr = formData.dateStart ? formData.dateStart.split("T")[0] : new Date().toISOString().split("T")[0];
                      const endDateStr = formData.dateEnd ? formData.dateEnd.split("T")[0] : startDateStr;
                      setFormData((d) => ({
                        ...d,
                        dateStart: `${startDateStr}T08:00`,
                        dateEnd: `${endDateStr}T17:00`,
                      }));
                    }
                  }}
                  className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border)] cursor-pointer"
                />
                <span>All Day Event</span>
              </label>
              <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                {isAllDay ? "All Day (No specific time)" : "Specific Time"}
              </span>
            </div>

            {isAllDay ? (
              <>
                <DatePicker
                  label="Date Start *"
                  value={formData.dateStart ? formData.dateStart.split("T")[0] : ""}
                  onChange={(val) => {
                    setFormData((d) => {
                      const curEndDay = d.dateEnd ? d.dateEnd.split("T")[0] : val;
                      const nextEndDay = curEndDay < val ? val : curEndDay;
                      return {
                        ...d,
                        dateStart: `${val}T08:00`,
                        dateEnd: `${nextEndDay}T17:00`,
                      };
                    });
                  }}
                />
                <DatePicker
                  label="Date End *"
                  min={formData.dateStart ? formData.dateStart.split("T")[0] : undefined}
                  value={formData.dateEnd ? formData.dateEnd.split("T")[0] : ""}
                  onChange={(val) => {
                    setFormData((d) => ({
                      ...d,
                      dateEnd: `${val}T17:00`,
                    }));
                  }}
                  error={
                    formData.dateStart && formData.dateEnd && formData.dateEnd.split("T")[0] < formData.dateStart.split("T")[0]
                      ? "End date cannot be before start date."
                      : undefined
                  }
                />
              </>
            ) : (
              <>
                <DateTimePicker
                  label="Date & Time Start *"
                  value={formData.dateStart}
                  onChange={(val) => setFormData((d) => ({ ...d, dateStart: val }))}
                />
                <DateTimePicker
                  label="Date & Time End *"
                  min={formData.dateStart || undefined}
                  value={formData.dateEnd}
                  onChange={(val) => setFormData((d) => ({ ...d, dateEnd: val }))}
                  error={
                    formData.dateStart && formData.dateEnd && new Date(formData.dateEnd) <= new Date(formData.dateStart)
                      ? "End date & time must be after the start date & time."
                      : undefined
                  }
                />
              </>
            )}

            <div className="sm:col-span-2">
              <Textarea
                label="Description *"
                rows={3}
                placeholder="Provide a comprehensive summary of the event objectives and activities..."
                value={formData.description}
                onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <Textarea
                label="Attendee Requisites"
                rows={2}
                placeholder="e.g., Valid Student ID, Uniform / Examination Permit required..."
                value={formData.requisites}
                onChange={(e) => setFormData((d) => ({ ...d, requisites: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Official Memo / Guidelines Link (Optional)"
                placeholder="https://docs.google.com/document/d/..."
                value={formData.memoUrl}
                onChange={(e) => setFormData((d) => ({ ...d, memoUrl: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] mt-2">
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveCreate} className="gap-1.5 shadow-2xs font-semibold">
              <Save size={15} />
              Publish Institutional Event
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: Edit Institutional Event */}
      <Dialog
        open={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        title="Edit Institutional Event"
        size="xl"
      >
        <div className="p-6">
          <div className="grid sm:grid-cols-2 gap-4 pb-2">
            <div className="sm:col-span-2">
              <Input
                label="Event Name *"
                placeholder="e.g., 1st Semester Midterm Examination Week"
                value={formData.name}
                onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">
                Category *
              </label>
              <div className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 text-[var(--foreground)] font-semibold flex items-center cursor-not-allowed select-none">
                <span>🏛️ Institutional</span>
              </div>
            </div>

            <Select
              label="Setting *"
              value={formData.setting}
              onChange={(e) => setFormData((d) => ({ ...d, setting: e.target.value as EventSetting }))}
              options={[
                { value: "On-campus", label: "On-campus" },
                { value: "Off-campus", label: "Off-campus" },
              ]}
            />

            <div>
              <label className="text-xs font-medium text-[var(--foreground)] block mb-1.5">
                Event Classification Type *
              </label>
              <div className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] bg-[var(--muted)]/50 text-[var(--foreground)] font-semibold flex items-center cursor-not-allowed select-none">
                <span>Institutional Event</span>
              </div>
            </div>

            <Select
              label="Delivery Mode *"
              value={formData.mode}
              onChange={(e) => setFormData((d) => ({ ...d, mode: e.target.value as EventMode }))}
              options={[
                { value: "FTF", label: "Face-to-Face (FTF)" },
                { value: "Online/Virtual", label: "Online/Virtual" },
                { value: "Hybrid", label: "Hybrid" },
              ]}
            />

            <div className="sm:col-span-2">
              <Input
                label={formData.mode === "Online/Virtual" ? "Meeting Link *" : "Location / Venue *"}
                placeholder={
                  formData.mode === "Online/Virtual"
                    ? "e.g., https://meet.google.com/abc-defg-hij or Zoom link"
                    : "e.g., LCUP Main Campus / University Gymnasium"
                }
                value={formData.location}
                onChange={(e) => setFormData((d) => ({ ...d, location: e.target.value }))}
              />
            </div>

            {/* All Day Event Option */}
            <div className="sm:col-span-2 flex items-center justify-between py-2 px-3 rounded-xl bg-[var(--muted)]/30 border border-[var(--border)]/70">
              <label className="text-xs font-bold text-[var(--foreground)] cursor-pointer flex items-center gap-2 select-none">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsAllDay(checked);
                    if (checked) {
                      const startDateStr = formData.dateStart ? formData.dateStart.split("T")[0] : new Date().toISOString().split("T")[0];
                      const endDateStr = formData.dateEnd ? formData.dateEnd.split("T")[0] : startDateStr;
                      setFormData((d) => ({
                        ...d,
                        dateStart: `${startDateStr}T08:00`,
                        dateEnd: `${endDateStr}T17:00`,
                      }));
                    }
                  }}
                  className="w-4 h-4 rounded text-[var(--primary)] focus:ring-[var(--primary)] border-[var(--border)] cursor-pointer"
                />
                <span>All Day Event</span>
              </label>
              <span className="text-[11px] font-mono text-[var(--muted-foreground)]">
                {isAllDay ? "All Day (No specific time)" : "Specific Time"}
              </span>
            </div>

            {isAllDay ? (
              <>
                <DatePicker
                  label="Date Start *"
                  value={formData.dateStart ? formData.dateStart.split("T")[0] : ""}
                  onChange={(val) => {
                    setFormData((d) => {
                      const curEndDay = d.dateEnd ? d.dateEnd.split("T")[0] : val;
                      const nextEndDay = curEndDay < val ? val : curEndDay;
                      return {
                        ...d,
                        dateStart: `${val}T08:00`,
                        dateEnd: `${nextEndDay}T17:00`,
                      };
                    });
                  }}
                />
                <DatePicker
                  label="Date End *"
                  min={formData.dateStart ? formData.dateStart.split("T")[0] : undefined}
                  value={formData.dateEnd ? formData.dateEnd.split("T")[0] : ""}
                  onChange={(val) => {
                    setFormData((d) => ({
                      ...d,
                      dateEnd: `${val}T17:00`,
                    }));
                  }}
                  error={
                    formData.dateStart && formData.dateEnd && formData.dateEnd.split("T")[0] < formData.dateStart.split("T")[0]
                      ? "End date cannot be before start date."
                      : undefined
                  }
                />
              </>
            ) : (
              <>
                <DateTimePicker
                  label="Date & Time Start *"
                  value={formData.dateStart}
                  onChange={(val) => setFormData((d) => ({ ...d, dateStart: val }))}
                />
                <DateTimePicker
                  label="Date & Time End *"
                  min={formData.dateStart || undefined}
                  value={formData.dateEnd}
                  onChange={(val) => setFormData((d) => ({ ...d, dateEnd: val }))}
                  error={
                    formData.dateStart && formData.dateEnd && new Date(formData.dateEnd) <= new Date(formData.dateStart)
                      ? "End date & time must be after the start date & time."
                      : undefined
                  }
                />
              </>
            )}

            <div className="sm:col-span-2">
              <Textarea
                label="Description *"
                rows={3}
                placeholder="Provide a comprehensive summary of the event objectives and activities..."
                value={formData.description}
                onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <Textarea
                label="Attendee Requisites"
                rows={2}
                placeholder="e.g., Valid Student ID, Uniform / Examination Permit required..."
                value={formData.requisites}
                onChange={(e) => setFormData((d) => ({ ...d, requisites: e.target.value }))}
              />
            </div>

            <div className="sm:col-span-2">
              <Input
                label="Official Memo / Guidelines Link (Optional)"
                placeholder="https://docs.google.com/document/d/..."
                value={formData.memoUrl}
                onChange={(e) => setFormData((d) => ({ ...d, memoUrl: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-[var(--border)] mt-2">
            <Button variant="outline" onClick={() => setEditingEvent(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEdit} className="gap-1.5 shadow-2xs font-semibold">
              <Save size={15} />
              Save Changes
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Modal: View Details */}
      <Dialog
        open={!!viewingEvent}
        onClose={() => setViewingEvent(null)}
        title={viewingEvent?.name || "Institutional Event Details"}
        size="xl"
      >
        {viewingEvent && (
          <div className="p-6 space-y-4 text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-[var(--muted)] text-[var(--muted-foreground)]">
                {viewingEvent.setting}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium ${getStatusBadgeClass(viewingEvent.status, viewingEvent.setting)}`}>
                {viewingEvent.status}
              </span>
            </div>

            <div className="bg-[var(--muted)]/50 rounded-xl p-4 space-y-3">
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="font-mono text-[var(--muted-foreground)] uppercase tracking-wider">Classification</p>
                  <p className="font-bold text-sm text-[var(--foreground)] mt-0.5">
                    {getEventTypeById(viewingEvent.typeId || "")?.name || "Official Campus Initiative"}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[var(--muted-foreground)] uppercase tracking-wider">Delivery Mode</p>
                  <p className="font-bold text-sm text-[var(--foreground)] mt-0.5">{viewingEvent.mode}</p>
                </div>
                <div>
                  <p className="font-mono text-[var(--muted-foreground)] uppercase tracking-wider">Scheduled Date & Time</p>
                  <p className="font-medium text-xs text-[var(--foreground)] mt-0.5">
                    {formatEventSchedule(viewingEvent.dateStart, viewingEvent.dateEnd, viewingEvent.isAllDay)}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[var(--muted-foreground)] uppercase tracking-wider">Location / Venue</p>
                  <p className="font-medium text-xs text-[var(--foreground)] mt-0.5">{viewingEvent.location}</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Overview & Objectives
              </h4>
              <p className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-wrap bg-[var(--card)] p-3.5 rounded-xl border border-[var(--border)]">
                {viewingEvent.description || "No description provided."}
              </p>
            </div>

            <div>
              <h4 className="font-bold text-xs font-mono text-[var(--muted-foreground)] uppercase tracking-wider mb-1">
                Target Scope & Requisites
              </h4>
              <p className="text-sm text-[var(--foreground)] leading-relaxed bg-[var(--card)] p-3 rounded-xl border border-[var(--border)]">
                {viewingEvent.requisites || "Open to all students and personnel."}
              </p>
            </div>

            {viewingEvent.apfUrl && (
              <div className="p-3.5 bg-orange-50/60 border border-orange-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-[var(--primary)]" />
                  <div>
                    <p className="text-xs font-bold text-orange-950">Official Memo / Attached Document</p>
                    <p className="text-[11px] text-orange-800 truncate max-w-md font-mono">{viewingEvent.apfUrl}</p>
                  </div>
                </div>
                <a
                  href={toWebUrl(viewingEvent.apfUrl)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-medium hover:bg-[var(--primary)]/90 inline-flex items-center gap-1 flex-shrink-0 shadow-2xs"
                >
                  <span>Open</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="outline" onClick={() => setViewingEvent(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Modal: Delete Confirmation */}
      <Dialog
        open={!!deleteConfirmEvent}
        onClose={() => setDeleteConfirmEvent(null)}
        title="Archive Institutional Event"
        size="sm"
      >
        <div className="p-6 space-y-3 text-sm">
          <p className="text-[var(--foreground)]">
            Are you sure you want to archive the institutional event{" "}
            <span className="font-bold font-mono">"{deleteConfirmEvent?.name}"</span>?
          </p>
          <p className="text-xs text-[var(--muted-foreground)]">
            This event will be removed from active listings and calendar feeds, but preserved in system archives for historical audits.
          </p>
          <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border)]">
            <Button variant="outline" onClick={() => setDeleteConfirmEvent(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteConfirm}>
              Archive Event
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
