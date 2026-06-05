import { c as createLucideIcon, r as reactExports, j as jsxRuntimeExports, R as React, u as useAppStore, g as getClientNames, e as createAppointment, f as updateAppointment, h as React$1 } from "./index-BUnhKn-w.js";
import { m as clsx, n as cn, X, b as formatDuration, g as getTodayString, o as doBlocksOverlap } from "./utils-OLsRQTl3.js";
import { u as useShallow } from "./shallow-DW0QPtHQ.js";
import { T as TriangleAlert } from "./triangle-alert-CML8_Yos.js";
/**
 * @license lucide-react v0.511.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const __iconNode = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 16v-4", key: "1dtifu" }],
  ["path", { d: "M12 8h.01", key: "e9boi3" }]
];
const Info = createLucideIcon("info", __iconNode);
function setRef(ref, value) {
  if (typeof ref === "function") {
    return ref(value);
  } else if (ref !== null && ref !== void 0) {
    ref.current = value;
  }
}
function composeRefs(...refs) {
  return (node) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup == "function") {
        hasCleanup = true;
      }
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup == "function") {
            cleanup();
          } else {
            setRef(refs[i], null);
          }
        }
      };
    }
  };
}
var REACT_LAZY_TYPE = Symbol.for("react.lazy");
var use = React[" use ".trim().toString()];
function isPromiseLike(value) {
  return typeof value === "object" && value !== null && "then" in value;
}
function isLazyComponent(element) {
  return element != null && typeof element === "object" && "$$typeof" in element && element.$$typeof === REACT_LAZY_TYPE && "_payload" in element && isPromiseLike(element._payload);
}
// @__NO_SIDE_EFFECTS__
function createSlot(ownerName) {
  const SlotClone = /* @__PURE__ */ createSlotClone(ownerName);
  const Slot2 = reactExports.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props;
    if (isLazyComponent(children) && typeof use === "function") {
      children = use(children._payload);
    }
    const childrenArray = reactExports.Children.toArray(children);
    const slottable = childrenArray.find(isSlottable);
    if (slottable) {
      const newElement = slottable.props.children;
      const newChildren = childrenArray.map((child) => {
        if (child === slottable) {
          if (reactExports.Children.count(newElement) > 1) return reactExports.Children.only(null);
          return reactExports.isValidElement(newElement) ? newElement.props.children : null;
        } else {
          return child;
        }
      });
      return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children: reactExports.isValidElement(newElement) ? reactExports.cloneElement(newElement, void 0, newChildren) : null });
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(SlotClone, { ...slotProps, ref: forwardedRef, children });
  });
  Slot2.displayName = `${ownerName}.Slot`;
  return Slot2;
}
var Slot = /* @__PURE__ */ createSlot("Slot");
// @__NO_SIDE_EFFECTS__
function createSlotClone(ownerName) {
  const SlotClone = reactExports.forwardRef((props, forwardedRef) => {
    let { children, ...slotProps } = props;
    if (isLazyComponent(children) && typeof use === "function") {
      children = use(children._payload);
    }
    if (reactExports.isValidElement(children)) {
      const childrenRef = getElementRef(children);
      const props2 = mergeProps(slotProps, children.props);
      if (children.type !== reactExports.Fragment) {
        props2.ref = forwardedRef ? composeRefs(forwardedRef, childrenRef) : childrenRef;
      }
      return reactExports.cloneElement(children, props2);
    }
    return reactExports.Children.count(children) > 1 ? reactExports.Children.only(null) : null;
  });
  SlotClone.displayName = `${ownerName}.SlotClone`;
  return SlotClone;
}
var SLOTTABLE_IDENTIFIER = Symbol("radix.slottable");
function isSlottable(child) {
  return reactExports.isValidElement(child) && typeof child.type === "function" && "__radixId" in child.type && child.type.__radixId === SLOTTABLE_IDENTIFIER;
}
function mergeProps(slotProps, childProps) {
  const overrideProps = { ...childProps };
  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];
    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (slotPropValue && childPropValue) {
        overrideProps[propName] = (...args) => {
          const result = childPropValue(...args);
          slotPropValue(...args);
          return result;
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = { ...slotPropValue, ...childPropValue };
    } else if (propName === "className") {
      overrideProps[propName] = [slotPropValue, childPropValue].filter(Boolean).join(" ");
    }
  }
  return { ...slotProps, ...overrideProps };
}
function getElementRef(element) {
  var _a, _b;
  let getter = (_a = Object.getOwnPropertyDescriptor(element.props, "ref")) == null ? void 0 : _a.get;
  let mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.ref;
  }
  getter = (_b = Object.getOwnPropertyDescriptor(element, "ref")) == null ? void 0 : _b.get;
  mayWarn = getter && "isReactWarning" in getter && getter.isReactWarning;
  if (mayWarn) {
    return element.props.ref;
  }
  return element.props.ref || element.ref;
}
const falsyToString = (value) => typeof value === "boolean" ? `${value}` : value === 0 ? "0" : value;
const cx = clsx;
const cva = (base, config) => (props) => {
  var _config_compoundVariants;
  if ((config === null || config === void 0 ? void 0 : config.variants) == null) return cx(base, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
  const { variants, defaultVariants } = config;
  const getVariantClassNames = Object.keys(variants).map((variant) => {
    const variantProp = props === null || props === void 0 ? void 0 : props[variant];
    const defaultVariantProp = defaultVariants === null || defaultVariants === void 0 ? void 0 : defaultVariants[variant];
    if (variantProp === null) return null;
    const variantKey = falsyToString(variantProp) || falsyToString(defaultVariantProp);
    return variants[variant][variantKey];
  });
  const propsWithoutUndefined = props && Object.entries(props).reduce((acc, param) => {
    let [key, value] = param;
    if (value === void 0) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
  const getCompoundVariantClassNames = config === null || config === void 0 ? void 0 : (_config_compoundVariants = config.compoundVariants) === null || _config_compoundVariants === void 0 ? void 0 : _config_compoundVariants.reduce((acc, param) => {
    let { class: cvClass, className: cvClassName, ...compoundVariantOptions } = param;
    return Object.entries(compoundVariantOptions).every((param2) => {
      let [key, value] = param2;
      return Array.isArray(value) ? value.includes({
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key]) : {
        ...defaultVariants,
        ...propsWithoutUndefined
      }[key] === value;
    }) ? [
      ...acc,
      cvClass,
      cvClassName
    ] : acc;
  }, []);
  return cx(base, getVariantClassNames, getCompoundVariantClassNames, props === null || props === void 0 ? void 0 : props.class, props === null || props === void 0 ? void 0 : props.className);
};
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground shadow-xs hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}) {
  const Comp = asChild ? Slot : "button";
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Comp,
    {
      "data-slot": "button",
      className: cn(buttonVariants({ variant, size, className })),
      ...props
    }
  );
}
function Input({ className, type, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      type,
      "data-slot": "input",
      className: cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      ),
      ...props
    }
  );
}
var NODES = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "select",
  "span",
  "svg",
  "ul"
];
var Primitive = NODES.reduce((primitive, node) => {
  const Slot2 = /* @__PURE__ */ createSlot(`Primitive.${node}`);
  const Node = reactExports.forwardRef((props, forwardedRef) => {
    const { asChild, ...primitiveProps } = props;
    const Comp = asChild ? Slot2 : node;
    if (typeof window !== "undefined") {
      window[Symbol.for("radix-ui")] = true;
    }
    return /* @__PURE__ */ jsxRuntimeExports.jsx(Comp, { ...primitiveProps, ref: forwardedRef });
  });
  Node.displayName = `Primitive.${node}`;
  return { ...primitive, [node]: Node };
}, {});
var NAME = "Label";
var Label$1 = reactExports.forwardRef((props, forwardedRef) => {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Primitive.label,
    {
      ...props,
      ref: forwardedRef,
      onMouseDown: (event) => {
        var _a;
        const target = event.target;
        if (target.closest("button, input, select, textarea")) return;
        (_a = props.onMouseDown) == null ? void 0 : _a.call(props, event);
        if (!event.defaultPrevented && event.detail > 1) event.preventDefault();
      }
    }
  );
});
Label$1.displayName = NAME;
var Root = Label$1;
function Label({
  className,
  ...props
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    Root,
    {
      "data-slot": "label",
      className: cn(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className
      ),
      ...props
    }
  );
}
function Textarea({ className, ...props }) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "textarea",
    {
      "data-slot": "textarea",
      className: cn(
        "border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className
      ),
      ...props
    }
  );
}
function buildPhasesFromService(service, startTime) {
  if (service.category !== "multi" || service.phases.length === 0) return [];
  const [sh, sm] = startTime.split(":").map(Number);
  let cursor = sh * 60 + sm;
  return service.phases.map((p) => {
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "0");
    const inst = {
      name: p.name,
      durationMinutes: p.durationMinutes,
      phaseType: p.phaseType,
      startTime: `${hh}:${mm}`
    };
    cursor += p.durationMinutes;
    return inst;
  });
}
function recalcPhaseStarts(phases, baseStart) {
  const [sh, sm] = baseStart.split(":").map(Number);
  let cursor = sh * 60 + sm;
  return phases.map((p) => {
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "0");
    cursor += p.durationMinutes;
    return { ...p, startTime: `${hh}:${mm}` };
  });
}
function AppointmentModal({
  isOpen,
  onClose,
  mode,
  appointment,
  prefillDate,
  prefillTime,
  prefillClientName,
  prefillServiceId
}) {
  const services = useAppStore(useShallow((s) => s.services));
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const addAppointment = useAppStore((s) => s.addAppointment);
  const storeUpdate = useAppStore((s) => s.updateAppointment);
  const [form, setForm] = reactExports.useState(
    defaultForm(appointment, prefillDate, prefillTime, services)
  );
  const [clientSuggestions, setClientSuggestions] = reactExports.useState([]);
  const [showSuggestions, setShowSuggestions] = reactExports.useState(false);
  const [clientHistory, setClientHistory] = reactExports.useState({});
  const [showServiceBanner, setShowServiceBanner] = reactExports.useState(false);
  const [pendingServiceId, setPendingServiceId] = reactExports.useState(null);
  const [overlapWarning, setOverlapWarning] = reactExports.useState(null);
  const [overlapConfirmed, setOverlapConfirmed] = reactExports.useState(false);
  const [submitting, setSubmitting] = reactExports.useState(false);
  const [allClientNames, setAllClientNames] = reactExports.useState([]);
  const suggestRef = reactExports.useRef(null);
  const servicesRef = reactExports.useRef(services);
  const appointmentsRef = reactExports.useRef(appointments);
  servicesRef.current = services;
  appointmentsRef.current = appointments;
  const appointmentRef = reactExports.useRef(appointment);
  appointmentRef.current = appointment;
  reactExports.useEffect(() => {
    if (!isOpen) return;
    const currentServices = servicesRef.current;
    const currentAppointment = appointmentRef.current;
    const base = defaultForm(
      currentAppointment,
      prefillDate,
      prefillTime,
      currentServices
    );
    if (prefillClientName) base.clientName = prefillClientName;
    if (prefillServiceId) {
      const svc = currentServices.find((s) => s.id === prefillServiceId);
      if (svc) {
        base.serviceId = svc.id;
        base.durationHours = Math.floor(svc.totalDurationMinutes / 60);
        base.durationMinutes = svc.totalDurationMinutes % 60;
        base.price = String(svc.price);
        base.phases = buildPhasesFromService(svc, base.startTime);
      }
    }
    setForm(base);
    setShowServiceBanner(false);
    setPendingServiceId(null);
    setOverlapWarning(null);
    setOverlapConfirmed(false);
    setSubmitting(false);
  }, [
    isOpen,
    appointment == null ? void 0 : appointment.id,
    prefillDate,
    prefillTime,
    prefillClientName,
    prefillServiceId
  ]);
  reactExports.useEffect(() => {
    if (!isOpen) return;
    getClientNames().then((names) => {
      setAllClientNames(names);
      const hist = {};
      const sorted = [...appointmentsRef.current].sort(
        (a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime)
      );
      for (const a of sorted) {
        if (!hist[a.clientName]) {
          hist[a.clientName] = {
            serviceId: a.serviceId,
            serviceName: a.serviceName
          };
        }
      }
      setClientHistory(hist);
    });
  }, [isOpen]);
  reactExports.useEffect(() => {
    const handler = (e) => {
      if (suggestRef.current && !suggestRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const handlePhaseNameChange = reactExports.useCallback((idx, name) => {
    setForm((f) => ({
      ...f,
      phases: f.phases.map((p, i) => i === idx ? { ...p, name } : p)
    }));
  }, []);
  if (!isOpen) return null;
  const totalDuration = form.durationHours * 60 + form.durationMinutes;
  function handleClientChange(val) {
    setForm((f) => ({ ...f, clientName: val }));
    if (val.length >= 1) {
      const matches = allClientNames.filter(
        (n) => n.toLowerCase().startsWith(val.toLowerCase())
      );
      setClientSuggestions(matches.slice(0, 6));
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }
  function selectClientSuggestion(name) {
    const hist = clientHistory[name];
    setForm((f) => {
      const svc = hist ? services.find((s) => s.id === hist.serviceId) : null;
      if (svc) {
        const ph = buildPhasesFromService(svc, f.startTime);
        return {
          ...f,
          clientName: name,
          serviceId: svc.id,
          durationHours: Math.floor(svc.totalDurationMinutes / 60),
          durationMinutes: svc.totalDurationMinutes % 60,
          price: String(svc.price),
          phases: ph
        };
      }
      return { ...f, clientName: name };
    });
    setShowSuggestions(false);
  }
  function handleServiceChange(newId) {
    if (mode === "edit" && appointment && form.serviceId !== newId) {
      setPendingServiceId(newId);
      setShowServiceBanner(true);
      return;
    }
    applyService(newId);
  }
  function applyService(serviceId) {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    setForm((f) => ({
      ...f,
      serviceId,
      durationHours: Math.floor(svc.totalDurationMinutes / 60),
      durationMinutes: svc.totalDurationMinutes % 60,
      price: String(svc.price),
      phases: buildPhasesFromService(svc, f.startTime)
    }));
    setShowServiceBanner(false);
    setPendingServiceId(null);
  }
  function handleStartTimeChange(val) {
    setForm((f) => {
      const newPhases = f.phases.length > 0 ? recalcPhaseStarts(f.phases, val) : f.phases;
      return { ...f, startTime: val, phases: newPhases };
    });
  }
  function handlePhaseDurationChange(idx, hours, minutes) {
    setForm((f) => {
      const newPhases = f.phases.map(
        (p, i) => i === idx ? { ...p, durationMinutes: hours * 60 + minutes } : p
      );
      const recalced = recalcPhaseStarts(newPhases, f.startTime);
      const totalMin = recalced.reduce((sum, p) => sum + p.durationMinutes, 0);
      return {
        ...f,
        phases: recalced,
        durationHours: Math.floor(totalMin / 60),
        durationMinutes: totalMin % 60
      };
    });
  }
  function checkOverlap() {
    const svc = services.find((s) => s.id === form.serviceId);
    (svc == null ? void 0 : svc.color) ?? "#00ADB5";
    const blocks = form.phases.length > 0 ? form.phases.map((p) => ({
      start: p.startTime,
      dur: p.durationMinutes,
      isProcessing: p.phaseType === "processing"
    })) : [{ start: form.startTime, dur: totalDuration, isProcessing: false }];
    for (const existing of appointments) {
      if (mode === "edit" && appointment && existing.id === appointment.id)
        continue;
      if (existing.date !== form.date) continue;
      const existingBlocks = existing.phases.length > 0 ? existing.phases.map((p) => ({
        start: p.startTime,
        dur: p.durationMinutes,
        isProcessing: p.phaseType === "processing"
      })) : [
        {
          start: existing.startTime,
          dur: existing.durationMinutes,
          isProcessing: false
        }
      ];
      for (const nb of blocks) {
        for (const eb of existingBlocks) {
          if (doBlocksOverlap(nb.start, nb.dur, eb.start, eb.dur)) {
            if (eb.isProcessing) {
              return {
                message: `This overlaps ${existing.clientName}'s ${existing.serviceName} — Processing. Stylist is likely free — proceed?`,
                isProcessing: true
              };
            }
            return {
              message: `This overlaps ${existing.clientName}'s ${existing.serviceName}. Do you want to proceed?`,
              isProcessing: false
            };
          }
        }
      }
    }
    return null;
  }
  async function handleSubmit() {
    if (!form.clientName.trim() || !form.serviceId || !form.date || !form.startTime)
      return;
    if (!overlapConfirmed) {
      const overlap = checkOverlap();
      if (overlap) {
        setOverlapWarning(overlap);
        return;
      }
    }
    setSubmitting(true);
    try {
      const svc = services.find((s) => s.id === form.serviceId);
      const input = {
        clientName: form.clientName.trim(),
        serviceId: form.serviceId,
        serviceName: (svc == null ? void 0 : svc.name) ?? form.serviceId,
        date: form.date,
        startTime: form.startTime,
        durationMinutes: totalDuration,
        price: Number.parseFloat(form.price) || 0,
        phoneNumber: form.phone.trim() || void 0,
        notes: form.notes.trim() || void 0,
        phases: form.phases,
        color: (svc == null ? void 0 : svc.color) ?? "#00ADB5"
      };
      if (mode === "create") {
        const created = await createAppointment(input);
        addAppointment(created);
      } else if (appointment) {
        const updated = await updateAppointment(appointment.id, input);
        storeUpdate(updated);
      }
      onClose();
    } catch (err) {
      console.error("Failed to save appointment", err);
    } finally {
      setSubmitting(false);
    }
  }
  return /* @__PURE__ */ jsxRuntimeExports.jsxs(
    "dialog",
    {
      open: true,
      className: "fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-transparent p-0 max-w-none w-full h-full",
      "data-ocid": "appointment.dialog",
      "aria-label": mode === "create" ? "New Appointment" : "Edit Appointment",
      children: [
        /* @__PURE__ */ jsxRuntimeExports.jsx(
          "div",
          {
            className: "absolute inset-0 bg-foreground/40 backdrop-blur-sm",
            role: "button",
            tabIndex: -1,
            onClick: onClose,
            onKeyDown: (e) => {
              if (e.key === "Escape") onClose();
            },
            "aria-label": "Close modal"
          }
        ),
        /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh]", children: [
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx("h2", { className: "text-lg font-semibold", children: mode === "create" ? "New Appointment" : "Edit Appointment" }),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              "button",
              {
                type: "button",
                onClick: onClose,
                className: "p-1.5 rounded-lg hover:bg-muted transition-colors",
                "aria-label": "Close",
                "data-ocid": "appointment.close_button",
                children: /* @__PURE__ */ jsxRuntimeExports.jsx(X, { size: 20 })
              }
            )
          ] }),
          showServiceBanner && pendingServiceId && (() => {
            var _a;
            const svcName = ((_a = services.find((s) => s.id === pendingServiceId)) == null ? void 0 : _a.name) ?? pendingServiceId;
            return /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "mx-5 mt-4 flex-shrink-0 rounded-lg bg-accent/10 border border-accent/30 p-3 flex flex-col gap-2",
                "data-ocid": "appointment.service_banner",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-sm font-medium", children: [
                    "Update fields to match ",
                    svcName,
                    "?"
                  ] }),
                  /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        size: "sm",
                        className: "flex-1",
                        onClick: () => applyService(pendingServiceId),
                        "data-ocid": "appointment.service_banner_yes",
                        children: "Yes, update all"
                      }
                    ),
                    /* @__PURE__ */ jsxRuntimeExports.jsx(
                      Button,
                      {
                        size: "sm",
                        variant: "outline",
                        className: "flex-1",
                        onClick: () => {
                          setShowServiceBanner(false);
                          setPendingServiceId(null);
                        },
                        "data-ocid": "appointment.service_banner_keep",
                        children: "Keep current"
                      }
                    )
                  ] })
                ]
              }
            );
          })(),
          overlapWarning && /* @__PURE__ */ jsxRuntimeExports.jsxs(
            "div",
            {
              className: "mx-5 mt-4 flex-shrink-0 rounded-lg border p-3 flex flex-col gap-2",
              style: {
                borderColor: overlapWarning.isProcessing ? "oklch(var(--accent))" : "oklch(var(--destructive))"
              },
              "data-ocid": "appointment.overlap_warning",
              children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2 items-start", children: [
                  overlapWarning.isProcessing ? /* @__PURE__ */ jsxRuntimeExports.jsx(Info, { size: 16, className: "text-accent mt-0.5 shrink-0" }) : /* @__PURE__ */ jsxRuntimeExports.jsx(
                    TriangleAlert,
                    {
                      size: 16,
                      className: "text-destructive mt-0.5 shrink-0"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm", children: overlapWarning.message })
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-2", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      size: "sm",
                      className: "flex-1",
                      onClick: () => {
                        setOverlapConfirmed(true);
                        setOverlapWarning(null);
                        handleSubmit();
                      },
                      "data-ocid": "appointment.overlap_confirm",
                      children: "Yes, proceed"
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    Button,
                    {
                      size: "sm",
                      variant: "outline",
                      className: "flex-1",
                      onClick: () => setOverlapWarning(null),
                      "data-ocid": "appointment.overlap_cancel",
                      children: "Cancel"
                    }
                  )
                ] })
              ]
            }
          ),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex-1 overflow-y-auto px-5 py-4 space-y-4", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "relative", ref: suggestRef, children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Label,
                {
                  htmlFor: "appt-client",
                  className: "text-sm font-medium mb-1.5 block",
                  children: "Client Name *"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "appt-client",
                  value: form.clientName,
                  onChange: (e) => handleClientChange(e.target.value),
                  onFocus: () => form.clientName.length >= 1 && setShowSuggestions(clientSuggestions.length > 0),
                  placeholder: "e.g. Sarah Jenkins",
                  autoComplete: "off",
                  className: "text-base",
                  "data-ocid": "appointment.client_input"
                }
              ),
              showSuggestions && /* @__PURE__ */ jsxRuntimeExports.jsx("div", { className: "absolute top-full left-0 right-0 z-10 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden", children: clientSuggestions.map((name) => /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "button",
                {
                  type: "button",
                  className: "w-full px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between",
                  onMouseDown: (e) => {
                    e.preventDefault();
                    selectClientSuggestion(name);
                  },
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("span", { children: name }),
                    clientHistory[name] && /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-xs text-muted-foreground", children: clientHistory[name].serviceName })
                  ]
                },
                name
              )) })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Label,
                {
                  htmlFor: "appt-service",
                  className: "text-sm font-medium mb-1.5 block",
                  children: "Service"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsxs(
                "select",
                {
                  id: "appt-service",
                  value: form.serviceId,
                  onChange: (e) => handleServiceChange(e.target.value),
                  className: "w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring",
                  "data-ocid": "appointment.service_select",
                  children: [
                    /* @__PURE__ */ jsxRuntimeExports.jsx("option", { value: "", children: "Select a service…" }),
                    services.map((s) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: s.id, children: [
                      s.name,
                      " — $",
                      s.price
                    ] }, s.id))
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "grid grid-cols-2 gap-3", children: [
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Label,
                  {
                    htmlFor: "appt-date",
                    className: "text-sm font-medium mb-1.5 block",
                    children: "Date"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    id: "appt-date",
                    type: "date",
                    value: form.date,
                    onChange: (e) => setForm((f) => ({ ...f, date: e.target.value })),
                    className: "text-base",
                    "data-ocid": "appointment.date_input"
                  }
                )
              ] }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Label,
                  {
                    htmlFor: "appt-time",
                    className: "text-sm font-medium mb-1.5 block",
                    children: "Start Time"
                  }
                ),
                /* @__PURE__ */ jsxRuntimeExports.jsx(
                  Input,
                  {
                    id: "appt-time",
                    type: "time",
                    value: form.startTime,
                    onChange: (e) => handleStartTimeChange(e.target.value),
                    className: "text-base",
                    "data-ocid": "appointment.time_input"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(Label, { className: "text-sm font-medium mb-1.5 block", children: "Duration" }),
              /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 items-center", children: [
                /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-1.5", children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "select",
                    {
                      value: form.durationHours,
                      onChange: (e) => setForm((f) => ({
                        ...f,
                        durationHours: Number(e.target.value)
                      })),
                      className: "w-20 rounded-md border border-input bg-background text-foreground px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring",
                      "data-ocid": "appointment.duration_hours",
                      children: Array.from({ length: 13 }, (_, i) => i).map((h) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: h, children: [
                        h,
                        "h"
                      ] }, h))
                    }
                  ),
                  /* @__PURE__ */ jsxRuntimeExports.jsx(
                    "select",
                    {
                      value: form.durationMinutes,
                      onChange: (e) => setForm((f) => ({
                        ...f,
                        durationMinutes: Number(e.target.value)
                      })),
                      className: "w-20 rounded-md border border-input bg-background text-foreground px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring",
                      "data-ocid": "appointment.duration_minutes",
                      children: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: m, children: [
                        m,
                        "m"
                      ] }, m))
                    }
                  )
                ] }),
                /* @__PURE__ */ jsxRuntimeExports.jsx("span", { className: "text-sm text-muted-foreground", children: formatDuration(totalDuration) })
              ] })
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Label,
                {
                  htmlFor: "appt-price",
                  className: "text-sm font-medium mb-1.5 block",
                  children: "Price ($)"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "appt-price",
                  type: "number",
                  inputMode: "decimal",
                  min: "0",
                  step: "0.01",
                  value: form.price,
                  onChange: (e) => setForm((f) => ({ ...f, price: e.target.value })),
                  className: "text-base",
                  "data-ocid": "appointment.price_input"
                }
              )
            ] }),
            form.phases.length > 0 && /* @__PURE__ */ jsxRuntimeExports.jsxs(
              "div",
              {
                className: "rounded-lg border border-border p-3 space-y-3",
                "data-ocid": "appointment.phases_section",
                children: [
                  /* @__PURE__ */ jsxRuntimeExports.jsx("p", { className: "text-sm font-semibold", children: "Phase Breakdown" }),
                  form.phases.map((phase, idx) => {
                    const ph = Math.floor(phase.durationMinutes / 60);
                    const pm = phase.durationMinutes % 60;
                    return /* @__PURE__ */ jsxRuntimeExports.jsxs(
                      "div",
                      {
                        className: "space-y-2",
                        "data-ocid": `appointment.phase.${idx + 1}`,
                        children: [
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex items-center gap-2", children: [
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              "span",
                              {
                                className: `w-2 h-2 rounded-full ${phase.phaseType === "processing" ? "bg-muted-foreground" : "bg-accent"}`
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsx(
                              PhaseNameInput,
                              {
                                idx,
                                value: phase.name,
                                onChange: handlePhaseNameChange
                              }
                            ),
                            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-1.5 shrink-0", children: [
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "select",
                                {
                                  value: ph,
                                  onChange: (e) => handlePhaseDurationChange(
                                    idx,
                                    Number(e.target.value),
                                    pm
                                  ),
                                  className: "w-16 rounded-md border border-input bg-background text-foreground px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                                  children: Array.from({ length: 13 }, (_, i) => i).map((h) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: h, children: [
                                    h,
                                    "h"
                                  ] }, h))
                                }
                              ),
                              /* @__PURE__ */ jsxRuntimeExports.jsx(
                                "select",
                                {
                                  value: pm,
                                  onChange: (e) => handlePhaseDurationChange(
                                    idx,
                                    ph,
                                    Number(e.target.value)
                                  ),
                                  className: "w-16 rounded-md border border-input bg-background text-foreground px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring",
                                  children: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(
                                    (m) => /* @__PURE__ */ jsxRuntimeExports.jsxs("option", { value: m, children: [
                                      m,
                                      "m"
                                    ] }, m)
                                  )
                                }
                              )
                            ] })
                          ] }),
                          /* @__PURE__ */ jsxRuntimeExports.jsxs("p", { className: "text-xs text-muted-foreground pl-4", children: [
                            "Starts ",
                            phase.startTime,
                            " · ",
                            phase.phaseType
                          ] })
                        ]
                      },
                      `phase-${String(idx)}`
                    );
                  })
                ]
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Label,
                {
                  htmlFor: "appt-phone",
                  className: "text-sm font-medium mb-1.5 block",
                  children: "Phone (optional)"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Input,
                {
                  id: "appt-phone",
                  type: "tel",
                  value: form.phone,
                  onChange: (e) => setForm((f) => ({ ...f, phone: e.target.value })),
                  placeholder: "e.g. (555) 123-4567",
                  className: "text-base",
                  "data-ocid": "appointment.phone_input"
                }
              )
            ] }),
            /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { children: [
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Label,
                {
                  htmlFor: "appt-notes",
                  className: "text-sm font-medium mb-1.5 block",
                  children: "Notes (optional)"
                }
              ),
              /* @__PURE__ */ jsxRuntimeExports.jsx(
                Textarea,
                {
                  id: "appt-notes",
                  value: form.notes,
                  onChange: (e) => setForm((f) => ({ ...f, notes: e.target.value })),
                  placeholder: "Any notes about this appointment…",
                  rows: 3,
                  className: "text-base resize-none",
                  "data-ocid": "appointment.notes_textarea"
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ jsxRuntimeExports.jsxs("div", { className: "flex gap-3 px-5 py-4 border-t border-border flex-shrink-0", children: [
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                variant: "outline",
                className: "flex-1",
                onClick: onClose,
                "data-ocid": "appointment.cancel_button",
                children: "Cancel"
              }
            ),
            /* @__PURE__ */ jsxRuntimeExports.jsx(
              Button,
              {
                type: "button",
                className: "flex-1 bg-accent hover:bg-accent/90 text-accent-foreground",
                onClick: handleSubmit,
                disabled: submitting || !form.clientName.trim() || !form.serviceId || !form.date || !form.startTime,
                "data-ocid": "appointment.submit_button",
                children: submitting ? "Saving…" : mode === "create" ? "Book Appointment" : "Save Changes"
              }
            )
          ] })
        ] })
      ]
    }
  );
}
const PhaseNameInput = React$1.memo(function PhaseNameInput2({
  idx,
  value,
  onChange
}) {
  return /* @__PURE__ */ jsxRuntimeExports.jsx(
    "input",
    {
      type: "text",
      value,
      onChange: (e) => onChange(idx, e.target.value),
      className: "flex-1 rounded-md border border-input bg-background text-foreground px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-ring",
      placeholder: "Phase name"
    }
  );
});
function defaultForm(appointment, prefillDate, prefillTime, services = []) {
  var _a, _b;
  if (appointment) {
    return {
      clientName: appointment.clientName,
      serviceId: appointment.serviceId,
      date: appointment.date,
      startTime: appointment.startTime,
      durationHours: Math.floor(appointment.durationMinutes / 60),
      durationMinutes: appointment.durationMinutes % 60,
      price: String(appointment.price),
      phone: appointment.phoneNumber ?? "",
      notes: appointment.notes ?? "",
      phases: appointment.phases
    };
  }
  return {
    clientName: "",
    serviceId: ((_a = services[0]) == null ? void 0 : _a.id) ?? "",
    date: prefillDate ?? getTodayString(),
    startTime: prefillTime ?? "09:00",
    durationHours: services[0] ? Math.floor(services[0].totalDurationMinutes / 60) : 0,
    durationMinutes: services[0] ? services[0].totalDurationMinutes % 60 : 30,
    price: services[0] ? String(services[0].price) : "",
    phone: "",
    notes: "",
    phases: ((_b = services[0]) == null ? void 0 : _b.category) === "multi" ? buildPhasesFromService(services[0], prefillTime ?? "09:00") : []
  };
}
export {
  AppointmentModal as A,
  Button as B
};
