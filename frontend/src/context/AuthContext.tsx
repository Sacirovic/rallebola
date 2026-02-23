import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import client from '../api/client'

interface User {
  id: number
  name: string
  email: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verify the session is still alive on mount
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      client.get('/auth/me')
        .then((res) => {
          setUser(res.data.user)
          localStorage.setItem('user', JSON.stringify(res.data.user))
        })
        .catch(() => {
          localStorage.removeItem('user')
          setUser(null)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const res = await client.post('/auth/login', { email, password })
    const u = res.data.user
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  const register = async (name: string, email: string, password: string) => {
    const res = await client.post('/auth/register', { name, email, password })
    const u = res.data.user
    localStorage.setItem('user', JSON.stringify(u))
    setUser(u)
  }

  const logout = async () => {
    await client.post('/auth/logout').catch(() => {})
    localStorage.removeItem('user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
