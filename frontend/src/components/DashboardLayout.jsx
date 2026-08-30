import { NavLink, Outlet } from 'react-router-dom'
import {
  LayoutGrid, Search, Bell, User, Building2, ListOrdered,
  BarChart3, Settings, MonitorSpeaker, LogOut, History,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const NAV = {
  customer: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { to: '/services', label: 'Find Services', icon: Search },
    { to: '/history', label: 'Queue History', icon: History },
    { to: '/notifications', label: 'Notifications', icon: Bell },
    { to: '/profile', label: 'Profile', icon: User },
  ],
  org_admin: [
    { to: '/organization/dashboard', label: 'Dashboard', icon: LayoutGrid },
    { to: '/organization/services', label: 'Services', icon: Building2 },
    { to: '/organization/queues', label: 'Queues', icon: ListOrdered },
    { to: '/organization/history', label: 'Queue History', icon: History },
    { to: '/organization/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/organization/settings', label: 'Settings', icon: Settings },
  ],
  staff: [
    { to: '/staff/dashboard', label: 'My Counter', icon: MonitorSpeaker },
    { to: '/profile', label: 'Profile', icon: User },
  ],
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const items = NAV[user?.role] || NAV.customer

  return (
    <div className="flex min-h-screen bg-paper dark:bg-ink-950">
      <aside className="flex w-64 flex-col border-r border-ink-900/10 bg-white px-4 py-6 dark:border-paper/10 dark:bg-ink-900">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flap-digit h-8 w-8 text-base">Q</div>
          <span className="font-display text-lg font-bold text-ink-900 dark:text-paper">QueueLess</span>
        </div>

        <nav className="flex-1 space-y-1">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-ink-900 text-paper dark:bg-paper dark:text-ink-900'
                    : 'text-ink-900/70 hover:bg-ink-900/5 hover:text-ink-900 dark:text-paper/70 dark:hover:bg-paper/10 dark:hover:text-paper'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-ink-900/10 pt-4 dark:border-paper/10">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-semibold text-ink-900 dark:text-paper">{user?.full_name}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role?.replace('_', ' ')}</p>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-900/70 hover:bg-ink-900/5 hover:text-ink-900 dark:text-paper/70 dark:hover:bg-paper/10 dark:hover:text-paper"
          >
            <LogOut size={18} />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <Outlet />
      </main>
    </div>
  )
}