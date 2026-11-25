
/**
 * AuthContext
 *
 * frontend/src/context/AuthContext.js
 *
 * Exports only the context object and the useAuth hook.
 * Keeping this separate from the Provider component
 * satisfies Vite Fast Refresh rules.
 */

import { createContext, useContext } from 'react'
 
export const AuthContext = createContext(null)
 
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}