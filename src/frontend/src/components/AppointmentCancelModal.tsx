import { useState } from "react";
import * as api from "../lib/api";
import { APPOINTMENT_STATUS_LABELS } from "../lib/appointmentLifecycle";
import { useAppStore } from "../store/useAppStore";
import type { Appointment, AppointmentStatus } from "../types";

const STATUS_OPTIONS: {
  status: Extract<AppointmentStatus, "canceled" | "no_show" | "rescheduled">;
  label: string;
  description: string;
}[] = [
  {
    status: "canceled",
    label: "Canceled",
    description: "Client or stylist canceled and this should stay in history.",
  },
  {
    status: "no_show",
    label: "No-show",
    description: "Client missed the appointment without completing it.",
  },
  {
    status: "rescheduled",
    label: "Rescheduled",
    description: "Original slot was replaced by another appointment time.",
  },
];

interface Props {
  appointment: Appointment | null;
  onClose: () => void;
}

export default function AppointmentCancelModal({
  appointment,
  onClose,
}: Props) {
  const updateAppointment = useAppStore((s) => s.updateAppointment);
  const deleteAppointment = useAppStore((s) => s.deleteAppointment);
  const [selected, setSelected] =
    useState<(typeof STATUS_OPTIONS)[number]["status"]>("canceled");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!appointment) return null;

  async function markStatus() {
    if (!appointment) return;
    const updated: Appointment = {
      ...appointment,
      status: selected,
      statusReason: reason.trim() || undefined,
      statusUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    updateAppointment(updated);
    setIsSaving(true);
    try {
      await api.updateAppointment(appointment.id, {
        clientName: updated.clientName,
        serviceId: updated.serviceId,
        serviceName: updated.serviceName,
        date: updated.date,
        startTime: updated.startTime,
        durationMinutes: updated.durationMinutes,
        price: updated.price,
        phoneNumber: updated.phoneNumber,
        notes: updated.notes,
        phases: updated.phases,
        color: updated.color,
        status: updated.status,
        statusReason: updated.statusReason,
        statusUpdatedAt: updated.statusUpdatedAt,
      });
      onClose();
    } catch (err) {
      console.error("Appointment status update failed", err);
      updateAppointment(appointment);
    } finally {
      setIsSaving(false);
    }
  }

  async function removeCompletely() {
    if (!appointment) return;
    if (
      !window.confirm(
        "Permanently delete this appointment? This removes it from client history too.",
      )
    ) {
      return;
    }
    deleteAppointment(appointment.id);
    setIsSaving(true);
    try {
      await api.deleteAppointment(appointment.id);
      onClose();
    } catch (err) {
      console.error("Appointment delete failed", err);
      updateAppointment(appointment);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-card shadow-2xl border border-border p-5">
        <p className="text-base font-semibold">Cancel appointment</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose how to record {appointment.clientName}'s appointment. It will
          be removed from the active calendar but kept on the client profile.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.status}
              type="button"
              onClick={() => setSelected(option.status)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                selected === option.status
                  ? "border-accent bg-accent/10"
                  : "border-border hover:bg-muted/50"
              }`}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="block text-xs text-muted-foreground mt-0.5">
                {option.description}
              </span>
            </button>
          ))}
        </div>

        <label
          htmlFor="cancel-reason"
          className="mt-4 block text-sm font-medium"
        >
          Note or reason
        </label>
        <textarea
          id="cancel-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder={`Optional note for ${APPOINTMENT_STATUS_LABELS[selected].toLowerCase()}`}
          className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
        />

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={markStatus}
            disabled={isSaving}
            className="flex-1 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground disabled:opacity-50"
          >
            Save status
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            Keep appointment
          </button>
        </div>

        <button
          type="button"
          onClick={removeCompletely}
          disabled={isSaving}
          className="mt-3 w-full rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
        >
          Permanently delete instead
        </button>
      </div>
    </div>
  );
}
