import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Appointment, ClientContact, Service, Settings } from "../types";

interface LoadingFlags {
  appointments: boolean;
  services: boolean;
  settings: boolean;
}

interface HistoryEntry {
  appointments: Appointment[];
  route: string;
}

interface AppState {
  // Data
  appointments: Appointment[];
  services: Service[];
  settings: Settings;
  clientContacts: ClientContact[];

  // Loading flags
  loading: LoadingFlags;

  // Current route (set by Layout on navigation)
  currentRoute: string;
  setCurrentRoute: (route: string) => void;

  // Undo/redo history (not persisted)
  appointmentHistory: HistoryEntry[];
  appointmentFuture: HistoryEntry[];
  pendingNavRoute: string | null;
  clearPendingNavRoute: () => void;
  undo: () => void;
  redo: () => void;

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

  // Actions — Client Contacts
  addClientContact: (contact: ClientContact) => void;
  updateClientContact: (name: string, patch: Partial<ClientContact>) => void;
  deleteClientContact: (name: string) => void;

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
      clientContacts: [],
      loading: { appointments: false, services: false, settings: false },
      currentRoute: "/",
      appointmentHistory: [],
      appointmentFuture: [],
      pendingNavRoute: null,

      setCurrentRoute: (route) => set({ currentRoute: route }),
      clearPendingNavRoute: () => set({ pendingNavRoute: null }),

      // Appointment actions
      setAppointments: (appointments) =>
        set({ appointments, appointmentHistory: [], appointmentFuture: [] }),
      addAppointment: (appointment) =>
        set((state) => ({
          appointmentHistory: [
            ...state.appointmentHistory.slice(-20),
            { appointments: state.appointments, route: state.currentRoute },
          ],
          appointmentFuture: [],
          appointments: [...state.appointments, appointment],
        })),
      updateAppointment: (appointment) =>
        set((state) => ({
          appointmentHistory: [
            ...state.appointmentHistory.slice(-20),
            { appointments: state.appointments, route: state.currentRoute },
          ],
          appointmentFuture: [],
          appointments: state.appointments.map((a) =>
            a.id === appointment.id ? appointment : a,
          ),
        })),
      deleteAppointment: (id) =>
        set((state) => ({
          appointmentHistory: [
            ...state.appointmentHistory.slice(-20),
            { appointments: state.appointments, route: state.currentRoute },
          ],
          appointmentFuture: [],
          appointments: state.appointments.filter((a) => a.id !== id),
        })),

      undo: () =>
        set((state) => {
          if (state.appointmentHistory.length === 0) return state;
          const entry = state.appointmentHistory[state.appointmentHistory.length - 1];
          return {
            appointmentHistory: state.appointmentHistory.slice(0, -1),
            appointmentFuture: [
              { appointments: state.appointments, route: state.currentRoute },
              ...state.appointmentFuture.slice(0, 19),
            ],
            appointments: entry.appointments,
            pendingNavRoute: entry.route,
          };
        }),
      redo: () =>
        set((state) => {
          if (state.appointmentFuture.length === 0) return state;
          const entry = state.appointmentFuture[0];
          return {
            appointmentHistory: [
              ...state.appointmentHistory.slice(-19),
              { appointments: state.appointments, route: state.currentRoute },
            ],
            appointmentFuture: state.appointmentFuture.slice(1),
            appointments: entry.appointments,
            pendingNavRoute: entry.route,
          };
        }),

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

      // Client contact actions
      addClientContact: (contact) =>
        set((state) => ({
          clientContacts: state.clientContacts.some((c) => c.name === contact.name)
            ? state.clientContacts
            : [...state.clientContacts, contact],
        })),
      updateClientContact: (name, patch) =>
        set((state) => ({
          clientContacts: state.clientContacts.map((c) =>
            c.name === name ? { ...c, ...patch } : c,
          ),
        })),
      deleteClientContact: (name) =>
        set((state) => ({
          clientContacts: state.clientContacts.filter((c) => c.name !== name),
        })),

      // Loading actions
      setLoading: (key, value) =>
        set((state) => ({ loading: { ...state.loading, [key]: value } })),
    }),
    {
      name: "stylebook-store",
      partialize: (state) => ({
        settings: state.settings,
        clientContacts: state.clientContacts,
      }),
    },
  ),
);
