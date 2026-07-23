import { createContext, useContext, useState, useEffect, useCallback } from "react";
import axios from 'axios'

/**
 * AuthContext
 *
 * Stores the access token, refresh token, and decoded user info.
 * Exposes: user, login(), logout(), isAuthenticated, loading
 *
 * Tokens live in localStorage so they survive page refresh.
 * axios interceptor automatically attaches Authorization header.
 */

const AuthContext = createContext(null);
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // { id, name, email, role, garage_id }
    const [loading, setLoading] = useState(true); // true while we restore session on mount

    // ── Restore session from localStorage on first load ─────────────────────
    useEffect(() => {
        const stored = localStorage.getItem('auth')
        if (stored) {
            try {
                const parsed = JSON.parse(stored)
                setUser(parsed.user)
                // Re-attach axios default header
                axios.defaults.headers.common['Authorization'] = `Bearer ${parsed.access_token}`
            } catch {
                localStorage.removeItem('auth')
            }
        }
        setLoading(false);
    }, [])

    // ── Login ────────────────────────────────────────────────────────────────
    const login = useCallback(async (email, password) => {
        const res = await axios.post(`${API}/auth/login`, {email, password})
        const {access_token, refresh_token, user: userData} = res.data

        // Persist
        localStorage.setItem('auth', JSON.stringify({
            access_token,
            refresh_token,
            user: userData
        }))

        // Attach to all future axios calls
        axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`
        
        setUser(userData)
        return userData // caller can redirect based on role
    }, [])

    // ── Logout ───────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        try {
            await axios.post(`${API}/auth/logout`)
        } catch {
            // Even if server call fails, clear client state
        }
        localStorage.removeItem('auth')
        delete axios.defaults.headers.common['authorization']
        setUser(null)
    }, [])

    const isAuthenticated = Boolean(user)

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

// Convenience hook
export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside <AuthProvider')
        return ctx
}