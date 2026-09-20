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
    // Logged-out pages (login, register, forgot-password) always start
    // light regardless of the device's system dark-mode setting, since
    // AuthShell isn't fully dark-mode-styled. Only logged-in roles pick
    // up a real preference, and only once the user explicitly sets one.
    return false
  })

  useEffect(() => {
    function syncKey() {
      const newKey = getStorageKey()
      setStorageKey((prevKey) => {
        if (newKey === prevKey) return prevKey
        const saved = localStorage.getItem(newKey)
        const nextDark = saved !== null ? saved === 'true' : false
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