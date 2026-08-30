import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { Eye, EyeOff } from 'lucide-react'
import AuthShell from '../components/AuthShell'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'

const ROLE_HOME_ROUTES = {
  customer: '/dashboard',
  org_admin: '/organization/dashboard',
  staff: '/staff/dashboard',
  super_admin: '/admin/overview',
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit(values) {
    setServerError('')
    try {
      const { data } = await authApi.login(values)
      login(data)
      const homeRoute = ROLE_HOME_ROUTES[data.role] || '/dashboard'
      navigate(homeRoute)
    } catch (err) {
      setServerError(
        err.response?.data?.detail || 'Invalid email or password.'
      )
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Log in to your account"
      subtitle="Track your queues and never lose your place in line."
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {serverError && (
          <div className="rounded-lg bg-signal-stop/10 border border-signal-stop/30 px-3.5 py-2.5 text-sm text-signal-stop">
            {serverError}
          </div>
        )}

        <div>
          <label className="field-label" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            className="field-input"
            placeholder="you@example.com"
            {...register('email', { required: 'Email is required' })}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-signal-stop">{errors.email.message}</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="field-label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="mb-1.5 text-sm font-medium text-ink-900/70 hover:text-ink-900">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              className="field-input pr-10"
              placeholder="••••••••"
              {...register('password', { required: 'Password is required' })}
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

        <label className="flex items-center gap-2 text-sm text-ink-900/70">
          <input type="checkbox" className="rounded border-ink-900/20" {...register('remember_me')} />
          Remember me
        </label>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full">
          {isSubmitting ? 'Logging in…' : 'Log in'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Don't have an account?{' '}
        <Link to="/register" className="font-medium text-ink-900 hover:underline">
          Create one
        </Link>
      </p>
    </AuthShell>
  )
}