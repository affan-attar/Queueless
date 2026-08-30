import { useEffect, useState } from 'react'
import { Building2, Clock, Ticket } from 'lucide-react'
import { queuesApi } from '../../api/queues'

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
  { key: 'NO_SHOW', label: 'No Show' },
]

const STATUS_STYLES = {
  COMPLETED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  CANCELLED: 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
  NO_SHOW: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  SKIPPED: 'bg-slate-200 text-slate-700 dark:bg-slate-500/10 dark:text-slate-400',
}

function StatusPill({ status }) {
  const cls = STATUS_STYLES[status] || 'bg-slate-200 text-slate-700'
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  )
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function QueueHistoryPage() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await queuesApi.history()
      setEntries(res.data.entries || [])
    } catch (err) {
      setError('Could not load your queue history. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = entries.filter((e) => filter === 'ALL' || e.status === filter)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">Queue history</h1>
        <p className="mt-1 text-sm text-slate-500">
          Past queues you've joined — completed, cancelled, skipped, or missed.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              f.key === filter
                ? 'rounded-full bg-ink-900 px-4 py-1.5 font-display text-sm font-semibold text-paper dark:bg-paper dark:text-ink-900'
                : 'rounded-full border border-ink-900/15 px-4 py-1.5 font-display text-sm font-semibold text-ink-900 transition hover:border-ink-900/30 dark:border-paper/15 dark:text-paper dark:hover:border-paper/30'
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="text-sm text-slate-500">Loading history...</p>
        </div>
      ) : error ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display font-semibold text-ink-900 dark:text-paper">{error}</p>
          <button className="btn-primary mt-2" onClick={load}>Retry</button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-6 py-16 text-center">
          <p className="font-display font-semibold text-ink-900 dark:text-paper">No queue history yet</p>
          <p className="text-sm text-slate-500">Queues you've joined will show up here once they finish.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-900/10 text-xs uppercase tracking-widest text-slate-400 dark:border-paper/10">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Waiting</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.entry_id} className="border-b border-ink-900/5 last:border-0 dark:border-paper/5">
                  <td className="px-4 py-3 text-ink-900 dark:text-paper">
                    <span className="flex items-center gap-1.5">
                      <Building2 size={14} className="text-slate-400" />
                      {e.organization_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-900/80 dark:text-paper/80">{e.service_name}</td>
                  <td className="px-4 py-3 font-display font-semibold text-ink-900 dark:text-paper">
                    <span className="flex items-center gap-1.5">
                      <Ticket size={14} className="text-slate-400" />
                      {e.token_label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-900/70 dark:text-paper/70">{formatDateTime(e.joined_at)}</td>
                  <td className="px-4 py-3"><StatusPill status={e.status} /></td>
                  <td className="px-4 py-3 text-ink-900/70 dark:text-paper/70">
                    {e.waiting_minutes != null ? (
                      <span className="flex items-center gap-1.5">
                        <Clock size={14} className="text-slate-400" />
                        {e.waiting_minutes} min
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelected(e)}
                      className="text-sm font-medium text-ink-900 underline-offset-2 hover:underline dark:text-paper"
                    >
                      View details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="card w-full max-w-sm space-y-4 p-6">
            <h2 className="font-display text-lg font-bold text-ink-900 dark:text-paper">{selected.token_label}</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-slate-500">Organization</dt><dd className="text-ink-900 dark:text-paper">{selected.organization_name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Service</dt><dd className="text-ink-900 dark:text-paper">{selected.service_name}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd><StatusPill status={selected.status} /></dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Joined</dt><dd className="text-ink-900 dark:text-paper">{formatDateTime(selected.joined_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Completed</dt><dd className="text-ink-900 dark:text-paper">{formatDateTime(selected.completed_at)}</dd></div>
              <div className="flex justify-between"><dt className="text-slate-500">Waiting time</dt><dd className="text-ink-900 dark:text-paper">{selected.waiting_minutes != null ? `${selected.waiting_minutes} min` : '—'}</dd></div>
            </dl>
            <button className="btn-primary w-full" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}