import { useEffect, useState } from 'react'
import { Building2, MapPin, Bell, Users, Plus, Trash2, Camera, UserCircle, Mail, KeyRound, CheckCircle2 } from 'lucide-react'
import { organizationsApi } from '../../api/organizations'
import { useAuth } from '../../context/AuthContext'
import ChangeEmailModal from '../../components/ui/ChangeEmailModal'
import ChangePasswordModal from '../../components/ui/ChangePasswordModal'

const STORAGE_KEY = 'ql_org_settings_local'

const SEED_LOCAL = {
  notifyThreshold: 3,
  staff: [
    { id: 's1', name: 'Aadil Attar', role: 'Counter 1' },
    { id: 's2', name: 'Priya Nair', role: 'Counter 2' },
  ],
}

function loadLocalExtras() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) return JSON.parse(saved)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_LOCAL))
    return SEED_LOCAL
  } catch {
    return SEED_LOCAL
  }
}

function saveLocalExtras(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ notifyThreshold: data.notifyThreshold, staff: data.staff }))
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export default function OrgSettingsPage() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState(null)
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffRole, setNewStaffRole] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [currentEmail, setCurrentEmail] = useState(user?.email || '')
  const [toast, setToast] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await organizationsApi.getSettings()
        if (cancelled) return
        const localExtras = loadLocalExtras()
        setForm({ ...res.data, ...localExtras })
      } catch (err) {
        if (!cancelled) setLoadError(err.response?.data?.detail || 'Could not load organization settings.')
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(''), 4500)
    return () => clearTimeout(timer)
  }, [toast])

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setSaved(false)
  }

  function addStaff() {
    if (!newStaffName.trim()) return
    setForm((f) => ({
      ...f,
      staff: [
        ...f.staff,
        { id: `s-${Date.now()}`, name: newStaffName.trim(), role: newStaffRole.trim() || 'Unassigned' },
      ],
    }))
    setNewStaffName('')
    setNewStaffRole('')
    setSaved(false)
  }

  function removeStaff(id) {
    setForm((f) => ({ ...f, staff: f.staff.filter((s) => s.id !== id) }))
    setSaved(false)
  }

  function handleEmailChanged() {
    // Email doesn't change instantly anymore — Supabase requires the user
    // to confirm via links sent to both the old and new address first.
    // We don't update currentEmail/localStorage here; the displayed email
    // will reflect the change only after the user reloads post-confirmation.
    setShowEmailModal(false)
    setToast('Check your inbox — confirm the change from both your old and new email to finish updating.')
  }

  function handlePasswordChanged() {
    setShowPasswordModal(false)
    setToast('Password updated successfully.')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      const res = await organizationsApi.updateSettings({
        name: form.name,
        description: form.description,
        address: form.address,
      })
      saveLocalExtras(form)
      setForm((f) => ({ ...f, ...res.data }))
      setSaved(true)
    } catch (err) {
      setLoadError(err.response?.data?.detail || 'Could not save organization settings.')
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return (
      <div className="card p-12 text-center text-sm text-slate-500">
        {loadError || 'Loading...'}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">
          Organization settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your profile, notification rules, and staff assignments.
        </p>
      </div>

      {loadError && (
        <p className="rounded-lg border border-signal-stop/30 bg-signal-stop/10 px-4 py-2 text-xs text-signal-stop">
          {loadError}
        </p>
      )}

      <div className="card space-y-4 p-6">
        <div className="flex items-center gap-2">
          <UserCircle size={16} className="text-amber-500" />
          <h2 className="font-display font-semibold text-ink-900 dark:text-paper">
            Profile
          </h2>
        </div>

        <div>
          <label className="field-label">Name</label>
          <input
            className="field-input"
            value={user?.full_name || ''}
            disabled
          />
        </div>

        <div>
          <label className="field-label">
            <span className="inline-flex items-center gap-1.5">
              <Mail size={13} /> Email
            </span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="field-input flex-1"
              value={currentEmail}
              disabled
            />
            <button
              type="button"
              className="btn-secondary shrink-0"
              onClick={() => setShowEmailModal(true)}
            >
              Change email
            </button>
          </div>
        </div>

        <div className="border-t border-ink-900/10 pt-4 dark:border-paper/10">
          <label className="field-label">
            <span className="inline-flex items-center gap-1.5">
              <KeyRound size={13} /> Password
            </span>
          </label>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setShowPasswordModal(true)}
          >
            Change password
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-5 p-6">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-amber-500" />
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper">
              Organization profile
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 font-display text-xl font-semibold text-paper">
              {initials(form.name) || '?'}
            </div>
            <button type="button" className="btn-secondary text-sm">
              <Camera size={15} /> Change logo
            </button>
          </div>

          <div>
            <label className="field-label" htmlFor="name">Organization name</label>
            <input
              id="name"
              className="field-input"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="description">Description</label>
            <textarea
              id="description"
              rows={3}
              className="field-input resize-none"
              value={form.description || ''}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          <div>
            <label className="field-label" htmlFor="address">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={13} /> Address
              </span>
            </label>
            <input
              id="address"
              className="field-input"
              value={form.address || ''}
              onChange={(e) => update('address', e.target.value)}
            />
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-amber-500" />
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper">
              Notification threshold
            </h2>
          </div>
          <p className="text-sm text-slate-500">
            Notify customers when this many people are ahead of them in the queue.
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={20}
              className="field-input w-24"
              value={form.notifyThreshold}
              onChange={(e) => update('notifyThreshold', Number(e.target.value))}
            />
            <span className="text-sm text-slate-500">people ahead</span>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-amber-500" />
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper">
              Staff assignments
            </h2>
          </div>

          {form.staff.length === 0 ? (
            <p className="text-sm text-slate-500">No staff assigned yet.</p>
          ) : (
            <ul className="divide-y divide-ink-900/10 text-sm dark:divide-paper/10">
              {form.staff.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-ink-900 dark:text-paper">{s.name}</p>
                    <p className="text-xs text-slate-400">{s.role}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeStaff(s.id)}
                    className="text-slate-400 transition hover:text-signal-stop"
                    aria-label={`Remove ${s.name}`}
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2 border-t border-ink-900/10 pt-4 sm:flex-row dark:border-paper/10">
            <input
              className="field-input flex-1"
              placeholder="Staff name"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
            />
            <input
              className="field-input flex-1"
              placeholder="Role / counter (optional)"
              value={newStaffRole}
              onChange={(e) => setNewStaffRole(e.target.value)}
            />
            <button type="button" className="btn-secondary shrink-0" onClick={addStaff}>
              <Plus size={15} /> Add
            </button>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-sm text-signal-go">Saved</span>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>

      <ChangeEmailModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        onEmailChanged={handleEmailChanged}
      />
      <ChangePasswordModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        onPasswordChanged={handlePasswordChanged}
      />

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex max-w-xs items-start gap-2 rounded-lg border border-signal-go/30 bg-white px-4 py-3 text-sm font-medium text-ink-900 shadow-lg dark:bg-ink-900 dark:text-paper">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-signal-go" />
          {toast}
        </div>
      )}
    </div>
  )
}