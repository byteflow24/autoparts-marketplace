import { useState, useEffect } from 'react'
import { NavLink, useParams } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

/**
 * OrderDetailPage  (Garage only)
 *
 * Fetches GET /orders/<order_id>
 * Shows: customer info, items table, status updater
 * Status update: PUT /orders/<order_id>/status
 */
export function OrderDetailPage() {
  const { order_id } = useParams()

  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Status update state
  const [selectedStatus, setSelectedStatus] = useState('')
  const [saving,         setSaving]         = useState(false)
  const [saveError,      setSaveError]      = useState('')
  const [saveSuccess,    setSaveSuccess]    = useState(false)

  // ── Fetch order ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/orders/${order_id}`)
        setOrder(res.data)
        setSelectedStatus(res.data.status)
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load order.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [order_id])

  // ── Update status ───────────────────────────────────────────
  async function handleUpdateStatus() {
    setSaving(true)
    setSaveError('')
    setSaveSuccess(false)
    try {
      await axios.put(`${API}/orders/${order_id}/status`, { status: selectedStatus })
      setOrder(prev => ({ ...prev, status: selectedStatus }))
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2500)
    } catch (err) {
      setSaveError(err?.response?.data?.error || 'Failed to update status.')
    } finally {
      setSaving(false)
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

  // ── Loading / error states ──────────────────────────────────
  if (loading) {
    return (
      <section className="inventory-section">
        <div className="container">
          <div className="inventory-loading">Loading order…</div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section className="inventory-section">
        <div className="container">
          <div className="alert alert-danger">{error}</div>
          <NavLink to="/garage/orders" className="btn btn-outline-navy" style={{ marginTop: '16px' }}>
            ← Back to Orders
          </NavLink>
        </div>
      </section>
    )
  }

  // ─────────────────────────────────────────────────────────────
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
                Status:{' '}
                <span className={`order-status-badge status-${order.status}`}>
                  {order.status}
                </span>
                {order.created_at && (
                  <span style={{ color: 'var(--gray-600)', marginLeft: '12px' }}>
                    · Created {formatDate(order.created_at)}
                  </span>
                )}
              </p>
            </div>
            <div className="inventory-actions">
              <NavLink to="/garage/orders" className="btn btn-outline-navy">
                ← Back to Orders
              </NavLink>
            </div>
          </div>

          {/* ── Customer Info ───────────────────────────────── */}
          <div className="garage-profile-card" style={{ marginBottom: '24px' }}>
            <h2>Customer</h2>
            <div className="garage-meta">
              <span>👤 {order.customer?.name  || '—'}</span>
              <span>✉️ {order.customer?.email || '—'}</span>
              <span>📞 {order.customer?.phone || '—'}</span>
            </div>
          </div>

          {/* ── Items Table ─────────────────────────────────── */}
          <div className="inventory-table-wrapper" style={{ marginBottom: '24px' }}>
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Part Number</th>
                  <th>Service</th>
                  <th>Unit Price</th>
                  <th>Qty</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => (
                  <tr key={item.item_id}>
                    <td className="td-name">{item.part_name || 'Deleted Part'}</td>
                    <td>{item.part_number || '—'}</td>
                    <td>
                      <span className="service-tag">{item.service_option || 'none'}</span>
                    </td>
                    <td>QAR {item.price.toFixed(2)}</td>
                    <td>{item.quantity}</td>
                    <td><strong>QAR {(item.price * item.quantity).toFixed(2)}</strong></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="order-total-row">
                  <td colSpan={5}><strong>Order Total</strong></td>
                  <td><strong>QAR {order.total_price.toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Update Status ───────────────────────────────── */}
          <div className="order-status-box">
            <h3>Update Order Status</h3>

            {saveError   && <div className="alert alert-danger"  style={{ marginBottom: '12px' }}>{saveError}</div>}
            {saveSuccess && <div className="alert alert-success" style={{ marginBottom: '12px' }}>Status updated successfully.</div>}

            <div className="order-update-row">
              <select
                className="form-input order-status-select"
                value={selectedStatus}
                onChange={e => { setSelectedStatus(e.target.value); setSaveError('') }}
                disabled={saving}
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <button
                className="btn btn-primary"
                onClick={handleUpdateStatus}
                disabled={saving || selectedStatus === order.status}
              >
                {saving ? 'Updating…' : 'Update Status'}
              </button>
            </div>
          </div>

        </div>
      </section>
    </>
  )
}