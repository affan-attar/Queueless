# QueueLess — Predictive Queue Management Platform

## Status: Phase 1 complete (foundation)

This repo currently contains a **working, tested foundation**:
- Full Supabase Postgres schema (`database/schema.sql`) — all core tables, RLS
  policies, indexes, and a concurrency-safe `issue_next_token()` function that
  guarantees no two customers ever get the same token number, even under
  simultaneous joins.
- FastAPI backend skeleton (`backend/`) with modular structure and a working
  JWT-based auth flow: register (customer / org admin), login, forgot password,
  `/me`, and role-based access control (`require_role(...)` dependency).

Not yet built: organizations/services/queues CRUD, the queue-join/call/skip
flow, realtime updates, notifications, analytics, and the React frontend.
See **Roadmap** below — the schema and auth module were built to support all
of it without rework.

---

## Setup

### 1. Prerequisites
- Node.js 20+
- Python 3.11+
- A free Supabase project (https://supabase.com)

### 2. Create the Supabase project
1. Create a new project at supabase.com.
2. In the SQL Editor, paste and run `database/schema.sql` in full.
3. Under Project Settings → API, copy: Project URL, `anon` public key,
   `service_role` secret key.
4. Under Project Settings → API → JWT Settings, copy the JWT secret.

### 3. Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# fill in .env with your Supabase URL/keys and JWT secret
uvicorn app.main:app --reload --port 8000
```
Visit http://localhost:8000/docs for interactive API docs.

### 4. Frontend (scaffold to be added in Phase 6)
```bash
cd frontend
npm install
npm run dev
```

### 5. Test the auth flow
```bash
curl -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"role":"customer","full_name":"Test User","email":"test@example.com","phone":"9999999999","password":"password123","confirm_password":"password123"}'

curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

## Roadmap (phases 2–7)

| Phase | Scope |
|---|---|
| 2 | Organizations, services, queues, counters CRUD + RBAC-protected endpoints |
| 3 | Token issuance (`issue_next_token`), join/call/skip/complete flow, wait-time formula |
| 4 | Supabase Realtime subscriptions, in-app + email notifications, background tasks |
| 5 | Analytics endpoints + Recharts dashboards (org admin) |
| 6 | React/Vite/Tailwind frontend — auth pages, customer flow, org admin, staff console |
| 7 | ML: historical data export, Random Forest wait-time predictor, `/prediction` endpoint |

## Architecture notes for whoever continues this

- **Two Supabase clients** (`backend/app/database.py`): `get_anon_client()`
  respects RLS and should back most reads; `get_service_client()` bypasses RLS
  and is used only for trusted server-side writes (profile creation, token
  issuance, notification dispatch). Never send the service key to the frontend.
- **Token uniqueness** is enforced at the database level two ways: the
  `issue_next_token()` Postgres function locks the queue row (`FOR UPDATE`)
  before incrementing, and `uq_one_active_entry_per_user` is a partial unique
  index preventing a user from holding two active tokens in the same queue.
- **RBAC** is a FastAPI dependency (`require_role("org_admin")` etc. in
  `app/auth/dependencies.py`) — apply it to every mutating endpoint in later
  phases, not just auth.
- Continue this build in **Claude Code**, working directly in this repo, so
  each phase can be tested against a live Supabase project as it's built.

---
import { Building2, Clock, Users, History, Heart, Search, Bell } from 'lucide-react'
import StatusBadge from '../../components/ui/StatusBadge'
import ProgressBar from '../../components/ui/ProgressBar'

// Illustrative data — replace with real API calls once Phase 2/3 land.
const activeQueue = {
  organization: 'CityCare Clinic',
  service: 'General Consultation',
  yourToken: 'A-047',
  nowServing: 'A-035',
  peopleAhead: 12,
  totalAheadAtJoin: 20,
  estimatedWaitMinutes: 36,
  status: 'active',
}

const recentHistory = [
  { name: 'Glow Salon & Spa', date: 'Aug 18', status: 'Completed' },
  { name: 'National Bank — MG Road', date: 'Aug 12', status: 'Cancelled' },
]

const favorites = [
  { name: 'CityCare Clinic', category: 'Healthcare' },
  { name: 'Glow Salon & Spa', category: 'Salon' },
]

export default function CustomerDashboardPage() {
  const servedSoFar = activeQueue.totalAheadAtJoin - activeQueue.peopleAhead

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900">Your queue</h1>
        <p className="mt-1 text-sm text-slate-500">
          Live position and estimated wait time, updated in real time.
        </p>
      </div>

      <div className="card overflow-hidden">
        <div className="bg-ink-900 px-6 py-5 text-paper">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Building2 size={16} />
              {activeQueue.organization}
            </div>
            <StatusBadge status={activeQueue.status} />
          </div>
          <p className="mt-1 font-display text-lg font-semibold">{activeQueue.service}</p>
        </div>

        <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-3">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-500">
              Your token
            </p>
            <div className="flex gap-1.5">
              {activeQueue.yourToken.split('').map((ch, i) => (
                <div key={i} className="flap-digit h-14 w-10 text-xl">{ch}</div>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-slate-500">
              Currently serving
            </p>
            <div className="flex gap-1.5">
              {activeQueue.nowServing.split('').map((ch, i) => (
                <div key={i} className="flap-digit h-14 w-10 text-xl bg-ink-700 text-amber-400">
                  {ch}
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-2 text-ink-900">
              <Users size={16} className="text-slate-500" />
              <span className="text-sm">
                <strong>{activeQueue.peopleAhead}</strong> people ahead
              </span>
            </div>
            <div className="flex items-center gap-2 text-ink-900">
              <Clock size={16} className="text-slate-500" />
              <span className="text-sm">
                Est. wait <strong>{activeQueue.estimatedWaitMinutes} min</strong>
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-ink-900/10 px-6 py-4">
          <div className="mb-2 flex items-center justify-between font-mono text-xs uppercase tracking-widest text-slate-500">
            <span>Queue progress</span>
            <span>
              {servedSoFar} / {activeQueue.totalAheadAtJoin} served
            </span>
          </div>
          <ProgressBar value={servedSoFar} max={activeQueue.totalAheadAtJoin} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Search size={16} className="text-amber-500" />
            <h2 className="font-display font-semibold text-ink-900">Quick actions</h2>
          </div>
          <div className="space-y-2">
            <a href="/find-services" className="btn-secondary w-full">
              <Search size={15} /> Find a service
            </a>
            <a href="/notifications" className="btn-secondary w-full">
              <Bell size={15} /> View notifications
            </a>
          </div>
        </div>

        <div className="card p-6 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <History size={16} className="text-amber-500" />
            <h2 className="font-display font-semibold text-ink-900">Recent history</h2>
          </div>
          {recentHistory.length === 0 ? (
            <p className="text-sm text-slate-500">
              Completed and cancelled queue visits will appear here.
            </p>
          ) : (
            <ul className="space-y-3">
              {recentHistory.map((item) => (
                <li key={item.name} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-ink-900">{item.name}</p>
                    <p className="text-xs text-slate-400">{item.date}</p>
                  </div>
                  <span
                    className={
                      item.status === 'Completed'
                        ? 'text-xs font-medium text-signal-go'
                        : 'text-xs font-medium text-signal-stop'
                    }
                  >
                    {item.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card p-6 lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Heart size={16} className="text-amber-500" />
            <h2 className="font-display font-semibold text-ink-900">Favorite organizations</h2>
          </div>
          {favorites.length === 0 ? (
            <p className="text-sm text-slate-500">
              Save organizations you visit often for one-tap queue joining.
            </p>
          ) : (
            <ul className="space-y-3">
              {favorites.map((org) => (
                <li key={org.name} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-ink-900">{org.name}</p>
                    <p className="text-xs text-slate-400">{org.category}</p>
                  </div>
                  <button className="text-xs font-medium text-amber-500 hover:text-amber-600">
                    Join
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}