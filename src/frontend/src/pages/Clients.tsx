import {
  Calendar,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/shallow";
import * as api from "../lib/api";
import {
  formatDate,
  formatDuration,
  formatPrice,
  formatTime12,
} from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type { Appointment, Client, ClientContact } from "../types";

// ─── Add/Edit Client Form ─────────────────────────────────────────────────────

function capitalizeWords(s: string): string {
  return s.replace(/(^|\s)\S/g, (c) => c.toUpperCase());
}

function ClientForm({
  initial,
  onSave,
  onCancel,
  existingNames,
}: {
  initial?: ClientContact;
  onSave: (contact: ClientContact, oldName?: string) => void;
  onCancel: () => void;
  existingNames: string[];
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const isEdit = !!initial;

  const trimmedName = name.trim();
  const nameChanged = isEdit && trimmedName !== initial?.name;
  const nameConflict = trimmedName !== initial?.name && existingNames.includes(trimmedName);

  function handleNameChange(val: string) {
    setName(capitalizeWords(val));
  }

  function handleSave() {
    if (!trimmedName || nameConflict) return;
    onSave(
      { name: trimmedName, phone: phone.trim() || undefined, notes: notes.trim() || undefined },
      isEdit ? initial?.name : undefined,
    );
  }

  return (
    <div className="flex flex-col h-full" data-ocid="clients.form.page">
      <div className="px-4 pt-5 pb-4 border-b border-border bg-card flex items-center gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
          aria-label="Cancel"
        >
          <X size={18} />
        </button>
        <h1 className="text-lg font-semibold flex-1">{isEdit ? "Edit Client" : "New Client"}</h1>
        <button
          type="button"
          onClick={handleSave}
          disabled={!trimmedName || nameConflict}
          className="px-4 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-semibold disabled:opacity-40 transition-opacity"
          data-ocid="clients.form.save_button"
        >
          Save
        </button>
      </div>

      <div className="flex-1 overflow-auto px-4 py-4 flex flex-col gap-4">
        <div>
          <label htmlFor="client-name" className="text-sm font-medium block mb-1.5">
            Name *
          </label>
          <input
            id="client-name"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            autoCapitalize="words"
            placeholder="e.g. Sarah Jenkins"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
            data-ocid="clients.form.name_input"
          />
          {nameConflict && (
            <p className="text-xs text-destructive mt-1">A client with this name already exists.</p>
          )}
          {nameChanged && !nameConflict && (
            <p className="text-xs text-muted-foreground mt-1">Renaming will update all their appointments.</p>
          )}
        </div>

        <div>
          <label htmlFor="client-phone" className="text-sm font-medium block mb-1.5">
            Phone
          </label>
          <input
            id="client-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. (555) 123-4567"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
            data-ocid="clients.form.phone_input"
          />
        </div>

        <div>
          <label htmlFor="client-notes" className="text-sm font-medium block mb-1.5">
            Notes
          </label>
          <textarea
            id="client-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Allergies, preferences, etc."
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
            data-ocid="clients.form.notes_input"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Screen =
  | { type: "list" }
  | { type: "detail"; client: Client }
  | { type: "add" }
  | { type: "edit"; contact: ClientContact };

export default function Clients() {
  const appointments = useAppStore(useShallow((s) => s.appointments));
  const clientContacts = useAppStore(useShallow((s) => s.clientContacts));
  const addClientContact = useAppStore((s) => s.addClientContact);
  const updateClientContact = useAppStore((s) => s.updateClientContact);
  const deleteClientContact = useAppStore((s) => s.deleteClientContact);
  const deleteAppointments = useAppStore((s) => s.deleteAppointments);
  const updateAppointment = useAppStore((s) => s.updateAppointment);
  const renameClient = useAppStore((s) => s.renameClient);

  const [search, setSearch] = useState("");
  const [screen, setScreen] = useState<Screen>({ type: "list" });

  const clients = useMemo<Client[]>(() => {
    const map = new Map<string, Client>();

    // Seed standalone contacts first (may have 0 appointments)
    for (const c of clientContacts) {
      map.set(c.name, {
        name: c.name,
        appointmentCount: 0,
        appointments: [],
        phone: c.phone,
        notes: c.notes,
      });
    }

    // Merge in appointment-derived data
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
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [appointments, clientContacts]);

  const existingNames = clients.map((c) => c.name);

  const filtered = search
    ? clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    : clients;

  if (screen.type === "add") {
    return (
      <ClientForm
        existingNames={existingNames}
        onSave={(contact) => {
          addClientContact(contact);
          setScreen({ type: "list" });
        }}
        onCancel={() => setScreen({ type: "list" })}
      />
    );
  }

  if (screen.type === "edit") {
    return (
      <ClientForm
        initial={screen.contact}
        existingNames={existingNames}
        onSave={(contact, oldName) => {
          const prevName = oldName ?? screen.contact.name;
          const apptsToSync = useAppStore.getState().appointments.filter((a) => a.clientName === prevName);
          if (contact.name !== prevName) {
            // Rename: update all appointments and the contact record
            renameClient(prevName, contact.name);
            if (clientContacts.some((c) => c.name === contact.name)) {
              updateClientContact(contact.name, { phone: contact.phone, notes: contact.notes });
            } else {
              addClientContact(contact);
            }
            // Persist renamed/contact-synced appointments to ICP asynchronously
            for (const a of apptsToSync) {
              const updated = {
                ...a,
                clientName: contact.name,
                phoneNumber: contact.phone,
                notes: contact.notes,
                updatedAt: new Date().toISOString(),
              };
              updateAppointment(updated);
              api.updateAppointment(a.id, {
                clientName: contact.name,
                phoneNumber: contact.phone,
                notes: contact.notes,
              }).catch(console.error);
            }
          } else {
            if (clientContacts.some((c) => c.name === prevName)) {
              updateClientContact(prevName, { phone: contact.phone, notes: contact.notes });
            } else {
              addClientContact(contact);
            }
            for (const a of apptsToSync) {
              const updated = {
                ...a,
                phoneNumber: contact.phone,
                notes: contact.notes,
                updatedAt: new Date().toISOString(),
              };
              updateAppointment(updated);
              api.updateAppointment(a.id, {
                phoneNumber: contact.phone,
                notes: contact.notes,
              }).catch(console.error);
            }
          }
          setScreen({ type: "list" });
        }}
        onCancel={() => setScreen({ type: "list" })}
      />
    );
  }

  if (screen.type === "detail") {
    const contact = clientContacts.find((c) => c.name === screen.client.name);
    return (
      <ClientDetail
        client={screen.client}
        contact={contact}
        onBack={() => setScreen({ type: "list" })}
        onEdit={() => {
          setScreen({
            type: "edit",
            contact: contact ?? { name: screen.client.name, phone: screen.client.phone, notes: screen.client.notes },
          });
        }}
        onDelete={() => {
          const apptIds = screen.client.appointments.map((a) => a.id);
          deleteClientContact(screen.client.name);
          if (apptIds.length > 0) {
            deleteAppointments(apptIds);
            for (const id of apptIds) {
              api.deleteAppointment(id).catch(console.error);
            }
          }
          setScreen({ type: "list" });
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-full" data-ocid="clients.page">
      {/* Header */}
      <div className="px-4 pt-5 pb-3 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold">Clients</h1>
          <div className="flex items-center gap-2">
            {clients.length > 0 && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {clients.length} total
              </span>
            )}
            <button
              type="button"
              onClick={() => setScreen({ type: "add" })}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-xs font-semibold"
              data-ocid="clients.add_button"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
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
                : "Add clients manually or they appear automatically when you add appointments."}
            </p>
          </div>
        ) : (
          <div data-ocid="clients.list">
            {filtered.map((client, i) => (
              <ClientRow
                key={client.name}
                client={client}
                index={i + 1}
                onSelect={() => setScreen({ type: "detail", client })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Client Row ───────────────────────────────────────────────────────────────

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
  const initials = client.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const avatarColors = [
    "bg-[#e8f5e9] text-[#2e7d32]",
    "bg-[#e3f2fd] text-[#1565c0]",
    "bg-[#fce4ec] text-[#880e4f]",
    "bg-[#fff3e0] text-[#e65100]",
    "bg-[#f3e5f5] text-[#6a1b9a]",
    "bg-[#e0f7fa] text-[#006064]",
    "bg-[#fafafa] text-[#37474f]",
  ];
  const colorClass = avatarColors[client.name.charCodeAt(0) % avatarColors.length];

  return (
    <button
      type="button"
      onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-border bg-card hover:bg-muted/40 active:bg-muted/70 transition-colors text-left"
      data-ocid={`clients.item.${index}`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold ${colorClass}`}
      >
        {initials}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">{client.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {client.appointmentCount > 0
            ? `${client.appointmentCount} visit${client.appointmentCount !== 1 ? "s" : ""}${client.lastDate ? ` · Last ${formatDate(client.lastDate, { month: "short", day: "numeric" })}` : ""}`
            : client.phone
              ? client.phone
              : "No appointments yet"}
        </p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {totalSpent > 0 && (
          <span className="text-sm font-medium text-accent">${totalSpent}</span>
        )}
        <ChevronRight size={16} className="text-muted-foreground" />
      </div>
    </button>
  );
}

// ─── Client Detail ────────────────────────────────────────────────────────────

function ClientDetail({
  client,
  contact,
  onBack,
  onEdit,
  onDelete,
}: {
  client: Client;
  contact?: ClientContact;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })();
  const { upcoming, past } = useMemo(() => {
    const all = [...client.appointments].sort((a, b) => {
      const d = a.date.localeCompare(b.date);
      return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
    });
    return {
      upcoming: all.filter((a) => a.date >= todayStr),
      past: all.filter((a) => a.date < todayStr).reverse(),
    };
  }, [client.appointments, todayStr]);

  const totalSpent = client.appointments.reduce((sum, a) => sum + a.price, 0);
  const initials = client.name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const phone = contact?.phone ?? client.appointments.find((a) => a.phoneNumber)?.phoneNumber;
  const notes = contact?.notes ?? client.notes;

  return (
    <div className="flex flex-col h-full" data-ocid="clients.detail.page">
      <div className="px-4 pt-5 pb-4 border-b border-border bg-card">
        <div className="flex items-center gap-3 mb-4">
          <button
            type="button"
            onClick={onBack}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Back"
            data-ocid="clients.detail.close_button"
          >
            <X size={18} />
          </button>
          <h1 className="text-lg font-semibold flex-1 min-w-0 truncate">Client Profile</h1>
          <button
            type="button"
            onClick={onEdit}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Edit client"
            data-ocid="clients.detail.edit_button"
          >
            <Pencil size={16} />
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="px-2 py-1 text-xs rounded-lg border border-border hover:bg-muted"
              >
                Keep
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="px-2 py-1 text-xs rounded-lg bg-destructive text-destructive-foreground"
                data-ocid="clients.detail.confirm_delete_button"
              >
                Delete
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg hover:bg-muted transition-colors text-destructive"
              aria-label="Delete client"
              data-ocid="clients.detail.delete_button"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0">
            <span className="text-lg font-bold text-accent">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground truncate">{client.name}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {client.appointmentCount} appointment{client.appointmentCount !== 1 ? "s" : ""}
            </p>
            {phone && (
              <a
                href={`tel:${phone}`}
                className="flex items-center gap-1 text-sm text-accent mt-0.5"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone size={12} />
                {phone}
              </a>
            )}
          </div>
          {totalSpent > 0 && (
            <div className="text-right flex-shrink-0">
              <p className="text-lg font-bold text-accent">${totalSpent}</p>
              <p className="text-xs text-muted-foreground">total spent</p>
            </div>
          )}
        </div>

        {notes && (
          <div className="mt-3 p-2.5 rounded-lg bg-muted/50 text-xs text-muted-foreground leading-relaxed">
            {notes}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-4 py-3 flex flex-col gap-4">
        {upcoming.length === 0 && past.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Calendar size={28} className="text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No appointments yet</p>
          </div>
        ) : (
          <>
            {upcoming.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
                  Upcoming ({upcoming.length})
                </p>
                <div className="flex flex-col gap-3" data-ocid="clients.detail.upcoming_list">
                  {upcoming.map((appt, i) => (
                    <AppointmentHistoryCard key={appt.id} appt={appt} index={i + 1} upcoming />
                  ))}
                </div>
              </div>
            )}
            {past.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  History ({past.length})
                </p>
                <div className="flex flex-col gap-3" data-ocid="clients.detail.history_list">
                  {past.map((appt, i) => (
                    <AppointmentHistoryCard key={appt.id} appt={appt} index={i + 1} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Appointment History Card ─────────────────────────────────────────────────

function AppointmentHistoryCard({ appt, index, upcoming }: { appt: Appointment; index: number; upcoming?: boolean }) {
  return (
    <div
      className={`rounded-xl overflow-hidden ${upcoming ? "border-2" : "border border-border bg-card"}`}
      style={upcoming ? { borderColor: appt.color } : undefined}
      data-ocid={`clients.detail.item.${index}`}
    >
      <div
        className="px-3 py-2.5 flex items-center gap-2 bg-card"
        style={{ borderLeft: `4px solid ${appt.color}` }}
      >
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground truncate">{appt.serviceName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatDate(appt.date, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
            {" · "}
            {formatTime12(appt.startTime)}
          </p>
        </div>
        <span className="text-sm font-bold flex-shrink-0" style={{ color: appt.color }}>
          ${appt.price}
        </span>
      </div>

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
            <Phone size={12} />
            <span>{appt.phoneNumber}</span>
          </div>
        )}
      </div>

      {appt.notes && (
        <div className="px-3 py-2 border-t border-border/60">
          <div className="flex items-start gap-1.5">
            <FileText size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed break-words">{appt.notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}
