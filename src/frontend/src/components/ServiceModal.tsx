import { GripVertical, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createService, updateService } from "../lib/api";
import { useAppStore } from "../store/useAppStore";
import type {
  PhaseDef,
  PhaseType,
  Service,
  ServiceCategory,
  ServiceInput,
} from "../types";

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
  "#9ECEAD",
];

function isValidHex(hex: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(hex);
}

// ─── Stable Phase Row — never re-mounts on state update ──────────────────────
interface PhaseRowProps {
  phase: PhaseDef & { _id: string };
  index: number;
  total: number;
  onChange: (id: string, patch: Partial<PhaseDef>) => void;
  onRemove: (id: string) => void;
}

function PhaseRow({ phase, index, total, onChange, onRemove }: PhaseRowProps) {
  const hours = Math.floor(phase.durationMinutes / 60);
  const minutes = phase.durationMinutes % 60;

  const handleName = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(phase._id, { name: e.target.value }),
    [phase._id, onChange],
  );
  const handleHours = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      onChange(phase._id, {
        durationMinutes:
          Number(e.target.value) * 60 + (phase.durationMinutes % 60),
      }),
    [phase._id, phase.durationMinutes, onChange],
  );
  const handleMinutes = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) =>
      onChange(phase._id, {
        durationMinutes:
          Math.floor(phase.durationMinutes / 60) * 60 + Number(e.target.value),
      }),
    [phase._id, phase.durationMinutes, onChange],
  );
  const handleType = useCallback(
    (type: PhaseType) => onChange(phase._id, { phaseType: type }),
    [phase._id, onChange],
  );
  const handleRemove = useCallback(
    () => onRemove(phase._id),
    [phase._id, onRemove],
  );

  return (
    <div
      className="rounded-xl border border-border bg-card p-3 flex flex-col gap-2"
      data-ocid={`services.phase_row.${index + 1}`}
    >
      <div className="flex items-center gap-2">
        <GripVertical
          size={14}
          className="text-muted-foreground/40 flex-shrink-0"
        />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide w-5">
          {index + 1}
        </span>
        <input
          type="text"
          value={phase.name}
          onChange={handleName}
          placeholder="Phase name"
          className="flex-1 min-w-0 rounded-lg border border-input bg-background px-3 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
          style={{ fontSize: "16px" }}
          data-ocid={`services.phase_name_input.${index + 1}`}
        />
        {total > 1 && (
          <button
            type="button"
            onClick={handleRemove}
            className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
            aria-label="Remove phase"
            data-ocid={`services.remove_phase_button.${index + 1}`}
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 pl-7">
        {/* Hours */}
        <div className="flex flex-col gap-0.5">
          <label
            className="text-[11px] text-muted-foreground"
            htmlFor={`phase-hours-${phase._id}`}
          >
            Hours
          </label>
          <select
            id={`phase-hours-${phase._id}`}
            value={hours}
            onChange={handleHours}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
            style={{ fontSize: "16px" }}
          >
            {Array.from({ length: 13 }, (_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static numeric range, order never changes
              <option key={`hour-${i}`} value={i}>
                {i}h
              </option>
            ))}
          </select>
        </div>
        {/* Minutes */}
        <div className="flex flex-col gap-0.5">
          <label
            className="text-[11px] text-muted-foreground"
            htmlFor={`phase-min-${phase._id}`}
          >
            Min
          </label>
          <select
            id={`phase-min-${phase._id}`}
            value={minutes}
            onChange={handleMinutes}
            className="rounded-lg border border-input bg-background px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
            style={{ fontSize: "16px" }}
          >
            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
              <option key={m} value={m}>
                {m}m
              </option>
            ))}
          </select>
        </div>
        {/* Phase type toggle */}
        <div className="flex flex-col gap-0.5 ml-auto">
          <span className="text-[11px] text-muted-foreground">Type</span>
          <div className="flex rounded-lg border border-input overflow-hidden">
            <button
              type="button"
              onClick={() => handleType("active")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                phase.phaseType === "active"
                  ? "bg-accent text-accent-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Active
            </button>
            <button
              type="button"
              onClick={() => handleType("processing")}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                phase.phaseType === "processing"
                  ? "bg-accent text-accent-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Processing
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ServiceModal ─────────────────────────────────────────────────────────────
export interface ServiceModalProps {
  open: boolean;
  service?: Service | null; // null/undefined = create mode; Service = edit mode
  onClose: () => void;
}

type PhaseWithId = PhaseDef & { _id: string };

let _phaseIdCounter = 0;
function nextPhaseId() {
  return `phase-${++_phaseIdCounter}`;
}

function makePhase(partial?: Partial<PhaseDef>): PhaseWithId {
  return {
    _id: nextPhaseId(),
    name: partial?.name ?? "Phase",
    durationMinutes: partial?.durationMinutes ?? 30,
    phaseType: partial?.phaseType ?? "active",
  };
}

export function ServiceModal({ open, service, onClose }: ServiceModalProps) {
  const addService = useAppStore((s) => s.addService);
  const updateServiceStore = useAppStore((s) => s.updateService);

  // ── Form state ──────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [hexInput, setHexInput] = useState(PRESET_COLORS[0]);
  const [category, setCategory] = useState<ServiceCategory>("single");
  const [phases, setPhases] = useState<PhaseWithId[]>([makePhase()]);
  const [singleDurH, setSingleDurH] = useState(0);
  const [singleDurM, setSingleDurM] = useState(30);
  const [finishingLabel, setFinishingLabel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const phaseBottomRef = useRef<HTMLDivElement>(null);
  const modalId = useId();

  // ── Pre-populate when editing ────────────────────────────────────────────
  // Use service?.id (or a sentinel for create mode) as the identity dep so
  // this effect only fires when a DIFFERENT service is opened, not on every
  // parent re-render that passes a new object reference.
  // The full service object is read via a ref to avoid including it in deps.
  const serviceRef = useRef(service);
  serviceRef.current = service;
  const prevOpenRef = useRef(false);
  const prevServiceIdRef = useRef<string | undefined>(undefined);

  // biome-ignore lint/correctness/useExhaustiveDependencies: service consumed via ref; open+serviceId are the identity deps
  useEffect(() => {
    const currentService = serviceRef.current;
    // Stable identity: "" for duplicate/create-with-data, undefined for blank create
    const currentId =
      currentService?.id ?? (currentService ? "__new__" : undefined);
    const didOpen = open && !prevOpenRef.current;
    const didServiceChange = currentId !== prevServiceIdRef.current;

    if (!open) {
      prevOpenRef.current = false;
      return;
    }

    // Only re-populate when the modal just opened or the service identity changed
    if (!didOpen && !didServiceChange) return;

    prevOpenRef.current = open;
    prevServiceIdRef.current = currentId;

    if (currentService) {
      // EDIT / DUPLICATE MODE — pre-fill all fields
      setName(currentService.name);
      setPrice(String(currentService.price));
      setColor(currentService.color);
      setHexInput(currentService.color);
      setCategory(currentService.category);
      setFinishingLabel(currentService.finishingLabel ?? "");
      const dur = currentService.totalDurationMinutes ?? 30;
      setSingleDurH(Math.floor(dur / 60));
      setSingleDurM(dur % 60);
      setPhases(
        currentService.phases.length > 0
          ? currentService.phases.map((p) => ({ ...p, _id: nextPhaseId() }))
          : [makePhase()],
      );
    } else {
      // CREATE MODE — reset
      setName("");
      setPrice("");
      setColor(PRESET_COLORS[0]);
      setHexInput(PRESET_COLORS[0]);
      setCategory("single");
      setPhases([makePhase()]);
      setFinishingLabel("");
      setSingleDurH(0);
      setSingleDurM(30);
    }
    setError("");
    setSubmitting(false);
  }, [open, service?.id]);

  // ── Color sync: hex input → preview (real-time on every keystroke) ───────
  const handleHexInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setHexInput(raw);
      // Normalize: prepend # if missing
      const normalized = raw.startsWith("#") ? raw : `#${raw}`;
      if (isValidHex(normalized)) {
        setColor(normalized);
      }
    },
    [],
  );

  // ── Phase handlers — stable references so PhaseRow never re-mounts ──────
  const handlePhaseChange = useCallback(
    (id: string, patch: Partial<PhaseDef>) =>
      setPhases((prev) =>
        prev.map((p) => (p._id === id ? { ...p, ...patch } : p)),
      ),
    [],
  );

  const handlePhaseRemove = useCallback(
    (id: string) => setPhases((prev) => prev.filter((p) => p._id !== id)),
    [],
  );

  const handleAddPhase = useCallback(() => {
    setPhases((prev) => [...prev, makePhase()]);
    // Auto-scroll to new phase
    setTimeout(
      () => phaseBottomRef.current?.scrollIntoView({ behavior: "smooth" }),
      50,
    );
  }, []);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
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

      const activePhaseDefs: PhaseDef[] =
        category === "multi" ? phases.map(({ _id: _unused, ...p }) => p) : [];
      const total =
        category === "multi"
          ? activePhaseDefs.reduce((sum, p) => sum + p.durationMinutes, 0)
          : Math.max(5, singleDurH * 60 + singleDurM);

      const input: ServiceInput = {
        name: name.trim(),
        price: priceNum,
        color,
        category,
        phases: activePhaseDefs,
        totalDurationMinutes: total,
        finishingLabel:
          category === "multi" ? finishingLabel || undefined : undefined,
      };

      setSubmitting(true);
      setError("");
      try {
        if (service?.id) {
          // Edit mode — service has a real id
          const updated = await updateService(service.id, input);
          updateServiceStore(updated);
        } else {
          // Create mode (new or duplicate)
          const created = await createService(input);
          addService(created);
        }
        onClose();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to save service.",
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
      singleDurH,
      singleDurM,
      finishingLabel,
      service,
      addService,
      updateServiceStore,
      onClose,
    ],
  );

  // ── Close on backdrop click / Escape ────────────────────────────────────
  const handleBackdrop = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (!open) return null;

  const isEdit = Boolean(service?.id);

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleBackdrop}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      // biome-ignore lint/a11y/useSemanticElements: backdrop uses role=button for keyboard dismiss
      role="button"
      tabIndex={-1}
      aria-label="Close modal backdrop"
      data-ocid="services.dialog"
    >
      <div
        className="relative w-full sm:max-w-lg bg-background rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]"
        // biome-ignore lint/a11y/useSemanticElements: modal uses role=dialog for accessibility
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${modalId}-title`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <h2 id={`${modalId}-title`} className="text-lg font-semibold">
            {isEdit ? "Edit Service" : "New Service"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
            aria-label="Close modal"
            data-ocid="services.close_button"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <form
          id={`${modalId}-form`}
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5"
          style={{ overscrollBehavior: "contain" }}
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor={`${modalId}-name`}>
              Service Name <span className="text-destructive">*</span>
            </label>
            <input
              id={`${modalId}-name`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Color/Style"
              className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
              style={{ fontSize: "16px" }}
              data-ocid="services.name_input"
            />
          </div>

          {/* Price */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor={`${modalId}-price`}>
              Price
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                $
              </span>
              <input
                id={`${modalId}-price`}
                type="number"
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full rounded-xl border border-input bg-card pl-8 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
                style={{ fontSize: "16px" }}
                data-ocid="services.price_input"
              />
            </div>
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Color</span>
            {/* Preset swatches */}
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setColor(c);
                    setHexInput(c);
                  }}
                  className={`w-8 h-8 rounded-full border-2 transition-transform ${
                    color === c
                      ? "border-foreground scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: c }}
                  aria-label={`Color ${c}`}
                  data-ocid={`services.color_swatch.${c.replace("#", "")}`}
                />
              ))}
            </div>
            {/* Hex input + live preview */}
            <div className="flex items-center gap-3">
              {/* Live color preview circle — always reflects current color state */}
              <div
                className="w-10 h-10 rounded-full border-2 border-border flex-shrink-0 shadow-sm transition-colors"
                style={{ backgroundColor: color }}
                data-ocid="services.color_preview"
              />
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-mono">
                  #
                </span>
                <input
                  type="text"
                  value={hexInput.replace(/^#/, "")}
                  onChange={(e) =>
                    handleHexInput({
                      ...e,
                      target: { ...e.target, value: `#${e.target.value}` },
                    })
                  }
                  maxLength={6}
                  placeholder="00ADB5"
                  className="w-full rounded-xl border border-input bg-card pl-7 pr-4 py-2.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                  style={{ fontSize: "16px" }}
                  data-ocid="services.hex_input"
                />
              </div>
            </div>
          </div>

          {/* Type toggle */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">Service Type</span>
            <div className="flex rounded-xl border border-input overflow-hidden">
              <button
                type="button"
                onClick={() => setCategory("single")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  category === "single"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
                data-ocid="services.type_single_toggle"
              >
                Single Phase
              </button>
              <button
                type="button"
                onClick={() => setCategory("multi")}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  category === "multi"
                    ? "bg-accent text-accent-foreground"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
                data-ocid="services.type_multi_toggle"
              >
                Multi Phase
              </button>
            </div>
          </div>

          {/* Duration — single phase only */}
          {category === "single" && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Duration</span>
              <div className="flex items-center gap-2">
                <select
                  value={singleDurH}
                  onChange={(e) => setSingleDurH(Number(e.target.value))}
                  className="rounded-xl border border-input bg-card px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
                  style={{ fontSize: "16px" }}
                  aria-label="Hours"
                >
                  {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static numeric range
                    <option key={h} value={h}>{h}h</option>
                  ))}
                </select>
                <select
                  value={singleDurM}
                  onChange={(e) => setSingleDurM(Number(e.target.value))}
                  className="rounded-xl border border-input bg-card px-3 py-2.5 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
                  style={{ fontSize: "16px" }}
                  aria-label="Minutes"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>{m}m</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Phase builder — only for multi */}
          {category === "multi" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Phases</span>
                <span className="text-xs text-muted-foreground">
                  {phases.length} phase{phases.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className="flex flex-col gap-2">
                {phases.map((phase, i) => (
                  <PhaseRow
                    key={`phase-${String(i)}`}
                    phase={phase}
                    index={i}
                    total={phases.length}
                    onChange={handlePhaseChange}
                    onRemove={handlePhaseRemove}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddPhase}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border-2 border-dashed border-accent/40 text-accent text-sm font-medium hover:border-accent hover:bg-accent/5 transition-colors"
                data-ocid="services.add_phase_button"
              >
                <Plus size={16} />
                Add Phase
              </button>

              {/* Finishing label */}
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-sm font-medium"
                  htmlFor={`${modalId}-finishing`}
                >
                  Finishing Phase Label
                  <span className="ml-1 text-xs text-muted-foreground font-normal">
                    (shown on calendar block)
                  </span>
                </label>
                <input
                  id={`${modalId}-finishing`}
                  type="text"
                  value={finishingLabel}
                  onChange={(e) => setFinishingLabel(e.target.value)}
                  placeholder="e.g. Style, Finish, Haircut/Style"
                  className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
                  style={{ fontSize: "16px" }}
                  data-ocid="services.finishing_label_input"
                />
              </div>

              {/* Scroll anchor */}
              <div ref={phaseBottomRef} />
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive"
              data-ocid="services.error_state"
            >
              {error}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
            data-ocid="services.cancel_button"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={`${modalId}-form`}
            disabled={submitting}
            className="flex-1 py-3 rounded-xl bg-accent text-accent-foreground text-sm font-semibold hover:bg-accent/90 disabled:opacity-50 transition-colors"
            data-ocid="services.submit_button"
          >
            {submitting
              ? "Saving…"
              : isEdit
                ? "Save Changes"
                : "Create Service"}
          </button>
        </div>
      </div>
    </div>
  );
}
