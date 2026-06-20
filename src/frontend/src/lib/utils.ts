import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Appointment, Service, Settings } from "../types";
import { isActiveAppointment } from "./appointmentLifecycle";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Format ISO date string (YYYY-MM-DD) to readable display format */
export function formatDate(
  isoDate: string,
  options?: Intl.DateTimeFormatOptions,
): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...options,
  });
}

/** Get today's date as YYYY-MM-DD */
export function getTodayString(): string {
  return dateToString(new Date());
}

/** Convert Date to YYYY-MM-DD */
export function dateToString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Parse YYYY-MM-DD to Date (local time, no UTC shift) */
export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Format HH:MM (24h) to 12h display */
export function formatTime12(time24: string): string {
  const [hourStr, minuteStr] = time24.split(":");
  const hour = Number(hourStr);
  const minute = minuteStr || "00";
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${hour12}:${minute} ${ampm}`;
}

/** Format minutes to "Xh Ym" display */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/** Convert hex color to rgba string with given opacity */
export function hexToRgba(hex: string, opacity: number): string {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.substring(0, 2), 16);
  const g = Number.parseInt(clean.substring(2, 4), 16);
  const b = Number.parseInt(clean.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b))
    return `rgba(100,100,100,${opacity})`;
  return `rgba(${r},${g},${b},${opacity})`;
}

/** Lighten hex color by mixing with white */
export function lightenColor(hex: string, amount: number): string {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.substring(0, 2), 16);
  const g = Number.parseInt(clean.substring(2, 4), 16);
  const b = Number.parseInt(clean.substring(4, 6), 16);
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return hex;
  const nr = Math.round(r + (255 - r) * amount);
  const ng = Math.round(g + (255 - g) * amount);
  const nb = Math.round(b + (255 - b) * amount);
  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
}

/** Pixel offset from day start (60px per hour) */
export function timeToPixels(time: string, dayStartHour = 0): number {
  const [h, m] = time.split(":").map(Number);
  return ((h * 60 + m - dayStartHour * 60) / 60) * 60;
}

/** Duration in minutes to pixels */
export function durationToPixels(durationMinutes: number): number {
  return (durationMinutes / 60) * 60;
}

/** Current time as HH:MM */
export function getCurrentTime(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

/** Current time offset in pixels from day start */
export function getCurrentTimePixels(dayStartHour: number): number {
  return timeToPixels(getCurrentTime(), dayStartHour);
}

/** Generate 30-min time slot labels for a day */
export function generateTimeSlots(
  startHour: number,
  endHour: number,
  intervalMinutes = 30,
): string[] {
  const slots: string[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return slots;
}

/** Check if two timed blocks overlap */
export function doBlocksOverlap(
  aStart: string,
  aDuration: number,
  bStart: string,
  bDuration: number,
): boolean {
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const as = toMin(aStart);
  const ae = as + aDuration;
  const bs = toMin(bStart);
  const be = bs + bDuration;
  return as < be && ae > bs;
}

/** Format price as $XX */
export function formatPrice(price: number): string {
  return `${price}`;
}

/** Week dates for a given anchor date */
export function getWeekDates(date: Date, startOnMonday: boolean): Date[] {
  const day = date.getDay();
  const diff = startOnMonday ? (day === 0 ? -6 : 1 - day) : -day;
  const start = new Date(date);
  start.setDate(date.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

/** Month calendar grid (padded to complete weeks) */
export function getMonthGrid(
  year: number,
  month: number,
  startOnMonday: boolean,
): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startDow = firstDay.getDay();
  const startOffset = startOnMonday
    ? startDow === 0
      ? 6
      : startDow - 1
    : startDow;
  const days: Date[] = [];
  for (let i = startOffset - 1; i >= 0; i--) {
    const d = new Date(firstDay);
    d.setDate(firstDay.getDate() - i - 1);
    days.push(d);
  }
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }
  let pad = 1;
  while (days.length % 7 !== 0) {
    const d = new Date(lastDay);
    d.setDate(lastDay.getDate() + pad);
    days.push(d);
    pad++;
  }
  return days;
}

/** Compute effective calendar grid bounds — expands to cover all enabled working day hours */
export function getEffectiveGridHours(settings: Settings): {
  startHour: number;
  endHour: number;
} {
  const globalStart = Number(settings.workingHoursStart.split(":")[0]);
  const globalEnd = Number(settings.workingHoursEnd.split(":")[0]);
  if (!settings.workingDays)
    return { startHour: globalStart, endHour: globalEnd };
  const enabled = Object.values(settings.workingDays).filter((d) => d.enabled);
  if (enabled.length === 0)
    return { startHour: globalStart, endHour: globalEnd };
  const minStart = Math.min(
    ...enabled.map((d) => Number(d.start.split(":")[0])),
  );
  const maxEnd = Math.max(
    ...enabled.map((d) => {
      const [h, m] = d.end.split(":").map(Number);
      return m > 0 ? h + 1 : h;
    }),
  );
  return {
    startHour: Math.min(globalStart, minStart),
    endHour: Math.max(globalEnd, maxEnd),
  };
}

/** Get working hours for a specific date, falling back to global hours */
export function getWorkingScheduleForDate(
  dateStr: string,
  settings: Settings,
): { start: string; end: string; enabled: boolean } {
  const dow = new Date(`${dateStr}T00:00:00`).getDay();
  const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const schedule = settings.workingDays?.[keys[dow]];
  if (!schedule) {
    return {
      start: settings.workingHoursStart,
      end: settings.workingHoursEnd,
      enabled: dow > 0 && dow < 6,
    };
  }
  if (schedule.biweekly && schedule.biweeklyRef && schedule.enabled) {
    const ref = new Date(`${schedule.biweeklyRef}T00:00:00`).getTime();
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    const weeksDiff = Math.round((target - ref) / (7 * 24 * 60 * 60 * 1000));
    const isOnWeek = weeksDiff % 2 === 0;
    return { start: schedule.start, end: schedule.end, enabled: isOnWeek };
  }
  return {
    start: schedule.start,
    end: schedule.end,
    enabled: schedule.enabled,
  };
}

/** Recalculate phase start times from a new base start time */
export function recalcPhaseStarts<
  T extends { durationMinutes: number; startTime: string },
>(phases: T[], baseStart: string): T[] {
  const [sh, sm] = baseStart.split(":").map(Number);
  let cursor = sh * 60 + sm;
  return phases.map((p) => {
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "00");
    cursor += p.durationMinutes;
    return { ...p, startTime: `${hh}:${mm}` };
  });
}

/** Rotate the hue of a hex color by `degrees` (0-360). */
export function hueRotate(hex: string, degrees: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    if (max === r) h = ((g - b) / d + 6) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = h * 60;
  }
  h = (h + degrees + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1: number;
  let g1: number;
  let b1: number;
  if (h < 60) {
    r1 = c;
    g1 = x;
    b1 = 0;
  } else if (h < 120) {
    r1 = x;
    g1 = c;
    b1 = 0;
  } else if (h < 180) {
    r1 = 0;
    g1 = c;
    b1 = x;
  } else if (h < 240) {
    r1 = 0;
    g1 = x;
    b1 = c;
  } else if (h < 300) {
    r1 = x;
    g1 = 0;
    b1 = c;
  } else {
    r1 = c;
    g1 = 0;
    b1 = x;
  }
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}

// ─── Smart slot suggestions ───────────────────────────────────────────────────

export interface SlotSuggestion {
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  type: "open" | "processing-gap";
  duringClient?: string; // set when type === "processing-gap"
}

/** Convert HH:MM string to total minutes since midnight */
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** Convert total minutes to HH:MM */
function minToTime(totalMin: number): string {
  return `${String(Math.floor(totalMin / 60)).padStart(2, "0")}:${String(totalMin % 60).padStart(2, "0")}`;
}

/** Get concrete time blocks for an existing appointment */
function getApptBlocks(
  appt: Appointment,
): { start: number; end: number; isProcessing: boolean; clientName: string }[] {
  if (appt.phases.length === 0) {
    const s = timeToMin(appt.startTime);
    return [
      {
        start: s,
        end: s + appt.durationMinutes,
        isProcessing: false,
        clientName: appt.clientName,
      },
    ];
  }
  return appt.phases.map((p) => {
    const timePart = p.startTime.includes("T")
      ? p.startTime.split("T")[1].slice(0, 5)
      : p.startTime.slice(0, 5);
    const s = timeToMin(timePart);
    return {
      start: s,
      end: s + p.durationMinutes,
      isProcessing: p.phaseType === "processing",
      clientName: appt.clientName,
    };
  });
}

/** Get concrete time blocks for a hypothetical new/edited appointment starting at startMin */
function getNewBlocks(
  startMin: number,
  service: Service | null,
  durationMinutes: number,
): { start: number; end: number; isProcessing: boolean }[] {
  if (service?.category === "multi" && service.phases.length > 0) {
    let cursor = startMin;
    return service.phases.map((p) => {
      const block = {
        start: cursor,
        end: cursor + p.durationMinutes,
        isProcessing: p.phaseType === "processing",
      };
      cursor += p.durationMinutes;
      return block;
    });
  }
  return [
    { start: startMin, end: startMin + durationMinutes, isProcessing: false },
  ];
}

/**
 * Find all valid start times for an appointment on a given date.
 * - New appointment's active phases must not overlap any existing active phase
 * - New appointment's active phases CAN overlap existing processing phases (stylist is free)
 * - New appointment's processing phases are unconstrained (stylist free regardless)
 */
export function findAvailableSlots(
  date: string,
  service: Service | null,
  durationMinutes: number,
  appointments: Appointment[],
  settings: Settings,
  excludeApptId?: string,
): SlotSuggestion[] {
  const safeDur = Math.round(durationMinutes);
  if (!Number.isFinite(safeDur) || safeDur <= 0) return [];
  const schedule = getWorkingScheduleForDate(date, settings);
  if (!schedule.enabled) return [];

  const dayStart = timeToMin(schedule.start);
  const dayEnd = timeToMin(schedule.end);

  const dayAppts = appointments.filter(
    (a) => a.date === date && a.id !== excludeApptId && isActiveAppointment(a),
  );
  const existingBlocks = dayAppts.flatMap(getApptBlocks);
  const existingActive = existingBlocks.filter((b) => !b.isProcessing);
  const existingProcessing = existingBlocks.filter((b) => b.isProcessing);

  const suggestions: SlotSuggestion[] = [];

  for (let t = dayStart; t + safeDur <= dayEnd; t += 15) {
    const newBlocks = getNewBlocks(t, service, safeDur);
    const newActive = newBlocks.filter((b) => !b.isProcessing);

    // Check: no new active block overlaps any existing active block
    let conflicts = false;
    for (const nb of newActive) {
      for (const eb of existingActive) {
        if (nb.start < eb.end && nb.end > eb.start) {
          conflicts = true;
          break;
        }
      }
      if (conflicts) break;
    }
    if (conflicts) continue;

    // Classify: is any new active block sitting inside an existing processing block?
    let isGap = false;
    let duringClient: string | undefined;
    for (const nb of newActive) {
      for (const ep of existingProcessing) {
        if (nb.start < ep.end && nb.end > ep.start) {
          isGap = true;
          duringClient = ep.clientName;
          break;
        }
      }
      if (isGap) break;
    }

    suggestions.push({
      date,
      time: minToTime(t),
      type: isGap ? "processing-gap" : "open",
      duringClient: isGap ? duringClient : undefined,
    });
  }

  return suggestions;
}

/**
 * Scan forward from startDate (exclusive) up to maxDays, returning the first
 * date that has at least one available slot.
 */
export function findNextAvailable(
  fromDate: string,
  service: Service | null,
  durationMinutes: number,
  appointments: Appointment[],
  settings: Settings,
  excludeApptId?: string,
  maxDays = 30,
): SlotSuggestion | null {
  const base = new Date(`${fromDate}T00:00:00`);
  for (let i = 0; i <= maxDays; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    const dateStr = dateToString(d);
    const slots = findAvailableSlots(
      dateStr,
      service,
      durationMinutes,
      appointments,
      settings,
      excludeApptId,
    );
    if (slots.length > 0) return slots[0];
  }
  return null;
}
