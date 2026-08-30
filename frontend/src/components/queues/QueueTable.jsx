import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

function elapsedMinutes(joinedAt) {
  const joined = new Date(joinedAt).getTime()
  const now = Date.now()
  const mins = Math.floor((now - joined) / 60000)
  return mins < 1 ? '<1' : mins
}

export default function QueueTable({ entries }) {
  const [, forceTick] = useState(0)

  // Re-render every 30s so "waiting Xm" stays live without any fake
  // position/wait simulation — this only recomputes elapsed time from
  // the real joined_at timestamp already returned by the backend.
  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), 30000)
    return () => clearInterval(interval)
  }, [])

  const waitingEntries = entries.filter((e) => e.status === 'WAITING')

  if (waitingEntries.length === 0) {
    return (
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-display font-semibold text-ink-900 dark:text-paper">Queue</p>
          <span className="text-xs text-slate-500">0 waiting</span>
        </div>
        <p className="py-10 text-center text-sm text-slate-500">No one is waiting right now.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-6">
        <p className="font-display font-semibold text-ink-900 dark:text-paper">Queue</p>
        <span className="flex items-center gap-1 text-xs text-slate-500">
          {waitingEntries.length} waiting
        </span>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-900/10 text-left text-xs uppercase tracking-widest text-slate-400 dark:border-paper/10">
              <th className="px-6 py-3 font-medium">Token</th>
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Joined</th>
              <th className="px-6 py-3 font-medium">Waiting</th>
              <th className="px-6 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {waitingEntries.map((entry) => (
              <tr
                key={entry.id}
                className="border-b border-ink-900/5 last:border-0 dark:border-paper/5"
              >
                <td className="px-6 py-3 font-mono font-semibold text-ink-900 dark:text-paper">
                  {entry.token_label}
                  {entry.already_held && (
                    <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-600 dark:text-amber-400">
                      Held
                    </span>
                  )}
                </td>
                <td className="px-6 py-3 text-ink-900/80 dark:text-paper/80">
                  {entry.customer_name || '—'}
                </td>
                <td className="px-6 py-3 text-ink-900/80 dark:text-paper/80">
                  {new Date(entry.joined_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </td>
                <td className="px-6 py-3 text-ink-900/80 dark:text-paper/80">
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} className="text-slate-400" />
                    ~{elapsedMinutes(entry.joined_at)} min
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className="rounded-full bg-slate-500/10 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {entry.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}