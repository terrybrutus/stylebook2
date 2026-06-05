import { CalendarCheck, Plus, Scissors } from "lucide-react";
import { useState } from "react";
import AppointmentModal from "../components/AppointmentModal";
import QuickRebook from "../components/QuickRebook";
import {
  formatDate,
  formatDuration,
  formatPrice,
  formatTime12,
  getTodayString,
} from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type { Appointment } from "../types";

export default function Today() {
  const today = getTodayString();
  const appointments = useAppStore((s) =>
    s.appointments
      .filter((a) => a.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime)),
  );

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    appointment?: Appointment;
    prefillDate?: string;
    prefillTime?: string;
  }>({
    isOpen: false,
    mode: "create",
  });

  const displayDate = formatDate(today, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  function openCreate() {
    setModalState({ isOpen: true, mode: "create", prefillDate: today });
  }

  function openEdit(appt: Appointment) {
    setModalState({ isOpen: true, mode: "edit", appointment: appt });
  }

  function closeModal() {
    setModalState((s) => ({ ...s, isOpen: false }));
  }

  const [rebookPrefill, setRebookPrefill] = useState<{
    clientName: string;
    serviceId: string;
  } | null>(null);

  function handleRebook(clientName: string, serviceId: string) {
    setRebookPrefill({ clientName, serviceId });
    setModalState({
      isOpen: true,
      mode: "create",
      prefillDate: today,
      appointment: undefined,
    });
  }

  return (
    <div className="flex flex-col h-full" data-ocid="today.page">
      {/* Date header */}
      <div className="px-4 pt-5 pb-3 border-b border-border bg-card flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarCheck size={20} className="text-accent" />
            <h1 className="text-xl font-semibold">{displayDate}</h1>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
            data-ocid="today.add_button"
          >
            <Plus size={15} />
            Add
          </button>
        </div>
        <p className="text-sm text-muted-foreground mt-0.5">
          {appointments.length === 0
            ? "No appointments today"
            : `${appointments.length} appointment${appointments.length !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        {/* Appointment list */}
        <div className="px-4 py-4">
          {appointments.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-14 text-center"
              data-ocid="today.empty_state"
            >
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Scissors size={28} className="text-muted-foreground/50" />
              </div>
              <h2 className="text-base font-semibold mb-1">
                No appointments today
              </h2>
              <p className="text-sm text-muted-foreground mb-5">
                Tap + to add one.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors"
                data-ocid="today.empty_add_button"
              >
                <Plus size={16} />
                Add Appointment
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3" data-ocid="today.list">
              {appointments.map((appt, i) => (
                <AppointmentCard
                  key={appt.id}
                  appointment={appt}
                  index={i + 1}
                  onEdit={() => openEdit(appt)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Quick Rebook section */}
        {appointments.length > 0 && (
          <div className="border-t border-border mt-2 pt-4">
            <QuickRebook onRebook={handleRebook} />
          </div>
        )}

        {/* Show Quick Rebook even on empty day if past clients exist */}
        {appointments.length === 0 && (
          <div className="border-t border-border">
            <QuickRebook onRebook={handleRebook} />
          </div>
        )}
      </div>

      {/* FAB for mobile — only shown when list has items */}
      {appointments.length > 0 && (
        <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40">
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center justify-center w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-lg hover:bg-accent/90 transition-colors"
            aria-label="Add appointment"
            data-ocid="today.fab_add_button"
          >
            <Plus size={24} />
          </button>
        </div>
      )}

      {/* Appointment Modal */}
      <AppointmentModal
        key={
          modalState.isOpen
            ? `open-${rebookPrefill?.clientName ?? ""}`
            : "closed"
        }
        isOpen={modalState.isOpen}
        onClose={() => {
          closeModal();
          setRebookPrefill(null);
        }}
        mode={modalState.mode}
        appointment={modalState.appointment}
        prefillDate={modalState.prefillDate ?? today}
        prefillTime={modalState.prefillTime}
        prefillClientName={rebookPrefill?.clientName}
        prefillServiceId={rebookPrefill?.serviceId}
      />
    </div>
  );
}

interface AppointmentCardProps {
  appointment: Appointment;
  index: number;
  onEdit: () => void;
}

function AppointmentCard({ appointment, index, onEdit }: AppointmentCardProps) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="flex gap-3 p-4 rounded-xl border border-border bg-card shadow-xs hover:shadow-sm transition-all cursor-pointer text-left w-full group"
      style={{ borderLeftColor: appointment.color, borderLeftWidth: 4 }}
      data-ocid={`today.item.${index}`}
    >
      {/* Time column */}
      <div className="flex flex-col items-start min-w-[58px] shrink-0">
        <span className="text-sm font-bold text-foreground leading-tight">
          {formatTime12(appointment.startTime)}
        </span>
        <span className="text-xs text-muted-foreground mt-0.5">
          {formatDuration(appointment.durationMinutes)}
        </span>
      </div>

      {/* Divider dot */}
      <div className="flex flex-col items-center pt-1 shrink-0">
        <div
          className="w-2 h-2 rounded-full mt-0.5"
          style={{ backgroundColor: appointment.color }}
        />
        <div
          className="w-px flex-1 mt-1"
          style={{ backgroundColor: `${appointment.color}40` }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight">
          {appointment.clientName}
        </p>
        <p
          className="text-sm text-muted-foreground mt-0.5 break-words"
          style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
        >
          {appointment.serviceName}
        </p>
        <p className="text-sm font-semibold text-accent mt-1">
          ${formatPrice(appointment.price)}
        </p>
        {appointment.notes && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 italic">
            {appointment.notes}
          </p>
        )}
      </div>
    </button>
  );
}
