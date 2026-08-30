import { Link } from 'react-router-dom'
import { Search, Bell, Clock } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flap-digit h-9 w-9 text-lg">Q</div>
          <span className="font-display text-lg font-bold text-ink-900">QueueLess</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary">Log in</Link>
          <Link to="/register" className="btn-primary">Get started</Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <p className="mb-4 font-mono text-xs uppercase tracking-widest text-amber-500">
            For hospitals · clinics · offices · banks
          </p>
          <h1 className="font-display text-4xl font-bold leading-[1.1] text-ink-900 sm:text-5xl">
            Skip the line. Not your turn.
          </h1>
          <p className="mt-5 max-w-md text-lg text-slate-500">
            Join queues remotely, track your live position, and get notified
            right before it's your turn — no more standing around.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/register" className="btn-primary">Join a queue</Link>
            <Link to="/register" className="btn-secondary">List your organization</Link>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="bg-ink-900 px-6 py-5 text-paper">
            <p className="text-sm text-slate-400">CityCare Clinic</p>
            <p className="font-display font-semibold">General Consultation</p>
          </div>
          <div className="grid grid-cols-2 gap-4 p-6">
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-500">Your token</p>
              <div className="flex gap-1.5">
                {'A047'.split('').map((c, i) => (
                  <div key={i} className="flap-digit h-12 w-9 text-lg">{c}</div>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-500">Now serving</p>
              <div className="flex gap-1.5">
                {'A035'.split('').map((c, i) => (
                  <div key={i} className="flap-digit h-12 w-9 text-lg bg-ink-700 text-amber-400">{c}</div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-6 pb-24 sm:grid-cols-3">
        {[
          { icon: Search, title: 'Find services nearby', copy: 'Search organizations by type, location, and current wait time.' },
          { icon: Clock, title: 'Predicted wait times', copy: 'Know how long before your turn, updated live as the queue moves.' },
          { icon: Bell, title: 'Timely notifications', copy: 'Get an alert when your turn is approaching and when you\'re called.' },
        ].map(({ icon: Icon, title, copy }) => (
          <div key={title} className="card p-6">
            <Icon className="text-amber-500" size={22} />
            <h3 className="mt-3 font-display font-semibold text-ink-900">{title}</h3>
            <p className="mt-1.5 text-sm text-slate-500">{copy}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
