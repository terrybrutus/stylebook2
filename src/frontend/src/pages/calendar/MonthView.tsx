import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import * as api from "../../lib/api";
import { dateToString, formatTime12, getMonthGrid, getWorkingScheduleForDate, hexToRgba } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { Appointment, AppointmentModalState } from "../../types";

interface ContextMenu {
  x: number;
  y: number;
  appointment: Appointment;
}

interface Props {
  year: number;
  month: number; // 0-indexed
  onDayClick: (date: string) => void;
  onModalChange: (state: AppointmentModalState) => void;
}

const DAY_NAMES_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function MonthView({ year, month, onDayClick, onModalChange }: Props) {
  const { settings, appointments, deleteAppointment } = useAppStore(
    useShallow((s) => ({
      settings: s.settings,
      appointments: s.appointments,
      deleteAppointment: s.deleteAppointment,
    })),
  );
  const todayStr = new Date().toISOString().slice(0, 10);
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    function handler() { setContextMenu(null); }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

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
          const sched = getWorkingScheduleForDate(dateStr, settings);
          const isWorkingDay = sched.enabled;
          const sortedAppts = [...dayAppts].sort((a, b) => a.startTime.localeCompare(b.startTime));
          const visibleAppts = sortedAppts.slice(0, 3);
          const hiddenCount = sortedAppts.length - visibleAppts.length;

          return (
            <button
              key={dateStr}
              type="button"
              className={`border-r border-b border-border p-1 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col gap-0.5 overflow-hidden min-h-[80px] text-left w-full ${
                !isCurrentMonth ? "bg-muted/40" : !isWorkingDay ? "bg-muted/30" : "bg-background"
              } ${i % 7 === 0 ? "border-l border-border" : ""}`}
              onClick={() => onDayClick(dateStr)}
              onContextMenu={(e) => e.preventDefault()}
              data-ocid={`calendar.month.day.${i + 1}`}
            >
              {/* Day number */}
              <div className="flex items-center justify-between px-0.5 mb-0.5">
                <span
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                    isToday
                      ? "bg-accent text-accent-foreground font-bold"
                      : isCurrentMonth && isWorkingDay
                        ? "text-foreground"
                        : "text-muted-foreground/50"
                  }`}
                >
                  {date.getDate()}
                </span>
                {dayAppts.length > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-foreground text-[9px] font-bold leading-none">
                    {dayAppts.length}
                  </span>
                )}
              </div>

              {/* Appointment pills */}
              {visibleAppts.map((appt) => (
                <MonthPill
                  key={appt.id}
                  appt={appt}
                  onEdit={(e) => {
                    e.stopPropagation();
                    onModalChange({ isOpen: true, mode: "edit", appointment: appt });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({ x: e.clientX, y: e.clientY, appointment: appt });
                  }}
                  onLongPress={(x, y) => setContextMenu({ x, y, appointment: appt })}
                />
              ))}
              {hiddenCount > 0 && (
                <span className="text-[10px] text-muted-foreground px-1 font-medium">
                  +{hiddenCount} more
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          role="menu"
          tabIndex={-1}
        >
          <button
            type="button"
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            onClick={() => {
              onModalChange({ isOpen: true, mode: "edit", appointment: contextMenu.appointment });
              setContextMenu(null);
            }}
          >
            Edit
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors"
            onClick={() => {
              const id = contextMenu.appointment.id;
              deleteAppointment(id);
              api.deleteAppointment(id).catch(console.error);
              setContextMenu(null);
            }}
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

function MonthPill({
  appt,
  onEdit,
  onContextMenu,
  onLongPress,
}: {
  appt: Appointment;
  onEdit: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onLongPress: (x: number, y: number) => void;
}) {
  const timerRef = { current: null as ReturnType<typeof setTimeout> | null };
  return (
    <button
      type="button"
      className="rounded px-1.5 py-1 text-left w-full cursor-pointer hover:opacity-90 flex flex-col gap-0"
      style={{ backgroundColor: hexToRgba(appt.color, 0.8), color: "#222" }}
      onClick={onEdit}
      onContextMenu={onContextMenu}
      onTouchStart={(e) => {
        const t = e.touches[0];
        timerRef.current = setTimeout(() => onLongPress(t.clientX, t.clientY), 500);
      }}
      onTouchEnd={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
      onTouchMove={() => { if (timerRef.current) clearTimeout(timerRef.current); }}
      data-ocid="appointment.pill"
    >
      <span className="text-[10px] font-bold leading-tight truncate">{appt.clientName}</span>
      <span className="text-[9px] leading-tight opacity-75 truncate">{formatTime12(appt.startTime)} · {appt.serviceName}</span>
    </button>
  );
}
