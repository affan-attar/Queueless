import { useState, useEffect } from 'react'
import {
  Bell,
  MapPin,
  Moon,
  KeyRound,
  LogOut,
  Pencil,
  Mail,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { Link } from 'react-router-dom'
import ChangePasswordModal from '../components/ui/ChangePasswordModal'
import ChangeEmailModal from '../components/ui/ChangeEmailModal'
import { notificationsApi } from '../api/notifications'

function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('')
}

/* Toggle Component */
function Toggle({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      disabled={disabled}
      className={`relative h-6 w-11 rounded-full transition-colors duration-200 ${
        checked ? 'bg-ink-900' : 'bg-ink-900/15'
      } ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[22px]' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

export default function ProfilePage() {
  const { user, logout, setUser } = useAuth()
  const { darkMode, setDarkMode } = useTheme()

  /*
   * IMPORTANT:
   * Notifications and Location are OFF by default.
   *
   * If localStorage contains "true", they will stay ON.
   * Otherwise they start OFF.
   */
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem('notificationsEnabled') === 'true'
  )

  const [location, setLocation] = useState(
    () => localStorage.getItem('locationEnabled') === 'true'
  )

  const [notifBusy, setNotifBusy] = useState(false)
  const [locBusy, setLocBusy] = useState(false)

  const [locError, setLocError] = useState('')
  const [notifError, setNotifError] = useState('')

  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showChangeEmail, setShowChangeEmail] = useState(false)

  /* -----------------------------------------
     Server-side email/notification preferences
  ----------------------------------------- */
  const [prefs, setPrefs] = useState(null)
  const [prefsLoading, setPrefsLoading] = useState(true)
  const [prefsBusyKey, setPrefsBusyKey] = useState(null)
  const [prefsError, setPrefsError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadPrefs() {
      try {
        const res = await notificationsApi.getPreferences()
        if (!cancelled) setPrefs(res.data)
      } catch (err) {
        if (!cancelled) setPrefsError('Could not load notification settings.')
      } finally {
        if (!cancelled) setPrefsLoading(false)
      }
    }
    loadPrefs()
    return () => {
      cancelled = true
    }
  }, [])

  async function togglePref(key, next) {
    setPrefsError('')
    const previous = prefs
    setPrefs((p) => ({ ...p, [key]: next }))
    setPrefsBusyKey(key)
    try {
      const res = await notificationsApi.updatePreferences({ [key]: next })
      setPrefs(res.data)
    } catch (err) {
      setPrefs(previous)
      setPrefsError('Could not update setting. Please try again.')
    } finally {
      setPrefsBusyKey(null)
    }
  }

  /* -----------------------------------------
     Notification permission listener
  ----------------------------------------- */

  useEffect(() => {
    if (!('permissions' in navigator)) return

    let permissionStatus = null

    navigator.permissions
      .query({ name: 'notifications' })
      .then((status) => {
        permissionStatus = status

        const handlePermissionChange = () => {
          if (status.state !== 'granted') {
            setNotifications(false)
            localStorage.setItem('notificationsEnabled', 'false')
          }
        }

        status.addEventListener('change', handlePermissionChange)

        return () => {
          status.removeEventListener(
            'change',
            handlePermissionChange
          )
        }
      })
      .catch(() => {})

    return () => {
      permissionStatus = null
    }
  }, [])

  /* -----------------------------------------
     Notifications Toggle
  ----------------------------------------- */

  const handleNotificationsToggle = async (next) => {
    setNotifError('')

    /* Turn OFF */
    if (!next) {
      setNotifications(false)
      localStorage.setItem('notificationsEnabled', 'false')
      return
    }

    /* Browser doesn't support notifications */
    if (!('Notification' in window)) {
      setNotifError(
        'Notifications are not supported in this browser.'
      )
      return
    }

    setNotifBusy(true)

    try {
      const permission = await Notification.requestPermission()

      if (permission === 'granted') {
        setNotifications(true)

        localStorage.setItem(
          'notificationsEnabled',
          'true'
        )

        new Notification('QueueLess', {
          body: "You're all set — you'll get notified when it's your turn.",
        })
      } else {
        setNotifications(false)

        localStorage.setItem(
          'notificationsEnabled',
          'false'
        )

        setNotifError(
          permission === 'denied'
            ? 'Notifications are blocked. Enable them in your browser site settings.'
            : 'Notification permission was not granted.'
        )
      }
    } finally {
      setNotifBusy(false)
    }
  }

  /* -----------------------------------------
     Location Toggle
  ----------------------------------------- */

  const handleLocationToggle = (next) => {
    setLocError('')

    /* Turn OFF */
    if (!next) {
      setLocation(false)

      localStorage.setItem(
        'locationEnabled',
        'false'
      )

      return
    }

    /* Browser doesn't support location */
    if (!('geolocation' in navigator)) {
      setLocError(
        'Location is not supported in this browser.'
      )
      return
    }

    setLocBusy(true)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(true)

        localStorage.setItem(
          'locationEnabled',
          'true'
        )

        localStorage.setItem(
          'lastKnownLocation',
          JSON.stringify({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            at: Date.now(),
          })
        )

        setLocBusy(false)
      },

      (err) => {
        setLocation(false)

        localStorage.setItem(
          'locationEnabled',
          'false'
        )

        setLocError(
          err.code === err.PERMISSION_DENIED
            ? 'Location access denied. Enable it in your browser site settings.'
            : 'Could not get your location. Try again.'
        )

        setLocBusy(false)
      },

      {
        enableHighAccuracy: false,
        timeout: 8000,
      }
    )
  }

  /* -----------------------------------------
     User Role
  ----------------------------------------- */

  const roleLabel =
    user?.role === 'org_admin'
      ? 'Organization Admin'
      : user?.role === 'staff'
      ? 'Staff'
      : 'Customer'

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* PAGE HEADER */}
      <div>
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-paper">
          Profile
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Manage your account and preferences.
        </p>
      </div>

      {/* PROFILE CARD */}
      <div className="card flex flex-col items-center gap-3 p-8 text-center">

        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-ink-900 font-display text-2xl font-semibold text-paper">
          {initials(user?.full_name) || '?'}
        </div>

        <div>
          <p className="font-display text-lg font-semibold text-ink-900 dark:text-paper">
            {user?.full_name ?? 'Unknown user'}
          </p>

          <p className="text-sm text-slate-500">
            {roleLabel}
          </p>
        </div>

      </div>

      {/* PERSONAL INFORMATION */}
      <div className="card p-6">

        <div className="mb-4 flex items-center justify-between">

          <h2 className="font-display font-semibold text-ink-900 dark:text-paper">
            Personal information
          </h2>

          <Link
            to="/profile/edit"
            className="btn-secondary text-xs"
          >
            <Pencil size={13} />
            Edit
          </Link>

        </div>

        <dl className="divide-y divide-ink-900/10 text-sm">

          {/* NAME */}
          <div className="flex items-center justify-between py-3">
            <dt className="text-slate-500">
              Name
            </dt>

            <dd className="font-medium text-ink-900 dark:text-paper">
              {user?.full_name ?? '—'}
            </dd>
          </div>

          {/* EMAIL */}
          <div className="flex items-center justify-between py-3">
            <dt className="text-slate-500">
              Email
            </dt>

            <dd className="font-medium text-ink-900 dark:text-paper">
              {user?.email ?? 'Not available'}
            </dd>
          </div>

          {/* PHONE */}
          <div className="flex items-center justify-between py-3">
            <dt className="text-slate-500">
              Phone
            </dt>

            <dd className="font-medium text-ink-900 dark:text-paper">
              {user?.phone ?? 'Not available'}
            </dd>
          </div>

        </dl>
      </div>

      {/* PREFERENCES */}
      <div className="card p-6">

        <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper">
          Preferences
        </h2>

        <ul className="divide-y divide-ink-900/10 text-sm">

          {/* NOTIFICATIONS */}
          <li className="flex items-center justify-between py-3">

            <span className="flex items-center gap-2 text-ink-900 dark:text-paper">
              <Bell
                size={16}
                className="text-amber-500"
              />

              Notifications
            </span>

            <Toggle
              checked={notifications}
              onChange={handleNotificationsToggle}
              disabled={notifBusy}
            />

          </li>

          {notifError && (
            <p className="pb-2 text-xs text-signal-stop">
              {notifError}
            </p>
          )}

          {/* LOCATION */}
          <li className="flex items-center justify-between py-3">

            <span className="flex items-center gap-2 text-ink-900 dark:text-paper">
              <MapPin
                size={16}
                className="text-amber-500"
              />

              Location
            </span>

            <Toggle
              checked={location}
              onChange={handleLocationToggle}
              disabled={locBusy}
            />

          </li>

          {locError && (
            <p className="pb-2 text-xs text-signal-stop">
              {locError}
            </p>
          )}

          {/* DARK MODE */}
          <li className="flex items-center justify-between py-3">

            <span className="flex items-center gap-2 text-ink-900 dark:text-paper">
              <Moon
                size={16}
                className="text-amber-500"
              />

              Dark mode
            </span>

            <Toggle
              checked={darkMode}
              onChange={setDarkMode}
            />

          </li>

        </ul>
      </div>

      {/* NOTIFICATION SETTINGS (server-side, drives email + in-app) */}
      <div className="card p-6">

        <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper">
          Notification settings
        </h2>

        {prefsLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : !prefs ? (
          <p className="text-sm text-signal-stop">{prefsError || 'Could not load settings.'}</p>
        ) : (
          <ul className="divide-y divide-ink-900/10 text-sm">

            <li className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-ink-900 dark:text-paper">
                <Mail size={16} className="text-amber-500" />
                Email notifications
              </span>
              <Toggle
                checked={!!prefs.email_enabled}
                onChange={(next) => togglePref('email_enabled', next)}
                disabled={prefsBusyKey === 'email_enabled'}
              />
            </li>

            <li className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-ink-900 dark:text-paper">
                <Bell size={16} className="text-amber-500" />
                Queue approaching
              </span>
              <Toggle
                checked={!!prefs.queue_approaching}
                onChange={(next) => togglePref('queue_approaching', next)}
                disabled={prefsBusyKey === 'queue_approaching'}
              />
            </li>

            <li className="flex items-center justify-between py-3">
              <span className="flex items-center gap-2 text-ink-900 dark:text-paper">
                <MapPin size={16} className="text-amber-500" />
                Your turn
              </span>
              <Toggle
                checked={!!prefs.your_turn}
                onChange={(next) => togglePref('your_turn', next)}
                disabled={prefsBusyKey === 'your_turn'}
              />
            </li>

          </ul>
        )}

        {prefsError && prefs && (
          <p className="pt-2 text-xs text-signal-stop">{prefsError}</p>
        )}
      </div>

      {/* ACCOUNT */}
      <div className="card p-6">

        <h2 className="mb-4 font-display font-semibold text-ink-900 dark:text-paper">
          Account
        </h2>

        <div className="space-y-2">

          {/* EDIT PROFILE */}
          <Link
            to="/profile/edit"
            className="btn-secondary w-full justify-start"
          >
            <Pencil size={15} />
            Edit profile
          </Link>

          {/* CHANGE EMAIL */}
          <button
            type="button"
            onClick={() => setShowChangeEmail(true)}
            className="btn-secondary w-full justify-start"
          >
            <Mail size={15} />
            Change email
          </button>

          {/* CHANGE PASSWORD */}
          <button
            type="button"
            onClick={() => setShowChangePassword(true)}
            className="btn-secondary w-full justify-start"
          >
            <KeyRound size={15} />
            Change password
          </button>

          {/* LOGOUT */}
          <button
            type="button"
            onClick={logout}
            className="btn-secondary w-full justify-start text-signal-stop"
          >
            <LogOut size={15} />
            Logout
          </button>

        </div>

      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <ChangeEmailModal
        isOpen={showChangeEmail}
        onClose={() => setShowChangeEmail(false)}
        onEmailChanged={(newEmail) => {
          if (setUser) {
            setUser((prev) => ({ ...prev, email: newEmail }))
          }
        }}
      />

    </div>
  )
}