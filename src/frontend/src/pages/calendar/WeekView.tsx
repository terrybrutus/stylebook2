import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
  dateToString,
  durationToPixels,
  formatDuration,
  formatPrice,
  formatTime12,
  generateTimeSlots,
  getCurrentTimePixels,
  getWeekDates,
  timeToPixels,
} from "../../lib/utils";
import { hexToRgba } from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type { Appointment, AppointmentModalState } from "../../types";

const HOUR_PX = 60;

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
    return { label: appt.clientName, isProcessing: false };
  }
  const phase = appt.phases[phaseIndex];
  if (!phase) return { label: appt.clientName, isProcessing: false };
  if (phase.phaseType === "processing") {
    return { label: `${appt.clientName} — Processing`, isProcessing: true };
  }
  if (phaseIndex === 0) {
    return { label: appt.clientName, isProcessing: false };
  }
  return { label: `${appt.clientName} — ${phase.name}`, isProcessing: false };
}

export function WeekView({
  anchorDate,
  onModalChange,
  onDayClick: _onDayClick,
}: Props) {
  const settings = useAppStore(useShallow((s) => s.settings));
  const allAppointments = useAppStore(useShallow((s) => s.appointments));

  const startHour = Number(settings.workingHoursStart.split(":")[0]);
  const endHour = Number(settings.workingHoursEnd.split(":")[0]);
  const timeSlots = generateTimeSlots(startHour, endHour);
  const totalPx = (endHour - startHour) * HOUR_PX;

  // Week dates respecting startWeekOnMonday setting
  const weekDates = getWeekDates(anchorDate, settings.startWeekOnMonday);

  const todayStr = new Date().toISOString().slice(0, 10);
  const [currentTimePx, setCurrentTimePx] = useState(() =>
    getCurrentTimePixels(startHour),
  );
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);

  // Mobile 3-day swipe state
  const [mobileStartIdx, setMobileStartIdx] = useState(() => {
    const todayIdx = weekDates.findIndex((d) => dateToString(d) === todayStr);
    return todayIdx >= 0 ? Math.max(0, Math.min(todayIdx, 4)) : 0;
  });
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  useEffect(() => {
    const id = setInterval(
      () => setCurrentTimePx(getCurrentTimePixels(startHour)),
      30000,
    );
    return () => clearInterval(id);
  }, [startHour]);

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
    if (dx < 0 && mobileStartIdx < 4) setMobileStartIdx((p) => p + 1);
    if (dx > 0 && mobileStartIdx > 0) setMobileStartIdx((p) => p - 1);
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
        const top = timeToPixels(appt.startTime, startHour);
        const height = Math.max(durationToPixels(appt.durationMinutes), 20);
        result.push({
          appt,
          topPx: top,
          heightPx: height,
          isProcessing: false,
          label: appt.clientName,
          color: appt.color,
          phaseIndex: -1,
        });
      } else {
        for (const [i, phase] of appt.phases.entries()) {
          const startMin = getPhaseStartMinutes(phase);
          const topPx = ((startMin - startHour * 60) / 60) * HOUR_PX;
          const height = Math.max(durationToPixels(phase.durationMinutes), 20);
          const { label, isProcessing } = getBlockLabel(appt, i);
          result.push({
            appt,
            topPx,
            heightPx: height,
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
      className="flex flex-1 overflow-hidden select-none"
      onTouchStart={isMobilePortrait ? handleSwipeStart : undefined}
      onTouchEnd={isMobilePortrait ? handleSwipeEnd : undefined}
    >
      {/* Time labels + content scroll area */}
      <div
        className="flex flex-1 overflow-auto"
        data-ocid="calendar.week_scroll"
      >
        <div className="flex min-w-0" style={{ height: totalPx }}>
          {/* Time labels */}
          <div
            className="w-14 flex-shrink-0 bg-background border-r border-border relative z-10"
            style={{ height: totalPx }}
          >
            {timeSlots.map((slot) => {
              const top = timeToPixels(slot, startHour);
              const [_h, m] = slot.split(":").map(Number);
              const isHour = m === 0;
              return (
                <div
                  key={slot}
                  className="absolute right-2"
                  style={{ top: top - 8 }}
                >
                  <span
                    className={`text-[10px] leading-none ${isHour ? "text-muted-foreground font-medium" : "text-muted-foreground/50"}`}
                  >
                    {isHour ? formatTime12(slot) : m === 30 ? ":30" : ""}
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
                className={`flex-1 relative border-r border-border bg-white ${
                  isToday ? "" : ""
                }`}
                style={{ height: totalPx, minWidth: 0 }}
              >
                {/* Guide lines across all columns including today */}
                {timeSlots.map((slot) => {
                  const top = timeToPixels(slot, startHour);
                  const [_h, m] = slot.split(":").map(Number);
                  const isHour = m === 0;
                  return (
                    <div
                      key={slot}
                      className={`absolute left-0 right-0 pointer-events-none ${isHour ? "border-t border-border/60" : "border-t border-border/25"}`}
                      style={{ top }}
                    />
                  );
                })}

                {/* Clickable time slots */}
                {timeSlots.map((slot) => {
                  const top = timeToPixels(slot, startHour);
                  return (
                    <div
                      key={slot}
                      className="absolute left-0 right-0 cursor-pointer hover:bg-accent/5 transition-colors"
                      style={{ top, height: 30, zIndex: 1 }}
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

                {/* Current time indicator */}
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
              onModalChange({
                isOpen: true,
                mode: "edit",
                appointment: contextMenu.appointment,
              });
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
  const isShort = heightPx < 40;

  const bgStyle = isProcessing
    ? {
        background: `repeating-linear-gradient(45deg, ${hexToRgba(color, 0.15)}, ${hexToRgba(color, 0.15)} 4px, ${hexToRgba(color, 0.35)} 4px, ${hexToRgba(color, 0.35)} 8px)`,
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
        height: heightPx - 2,
        zIndex: 10,
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
          <span className="text-[9px] text-foreground/60 italic leading-tight">
            processing
          </span>
        ) : (
          <>
            <span
              className="text-[10px] font-bold leading-tight text-foreground"
              style={{
                wordBreak: "break-word",
                overflowWrap: "break-word",
                hyphens: "auto",
              }}
            >
              {label}
            </span>
            {!isShort && (
              <>
                <span
                  className="text-[9px] text-foreground/80 leading-tight mt-0.5"
                  style={{
                    wordBreak: "break-word",
                    overflowWrap: "break-word",
                  }}
                >
                  {appt.serviceName}
                </span>
                <span className="text-[9px] text-foreground/70 mt-0.5">
                  {formatDuration(appt.durationMinutes)} · $
                  {formatPrice(appt.price)}
                </span>
              </>
            )}
          </>
        )}
      </div>
    </button>
  );
}
