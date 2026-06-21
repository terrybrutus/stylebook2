/**
 * API layer — wraps backend actor calls.
 * Maps between backend IDL types and frontend types.
 * Falls back to localStorage only if actor is unavailable.
 */
import { createActor } from "../backend";
import type {
  Appointment as BackendAppointment,
  PhaseDef as BackendPhaseDef,
  PhaseInstance as BackendPhaseInstance,
  PhaseType as BackendPhaseType,
  Service as BackendService,
} from "../backend";
import { PhaseType } from "../backend";
import type {
  Appointment,
  AppointmentInput,
  Service,
  ServiceInput,
  Settings,
} from "../types";
import {
  BLOCKED_TIME_SERVICE_ID,
  DEFAULT_BLOCKED_TIME_COLOR,
  buildAppointmentNotesWithMeta,
  splitAppointmentNotes,
} from "./appointmentLifecycle";
import { DEFAULT_SERVICES } from "./defaultServices";

// Local storage keys (fallback only)
const KEYS = {
  appointments: "stylebook_appointments",
  services: "stylebook_services",
  settings: "stylebook_settings",
} as const;

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function normalizeStoredAppointment(appointment: Appointment): Appointment {
  const notesMeta = splitAppointmentNotes(appointment.notes);
  return {
    ...appointment,
    notes: notesMeta.notes,
    status: appointment.status ?? notesMeta.status,
    statusReason: appointment.statusReason ?? notesMeta.statusReason,
    statusUpdatedAt: appointment.statusUpdatedAt ?? notesMeta.statusUpdatedAt,
    isBlockedTime: appointment.isBlockedTime ?? notesMeta.isBlockedTime,
    blockReason: appointment.blockReason ?? notesMeta.blockReason,
  };
}

// ─── Actor singleton ─────────────────────────────────────────────────────────

const noopUpload = async (
  _file: import("../backend").ExternalBlob,
): Promise<Uint8Array> => new Uint8Array();
const noopDownload = async (
  _file: Uint8Array,
): Promise<import("../backend").ExternalBlob> =>
  import("../backend").then(({ ExternalBlob }) =>
    ExternalBlob.fromBytes(new Uint8Array()),
  );

type ActorInstance = ReturnType<typeof createActor>;
let _actorInstance: ActorInstance | null = null;
let _canisterId: string | null = null;

/**
 * Called by useInitData before any API calls.
 * Caffeine sets backend_canister_id in /env.json at deploy time.
 */
export function initCanisterId(id: string): void {
  _canisterId = id;
  _actorInstance = null; // reset so next getActor() call uses the new ID
}

function getActor(): ActorInstance {
  if (!_actorInstance) {
    const canisterId =
      _canisterId ??
      (import.meta.env.CANISTER_BACKEND as string | undefined) ??
      (import.meta.env.VITE_CANISTER_ID_BACKEND as string | undefined);
    if (!canisterId || canisterId === "undefined") {
      throw new Error(
        "[StyleBook] CANISTER_BACKEND is not set — ICP unavailable",
      );
    }
    _actorInstance = createActor(canisterId, noopUpload, noopDownload);
  }
  return _actorInstance;
}

// ─── Type mappers: Backend → Frontend ────────────────────────────────────────

function mapPhaseType(pt: BackendPhaseType): "active" | "processing" {
  return pt === PhaseType.active ? "active" : "processing";
}

function mapBackendPhaseDef(p: BackendPhaseDef): Service["phases"][0] {
  return {
    name: p.phaseLabel,
    durationMinutes: Number(p.durationMinutes),
    phaseType: mapPhaseType(p.phaseType),
  };
}

function mapBackendPhaseInstance(
  p: BackendPhaseInstance,
  startTime: string,
): Appointment["phases"][0] {
  return {
    name: p.phaseLabel,
    durationMinutes: Number(p.durationMinutes),
    phaseType: mapPhaseType(p.phaseType),
    startTime,
  };
}

function mapBackendService(s: BackendService): Service {
  return {
    id: s.id,
    name: s.name,
    price: s.price,
    color: s.colorHex,
    category: s.isMultiPhase ? "multi" : "single",
    phases: s.phases.map(mapBackendPhaseDef),
    totalDurationMinutes: s.phases.reduce(
      (sum, p) => sum + Number(p.durationMinutes),
      0,
    ),
    finishingLabel: s.finishingLabel,
  };
}

function mapBackendAppointment(
  a: BackendAppointment,
  serviceMap: Map<string, Service>,
): Appointment {
  const svc = serviceMap.get(a.serviceId);
  const notesMeta = splitAppointmentNotes(a.notes);
  const isBlocked =
    notesMeta.isBlockedTime || a.serviceId === BLOCKED_TIME_SERVICE_ID;
  // Recompute phase start times from appointment start since backend doesn't store them
  const phases = a.phases ?? [];
  let cursor = (() => {
    const [h, m] = a.startTime.split(":").map(Number);
    return h * 60 + m;
  })();
  const mappedPhases = phases.map((p) => {
    const hh = String(Math.floor(cursor / 60)).padStart(2, "0");
    const mm = String(cursor % 60).padStart(2, "0");
    const inst = mapBackendPhaseInstance(p, `${hh}:${mm}`);
    cursor += Number(p.durationMinutes);
    return inst;
  });
  return {
    id: a.id,
    clientName: isBlocked
      ? (notesMeta.blockReason ?? a.clientName)
      : a.clientName,
    serviceId: a.serviceId,
    serviceName: isBlocked ? "Blocked Time" : (svc?.name ?? ""),
    date: a.date,
    startTime: a.startTime,
    durationMinutes: Number(a.durationMinutes),
    price: isBlocked ? 0 : a.price,
    phoneNumber: a.phone,
    notes: notesMeta.notes,
    phases: mappedPhases,
    color: isBlocked ? DEFAULT_BLOCKED_TIME_COLOR : (svc?.color ?? "#888888"),
    status: notesMeta.status,
    statusReason: notesMeta.statusReason,
    statusUpdatedAt: notesMeta.statusUpdatedAt,
    isBlockedTime: isBlocked,
    blockReason: notesMeta.blockReason,
    createdAt: "",
    updatedAt: "",
  };
}

// ─── Type mappers: Frontend → Backend ────────────────────────────────────────

function toBackendPhaseType(pt: "active" | "processing"): BackendPhaseType {
  return pt === "active" ? PhaseType.active : PhaseType.processing;
}

function toBackendPhaseInstance(
  p: Appointment["phases"][0],
): BackendPhaseInstance {
  return {
    phaseLabel: p.name,
    durationMinutes: BigInt(p.durationMinutes),
    phaseType: toBackendPhaseType(p.phaseType),
  };
}

function toBackendPhaseDef(p: Service["phases"][0]): BackendPhaseDef {
  return {
    phaseLabel: p.name,
    durationMinutes: BigInt(p.durationMinutes),
    phaseType: toBackendPhaseType(p.phaseType),
  };
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export async function getAppointments(): Promise<Appointment[]> {
  try {
    const actor = getActor();
    const services = await getServices();
    const serviceMap = new Map(services.map((s) => [s.id, s]));
    const appts = await actor.getAppointments();
    console.log(
      "[StyleBook] ICP getAppointments: success, count=",
      appts.length,
    );
    return appts.map((a) => mapBackendAppointment(a, serviceMap));
  } catch (err) {
    console.error(
      "[StyleBook] ICP getAppointments FAILED — falling back to localStorage:",
      err,
    );
    return loadJSON<Appointment[]>(KEYS.appointments, []).map(
      normalizeStoredAppointment,
    );
  }
}

export async function getAppointmentsByDateRange(
  startDate: string,
  endDate: string,
): Promise<Appointment[]> {
  try {
    const actor = getActor();
    const services = await getServices();
    const serviceMap = new Map(services.map((s) => [s.id, s]));
    const appts = await actor.getAppointmentsByDateRange(startDate, endDate);
    return appts.map((a) => mapBackendAppointment(a, serviceMap));
  } catch {
    const all = loadJSON<Appointment[]>(KEYS.appointments, []).map(
      normalizeStoredAppointment,
    );
    return all.filter((a) => a.date >= startDate && a.date <= endDate);
  }
}

export async function getAppointmentsByClient(
  clientName: string,
): Promise<Appointment[]> {
  try {
    const actor = getActor();
    const services = await getServices();
    const serviceMap = new Map(services.map((s) => [s.id, s]));
    const appts = await actor.getAppointmentsByClient(clientName);
    return appts.map((a) => mapBackendAppointment(a, serviceMap));
  } catch {
    const all = loadJSON<Appointment[]>(KEYS.appointments, []).map(
      normalizeStoredAppointment,
    );
    return all.filter((a) =>
      a.clientName.toLowerCase().includes(clientName.toLowerCase()),
    );
  }
}

export async function getClientNames(): Promise<string[]> {
  try {
    const actor = getActor();
    return await actor.getClientNames();
  } catch {
    const all = loadJSON<Appointment[]>(KEYS.appointments, []).map(
      normalizeStoredAppointment,
    );
    return [...new Set(all.map((a) => a.clientName))].sort();
  }
}

export async function createAppointment(
  input: AppointmentInput,
): Promise<Appointment> {
  try {
    const actor = getActor();
    const services = await getServices();
    const serviceMap = new Map(services.map((s) => [s.id, s]));
    console.log("[StyleBook] ICP createAppointment: attempting...");
    const result = await actor.createAppointment({
      clientName: input.clientName,
      serviceId: input.serviceId,
      date: input.date,
      startTime: input.startTime,
      durationMinutes: BigInt(input.durationMinutes),
      price: input.price,
      phone: input.phoneNumber,
      notes: buildAppointmentNotesWithMeta(input.notes, input),
      phases:
        input.phases.length > 0
          ? input.phases.map(toBackendPhaseInstance)
          : undefined,
    });
    console.log("[StyleBook] ICP createAppointment: success, id=", result.id);
    return mapBackendAppointment(result, serviceMap);
  } catch (err) {
    console.error(
      "[StyleBook] ICP createAppointment FAILED — falling back to localStorage:",
      err,
    );
    const all = loadJSON<Appointment[]>(KEYS.appointments, []).map(
      normalizeStoredAppointment,
    );
    const now = new Date().toISOString();
    const appointment: Appointment = {
      ...input,
      status: input.status ?? "scheduled",
      isBlockedTime: input.isBlockedTime,
      blockReason: input.blockReason,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };
    all.push(appointment);
    saveJSON(KEYS.appointments, all);
    return appointment;
  }
}

export async function updateAppointment(
  id: string,
  input: Partial<AppointmentInput>,
): Promise<Appointment> {
  try {
    const actor = getActor();
    const services = await getServices();
    const serviceMap = new Map(services.map((s) => [s.id, s]));
    const all = await getAppointments();
    const current = all.find((a) => a.id === id);
    if (!current) throw new Error(`Appointment ${id} not found`);
    const merged = { ...current, ...input };
    const result = await actor.updateAppointment({
      id,
      clientName: merged.clientName,
      serviceId: merged.serviceId,
      date: merged.date,
      startTime: merged.startTime,
      durationMinutes: BigInt(merged.durationMinutes),
      price: merged.price,
      phone: merged.phoneNumber,
      notes: buildAppointmentNotesWithMeta(merged.notes, merged),
      phases:
        merged.phases && merged.phases.length > 0
          ? merged.phases.map(toBackendPhaseInstance)
          : undefined,
    });
    if (!result) throw new Error(`Update failed for appointment ${id}`);
    return mapBackendAppointment(result, serviceMap);
  } catch {
    const all = loadJSON<Appointment[]>(KEYS.appointments, []).map(
      normalizeStoredAppointment,
    );
    const idx = all.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Appointment ${id} not found`);
    const updated: Appointment = {
      ...all[idx],
      ...input,
      status: input.status ?? all[idx].status ?? "scheduled",
      isBlockedTime: input.isBlockedTime ?? all[idx].isBlockedTime,
      blockReason: input.blockReason ?? all[idx].blockReason,
      updatedAt: new Date().toISOString(),
    };
    all[idx] = updated;
    saveJSON(KEYS.appointments, all);
    return updated;
  }
}

export async function deleteAppointment(id: string): Promise<void> {
  try {
    const actor = getActor();
    await actor.deleteAppointment(id);
  } catch {
    const all = loadJSON<Appointment[]>(KEYS.appointments, []);
    saveJSON(
      KEYS.appointments,
      all.filter((a) => a.id !== id),
    );
  }
}

// ─── Services ────────────────────────────────────────────────────────────────

export async function getServices(): Promise<Service[]> {
  try {
    const actor = getActor();
    const services = await actor.getServices();
    console.log(
      "[StyleBook] ICP getServices: success, count=",
      services.length,
    );
    if (services.length === 0) {
      await seedDefaultServices(actor);
      return DEFAULT_SERVICES;
    }
    return services.map(mapBackendService);
  } catch (err) {
    console.error(
      "[StyleBook] ICP getServices FAILED — falling back to localStorage:",
      err,
    );
    const stored = loadJSON<Service[] | null>(KEYS.services, null);
    if (!stored) {
      saveJSON(KEYS.services, DEFAULT_SERVICES);
      return DEFAULT_SERVICES;
    }
    return stored;
  }
}

async function seedDefaultServices(actor: ActorInstance): Promise<void> {
  for (const svc of DEFAULT_SERVICES) {
    const backendPhases =
      svc.category === "single"
        ? [
            {
              phaseLabel: svc.name,
              durationMinutes: BigInt(svc.totalDurationMinutes ?? 0),
              phaseType: toBackendPhaseType("active"),
            },
          ]
        : svc.phases.map(toBackendPhaseDef);
    await actor.createService({
      name: svc.name,
      isMultiPhase: svc.category === "multi",
      colorHex: svc.color,
      price: svc.price,
      finishingLabel: svc.finishingLabel,
      phases: backendPhases,
    });
  }
}

export async function createService(input: ServiceInput): Promise<Service> {
  try {
    const actor = getActor();
    // Single-phase services have no phase definitions — store a synthetic phase so ICP
    // can compute totalDurationMinutes (it sums phases; an empty array → 0).
    const backendPhases =
      input.category === "single"
        ? [
            {
              phaseLabel: input.name,
              durationMinutes: BigInt(input.totalDurationMinutes ?? 0),
              phaseType: toBackendPhaseType("active"),
            },
          ]
        : input.phases.map(toBackendPhaseDef);
    const result = await actor.createService({
      name: input.name,
      isMultiPhase: input.category === "multi",
      colorHex: input.color,
      price: input.price,
      finishingLabel: input.finishingLabel,
      phases: backendPhases,
    });
    return mapBackendService(result);
  } catch {
    const all = await getServices();
    const service: Service = {
      ...input,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
    all.push(service);
    saveJSON(KEYS.services, all);
    return service;
  }
}

export async function updateService(
  id: string,
  input: Partial<ServiceInput>,
): Promise<Service> {
  try {
    const actor = getActor();
    const services = await getServices();
    const current = services.find((s) => s.id === id);
    if (!current) throw new Error(`Service ${id} not found`);
    const merged = { ...current, ...input };
    const backendPhases =
      merged.category === "single"
        ? [
            {
              phaseLabel: merged.name,
              durationMinutes: BigInt(merged.totalDurationMinutes ?? 0),
              phaseType: toBackendPhaseType("active"),
            },
          ]
        : merged.phases.map(toBackendPhaseDef);
    const result = await actor.updateService({
      id,
      name: merged.name,
      isMultiPhase: merged.category === "multi",
      colorHex: merged.color,
      price: merged.price,
      finishingLabel: merged.finishingLabel,
      phases: backendPhases,
    });
    if (!result) throw new Error(`Update failed for service ${id}`);
    return mapBackendService(result);
  } catch {
    const all = await getServices();
    const idx = all.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Service ${id} not found`);
    const updated: Service = { ...all[idx], ...input };
    all[idx] = updated;
    saveJSON(KEYS.services, all);
    return updated;
  }
}

export async function deleteService(id: string): Promise<void> {
  try {
    const actor = getActor();
    await actor.deleteService(id);
  } catch {
    const all = await getServices();
    saveJSON(
      KEYS.services,
      all.filter((s) => s.id !== id),
    );
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: Settings = {
  startWeekOnMonday: true,
  darkMode: false,
  mobileWeekLayout: "three-day",
  calendarDensity: "compact",
  blockedTimeColor: DEFAULT_BLOCKED_TIME_COLOR,
  workingHoursStart: "08:00",
  workingHoursEnd: "19:00",
};

export async function getSettings(): Promise<Settings> {
  try {
    const actor = getActor();
    const snap = await actor.getSettings();
    const localDarkMode = loadJSON<Settings>(
      KEYS.settings,
      DEFAULT_SETTINGS,
    ).darkMode;
    return {
      startWeekOnMonday: snap.startWeekOnMonday,
      darkMode: localDarkMode,
      mobileWeekLayout:
        loadJSON<Settings>(KEYS.settings, DEFAULT_SETTINGS).mobileWeekLayout ??
        "three-day",
      blockedTimeColor:
        loadJSON<Settings>(KEYS.settings, DEFAULT_SETTINGS).blockedTimeColor ??
        DEFAULT_BLOCKED_TIME_COLOR,
      workingHoursStart: snap.workingHoursStart,
      workingHoursEnd: snap.workingHoursEnd,
    };
  } catch {
    return loadJSON<Settings>(KEYS.settings, DEFAULT_SETTINGS);
  }
}

export async function updateSettings(
  patch: Partial<Settings>,
): Promise<Settings> {
  const current = await getSettings();
  const updated = { ...current, ...patch };
  // darkMode is frontend-only, always persist locally
  saveJSON(KEYS.settings, updated);
  try {
    const actor = getActor();
    await actor.updateSettings({
      startWeekOnMonday: updated.startWeekOnMonday,
      workingHoursStart: updated.workingHoursStart,
      workingHoursEnd: updated.workingHoursEnd,
    });
  } catch {
    // Settings saved locally regardless
  }
  return updated;
}
