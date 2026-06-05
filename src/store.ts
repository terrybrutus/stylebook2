import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Appointment, Service, Settings } from './types';

const DEFAULT_SERVICES: Service[] = [
  {
    id: 'svc-shampoo',
    name: 'Shampoo',
    price: 10,
    color: '#4A90D9',
    phases: [],
  },
  {
    id: 'svc-shampoo-style',
    name: 'Shampoo/Style',
    price: 28,
    color: '#7B68EE',
    phases: [],
  },
  {
    id: 'svc-shampoo-haircut',
    name: 'Shampoo/Haircut (no style)',
    price: 25,
    color: '#5C85D6',
    phases: [],
  },
  {
    id: 'svc-shampoo-haircut-style',
    name: 'Shampoo/Haircut/Style',
    price: 38,
    color: '#6A5ACD',
    phases: [],
  },
  {
    id: 'svc-mens-haircut',
    name: "Men's Haircut",
    price: 25,
    color: '#20B2AA',
    phases: [],
  },
  {
    id: 'svc-beard-trim',
    name: 'Beard Trim',
    price: 10,
    color: '#3CB371',
    phases: [],
  },
  {
    id: 'svc-perm',
    name: 'Perm',
    price: 65,
    color: '#E8834A',
    phases: [
      { id: 'perm-base', name: 'Base', duration: 45, type: 'active' },
      { id: 'perm-processing', name: 'Processing', duration: 30, type: 'processing' },
      { id: 'perm-finish', name: 'Finish', duration: 30, type: 'active' },
    ],
  },
  {
    id: 'svc-perm-style',
    name: 'Perm/Style',
    price: 75,
    color: '#D4734A',
    phases: [
      { id: 'permstyle-base', name: 'Base', duration: 45, type: 'active' },
      { id: 'permstyle-processing', name: 'Processing', duration: 30, type: 'processing' },
      { id: 'permstyle-style', name: 'Style', duration: 30, type: 'active' },
    ],
  },
  {
    id: 'svc-perm-haircut-style',
    name: 'Perm/Haircut/Style',
    price: 85,
    color: '#C4632A',
    phases: [
      { id: 'permhc-base', name: 'Base', duration: 45, type: 'active' },
      { id: 'permhc-processing', name: 'Processing', duration: 30, type: 'processing' },
      { id: 'permhc-hcstyle', name: 'Haircut/Style', duration: 30, type: 'active' },
    ],
  },
  {
    id: 'svc-color',
    name: 'Color',
    price: 60,
    color: '#C45AB3',
    phases: [
      { id: 'color-base', name: 'Base', duration: 30, type: 'active' },
      { id: 'color-processing', name: 'Processing', duration: 30, type: 'processing' },
      { id: 'color-finish', name: 'Finish', duration: 15, type: 'active' },
    ],
  },
  {
    id: 'svc-color-style',
    name: 'Color/Style',
    price: 70,
    color: '#B44AA3',
    phases: [
      { id: 'colorstyle-base', name: 'Base', duration: 30, type: 'active' },
      { id: 'colorstyle-processing', name: 'Processing', duration: 30, type: 'processing' },
      { id: 'colorstyle-style', name: 'Style', duration: 30, type: 'active' },
    ],
  },
  {
    id: 'svc-color-haircut-style',
    name: 'Color/Haircut/Style',
    price: 80,
    color: '#A43A93',
    phases: [
      { id: 'colorhc-base', name: 'Base', duration: 30, type: 'active' },
      { id: 'colorhc-processing', name: 'Processing', duration: 30, type: 'processing' },
      { id: 'colorhc-hcstyle', name: 'Haircut/Style', duration: 30, type: 'active' },
    ],
  },
  {
    id: 'svc-facial-waxing',
    name: 'Facial Waxing',
    price: 10,
    color: '#FF7F7F',
    phases: [],
  },
];

const DEFAULT_SETTINGS: Settings = {
  startWeekOnMonday: false,
  darkMode: false,
  workingHoursStart: 8 * 60, // 8:00 AM
  workingHoursEnd: 18 * 60,  // 6:00 PM
};

interface StoreState {
  appointments: Appointment[];
  appointmentHistory: Appointment[][];
  appointmentFuture: Appointment[][];
  services: Service[];
  settings: Settings;
  addAppointment: (appt: Appointment) => void;
  updateAppointment: (appt: Appointment) => void;
  deleteAppointment: (id: string) => void;
  undo: () => void;
  redo: () => void;
  addService: (svc: Service) => void;
  updateService: (svc: Service) => void;
  deleteService: (id: string) => void;
  updateSettings: (s: Partial<Settings>) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      appointments: [],
      appointmentHistory: [],
      appointmentFuture: [],
      services: DEFAULT_SERVICES,
      settings: DEFAULT_SETTINGS,
      addAppointment: (appt) =>
        set((state) => ({
          appointmentHistory: [...state.appointmentHistory, state.appointments],
          appointmentFuture: [],
          appointments: [...state.appointments, appt],
        })),
      updateAppointment: (appt) =>
        set((state) => ({
          appointmentHistory: [...state.appointmentHistory, state.appointments],
          appointmentFuture: [],
          appointments: state.appointments.map((a) => (a.id === appt.id ? appt : a)),
        })),
      deleteAppointment: (id) =>
        set((state) => ({
          appointmentHistory: [...state.appointmentHistory, state.appointments],
          appointmentFuture: [],
          appointments: state.appointments.filter((a) => a.id !== id),
        })),
      undo: () =>
        set((state) => {
          if (state.appointmentHistory.length === 0) return state;
          const prev = state.appointmentHistory[state.appointmentHistory.length - 1];
          return {
            appointmentHistory: state.appointmentHistory.slice(0, -1),
            appointmentFuture: [state.appointments, ...state.appointmentFuture],
            appointments: prev,
          };
        }),
      redo: () =>
        set((state) => {
          if (state.appointmentFuture.length === 0) return state;
          const next = state.appointmentFuture[0];
          return {
            appointmentHistory: [...state.appointmentHistory, state.appointments],
            appointmentFuture: state.appointmentFuture.slice(1),
            appointments: next,
          };
        }),
      addService: (svc) =>
        set((state) => ({ services: [...state.services, svc] })),
      updateService: (svc) =>
        set((state) => ({
          services: state.services.map((s) => (s.id === svc.id ? svc : s)),
        })),
      deleteService: (id) =>
        set((state) => ({
          services: state.services.filter((s) => s.id !== id),
        })),
      updateSettings: (s) =>
        set((state) => ({ settings: { ...state.settings, ...s } })),
    }),
    {
      name: 'stylebook-storage',
      partialize: (state) => ({
        appointments: state.appointments,
        services: state.services,
        settings: state.settings,
        // appointmentHistory and appointmentFuture are NOT persisted
      }),
    }
  )
);
