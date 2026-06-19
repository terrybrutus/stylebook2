import type { Appointment, ClientContact, Service, Settings } from "../types";

export const STYLEBOOK_BACKUP_VERSION = 1;

export interface StyleBookBackupV1 {
  app: "StyleBook";
  version: typeof STYLEBOOK_BACKUP_VERSION;
  exportedAt: string;
  data: {
    appointments: Appointment[];
    services: Service[];
    settings: Settings;
    clientContacts: ClientContact[];
  };
}

export type StyleBookBackupData = StyleBookBackupV1["data"];

export interface CsvAppointmentRow {
  date: string;
  startTime: string;
  clientName: string;
  serviceName: string;
  durationMinutes: number;
  price: number;
  phone?: string;
  notes?: string;
}

export type ParsedBackupImport =
  | { kind: "full-json"; backup: StyleBookBackupV1 }
  | { kind: "legacy-csv"; appointments: CsvAppointmentRow[] };

const CSV_HEADER = [
  "Date",
  "Time",
  "Client",
  "Service",
  "Duration (min)",
  "Price",
  "Phone",
  "Notes",
];

function csvEscape(value: unknown): string {
  const raw = value == null ? "" : String(value);
  return /[",\n\r]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function buildAppointmentCSV(
  appointments: Appointment[],
  clientContacts: ClientContact[],
): string {
  const contactMap = new Map(clientContacts.map((c) => [c.name, c]));
  const rows = [...appointments]
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime),
    )
    .map((a) => {
      const contact = contactMap.get(a.clientName);
      return [
        a.date,
        a.startTime,
        a.clientName,
        a.serviceName,
        a.durationMinutes,
        a.price,
        contact?.phone ?? a.phoneNumber ?? "",
        contact?.notes ?? a.notes ?? "",
      ]
        .map(csvEscape)
        .join(",");
    });
  return [CSV_HEADER.join(","), ...rows].join("\n");
}

export function buildFullBackup(input: {
  appointments: Appointment[];
  services: Service[];
  settings: Settings;
  clientContacts: ClientContact[];
}): StyleBookBackupV1 {
  return {
    app: "StyleBook",
    version: STYLEBOOK_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      appointments: input.appointments,
      services: input.services,
      settings: input.settings,
      clientContacts: input.clientContacts,
    },
  };
}

export function buildClientContactsFromCsvRows(
  rows: CsvAppointmentRow[],
): ClientContact[] {
  const byName = new Map<string, ClientContact>();
  for (const row of rows) {
    const existing = byName.get(row.clientName);
    byName.set(row.clientName, {
      name: row.clientName,
      phone: existing?.phone ?? row.phone,
      notes: existing?.notes ?? row.notes,
    });
  }
  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function parseBackupImport(
  text: string,
  fileName = "",
): ParsedBackupImport {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Backup file is empty.");

  if (trimmed.startsWith("{") || fileName.toLowerCase().endsWith(".json")) {
    return { kind: "full-json", backup: parseFullBackup(trimmed) };
  }

  return { kind: "legacy-csv", appointments: parseAppointmentCSV(text) };
}

export function parseFullBackup(text: string): StyleBookBackupV1 {
  const parsed = JSON.parse(text) as Partial<StyleBookBackupV1>;
  if (
    parsed.app !== "StyleBook" ||
    parsed.version !== STYLEBOOK_BACKUP_VERSION
  ) {
    throw new Error("This is not a supported StyleBook backup file.");
  }
  if (!parsed.data) throw new Error("Backup file is missing data.");
  if (!Array.isArray(parsed.data.appointments)) {
    throw new Error("Backup file is missing appointments.");
  }
  if (!Array.isArray(parsed.data.services)) {
    throw new Error("Backup file is missing services.");
  }
  if (!parsed.data.settings)
    throw new Error("Backup file is missing settings.");
  if (!Array.isArray(parsed.data.clientContacts)) {
    throw new Error("Backup file is missing client contacts.");
  }
  return parsed as StyleBookBackupV1;
}

export function parseAppointmentCSV(text: string): CsvAppointmentRow[] {
  const table = parseCSVTable(text);
  if (table.length < 2) throw new Error("CSV contains no appointment rows.");

  const header = table[0].map((h) => h.trim());
  const missing = CSV_HEADER.filter((name) => !header.includes(name));
  if (missing.length > 0) {
    throw new Error(
      `CSV is missing required column(s): ${missing.join(", ")}.`,
    );
  }

  const index = new Map(header.map((name, i) => [name, i]));
  return table
    .slice(1)
    .filter((row) => row.some((cell) => cell.trim()))
    .map((row, rowIndex) => {
      const get = (name: string) => row[index.get(name) ?? -1]?.trim() ?? "";
      const duration = Number(get("Duration (min)"));
      const price = Number(get("Price"));
      const record: CsvAppointmentRow = {
        date: get("Date"),
        startTime: get("Time"),
        clientName: get("Client"),
        serviceName: get("Service"),
        durationMinutes: duration,
        price,
        phone: get("Phone") || undefined,
        notes: get("Notes") || undefined,
      };
      if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) {
        throw new Error(`CSV row ${rowIndex + 2} has an invalid date.`);
      }
      if (!/^\d{2}:\d{2}$/.test(record.startTime)) {
        throw new Error(`CSV row ${rowIndex + 2} has an invalid time.`);
      }
      if (!record.clientName) {
        throw new Error(`CSV row ${rowIndex + 2} is missing a client.`);
      }
      if (!record.serviceName) {
        throw new Error(`CSV row ${rowIndex + 2} is missing a service.`);
      }
      if (!Number.isFinite(duration) || duration <= 0) {
        throw new Error(`CSV row ${rowIndex + 2} has an invalid duration.`);
      }
      if (!Number.isFinite(price) || price < 0) {
        throw new Error(`CSV row ${rowIndex + 2} has an invalid price.`);
      }
      return record;
    });
}

function parseCSVTable(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((cellValue) => cellValue.trim()));
}
