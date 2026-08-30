import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export default function EditProfilePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName: user?.full_name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    dob: '',
    gender: '',
    city: '',
  })
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    // TODO: wire to PATCH /api/users/me once that endpoint exists (Phase E).
    setTimeout(() => {
      setSaving(false)
      navigate('/profile')
    }, 600)
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">Edit profile</h1>
        <p className="mt-1 text-sm text-slate-500">Update your personal information.</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-900 font-display text-xl font-semibold text-paper">
            {initials(form.fullName) || '?'}
          </div>
          <button type="button" className="btn-secondary text-sm">
            <Camera size={15} /> Change photo
          </button>
        </div>

        <div>
          <label className="field-label" htmlFor="fullName">Full name</label>
          <input
            id="fullName"
            className="field-input"
            value={form.fullName}
            onChange={(e) => update('fullName', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="field-input"
            value={form.email}
            onChange={(e) => update('email', e.target.value)}
          />
        </div>

        <div>
          <label className="field-label" htmlFor="phone">Phone</label>
          <input
            id="phone"
            className="field-input"
            placeholder="+91 XXXXX XXXXX"
            value={form.phone}
            onChange={(e) => update('phone', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="dob">Date of birth</label>
            <input
              id="dob"
              type="date"
              className="field-input"
              value={form.dob}
              onChange={(e) => update('dob', e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="gender">Gender</label>
            <select
              id="gender"
              className="field-input"
              value={form.gender}
              onChange={(e) => update('gender', e.target.value)}
            >
              <option value="">Select</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </div>
        </div>

        <div>
          <label className="field-label" htmlFor="city">City</label>
          <input
            id="city"
            className="field-input"
            value={form.city}
            onChange={(e) => update('city', e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-ink-900/10 pt-5 dark:border-paper/10">
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}