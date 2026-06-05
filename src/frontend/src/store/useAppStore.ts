import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Appointment, Service, Settings } from "../types";

interface LoadingFlags {
  appointments: boolean;
  services: boolean;
  settings: boolean;
}

interface AppState {
  // Data
  appointments: Appointment[];
  services: Service[];
  settings: Settings;

  // Loading flags
  loading: LoadingFlags;

  // Actions — Appointments
  setAppointments: (appointments: Appointment[]) => void;
  addAppointment: (appointment: Appointment) => void;
  updateAppointment: (appointment: Appointment) => void;
  deleteAppointment: (id: string) => void;

  // Actions — Services
  setServices: (services: Service[]) => void;
  addService: (service: Service) => void;
  updateService: (service: Service) => void;
  deleteService: (id: string) => void;

  // Actions — Settings
  setSettings: (settings: Settings) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  // Actions — Loading
  setLoading: (key: keyof LoadingFlags, value: boolean) => void;
}

const DEFAULT_SETTINGS: Settings = {
  startWeekOnMonday: true,
  darkMode: false,
  workingHoursStart: "08:00",
  workingHoursEnd: "19:00",
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      appointments: [],
      services: [],
      settings: DEFAULT_SETTINGS,
      loading: { appointments: false, services: false, settings: false },

      // Appointment actions
      setAppointments: (appointments) => set({ appointments }),
      addAppointment: (appointment) =>
        set((state) => ({
          appointments: [...state.appointments, appointment],
        })),
      updateAppointment: (appointment) =>
        set((state) => ({
          appointments: state.appointments.map((a) =>
            a.id === appointment.id ? appointment : a,
          ),
        })),
      deleteAppointment: (id) =>
        set((state) => ({
          appointments: state.appointments.filter((a) => a.id !== id),
        })),

      // Service actions
      setServices: (services) => set({ services }),
      addService: (service) =>
        set((state) => ({ services: [...state.services, service] })),
      updateService: (service) =>
        set((state) => ({
          services: state.services.map((s) =>
            s.id === service.id ? service : s,
          ),
        })),
      deleteService: (id) =>
        set((state) => ({
          services: state.services.filter((s) => s.id !== id),
        })),

      // Settings actions
      setSettings: (settings) => set({ settings }),
      updateSettings: (patch) =>
        set((state) => ({ settings: { ...state.settings, ...patch } })),

      // Loading actions
      setLoading: (key, value) =>
        set((state) => ({ loading: { ...state.loading, [key]: value } })),
    }),
    {
      name: "stylebook-store",
      partialize: (state) => ({
        settings: state.settings,
      }),
    },
  ),
);
