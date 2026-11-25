/**
 * MyOrdersTab.jsx
 * Place at: frontend/src/pages/hub/tabs/MyOrdersTab.jsx
 */

import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import axios from 'axios'
import { SectionTitle, SectionLoader, EmptyState } from '../../../components/HubShared'

const API = '/api'

function getToken() {
  return JSON.parse(localStorage.getItem('auth'))?.access_token || ''
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` }
}

// Maps status → pill colours using CSS vars where possible
const STATUS_STYLE = {
  pending:    { background: '#fef9c3', color: '#854d0e' },
  confirmed:  { background: '#dbeafe', color: '#1e40af' },
  processing: { background: '#ede9fe', color: '#5b21b6' },
  shipped:    { background: '#d1fae5', color: '#065f46' },
  delivered:  { background: '#dcfce7', color: '#166534' },
  cancelled:  { background: '#fee2e2', color: '#991b1b' },
}

export function MyOrdersTab() {
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [detail, setDetail]         = useState({})

  useEffect(() => {
    axios.get(`${API}/orders/my-orders`, { headers: authHeaders() })
      .then(res => {
        const data = res.data
        setOrders(Array.isArray(data) ? data : (data.orders || data.data || []))
      })
      .catch(() => setError('Failed to load orders.'))
      .finally(() => setLoading(false))
  }, [])

  function toggleOrder(orderId) {
    if (!orderId) return
    if (expandedId === orderId) { setExpandedId(null); return }
    setExpandedId(orderId)
    if (detail[orderId]?.data) return
    setDetail(prev => ({ ...prev, [orderId]: { loading: true, data: null, error: '' } }))
    axios.get(`${API}/orders/${orderId}`, { headers: authHeaders() })
      .then(res  => setDetail(prev => ({ ...prev, [orderId]: { loading: false, data: res.data, error: '' } })))
      .catch(()  => setDetail(prev => ({ ...prev, [orderId]: { loading: false, data: null, error: 'Could not load details.' } })))
  }

  if (loading) return <SectionLoader />

  return (
    <div>
      <SectionTitle icon="📦" title="My Orders" subtitle="Your purchase history" />

      <div className="orders-list">
        {error && <div className="alert alert-danger">{error}</div>}

        {orders.length === 0 ? (
          <EmptyState icon="📦" message="No orders yet." action={
            <NavLink to="/search" className="btn btn-primary">Browse Parts</NavLink>
          } />
        ) : orders.map(order => {
          const oid    = order.order_id
          const style  = STATUS_STYLE[order.status] || { background: '#f3f4f6', color: '#374151' }
          const isOpen = expandedId === oid
          const det    = detail[oid]

          return (
            <div key={oid} className={`order-card${isOpen ? ' open' : ''}`}>

              <div className="order-card-summary" onClick={() => toggleOrder(oid)}>
                <div className="order-card-left">
                  <div className="order-card-title">
                    Order #{oid}
                    <span className="order-status-pill" style={style}>{order.status}</span>
                  </div>
                  <div className="order-card-subtitle">
                    {order.garage_name}
                    {order.item_count != null && ` · ${order.item_count} ${order.item_count === 1 ? 'item' : 'items'}`}
                    {order.created_at && ` · ${new Date(order.created_at).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="order-card-right">
                  <span className="order-card-total">QAR {Number(order.total_price).toFixed(2)}</span>
                  <span className="order-card-toggle">{isOpen ? '▲ Hide' : '▼ Details'}</span>
                </div>
              </div>

              {isOpen && (
                <div className="order-card-detail">
                  {det?.loading && <div className="order-detail-loading">Loading items…</div>}
                  {det?.error   && <div className="alert alert-danger">{det.error}</div>}
                  {det?.data    && <OrderDetail data={det.data} />}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function OrderDetail({ data }) {
  const order = data.order || data
  const items = data.items || order.items || []

  return (
    <div>
      {items.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table className="order-items-table">
            <thead>
              <tr>
                {['Part', 'Service', 'Qty', 'Unit Price', 'Subtotal'].map(h => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id ?? idx}>
                  <td>
                    <div className="order-item-name">{item.part_name || item.name || '—'}</div>
                    {item.part_number && <div className="order-item-pn">#{item.part_number}</div>}
                  </td>
                  <td style={{ textTransform: 'capitalize' }}>{item.service_option || '—'}</td>
                  <td>{item.quantity}</td>
                  <td>QAR {Number(item.price).toFixed(2)}</td>
                  <td><strong>QAR {(Number(item.price) * item.quantity).toFixed(2)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="order-detail-total">
        <span className="order-detail-total-label">Order Total</span>
        <span className="order-detail-total-value">QAR {Number(order.total_price).toFixed(2)}</span>
      </div>
    </div>
  )
}