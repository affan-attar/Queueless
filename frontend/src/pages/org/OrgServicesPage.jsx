import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, Clock } from 'lucide-react'
import { servicesApi } from '../../api/services'
import ServiceFormModal from '../../components/ui/ServiceFormModal'
import ConfirmModal from '../../components/ui/ConfirmModal'

function toApiPayload(form) {
  return {
    name: form.name,
    specialization: form.specialization || null,
    average_service_minutes: form.avgServiceMinutes,
    is_active: form.active,
  }
}

function fromApiRow(row) {
  return {
    id: row.id,
    name: row.name,
    specialization: row.specialization || '',
    avgServiceMinutes: row.average_service_minutes,
    active: row.is_active,
  }
}

export default function OrgServicesPage() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [formOpen, setFormOpen] = useState(false)
  const [editingService, setEditingService] = useState(null)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await servicesApi.list()
        if (!cancelled) setServices(res.data.map(fromApiRow))
      } catch (err) {
        if (!cancelled) setLoadError(err.response?.data?.detail || 'Could not load services.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  function openAdd() {
    setEditingService(null)
    setFormError('')
    setFormOpen(true)
  }

  function openEdit(service) {
    setEditingService(service)
    setFormError('')
    setFormOpen(true)
  }

  async function handleSave(form) {
    setFormSaving(true)
    setFormError('')
    try {
      if (editingService) {
        const res = await servicesApi.update(editingService.id, toApiPayload(form))
        const updated = fromApiRow(res.data)
        setServices((prev) => prev.map((s) => (s.id === editingService.id ? updated : s)))
      } else {
        const res = await servicesApi.create(toApiPayload(form))
        const created = fromApiRow(res.data)
        setServices((prev) => [...prev, created])
      }
      setFormOpen(false)
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Could not save the service. Try again.')
    } finally {
      setFormSaving(false)
    }
  }

  async function toggleActive(service) {
    const prevServices = services
    setServices((prev) =>
      prev.map((s) => (s.id === service.id ? { ...s, active: !s.active } : s))
    )
    try {
      await servicesApi.update(service.id, { is_active: !service.active })
    } catch {
      setServices(prevServices) // revert on failure
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await servicesApi.remove(deleteTarget.id)
      setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch {
      // leave the confirm modal open so the user can retry
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">Services</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the services your organization offers.
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={16} /> Add service
        </button>
      </div>

      {loadError && (
        <p className="rounded-lg border border-signal-stop/30 bg-signal-stop/10 px-4 py-2 text-xs text-signal-stop">
          {loadError}
        </p>
      )}

      {loading ? (
        <div className="card p-12 text-center text-sm text-slate-500">Loading...</div>
      ) : services.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display font-semibold text-ink-900 dark:text-paper">No services yet</p>
          <p className="text-sm text-slate-500">Add your first service to start accepting customers.</p>
        </div>
      ) : (
        <div className="card divide-y divide-ink-900/10 dark:divide-paper/10">
          {services.map((service) => (
            <div key={service.id} className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display font-semibold text-ink-900 dark:text-paper">
                    {service.name}
                  </p>
                  <span
                    className={
                      service.active
                        ? 'rounded-full bg-signal-go/15 px-2 py-0.5 text-xs font-medium text-signal-go'
                        : 'rounded-full bg-slate-400/15 px-2 py-0.5 text-xs font-medium text-slate-400'
                    }
                  >
                    {service.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {service.specialization && (
                  <p className="mt-0.5 text-xs uppercase tracking-widest text-slate-400">
                    {service.specialization}
                  </p>
                )}
                <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-900/70 dark:text-paper/70">
                  <Clock size={13} className="text-slate-400" />
                  ~{service.avgServiceMinutes} min per customer
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleActive(service)}
                  className="btn-secondary text-xs"
                >
                  {service.active ? 'Deactivate' : 'Activate'}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(service)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-900/15 text-ink-900/70 transition hover:border-ink-900/30 hover:text-ink-900 dark:border-paper/15 dark:text-paper/70 dark:hover:text-paper"
                  aria-label={`Edit ${service.name}`}
                >
                  <Pencil size={15} />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(service)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink-900/15 text-slate-400 transition hover:border-signal-stop/40 hover:text-signal-stop dark:border-paper/15"
                  aria-label={`Delete ${service.name}`}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ServiceFormModal
        open={formOpen}
        initial={editingService}
        saving={formSaving}
        error={formError}
        onSave={handleSave}
        onCancel={() => setFormOpen(false)}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title={`Delete ${deleteTarget?.name ?? 'this service'}?`}
        description="This can't be undone. Customers will no longer be able to join this queue."
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  )
}