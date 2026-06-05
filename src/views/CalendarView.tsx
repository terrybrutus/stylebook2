import { useState } from 'react';
import DayViewComponent from '../components/DayView';
import WeekViewComponent from '../components/WeekView';
import MonthViewComponent from '../components/MonthView';
import AppointmentModal from '../components/AppointmentModal';
import type { Appointment } from '../types';
import { addDays, dateStringFromDate, MONTH_NAMES } from '../utils';

type CalView = 'day' | 'week' | 'month';

export default function CalendarView() {
  const [view, setView] = useState<CalView>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showModal, setShowModal] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | undefined>(undefined);
  const [newApptDate, setNewApptDate] = useState<string | undefined>(undefined);
  const [newApptTime, setNewApptTime] = useState<number | undefined>(undefined);

  const handleSlotClick = (date: string, time: number) => {
    setEditAppt(undefined);
    setNewApptDate(date);
    setNewApptTime(time);
    setShowModal(true);
  };

  const handleAppointmentClick = (appt: Appointment) => {
    setEditAppt(appt);
    setNewApptDate(undefined);
    setNewApptTime(undefined);
    setShowModal(true);
  };

  const navigate = (dir: -1 | 1) => {
    setCurrentDate((prev) => {
      if (view === 'day') return addDays(prev, dir);
      if (view === 'week') return addDays(prev, dir * 7);
      // month
      const d = new Date(prev);
      d.setMonth(d.getMonth() + dir);
      return d;
    });
  };

  const goToday = () => setCurrentDate(new Date());

  const handleMonthDayClick = (date: Date) => {
    setCurrentDate(date);
    setView('day');
  };

  const getHeaderLabel = () => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    }
    if (view === 'week') {
      return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-brand-dark dark:bg-brand-mid flex-shrink-0 px-3 py-2">
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {(['day', 'week', 'month'] as CalView[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-colors ${
                  view === v ? 'bg-brand-teal text-white' : 'text-brand-light/70 hover:text-brand-light'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={goToday}
              className="text-xs text-brand-teal font-medium px-2 py-1 rounded"
            >
              Today
            </button>
            <button
              onClick={() => navigate(-1)}
              className="w-7 h-7 flex items-center justify-center text-brand-light rounded hover:bg-brand-mid"
            >
              ‹
            </button>
            <button
              onClick={() => navigate(1)}
              className="w-7 h-7 flex items-center justify-center text-brand-light rounded hover:bg-brand-mid"
            >
              ›
            </button>
            <button
              onClick={() => { setEditAppt(undefined); setNewApptDate(dateStringFromDate(currentDate)); setShowModal(true); }}
              className="bg-brand-teal text-white rounded-full w-7 h-7 flex items-center justify-center text-xl font-bold ml-1"
            >
              +
            </button>
          </div>
        </div>
        <div className="text-brand-light text-xs mt-1 font-medium">{getHeaderLabel()}</div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-hidden bg-white dark:bg-brand-dark">
        {view === 'day' && (
          <DayViewComponent
            date={currentDate}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
        {view === 'week' && (
          <WeekViewComponent
            weekDate={currentDate}
            onSlotClick={handleSlotClick}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
        {view === 'month' && (
          <MonthViewComponent
            month={currentDate}
            onDayClick={handleMonthDayClick}
            onAppointmentClick={handleAppointmentClick}
          />
        )}
      </div>

      {showModal && (
        <AppointmentModal
          appointment={editAppt}
          initialDate={newApptDate}
          initialTime={newApptTime}
          onClose={() => { setShowModal(false); setEditAppt(undefined); }}
        />
      )}
    </div>
  );
}
