import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/Authcontext'
import axios from 'axios'

const API = '/api'

/**
 * DashboardPage  (Garage only)
 *
 * Shows:
 *  1. Garage Profile Card (with ✏️ edit icon)
 *  2. Three large nav boxes: Add Part / Inventory / Orders
 */
export function DashboardPage() {
  const { user }   = useAuth()
  const navigate   = useNavigate()

  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await axios.get(`${API}/garage/dashboard`)
        setData(res.data)
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load dashboard.')
      } finally {
        setLoading(false)
      }
    }
    loadDashboard()
  }, [])

  if (loading) {
    return (
      <section className="dashboard-section">
        <div className="container">
          <div className="dashboard-loading">Loading dashboard…</div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="dashboard-section">
        <div className="container">
          <div className="alert alert-danger">{error}</div>
        </div>
      </section>
    )
  }

  return (
    <>
      <title>Garage Dashboard | AutoParts Marketplace</title>

      <section className="dashboard-section">
        <div className="container">

          {/* ── Header ─────────────────────────────────────── */}
          <div className="dashboard-header">
            <div>
              <h1>Dashboard</h1>
              <p>Welcome back, {user?.name}.</p>
            </div>
          </div>

          {/* ── Garage Profile Card ─────────────────────────── */}
          <div className="garage-profile-card garage-profile-card--editable">
            <button
              className="garage-profile-edit-btn"
              onClick={() => navigate('/garage/profile/edit')}
              title="Edit Profile"
            >
              ✏️
            </button>
            <h2>{data.garage_name}</h2>
            <div className="garage-meta">
              <span>CR: {data.CR_number}</span>
              <span>📍 {data.location        || 'Location not provided'}</span>
              <span>🔧 {data.specialization  || 'Specialization not provided'}</span>
              <span>🏠 {data.national_address || 'Address not provided'}</span>
            </div>
          </div>

          {/* ── Main Nav Boxes ───────────────────────────────── */}
          <div className="dashboard-nav-grid">
            <button
              className="dashboard-nav-box"
              onClick={() => navigate('/parts/add')}
            >
              <span className="dashboard-nav-icon">➕</span>
              <span className="dashboard-nav-label">Add Part</span>
              <span className="dashboard-nav-sub">List a new part in your inventory</span>
            </button>

            <button
              className="dashboard-nav-box"
              onClick={() => navigate('/garage/inventory')}
            >
              <span className="dashboard-nav-icon">📦</span>
              <span className="dashboard-nav-label">Inventory</span>
              <span className="dashboard-nav-sub">Manage your parts and stock</span>
            </button>

            <button
              className="dashboard-nav-box"
              onClick={() => navigate('/garage/orders')}
            >
              <span className="dashboard-nav-icon">🧾</span>
              <span className="dashboard-nav-label">Orders</span>
              <span className="dashboard-nav-sub">View and manage customer orders</span>
            </button>
          </div>

        </div>
      </section>
    </>
  )
}