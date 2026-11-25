import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = '/api'

/**
 * OrdersPage  (Garage only)
 *
 * Fetches GET /garage/orders — sorted pending first.
 * Status badge reads order.status directly (kept in sync by the backend
 * whenever a per-item status is saved on OrderDetailPage).
 * "View" navigates to /garage/orders/<id>.
 */
export function OrdersPage() {
  const navigate = useNavigate()

  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // ── Fetch orders ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/garage/orders`)
        setOrders(res.data.orders || [])
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load orders.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Helpers ─────────────────────────────────────────────────
  function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <title>Garage Orders | AutoParts Marketplace</title>

      <section className="inventory-section">
        <div className="container">

          {/* ── Header ─────────────────────────────────────── */}
          <div className="inventory-header">
            <div>
              <h1>Orders</h1>
              <p>Manage incoming orders from customers.</p>
            </div>
            <div className="inventory-actions">
              <NavLink to="/dashboard" className="btn btn-outline-navy">
                ← Dashboard
              </NavLink>
            </div>
          </div>

          {/* ── States ─────────────────────────────────────── */}
          {error   && <div className="alert alert-danger">{error}</div>}
          {loading && <div className="inventory-loading">Loading orders…</div>}

          {/* ── Table ──────────────────────────────────────── */}
          {!loading && orders.length > 0 && (
            <>
              <p className="results-count">
                {orders.length} order{orders.length !== 1 ? 's' : ''}
              </p>

              <div className="inventory-table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Created</th>
                      <th>Customer</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order.order_id}>
                        <td><strong>{order.order_id}</strong></td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>{order.customer_name || `User ${order.user_id}`}</td>
                        <td>{(order.items || []).length}</td>
                        <td>QAR {Number(order.total_price).toFixed(2)}</td>
                        <td>
                          <span className={`order-status-badge status-${order.status}`}>
                            {order.status}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => navigate(`/garage/orders/${order.order_id}`)}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Empty ──────────────────────────────────────── */}
          {!loading && orders.length === 0 && !error && (
            <div className="empty-state-card">
              <h2>No orders yet</h2>
              <p>When customers place orders, they will show up here.</p>
            </div>
          )}

        </div>
      </section>
    </>
  )
}