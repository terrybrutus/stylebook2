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

function getActor(): ActorInstance {
  if (!_actorInstance) {
    const canisterId = import.meta.env.VITE_CANISTER_ID_BACKEND as string;
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
): Appointment["phases"][0] {
  return {
    name: p.phaseLabel,
    durationMinutes: Number(p.durationMinutes),
    phaseType: mapPhaseType(p.phaseType),
    startTime: "",
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
  return {
    id: a.id,
    clientName: a.clientName,
    serviceId: a.serviceId,
    serviceName: svc?.name ?? "",
    date: a.date,
    startTime: a.startTime,
    durationMinutes: Number(a.durationMinutes),
    price: a.price,
    phoneNumber: a.phone,
    notes: a.notes,
    phases: (a.phases ?? []).map(mapBackendPhaseInstance),
    color: svc?.color ?? "#888888",
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
    return appts.map((a) => mapBackendAppointment(a, serviceMap));
  } catch {
    return loadJSON<Appointment[]>(KEYS.appointments, []);
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
    const all = loadJSON<Appointment[]>(KEYS.appointments, []);
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
    const all = loadJSON<Appointment[]>(KEYS.appointments, []);
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
    const all = loadJSON<Appointment[]>(KEYS.appointments, []);
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
    const result = await actor.createAppointment({
      clientName: input.clientName,
      serviceId: input.serviceId,
      date: input.date,
      startTime: input.startTime,
      durationMinutes: BigInt(input.durationMinutes),
      price: input.price,
      phone: input.phoneNumber,
      notes: input.notes,
      phases:
        input.phases.length > 0
          ? input.phases.map(toBackendPhaseInstance)
          : undefined,
    });
    return mapBackendAppointment(result, serviceMap);
  } catch {
    const all = loadJSON<Appointment[]>(KEYS.appointments, []);
    const now = new Date().toISOString();
    const appointment: Appointment = {
      ...input,
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
      notes: merged.notes,
      phases:
        merged.phases && merged.phases.length > 0
          ? merged.phases.map(toBackendPhaseInstance)
          : undefined,
    });
    if (!result) throw new Error(`Update failed for appointment ${id}`);
    return mapBackendAppointment(result, serviceMap);
  } catch {
    const all = loadJSON<Appointment[]>(KEYS.appointments, []);
    const idx = all.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error(`Appointment ${id} not found`);
    const updated: Appointment = {
      ...all[idx],
      ...input,
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
    if (services.length === 0) {
      await seedDefaultServices(actor);
      return DEFAULT_SERVICES;
    }
    return services.map(mapBackendService);
  } catch {
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
    await actor.createService({
      name: svc.name,
      isMultiPhase: svc.category === "multi",
      colorHex: svc.color,
      price: svc.price,
      finishingLabel: svc.finishingLabel,
      phases: svc.phases.map(toBackendPhaseDef),
    });
  }
}

export async function createService(input: ServiceInput): Promise<Service> {
  try {
    const actor = getActor();
    const result = await actor.createService({
      name: input.name,
      isMultiPhase: input.category === "multi",
      colorHex: input.color,
      price: input.price,
      finishingLabel: input.finishingLabel,
      phases: input.phases.map(toBackendPhaseDef),
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
    const result = await actor.updateService({
      id,
      name: merged.name,
      isMultiPhase: merged.category === "multi",
      colorHex: merged.color,
      price: merged.price,
      finishingLabel: merged.finishingLabel,
      phases: merged.phases.map(toBackendPhaseDef),
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
