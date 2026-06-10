import { Calendar, Clock, Download, Moon, Palette, Share2, Sun, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useShallow } from "zustand/shallow";
import * as api from "../lib/api";
import { formatDate, formatTime12 } from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type { Appointment, ClientContact, WorkingDaySchedule } from "../types";

function buildCSV(appointments: Appointment[], clientContacts: ClientContact[]): string {
  const contactMap = new Map(clientContacts.map((c) => [c.name, c]));
  const header = "Date,Time,Client,Service,Duration (min),Price,Phone,Notes";
  const rows = [...appointments]
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .map((a) => {
      const contact = contactMap.get(a.clientName);
      return [
        a.date,
        a.startTime,
        `"${a.clientName.replace(/"/g, '""')}"`,
        `"${a.serviceName.replace(/"/g, '""')}"`,
        a.durationMinutes,
        a.price,
        contact?.phone ?? "",
        `"${((contact?.notes ?? a.notes ?? "")).replace(/"/g, '""')}"`,
      ].join(",");
    });
  return [header, ...rows].join("\n");
}

function buildTextBackup(appointments: Appointment[]): string {
  const date = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const lines: string[] = [];
  lines.push(`StyleBook Backup — ${date}`);
  lines.push(`Total appointments: ${appointments.length}`);
  lines.push("");

  const clientMap = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const list = clientMap.get(a.clientName) ?? [];
    list.push(a);
    clientMap.set(a.clientName, list);
  }

  lines.push("=== CLIENTS ===");
  for (const [name, appts] of [...clientMap.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const total = appts.reduce((s, a) => s + a.price, 0);
    const phone = appts.find((a) => a.phoneNumber)?.phoneNumber ?? "";
    lines.push(`${name}${phone ? ` | ${phone}` : ""} | ${appts.length} visit${appts.length !== 1 ? "s" : ""} | $${total}`);
  }
  lines.push("");

  lines.push("=== APPOINTMENTS ===");
  const sorted = [...appointments].sort(
    (a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );
  for (const a of sorted) {
    const parts = [a.date, a.startTime, a.clientName, a.serviceName, `$${a.price}`, `${a.durationMinutes}min`];
    if (a.phoneNumber) parts.push(a.phoneNumber);
    if (a.notes) parts.push(a.notes);
    lines.push(parts.join(" | "));
  }

  return lines.join("\n");
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayKey = typeof DAY_KEYS[number];
const DAY_LABELS: Record<DayKey, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

export default function Settings() {
  const settings = useAppStore(useShallow((s) => s.settings));
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const clientContacts = useAppStore(useShallow((s) => s.clientContacts));
  const updateSettings = useAppStore((s) => s.updateSettings);
  const deleteAppointments = useAppStore((s) => s.deleteAppointments);
  const { setTheme } = useTheme();
  const [shareStatus, setShareStatus] = useState<string | null>(null);

  // Multi-delete state
  const [manageMode, setManageMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  async function toggleBool(key: "startWeekOnMonday" | "darkMode") {
    const newVal = !settings[key];
    updateSettings({ [key]: newVal });
    await api.updateSettings({ [key]: newVal });
    if (key === "darkMode") {
      setTheme(newVal ? "dark" : "light");
    }
  }

  async function handleShareBackup() {
    const text = buildTextBackup(appointments);
    const title = `StyleBook Backup — ${appointments.length} appointments`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text });
        setShareStatus("Shared!");
      } catch {
        // User cancelled — silent
      }
    } else {
      await navigator.clipboard.writeText(text);
      setShareStatus("Copied to clipboard!");
    }
    setTimeout(() => setShareStatus(null), 3000);
  }

  function handleDownloadCSV() {
    const csv = buildCSV(appointments, clientContacts);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stylebook-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Per-day working hours helpers
  function getDay(key: DayKey): WorkingDaySchedule {
    return settings.workingDays?.[key] ?? {
      enabled: key !== "sun" && key !== "sat",
      start: settings.workingHoursStart,
      end: settings.workingHoursEnd,
    };
  }

  async function toggleDayEnabled(key: DayKey) {
    const current = getDay(key);
    const updated = { ...getDay(key), enabled: !current.enabled };
    const newDays = { ...(settings.workingDays ?? defaultWorkingDays()), [key]: updated };
    updateSettings({ workingDays: newDays });
  }

  async function handleDayTimeChange(key: DayKey, field: "start" | "end", value: string) {
    const updated = { ...getDay(key), [field]: value };
    const newDays = { ...(settings.workingDays ?? defaultWorkingDays()), [key]: updated };
    updateSettings({ workingDays: newDays });
  }

  function toggleBiweekly(key: DayKey) {
    const current = getDay(key);
    const nowBiweekly = !current.biweekly;
    const updated = {
      ...current,
      biweekly: nowBiweekly,
      biweeklyRef: nowBiweekly ? (current.biweeklyRef ?? "2026-06-07") : undefined,
    };
    const newDays = { ...(settings.workingDays ?? defaultWorkingDays()), [key]: updated };
    updateSettings({ workingDays: newDays });
  }

  // Multi-delete
  const filteredAppts = [...appointments]
    .sort((a, b) => b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime))
    .filter((a) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        a.clientName.toLowerCase().includes(q) ||
        a.serviceName.toLowerCase().includes(q) ||
        a.date.includes(q)
      );
    });

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredAppts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredAppts.map((a) => a.id)));
    }
  }

  async function handleBulkDelete() {
    const ids = [...selected];
    deleteAppointments(ids);
    await Promise.all(ids.map((id) => api.deleteAppointment(id).catch(console.error)));
    setSelected(new Set());
    setDeleteConfirm(false);
    setManageMode(false);
  }

  return (
    <div className="flex flex-col h-full" data-ocid="settings.page">
      {/* Page header */}
      <div className="px-4 pt-5 pb-4 border-b border-border bg-card">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize how StyleBook works for you
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-5 flex flex-col gap-5 max-w-xl mx-auto">
          {/* ── Calendar section ── */}
          <div>
            <SectionHeader icon={<Calendar size={15} />} title="Calendar" />
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <ToggleRow
                label="Start week on Monday"
                description="Applies to both Week and Month calendar views"
                checked={settings.startWeekOnMonday}
                onToggle={() => toggleBool("startWeekOnMonday")}
                ocid="settings.start_week_monday_toggle"
              />
            </div>
          </div>

          {/* ── Working schedule section ── */}
          <div>
            <SectionHeader icon={<Clock size={15} />} title="Working Schedule" />
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="divide-y divide-border/60">
                {DAY_KEYS.map((key) => {
                  const day = getDay(key);
                  return (
                    <div key={key} className="px-4 py-2.5 flex items-center gap-3">
                      {/* Enable toggle */}
                      <button
                        type="button"
                        onClick={() => toggleDayEnabled(key)}
                        className="flex-shrink-0"
                        aria-pressed={day.enabled}
                        data-ocid={`settings.day_${key}_toggle`}
                      >
                        <Toggle checked={day.enabled} small />
                      </button>
                      {/* Day label */}
                      <span className={`text-sm font-medium w-20 flex-shrink-0 ${day.enabled ? "text-foreground" : "text-muted-foreground"}`}>
                        {DAY_LABELS[key]}
                      </span>
                      {/* Time pickers */}
                      {day.enabled ? (
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={day.start}
                              onChange={(e) => handleDayTimeChange(key, "start", e.target.value)}
                              className="text-xs border border-input rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors flex-1 min-w-0"
                              style={{ fontSize: "14px" }}
                              data-ocid={`settings.day_${key}_start`}
                            />
                            <span className="text-xs text-muted-foreground flex-shrink-0">–</span>
                            <input
                              type="time"
                              value={day.end}
                              onChange={(e) => handleDayTimeChange(key, "end", e.target.value)}
                              className="text-xs border border-input rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors flex-1 min-w-0"
                              style={{ fontSize: "14px" }}
                              data-ocid={`settings.day_${key}_end`}
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleBiweekly(key)}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border self-start transition-colors ${day.biweekly ? "border-accent text-accent bg-accent/10" : "border-border text-muted-foreground hover:border-accent/50"}`}
                            data-ocid={`settings.day_${key}_biweekly`}
                          >
                            {day.biweekly ? "Every other week ✓" : "Every week"}
                          </button>
                          {day.biweekly && (
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">Reference date (a working week):</span>
                              <input
                                type="date"
                                value={day.biweeklyRef ?? ""}
                                onChange={(e) => {
                                  const updated = { ...day, biweeklyRef: e.target.value };
                                  const newDays = { ...(settings.workingDays ?? defaultWorkingDays()), [key]: updated };
                                  updateSettings({ workingDays: newDays });
                                }}
                                className="text-[11px] border border-input rounded px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
                                data-ocid={`settings.day_${key}_biweekly_ref`}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Off</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Calendar grid range note */}
              <div className="border-t border-border px-4 py-2.5">
                <p className="text-[11px] text-muted-foreground">
                  The calendar grid automatically expands to show all working hours. The range below sets the minimum visible range — the grid widens if any working day falls outside it.
                </p>
              </div>
              {/* Global range (still needed for calendar grid) */}
              <div className="border-t border-border">
                <TimeRow
                  id="start-time"
                  label="Grid start"
                  value={settings.workingHoursStart}
                  onChange={(v) => {
                    updateSettings({ workingHoursStart: v });
                    api.updateSettings({ workingHoursStart: v });
                  }}
                  ocid="settings.start_time_input"
                />
                <div className="border-t border-border/60" />
                <TimeRow
                  id="end-time"
                  label="Grid end"
                  value={settings.workingHoursEnd}
                  onChange={(v) => {
                    updateSettings({ workingHoursEnd: v });
                    api.updateSettings({ workingHoursEnd: v });
                  }}
                  ocid="settings.end_time_input"
                />
              </div>
            </div>
          </div>

          {/* ── Appearance section ── */}
          <div>
            <SectionHeader icon={<Palette size={15} />} title="Appearance" />
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleBool("darkMode")}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
                data-ocid="settings.dark_mode_toggle"
                aria-pressed={settings.darkMode}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                      settings.darkMode
                        ? "bg-primary/10 text-foreground"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {settings.darkMode ? <Moon size={16} /> : <Sun size={16} />}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-medium">Dark mode</p>
                    <p className="text-xs text-muted-foreground">
                      {settings.darkMode
                        ? "Currently dark theme"
                        : "Currently light theme"}
                    </p>
                  </div>
                </div>
                <Toggle checked={settings.darkMode} />
              </button>
            </div>
          </div>

          {/* ── Appointments management ── */}
          <div>
            <div className="flex items-center justify-between px-1 mb-2">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground"><Trash2 size={15} /></span>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Manage Appointments
                </h2>
              </div>
              {manageMode ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setManageMode(false); setSelected(new Set()); setSearchTerm(""); }}
                >
                  Cancel
                </button>
              ) : (
                <button
                  type="button"
                  className="text-xs text-accent hover:text-accent/80 font-medium"
                  onClick={() => setManageMode(true)}
                  data-ocid="settings.manage_appointments_button"
                >
                  Select & Delete
                </button>
              )}
            </div>

            {manageMode && (
              <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                {/* Search + select all */}
                <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                  <input
                    type="search"
                    placeholder="Filter by client, service, date…"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                  <button
                    type="button"
                    className="text-xs font-medium text-accent flex-shrink-0"
                    onClick={toggleSelectAll}
                  >
                    {selected.size === filteredAppts.length && filteredAppts.length > 0 ? "Deselect all" : "Select all"}
                  </button>
                </div>

                {/* Appointment list */}
                <div className="max-h-72 overflow-auto divide-y divide-border/50">
                  {filteredAppts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No appointments found</p>
                  ) : (
                    filteredAppts.map((appt) => (
                      <button
                        key={appt.id}
                        type="button"
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/40 transition-colors ${selected.has(appt.id) ? "bg-accent/5" : ""}`}
                        onClick={() => toggleSelect(appt.id)}
                      >
                        <div
                          className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                            selected.has(appt.id)
                              ? "bg-accent border-accent"
                              : "border-border"
                          }`}
                        >
                          {selected.has(appt.id) && (
                            <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-accent-foreground" aria-hidden="true">
                              <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div
                          className="w-1 self-stretch rounded-full flex-shrink-0"
                          style={{ backgroundColor: appt.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{appt.clientName}</p>
                          <p className="text-xs text-muted-foreground truncate">{appt.serviceName}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">{formatDate(appt.date, { month: "short", day: "numeric" })}</p>
                          <p className="text-xs text-muted-foreground">{formatTime12(appt.startTime)}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>

                {/* Delete selected button */}
                {selected.size > 0 && (
                  <div className="border-t border-border p-3">
                    {deleteConfirm ? (
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-destructive flex-1">Delete {selected.size} appointment{selected.size !== 1 ? "s" : ""}?</p>
                        <button
                          type="button"
                          className="px-3 py-1.5 bg-destructive text-destructive-foreground rounded-lg text-xs font-medium"
                          onClick={handleBulkDelete}
                          data-ocid="settings.confirm_delete_button"
                        >
                          Delete
                        </button>
                        <button
                          type="button"
                          className="px-3 py-1.5 border border-border rounded-lg text-xs"
                          onClick={() => setDeleteConfirm(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-medium hover:bg-destructive/20 transition-colors"
                        onClick={() => setDeleteConfirm(true)}
                        data-ocid="settings.delete_selected_button"
                      >
                        Delete {selected.size} selected
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Data & Backup section ── */}
          <div>
            <SectionHeader icon={<Download size={15} />} title="Data & Backup" />
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col divide-y divide-border">
              <button
                type="button"
                onClick={handleShareBackup}
                className="flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
                data-ocid="settings.share_backup_button"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent flex-shrink-0">
                  <Share2 size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Share as Text</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {shareStatus ?? "Save to Notes, Messages, or email"}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={handleDownloadCSV}
                className="flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
                data-ocid="settings.download_csv_button"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent flex-shrink-0">
                  <Download size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Export CSV</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {appointments.length} appointment{appointments.length !== 1 ? "s" : ""} · opens in Excel/Sheets
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 pb-6 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()}. Built with love using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function defaultWorkingDays() {
  return {
    sun: { enabled: false, start: "09:00", end: "13:00" },
    mon: { enabled: true,  start: "07:00", end: "10:00" },
    tue: { enabled: false, start: "07:00", end: "10:00" },
    wed: { enabled: true,  start: "16:00", end: "19:00" },
    thu: { enabled: false, start: "07:00", end: "10:00" },
    fri: { enabled: true,  start: "07:00", end: "10:00" },
    sat: { enabled: true,  start: "09:00", end: "13:00", biweekly: true, biweeklyRef: "2026-06-07" },
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
}: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 mb-2">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  ocid: string;
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
  ocid,
}: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
      data-ocid={ocid}
      aria-pressed={checked}
    >
      <div className="text-left">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Toggle checked={checked} />
    </button>
  );
}

function Toggle({ checked, small }: { checked: boolean; small?: boolean }) {
  // Track dimensions: small = 32×20px, regular = 44×24px
  // Dot dimensions: small = 14px, regular = 18px
  // Dot translate: off = 3px from left; on = track - 3 - dotW (15px small, 23px regular)
  const w = small ? "w-8 h-5" : "w-11 h-6";
  const dotSize = small ? "w-[14px] h-[14px]" : "w-[18px] h-[18px]";
  const onTranslate = small ? "translate-x-[15px]" : "translate-x-[23px]";
  return (
    <div
      className={`relative shrink-0 ${w} rounded-full transition-colors duration-200 ${
        checked ? "bg-accent" : "bg-zinc-300 dark:bg-zinc-600"
      }`}
    >
      <span
        className={`absolute top-[3px] ${dotSize} rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? onTranslate : "translate-x-[3px]"
        }`}
      />
    </div>
  );
}

interface TimeRowProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  ocid: string;
}

function TimeRow({ id, label, value, onChange, ocid }: TimeRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <label htmlFor={id} className="text-sm font-medium cursor-pointer">
        {label}
      </label>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
        style={{ fontSize: "16px", minWidth: "8.5rem" }}
        data-ocid={ocid}
      />
    </div>
  );
}
