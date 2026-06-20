import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Info, Plus, RotateCcw, Trash2, X } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useShallow } from "zustand/shallow";
import {
  createAppointment,
  getClientNames,
  updateAppointment,
} from "../lib/api";
import { isActiveAppointment } from "../lib/appointmentLifecycle";
import {
  doBlocksOverlap,
  findAvailableSlots,
  findNextAvailable,
  formatDate,
  formatDuration,
  formatTime12,
  getTodayString,
  getWorkingScheduleForDate,
} from "../lib/utils";
import type { SlotSuggestion } from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type {
  Appointment,
  AppointmentInput,
  PhaseInstance,
  Service,
} from "../types";
import AppointmentCancelModal from "./AppointmentCancelModal";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  appointment?: Appointment;
  prefillDate?: string;
  prefillTime?: string;
  prefillClientName?: string;
  prefillServiceId?: string;
}

interface FormState {
  clientName: string;
  serviceId: string;
  date: string;
  startTime: string;
  durationHours: number;
  durationMinutes: number;
  price: string;
  phone: string;
  notes: string;
  phases: PhaseInstance[];
}

function buildPhasesFromService(
  service: Service,
  startTime: string,
): PhaseInstance[] {
  if (service.category !== "multi" || service.phases.length === 0) return [];
  const [sh, sm] = startTime.split(":").map(Number);
  let cursor = sh * 60 + sm;
  return service.phases.map((p) => {
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "0");
    const inst: PhaseInstance = {
      name: p.name,
      durationMinutes: p.durationMinutes,
      phaseType: p.phaseType,
      startTime: `${hh}:${mm}`,
    };
    cursor += p.durationMinutes;
    return inst;
  });
}

function recalcPhaseStarts(
  phases: PhaseInstance[],
  baseStart: string,
): PhaseInstance[] {
  const [sh, sm] = baseStart.split(":").map(Number);
  let cursor = sh * 60 + sm;
  return phases.map((p) => {
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "0");
    cursor += p.durationMinutes;
    return { ...p, startTime: `${hh}:${mm}` };
  });
}

function buildSinglePhaseFromForm(form: FormState): PhaseInstance {
  return {
    name: "Appointment",
    durationMinutes: Math.max(
      5,
      form.durationHours * 60 + form.durationMinutes,
    ),
    phaseType: "active",
    startTime: form.startTime,
  };
}

export default function AppointmentModal({
  isOpen,
  onClose,
  mode,
  appointment,
  prefillDate,
  prefillTime,
  prefillClientName,
  prefillServiceId,
}: Props) {
  const services = useAppStore(useShallow((s) => s.services));
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const clientContacts = useAppStore(useShallow((s) => s.clientContacts));
  const settings = useAppStore(useShallow((s) => s.settings));
  const addAppointment = useAppStore((s) => s.addAppointment);
  const storeUpdate = useAppStore((s) => s.updateAppointment);
  const addClientContact = useAppStore((s) => s.addClientContact);
  const updateClientContact = useAppStore((s) => s.updateClientContact);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [form, setForm] = useState<FormState>(
    defaultForm(appointment, prefillDate, prefillTime, services),
  );
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clientHistory, setClientHistory] = useState<
    Record<
      string,
      {
        serviceId: string;
        serviceName: string;
        lastDate: string;
        phone?: string;
        notes?: string;
      }
    >
  >({});
  const [showServiceBanner, setShowServiceBanner] = useState(false);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<{
    message: string;
    isProcessing: boolean;
  } | null>(null);
  const [overlapConfirmed, setOverlapConfirmed] = useState(false);
  const [outsideHoursWarning, setOutsideHoursWarning] = useState<string | null>(
    null,
  );
  const [outsideHoursConfirmed, setOutsideHoursConfirmed] = useState(false);
  const [findingNext, setFindingNext] = useState(false);
  const [findNextMsg, setFindNextMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [recurEnabled, setRecurEnabled] = useState(false);
  const [recurWeeks, setRecurWeeks] = useState(1);
  const [recurCount, setRecurCount] = useState(4);
  const [allClientNames, setAllClientNames] = useState<string[]>([]);
  const suggestRef = useRef<HTMLDivElement>(null);
  // Stable refs so the form-reset effect never re-runs due to array/object identity
  const servicesRef = useRef(services);
  const appointmentsRef = useRef(appointments);
  servicesRef.current = services;
  appointmentsRef.current = appointments;

  // Reset form when modal opens or the appointment being edited changes.
  // IMPORTANT: deps must NOT include `services` or `appointments` — those are
  // consumed via refs to avoid infinite loops (React error #185).
  // appointment is read via appointmentRef so we can use appointment?.id as the
  // stable identity dep without including the full object.
  const appointmentRef = useRef(appointment);
  appointmentRef.current = appointment;
  // biome-ignore lint/correctness/useExhaustiveDependencies: appointment consumed via appointmentRef; appointment?.id tracks identity changes only
  useEffect(() => {
    if (!isOpen) return;
    const currentServices = servicesRef.current;
    const currentAppointment = appointmentRef.current;
    const base = defaultForm(
      currentAppointment,
      prefillDate,
      prefillTime,
      currentServices,
    );
    // Apply rebook prefill overrides if provided
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
    setOutsideHoursWarning(null);
    setOutsideHoursConfirmed(false);
    setSubmitting(false);
    setCancelTarget(null);
    setRecurEnabled(false);
    setRecurWeeks(1);
    setRecurCount(4);
  }, [
    isOpen,
    appointment?.id,
    prefillDate,
    prefillTime,
    prefillClientName,
    prefillServiceId,
  ]);

  // Load client names and build history map once when the modal opens.
  // Merged with standalone clientContacts so manually-added clients appear too.
  // biome-ignore lint/correctness/useExhaustiveDependencies: clientContacts consumed via ref to avoid re-runs
  useEffect(() => {
    if (!isOpen) return;
    getClientNames().then((names) => {
      // Merge ICP/localStorage names with standalone client contacts
      const contactNames = clientContacts.map((c) => c.name);
      const merged = [...new Set([...names, ...contactNames])].sort();
      setAllClientNames(merged);
      // Build client history map from current appointments ref
      const hist: Record<
        string,
        {
          serviceId: string;
          serviceName: string;
          lastDate: string;
          phone?: string;
          notes?: string;
        }
      > = {};
      for (const c of clientContacts) {
        hist[c.name] = {
          serviceId: "",
          serviceName: "",
          lastDate: "",
          phone: c.phone,
          notes: c.notes,
        };
      }
      const sorted = [...appointmentsRef.current].sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.startTime.localeCompare(a.startTime),
      );
      for (const a of sorted) {
        if (!hist[a.clientName]?.lastDate) {
          hist[a.clientName] = {
            serviceId: a.serviceId,
            serviceName: a.serviceName,
            lastDate: a.date,
            phone: hist[a.clientName]?.phone ?? a.phoneNumber,
            notes: hist[a.clientName]?.notes ?? a.notes,
          };
        } else {
          hist[a.clientName].phone = hist[a.clientName].phone ?? a.phoneNumber;
          hist[a.clientName].notes = hist[a.clientName].notes ?? a.notes;
        }
      }
      setClientHistory(hist);
    });
  }, [isOpen]);

  // Lock body scroll while modal is open (prevents iOS scroll-through)
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  // Click outside to close suggestions
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestRef.current &&
        !suggestRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // handlePhaseNameChange must be defined BEFORE the early return so hooks
  // are always called in the same order (Rules of Hooks).
  const handlePhaseNameChange = useCallback((idx: number, name: string) => {
    setForm((f) => ({
      ...f,
      phases: f.phases.map((p, i) => (i === idx ? { ...p, name } : p)),
    }));
  }, []);

  const slotSuggestions = useMemo<SlotSuggestion[]>(() => {
    if (!isOpen || !form.serviceId || !form.date) return [];
    const svc =
      servicesRef.current.find((s) => s.id === form.serviceId) ?? null;
    // Always use form duration — it's set from the service on select and respects manual overrides.
    // svc.totalDurationMinutes may be undefined for older ICP records.
    const dur = form.durationHours * 60 + form.durationMinutes;
    return findAvailableSlots(
      form.date,
      svc,
      dur,
      appointmentsRef.current,
      settings,
      appointment?.id,
    );
  }, [
    isOpen,
    form.serviceId,
    form.date,
    form.durationHours,
    form.durationMinutes,
    settings,
    appointment?.id,
  ]);

  if (!isOpen) return null;

  const totalDuration = form.durationHours * 60 + form.durationMinutes;

  function capitalizeWords(s: string): string {
    return s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
  }

  function handleClientChange(val: string) {
    const capitalized = capitalizeWords(val);
    setForm((f) => ({ ...f, clientName: capitalized }));
    const matches =
      capitalized.length >= 1
        ? allClientNames.filter((n) =>
            n.toLowerCase().startsWith(capitalized.toLowerCase()),
          )
        : allClientNames;
    setClientSuggestions(matches.slice(0, 8));
    setShowSuggestions(matches.length > 0);
  }

  function selectClientSuggestion(name: string) {
    const hist = clientHistory[name];
    setForm((f) => {
      const svc = hist ? services.find((s) => s.id === hist.serviceId) : null;
      const base = {
        ...f,
        clientName: name,
        phone: hist?.phone ?? f.phone,
        notes: hist?.notes ?? f.notes,
      };
      if (svc) {
        const ph = buildPhasesFromService(svc, f.startTime);
        return {
          ...base,
          serviceId: svc.id,
          durationHours: Math.floor(svc.totalDurationMinutes / 60),
          durationMinutes: svc.totalDurationMinutes % 60,
          price: String(svc.price),
          phases: ph,
        };
      }
      return base;
    });
    setShowSuggestions(false);
  }

  function handleServiceChange(newId: string) {
    if (mode === "edit" && appointment && form.serviceId !== newId) {
      setPendingServiceId(newId);
      setShowServiceBanner(true);
      return;
    }
    applyService(newId);
  }

  function applyService(serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    setForm((f) => ({
      ...f,
      serviceId,
      durationHours: Math.floor(svc.totalDurationMinutes / 60),
      durationMinutes: svc.totalDurationMinutes % 60,
      price: String(svc.price),
      phases: buildPhasesFromService(svc, f.startTime),
    }));
    setShowServiceBanner(false);
    setPendingServiceId(null);
  }

  function handleStartTimeChange(val: string) {
    setForm((f) => {
      const newPhases =
        f.phases.length > 0 ? recalcPhaseStarts(f.phases, val) : f.phases;
      return { ...f, startTime: val, phases: newPhases };
    });
  }

  function handlePhaseDurationChange(
    idx: number,
    hours: number,
    minutes: number,
  ) {
    setForm((f) => {
      const newPhases = f.phases.map((p, i) =>
        i === idx ? { ...p, durationMinutes: hours * 60 + minutes } : p,
      );
      const recalced = recalcPhaseStarts(newPhases, f.startTime);
      const totalMin = recalced.reduce((sum, p) => sum + p.durationMinutes, 0);
      return {
        ...f,
        phases: recalced,
        durationHours: Math.floor(totalMin / 60),
        durationMinutes: totalMin % 60,
      };
    });
  }

  function handlePhaseTypeChange(
    idx: number,
    phaseType: "active" | "processing",
  ) {
    setForm((f) => ({
      ...f,
      phases: f.phases.map((p, i) => (i === idx ? { ...p, phaseType } : p)),
    }));
  }

  function handleRemovePhase(idx: number) {
    setForm((f) => {
      const next = f.phases.filter((_, i) => i !== idx);
      const recalced = recalcPhaseStarts(next, f.startTime);
      const totalMin = recalced.reduce((sum, p) => sum + p.durationMinutes, 0);
      return {
        ...f,
        phases: recalced,
        durationHours: Math.floor(totalMin / 60),
        durationMinutes: totalMin % 60,
      };
    });
  }

  function handleAddPhase() {
    setForm((f) => {
      const next = [
        ...(f.phases.length > 0 ? f.phases : [buildSinglePhaseFromForm(f)]),
        {
          name: "New Phase",
          durationMinutes: 15,
          phaseType: "active" as const,
          startTime: f.startTime,
        },
      ];
      const recalced = recalcPhaseStarts(next, f.startTime);
      const totalMin = recalced.reduce((sum, p) => sum + p.durationMinutes, 0);
      return {
        ...f,
        phases: recalced,
        durationHours: Math.floor(totalMin / 60),
        durationMinutes: totalMin % 60,
      };
    });
  }

  function handleUseServicePhases() {
    const svc = services.find((s) => s.id === form.serviceId);
    if (!svc) return;
    const phases =
      svc.category === "multi"
        ? buildPhasesFromService(svc, form.startTime)
        : [
            {
              name: svc.name,
              durationMinutes: svc.totalDurationMinutes,
              phaseType: "active" as const,
              startTime: form.startTime,
            },
          ];
    const totalMin = phases.reduce((sum, p) => sum + p.durationMinutes, 0);
    setForm((f) => ({
      ...f,
      phases,
      durationHours: Math.floor(totalMin / 60),
      durationMinutes: totalMin % 60,
      price: String(svc.price),
    }));
  }

  function checkOverlap(): { message: string; isProcessing: boolean } | null {
    const svc = services.find((s) => s.id === form.serviceId);
    const _color = svc?.color ?? "#ACE6C0";
    const blocks =
      form.phases.length > 0
        ? form.phases.map((p) => ({
            start: p.startTime,
            dur: p.durationMinutes,
            isProcessing: p.phaseType === "processing",
          }))
        : [{ start: form.startTime, dur: totalDuration, isProcessing: false }];

    for (const existing of appointments) {
      if (mode === "edit" && appointment && existing.id === appointment.id)
        continue;
      if (!isActiveAppointment(existing)) continue;
      if (existing.date !== form.date) continue;

      const existingBlocks =
        existing.phases.length > 0
          ? existing.phases.map((p) => ({
              start: p.startTime,
              dur: p.durationMinutes,
              isProcessing: p.phaseType === "processing",
            }))
          : [
              {
                start: existing.startTime,
                dur: existing.durationMinutes,
                isProcessing: false,
              },
            ];

      for (const nb of blocks) {
        for (const eb of existingBlocks) {
          if (doBlocksOverlap(nb.start, nb.dur, eb.start, eb.dur)) {
            if (eb.isProcessing) {
              return {
                message: `This overlaps ${existing.clientName}'s ${existing.serviceName} — Processing. Stylist is likely free — proceed?`,
                isProcessing: true,
              };
            }
            return {
              message: `This overlaps ${existing.clientName}'s ${existing.serviceName}. Do you want to proceed?`,
              isProcessing: false,
            };
          }
        }
      }
    }
    return null;
  }

  function checkWorkingHours(): string | null {
    if (!form.date || !form.startTime) return null;
    const schedule = getWorkingScheduleForDate(form.date, settings);
    const dayName = new Date(`${form.date}T00:00:00`).toLocaleDateString(
      "en-US",
      { weekday: "long" },
    );
    if (!schedule.enabled) {
      return `${dayName} is not in your working schedule.`;
    }
    const toMin = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    };
    const apptStart = toMin(form.startTime);
    const apptEnd = apptStart + form.durationHours * 60 + form.durationMinutes;
    const schedStart = toMin(schedule.start);
    const schedEnd = toMin(schedule.end);
    if (apptStart < schedStart || apptEnd > schedEnd) {
      return `This appointment is outside your working hours for ${dayName} (${formatTime12(schedule.start)}–${formatTime12(schedule.end)}).`;
    }
    return null;
  }

  function handleSelectSlot(slot: SlotSuggestion) {
    setForm((f) => {
      const newPhases =
        f.phases.length > 0 ? recalcPhaseStarts(f.phases, slot.time) : f.phases;
      return { ...f, date: slot.date, startTime: slot.time, phases: newPhases };
    });
    setOutsideHoursWarning(null);
    setOutsideHoursConfirmed(false);
    setOverlapWarning(null);
    setOverlapConfirmed(false);
    setFindNextMsg(null);
  }

  async function handleFindNext() {
    const svc = services.find((s) => s.id === form.serviceId) ?? null;
    const dur = form.durationHours * 60 + form.durationMinutes;
    if (dur === 0) {
      setFindNextMsg(
        "No duration set — edit this service in Services to add a duration.",
      );
      return;
    }
    setFindingNext(true);
    setFindNextMsg(null);
    // Yield to React so "Searching…" renders before the synchronous scan
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    const result = findNextAvailable(
      form.date || getTodayString(),
      svc,
      dur,
      appointments,
      settings,
      appointment?.id,
    );
    setFindingNext(false);
    if (result) {
      const changedDate = result.date !== form.date;
      handleSelectSlot(result);
      if (changedDate) {
        const label = formatDate(result.date, {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        setFindNextMsg(`Moved to ${label}`);
      }
    } else {
      setFindNextMsg("No availability found in the next 30 days.");
    }
  }

  async function handleSubmit(
    skipOverlapCheck = false,
    skipHoursCheck = false,
  ) {
    if (
      !form.clientName.trim() ||
      !form.serviceId ||
      !form.date ||
      !form.startTime
    )
      return;

    if (!skipHoursCheck && !outsideHoursConfirmed) {
      const hoursMsg = checkWorkingHours();
      if (hoursMsg) {
        setOutsideHoursWarning(hoursMsg);
        return;
      }
    }

    if (!overlapConfirmed && !skipOverlapCheck) {
      const overlap = checkOverlap();
      if (overlap) {
        setOverlapWarning(overlap);
        return;
      }
    }

    setSubmitting(true);
    try {
      const svc = services.find((s) => s.id === form.serviceId);
      const input: AppointmentInput = {
        clientName: form.clientName.trim(),
        serviceId: form.serviceId,
        serviceName: svc?.name ?? form.serviceId,
        date: form.date,
        startTime: form.startTime,
        durationMinutes: totalDuration,
        price: Number.parseFloat(form.price) || 0,
        phoneNumber: form.phone.trim() || undefined,
        notes: form.notes.trim() || undefined,
        phases: form.phases,
        color: svc?.color ?? "#ACE6C0",
      };
      const clientContact = {
        name: input.clientName,
        phone: input.phoneNumber,
        notes: input.notes,
      };
      if (clientContacts.some((c) => c.name === clientContact.name)) {
        updateClientContact(clientContact.name, {
          phone: clientContact.phone,
          notes: clientContact.notes,
        });
      } else {
        addClientContact(clientContact);
      }

      if (mode === "create") {
        // Create the first (or only) appointment
        const created = await createAppointment(input);
        addAppointment(created);
        // Create recurring instances
        if (recurEnabled && recurCount > 1) {
          for (let i = 1; i < recurCount; i++) {
            const d = new Date(`${input.date}T00:00:00`);
            d.setDate(d.getDate() + i * recurWeeks * 7);
            const recurDate = d.toISOString().slice(0, 10);
            const recurPhases = input.phases.map((p) => ({ ...p }));
            const recurInput = {
              ...input,
              date: recurDate,
              phases: recurPhases,
            };
            const recurCreated = await createAppointment(recurInput);
            addAppointment(recurCreated);
          }
        }
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

  return (
    <dialog
      open
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-transparent p-0 max-w-none w-full h-full"
      data-ocid="appointment.dialog"
      aria-label={mode === "create" ? "New Appointment" : "Edit Appointment"}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        role="button"
        tabIndex={-1}
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
        aria-label="Close modal"
      />

      {/* Modal panel */}
      <div className="relative w-full sm:max-w-lg bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "New Appointment" : "Edit Appointment"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close"
            data-ocid="appointment.close_button"
          >
            <X size={20} />
          </button>
        </div>

        {/* Service switch banner */}
        {showServiceBanner &&
          pendingServiceId &&
          (() => {
            const svcName =
              services.find((s) => s.id === pendingServiceId)?.name ??
              pendingServiceId;
            return (
              <div
                className="mx-5 mt-4 flex-shrink-0 rounded-lg bg-accent/10 border border-accent/30 p-3 flex flex-col gap-2"
                data-ocid="appointment.service_banner"
              >
                <p className="text-sm font-medium">
                  Update fields to match {svcName}?
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => applyService(pendingServiceId)}
                    data-ocid="appointment.service_banner_yes"
                  >
                    Yes, update all
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowServiceBanner(false);
                      setPendingServiceId(null);
                    }}
                    data-ocid="appointment.service_banner_keep"
                  >
                    Keep current
                  </Button>
                </div>
              </div>
            );
          })()}

        {/* Outside working hours warning */}
        {outsideHoursWarning && (
          <div
            className="mx-5 mt-4 flex-shrink-0 rounded-lg border border-accent/40 bg-accent/5 p-3 flex flex-col gap-2"
            data-ocid="appointment.outside_hours_warning"
          >
            <div className="flex gap-2 items-start">
              <AlertTriangle
                size={16}
                className="text-accent mt-0.5 shrink-0"
              />
              <p className="text-sm">{outsideHoursWarning} Book anyway?</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setOutsideHoursWarning(null);
                  handleSubmit(false, true);
                }}
                data-ocid="appointment.outside_hours_confirm"
              >
                Book anyway
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setOutsideHoursWarning(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Overlap warning */}
        {overlapWarning && (
          <div
            className="mx-5 mt-4 flex-shrink-0 rounded-lg border p-3 flex flex-col gap-2"
            style={{
              borderColor: overlapWarning.isProcessing
                ? "oklch(var(--accent))"
                : "oklch(var(--destructive))",
            }}
            data-ocid="appointment.overlap_warning"
          >
            <div className="flex gap-2 items-start">
              {overlapWarning.isProcessing ? (
                <Info size={16} className="text-accent mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle
                  size={16}
                  className="text-destructive mt-0.5 shrink-0"
                />
              )}
              <p className="text-sm">{overlapWarning.message}</p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={() => {
                  setOverlapConfirmed(true);
                  setOverlapWarning(null);
                  handleSubmit(true, true);
                }}
                data-ocid="appointment.overlap_confirm"
              >
                Yes, proceed
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={() => setOverlapWarning(null)}
                data-ocid="appointment.overlap_cancel"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Scrollable form body */}
        <div
          className="flex-1 overflow-y-auto px-5 py-4 space-y-4"
          style={{ overscrollBehavior: "contain" }}
        >
          {/* Client name with autocomplete */}
          <div className="relative" ref={suggestRef}>
            <Label
              htmlFor="appt-client"
              className="text-sm font-medium mb-1.5 block"
            >
              Client Name *
            </Label>
            <Input
              id="appt-client"
              value={form.clientName}
              onChange={(e) => handleClientChange(e.target.value)}
              onFocus={() => {
                const matches =
                  form.clientName.length >= 1
                    ? allClientNames.filter((n) =>
                        n
                          .toLowerCase()
                          .startsWith(form.clientName.toLowerCase()),
                      )
                    : allClientNames;
                setClientSuggestions(matches.slice(0, 8));
                setShowSuggestions(matches.length > 0);
              }}
              placeholder="e.g. Sarah Jenkins"
              autoComplete="off"
              autoCapitalize="words"
              className="text-base"
              data-ocid="appointment.client_input"
            />
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                {clientSuggestions.map((name) => {
                  const hist = clientHistory[name];
                  return (
                    <button
                      type="button"
                      key={name}
                      className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between gap-3"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectClientSuggestion(name);
                      }}
                    >
                      <span className="min-w-0">
                        <span className="block font-medium truncate">
                          {name}
                        </span>
                        {hist?.phone && (
                          <span className="block text-xs text-muted-foreground truncate">
                            {hist.phone}
                          </span>
                        )}
                      </span>
                      {hist?.serviceName && (
                        <span className="text-xs text-muted-foreground text-right shrink-0">
                          <span className="block">{hist.serviceName}</span>
                          <span className="block opacity-70">
                            {formatDate(hist.lastDate, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Client contact info */}
          <div>
            <Label
              htmlFor="appt-phone"
              className="text-sm font-medium mb-1.5 block"
            >
              Phone Number
            </Label>
            <Input
              id="appt-phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="Client phone number"
              className="text-base"
              data-ocid="appointment.phone_input"
            />
          </div>

          {/* Service */}
          <div>
            <Label
              htmlFor="appt-service"
              className="text-sm font-medium mb-1.5 block"
            >
              Service
            </Label>
            <select
              id="appt-service"
              value={form.serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
              data-ocid="appointment.service_select"
            >
              <option value="">Select a service…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label
                htmlFor="appt-date"
                className="text-sm font-medium mb-1.5 block"
              >
                Date
              </Label>
              <Input
                id="appt-date"
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                className="text-base"
                data-ocid="appointment.date_input"
              />
            </div>
            <div>
              <Label
                htmlFor="appt-time"
                className="text-sm font-medium mb-1.5 block"
              >
                Start Time
              </Label>
              <Input
                id="appt-time"
                type="time"
                value={form.startTime}
                onChange={(e) => handleStartTimeChange(e.target.value)}
                className="text-base"
                data-ocid="appointment.time_input"
              />
            </div>
          </div>

          {/* Smart slot suggestions */}
          {form.serviceId && form.date && (
            <div data-ocid="appointment.slot_suggestions">
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="text-sm font-medium">Suggested Times</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatDate(form.date, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleFindNext}
                  disabled={findingNext}
                  className="text-xs text-accent font-medium hover:underline disabled:opacity-50 flex-shrink-0"
                  data-ocid="appointment.find_next_button"
                >
                  {findingNext ? "Searching…" : "Next available →"}
                </button>
              </div>
              {findNextMsg && (
                <p
                  className={`text-xs mb-2 px-2 py-1 rounded-md ${findNextMsg.startsWith("No") ? "text-muted-foreground bg-muted" : "text-accent bg-accent/10"}`}
                >
                  {findNextMsg}
                </p>
              )}
              {slotSuggestions.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  {form.durationHours === 0 && form.durationMinutes === 0
                    ? "No duration set — edit this service in Services to add a duration."
                    : 'No open slots on this day — try "Next available →".'}
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {(() => {
                    const selectedIdx = slotSuggestions.findIndex(
                      (s) => s.time === form.startTime && s.date === form.date,
                    );
                    // Always include the selected slot even if it falls past position 6
                    const base = slotSuggestions.slice(0, 6);
                    const selected =
                      selectedIdx >= 6 ? slotSuggestions[selectedIdx] : null;
                    const visible = selected ? [...base, selected] : base;
                    return (
                      <>
                        {visible.map((slot) => {
                          const isSelected =
                            slot.time === form.startTime &&
                            slot.date === form.date;
                          return (
                            <button
                              key={`${slot.date}-${slot.time}`}
                              type="button"
                              onClick={() => handleSelectSlot(slot)}
                              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-left text-sm transition-colors ${
                                isSelected
                                  ? "border-accent bg-accent/10 text-accent font-medium"
                                  : "border-border bg-card hover:bg-muted text-foreground"
                              }`}
                              data-ocid={`appointment.slot_${slot.time}`}
                            >
                              <span className="font-medium">
                                {formatTime12(slot.time)}
                              </span>
                              <span
                                className={`text-xs ${isSelected ? "text-accent/80" : "text-muted-foreground"}`}
                              >
                                {slot.type === "processing-gap"
                                  ? `in ${slot.duringClient}'s processing gap`
                                  : "open slot"}
                              </span>
                            </button>
                          );
                        })}
                        {slotSuggestions.length > 6 && (
                          <p className="text-xs text-muted-foreground text-center">
                            +{slotSuggestions.length - 6} more — set time
                            manually above
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* Duration */}
          <div>
            <Label className="text-sm font-medium mb-1.5 block">Duration</Label>
            <div className="flex gap-3 items-center">
              <div className="flex items-center gap-1.5">
                <select
                  value={form.durationHours}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      durationHours: Number(e.target.value),
                    }))
                  }
                  className="w-20 rounded-md border border-input bg-background text-foreground px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  data-ocid="appointment.duration_hours"
                >
                  {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                    <option key={h} value={h}>
                      {h}h
                    </option>
                  ))}
                </select>
                <select
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      durationMinutes: Number(e.target.value),
                    }))
                  }
                  className="w-20 rounded-md border border-input bg-background text-foreground px-2 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ring"
                  data-ocid="appointment.duration_minutes"
                >
                  {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
                    <option key={m} value={m}>
                      {m}m
                    </option>
                  ))}
                </select>
              </div>
              <span className="text-sm text-muted-foreground">
                {formatDuration(totalDuration)}
              </span>
            </div>
          </div>

          {/* Price */}
          <div>
            <Label
              htmlFor="appt-price"
              className="text-sm font-medium mb-1.5 block"
            >
              Price ($)
            </Label>
            <Input
              id="appt-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) =>
                setForm((f) => ({ ...f, price: e.target.value }))
              }
              className="text-base"
              data-ocid="appointment.price_input"
            />
          </div>

          {/* Appointment phases */}
          {form.serviceId && (
            <div
              className="rounded-lg border border-border p-3 space-y-3"
              data-ocid="appointment.phases_section"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">Appointment Phases</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Edits here affect this appointment only.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleUseServicePhases}
                  className="text-xs text-accent font-medium hover:underline flex items-center gap-1 shrink-0"
                  data-ocid="appointment.reset_service_phases_button"
                >
                  <RotateCcw size={12} />
                  Service defaults
                </button>
              </div>
              {form.phases.length === 0 ? (
                <div className="rounded-lg bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground mb-2">
                    This appointment is currently a single continuous block.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddPhase}
                    className="text-xs text-accent font-medium hover:underline inline-flex items-center gap-1"
                    data-ocid="appointment.customize_phases_button"
                  >
                    <Plus size={13} />
                    Customize phases
                  </button>
                </div>
              ) : (
                <>
                  {form.phases.map((phase, idx) => {
                    const ph = Math.floor(phase.durationMinutes / 60);
                    const pm = phase.durationMinutes % 60;
                    return (
                      <div
                        key={`phase-${String(idx)}`}
                        className="rounded-lg border border-border bg-card p-3 space-y-2"
                        data-ocid={`appointment.phase.${idx + 1}`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${phase.phaseType === "processing" ? "bg-muted-foreground" : "bg-accent"}`}
                          />
                          <span className="text-xs font-semibold text-muted-foreground w-5">
                            {idx + 1}
                          </span>
                          <PhaseNameInput
                            idx={idx}
                            value={phase.name}
                            onChange={handlePhaseNameChange}
                          />
                          {form.phases.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemovePhase(idx)}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                              aria-label="Remove phase"
                              data-ocid={`appointment.remove_phase.${idx + 1}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <div className="flex gap-1.5 shrink-0">
                            <select
                              value={ph}
                              onChange={(e) =>
                                handlePhaseDurationChange(
                                  idx,
                                  Number(e.target.value),
                                  pm,
                                )
                              }
                              className="w-16 rounded-md border border-input bg-background text-foreground px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              {Array.from({ length: 13 }, (_, i) => i).map(
                                (h) => (
                                  <option key={h} value={h}>
                                    {h}h
                                  </option>
                                ),
                              )}
                            </select>
                            <select
                              value={pm}
                              onChange={(e) =>
                                handlePhaseDurationChange(
                                  idx,
                                  ph,
                                  Number(e.target.value),
                                )
                              }
                              className="w-16 rounded-md border border-input bg-background text-foreground px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            >
                              {[
                                0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55,
                              ].map((m) => (
                                <option key={m} value={m}>
                                  {m}m
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        <div className="flex justify-end pl-7">
                          <div className="flex rounded-md border border-input overflow-hidden">
                            <button
                              type="button"
                              onClick={() =>
                                handlePhaseTypeChange(idx, "active")
                              }
                              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                phase.phaseType === "active"
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-background text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              Active
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handlePhaseTypeChange(idx, "processing")
                              }
                              className={`px-2.5 py-1.5 text-xs font-medium transition-colors ${
                                phase.phaseType === "processing"
                                  ? "bg-accent text-accent-foreground"
                                  : "bg-background text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              Processing
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground pl-4">
                          Starts {phase.startTime} · {phase.phaseType}
                        </p>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={handleAddPhase}
                    className="flex items-center justify-center gap-2 w-full py-2 rounded-lg border-2 border-dashed border-accent/40 text-accent text-sm font-medium hover:border-accent hover:bg-accent/5 transition-colors"
                    data-ocid="appointment.add_phase_button"
                  >
                    <Plus size={15} />
                    Add Phase
                  </button>
                </>
              )}
            </div>
          )}

          {/* Client Notes */}
          <div>
            <Label
              htmlFor="appt-notes"
              className="text-sm font-medium mb-1.5 block"
            >
              Client Notes{" "}
              <span className="text-xs font-normal text-muted-foreground">
                (shared with client profile)
              </span>
            </Label>
            <Textarea
              id="appt-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Client notes…"
              rows={3}
              className="text-base resize-none"
              data-ocid="appointment.notes_textarea"
            />
          </div>
        </div>

        {/* Recurring — create mode only */}
        {mode === "create" && (
          <div className="px-5 py-3 border-t border-border/60">
            <button
              type="button"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
              onClick={() => setRecurEnabled((v) => !v)}
              data-ocid="appointment.recur_toggle"
            >
              <span
                className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${recurEnabled ? "bg-accent border-accent" : "border-border"}`}
              >
                {recurEnabled && (
                  <span className="text-white text-[10px] font-bold">✓</span>
                )}
              </span>
              Repeat this appointment
            </button>
            {recurEnabled && (
              <div className="mt-2 flex items-center gap-2 flex-wrap text-sm">
                <span className="text-muted-foreground">Every</span>
                <select
                  value={recurWeeks}
                  onChange={(e) => setRecurWeeks(Number(e.target.value))}
                  className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {[1, 2, 3, 4, 6, 8].map((w) => (
                    <option key={w} value={w}>
                      {w} {w === 1 ? "week" : "weeks"}
                    </option>
                  ))}
                </select>
                <span className="text-muted-foreground">for</span>
                <select
                  value={recurCount}
                  onChange={(e) => setRecurCount(Number(e.target.value))}
                  className="rounded border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {[2, 3, 4, 6, 8, 12, 26, 52].map((n) => (
                    <option key={n} value={n}>
                      {n} appointments
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex flex-col gap-2 px-5 py-4 border-t border-border flex-shrink-0">
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
              data-ocid="appointment.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
              onClick={() => handleSubmit()}
              disabled={
                submitting ||
                !form.clientName.trim() ||
                !form.serviceId ||
                !form.date ||
                !form.startTime
              }
              data-ocid="appointment.submit_button"
            >
              {submitting
                ? "Saving…"
                : mode === "create"
                  ? "Book Appointment"
                  : "Save Changes"}
            </Button>
          </div>
          {mode === "edit" && appointment && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-destructive hover:bg-destructive/10 text-sm"
              onClick={() => setCancelTarget(appointment)}
              data-ocid="appointment.delete_button"
            >
              Cancel / no-show appointment
            </Button>
          )}
        </div>
      </div>
      <AppointmentCancelModal
        appointment={cancelTarget}
        onClose={() => {
          setCancelTarget(null);
          onClose();
        }}
      />
    </dialog>
  );
}

// Stable memoized phase name input — prevents remount on every keystroke
// by living outside AppointmentModal's render function.
const PhaseNameInput = React.memo(function PhaseNameInput({
  idx,
  value,
  onChange,
}: {
  idx: number;
  value: string;
  onChange: (idx: number, name: string) => void;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(idx, e.target.value)}
      className="flex-1 rounded-md border border-input bg-background text-foreground px-2 py-1.5 text-base focus:outline-none focus:ring-2 focus:ring-ring"
      placeholder="Phase name"
    />
  );
});

function defaultForm(
  appointment: Appointment | undefined,
  prefillDate?: string,
  prefillTime?: string,
  services: Service[] = [],
): FormState {
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
      phases: appointment.phases,
    };
  }
  return {
    clientName: "",
    serviceId: services[0]?.id ?? "",
    date: prefillDate ?? getTodayString(),
    startTime: prefillTime ?? "09:00",
    durationHours: services[0]
      ? Math.floor(services[0].totalDurationMinutes / 60)
      : 0,
    durationMinutes: services[0] ? services[0].totalDurationMinutes % 60 : 30,
    price: services[0] ? String(services[0].price) : "",
    phone: "",
    notes: "",
    phases:
      services[0]?.category === "multi"
        ? buildPhasesFromService(services[0], prefillTime ?? "09:00")
        : [],
  };
}
