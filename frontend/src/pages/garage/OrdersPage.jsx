import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

/**
 * OrdersPage  (Garage only)
 *
 * Fetches GET /garage/orders — sorted pending first.
 * Inline status update via PUT /orders/<id>/status.
 * "View" navigates to /garage/orders/<id>.
 */
export function OrdersPage() {
  const navigate = useNavigate()

  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Per-row: { [order_id]: { selectedStatus, saving, error } }
  const [rowState, setRowState] = useState({})

  // ── Fetch orders ────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/garage/orders`)
        const list = res.data.orders || []
        setOrders(list)

        // Initialise each row's selected status to current status
        const init = {}
        list.forEach(o => {
          init[o.order_id] = { selectedStatus: o.status, saving: false, error: '' }
        })
        setRowState(init)
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load orders.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── Per-row select change ───────────────────────────────────
  function handleStatusSelect(order_id, value) {
    setRowState(prev => ({
      ...prev,
      [order_id]: { ...prev[order_id], selectedStatus: value, error: '' }
    }))
  }

  // ── Save status ─────────────────────────────────────────────
  async function handleSave(order_id) {
    const selected = rowState[order_id]?.selectedStatus
    setRowState(prev => ({
      ...prev,
      [order_id]: { ...prev[order_id], saving: true, error: '' }
    }))

    try {
      await axios.put(`${API}/orders/${order_id}/status`, { status: selected })

      // Update the order status in the list in-place
      setOrders(prev => prev.map(o =>
        o.order_id === order_id ? { ...o, status: selected } : o
      ))
      setRowState(prev => ({
        ...prev,
        [order_id]: { ...prev[order_id], saving: false }
      }))
    } catch (err) {
      setRowState(prev => ({
        ...prev,
        [order_id]: {
          ...prev[order_id],
          saving: false,
          error: err?.response?.data?.error || 'Update failed.'
        }
      }))
    }
  }

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
                      <th>Order #</th>
                      <th>Created</th>
                      <th>Customer</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Update Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => {
                      const rs = rowState[order.order_id] || {}
                      return (
                        <tr key={order.order_id}>
                          <td><strong>#{order.order_id}</strong></td>
                          <td>{formatDate(order.created_at)}</td>
                          <td>{order.customer_name || `User #${order.user_id}`}</td>
                          <td>QAR {order.total_price.toFixed(2)}</td>
                          <td>
                            <span className={`order-status-badge status-${order.status}`}>
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <div className="order-update-row">
                              <select
                                className="form-input order-status-select"
                                value={rs.selectedStatus || order.status}
                                onChange={e => handleStatusSelect(order.order_id, e.target.value)}
                                disabled={rs.saving}
                              >
                                {STATUSES.map(s => (
                                  <option key={s} value={s}>{s}</option>
                                ))}
                              </select>
                              <button
                                className="btn btn-sm btn-outline-navy"
                                onClick={() => handleSave(order.order_id)}
                                disabled={rs.saving || rs.selectedStatus === order.status}
                              >
                                {rs.saving ? '…' : 'Save'}
                              </button>
                            </div>
                            {rs.error && (
                              <small className="form-error">{rs.error}</small>
                            )}
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
                      )
                    })}
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