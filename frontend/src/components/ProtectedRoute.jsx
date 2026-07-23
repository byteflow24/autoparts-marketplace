import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/Authcontext'

/**
 * ProtectedRoute
 *
 * Usage in App.jsx:
 *   <Route element={<ProtectedRoute />}>           ← any logged-in user
 *   <Route element={<ProtectedRoute role="garage" />}>  ← garage only
 *   <Route element={<ProtectedRoute role="customer" />}> ← customer only
 *
 * Redirects unauthenticated users to /login.
 * Redirects wrong-role users to / (home).
 */

export function ProtectedRoute({ role }) {
    const { isAuthenticated, user, loading } = useAuth()

    if (loading) return null; // wait for session restore before deciding

    if (!isAuthenticated) return <Navigate to='/login' replace />;

    if (role && user?.role !== role) return <Navigate to='/' replace />;

    return <Outlet />
}