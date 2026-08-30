import { useEffect, useState } from 'react'
import { Ticket, Clock } from 'lucide-react'
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
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
}

function isSameDay(iso, dateStr) {
  if (!iso || !dateStr) return true
  return iso.slice(0, 10) === dateStr
}

export default function OrgQueueHistoryPage() {
  const [entries, setEntries] = useState([])
  const [summary, setSummary] = useState({ total_served: 0, cancelled: 0, no_show: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await queuesApi.orgHistory()
      setEntries(res.data.entries || [])
      setSummary(res.data.summary || { total_served: 0, cancelled: 0, no_show: 0 })
    } catch (err) {
      setError('Could not load queue history. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = entries.filter((e) => {
    const matchesStatus = filter === 'ALL' || e.status === filter
    const matchesDate = isSameDay(e.joined_at, dateFilter)
    return matchesStatus && matchesDate
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">Queue history</h1>
        <p className="mt-1 text-sm text-slate-500">Past queue entries for your organization.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Total served</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900 dark:text-paper">{summary.total_served}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">Cancelled</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900 dark:text-paper">{summary.cancelled}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest text-slate-400">No show</p>
          <p className="mt-1 font-display text-2xl font-bold text-ink-900 dark:text-paper">{summary.no_show}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
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
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="field-input w-auto"
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            className="text-sm font-medium text-ink-900/70 hover:text-ink-900 dark:text-paper/70 dark:hover:text-paper"
          >
            Clear date
          </button>
        )}
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
          <p className="text-sm text-slate-500">Finished, cancelled, or missed tokens will show up here.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-ink-900/10 text-xs uppercase tracking-widest text-slate-400 dark:border-paper/10">
                <th className="px-4 py-3">Token</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Date / Time</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Waiting</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.entry_id} className="border-b border-ink-900/5 last:border-0 dark:border-paper/5">
                  <td className="px-4 py-3 font-display font-semibold text-ink-900 dark:text-paper">
                    <span className="flex items-center gap-1.5">
                      <Ticket size={14} className="text-slate-400" />
                      {e.token_label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink-900/80 dark:text-paper/80">{e.service_name}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}