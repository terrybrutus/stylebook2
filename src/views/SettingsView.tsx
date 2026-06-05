import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import { formatTime } from '../utils';

export default function SettingsView() {
  const { settings, updateSettings } = useStore(useShallow((s) => ({
    settings: s.settings,
    updateSettings: s.updateSettings,
  })));

  // All hour options for a full range
  const allHours = Array.from({ length: 48 }, (_, i) => ({
    value: i * 30,
    label: formatTime(i * 30),
  }));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-brand-dark dark:bg-brand-mid px-4 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100 dark:divide-brand-mid/40">
          {/* Dark Mode */}
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <div className="font-semibold text-brand-dark dark:text-brand-light">Dark Mode</div>
              <div className="text-xs text-gray-500 mt-0.5">Switch to dark theme</div>
            </div>
            <button
              onClick={() => updateSettings({ darkMode: !settings.darkMode })}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.darkMode ? 'bg-brand-teal' : 'bg-gray-300'}`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform shadow ${
                  settings.darkMode ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Start Week on Monday */}
          <div className="flex items-center justify-between px-4 py-4">
            <div>
              <div className="font-semibold text-brand-dark dark:text-brand-light">Start Week on Monday</div>
              <div className="text-xs text-gray-500 mt-0.5">Calendar week starts on Monday</div>
            </div>
            <button
              onClick={() => updateSettings({ startWeekOnMonday: !settings.startWeekOnMonday })}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.startWeekOnMonday ? 'bg-brand-teal' : 'bg-gray-300'}`}
            >
              <div
                className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform shadow ${
                  settings.startWeekOnMonday ? 'translate-x-6' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Working Hours Start */}
          <div className="px-4 py-4">
            <div className="font-semibold text-brand-dark dark:text-brand-light mb-1">Working Hours Start</div>
            <div className="text-xs text-gray-500 mb-2">When your day begins on the calendar</div>
            <select
              value={settings.workingHoursStart}
              onChange={(e) => updateSettings({ workingHoursStart: Number(e.target.value) })}
              className="w-full border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
            >
              {allHours.slice(0, 32).map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>

          {/* Working Hours End */}
          <div className="px-4 py-4">
            <div className="font-semibold text-brand-dark dark:text-brand-light mb-1">Working Hours End</div>
            <div className="text-xs text-gray-500 mb-2">When your day ends on the calendar</div>
            <select
              value={settings.workingHoursEnd}
              onChange={(e) => updateSettings({ workingHoursEnd: Number(e.target.value) })}
              className="w-full border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
            >
              {allHours.slice(12).map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>

          {/* About */}
          <div className="px-4 py-4">
            <div className="font-semibold text-brand-dark dark:text-brand-light">StyleBook</div>
            <div className="text-xs text-gray-500 mt-1">Hairstylist appointment scheduling</div>
            <div className="text-xs text-gray-400 mt-0.5">v1.0.0 · PWA</div>
          </div>
        </div>
      </div>
    </div>
  );
}
