import { useEffect, useState } from 'react'
import { Users, Clock3, CheckCircle2, UserX, Hourglass, Activity } from 'lucide-react'
import { queuesApi } from '../../api/queues'
import { useAuth } from '../../context/AuthContext'

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 text-slate-500">
        <Icon size={16} className={accent ?? 'text-amber-500'} />
        <span className="text-xs uppercase tracking-widest">{label}</span>
      </div>
      <p className="mt-3 font-display text-3xl font-bold text-ink-900 dark:text-paper">{value}</p>
    </div>
  )
}

export default function OrgDashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data } = await queuesApi.stats()
        setStats(data)
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not load dashboard stats.')
      } finally {
        setLoading(false)
      }
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flap-digit h-14 w-14 text-2xl animate-pulse">•</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display font-semibold text-ink-900 dark:text-paper">Today's Overview</p>
        <p className="mt-2 text-sm text-signal-stop">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">
          Good {new Date().getHours() < 18 ? 'day' : 'evening'}, {user?.full_name?.split(' ')[0] ?? 'there'} 👋
        </h1>
        <p className="mt-1 text-sm text-slate-500">Here's today's overview.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Visitors" value={stats.todays_visitors} />
        <StatCard icon={Hourglass} label="Waiting" value={stats.currently_waiting} accent="text-signal-wait" />
        <StatCard icon={Clock3} label="Avg Wait" value={`${stats.avg_wait_minutes}m`} />
        <StatCard icon={Activity} label="Avg Service" value={`${stats.avg_service_minutes}m`} />
        <StatCard icon={CheckCircle2} label="Completed" value={stats.completed_today} accent="text-signal-go" />
        <StatCard icon={UserX} label="No Shows" value={stats.no_shows_today} accent="text-signal-stop" />
      </div>

      <div className="card p-6">
        <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper">
          Currently Serving
        </h2>
        {stats.currently_serving.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">
            No one is currently being served.
          </p>
        ) : (
          <ul className="divide-y divide-ink-900/10 dark:divide-paper/10">
            {stats.currently_serving.map((s, i) => (
              <li key={i} className="flex items-center justify-between py-3 text-sm">
                <span className="text-ink-900 dark:text-paper">{s.service_name}</span>
                <span className="font-mono font-semibold text-ink-900 dark:text-paper">
                  {s.token_label}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}