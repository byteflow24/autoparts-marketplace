/**
 * StarRating.jsx
 * Place at: frontend/src/components/reviews/StarRating.jsx
 *
 * Two modes:
 *   display  → shows filled/half/empty stars (read-only)
 *   input    → clickable stars for submitting a review
 *
 * Usage (display):
 *   <StarRating rating={4.3} total={18} />
 *
 * Usage (input):
 *   <StarRating
 *     mode="input"
 *     value={selectedRating}
 *     onChange={setSelectedRating}
 *   />
 */

import { useState } from 'react'

export function StarRating({
  mode    = 'display',  // 'display' | 'input'
  rating  = 0,          // display mode: numeric avg e.g. 4.3
  total   = null,       // display mode: review count
  value   = 0,          // input mode: currently selected
  onChange,             // input mode: callback(newRating)
  size    = 'md',       // 'sm' | 'md' | 'lg'
}) {
  const [hovered, setHovered] = useState(0)

  const sizeClass = {
    sm: 'stars-sm',
    md: 'stars-md',
    lg: 'stars-lg',
  }[size] || 'stars-md'

  // ── Display mode ────────────────────────────────────────
  if (mode === 'display') {
    if (!rating) {
      return (
        <span className={`star-display ${sizeClass}`}>
          <span className="stars-empty">☆☆☆☆☆</span>
          {total !== null && (
            <span className="star-count">No reviews yet</span>
          )}
        </span>
      )
    }

    return (
      <span className={`star-display ${sizeClass}`}>
        {[1, 2, 3, 4, 5].map(i => {
          const filled = rating >= i
          const half   = !filled && rating >= i - 0.5
          return (
            <span
              key={i}
              className={filled ? 'star-filled' : half ? 'star-half' : 'star-empty'}
            >
              {filled ? '★' : half ? '⯨' : '☆'}
            </span>
          )
        })}
        {total !== null && (
          <span className="star-count">
            {rating.toFixed(1)} ({total} {total === 1 ? 'review' : 'reviews'})
          </span>
        )}
      </span>
    )
  }

  // ── Input mode ──────────────────────────────────────────
  return (
    <div className={`star-input ${sizeClass}`}>
      {[1, 2, 3, 4, 5].map(i => (
        <button
          key={i}
          type="button"
          className={`star-btn ${(hovered || value) >= i ? 'star-filled' : 'star-empty'}`}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange?.(i)}
          aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
        >
          {(hovered || value) >= i ? '★' : '☆'}
        </button>
      ))}
      {value > 0 && (
        <span className="star-input-label">
          {['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'][value]}
        </span>
      )}
    </div>
  )
}