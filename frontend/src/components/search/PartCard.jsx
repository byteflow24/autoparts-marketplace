/**
 * PartCard.jsx
 * frontend/src/components/search/PartCard.jsx
 *
 * Supports two display modes passed via `viewMode` prop:
 *   "list"  — compact horizontal card (image left, details right)
 *   "grid"  — vertical card for 2–3 column grid layout
 */

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getPartImage } from '../../utils/partImages'
import { StarRating } from '../reviews/StarRating'
import { dispatchCartUpdate } from '../../utils/cartEvent'
import { CompatibilityBadges } from '../parts/CompatibilityBadges'

const API = '/api'

function getToken() {
  return JSON.parse(localStorage.getItem('auth'))?.access_token || ''
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` }
}

function servicePriceSuffix(price) {
  if (price == null || price === 0) return ''
  return ` — QAR ${Number(price).toFixed(2)}`
}

export function PartCard({ item, config, onConfigChange, onAddToCart, isAdded, isAuthenticated, selectedCarModelId, viewMode = 'list', filterDelivery = false, filterInstallation = false }) {
  const navigate = useNavigate()
  const img = getPartImage(item.image_url, item.category)

  const fitsBadge =
    selectedCarModelId != null &&
    Array.isArray(item.compatible_car_model_ids) &&
    item.compatible_car_model_ids.includes(Number(selectedCarModelId))

  const [isSaved, setIsSaved] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) return
  }, [isAuthenticated])

  async function handleToggleSave(e) {
    e.stopPropagation()
    if (!isAuthenticated) { navigate('/login'); return }
    setSaveLoading(true)
    try {
      if (isSaved) {
        await axios.delete(`${API}/saved-parts/${item.garage_part_id}`, { headers: authHeaders() })
        setIsSaved(false)
      } else {
        await axios.post(`${API}/saved-parts/${item.garage_part_id}`, {}, { headers: authHeaders() })
        setIsSaved(true)
      }
    } catch { }
    finally { setSaveLoading(false) }
  }

  function goToDetail() { navigate(`/parts/${item.part_id}`) }

  function handleAddToCart(e) {
    e.stopPropagation()
    onAddToCart(item)
    dispatchCartUpdate()
  }

  const isList = viewMode === 'list'

  return (
    <div
      className={`part-listing-card ${isList ? 'plc-list-card' : 'plc-grid-card'}`}
      onClick={goToDetail}
      style={{ cursor: 'pointer' }}
      role="article"
      aria-label={`View details for ${item.part_name}`}
    >

      {/* ── Image ─────────────────────────────────── */}
      <div className="plc-img-wrap" style={{ position: 'relative' }}>
        <img
          src={img}
          alt={item.part_name}
          className="plc-img"
          onError={e => { e.target.src = img }}
        />
        {item.brand && (
          <span className="plc-brand-tag">{item.brand}</span>
        )}
        {fitsBadge && (
          <div className="plc-fits-badge">✅ Fits your car</div>
        )}
        <button
          onClick={handleToggleSave}
          disabled={saveLoading}
          title={isSaved ? 'Remove from saved' : 'Save this part'}
          className="plc-bookmark-btn"
          style={{
            background: isSaved ? '#e67e22' : 'rgba(255,255,255,0.92)',
            border: `1.5px solid ${isSaved ? '#e67e22' : '#d1d5db'}`,
            opacity: saveLoading ? 0.6 : 1,
          }}
        >
          🔖
        </button>
      </div>

      {/* ── Details ───────────────────────────────── */}
      <div className="plc-details">

        {/* Name + price */}
        <div className="plc-top-row">
          <h3 className="plc-name">{item.part_name}</h3>
          <div className="plc-price-inline">
            <span className="plc-price-label">QAR</span>
            <span className="plc-price-value">{item.price.toFixed(2)}</span>
          </div>
        </div>

        {item.average_rating && (
          <StarRating rating={item.average_rating} total={item.total_reviews} size="sm" />
        )}

        {/* Part # + compatibility — hidden in grid to save height */}
        {!isList && (
          <div className="plc-meta-row">
            {item.part_number && (
              <span className="plc-meta">Part # <strong>{item.part_number}</strong></span>
            )}
            <CompatibilityBadges
              carMake={item.car_make}
              carModel={item.car_model}
              fromYear={item.from_year}
              toYear={item.to_year}
              condition={item.condition}
              countryOfOrigin={item.country_of_origin}
              size="sm"
            />
          </div>
        )}

        {/* Garage + stock */}
        <div className="plc-garage-row">
          <span className="plc-garage-icon">🔧</span>
          <span className="plc-garage-name">{item.garage_name}</span>
          <span className="plc-stock">
            {item.quantity > 10
              ? <span className="in-stock">In Stock</span>
              : item.quantity > 0
                ? <span className="low-stock">Only {item.quantity} left</span>
                : <span className="out-stock">Out of Stock</span>}
          </span>
        </div>

        {/* Service selector */}
        <div className="plc-service-row">
          <span className="plc-service-label">Service:</span>
          <div className="plc-service-options">
            <span className="svc-badge svc-pickup">🏪 Pickup</span>
            {item.delivery && !filterInstallation && (
              <label
                className={`plc-svc-pill ${config.service_option === 'delivery' ? 'svc-active' : ''}`}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  onConfigChange(item.garage_part_id, 'service_option',
                    config.service_option === 'delivery' ? 'none' : 'delivery')
                }}
              >
                <input type="radio" name={`svc_${item.garage_part_id}`} value="delivery"
                  checked={config.service_option === 'delivery'}
                  onChange={() => { }} />
                🚚 Delivery
              </label>
            )}
            {item.installation && !filterDelivery && (
              <label
                className={`plc-svc-pill ${config.service_option === 'installation' ? 'svc-active' : ''}`}
                onClick={e => e.stopPropagation()}
                onMouseDown={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  onConfigChange(item.garage_part_id, 'service_option',
                    config.service_option === 'installation' ? 'none' : 'installation')
                }}
              >
                <input type="radio" name={`svc_${item.garage_part_id}`} value="installation"
                  checked={config.service_option === 'installation'}
                  onChange={() => { }} />
                🔧 Installation{servicePriceSuffix(item.installation_price)}
              </label>
            )}
          </div>
        </div>

        {config.service_option === 'installation' && item.installation && item.installation_price > 0 && (
          <div className="plc-service-price-note">+ Installation: QAR {Number(item.installation_price).toFixed(2)}</div>
        )}

        {/* Cart controls */}
        <div className="plc-cart-inline" onClick={e => e.stopPropagation()}>
          <div className="plc-qty-row">
            <label className="plc-qty-label">Qty</label>
            <input
              type="number" className="plc-qty-input"
              min="1" max={item.quantity}
              value={config.quantity}
              onChange={e => onConfigChange(item.garage_part_id, 'quantity', e.target.value)}
              onClick={e => e.stopPropagation()}
            />
            <span className="plc-subtotal-inline">
              Subtotal: <strong>QAR {(item.price * config.quantity).toFixed(2)}</strong>
            </span>
          </div>

          <div className="plc-btn-row">
            {isAuthenticated ? (
              <button
                className={`btn plc-cart-btn ${isAdded ? 'plc-added' : 'btn-primary'}`}
                onClick={handleAddToCart}
                disabled={isAdded || item.quantity === 0}
              >
                {isAdded ? '✓ Added' : 'Add to Cart'}
              </button>
            ) : (
              <a href="/login" className="btn btn-primary plc-cart-btn" onClick={e => e.stopPropagation()}>
                Login to Order
              </a>
            )}
            <button
              className="btn btn-outline-navy plc-cart-btn"
              onClick={e => { e.stopPropagation(); goToDetail() }}
            >
              See Details
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}