import {
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Search,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  formatDate,
  formatDuration,
  formatPrice,
  formatTime12,
} from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type { Appointment, Client } from "../types";

export default function Clients() {
  const appointments = useAppStore((s) => s.appointments);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const clients = useMemo<Client[]>(() => {
    const map = new Map<string, Client>();
    for (const appt of appointments) {
      const name = appt.clientName;
      const existing = map.get(name);
      if (!existing) {
        map.set(name, {
          name,
          lastService: appt.serviceName,
          lastServiceId: appt.serviceId,
          lastDate: appt.date,
          appointmentCount: 1,
          appointments: [appt],
        });
      } else {
        existing.appointmentCount++;
        existing.appointments.push(appt);
        if (!existing.lastDate || appt.date > existing.lastDate) {
          existing.lastDate = appt.date;
          existing.lastService = appt.serviceName;
          existing.lastServiceId = appt.serviceId;
        }
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [appointments]);

  const filtered = search
    ? clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients;

  if (selectedClient) {
    return (
      <ClientDetail
        client={selectedClient}
        onBack={() => setSelectedClient(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" data-ocid="clients.page">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Clients</h1>
          {clients.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              {clients.length} total
            </span>
          )}
        </div>
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            type="search"
            placeholder="Search clients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-base rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
            data-ocid="clients.search_input"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center px-6"
            data-ocid="clients.empty_state"
          >
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Users size={28} className="text-muted-foreground/60" />
            </div>
            <h2 className="text-base font-semibold mb-1">
              {search ? "No clients found" : "No clients yet"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {search
                ? `No clients match "${search}"`
                : "Clients appear here automatically once you add appointments."}
            </p>
          </div>
        ) : (
          <div data-ocid="clients.list">
            {filtered.map((client, i) => (
              <ClientRow
                key={client.name}
                client={client}
                index={i + 1}
                onSelect={() => setSelectedClient(client)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientRow({
  client,
  index,
  onSelect,
}: {
  client: Client;
  index: number;
  onSelect: () => void;
}) {
  const totalSpent = client.appointments.reduce((sum, a) => sum + a.price, 0);
  // Get initials for avatar
  const initials = client.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  // Deterministic avatar color based on name
  const avatarColors = [
    "bg-[#e8f5e9] text-[#2e7d32]",
    "bg-[#e3f2fd] text-[#1565c0]",
    "bg-[#fce4ec] text-[#880e4f]",
    "bg-[#fff3e0] text-[#e65100]",
    "bg-[#f3e5f5] text-[#6a1b9a]",
    "bg-[#e0f7fa] text-[#006064]",
    "bg-[#fafafa] text-[#37474f]",
  ];
  const colorClass =
    avatarColors[client.name.charCodeAt(0) % avatarColors.length];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card hover:bg-muted/40 active:bg-muted/70 transition-colors text-left"
      data-ocid={`clients.item.${index}`}
    >
      {/* Avatar */}
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${colorClass}`}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{client.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {client.appointmentCount} visit
          {client.appointmentCount !== 1 ? "s" : ""}
          {client.lastDate
            ? ` · Last ${formatDate(client.lastDate, { month: "short", day: "numeric" })}`
            : ""}
        </p>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-sm font-medium text-accent">${totalSpent}</span>
        <ChevronRight size={16} className="text-muted-foreground" />
      </div>
    </button>
  );
}

function ClientDetail({
  client,
  onBack,
}: {
  client: Client;
  onBack: () => void;
}) {
  // Sort appointments newest first
  const sortedAppts = useMemo(
    () =>
      [...client.appointments].sort((a, b) => {
        const dateCompare = b.date.localeCompare(a.date);
        if (dateCompare !== 0) return dateCompare;
        return b.startTime.localeCompare(a.startTime);
      }),
    [client.appointments],
  );

  const totalSpent = client.appointments.reduce((sum, a) => sum + a.price, 0);
  const initials = client.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col h-full" data-ocid="clients.detail.page">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-border bg-card">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Back to clients"
            data-ocid="clients.detail.close_button"
          >
            <X size={18} className="text-foreground" />
          </button>
          <h1 className="text-lg font-semibold flex-1 min-w-0 truncate">
            Client History
          </h1>
        </div>

        {/* Client summary card */}
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-accent">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">
              {client.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.appointmentCount} appointment
              {client.appointmentCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-accent">${totalSpent}</p>
            <p className="text-xs text-muted-foreground">total spent</p>
          </div>
        </div>
      </div>

      {/* Appointment history */}
      <div className="flex-1 overflow-auto px-4 py-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Appointment History
        </p>
        <div className="flex flex-col gap-3" data-ocid="clients.detail.list">
          {sortedAppts.map((appt, i) => (
            <AppointmentHistoryCard key={appt.id} appt={appt} index={i + 1} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AppointmentHistoryCard({
  appt,
  index,
}: {
  appt: Appointment;
  index: number;
}) {
  return (
    <div
      className="rounded-xl border border-border bg-card overflow-hidden"
      data-ocid={`clients.detail.item.${index}`}
    >
      {/* Color strip + service header */}
      <div
        className="px-3 py-2.5 flex items-center gap-2"
        style={{ borderLeft: `4px solid ${appt.color}` }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">
            {appt.serviceName}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(appt.date, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            {" · "}
            {formatTime12(appt.startTime)}
          </p>
        </div>
        <span
          className="text-sm font-bold flex-shrink-0"
          style={{ color: appt.color }}
        >
          ${appt.price}
        </span>
      </div>

      {/* Details row */}
      <div className="px-3 py-2 bg-muted/30 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={12} />
          <span>{formatDuration(appt.durationMinutes)}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <DollarSign size={12} />
          <span>{formatPrice(appt.price)}</span>
        </div>
        {appt.phoneNumber && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar size={12} />
            <span>{appt.phoneNumber}</span>
          </div>
        )}
      </div>

      {/* Notes */}
      {appt.notes && (
        <div className="px-3 py-2 border-t border-border/60">
          <div className="flex items-start gap-1.5">
            <FileText
              size={12}
              className="text-muted-foreground mt-0.5 flex-shrink-0"
            />
            <p className="text-xs text-muted-foreground leading-relaxed break-words">
              {appt.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
