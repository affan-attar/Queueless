import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, MapPin, Users, Clock } from 'lucide-react'
import StatusBadge from '../components/ui/StatusBadge'
import ConfirmModal from '../components/ui/ConfirmModal'
import { queuesApi } from '../api/queues'
import { servicesApi } from '../api/services'

const CATEGORY_LABELS = {
  hospital: 'Healthcare',
  clinic: 'Healthcare',
  diagnostic_center: 'Healthcare',
}

const CATEGORIES = ['All', ...new Set(Object.values(CATEGORY_LABELS))]

function toDisplayStatus(status) {
  if (status === 'open') return 'active'
  if (status === 'paused') return 'busy'
  return 'closed'
}

export default function FindServicesPage() {
  const navigate = useNavigate()
  const [category, setCategory] = useState('All')
  const [query, setQuery] = useState('')

  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [pendingService, setPendingService] = useState(null)
  const [joining, setJoining] = useState(false)
  const [joinError, setJoinError] = useState('')
  const [refreshingLive, setRefreshingLive] = useState(false)

  // When a join attempt comes back 409, we stash the existing entry/queue
  // here so the modal can offer "View status" instead of retrying "Join queue".
  const [existingEntry, setExistingEntry] = useState(null)

  useEffect(() => {
    loadServices()
  }, [])

  async function loadServices() {
    setLoading(true)
    setLoadError('')
    try {
      const res = await servicesApi.browse()
      setServices(res.data)
    } catch (err) {
      setLoadError('Could not load services. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = services.filter((s) => {
    const label = CATEGORY_LABELS[s.category] || 'Healthcare'
    const matchesCategory = category === 'All' || label === category
    const matchesQuery =
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      (s.specialization || '').toLowerCase().includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })

  async function openConfirm(service) {
    setJoinError('')
    setExistingEntry(null)
    setPendingService(service)
    setRefreshingLive(true)
    try {
      const res = await servicesApi.getLive(service.id)
      setPendingService((prev) =>
        prev && prev.id === service.id
          ? { ...prev, people_waiting: res.data.people_waiting, estimated_wait_minutes: res.data.estimated_wait_minutes, status: res.data.status }
          : prev
      )
    } catch (err) {
      // keep the last-known numbers if the live refresh fails
    } finally {
      setRefreshingLive(false)
    }
  }

  function closeConfirm() {
    if (joining) return
    setPendingService(null)
    setJoinError('')
    setExistingEntry(null)
  }

  function goToStatus(queueId, entryId) {
    navigate(`/queue/${queueId}`, {
      state: { entryId },
    })
  }

  async function confirmJoin() {
    if (!pendingService) return

    // Already known to be in this queue from a previous 409 — skip the
    // join call entirely and go straight to the status screen.
    if (existingEntry) {
      goToStatus(existingEntry.queue_id, existingEntry.entry_id)
      return
    }

    setJoining(true)
    setJoinError('')

    try {
      const res = await queuesApi.join(pendingService.id)
      const { queue_id, entry_id, token, position, estimated_wait_minutes } = res.data
      navigate(`/queue/${queue_id}`, {
        state: {
          entryId: entry_id,
          token,
          position,
          estimatedWaitMinutes: estimated_wait_minutes,
          serviceName: pendingService.name,
        },
      })
    } catch (err) {
      const detail = err.response?.data?.detail

      if (err.response?.status === 409 && detail?.entry_id && detail?.queue_id) {
        setExistingEntry({ entry_id: detail.entry_id, queue_id: detail.queue_id })
        setJoinError(detail.message || "You're already in this queue.")
      } else {
        setJoinError(
          (typeof detail === 'string' ? detail : detail?.message) ||
            'Could not join the queue. Please try again.'
        )
      }
    } finally {
      setJoining(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">Find services</h1>
        <p className="mt-1 text-sm text-slate-500">
          Search nearby clinics and hospitals and join a queue in seconds.
        </p>
      </div>

      <div className="relative">
        <Search
          size={18}
          className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search organizations, dentist, homeopathic..."
          className="field-input pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={
              c === category
                ? 'rounded-full bg-ink-900 px-4 py-1.5 font-display text-sm font-semibold text-paper dark:bg-paper dark:text-ink-900'
                : 'rounded-full border border-ink-900/15 px-4 py-1.5 font-display text-sm font-semibold text-ink-900 transition hover:border-ink-900/30 dark:border-paper/15 dark:text-paper dark:hover:border-paper/30'
            }
          >
            {c}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="text-sm text-slate-500">Loading services...</p>
        </div>
      ) : loadError ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display font-semibold text-ink-900 dark:text-paper">{loadError}</p>
          <button className="btn-primary mt-2" onClick={loadServices}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display font-semibold text-ink-900 dark:text-paper">No services found</p>
          <p className="text-sm text-slate-500">
            Try a different search term or category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {filtered.map((service) => (
            <div key={service.id} className="card flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display font-semibold text-ink-900 dark:text-paper">{service.name}</p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <p className="text-xs uppercase tracking-widest text-slate-400">
                      {CATEGORY_LABELS[service.category] || 'Healthcare'}
                    </p>
                    {service.specialization && (
                      <span className="rounded-full bg-ink-900/5 px-2 py-0.5 text-xs font-medium text-ink-900/70 dark:bg-paper/10 dark:text-paper/70">
                        {service.specialization}
                      </span>
                    )}
                  </div>
                </div>
                <StatusBadge status={toDisplayStatus(service.status)} />
              </div>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-900/80 dark:text-paper/80">
                <span className="flex items-center gap-1.5">
                  <Users size={14} className="text-slate-400" />
                  {service.people_waiting} waiting
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-slate-400" />
                  {service.estimated_wait_minutes} min
                </span>
                {service.city && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-slate-400" />
                    {service.city}
                  </span>
                )}
              </div>

              <button
                className="btn-primary mt-1 self-start"
                disabled={service.status !== 'open'}
                onClick={() => openConfirm(service)}
              >
                {service.status === 'open' ? 'Join queue' : 'Queue unavailable'}
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!pendingService}
        title={`Join queue at ${pendingService?.name ?? ''}?`}
        description={
          pendingService
            ? refreshingLive
              ? 'Checking live queue...'
              : `${pendingService.people_waiting} people are currently waiting. Estimated wait is ${pendingService.estimated_wait_minutes} min. You'll get a token and can track your position live.`
            : ''
        }
        confirmLabel={existingEntry ? 'View status' : 'Join queue'}
        loading={joining}
        error={joinError}
        onConfirm={confirmJoin}
        onCancel={closeConfirm}
      />
    </div>
  )
}