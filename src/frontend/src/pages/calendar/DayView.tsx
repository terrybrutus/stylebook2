import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
  durationToPixels,
  formatDuration,
  formatPrice,
  formatTime12,
  generateTimeSlots,
  getCurrentTimePixels,
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

  const startHour = Number(settings.workingHoursStart.split(":")[0]);
  const endHour = Number(settings.workingHoursEnd.split(":")[0]);
  const timeSlots = generateTimeSlots(startHour, endHour);
  const totalPx = (endHour - startHour) * HOUR_PX;

  const isToday = date === new Date().toISOString().slice(0, 10);
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
  } | null>(null);
  const [dragGhost, setDragGhost] = useState<{ topPx: number; time: string } | null>(null);
  const [dropConfirm, setDropConfirm] = useState<{ appt: Appointment; newTime: string } | null>(null);

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

  function handleBlockPointerDown(e: React.PointerEvent, block: RenderBlock) {
    if (block.isProcessing) return;
    e.stopPropagation();
    const col = dayColRef.current;
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const offsetMinutes = Math.max(0, ((clickY - block.topPx) / HOUR_PX) * 60);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    const longPressTimer = setTimeout(() => {
      if (activeDragRef.current && !activeDragRef.current.started) {
        setContextMenu({ x: e.clientX, y: e.clientY, appointment: block.appt });
      }
    }, 500);
    activeDragRef.current = { block, offsetMinutes, started: false, startClientY: e.clientY, longPressTimer };
  }

  function handleBlockPointerMove(e: React.PointerEvent) {
    const drag = activeDragRef.current;
    if (!drag) return;
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
      setDropConfirm({ appt: block.appt, newTime });
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
    updateAppointment(updated);
    api.updateAppointment(appt.id, {
      clientName: updated.clientName,
      serviceId: updated.serviceId,
      serviceName: updated.serviceName,
      date: updated.date,
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
    const order = Math.min(overlapOrder[i], 2);
    return { ...b, color: displayColors[i], leftPct: cascadeOffsets[order], zIdx: (b.isProcessing ? 5 : 10) + order };
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
              onClick={() => handleSlotClick(slot)}
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
            <p className="text-sm text-muted-foreground mb-4">
              Move <span className="font-medium text-foreground">{dropConfirm.appt.clientName}</span> to{' '}
              <span className="font-medium text-accent">{formatTime12(dropConfirm.newTime)}</span>?
            </p>
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
      className="absolute right-1 rounded-md border overflow-hidden cursor-pointer select-none"
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
