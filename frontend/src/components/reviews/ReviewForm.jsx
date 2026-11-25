/**
 * ReviewForm.jsx
 * Place at: frontend/src/components/reviews/ReviewForm.jsx
 *
 * Reusable form for submitting a review (part or garage).
 * Parent passes type + id and handles the API call.
 *
 * Usage:
 *   <ReviewForm
 *     type="part"           // 'part' | 'garage'
 *     targetId={part.id}
 *     onSuccess={() => reload()}
 *   />
 */

import { useState } from 'react'
import axios from 'axios'
import { StarRating } from './StarRating'

const API = '/api'

export function ReviewForm({ type, targetId, onSuccess }) {
  const [rating,  setRating]  = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [done,    setDone]    = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!rating) { setError('Please select a star rating.'); return }

    setLoading(true)
    setError('')
    try {
      const url = type === 'part'
        ? `${API}/reviews/part/${targetId}`
        : `${API}/reviews/garage/${targetId}`

      await axios.post(url, { rating, comment })
      setDone(true)
      onSuccess?.()
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to submit review.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="review-form-done">
        ✅ Thank you for your review!
      </div>
    )
  }

  return (
    <form className="review-form" onSubmit={handleSubmit}>
      <div className="review-form-stars">
        <label className="filter-label">Your Rating</label>
        <StarRating mode="input" value={rating} onChange={setRating} size="lg" />
      </div>

      <div className="form-group">
        <label className="form-label">Comment <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>(optional)</span></label>
        <textarea
          className="form-input review-textarea"
          placeholder={
            type === 'part'
              ? 'How was the part quality? Fit correctly?'
              : 'How was the service? Delivery speed?'
          }
          value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3}
        />
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={loading || !rating}
      >
        {loading ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  )
}