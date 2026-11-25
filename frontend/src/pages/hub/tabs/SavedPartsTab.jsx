/**
 * SavedPartsTab.jsx
 * Place at: frontend/src/pages/hub/tabs/SavedPartsTab.jsx
 */

import { useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getPartImage } from '../../../utils/partImages'
import { SectionTitle, SectionLoader, EmptyState } from '../../../components/HubShared'

const API = '/api'

function getToken() {
  return JSON.parse(localStorage.getItem('auth'))?.access_token || ''
}
function authHeaders() {
  return { Authorization: `Bearer ${getToken()}` }
}

export function SavedPartsTab() {
  const [parts, setParts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const navigate = useNavigate()

  const load = useCallback(() => {
    setLoading(true)
    axios.get(`${API}/saved-parts`, { headers: authHeaders() })
      .then(res => setParts(res.data || []))
      .catch(() => setError('Failed to load saved parts.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  async function handleUnsave(garagePartId) {
    try {
      await axios.delete(`${API}/saved-parts/${garagePartId}`, { headers: authHeaders() })
      setParts(prev => prev.filter(p => p.garage_part_id !== garagePartId))
    } catch {
      setError('Failed to remove saved part.')
    }
  }

  if (loading) return <SectionLoader />

  return (
    <div>
      <SectionTitle icon="🔖" title="Saved Parts" subtitle="Parts you bookmarked while browsing" />

      <div className="saved-parts-list">
        {error && <div className="alert alert-danger">{error}</div>}

        {parts.length === 0 ? (
          <EmptyState icon="🔖" message="No saved parts yet." action={
            <NavLink to="/search" className="btn btn-primary">Browse Parts</NavLink>
          } />
        ) : parts.map(sp => (
          <SavedPartCard
            key={sp.saved_part_id}
            part={sp}
            onUnsave={handleUnsave}
            onNavigate={() => navigate(`/parts/${sp.part_id}`)}
          />
        ))}
      </div>
    </div>
  )
}

function SavedPartCard({ part, onUnsave, onNavigate }) {
  const img = getPartImage(part.image_url, part.category)

  return (
    <div className="saved-part-card">
      <img
        src={img}
        alt={part.part_name}
        className="saved-part-img"
        onClick={onNavigate}
        onError={e => { e.target.src = img }}
      />

      <div className="saved-part-body">
        <div className="saved-part-name" onClick={onNavigate}>{part.part_name}</div>
        <div className="saved-part-meta">
          {part.garage_name}
          {part.car_make && <span> · {part.car_make} {part.car_model}</span>}
          {(part.from_year || part.to_year) && <span> · {part.from_year}–{part.to_year}</span>}
        </div>
        {part.brand && <span className="saved-part-badge brand">{part.brand}</span>}
        <span className="saved-part-badge condition">{part.condition}</span>
      </div>

      <div className="saved-part-aside">
        <div className="saved-part-price">QAR {Number(part.price).toFixed(2)}</div>
        <div className="saved-part-actions">
          <button className="btn btn-outline-navy btn-sm" onClick={onNavigate}>View</button>
          <button className="btn-remove" onClick={() => onUnsave(part.garage_part_id)}>Remove</button>
        </div>
      </div>
    </div>
  )
}