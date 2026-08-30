import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import AuthShell from '../components/AuthShell'
import { authApi } from '../api/client'

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit({ email }) {
    await authApi.forgotPassword(email)
    setSent(true)
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title={sent ? 'Check your email' : 'Forgot your password?'}
      subtitle={sent ? undefined : "Enter the email on your account and we'll send a reset link."}
    >
      {sent ? (
        <p className="text-sm text-slate-600">
          If an account exists for that address, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div>
            <label className="field-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="field-input"
              placeholder="you@example.com"
              {...register('email', { required: 'Email is required' })}
            />
            {errors.email && <p className="mt-1 text-sm text-signal-stop">{errors.email.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-medium text-ink-900 hover:underline">
          Back to login
        </Link>
      </p>
    </AuthShell>
  )
}
