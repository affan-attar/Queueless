import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const GUEST_KEY = 'darkMode:guest'

function getStorageKey() {
  try {
    const raw = localStorage.getItem('ql_user')
    if (raw) {
      const user = JSON.parse(raw)
      if (user?.role) {
        return `darkMode:${user.role}`
      }
    }
  } catch {
    // fall through to guest key below
  }
  return GUEST_KEY
}

function readSaved(key) {
  // Logged-out pages (login, register, forgot-password) are always light,
  // regardless of any stale value or the device's system setting.
  if (key === GUEST_KEY) return false
  try {
    return localStorage.getItem(key) === 'true'
  } catch {
    return false
  }
}

export function ThemeProvider({ children }) {
  const [storageKey, setStorageKey] = useState(getStorageKey)
  const [darkMode, setDarkModeState] = useState(() => readSaved(storageKey))

  // Remove any stale guest value left behind by older versions.
  useEffect(() => {
    try {
      localStorage.removeItem(GUEST_KEY)
    } catch {
      // ignore
    }
  }, [])

  // Re-evaluate which role's key applies when auth changes.
  useEffect(() => {
    function syncKey() {
      const newKey = getStorageKey()
      setStorageKey((prevKey) => (prevKey === newKey ? prevKey : newKey))
    }

    window.addEventListener('storage', syncKey)
    window.addEventListener('ql-auth-changed', syncKey)
    return () => {
      window.removeEventListener('storage', syncKey)
      window.removeEventListener('ql-auth-changed', syncKey)
    }
  }, [])

  // Load the saved preference whenever the active key changes.
  useEffect(() => {
    setDarkModeState(readSaved(storageKey))
  }, [storageKey])

  // Reflect state on <html>.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
  }, [darkMode])

  function setDarkMode(value) {
    setDarkModeState(value)
    if (storageKey === GUEST_KEY) return // guests are never persisted
    try {
      localStorage.setItem(storageKey, String(value))
    } catch {
      // storage unavailable; preference lasts for this session only
    }
  }

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}