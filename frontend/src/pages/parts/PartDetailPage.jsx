/**
 * PartDetailPage.jsx
 * Place at: frontend/src/pages/parts/PartDetailPage.jsx
 *
 * Route: /parts/:part_id
 *
 * Sections:
 *   1. Part hero — image, name, rating, description
 *   2. Available from garages — price comparison table
 *   3. Part reviews — list + submit form
 *   4. Related parts — same category grid
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, NavLink } from 'react-router-dom'
import axios from 'axios'
import { useAuth }            from '../../context/Authcontext'
import { StarRating }         from '../../components/reviews/StarRating'
import { ReviewList }         from '../../components/reviews/ReviewList'
import { ReviewForm }         from '../../components/reviews/ReviewForm'
import { getPartImage }       from '../../utils/partImages'
import { dispatchCartUpdate }    from '../../utils/cartEvent'
import { CompatibilityBadges }   from '../../components/parts/CompatibilityBadges'
 
const API = '/api'
 
// ── helper: default service for a listing ────────────────────
function defaultService(listing) {
  if (listing.delivery)     return 'delivery'
  if (listing.installation) return 'installation'
  return 'none'
}
 
// ── helper: how many service options does a listing have ──────
function serviceCount(listing) {
  return [listing.delivery, listing.installation].filter(Boolean).length
}
 
export function PartDetailPage() {
  const { part_id }  = useParams()
  const navigate     = useNavigate()
  const { isAuthenticated, user } = useAuth()
 
  const [part,           setPart]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
 
  // Reviews
  const [reviews,        setReviews]        = useState({ reviews: [], average_rating: null, total_reviews: 0 })
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [canReview,      setCanReview]      = useState(false)
  const [showForm,       setShowForm]       = useState(false)
 
  // Per-listing: { [garage_part_id]: { quantity, service_option } }
  const [listingConfig, setListingConfig] = useState({})
 
  // Cart feedback { [garage_part_id]: true }
  const [addedIds, setAddedIds] = useState({})
 
  // ── Idea 1: single-seller section visible state ────────────
  const [showAllSellers, setShowAllSellers] = useState(false)
 
  // ── Idea 2: share / copy link ──────────────────────────────
  const [linkCopied, setLinkCopied] = useState(false)
 
  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }
 
  // ── Idea 5: mobile sticky footer scroll detection ──────────
  const heroRef = useRef(null)
  const [showStickyBar, setShowStickyBar] = useState(false)
 
  useEffect(() => {
    function onScroll() {
      if (!heroRef.current) return
      const bottom = heroRef.current.getBoundingClientRect().bottom
      setShowStickyBar(bottom < 0)   // show after hero scrolls out of view
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
 
  // ── Fetch part ───────────────────────────────────────────────
  const loadPart = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${API}/parts/${part_id}`)
      const data = res.data
      setPart(data)
 
      // Initialise per-listing config
      const cfg = {}
      data.listings.forEach(l => {
        cfg[l.garage_part_id] = { quantity: 1, service_option: defaultService(l) }
      })
      setListingConfig(cfg)
    } catch (err) {
      setError(err?.response?.data?.error || 'Part not found.')
    } finally {
      setLoading(false)
    }
  }, [part_id])
 
  const loadReviews = useCallback(async () => {
    setReviewsLoading(true)
    try {
      const res = await axios.get(`${API}/reviews/part/${part_id}`)
      setReviews(res.data)
    } catch { /* silent */ } finally {
      setReviewsLoading(false)
    }
  }, [part_id])
 
  const checkCanReview = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'customer') return
    try {
      const res = await axios.get(`${API}/reviews/part/${part_id}/can-review`)
      setCanReview(res.data.can_review)
    } catch { /* silent */ }
  }, [part_id, isAuthenticated, user])
 
  useEffect(() => {
    loadPart()
    loadReviews()
    checkCanReview()
  }, [loadPart, loadReviews, checkCanReview])
 
  // ── Config updater ────────────────────────────────────────────
  function updateConfig(garage_part_id, field, value) {
    setListingConfig(prev => ({
      ...prev,
      [garage_part_id]: { ...prev[garage_part_id], [field]: value }
    }))
  }
 
  // ── Add to cart ───────────────────────────────────────────────
  function addToCart(listing) {
    const cfg = listingConfig[listing.garage_part_id] || { quantity: 1, service_option: defaultService(listing) }
    const cartItem = {
      garage_part_id: listing.garage_part_id,
      garage_id:      listing.garage_id,
      garage_name:    listing.garage_name,
      part_name:      part.name,
      part_number:    part.part_number,
      price:          listing.price,
      quantity:       Number(cfg.quantity),
      service_option: cfg.service_option,
    }
    const existing = JSON.parse(localStorage.getItem('cart') || '[]')
    const idx = existing.findIndex(c => c.garage_part_id === cartItem.garage_part_id)
    if (idx >= 0) existing[idx].quantity += cartItem.quantity
    else existing.push(cartItem)
    localStorage.setItem('cart', JSON.stringify(existing))
    dispatchCartUpdate()   // ← badge updates instantly
 
    setAddedIds(prev => ({ ...prev, [listing.garage_part_id]: true }))
    setTimeout(() => {
      setAddedIds(prev => { const n = { ...prev }; delete n[listing.garage_part_id]; return n })
    }, 2000)
  }
 
  function yearRange(from, to) {
    if (from && to) return `${from}–${to}`
    if (from)       return `From ${from}`
    if (to)         return `Up to ${to}`
    return null
  }
 
  // ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="container" style={{ padding: '60px 24px' }}>
      <div className="search-skeleton-list">
        {[1,2].map(n => (
          <div className="skeleton-card" key={n} style={{ height: 220 }}>
            <div className="skeleton-img"/>
            <div className="skeleton-body">
              <div className="skeleton-line skeleton-line-lg"/>
              <div className="skeleton-line skeleton-line-md"/>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
 
  if (error) return (
    <div className="container" style={{ padding: '60px 24px' }}>
      <div className="alert alert-danger">{error}</div>
      <button className="btn btn-outline-navy" style={{ marginTop: '16px' }} onClick={() => navigate(-1)}>← Back</button>
    </div>
  )
 
  const img         = getPartImage(part.image_url, part.category)
  const bestListing = part.listings[0] || null   // cheapest first (sorted by backend)
  const bestCfg     = bestListing ? (listingConfig[bestListing.garage_part_id] || { quantity: 1, service_option: defaultService(bestListing) }) : null
 
  return (
    <>
      <title>{part.name} | AutoParts Marketplace</title>
 
      <div className="pd-page">
 
        {/* ── Breadcrumb ──────────────────────────────────── */}
        <div className="container pd-breadcrumb">
          <NavLink to="/search">Search</NavLink>
          <span>›</span>
          <span className="pd-breadcrumb-cat" onClick={() => navigate(`/search?category=${encodeURIComponent(part.category || '')}`)}>
            {part.category || 'Parts'}
          </span>
          <span>›</span>
          <span>{part.name}</span>
        </div>
 
        {/* ══════════════════════════════════════════════════
            HERO
        ══════════════════════════════════════════════════ */}
        <section className="pd-hero" ref={heroRef}>
          <div className="container pd-hero-layout">
 
            {/* ── Left: image ─────────────────────────────── */}
            <div className="pd-img-wrap">
              <img src={img} alt={part.name} className="pd-img" />
              {part.verified && (
                <span className="pd-verified-badge">✓ Verified Part</span>
              )}
              {part.category && (
                <span className="pd-category-badge">{part.category}</span>
              )}
              {/* Idea 4: OEM vs Aftermarket condition badge */}
              {part.oem_number
                ? <span className="pd-condition-badge pd-condition-oem">OEM</span>
                : part.brand
                ? <span className="pd-condition-badge pd-condition-aftermarket">Aftermarket</span>
                : null
              }
            </div>
 
            {/* ── Middle: part info ──────────────────────── */}
            <div className="pd-hero-info">
 
              {/* Brand */}
              {(part.brand || part.oem_number) && (
                <p className="pd-brand">
                  {part.brand}
                  {part.oem_number && ` · ${part.oem_number}`}
                </p>
              )}
 
              {/* Title + share button */}
              <div className="pd-title-row">
                <h1 className="pd-title">{part.name}</h1>
                <button
                  className="pd-share-btn"
                  onClick={handleCopyLink}
                  title="Copy link to this part"
                >
                  {linkCopied ? '✓ Link Copied!' : '🔗 Share'}
                </button>
              </div>
 
              {/* Rating */}
              <div className="pd-rating-row">
                <StarRating rating={part.average_rating} total={part.total_reviews} size="md" />
              </div>
 
              {/* Meta grid */}
              <div className="pd-meta-grid">
                {part.part_number && (
                  <div className="pd-meta-item">
                    <span className="pd-meta-label">Part Number</span>
                    <span className="pd-meta-value">{part.part_number}</span>
                  </div>
                )}
                {part.oem_number && (
                  <div className="pd-meta-item">
                    <span className="pd-meta-label">OEM Number</span>
                    <span className="pd-meta-value">{part.oem_number}</span>
                  </div>
                )}
                {part.manufacturer && (
                  <div className="pd-meta-item">
                    <span className="pd-meta-label">Manufacturer</span>
                    <span className="pd-meta-value">{part.manufacturer}</span>
                  </div>
                )}
                {part.category && (
                  <div className="pd-meta-item">
                    <span className="pd-meta-label">Category</span>
                    <span className="pd-meta-value">{part.category}</span>
                  </div>
                )}
                {part.country_of_origin && (
                  <div className="pd-meta-item">
                    <span className="pd-meta-label">Made In</span>
                    <span className="pd-meta-value">{part.country_of_origin}</span>
                  </div>
                )}
              </div>
 
              {/* Description */}
              {part.description && (
                <p className="pd-description">{part.description}</p>
              )}
 
              {/* Idea 3: social proof */}
              {part.listings.length > 0 && (
                <p className="pd-social-proof">
                  🔥 Available from {part.listings.length} verified {part.listings.length === 1 ? 'garage' : 'garages'} in your area
                </p>
              )}
 
              {/* Compatibility + origin badges */}
              {bestListing && (
                <div style={{ marginTop: '14px' }}>
                  <CompatibilityBadges
                    carMake={bestListing.car_make}
                    carModel={bestListing.car_model}
                    fromYear={bestListing.from_year}
                    toYear={bestListing.to_year}
                    condition={bestListing.condition}
                    countryOfOrigin={part.country_of_origin}
                  />
                </div>
              )}
 
              {/* Quick facts strip */}
              {bestListing && (
                <div className="pd-quick-facts">
                  <span className={`pd-fact ${bestListing.quantity > 5 ? 'pd-fact-green' : 'pd-fact-orange'}`}>
                    {bestListing.quantity > 5 ? '✓ In Stock' : `⚠ Only ${bestListing.quantity} left`}
                  </span>
                  <span className="pd-fact">
                    🏪 {part.listings.length} {part.listings.length === 1 ? 'seller' : 'sellers'}
                  </span>
                </div>
              )}
            </div>
 
            {/* ── Right: buy panel (best listing) ──────── */}
            {bestListing && bestCfg && (
              <div className="pd-buy-panel">
 
                {/* Garage info */}
                <div className="pd-buy-garage">
                  <span className="pd-buy-garage-label">Sold by</span>
                  <NavLink to={`/garage/${bestListing.garage_id}`} className="pd-buy-garage-name">
                    🔧 {bestListing.garage_name}
                  </NavLink>
                  {bestListing.garage_location && (
                    <span className="pd-buy-garage-loc">📍 {bestListing.garage_location}</span>
                  )}
                </div>
 
                {/* Price */}
                <div className="pd-buy-price">
                  <span className="pd-buy-price-label">Price</span>
                  <span className="pd-buy-price-value">QAR {bestListing.price.toFixed(2)}</span>
                  {part.listings.length > 1 && (
                    <span className="pd-buy-best-tag">Best Price</span>
                  )}
                </div>
 
                {/* Service selector */}
                {serviceCount(bestListing) > 0 && (
                  <div className="pd-buy-service">
                    <span className="pd-buy-service-label">Service Option</span>
                    <div className="pd-buy-service-opts">
                      {bestListing.delivery && (
                        <label className={`plc-svc-pill ${bestCfg.service_option === 'delivery' ? 'svc-active' : ''}`}>
                          <input type="radio" name={`hero_svc_${bestListing.garage_part_id}`} value="delivery"
                            checked={bestCfg.service_option === 'delivery'}
                            onChange={() => updateConfig(bestListing.garage_part_id, 'service_option', 'delivery')} />
                          🚚 Delivery
                        </label>
                      )}
                      {bestListing.installation && (
                        <label className={`plc-svc-pill ${bestCfg.service_option === 'installation' ? 'svc-active' : ''}`}>
                          <input type="radio" name={`hero_svc_${bestListing.garage_part_id}`} value="installation"
                            checked={bestCfg.service_option === 'installation'}
                            onChange={() => updateConfig(bestListing.garage_part_id, 'service_option', 'installation')} />
                          🔩 Installation
                        </label>
                      )}
                    </div>
                  </div>
                )}
 
                {/* Qty + Add to Cart */}
                <div className="pd-buy-qty-row">
                  <label className="pd-buy-qty-label">Qty</label>
                  <input
                    type="number"
                    className="plc-qty-input"
                    min="1"
                    max={bestListing.quantity}
                    value={bestCfg.quantity}
                    onChange={e => updateConfig(bestListing.garage_part_id, 'quantity', e.target.value)}
                  />
                </div>
 
                {isAuthenticated ? (
                  <button
                    className={`btn pd-buy-btn ${addedIds[bestListing.garage_part_id] ? 'plc-added' : 'btn-primary'}`}
                    onClick={() => addToCart(bestListing)}
                    disabled={!!addedIds[bestListing.garage_part_id]}
                  >
                    {addedIds[bestListing.garage_part_id] ? '✓ Added to Cart' : 'Add to Cart'}
                  </button>
                ) : (
                  <NavLink to="/login" className="btn btn-primary pd-buy-btn">
                    Login to Order
                  </NavLink>
                )}
 
                <p className="pd-buy-subtotal">
                  Subtotal: QAR {(bestListing.price * Number(bestCfg.quantity)).toFixed(2)}
                </p>
 
                {/* COD note */}
                <p className="pd-buy-cod">💵 Cash on Delivery available</p>
 
              </div>
            )}
 
          </div>
        </section>
 
        {/* ══════════════════════════════════════════════════
            BODY
        ══════════════════════════════════════════════════ */}
        <div className="container pd-body">
 
          {/* ── Available from Garages ───────────────────── */}
          {part.listings.length >= 1 && (
            <section className="pd-section">
              <div className="pd-section-header" style={{ marginBottom: '20px' }}>
                <h2 className="pd-section-title" style={{ margin: 0, borderBottom: 'none', padding: 0 }}>
                  {part.listings.length === 1
                    ? '1 Garage Has This Part'
                    : `Compare All ${part.listings.length} Sellers`}
                </h2>
                {part.listings.length === 1 && (
                  <span className="pd-one-seller-note">
                    Only 1 seller right now — check back later for more.
                  </span>
                )}
              </div>
 
              <div className="pd-listings">
                {part.listings.map((listing, idx) => {
                  const cfg = listingConfig[listing.garage_part_id] || { quantity: 1, service_option: defaultService(listing) }
                  const hasSvcChoice = serviceCount(listing) > 1
 
                  return (
                    <div
                      className={`pd-listing-row ${idx === 0 ? 'pd-listing-best' : ''}`}
                      key={listing.garage_part_id}
                    >
                      {idx === 0 && <span className="pd-best-badge">Best Price</span>}
 
                      {/* Garage info */}
                      <div className="pd-listing-garage">
                        <NavLink to={`/garage/${listing.garage_id}`} className="pd-garage-link">
                          🔧 {listing.garage_name}
                        </NavLink>
                        {listing.garage_location && (
                          <span className="pd-garage-loc">📍 {listing.garage_location}</span>
                        )}
                      </div>
 
                      {/* Badges + service selector */}
                      <div className="pd-listing-middle">
                        {/* Car + condition compatibility */}
                        <CompatibilityBadges
                          carMake={listing.car_make}
                          carModel={listing.car_model}
                          fromYear={listing.from_year}
                          toYear={listing.to_year}
                          condition={listing.condition}
                          size="sm"
                        />
                        <div className="pd-listing-meta">
                          {listing.delivery     && <span className="svc-badge svc-delivery">🚚 Delivery</span>}
                          {listing.installation && <span className="svc-badge svc-install">🔩 Installation</span>}
                          <span className={listing.quantity > 5 ? 'in-stock' : 'low-stock'}>
                            {listing.quantity > 5 ? 'In Stock' : `Only ${listing.quantity} left`}
                          </span>
                        </div>
 
                        {/* Service selector — only when multiple options */}
                        {hasSvcChoice && (
                          <div className="pd-listing-svc-row">
                            <span className="pd-buy-service-label">Service:</span>
                            <div className="pd-buy-service-opts">
                              {listing.delivery && (
                                <label className={`plc-svc-pill ${cfg.service_option === 'delivery' ? 'svc-active' : ''}`}>
                                  <input type="radio" name={`svc_${listing.garage_part_id}`} value="delivery"
                                    checked={cfg.service_option === 'delivery'}
                                    onChange={() => updateConfig(listing.garage_part_id, 'service_option', 'delivery')} />
                                  Delivery
                                </label>
                              )}
                              {listing.installation && (
                                <label className={`plc-svc-pill ${cfg.service_option === 'installation' ? 'svc-active' : ''}`}>
                                  <input type="radio" name={`svc_${listing.garage_part_id}`} value="installation"
                                    checked={cfg.service_option === 'installation'}
                                    onChange={() => updateConfig(listing.garage_part_id, 'service_option', 'installation')} />
                                  Installation
                                </label>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
 
                      {/* Price + qty + cart */}
                      <div className="pd-listing-cart">
                        <span className="pd-listing-price">QAR {listing.price.toFixed(2)}</span>
                        <input
                          type="number"
                          className="plc-qty-input"
                          min="1"
                          max={listing.quantity}
                          value={cfg.quantity}
                          onChange={e => updateConfig(listing.garage_part_id, 'quantity', e.target.value)}
                        />
                        {isAuthenticated ? (
                          <button
                            className={`btn pd-add-btn ${addedIds[listing.garage_part_id] ? 'plc-added' : 'btn-primary'}`}
                            onClick={() => addToCart(listing)}
                            disabled={!!addedIds[listing.garage_part_id]}
                          >
                            {addedIds[listing.garage_part_id] ? '✓ Added' : 'Add to Cart'}
                          </button>
                        ) : (
                          <NavLink to="/login" className="btn btn-primary pd-add-btn">
                            Login
                          </NavLink>
                        )}
                      </div>
 
                    </div>
                  )
                })}
              </div>
            </section>
          )}
 
          {/* ── Customer Reviews ─────────────────────────── */}
          <section className="pd-section">
            <div className="pd-section-header">
              <h2 className="pd-section-title">Customer Reviews</h2>
              {canReview && !showForm && (
                <button className="btn btn-outline-navy" onClick={() => setShowForm(true)}>
                  Write a Review
                </button>
              )}
            </div>
 
            {showForm && (
              <div style={{ marginBottom: '28px' }}>
                <ReviewForm
                  type="part"
                  targetId={Number(part_id)}
                  onSuccess={() => { setShowForm(false); setCanReview(false); loadReviews() }}
                />
              </div>
            )}
 
            <ReviewList
              reviews={reviews.reviews}
              averageRating={reviews.average_rating}
              totalReviews={reviews.total_reviews}
              loading={reviewsLoading}
            />
          </section>
 
          {/* ── Related Parts ─────────────────────────────── */}
          {part.related_parts.length > 0 && (
            <section className="pd-section">
              <h2 className="pd-section-title">Related {part.category} Parts</h2>
              <div className="pd-related-grid">
                {part.related_parts.map(rp => (
                  <button
                    key={rp.part_id}
                    className="pd-related-card"
                    onClick={() => navigate(`/parts/${rp.part_id}`)}
                  >
                    <div className="pd-related-img-wrap">
                      <img src={getPartImage(rp.image_url, rp.category)} alt={rp.part_name} className="pd-related-img" />
                    </div>
                    <div className="pd-related-body">
                      <p className="pd-related-name">{rp.part_name}</p>
                      {rp.brand && <p className="pd-related-brand">{rp.brand}</p>}
                      <p className="pd-related-price">From QAR {rp.min_price.toFixed(2)}</p>
                      <div className="pd-related-services">
                        {rp.delivery     && <span className="svc-badge svc-delivery">🚚</span>}
                        {rp.installation && <span className="svc-badge svc-install">🔩</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
 
        </div>
      </div>
        {/* ── Idea 5: Mobile sticky footer bar ──────────── */}
        {bestListing && bestCfg && (
          <div className={`pd-sticky-bar ${showStickyBar ? 'pd-sticky-bar-visible' : ''}`}>
            <div className="pd-sticky-bar-info">
              <span className="pd-sticky-bar-name">{part.name}</span>
              <span className="pd-sticky-bar-price">QAR {bestListing.price.toFixed(2)}</span>
            </div>
            {isAuthenticated ? (
              <button
                className={`btn pd-sticky-bar-btn ${addedIds[bestListing.garage_part_id] ? 'plc-added' : 'btn-primary'}`}
                onClick={() => addToCart(bestListing)}
                disabled={!!addedIds[bestListing.garage_part_id]}
              >
                {addedIds[bestListing.garage_part_id] ? '✓ Added' : 'Add to Cart'}
              </button>
            ) : (
              <NavLink to="/login" className="btn btn-primary pd-sticky-bar-btn">
                Login to Order
              </NavLink>
            )}
          </div>
        )}
    </>
  )
}