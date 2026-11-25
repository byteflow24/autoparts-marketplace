import { useState, useEffect } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import axios from 'axios'

const API = '/api'

/**
 * OrderDetailsPage  (Customer only)
 *
 * Route: /orders/:order_id
 *
 * Fetches GET /orders/<order_id>
 * Shows: order summary card, items table
 * Read-only — customers cannot update status.
 *
 * Note: the garage version (OrderDetailPage.jsx) uses the same
 * API endpoint but also shows customer info and a status updater.
 * Keep them as separate components — their purpose differs.
 */
export function OrderDetailsPage() {
  const { order_id } = useParams()

  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/orders/${order_id}`)
        setOrder(res.data)
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load order.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [order_id])

  function formatDate(iso) {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('en-GB', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    })
  }

  function capitalize(str) {
    if (!str) return '—'
    return str.charAt(0).toUpperCase() + str.slice(1)
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="inventory-section">
        <div className="container">
          <div className="inventory-loading">Loading order…</div>
        </div>
      </section>
    )
  }

  // ── Error ──────────────────────────────────────────────────
  if (error) {
    return (
      <section className="inventory-section">
        <div className="container">
          <div className="alert alert-danger">{error}</div>
          <NavLink to="/orders" className="btn btn-outline-navy" style={{ marginTop: '16px', display: 'inline-flex' }}>
            ← Back to Orders
          </NavLink>
        </div>
      </section>
    )
  }

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <title>Order #{order.order_id} | AutoParts Marketplace</title>

      <section className="inventory-section">
        <div className="container">

          {/* ── Header ─────────────────────────────────────── */}
          <div className="inventory-header">
            <div>
              <h1>Order #{order.order_id}</h1>
              <p>
                {order.garage_name
                  ? `Garage: ${order.garage_name}`
                  : `Garage #${order.garage_id}`}
              </p>
            </div>
            <div className="inventory-actions">
              <NavLink to="/orders" className="btn btn-outline-navy">
                ← Back to Orders
              </NavLink>
            </div>
          </div>

          {/* ── Summary card ────────────────────────────────── */}
          <div className="garage-profile-card" style={{ marginBottom: '24px', background: 'white' }}>
            <div className="result-grid">
              <p>
                <strong>Status:</strong>{' '}
                <span className={`order-status-badge status-${order.status}`}>
                  {order.status}
                </span>
              </p>
              <p>
                <strong>Total:</strong>{' '}
                QAR {Number(order.total_price).toFixed(2)}
              </p>
              <p>
                <strong>Items:</strong> {order.items?.length ?? 0}
              </p>
              <p>
                <strong>Placed:</strong> {formatDate(order.created_at)}
              </p>
            </div>
          </div>

          {/* ── Items table ─────────────────────────────────── */}
          {order.items && order.items.length > 0 ? (
            <div className="inventory-table-wrapper">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Part</th>
                    <th>Part Number</th>
                    <th>Service</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map(item => (
                    <tr key={item.item_id}>
                      <td className="td-name">{item.part_name || 'Deleted Part'}</td>
                      <td>{item.part_number || '—'}</td>
                      <td>
                        <span className="service-tag">
                          {capitalize(item.service_option)}
                        </span>
                      </td>
                      <td>QAR {item.price.toFixed(2)}</td>
                      <td>{item.quantity}</td>
                      <td>
                        <strong>QAR {(item.price * item.quantity).toFixed(2)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="order-total-row">
                    <td colSpan={5}><strong>Order Total</strong></td>
                    <td><strong>QAR {Number(order.total_price).toFixed(2)}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="empty-state-card">
              <h2>No items found</h2>
              <p>This order has no items on record.</p>
            </div>
          )}

        </div>
      </section>
    </>
  )
}