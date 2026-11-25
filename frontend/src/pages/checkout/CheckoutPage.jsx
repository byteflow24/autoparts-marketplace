import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../../context/Authcontext'

const API = '/api'

function capitalize(str) {
  if (!str) return 'None'
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function StepIndicator({ current, step, label, num }) {
  const isActive = current === step
  const isDone = (
    (step === 'review'  && (current === 'payment' || current === 'confirm')) ||
    (step === 'payment' && current === 'confirm')
  )
  return (
    <div className={`checkout-step ${isActive ? 'step-active' : ''} ${isDone ? 'step-done' : ''}`}>
      <div className="checkout-step-circle">{isDone ? '✓' : num}</div>
      <span>{label}</span>
    </div>
  )
}

/** Human-readable service label */
function serviceLabel(item) {
  if (!item.service_option || item.service_option === 'none') return 'Pickup only'
  if (item.service_option === 'installation') {
    const price = item.installation_price
    return price != null
      ? `Installation · QAR ${Number(price).toFixed(2)}`
      : 'Installation · Contact for price'
  }
  if (item.service_option === 'delivery') return 'Delivery'
  return capitalize(item.service_option)
}

/** Part cost only (installation included, delivery is separate per garage group) */
function partUnitTotal(item) {
  if (item.service_option === 'installation') {
    return item.price + (item.installation_price ?? 0)
  }
  return item.price
}

/** Delivery fee for a garage group given the selected city */
function garageDeliveryFee(items, city) {
  const hasDelivery = items.some(i => i.service_option === 'delivery')
  if (!hasDelivery || !city) return 0
  const zones = items[0]?.delivery_zones || []
  const zone = zones.find(z => z.city === city)
  return zone ? Number(zone.price) : 0
}

export function CheckoutPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()

  const [cart, setCart]               = useState([])
  const [step, setStep]               = useState('review')
  const [paymentMethod, setPaymentMethod] = useState('cod')
  const [selectedCity, setSelectedCity]   = useState('')
  const [loading, setLoading]         = useState(false)
  const [error,   setError]           = useState('')
  const [success, setSuccess]         = useState(false)

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return }
    const stored = JSON.parse(localStorage.getItem('cart') || '[]')
    if (stored.length === 0) { navigate('/cart'); return }
    setCart(stored)
    // City was selected in CartPage — read it here
    setSelectedCity(localStorage.getItem('delivery_city') || '')
  }, [])

  // Group cart by garage
  const garageGroups = cart.reduce((acc, item) => {
    if (!acc[item.garage_id]) acc[item.garage_id] = { garage_name: item.garage_name, items: [] }
    acc[item.garage_id].items.push(item)
    return acc
  }, {})

  const hasDelivery = cart.some(i => i.service_option === 'delivery')

  const partsTotal = cart.reduce((sum, item) => sum + partUnitTotal(item) * item.quantity, 0)
  const deliveryTotal = Object.values(garageGroups).reduce(
    (sum, g) => sum + garageDeliveryFee(g.items, selectedCity), 0
  )
  const total = partsTotal + (hasDelivery ? deliveryTotal : 0)

  async function handlePlaceOrder() {
    setLoading(true)
    setError('')
    try {
      await axios.post(`${API}/orders/checkout`, {
        payment_method: paymentMethod,
        delivery_city:  selectedCity || null,
        cart: cart.map(item => ({
          garage_part_id: item.garage_part_id,
          garage_id:      item.garage_id,
          quantity:       item.quantity,
          service_option: item.service_option,
        }))
      })
      localStorage.removeItem('cart')
      localStorage.removeItem('delivery_city')
      setCart([])
      setSuccess(true)
      setTimeout(() => navigate('/hub'), 2000)
    } catch (err) {
      setError(err?.response?.data?.error || 'Order failed. Please try again.')
      setStep('review')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <section className="inventory-section">
        <div className="container">
          <div className="checkout-success">
            <div className="checkout-success-icon">✅</div>
            <h1>Order Placed!</h1>
            <p>Your order was placed successfully. Redirecting…</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <title>Checkout | AutoParts Marketplace</title>
      <section className="inventory-section">
        <div className="container">

          <div className="checkout-steps">
            <StepIndicator current={step} step="review"  label="Review"  num={1} />
            <div className="checkout-step-divider" />
            <StepIndicator current={step} step="payment" label="Payment" num={2} />
            <div className="checkout-step-divider" />
            <StepIndicator current={step} step="confirm" label="Confirm" num={3} />
          </div>

          {error && <div className="alert alert-danger" style={{ marginBottom: '20px' }}>{error}</div>}

          {/* ── STEP 1: REVIEW ── */}
          {step === 'review' && (
            <>
              <div className="inventory-header">
                <div>
                  <h1>Review Your Order</h1>
                  <p>Check your items before choosing payment.</p>
                </div>
                <div className="inventory-actions">
                  <NavLink to="/cart" className="btn btn-outline-navy">← Back to Cart</NavLink>
                </div>
              </div>

              <div className="inventory-table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Garage</th>
                      <th>Service</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((item, i) => (
                      <tr key={i}>
                        <td className="td-name">{item.part_name}</td>
                        <td>{item.garage_name}</td>
                        <td><span className="service-tag">{serviceLabel(item)}</span></td>
                        <td>QAR {item.price.toFixed(2)}</td>
                        <td>{item.quantity}</td>
                        <td><strong>QAR {(partUnitTotal(item) * item.quantity).toFixed(2)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Delivery summary (city already chosen in cart) */}
              {hasDelivery && (
                <div className="alert alert-info" style={{ marginTop: '12px' }}>
                  🚚 Delivering to <strong>{selectedCity || '—'}</strong>
                  {' · '}
                  <NavLink to="/cart" style={{ color: 'inherit', textDecoration: 'underline' }}>
                    Change city
                  </NavLink>
                </div>
              )}

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
                <div className="cart-summary-total" style={{ borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '8px' }}>
                  <span><strong>Order Total</strong></span>
                  <strong>QAR {total.toFixed(2)}</strong>
                </div>
                <button className="btn btn-primary cart-checkout-btn" onClick={() => setStep('payment')}>
                  Continue to Payment
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: PAYMENT ── */}
          {step === 'payment' && (
            <>
              <div className="inventory-header">
                <div><h1>Payment</h1><p>Select a payment method.</p></div>
                <div className="inventory-actions">
                  <button className="btn btn-outline-navy" onClick={() => setStep('review')}>← Back</button>
                </div>
              </div>

              {/* Delivery fee breakdown (read-only — city was set in cart) */}
              {hasDelivery && selectedCity && (
                <div className="checkout-section-card">
                  <h3 className="checkout-card-title">🚚 Delivery to {selectedCity}</h3>
                  {Object.entries(garageGroups).map(([gId, g]) => {
                    const hasD = g.items.some(i => i.service_option === 'delivery')
                    if (!hasD) return null
                    const fee = garageDeliveryFee(g.items, selectedCity)
                    return (
                      <div key={gId} className="checkout-confirm-row" style={{ padding: '6px 0' }}>
                        <span>{g.garage_name}</span>
                        <strong>{fee > 0 ? `QAR ${fee.toFixed(2)}` : 'Contact garage'}</strong>
                      </div>
                    )
                  })}
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Want to change city? <NavLink to="/cart" style={{ color: '#e67e22' }}>Go back to cart</NavLink>
                  </div>
                </div>
              )}

              <div className="checkout-section-card">
                <div className="checkout-total-line">
                  <span>Parts & Services</span>
                  <strong>QAR {partsTotal.toFixed(2)}</strong>
                </div>
                {hasDelivery && selectedCity && (
                  <div className="checkout-total-line">
                    <span>Delivery to {selectedCity}</span>
                    <strong>QAR {deliveryTotal.toFixed(2)}</strong>
                  </div>
                )}
                <div className="checkout-total-line" style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '8px' }}>
                  <span><strong>Order Total</strong></span>
                  <strong>QAR {total.toFixed(2)}</strong>
                </div>
              </div>

              <div className="checkout-section-card">
                <h3 className="checkout-card-title">Choose Payment Method</h3>
                <label className={`payment-option ${paymentMethod === 'cod' ? 'payment-selected' : ''}`}>
                  <input type="radio" name="payment_method" value="cod"
                    checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} />
                  <div className="payment-option-body">
                    <span className="payment-option-icon">💵</span>
                    <div>
                      <strong>Cash on Delivery (COD)</strong>
                      <p>Pay when your order arrives.</p>
                    </div>
                  </div>
                </label>
                <label className="payment-option payment-option-disabled">
                  <input type="radio" disabled />
                  <div className="payment-option-body">
                    <span className="payment-option-icon">💳</span>
                    <div><strong>Card Payment</strong><p>Coming soon.</p></div>
                  </div>
                </label>
                <button
                  className="btn btn-primary cart-checkout-btn"
                  style={{ marginTop: '20px' }}
                  onClick={() => setStep('confirm')}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {/* ── STEP 3: CONFIRM ── */}
          {step === 'confirm' && (
            <>
              <div className="inventory-header">
                <div><h1>Confirm Order</h1><p>Review the final details and place your order.</p></div>
                <div className="inventory-actions">
                  <button className="btn btn-outline-navy" onClick={() => setStep('payment')}>← Back</button>
                </div>
              </div>

              <div className="checkout-section-card">
                <h3 className="checkout-card-title">Order Summary</h3>
                <div className="checkout-confirm-grid">
                  <div className="checkout-confirm-row">
                    <span>Payment Method</span>
                    <strong>{paymentMethod === 'cod' ? 'Cash on Delivery' : paymentMethod}</strong>
                  </div>
                  {selectedCity && (
                    <div className="checkout-confirm-row">
                      <span>Delivery City</span>
                      <strong>{selectedCity}</strong>
                    </div>
                  )}
                  <div className="checkout-confirm-row">
                    <span>Parts & Services</span>
                    <strong>QAR {partsTotal.toFixed(2)}</strong>
                  </div>
                  {hasDelivery && selectedCity && (
                    <div className="checkout-confirm-row">
                      <span>Delivery Fee</span>
                      <strong>QAR {deliveryTotal.toFixed(2)}</strong>
                    </div>
                  )}
                  <div className="checkout-confirm-row">
                    <span>Order Total</span>
                    <strong className="text-highlight">QAR {total.toFixed(2)}</strong>
                  </div>
                </div>
              </div>

              <div className="checkout-section-card">
                <h3 className="checkout-card-title">Items</h3>
                <div className="checkout-items-list">
                  {cart.map((item, i) => (
                    <div className="checkout-item-row" key={i}>
                      <div>
                        <strong>{item.part_name}</strong>
                        <span>{item.garage_name} · {serviceLabel(item)}</span>
                      </div>
                      <span>
                        {item.quantity} × QAR {partUnitTotal(item).toFixed(2)} ={' '}
                        <strong>QAR {(partUnitTotal(item) * item.quantity).toFixed(2)}</strong>
                      </span>
                    </div>
                  ))}
                  {/* Delivery fee line per garage */}
                  {hasDelivery && selectedCity && Object.entries(garageGroups).map(([gId, g]) => {
                    if (!g.items.some(i => i.service_option === 'delivery')) return null
                    const fee = garageDeliveryFee(g.items, selectedCity)
                    return (
                      <div className="checkout-item-row" key={`delivery-${gId}`}>
                        <div>
                          <strong>Delivery — {g.garage_name}</strong>
                          <span>To {selectedCity}</span>
                        </div>
                        <span><strong>QAR {fee.toFixed(2)}</strong></span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="cart-summary-card">
                <div className="cart-summary-total">
                  <span>Order Total</span>
                  <strong>QAR {total.toFixed(2)}</strong>
                </div>
                <div className="cart-summary-note">
                  By placing this order you agree to our terms. Payment: <strong>Cash on Delivery</strong>.
                </div>
                <button
                  className="btn btn-primary cart-checkout-btn"
                  onClick={handlePlaceOrder}
                  disabled={loading}
                >
                  {loading ? 'Placing Order…' : '✓ Place Order'}
                </button>
              </div>
            </>
          )}

        </div>
      </section>
    </>
  )
}