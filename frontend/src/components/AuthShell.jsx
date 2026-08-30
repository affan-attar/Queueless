export default function AuthShell({ eyebrow, title, subtitle, children }) {
  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left: brand panel with signature split-flap token motif */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-ink-900 p-10 text-paper lg:flex">
        <div className="flex items-center gap-2">
          <div className="flap-digit h-9 w-9 text-lg">Q</div>
          <span className="font-display text-lg font-bold">QueueLess</span>
        </div>

        <div>
          <p className="mb-3 font-mono text-sm uppercase tracking-widest text-amber-400">
            Now Serving
          </p>
          <div className="mb-8 flex gap-2">
            {'GEN-047'.split('').map((ch, i) => (
              <div key={i} className="flap-digit h-16 w-12 text-2xl">
                {ch}
              </div>
            ))}
          </div>
          <h1 className="max-w-md font-display text-3xl font-bold leading-tight">
            Join the queue from anywhere. Arrive right when it's your turn.
          </h1>
          <p className="mt-3 max-w-sm text-slate-400">
            Live positions and predicted wait times for hospitals, banks,
            government offices and more.
          </p>
        </div>

        <p className="font-mono text-xs text-slate-400">
          © {new Date().getFullYear()} QueueLess
        </p>
      </div>

      {/* Right: form panel */}
      <div className="flex items-center justify-center bg-paper px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flap-digit h-8 w-8 text-base">Q</div>
            <span className="font-display text-lg font-bold">QueueLess</span>
          </div>
          {eyebrow && (
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-amber-500">
              {eyebrow}
            </p>
          )}
          <h2 className="font-display text-2xl font-bold text-ink-900">{title}</h2>
          {subtitle && <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
