import { useShallow } from "zustand/shallow";
import { dateToString, getMonthGrid, hexToRgba } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { AppointmentModalState } from "../../types";

interface Props {
  year: number;
  month: number; // 0-indexed
  onDayClick: (date: string) => void;
  onModalChange: (state: AppointmentModalState) => void;
}

const DAY_NAMES_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthView({ year, month, onDayClick, onModalChange }: Props) {
  const settings = useAppStore(useShallow((s) => s.settings));
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const todayStr = new Date().toISOString().slice(0, 10);

  const grid = getMonthGrid(year, month, settings.startWeekOnMonday);
  const dayNames = settings.startWeekOnMonday ? DAY_NAMES_MON : DAY_NAMES_SUN;

  function getAppts(dateStr: string) {
    return appointments.filter((a) => a.date === dateStr);
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden bg-background"
      data-ocid="calendar.month_grid"
    >
      {/* Day header row */}
      <div className="grid grid-cols-7 border-b border-border flex-shrink-0">
        {dayNames.map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold text-muted-foreground"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {grid.map((date, i) => {
          const dateStr = dateToString(date);
          const isCurrentMonth = date.getMonth() === month;
          const isToday = dateStr === todayStr;
          const dayAppts = getAppts(dateStr);

          return (
            <button
              key={dateStr}
              type="button"
              className={`border-r border-b border-border p-1 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col gap-0.5 overflow-hidden min-h-[72px] text-left w-full ${
                !isCurrentMonth ? "bg-muted/10" : "bg-white"
              } ${i % 7 === 0 ? "border-l border-border" : ""}`}
              onClick={() => onDayClick(dateStr)}
              data-ocid={`calendar.month.day.${i + 1}`}
            >
              {/* Day number */}
              <div className="flex justify-end">
                <span
                  className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-accent text-accent-foreground font-bold"
                      : isCurrentMonth
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {date.getDate()}
                </span>
              </div>

              {/* Appointment pills */}
              {dayAppts.slice(0, 3).map((appt) => (
                <button
                  key={appt.id}
                  type="button"
                  className="rounded px-1 py-0.5 text-[9px] font-medium truncate leading-tight cursor-pointer hover:opacity-90 text-left w-full"
                  style={{
                    backgroundColor: hexToRgba(appt.color, 0.75),
                    color: "#222",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onModalChange({
                      isOpen: true,
                      mode: "edit",
                      appointment: appt,
                    });
                  }}
                  data-ocid="appointment.pill"
                >
                  {appt.clientName}
                </button>
              ))}
              {dayAppts.length > 3 && (
                <span className="text-[9px] text-muted-foreground px-1">
                  +{dayAppts.length - 3} more
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
