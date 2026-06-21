import type { Appointment, Settings } from "../types";
import { isActiveAppointment, isBlockedTime } from "./appointmentLifecycle";
import { formatTime12, getWorkingScheduleForDate } from "./utils";

interface TimeBlock {
  start: string;
  durationMinutes: number;
  isProcessing: boolean;
}

export interface AppointmentValidationResult {
  overlap?: {
    message: string;
    isProcessing: boolean;
  };
  outsideHours?: string;
}

function timeToMinutes(time: string): number {
  const clean = time.includes("T") ? time.split("T")[1].slice(0, 5) : time;
  const [h, m] = clean.split(":").map(Number);
  return h * 60 + m;
}

function blocksOverlap(a: TimeBlock, b: TimeBlock): boolean {
  const aStart = timeToMinutes(a.start);
  const bStart = timeToMinutes(b.start);
  return (
    aStart < bStart + b.durationMinutes && aStart + a.durationMinutes > bStart
  );
}

function getAppointmentBlocks(appt: Appointment): TimeBlock[] {
  if (appt.phases.length === 0) {
    return [
      {
        start: appt.startTime,
        durationMinutes: appt.durationMinutes,
        isProcessing: false,
      },
    ];
  }
  return appt.phases.map((phase) => ({
    start: phase.startTime,
    durationMinutes: phase.durationMinutes,
    isProcessing: phase.phaseType === "processing",
  }));
}

export function validateAppointmentChange(
  updated: Appointment,
  appointments: Appointment[],
  settings: Settings,
): AppointmentValidationResult {
  const result: AppointmentValidationResult = {};
  const newBlocks = getAppointmentBlocks(updated);

  for (const existing of appointments) {
    if (!isActiveAppointment(existing)) continue;
    if (existing.id === updated.id || existing.date !== updated.date) continue;
    const existingBlocks = getAppointmentBlocks(existing);

    for (const next of newBlocks) {
      for (const current of existingBlocks) {
        if (!blocksOverlap(next, current)) continue;
        const isProcessing = next.isProcessing || current.isProcessing;
        result.overlap = {
          isProcessing,
          message: isBlockedTime(existing)
            ? `This overlaps blocked time (${existing.blockReason ?? existing.clientName}). Confirm before saving.`
            : isProcessing
              ? `This overlaps ${existing.clientName}'s ${existing.serviceName} processing time. Stylist is likely free, but confirm before saving.`
              : `This overlaps ${existing.clientName}'s ${existing.serviceName}. Confirm before saving.`,
        };
        return { ...result, outsideHours: getOutsideHours(updated, settings) };
      }
    }
  }

  result.outsideHours = getOutsideHours(updated, settings);
  return result;
}

function getOutsideHours(
  appt: Appointment,
  settings: Settings,
): string | undefined {
  const schedule = getWorkingScheduleForDate(appt.date, settings);
  if (!schedule.enabled) {
    return "That day is not in your working schedule.";
  }
  const start = timeToMinutes(appt.startTime);
  const end = start + appt.durationMinutes;
  const scheduleStart = timeToMinutes(schedule.start);
  const scheduleEnd = timeToMinutes(schedule.end);
  if (start < scheduleStart || end > scheduleEnd) {
    return `Outside working hours (${formatTime12(schedule.start)}-${formatTime12(schedule.end)}).`;
  }
  return undefined;
}
