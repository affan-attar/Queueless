import { useEffect, useState } from 'react'
import { Bell, Clock, CheckCheck, MapPin, CircleCheck } from 'lucide-react'
import { notificationsApi } from '../api/notifications'

const ICONS = {
  QUEUE_APPROACHING: Bell,
  TOKEN_CALLED: MapPin,
  SERVICE_STARTED: Clock,
  SERVICE_COMPLETED: CircleCheck,
  QUEUE_CANCELLED: CircleCheck,
  QUEUE_JOINED: Clock,
  QUEUE_DELAYED: Clock,
}

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function normalize(n) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.message,
    createdAt: new Date(n.created_at).getTime(),
    read: n.is_read,
  }
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await notificationsApi.list()
      setNotifications((res.data.notifications || []).map(normalize))
    } catch (err) {
      setError('Could not load notifications.')
    } finally {
      setLoading(false)
    }
  }

  async function markRead(id) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await notificationsApi.markRead(id)
    } catch (err) {
      // best-effort; UI already updated optimistically
    }
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await notificationsApi.markAllRead()
    } catch (err) {
      // best-effort; UI already updated optimistically
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">
            Notifications
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn-secondary text-xs" onClick={markAllRead}>
            <CheckCheck size={14} /> Mark all as read
          </button>
        )}
      </div>

      {loading ? (
        <div className="card p-12 text-center text-sm text-slate-500">Loading...</div>
      ) : error ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display font-semibold text-ink-900 dark:text-paper">{error}</p>
          <button className="btn-primary mt-2" onClick={load}>Retry</button>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <Bell size={28} className="text-slate-300" />
          <p className="font-display font-semibold text-ink-900 dark:text-paper">
            No notifications yet
          </p>
          <p className="text-sm text-slate-500">
            Updates about your queues will show up here.
          </p>
        </div>
      ) : (
        <ul className="card divide-y divide-ink-900/10 dark:divide-paper/10">
          {notifications
            .slice()
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((n) => {
              const Icon = ICONS[n.type] ?? Bell
              return (
                <li
                  key={n.id}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`flex cursor-pointer items-start gap-3 px-5 py-4 transition ${
                    n.read ? '' : 'bg-amber-500/5 hover:bg-amber-500/10'
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      n.read
                        ? 'bg-ink-900/5 text-slate-400 dark:bg-paper/10 dark:text-paper/40'
                        : 'bg-amber-500/15 text-amber-500'
                    }`}
                  >
                    <Icon size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-sm font-semibold ${
                          n.read ? 'text-ink-900/70 dark:text-paper/70' : 'text-ink-900 dark:text-paper'
                        }`}
                      >
                        {n.title}
                      </p>
                      {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">{n.body}</p>
                    <p className="mt-1 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
                  </div>
                </li>
              )
            })}
        </ul>
      )}
    </div>
  )
}