import {
  CalendarCheck,
  MessageSquare,
  Plus,
  Scissors,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import AppointmentModal from "../components/AppointmentModal";
import QuickRebook from "../components/QuickRebook";
import { isActiveAppointment } from "../lib/appointmentLifecycle";
import {
  dateToString,
  formatDate,
  formatDuration,
  formatPrice,
  formatTime12,
  getTodayString,
  getWeekDates,
} from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type { Appointment } from "../types";

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function findConflicts(appts: Appointment[]) {
  const pairs: [Appointment, Appointment][] = [];
  for (let i = 0; i < appts.length; i++) {
    for (let j = i + 1; j < appts.length; j++) {
      const a = appts[i];
      const b = appts[j];
      const aEnd = timeToMinutes(a.startTime) + a.durationMinutes;
      const bEnd = timeToMinutes(b.startTime) + b.durationMinutes;
      if (
        timeToMinutes(a.startTime) < bEnd &&
        timeToMinutes(b.startTime) < aEnd
      ) {
        pairs.push([a, b]);
      }
    }
  }
  return pairs;
}

export default function Today() {
  const today = getTodayString();
  const { allAppointments, settings } = useAppStore(
    useShallow((s) => ({
      allAppointments: s.appointments,
      settings: s.settings,
    })),
  );

  const appointments = useMemo(
    () =>
      allAppointments
        .filter((a) => a.date === today && isActiveAppointment(a))
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [allAppointments, today],
  );

  // Week stats
  const weekDates = useMemo(
    () =>
      getWeekDates(new Date(), settings.startWeekOnMonday).map(dateToString),
    [settings.startWeekOnMonday],
  );
  const weekAppts = useMemo(
    () =>
      allAppointments.filter(
        (a) => weekDates.includes(a.date) && isActiveAppointment(a),
      ),
    [allAppointments, weekDates],
  );
  const weekRevenue = weekAppts.reduce((s, a) => s + a.price, 0);

  // Month stats
  const monthPrefix = today.slice(0, 7);
  const monthAppts = useMemo(
    () =>
      allAppointments.filter(
        (a) => a.date.startsWith(monthPrefix) && isActiveAppointment(a),
      ),
    [allAppointments, monthPrefix],
  );
  const monthRevenue = monthAppts.reduce((s, a) => s + a.price, 0);

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

  const conflictPairs = findConflicts(appointments);

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
        {appointments.length === 0 ? (
          <p className="text-sm text-muted-foreground mt-0.5">
            No appointments today
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-0.5">
            {appointments.length} appointment
            {appointments.length !== 1 ? "s" : ""} ·{" "}
            <span className="font-semibold text-accent ml-1">
              ${appointments.reduce((sum, a) => sum + a.price, 0).toFixed(2)}{" "}
              projected
            </span>
          </p>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-auto">
        {/* Stats panel — week & month at a glance */}
        <div className="px-4 pt-3 pb-1" data-ocid="today.stats">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={13} className="text-muted-foreground" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Revenue
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                This Week
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                ${weekRevenue.toFixed(0)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {weekAppts.length} appointment
                {weekAppts.length !== 1 ? "s" : ""}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-card px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                This Month
              </p>
              <p className="text-lg font-bold text-foreground mt-0.5">
                ${monthRevenue.toFixed(0)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {monthAppts.length} appointment
                {monthAppts.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Appointment list */}
        <div className="px-4 py-3">
          {appointments.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-10 text-center"
              data-ocid="today.empty_state"
            >
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Scissors size={24} className="text-muted-foreground/50" />
              </div>
              <h2 className="text-base font-semibold mb-1">
                No appointments today
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
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

        {/* Scheduling conflicts */}
        {conflictPairs.length > 0 && (
          <div className="mx-4 mb-4 p-3 bg-destructive/10 border border-destructive/30 rounded-xl">
            <p className="text-sm font-bold text-destructive mb-2">
              Scheduling Conflicts ({conflictPairs.length})
            </p>
            {conflictPairs.map(([a, b]) => (
              <div
                key={`${a.id}-${b.id}`}
                className="text-xs text-destructive/80 flex flex-wrap gap-1 mb-1"
              >
                <button
                  type="button"
                  className="underline font-semibold"
                  onClick={() => openEdit(a)}
                >
                  {a.clientName} ({a.serviceName})
                </button>
                <span>overlaps</span>
                <button
                  type="button"
                  className="underline font-semibold"
                  onClick={() => openEdit(b)}
                >
                  {b.clientName} ({b.serviceName})
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Quick Rebook */}
        <div className="border-t border-border mt-1">
          <QuickRebook onRebook={handleRebook} />
        </div>
      </div>

      {/* FAB — only when list has items */}
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

// ─── Appointment Card ─────────────────────────────────────────────────────────

interface AppointmentCardProps {
  appointment: Appointment;
  index: number;
  onEdit: () => void;
}

function AppointmentCard({ appointment, index, onEdit }: AppointmentCardProps) {
  const smsBody = encodeURIComponent(
    `Hi ${appointment.clientName}, just a reminder about your ${appointment.serviceName} appointment on ${formatDate(appointment.date, { weekday: "long", month: "long", day: "numeric" })} at ${formatTime12(appointment.startTime)}. See you then! 💇`,
  );

  return (
    <div className="relative" data-ocid={`today.item.${index}`}>
      <button
        type="button"
        onClick={onEdit}
        className="flex gap-3 p-4 rounded-xl border border-border bg-card shadow-xs hover:shadow-sm transition-all cursor-pointer text-left w-full"
        style={{ borderLeftColor: appointment.color, borderLeftWidth: 4 }}
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
        <div className="flex-1 min-w-0 pr-8">
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

      {/* SMS reminder — only if phone number exists */}
      {appointment.phoneNumber && (
        <a
          href={`sms:${appointment.phoneNumber}&body=${smsBody}`}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors"
          aria-label="Send reminder text"
          title="Send reminder text"
          onClick={(e) => e.stopPropagation()}
          data-ocid={`today.item.${index}.sms`}
        >
          <MessageSquare size={16} />
        </a>
      )}
    </div>
  );
}
