import { useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * InventoryPage  (Garage only)
 *
 * Fetches GET /garage/inventory with optional filter params.
 * Actions per row:
 *   - Edit   → navigates to /parts/edit/<garage_part_id>
 *   - Toggle → POST /parts/garage-part/<id>/toggle
 *   - Delete → POST /parts/garage-part/<id>/delete  (with confirm)
 */
export function InventoryPage() {
  const navigate = useNavigate()

  // ── Filters ────────────────────────────────────────────────
  const [filters, setFilters] = useState({
    search:         '',
    category:       '',
    low_stock_only: false,
    show_inactive:  false,
  })

  // ── Data ───────────────────────────────────────────────────
  const [parts,   setParts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // ── Row-level action feedback ───────────────────────────────
  const [actionLoading, setActionLoading] = useState(null) // garage_part_id being acted on
  const [actionError,   setActionError]   = useState('')

  // ── Fetch inventory ─────────────────────────────────────────
  const fetchInventory = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = {}
      if (filters.search)         params.search         = filters.search
      if (filters.category)       params.category       = filters.category
      if (filters.low_stock_only) params.low_stock_only = 1
      if (filters.show_inactive)  params.show_inactive  = 1

      const res = await axios.get(`${API}/garage/inventory`, { params })
      setParts(res.data.inventory || [])
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load inventory.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  // Fetch on mount only — user explicitly clicks Apply to re-fetch
  useEffect(() => { fetchInventory() }, []) // eslint-disable-line

  // ── Filter handlers ─────────────────────────────────────────
  function handleFilterChange(e) {
    const { name, value, type, checked } = e.target
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  function handleApply(e) {
    e.preventDefault()
    fetchInventory()
  }

  function handleReset() {
    setFilters({ search: '', category: '', low_stock_only: false, show_inactive: false })
    // re-fetch with cleared filters immediately
    setTimeout(fetchInventory, 0)
  }

  // ── Toggle active/inactive ──────────────────────────────────
  async function handleToggle(garage_part_id) {
    setActionLoading(garage_part_id)
    setActionError('')
    try {
      await axios.post(`${API}/parts/garage-part/${garage_part_id}/toggle`)
      // Update the row in-place without full re-fetch
      setParts(prev => prev.map(p =>
        p.garage_part_id === garage_part_id
          ? { ...p, is_active: !p.is_active }
          : p
      ))
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Toggle failed.')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Delete ──────────────────────────────────────────────────
  async function handleDelete(garage_part_id, part_name) {
    if (!window.confirm(`Delete "${part_name}" from inventory? This cannot be undone.`)) return

    setActionLoading(garage_part_id)
    setActionError('')
    try {
      await axios.post(`${API}/parts/garage-part/${garage_part_id}/delete`)
      // Remove the row from state without re-fetch
      setParts(prev => prev.filter(p => p.garage_part_id !== garage_part_id))
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Delete failed.')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Year range helper ───────────────────────────────────────
  function yearRange(from, to) {
    if (from && to) return `${from} – ${to}`
    if (from)       return `From ${from}`
    if (to)         return `Up to ${to}`
    return '—'
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      <title>Garage Inventory | AutoParts Marketplace</title>

      <section className="inventory-section">
        <div className="container">

          {/* ── Header ─────────────────────────────────────── */}
          <div className="inventory-header">
            <div>
              <h1>Garage Inventory</h1>
              <p>View and manage the parts currently listed by your garage.</p>
            </div>
            <div className="inventory-actions">
              <NavLink to="/dashboard" className="btn btn-outline-navy">
                ← Dashboard
              </NavLink>
              <NavLink to="/parts/add" className="btn btn-primary">
                + Add Part
              </NavLink>
            </div>
          </div>

          {/* ── Filters ────────────────────────────────────── */}
          <form onSubmit={handleApply} className="inventory-filters">
            <div className="inventory-filter-grid">

              <div className="form-group">
                <label className="form-label">Search</label>
                <input
                  type="text"
                  name="search"
                  className="form-input"
                  placeholder="Name or part number"
                  value={filters.search}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <input
                  type="text"
                  name="category"
                  className="form-input"
                  placeholder="e.g. Brakes"
                  value={filters.category}
                  onChange={handleFilterChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Filters</label>
                <div className="checkbox-grid">
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      name="low_stock_only"
                      checked={filters.low_stock_only}
                      onChange={handleFilterChange}
                    />
                    <span>Low stock only</span>
                  </label>
                  <label className="checkbox-item">
                    <input
                      type="checkbox"
                      name="show_inactive"
                      checked={filters.show_inactive}
                      onChange={handleFilterChange}
                    />
                    <span>Show inactive</span>
                  </label>
                </div>
              </div>

            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-outline-navy">Apply</button>
              <button type="button" className="btn btn-outline-navy" onClick={handleReset}>Reset</button>
            </div>
          </form>

          {/* ── Errors ─────────────────────────────────────── */}
          {error       && <div className="alert alert-danger">{error}</div>}
          {actionError && <div className="alert alert-danger">{actionError}</div>}

          {/* ── Loading ────────────────────────────────────── */}
          {loading && (
            <div className="inventory-loading">Loading inventory…</div>
          )}

          {/* ── Table ──────────────────────────────────────── */}
          {!loading && parts.length > 0 && (
            <>
              <p className="results-count">{parts.length} part{parts.length !== 1 ? 's' : ''} found</p>
              <div className="inventory-table-wrapper">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Part Name</th>
                      <th>Part #</th>
                      <th>Price</th>
                      <th>Cost</th>
                      <th>Qty</th>
                      <th>Year Range</th>
                      <th>Delivery</th>
                      <th>Install</th>
                      <th>Pickup</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map(item => {
                      const busy = actionLoading === item.garage_part_id
                      return (
                        <tr key={item.garage_part_id} className={!item.is_active ? 'row-inactive' : ''}>
                          <td className="td-name">{item.part_name || 'Deleted Part'}</td>
                          <td>{item.part_number || '—'}</td>
                          <td>QAR {item.price}</td>
                          <td>{item.cost_price ? `QAR ${item.cost_price}` : '—'}</td>
                          <td>
                            <span className={item.quantity < 10 ? 'qty-low' : ''}>
                              {item.quantity}
                            </span>
                          </td>
                          <td>{yearRange(item.from_year, item.to_year)}</td>
                          <td><ServiceBadge value={item.delivery_available} /></td>
                          <td><ServiceBadge value={item.installation_available} /></td>
                          <td><ServiceBadge value={item.pickup_available} /></td>
                          <td>
                            <span className={`status-badge ${item.is_active ? 'status-active' : 'status-inactive'}`}>
                              {item.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="table-actions">
                            <button
                              className="btn btn-sm btn-outline-navy"
                              onClick={() => navigate(`/parts/edit/${item.garage_part_id}`)}
                              disabled={busy}
                            >
                              Edit
                            </button>
                            <button
                              className="btn btn-sm btn-outline-navy"
                              onClick={() => handleToggle(item.garage_part_id)}
                              disabled={busy}
                            >
                              {busy ? '…' : item.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(item.garage_part_id, item.part_name)}
                              disabled={busy}
                            >
                              {busy ? '…' : 'Delete'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ── Empty state ─────────────────────────────────── */}
          {!loading && parts.length === 0 && !error && (
            <div className="empty-state-card">
              <h2>No parts found</h2>
              <p>
                {filters.search || filters.category || filters.low_stock_only || filters.show_inactive
                  ? 'No parts match your current filters. Try resetting them.'
                  : 'Your inventory is empty. Start by adding your first part.'}
              </p>
              {!filters.search && !filters.category && (
                <NavLink to="/parts/add" className="btn btn-primary">
                  Add First Part
                </NavLink>
              )}
            </div>
          )}

        </div>
      </section>
    </>
  )
}

/* ── Small helper components ─────────────────────────────── */
function ServiceBadge({ value }) {
  return (
    <span className={value ? 'badge-yes' : 'badge-no'}>
      {value ? 'Yes' : 'No'}
    </span>
  )
}