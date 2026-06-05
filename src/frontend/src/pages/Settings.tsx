import { Calendar, Clock, Moon, Palette, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import * as api from "../lib/api";
import { useAppStore } from "../store/useAppStore";

// Format HH:MM to 12h display for the label preview
function formatTime12h(time: string): string {
  if (!time) return "";
  const [hStr, mStr] = time.split(":");
  const h = Number.parseInt(hStr, 10);
  const m = mStr ?? "00";
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

export default function Settings() {
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const { setTheme } = useTheme();

  async function toggleBool(key: "startWeekOnMonday" | "darkMode") {
    const newVal = !settings[key];
    updateSettings({ [key]: newVal });
    await api.updateSettings({ [key]: newVal });
    if (key === "darkMode") {
      setTheme(newVal ? "dark" : "light");
    }
  }

  async function handleTimeChange(
    key: "workingHoursStart" | "workingHoursEnd",
    value: string,
  ) {
    updateSettings({ [key]: value });
    await api.updateSettings({ [key]: value });
  }

  const workingRange = `${formatTime12h(settings.workingHoursStart)} – ${formatTime12h(settings.workingHoursEnd)}`;

  return (
    <div className="flex flex-col h-full" data-ocid="settings.page">
      {/* Page header */}
      <div className="px-4 pt-5 pb-4 border-b border-border bg-card">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Customize how StyleBook works for you
        </p>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-4 py-5 flex flex-col gap-5 max-w-xl mx-auto">
          {/* ── Calendar section ── */}
          <div>
            <SectionHeader icon={<Calendar size={15} />} title="Calendar" />
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <ToggleRow
                label="Start week on Monday"
                description="Applies to both Week and Month calendar views"
                checked={settings.startWeekOnMonday}
                onToggle={() => toggleBool("startWeekOnMonday")}
                ocid="settings.start_week_monday_toggle"
              />
            </div>
          </div>

          {/* ── Working hours section ── */}
          <div>
            <SectionHeader icon={<Clock size={15} />} title="Working Hours" />
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              {/* Visual range preview */}
              <div className="px-4 pt-3 pb-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Visible calendar range
                  </span>
                  <span className="text-xs font-semibold text-accent">
                    {workingRange}
                  </span>
                </div>
                {/* Range bar */}
                <div className="mt-2 mb-1 relative h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="absolute top-0 h-full rounded-full bg-accent/70"
                    style={{
                      left: `${(timeToMinutes(settings.workingHoursStart) / 1440) * 100}%`,
                      width: `${((timeToMinutes(settings.workingHoursEnd) - timeToMinutes(settings.workingHoursStart)) / 1440) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="border-t border-border">
                <TimeRow
                  id="start-time"
                  label="Start time"
                  value={settings.workingHoursStart}
                  onChange={(v) => handleTimeChange("workingHoursStart", v)}
                  ocid="settings.start_time_input"
                />
                <div className="border-t border-border/60" />
                <TimeRow
                  id="end-time"
                  label="End time"
                  value={settings.workingHoursEnd}
                  onChange={(v) => handleTimeChange("workingHoursEnd", v)}
                  ocid="settings.end_time_input"
                />
              </div>
            </div>
          </div>

          {/* ── Appearance section ── */}
          <div>
            <SectionHeader icon={<Palette size={15} />} title="Appearance" />
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => toggleBool("darkMode")}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
                data-ocid="settings.dark_mode_toggle"
                aria-pressed={settings.darkMode}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${
                      settings.darkMode
                        ? "bg-primary/10 text-foreground"
                        : "bg-accent/10 text-accent"
                    }`}
                  >
                    {settings.darkMode ? <Moon size={16} /> : <Sun size={16} />}
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-medium">Dark mode</p>
                    <p className="text-xs text-muted-foreground">
                      {settings.darkMode
                        ? "Currently dark theme"
                        : "Currently light theme"}
                    </p>
                  </div>
                </div>
                <Toggle checked={settings.darkMode} />
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="pt-2 pb-6 text-center">
            <p className="text-xs text-muted-foreground">
              &copy; {new Date().getFullYear()}. Built with love using{" "}
              <a
                href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                caffeine.ai
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function SectionHeader({
  icon,
  title,
}: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-1.5 px-1 mb-2">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
    </div>
  );
}

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  ocid: string;
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
  ocid,
}: ToggleRowProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 transition-colors"
      data-ocid={ocid}
      aria-pressed={checked}
    >
      <div className="text-left">
        <p className="text-sm font-medium">{label}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      <Toggle checked={checked} />
    </button>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <div
      className={`relative shrink-0 w-11 h-6 rounded-full transition-colors duration-200 ${
        checked ? "bg-accent" : "bg-muted"
      }`}
    >
      <span
        className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
          checked ? "translate-x-[22px]" : "translate-x-[3px]"
        }`}
      />
    </div>
  );
}

interface TimeRowProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  ocid: string;
}

function TimeRow({ id, label, value, onChange, ocid }: TimeRowProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <label htmlFor={id} className="text-sm font-medium cursor-pointer">
        {label}
      </label>
      <input
        id={id}
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-input rounded-lg px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors"
        style={{ fontSize: "16px", minWidth: "8.5rem" }}
        data-ocid={ocid}
      />
    </div>
  );
}
