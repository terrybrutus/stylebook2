import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import {
  dateToString,
  formatDuration,
  formatPrice,
  formatTime12,
  generateTimeSlots,
  getWeekDates,
  hexToRgba,
} from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { Appointment, AppointmentModalState } from "../../types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// 2.5px per minute = 150px per hour
const MIN_PX = 2.5;
function timeStrToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToPx(minutes: number, startMinutes: number): number {
  return (minutes - startMinutes) * MIN_PX;
}

interface Props {
  anchorDate: Date;
  onModalChange: (state: AppointmentModalState) => void;
  onDayClick?: (date: string) => void;
}

interface ContextMenu {
  x: number;
  y: number;
  appointment: Appointment;
}

function getPhaseStartMinutes(phase: { startTime: string }): number {
  const timePart = phase.startTime.includes("T")
    ? phase.startTime.split("T")[1].slice(0, 5)
    : phase.startTime.slice(0, 5);
  const [h, m] = timePart.split(":").map(Number);
  return h * 60 + m;
}

function getBlockLabel(
  appt: Appointment,
  phaseIndex: number,
): { label: string; isProcessing: boolean } {
  if (appt.phases.length === 0) {
    return {
      label: `${appt.clientName} — ${appt.serviceName}`,
      isProcessing: false,
    };
  }
  const phase = appt.phases[phaseIndex];
  if (!phase) return { label: appt.clientName, isProcessing: false };
  if (phase.phaseType === "processing") {
    return { label: `${appt.clientName} — Processing`, isProcessing: true };
  }
  if (phaseIndex === 0) {
    return {
      label: `${appt.clientName} — ${appt.serviceName}`,
      isProcessing: false,
    };
  }
  return { label: `${appt.clientName} — ${phase.name}`, isProcessing: false };
}

export function WeekView({ anchorDate, onModalChange, onDayClick }: Props) {
  const { settings, allAppointments, deleteAppointment } = useAppStore(
    useShallow((s) => ({
      settings: s.settings,
      allAppointments: s.appointments,
      deleteAppointment: s.deleteAppointment,
    })),
  );

  const startHour = Number(settings.workingHoursStart.split(":")[0]);
  const endHour = Number(settings.workingHoursEnd.split(":")[0]);
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const totalMinutes = endMinutes - startMinutes;
  const totalPx = totalMinutes * MIN_PX;
  const timeSlots = generateTimeSlots(startHour, endHour);

  // Week dates respecting startWeekOnMonday setting
  const weekDates = getWeekDates(anchorDate, settings.startWeekOnMonday);

  const todayStr = dateToString(new Date());
  const [currentTimePx, setCurrentTimePx] = useState(() => {
    const now = new Date();
    return minutesToPx(now.getHours() * 60 + now.getMinutes(), startHour * 60);
  });
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Mobile 3-day swipe state
  const [mobileStartIdx, setMobileStartIdx] = useState(0);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setCurrentTimePx(
        minutesToPx(now.getHours() * 60 + now.getMinutes(), startMinutes),
      );
    }, 30000);
    return () => clearInterval(id);
  }, [startMinutes]);

  useEffect(() => {
    if (!contextMenu) return;
    function handler() {
      setContextMenu(null);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const handleSlotClick = useCallback(
    (dateStr: string, slot: string) => {
      onModalChange({
        isOpen: true,
        mode: "create",
        prefillDate: dateStr,
        prefillTime: slot,
      });
    },
    [onModalChange],
  );

  const handleApptClick = useCallback(
    (e: React.MouseEvent, appt: Appointment) => {
      e.stopPropagation();
      e.preventDefault();
      onModalChange({ isOpen: true, mode: "edit", appointment: appt });
    },
    [onModalChange],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, appt: Appointment) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, appointment: appt });
    },
    [],
  );

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleTouchStart(e: React.TouchEvent, appt: Appointment) {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      setContextMenu({ x: touch.clientX, y: touch.clientY, appointment: appt });
    }, 500);
  }

  function handleTouchEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  // Determine visible columns based on viewport
  // Mobile portrait: 3 visible, desktop: all 7
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobilePortrait(
        window.innerWidth < 768 && window.innerHeight > window.innerWidth,
      );
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const visibleDates = isMobilePortrait
    ? weekDates.slice(mobileStartIdx, mobileStartIdx + 3)
    : weekDates;

  function handleSwipeStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleSwipeEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 40) return;
    if (dx < 0) setMobileStartIdx((p) => Math.min(p + 3, 4));
    if (dx > 0) setMobileStartIdx((p) => Math.max(p - 3, 0));
  }

  // Build blocks per day
  type RenderBlock = {
    appt: Appointment;
    topPx: number;
    heightPx: number;
    isProcessing: boolean;
    label: string;
    color: string;
    phaseIndex: number;
  };

  function buildBlocks(dateStr: string): RenderBlock[] {
    const dayAppts = allAppointments.filter((a) => a.date === dateStr);
    const result: RenderBlock[] = [];
    for (const appt of dayAppts) {
      if (appt.phases.length === 0) {
        const apptStartMin = timeStrToMinutes(appt.startTime);
        const topPx = minutesToPx(apptStartMin, startMinutes);
        const heightPx = Math.max(appt.durationMinutes * MIN_PX, 20);
        result.push({
          appt,
          topPx,
          heightPx,
          isProcessing: false,
          label: `${appt.clientName} — ${appt.serviceName}`,
          color: appt.color,
          phaseIndex: -1,
        });
      } else {
        for (const [i, phase] of appt.phases.entries()) {
          const phaseStartMin = getPhaseStartMinutes(phase);
          const topPx = minutesToPx(phaseStartMin, startMinutes);
          const heightPx = Math.max(phase.durationMinutes * MIN_PX, 20);
          const { label, isProcessing } = getBlockLabel(appt, i);
          result.push({
            appt,
            topPx,
            heightPx,
            isProcessing,
            label,
            color: appt.color,
            phaseIndex: i,
          });
        }
      }
    }
    return result;
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden select-none"
      onTouchStart={isMobilePortrait ? handleSwipeStart : undefined}
      onTouchEnd={isMobilePortrait ? handleSwipeEnd : undefined}
    >
      {/* Day header row — sticky above the scroll area */}
      <div className="flex flex-shrink-0 border-b border-border bg-card">
        {/* Spacer matching time label column */}
        <div className="w-14 flex-shrink-0 border-r border-border" />
        {visibleDates.map((date) => {
          const dateStr = dateToString(date);
          const isToday = dateStr === todayStr;
          const dayLabel = DAY_LABELS[date.getDay()];
          const dayNum = date.getDate();
          return (
            <button
              key={dateStr}
              type="button"
              className="flex-1 flex flex-col items-center justify-center py-1.5 border-r border-border cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => onDayClick?.(dateStr)}
              data-ocid={`week.day_header.${dayNum}`}
            >
              <span
                className="text-[10px] uppercase tracking-wider font-medium"
                style={{ color: isToday ? "#00ADB5" : undefined }}
              >
                {dayLabel}
              </span>
              <span
                className="text-sm font-bold leading-none mt-0.5 w-7 h-7 flex items-center justify-center rounded-full"
                style={{
                  background: isToday ? "#00ADB5" : "transparent",
                  color: isToday ? "#fff" : undefined,
                }}
              >
                {dayNum}
              </span>
            </button>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div
        className="flex flex-1 overflow-auto"
        data-ocid="calendar.week_scroll"
      >
        <div className="flex min-w-0 w-full" style={{ height: totalPx }}>
          {/* Time labels */}
          <div
            className="w-14 flex-shrink-0 bg-background border-r border-border relative z-10"
            style={{ height: totalPx }}
          >
            {timeSlots.map((slot) => {
              const [sh, sm] = slot.split(":").map(Number);
              const slotMinutes = sh * 60 + sm;
              const top = minutesToPx(slotMinutes, startMinutes);
              const isHour = sm === 0;
              return (
                <div
                  key={slot}
                  className="absolute right-2"
                  style={{ top: top - 8 }}
                >
                  <span
                    className={`text-[10px] leading-none ${
                      isHour
                        ? "text-muted-foreground font-medium"
                        : "text-muted-foreground/50"
                    }`}
                  >
                    {isHour ? formatTime12(slot) : sm === 30 ? ":30" : ""}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Day columns */}
          {visibleDates.map((date) => {
            const dateStr = dateToString(date);
            const isToday = dateStr === todayStr;
            const blocks = buildBlocks(dateStr);

            return (
              <div
                key={dateStr}
                className="flex-1 relative border-r border-border bg-background"
                style={{ height: totalPx, minWidth: 0 }}
                data-ocid={`week.day_column.${dateStr}`}
              >
                {/* Horizontal guide lines across ALL columns including today */}
                {timeSlots.map((slot) => {
                  const [sh, sm] = slot.split(":").map(Number);
                  const top = minutesToPx(sh * 60 + sm, startMinutes);
                  const isHour = sm === 0;
                  return (
                    <div
                      key={slot}
                      className={`absolute left-0 right-0 pointer-events-none ${
                        isHour
                          ? "border-t border-border/60"
                          : "border-t border-border/25"
                      }`}
                      style={{ top }}
                    />
                  );
                })}

                {/* Clickable time slots — z-index 1 so appointment blocks win */}
                {timeSlots.map((slot) => {
                  const [sh, sm] = slot.split(":").map(Number);
                  const top = minutesToPx(sh * 60 + sm, startMinutes);
                  return (
                    <div
                      key={slot}
                      className="absolute left-0 right-0 cursor-pointer hover:bg-accent/5 transition-colors"
                      style={{ top, height: MIN_PX * 30, zIndex: 1 }}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSlotClick(dateStr, slot)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ")
                          handleSlotClick(dateStr, slot);
                      }}
                    />
                  );
                })}

                {/* Appointment blocks */}
                {blocks.map((block, idx) => (
                  <WeekBlock
                    key={`${block.appt.id}-${block.phaseIndex}-${idx}`}
                    block={block}
                    onEdit={handleApptClick}
                    onContextMenu={handleContextMenu}
                    onTouchStart={handleTouchStart}
                    onTouchEnd={handleTouchEnd}
                  />
                ))}

                {/* Current time red indicator — today only */}
                {isToday && currentTimePx >= 0 && currentTimePx <= totalPx && (
                  <div
                    className="absolute left-0 right-0 pointer-events-none z-20"
                    style={{ top: currentTimePx }}
                  >
                    <div className="relative">
                      <div className="absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" />
                      <div className="h-[2px] bg-red-500" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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
          data-ocid="appointment.dropdown_menu"
        >
          <button
            type="button"
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors"
            onClick={() => {
              onModalChange({
                isOpen: true,
                mode: "edit",
                appointment: contextMenu.appointment,
              });
              setContextMenu(null);
            }}
            data-ocid="appointment.edit_button"
          >
            Edit
          </button>
          <button
            type="button"
            className="w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors"
            onClick={() => {
              deleteAppointment(contextMenu.appointment.id);
              setContextMenu(null);
            }}
            data-ocid="appointment.delete_button"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

type WeekBlockProps = {
  block: {
    appt: Appointment;
    topPx: number;
    heightPx: number;
    isProcessing: boolean;
    label: string;
    color: string;
  };
  onEdit: (e: React.MouseEvent, appt: Appointment) => void;
  onContextMenu: (e: React.MouseEvent, appt: Appointment) => void;
  onTouchStart: (e: React.TouchEvent, appt: Appointment) => void;
  onTouchEnd: () => void;
};

function WeekBlock({
  block,
  onEdit,
  onContextMenu,
  onTouchStart,
  onTouchEnd,
}: WeekBlockProps) {
  const { appt, topPx, heightPx, isProcessing, label, color } = block;
  const isShort = heightPx < 50;

  // Processing phases at z-index 5, active/finishing phases at z-index 10
  const zIndex = isProcessing ? 5 : 10;

  const bgStyle = isProcessing
    ? {
        background: `repeating-linear-gradient(45deg, ${hexToRgba(color, 0.12)}, ${hexToRgba(color, 0.12)} 4px, ${hexToRgba(color, 0.35)} 4px, ${hexToRgba(color, 0.35)} 8px)`,
        borderColor: hexToRgba(color, 0.5),
      }
    : {
        backgroundColor: hexToRgba(color, 0.85),
        borderColor: color,
      };

  return (
    <button
      type="button"
      className="absolute left-0.5 right-0.5 rounded border overflow-hidden cursor-pointer select-none text-left"
      style={{
        top: topPx + 1,
        height: Math.max(heightPx - 2, 4),
        zIndex,
        ...bgStyle,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(e, appt);
      }}
      onContextMenu={(e) => onContextMenu(e, appt)}
      onTouchStart={(e) => onTouchStart(e, appt)}
      onTouchEnd={onTouchEnd}
      data-ocid="appointment.card"
    >
      <div className="px-1 py-0.5 h-full overflow-hidden flex flex-col">
        {isProcessing ? (
          // Processing phase: show client name so context is clear
          <span
            className="text-[9px] text-foreground/70 italic leading-tight"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          >
            {label}
          </span>
        ) : isShort ? (
          // Short block (<50px): client name only, no truncation
          <span
            className="text-[10px] font-bold leading-tight text-foreground"
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          >
            {appt.clientName}
          </span>
        ) : (
          // Full block: client name, service name, duration · price
          <>
            <span
              className="text-[10px] font-bold leading-tight text-foreground"
              style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            >
              {appt.clientName}
            </span>
            <span
              className="text-[9px] text-foreground/80 leading-tight mt-0.5"
              style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            >
              {appt.serviceName}
            </span>
            <span className="text-[9px] text-foreground/70 mt-0.5">
              {formatDuration(appt.durationMinutes)} · $
              {formatPrice(appt.price)}
            </span>
          </>
        )}
      </div>
    </button>
  );
}
