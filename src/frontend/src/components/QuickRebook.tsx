import { Clock, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { useShallow } from "zustand/shallow";
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

export default function QuickRebook({ onRebook }: Props) {
  const appointments = useAppStore(useShallow((s) => s.appointments));

  const clients = useMemo<Client[]>(() => {
    const map = new Map<string, Appointment>();
    // Sort newest first so we get the last appointment per client
    const sorted = [...appointments].sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime),
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
      <div className="flex items-center gap-2 mb-3">
        <RotateCcw size={15} className="text-accent" />
        <h3 className="text-sm font-semibold">Quick Rebook</h3>
      </div>
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
    </div>
  );
}
