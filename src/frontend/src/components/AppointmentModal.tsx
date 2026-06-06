import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Info, X } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
  createAppointment,
  getClientNames,
  updateAppointment,
} from "../lib/api";
import { doBlocksOverlap, formatDate, formatDuration, getTodayString } from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type {
  Appointment,
  AppointmentInput,
  PhaseInstance,
  Service,
} from "../types";

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
  const addAppointment = useAppStore((s) => s.addAppointment);
  const storeUpdate = useAppStore((s) => s.updateAppointment);
  const deleteAppointment = useAppStore((s) => s.deleteAppointment);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState<FormState>(
    defaultForm(appointment, prefillDate, prefillTime, services),
  );
  const [clientSuggestions, setClientSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [clientHistory, setClientHistory] = useState<
    Record<string, { serviceId: string; serviceName: string; lastDate: string }>
  >({});
  const [showServiceBanner, setShowServiceBanner] = useState(false);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);
  const [overlapWarning, setOverlapWarning] = useState<{
    message: string;
    isProcessing: boolean;
  } | null>(null);
  const [overlapConfirmed, setOverlapConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    setSubmitting(false);
    setConfirmDelete(false);
  }, [
    isOpen,
    appointment?.id,
    prefillDate,
    prefillTime,
    prefillClientName,
    prefillServiceId,
  ]);

  // Load client names and build history map once when the modal opens.
  // Separated from the form-reset effect so neither causes the other to re-run.
  useEffect(() => {
    if (!isOpen) return;
    getClientNames().then((names) => {
      setAllClientNames(names);
      // Build client history map from current appointments ref
      const hist: Record<string, { serviceId: string; serviceName: string; lastDate: string }> = {};
      const sorted = [...appointmentsRef.current].sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.startTime.localeCompare(a.startTime),
      );
      for (const a of sorted) {
        if (!hist[a.clientName]) {
          hist[a.clientName] = {
            serviceId: a.serviceId,
            serviceName: a.serviceName,
            lastDate: a.date,
          };
        }
      }
      setClientHistory(hist);
    });
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

  if (!isOpen) return null;

  const totalDuration = form.durationHours * 60 + form.durationMinutes;

  function handleClientChange(val: string) {
    setForm((f) => ({ ...f, clientName: val }));
    if (val.length >= 1) {
      const matches = allClientNames.filter((n) =>
        n.toLowerCase().startsWith(val.toLowerCase()),
      );
      setClientSuggestions(matches.slice(0, 6));
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }

  function selectClientSuggestion(name: string) {
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
          phases: ph,
        };
      }
      return { ...f, clientName: name };
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

  function checkOverlap(): { message: string; isProcessing: boolean } | null {
    const svc = services.find((s) => s.id === form.serviceId);
    const _color = svc?.color ?? "#00ADB5";
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

  async function handleSubmit(skipOverlapCheck = false) {
    if (
      !form.clientName.trim() ||
      !form.serviceId ||
      !form.date ||
      !form.startTime
    )
      return;

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
        color: svc?.color ?? "#00ADB5",
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

  return (
    <dialog
      open
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-transparent p-0 max-w-none w-full h-full"
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
                  handleSubmit(true);
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
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
              onFocus={() =>
                form.clientName.length >= 1 &&
                setShowSuggestions(clientSuggestions.length > 0)
              }
              placeholder="e.g. Sarah Jenkins"
              autoComplete="off"
              className="text-base"
              data-ocid="appointment.client_input"
            />
            {showSuggestions && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
                {clientSuggestions.map((name) => (
                  <button
                    type="button"
                    key={name}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted transition-colors flex items-center justify-between"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectClientSuggestion(name);
                    }}
                  >
                    <span>{name}</span>
                    {clientHistory[name] && (
                      <span className="text-xs text-muted-foreground text-right">
                        <span className="block">{clientHistory[name].serviceName}</span>
                        <span className="block opacity-70">{formatDate(clientHistory[name].lastDate, { month: "short", day: "numeric" })}</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
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

          {/* Multiphase breakdown */}
          {form.phases.length > 0 && (
            <div
              className="rounded-lg border border-border p-3 space-y-3"
              data-ocid="appointment.phases_section"
            >
              <p className="text-sm font-semibold">Phase Breakdown</p>
              {form.phases.map((phase, idx) => {
                const ph = Math.floor(phase.durationMinutes / 60);
                const pm = phase.durationMinutes % 60;
                return (
                  <div
                    key={`phase-${String(idx)}`}
                    className="space-y-2"
                    data-ocid={`appointment.phase.${idx + 1}`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full ${phase.phaseType === "processing" ? "bg-muted-foreground" : "bg-accent"}`}
                      />
                      <PhaseNameInput
                        idx={idx}
                        value={phase.name}
                        onChange={handlePhaseNameChange}
                      />
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
                          {Array.from({ length: 13 }, (_, i) => i).map((h) => (
                            <option key={h} value={h}>
                              {h}h
                            </option>
                          ))}
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
                          {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(
                            (m) => (
                              <option key={m} value={m}>
                                {m}m
                              </option>
                            ),
                          )}
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground pl-4">
                      Starts {phase.startTime} · {phase.phaseType}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Phone */}
          <div>
            <Label
              htmlFor="appt-phone"
              className="text-sm font-medium mb-1.5 block"
            >
              Phone (optional)
            </Label>
            <Input
              id="appt-phone"
              type="tel"
              value={form.phone}
              onChange={(e) =>
                setForm((f) => ({ ...f, phone: e.target.value }))
              }
              placeholder="e.g. (555) 123-4567"
              className="text-base"
              data-ocid="appointment.phone_input"
            />
          </div>

          {/* Notes */}
          <div>
            <Label
              htmlFor="appt-notes"
              className="text-sm font-medium mb-1.5 block"
            >
              Notes (optional)
            </Label>
            <Textarea
              id="appt-notes"
              value={form.notes}
              onChange={(e) =>
                setForm((f) => ({ ...f, notes: e.target.value }))
              }
              placeholder="Any notes about this appointment…"
              rows={3}
              className="text-base resize-none"
              data-ocid="appointment.notes_textarea"
            />
          </div>
        </div>

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
            confirmDelete ? (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Keep
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="flex-1 text-sm"
                  onClick={() => {
                    deleteAppointment(appointment.id);
                    onClose();
                  }}
                  data-ocid="appointment.confirm_delete_button"
                >
                  Confirm Delete
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="ghost"
                className="w-full text-destructive hover:bg-destructive/10 text-sm"
                onClick={() => setConfirmDelete(true)}
                data-ocid="appointment.delete_button"
              >
                Delete Appointment
              </Button>
            )
          )}
        </div>
      </div>
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
