import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('ql_user')
    return raw ? JSON.parse(raw) : null
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('ql_access_token')
    if (!token) {
      setLoading(false)
      return
    }
    authApi
      .me()
      .then(({ data }) => setUser((prev) => ({ ...prev, ...data })))
      .catch(() => {
        localStorage.removeItem('ql_access_token')
        localStorage.removeItem('ql_user')
        setUser(null)
      })
      .finally(() => setLoading(false))
  }, [])

  function login(tokenResponse) {
    const { access_token, role, full_name, user_id } = tokenResponse
    localStorage.setItem('ql_access_token', access_token)
    const nextUser = { id: user_id, role, full_name }
    localStorage.setItem('ql_user', JSON.stringify(nextUser))
    setUser(nextUser)
  }

  function logout() {
    localStorage.removeItem('ql_access_token')
    localStorage.removeItem('ql_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}