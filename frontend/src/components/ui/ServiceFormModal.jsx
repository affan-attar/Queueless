import { useEffect, useState } from 'react'

const EMPTY = { name: '', specialization: '', avgServiceMinutes: 10, active: true }

export default function ServiceFormModal({ open, initial, saving, error, onSave, onCancel }) {
  const [form, setForm] = useState(EMPTY)

  useEffect(() => {
    if (open) setForm(initial ? { ...initial } : EMPTY)
  }, [open, initial])

  if (!open) return null

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onSave(form)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4">
      <form onSubmit={handleSubmit} className="card w-full max-w-sm space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-ink-900 dark:text-paper">
          {initial ? 'Edit service' : 'Add service'}
        </h2>

        <div>
          <label className="field-label" htmlFor="svc-name">Service name</label>
          <input
            id="svc-name"
            className="field-input"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="e.g. General Consultation"
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="svc-specialization">Specialization</label>
          <input
            id="svc-specialization"
            className="field-input"
            value={form.specialization}
            onChange={(e) => update('specialization', e.target.value)}
            placeholder="e.g. Dentist, Homeopathic, ENT..."
          />
        </div>

        <div>
          <label className="field-label" htmlFor="svc-time">Average service time (minutes)</label>
          <input
            id="svc-time"
            type="number"
            min={1}
            max={180}
            className="field-input"
            value={form.avgServiceMinutes}
            onChange={(e) => update('avgServiceMinutes', Number(e.target.value))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-900 dark:text-paper">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => update('active', e.target.checked)}
            className="h-4 w-4 rounded border-ink-900/30"
          />
          Active (visible to customers)
        </label>

        {error && <p className="text-sm text-signal-stop">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-ink-900/10 pt-4 dark:border-paper/10">
          <button type="button" className="btn-secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save service'}
          </button>
        </div>
      </form>
    </div>
  )
}