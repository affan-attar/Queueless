import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import AuthShell from '../components/AuthShell'
import { authApi } from '../api/client'

const ORG_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'diagnostic_center', label: 'Diagnostic Center' },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState('customer')
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { role: 'customer' } })

  async function onSubmit(values) {
    setServerError('')
    try {
      await authApi.register({ ...values, role })
      setSuccess(true)
    } catch (err) {
      const detail = err.response?.data?.detail
      setServerError(
        Array.isArray(detail)
          ? detail.map((d) => d.msg).join(', ')
          : detail || 'Registration failed. Please try again.'
      )
    }
  }

  if (success) {
    return (
      <AuthShell eyebrow="Almost there" title="Check your inbox">
        <p className="text-sm text-slate-600">
          We've sent a confirmation link to your email. Verify your address,
          then log in to start using QueueLess.
        </p>
        <Link to="/login" className="btn-primary mt-6 w-full">
          Go to login
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Get started"
      title="Create your account"
      subtitle="Join queues remotely, or set one up for your clinic or hospital."
    >
      <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg bg-ink-900/5 p-1">
        {[
          { value: 'customer', label: 'Customer' },
          { value: 'org_admin', label: 'Organization Admin' },
        ].map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setRole(opt.value)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              role === opt.value
                ? 'bg-ink-900 text-paper shadow-sm'
                : 'text-ink-900/60 hover:text-ink-900'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && (
          <div className="rounded-lg bg-signal-stop/10 border border-signal-stop/30 px-3.5 py-2.5 text-sm text-signal-stop">
            {serverError}
          </div>
        )}

        <div>
          <label className="field-label" htmlFor="full_name">Full name</label>
          <input
            id="full_name"
            className="field-input"
            {...register('full_name', { required: 'Full name is required' })}
          />
          {errors.full_name && <p className="mt-1 text-sm text-signal-stop">{errors.full_name.message}</p>}
        </div>

        {role === 'org_admin' && (
          <>
            <div>
              <label className="field-label" htmlFor="organization_name">Organization name</label>
              <input
                id="organization_name"
                className="field-input"
                {...register('organization_name', { required: 'Organization name is required' })}
              />
              {errors.organization_name && (
                <p className="mt-1 text-sm text-signal-stop">{errors.organization_name.message}</p>
              )}
            </div>
            <div>
              <label className="field-label" htmlFor="organization_type">Organization type</label>
              <select
                id="organization_type"
                className="field-input"
                {...register('organization_type', { required: 'Organization type is required' })}
              >
                <option value="">Select a type</option>
                {ORG_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.organization_type && (
                <p className="mt-1 text-sm text-signal-stop">{errors.organization_type.message}</p>
              )}
            </div>
          </>
        )}

        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="field-input"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && <p className="mt-1 text-sm text-signal-stop">{errors.email.message}</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="phone">Phone number</label>
          <input
            id="phone"
            className="field-input"
            {...register('phone', { required: 'Phone number is required' })}
          />
          {errors.phone && <p className="mt-1 text-sm text-signal-stop">{errors.phone.message}</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            className="field-input"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'At least 8 characters' },
            })}
          />
          {errors.password && <p className="mt-1 text-sm text-signal-stop">{errors.password.message}</p>}
        </div>

        <div>
          <label className="field-label" htmlFor="confirm_password">Confirm password</label>
          <input
            id="confirm_password"
            type="password"
            className="field-input"
            {...register('confirm_password', {
              required: 'Please confirm your password',
              validate: (v) => v === watch('password') || 'Passwords do not match',
            })}
          />
          {errors.confirm_password && (
            <p className="mt-1 text-sm text-signal-stop">{errors.confirm_password.message}</p>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-ink-900 hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  )
}