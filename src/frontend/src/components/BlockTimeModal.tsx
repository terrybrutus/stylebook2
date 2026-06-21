import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import * as api from "../lib/api";
import {
  BLOCKED_TIME_SERVICE_ID,
  DEFAULT_BLOCKED_TIME_COLOR,
} from "../lib/appointmentLifecycle";
import { useAppStore } from "../store/useAppStore";

interface Props {
  isOpen: boolean;
  date: string;
  startTime?: string;
  onClose: () => void;
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function diffMinutes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export default function BlockTimeModal({
  isOpen,
  date,
  startTime = "12:00",
  onClose,
}: Props) {
  const addAppointment = useAppStore((s) => s.addAppointment);
  const blockedTimeColor = useAppStore(
    (s) => s.settings.blockedTimeColor ?? DEFAULT_BLOCKED_TIME_COLOR,
  );
  const [title, setTitle] = useState("Lunch");
  const [localDate, setLocalDate] = useState(date);
  const [start, setStart] = useState(startTime);
  const [end, setEnd] = useState(addMinutes(startTime, 60));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLocalDate(date);
    setStart(startTime);
    setEnd(addMinutes(startTime, 60));
    setTitle("Lunch");
    setNotes("");
  }, [date, isOpen, startTime]);

  if (!isOpen) return null;

  const durationMinutes = diffMinutes(start, end);
  const canSave = title.trim() && localDate && start && durationMinutes > 0;

  async function save() {
    if (!canSave) return;
    setSaving(true);
    try {
      const created = await api.createAppointment({
        clientName: title.trim(),
        serviceId: BLOCKED_TIME_SERVICE_ID,
        serviceName: "Blocked Time",
        date: localDate,
        startTime: start,
        durationMinutes,
        price: 0,
        phoneNumber: undefined,
        notes: notes.trim() || undefined,
        phases: [],
        color: blockedTimeColor,
        status: "scheduled",
        isBlockedTime: true,
        blockReason: title.trim(),
      });
      addAppointment(created);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-foreground/40 backdrop-blur-sm p-0 sm:p-4">
      <div className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-card shadow-2xl border border-border p-5">
        <h2 className="text-base font-semibold">Block time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Add unavailable time to the calendar. It appears brown and blocks
          appointment conflicts.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm font-medium">
            Reason
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="Lunch, doctor, out of salon"
            />
          </label>
          <label className="col-span-2 text-sm font-medium">
            Date
            <input
              type="date"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </label>
          <label className="text-sm font-medium">
            Start
            <input
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </label>
          <label className="text-sm font-medium">
            End
            <input
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </label>
          <label className="col-span-2 text-sm font-medium">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="Optional details"
            />
          </label>
        </div>

        {durationMinutes <= 0 && (
          <p className="mt-3 text-xs text-destructive">
            End time must be after start time.
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            className="flex-1"
            disabled={!canSave || saving}
            onClick={save}
          >
            Block time
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={saving}
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
