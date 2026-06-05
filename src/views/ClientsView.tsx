import { useState } from 'react';
import { useStore } from '../store';
import { useShallow } from 'zustand/react/shallow';
import type { Appointment } from '../types';
import { formatTime, formatDuration } from '../utils';
import AppointmentModal from '../components/AppointmentModal';

interface ClientInfo {
  name: string;
  phone?: string;
  appointments: Appointment[];
  totalSpent: number;
  lastVisit: string;
}

export default function ClientsView() {
  const { appointments, services } = useStore(useShallow((s) => ({
    appointments: s.appointments,
    services: s.services,
  })));
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [editAppt, setEditAppt] = useState<Appointment | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);

  // Build client map
  const clientMap: Record<string, ClientInfo> = {};
  for (const appt of appointments) {
    if (!clientMap[appt.clientName]) {
      clientMap[appt.clientName] = {
        name: appt.clientName,
        phone: appt.phone,
        appointments: [],
        totalSpent: 0,
        lastVisit: '',
      };
    }
    clientMap[appt.clientName].appointments.push(appt);
    clientMap[appt.clientName].totalSpent += appt.price;
    if (appt.date > clientMap[appt.clientName].lastVisit) {
      clientMap[appt.clientName].lastVisit = appt.date;
      if (appt.phone) clientMap[appt.clientName].phone = appt.phone;
    }
  }

  const clients = Object.values(clientMap)
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => b.lastVisit.localeCompare(a.lastVisit));

  const selectedClientInfo = selectedClient ? clientMap[selectedClient] : null;

  if (selectedClientInfo) {
    const sortedAppts = [...selectedClientInfo.appointments].sort((a, b) => b.date.localeCompare(a.date));
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="bg-brand-dark dark:bg-brand-mid px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button onClick={() => setSelectedClient(null)} className="text-brand-light text-lg font-bold">‹</button>
          <div>
            <h2 className="text-white font-bold text-lg">{selectedClientInfo.name}</h2>
            <p className="text-brand-light/60 text-xs">
              {sortedAppts.length} visit{sortedAppts.length !== 1 ? 's' : ''} · ${selectedClientInfo.totalSpent} total
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {sortedAppts.map((appt) => {
            const svc = services.find((s) => s.id === appt.serviceId);
            const color = svc?.color ?? '#00ADB5';
            return (
              <div
                key={appt.id}
                onClick={() => { setEditAppt(appt); setShowModal(true); }}
                className="flex items-stretch gap-3 bg-white dark:bg-brand-mid rounded-xl shadow-sm overflow-hidden cursor-pointer"
              >
                <div className="w-1.5 flex-shrink-0 rounded-l-xl" style={{ backgroundColor: color }} />
                <div className="flex-1 py-3 pr-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-brand-dark dark:text-brand-light">{appt.serviceName}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{appt.date} · {formatTime(appt.startTime)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-brand-dark dark:text-brand-light">${appt.price}</div>
                      <div className="text-xs text-gray-500">{formatDuration(appt.duration)}</div>
                    </div>
                  </div>
                  {appt.notes && (
                    <p className="text-xs text-gray-400 mt-1 italic">{appt.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {showModal && (
          <AppointmentModal
            appointment={editAppt}
            onClose={() => { setShowModal(false); setEditAppt(undefined); }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-brand-dark dark:bg-brand-mid px-4 pt-4 pb-3 flex-shrink-0">
        <h1 className="text-2xl font-bold text-white mb-2">Clients</h1>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients..."
          className="w-full rounded-lg px-3 py-2 bg-brand-mid dark:bg-brand-dark text-brand-light placeholder-brand-light/40 focus:outline-none focus:ring-1 focus:ring-brand-teal"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center pb-16">
            <div className="text-5xl mb-3">👤</div>
            <p className="text-gray-500 dark:text-gray-400">{search ? 'No clients found' : 'No clients yet'}</p>
            <p className="text-gray-400 text-sm mt-1">Clients appear automatically from appointments</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-brand-mid">
            {clients.map((c) => (
              <button
                key={c.name}
                onClick={() => setSelectedClient(c.name)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-brand-mid text-left"
              >
                <div>
                  <div className="font-semibold text-brand-dark dark:text-brand-light">{c.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {c.appointments.length} visit{c.appointments.length !== 1 ? 's' : ''} · Last: {c.lastVisit}
                  </div>
                  {c.phone && <div className="text-xs text-gray-400">{c.phone}</div>}
                </div>
                <div className="text-right flex-shrink-0 ml-2">
                  <div className="font-semibold text-brand-dark dark:text-brand-light">${c.totalSpent}</div>
                  <div className="text-xs text-gray-400 mt-0.5">›</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
