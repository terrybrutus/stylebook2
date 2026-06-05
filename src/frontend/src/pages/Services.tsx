import {
  AlertTriangle,
  Copy,
  Edit,
  Plus,
  Scissors,
  Trash2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { useShallow } from "zustand/shallow";
import { ServiceModal } from "../components/ServiceModal";
import { deleteService } from "../lib/api";
import { formatDuration, formatPrice } from "../lib/utils";
import { useAppStore } from "../store/useAppStore";
import type { Service } from "../types";

export default function Services() {
  const services = useAppStore(useShallow((s) => s.services));
  const deleteServiceStore = useAppStore((s) => s.deleteService);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openCreate = useCallback(() => {
    setEditingService(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((svc: Service) => {
    setEditingService(svc);
    setModalOpen(true);
  }, []);

  const openDuplicate = useCallback((svc: Service) => {
    // Clone with "Copy of" prefix, new modal in create mode with pre-filled data
    setEditingService({
      ...svc,
      id: "", // empty id signals create mode within modal
      name: `Copy of ${svc.name}`,
    });
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingService(null);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!confirmDeleteId) return;
    setDeleting(true);
    try {
      await deleteService(confirmDeleteId);
      deleteServiceStore(confirmDeleteId);
    } finally {
      setDeleting(false);
      setConfirmDeleteId(null);
    }
  }, [confirmDeleteId, deleteServiceStore]);

  // Resolve modal mode: if editingService has empty id, treat as create with pre-fill
  const modalService = editingService?.id ? editingService : null;
  // For duplicate: pass prefill name separately
  const isDuplicate = editingService !== null && !editingService.id;

  return (
    <div className="flex flex-col h-full" data-ocid="services.page">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-border bg-card">
        <div>
          <h1 className="text-xl font-semibold">Services</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {services.length} service{services.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors shadow-sm"
          data-ocid="services.add_button"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-4 py-4">
        {services.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center"
            data-ocid="services.empty_state"
          >
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
              <Scissors size={28} className="text-accent" />
            </div>
            <h2 className="text-lg font-semibold mb-1">No services yet</h2>
            <p className="text-sm text-muted-foreground mb-5">
              Add your first service to get started.
            </p>
            <button
              type="button"
              onClick={openCreate}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-xl text-sm font-semibold hover:bg-accent/90 transition-colors"
              data-ocid="services.empty_add_button"
            >
              <Plus size={16} /> Add Service
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2" data-ocid="services.list">
            {services.map((svc, i) => (
              <div
                key={svc.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card shadow-xs hover:shadow-sm transition-shadow"
                data-ocid={`services.item.${i + 1}`}
              >
                {/* Color bar */}
                <div
                  className="w-3 h-12 rounded-full flex-shrink-0"
                  style={{ backgroundColor: svc.color }}
                />
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{svc.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDuration(svc.totalDurationMinutes)}
                    <span className="mx-1">&bull;</span>
                    {formatPrice(svc.price)}
                  </p>
                  {svc.category === "multi" && (
                    <div className="flex items-center gap-1 mt-1">
                      <span className="px-1.5 py-0.5 bg-accent/10 text-accent rounded-md text-[10px] font-semibold uppercase tracking-wide">
                        Multi
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {svc.phases.length} phase
                        {svc.phases.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
                {/* Actions */}
                <div className="flex items-center gap-0.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => openDuplicate(svc)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Duplicate service"
                    data-ocid={`services.duplicate_button.${i + 1}`}
                  >
                    <Copy size={15} className="text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openEdit(svc)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    aria-label="Edit service"
                    data-ocid={`services.edit_button.${i + 1}`}
                  >
                    <Edit size={15} className="text-muted-foreground" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteId(svc.id)}
                    className="p-2 rounded-lg hover:bg-destructive/10 transition-colors"
                    aria-label="Delete service"
                    data-ocid={`services.delete_button.${i + 1}`}
                  >
                    <Trash2
                      size={15}
                      className="text-muted-foreground hover:text-destructive"
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service Modal (create / edit / duplicate) */}
      <ServiceModal
        open={modalOpen}
        service={isDuplicate ? editingService : modalService}
        onClose={handleModalClose}
      />

      {/* Delete Confirmation Dialog */}
      {confirmDeleteId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
          data-ocid="services.delete_dialog"
        >
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-destructive" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Delete Service?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This will permanently remove{" "}
                  <span className="font-medium text-foreground">
                    {services.find((s) => s.id === confirmDeleteId)?.name ??
                      "this service"}
                  </span>
                  . This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
                data-ocid="services.cancel_button"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-colors"
                data-ocid="services.confirm_button"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
