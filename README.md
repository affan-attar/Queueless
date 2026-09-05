# QueueLess — Predictive Queue Management Platform

QueueLess is a virtual queue management system that lets customers join a queue remotely, track their live position and estimated wait time, and lets organizations (clinics, salons, banks, etc.) manage queues, staff, and services from a dashboard — no physical waiting required.

## Status

**Phase 1 complete** — database schema and authentication are built and tested. Frontend UI scaffolding is in progress. See [Roadmap](#roadmap) below.

## Features (planned end state)

- 🔐 JWT-based authentication with role-based access (customer / org admin / staff)
- 🏢 Organization, service, and queue management
- 🎟️ Concurrency-safe token issuance — no two customers ever get the same queue number
- 📊 Live queue position and estimated wait time
- 🔔 Real-time updates and notifications (in-app + email)
- 📈 Analytics dashboard for organizations
- 🤖 ML-based wait-time prediction (Random Forest)

## Tech Stack

**Frontend:** React, Vite, Tailwind CSS, React Router, React Hook Form, Zod, Recharts
**Backend:** FastAPI (Python), Supabase (PostgreSQL + Auth + Realtime)
**Auth:** JWT with role-based access control

## Project Structure

```
queueless/
├── backend/          # FastAPI backend
│   ├── app/
│   └── requirements.txt
├── frontend/          # React + Vite frontend
│   ├── src/
│   └── package.json
└── database/
    └── schema.sql     # Full Postgres schema, RLS policies, functions
```

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+
- A free [Supabase](https://supabase.com) project

### 1. Clone the repo

```bash
git clone https://github.com/affan-attar/Queueless.git
cd Queueless
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run `database/schema.sql` in full.
3. Under **Project Settings → API**, copy your Project URL, `anon` public key, and `service_role` secret key.
4. Under **Project Settings → API → JWT Settings**, copy the JWT secret.

### 3. Backend setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# fill in .env with your Supabase URL/keys and JWT secret
uvicorn app.main:app --reload --port 8001
```

API docs available at `http://localhost:8001/docs`.

### 4. Frontend setup

```bash
cd frontend
npm install
cp .env.example .env
# fill in .env with your Supabase URL and anon key
npm run dev
```

App runs at `http://localhost:5173`.

### 5. Test the auth flow

```bash
curl -X POST http://localhost:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"role":"customer","full_name":"Test User","email":"test@example.com","phone":"9999999999","password":"password123","confirm_password":"password123"}'

curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

## Roadmap

| Phase | Scope |
|---|---|
| 1 | ✅ Database schema, RLS policies, JWT auth flow |
| 2 | Organizations, services, queues, counters CRUD + RBAC |
| 3 | Token issuance, join/call/skip/complete flow, wait-time formula |
| 4 | Supabase Realtime subscriptions, in-app + email notifications |
| 5 | Analytics endpoints + dashboards |
| 6 | React frontend — auth pages, customer flow, org admin, staff console |
| 7 | ML-based wait-time predictor |

## Architecture Notes

- **Two Supabase clients** (`backend/app/database.py`): the anon client respects Row-Level Security and backs most reads; the service client bypasses RLS and is used only for trusted server-side writes. The service key is never exposed to the frontend.
- **Token uniqueness** is enforced at the database level: `issue_next_token()` locks the queue row before incrementing, and a partial unique index prevents a user from holding two active tokens in the same queue.
- **RBAC** is enforced via a FastAPI dependency (`require_role(...)`) applied to protected endpoints.

## License

This project is currently unlicensed. All rights reserved by the author.