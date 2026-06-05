import { useState, useCallback } from 'react';
import { useStore } from '../store';
import type { Service, ServicePhase } from '../types';
import { generateId } from '../utils';

const PRESET_COLORS = [
  '#4A90D9', '#7B68EE', '#5C85D6', '#6A5ACD', '#20B2AA', '#3CB371',
  '#E8834A', '#D4734A', '#C4632A', '#C45AB3', '#B44AA3', '#A43A93',
  '#FF7F7F', '#00ADB5', '#F5A623', '#E74C3C', '#2ECC71', '#9B59B6',
];

interface ServiceModalProps {
  service?: Service;
  onClose: () => void;
  onSave: (svc: Service) => void;
}

function ServiceModal({ service, onClose, onSave }: ServiceModalProps) {
  const [name, setName] = useState(service?.name ?? '');
  const [price, setPrice] = useState<number>(service?.price ?? 0);
  const [color, setColor] = useState(service?.color ?? '#00ADB5');
  const [hexInput, setHexInput] = useState(service?.color ?? '#00ADB5');
  const [isMultiPhase, setIsMultiPhase] = useState((service?.phases?.length ?? 0) > 0);
  const [phases, setPhases] = useState<ServicePhase[]>(
    service?.phases?.length
      ? service.phases.map((p) => ({ ...p }))
      : [
          { id: generateId(), name: 'Phase 1', duration: 30, type: 'active' },
        ]
  );

  const handleColorPreset = (c: string) => {
    setColor(c);
    setHexInput(c);
  };

  const handleHexInput = (val: string) => {
    setHexInput(val);
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      setColor(val);
    }
  };

  const addPhase = () => {
    setPhases((prev) => [
      ...prev,
      { id: generateId(), name: `Phase ${prev.length + 1}`, duration: 30, type: 'active' },
    ]);
  };

  const removePhase = (idx: number) => {
    setPhases((prev) => prev.filter((_, i) => i !== idx));
  };

  const updatePhase = useCallback((idx: number, field: keyof ServicePhase, value: string | number) => {
    setPhases((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    );
  }, []);

  const handleSave = () => {
    if (!name.trim()) return;
    const svc: Service = {
      id: service?.id ?? generateId(),
      name: name.trim(),
      price,
      color,
      phases: isMultiPhase ? phases : [],
    };
    onSave(svc);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div
        className="bg-white dark:bg-brand-mid w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-brand-dark sticky top-0 bg-white dark:bg-brand-mid">
          <h2 className="text-lg font-bold text-brand-dark dark:text-brand-light">
            {service ? 'Edit Service' : 'New Service'}
          </h2>
          <button onClick={onClose} className="text-gray-500 text-xl leading-none">×</button>
        </div>

        <div className="px-4 py-3 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Service Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
              placeholder="e.g. Shampoo/Style"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Price ($)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              min="0"
              step="0.01"
              className="w-full border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-2 bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal"
            />
          </div>

          {/* Color */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">Color</label>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full border-2 border-white shadow flex-shrink-0" style={{ backgroundColor: color }} />
              <input
                type="text"
                value={hexInput}
                onChange={(e) => handleHexInput(e.target.value)}
                className="flex-1 border border-gray-300 dark:border-brand-dark rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-brand-dark dark:text-brand-light focus:outline-none focus:border-brand-teal font-mono"
                placeholder="#000000"
                maxLength={7}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => handleColorPreset(c)}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    color === c ? 'border-brand-teal scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Multi-phase toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm text-brand-dark dark:text-brand-light">Multi-phase service</div>
              <div className="text-xs text-gray-500">e.g. Perm, Color with processing time</div>
            </div>
            <button
              onClick={() => setIsMultiPhase(!isMultiPhase)}
              className={`relative w-12 h-6 rounded-full transition-colors ${isMultiPhase ? 'bg-brand-teal' : 'bg-gray-300 dark:bg-brand-dark'}`}
            >
              <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform shadow ${isMultiPhase ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Phase builder */}
          {isMultiPhase && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2">Phases</label>
              <div className="space-y-2">
                {phases.map((ph, idx) => (
                  <PhaseRow
                    key={ph.id}
                    phase={ph}
                    idx={idx}
                    onChange={updatePhase}
                    onRemove={removePhase}
                    canRemove={phases.length > 1}
                  />
                ))}
              </div>
              <button
                onClick={addPhase}
                className="mt-2 text-sm text-brand-teal font-medium flex items-center gap-1"
              >
                <span className="text-lg leading-none">+</span> Add Phase
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-brand-dark text-sm">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex-1 py-2 rounded-lg bg-brand-teal text-white font-semibold text-sm disabled:opacity-50"
            >
              Save Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface PhaseRowProps {
  phase: ServicePhase;
  idx: number;
  onChange: (idx: number, field: keyof ServicePhase, value: string | number) => void;
  onRemove: (idx: number) => void;
  canRemove: boolean;
}

function PhaseRow({ phase, idx, onChange, onRemove, canRemove }: PhaseRowProps) {
  const durationHours = Math.floor(phase.duration / 60);
  const durationMins = phase.duration % 60;

  return (
    <div className="bg-gray-50 dark:bg-brand-dark rounded-lg p-2 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={phase.name}
          onChange={(e) => onChange(idx, 'name', e.target.value)}
          className="flex-1 border border-gray-300 dark:border-brand-mid rounded-lg px-2 py-1.5 text-sm bg-white dark:bg-brand-mid dark:text-brand-light focus:outline-none focus:border-brand-teal"
          placeholder="Phase name"
        />
        {canRemove && (
          <button
            onClick={() => onRemove(idx)}
            className="text-red-400 hover:text-red-600 text-lg leading-none flex-shrink-0 w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <select
          value={phase.type}
          onChange={(e) => onChange(idx, 'type', e.target.value as 'active' | 'processing')}
          className="border border-gray-300 dark:border-brand-mid rounded px-1 py-1 text-xs bg-white dark:bg-brand-mid dark:text-brand-light focus:outline-none focus:border-brand-teal"
        >
          <option value="active">Active</option>
          <option value="processing">Processing</option>
        </select>
        <div className="flex items-center gap-1">
          <select
            value={durationHours}
            onChange={(e) => onChange(idx, 'duration', Number(e.target.value) * 60 + durationMins)}
            className="border border-gray-300 dark:border-brand-mid rounded px-1 py-1 text-xs bg-white dark:bg-brand-mid dark:text-brand-light focus:outline-none focus:border-brand-teal"
          >
            {Array.from({ length: 9 }, (_, i) => (
              <option key={i} value={i}>{i}h</option>
            ))}
          </select>
          <select
            value={durationMins}
            onChange={(e) => onChange(idx, 'duration', durationHours * 60 + Number(e.target.value))}
            className="border border-gray-300 dark:border-brand-mid rounded px-1 py-1 text-xs bg-white dark:bg-brand-mid dark:text-brand-light focus:outline-none focus:border-brand-teal"
          >
            {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map((m) => (
              <option key={m} value={m}>{m}m</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function ServicesView() {
  const { services, addService, updateService, deleteService } = useStore((s) => ({
    services: s.services,
    addService: s.addService,
    updateService: s.updateService,
    deleteService: s.deleteService,
  }));

  const [showModal, setShowModal] = useState(false);
  const [editService, setEditService] = useState<Service | undefined>(undefined);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = (svc: Service) => {
    if (editService) {
      updateService(svc);
    } else {
      addService(svc);
    }
  };

  const handleDuplicate = (svc: Service) => {
    const newSvc: Service = {
      ...svc,
      id: generateId(),
      name: `${svc.name} (copy)`,
      phases: svc.phases.map((p) => ({ ...p, id: generateId() })),
    };
    addService(newSvc);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-brand-dark dark:bg-brand-mid px-4 pt-4 pb-3 flex items-center justify-between flex-shrink-0">
        <h1 className="text-2xl font-bold text-white">Services</h1>
        <button
          onClick={() => { setEditService(undefined); setShowModal(true); }}
          className="bg-brand-teal text-white rounded-full w-9 h-9 flex items-center justify-center text-xl font-bold"
        >
          +
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {services.map((svc) => (
          <div key={svc.id} className="flex items-center px-4 py-3 border-b border-gray-100 dark:border-brand-mid/40">
            <div className="w-4 h-4 rounded-full flex-shrink-0 mr-3" style={{ backgroundColor: svc.color }} />
            <div className="flex-1 min-w-0">
              <div
                className="font-semibold text-brand-dark dark:text-brand-light"
                style={{ wordBreak: 'break-word', overflowWrap: 'break-word' }}
              >
                {svc.name}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                ${svc.price}
                {svc.phases.length > 0 && (
                  <span className="ml-1 text-brand-teal">
                    · {svc.phases.length} phases ({svc.phases.reduce((s, p) => s + p.duration, 0)}m)
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-1 ml-2 flex-shrink-0">
              <button
                onClick={() => { setEditService(svc); setShowModal(true); }}
                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-brand-dark text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              >
                Edit
              </button>
              <button
                onClick={() => handleDuplicate(svc)}
                className="text-xs px-2 py-1 rounded bg-gray-100 dark:bg-brand-dark text-gray-600 dark:text-gray-300 hover:bg-gray-200"
              >
                Dup
              </button>
              <button
                onClick={() => setDeleteId(svc.id)}
                className="text-xs px-2 py-1 rounded bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100"
              >
                Del
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-brand-mid rounded-2xl p-5 w-full max-w-sm">
            <h3 className="font-bold text-brand-dark dark:text-brand-light text-lg">Delete Service?</h3>
            <p className="text-sm text-gray-500 mt-1">
              "{services.find((s) => s.id === deleteId)?.name}" will be removed. Existing appointments will not be affected.
            </p>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2 rounded-lg border border-gray-300 dark:border-brand-dark text-sm"
              >
                Cancel
              </button>
              <button
                onClick={() => { deleteService(deleteId); setDeleteId(null); }}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ServiceModal
          service={editService}
          onClose={() => { setShowModal(false); setEditService(undefined); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
