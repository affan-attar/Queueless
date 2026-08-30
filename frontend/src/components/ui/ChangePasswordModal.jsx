import { useState } from 'react'
import { X } from 'lucide-react'
import { authApi } from '../../api/client'

export default function ChangePasswordModal({ isOpen, onClose, onPasswordChanged }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess('')
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (newPassword !== confirmPassword) {
      setError("New passwords don't match.")
      return
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.')
      return
    }

    setLoading(true)
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      })
      setSuccess('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      if (onPasswordChanged) onPasswordChanged()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-950/50 p-4"
      onClick={handleClose}
    >
      <div
        className="card w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-lg font-semibold text-ink-900 dark:text-paper">
            Change password
          </h3>

          <button
            type="button"
            onClick={handleClose}
            className="text-slate-400 transition hover:text-ink-900 dark:hover:text-paper"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          <div>
            <label className="field-label">Current password</label>
            <input
              type="password"
              className="field-input"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="field-label">New password</label>
            <input
              type="password"
              className="field-input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="field-label">Confirm new password</label>
            <input
              type="password"
              className="field-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-signal-stop">
              {error}
            </p>
          )}

          {success && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400">
              {success}
            </p>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex-1"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>

            <button
              type="button"
              onClick={handleClose}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}