import { c as createLucideIcon, u as useAppStore, r as reactExports, j as jsxRuntimeExports, C as CalendarCheck, S as Scissors } from "./index-C28LwCdI.js";
import { A as AppointmentModal } from "./AppointmentModal-CaVWxjLw.js";
import { f as formatDate, g as getTodayString, a as formatTime12, b as formatDuration, c as formatPrice } from "./utils-VpTwBoiu.js";
import { u as useShallow } from "./shallow-B4tNjq6h.js";
import { C as Clock } from "./clock-gV4h8ztK.js";
import { P as Plus } from "./triangle-alert-uzvYPtP7.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8", key: "1357e3" }],
  ["path", { d: "M3 3v5h5", key: "1xhq8a" }]
];
const RotateCcw = createLucideIcon("rotate-ccw", __iconNode);
function QuickRebook({ onRebook }) {
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const clients = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    const sorted = [...appointments].sort(
      (a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)
    );
    for (const a of sorted) {
      if (!map.has(a.clientName)) map.set(a.clientName, a);
    }
    return Array.from(map.values()).map((a) => ({
      name: a.clientName,
      lastService: a.serviceName,
      lastServiceId: a.serviceId,
      lastDate: a.date,
      color: a.color
    }));
  }, [appointments]);
  if (clients.length === 0) return null;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pb-4", "data-ocid": "quick_rebook.section", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 mb-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx(RotateCcw, { size: 15, className: "text-accent" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "text-sm font-semibold", children: "Quick Rebook" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2", children: clients.map((client, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "button",
      {
        type: "button",
        onClick: () => onRebook(client.name, client.lastServiceId),
        className: "flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors",
        "data-ocid": `quick_rebook.item.${i + 1}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0",
              style: { backgroundColor: client.color },
              children: client.name.charAt(0).toUpperCase()
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold truncate", children: client.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground truncate", children: client.lastService })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 text-xs text-muted-foreground shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 11 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatDate(client.lastDate, {
              month: "short",
              day: "numeric"
            }) })
          ] })
        ]
      },
      client.name
    )) })
  ] });
}
function Today() {
  const today = getTodayString();
  const appointments = useAppStore(
    useShallow(
      (s) => s.appointments.filter((a) => a.date === today).sort((a, b) => a.startTime.localeCompare(b.startTime))
    )
  );
  const [modalState, setModalState] = reactExports.useState({
    isOpen: false,
    mode: "create"
  });
  const displayDate = formatDate(today, {
    weekday: "long",
    month: "long",
    day: "numeric"
  });
  function openCreate() {
    setModalState({ isOpen: true, mode: "create", prefillDate: today });
  }
  function openEdit(appt) {
    setModalState({ isOpen: true, mode: "edit", appointment: appt });
  }
  function closeModal() {
    setModalState((s) => ({ ...s, isOpen: false }));
  }
  const [rebookPrefill, setRebookPrefill] = reactExports.useState(null);
  function handleRebook(clientName, serviceId) {
    setRebookPrefill({ clientName, serviceId });
    setModalState({
      isOpen: true,
      mode: "create",
      prefillDate: today,
      appointment: void 0
    });
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", "data-ocid": "today.page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pt-5 pb-3 border-b border-border bg-card flex-shrink-0", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(CalendarCheck, { size: 20, className: "text-accent" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: displayDate })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: openCreate,
            className: "flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors",
            "data-ocid": "today.add_button",
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 15 }),
              "Add"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-0.5", children: appointments.length === 0 ? "No appointments today" : `${appointments.length} appointment${appointments.length !== 1 ? "s" : ""}` })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-4 py-4", children: appointments.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "flex flex-col items-center justify-center py-14 text-center",
          "data-ocid": "today.empty_state",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Scissors, { size: 28, className: "text-muted-foreground/50" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold mb-1", children: "No appointments today" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mb-5", children: "Tap + to add one." }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "button",
              {
                type: "button",
                onClick: openCreate,
                className: "inline-flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg text-sm font-medium hover:bg-accent/90 transition-colors",
                "data-ocid": "today.empty_add_button",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16 }),
                  "Add Appointment"
                ]
              }
            )
          ]
        }
      ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-3", "data-ocid": "today.list", children: appointments.map((appt, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
        AppointmentCard,
        {
          appointment: appt,
          index: i + 1,
          onEdit: () => openEdit(appt)
        },
        appt.id
      )) }) }),
      appointments.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border mt-2 pt-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(QuickRebook, { onRebook: handleRebook }) }),
      appointments.length === 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border", children: /* @__PURE__ */ jsxRuntimeExports.jsx(QuickRebook, { onRebook: handleRebook }) })
    ] }),
    appointments.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
      "button",
      {
        type: "button",
        onClick: openCreate,
        className: "flex items-center justify-center w-14 h-14 bg-accent text-accent-foreground rounded-full shadow-lg hover:bg-accent/90 transition-colors",
        "aria-label": "Add appointment",
        "data-ocid": "today.fab_add_button",
        children: /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 24 })
      }
    ) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      AppointmentModal,
      {
        isOpen: modalState.isOpen,
        onClose: () => {
          closeModal();
          setRebookPrefill(null);
        },
        mode: modalState.mode,
        appointment: modalState.appointment,
        prefillDate: modalState.prefillDate ?? today,
        prefillTime: modalState.prefillTime,
        prefillClientName: rebookPrefill == null ? void 0 : rebookPrefill.clientName,
        prefillServiceId: rebookPrefill == null ? void 0 : rebookPrefill.serviceId
      },
      modalState.isOpen ? `open-${(rebookPrefill == null ? void 0 : rebookPrefill.clientName) ?? ""}` : "closed"
    )
  ] });
}
function AppointmentCard({ appointment, index, onEdit }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: onEdit,
      className: "flex gap-3 p-4 rounded-xl border border-border bg-card shadow-xs hover:shadow-sm transition-all cursor-pointer text-left w-full group",
      style: { borderLeftColor: appointment.color, borderLeftWidth: 4 },
      "data-ocid": `today.item.${index}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-start min-w-[58px] shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-bold text-foreground leading-tight", children: formatTime12(appointment.startTime) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground mt-0.5", children: formatDuration(appointment.durationMinutes) })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col items-center pt-1 shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-2 h-2 rounded-full mt-0.5",
              style: { backgroundColor: appointment.color }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-px flex-1 mt-1",
              style: { backgroundColor: `${appointment.color}40` }
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-bold text-sm leading-tight", children: appointment.clientName }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "p",
            {
              className: "text-sm text-muted-foreground mt-0.5 break-words",
              style: { wordBreak: "break-word", overflowWrap: "break-word" },
              children: appointment.serviceName
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-semibold text-accent mt-1", children: [
            "$",
            formatPrice(appointment.price)
          ] }),
          appointment.notes && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-1.5 line-clamp-2 italic", children: appointment.notes })
        ] })
      ]
    }
  );
}
export {
  Today as default
};
