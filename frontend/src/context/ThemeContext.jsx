import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

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
    // fall through to default key below
  }
  return 'darkMode:guest'
}

export function ThemeProvider({ children }) {
  const [storageKey, setStorageKey] = useState(getStorageKey)

  const [darkMode, setDarkModeState] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    if (saved !== null) return saved === 'true'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // Re-check which role's key to use whenever localStorage changes
  // (e.g. after login/logout in this tab or another tab), so switching
  // accounts picks up that role's own saved preference.
  useEffect(() => {
    function syncKey() {
      const newKey = getStorageKey()
      setStorageKey((prevKey) => {
        if (newKey === prevKey) return prevKey
        const saved = localStorage.getItem(newKey)
        const nextDark =
          saved !== null
            ? saved === 'true'
            : window.matchMedia('(prefers-color-scheme: dark)').matches
        setDarkModeState(nextDark)
        return newKey
      })
    }

    window.addEventListener('storage', syncKey)
    window.addEventListener('ql-auth-changed', syncKey)
    return () => {
      window.removeEventListener('storage', syncKey)
      window.removeEventListener('ql-auth-changed', syncKey)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    localStorage.setItem(storageKey, darkMode)
  }, [darkMode, storageKey])

  function setDarkMode(value) {
    setDarkModeState(value)
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