import { useState, useEffect, useCallback, useRef } from 'react'
import { PhoneCall, Pause, CheckCircle2, XCircle, UserX } from 'lucide-react'
import { queuesApi } from '../../api/queues'
import { supabase } from '../../api/supabase'
import QueueTable from '../../components/queues/QueueTable'

function StatusPill({ status }) {
  const map = {
    open: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    paused: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    closed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${map[status] || map.open}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status?.toUpperCase()}
    </span>
  )
}

export default function OrgQueuesPage() {
  const [myQueue, setMyQueue] = useState(null)
  const [liveData, setLiveData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState('')
  const [live, setLive] = useState(false)
  const queueIdRef = useRef(null)

  const loadLiveQueue = useCallback(async (queueId) => {
    try {
      const { data } = await queuesApi.live(queueId)
      setLiveData(data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not load the live queue.')
    }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      setError('')
      try {
        const { data } = await queuesApi.mine()
        setMyQueue(data)
        queueIdRef.current = data.queue_id
        await loadLiveQueue(data.queue_id)
      } catch (err) {
        setError(err.response?.data?.detail || 'Could not load your queue.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [loadLiveQueue])

  // Supabase Realtime subscription — auto-refresh whenever any entry in
  // this queue changes (join, call-next, hold, complete, no-show, cancel).
  useEffect(() => {
    if (!myQueue?.queue_id) return

    const channel = supabase
      .channel(`queue-entries-${myQueue.queue_id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'queue_entries',
          filter: `queue_id=eq.${myQueue.queue_id}`,
        },
        () => {
          loadLiveQueue(myQueue.queue_id)
        }
      )
      .subscribe((status) => {
        setLive(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [myQueue?.queue_id, loadLiveQueue])

  async function handleCallNext() {
    if (!myQueue) return
    setActionBusy(true)
    setError('')
    try {
      await queuesApi.callNext(myQueue.queue_id)
      await loadLiveQueue(myQueue.queue_id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not call the next token.')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleEntryAction(entryId, newStatus) {
    setActionBusy(true)
    setError('')
    try {
      await queuesApi.setEntryStatus(entryId, newStatus)
      await loadLiveQueue(myQueue.queue_id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not update the token.')
    } finally {
      setActionBusy(false)
    }
  }

  async function handleHold(entryId) {
    setActionBusy(true)
    setError('')
    try {
      await queuesApi.hold(entryId)
      await loadLiveQueue(myQueue.queue_id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not hold this token.')
    } finally {
      setActionBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flap-digit h-14 w-14 text-2xl animate-pulse">•</div>
      </div>
    )
  }

  if (error && !myQueue) {
    return (
      <div className="card p-8 text-center">
        <p className="font-display font-semibold text-ink-900 dark:text-paper">Live Queue</p>
        <p className="mt-2 text-sm text-signal-stop">{error}</p>
      </div>
    )
  }

  const nowServing = liveData?.now_serving
  const waiting = liveData?.waiting || []

  return (
    <div className="space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">Live Queue</h1>
          <p className="mt-1 text-sm text-slate-500">
            {myQueue?.service_name} — manage tokens as they come in.
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className={`h-2 w-2 rounded-full ${live ? 'bg-signal-go' : 'bg-slate-300'}`} />
          {live ? 'Live' : 'Connecting...'}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-signal-stop/30 bg-signal-stop/5 p-3 text-sm text-signal-stop">
          {error}
        </div>
      )}

      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display font-semibold text-ink-900 dark:text-paper">
            {myQueue?.service_name}
          </h2>
          <StatusPill status={liveData?.queue_status} />
        </div>

        <div className="flex flex-col items-center gap-2 py-6">
          <p className="text-xs uppercase tracking-widest text-slate-400">Current Token</p>
          <p className="font-mono text-5xl font-bold text-ink-900 dark:text-paper">
            {nowServing ? nowServing.token_label : '—'}
          </p>

          {nowServing && (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                onClick={() => handleEntryAction(nowServing.id, 'COMPLETED')}
                disabled={actionBusy}
                className="btn-primary"
              >
                <CheckCircle2 size={16} />
                Complete
              </button>
              {!nowServing.already_held && (
                <button
                  onClick={() => handleHold(nowServing.id)}
                  disabled={actionBusy}
                  className="btn-secondary"
                >
                  <Pause size={16} />
                  Hold
                </button>
              )}
              <button
                onClick={() => handleEntryAction(nowServing.id, 'NO_SHOW')}
                disabled={actionBusy}
                className="btn-secondary text-signal-stop"
              >
                <UserX size={16} />
                No Show
              </button>
              <button
                onClick={() => handleEntryAction(nowServing.id, 'CANCELLED')}
                disabled={actionBusy}
                className="btn-secondary text-signal-stop"
              >
                <XCircle size={16} />
                Cancel
              </button>
            </div>
          )}

          {!nowServing && (
            <button
              onClick={handleCallNext}
              disabled={actionBusy || waiting.length === 0}
              className="btn-primary mt-4"
            >
              <PhoneCall size={16} />
              Call Next
            </button>
          )}
        </div>
      </div>

      <QueueTable entries={waiting} />

    </div>
  )
}