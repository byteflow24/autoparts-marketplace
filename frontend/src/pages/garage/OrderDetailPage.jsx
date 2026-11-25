import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

const API = '/api'

const STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

/**
 * OrderDetailPage  (Garage only)
 *
 * Fetches GET /orders/<order_id>
 * Shows: customer info, items table with per-item status selectors,
 *        customer order history.
 *
 * Per-item status: PUT /orders/<order_id>/items/<item_id>/status
 * The backend auto-derives orders.status from item statuses and returns
 * new_order_status — we update the header badge in-place.
 */
export function OrderDetailPage() {
  const { order_id } = useParams()
  const navigate = useNavigate()

  const [order,   setOrder]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // Per-item status state: { [item_id]: { selected, saving, error, success } }
  const [itemStatus, setItemStatus] = useState({})

  // Customer order history
  const [history,    setHistory]    = useState([])

  // History filters
  const [histSort,   setHistSort]   = useState('new')   // 'new' | 'old'
  const [histSearch, setHistSearch] = useState('')

  // ── Fetch order ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const res = await axios.get(`${API}/orders/${order_id}`)
        setOrder(res.data)

        // Initialise per-item status state
        const init = {}
        ;(res.data.items || []).forEach(item => {
          init[item.item_id] = {
            selected: item.item_status || 'pending',
            saving: false, error: '', success: false
          }
        })
        setItemStatus(init)

        // Fetch this customer's other completed orders from this garage
        const hist = await axios.get(
          `${API}/garage/orders?customer_id=${res.data.user_id}`
        )
        const completedOthers = (hist.data.orders || []).filter(
          o => o.order_id !== res.data.order_id && o.status === 'completed'
        )
        // Fetch full detail for each so we get item-level prices
        const details = await Promise.all(
          completedOthers.map(o => axios.get(`${API}/orders/${o.order_id}`).then(r => r.data))
        )
        setHistory(details)
      } catch (err) {
        setError(err?.response?.data?.error || 'Failed to load order.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [order_id])

  // ── Per-item status helpers ─────────────────────────────────
  function setItemField(item_id, fields) {
    setItemStatus(prev => ({ ...prev, [item_id]: { ...prev[item_id], ...fields } }))
  }

  async function handleItemStatusSave(item_id) {
    const selected = itemStatus[item_id]?.selected
    setItemField(item_id, { saving: true, error: '', success: false })
    try {
      const res = await axios.put(
        `${API}/orders/${order_id}/items/${item_id}/status`,
        { status: selected }
      )
      setItemField(item_id, { saving: false, success: true })
      setTimeout(() => setItemField(item_id, { success: false }), 2500)

      // Update the header badge — backend returns the auto-derived order status
      if (res.data.new_order_status) {
        setOrder(prev => ({ ...prev, status: res.data.new_order_status }))
      }
    } catch (err) {
      setItemField(item_id, { saving: false, error: err?.response?.data?.error || 'Failed.' })
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
      <title>Order {order.order_id} | AutoParts Marketplace</title>

      <section className="inventory-section">
        <div className="container">

          {/* ── Header ─────────────────────────────────────── */}
          <div className="inventory-header">
            <div>
              <h1>Order {order.order_id}</h1>
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
            <table className="inventory-table order-detail-table">
              <thead>
                <tr>
                  <th>Year</th>
                  <th>Make</th>
                  <th>Model</th>
                  <th>Sub-Model</th>
                  <th>Category</th>
                  <th>Sub-Cat</th>
                  <th>Part Number</th>
                  <th>Service</th>
                  <th>Unit Price</th>
                  <th>Qty</th>
                  <th>Line Total</th>
                  <th>Item Status</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => {
                  const is = itemStatus[item.item_id] || {}
                  return (
                    <tr key={item.item_id}>
                      <td>{item.year           || '—'}</td>
                      <td>{item.car_make        || '—'}</td>
                      <td>{item.car_model       || '—'}</td>
                      <td>{item.car_sub_model   || '—'}</td>
                      <td>{item.category        || '—'}</td>
                      <td>{item.subcategory     || '—'}</td>
                      <td>{item.part_number     || '—'}</td>
                      <td><span className="service-tag">{item.service_option || 'none'}</span></td>
                      <td>QAR {Number(item.price).toFixed(2)}</td>
                      <td>{item.quantity}</td>
                      <td><strong>QAR {Number(item.line_total).toFixed(2)}</strong></td>
                      <td style={{ minWidth: '180px' }}>
                        <div className="item-status-cell">
                          <select
                            className="form-input order-status-select"
                            value={is.selected || item.item_status || 'pending'}
                            onChange={e => setItemField(item.item_id, { selected: e.target.value, error: '' })}
                            disabled={is.saving}
                            style={{ color: '#000', flex: 1 }}
                          >
                            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleItemStatusSave(item.item_id)}
                            disabled={is.saving || is.selected === (item.item_status || 'pending')}
                            style={{ whiteSpace: 'nowrap' }}
                          >
                            {is.saving ? '…' : 'Save'}
                          </button>
                        </div>
                        {is.success && <div className="order-status-inline-ok" style={{ fontSize: '0.78rem', marginTop: '2px' }}>✓ Saved</div>}
                        {is.error   && <div className="order-status-inline-err" style={{ fontSize: '0.78rem', marginTop: '2px' }}>{is.error}</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="order-total-row">
                  <td colSpan={11}><strong>Order Total</strong></td>
                  <td><strong>QAR {Number(order.total_price).toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* ── Customer Order History ───────────────────────── */}
          {history.length > 0 && (() => {
            const q = histSearch.trim().toLowerCase()

            const sorted = [...history].sort((a, b) => {
              const da = new Date(a.created_at || 0)
              const db = new Date(b.created_at || 0)
              return histSort === 'new' ? db - da : da - db
            })

            const filtered = sorted.map(o => ({
              ...o,
              items: (o.items || []).filter(item => {
                if (!q) return true
                const dateStr = new Date(o.created_at || '').toLocaleDateString('en-GB').toLowerCase()
                return (
                  dateStr.includes(q) ||
                  (item.part_number  || '').toLowerCase().includes(q) ||
                  (item.category     || '').toLowerCase().includes(q) ||
                  (item.subcategory  || '').toLowerCase().includes(q) ||
                  (item.car_make     || '').toLowerCase().includes(q) ||
                  (item.car_model    || '').toLowerCase().includes(q)
                )
              })
            })).filter(o => o.items.length > 0)

            return (
              <div style={{ marginTop: '40px' }}>
                {/* Header + controls */}
                <div className="inventory-header" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <h2>
                      {order.customer?.name
                        ? `${order.customer.name}'s Order History`
                        : 'Customer Order History'}
                    </h2>
                    <p style={{ color: 'var(--gray-500)', fontSize: '0.88rem' }}>
                      Completed orders from this customer
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div className="inv-density-toggle">
                      {['new', 'old'].map(v => (
                        <button
                          key={v}
                          className={`inv-density-btn${histSort === v ? ' active' : ''}`}
                          onClick={() => setHistSort(v)}
                        >
                          {v === 'new' ? 'Newest' : 'Oldest'}
                        </button>
                      ))}
                    </div>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Search by date, part #, category, make, model…"
                      value={histSearch}
                      onChange={e => setHistSearch(e.target.value)}
                      style={{ minWidth: '260px', fontSize: '0.85rem' }}
                    />
                    {histSearch && (
                      <button
                        className="btn btn-sm btn-outline-navy"
                        onClick={() => setHistSearch('')}
                      >✕</button>
                    )}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <p style={{ color: 'var(--gray-500)' }}>No matching history found.</p>
                ) : (
                  <div className="inventory-table-wrapper">
                    <table className="inventory-table order-detail-table">
                      <thead>
                        <tr>
                          <th>Year</th>
                          <th>Make</th>
                          <th>Model</th>
                          <th>Sub-Model</th>
                          <th>Category</th>
                          <th>Sub-Cat</th>
                          <th>Part Number</th>
                          <th>Service</th>
                          <th>Unit Price</th>
                          <th>Qty</th>
                          <th>Line Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map(o => (
                          <>
                            <tr key={`splitter-${o.order_id}`} className="hist-order-splitter">
                              <td colSpan={11}>
                                <span className="hist-order-id">Order {o.order_id}</span>
                                <span className="hist-order-date">{formatDate(o.created_at)}</span>
                              </td>
                            </tr>
                            {o.items.map((item, idx) => (
                              <tr key={item.item_id ?? `${o.order_id}-${idx}`}>
                                <td>{item.year          || '—'}</td>
                                <td>{item.car_make      || '—'}</td>
                                <td>{item.car_model     || '—'}</td>
                                <td>{item.car_sub_model || '—'}</td>
                                <td>{item.category      || '—'}</td>
                                <td>{item.subcategory   || '—'}</td>
                                <td>{item.part_number   || '—'}</td>
                                <td><span className="service-tag">{item.service_option || 'none'}</span></td>
                                <td>QAR {Number(item.price).toFixed(2)}</td>
                                <td>{item.quantity}</td>
                                <td><strong>QAR {Number(item.line_total).toFixed(2)}</strong></td>
                              </tr>
                            ))}
                            <tr key={`total-${o.order_id}`} className="order-total-row hist-order-total">
                              <td colSpan={10}><strong>Order {o.order_id} Total</strong></td>
                              <td><strong>QAR {Number(o.total_price).toFixed(2)}</strong></td>
                            </tr>
                          </>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })()}

        </div>
      </section>
    </>
  )
}