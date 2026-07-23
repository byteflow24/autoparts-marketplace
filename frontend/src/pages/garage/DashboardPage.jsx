import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/Authcontext'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * DashboardPage  (Garage only)
 *
 * Fetches GET /garage/dashboard on mount.
 * Displays:
 *  - Garage profile summary
 *  - KPI stat cards (inventory, orders, revenue)
 *  - Stock by category
 *  - Low stock alerts
 *  - Sold by category
 *  - Top selling parts
 *  - Order status summary
 *  - Profit estimate
 */
export function DashboardPage() {
  const { user } = useAuth()

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
              <p>Welcome back, {user?.name}. Here is an overview of your garage.</p>
            </div>
            <div className="dashboard-actions">
              <NavLink to="/parts/add" className="btn btn-primary">+ Add Part</NavLink>
              <NavLink to="/garage/inventory" className="btn btn-outline-navy">Inventory</NavLink>
              <NavLink to="/garage/orders" className="btn btn-outline-navy">Orders</NavLink>
              <NavLink to="/garage/profile/edit" className="btn btn-outline-navy">Edit Profile</NavLink>
            </div>
          </div>

          {/* ── Garage Profile Card ─────────────────────────── */}
          <div className="garage-profile-card">
            <h2>{data.garage_name}</h2>
            <div className="garage-meta">
                <span>CR: {data.CR_number}</span>
              <span>📍 {data.location        || 'Location not provided'}</span>
              <span>🔧 {data.specialization  || 'Specialization not provided'}</span>
              <span>🏠 {data.national_address || 'Address not provided'}</span>
            </div>
          </div>

          {/* ── KPI Cards ───────────────────────────────────── */}
          <div className="dashboard-grid">
            <StatCard
              title="Inventory Listings"
              value={data.inventory_listings}
              note="Total inventory entries"
            />
            <StatCard
              title="Units in Stock"
              value={data.total_units}
              note="Sum of all quantities"
            />
            <StatCard
              title="Categories"
              value={data.categories_count}
              note="Unique part categories"
            />
            <StatCard
              title="Low Stock Alerts"
              value={data.low_stock_count}
              note="Items below 10 units"
              danger={data.low_stock_count > 0}
            />
            <StatCard
              title="Inventory Value"
              value={`QAR ${data.total_inventory_value}`}
              note="Price × quantity"
            />
            <StatCard
              title="Total Orders"
              value={data.total_orders}
              note="All received orders"
            />
            <StatCard
              title="Pending Orders"
              value={data.pending_orders}
              note="Waiting for action"
              danger={data.pending_orders > 0}
            />
            <StatCard
              title="Units Sold"
              value={data.total_units_sold}
              note="Total sold pieces"
            />
            <StatCard
              title="Total Revenue"
              value={`QAR ${data.total_revenue}`}
              note="Based on all orders"
              highlight
            />
          </div>

          {/* ── Stock by Category + Low Stock ───────────────── */}
          <div className="dashboard-details-grid">

            <div className="dashboard-detail-card">
              <h3>Stock by Category</h3>
              {Object.keys(data.category_units).length > 0 ? (
                <div className="category-list">
                  {Object.entries(data.category_units).map(([cat, qty]) => (
                    <div className="category-row" key={cat}>
                      <span>{cat}</span>
                      <strong>{qty} pieces</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">No categories added yet.</p>
              )}
            </div>

            <div className="dashboard-detail-card">
              <h3>Low Stock Items</h3>
              {data.low_stock_items.length > 0 ? (
                <div className="low-stock-list">
                  {data.low_stock_items.map((item, i) => (
                    <div className="low-stock-row" key={i}>
                      <div>
                        <strong>{item.part_name}</strong>
                        <p>{item.category} · {item.part_number || 'No part number'}</p>
                      </div>
                      <span className="stock-warning">{item.quantity} left</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">No low stock items right now.</p>
              )}
            </div>

          </div>

          {/* ── Sold by Category + Top Selling Parts ────────── */}
          <div className="dashboard-details-grid">

            <div className="dashboard-detail-card">
              <h3>Sold by Category</h3>
              {Object.keys(data.sold_by_category).length > 0 ? (
                <div className="category-list">
                  {Object.entries(data.sold_by_category).map(([cat, qty]) => (
                    <div className="category-row" key={cat}>
                      <span>{cat}</span>
                      <strong>{qty} sold</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">No sales yet.</p>
              )}
            </div>

            <div className="dashboard-detail-card">
              <h3>Top Selling Parts</h3>
              {data.top_selling_parts.length > 0 ? (
                <div className="low-stock-list">
                  {data.top_selling_parts.map((item, i) => (
                    <div className="low-stock-row" key={i}>
                      <div>
                        <strong>{item.part_name}</strong>
                        <p>{item.part_number || 'No part number'}</p>
                      </div>
                      <span className="stock-success">
                        {item.quantity_sold} sold · QAR {item.revenue.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted-text">No top selling parts yet.</p>
              )}
            </div>

          </div>

          {/* ── Order Status Summary + Profit ───────────────── */}
          <div className="dashboard-details-grid">

            <div className="dashboard-detail-card">
              <h3>Order Status Summary</h3>
              <div className="category-list">
                <div className="category-row">
                  <span>🕐 Pending</span>
                  <strong className={data.pending_orders   > 0 ? 'text-danger'  : ''}>
                    {data.pending_orders}
                  </strong>
                </div>
                <div className="category-row">
                  <span>✅ Confirmed</span>
                  <strong>{data.confirmed_orders}</strong>
                </div>
                <div className="category-row">
                  <span>🎉 Completed</span>
                  <strong className="text-success">{data.completed_orders}</strong>
                </div>
                <div className="category-row">
                  <span>❌ Cancelled</span>
                  <strong>{data.cancelled_orders}</strong>
                </div>
              </div>
            </div>

            <div className="dashboard-detail-card">
              <h3>Profit Estimate</h3>
              {data.estimated_profit !== null ? (
                <>
                  <p className="dashboard-number text-success">
                    QAR {data.estimated_profit}
                  </p>
                  <small className="dashboard-note">
                    Revenue − cost price × quantity sold
                  </small>
                </>
              ) : (
                <>
                  <p className="muted-text">
                    Add cost price to inventory items to enable profit calculation.
                  </p>
                  <p className="dashboard-note">Formula: profit = revenue − cost</p>
                </>
              )}
            </div>

          </div>

        </div>
      </section>
    </>
  )
}

/* ── Reusable stat card ─────────────────────────────────── */
function StatCard({ title, value, note, danger = false, highlight = false }) {
  return (
    <div className={`dashboard-card ${highlight ? 'dashboard-card-highlight' : ''}`}>
      <h3>{title}</h3>
      <p className={`dashboard-number ${danger ? 'text-danger' : ''} ${highlight ? 'text-highlight' : ''}`}>
        {value}
      </p>
      <small className="dashboard-note">{note}</small>
    </div>
  )
}