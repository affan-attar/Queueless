const STATUS_MAP = {
  active: { label: 'Active', dot: 'bg-signal-go', text: 'text-signal-go' },
  busy: { label: 'Busy', dot: 'bg-signal-wait', text: 'text-signal-wait' },
  closed: { label: 'Closed', dot: 'bg-signal-stop', text: 'text-signal-stop' },
}

export default function StatusBadge({ status = 'active' }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.active
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-widest">
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      <span className={s.text}>{s.label}</span>
    </span>
  )
}