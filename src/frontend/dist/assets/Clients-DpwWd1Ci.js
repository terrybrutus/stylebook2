import { c as createLucideIcon, u as useAppStore, r as reactExports, j as jsxRuntimeExports, U as Users } from "./index-C28LwCdI.js";
import { X, f as formatDate, a as formatTime12, b as formatDuration, c as formatPrice } from "./utils-VpTwBoiu.js";
import { u as useShallow } from "./shallow-B4tNjq6h.js";
import { C as ChevronRight } from "./chevron-right-CtrInTbJ.js";
import { C as Clock } from "./clock-gV4h8ztK.js";
import { C as Calendar } from "./calendar-DIRF3J41.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["line", { x1: "12", x2: "12", y1: "2", y2: "22", key: "7eqyqh" }],
  ["path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", key: "1b0p4s" }]
];
const DollarSign = createLucideIcon("dollar-sign", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
];
const FileText = createLucideIcon("file-text", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "m21 21-4.34-4.34", key: "14j7rj" }],
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }]
];
const Search = createLucideIcon("search", __iconNode);
function Clients() {
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const [search, setSearch] = reactExports.useState("");
  const [selectedClient, setSelectedClient] = reactExports.useState(null);
  const clients = reactExports.useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    for (const appt of appointments) {
      const name = appt.clientName;
      const existing = map.get(name);
      if (!existing) {
        map.set(name, {
          name,
          lastService: appt.serviceName,
          lastServiceId: appt.serviceId,
          lastDate: appt.date,
          appointmentCount: 1,
          appointments: [appt]
        });
      } else {
        existing.appointmentCount++;
        existing.appointments.push(appt);
        if (!existing.lastDate || appt.date > existing.lastDate) {
          existing.lastDate = appt.date;
          existing.lastService = appt.serviceName;
          existing.lastServiceId = appt.serviceId;
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => a.name.localeCompare(b.name)
    );
  }, [appointments]);
  const filtered = search ? clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())) : clients;
  if (selectedClient) {
    return /* @__PURE__ */ jsxRuntimeExports.jsx(
      ClientDetail,
      {
        client: selectedClient,
        onBack: () => setSelectedClient(null)
      }
    );
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", "data-ocid": "clients.page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pt-5 pb-3 border-b border-border bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between mb-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: "Clients" }),
        clients.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full", children: [
          clients.length,
          " total"
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          Search,
          {
            size: 16,
            className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "input",
          {
            type: "search",
            placeholder: "Search clients…",
            value: search,
            onChange: (e) => setSearch(e.target.value),
            className: "w-full pl-9 pr-3 py-2.5 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors",
            "data-ocid": "clients.search_input"
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto", children: filtered.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center py-20 text-center px-6",
        "data-ocid": "clients.empty_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Users, { size: 28, className: "text-muted-foreground/60" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-base font-semibold mb-1", children: search ? "No clients found" : "No clients yet" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground leading-relaxed", children: search ? `No clients match "${search}"` : "Clients appear here automatically once you add appointments." })
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { "data-ocid": "clients.list", children: filtered.map((client, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
      ClientRow,
      {
        client,
        index: i + 1,
        onSelect: () => setSelectedClient(client)
      },
      client.name
    )) }) })
  ] });
}
function ClientRow({
  client,
  index,
  onSelect
}) {
  const totalSpent = client.appointments.reduce((sum, a) => sum + a.price, 0);
  const initials = client.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  const avatarColors = [
    "bg-[#e8f5e9] text-[#2e7d32]",
    "bg-[#e3f2fd] text-[#1565c0]",
    "bg-[#fce4ec] text-[#880e4f]",
    "bg-[#fff3e0] text-[#e65100]",
    "bg-[#f3e5f5] text-[#6a1b9a]",
    "bg-[#e0f7fa] text-[#006064]",
    "bg-[#fafafa] text-[#37474f]"
  ];
  const colorClass = avatarColors[client.name.charCodeAt(0) % avatarColors.length];
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: onSelect,
      className: "w-full flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card hover:bg-muted/40 active:bg-muted/70 transition-colors text-left",
      "data-ocid": `clients.item.${index}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: `w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${colorClass}`,
            children: initials
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-sm text-foreground", children: client.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground mt-0.5", children: [
            client.appointmentCount,
            " visit",
            client.appointmentCount !== 1 ? "s" : "",
            client.lastDate ? ` · Last ${formatDate(client.lastDate, { month: "short", day: "numeric" })}` : ""
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-sm font-medium text-accent", children: [
            "$",
            totalSpent
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(ChevronRight, { size: 16, className: "text-muted-foreground" })
        ] })
      ]
    }
  );
}
function ClientDetail({
  client,
  onBack
}) {
  const sortedAppts = reactExports.useMemo(
    () => [...client.appointments].sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.startTime.localeCompare(a.startTime);
    }),
    [client.appointments]
  );
  const totalSpent = client.appointments.reduce((sum, a) => sum + a.price, 0);
  const initials = client.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase();
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", "data-ocid": "clients.detail.page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pt-5 pb-4 border-b border-border bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 mb-4", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "button",
          {
            type: "button",
            onClick: onBack,
            className: "w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors",
            "aria-label": "Back to clients",
            "data-ocid": "clients.detail.close_button",
            children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 18, className: "text-foreground" })
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-lg font-semibold flex-1 min-w-0 truncate", children: "Client History" })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-lg font-bold text-accent", children: initials }) }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xl font-bold text-foreground truncate", children: client.name }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-0.5", children: [
            client.appointmentCount,
            " appointment",
            client.appointmentCount !== 1 ? "s" : ""
          ] })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-right flex-shrink-0", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-lg font-bold text-accent", children: [
            "$",
            totalSpent
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: "total spent" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-auto px-4 py-3", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3", children: "Appointment History" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-3", "data-ocid": "clients.detail.list", children: sortedAppts.map((appt, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(AppointmentHistoryCard, { appt, index: i + 1 }, appt.id)) })
    ] })
  ] });
}
function AppointmentHistoryCard({
  appt,
  index
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-xl border border-border bg-card overflow-hidden",
      "data-ocid": `clients.detail.item.${index}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "div",
          {
            className: "px-3 py-2.5 flex items-center gap-2",
            style: { borderLeft: `4px solid ${appt.color}` },
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-sm text-foreground truncate", children: appt.serviceName }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground mt-0.5", children: [
                  formatDate(appt.date, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric"
                  }),
                  " · ",
                  formatTime12(appt.startTime)
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "span",
                {
                  className: "text-sm font-bold flex-shrink-0",
                  style: { color: appt.color },
                  children: [
                    "$",
                    appt.price
                  ]
                }
              )
            ]
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-3 py-2 bg-muted/30 flex items-center gap-4 flex-wrap", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 12 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatDuration(appt.durationMinutes) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(DollarSign, { size: 12 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: formatPrice(appt.price) })
          ] }),
          appt.phoneNumber && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 text-xs text-muted-foreground", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 12 }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: appt.phoneNumber })
          ] })
        ] }),
        appt.notes && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "px-3 py-2 border-t border-border/60", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-1.5", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            FileText,
            {
              size: 12,
              className: "text-muted-foreground mt-0.5 flex-shrink-0"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground leading-relaxed break-words", children: appt.notes })
        ] }) })
      ]
    }
  );
}
export {
  Clients as default
};
