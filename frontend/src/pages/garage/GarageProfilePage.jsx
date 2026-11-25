/**
 * GarageProfilePage.jsx
 * Place at: frontend/src/pages/garage/GarageProfilePage.jsx
 *
 * Route: /garage/:garage_id  (public — no login required)
 *
 * Sections:
 *   1. Hero banner — garage name, location, specialization, stats, rating
 *   2. Category pills — quick filter chips
 *   3. Featured parts grid — cards linking to part detail pages
 *   4. Customer reviews — aggregate + list + submit form (if eligible)
 */

import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, NavLink } from 'react-router-dom'
import axios from 'axios'
import { useAuth }       from '../../context/Authcontext'
import { StarRating }    from '../../components/reviews/StarRating'
import { ReviewList }    from '../../components/reviews/ReviewList'
import { ReviewForm }    from '../../components/reviews/ReviewForm'
import { getPartImage }  from '../../utils/partImages'

const API = '/api'

export function GarageProfilePage() {
  const { garage_id }  = useParams()
  const navigate       = useNavigate()
  const { isAuthenticated, user } = useAuth()

  const [garage,      setGarage]     = useState(null)
  const [loading,     setLoading]    = useState(true)
  const [error,       setError]      = useState('')

  // Reviews
  const [reviews,     setReviews]    = useState({ reviews: [], average_rating: null, total_reviews: 0 })
  const [reviewsLoading, setReviewsLoading] = useState(false)
  const [canReview,   setCanReview]  = useState(false)
  const [showForm,    setShowForm]   = useState(false)

  // Category filter for parts grid
  const [activeCategory, setActiveCategory] = useState('All')

  // ── Fetch garage profile ────────────────────────────────────
  const loadGarage = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await axios.get(`${API}/garage/public/${garage_id}`)
      setGarage(res.data)
    } catch (err) {
      setError(err?.response?.data?.error || 'Garage not found.')
    } finally {
      setLoading(false)
    }
  }, [garage_id])

  // ── Fetch reviews ───────────────────────────────────────────
  const loadReviews = useCallback(async () => {
    setReviewsLoading(true)
    try {
      const res = await axios.get(`${API}/reviews/garage/${garage_id}`)
      setReviews(res.data)
    } catch { /* silent */ } finally {
      setReviewsLoading(false)
    }
  }, [garage_id])

  // ── Check if customer can review ────────────────────────────
  const checkCanReview = useCallback(async () => {
    if (!isAuthenticated || user?.role !== 'customer') return
    try {
      const res = await axios.get(`${API}/reviews/garage/${garage_id}/can-review`)
      setCanReview(res.data.can_review)
    } catch { /* silent */ }
  }, [garage_id, isAuthenticated, user])

  useEffect(() => {
    loadGarage()
    loadReviews()
    checkCanReview()
  }, [loadGarage, loadReviews, checkCanReview])

  // ── Filter parts by category ────────────────────────────────
  const filteredParts = garage?.featured_parts?.filter(p =>
    activeCategory === 'All' || p.category === activeCategory
  ) || []

  // ── Star initials avatar ────────────────────────────────────
  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  }

  // ─────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ padding: '80px 24px', textAlign: 'center', color: 'var(--gray-600)' }}>
      Loading garage profile…
    </div>
  )

  if (error) return (
    <div className="container" style={{ padding: '60px 24px' }}>
      <div className="alert alert-danger">{error}</div>
      <button className="btn btn-outline-navy" onClick={() => navigate(-1)}>← Back</button>
    </div>
  )

  return (
    <>
      <title>{garage.garage_name} | AutoParts Marketplace</title>

      <div className="gp-page">

        {/* ══════════════════════════════════════════════════
            HERO BANNER
        ══════════════════════════════════════════════════ */}
        <section className="gp-hero">
          <div className="container gp-hero-layout">

            {/* Avatar */}
            <div className="gp-avatar">
              {initials(garage.garage_name)}
            </div>

            {/* Main info */}
            <div className="gp-hero-info">
              <h1 className="gp-name">{garage.garage_name}</h1>

              <div className="gp-hero-meta">
                {garage.location && (
                  <span className="gp-meta-pill">
                    📍 {garage.location}
                  </span>
                )}
                {garage.specialization && (
                  <span className="gp-meta-pill">
                    🔧 {garage.specialization}
                  </span>
                )}
                {garage.national_address && (
                  <span className="gp-meta-pill">
                    🏠 {garage.national_address}
                  </span>
                )}
              </div>

              <div className="gp-rating-row">
                <StarRating
                  rating={garage.average_rating}
                  total={garage.total_reviews}
                  size="md"
                />
              </div>
            </div>

            {/* Stats cards */}
            <div className="gp-stats">
              <div className="gp-stat">
                <strong>{garage.total_listings}</strong>
                <span>Parts Listed</span>
              </div>
              <div className="gp-stat">
                <strong>{garage.categories?.length || 0}</strong>
                <span>Categories</span>
              </div>
              <div className="gp-stat">
                <strong>{garage.average_rating ? garage.average_rating.toFixed(1) : '—'}</strong>
                <span>Avg Rating</span>
              </div>
              <div className="gp-stat">
                <strong>{garage.total_reviews}</strong>
                <span>Reviews</span>
              </div>
            </div>

          </div>
        </section>

        <div className="container gp-body">

          {/* ══════════════════════════════════════════════
              CATEGORY FILTER PILLS
          ══════════════════════════════════════════════ */}
          {garage.categories?.length > 0 && (
            <div className="gp-category-pills">
              {['All', ...garage.categories].map(cat => (
                <button
                  key={cat}
                  className={`gp-cat-pill ${activeCategory === cat ? 'gp-cat-active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* ══════════════════════════════════════════════
              FEATURED PARTS GRID
          ══════════════════════════════════════════════ */}
          <section className="gp-section">
            <div className="gp-section-header">
              <h2 className="gp-section-title">
                {activeCategory === 'All'
                  ? `All Parts (${garage.total_listings})`
                  : `${activeCategory} Parts`}
              </h2>
              <NavLink
                to={`/search?garage_id=${garage_id}`}
                className="btn btn-outline-navy"
              >
                View All Parts
              </NavLink>
            </div>

            {filteredParts.length === 0 ? (
              <div className="empty-state-card">
                <h3>No parts in this category</h3>
                <p>Select a different category or view all parts.</p>
              </div>
            ) : (
              <div className="gp-parts-grid">
                {filteredParts.map(part => (
                  <button
                    key={part.garage_part_id}
                    className="gp-part-card"
                    onClick={() => navigate(`/parts/${part.part_id}`)}
                  >
                    <div className="gp-part-img-wrap">
                      <img
                        src={getPartImage(part.image_url, part.category)}
                        alt={part.part_name}
                        className="gp-part-img"
                      />
                      {part.quantity <= 5 && part.quantity > 0 && (
                        <span className="gp-part-low-badge">Only {part.quantity} left</span>
                      )}
                    </div>

                    <div className="gp-part-body">
                      <p className="gp-part-category">{part.category}</p>
                      <h4 className="gp-part-name">{part.part_name}</h4>
                      {part.brand && <p className="gp-part-brand">{part.brand}</p>}

                      {(part.from_year || part.to_year) && (
                        <p className="gp-part-compat">
                          Fits {part.from_year}–{part.to_year}
                        </p>
                      )}

                      <div className="gp-part-services">
                        {part.delivery     && <span className="svc-badge svc-delivery">🚚</span>}
                        {part.installation && <span className="svc-badge svc-install">🔩</span>}
                      </div>

                      <div className="gp-part-footer">
                        <span className="gp-part-price">QAR {part.price.toFixed(2)}</span>
                        <span className="gp-part-cta">View →</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* ══════════════════════════════════════════════
              CUSTOMER REVIEWS
          ══════════════════════════════════════════════ */}
          <section className="gp-section">
            <div className="gp-section-header">
              <h2 className="gp-section-title">Customer Reviews</h2>
              {canReview && !showForm && (
                <button
                  className="btn btn-outline-navy"
                  onClick={() => setShowForm(true)}
                >
                  Write a Review
                </button>
              )}
              {!isAuthenticated && (
                <NavLink to="/login" className="btn btn-outline-navy">
                  Login to Review
                </NavLink>
              )}
            </div>

            {showForm && (
              <div style={{ marginBottom: '28px' }}>
                <ReviewForm
                  type="garage"
                  targetId={Number(garage_id)}
                  onSuccess={() => {
                    setShowForm(false)
                    setCanReview(false)
                    loadReviews()
                  }}
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

        </div>
      </div>
    </>
  )
}