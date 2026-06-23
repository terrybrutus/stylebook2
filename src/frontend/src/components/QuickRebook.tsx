import { ChevronDown, Clock, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import {
  compareAppointmentDateTime,
  getCompletedAppointments,
  getPastUnresolvedAppointments,
  getUpcomingAppointments,
  isClientRecord,
} from "../lib/appointmentMetrics";
import { formatDate } from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type { Appointment } from "../types";

interface Client {
  name: string;
  lastService: string;
  lastServiceId: string;
  lastDate?: string;
  nextDate?: string;
  color: string;
}

interface Props {
  onRebook: (clientName: string, serviceId: string) => void;
  defaultCollapsed?: boolean;
}

const QUICK_REBOOK_COLLAPSED_KEY = "stylebook.quickRebookCollapsed.v2";

function getTodayString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function QuickRebook({
  onRebook,
  defaultCollapsed = true,
}: Props) {
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return defaultCollapsed;
    const stored = localStorage.getItem(QUICK_REBOOK_COLLAPSED_KEY);
    if (stored === null) return defaultCollapsed;
    return stored === "true";
  });

  useEffect(() => {
    localStorage.setItem(QUICK_REBOOK_COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  const clients = useMemo<Client[]>(() => {
    const today = getTodayString();
    const byClient = new Map<string, Appointment[]>();
    for (const appointment of appointments.filter(isClientRecord)) {
      const list = byClient.get(appointment.clientName) ?? [];
      list.push(appointment);
      byClient.set(appointment.clientName, list);
    }
    const rows: Client[] = [];
    for (const [name, appts] of byClient) {
      const completed = getCompletedAppointments(appts);
      const pastUnresolved = getPastUnresolvedAppointments(appts, today);
      const upcoming = getUpcomingAppointments(appts, today);
      const lastPast = [...completed, ...pastUnresolved].sort(
        compareAppointmentDateTime,
      )[completed.length + pastUnresolved.length - 1];
      const next = upcoming[0];
      const basis = lastPast ?? next;
      if (!basis) continue;
      rows.push({
        name,
        lastService: basis.serviceName,
        lastServiceId: basis.serviceId,
        color: basis.color,
        ...(lastPast ? { lastDate: lastPast.date } : {}),
        ...(next ? { nextDate: next.date } : {}),
      });
    }
    return rows.sort((a, b) => {
      if (a.nextDate && !b.nextDate) return 1;
      if (!a.nextDate && b.nextDate) return -1;
      return a.name.localeCompare(b.name);
    });
  }, [appointments]);

  if (clients.length === 0) return null;

  return (
    <div className="px-3 py-2" data-ocid="quick_rebook.section">
      <button
        type="button"
        onClick={() => setCollapsed((value) => !value)}
        className="flex items-center gap-2 w-full rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-muted/60"
        aria-expanded={!collapsed}
        data-ocid="quick_rebook.toggle"
      >
        <RotateCcw size={15} className="text-accent" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight">Quick Rebook</h3>
          <p className="text-[11px] text-muted-foreground leading-tight">
            Tap to {collapsed ? "show" : "hide"} recent clients
          </p>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {clients.length} client{clients.length !== 1 ? "s" : ""}
        </span>
        <ChevronDown
          size={15}
          className={`text-muted-foreground transition-transform ${collapsed ? "-rotate-90" : ""}`}
        />
      </button>
      {collapsed ? null : (
        <div className="mt-2 flex max-h-[min(42vh,420px)] flex-col gap-2 overflow-y-auto pr-1 pb-2">
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
                {client.nextDate && (
                  <p className="text-[10px] text-muted-foreground truncate">
                    Next booked{" "}
                    {formatDate(client.nextDate, {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                <Clock size={11} />
                <span>
                  {client.lastDate
                    ? formatDate(client.lastDate, {
                        month: "short",
                        day: "numeric",
                      })
                    : "Booked"}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
