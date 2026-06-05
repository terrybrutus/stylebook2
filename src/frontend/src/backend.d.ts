import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface UpdateServiceInput {
    id: Id;
    name: string;
    isMultiPhase: boolean;
    colorHex: string;
    price: number;
    finishingLabel?: string;
    phases: Array<PhaseDef>;
}
export type HHmm = string;
export interface Service {
    id: Id;
    name: string;
    isMultiPhase: boolean;
    colorHex: string;
    price: number;
    finishingLabel?: string;
    phases: Array<PhaseDef>;
}
export interface SettingsSnapshot {
    workingHoursEnd: HHmm;
    startWeekOnMonday: boolean;
    workingHoursStart: HHmm;
}
export interface PhaseInstance {
    phaseLabel: string;
    durationMinutes: bigint;
    phaseType: PhaseType;
}
export interface PhaseDef {
    phaseLabel: string;
    durationMinutes: bigint;
    phaseType: PhaseType;
}
export interface CreateServiceInput {
    name: string;
    isMultiPhase: boolean;
    colorHex: string;
    price: number;
    finishingLabel?: string;
    phases: Array<PhaseDef>;
}
export interface UpdateAppointmentInput {
    id: Id;
    startTime: HHmm;
    clientName: string;
    date: ISODate;
    durationMinutes: bigint;
    notes?: string;
    serviceId: Id;
    phone?: string;
    price: number;
    phases?: Array<PhaseInstance>;
}
export type ISODate = string;
export interface UpdateSettingsInput {
    workingHoursEnd: HHmm;
    startWeekOnMonday: boolean;
    workingHoursStart: HHmm;
}
export interface CreateAppointmentInput {
    startTime: HHmm;
    clientName: string;
    date: ISODate;
    durationMinutes: bigint;
    notes?: string;
    serviceId: Id;
    phone?: string;
    price: number;
    phases?: Array<PhaseInstance>;
}
export type Id = string;
export interface Appointment {
    id: Id;
    startTime: HHmm;
    clientName: string;
    date: ISODate;
    durationMinutes: bigint;
    notes?: string;
    serviceId: Id;
    phone?: string;
    price: number;
    phases?: Array<PhaseInstance>;
}
export enum PhaseType {
    active = "active",
    processing = "processing"
}
export interface backendInterface {
    createAppointment(input: CreateAppointmentInput): Promise<Appointment>;
    createService(input: CreateServiceInput): Promise<Service>;
    deleteAppointment(id: Id): Promise<boolean>;
    deleteService(id: Id): Promise<boolean>;
    getAppointment(id: Id): Promise<Appointment | null>;
    getAppointments(): Promise<Array<Appointment>>;
    getAppointmentsByClient(clientName: string): Promise<Array<Appointment>>;
    getAppointmentsByDateRange(startDate: ISODate, endDate: ISODate): Promise<Array<Appointment>>;
    getClientNames(): Promise<Array<string>>;
    getServices(): Promise<Array<Service>>;
    getSettings(): Promise<SettingsSnapshot>;
    updateAppointment(input: UpdateAppointmentInput): Promise<Appointment | null>;
    updateService(input: UpdateServiceInput): Promise<Service | null>;
    updateSettings(input: UpdateSettingsInput): Promise<void>;
}
