import { c as createLucideIcon, u as useAppStore, r as reactExports, j as jsxRuntimeExports, a as useRouterState, b as useNavigate, d as CalendarDays } from "./index-C28LwCdI.js";
import { B as Button, A as AppointmentModal } from "./AppointmentModal-CaVWxjLw.js";
import { d as generateTimeSlots, e as getCurrentTimePixels, t as timeToPixels, h as durationToPixels, a as formatTime12, i as hexToRgba, b as formatDuration, c as formatPrice, j as getMonthGrid, k as dateToString, l as getWeekDates } from "./utils-VpTwBoiu.js";
import { u as useShallow } from "./shallow-B4tNjq6h.js";
import { C as ChevronRight } from "./chevron-right-CtrInTbJ.js";
import { P as Plus } from "./triangle-alert-uzvYPtP7.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  ["path", { d: "M3 10h18", key: "8toen8" }],
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M17 14h-6", key: "bkmgh3" }],
  ["path", { d: "M13 18H7", key: "bb0bb7" }],
  ["path", { d: "M7 14h.01", key: "1qa3f1" }],
  ["path", { d: "M17 18h.01", key: "1bdyru" }]
];
const CalendarRange = createLucideIcon("calendar-range", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [["path", { d: "m15 18-6-6 6-6", key: "1wnfg3" }]];
const ChevronLeft = createLucideIcon("chevron-left", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2", key: "afitv7" }],
  ["path", { d: "M3 9h18", key: "1pudct" }],
  ["path", { d: "M3 15h18", key: "5xshup" }],
  ["path", { d: "M9 3v18", key: "fh3hqa" }],
  ["path", { d: "M15 3v18", key: "14nvp0" }]
];
const Grid3x3 = createLucideIcon("grid-3x3", __iconNode);
const HOUR_PX = 60;
function getBlockLabel$1(appt, phaseIndex) {
  if (appt.phases.length === 0) {
    return {
      label: `${appt.clientName} — ${appt.serviceName}`,
      isProcessing: false
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
      isProcessing: false
    };
  }
  return { label: `${appt.clientName} — ${phase.name}`, isProcessing: false };
}
function getPhaseStartMinutes$1(phase) {
  const timePart = phase.startTime.includes("T") ? phase.startTime.split("T")[1].slice(0, 5) : phase.startTime.slice(0, 5);
  const [h, m] = timePart.split(":").map(Number);
  return h * 60 + m;
}
function DayView({ date, onModalChange }) {
  const settings = useAppStore(useShallow((s) => s.settings));
  const appointments = useAppStore(
    useShallow((s) => s.appointments.filter((a) => a.date === date))
  );
  const startHour = Number(settings.workingHoursStart.split(":")[0]);
  const endHour = Number(settings.workingHoursEnd.split(":")[0]);
  const timeSlots = generateTimeSlots(startHour, endHour);
  const totalPx = (endHour - startHour) * HOUR_PX;
  const isToday = date === (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const [currentTimePx, setCurrentTimePx] = reactExports.useState(
    () => getCurrentTimePixels(startHour)
  );
  const [contextMenu, setContextMenu] = reactExports.useState(null);
  const containerRef = reactExports.useRef(null);
  reactExports.useEffect(() => {
    if (!isToday) return;
    const id = setInterval(
      () => setCurrentTimePx(getCurrentTimePixels(startHour)),
      3e4
    );
    return () => clearInterval(id);
  }, [isToday, startHour]);
  reactExports.useEffect(() => {
    if (!contextMenu) return;
    function handler() {
      setContextMenu(null);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);
  const handleSlotClick = reactExports.useCallback(
    (slot) => {
      onModalChange({
        isOpen: true,
        mode: "create",
        prefillDate: date,
        prefillTime: slot
      });
    },
    [date, onModalChange]
  );
  const handleApptClick = reactExports.useCallback(
    (e, appt) => {
      e.stopPropagation();
      e.preventDefault();
      onModalChange({ isOpen: true, mode: "edit", appointment: appt });
    },
    [onModalChange]
  );
  const handleApptContextMenu = reactExports.useCallback(
    (e, appt) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, appointment: appt });
    },
    []
  );
  const longPressTimer = reactExports.useRef(null);
  const longPressTarget = reactExports.useRef(null);
  function handleTouchStart(e, appt) {
    longPressTarget.current = appt;
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      setContextMenu({ x: touch.clientX, y: touch.clientY, appointment: appt });
    }, 500);
  }
  function handleTouchEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }
  const blocks = [];
  for (const appt of appointments) {
    if (appt.phases.length === 0) {
      const top = timeToPixels(appt.startTime, startHour);
      const height = Math.max(durationToPixels(appt.durationMinutes), 20);
      blocks.push({
        appt,
        topPx: top,
        heightPx: height,
        isProcessing: false,
        label: `${appt.clientName} — ${appt.serviceName}`,
        phaseIndex: -1,
        color: appt.color
      });
    } else {
      appt.phases.forEach((phase, i) => {
        const startMin = getPhaseStartMinutes$1(phase);
        const topPx = (startMin - startHour * 60) / 60 * HOUR_PX;
        const height = Math.max(durationToPixels(phase.durationMinutes), 20);
        const { label, isProcessing } = getBlockLabel$1(appt, i);
        blocks.push({
          appt,
          topPx,
          heightPx: height,
          isProcessing,
          label,
          phaseIndex: i,
          color: appt.color
        });
      });
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 overflow-hidden", ref: containerRef, children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "w-14 flex-shrink-0 bg-background border-r border-border relative",
        style: { height: totalPx },
        children: timeSlots.map((slot) => {
          const top = timeToPixels(slot, startHour);
          const [_h, m] = slot.split(":").map(Number);
          const isHour = m === 0;
          return /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "absolute right-2 flex items-start",
              style: { top: top - 8, height: 16 },
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                "span",
                {
                  className: `text-[10px] leading-none ${isHour ? "text-muted-foreground font-medium" : "text-muted-foreground/50"}`,
                  children: isHour ? formatTime12(slot) : m === 30 ? ":30" : ""
                }
              )
            },
            slot
          );
        })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex-1 relative bg-white cursor-pointer overflow-hidden",
        style: { height: totalPx },
        children: [
          timeSlots.map((slot) => {
            const top = timeToPixels(slot, startHour);
            const [, m] = slot.split(":").map(Number);
            const isHour = m === 0;
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: `absolute left-0 right-0 pointer-events-none ${isHour ? "border-t border-border/60" : "border-t border-border/25"}`,
                style: { top }
              },
              slot
            );
          }),
          timeSlots.map((slot) => {
            const top = timeToPixels(slot, startHour);
            return /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "absolute left-0 right-0",
                style: { top, height: 30, zIndex: 1 },
                role: "button",
                tabIndex: 0,
                onClick: () => handleSlotClick(slot),
                onKeyDown: (e) => {
                  if (e.key === "Enter" || e.key === " ") handleSlotClick(slot);
                }
              },
              slot
            );
          }),
          blocks.map((block, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
            AppointmentBlock,
            {
              block,
              onEdit: handleApptClick,
              onContextMenu: handleApptContextMenu,
              onTouchStart: handleTouchStart,
              onTouchEnd: handleTouchEnd
            },
            `${block.appt.id}-${block.phaseIndex}-${idx}`
          )),
          isToday && currentTimePx >= 0 && currentTimePx <= totalPx && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "absolute left-0 right-0 pointer-events-none z-20",
              style: { top: currentTimePx },
              children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-[2px] bg-red-500" })
              ] })
            }
          )
        ]
      }
    ),
    contextMenu && /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "fixed z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden",
        style: { left: contextMenu.x, top: contextMenu.y },
        onClick: (e) => e.stopPropagation(),
        onKeyDown: (e) => e.stopPropagation(),
        role: "menu",
        tabIndex: -1,
        "data-ocid": "appointment.dropdown_menu",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors",
              onClick: () => {
                onModalChange({
                  isOpen: true,
                  mode: "edit",
                  appointment: contextMenu.appointment
                });
                setContextMenu(null);
              },
              "data-ocid": "appointment.edit_button",
              children: "Edit"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              className: "w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors",
              onClick: () => {
                onModalChange({
                  isOpen: true,
                  mode: "edit",
                  appointment: contextMenu.appointment
                });
                setContextMenu(null);
              },
              "data-ocid": "appointment.delete_button",
              children: "Delete"
            }
          )
        ]
      }
    )
  ] });
}
function AppointmentBlock({
  block,
  onEdit,
  onContextMenu,
  onTouchStart,
  onTouchEnd
}) {
  const { appt, topPx, heightPx, isProcessing, label, color } = block;
  const isShort = heightPx < 40;
  const bgStyle = isProcessing ? {
    background: `repeating-linear-gradient(45deg, ${hexToRgba(color, 0.15)}, ${hexToRgba(color, 0.15)} 4px, ${hexToRgba(color, 0.35)} 4px, ${hexToRgba(color, 0.35)} 8px)`,
    borderColor: hexToRgba(color, 0.5)
  } : {
    backgroundColor: hexToRgba(color, 0.85),
    borderColor: color
  };
  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: appointment block handles keyboard via parent
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "absolute left-1 right-1 rounded-md border overflow-hidden cursor-pointer select-none",
        style: {
          top: topPx + 1,
          height: heightPx - 2,
          zIndex: 10,
          ...bgStyle
        },
        onClick: (e) => {
          e.stopPropagation();
          onEdit(e, appt);
        },
        onContextMenu: (e) => onContextMenu(e, appt),
        onTouchStart: (e) => onTouchStart(e, appt),
        onTouchEnd,
        "data-ocid": "appointment.card",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-1.5 py-0.5 h-full flex flex-col justify-start overflow-hidden", children: isProcessing ? /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[10px] text-foreground/60 italic", children: label }) : /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "text-[11px] font-bold leading-tight text-foreground break-words",
              style: { wordBreak: "break-word", overflowWrap: "break-word" },
              children: label
            }
          ),
          !isShort && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-foreground/70 mt-0.5", children: [
            formatDuration(appt.durationMinutes),
            " · $",
            formatPrice(appt.price)
          ] })
        ] }) })
      }
    )
  );
}
const DAY_NAMES_MON = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_NAMES_SUN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function MonthView({ year, month, onDayClick, onModalChange }) {
  const settings = useAppStore(useShallow((s) => s.settings));
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const todayStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const grid = getMonthGrid(year, month, settings.startWeekOnMonday);
  const dayNames = settings.startWeekOnMonday ? DAY_NAMES_MON : DAY_NAMES_SUN;
  function getAppts(dateStr) {
    return appointments.filter((a) => a.date === dateStr);
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex flex-col flex-1 overflow-hidden bg-background",
      "data-ocid": "calendar.month_grid",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-7 border-b border-border flex-shrink-0", children: dayNames.map((d) => /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "py-2 text-center text-xs font-semibold text-muted-foreground",
            children: d
          },
          d
        )) }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "grid grid-cols-7 flex-1 auto-rows-fr", children: grid.map((date, i) => {
          const dateStr = dateToString(date);
          const isCurrentMonth = date.getMonth() === month;
          const isToday = dateStr === todayStr;
          const dayAppts = getAppts(dateStr);
          return /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              className: `border-r border-b border-border p-1 cursor-pointer hover:bg-muted/30 transition-colors flex flex-col gap-0.5 overflow-hidden min-h-[72px] text-left w-full ${!isCurrentMonth ? "bg-muted/10" : "bg-white"} ${i % 7 === 0 ? "border-l border-border" : ""}`,
              onClick: () => onDayClick(dateStr),
              "data-ocid": `calendar.month.day.${i + 1}`,
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex justify-end", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: `text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-accent text-accent-foreground font-bold" : isCurrentMonth ? "text-foreground" : "text-muted-foreground/50"}`,
                    children: date.getDate()
                  }
                ) }),
                dayAppts.slice(0, 3).map((appt) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "button",
                  {
                    type: "button",
                    className: "rounded px-1 py-0.5 text-[9px] font-medium truncate leading-tight cursor-pointer hover:opacity-90 text-left w-full",
                    style: {
                      backgroundColor: hexToRgba(appt.color, 0.75),
                      color: "#222"
                    },
                    onClick: (e) => {
                      e.stopPropagation();
                      onModalChange({
                        isOpen: true,
                        mode: "edit",
                        appointment: appt
                      });
                    },
                    "data-ocid": "appointment.pill",
                    children: appt.clientName
                  },
                  appt.id
                )),
                dayAppts.length > 3 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[9px] text-muted-foreground px-1", children: [
                  "+",
                  dayAppts.length - 3,
                  " more"
                ] })
              ]
            },
            dateStr
          );
        }) })
      ]
    }
  );
}
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MIN_PX = 2.5;
function timeStrToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
function minutesToPx(minutes, startMinutes) {
  return (minutes - startMinutes) * MIN_PX;
}
function getPhaseStartMinutes(phase) {
  const timePart = phase.startTime.includes("T") ? phase.startTime.split("T")[1].slice(0, 5) : phase.startTime.slice(0, 5);
  const [h, m] = timePart.split(":").map(Number);
  return h * 60 + m;
}
function getBlockLabel(appt, phaseIndex) {
  if (appt.phases.length === 0) {
    return {
      label: `${appt.clientName} — ${appt.serviceName}`,
      isProcessing: false
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
      isProcessing: false
    };
  }
  return { label: `${appt.clientName} — ${phase.name}`, isProcessing: false };
}
function WeekView({ anchorDate, onModalChange, onDayClick }) {
  const { settings, allAppointments, deleteAppointment } = useAppStore(
    useShallow((s) => ({
      settings: s.settings,
      allAppointments: s.appointments,
      deleteAppointment: s.deleteAppointment
    }))
  );
  const startHour = Number(settings.workingHoursStart.split(":")[0]);
  const endHour = Number(settings.workingHoursEnd.split(":")[0]);
  const startMinutes = startHour * 60;
  const endMinutes = endHour * 60;
  const totalMinutes = endMinutes - startMinutes;
  const totalPx = totalMinutes * MIN_PX;
  const timeSlots = generateTimeSlots(startHour, endHour);
  const weekDates = getWeekDates(anchorDate, settings.startWeekOnMonday);
  const todayStr = dateToString(/* @__PURE__ */ new Date());
  const [currentTimePx, setCurrentTimePx] = reactExports.useState(() => {
    const now = /* @__PURE__ */ new Date();
    return minutesToPx(now.getHours() * 60 + now.getMinutes(), startHour * 60);
  });
  const [contextMenu, setContextMenu] = reactExports.useState(null);
  const [mobileStartIdx, setMobileStartIdx] = reactExports.useState(0);
  const touchStartX = reactExports.useRef(0);
  const touchStartY = reactExports.useRef(0);
  reactExports.useEffect(() => {
    const id = setInterval(() => {
      const now = /* @__PURE__ */ new Date();
      setCurrentTimePx(
        minutesToPx(now.getHours() * 60 + now.getMinutes(), startMinutes)
      );
    }, 3e4);
    return () => clearInterval(id);
  }, [startMinutes]);
  reactExports.useEffect(() => {
    if (!contextMenu) return;
    function handler() {
      setContextMenu(null);
    }
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [contextMenu]);
  const handleSlotClick = reactExports.useCallback(
    (dateStr, slot) => {
      onModalChange({
        isOpen: true,
        mode: "create",
        prefillDate: dateStr,
        prefillTime: slot
      });
    },
    [onModalChange]
  );
  const handleApptClick = reactExports.useCallback(
    (e, appt) => {
      e.stopPropagation();
      e.preventDefault();
      onModalChange({ isOpen: true, mode: "edit", appointment: appt });
    },
    [onModalChange]
  );
  const handleContextMenu = reactExports.useCallback(
    (e, appt) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({ x: e.clientX, y: e.clientY, appointment: appt });
    },
    []
  );
  const longPressTimer = reactExports.useRef(null);
  function handleTouchStart(e, appt) {
    longPressTimer.current = setTimeout(() => {
      const touch = e.touches[0];
      setContextMenu({ x: touch.clientX, y: touch.clientY, appointment: appt });
    }, 500);
  }
  function handleTouchEnd() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }
  const [isMobilePortrait, setIsMobilePortrait] = reactExports.useState(false);
  reactExports.useEffect(() => {
    function check() {
      setIsMobilePortrait(
        window.innerWidth < 768 && window.innerHeight > window.innerWidth
      );
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  const visibleDates = isMobilePortrait ? weekDates.slice(mobileStartIdx, mobileStartIdx + 3) : weekDates;
  function handleSwipeStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function handleSwipeEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 40) return;
    if (dx < 0) setMobileStartIdx((p) => Math.min(p + 3, 4));
    if (dx > 0) setMobileStartIdx((p) => Math.max(p - 3, 0));
  }
  function buildBlocks(dateStr) {
    const dayAppts = allAppointments.filter((a) => a.date === dateStr);
    const result = [];
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
          phaseIndex: -1
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
            phaseIndex: i
          });
        }
      }
    }
    return result;
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "flex flex-col flex-1 overflow-hidden select-none",
      onTouchStart: isMobilePortrait ? handleSwipeStart : void 0,
      onTouchEnd: isMobilePortrait ? handleSwipeEnd : void 0,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-shrink-0 border-b border-border bg-card", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-14 flex-shrink-0 border-r border-border" }),
          visibleDates.map((date) => {
            const dateStr = dateToString(date);
            const isToday = dateStr === todayStr;
            const dayLabel = DAY_LABELS[date.getDay()];
            const dayNum = date.getDate();
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                className: "flex-1 flex flex-col items-center justify-center py-1.5 border-r border-border cursor-pointer hover:bg-muted/30 transition-colors",
                onClick: () => onDayClick == null ? void 0 : onDayClick(dateStr),
                "data-ocid": `week.day_header.${dayNum}`,
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: "text-[10px] uppercase tracking-wider font-medium",
                      style: { color: isToday ? "#00ADB5" : void 0 },
                      children: dayLabel
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "span",
                    {
                      className: "text-sm font-bold leading-none mt-0.5 w-7 h-7 flex items-center justify-center rounded-full",
                      style: {
                        background: isToday ? "#00ADB5" : "transparent",
                        color: isToday ? "#fff" : void 0
                      },
                      children: dayNum
                    }
                  )
                ]
              },
              dateStr
            );
          })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "flex flex-1 overflow-auto",
            "data-ocid": "calendar.week_scroll",
            children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex min-w-0 w-full", style: { height: totalPx }, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "div",
                {
                  className: "w-14 flex-shrink-0 bg-background border-r border-border relative z-10",
                  style: { height: totalPx },
                  children: timeSlots.map((slot) => {
                    const [sh, sm] = slot.split(":").map(Number);
                    const slotMinutes = sh * 60 + sm;
                    const top = minutesToPx(slotMinutes, startMinutes);
                    const isHour = sm === 0;
                    return /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "div",
                      {
                        className: "absolute right-2",
                        style: { top: top - 8 },
                        children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "span",
                          {
                            className: `text-[10px] leading-none ${isHour ? "text-muted-foreground font-medium" : "text-muted-foreground/50"}`,
                            children: isHour ? formatTime12(slot) : sm === 30 ? ":30" : ""
                          }
                        )
                      },
                      slot
                    );
                  })
                }
              ),
              visibleDates.map((date) => {
                const dateStr = dateToString(date);
                const isToday = dateStr === todayStr;
                const blocks = buildBlocks(dateStr);
                return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                  "div",
                  {
                    className: "flex-1 relative border-r border-border bg-background",
                    style: { height: totalPx, minWidth: 0 },
                    "data-ocid": `week.day_column.${dateStr}`,
                    children: [
                      timeSlots.map((slot) => {
                        const [sh, sm] = slot.split(":").map(Number);
                        const top = minutesToPx(sh * 60 + sm, startMinutes);
                        const isHour = sm === 0;
                        return /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "div",
                          {
                            className: `absolute left-0 right-0 pointer-events-none ${isHour ? "border-t border-border/60" : "border-t border-border/25"}`,
                            style: { top }
                          },
                          slot
                        );
                      }),
                      timeSlots.map((slot) => {
                        const [sh, sm] = slot.split(":").map(Number);
                        const top = minutesToPx(sh * 60 + sm, startMinutes);
                        return /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "div",
                          {
                            className: "absolute left-0 right-0 cursor-pointer hover:bg-accent/5 transition-colors",
                            style: { top, height: MIN_PX * 30, zIndex: 1 },
                            role: "button",
                            tabIndex: 0,
                            onClick: () => handleSlotClick(dateStr, slot),
                            onKeyDown: (e) => {
                              if (e.key === "Enter" || e.key === " ")
                                handleSlotClick(dateStr, slot);
                            }
                          },
                          slot
                        );
                      }),
                      blocks.map((block, idx) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                        WeekBlock,
                        {
                          block,
                          onEdit: handleApptClick,
                          onContextMenu: handleContextMenu,
                          onTouchStart: handleTouchStart,
                          onTouchEnd: handleTouchEnd
                        },
                        `${block.appt.id}-${block.phaseIndex}-${idx}`
                      )),
                      isToday && currentTimePx >= 0 && currentTimePx <= totalPx && /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "div",
                        {
                          className: "absolute left-0 right-0 pointer-events-none z-20",
                          style: { top: currentTimePx },
                          children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute -left-1 -top-1 w-2 h-2 rounded-full bg-red-500" }),
                            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "h-[2px] bg-red-500" })
                          ] })
                        }
                      )
                    ]
                  },
                  dateStr
                );
              })
            ] })
          }
        ),
        contextMenu && /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "fixed z-50 bg-card border border-border rounded-xl shadow-xl overflow-hidden",
            style: { left: contextMenu.x, top: contextMenu.y },
            onClick: (e) => e.stopPropagation(),
            onKeyDown: (e) => e.stopPropagation(),
            role: "menu",
            tabIndex: -1,
            "data-ocid": "appointment.dropdown_menu",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors",
                  onClick: () => {
                    onModalChange({
                      isOpen: true,
                      mode: "edit",
                      appointment: contextMenu.appointment
                    });
                    setContextMenu(null);
                  },
                  "data-ocid": "appointment.edit_button",
                  children: "Edit"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  className: "w-full text-left px-4 py-2.5 text-sm text-destructive hover:bg-muted transition-colors",
                  onClick: () => {
                    deleteAppointment(contextMenu.appointment.id);
                    setContextMenu(null);
                  },
                  "data-ocid": "appointment.delete_button",
                  children: "Delete"
                }
              )
            ]
          }
        )
      ]
    }
  );
}
function WeekBlock({
  block,
  onEdit,
  onContextMenu,
  onTouchStart,
  onTouchEnd
}) {
  const { appt, topPx, heightPx, isProcessing, label, color } = block;
  const isShort = heightPx < 50;
  const zIndex = isProcessing ? 5 : 10;
  const bgStyle = isProcessing ? {
    background: `repeating-linear-gradient(45deg, ${hexToRgba(color, 0.12)}, ${hexToRgba(color, 0.12)} 4px, ${hexToRgba(color, 0.35)} 4px, ${hexToRgba(color, 0.35)} 8px)`,
    borderColor: hexToRgba(color, 0.5)
  } : {
    backgroundColor: hexToRgba(color, 0.85),
    borderColor: color
  };
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "button",
    {
      type: "button",
      className: "absolute left-0.5 right-0.5 rounded border overflow-hidden cursor-pointer select-none text-left",
      style: {
        top: topPx + 1,
        height: Math.max(heightPx - 2, 4),
        zIndex,
        ...bgStyle
      },
      onClick: (e) => {
        e.stopPropagation();
        onEdit(e, appt);
      },
      onContextMenu: (e) => onContextMenu(e, appt),
      onTouchStart: (e) => onTouchStart(e, appt),
      onTouchEnd,
      "data-ocid": "appointment.card",
      children: /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-1 py-0.5 h-full overflow-hidden flex flex-col", children: isProcessing ? (
        // Processing phase: show client name so context is clear
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "text-[9px] text-foreground/70 italic leading-tight",
            style: { wordBreak: "break-word", overflowWrap: "break-word" },
            children: label
          }
        )
      ) : isShort ? (
        // Short block (<50px): client name only, no truncation
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "span",
          {
            className: "text-[10px] font-bold leading-tight text-foreground",
            style: { wordBreak: "break-word", overflowWrap: "break-word" },
            children: appt.clientName
          }
        )
      ) : (
        // Full block: client name, service name, duration · price
        /* @__PURE__ */ jsxRuntimeExports.jsxs(jsxRuntimeExports.Fragment, { children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "text-[10px] font-bold leading-tight text-foreground",
              style: { wordBreak: "break-word", overflowWrap: "break-word" },
              children: appt.clientName
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "span",
            {
              className: "text-[9px] text-foreground/80 leading-tight mt-0.5",
              style: { wordBreak: "break-word", overflowWrap: "break-word" },
              children: appt.serviceName
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[9px] text-foreground/70 mt-0.5", children: [
            formatDuration(appt.durationMinutes),
            " · $",
            formatPrice(appt.price)
          ] })
        ] })
      ) })
    }
  );
}
function getTodayStr() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
function addDays(dateStr, n) {
  const d = /* @__PURE__ */ new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function addWeeks(dateStr, n) {
  return addDays(dateStr, n * 7);
}
function addMonths(dateStr, n) {
  const d = /* @__PURE__ */ new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + n);
  return d.toISOString().slice(0, 10);
}
function formatDateHeader(view, dateStr) {
  const d = /* @__PURE__ */ new Date(`${dateStr}T00:00:00`);
  if (view === "day") {
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
  }
  if (view === "week") {
    return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}
function Calendar() {
  const routerState = useRouterState();
  const navigate = useNavigate();
  const pathname = routerState.location.pathname;
  const view = pathname === "/calendar/day" ? "day" : pathname === "/calendar/month" ? "month" : "week";
  const [currentDate, setCurrentDate] = reactExports.useState(getTodayStr);
  const [modalState, setModalState] = reactExports.useState({
    isOpen: false,
    mode: "create"
  });
  const handlePrev = reactExports.useCallback(() => {
    if (view === "day") setCurrentDate((d2) => addDays(d2, -1));
    else if (view === "week") setCurrentDate((d2) => addWeeks(d2, -1));
    else setCurrentDate((d2) => addMonths(d2, -1));
  }, [view]);
  const handleNext = reactExports.useCallback(() => {
    if (view === "day") setCurrentDate((d2) => addDays(d2, 1));
    else if (view === "week") setCurrentDate((d2) => addWeeks(d2, 1));
    else setCurrentDate((d2) => addMonths(d2, 1));
  }, [view]);
  const handleToday = reactExports.useCallback(() => {
    setCurrentDate(getTodayStr());
  }, []);
  const handleModalChange = reactExports.useCallback((state) => {
    setModalState(state);
  }, []);
  const handleModalClose = reactExports.useCallback(() => {
    setModalState((s) => ({ ...s, isOpen: false }));
  }, []);
  const handleDayClick = reactExports.useCallback(
    (date) => {
      setCurrentDate(date);
      navigate({ to: "/calendar/day" });
    },
    [navigate]
  );
  const handleOpenCreate = reactExports.useCallback(() => {
    setModalState({ isOpen: true, mode: "create", prefillDate: getTodayStr() });
  }, []);
  const d = /* @__PURE__ */ new Date(`${currentDate}T00:00:00`);
  const viewTabs = [
    {
      id: "day",
      label: "Day",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarDays, { size: 14 }),
      to: "/calendar/day"
    },
    {
      id: "week",
      label: "Week",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarRange, { size: 14 }),
      to: "/calendar"
    },
    {
      id: "month",
      label: "Month",
      icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Grid3x3, { size: 14 }),
      to: "/calendar/month"
    }
  ];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", "data-ocid": "calendar.page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 px-3 pt-3 pb-2 border-b border-border bg-card flex-shrink-0 flex-wrap gap-y-2", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex items-center gap-0.5 bg-muted rounded-lg p-0.5", children: viewTabs.map((tab) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          className: `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === tab.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`,
          onClick: () => navigate({ to: tab.to }),
          "data-ocid": `calendar.${tab.id}_tab`,
          children: [
            tab.icon,
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "hidden sm:inline", children: tab.label })
          ]
        },
        tab.id
      )) }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "icon",
            className: "h-8 w-8",
            onClick: handlePrev,
            "data-ocid": "calendar.prev_button",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronLeft, { size: 16 })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            className: "text-sm font-semibold text-foreground px-2 py-1 rounded hover:bg-muted transition-colors min-w-[160px] text-center",
            onClick: handleToday,
            "data-ocid": "calendar.today_button",
            children: formatDateHeader(view, currentDate)
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Button,
          {
            type: "button",
            variant: "ghost",
            size: "icon",
            className: "h-8 w-8",
            onClick: handleNext,
            "data-ocid": "calendar.next_button",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 16 })
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx(
        Button,
        {
          type: "button",
          variant: "outline",
          size: "sm",
          className: "h-8 text-xs ml-auto",
          onClick: handleToday,
          "data-ocid": "calendar.jump_today_button",
          children: "Today"
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-1 overflow-hidden relative", children: [
      view === "day" && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-1 overflow-y-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsx(DayView, { date: currentDate, onModalChange: handleModalChange }) }),
      view === "week" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        WeekView,
        {
          anchorDate: d,
          onModalChange: handleModalChange,
          onDayClick: handleDayClick
        }
      ),
      view === "month" && /* @__PURE__ */ jsxRuntimeExports.jsx(
        MonthView,
        {
          year: d.getFullYear(),
          month: d.getMonth(),
          onDayClick: handleDayClick,
          onModalChange: handleModalChange
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        className: "fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:bg-accent/90 active:scale-95 transition-all md:bottom-6",
        onClick: handleOpenCreate,
        "aria-label": "New appointment",
        "data-ocid": "calendar.new_appointment_fab",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 24 })
      }
    ),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AppointmentModal,
      {
        isOpen: modalState.isOpen,
        onClose: handleModalClose,
        mode: modalState.mode,
        appointment: modalState.appointment,
        prefillDate: modalState.prefillDate,
        prefillTime: modalState.prefillTime
      }
    )
  ] });
}
export {
  Calendar as default
};
