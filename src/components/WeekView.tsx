import { useRef, useEffect, useState } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import type { Appointment } from '../types';
import { formatTime, dateStringFromDate, addDays, weekStart, DAY_NAMES } from '../utils';

interface Props {
  weekDate: Date;
  onSlotClick: (date: string, time: number) => void;
  onAppointmentClick: (appt: Appointment) => void;
}

export default function WeekView({ weekDate, onSlotClick, onAppointmentClick }: Props) {
  const { appointments, settings, services } = useStore(useShallow((s) => ({
    appointments: s.appointments,
    settings: s.settings,
    services: s.services,
  })));

  const containerRef = useRef<HTMLDivElement>(null);

  const pixelsPerMinute = 1.5;
  const startHour = Math.floor(settings.workingHoursStart / 60);
  const endHour = Math.ceil(settings.workingHoursEnd / 60);
  const totalMinutes = (endHour - startHour) * 60;
  const gridHeight = totalMinutes * pixelsPerMinute;

  const now = new Date();
  const todayStr = dateStringFromDate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTop = (currentMinutes - settings.workingHoursStart) * pixelsPerMinute;

  // Detect mobile portrait: show 3 days
  const [isMobilePortrait, setIsMobilePortrait] = useState(false);
  useEffect(() => {
    const check = () => setIsMobilePortrait(window.innerWidth < 640 && window.innerHeight > window.innerWidth);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const numDays = isMobilePortrait ? 3 : 7;

  const wStart = weekStart(weekDate, settings.startWeekOnMonday);
  const days = Array.from({ length: numDays }, (_, i) => addDays(wStart, i));

  // For 3-day mobile, allow offset
  const [mobileOffset, setMobileOffset] = useState(0);
  const visibleDays = isMobilePortrait
    ? Array.from({ length: 3 }, (_, i) => addDays(wStart, mobileOffset + i))
    : days;

  useEffect(() => {
    if (containerRef.current) {
      const scrollTo = Math.max(0, currentTop - 100);
      containerRef.current.scrollTop = scrollTo;
    }
  }, [dateStringFromDate(weekDate)]); // eslint-disable-line react-hooks/exhaustive-deps

  const timeLabels: { mins: number; top: number; label: string }[] = [];
  for (let h = startHour; h <= endHour; h++) {
    const mins = h * 60;
    const top = (mins - settings.workingHoursStart) * pixelsPerMinute;
    timeLabels.push({ mins, top, label: formatTime(mins) });
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day headers */}
      <div className="flex flex-shrink-0 bg-white dark:bg-brand-dark border-b border-gray-200 dark:border-brand-mid">
        <div className="w-12 flex-shrink-0" />
        {visibleDays.map((d) => {
          const ds = dateStringFromDate(d);
          const isToday = ds === todayStr;
          return (
            <div
              key={ds}
              className={`flex-1 text-center py-2 text-xs font-medium ${
                isToday ? 'text-brand-teal' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              <div>{DAY_NAMES[d.getDay()]}</div>
              <div
                className={`text-base font-bold mx-auto w-7 h-7 flex items-center justify-center rounded-full ${
                  isToday ? 'bg-brand-teal text-white' : ''
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile swipe navigation */}
      {isMobilePortrait && (
        <div className="flex justify-between px-2 py-1 bg-gray-50 dark:bg-brand-mid text-xs flex-shrink-0">
          <button
            onClick={() => setMobileOffset((o) => o - 3)}
            disabled={mobileOffset <= 0}
            className="px-3 py-1 rounded bg-brand-teal text-white disabled:opacity-30"
          >
            ‹ Prev
          </button>
          <button
            onClick={() => setMobileOffset(0)}
            className="px-3 py-1 rounded bg-gray-200 dark:bg-brand-dark"
          >
            Reset
          </button>
          <button
            onClick={() => setMobileOffset((o) => o + 3)}
            disabled={mobileOffset + 3 >= 7}
            className="px-3 py-1 rounded bg-brand-teal text-white disabled:opacity-30"
          >
            Next ›
          </button>
        </div>
      )}

      {/* Scrollable time grid */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex" style={{ height: gridHeight }}>
          {/* Time labels */}
          <div className="w-12 flex-shrink-0 relative" style={{ height: gridHeight }}>
            {timeLabels.map(({ mins, top, label }) => (
              <div
                key={mins}
                className="absolute right-1 text-xs text-gray-400 dark:text-gray-500 select-none leading-none"
                style={{ top: top - 7 }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Columns */}
          {visibleDays.map((d) => {
            const ds = dateStringFromDate(d);
            const isToday = ds === todayStr;
            const colAppts = appointments.filter((a) => a.date === ds);

            return (
              <div
                key={ds}
                className="flex-1 relative border-l border-gray-200 dark:border-brand-mid/40 cursor-pointer"
                style={{ height: gridHeight }}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const mins = Math.floor(y / pixelsPerMinute) + settings.workingHoursStart;
                  const snapped = Math.round(mins / 15) * 15;
                  onSlotClick(ds, snapped);
                }}
              >
                {/* Grid lines - ALL columns */}
                {timeLabels.map(({ mins, top }) => (
                  <div
                    key={mins}
                    className="absolute left-0 right-0 border-t border-gray-200 dark:border-brand-mid/40 pointer-events-none"
                    style={{ top }}
                  />
                ))}
                {Array.from({ length: (endHour - startHour) * 2 }).map((_, i) => {
                  const mins = settings.workingHoursStart + i * 30;
                  if (mins % 60 === 0) return null;
                  const top = (mins - settings.workingHoursStart) * pixelsPerMinute;
                  return (
                    <div
                      key={`half-${i}`}
                      className="absolute left-0 right-0 border-t border-gray-100 dark:border-brand-mid/20 pointer-events-none"
                      style={{ top }}
                    />
                  );
                })}

                {/* Current time */}
                {isToday && currentMinutes >= settings.workingHoursStart && currentMinutes <= settings.workingHoursEnd && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none"
                    style={{ top: currentTop }}
                  >
                    <div className="h-0.5 bg-brand-teal w-full" />
                  </div>
                )}

                {/* Appointments */}
                {colAppts.map((appt) => {
                  const svc = services.find((s) => s.id === appt.serviceId);
                  const color = svc?.color ?? '#00ADB5';

                  if (appt.phases && appt.phases.length > 0) {
                    return appt.phases.map((ph) => {
                      const top = (ph.startTime - settings.workingHoursStart) * pixelsPerMinute;
                      const height = Math.max(ph.duration * pixelsPerMinute, 16);
                      const isProcessing = ph.type === 'processing';
                      return (
                        <div
                          key={`${appt.id}-${ph.phaseId}`}
                          className="absolute left-0.5 right-0.5 rounded overflow-hidden cursor-pointer z-10"
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
                          {height >= 24 && (
                            <div className="px-0.5 py-0.5 text-white text-xs leading-tight overflow-hidden h-full">
                              <div className="font-bold truncate" style={{ fontSize: '10px' }}>{appt.clientName}</div>
                            </div>
                          )}
                        </div>
                      );
                    });
                  }

                  const top = (appt.startTime - settings.workingHoursStart) * pixelsPerMinute;
                  const height = Math.max(appt.duration * pixelsPerMinute, 16);
                  return (
                    <div
                      key={appt.id}
                      className="absolute left-0.5 right-0.5 rounded overflow-hidden cursor-pointer z-10"
                      style={{ top, height, backgroundColor: color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(appt);
                      }}
                    >
                      <div className="px-0.5 py-0.5 text-white overflow-hidden h-full">
                        {height < 30 ? (
                          <div className="font-bold truncate" style={{ fontSize: '10px' }}>{appt.clientName}</div>
                        ) : (
                          <>
                            <div className="font-bold truncate" style={{ fontSize: '10px' }}>{appt.clientName}</div>
                            <div
                              style={{
                                fontSize: '9px',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word',
                                opacity: 0.85,
                                lineHeight: '1.2',
                              }}
                            >
                              {appt.serviceName}
                            </div>
                            {height >= 50 && (
                              <div style={{ fontSize: '9px', opacity: 0.7 }}>
                                {appt.duration}m · ${appt.price}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
