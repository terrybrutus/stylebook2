import { useState, useRef, useCallback } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import type { Appointment, AppointmentPhase, Service } from '../types';
import { generateId, todayString } from '../utils';

interface Props {
  appointment?: Appointment;
  initialDate?: string;
  initialTime?: number;
  onClose: () => void;
}

function buildPhasesFromService(svc: Service, startTime: number): AppointmentPhase[] {
  if (!svc.phases.length) return [];
  let t = startTime;
  return svc.phases.map((ph) => {
    const ap: AppointmentPhase = {
      phaseId: ph.id,
      name: ph.name,
      startTime: t,
      duration: ph.duration,
      type: ph.type,
    };
    t += ph.duration;
    return ap;
  });
}


export default function AppointmentModal({ appointment, initialDate, initialTime, onClose }: Props) {
  const { services, appointments, addAppointment, updateAppointment, deleteAppointment } = useStore(
    useShallow((s) => ({
      services: s.services,
      appointments: s.appointments,
      addAppointment: s.addAppointment,
      updateAppointment: s.updateAppointment,
      deleteAppointment: s.deleteAppointment,
    }))
  );

  const isEdit = !!appointment;

  const initService = appointment
    ? services.find((s) => s.id === appointment.serviceId) || services[0]
    : services[0];

  const [clientName, setClientName] = useState(appointment?.clientName ?? '');
  const [phone, setPhone] = useState(appointment?.phone ?? '');
  const [notes, setNotes] = useState(appointment?.notes ?? '');
  const [serviceId, setServiceId] = useState(appointment?.serviceId ?? initService?.id ?? '');
  const [date, setDate] = useState(appointment?.date ?? initialDate ?? todayString());
  const [startTime, setStartTime] = useState(appointment?.startTime ?? initialTime ?? 9 * 60);
  const [price, setPrice] = useState<number>(appointment?.price ?? initService?.price ?? 0);
  const [phases, setPhases] = useState<AppointmentPhase[]>(() => {
    if (appointment) return appointment.phases;
    const svc = initService;
    if (!svc) return [];
    return buildPhasesFromService(svc, (appointment as Appointment | undefined)?.startTime ?? initialTime ?? 9 * 60);
  });
  const [singleDuration, setSingleDuration] = useState<number>(() => {
    if (appointment && (!appointment.phases || appointment.phases.length === 0)) {
      return appointment.duration;
    }
    return 60;
  });

  const [showServiceBanner, setShowServiceBanner] = useState(false);
  const [pendingServiceId, setPendingServiceId] = useState<string | null>(null);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showRebook, setShowRebook] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const clientInputRef = useRef<HTMLInputElement>(null);

  const currentService = services.find((s) => s.id === serviceId);

  // Derived duration
  const duration = currentService?.phases.length
    ? phases.reduce((sum, p) => sum + p.duration, 0)
    : singleDuration;

  // Past clients for autocomplete — include last service info
  const clientLastApptMap: Record<string, Appointment> = {};
  for (const a of appointments) {
    if (!clientLastApptMap[a.clientName] || a.date > clientLastApptMap[a.clientName].date) {
      clientLastApptMap[a.clientName] = a;
    }
  }
  const pastClients = Object.keys(clientLastApptMap).filter(Boolean);

  const filteredClients = clientName
    ? pastClients.filter((c) => c.toLowerCase().includes(clientName.toLowerCase()) && c !== clientName)
    : [];

  const handleServiceChange = (newId: string) => {
    if (newId === serviceId) return;
    setPendingServiceId(newId);
    setShowServiceBanner(true);
  };

  const applyService = useCallback((svcId: string) => {
    const svc = services.find((s) => s.id === svcId);
    if (!svc) return;
    setServiceId(svcId);
    setPrice(svc.price);
    if (svc.phases.length) {
      setPhases(buildPhasesFromService(svc, startTime));
    } else {
      setPhases([]);
    }
  }, [services, startTime]);

  const handleBannerYes = () => {
    if (pendingServiceId) applyService(pendingServiceId);
    setShowServiceBanner(false);
    setPendingServiceId(null);
  };

  const handleBannerKeep = () => {
    setShowServiceBanner(false);
    setPendingServiceId(null);
  };

  const handlePhaseDurationChange = (idx: number, val: number) => {
    setPhases((prev) => {
      const updated = prev.map((p, i) => (i === idx ? { ...p, duration: val } : p));
      // Recalculate startTimes
      let t = startTime;
      return updated.map((p) => {
        const np = { ...p, startTime: t };
        t += p.duration;
        return np;
      });
    });
  };

  const handleSave = () => {
    if (!clientName.trim() || !serviceId) return;
    const svc = services.find((s) => s.id === serviceId);
    const appt: Appointment = {
      id: appointment?.id ?? generateId(),
      clientName: clientName.trim(),
      serviceId,
      serviceName: svc?.name ?? '',
      date,
      startTime,
      duration,
      price,
      phone: phone.trim() || undefined,
      notes: notes.trim() || undefined,
      phases: currentService?.phases.length ? phases : [],
    };
    if (isEdit) {
      updateAppointment(appt);
    } else {
      addAppointment(appt);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!appointment) return;
    deleteAppointment(appointment.id);
    onClose();
  };

  // Hours/minutes for time picker
  const startHour = Math.floor(startTime / 60);
  const startMin = startTime % 60;

  const durationHours = Math.floor(singleDuration / 60);
  const durationMins = singleDuration % 60;

  // Rebook: reuse clientLastApptMap computed above
  const clientLastAppt = clientLastApptMap;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-brand-mid w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-brand-dark sticky top-0 bg-white dark:bg-brand-mid">
          <h2 className="text-lg font-bold text-brand-dark dark:text-brand-light">
            {isEdit ? 'Edit Appointment' : 'New Appointment'}
          </h2>
          <div className="flex gap-2">
            {!isEdit && (
              <button
                onClick={() => setShowRebook(!showRebook)}
                className="text-xs px-2 py-1 rounded bg-brand-teal text-white"
              >
                Quick Rebook
              </button>
            )}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white text-xl leading-none">×</button>
          </div>
        </div>

        {/* Quick Rebook panel */}
        {showRebook && (
          <div className="bg-gray-50 dark:bg-brand-dark px-4 py-2 border-b border-gray-200 dark:border-brand-mid max-h-40 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-1">Tap to prefill from last visit</p>
            {Object.entries(clientLastAppt).map(([name, a]) => (
              <button
                key={name}
                onClick={() => {
                  setClientName(name);
                  setPhone(a.phone ?? '');
                  applyService(a.serviceId);
                  setShowRebook(false);
                }}
                className="w-full text-left text-sm py-1 px-2 rounded hover:bg-brand-teal/20"
              >
                <span className="font-medium">{name}</span>
                <span className="text-gray-500 ml-2">{a.serviceName}</span>
              </button>
            ))}
            {Object.keys(clientLastAppt).length === 0 && (
              <p className="text-sm text-gray-400">No past clients yet.</p>
            )}
          </div>
        )}

        <div className="px-4 py-3 space-y-3">
          {/* Client Name */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Client Name *</label>
            <input
              ref={clientInputRef}
              type="text"
              value={clientName}
              onChange={(e) => {
                setClientName(e.target.value);
                setShowAutocomplete(true);
              }}
              onBlur={() => setTimeout(() => setShowAutocomplete(false), 150)}
              className="w-full border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
              placeholder="Client name"
            />
            {showAutocomplete && filteredClients.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 bg-white dark:bg-brand-dark border border-gray-200 dark:border-brand-mid rounded-lg shadow-lg mt-1 max-h-40 overflow-y-auto">
                {filteredClients.map((c) => {
                  const lastAppt = clientLastApptMap[c];
                  const lastDate = lastAppt
                    ? new Date(lastAppt.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    : '';
                  return (
                    <li key={c}>
                      <button
                        onMouseDown={() => { setClientName(c); setShowAutocomplete(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-brand-teal/20"
                      >
                        <div className="font-semibold text-sm text-brand-dark dark:text-brand-light">{c}</div>
                        {lastAppt && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            Last: {lastAppt.serviceName} on {lastDate}
                          </div>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Service */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Service *</label>
            <select
              value={showServiceBanner && pendingServiceId ? pendingServiceId : serviceId}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Service update banner */}
          {showServiceBanner && (
            <div className="bg-brand-teal/10 border border-brand-teal rounded-lg px-3 py-2 flex items-center justify-between">
              <span className="text-sm text-brand-dark dark:text-brand-light">
                Update fields to match <strong>{services.find((s) => s.id === pendingServiceId)?.name}</strong>?
              </span>
              <div className="flex gap-2 ml-2">
                <button onClick={handleBannerYes} className="text-xs px-2 py-1 bg-brand-teal text-white rounded">Yes</button>
                <button onClick={handleBannerKeep} className="text-xs px-2 py-1 bg-gray-200 dark:bg-brand-dark rounded">Keep</button>
              </div>
            </div>
          )}

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Date *</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
            />
          </div>

          {/* Start Time */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Start Time</label>
            <div className="flex gap-2">
              <select
                value={startHour}
                onChange={(e) => setStartTime(Number(e.target.value) * 60 + startMin)}
                className="flex-1 border border-gray-300 dark:border-brand-dark rounded-lg px-2 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}</option>
                ))}
              </select>
              <select
                value={startMin}
                onChange={(e) => setStartTime(startHour * 60 + Number(e.target.value))}
                className="w-24 border border-gray-300 dark:border-brand-dark rounded-lg px-2 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
              >
                {[0, 15, 30, 45].map((m) => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Duration - single phase */}
          {(!currentService || !currentService.phases.length) && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Duration</label>
              <div className="flex gap-2">
                <select
                  value={durationHours}
                  onChange={(e) => setSingleDuration(Number(e.target.value) * 60 + durationMins)}
                  className="flex-1 border border-gray-300 dark:border-brand-dark rounded-lg px-2 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
                >
                  {Array.from({ length: 9 }, (_, i) => (
                    <option key={i} value={i}>{i}h</option>
                  ))}
                </select>
                <select
                  value={durationMins}
                  onChange={(e) => setSingleDuration(durationHours * 60 + Number(e.target.value))}
                  className="w-24 border border-gray-300 dark:border-brand-dark rounded-lg px-2 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
                >
                  {[0, 15, 30, 45].map((m) => (
                    <option key={m} value={m}>{m}m</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Multi-phase breakdown */}
          {currentService?.phases.length && phases.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Phase Breakdown</label>
              <div className="space-y-2">
                {phases.map((ph, idx) => (
                  <div key={ph.phaseId} className="flex items-center gap-2 bg-gray-50 dark:bg-brand-dark rounded-lg px-3 py-2">
                    <div
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${ph.type === 'processing' ? 'opacity-50' : ''}`}
                      style={{ backgroundColor: currentService.color }}
                    />
                    <span className="text-sm font-medium flex-1">{ph.name}</span>
                    <span className="text-xs text-gray-500">{ph.type}</span>
                    <select
                      value={ph.duration}
                      onChange={(e) => handlePhaseDurationChange(idx, Number(e.target.value))}
                      className="border border-gray-300 dark:border-brand-mid rounded px-1 py-1 text-xs bg-white dark:bg-brand-mid focus:outline-none focus:border-brand-teal"
                    >
                      {[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 75, 90, 105, 120].map((m) => (
                        <option key={m} value={m}>{m}m</option>
                      ))}
                    </select>
                  </div>
                ))}
                <div className="text-xs text-gray-500 text-right">Total: {duration}m</div>
              </div>
            </div>
          )}

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Price ($)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
              min="0"
              step="0.01"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
              placeholder="Optional"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal resize-none"
              placeholder="Optional notes"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {isEdit && !deleteConfirm && (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 text-sm font-medium"
              >
                Delete
              </button>
            )}
            {deleteConfirm && (
              <>
                <button onClick={handleDelete} className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium">
                  Confirm Delete
                </button>
                <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-brand-dark text-sm">
                  Cancel
                </button>
              </>
            )}
            {!deleteConfirm && (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-brand-dark text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!clientName.trim() || !serviceId}
                  className="flex-1 py-2 rounded-lg bg-brand-teal text-white font-semibold text-sm disabled:opacity-50"
                >
                  {isEdit ? 'Save Changes' : 'Book Appointment'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
