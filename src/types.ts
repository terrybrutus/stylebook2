export type ServicePhase = {
  id: string;
  name: string;
  duration: number; // minutes
  type: 'active' | 'processing';
};

export type Service = {
  id: string;
  name: string;
  price: number;
  color: string;
  phases: ServicePhase[]; // empty array = single-phase
};

export type AppointmentPhase = {
  phaseId: string;
  name: string;
  startTime: number; // minutes from midnight
  duration: number;
  type: 'active' | 'processing';
};

export type Appointment = {
  id: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  date: string; // YYYY-MM-DD
  startTime: number; // minutes from midnight
  duration: number; // total minutes
  price: number;
  phone?: string;
  notes?: string;
  phases: AppointmentPhase[]; // empty = single phase
};

export type Settings = {
  startWeekOnMonday: boolean;
  darkMode: boolean;
  workingHoursStart: number; // minutes from midnight
  workingHoursEnd: number;
};
