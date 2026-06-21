import { useShallow } from "zustand/shallow";
import {
  DEFAULT_BLOCKED_TIME_COLOR,
  isActiveAppointment,
  isBlockedTime,
} from "../../lib/appointmentLifecycle";
import {
  formatDate,
  formatDuration,
  formatPrice,
  formatTime12,
  hexToRgba,
} from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { Appointment, AppointmentModalState } from "../../types";

interface Props {
  anchorDate: string; // YYYY-MM-DD, first date to show from
  onModalChange: (state: AppointmentModalState) => void;
}

// Group appointments by date and show in chronological list
export function AgendaView({ anchorDate, onModalChange }: Props) {
  const { appointments, settings } = useAppStore(
    useShallow((s) => ({
      appointments: s.appointments,
      settings: s.settings,
    })),
  );
  const blockedTimeColor =
    settings.blockedTimeColor ?? DEFAULT_BLOCKED_TIME_COLOR;

  // Show 60 days forward and 14 days back from anchor
  const start = new Date(`${anchorDate}T00:00:00`);
  start.setDate(start.getDate() - 14);
  const end = new Date(`${anchorDate}T00:00:00`);
  end.setDate(end.getDate() + 60);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const todayStr = new Date().toISOString().slice(0, 10);

  // Group appointments in range by date
  const byDate = new Map<string, Appointment[]>();
  for (const appt of appointments) {
    if (appt.date < startStr || appt.date > endStr) continue;
    if (!isActiveAppointment(appt)) continue;
    const list = byDate.get(appt.date) ?? [];
    list.push(appt);
    byDate.set(appt.date, list);
  }

  // Sort each day's appointments by start time
  for (const [, list] of byDate) {
    list.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  // Sorted date list — only days with appointments
  const sortedDates = [...byDate.keys()].sort();

  if (sortedDates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center px-4">
        <p className="text-muted-foreground text-sm">
          No appointments in the next 60 days.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto" data-ocid="calendar.agenda">
      {sortedDates.map((dateStr) => {
        const appts = byDate.get(dateStr) ?? [];
        const isToday = dateStr === todayStr;
        const isPast = dateStr < todayStr;
        const d = new Date(`${dateStr}T00:00:00`);
        const dayLabel = d.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

        return (
          <div key={dateStr} data-ocid={`agenda.day.${dateStr}`}>
            {/* Date header */}
            <div
              className={`sticky top-0 z-10 px-4 py-2 border-b border-border flex items-center gap-2 ${
                isToday ? "bg-accent/10" : isPast ? "bg-muted/30" : "bg-card"
              }`}
            >
              {isToday && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-accent-foreground text-[10px] font-bold flex-shrink-0">
                  {d.getDate()}
                </span>
              )}
              <span
                className={`text-sm font-semibold ${isToday ? "text-accent" : isPast ? "text-muted-foreground" : "text-foreground"}`}
              >
                {isToday ? `Today — ${dayLabel}` : dayLabel}
              </span>
              <span className="ml-auto text-xs text-muted-foreground">
                $
                {appts
                  .filter((appointment) => !isBlockedTime(appointment))
                  .reduce((s, a) => s + a.price, 0)
                  .toFixed(0)}
              </span>
            </div>

            {/* Appointments */}
            <div className="divide-y divide-border/40">
              {appts.map((appt) => (
                <AgendaRow
                  key={appt.id}
                  appt={appt}
                  isPast={isPast}
                  blockedTimeColor={blockedTimeColor}
                  onEdit={() =>
                    onModalChange({
                      isOpen: true,
                      mode: "edit",
                      appointment: appt,
                    })
                  }
                />
              ))}
            </div>
          </div>
        );
      })}
      <div className="h-8" />
    </div>
  );
}

function AgendaRow({
  appt,
  isPast,
  blockedTimeColor,
  onEdit,
}: {
  appt: Appointment;
  isPast: boolean;
  blockedTimeColor: string;
  onEdit: () => void;
}) {
  const blocked = isBlockedTime(appt);
  const displayColor = blocked ? blockedTimeColor : appt.color;
  return (
    <button
      type="button"
      className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 active:bg-muted/60 transition-colors ${isPast ? "opacity-60" : ""}`}
      onClick={onEdit}
      data-ocid="agenda.appointment_row"
    >
      {/* Color stripe */}
      <div
        className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[36px]"
        style={{ backgroundColor: displayColor }}
      />

      {/* Time */}
      <div className="flex flex-col items-start flex-shrink-0 min-w-[58px]">
        <span className="text-sm font-bold text-foreground leading-tight">
          {formatTime12(appt.startTime)}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">
          {formatDuration(appt.durationMinutes)}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">
          {blocked
            ? `Blocked: ${appt.blockReason ?? appt.clientName}`
            : appt.clientName}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {blocked ? "Unavailable" : appt.serviceName}
        </p>
        {appt.notes && (
          <p className="text-xs text-muted-foreground/70 truncate italic mt-0.5">
            {appt.notes}
          </p>
        )}
      </div>

      {/* Price + color chip */}
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        {!blocked && (
          <span className="text-sm font-semibold text-accent">
            ${formatPrice(appt.price)}
          </span>
        )}
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: hexToRgba(displayColor, 0.8) }}
        />
      </div>
    </button>
  );
}
