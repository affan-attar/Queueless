export default function ProgressBar({ value = 0, max = 100 }) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-900/10">
      <div
        className="h-full rounded-full bg-amber-500 transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}