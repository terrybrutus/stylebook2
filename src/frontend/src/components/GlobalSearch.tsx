import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useShallow } from "zustand/shallow";
import { formatDate, formatTime12 } from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type { Appointment } from "../types";

interface Props {
  onClose: () => void;
}

export function GlobalSearch({ onClose }: Props) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  const allAppointments = useAppStore(useShallow((s) => s.appointments));
  const navigate = useNavigate();
  const setPendingCalendarDate = useAppStore((s) => s.setPendingCalendarDate);

  const results = useMemo<Appointment[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return allAppointments
      .filter(
        (a) =>
          a.clientName.toLowerCase().includes(q) ||
          a.serviceName.toLowerCase().includes(q) ||
          a.date.includes(q) ||
          (a.notes ?? "").toLowerCase().includes(q),
      )
      .sort(
        (a, b) =>
          b.date.localeCompare(a.date) || a.startTime.localeCompare(b.startTime),
      )
      .slice(0, 30);
  }, [query, allAppointments]);

  function handleSelect(appt: Appointment) {
    setPendingCalendarDate(appt.date);
    navigate({ to: "/calendar/day" });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-background"
      data-ocid="search.modal"
    >
      {/* Search bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card flex-shrink-0">
        <Search size={18} className="text-muted-foreground flex-shrink-0" />
        <input
          // biome-ignore lint/a11y/noAutofocus: intentional — user tapped search
          autoFocus
          type="search"
          placeholder="Search clients, services, notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          data-ocid="search.input"
        />
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close search"
        >
          <X size={18} />
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        {query.trim() && results.length === 0 && (
          <p className="text-center text-muted-foreground py-16 text-sm">
            No results for &ldquo;{query}&rdquo;
          </p>
        )}

        {results.map((appt) => (
          <button
            key={appt.id}
            type="button"
            onClick={() => handleSelect(appt)}
            className="w-full px-4 py-3 border-b border-border flex items-center gap-3 text-left hover:bg-muted/40 active:bg-muted/70 transition-colors"
            data-ocid="search.result"
          >
            <div
              className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[36px]"
              style={{ backgroundColor: appt.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground">{appt.clientName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{appt.serviceName}</p>
              {appt.notes && (
                <p className="text-xs text-muted-foreground/70 mt-0.5 truncate italic">{appt.notes}</p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold text-foreground">
                {formatDate(appt.date, { month: "short", day: "numeric", year: "numeric" })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatTime12(appt.startTime)}
              </p>
              <p className="text-xs font-medium text-accent mt-0.5">${appt.price}</p>
            </div>
          </button>
        ))}

        {!query.trim() && (
          <div className="px-4 py-16 text-center">
            <Search size={32} className="text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Search across all appointments
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              by client name, service, or notes
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
