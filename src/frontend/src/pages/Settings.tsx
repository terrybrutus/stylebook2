import {
  Calendar,
  Clock,
  DatabaseBackup,
  Download,
  Moon,
  Palette,
  Share2,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import * as api from "../lib/api";
import {
  type CsvAppointmentRow,
  type ParsedBackupImport,
  type StyleBookBackupData,
  buildAppointmentCSV,
  buildClientContactsFromCsvRows,
  buildFullBackup,
  parseBackupImport,
} from "../lib/backup";
import { formatDate, formatTime12 } from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type {
  Appointment,
  ClientContact,
  Service,
  WorkingDaySchedule,
} from "../types";

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
  for (const [name, appts] of [...clientMap.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const total = appts.reduce((s, a) => s + a.price, 0);
    const phone = appts.find((a) => a.phoneNumber)?.phoneNumber ?? "";
    lines.push(
      `${name}${phone ? ` | ${phone}` : ""} | ${appts.length} visit${appts.length !== 1 ? "s" : ""} | $${total}`,
    );
  }
  lines.push("");

  lines.push("=== APPOINTMENTS ===");
  const sorted = [...appointments].sort(
    (a, b) =>
      a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
  );
  for (const a of sorted) {
    const parts = [
      a.date,
      a.startTime,
      a.clientName,
      a.serviceName,
      `$${a.price}`,
      `${a.durationMinutes}min`,
    ];
    if (a.phoneNumber) parts.push(a.phoneNumber);
    if (a.notes) parts.push(a.notes);
    lines.push(parts.join(" | "));
  }

  return lines.join("\n");
}

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayKey = (typeof DAY_KEYS)[number];
const DAY_LABELS: Record<DayKey, string> = {
  sun: "Sunday",
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};

const IMPORT_SERVICE_COLORS = [
  "#D4A5B5",
  "#C4A0C4",
  "#7EB8D4",
  "#88C5A0",
  "#D4B88C",
  "#9DB8C5",
];

function downloadTextFile(fileName: string, text: string, type: string) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

function buildPhasesFromService(service: Service, startTime: string) {
  if (service.category !== "multi" || service.phases.length === 0) return [];
  const [sh, sm] = startTime.split(":").map(Number);
  let cursor = sh * 60 + sm;
  return service.phases.map((p) => {
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "0");
    cursor += p.durationMinutes;
    return {
      name: p.name,
      durationMinutes: p.durationMinutes,
      phaseType: p.phaseType,
      startTime: `${hh}:${mm}`,
    };
  });
}

export default function Settings() {
  const settings = useAppStore(useShallow((s) => s.settings));
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const services = useAppStore(useShallow((s) => s.services));
  const clientContacts = useAppStore(useShallow((s) => s.clientContacts));
  const updateSettings = useAppStore((s) => s.updateSettings);
  const setSettings = useAppStore((s) => s.setSettings);
  const setAppointments = useAppStore((s) => s.setAppointments);
  const setServices = useAppStore((s) => s.setServices);
  const setClientContacts = useAppStore((s) => s.setClientContacts);
  const deleteAppointments = useAppStore((s) => s.deleteAppointments);
  const { setTheme } = useTheme();
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

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
    const csv = buildAppointmentCSV(appointments, clientContacts);
    downloadTextFile(
      `stylebook-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv",
    );
  }

  function handleDownloadFullBackup() {
    const backup = buildFullBackup({
      appointments,
      services,
      settings,
      clientContacts,
    });
    downloadTextFile(
      `stylebook-full-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(backup, null, 2),
      "application/json",
    );
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseBackupImport(text, file.name);
      const message =
        parsed.kind === "legacy-csv"
          ? `Import ${parsed.appointments.length} CSV appointment(s)? This replaces current appointments but keeps your existing services/settings.`
          : `Restore full backup with ${parsed.backup.data.appointments.length} appointment(s), ${parsed.backup.data.services.length} service(s), and settings? This replaces current app data.`;
      if (!window.confirm(message)) return;
      setIsImporting(true);
      setImportStatus("Importing backup...");
      const result = await applyBackupImport(parsed);
      setImportStatus(result);
    } catch (err) {
      setImportStatus(
        err instanceof Error
          ? `Import failed: ${err.message}`
          : "Import failed.",
      );
    } finally {
      setIsImporting(false);
      setTimeout(() => setImportStatus(null), 8000);
    }
  }

  async function applyBackupImport(
    parsed: ParsedBackupImport,
  ): Promise<string> {
    if (parsed.kind === "legacy-csv") {
      return restoreLegacyCsv(parsed.appointments);
    }
    return restoreFullBackup(parsed.backup.data);
  }

  async function restoreLegacyCsv(rows: CsvAppointmentRow[]): Promise<string> {
    await Promise.all(appointments.map((a) => api.deleteAppointment(a.id)));
    setAppointments([]);

    const nextServices = [...services];
    const servicesByName = new Map(
      nextServices.map((service) => [service.name.toLowerCase(), service]),
    );

    for (const row of rows) {
      const key = row.serviceName.toLowerCase();
      if (!servicesByName.has(key)) {
        const created = await api.createService({
          name: row.serviceName,
          price: row.price,
          color:
            IMPORT_SERVICE_COLORS[
              servicesByName.size % IMPORT_SERVICE_COLORS.length
            ],
          category: "single",
          phases: [],
          totalDurationMinutes: row.durationMinutes,
        });
        nextServices.push(created);
        servicesByName.set(key, created);
      }
    }
    setServices(nextServices);

    const restored: Appointment[] = [];
    for (const row of rows) {
      const service = servicesByName.get(row.serviceName.toLowerCase());
      if (!service) throw new Error(`Service not found: ${row.serviceName}`);
      const servicePhaseTotal = service.phases.reduce(
        (sum, phase) => sum + phase.durationMinutes,
        0,
      );
      const phases =
        servicePhaseTotal === row.durationMinutes
          ? buildPhasesFromService(service, row.startTime)
          : [];
      const created = await api.createAppointment({
        clientName: row.clientName,
        serviceId: service.id,
        serviceName: service.name,
        date: row.date,
        startTime: row.startTime,
        durationMinutes: row.durationMinutes,
        price: row.price,
        phoneNumber: row.phone,
        notes: row.notes,
        phases,
        color: service.color,
        status: "scheduled",
      });
      restored.push(created);
    }
    setAppointments(restored);
    setClientContacts(buildClientContactsFromCsvRows(rows));
    return `Imported ${restored.length} appointment(s) from CSV.`;
  }

  async function restoreFullBackup(data: StyleBookBackupData): Promise<string> {
    await Promise.all(appointments.map((a) => api.deleteAppointment(a.id)));
    setAppointments([]);

    await Promise.all(services.map((service) => api.deleteService(service.id)));
    const createdServices: Service[] = [];
    const serviceIdMap = new Map<string, string>();

    for (const service of data.services) {
      const created = await api.createService({
        name: service.name,
        price: service.price,
        color: service.color,
        category: service.category,
        phases: service.phases,
        totalDurationMinutes: service.totalDurationMinutes,
        finishingLabel: service.finishingLabel,
      });
      createdServices.push(created);
      serviceIdMap.set(service.id, created.id);
    }
    setServices(createdServices);

    const restoredAppointments: Appointment[] = [];
    for (const appointment of data.appointments) {
      const service =
        createdServices.find(
          (s) => s.id === serviceIdMap.get(appointment.serviceId),
        ) ?? createdServices.find((s) => s.name === appointment.serviceName);
      if (!service) {
        throw new Error(`Service not found for ${appointment.clientName}.`);
      }
      const created = await api.createAppointment({
        clientName: appointment.clientName,
        serviceId: service.id,
        serviceName: service.name,
        date: appointment.date,
        startTime: appointment.startTime,
        durationMinutes: appointment.durationMinutes,
        price: appointment.price,
        phoneNumber: appointment.phoneNumber,
        notes: appointment.notes,
        phases: appointment.phases,
        color: service.color,
        status: appointment.status,
        statusReason: appointment.statusReason,
        statusUpdatedAt: appointment.statusUpdatedAt,
      });
      restoredAppointments.push(created);
    }

    await api.updateSettings(data.settings);
    setSettings(data.settings);
    setTheme(data.settings.darkMode ? "dark" : "light");
    setAppointments(restoredAppointments);
    setClientContacts(data.clientContacts);
    return `Restored ${restoredAppointments.length} appointment(s), ${createdServices.length} service(s), settings, and client contacts.`;
  }

  // Per-day working hours helpers
  function getDay(key: DayKey): WorkingDaySchedule {
    return (
      settings.workingDays?.[key] ?? {
        enabled: key !== "sun" && key !== "sat",
        start: settings.workingHoursStart,
        end: settings.workingHoursEnd,
      }
    );
  }

  async function toggleDayEnabled(key: DayKey) {
    const current = getDay(key);
    const updated = { ...getDay(key), enabled: !current.enabled };
    const newDays = {
      ...(settings.workingDays ?? defaultWorkingDays()),
      [key]: updated,
    };
    updateSettings({ workingDays: newDays });
  }

  async function handleDayTimeChange(
    key: DayKey,
    field: "start" | "end",
    value: string,
  ) {
    const updated = { ...getDay(key), [field]: value };
    const newDays = {
      ...(settings.workingDays ?? defaultWorkingDays()),
      [key]: updated,
    };
    updateSettings({ workingDays: newDays });
  }

  function toggleBiweekly(key: DayKey) {
    const current = getDay(key);
    const nowBiweekly = !current.biweekly;
    const updated = {
      ...current,
      biweekly: nowBiweekly,
      biweeklyRef: nowBiweekly
        ? (current.biweeklyRef ?? "2026-06-07")
        : undefined,
    };
    const newDays = {
      ...(settings.workingDays ?? defaultWorkingDays()),
      [key]: updated,
    };
    updateSettings({ workingDays: newDays });
  }

  // Multi-delete
  const filteredAppts = [...appointments]
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime),
    )
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
    await Promise.all(
      ids.map((id) => api.deleteAppointment(id).catch(console.error)),
    );
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
              <div className="border-t border-border px-4 py-3">
                <p className="text-sm font-medium">Calendar density</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Condenses Day and Week time grids without changing appointment
                  times.
                </p>
                <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                  {(["comfortable", "compact", "dense"] as const).map(
                    (density) => (
                      <button
                        key={density}
                        type="button"
                        onClick={() => {
                          updateSettings({ calendarDensity: density });
                          api.updateSettings({ calendarDensity: density });
                        }}
                        className={`rounded-md px-2 py-1.5 text-xs font-medium capitalize transition-colors ${
                          (settings.calendarDensity ?? "compact") === density
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        data-ocid={`settings.calendar_density_${density}`}
                      >
                        {density}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Working schedule section ── */}
          <div>
            <SectionHeader
              icon={<Clock size={15} />}
              title="Working Schedule"
            />
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <div className="divide-y divide-border/60">
                {DAY_KEYS.map((key) => {
                  const day = getDay(key);
                  return (
                    <div
                      key={key}
                      className="px-4 py-2.5 flex items-center gap-3"
                    >
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
                      <span
                        className={`text-sm font-medium w-20 flex-shrink-0 ${day.enabled ? "text-foreground" : "text-muted-foreground"}`}
                      >
                        {DAY_LABELS[key]}
                      </span>
                      {/* Time pickers */}
                      {day.enabled ? (
                        <div className="flex flex-col gap-1 flex-1">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={day.start}
                              onChange={(e) =>
                                handleDayTimeChange(
                                  key,
                                  "start",
                                  e.target.value,
                                )
                              }
                              className="text-xs border border-input rounded-lg px-2 py-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors flex-1 min-w-0"
                              style={{ fontSize: "14px" }}
                              data-ocid={`settings.day_${key}_start`}
                            />
                            <span className="text-xs text-muted-foreground flex-shrink-0">
                              –
                            </span>
                            <input
                              type="time"
                              value={day.end}
                              onChange={(e) =>
                                handleDayTimeChange(key, "end", e.target.value)
                              }
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
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                Reference date (a working week):
                              </span>
                              <input
                                type="date"
                                value={day.biweeklyRef ?? ""}
                                onChange={(e) => {
                                  const updated = {
                                    ...day,
                                    biweeklyRef: e.target.value,
                                  };
                                  const newDays = {
                                    ...(settings.workingDays ??
                                      defaultWorkingDays()),
                                    [key]: updated,
                                  };
                                  updateSettings({ workingDays: newDays });
                                }}
                                className="text-[11px] border border-input rounded px-1.5 py-0.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-accent/50"
                                data-ocid={`settings.day_${key}_biweekly_ref`}
                              />
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Off
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {/* Calendar grid range note */}
              <div className="border-t border-border px-4 py-2.5">
                <p className="text-[11px] text-muted-foreground">
                  The calendar grid automatically expands to show all working
                  hours. The range below sets the minimum visible range — the
                  grid widens if any working day falls outside it.
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
                <span className="text-muted-foreground">
                  <Trash2 size={15} />
                </span>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Manage Appointments
                </h2>
              </div>
              {manageMode ? (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    setManageMode(false);
                    setSelected(new Set());
                    setSearchTerm("");
                  }}
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
                    {selected.size === filteredAppts.length &&
                    filteredAppts.length > 0
                      ? "Deselect all"
                      : "Select all"}
                  </button>
                </div>

                {/* Appointment list */}
                <div className="max-h-72 overflow-auto divide-y divide-border/50">
                  {filteredAppts.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      No appointments found
                    </p>
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
                            <svg
                              viewBox="0 0 10 8"
                              className="w-2.5 h-2 fill-accent-foreground"
                              aria-hidden="true"
                            >
                              <path
                                d="M1 4l3 3 5-6"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <div
                          className="w-1 self-stretch rounded-full flex-shrink-0"
                          style={{ backgroundColor: appt.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {appt.clientName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {appt.serviceName}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {formatDate(appt.date, {
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatTime12(appt.startTime)}
                          </p>
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
                        <p className="text-sm text-destructive flex-1">
                          Delete {selected.size} appointment
                          {selected.size !== 1 ? "s" : ""}?
                        </p>
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
            <SectionHeader
              icon={<Download size={15} />}
              title="Data & Backup"
            />
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col divide-y divide-border">
              <button
                type="button"
                onClick={handleDownloadFullBackup}
                className="flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
                data-ocid="settings.download_full_backup_button"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent flex-shrink-0">
                  <DatabaseBackup size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Export Full Backup</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Saves appointments, services, phases, settings, and clients
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-60"
                data-ocid="settings.import_backup_button"
              >
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent/10 text-accent flex-shrink-0">
                  <Upload size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Import Backup</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Restores full JSON backups or legacy appointment CSV files
                  </p>
                  {importStatus && (
                    <p className="text-xs text-accent mt-1">{importStatus}</p>
                  )}
                </div>
              </button>
              <input
                ref={importInputRef}
                type="file"
                accept=".json,.csv,application/json,text/csv"
                onChange={handleImportFile}
                className="hidden"
                data-ocid="settings.import_backup_input"
              />
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
                    {appointments.length} appointment
                    {appointments.length !== 1 ? "s" : ""} · opens in
                    Excel/Sheets
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 pb-6 text-center">
            <p className="text-xs text-muted-foreground">
              Built by Terry Brutus
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
    mon: { enabled: true, start: "07:00", end: "10:00" },
    tue: { enabled: false, start: "07:00", end: "10:00" },
    wed: { enabled: true, start: "16:00", end: "19:00" },
    thu: { enabled: false, start: "07:00", end: "10:00" },
    fri: { enabled: true, start: "07:00", end: "10:00" },
    sat: {
      enabled: true,
      start: "09:00",
      end: "13:00",
      biweekly: true,
      biweeklyRef: "2026-06-07",
    },
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
