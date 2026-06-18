import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
  durationToPixels,
  formatDuration,
  formatPrice,
  formatTime12,
  generateTimeSlots,
  getCurrentTimePixels,
  getEffectiveGridHours,
  getWorkingScheduleForDate,
  hexToRgba,
  hueRotate,
  timeToPixels,
} from "../../lib/utils";
import * as api from "../../lib/api";
import { useAppStore } from "../../store/useAppStore";
import type { Appointment, AppointmentModalState, PhaseInstance } from "../../types";

const HOUR_PX = 60;

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
  date: string; // YYYY-MM-DD
  onModalChange: (state: AppointmentModalState) => void;
}

interface ContextMenu {
  x: number;
  y: number;
  appointment: Appointment;
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
  // First active phase
  if (phaseIndex === 0) {
    return {
      label: `${appt.clientName} — ${appt.serviceName}`,
      isProcessing: false,
    };
  }
  // Finishing phase — use the phase name
  return { label: `${appt.clientName} — ${phase.name}`, isProcessing: false };
}

function getPhaseStartMinutes(phase: { startTime: string }): number {
  const timePart = phase.startTime.includes("T")
    ? phase.startTime.split("T")[1].slice(0, 5)
    : phase.startTime.slice(0, 5);
  const [h, m] = timePart.split(":").map(Number);
  return h * 60 + m;
}

// Build render blocks: each appointment → one block per phase (or single block)
type RenderBlock = {
  appt: Appointment;
  topPx: number;
  heightPx: number;
  isProcessing: boolean;
  label: string;
  phaseIndex: number;
  color: string;
  leftPct: string;
  zIdx: number;
};

type ResizeEdge = "top" | "bottom";

export function DayView({ date, onModalChange }: Props) {
  const { settings, allAppointments, deleteAppointment, updateAppointment } = useAppStore(
    useShallow((s) => ({
      settings: s.settings,
      allAppointments: s.appointments,
      deleteAppointment: s.deleteAppointment,
      updateAppointment: s.updateAppointment,
    })),
  );
  // Filter outside selector — filter() creates a new array reference every call,
  // which causes React #185 (useSyncExternalStore stale snapshot loop) if inside useShallow
  const appointments = useMemo(
    () => allAppointments.filter((a) => a.date === date),
    [allAppointments, date],
  );

  const { startHour, endHour } = getEffectiveGridHours(settings);
  const timeSlots = generateTimeSlots(startHour, endHour);
  const totalPx = (endHour - startHour) * HOUR_PX;

  const _now = new Date();
  const isToday = date === `${_now.getFullYear()}-${String(_now.getMonth() + 1).padStart(2, "0")}-${String(_now.getDate()).padStart(2, "0")}`;
  const [currentTimePx, setCurrentTimePx] = useState(() =>
    getCurrentTimePixels(startHour),
  );
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dayColRef = useRef<HTMLDivElement>(null);

  const activeDragRef = useRef<{
    block: RenderBlock;
    offsetMinutes: number;
    started: boolean;
    startClientY: number;
    longPressTimer: ReturnType<typeof setTimeout> | null;
    isTouch: boolean;
    dragArmed: boolean;
    pointerId: number;
    pointerTarget: Element;
  } | null>(null);
  const [dragGhost, setDragGhost] = useState<{ topPx: number; time: string } | null>(null);
  const [resizeGhost, setResizeGhost] = useState<{ topPx: number; heightPx: number; label: string } | null>(null);
  const [dropConfirm, setDropConfirm] = useState<{ appt: Appointment; newTime: string; outsideHours?: string } | null>(null);
  const activeResizeRef = useRef<{
    block: RenderBlock;
    edge: ResizeEdge;
    pointerId: number;
    pointerTarget: Element;
  } | null>(null);

  // Update current time every 30s — safe: isToday and startHour are primitives
  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(
      () => setCurrentTimePx(getCurrentTimePixels(startHour)),
      30000,
    );
    return () => clearInterval(id);
  }, [isToday, startHour]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    function handler() {
      setContextMenu(null);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);

  const handleSlotClick = useCallback(
    (slot: string) => {
      onModalChange({
        isOpen: true,
        mode: "create",
        prefillDate: date,
        prefillTime: slot,
      });
    },
    [date, onModalChange],
  );

  const handleApptContextMenu = useCallback(
    (e: React.MouseEvent, appt: Appointment) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, appointment: appt });
    },
    [],
  );

  function getSnappedMinutes(clientY: number, offsetMinutes: number): number {
    const col = dayColRef.current;
    if (!col) return startHour * 60;
    const rect = col.getBoundingClientRect();
    const relY = clientY - rect.top - (offsetMinutes / 60) * HOUR_PX;
    const rawMin = startHour * 60 + (relY / HOUR_PX) * 60;
    const snapped = Math.round(rawMin / 15) * 15;
    return Math.max(startHour * 60, Math.min(endHour * 60 - 15, snapped));
  }

  function minutesToTimeStr(totalMin: number): string {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '00')}`;
  }

  function timeStrToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  async function persistAppointmentUpdate(updated: Appointment, previous: Appointment) {
    updateAppointment(updated);
    try {
      await api.updateAppointment(updated.id, {
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
      });
    } catch (err) {
      console.error("Appointment save failed, reverting", err);
      updateAppointment(previous);
    }
  }

  function getResizeDraft(block: RenderBlock, edge: ResizeEdge, clientY: number) {
    const start = timeStrToMinutes(block.appt.startTime);
    const end = start + block.appt.durationMinutes;
    const snapped = getSnappedMinutes(clientY, 0);
    let nextStart = start;
    let nextEnd = end;
    if (edge === "top") {
      nextStart = Math.min(snapped, end - 15);
    } else {
      nextEnd = Math.max(snapped, start + 15);
    }
    nextStart = Math.max(startHour * 60, nextStart);
    nextEnd = Math.min(endHour * 60, nextEnd);
    const durationMinutes = Math.max(15, nextEnd - nextStart);
    return {
      startTime: minutesToTimeStr(nextStart),
      durationMinutes,
      topPx: ((nextStart - startHour * 60) / 60) * HOUR_PX,
      heightPx: Math.max((durationMinutes / 60) * HOUR_PX, 20),
    };
  }

  function handleResizePointerDown(e: React.PointerEvent, block: RenderBlock, edge: ResizeEdge) {
    if (e.pointerType !== "mouse" || block.isProcessing || block.appt.phases.length > 0) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as Element;
    target.setPointerCapture(e.pointerId);
    activeResizeRef.current = { block, edge, pointerId: e.pointerId, pointerTarget: target };
  }

  function handleResizePointerMove(e: React.PointerEvent) {
    const resize = activeResizeRef.current;
    if (!resize) return;
    e.preventDefault();
    e.stopPropagation();
    const draft = getResizeDraft(resize.block, resize.edge, e.clientY);
    setResizeGhost({
      topPx: draft.topPx,
      heightPx: draft.heightPx,
      label: `${draft.startTime} · ${formatDuration(draft.durationMinutes)}`,
    });
  }

  function handleResizePointerUp(e: React.PointerEvent) {
    const resize = activeResizeRef.current;
    if (!resize) return;
    e.preventDefault();
    e.stopPropagation();
    const draft = getResizeDraft(resize.block, resize.edge, e.clientY);
    const previous = resize.block.appt;
    activeResizeRef.current = null;
    setResizeGhost(null);
    if (draft.startTime === previous.startTime && draft.durationMinutes === previous.durationMinutes) return;
    void persistAppointmentUpdate(
      {
        ...previous,
        startTime: draft.startTime,
        durationMinutes: draft.durationMinutes,
        updatedAt: new Date().toISOString(),
      },
      previous,
    );
  }

  function handleResizePointerCancel() {
    activeResizeRef.current = null;
    setResizeGhost(null);
  }

  function handleBlockPointerDown(e: React.PointerEvent, block: RenderBlock) {
    if (block.isProcessing) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    const col = dayColRef.current;
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const offsetMinutes = Math.max(0, ((clickY - block.topPx) / HOUR_PX) * 60);
    const isTouch = e.pointerType === "touch";
    const target = e.currentTarget as Element;
    if (!isTouch) target.setPointerCapture(e.pointerId);
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
    activeDragRef.current = { block, offsetMinutes, started: false, startClientY: e.clientY, longPressTimer, isTouch, dragArmed: !isTouch, pointerId: e.pointerId, pointerTarget: target };
  }

  function handleBlockPointerMove(e: React.PointerEvent) {
    const drag = activeDragRef.current;
    if (!drag) return;
    if (drag.isTouch && !drag.dragArmed) {
      // Touch movement before arm fires — cancel drag so scroll works
      if (Math.abs(e.clientY - drag.startClientY) > 8) {
        if (drag.longPressTimer) clearTimeout(drag.longPressTimer);
        activeDragRef.current = null;
      }
      return;
    }
    if (!drag.started) {
      if (Math.abs(e.clientY - drag.startClientY) < 6) return;
      drag.started = true;
      if (drag.longPressTimer) {
        clearTimeout(drag.longPressTimer);
        drag.longPressTimer = null;
      }
    }
    const totalMin = getSnappedMinutes(e.clientY, drag.offsetMinutes);
    const topPx = ((totalMin - startHour * 60) / 60) * HOUR_PX;
    setDragGhost({ topPx, time: minutesToTimeStr(totalMin) });
  }

  function handleBlockPointerUp(e: React.PointerEvent, block: RenderBlock) {
    const drag = activeDragRef.current;
    if (drag?.longPressTimer) clearTimeout(drag.longPressTimer);
    activeDragRef.current = null;
    setDragGhost(null);
    if (!drag?.started) {
      onModalChange({ isOpen: true, mode: 'edit', appointment: block.appt });
      return;
    }
    const totalMin = getSnappedMinutes(e.clientY, drag.offsetMinutes);
    const newTime = minutesToTimeStr(totalMin);
    if (newTime !== block.appt.startTime) {
      const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
      // Check active-vs-active overlap — prevent drop if it conflicts with another appt's active phases
      const newStartMin = toMin(newTime);
      const newActiveBlocks: { start: number; end: number }[] = [];
      if (block.appt.phases.length === 0) {
        newActiveBlocks.push({ start: newStartMin, end: newStartMin + block.appt.durationMinutes });
      } else {
        let cursor = newStartMin;
        for (const p of block.appt.phases) {
          if (p.phaseType === "active") {
            newActiveBlocks.push({ start: cursor, end: cursor + p.durationMinutes });
          }
          cursor += p.durationMinutes;
        }
      }
      let hasConflict = false;
      for (const existing of appointments) {
        if (existing.id === block.appt.id) continue;
        const existingActiveBlocks: { start: number; end: number }[] = [];
        if (existing.phases.length === 0) {
          const s = toMin(existing.startTime);
          existingActiveBlocks.push({ start: s, end: s + existing.durationMinutes });
        } else {
          for (const p of existing.phases) {
            if (p.phaseType === "active") {
              const tp = p.startTime.includes("T") ? p.startTime.split("T")[1].slice(0, 5) : p.startTime;
              const s = toMin(tp);
              existingActiveBlocks.push({ start: s, end: s + p.durationMinutes });
            }
          }
        }
        for (const na of newActiveBlocks) {
          for (const ea of existingActiveBlocks) {
            if (na.start < ea.end && na.end > ea.start) { hasConflict = true; break; }
          }
          if (hasConflict) break;
        }
        if (hasConflict) break;
      }
      if (hasConflict) return; // silently prevent — active blocks can't overlap
      const schedule = getWorkingScheduleForDate(date, settings);
      let outsideHours: string | undefined;
      if (!schedule.enabled) {
        outsideHours = "This day is not in your working schedule.";
      } else {
        const apptEnd = toMin(newTime) + block.appt.durationMinutes;
        if (toMin(newTime) < toMin(schedule.start) || apptEnd > toMin(schedule.end)) {
          outsideHours = `Outside working hours (${formatTime12(schedule.start)}–${formatTime12(schedule.end)}).`;
        }
      }
      setDropConfirm({ appt: block.appt, newTime, outsideHours });
    }
  }

  function handleBlockPointerCancel() {
    if (activeDragRef.current?.longPressTimer) clearTimeout(activeDragRef.current.longPressTimer);
    activeDragRef.current = null;
    setDragGhost(null);
  }

  async function confirmDrop() {
    if (!dropConfirm) return;
    const { appt, newTime } = dropConfirm;
    const newPhases = appt.phases.length > 0 ? recalcPhaseStarts(appt.phases, newTime) : appt.phases;
    const updated: Appointment = { ...appt, startTime: newTime, phases: newPhases, updatedAt: new Date().toISOString() };
    setDropConfirm(null);
    await persistAppointmentUpdate(updated, appt);
  }

  const rawBlocks: Omit<RenderBlock, 'leftPct' | 'zIdx'>[] = [];
  for (const appt of appointments) {
    if (appt.phases.length === 0) {
      const top = timeToPixels(appt.startTime, startHour);
      const height = Math.max(durationToPixels(appt.durationMinutes), 20);
      rawBlocks.push({
        appt,
        topPx: top,
        heightPx: height,
        isProcessing: false,
        label: `${appt.clientName} — ${appt.serviceName}`,
        phaseIndex: -1,
        color: appt.color,
      });
    } else {
      appt.phases.forEach((phase, i) => {
        const startMin = getPhaseStartMinutes(phase);
        const topPx = ((startMin - startHour * 60) / 60) * HOUR_PX;
        const height = Math.max(durationToPixels(phase.durationMinutes), 20);
        const { label, isProcessing } = getBlockLabel(appt, i);
        rawBlocks.push({
          appt,
          topPx,
          heightPx: height,
          isProcessing,
          label,
          phaseIndex: i,
          color: appt.color,
        });
      });
    }
  }
  rawBlocks.sort((a, b) => a.topPx - b.topPx);
  const overlapOrder: number[] = rawBlocks.map(() => 0);
  for (let i = 0; i < rawBlocks.length; i++) {
    for (let j = i + 1; j < rawBlocks.length; j++) {
      if (rawBlocks[j].topPx >= rawBlocks[i].topPx + rawBlocks[i].heightPx) break;
      overlapOrder[j] = Math.max(overlapOrder[j], overlapOrder[i] + 1);
    }
  }
  const cascadeOffsets = ['0%', '20%', '40%'];
  // Assign visually distinct colors based on overlap order, rotating hue from
  // the block's base (service) color. 120° steps give maximum separation.
  const HUE_OFFSETS = [0, 120, 240, 60, 180, 300];
  // All blocks sharing the same appt.id must use the same display color.
  // Use the overlapOrder of the appointment's first block for all its phases.
  const apptColorOrder = new Map<string, number>();
  for (let i = 0; i < rawBlocks.length; i++) {
    const id = rawBlocks[i].appt.id;
    if (!apptColorOrder.has(id)) apptColorOrder.set(id, overlapOrder[i]);
  }
  const displayColors = rawBlocks.map((b) => {
    const order = apptColorOrder.get(b.appt.id) ?? 0;
    if (order === 0) return b.color;
    return hueRotate(b.color, HUE_OFFSETS[order % HUE_OFFSETS.length]);
  });
  const blocks: RenderBlock[] = rawBlocks.map((b, i) => {
    // Use the appointment's first-block order for both color AND position,
    // so all phases of the same appointment align in the same column.
    const apptOrder = Math.min(apptColorOrder.get(b.appt.id) ?? 0, 2);
    return { ...b, color: displayColors[i], leftPct: cascadeOffsets[apptOrder], zIdx: (b.isProcessing ? 5 : 10) + apptOrder };
  });

  return (
    <div className="flex w-full" ref={containerRef} style={{ minHeight: totalPx, touchAction: 'pan-y', overscrollBehavior: 'none' }}>
      {/* Time labels column */}
      <div
        className="w-14 flex-shrink-0 bg-background border-r border-border relative"
        style={{ height: totalPx }}
      >
        {timeSlots.map((slot) => {
          const top = timeToPixels(slot, startHour);
          const [_h, m] = slot.split(":").map(Number);
          const isHour = m === 0;
          return (
            <div
              key={slot}
              className="absolute right-2 flex items-start"
              style={{ top: top - 8, height: 16 }}
            >
              <span
                className={`text-[10px] leading-none ${isHour ? "text-muted-foreground font-medium" : "text-muted-foreground/50"}`}
              >
                {isHour ? formatTime12(slot) : m === 30 ? ":30" : ""}
              </span>
            </div>
          );
        })}
        {/* End-hour label */}
        <div
          className="absolute right-2 flex items-start"
          style={{ top: totalPx - 8, height: 16 }}
        >
          <span className="text-[10px] leading-none text-muted-foreground font-medium">
            {formatTime12(`${String(endHour).padStart(2, "0")}:00`)}
          </span>
        </div>
      </div>

      {/* Day column */}
      <div
        ref={dayColRef}
        className="flex-1 relative bg-white cursor-pointer"
        style={{ height: totalPx }}
      >
        {/* Non-working hours overlay */}
        {(() => {
          const sched = getWorkingScheduleForDate(date, settings);
          const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
          if (!sched.enabled) {
            return <div className="absolute inset-0 pointer-events-none z-[2]" style={{ backgroundColor: "rgba(0,0,0,0.18)" }} />;
          }
          const globalStart = startHour * 60;
          const globalEnd = endHour * 60;
          const dayStart = toMin(sched.start);
          const dayEnd = toMin(sched.end);
          return (
            <>
              {dayStart > globalStart && (
                <div
                  className="absolute left-0 right-0 top-0 pointer-events-none z-[2]"
                  style={{ height: ((dayStart - globalStart) / 60) * HOUR_PX, backgroundColor: "rgba(0,0,0,0.12)" }}
                />
              )}
              {dayEnd < globalEnd && (
                <div
                  className="absolute left-0 right-0 pointer-events-none z-[2]"
                  style={{ top: ((dayEnd - globalStart) / 60) * HOUR_PX, bottom: 0, backgroundColor: "rgba(0,0,0,0.12)" }}
                />
              )}
            </>
          );
        })()}

        {/* Horizontal guide lines at every 30-min mark — on ALL columns including today */}
        {timeSlots.map((slot) => {
          const top = timeToPixels(slot, startHour);
          const [, m] = slot.split(":").map(Number);
          const isHour = m === 0;
          return (
            <div
              key={slot}
              className={`absolute left-0 right-0 pointer-events-none ${isHour ? "border-t border-border/60" : "border-t border-border/25"}`}
              style={{ top }}
            />
          );
        })}

        {/* Clickable time slots — below appointment z-index */}
        {timeSlots.map((slot) => {
          const top = timeToPixels(slot, startHour);
          return (
            <div
              key={slot}
              className="absolute left-0 right-0"
              style={{ top, height: 30, zIndex: 1 }}
              role="button"
              tabIndex={0}
              onClick={(e) => { if (e.button === 0) handleSlotClick(slot); }}
              onContextMenu={(e) => e.preventDefault()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") handleSlotClick(slot);
              }}
            />
          );
        })}

        {/* Appointment blocks — higher z-index than slots */}
        {blocks.map((block, idx) => (
          <AppointmentBlock
            key={`${block.appt.id}-${block.phaseIndex}-${idx}`}
            block={block}
            leftPct={block.leftPct}
            zIdx={block.zIdx}
            isDragging={dragGhost !== null && activeDragRef.current?.block.appt.id === block.appt.id}
            onBlockPointerDown={handleBlockPointerDown}
            onBlockPointerMove={handleBlockPointerMove}
            onBlockPointerUp={handleBlockPointerUp}
            onBlockPointerCancel={handleBlockPointerCancel}
            onResizePointerDown={handleResizePointerDown}
            onResizePointerMove={handleResizePointerMove}
            onResizePointerUp={handleResizePointerUp}
            onResizePointerCancel={handleResizePointerCancel}
            onContextMenu={handleApptContextMenu}
          />
        ))}

        {/* Drag ghost block */}
        {dragGhost && activeDragRef.current && (
          <div
            className="absolute right-1 rounded-md border-2 border-dashed pointer-events-none"
            style={{
              top: dragGhost.topPx + 1,
              height: activeDragRef.current.block.heightPx - 2,
              left: `calc(${activeDragRef.current.block.leftPct} + 4px)`,
              zIndex: 50,
              borderColor: activeDragRef.current.block.color,
              backgroundColor: hexToRgba(activeDragRef.current.block.color, 0.3),
            }}
          >
            <div className="px-1.5 py-0.5">
              <span className="text-[10px] font-bold">{formatTime12(dragGhost.time)}</span>
            </div>
          </div>
        )}

        {resizeGhost && (
          <div
            className="absolute right-1 rounded-md border-2 border-dashed pointer-events-none"
            style={{
              top: resizeGhost.topPx + 1,
              height: Math.max(resizeGhost.heightPx - 2, 4),
              left: "4px",
              zIndex: 55,
              borderColor: "oklch(var(--accent))",
              backgroundColor: "oklch(var(--accent) / 0.12)",
            }}
          >
            <div className="px-1.5 py-0.5">
              <span className="text-[10px] font-bold">{resizeGhost.label}</span>
            </div>
          </div>
        )}

        {/* End-of-day boundary line + label */}
        <div
          className="absolute left-0 right-0 pointer-events-none border-t border-border/60"
          style={{ top: totalPx }}
        />

        {/* Current time indicator — today only */}
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

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[65] bg-card border border-border rounded-xl shadow-xl overflow-hidden"
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
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-5 mx-4 max-w-sm w-full">
            <p className="text-sm font-semibold mb-1">Move appointment?</p>
            <p className="text-sm text-muted-foreground mb-2">
              Move <span className="font-medium text-foreground">{dropConfirm.appt.clientName}</span> to{' '}
              <span className="font-medium text-accent">{formatTime12(dropConfirm.newTime)}</span>?
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

type BlockProps = {
  block: RenderBlock;
  leftPct: string;
  zIdx: number;
  isDragging: boolean;
  onBlockPointerDown: (e: React.PointerEvent, block: RenderBlock) => void;
  onBlockPointerMove: (e: React.PointerEvent) => void;
  onBlockPointerUp: (e: React.PointerEvent, block: RenderBlock) => void;
  onBlockPointerCancel: () => void;
  onResizePointerDown: (e: React.PointerEvent, block: RenderBlock, edge: ResizeEdge) => void;
  onResizePointerMove: (e: React.PointerEvent) => void;
  onResizePointerUp: (e: React.PointerEvent) => void;
  onResizePointerCancel: () => void;
  onContextMenu: (e: React.MouseEvent, appt: Appointment) => void;
};

function AppointmentBlock({
  block,
  leftPct,
  zIdx,
  isDragging,
  onBlockPointerDown,
  onBlockPointerMove,
  onBlockPointerUp,
  onBlockPointerCancel,
  onResizePointerDown,
  onResizePointerMove,
  onResizePointerUp,
  onResizePointerCancel,
  onContextMenu,
}: BlockProps) {
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
    <div
      className="absolute right-1 rounded-md border overflow-hidden cursor-pointer select-none group"
      style={{
        top: topPx + 1,
        height: heightPx - 2,
        left: `calc(${leftPct} + 4px)`,
        zIndex: zIdx,
        borderLeft: leftPct !== '0%' ? `3px solid ${color}` : undefined,
        opacity: isDragging ? 0.35 : 1,
        ...bgStyle,
      }}
      onPointerDown={(e) => onBlockPointerDown(e, block)}
      onPointerMove={onBlockPointerMove}
      onPointerUp={(e) => onBlockPointerUp(e, block)}
      onPointerCancel={onBlockPointerCancel}
      onContextMenu={(e) => onContextMenu(e, appt)}
      data-ocid="appointment.card"
    >
      {!isProcessing && appt.phases.length === 0 && (
        <>
          <div
            className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-foreground/20 z-10"
            onPointerDown={(e) => onResizePointerDown(e, block, "top")}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
            data-ocid="appointment.resize_top"
          />
          <div
            className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-foreground/20 z-10"
            onPointerDown={(e) => onResizePointerDown(e, block, "bottom")}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
            data-ocid="appointment.resize_bottom"
          />
        </>
      )}
      <div className="px-1.5 py-0.5 h-full flex flex-col justify-start overflow-hidden">
        {isProcessing ? (
          <span className="text-[10px] text-foreground/60 italic">{label}</span>
        ) : (
          <>
            <span
              className="text-[11px] font-bold leading-tight text-foreground break-words"
              style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
            >
              {label}
            </span>
            {!isShort && (
              <span className="text-[10px] text-foreground/70 mt-0.5">
                {formatDuration(appt.durationMinutes)} · $
                {formatPrice(appt.price)}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
