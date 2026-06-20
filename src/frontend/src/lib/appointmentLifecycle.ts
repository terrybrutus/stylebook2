import type { Appointment, AppointmentStatus, Settings } from "../types";

const META_PREFIX = "\n\n[[stylebook:appointment-meta:";
const META_SUFFIX = "]]";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  canceled: "Canceled",
  no_show: "No-show",
  rescheduled: "Rescheduled",
};

export const INACTIVE_APPOINTMENT_STATUSES = new Set<AppointmentStatus>([
  "canceled",
  "no_show",
  "rescheduled",
]);

export function normalizeAppointmentStatus(status?: string): AppointmentStatus {
  if (
    status === "completed" ||
    status === "canceled" ||
    status === "no_show" ||
    status === "rescheduled"
  ) {
    return status;
  }
  return "scheduled";
}

export function isActiveAppointment(appointment: Appointment): boolean {
  return !INACTIVE_APPOINTMENT_STATUSES.has(
    normalizeAppointmentStatus(appointment.status),
  );
}

export function splitAppointmentNotes(rawNotes?: string): {
  notes?: string;
  status: AppointmentStatus;
  statusReason?: string;
  statusUpdatedAt?: string;
} {
  if (!rawNotes) return { status: "scheduled" };
  const start = rawNotes.lastIndexOf(META_PREFIX);
  if (start === -1) return { notes: rawNotes, status: "scheduled" };
  const end = rawNotes.indexOf(META_SUFFIX, start + META_PREFIX.length);
  if (end === -1) return { notes: rawNotes, status: "scheduled" };

  const visibleNotes =
    `${rawNotes.slice(0, start)}${rawNotes.slice(end + META_SUFFIX.length)}`.trim() ||
    undefined;
  const encoded = rawNotes.slice(start + META_PREFIX.length, end);
  try {
    const parsed = JSON.parse(atob(encoded)) as {
      status?: string;
      statusReason?: string;
      statusUpdatedAt?: string;
    };
    return {
      notes: visibleNotes,
      status: normalizeAppointmentStatus(parsed.status),
      statusReason: parsed.statusReason,
      statusUpdatedAt: parsed.statusUpdatedAt,
    };
  } catch {
    return { notes: rawNotes, status: "scheduled" };
  }
}

export function buildAppointmentNotesWithMeta(
  notes: string | undefined,
  appointment: Pick<Appointment, "status" | "statusReason" | "statusUpdatedAt">,
): string | undefined {
  const status = normalizeAppointmentStatus(appointment.status);
  const cleanNotes = notes?.trim();
  if (status === "scheduled" && !appointment.statusReason) return cleanNotes;

  const meta = {
    status,
    statusReason: appointment.statusReason,
    statusUpdatedAt: appointment.statusUpdatedAt,
  };
  return `${cleanNotes ?? ""}${META_PREFIX}${btoa(JSON.stringify(meta))}${META_SUFFIX}`;
}

export function getCalendarHourPx(settings: Settings): number {
  switch (settings.calendarDensity) {
    case "comfortable":
      return 72;
    case "dense":
      return 36;
    default:
      return 48;
  }
}
