import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { supabase } from '../lib/supabase'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [ready, setReady] = useState(false)
  const [linkInvalid, setLinkInvalid] = useState(false)
  const [done, setDone] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm()

  useEffect(() => {
    // Supabase parses the recovery token from the URL hash on load and
    // fires PASSWORD_RECOVERY once the session is established.
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })

    // In case the event already fired before we subscribed, also check
    // for an existing session directly.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setReady(true)
      }
    })

    const timeout = setTimeout(() => {
      setReady((r) => {
        if (!r) setLinkInvalid(true)
        return r
      })
    }, 4000)

    return () => {
      listener.subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, [])

  async function onSubmit({ password }) {
    setServerError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setServerError(error.message || 'Could not update password. Please try again.')
      return
    }
    setDone(true)
    setTimeout(() => navigate('/login'), 2000)
  }

  if (linkInvalid) {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="This link has expired"
        subtitle="Reset links are only valid for a short time."
      >
        <p className="text-sm text-slate-600">
          Please request a new reset link.
        </p>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link to="/forgot-password" className="font-medium text-ink-900 hover:underline">
            Back to forgot password
          </Link>
        </p>
      </AuthShell>
    )
  }

  if (done) {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="Password updated"
        subtitle="Redirecting you to log in…"
      >
        <p className="text-sm text-slate-600">
          Your password has been changed successfully.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Set a new password"
      subtitle="Choose a new password for your account."
    >
      {serverError && (
        <div className="mb-4 rounded-lg bg-signal-stop/10 border border-signal-stop/30 px-3.5 py-2.5 text-sm text-signal-stop">
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <div>
          <label className="field-label" htmlFor="password">New password</label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="field-input pr-10"
              placeholder="••••••••"
              disabled={!ready}
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'Password must be at least 8 characters' },
              })}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-ink-900"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-signal-stop">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="field-label" htmlFor="confirm_password">Confirm new password</label>
          <input
            id="confirm_password"
            type={showPassword ? 'text' : 'password'}
            className="field-input"
            placeholder="••••••••"
            disabled={!ready}
            {...register('confirm_password', {
              required: 'Please confirm your password',
              validate: (value) => value === watch('password') || 'Passwords do not match',
            })}
          />
          {errors.confirm_password && (
            <p className="mt-1 text-sm text-signal-stop">{errors.confirm_password.message}</p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting || !ready} className="btn-primary w-full">
          {!ready ? 'Verifying link…' : isSubmitting ? 'Updating…' : 'Update password'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-medium text-ink-900 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  )
}