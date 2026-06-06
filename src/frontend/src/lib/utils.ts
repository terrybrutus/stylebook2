import type { ClassValue } from "clsx";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

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

/** Rotate the hue of a hex color by `degrees` (0-360). */
export function hueRotate(hex: string, degrees: number): string {
  if (!hex.startsWith("#") || hex.length < 7) return hex;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
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
  let r1: number, g1: number, b1: number;
  if (h < 60)      { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120){ r1 = x; g1 = c; b1 = 0; }
  else if (h < 180){ r1 = 0; g1 = c; b1 = x; }
  else if (h < 240){ r1 = 0; g1 = x; b1 = c; }
  else if (h < 300){ r1 = x; g1 = 0; b1 = c; }
  else             { r1 = c; g1 = 0; b1 = x; }
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, "0");
  return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
}
