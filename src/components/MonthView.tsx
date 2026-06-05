import { useStore } from '../store';
import type { Appointment } from '../types';
import { dateStringFromDate, addDays, weekStart, MONTH_NAMES } from '../utils';

interface Props {
  month: Date; // any date in target month
  onDayClick: (date: Date) => void;
  onAppointmentClick: (appt: Appointment) => void;
}

export default function MonthView({ month, onDayClick, onAppointmentClick }: Props) {
  const { appointments, settings, services } = useStore((s) => ({
    appointments: s.appointments,
    settings: s.settings,
    services: s.services,
  }));

  const now = new Date();
  const todayStr = dateStringFromDate(now);

  // Build the grid
  const year = month.getFullYear();
  const monthIdx = month.getMonth();
  const firstOfMonth = new Date(year, monthIdx, 1);
  const firstCell = weekStart(firstOfMonth, settings.startWeekOnMonday);
  // Build 6 weeks
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    cells.push(addDays(firstCell, i));
  }

  // Header days
  const headerDays = settings.startWeekOnMonday
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Group cells into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < 6; i++) {
    weeks.push(cells.slice(i * 7, i * 7 + 7));
  }

  // Check if last week is all next month — trim to 5 weeks if so
  const lastWeek = weeks[5];
  const allNextMonth = lastWeek.every((d) => d.getMonth() !== monthIdx);
  const displayWeeks = allNextMonth ? weeks.slice(0, 5) : weeks;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Month/Year header */}
      <div className="text-center py-2 font-bold text-brand-dark dark:text-brand-light text-base">
        {MONTH_NAMES[monthIdx]} {year}
      </div>

      {/* Day header row */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-brand-mid flex-shrink-0">
        {headerDays.map((d) => (
          <div key={d} className="text-center py-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-7" style={{ gridAutoRows: '1fr' }}>
          {displayWeeks.flat().map((d) => {
            const ds = dateStringFromDate(d);
            const inMonth = d.getMonth() === monthIdx;
            const isToday = ds === todayStr;
            const dayAppts = appointments.filter((a) => a.date === ds);

            return (
              <div
                key={ds}
                onClick={() => onDayClick(d)}
                className={`border-b border-r border-gray-100 dark:border-brand-mid/30 min-h-16 p-0.5 cursor-pointer hover:bg-brand-teal/5 ${
                  !inMonth ? 'opacity-30' : ''
                }`}
              >
                <div
                  className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${
                    isToday
                      ? 'bg-brand-teal text-white'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {d.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayAppts.slice(0, 3).map((appt) => {
                    const svc = services.find((s) => s.id === appt.serviceId);
                    const color = svc?.color ?? '#00ADB5';
                    return (
                      <div
                        key={appt.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAppointmentClick(appt);
                        }}
                        className="text-white rounded px-1 truncate cursor-pointer"
                        style={{ backgroundColor: color, fontSize: '10px', lineHeight: '1.4' }}
                      >
                        {appt.clientName}
                      </div>
                    );
                  })}
                  {dayAppts.length > 3 && (
                    <div className="text-xs text-gray-400" style={{ fontSize: '10px' }}>
                      +{dayAppts.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
