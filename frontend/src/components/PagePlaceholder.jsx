export default function PagePlaceholder({ title, description }) {
  return (
    <div className="card flex min-h-[60vh] flex-col items-center justify-center p-12 text-center">
      <div className="flap-digit mb-5 h-12 w-12 text-xl">…</div>
      <h1 className="font-display text-xl font-bold text-ink-900 dark:text-paper">{title}</h1>
      <p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p>
    </div>
  )
}