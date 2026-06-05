import { c as createLucideIcon, u as useAppStore, r as reactExports, i as updateService, k as createService, j as jsxRuntimeExports, l as deleteService, S as Scissors } from "./index-BXnX58Ps.js";
import { X, b as formatDuration, c as formatPrice } from "./utils-C78N2dWx.js";
import { P as Plus, T as TriangleAlert } from "./triangle-alert-BDl2oy9M.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$3 = [
  ["rect", { width: "14", height: "14", x: "8", y: "8", rx: "2", ry: "2", key: "17jyea" }],
  ["path", { d: "M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2", key: "zix9uf" }]
];
const Copy = createLucideIcon("copy", __iconNode$3);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$2 = [
  ["circle", { cx: "9", cy: "12", r: "1", key: "1vctgf" }],
  ["circle", { cx: "9", cy: "5", r: "1", key: "hp0tcf" }],
  ["circle", { cx: "9", cy: "19", r: "1", key: "fkjjf6" }],
  ["circle", { cx: "15", cy: "12", r: "1", key: "1tmaij" }],
  ["circle", { cx: "15", cy: "5", r: "1", key: "19l28e" }],
  ["circle", { cx: "15", cy: "19", r: "1", key: "f4zoj3" }]
];
const GripVertical = createLucideIcon("grip-vertical", __iconNode$2);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode$1 = [
  ["path", { d: "M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", key: "1m0v6g" }],
  [
    "path",
    {
      d: "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z",
      key: "ohrbg2"
    }
  ]
];
const SquarePen = createLucideIcon("square-pen", __iconNode$1);
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["path", { d: "M3 6h18", key: "d0wm0j" }],
  ["path", { d: "M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6", key: "4alrt4" }],
  ["path", { d: "M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2", key: "v07s0e" }],
  ["line", { x1: "10", x2: "10", y1: "11", y2: "17", key: "1uufr5" }],
  ["line", { x1: "14", x2: "14", y1: "11", y2: "17", key: "xtxkd" }]
];
const Trash2 = createLucideIcon("trash-2", __iconNode);
const PRESET_COLORS = [
  "#D4A5B5",
  "#C4A0C4",
  "#7EB8D4",
  "#88C5A0",
  "#D4B88C",
  "#D4D48C",
  "#C5B4A0",
  "#9DB8C5",
  "#B5C4D4",
  "#9ECEAD"
];
function isValidHex(hex) {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}
function PhaseRow({ phase, index, total, onChange, onRemove }) {
  const hours = Math.floor(phase.durationMinutes / 60);
  const minutes = phase.durationMinutes % 60;
  const handleName = reactExports.useCallback(
    (e) => onChange(phase._id, { name: e.target.value }),
    [phase._id, onChange]
  );
  const handleHours = reactExports.useCallback(
    (e) => onChange(phase._id, {
      durationMinutes: Number(e.target.value) * 60 + phase.durationMinutes % 60
    }),
    [phase._id, phase.durationMinutes, onChange]
  );
  const handleMinutes = reactExports.useCallback(
    (e) => onChange(phase._id, {
      durationMinutes: Math.floor(phase.durationMinutes / 60) * 60 + Number(e.target.value)
    }),
    [phase._id, phase.durationMinutes, onChange]
  );
  const handleType = reactExports.useCallback(
    (type) => onChange(phase._id, { phaseType: type }),
    [phase._id, onChange]
  );
  const handleRemove = reactExports.useCallback(
    () => onRemove(phase._id),
    [phase._id, onRemove]
  );
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "div",
    {
      className: "rounded-xl border border-border bg-card p-3 flex flex-col gap-2",
      "data-ocid": `services.phase_row.${index + 1}`,
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            GripVertical,
            {
              size: 14,
              className: "text-muted-foreground/40 flex-shrink-0"
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs font-semibold text-muted-foreground uppercase tracking-wide w-5", children: index + 1 }),
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "input",
            {
              type: "text",
              value: phase.name,
              onChange: handleName,
              placeholder: "Phase name",
              className: "flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-accent/50",
              style: { fontSize: "16px" },
              "data-ocid": `services.phase_name_input.${index + 1}`
            }
          ),
          total > 1 && /* @__PURE__ */ jsxRuntimeExports.jsx(
            "button",
            {
              type: "button",
              onClick: handleRemove,
              className: "p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0",
              "aria-label": "Remove phase",
              "data-ocid": `services.remove_phase_button.${index + 1}`,
              children: /* @__PURE__ */ jsxRuntimeExports.jsx(Trash2, { size: 14 })
            }
          )
        ] }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2 pl-7", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "label",
              {
                className: "text-[11px] text-muted-foreground",
                htmlFor: `phase-hours-${phase._id}`,
                children: "Hours"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                id: `phase-hours-${phase._id}`,
                value: hours,
                onChange: handleHours,
                className: "rounded-lg border border-input bg-background px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-accent/50",
                style: { fontSize: "16px" },
                children: Array.from({ length: 13 }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: static numeric range, order never changes
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: i, children: [
                    i,
                    "h"
                  ] }, `hour-${i}`)
                ))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "label",
              {
                className: "text-[11px] text-muted-foreground",
                htmlFor: `phase-min-${phase._id}`,
                children: "Min"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "select",
              {
                id: `phase-min-${phase._id}`,
                value: minutes,
                onChange: handleMinutes,
                className: "rounded-lg border border-input bg-background px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-accent/50",
                style: { fontSize: "16px" },
                children: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: m, children: [
                  m,
                  "m"
                ] }, m))
              }
            )
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-0.5 ml-auto", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-[11px] text-muted-foreground", children: "Type" }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex rounded-lg border border-input overflow-hidden", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handleType("active"),
                  className: `px-3 py-1.5 text-xs font-medium transition-colors ${phase.phaseType === "active" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`,
                  children: "Active"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: () => handleType("processing"),
                  className: `px-3 py-1.5 text-xs font-medium transition-colors ${phase.phaseType === "processing" ? "bg-accent text-accent-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`,
                  children: "Processing"
                }
              )
            ] })
          ] })
        ] })
      ]
    }
  );
}
let _phaseIdCounter = 0;
function nextPhaseId() {
  return `phase-${++_phaseIdCounter}`;
}
function makePhase(partial) {
  return {
    _id: nextPhaseId(),
    name: (partial == null ? void 0 : partial.name) ?? "Phase",
    durationMinutes: (partial == null ? void 0 : partial.durationMinutes) ?? 30,
    phaseType: (partial == null ? void 0 : partial.phaseType) ?? "active"
  };
}
function ServiceModal({ open, service, onClose }) {
  const addService = useAppStore((s) => s.addService);
  const updateServiceStore = useAppStore((s) => s.updateService);
  const [name, setName] = reactExports.useState("");
  const [price, setPrice] = reactExports.useState("");
  const [color, setColor] = reactExports.useState(PRESET_COLORS[0]);
  const [hexInput, setHexInput] = reactExports.useState(PRESET_COLORS[0]);
  const [category, setCategory] = reactExports.useState("single");
  const [phases, setPhases] = reactExports.useState([makePhase()]);
  const [finishingLabel, setFinishingLabel] = reactExports.useState("");
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [error, setError] = reactExports.useState("");
  const phaseBottomRef = reactExports.useRef(null);
  const modalId = reactExports.useId();
  const serviceRef = reactExports.useRef(service);
  serviceRef.current = service;
  const prevOpenRef = reactExports.useRef(false);
  const prevServiceIdRef = reactExports.useRef(void 0);
  reactExports.useEffect(() => {
    const currentService = serviceRef.current;
    const currentId = (currentService == null ? void 0 : currentService.id) ?? (currentService ? "__new__" : void 0);
    const didOpen = open && !prevOpenRef.current;
    const didServiceChange = currentId !== prevServiceIdRef.current;
    if (!open) {
      prevOpenRef.current = false;
      return;
    }
    if (!didOpen && !didServiceChange) return;
    prevOpenRef.current = open;
    prevServiceIdRef.current = currentId;
    if (currentService) {
      setName(currentService.name);
      setPrice(String(currentService.price));
      setColor(currentService.color);
      setHexInput(currentService.color);
      setCategory(currentService.category);
      setFinishingLabel(currentService.finishingLabel ?? "");
      setPhases(
        currentService.phases.length > 0 ? currentService.phases.map((p) => ({ ...p, _id: nextPhaseId() })) : [makePhase()]
      );
    } else {
      setName("");
      setPrice("");
      setColor(PRESET_COLORS[0]);
      setHexInput(PRESET_COLORS[0]);
      setCategory("single");
      setPhases([makePhase()]);
      setFinishingLabel("");
    }
    setError("");
    setSubmitting(false);
  }, [open, service == null ? void 0 : service.id]);
  const handleHexInput = reactExports.useCallback(
    (e) => {
      const raw = e.target.value;
      setHexInput(raw);
      const normalized = raw.startsWith("#") ? raw : `#${raw}`;
      if (isValidHex(normalized)) {
        setColor(normalized);
      }
    },
    []
  );
  const handlePhaseChange = reactExports.useCallback(
    (id, patch) => setPhases(
      (prev) => prev.map((p) => p._id === id ? { ...p, ...patch } : p)
    ),
    []
  );
  const handlePhaseRemove = reactExports.useCallback(
    (id) => setPhases((prev) => prev.filter((p) => p._id !== id)),
    []
  );
  const handleAddPhase = reactExports.useCallback(() => {
    setPhases((prev) => [...prev, makePhase()]);
    setTimeout(
      () => {
        var _a;
        return (_a = phaseBottomRef.current) == null ? void 0 : _a.scrollIntoView({ behavior: "smooth" });
      },
      50
    );
  }, []);
  const handleSubmit = reactExports.useCallback(
    async (e) => {
      e.preventDefault();
      if (!name.trim()) {
        setError("Service name is required.");
        return;
      }
      const priceNum = Number.parseFloat(price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        setError("Enter a valid price.");
        return;
      }
      const activePhaseDefs = category === "multi" ? phases.map(({ _id: _unused, ...p }) => p) : [];
      const total = category === "multi" ? activePhaseDefs.reduce((sum, p) => sum + p.durationMinutes, 0) : Math.max(15, priceNum > 0 ? 30 : 15);
      const input = {
        name: name.trim(),
        price: priceNum,
        color,
        category,
        phases: activePhaseDefs,
        totalDurationMinutes: total,
        finishingLabel: category === "multi" ? finishingLabel || void 0 : void 0
      };
      setSubmitting(true);
      setError("");
      try {
        if (service == null ? void 0 : service.id) {
          const updated = await updateService(service.id, input);
          updateServiceStore(updated);
        } else {
          const created = await createService(input);
          addService(created);
        }
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to save service."
        );
      } finally {
        setSubmitting(false);
      }
    },
    [
      name,
      price,
      color,
      category,
      phases,
      finishingLabel,
      service,
      addService,
      updateServiceStore,
      onClose
    ]
  );
  const handleBackdrop = reactExports.useCallback(
    (e) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );
  reactExports.useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);
  if (!open) return null;
  const isEdit = Boolean(service == null ? void 0 : service.id);
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "div",
    {
      className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm",
      onClick: handleBackdrop,
      onKeyDown: (e) => {
        if (e.key === "Escape") onClose();
      },
      role: "button",
      tabIndex: -1,
      "aria-label": "Close modal backdrop",
      "data-ocid": "services.dialog",
      children: /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "div",
        {
          className: "relative w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]",
          role: "dialog",
          "aria-modal": "true",
          "aria-labelledby": `${modalId}-title`,
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { id: `${modalId}-title`, className: "text-lg font-semibold", children: isEdit ? "Edit Service" : "New Service" }),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: onClose,
                  className: "p-2 rounded-full hover:bg-muted transition-colors",
                  "aria-label": "Close modal",
                  "data-ocid": "services.close_button",
                  children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 18 })
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "form",
              {
                id: `${modalId}-form`,
                onSubmit: handleSubmit,
                className: "flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("label", { className: "text-sm font-medium", htmlFor: `${modalId}-name`, children: [
                      "Service Name ",
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-destructive", children: "*" })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "input",
                      {
                        id: `${modalId}-name`,
                        type: "text",
                        value: name,
                        onChange: (e) => setName(e.target.value),
                        placeholder: "e.g. Color/Style",
                        className: "w-full rounded-xl border border-input bg-card px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent/50",
                        style: { fontSize: "16px" },
                        "data-ocid": "services.name_input"
                      }
                    )
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("label", { className: "text-sm font-medium", htmlFor: `${modalId}-price`, children: "Price" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium", children: "$" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          id: `${modalId}-price`,
                          type: "number",
                          inputMode: "decimal",
                          value: price,
                          onChange: (e) => setPrice(e.target.value),
                          placeholder: "0.00",
                          min: "0",
                          step: "0.01",
                          className: "w-full rounded-xl border border-input bg-card pl-8 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent/50",
                          style: { fontSize: "16px" },
                          "data-ocid": "services.price_input"
                        }
                      )
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: "Color" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-wrap gap-2", children: PRESET_COLORS.map((c) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      "button",
                      {
                        type: "button",
                        onClick: () => {
                          setColor(c);
                          setHexInput(c);
                        },
                        className: `w-8 h-8 rounded-full border-2 transition-transform ${color === c ? "border-foreground scale-110" : "border-transparent"}`,
                        style: { backgroundColor: c },
                        "aria-label": `Color ${c}`,
                        "data-ocid": `services.color_swatch.${c.replace("#", "")}`
                      },
                      c
                    )) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "div",
                        {
                          className: "w-10 h-10 rounded-full border-2 border-border flex-shrink-0 shadow-sm transition-colors",
                          style: { backgroundColor: color },
                          "data-ocid": "services.color_preview"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 relative", children: [
                        /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono", children: "#" }),
                        /* @__PURE__ */ jsxRuntimeExports.jsx(
                          "input",
                          {
                            type: "text",
                            value: hexInput.replace(/^#/, ""),
                            onChange: (e) => handleHexInput({
                              ...e,
                              target: { ...e.target, value: `#${e.target.value}` }
                            }),
                            maxLength: 6,
                            placeholder: "00ADB5",
                            className: "w-full rounded-xl border border-input bg-card pl-7 pr-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/50",
                            style: { fontSize: "16px" },
                            "data-ocid": "services.hex_input"
                          }
                        )
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: "Service Type" }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex rounded-xl border border-input overflow-hidden", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => setCategory("single"),
                          className: `flex-1 py-2.5 text-sm font-medium transition-colors ${category === "single" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`,
                          "data-ocid": "services.type_single_toggle",
                          children: "Single Phase"
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "button",
                        {
                          type: "button",
                          onClick: () => setCategory("multi"),
                          className: `flex-1 py-2.5 text-sm font-medium transition-colors ${category === "multi" ? "bg-accent text-accent-foreground" : "bg-card text-muted-foreground hover:bg-muted"}`,
                          "data-ocid": "services.type_multi_toggle",
                          children: "Multi Phase"
                        }
                      )
                    ] })
                  ] }),
                  category === "multi" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-3", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm font-medium", children: "Phases" }),
                      /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-xs text-muted-foreground", children: [
                        phases.length,
                        " phase",
                        phases.length !== 1 ? "s" : ""
                      ] })
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2", children: phases.map((phase, i) => /* @__PURE__ */ jsxRuntimeExports.jsx(
                      PhaseRow,
                      {
                        phase,
                        index: i,
                        total: phases.length,
                        onChange: handlePhaseChange,
                        onRemove: handlePhaseRemove
                      },
                      `phase-${String(i)}`
                    )) }),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "button",
                      {
                        type: "button",
                        onClick: handleAddPhase,
                        className: "flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-accent/40 text-accent text-sm font-medium hover:border-accent hover:bg-accent/5 transition-colors",
                        "data-ocid": "services.add_phase_button",
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16 }),
                          "Add Phase"
                        ]
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col gap-1.5", children: [
                      /* @__PURE__ */ jsxRuntimeExports.jsxs(
                        "label",
                        {
                          className: "text-sm font-medium",
                          htmlFor: `${modalId}-finishing`,
                          children: [
                            "Finishing Phase Label",
                            /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "ml-1 text-xs text-muted-foreground font-normal", children: "(shown on calendar block)" })
                          ]
                        }
                      ),
                      /* @__PURE__ */ jsxRuntimeExports.jsx(
                        "input",
                        {
                          id: `${modalId}-finishing`,
                          type: "text",
                          value: finishingLabel,
                          onChange: (e) => setFinishingLabel(e.target.value),
                          placeholder: "e.g. Style, Finish, Haircut/Style",
                          className: "w-full rounded-xl border border-input bg-card px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent/50",
                          style: { fontSize: "16px" },
                          "data-ocid": "services.finishing_label_input"
                        }
                      )
                    ] }),
                    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { ref: phaseBottomRef })
                  ] }),
                  error && /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "div",
                    {
                      className: "rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive",
                      "data-ocid": "services.error_state",
                      children: error
                    }
                  )
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-3 px-5 py-4 border-t border-border flex-shrink-0", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "button",
                  onClick: onClose,
                  className: "flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors",
                  "data-ocid": "services.cancel_button",
                  children: "Cancel"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                "button",
                {
                  type: "submit",
                  form: `${modalId}-form`,
                  disabled: submitting,
                  className: "flex-1 py-3 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors",
                  "data-ocid": "services.submit_button",
                  children: submitting ? "Saving…" : isEdit ? "Save Changes" : "Create Service"
                }
              )
            ] })
          ]
        }
      )
    }
  );
}
function Services() {
  var _a;
  const services = useAppStore((s) => s.services);
  const deleteServiceStore = useAppStore((s) => s.deleteService);
  const [modalOpen, setModalOpen] = reactExports.useState(false);
  const [editingService, setEditingService] = reactExports.useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = reactExports.useState(null);
  const [deleting, setDeleting] = reactExports.useState(false);
  const openCreate = reactExports.useCallback(() => {
    setEditingService(null);
    setModalOpen(true);
  }, []);
  const openEdit = reactExports.useCallback((svc) => {
    setEditingService(svc);
    setModalOpen(true);
  }, []);
  const openDuplicate = reactExports.useCallback((svc) => {
    setEditingService({
      ...svc,
      id: "",
      // empty id signals create mode within modal
      name: `Copy of ${svc.name}`
    });
    setModalOpen(true);
  }, []);
  const handleModalClose = reactExports.useCallback(() => {
    setModalOpen(false);
    setEditingService(null);
  }, []);
  const handleDeleteConfirm = reactExports.useCallback(async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteService(confirmDeleteId);
      deleteServiceStore(confirmDeleteId);
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, deleteServiceStore]);
  const modalService = (editingService == null ? void 0 : editingService.id) ? editingService : null;
  const isDuplicate = editingService !== null && !editingService.id;
  return /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex flex-col h-full", "data-ocid": "services.page", children: [
    /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-4 pt-5 pb-3 border-b border-border bg-card", children: [
      /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx("h1", { className: "text-xl font-semibold", children: "Services" }),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground mt-0.5", children: [
          services.length,
          " service",
          services.length !== 1 ? "s" : ""
        ] })
      ] }),
      /* @__PURE__ */ jsxRuntimeExports.jsxs(
        "button",
        {
          type: "button",
          onClick: openCreate,
          className: "flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm",
          "data-ocid": "services.add_button",
          children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16 }),
            "Add Service"
          ]
        }
      )
    ] }),
    /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex-1 overflow-auto px-4 py-4", children: services.length === 0 ? /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex flex-col items-center justify-center py-20 text-center",
        "data-ocid": "services.empty_state",
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4", children: /* @__PURE__ */ jsxRuntimeExports.jsx(Scissors, { size: 28, className: "text-accent" }) }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold mb-1", children: "No services yet" }),
          /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm text-muted-foreground mb-5", children: "Add your first service to get started." }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "button",
            {
              type: "button",
              onClick: openCreate,
              className: "flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors",
              "data-ocid": "services.empty_add_button",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(Plus, { size: 16 }),
                " Add Service"
              ]
            }
          )
        ]
      }
    ) : /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "flex flex-col gap-2", "data-ocid": "services.list", children: services.map((svc, i) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
      "div",
      {
        className: "flex items-center gap-3 p-3 rounded-xl border border-border bg-card shadow-xs hover:shadow-sm transition-shadow",
        "data-ocid": `services.item.${i + 1}`,
        children: [
          /* @__PURE__ */ jsxRuntimeExports.jsx(
            "div",
            {
              className: "w-3 h-12 rounded-full flex-shrink-0",
              style: { backgroundColor: svc.color }
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 min-w-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "font-semibold text-sm truncate", children: svc.name }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground mt-0.5", children: [
              formatDuration(svc.totalDurationMinutes),
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "mx-1", children: "•" }),
              formatPrice(svc.price)
            ] }),
            svc.category === "multi" && /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1 mt-1", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "px-1.5 py-0.5 bg-accent/10 text-accent rounded-md text-[10px] font-semibold uppercase tracking-wide", children: "Multi" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("span", { className: "text-[10px] text-muted-foreground", children: [
                svc.phases.length,
                " phase",
                svc.phases.length !== 1 ? "s" : ""
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-0.5 flex-shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => openDuplicate(svc),
                className: "p-2 rounded-lg hover:bg-muted transition-colors",
                "aria-label": "Duplicate service",
                "data-ocid": `services.duplicate_button.${i + 1}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(Copy, { size: 15, className: "text-muted-foreground" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => openEdit(svc),
                className: "p-2 rounded-lg hover:bg-muted transition-colors",
                "aria-label": "Edit service",
                "data-ocid": `services.edit_button.${i + 1}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(SquarePen, { size: 15, className: "text-muted-foreground" })
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setConfirmDeleteId(svc.id),
                className: "p-2 rounded-lg hover:bg-destructive/10 transition-colors",
                "aria-label": "Delete service",
                "data-ocid": `services.delete_button.${i + 1}`,
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Trash2,
                  {
                    size: 15,
                    className: "text-muted-foreground hover:text-destructive"
                  }
                )
              }
            )
          ] })
        ]
      },
      svc.id
    )) }) }),
    /* @__PURE__ */ jsxRuntimeExports.jsx(
      ServiceModal,
      {
        open: modalOpen,
        service: isDuplicate ? editingService : modalService,
        onClose: handleModalClose
      }
    ),
    confirmDeleteId && /* @__PURE__ */ jsxRuntimeExports.jsx(
      "div",
      {
        className: "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4",
        "data-ocid": "services.delete_dialog",
        children: /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-start gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ jsxRuntimeExports.jsx(TriangleAlert, { size: 18, className: "text-destructive" }) }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx("h3", { className: "font-semibold text-base", children: "Delete Service?" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm text-muted-foreground mt-1", children: [
                "This will permanently remove",
                " ",
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "font-medium text-foreground", children: ((_a = services.find((s) => s.id === confirmDeleteId)) == null ? void 0 : _a.name) ?? "this service" }),
                ". This action cannot be undone."
              ] })
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: () => setConfirmDeleteId(null),
                disabled: deleting,
                className: "flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors",
                "data-ocid": "services.cancel_button",
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: handleDeleteConfirm,
                disabled: deleting,
                className: "flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-colors",
                "data-ocid": "services.confirm_button",
                children: deleting ? "Deleting…" : "Delete"
              }
            )
          ] })
        ] })
      }
    )
  ] });
}
export {
  Services as default
};
