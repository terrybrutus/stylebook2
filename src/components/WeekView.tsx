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

// px per minute — enough for 30-min blocks to show name + service comfortably
const PPM = 2.5;
const MIN_BLOCK_HEIGHT = 28;

export default function WeekView({ weekDate, onSlotClick, onAppointmentClick }: Props) {
  const { appointments, settings, services } = useStore(useShallow((s) => ({
    appointments: s.appointments,
    settings: s.settings,
    services: s.services,
  })));

  const containerRef = useRef<HTMLDivElement>(null);

  const startMin = settings.workingHoursStart;
  const endMin   = settings.workingHoursEnd;
  const startHour = Math.floor(startMin / 60);
  const endHour   = Math.ceil(endMin / 60);
  const gridHeight = (endMin - startMin) * PPM;

  const now = new Date();
  const todayStr = dateStringFromDate(now);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentTop = (currentMinutes - startMin) * PPM;

  // Mobile portrait detection
  const [isMobilePortrait, setIsMobilePortrait] = useState(
    () => window.innerWidth < 640 && window.innerHeight > window.innerWidth
  );
  useEffect(() => {
    const check = () =>
      setIsMobilePortrait(window.innerWidth < 640 && window.innerHeight > window.innerWidth);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const [mobileOffset, setMobileOffset] = useState(0);

  const wStart = weekStart(weekDate, settings.startWeekOnMonday);
  const allDays = Array.from({ length: 7 }, (_, i) => addDays(wStart, i));
  const visibleDays = isMobilePortrait
    ? Array.from({ length: 3 }, (_, i) => addDays(wStart, mobileOffset + i))
    : allDays;

  // Scroll to current time on mount / week change
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = Math.max(0, currentTop - 120);
    }
  }, [dateStringFromDate(weekDate)]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hour and half-hour grid lines
  const hourLines: { top: number; isHour: boolean }[] = [];
  for (let h = startHour; h <= endHour; h++) {
    const m = h * 60;
    if (m >= startMin && m <= endMin) {
      hourLines.push({ top: (m - startMin) * PPM, isHour: true });
    }
    const half = h * 60 + 30;
    if (half > startMin && half < endMin) {
      hourLines.push({ top: (half - startMin) * PPM, isHour: false });
    }
  }

  const timeLabels: { top: number; label: string }[] = [];
  for (let h = startHour; h <= endHour; h++) {
    const m = h * 60;
    if (m >= startMin && m <= endMin) {
      timeLabels.push({ top: (m - startMin) * PPM, label: formatTime(m) });
    }
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header row */}
      <div className="flex flex-shrink-0 bg-white dark:bg-brand-dark border-b border-gray-200 dark:border-brand-mid">
        <div className="w-14 flex-shrink-0" />
        {visibleDays.map((d) => {
          const ds = dateStringFromDate(d);
          const isToday = ds === todayStr;
          return (
            <div
              key={ds}
              className={`flex-1 text-center py-2 text-xs font-medium select-none ${
                isToday ? 'text-brand-teal' : 'text-gray-500 dark:text-gray-300'
              }`}
            >
              <div className="uppercase tracking-wide">{DAY_NAMES[d.getDay()]}</div>
              <div
                className={`mx-auto mt-0.5 w-8 h-8 flex items-center justify-center rounded-full text-sm font-bold ${
                  isToday ? 'bg-brand-teal text-white' : 'text-gray-700 dark:text-gray-100'
                }`}
              >
                {d.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile prev/next */}
      {isMobilePortrait && (
        <div className="flex justify-between items-center px-3 py-1 bg-gray-50 dark:bg-brand-mid text-xs flex-shrink-0 border-b border-gray-200 dark:border-brand-mid">
          <button
            onClick={() => setMobileOffset((o) => Math.max(0, o - 3))}
            disabled={mobileOffset <= 0}
            className="px-3 py-1 rounded bg-brand-teal text-white disabled:opacity-30 font-medium"
          >
            ‹ Prev
          </button>
          <span className="text-gray-400 dark:text-gray-400">
            {formatTime(0)} — showing {visibleDays[0] ? visibleDays[0].getDate() : ''}–{visibleDays[2] ? visibleDays[2].getDate() : ''}
          </span>
          <button
            onClick={() => setMobileOffset((o) => Math.min(4, o + 3))}
            disabled={mobileOffset + 3 >= 7}
            className="px-3 py-1 rounded bg-brand-teal text-white disabled:opacity-30 font-medium"
          >
            Next ›
          </button>
        </div>
      )}

      {/* Scrollable grid */}
      <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex relative" style={{ height: gridHeight + 32 }}>

          {/* Time label column */}
          <div className="w-14 flex-shrink-0 relative select-none" style={{ height: gridHeight }}>
            {timeLabels.map(({ top, label }) => (
              <div
                key={label}
                className="absolute right-2 text-xs text-gray-400 dark:text-gray-500 leading-none"
                style={{ top: top - 7 }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {visibleDays.map((d) => {
            const ds = dateStringFromDate(d);
            const isToday = ds === todayStr;
            const colAppts = appointments.filter((a) => a.date === ds);

            return (
              <div
                key={ds}
                className="flex-1 relative border-l border-gray-200 dark:border-gray-700"
                style={{ height: gridHeight }}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const mins = Math.round((y / PPM + startMin) / 15) * 15;
                  onSlotClick(ds, mins);
                }}
              >
                {/* Grid lines */}
                {hourLines.map(({ top, isHour }, i) => (
                  <div
                    key={i}
                    className={`absolute left-0 right-0 pointer-events-none ${
                      isHour
                        ? 'border-t border-gray-200 dark:border-gray-700'
                        : 'border-t border-gray-100 dark:border-gray-800'
                    }`}
                    style={{ top }}
                  />
                ))}

                {/* Current time indicator — today only */}
                {isToday && currentMinutes >= startMin && currentMinutes <= endMin && (
                  <div
                    className="absolute left-0 right-0 z-20 pointer-events-none flex items-center"
                    style={{ top: currentTop }}
                  >
                    <div className="w-2 h-2 rounded-full bg-brand-teal flex-shrink-0 -ml-1" />
                    <div className="flex-1 h-0.5 bg-brand-teal" />
                  </div>
                )}

                {/* Appointment blocks */}
                {colAppts.map((appt) => {
                  const svc = services.find((s) => s.id === appt.serviceId);
                  const color = svc?.color ?? '#00ADB5';

                  // Multiphase: render each phase as its own block
                  if (appt.phases && appt.phases.length > 0) {
                    return appt.phases.map((ph) => {
                      const top = (ph.startTime - startMin) * PPM;
                      const height = Math.max(ph.duration * PPM, MIN_BLOCK_HEIGHT);
                      const isProcessing = ph.type === 'processing';

                      return (
                        <div
                          key={`${appt.id}-${ph.phaseId}`}
                          className="absolute left-0.5 right-0.5 rounded cursor-pointer overflow-hidden"
                          style={{
                            top,
                            height,
                            // Processing blocks sit below any active appointment in the same slot
                            zIndex: isProcessing ? 5 : 10,
                            backgroundColor: color,
                            opacity: isProcessing ? 0.45 : 1,
                            backgroundImage: isProcessing
                              ? 'repeating-linear-gradient(45deg, rgba(255,255,255,0.2) 0px, rgba(255,255,255,0.2) 5px, transparent 5px, transparent 14px)'
                              : undefined,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAppointmentClick(appt);
                          }}
                        >
                          <div className="px-1.5 py-1 text-white overflow-hidden h-full flex flex-col justify-start">
                            <div
                              className="font-bold leading-tight truncate"
                              style={{ fontSize: 11 }}
                            >
                              {appt.clientName}
                            </div>
                            {height >= 42 && (
                              <div
                                className="leading-tight opacity-90 mt-0.5"
                                style={{
                                  fontSize: 10,
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word',
                                }}
                              >
                                {isProcessing ? 'Processing' : ph.name}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  }

                  // Single-phase block
                  const top = (appt.startTime - startMin) * PPM;
                  const height = Math.max(appt.duration * PPM, MIN_BLOCK_HEIGHT);

                  return (
                    <div
                      key={appt.id}
                      className="absolute left-0.5 right-0.5 rounded cursor-pointer overflow-hidden"
                      style={{ top, height, zIndex: 10, backgroundColor: color }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAppointmentClick(appt);
                      }}
                    >
                      <div className="px-1.5 py-1 text-white overflow-hidden h-full flex flex-col justify-start">
                        <div
                          className="font-bold leading-tight truncate"
                          style={{ fontSize: 11 }}
                        >
                          {appt.clientName}
                        </div>
                        {height >= 42 && (
                          <div
                            className="leading-tight opacity-90 mt-0.5"
                            style={{
                              fontSize: 10,
                              wordBreak: 'break-word',
                              overflowWrap: 'break-word',
                            }}
                          >
                            {appt.serviceName}
                          </div>
                        )}
                        {height >= 62 && (
                          <div className="opacity-75 mt-0.5" style={{ fontSize: 10 }}>
                            {appt.duration}m · ${appt.price}
                          </div>
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
