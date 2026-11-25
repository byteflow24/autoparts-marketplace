import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/Authcontext'
import { dispatchCartUpdate } from '../../utils/cartEvent'

/**
 * CartPage  (Customer only)
 *
 * Each item shape (written by useSearch addToCart):
 * {
 *   garage_part_id, garage_id, garage_name,
 *   part_name, part_number, price,
 *   quantity, service_option,
 *   installation_price,
 *   delivery_zones: [{ city, price }]
 * }
 */

const QATAR_CITIES = [
  'Doha', 'Lusail', 'Al Wakra', 'Al Khor',
  'Al Shamal', 'Dukhan', 'Mesaieed', 'Al Shahania',
]

/** Part price + installation only (delivery is per garage group) */
function partUnitTotal(item) {
  if (item.service_option === 'installation') {
    return item.price + (item.installation_price ?? 0)
  }
  return item.price
}

/** Delivery fee for one garage group given selected city */
function garageDeliveryFee(items, city) {
  const hasDelivery = items.some(i => i.service_option === 'delivery')
  if (!hasDelivery || !city) return 0
  const zones = items[0]?.delivery_zones || []
  const zone = zones.find(z => z.city === city)
  return zone ? Number(zone.price) : 0
}

// ── Service option button ─────────────────────────────────────
function ServiceBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display:        'inline-flex',
        alignItems:     'center',
        gap:            '5px',
        padding:        '5px 11px',
        borderRadius:   '6px',
        fontSize:       '0.8rem',
        fontWeight:     active ? 700 : 400,
        cursor:         'pointer',
        transition:     'all 0.15s',
        border:         active ? '2px solid #e67e22' : '1.5px solid #d1d5db',
        background:     active ? '#fff4ec' : '#f9fafb',
        color:          active ? '#e67e22' : '#6b7280',
        whiteSpace:     'nowrap',
      }}
    >
      {children}
    </button>
  )
}

export function CartPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [cart, setCart]               = useState([])
  const [selectedCity, setSelectedCity] = useState('')

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('cart') || '[]')
    setCart(stored)
    setSelectedCity(localStorage.getItem('delivery_city') || '')
  }, [])

  function persist(updated) {
    setCart(updated)
    localStorage.setItem('cart', JSON.stringify(updated))
    dispatchCartUpdate()
  }

  function removeItem(index) {
    persist(cart.filter((_, i) => i !== index))
  }

  function updateQuantity(index, value) {
    const qty = Math.max(1, Number(value))
    persist(cart.map((item, i) => i === index ? { ...item, quantity: qty } : item))
  }

  function updateService(index, service_option) {
    persist(cart.map((item, i) => i === index ? { ...item, service_option } : item))
  }

  function pickCity(city) {
    const next = selectedCity === city ? '' : city
    setSelectedCity(next)
    if (next) localStorage.setItem('delivery_city', next)
    else      localStorage.removeItem('delivery_city')
  }

  function clearCart() {
    persist([])
    setSelectedCity('')
    localStorage.removeItem('delivery_city')
  }

  function handleCheckout() {
    if (!isAuthenticated) { navigate('/login'); return }
    navigate('/checkout')
  }

  // Group by garage (for delivery fee calc)
  const garageGroups = cart.reduce((acc, item) => {
    if (!acc[item.garage_id]) acc[item.garage_id] = { garage_name: item.garage_name, items: [] }
    acc[item.garage_id].items.push(item)
    return acc
  }, {})

  const hasDelivery = cart.some(i => i.service_option === 'delivery')
  const needsCity   = hasDelivery && !selectedCity

  const partsTotal    = cart.reduce((sum, item) => sum + partUnitTotal(item) * item.quantity, 0)
  const deliveryTotal = Object.values(garageGroups).reduce(
    (sum, g) => sum + garageDeliveryFee(g.items, selectedCity), 0
  )
  const total = partsTotal + (hasDelivery ? deliveryTotal : 0)

  return (
    <>
      <title>My Cart | AutoParts Marketplace</title>

      <section className="inventory-section">
        <div className="container">

          {/* ── Header ─────────────────────────────────────── */}
          <div className="inventory-header">
            <div>
              <h1>My Cart</h1>
              <p>Review and adjust your items before checkout.</p>
            </div>
            <div className="inventory-actions">
              <NavLink to="/search" className="btn btn-outline-navy">← Continue Shopping</NavLink>
              {cart.length > 0 && (
                <button className="btn btn-outline-navy" onClick={clearCart}>Clear Cart</button>
              )}
            </div>
          </div>

          {cart.length > 0 ? (
            <>
              {/* ── Items ──────────────────────────────────────── */}
              <div className="inventory-table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Garage</th>
                      <th>Part #</th>
                      <th>
                        Service
                        <span style={{
                          display: 'block', fontSize: '0.7rem', fontWeight: 400,
                          color: '#94a3b8', marginTop: '2px', textTransform: 'none',
                        }}>
                          tap to change
                        </span>
                      </th>
                      <th>Unit Price</th>
                      <th>Qty</th>
                      <th>Subtotal</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, index) => {
                      const canDelivery     = Array.isArray(item.delivery_zones) && item.delivery_zones.length > 0
                      const canInstallation = item.installation_price != null
                      const svc             = item.service_option || 'none'

                      return (
                        <tr key={`${item.garage_part_id}-${index}`}>
                          <td className="td-name">{item.part_name}</td>
                          <td>{item.garage_name}</td>
                          <td>{item.part_number || '—'}</td>

                          {/* ── Service selector ── */}
                          <td style={{ minWidth: '220px' }}>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>

                              <ServiceBtn
                                active={svc === 'none'}
                                onClick={() => updateService(index, 'none')}
                              >
                                🏪 Pickup
                              </ServiceBtn>

                              {canDelivery && (
                                <ServiceBtn
                                  active={svc === 'delivery'}
                                  onClick={() => updateService(index, 'delivery')}
                                >
                                  🚚 Delivery
                                </ServiceBtn>
                              )}

                              {canInstallation && (
                                <ServiceBtn
                                  active={svc === 'installation'}
                                  onClick={() => updateService(index, 'installation')}
                                >
                                  🔧 Install +{Number(item.installation_price).toFixed(0)} QAR
                                </ServiceBtn>
                              )}

                            </div>
                          </td>

                          <td>QAR {partUnitTotal(item).toFixed(2)}</td>
                          <td>
                            <input
                              type="number"
                              className="form-input cart-qty-input"
                              min="1"
                              value={item.quantity}
                              onChange={e => updateQuantity(index, e.target.value)}
                            />
                          </td>
                          <td>
                            <strong>QAR {(partUnitTotal(item) * item.quantity).toFixed(2)}</strong>
                          </td>
                          <td>
                            <button className="btn btn-sm btn-danger" onClick={() => removeItem(index)}>
                              Remove
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* ── City selector (only when any item has delivery) ── */}
              {hasDelivery && (
                <div className="checkout-section-card" style={{ marginTop: '20px' }}>
                  <h3 className="checkout-card-title">🚚 Select Delivery City</h3>
                  <p style={{ marginBottom: '14px', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    One delivery fee is charged per garage. Pick your city to see the exact cost.
                  </p>

                  <div className="city-grid">
                    {QATAR_CITIES.map(city => (
                      <button
                        key={city}
                        type="button"
                        className={`city-chip${selectedCity === city ? ' city-chip-selected' : ''}`}
                        onClick={() => pickCity(city)}
                      >
                        {city}
                      </button>
                    ))}
                  </div>

                  {/* Per-garage fee breakdown */}
                  {selectedCity && (
                    <div style={{
                      marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '12px',
                      display: 'flex', flexDirection: 'column', gap: '6px',
                    }}>
                      {Object.entries(garageGroups).map(([gId, g]) => {
                        if (!g.items.some(i => i.service_option === 'delivery')) return null
                        const fee = garageDeliveryFee(g.items, selectedCity)
                        return (
                          <div key={gId} style={{
                            display: 'flex', justifyContent: 'space-between',
                            fontSize: '0.88rem', color: 'var(--text-muted)',
                          }}>
                            <span>🔧 {g.garage_name} → {selectedCity}</span>
                            <strong style={{ color: fee > 0 ? 'var(--text)' : '#e67e22' }}>
                              {fee > 0 ? `QAR ${fee.toFixed(2)}` : 'Contact garage'}
                            </strong>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {!selectedCity && (
                    <p style={{ marginTop: '10px', fontSize: '0.82rem', color: '#e67e22', fontWeight: 500 }}>
                      ⚠ Select a city to see delivery fees and enable checkout.
                    </p>
                  )}
                </div>
              )}

              {/* ── Summary + Checkout ──────────────────────── */}
              <div className="cart-summary-card">

                <div className="cart-summary-total">
                  <span>Parts & Services</span>
                  <strong>QAR {partsTotal.toFixed(2)}</strong>
                </div>

                {hasDelivery && selectedCity && (
                  <div className="cart-summary-total" style={{ fontSize: '0.95rem', opacity: 0.85 }}>
                    <span>Delivery to {selectedCity}</span>
                    <strong>QAR {deliveryTotal.toFixed(2)}</strong>
                  </div>
                )}

                {hasDelivery && !selectedCity && (
                  <div className="cart-summary-total" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                    <span>Delivery fee</span>
                    <span style={{ fontStyle: 'italic' }}>select city above</span>
                  </div>
                )}

                <div className="cart-summary-total" style={{
                  borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '8px',
                }}>
                  <span><strong>Order Total</strong></span>
                  <strong>QAR {total.toFixed(2)}</strong>
                </div>

                <div className="cart-summary-note">
                  Payment method: <strong>Cash on Delivery</strong>
                </div>

                <button
                  className="btn btn-primary cart-checkout-btn"
                  onClick={handleCheckout}
                  disabled={needsCity}
                >
                  {needsCity ? '⚠ Select a delivery city to continue' : 'Proceed to Checkout'}
                </button>

              </div>
            </>
          ) : (
            <div className="empty-state-card">
              <h2>Your cart is empty</h2>
              <p>Search for parts and add them to your cart.</p>
              <NavLink to="/search" className="btn btn-primary">Search Parts</NavLink>
            </div>
          )}

        </div>
      </section>
    </>
  )
}