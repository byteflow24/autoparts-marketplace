/**
 * ReviewList.jsx
 * Place at: frontend/src/components/reviews/ReviewList.jsx
 *
 * Displays a list of reviews with stars, name, date and comment.
 * Used on both PartDetailPage and GarageProfilePage.
 */

import { StarRating } from './StarRating'

export function ReviewList({ reviews, averageRating, totalReviews, loading }) {

  function formatDate(iso) {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-GB', {
      year: 'numeric', month: 'short', day: '2-digit'
    })
  }

  if (loading) {
    return <div className="inventory-loading">Loading reviews…</div>
  }

  return (
    <div className="review-list-wrap">
      {/* Aggregate header */}
      <div className="review-aggregate">
        <div className="review-avg-score">
          {averageRating ? averageRating.toFixed(1) : '—'}
        </div>
        <div className="review-avg-right">
          <StarRating rating={averageRating} size="lg" />
          <p className="review-total-count">
            {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
          </p>
        </div>
      </div>

      {/* Individual reviews */}
      {reviews.length === 0 ? (
        <p className="muted-text" style={{ padding: '16px 0' }}>
          No reviews yet. Be the first to leave one!
        </p>
      ) : (
        <div className="review-list">
          {reviews.map(r => (
            <div className="review-item" key={r.id}>
              <div className="review-item-header">
                <div className="review-avatar">
                  {r.user_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <strong className="review-username">{r.user_name}</strong>
                  <div className="review-meta-row">
                    <StarRating rating={r.rating} size="sm" />
                    <span className="review-date">{formatDate(r.created_at)}</span>
                  </div>
                </div>
              </div>
              {r.comment && (
                <p className="review-comment">{r.comment}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}