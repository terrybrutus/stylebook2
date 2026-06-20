import { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import AppointmentCancelModal from "../../components/AppointmentCancelModal";
import * as api from "../../lib/api";
import {
  getCalendarHourPx,
  isActiveAppointment,
} from "../../lib/appointmentLifecycle";
import { validateAppointmentChange } from "../../lib/appointmentValidation";
import {
  dateToString,
  formatDuration,
  formatPrice,
  formatTime12,
  generateTimeSlots,
  getEffectiveGridHours,
  getWeekDates,
  getWorkingScheduleForDate,
  hexToRgba,
  hueRotate,
} from "../../lib/utils";
import { useAppStore } from "../../store/useAppStore";
import type {
  Appointment,
  AppointmentModalState,
  PhaseInstance,
} from "../../types";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function minutesToPx(
  minutes: number,
  startMinutes: number,
  minutePx: number,
): number {
  return (minutes - startMinutes) * minutePx;
}

function recalcPhaseStarts(
  phases: PhaseInstance[],
  baseStart: string,
): PhaseInstance[] {
  const [sh, sm] = baseStart.split(":").map(Number);
  let cursor = sh * 60 + sm;
  return phases.map((p) => {
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "00");
    cursor += p.durationMinutes;
    return { ...p, startTime: `${hh}:${mm}` };
  });
}

interface Props {
  anchorDate: Date;
  onModalChange: (state: AppointmentModalState) => void;
  onDayClick?: (date: string) => void;
  onWeekChange?: (dir: 1 | -1) => void;
}

interface ContextMenu {
  x: number;
  y: number;
  appointment: Appointment;
}

type ResizeEdge = "top" | "bottom";

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

export function WeekView({
  anchorDate,
  onModalChange,
  onDayClick,
  onWeekChange,
}: Props) {
  const { settings, allAppointments, updateSettings } = useAppStore(
    useShallow((s) => ({
      settings: s.settings,
      allAppointments: s.appointments,
      updateSettings: s.updateSettings,
    })),
  );

  const updateAppointmentInStore = useAppStore((s) => s.updateAppointment);

  const { startHour, endHour } = getEffectiveGridHours(settings);
  const minutePx = getCalendarHourPx(settings) / 60;
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const totalMinutes = endMinutes - startMinutes;
  const totalPx = totalMinutes * minutePx;
  const timeSlots = generateTimeSlots(startHour, endHour);

  // Week dates respecting startWeekOnMonday setting
  const weekDates = getWeekDates(anchorDate, settings.startWeekOnMonday);
  const weekStartStr = dateToString(weekDates[0]);

  const todayStr = dateToString(new Date());
  const [currentTimePx, setCurrentTimePx] = useState(() => {
    const now = new Date();
    return minutesToPx(
      now.getHours() * 60 + now.getMinutes(),
      startHour * 60,
      minutePx,
    );
  });
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [cancelAppointment, setCancelAppointment] =
    useState<Appointment | null>(null);

  // Mobile 3-day swipe state — reset window to show today when anchorDate changes
  const [mobileStartIdx, setMobileStartIdx] = useState(() => {
    const todayIdx = weekDates.findIndex((d) => dateToString(d) === todayStr);
    return todayIdx >= 0 ? Math.min(Math.floor(todayIdx / 3) * 3, 4) : 0;
  });
  const [slideStyle, setSlideStyle] = useState<React.CSSProperties>({});

  // Refs for swipe handling — keep current values accessible inside native event listeners
  const outerRef = useRef<HTMLDivElement>(null);
  const swipeTouchRef = useRef<{
    startX: number;
    startY: number;
    isHorizontal: boolean;
    decided: boolean;
    fired: boolean;
  } | null>(null);
  const suppressTapUntilRef = useRef(0);
  const isFullWeekMobileRef = useRef(false);
  const mobileStartIdxRef = useRef(mobileStartIdx);
  mobileStartIdxRef.current = mobileStartIdx;
  const onWeekChangeRef = useRef(onWeekChange);
  onWeekChangeRef.current = onWeekChange;

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
  const activeResizeRef = useRef<{
    block: RenderBlock;
    edge: ResizeEdge;
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
  const [resizeGhost, setResizeGhost] = useState<{
    topPx: number;
    heightPx: number;
    dateStr: string;
    label: string;
  } | null>(null);

  const [dropConfirm, setDropConfirm] = useState<{
    appt: Appointment;
    updated: Appointment;
    previous: Appointment;
    actionLabel: string;
    newTime: string;
    newDate: string;
    outsideHours?: string;
    overlap?: { message: string; isProcessing: boolean };
  } | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const now = new Date();
      setCurrentTimePx(
        minutesToPx(
          now.getHours() * 60 + now.getMinutes(),
          startMinutes,
          minutePx,
        ),
      );
    }, 30000);
    return () => clearInterval(id);
  }, [startMinutes, minutePx]);

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
      if (Date.now() < suppressTapUntilRef.current) return;
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
  const isFullWeekMobile =
    isMobilePortrait && settings.mobileWeekLayout === "full-week";
  isFullWeekMobileRef.current = isFullWeekMobile;

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
    const weekStart = new Date(`${weekStartStr}T00:00:00`);
    const today = new Date(`${todayStr}T00:00:00`);
    const todayIdx = Math.round(
      (today.getTime() - weekStart.getTime()) / 86_400_000,
    );
    setMobileStartIdx(
      todayIdx >= 0 && todayIdx < 7
        ? Math.min(Math.floor(todayIdx / 3) * 3, 4)
        : 0,
    );
  }, [weekStartStr, todayStr]);

  const visibleDates =
    isMobilePortrait && !isFullWeekMobile
      ? weekDates.slice(mobileStartIdx, mobileStartIdx + 3)
      : weekDates;

  function changeMobileStart(newIdx: number, currentIdx: number) {
    const exitDir = newIdx > currentIdx ? -1 : 1;
    // Phase 1: slide current content out
    setSlideStyle({
      transform: `translateX(${exitDir * 90}px) scale(0.985)`,
      opacity: 0,
      transition: "transform 180ms cubic-bezier(0.4,0,1,1), opacity 150ms ease",
    });
    setTimeout(() => {
      // Swap content and teleport to enter-from position (no transition)
      setMobileStartIdx(newIdx);
      setSlideStyle({
        transform: `translateX(${-exitDir * 90}px)`,
        opacity: 0,
        transition: "none",
      });
      // Phase 2: slide new content in — double rAF ensures browser paints the teleport first
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setSlideStyle({
            transform: "translateX(0)",
            opacity: 1,
            transition:
              "transform 240ms cubic-bezier(0,0,0.2,1), opacity 180ms ease",
          });
        });
      });
    }, 185);
  }

  // Native swipe handler — must be non-passive so we can preventDefault() on horizontal
  // gestures. touch-action: pan-y leaves vertical scrolling to the browser while reserving
  // horizontal gestures for this handler.
  // biome-ignore lint/correctness/useExhaustiveDependencies: all state accessed via refs; effect only re-wires on mobile/desktop switch
  useEffect(() => {
    if (!isMobilePortrait) return;
    const el = outerRef.current;
    if (!el) return;

    function changeWeek(dir: 1 | -1) {
      setSlideStyle({
        transform: `translateX(${dir * -90}px) scale(0.985)`,
        opacity: 0,
        transition:
          "transform 180ms cubic-bezier(0.4,0,1,1), opacity 150ms ease",
      });
      setTimeout(() => {
        onWeekChangeRef.current?.(dir);
        setMobileStartIdx(0);
        setSlideStyle({
          transform: `translateX(${dir * 90}px)`,
          opacity: 0,
          transition: "none",
        });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setSlideStyle({
              transform: "translateX(0)",
              opacity: 1,
              transition:
                "transform 240ms cubic-bezier(0,0,0.2,1), opacity 180ms ease",
            });
          });
        });
      }, 185);
    }
    function navigate(dx: number) {
      const idx = mobileStartIdxRef.current;
      if (dx < 0) {
        // This mapping produces the intended deployed behavior: swipe left → back.
        if (isFullWeekMobileRef.current) {
          changeWeek(1);
          return;
        }
        if (idx + 3 < 7) changeMobileStart(Math.min(idx + 3, 4), idx);
        else changeWeek(1);
      } else {
        // Swipe right → forward.
        if (isFullWeekMobileRef.current) {
          changeWeek(-1);
          return;
        }
        if (idx > 0) changeMobileStart(Math.max(idx - 3, 0), idx);
        else changeWeek(-1);
      }
    }
    function onTouchStart(e: TouchEvent) {
      swipeTouchRef.current = {
        startX: e.touches[0].clientX,
        startY: e.touches[0].clientY,
        isHorizontal: false,
        decided: false,
        fired: false,
      };
    }
    function onTouchMove(e: TouchEvent) {
      const s = swipeTouchRef.current;
      if (!s) return;
      const dx = e.touches[0].clientX - s.startX;
      const dy = e.touches[0].clientY - s.startY;
      if (!s.decided) {
        if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
          s.decided = true;
          s.isHorizontal = Math.abs(dx) > Math.abs(dy);
        }
      }
      if (!s.isHorizontal) return;
      // Prevent the browser (scroll, pull-to-refresh, back-swipe) from claiming the gesture
      e.preventDefault();
      // Navigate as soon as the threshold is crossed — don't wait for touchend,
      // which some browsers swallow (touchcancel) for rightward/edge swipes.
      if (!s.fired && Math.abs(dx) >= 50) {
        s.fired = true;
        suppressTapUntilRef.current = Date.now() + 500;
        navigate(dx);
      }
    }
    function onTouchEnd(e: TouchEvent) {
      const s = swipeTouchRef.current;
      swipeTouchRef.current = null;
      if (!s || s.fired || !s.decided || !s.isHorizontal) return;
      const dx = e.changedTouches[0].clientX - s.startX;
      if (Math.abs(dx) >= 40) {
        suppressTapUntilRef.current = Date.now() + 500;
        navigate(dx);
      }
    }
    function onTouchCancel() {
      swipeTouchRef.current = null;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchCancel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchCancel);
    };
  }, [isMobilePortrait]);

  // Drag helpers
  function getSnappedMinutes(
    clientY: number,
    colEl: HTMLDivElement,
    offsetMinutes: number,
  ): number {
    const rect = colEl.getBoundingClientRect();
    const relY = clientY - rect.top - offsetMinutes * minutePx;
    const rawMin = startMinutes + relY / minutePx;
    const snapped = Math.round(rawMin / 15) * 15;
    return Math.max(startMinutes, Math.min(endMinutes - 15, snapped));
  }

  function minutesToTimeStr(totalMin: number): string {
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "00")}`;
  }

  function timeStrToMinutes(time: string): number {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  }

  async function persistAppointmentUpdate(
    updated: Appointment,
    previous: Appointment,
  ) {
    updateAppointmentInStore(updated);
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
      updateAppointmentInStore(previous);
    }
  }

  function getResizeDraft(
    block: RenderBlock,
    edge: ResizeEdge,
    clientY: number,
    dateStr: string,
  ) {
    const col = colRefs.current.get(dateStr);
    if (!col) return null;
    const start = timeStrToMinutes(block.appt.startTime);
    const end = start + block.appt.durationMinutes;
    const snapped = getSnappedMinutes(clientY, col, 0);
    let nextStart = start;
    let nextEnd = end;
    if (edge === "top") {
      nextStart = Math.min(snapped, end - 15);
    } else {
      nextEnd = Math.max(snapped, start + 15);
    }
    nextStart = Math.max(startMinutes, nextStart);
    nextEnd = Math.min(endMinutes, nextEnd);
    const durationMinutes = Math.max(15, nextEnd - nextStart);
    return {
      startTime: minutesToTimeStr(nextStart),
      durationMinutes,
      topPx: minutesToPx(nextStart, startMinutes, minutePx),
      heightPx: Math.max(durationMinutes * minutePx, 20),
    };
  }

  function handleResizePointerDown(
    e: React.PointerEvent,
    block: RenderBlock,
    edge: ResizeEdge,
  ) {
    if (
      e.pointerType !== "mouse" ||
      block.isProcessing ||
      block.appt.phases.length > 0
    )
      return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as Element;
    target.setPointerCapture(e.pointerId);
    activeResizeRef.current = {
      block,
      edge,
      pointerId: e.pointerId,
      pointerTarget: target,
    };
  }

  function handleResizePointerMove(e: React.PointerEvent, dateStr: string) {
    const resize = activeResizeRef.current;
    if (!resize) return;
    e.preventDefault();
    e.stopPropagation();
    const draft = getResizeDraft(resize.block, resize.edge, e.clientY, dateStr);
    if (!draft) return;
    setResizeGhost({
      topPx: draft.topPx,
      heightPx: draft.heightPx,
      dateStr,
      label: `${draft.startTime} · ${formatDuration(draft.durationMinutes)}`,
    });
  }

  function handleResizePointerUp(e: React.PointerEvent, dateStr: string) {
    const resize = activeResizeRef.current;
    if (!resize) return;
    e.preventDefault();
    e.stopPropagation();
    const draft = getResizeDraft(resize.block, resize.edge, e.clientY, dateStr);
    const previous = resize.block.appt;
    activeResizeRef.current = null;
    setResizeGhost(null);
    if (
      !draft ||
      (draft.startTime === previous.startTime &&
        draft.durationMinutes === previous.durationMinutes)
    )
      return;
    const updated: Appointment = {
      ...previous,
      startTime: draft.startTime,
      durationMinutes: draft.durationMinutes,
      updatedAt: new Date().toISOString(),
    };
    const validation = validateAppointmentChange(
      updated,
      allAppointments,
      settings,
    );
    setDropConfirm({
      appt: previous,
      updated,
      previous,
      actionLabel: "Resize appointment?",
      newTime: draft.startTime,
      newDate: dateStr,
      outsideHours: validation.outsideHours,
      overlap: validation.overlap,
    });
  }

  function handleResizePointerCancel() {
    activeResizeRef.current = null;
    setResizeGhost(null);
  }

  function getDateAtClientX(clientX: number): string | null {
    for (const [ds, el] of colRefs.current.entries()) {
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return ds;
    }
    return null;
  }

  function handleBlockPointerDown(
    e: React.PointerEvent,
    block: RenderBlock,
    dateStr: string,
  ) {
    if (block.isProcessing) return;
    if (e.button !== 0) return;
    e.stopPropagation();
    const isTouch = e.pointerType === "touch";
    const target = e.currentTarget as Element;
    if (!isTouch) target.setPointerCapture(e.pointerId);
    const col = colRefs.current.get(dateStr);
    if (!col) return;
    const rect = col.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const offsetMinutes = Math.max(0, (clickY - block.topPx) / minutePx);
    const longPressTimer = setTimeout(() => {
      const drag = activeDragRef.current;
      if (!drag || drag.started) return;
      if (isTouch && !drag.dragArmed) {
        drag.dragArmed = true;
        drag.pointerTarget.setPointerCapture(drag.pointerId);
        setDragGhost({
          topPx: drag.block.topPx,
          heightPx: drag.block.heightPx,
          time: drag.block.appt.startTime,
          dateStr,
          color: drag.block.color,
          label: drag.block.label,
        });
      } else {
        setContextMenu({ x: e.clientX, y: e.clientY, appointment: block.appt });
      }
    }, 300);
    activeDragRef.current = {
      block,
      offsetMinutes,
      started: false,
      startClientY: e.clientY,
      startClientX: e.clientX,
      longPressTimer,
      isTouch,
      dragArmed: !isTouch,
      pointerId: e.pointerId,
      pointerTarget: target,
    };
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
        setDragGhost(null);
      }
      return;
    }
    const dy = Math.abs(e.clientY - drag.startClientY);
    const dx = Math.abs(e.clientX - drag.startClientX);
    if (!drag.started) {
      if (dy < 6 && dx < 6) return;
      drag.started = true;
      if (drag.longPressTimer) {
        clearTimeout(drag.longPressTimer);
        drag.longPressTimer = null;
      }
    }
    const targetDate = getDateAtClientX(e.clientX);
    const colEl = targetDate ? colRefs.current.get(targetDate) : null;
    if (!colEl || !targetDate) return;
    const totalMin = getSnappedMinutes(e.clientY, colEl, drag.offsetMinutes);
    const topPx = minutesToPx(totalMin, startMinutes, minutePx);
    setDragGhost({
      topPx,
      heightPx: drag.block.heightPx,
      time: minutesToTimeStr(totalMin),
      dateStr: targetDate,
      color: drag.block.color,
      label: drag.block.label,
    });
  }

  function handleBlockPointerUp(
    e: React.PointerEvent,
    block: RenderBlock,
    origDateStr: string,
  ) {
    const drag = activeDragRef.current;
    if (drag?.longPressTimer) clearTimeout(drag.longPressTimer);
    activeDragRef.current = null;
    setDragGhost(null);
    if (!drag) return;
    if (drag.isTouch && drag.dragArmed && !drag.started) return;
    if (!drag?.started) {
      onModalChange({ isOpen: true, mode: "edit", appointment: block.appt });
      return;
    }
    const targetDate = getDateAtClientX(e.clientX) ?? origDateStr;
    const colEl = colRefs.current.get(targetDate);
    if (!colEl) return;
    const totalMin = getSnappedMinutes(e.clientY, colEl, drag.offsetMinutes);
    const newTime = minutesToTimeStr(totalMin);
    if (newTime !== block.appt.startTime || targetDate !== block.appt.date) {
      const toMin = (t: string) => {
        const [h, m] = t.split(":").map(Number);
        return h * 60 + m;
      };
      // Check active-vs-active overlap — prevent drop if it conflicts
      const newStartMin = toMin(newTime);
      const newActiveBlocks: { start: number; end: number }[] = [];
      if (block.appt.phases.length === 0) {
        newActiveBlocks.push({
          start: newStartMin,
          end: newStartMin + block.appt.durationMinutes,
        });
      } else {
        let cursor = newStartMin;
        for (const p of block.appt.phases) {
          if (p.phaseType === "active") {
            newActiveBlocks.push({
              start: cursor,
              end: cursor + p.durationMinutes,
            });
          }
          cursor += p.durationMinutes;
        }
      }
      let hasConflict = false;
      const dayAppts = allAppointments.filter(
        (a) => a.date === targetDate && isActiveAppointment(a),
      );
      for (const existing of dayAppts) {
        if (existing.id === block.appt.id) continue;
        const existingActiveBlocks: { start: number; end: number }[] = [];
        if (existing.phases.length === 0) {
          const s = toMin(existing.startTime);
          existingActiveBlocks.push({
            start: s,
            end: s + existing.durationMinutes,
          });
        } else {
          for (const p of existing.phases) {
            if (p.phaseType === "active") {
              const tp = p.startTime.includes("T")
                ? p.startTime.split("T")[1].slice(0, 5)
                : p.startTime;
              const s = toMin(tp);
              existingActiveBlocks.push({
                start: s,
                end: s + p.durationMinutes,
              });
            }
          }
        }
        for (const na of newActiveBlocks) {
          for (const ea of existingActiveBlocks) {
            if (na.start < ea.end && na.end > ea.start) {
              hasConflict = true;
              break;
            }
          }
          if (hasConflict) break;
        }
        if (hasConflict) break;
      }
      // Active conflicts are no longer silently blocked; the shared confirmation
      // dialog warns before saving so resize/drag/modal behavior stays aligned.
      const schedule = getWorkingScheduleForDate(targetDate, settings);
      let outsideHours: string | undefined;
      if (!schedule.enabled) {
        outsideHours = "That day is not in your working schedule.";
      } else {
        const apptEnd = toMin(newTime) + block.appt.durationMinutes;
        if (
          toMin(newTime) < toMin(schedule.start) ||
          apptEnd > toMin(schedule.end)
        ) {
          outsideHours = `Outside working hours (${formatTime12(schedule.start)}–${formatTime12(schedule.end)}).`;
        }
      }
      const newPhases =
        block.appt.phases.length > 0
          ? recalcPhaseStarts(block.appt.phases, newTime)
          : block.appt.phases;
      const updated: Appointment = {
        ...block.appt,
        date: targetDate,
        startTime: newTime,
        phases: newPhases,
        updatedAt: new Date().toISOString(),
      };
      const validation = validateAppointmentChange(
        updated,
        allAppointments,
        settings,
      );
      setDropConfirm({
        appt: block.appt,
        updated,
        previous: block.appt,
        actionLabel: "Move appointment?",
        newTime,
        newDate: targetDate,
        outsideHours: validation.outsideHours ?? outsideHours,
        overlap: validation.overlap,
      });
    }
  }

  function handleBlockPointerCancel() {
    if (activeDragRef.current?.longPressTimer)
      clearTimeout(activeDragRef.current.longPressTimer);
    activeDragRef.current = null;
    setDragGhost(null);
  }

  async function confirmDrop() {
    if (!dropConfirm) return;
    const { updated, previous } = dropConfirm;
    setDropConfirm(null);
    await persistAppointmentUpdate(updated, previous);
  }

  function buildBlocks(dateStr: string): RenderBlock[] {
    const dayAppts = allAppointments.filter(
      (a) => a.date === dateStr && isActiveAppointment(a),
    );
    const raw: Omit<RenderBlock, "leftPct" | "rightPct" | "zIdx">[] = [];
    for (const appt of dayAppts) {
      if (appt.phases.length === 0) {
        const apptStartMin = timeStrToMinutes(appt.startTime);
        const topPx = minutesToPx(apptStartMin, startMinutes, minutePx);
        const heightPx = Math.max(appt.durationMinutes * minutePx, 20);
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
          const topPx = minutesToPx(phaseStartMin, startMinutes, minutePx);
          const heightPx = Math.max(phase.durationMinutes * minutePx, 20);
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
    const offsets = ["0%", "20%", "40%"];
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
        rightPct: "0%",
        zIdx: (b.isProcessing ? 5 : 10) + apptOrder,
      };
    });
  }

  return (
    <div
      ref={outerRef}
      className="flex flex-col flex-1 overflow-hidden select-none"
      style={{
        touchAction: isMobilePortrait ? "pan-y" : undefined,
        overscrollBehaviorX: "none",
      }}
    >
      {isMobilePortrait && (
        <div className="flex items-center justify-end gap-1 px-3 py-2 border-b border-border bg-card">
          <span className="mr-auto text-[11px] font-medium text-muted-foreground">
            Mobile week layout
          </span>
          <button
            type="button"
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              !isFullWeekMobile
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => updateSettings({ mobileWeekLayout: "three-day" })}
            data-ocid="week.layout_three_day"
          >
            3 Days
          </button>
          <button
            type="button"
            className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
              isFullWeekMobile
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => updateSettings({ mobileWeekLayout: "full-week" })}
            data-ocid="week.layout_full_week"
          >
            Full Week
          </button>
        </div>
      )}
      {/* Day header row */}
      <div className="flex flex-shrink-0 border-b border-border bg-card">
        {/* Time column spacer — on mobile shows prev arrow */}
        <div className="w-14 flex-shrink-0 border-r border-border flex items-center justify-center">
          {isMobilePortrait && !isFullWeekMobile && (
            <button
              type="button"
              className="w-full h-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                if (mobileStartIdx > 0) {
                  changeMobileStart(
                    Math.max(mobileStartIdx - 3, 0),
                    mobileStartIdx,
                  );
                } else {
                  onWeekChange?.(-1);
                  setMobileStartIdx(0);
                }
              }}
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
          const apptCount = allAppointments.filter(
            (a) => a.date === dateStr && isActiveAppointment(a),
          ).length;
          return (
            <button
              key={dateStr}
              type="button"
              className="flex-1 flex flex-col items-center justify-center py-1.5 border-r border-border cursor-pointer hover:bg-muted/30 transition-colors relative min-w-0"
              onClick={() => onDayClick?.(dateStr)}
              data-ocid={`week.day_header.${dayNum}`}
            >
              <span
                className={`${isFullWeekMobile ? "text-[9px]" : "text-[10px]"} uppercase tracking-wider font-medium`}
                style={{ color: isToday ? "#00ADB5" : undefined }}
              >
                {dayLabel}
              </span>
              <span
                className={`${isFullWeekMobile ? "text-xs w-6 h-6" : "text-sm w-7 h-7"} font-bold leading-none mt-0.5 flex items-center justify-center rounded-full`}
                style={{
                  background: isToday ? "#00ADB5" : "transparent",
                  color: isToday ? "#fff" : undefined,
                }}
              >
                {dayNum}
              </span>
              {apptCount > 0 && !isFullWeekMobile && (
                <span className="text-[9px] font-medium text-muted-foreground leading-none px-1 py-0.5 rounded bg-muted/60 mt-0.5">
                  {apptCount} {apptCount === 1 ? "appt" : "appts"}
                </span>
              )}
              {/* Next arrow on last visible day — mobile only */}
              {isMobilePortrait && !isFullWeekMobile && isLast && (
                <button
                  type="button"
                  className="absolute right-0 top-0 bottom-0 flex items-center pr-0.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mobileStartIdx + 3 < 7) {
                      changeMobileStart(mobileStartIdx + 3, mobileStartIdx);
                    } else {
                      onWeekChange?.(1);
                      setMobileStartIdx(0);
                    }
                  }}
                  aria-label="Next days"
                >
                  <span className="text-base leading-none text-muted-foreground">
                    ›
                  </span>
                </button>
              )}
            </button>
          );
        })}
      </div>

      {/* Scrollable time grid — overflow-y-scroll so scrollbar always reserves space, keeping header columns aligned */}
      <div
        className="flex flex-1 overflow-y-scroll overflow-x-hidden"
        style={{ touchAction: "pan-y", overscrollBehavior: "none" }}
        data-ocid="calendar.week_scroll"
      >
        <div
          className="flex min-w-0 w-full"
          style={{ height: totalPx, ...slideStyle }}
        >
          {/* Time labels */}
          <div
            className="w-14 flex-shrink-0 bg-background border-r border-border relative z-10"
            style={{ height: totalPx }}
          >
            {timeSlots.map((slot) => {
              const [sh, sm] = slot.split(":").map(Number);
              const slotMinutes = sh * 60 + sm;
              const top = minutesToPx(slotMinutes, startMinutes, minutePx);
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
                ref={(el) => {
                  if (el) colRefs.current.set(dateStr, el);
                  else colRefs.current.delete(dateStr);
                }}
              >
                {/* Non-working hours overlay */}
                {(() => {
                  const sched = getWorkingScheduleForDate(dateStr, settings);
                  const toMin = (t: string) => {
                    const [h, m] = t.split(":").map(Number);
                    return h * 60 + m;
                  };
                  if (!sched.enabled) {
                    return (
                      <div
                        className="absolute inset-0 pointer-events-none z-[2]"
                        style={{ backgroundColor: "rgba(0,0,0,0.18)" }}
                      />
                    );
                  }
                  const dayStartMin = toMin(sched.start);
                  const dayEndMin = toMin(sched.end);
                  return (
                    <>
                      {dayStartMin > startMinutes && (
                        <div
                          className="absolute left-0 right-0 top-0 pointer-events-none z-[2]"
                          style={{
                            height: minutesToPx(
                              dayStartMin,
                              startMinutes,
                              minutePx,
                            ),
                            backgroundColor: "rgba(0,0,0,0.12)",
                          }}
                        />
                      )}
                      {dayEndMin < endMinutes && (
                        <div
                          className="absolute left-0 right-0 pointer-events-none z-[2]"
                          style={{
                            top: minutesToPx(dayEndMin, startMinutes, minutePx),
                            bottom: 0,
                            backgroundColor: "rgba(0,0,0,0.12)",
                          }}
                        />
                      )}
                    </>
                  );
                })()}

                {/* Horizontal guide lines across ALL columns including today */}
                {timeSlots.map((slot) => {
                  const [sh, sm] = slot.split(":").map(Number);
                  const top = minutesToPx(sh * 60 + sm, startMinutes, minutePx);
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
                  const top = minutesToPx(sh * 60 + sm, startMinutes, minutePx);
                  return (
                    <div
                      key={slot}
                      className="absolute left-0 right-0 cursor-pointer hover:bg-accent/5 transition-colors"
                      style={{ top, height: minutePx * 30, zIndex: 1 }}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        if (e.button === 0) handleSlotClick(dateStr, slot);
                      }}
                      onContextMenu={(e) => e.preventDefault()}
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
                    compact={isFullWeekMobile}
                    leftPct={block.leftPct}
                    zIdx={block.zIdx}
                    isDragging={
                      dragGhost !== null &&
                      activeDragRef.current?.block.appt.id === block.appt.id &&
                      activeDragRef.current?.block.phaseIndex ===
                        block.phaseIndex
                    }
                    onBlockPointerDown={(e) =>
                      handleBlockPointerDown(e, block, dateStr)
                    }
                    onBlockPointerMove={handleBlockPointerMove}
                    onBlockPointerUp={(e) =>
                      handleBlockPointerUp(e, block, dateStr)
                    }
                    onBlockPointerCancel={handleBlockPointerCancel}
                    onResizePointerDown={(e, edge) =>
                      handleResizePointerDown(e, block, edge)
                    }
                    onResizePointerMove={(e) =>
                      handleResizePointerMove(e, dateStr)
                    }
                    onResizePointerUp={(e) => handleResizePointerUp(e, dateStr)}
                    onResizePointerCancel={handleResizePointerCancel}
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
                      left: "2px",
                      zIndex: 50,
                      borderColor: dragGhost.color,
                      backgroundColor: hexToRgba(dragGhost.color, 0.25),
                    }}
                  >
                    <div className="px-1 py-0.5">
                      <span className="text-[9px] font-bold">
                        {formatTime12(dragGhost.time)}
                      </span>
                    </div>
                  </div>
                )}

                {resizeGhost && resizeGhost.dateStr === dateStr && (
                  <div
                    className="absolute right-0.5 rounded border-2 border-dashed pointer-events-none"
                    style={{
                      top: resizeGhost.topPx + 1,
                      height: Math.max(resizeGhost.heightPx - 2, 4),
                      left: "2px",
                      zIndex: 55,
                      borderColor: "oklch(var(--accent))",
                      backgroundColor: "oklch(var(--accent) / 0.12)",
                    }}
                  >
                    <div className="px-1 py-0.5">
                      <span className="text-[9px] font-bold">
                        {resizeGhost.label}
                      </span>
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
              setCancelAppointment(contextMenu.appointment);
              setContextMenu(null);
            }}
            data-ocid="appointment.delete_button"
          >
            Cancel / no-show
          </button>
        </div>
      )}

      <AppointmentCancelModal
        appointment={cancelAppointment}
        onClose={() => setCancelAppointment(null)}
      />

      {/* Drop confirmation dialog */}
      {dropConfirm && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center bg-foreground/40 backdrop-blur-sm">
          <div className="bg-card rounded-2xl shadow-2xl p-5 mx-4 max-w-sm w-full">
            <p className="text-sm font-semibold mb-1">
              {dropConfirm.actionLabel}
            </p>
            <p className="text-sm text-muted-foreground mb-2">
              Move{" "}
              <span className="font-medium text-foreground">
                {dropConfirm.appt.clientName}
              </span>{" "}
              to{" "}
              <span className="font-medium text-accent">
                {new Date(`${dropConfirm.newDate}T00:00:00`).toLocaleDateString(
                  "en-US",
                  { weekday: "short", month: "short", day: "numeric" },
                )}
              </span>{" "}
              at{" "}
              <span className="font-medium text-accent">
                {formatTime12(dropConfirm.newTime)}
              </span>
              ?
            </p>
            {dropConfirm.outsideHours && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
                ⚠ {dropConfirm.outsideHours}
              </p>
            )}
            {dropConfirm.overlap && (
              <p
                className={`text-xs mb-3 ${
                  dropConfirm.overlap.isProcessing
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-destructive"
                }`}
              >
                ⚠ {dropConfirm.overlap.message}
              </p>
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
  compact: boolean;
  leftPct: string;
  zIdx: number;
  isDragging: boolean;
  onBlockPointerDown: (e: React.PointerEvent) => void;
  onBlockPointerMove: (e: React.PointerEvent) => void;
  onBlockPointerUp: (e: React.PointerEvent) => void;
  onBlockPointerCancel: () => void;
  onResizePointerDown: (e: React.PointerEvent, edge: ResizeEdge) => void;
  onResizePointerMove: (e: React.PointerEvent) => void;
  onResizePointerUp: (e: React.PointerEvent) => void;
  onResizePointerCancel: () => void;
  onContextMenu: (e: React.MouseEvent, appt: Appointment) => void;
};

function WeekBlock({
  block,
  compact,
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
}: WeekBlockProps) {
  const { appt, topPx, heightPx, isProcessing, label, color } = block;
  const isShort = compact || heightPx < 50;

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
      className="absolute right-0.5 rounded border overflow-hidden cursor-pointer select-none text-left group"
      style={{
        top: topPx + 1,
        height: Math.max(heightPx - 2, 4),
        left: `calc(${leftPct} + 2px)`,
        zIndex,
        borderLeft: leftPct !== "0%" ? `3px solid ${color}` : undefined,
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
      {!isProcessing && appt.phases.length === 0 && (
        <>
          <span
            className="absolute left-0 right-0 top-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-foreground/20 z-10"
            onPointerDown={(e) => onResizePointerDown(e, "top")}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
            data-ocid="appointment.resize_top"
          />
          <span
            className="absolute left-0 right-0 bottom-0 h-2 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-foreground/20 z-10"
            onPointerDown={(e) => onResizePointerDown(e, "bottom")}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerCancel}
            data-ocid="appointment.resize_bottom"
          />
        </>
      )}
      <div className="px-1 py-0.5 h-full overflow-hidden flex flex-col">
        {isProcessing ? (
          // Processing phase: show client name so context is clear
          <span
            className={`${compact ? "text-[8px]" : "text-[9px]"} text-foreground/70 italic leading-tight`}
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          >
            {label}
          </span>
        ) : isShort ? (
          // Short block (<50px): client name only, no truncation
          <span
            className={`${compact ? "text-[8px]" : "text-[10px]"} font-bold leading-tight text-foreground`}
            style={{ wordBreak: "break-word", overflowWrap: "break-word" }}
          >
            {appt.clientName}
          </span>
        ) : (
          // Full block: client name, service name, duration · price
          <>
            <span
              className={`${compact ? "text-[8px]" : "text-[10px]"} font-bold leading-tight text-foreground`}
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
