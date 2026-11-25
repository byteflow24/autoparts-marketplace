import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = '/api'

/**
 * MyOrdersPage  (Customer only)
 *
 * Fetches GET /orders/my-orders on mount.
 * Shows all orders the customer has placed, newest first.
 * Each order card has a "View Details" button → /orders/<order_id>
 */
export function MyOrdersPage() {
  const navigate = useNavigate()

  const [orders,  setOrders]  = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/orders/my-orders`)
        setOrders(res.data.orders || [])
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load orders.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', {
      year:   'numeric',
      month:  'short',
      day:    '2-digit',
      hour:   '2-digit',
      minute: '2-digit',
    })
  }

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <title>My Orders | AutoParts Marketplace</title>

      <section className="inventory-section">
        <div className="container">

          {/* ── Header ─────────────────────────────────────── */}
          <div className="inventory-header">
            <div>
              <h1>My Orders</h1>
              <p>Track the orders you placed from different garages.</p>
            </div>
          </div>

          {/* ── Error ──────────────────────────────────────── */}
          {error && <div className="alert alert-danger">{error}</div>}

          {/* ── Loading ────────────────────────────────────── */}
          {loading && (
            <div className="inventory-loading">Loading your orders…</div>
          )}

          {/* ── Orders list ────────────────────────────────── */}
          {!loading && orders.length > 0 && (
            <div className="results-list">
              {orders.map(order => (
                <div className="result-card" key={order.order_id}>

                  {/* Top row: order id + garage / total */}
                  <div className="result-top">
                    <div>
                      <h2>Order #{order.order_id}</h2>
                      <p className="result-subtitle">
                        {order.garage_name || `Garage #${order.garage_id}`}
                      </p>
                    </div>
                    <div className="result-price">
                      QAR {order.total_price.toFixed(2)}
                    </div>
                  </div>

                  {/* Detail row */}
                  <div className="result-grid">
                    <p>
                      <strong>Status:</strong>{' '}
                      <span className={`order-status-badge status-${order.status}`}>
                        {order.status}
                      </span>
                    </p>
                    <p>
                      <strong>Items:</strong> {order.item_count}
                    </p>
                    <p>
                      <strong>Placed:</strong> {formatDate(order.created_at)}
                    </p>
                  </div>

                  {/* Action */}
                  <div className="result-actions">
                    <button
                      className="btn btn-primary"
                      onClick={() => navigate(`/orders/${order.order_id}`)}
                    >
                      View Details
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}

          {/* ── Empty state ─────────────────────────────────── */}
          {!loading && orders.length === 0 && !error && (
            <div className="empty-state-card">
              <h2>No orders yet</h2>
              <p>You have not placed any orders yet.</p>
              <NavLink to="/search" className="btn btn-primary">
                Search Parts
              </NavLink>
            </div>
          )}

        </div>
      </section>
    </>
  )
}