import type { Appointment } from "../types";
import {
  isBlockedTime,
  normalizeAppointmentStatus,
} from "./appointmentLifecycle";

export function compareAppointmentDateTime(a: Appointment, b: Appointment) {
  const dateCompare = a.date.localeCompare(b.date);
  return dateCompare !== 0
    ? dateCompare
    : a.startTime.localeCompare(b.startTime);
}

export function isClientRecord(appointment: Appointment): boolean {
  return !isBlockedTime(appointment);
}

export function isCompletedClientAppointment(
  appointment: Appointment,
): boolean {
  return (
    isClientRecord(appointment) &&
    normalizeAppointmentStatus(appointment.status) === "completed"
  );
}

export function isScheduledClientAppointment(
  appointment: Appointment,
): boolean {
  return (
    isClientRecord(appointment) &&
    normalizeAppointmentStatus(appointment.status) === "scheduled"
  );
}

export function isUpcomingClientAppointment(
  appointment: Appointment,
  today: string,
): boolean {
  return isScheduledClientAppointment(appointment) && appointment.date >= today;
}

export function isPastUnresolvedClientAppointment(
  appointment: Appointment,
  today: string,
): boolean {
  return isScheduledClientAppointment(appointment) && appointment.date < today;
}

export function getCompletedAppointments(appointments: Appointment[]) {
  return appointments
    .filter(isCompletedClientAppointment)
    .sort(compareAppointmentDateTime);
}

export function getUpcomingAppointments(
  appointments: Appointment[],
  today: string,
) {
  return appointments
    .filter((appointment) => isUpcomingClientAppointment(appointment, today))
    .sort(compareAppointmentDateTime);
}

export function getPastUnresolvedAppointments(
  appointments: Appointment[],
  today: string,
) {
  return appointments
    .filter((appointment) =>
      isPastUnresolvedClientAppointment(appointment, today),
    )
    .sort(compareAppointmentDateTime);
}

export function sumAppointmentPrice(appointments: Appointment[]): number {
  return appointments.reduce((sum, appointment) => sum + appointment.price, 0);
}
