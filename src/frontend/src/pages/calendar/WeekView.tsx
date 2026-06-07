import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
  dateToString,
  formatDuration,
  formatPrice,
  formatTime12,
  generateTimeSlots,
  getWeekDates,
  getWorkingScheduleForDate,
  hexToRgba,
  hueRotate,
} from "../../lib/utils";
import * as api from "../../lib/api";
import { useAppStore } from "../../store/useAppStore";
import type { Appointment, AppointmentModalState, PhaseInstance } from "../../types";

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

function recalcPhaseStarts(phases: PhaseInstance[], baseStart: string): PhaseInstance[] {
  const [sh, sm] = baseStart.split(':').map(Number);
  let cursor = sh * 60 + sm;
  return phases.map((p) => {
    const hh = String(Math.floor(cursor / 60)).padStart(2, '0');
    const mm = String(cursor % 60).padStart(2, '00');
    cursor += p.durationMinutes;
    return { ...p, startTime: `${hh}:${mm}` };
  });
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

  const updateAppointmentInStore = useAppStore((s) => s.updateAppointment);

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

  // Mobile 3-day swipe state — reset window to show today when anchorDate changes
  const [mobileStartIdx, setMobileStartIdx] = useState(() => {
    const todayIdx = weekDates.findIndex((d) => dateToString(d) === todayStr);
    return todayIdx >= 0 ? Math.min(Math.floor(todayIdx / 3) * 3, 4) : 0;
  });
  const [slideClass, setSlideClass] = useState('');
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);

  // Column refs for drag-and-drop
  const colRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Drag state
  type RenderBlock = {
    appt: Appointment;
    topPx: number;
    heightPx: number;
    isProcessing: boolean;
    label: string;
    color: string;
    phaseIndex: number;
    leftPct: string;
    rightPct: string;
    zIdx: number;
  };

  const activeDragRef = useRef<{
    block: RenderBlock;
    offsetMinutes: number;
    started: boolean;
    startClientY: number;
    startClientX: number;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    isTouch: boolean;
    dragArmed: boolean;
    pointerId: number;
    pointerTarget: Element;
  } | null>(null);

  const [dragGhost, setDragGhost] = useState<{
    topPx: number;
    heightPx: number;
    time: string;
    dateStr: string;
    color: string;
    label: string;
  } | null>(null);

  const [dropConfirm, setDropConfirm] = useState<{
    appt: Appointment;
    newTime: string;
    newDate: string;
    outsideHours?: string;
  } | null>(null);

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

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, appt: Appointment) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, appointment: appt });
    },
    [],
  );

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

  // When anchor week changes (e.g. Today button), reset mobile window to show today
  useEffect(() => {
    const todayIdx = weekDates.findIndex((d) => dateToString(d) === todayStr);
    setMobileStartIdx(todayIdx >= 0 ? Math.min(Math.floor(todayIdx / 3) * 3, 4) : 0);
  }, [weekDates[0]]);

  const visibleDates = isMobilePortrait
    ? weekDates.slice(mobileStartIdx, mobileStartIdx + 3)
    : weekDates;

  function changeMobileStart(newIdx: number) {
    const dir = newIdx > mobileStartIdx ? 'translate-x-4' : '-translate-x-4';
    setSlideClass(`${dir} opacity-50`);
    setTimeout(() => {
      setMobileStartIdx(newIdx);
      setSlideClass('opacity-100 translate-x-0 transition-all duration-150');
      setTimeout(() => setSlideClass(''), 150);
    }, 50);
  }

  function handleSwipeStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function handleSwipeEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 40) return;
    if (dx < 0) changeMobileStart(Math.min(mobileStartIdx + 3, 4));
    if (dx > 0) changeMobileStart(Math.max(mobileStartIdx - 3, 0));
  }

  // Drag helpers
  function getSnappedMinutes(clientY: number, colEl: HTMLDivElement, offsetMinutes: number): number {
    const rect = colEl.getBoundingClientRect();
    const relY = clientY - rect.top - (offsetMinutes / MIN_PX / 60) * MIN_PX * 60;
    const rawMin = startMinutes + relY / MIN_PX;
    const snapped = Math.round(rawMin / 15) * 15;
    return Math.max(startMinutes, Math.min(endMinutes - 15, snapped));
  }

  function minutesToTimeStr(totalMin: number): string {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '00')}`;
  }

  function getDateAtClientX(clientX: number): string | null {
    for (const [ds, el] of colRefs.current.entries()) {
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return ds;
    }
    return null;
  }

  function handleBlockPointerDown(e: React.PointerEvent, block: RenderBlock, dateStr: string) {
    if (block.isProcessing) return;
    e.stopPropagation();
    const isTouch = e.pointerType === "touch";
    const target = e.currentTarget as Element;
    if (!isTouch) target.setPointerCapture(e.pointerId);
    const col = colRefs.current.get(dateStr);
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const offsetMinutes = Math.max(0, (clickY - block.topPx) / MIN_PX);
    const longPressTimer = setTimeout(() => {
      const drag = activeDragRef.current;
      if (!drag || drag.started) return;
      if (isTouch && !drag.dragArmed) {
        drag.dragArmed = true;
        drag.pointerTarget.setPointerCapture(drag.pointerId);
      } else {
        setContextMenu({ x: e.clientX, y: e.clientY, appointment: block.appt });
      }
    }, 300);
    activeDragRef.current = { block, offsetMinutes, started: false, startClientY: e.clientY, startClientX: e.clientX, longPressTimer, isTouch, dragArmed: !isTouch, pointerId: e.pointerId, pointerTarget: target };
  }

  function handleBlockPointerMove(e: React.PointerEvent) {
    const drag = activeDragRef.current;
    if (!drag) return;
    if (drag.isTouch && !drag.dragArmed) {
      // Touch movement before arm fires — cancel so native scroll works
      const dy = Math.abs(e.clientY - drag.startClientY);
      const dx = Math.abs(e.clientX - drag.startClientX);
      if (dy > 8 || dx > 8) {
        if (drag.longPressTimer) clearTimeout(drag.longPressTimer);
        activeDragRef.current = null;
      }
      return;
    }
    const dy = Math.abs(e.clientY - drag.startClientY);
    const dx = Math.abs(e.clientX - drag.startClientX);
    if (!drag.started) {
      if (dy < 6 && dx < 6) return;
      drag.started = true;
      if (drag.longPressTimer) { clearTimeout(drag.longPressTimer); drag.longPressTimer = null; }
    }
    const targetDate = getDateAtClientX(e.clientX);
    const colEl = targetDate ? colRefs.current.get(targetDate) : null;
    if (!colEl || !targetDate) return;
    const totalMin = getSnappedMinutes(e.clientY, colEl, drag.offsetMinutes);
    const topPx = minutesToPx(totalMin, startMinutes);
    setDragGhost({
      topPx,
      heightPx: drag.block.heightPx,
      time: minutesToTimeStr(totalMin),
      dateStr: targetDate,
      color: drag.block.color,
      label: drag.block.label,
    });
  }

  function handleBlockPointerUp(e: React.PointerEvent, block: RenderBlock, origDateStr: string) {
    const drag = activeDragRef.current;
    if (drag?.longPressTimer) clearTimeout(drag.longPressTimer);
    activeDragRef.current = null;
    setDragGhost(null);
    if (!drag?.started) {
      onModalChange({ isOpen: true, mode: 'edit', appointment: block.appt });
      return;
    }
    const targetDate = getDateAtClientX(e.clientX) ?? origDateStr;
    const colEl = colRefs.current.get(targetDate);
    if (!colEl) return;
    const totalMin = getSnappedMinutes(e.clientY, colEl, drag.offsetMinutes);
    const newTime = minutesToTimeStr(totalMin);
    if (newTime !== block.appt.startTime || targetDate !== block.appt.date) {
      const schedule = getWorkingScheduleForDate(targetDate, settings);
      let outsideHours: string | undefined;
      if (!schedule.enabled) {
        outsideHours = `That day is not in your working schedule.`;
      } else {
        const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
        const apptEnd = toMin(newTime) + block.appt.durationMinutes;
        if (toMin(newTime) < toMin(schedule.start) || apptEnd > toMin(schedule.end)) {
          outsideHours = `Outside working hours (${formatTime12(schedule.start)}–${formatTime12(schedule.end)}).`;
        }
      }
      setDropConfirm({ appt: block.appt, newTime, newDate: targetDate, outsideHours });
    }
  }

  function handleBlockPointerCancel() {
    if (activeDragRef.current?.longPressTimer) clearTimeout(activeDragRef.current.longPressTimer);
    activeDragRef.current = null;
    setDragGhost(null);
  }

  async function confirmDrop() {
    if (!dropConfirm) return;
    const { appt, newTime, newDate } = dropConfirm;
    const newPhases = appt.phases.length > 0 ? recalcPhaseStarts(appt.phases, newTime) : appt.phases;
    const updated: Appointment = { ...appt, date: newDate, startTime: newTime, phases: newPhases, updatedAt: new Date().toISOString() };
    updateAppointmentInStore(updated);
    api.updateAppointment(appt.id, {
      clientName: updated.clientName,
      serviceId: updated.serviceId,
      serviceName: updated.serviceName,
      date: newDate,
      startTime: newTime,
      durationMinutes: updated.durationMinutes,
      price: updated.price,
      phoneNumber: updated.phoneNumber,
      notes: updated.notes,
      phases: newPhases,
      color: updated.color,
    }).catch(console.error);
    setDropConfirm(null);
  }

  function buildBlocks(dateStr: string): RenderBlock[] {
    const dayAppts = allAppointments.filter((a) => a.date === dateStr);
    const raw: Omit<RenderBlock, 'leftPct' | 'rightPct' | 'zIdx'>[] = [];
    for (const appt of dayAppts) {
      if (appt.phases.length === 0) {
        const apptStartMin = timeStrToMinutes(appt.startTime);
        const topPx = minutesToPx(apptStartMin, startMinutes);
        const heightPx = Math.max(appt.durationMinutes * MIN_PX, 20);
        raw.push({
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
          raw.push({
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
    // Cascade overlap offsets: sort by topPx, detect overlaps, offset 2nd/3rd
    raw.sort((a, b) => a.topPx - b.topPx);
    const overlapOrder: number[] = raw.map(() => 0);
    for (let i = 0; i < raw.length; i++) {
      for (let j = i + 1; j < raw.length; j++) {
        const a = raw[i];
        const b = raw[j];
        if (b.topPx >= a.topPx + a.heightPx) break;
        overlapOrder[j] = Math.max(overlapOrder[j], overlapOrder[i] + 1);
      }
    }
    const offsets = ['0%', '20%', '40%'];
    // Assign visually distinct colors based on overlap order, rotating hue from
    // the block's base (service) color. 120° steps give maximum separation.
    const HUE_OFFSETS = [0, 120, 240, 60, 180, 300];
    // All blocks sharing the same appt.id must use the same display color.
    const apptColorOrder = new Map<string, number>();
    for (let i = 0; i < raw.length; i++) {
      const id = raw[i].appt.id;
      if (!apptColorOrder.has(id)) apptColorOrder.set(id, overlapOrder[i]);
    }
    const displayColors = raw.map((b) => {
      const order = apptColorOrder.get(b.appt.id) ?? 0;
      if (order === 0) return b.color;
      return hueRotate(b.color, HUE_OFFSETS[order % HUE_OFFSETS.length]);
    });
    return raw.map((b, i) => {
      // Use the appointment's first-block order for both color AND position,
      // so all phases of the same appointment align in the same column.
      const apptOrder = Math.min(apptColorOrder.get(b.appt.id) ?? 0, 2);
      return {
        ...b,
        color: displayColors[i],
        leftPct: offsets[apptOrder],
        rightPct: '0%',
        zIdx: (b.isProcessing ? 5 : 10) + apptOrder,
      };
    });
  }

  return (
    <div
      className="flex flex-col flex-1 overflow-hidden select-none"
      onTouchStart={isMobilePortrait ? handleSwipeStart : undefined}
      onTouchEnd={isMobilePortrait ? handleSwipeEnd : undefined}
    >
      {/* Day header row — sticky above the scroll area */}
      <div className="flex flex-shrink-0 border-b border-border bg-card">
        {/* Time column spacer — on mobile shows prev arrow */}
        <div className="w-14 flex-shrink-0 border-r border-border flex items-center justify-center">
          {isMobilePortrait && mobileStartIdx > 0 && (
            <button
              type="button"
              className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => changeMobileStart(mobileStartIdx - 3)}
              aria-label="Previous days"
            >
              <span className="text-base leading-none">‹</span>
            </button>
          )}
        </div>
        {visibleDates.map((date, i) => {
          const dateStr = dateToString(date);
          const isToday = dateStr === todayStr;
          const dayLabel = DAY_LABELS[date.getDay()];
          const dayNum = date.getDate();
          const isLast = i === visibleDates.length - 1;
          const apptCount = allAppointments.filter((a) => a.date === dateStr).length;
          return (
            <button
              key={dateStr}
              type="button"
              className="flex-1 flex flex-col items-center justify-center py-1.5 border-r border-border cursor-pointer hover:bg-muted/30 transition-colors relative"
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
              {apptCount > 0 && (
                <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-accent text-accent-foreground text-[9px] font-bold leading-none mt-0.5">
                  {apptCount}
                </span>
              )}
              {/* Next arrow on last visible day — mobile only */}
              {isMobilePortrait && isLast && mobileStartIdx + 3 < 7 && (
                <button
                  type="button"
                  className="absolute right-0 top-0 bottom-0 flex items-center pr-0.5"
                  onClick={(e) => { e.stopPropagation(); changeMobileStart(mobileStartIdx + 3); }}
                  aria-label="Next days"
                >
                  <span className="text-base leading-none text-muted-foreground">›</span>
                </button>
              )}
            </button>
          );
        })}
      </div>

      {/* Scrollable time grid */}
      <div
        className="flex flex-1 overflow-auto"
        style={{ touchAction: 'pan-y', overscrollBehavior: 'none' }}
        data-ocid="calendar.week_scroll"
      >
        <div className={`flex min-w-0 w-full ${slideClass}`} style={{ height: totalPx }}>
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
            {/* End-hour label */}
            <div className="absolute right-2" style={{ top: totalPx - 8 }}>
              <span className="text-[10px] leading-none text-muted-foreground font-medium">
                {formatTime12(`${String(endHour).padStart(2, "0")}:00`)}
              </span>
            </div>
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
                ref={(el) => { if (el) colRefs.current.set(dateStr, el); else colRefs.current.delete(dateStr); }}
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
                    leftPct={block.leftPct}
                    zIdx={block.zIdx}
                    isDragging={dragGhost !== null && activeDragRef.current?.block.appt.id === block.appt.id && activeDragRef.current?.block.phaseIndex === block.phaseIndex}
                    onBlockPointerDown={(e) => handleBlockPointerDown(e, block, dateStr)}
                    onBlockPointerMove={handleBlockPointerMove}
                    onBlockPointerUp={(e) => handleBlockPointerUp(e, block, dateStr)}
                    onBlockPointerCancel={handleBlockPointerCancel}
                    onContextMenu={handleContextMenu}
                  />
                ))}

                {/* Drag ghost — only in the matching column */}
                {dragGhost && dragGhost.dateStr === dateStr && (
                  <div
                    className="absolute right-0.5 rounded border-2 border-dashed pointer-events-none"
                    style={{
                      top: dragGhost.topPx + 1,
                      height: Math.max(dragGhost.heightPx - 2, 4),
                      left: '2px',
                      zIndex: 50,
                      borderColor: dragGhost.color,
                      backgroundColor: hexToRgba(dragGhost.color, 0.25),
                    }}
                  >
                    <div className="px-1 py-0.5">
                      <span className="text-[9px] font-bold">{formatTime12(dragGhost.time)}</span>
                    </div>
                  </div>
                )}

                {/* End-of-day boundary line */}
                <div
                  className="absolute left-0 right-0 pointer-events-none border-t border-border/60"
                  style={{ top: totalPx }}
                />

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
              const id = contextMenu.appointment.id;
              deleteAppointment(id);
              api.deleteAppointment(id).catch(console.error);
              setContextMenu(null);
            }}
            data-ocid="appointment.delete_button"
          >
            Delete
          </button>
        </div>
      )}

      {/* Drop confirmation dialog */}
      {dropConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-5 mx-4 max-w-sm w-full">
            <p className="text-sm font-semibold mb-1">Move appointment?</p>
            <p className="text-sm text-muted-foreground mb-2">
              Move <span className="font-medium text-foreground">{dropConfirm.appt.clientName}</span> to{' '}
              <span className="font-medium text-accent">{new Date(`${dropConfirm.newDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>{' '}
              at <span className="font-medium text-accent">{formatTime12(dropConfirm.newTime)}</span>?
            </p>
            {dropConfirm.outsideHours && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">⚠ {dropConfirm.outsideHours}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90"
                onClick={confirmDrop}
              >
                Confirm
              </button>
              <button
                type="button"
                className="flex-1 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted"
                onClick={() => setDropConfirm(null)}
              >
                Cancel
              </button>
            </div>
          </div>
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
  leftPct: string;
  zIdx: number;
  isDragging: boolean;
  onBlockPointerDown: (e: React.PointerEvent) => void;
  onBlockPointerMove: (e: React.PointerEvent) => void;
  onBlockPointerUp: (e: React.PointerEvent) => void;
  onBlockPointerCancel: () => void;
  onContextMenu: (e: React.MouseEvent, appt: Appointment) => void;
};

function WeekBlock({
  block,
  leftPct,
  zIdx,
  isDragging,
  onBlockPointerDown,
  onBlockPointerMove,
  onBlockPointerUp,
  onBlockPointerCancel,
  onContextMenu,
}: WeekBlockProps) {
  const { appt, topPx, heightPx, isProcessing, label, color } = block;
  const isShort = heightPx < 50;

  const zIndex = zIdx;

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
      className="absolute right-0.5 rounded border overflow-hidden cursor-pointer select-none text-left"
      style={{
        top: topPx + 1,
        height: Math.max(heightPx - 2, 4),
        left: `calc(${leftPct} + 2px)`,
        zIndex,
        borderLeft: leftPct !== '0%' ? `3px solid ${color}` : undefined,
        opacity: isDragging ? 0.35 : 1,
        ...bgStyle,
      }}
      onPointerDown={onBlockPointerDown}
      onPointerMove={onBlockPointerMove}
      onPointerUp={onBlockPointerUp}
      onPointerCancel={onBlockPointerCancel}
      onContextMenu={(e) => onContextMenu(e, appt)}
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
