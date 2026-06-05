import { useRef, useEffect } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import type { Appointment } from '../types';
import { formatTime, dateStringFromDate } from '../utils';

interface Props {
  date: Date;
  onSlotClick: (date: string, time: number) => void;
  onAppointmentClick: (appt: Appointment) => void;
}

export default function DayView({ date, onSlotClick, onAppointmentClick }: Props) {
  const { appointments, settings, services } = useStore(useShallow((s) => ({
    appointments: s.appointments,
    settings: s.settings,
    services: s.services,
  })));

  const dateStr = dateStringFromDate(date);
  const dayAppts = appointments
    .filter((a) => a.date === dateStr)
    .sort((a, b) => a.startTime - b.startTime);

  const startHour = Math.floor(settings.workingHoursStart / 60);
  const endHour = Math.ceil(settings.workingHoursEnd / 60);
  const totalMinutes = (endHour - startHour) * 60;
  const pixelsPerMinute = 1.5;
  const gridHeight = totalMinutes * pixelsPerMinute;

  const containerRef = useRef<HTMLDivElement>(null);
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = dateStr === todayStr;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTop = (currentMinutes - settings.workingHoursStart) * pixelsPerMinute;

  // Scroll to current time or first appointment on mount
  useEffect(() => {
    if (containerRef.current) {
      const scrollTo = isToday
        ? Math.max(0, currentTop - 100)
        : dayAppts.length
        ? Math.max(0, (dayAppts[0].startTime - settings.workingHoursStart) * pixelsPerMinute - 60)
        : 0;
      containerRef.current.scrollTop = scrollTo;
    }
  }, [dateStr]); // eslint-disable-line react-hooks/exhaustive-deps

  const timeLabels = [];
  for (let h = startHour; h <= endHour; h++) {
    const mins = h * 60;
    const top = (mins - settings.workingHoursStart) * pixelsPerMinute;
    timeLabels.push({ mins, top, label: formatTime(mins) });
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden" style={{ height: '100%' }}>
      <div className="flex" style={{ minHeight: gridHeight + 40 }}>
        {/* Time labels */}
        <div className="w-16 flex-shrink-0 relative" style={{ height: gridHeight }}>
          {timeLabels.map(({ mins, top, label }) => (
            <div
              key={mins}
              className="absolute right-2 text-xs text-gray-400 dark:text-gray-500 select-none"
              style={{ top: top - 8 }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Grid + appointments */}
        <div
          className="flex-1 relative cursor-pointer"
          style={{ height: gridHeight }}
          onClick={(e) => {
            const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
            const y = e.clientY - rect.top;
            const mins = Math.floor(y / pixelsPerMinute) + settings.workingHoursStart;
            const snapped = Math.round(mins / 15) * 15;
            onSlotClick(dateStr, snapped);
          }}
        >
          {/* Grid lines */}
          {timeLabels.map(({ mins, top }) => (
            <div
              key={mins}
              className="absolute left-0 right-0 border-t border-gray-200 dark:border-brand-mid/40 pointer-events-none"
              style={{ top }}
            />
          ))}
          {/* 30-min half-hour lines */}
          {Array.from({ length: (endHour - startHour) * 2 }).map((_, i) => {
            const mins = settings.workingHoursStart + i * 30;
            const top = (mins - settings.workingHoursStart) * pixelsPerMinute;
            if (mins % 60 === 0) return null;
            return (
              <div
                key={`half-${i}`}
                className="absolute left-0 right-0 border-t border-gray-100 dark:border-brand-mid/20 pointer-events-none"
                style={{ top }}
              />
            );
          })}

          {/* Current time indicator */}
          {isToday && currentMinutes >= settings.workingHoursStart && currentMinutes <= settings.workingHoursEnd && (
            <div
              className="absolute left-0 right-0 z-20 pointer-events-none"
              style={{ top: currentTop }}
            >
              <div className="relative">
                <div className="absolute -left-1 w-2 h-2 rounded-full bg-brand-teal top-[-4px]" />
                <div className="h-0.5 bg-brand-teal w-full" />
              </div>
            </div>
          )}

          {/* Appointment blocks */}
          {dayAppts.map((appt) => {
            const svc = services.find((s) => s.id === appt.serviceId);
            const color = svc?.color ?? '#00ADB5';

            if (appt.phases && appt.phases.length > 0) {
              return appt.phases.map((ph) => {
                const top = (ph.startTime - settings.workingHoursStart) * pixelsPerMinute;
                const height = Math.max(ph.duration * pixelsPerMinute, 20);
                const isProcessing = ph.type === 'processing';
                return (
                  <div
                    key={`${appt.id}-${ph.phaseId}`}
                    className="absolute left-1 right-1 rounded overflow-hidden cursor-pointer z-10"
                    style={{
                      top,
                      height,
                      backgroundColor: color,
                      opacity: isProcessing ? 0.55 : 1,
                      backgroundImage: isProcessing
                        ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0, rgba(255,255,255,0.15) 4px, transparent 4px, transparent 12px)'
                        : undefined,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAppointmentClick(appt);
                    }}
                  >
                    <div className="px-1 py-0.5 text-white text-xs overflow-hidden">
                      {height >= 30 ? (
                        <>
                          <div className="font-bold truncate">{appt.clientName}</div>
                          <div className="opacity-80 text-xs">{ph.name}</div>
                        </>
                      ) : (
                        <div className="font-bold truncate text-xs">{appt.clientName}</div>
                      )}
                    </div>
                  </div>
                );
              });
            }

            const top = (appt.startTime - settings.workingHoursStart) * pixelsPerMinute;
            const height = Math.max(appt.duration * pixelsPerMinute, 20);
            return (
              <div
                key={appt.id}
                className="absolute left-1 right-1 rounded overflow-hidden cursor-pointer z-10"
                style={{ top, height, backgroundColor: color }}
                onClick={(e) => {
                  e.stopPropagation();
                  onAppointmentClick(appt);
                }}
              >
                <div className="px-1 py-0.5 text-white overflow-hidden">
                  {height >= 30 ? (
                    <>
                      <div className="font-bold text-xs truncate">{appt.clientName}</div>
                      <div className="text-xs opacity-80" style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        {appt.serviceName}
                      </div>
                      {height >= 50 && (
                        <div className="text-xs opacity-70">{appt.duration}m · ${appt.price}</div>
                      )}
                    </>
                  ) : (
                    <div className="font-bold text-xs truncate">{appt.clientName}</div>
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
