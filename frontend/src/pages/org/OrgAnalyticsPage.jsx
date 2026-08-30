import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Users, Hourglass, Clock, Activity, CheckCircle2, UserX } from 'lucide-react'

// Illustrative data — replace with a call to GET /api/organizations/:id/analytics
// once the backend analytics module (Phase 5) is built. Shapes below mirror
// what that response is expected to look like.

const SUMMARY = [
  { label: 'Visitors', value: 9, icon: Users },
  { label: 'Waiting', value: 0, icon: Hourglass },
  { label: 'Avg Wait', value: '1.6m', icon: Clock },
  { label: 'Avg Service', value: '0.4m', icon: Activity },
  { label: 'Completed', value: 5, icon: CheckCircle2 },
  { label: 'No Shows', value: 3, icon: UserX },
]

const VISITORS_BY_DAY = [
  { day: 'Mon', visitors: 14 },
  { day: 'Tue', visitors: 18 },
  { day: 'Wed', visitors: 11 },
  { day: 'Thu', visitors: 22 },
  { day: 'Fri', visitors: 27 },
  { day: 'Sat', visitors: 19 },
  { day: 'Sun', visitors: 9 },
]

const WAIT_TRENDS = [
  { day: 'Mon', avgWait: 5.2, avgService: 3.1 },
  { day: 'Tue', avgWait: 6.8, avgService: 3.4 },
  { day: 'Wed', avgWait: 4.5, avgService: 2.9 },
  { day: 'Thu', avgWait: 7.9, avgService: 3.8 },
  { day: 'Fri', avgWait: 9.1, avgService: 4.2 },
  { day: 'Sat', avgWait: 6.3, avgService: 3.6 },
  { day: 'Sun', avgWait: 3.4, avgService: 2.4 },
]

const OUTCOME_BREAKDOWN = [
  { name: 'Completed', value: 5 },
  { name: 'No Shows', value: 3 },
  { name: 'Cancelled', value: 1 },
]

const PEAK_HOURS = [
  { hour: '9am', visitors: 3 },
  { hour: '10am', visitors: 6 },
  { hour: '11am', visitors: 9 },
  { hour: '12pm', visitors: 14 },
  { hour: '1pm', visitors: 12 },
  { hour: '2pm', visitors: 8 },
  { hour: '3pm', visitors: 10 },
  { hour: '4pm', visitors: 7 },
  { hour: '5pm', visitors: 4 },
]

// Reads --color-* CSS variables at render time isn't set up in this
// project, so these are hardcoded to match tailwind.config.js.
const COLORS = {
  amber: '#E89422',
  ink900: '#12172B',
  ink700: '#262E52',
  go: '#4ADE80',
  stop: '#F0625E',
  wait: '#F2A93B',
}
const OUTCOME_COLORS = [COLORS.go, COLORS.stop, COLORS.wait]

function ChartCard({ title, children }) {
  return (
    <div className="card p-6">
      <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper">{title}</h2>
      {children}
    </div>
  )
}

export default function OrgAnalyticsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          Queue performance, wait times, and outcomes over the last 7 days.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {SUMMARY.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <div className="mb-1 flex items-center gap-1.5 text-xs uppercase tracking-widest text-slate-500">
              <Icon size={13} className="text-amber-500" />
              {label}
            </div>
            <p className="font-display text-2xl font-bold text-ink-900 dark:text-paper">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Visitors by day">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={VISITORS_BY_DAY}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-900/10 dark:text-paper/10" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" />
              <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="visitors" stroke={COLORS.amber} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Wait time trends (minutes)">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={WAIT_TRENDS}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-900/10 dark:text-paper/10" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" />
              <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="avgWait" name="Avg wait" stroke={COLORS.stop} strokeWidth={2.5} dot={{ r: 3 }} />
              <Line type="monotone" dataKey="avgService" name="Avg service" stroke={COLORS.ink700} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Completed vs No-shows vs Cancelled">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={OUTCOME_BREAKDOWN}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={({ name, value }) => `${name}: ${value}`}
              >
                {OUTCOME_BREAKDOWN.map((entry, i) => (
                  <Cell key={entry.name} fill={OUTCOME_COLORS[i % OUTCOME_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Peak hours today">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={PEAK_HOURS}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-ink-900/10 dark:text-paper/10" />
              <XAxis dataKey="hour" tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" />
              <YAxis tick={{ fontSize: 12 }} stroke="currentColor" className="text-slate-500" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="visitors" fill={COLORS.amber} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}