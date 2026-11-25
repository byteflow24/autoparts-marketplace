/**
 * AuthProvider.jsx
 * frontend/src/context/AuthProvider.jsx
 *
 * Exports only the AuthProvider component — pure JSX file.
 * Vite Fast Refresh is happy because this file only exports a component.
 */
 
import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { AuthContext } from './Authcontext'
 
const API = '/api'
 
export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null)
  const [loading, setLoading] = useState(true)
 
  const isRefreshing = useRef(false)
  const failedQueue  = useRef([])
 
  function processQueue(error, token = null) {
    failedQueue.current.forEach(({ resolve, reject }) => {
      if (error) reject(error)
      else resolve(token)
    })
    failedQueue.current = []
  }
 
  // ── Restore session on mount ───────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setUser(parsed.user)
        axios.defaults.headers.common['Authorization'] = `Bearer ${parsed.access_token}`
      } catch {
        localStorage.removeItem('auth')
      }
    }
    setLoading(false)
  }, [])
 
  // ── Axios interceptor — auto token refresh on 401 ─────────
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      res => res,
      async err => {
        const original = err.config
 
        if (
          err.response?.status === 401 &&
          !original._retry &&
          !original.url?.includes('/auth/')
        ) {
          if (isRefreshing.current) {
            return new Promise((resolve, reject) => {
              failedQueue.current.push({ resolve, reject })
            }).then(token => {
              original.headers['Authorization'] = `Bearer ${token}`
              return axios(original)
            })
          }
 
          original._retry      = true
          isRefreshing.current = true
 
          try {
            const stored   = JSON.parse(localStorage.getItem('auth') || '{}')
            const res      = await axios.post(
              `${API}/auth/refresh`,
              {},
              { headers: { Authorization: `Bearer ${stored.refresh_token}` } }
            )
            const newToken = res.data.access_token
 
            stored.access_token = newToken
            localStorage.setItem('auth', JSON.stringify(stored))
            axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`
 
            processQueue(null, newToken)
            original.headers['Authorization'] = `Bearer ${newToken}`
            return axios(original)
 
          } catch (refreshErr) {
            processQueue(refreshErr, null)
            localStorage.removeItem('auth')
            delete axios.defaults.headers.common['Authorization']
            setUser(null)
            return Promise.reject(refreshErr)
          } finally {
            isRefreshing.current = false
          }
        }
 
        return Promise.reject(err)
      }
    )
 
    return () => axios.interceptors.response.eject(interceptor)
  }, [])
 
  // ── Login ──────────────────────────────────────────────────
  const login = useCallback(async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password })
    const { access_token, refresh_token, user: userData } = res.data
 
    localStorage.setItem('auth', JSON.stringify({ access_token, refresh_token, user: userData }))
    axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
    setUser(userData)
    return userData
  }, [])
 
  // ── Logout ─────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try { await axios.post(`${API}/auth/logout`) } catch { /* clear regardless */ }
    localStorage.removeItem('auth')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }, [])
 
  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isAuthenticated: Boolean(user),
      loading
    }}>
      {children}
    </AuthContext.Provider>
  )
}