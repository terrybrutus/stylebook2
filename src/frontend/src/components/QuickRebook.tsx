import { ChevronDown, Clock, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import { isClientAppointment } from "../lib/appointmentLifecycle";
import { formatDate } from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type { Appointment } from "../types";

interface Client {
  name: string;
  lastService: string;
  lastServiceId: string;
  lastDate: string;
  color: string;
}

interface Props {
  onRebook: (clientName: string, serviceId: string) => void;
}

const QUICK_REBOOK_COLLAPSED_KEY = "stylebook.quickRebookCollapsed";

export default function QuickRebook({ onRebook }: Props) {
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(QUICK_REBOOK_COLLAPSED_KEY) === "true";
  });

  useEffect(() => {
    localStorage.setItem(QUICK_REBOOK_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  const clients = useMemo<Client[]>(() => {
    const map = new Map<string, Appointment>();
    // Sort newest first so we get the last appointment per client
    const sorted = appointments
      .filter((appointment) => isClientAppointment(appointment))
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) ||
          b.startTime.localeCompare(a.startTime),
      );
    for (const a of sorted) {
      if (!map.has(a.clientName)) map.set(a.clientName, a);
    }
    return Array.from(map.values()).map((a) => ({
      name: a.clientName,
      lastService: a.serviceName,
      lastServiceId: a.serviceId,
      lastDate: a.date,
      color: a.color,
    }));
  }, [appointments]);

  if (clients.length === 0) return null;

  return (
    <div className="px-4 pb-4" data-ocid="quick_rebook.section">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex items-center gap-2 mb-3 w-full text-left"
        aria-expanded={!collapsed}
        data-ocid="quick_rebook.toggle"
      >
        <RotateCcw size={15} className="text-accent" />
        <h3 className="text-sm font-semibold">Quick Rebook</h3>
        <span className="ml-auto text-xs text-muted-foreground">
          {clients.length} client{clients.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown
          size={15}
          className={`text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`}
        />
      </button>
      {collapsed ? null : (
        <div className="flex flex-col gap-2">
          {clients.map((client, i) => (
            <button
              type="button"
              key={client.name}
              onClick={() => onRebook(client.name, client.lastServiceId)}
              className="flex items-center gap-3 w-full text-left px-3 py-3 rounded-xl bg-card border border-border hover:border-accent/40 hover:bg-accent/5 transition-colors"
              data-ocid={`quick_rebook.item.${i + 1}`}
            >
              {/* Color dot */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: client.color }}
              >
                {client.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{client.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {client.lastService}
                </p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock size={11} />
                <span>
                  {formatDate(client.lastDate, {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
