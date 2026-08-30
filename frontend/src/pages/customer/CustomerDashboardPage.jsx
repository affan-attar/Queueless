import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Building2,
  Clock,
  Users,
  History,
  Heart,
  Search,
  Bell,
  FileQuestion,
  Stethoscope,
  Landmark,
  Scissors,
  Building,
  Pill,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import StatusBadge from '../../components/ui/StatusBadge'
import ProgressBar from '../../components/ui/ProgressBar'
import ConfirmModal from '../../components/ui/ConfirmModal'
import { queuesApi } from '../../api/queues'

// Illustrative data — replace with real API calls once Phase 2/3 land.
const activeQueue = {
  id: 'mock-dashboard',
  organization: 'CityCare Clinic',
  service: 'General Consultation',
  yourToken: 'A-047',
  nowServing: 'A-035',
  peopleAhead: 12,
  totalAheadAtJoin: 20,
  estimatedWaitMinutes: 36,
  status: 'active',
}

// Set these to [] to see the new empty states.
const recentHistory = [
  { name: 'Glow Salon & Spa', date: 'Aug 18', status: 'Completed' },
  { name: 'National Bank — MG Road', date: 'Aug 12', status: 'Cancelled' },
]

const favorites = [
  { name: 'CityCare Clinic', category: 'Healthcare' },
  { name: 'Glow Salon & Spa', category: 'Salon' },
]

const categories = [
  { label: 'Healthcare', icon: Stethoscope },
  { label: 'Banking', icon: Landmark },
  { label: 'Salon', icon: Scissors },
  { label: 'Government', icon: Building },
  { label: 'Pharmacy', icon: Pill },
]

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

export default function CustomerDashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const firstName = user?.full_name?.split(' ')[0] ?? 'there'
  const servedSoFar = activeQueue.totalAheadAtJoin - activeQueue.peopleAhead

  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')

  function viewQueue() {
    navigate(`/queue/${activeQueue.id}`, {
      state: {
        token: activeQueue.yourToken,
        position: activeQueue.peopleAhead,
        estimatedWaitMinutes: activeQueue.estimatedWaitMinutes,
        serviceName: activeQueue.organization,
        mock: true,
      },
    })
  }

  async function confirmLeave() {
    setLeaving(true)
    setLeaveError('')
    try {
      await queuesApi.leave(activeQueue.id)
      setLeaveOpen(false)
      // TODO: once real data lands, refetch/clear the active queue here.
    } catch (err) {
      // Backend leave endpoint isn't built yet — treat 404 as success.
      if (!err.response || err.response.status === 404) {
        setLeaveOpen(false)
        return
      }
      setLeaveError(
        err.response?.data?.detail || 'Could not leave the queue. Please try again.'
      )
    } finally {
      setLeaving(false)
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">
            {greeting()}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here's what's happening with your queues.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/notifications"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-ink-900/10 bg-white text-ink-900 transition hover:border-ink-900/30 dark:border-paper/15 dark:bg-ink-800 dark:text-paper"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </Link>
          <Link
            to="/profile"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-ink-900 font-display text-sm font-semibold text-paper dark:bg-paper dark:text-ink-900"
            aria-label="Profile"
          >
            {initials(user?.full_name) || '?'}
          </Link>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="bg-ink-900 px-6 py-5 text-paper">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Building2 size={16} />
              {activeQueue.organization}
            </div>
            <StatusBadge status={activeQueue.status} />
          </div>
          <p className="mt-1 font-display text-lg font-semibold">{activeQueue.service}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-500">
              Your token
            </p>
            <div className="flex gap-1.5">
              {activeQueue.yourToken.split('').map((ch, i) => (
                <div key={i} className="flap-digit h-14 w-10 text-xl">{ch}</div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-500">
              Currently serving
            </p>
            <div className="flex gap-1.5">
              {activeQueue.nowServing.split('').map((ch, i) => (
                <div key={i} className="flap-digit h-14 w-10 text-xl bg-ink-700 text-amber-400">
                  {ch}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-2 text-ink-900 dark:text-paper">
              <Users size={16} className="text-slate-500" />
              <span className="text-sm">
                <strong>{activeQueue.peopleAhead}</strong> people ahead
              </span>
            </div>
            <div className="flex items-center gap-2 text-ink-900 dark:text-paper">
              <Clock size={16} className="text-slate-500" />
              <span className="text-sm">
                Est. wait <strong>{activeQueue.estimatedWaitMinutes} min</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-ink-900/10 px-6 py-4 dark:border-paper/10">
          <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-slate-500">
            <span>Queue progress</span>
            <span>
              {servedSoFar} / {activeQueue.totalAheadAtJoin} served
            </span>
          </div>
          <ProgressBar value={servedSoFar} max={activeQueue.totalAheadAtJoin} />
        </div>

        <div className="flex flex-col gap-3 border-t border-ink-900/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-paper/10">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Bell size={13} className="text-amber-500" />
            You'll be notified when your turn is near
          </p>
          <div className="flex gap-2">
            <button type="button" className="btn-secondary" onClick={viewQueue}>
              View Queue
            </button>
            <button
              type="button"
              className="btn-secondary text-signal-stop"
              onClick={() => setLeaveOpen(true)}
            >
              Leave Queue
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Search size={16} className="text-amber-500" />
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper">Browse by category</h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {categories.map(({ label, icon: Icon }) => (
              <Link
                key={label}
                to={`/services?category=${label}`}
                className="flex items-center gap-2 rounded-lg border border-ink-900/10 px-3 py-2.5 text-sm font-medium text-ink-900 transition hover:border-ink-900/30 dark:border-paper/15 dark:text-paper dark:hover:border-paper/30"
              >
                <Icon size={15} className="text-amber-500" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-6 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <History size={16} className="text-amber-500" />
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper">Recent history</h2>
          </div>
          {recentHistory.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <FileQuestion size={28} className="text-slate-300" />
              <div>
                <p className="text-sm font-medium text-ink-900 dark:text-paper">No recent visits</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Your completed and cancelled queues will appear here.
                </p>
              </div>
              <Link to="/services" className="btn-secondary mt-1 text-xs">
                Find a service
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {recentHistory.map((item) => (
                <li key={item.name} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-ink-900 dark:text-paper">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.date}</p>
                  </div>
                  <span
                    className={
                      item.status === 'Completed'
                        ? 'text-xs font-medium text-signal-go'
                        : 'text-xs font-medium text-signal-stop'
                    }
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Heart size={16} className="text-amber-500" />
            <h2 className="font-display font-semibold text-ink-900 dark:text-paper">Favorite organizations</h2>
          </div>
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Heart size={28} className="text-slate-300" />
              <div>
                <p className="text-sm font-medium text-ink-900 dark:text-paper">No favorites yet</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Save organizations you visit frequently.
                </p>
              </div>
              <Link to="/services" className="btn-secondary mt-1 text-xs">
                Explore services
              </Link>
            </div>
          ) : (
            <ul className="space-y-3">
              {favorites.map((org) => (
                <li key={org.name} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-ink-900 dark:text-paper">{org.name}</p>
                    <p className="text-xs text-slate-400">{org.category}</p>
                  </div>
                  <button type="button" className="text-xs font-medium text-amber-500 hover:text-amber-600">
                    Join
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmModal
        open={leaveOpen}
        title="Leave this queue?"
        description="You'll lose your spot and will need to join again from the start."
        confirmLabel="Leave queue"
        loading={leaving}
        error={leaveError}
        onConfirm={confirmLeave}
        onCancel={() => {
          if (leaving) return
          setLeaveOpen(false)
          setLeaveError('')
        }}
      />
    </div>
  )
}