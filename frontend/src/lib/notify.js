const STORAGE_KEY = 'ql_mock_notifications'

function readCenter() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
}

function writeCenter(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

/**
 * Adds an entry to the in-app Notifications page (localStorage-backed for
 * now — swap for a real POST once the backend notifications module exists).
 * type must be one of: 'turn_approaching' | 'queue_update' | 'your_turn' | 'completed'
 */
export function addToNotificationCenter({ type, title, body }) {
  const items = readCenter()
  const entry = {
    id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    body,
    createdAt: Date.now(),
    read: false,
  }
  writeCenter([entry, ...items])
  return entry
}

/**
 * Fires a real OS/browser notification if the user has granted permission
 * and hasn't turned the Notifications preference off in Profile. Silently
 * does nothing otherwise — this should never throw or block the caller.
 */
export function fireBrowserNotification(title, body) {
  const enabled = localStorage.getItem('notificationsEnabled') === 'true'
  if (!enabled) return
  if (!('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  try {
    new Notification(title, { body })
  } catch {
    // Some browsers throw if called from a background tab context —
    // safe to ignore, the in-app notification center still gets the entry.
  }
}

/**
 * Convenience wrapper: does both at once, which is what most queue events
 * want (visible in Notifications page AND a real OS popup if enabled).
 */
export function notify({ type, title, body }) {
  addToNotificationCenter({ type, title, body })
  fireBrowserNotification(title, body)
}