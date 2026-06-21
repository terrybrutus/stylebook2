// Phase types
export type PhaseType = "active" | "processing";

export interface PhaseDef {
  name: string;
  durationMinutes: number;
  phaseType: PhaseType;
}

export interface PhaseInstance {
  name: string;
  durationMinutes: number;
  phaseType: PhaseType;
  startTime: string; // ISO datetime string
}

// Service types
export type ServiceCategory = "single" | "multi";

export interface Service {
  id: string;
  name: string;
  price: number;
  color: string; // hex color
  category: ServiceCategory;
  phases: PhaseDef[];
  totalDurationMinutes: number;
  finishingLabel?: string;
}

export interface ServiceInput {
  name: string;
  price: number;
  color: string;
  category: ServiceCategory;
  phases: PhaseDef[];
  totalDurationMinutes: number;
  finishingLabel?: string;
}

// Appointment types
export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "canceled"
  | "no_show"
  | "rescheduled";

export interface Appointment {
  id: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM 24h
  durationMinutes: number;
  price: number;
  phoneNumber?: string;
  notes?: string;
  phases: PhaseInstance[];
  color: string; // hex from service
  status?: AppointmentStatus;
  statusReason?: string;
  statusUpdatedAt?: string;
  isBlockedTime?: boolean;
  blockReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentInput {
  clientName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  price: number;
  phoneNumber?: string;
  notes?: string;
  phases: PhaseInstance[];
  color: string;
  status?: AppointmentStatus;
  statusReason?: string;
  statusUpdatedAt?: string;
  isBlockedTime?: boolean;
  blockReason?: string;
}

// Settings types
export interface WorkingDaySchedule {
  enabled: boolean;
  start: string; // HH:MM
  end: string; // HH:MM
  biweekly?: boolean; // if true, alternates every other week
  biweeklyRef?: string; // YYYY-MM-DD of a known ON week
}

export interface Settings {
  startWeekOnMonday: boolean;
  darkMode: boolean;
  mobileWeekLayout?: "three-day" | "full-week";
  calendarDensity?: "comfortable" | "compact" | "dense";
  blockedTimeColor?: string;
  workingHoursStart: string; // HH:MM
  workingHoursEnd: string; // HH:MM
  workingDays?: {
    sun: WorkingDaySchedule;
    mon: WorkingDaySchedule;
    tue: WorkingDaySchedule;
    wed: WorkingDaySchedule;
    thu: WorkingDaySchedule;
    fri: WorkingDaySchedule;
    sat: WorkingDaySchedule;
  };
}

// Calendar view types
export type CalendarView = "day" | "week" | "month" | "agenda";

// UI state types
export interface AppointmentModalState {
  isOpen: boolean;
  mode: "create" | "edit";
  appointment?: Appointment;
  prefillDate?: string;
  prefillTime?: string;
}

export interface Client {
  name: string;
  lastService?: string;
  lastServiceId?: string;
  lastDate?: string;
  appointmentCount: number;
  appointments: Appointment[];
  phone?: string;
  notes?: string;
}

export interface ClientContact {
  name: string;
  phone?: string;
  notes?: string;
}
