import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { authApi } from '../api/client'

export default function ForgotPasswordPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState('email') // 'email' | 'reset'
  const [email, setEmail] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const [done, setDone] = useState(false)

  const emailForm = useForm()
  const resetForm = useForm()

  async function onSubmitEmail({ email: submittedEmail }) {
    setServerError('')
    try {
      await authApi.forgotPassword(submittedEmail)
      setEmail(submittedEmail)
      setStep('reset')
    } catch (err) {
      setServerError(
        err.response?.data?.detail || 'Something went wrong. Please try again.'
      )
    }
  }

  async function onSubmitReset({ code, password }) {
    setServerError('')
    try {
      await authApi.resetPassword({ email, code, new_password: password })
      setDone(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setServerError(
        err.response?.data?.detail || 'Invalid or expired code. Please try again.'
      )
    }
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

  if (step === 'reset') {
    return (
      <AuthShell
        eyebrow="Reset password"
        title="Enter your code"
        subtitle={`We sent a 6-digit code to ${email}. Enter it below along with your new password.`}
      >
        {serverError && (
          <div className="mb-4 rounded-lg bg-signal-stop/10 border border-signal-stop/30 px-3.5 py-2.5 text-sm text-signal-stop">
            {serverError}
          </div>
        )}

        <form onSubmit={resetForm.handleSubmit(onSubmitReset)} noValidate className="space-y-4">
          <div>
            <label className="field-label" htmlFor="code">Verification code</label>
            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              className="field-input tracking-widest"
              placeholder="123456"
              {...resetForm.register('code', {
                required: 'Code is required',
                pattern: { value: /^\d{6}$/, message: 'Enter the 6-digit code' },
              })}
            />
            {resetForm.formState.errors.code && (
              <p className="mt-1 text-sm text-signal-stop">{resetForm.formState.errors.code.message}</p>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor="password">New password</label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="field-input pr-10"
                placeholder="••••••••"
                {...resetForm.register('password', {
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
            {resetForm.formState.errors.password && (
              <p className="mt-1 text-sm text-signal-stop">{resetForm.formState.errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="field-label" htmlFor="confirm_password">Confirm new password</label>
            <input
              id="confirm_password"
              type={showPassword ? 'text' : 'password'}
              className="field-input"
              placeholder="••••••••"
              {...resetForm.register('confirm_password', {
                required: 'Please confirm your password',
                validate: (value) =>
                  value === resetForm.watch('password') || 'Passwords do not match',
              })}
            />
            {resetForm.formState.errors.confirm_password && (
              <p className="mt-1 text-sm text-signal-stop">{resetForm.formState.errors.confirm_password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={resetForm.formState.isSubmitting}
            className="btn-primary w-full"
          >
            {resetForm.formState.isSubmitting ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Didn't get a code?{' '}
          <button
            type="button"
            onClick={() => setStep('email')}
            className="font-medium text-ink-900 hover:underline"
          >
            Try again
          </button>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Reset password"
      title="Forgot your password?"
      subtitle="Enter the email on your account and we'll send you a code."
    >
      {serverError && (
        <div className="mb-4 rounded-lg bg-signal-stop/10 border border-signal-stop/30 px-3.5 py-2.5 text-sm text-signal-stop">
          {serverError}
        </div>
      )}

      <form onSubmit={emailForm.handleSubmit(onSubmitEmail)} noValidate className="space-y-4">
        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="field-input"
            placeholder="you@example.com"
            {...emailForm.register('email', { required: 'Email is required' })}
          />
          {emailForm.formState.errors.email && (
            <p className="mt-1 text-sm text-signal-stop">{emailForm.formState.errors.email.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={emailForm.formState.isSubmitting}
          className="btn-primary w-full"
        >
          {emailForm.formState.isSubmitting ? 'Sending…' : 'Send code'}
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