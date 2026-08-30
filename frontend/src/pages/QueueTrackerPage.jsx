import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { Building2, Clock, Users, Bell, ArrowLeft } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import ConfirmModal from '../components/ui/ConfirmModal'
import { queuesApi } from '../api/queues'
import { notify } from '../lib/notify'

function secondsAgoLabel(seconds) {
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const mins = Math.floor(seconds / 60)
  return `${mins}m ago`
}

const POLL_INTERVAL_MS = 5000

export default function QueueTrackerPage() {
  const { id } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()

  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')

  const [entry, setEntry] = useState(null) // real backend data: { position, status, estimated_wait_minutes, token_label, now_serving_label }
  const [loading, setLoading] = useState(true)
  const [pollError, setPollError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(Date.now())
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0)

  // Tracks which milestones already fired so a re-render never double-sends.
  const notifiedRef = useRef({ approaching: false, yourTurn: false })

  const entryId = state?.entryId

  useEffect(() => {
    if (!entryId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function poll() {
      try {
        const res = await queuesApi.myEntryLive(entryId)
        if (cancelled) return
        setEntry(res.data)
        setPollError('')
        setLastUpdated(Date.now())
      } catch (err) {
        if (cancelled) return
        setPollError(
          err.response?.data?.detail || 'Could not refresh queue status.'
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    poll() // fetch immediately, then poll on an interval
    const interval = setInterval(poll, POLL_INTERVAL_MS)

    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [entryId])

  useEffect(() => {
    const clock = setInterval(() => {
      setSecondsSinceUpdate(Math.floor((Date.now() - lastUpdated) / 1000))
    }, 1000)
    return () => clearInterval(clock)
  }, [lastUpdated])

  const position = entry?.position ?? 0
  const waitMinutes = entry?.estimated_wait_minutes ?? 0
  const yourTurn = entry?.status === 'CALLED'

  // Fires the two milestone notifications: "turn approaching" (3 people
  // left) and "your turn" (0 people left). Each fires exactly once per
  // queue session thanks to notifiedRef.
  useEffect(() => {
    if (!entry) return
    const serviceName = state?.serviceName ?? 'your queue'

    if (position === 3 && !notifiedRef.current.approaching) {
      notifiedRef.current.approaching = true
      notify({
        type: 'turn_approaching',
        title: 'Your turn is approaching',
        body: `You have 3 people ahead at ${serviceName}.`,
      })
    }

    if (yourTurn && !notifiedRef.current.yourTurn) {
      notifiedRef.current.yourTurn = true
      notify({
        type: 'your_turn',
        title: 'Your turn',
        body: `Please proceed to the counter at ${serviceName}.`,
      })
    }
  }, [position, yourTurn, entry, state])

  // No entryId means someone landed here directly (refresh, shared link, etc.)
  // rather than via the Join queue flow.
  if (!entryId) {
    return (
      <div className="card flex min-h-[60vh] flex-col items-center justify-center gap-4 p-12 text-center">
        <p className="font-display text-lg font-semibold text-ink-900 dark:text-paper">
          No live queue data for this session
        </p>
        <p className="max-w-sm text-sm text-slate-500">
          Refreshing this page loses the live view for now — this will be
          fixed once queue status can be fetched directly from the backend
          without navigation state.
        </p>
        <button className="btn-secondary" onClick={() => navigate('/services')}>
          <ArrowLeft size={15} /> Back to Find services
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="card flex min-h-[60vh] flex-col items-center justify-center gap-4 p-12 text-center">
        <p className="text-sm text-slate-500">Loading your queue status...</p>
      </div>
    )
  }

  const serviceName = state?.serviceName
  const token = entry?.token_label ?? state?.token

  async function confirmLeave() {
    setLeaving(true)
    setLeaveError('')
    try {
      await queuesApi.leave(id)
      navigate('/services')
    } catch (err) {
      if (!err.response || err.response.status === 404) {
        navigate('/services')
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
    <div className="mx-auto max-w-2xl space-y-6">
      <button
        className="flex items-center gap-1.5 text-sm font-medium text-ink-900/70 hover:text-ink-900 dark:text-paper/70 dark:hover:text-paper"
        onClick={() => navigate('/services')}
      >
        <ArrowLeft size={15} /> Back to Find services
      </button>

      {pollError && (
        <p className="rounded-lg border border-signal-stop/30 bg-signal-stop/10 px-4 py-2 text-xs text-signal-stop">
          {pollError} — showing last known status.
        </p>
      )}

      <div className="card overflow-hidden">
        <div className="bg-ink-900 px-6 py-5 text-paper">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Building2 size={16} />
              {serviceName ?? 'Queue'}
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-signal-go">
                <span className="h-1.5 w-1.5 rounded-full bg-signal-go" />
                Live • Updated {secondsAgoLabel(secondsSinceUpdate)}
              </span>
              <StatusBadge status="active" />
            </div>
          </div>
          <p className="mt-1 font-display text-lg font-semibold">Queue #{id}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-500">
              Your token
            </p>
            <div className="flex gap-1.5">
              {String(token ?? '—').split('').map((ch, i) => (
                <div key={i} className="flap-digit h-14 w-10 text-xl">{ch}</div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-2 text-ink-900 dark:text-paper">
              <Users size={16} className="text-slate-500" />
              <span className="text-sm">
                {yourTurn ? (
                  <strong className="text-signal-go">It's your turn!</strong>
                ) : (
                  <>
                    <strong>{position}</strong> people ahead of you
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-ink-900 dark:text-paper">
              <Clock size={16} className="text-slate-500" />
              <span className="text-sm">
                Est. wait <strong>{waitMinutes} min</strong>
              </span>
            </div>
          </div>
        </div>

        {yourTurn && (
          <div className="border-t border-ink-900/10 px-6 py-4 dark:border-paper/10">
            <p className="flex items-center gap-1.5 text-sm font-medium text-signal-go">
              <Bell size={15} /> Please proceed to the counter now.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-ink-900/10 px-6 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-paper/10">
          <p className="flex items-center gap-1.5 text-xs text-slate-500">
            <Bell size={13} className="text-amber-500" />
            You'll be notified when your turn is near
          </p>
          <button
            type="button"
            className="btn-secondary text-signal-stop"
            onClick={() => setLeaveOpen(true)}
          >
            Leave Queue
          </button>
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