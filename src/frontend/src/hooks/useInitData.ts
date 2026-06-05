import { useEffect } from "react";
import * as api from "../lib/api";
import { useAppStore } from "../store/useAppStore";

/**
 * Module-level flag — survives component remounts.
 * Guarantees data is loaded exactly once per page session regardless of
 * how many times the RootLayout component mounts/unmounts.
 */
let _dataInitialized = false;

/**
 * Loads appointments, services, and settings from the backend/local storage
 * on app mount and populates the Zustand store.
 *
 * Safety rules that prevent React error #185:
 * 1. Empty deps array [] — effect runs once per mount, never loops.
 * 2. Module-level flag — if RootLayout remounts (e.g. hot reload), we still
 *    skip re-fetching instead of triggering another Zustand update cycle.
 * 3. Zustand setters are accessed inside the async callback via getState(),
 *    not captured as deps — avoids any setter-reference instability.
 */
export function useInitData() {
  useEffect(() => {
    if (_dataInitialized) return;
    _dataInitialized = true;

    async function loadAll() {
      // Load services first (needed for appointments)
      useAppStore.getState().setLoading("services", true);
      try {
        const services = await api.getServices();
        useAppStore.getState().setServices(services);
      } catch (err) {
        console.error("Failed to load services:", err);
      } finally {
        useAppStore.getState().setLoading("services", false);
      }

      // Load appointments
      useAppStore.getState().setLoading("appointments", true);
      try {
        const appointments = await api.getAppointments();
        useAppStore.getState().setAppointments(appointments);
      } catch (err) {
        console.error("Failed to load appointments:", err);
      } finally {
        useAppStore.getState().setLoading("appointments", false);
      }

      // Load settings
      useAppStore.getState().setLoading("settings", true);
      try {
        const settings = await api.getSettings();
        useAppStore.getState().setSettings(settings);
      } catch (err) {
        console.error("Failed to load settings:", err);
      } finally {
        useAppStore.getState().setLoading("settings", false);
      }
    }

    void loadAll();
  }, []);
}
