import { c as createLucideIcon, u as useAppStore, z, j as jsxRuntimeExports, M as Moon, m as Sun, n as updateSettings } from "./index-C28LwCdI.js";
import { u as useShallow } from "./shallow-B4tNjq6h.js";
import { C as Calendar } from "./calendar-DIRF3J41.js";
import { C as Clock } from "./clock-gV4h8ztK.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  [
    "path",
    {
      d: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8z",
      key: "e79jfc"
    }
  ],
  ["circle", { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor", key: "1okk4w" }],
  ["circle", { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor", key: "f64h9f" }],
  ["circle", { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor", key: "qy21gx" }],
  ["circle", { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor", key: "fotxhn" }]
];
const Palette = createLucideIcon("palette", __iconNode);
function formatTime12h(time) {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = Number.parseInt(hStr, 10);
  const m = mStr ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}
function Settings() {
  const settings = useAppStore(useShallow((s) => s.settings));
  const updateSettings$1 = useAppStore((s) => s.updateSettings);
  const { setTheme } = z();
  async function toggleBool(key) {
    const newVal = !settings[key];
    updateSettings$1({ [key]: newVal });
    await updateSettings({ [key]: newVal });
    if (key === "darkMode") {
      setTheme(newVal ? "dark" : "light");
    }
  }
  async function handleTimeChange(key, value) {
    updateSettings$1({ [key]: value });
    await updateSettings({ [key]: value });
  }
  const workingRange = `${formatTime12h(settings.workingHoursStart)} – ${formatTime12h(settings.workingHoursEnd)}`;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", "data-ocid": "settings.page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pt-5 pb-4 border-b border-border bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-2xl font-semibold tracking-tight", children: "Settings" }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mt-0.5", children: "Customize how StyleBook works for you" })
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 py-5 flex flex-col gap-5 max-w-xl mx-auto", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SectionHeader, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Calendar, { size: 15 }), title: "Calendar" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-xl border border-border overflow-hidden shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
          ToggleRow,
          {
            label: "Start week on Monday",
            description: "Applies to both Week and Month calendar views",
            checked: settings.startWeekOnMonday,
            onToggle: () => toggleBool("startWeekOnMonday"),
            ocid: "settings.start_week_monday_toggle"
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SectionHeader, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Clock, { size: 15 }), title: "Working Hours" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-card rounded-xl border border-border overflow-hidden shadow-sm", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "px-4 pt-3 pb-1", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: "Visible calendar range" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-accent", children: workingRange })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "mt-2 mb-1 relative h-1.5 rounded-full bg-muted overflow-hidden", children: /* @__PURE__ */ jsxRuntimeExports.jsx(
              "div",
              {
                className: "absolute top-0 h-full rounded-full bg-accent/70",
                style: {
                  left: `${timeToMinutes(settings.workingHoursStart) / 1440 * 100}%`,
                  width: `${(timeToMinutes(settings.workingHoursEnd) - timeToMinutes(settings.workingHoursStart)) / 1440 * 100}%`
                }
              }
            ) })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "border-t border-border", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TimeRow,
              {
                id: "start-time",
                label: "Start time",
                value: settings.workingHoursStart,
                onChange: (v) => handleTimeChange("workingHoursStart", v),
                ocid: "settings.start_time_input"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "border-t border-border/60" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              TimeRow,
              {
                id: "end-time",
                label: "End time",
                value: settings.workingHoursEnd,
                onChange: (v) => handleTimeChange("workingHoursEnd", v),
                ocid: "settings.end_time_input"
              }
            )
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(SectionHeader, { icon: /* @__PURE__ */ jsxRuntimeExports.jsx(Palette, { size: 15 }), title: "Appearance" }),
        /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "bg-card rounded-xl border border-border overflow-hidden shadow-sm", children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
          "button",
          {
            type: "button",
            onClick: () => toggleBool("darkMode"),
            className: "w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors",
            "data-ocid": "settings.dark_mode_toggle",
            "aria-pressed": settings.darkMode,
            children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  "span",
                  {
                    className: `flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${settings.darkMode ? "bg-primary/10 text-foreground" : "bg-accent/10 text-accent"}`,
                    children: settings.darkMode ? /* @__PURE__ */ jsxRuntimeExports.jsx(Moon, { size: 16 }) : /* @__PURE__ */ jsxRuntimeExports.jsx(Sun, { size: 16 })
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: "Dark mode" }),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground", children: settings.darkMode ? "Currently dark theme" : "Currently light theme" })
                ] })
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { checked: settings.darkMode })
            ]
          }
        ) })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "pt-2 pb-6 text-center", children: /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground", children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        ". Built with love using",
        " ",
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "a",
          {
            href: `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`,
            target: "_blank",
            rel: "noopener noreferrer",
            className: "text-accent hover:underline",
            children: "caffeine.ai"
          }
        )
      ] }) })
    ] }) })
  ] });
}
function timeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
function SectionHeader({
  icon,
  title
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5 px-1 mb-2", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-muted-foreground", children: icon }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground", children: title })
  ] });
}
function ToggleRow({
  label,
  description,
  checked,
  onToggle,
  ocid
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "button",
    {
      type: "button",
      onClick: onToggle,
      className: "w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors",
      "data-ocid": ocid,
      "aria-pressed": checked,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "text-left", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-medium", children: label }),
          description && /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-xs text-muted-foreground mt-0.5", children: description })
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsx(Toggle, { checked })
      ]
    }
  );
}
function Toggle({ checked }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: `relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${checked ? "bg-accent" : "bg-muted"}`,
      children: /* @__PURE__ */ jsxRuntimeExports.jsx(
        "span",
        {
          className: `absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${checked ? "translate-x-[22px]" : "translate-x-[3px]"}`
        }
      )
    }
  );
}
function TimeRow({ id, label, value, onChange, ocid }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 py-3", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { htmlFor: id, className: "text-sm font-medium cursor-pointer", children: label }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      "input",
      {
        id,
        type: "time",
        value,
        onChange: (e) => onChange(e.target.value),
        className: "text-sm border border-input rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors",
        style: { fontSize: "16px", minWidth: "8.5rem" },
        "data-ocid": ocid
      }
    )
  ] });
}
export {
  Settings as default
};
