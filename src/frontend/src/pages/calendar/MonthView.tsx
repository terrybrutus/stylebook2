import { useEffect, useState } from "react";
import { useShallow } from "zustand/shallow";
import AppointmentCancelModal from "../../components/AppointmentCancelModal";
import * as api from "../../lib/api";
import {
  DEFAULT_BLOCKED_TIME_COLOR,
  isActiveAppointment,
  isBlockedTime,
} from "../../lib/appointmentLifecycle";
import {
  dateToString,
  formatTime12,
  getMonthGrid,
  getWorkingScheduleForDate,
  hexToRgba,
} from "../../lib/utils";
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
  const _now = new Date();
  const todayStr = `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [cancelAppointment, setCancelAppointment] =
    useState<Appointment | null>(null);

  useEffect(() => {
    if (!contextMenu) return;
    function handler() {
      setContextMenu(null);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const grid = getMonthGrid(year, month, settings.startWeekOnMonday);
  const dayNames = settings.startWeekOnMonday ? DAY_NAMES_MON : DAY_NAMES_SUN;
  const blockedTimeColor =
    settings.blockedTimeColor ?? DEFAULT_BLOCKED_TIME_COLOR;

  function getAppts(dateStr: string) {
    return appointments.filter(
      (a) => a.date === dateStr && isActiveAppointment(a),
    );
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
          const sortedAppts = [...dayAppts].sort((a, b) =>
            a.startTime.localeCompare(b.startTime),
          );
          const visibleAppts = sortedAppts.slice(0, 3);
          const hiddenCount = sortedAppts.length - visibleAppts.length;

          return (
            <button
              key={dateStr}
              type="button"
              className={`border-r border-b border-border p-1 cursor-pointer transition-colors flex flex-col gap-0.5 overflow-hidden min-h-[80px] text-left w-full ${i % 7 === 0 ? "border-l border-border" : ""}`}
              style={{
                backgroundColor: !isCurrentMonth
                  ? "rgba(0,0,0,0.08)"
                  : !isWorkingDay
                    ? "rgba(0,0,0,0.18)"
                    : undefined,
              }}
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
                  <span className="text-[9px] font-medium text-muted-foreground leading-none px-1 py-0.5 rounded bg-muted/60">
                    {dayAppts.length} {dayAppts.length === 1 ? "appt" : "appts"}
                  </span>
                )}
              </div>

              {/* Appointment pills */}
              {visibleAppts.map((appt) => (
                <MonthPill
                  key={appt.id}
                  appt={appt}
                  blockedTimeColor={blockedTimeColor}
                  onEdit={(e) => {
                    e.stopPropagation();
                    onModalChange({
                      isOpen: true,
                      mode: "edit",
                      appointment: appt,
                    });
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setContextMenu({
                      x: e.clientX,
                      y: e.clientY,
                      appointment: appt,
                    });
                  }}
                  onLongPress={(x, y) =>
                    setContextMenu({ x, y, appointment: appt })
                  }
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
              if (isBlockedTime(contextMenu.appointment)) {
                setContextMenu(null);
                return;
              }
              onModalChange({
                isOpen: true,
                mode: "edit",
                appointment: contextMenu.appointment,
              });
              setContextMenu(null);
            }}
          >
            {isBlockedTime(contextMenu.appointment) ? "Blocked time" : "Edit"}
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors"
            onClick={() => {
              if (isBlockedTime(contextMenu.appointment)) {
                deleteAppointment(contextMenu.appointment.id);
                api
                  .deleteAppointment(contextMenu.appointment.id)
                  .catch(console.error);
                setContextMenu(null);
                return;
              }
              setCancelAppointment(contextMenu.appointment);
              setContextMenu(null);
            }}
          >
            {isBlockedTime(contextMenu.appointment)
              ? "Remove block"
              : "Cancel / no-show"}
          </button>
        </div>
      )}
      <AppointmentCancelModal
        appointment={cancelAppointment}
        onClose={() => setCancelAppointment(null)}
      />
    </div>
  );
}

function MonthPill({
  appt,
  blockedTimeColor,
  onEdit,
  onContextMenu,
  onLongPress,
}: {
  appt: Appointment;
  blockedTimeColor: string;
  onEdit: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onLongPress: (x: number, y: number) => void;
}) {
  const timerRef = { current: null as ReturnType<typeof setTimeout> | null };
  const blocked = isBlockedTime(appt);
  const pillColor = blocked ? blockedTimeColor : appt.color;
  return (
    <button
      type="button"
      className="rounded px-1.5 py-1 text-left w-full cursor-pointer hover:opacity-90 flex flex-col gap-0"
      style={{
        backgroundColor: blocked ? pillColor : hexToRgba(pillColor, 0.8),
        color: blocked ? "#fff" : "#222",
      }}
      onClick={onEdit}
      onContextMenu={onContextMenu}
      onTouchStart={(e) => {
        const t = e.touches[0];
        timerRef.current = setTimeout(
          () => onLongPress(t.clientX, t.clientY),
          500,
        );
      }}
      onTouchEnd={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
      }}
      onTouchMove={() => {
        if (timerRef.current) clearTimeout(timerRef.current);
      }}
      data-ocid="appointment.pill"
    >
      <span className="text-[10px] font-bold leading-tight truncate">
        {blocked ? (appt.blockReason ?? appt.clientName) : appt.clientName}
      </span>
      <span className="text-[9px] leading-tight opacity-75 truncate">
        {formatTime12(appt.startTime)} · {appt.serviceName}
      </span>
    </button>
  );
}
