import { useState } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import AppointmentModal from '../components/AppointmentModal';
import type { Appointment } from '../types';
import { formatTime, formatDuration, todayString, MONTH_NAMES } from '../utils';

type Tab = 'today' | 'calendar' | 'clients' | 'services' | 'settings';

interface Props {
  onNavigate: (tab: Tab) => void;
}

export default function TodayView({ onNavigate }: Props) {
  const { appointments, services } = useStore(useShallow((s) => ({
    appointments: s.appointments,
    services: s.services,
  })));
  const [showModal, setShowModal] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | undefined>(undefined);

  const today = todayString();
  const now = new Date();
  const todayAppts = appointments
    .filter((a) => a.date === today)
    .sort((a, b) => a.startTime - b.startTime);

  const dayName = now.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = MONTH_NAMES[now.getMonth()];
  const dateLabel = `${dayName}, ${monthName} ${now.getDate()}, ${now.getFullYear()}`;

  const totalRevenue = todayAppts.reduce((sum, a) => sum + a.price, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-brand-dark dark:bg-brand-mid px-4 pt-4 pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Today</h1>
            <p className="text-brand-light/70 text-sm">{dateLabel}</p>
          </div>
          <button
            onClick={() => { setEditAppt(undefined); setShowModal(true); }}
            className="bg-brand-teal text-white rounded-full w-10 h-10 flex items-center justify-center text-2xl font-bold shadow-md"
          >
            +
          </button>
        </div>
        {todayAppts.length > 0 && (
          <div className="flex gap-4 mt-2">
            <div className="text-xs text-brand-light/70">
              <span className="font-bold text-white text-base">{todayAppts.length}</span>{' '}
              appointment{todayAppts.length !== 1 ? 's' : ''}
            </div>
            <div className="text-xs text-brand-light/70">
              <span className="font-bold text-white text-base">${totalRevenue}</span> total
            </div>
          </div>
        )}
      </div>

      {/* Appointment list */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {todayAppts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-16">
            <div className="text-5xl mb-3">✂️</div>
            <p className="text-gray-500 dark:text-gray-400 text-base font-medium">No appointments today</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">Tap + to book one</p>
            <button
              onClick={() => onNavigate('calendar')}
              className="mt-4 px-4 py-2 bg-brand-teal text-white rounded-full text-sm font-medium"
            >
              View Calendar
            </button>
          </div>
        ) : (
          todayAppts.map((appt) => {
            const svc = services.find((s) => s.id === appt.serviceId);
            const color = svc?.color ?? '#00ADB5';
            return (
              <div
                key={appt.id}
                onClick={() => { setEditAppt(appt); setShowModal(true); }}
                className="flex items-stretch gap-3 bg-white dark:bg-brand-mid rounded-xl shadow-sm overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
              >
                {/* Color bar */}
                <div className="w-1.5 flex-shrink-0 rounded-l-xl" style={{ backgroundColor: color }} />
                <div className="flex-1 py-3 pr-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-bold text-brand-dark dark:text-brand-light">{appt.clientName}</div>
                      <div
                        className="text-sm text-gray-600 dark:text-gray-300 mt-0.5"
                        style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
                      >
                        {appt.serviceName}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <div className="font-semibold text-brand-dark dark:text-brand-light">${appt.price}</div>
                      <div className="text-xs text-gray-500">{formatDuration(appt.duration)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs font-medium text-brand-teal">{formatTime(appt.startTime)}</span>
                    <span className="text-xs text-gray-400">→</span>
                    <span className="text-xs text-gray-500">{formatTime(appt.startTime + appt.duration)}</span>
                    {appt.phone && (
                      <span className="text-xs text-gray-400 ml-1">📞 {appt.phone}</span>
                    )}
                  </div>
                  {appt.phases && appt.phases.length > 0 && (
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {appt.phases.map((ph) => (
                        <span
                          key={ph.phaseId}
                          className={`text-xs px-1.5 py-0.5 rounded-full text-white ${ph.type === 'processing' ? 'opacity-60' : ''}`}
                          style={{ backgroundColor: color }}
                        >
                          {ph.name} {ph.duration}m
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <AppointmentModal
          appointment={editAppt}
          initialDate={today}
          onClose={() => { setShowModal(false); setEditAppt(undefined); }}
        />
      )}
    </div>
  );
}
