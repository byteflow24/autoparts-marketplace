import { useState, useEffect, useCallback } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { SearchableSelectFilter } from '../../components/search/SearchableSelectFilter'

const API = '/api'

// Year list: current year → 1990
const YEAR_OPTIONS = (() => {
  const yr = new Date().getFullYear()
  const opts = []
  for (let y = yr; y >= 1990; y--) opts.push({ value: String(y), label: String(y) })
  return opts
})()

/**
 * InventoryPage  (Garage only)
 *
 * Filters: search › year › car make › car model › sub-model › category › subcategory
 * Table columns: Year | Make | Model | Sub-Model | Part # | Category |
 *                Sub-Cat | Yr Range | Part Name | Price | Qty |
 *                Delivery | Install | Status | Actions
 */
export function InventoryPage() {
  const navigate = useNavigate()

  // ── Table density ─────────────────────────────────────────
  const [density, setDensity] = useState('compact')   // 'compact' | 'normal' | 'comfortable'

  // ── Filter state ───────────────────────────────────────────
  const [filters, setFilters] = useState({
    search:           '',
    year:             '',
    car_make_id:      '',
    car_model_id:     '',
    car_sub_model_id: '',
    category:         '',
    subcategory:      '',
  })

  // ── Dropdown data ──────────────────────────────────────────
  const [makes,         setMakes]         = useState([])
  const [models,        setModels]        = useState([])
  const [subModels,     setSubModels]     = useState([])
  const [categoryMap,   setCategoryMap]   = useState({})   // { category: [subcategory, …] }

  // ── Inventory data ─────────────────────────────────────────
  const [parts,   setParts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  // ── Row-level action feedback ──────────────────────────────
  const [actionLoading, setActionLoading] = useState(null)
  const [actionError,   setActionError]   = useState('')

  // ── Load makes + category map on mount ────────────────────
  useEffect(() => {
    axios.get(`${API}/parts/car-makes`)
      .then(r => setMakes(r.data))
      .catch(() => {})
    axios.get(`${API}/search/filters`)
      .then(r => setCategoryMap(r.data.subcategory_map || {}))
      .catch(() => {})
  }, [])

  // ── Load models when make changes ─────────────────────────
  useEffect(() => {
    if (!filters.car_make_id) { setModels([]); return }
    axios.get(`${API}/parts/car-models`, { params: { make_id: filters.car_make_id } })
      .then(r => setModels(r.data))
      .catch(() => setModels([]))
  }, [filters.car_make_id])

  // ── Load sub-models when model changes ────────────────────
  useEffect(() => {
    if (!filters.car_model_id) { setSubModels([]); return }
    axios.get(`${API}/parts/car-sub-models`, { params: { model_id: filters.car_model_id } })
      .then(r => setSubModels(r.data))
      .catch(() => setSubModels([]))
  }, [filters.car_model_id])

  // ── Fetch inventory (filtered) ────────────────────────────
  const fetchInventory = useCallback(async (overrideFilters) => {
    setLoading(true)
    setError('')
    const f = overrideFilters ?? filters
    try {
      const params = {}
      if (f.search)           params.search           = f.search
      if (f.year)             params.year             = f.year
      if (f.car_make_id)      params.car_make_id      = f.car_make_id
      if (f.car_model_id)     params.car_model_id     = f.car_model_id
      if (f.car_sub_model_id) params.car_sub_model_id = f.car_sub_model_id
      if (f.category)         params.category         = f.category
      if (f.subcategory)      params.subcategory      = f.subcategory

      const res = await axios.get(`${API}/garage/inventory`, { params })
      setParts(res.data.inventory || [])
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load inventory.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchInventory() }, []) // eslint-disable-line

  // ── Filter handlers ────────────────────────────────────────
  function handleDirectFilterChange(name, value) {
    setFilters(prev => {
      const next = { ...prev, [name]: value }
      if (name === 'car_make_id')  { next.car_model_id = ''; next.car_sub_model_id = '' }
      if (name === 'car_model_id') { next.car_sub_model_id = '' }
      if (name === 'category')     { next.subcategory = '' }
      return next
    })
  }

  function handleSearchInput(value) {
    setFilters(prev => ({ ...prev, search: value }))
  }

  function handleApply(e) {
    e.preventDefault()
    fetchInventory()
  }

  function handleReset() {
    const cleared = {
      search: '', year: '', car_make_id: '', car_model_id: '',
      car_sub_model_id: '', category: '', subcategory: '',
    }
    setFilters(cleared)
    setModels([])
    setSubModels([])
    fetchInventory(cleared)
  }

  // ── Toggle available/unavailable ──────────────────────────
  async function handleToggle(garage_part_id) {
    setActionLoading(garage_part_id)
    setActionError('')
    try {
      await axios.post(`${API}/parts/garage-part/${garage_part_id}/toggle`)
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

  // ── Delete ─────────────────────────────────────────────────
  async function handleDelete(garage_part_id, part_name) {
    if (!window.confirm(`Delete "${part_name}" from inventory? This cannot be undone.`)) return
    setActionLoading(garage_part_id)
    setActionError('')
    try {
      await axios.post(`${API}/parts/garage-part/${garage_part_id}/delete`)
      setParts(prev => prev.filter(p => p.garage_part_id !== garage_part_id))
    } catch (err) {
      setActionError(err?.response?.data?.error || 'Delete failed.')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Year range display ─────────────────────────────────────
  function yearRange(from, to) {
    if (from && to) return from === to ? `${from}` : `${from}–${to}`
    if (from)       return `${from}+`
    if (to)         return `≤${to}`
    return '—'
  }

  // ── Option arrays for SearchableSelectFilter ──────────────
  const makeOpts     = makes.map(m     => ({ value: String(m.id), label: m.name }))
  const modelOpts    = models.map(m    => ({ value: String(m.id), label: m.name }))
  const subModelOpts = subModels.map(s => ({ value: String(s.id), label: s.name }))

  // Categories: all keys from the SUBCATEGORY_MAP (same as search page)
  const categoryOpts = Object.keys(categoryMap).map(c => ({ value: c, label: c }))

  // Subcategories: from the map for the selected category — always complete
  const subcategoryOpts = filters.category && categoryMap[filters.category]
    ? categoryMap[filters.category].map(s => ({ value: s, label: s }))
    : []

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
              <NavLink to="/dashboard" className="btn btn-outline-navy">← Dashboard</NavLink>
              <NavLink to="/parts/add" className="btn btn-primary">+ Add Part</NavLink>
            </div>
          </div>

          {/* ── Filters ────────────────────────────────────── */}
          <form onSubmit={handleApply} className="inventory-filters">

            {/* Search input — full width */}
            <div className="inv-search-wrap">
              <input
                type="text"
                className="inv-search-input"
                placeholder="Part name, number, brand…"
                value={filters.search}
                onChange={e => handleSearchInput(e.target.value)}
              />
              <span className="inv-search-icon">🔍</span>
            </div>

            {/* Filter card */}
            <div className="inv-filter-card">
              <div className="inv-filter-card-header">
                <span className="inv-filter-title">Filters</span>
                <button type="button" className="inv-reset-btn" onClick={handleReset}>
                  Reset all
                </button>
              </div>

              <div className="inv-filter-grid">

                {/* 1 · Year */}
                <div className="inv-fg">
                  <label className="inv-label">Year</label>
                  <SearchableSelectFilter
                    name="year"
                    value={filters.year}
                    onChange={handleDirectFilterChange}
                    options={YEAR_OPTIONS}
                    placeholder="Any Year"
                  />
                </div>

                {/* 2 · Car Make */}
                <div className="inv-fg">
                  <label className="inv-label">Car Make</label>
                  <SearchableSelectFilter
                    name="car_make_id"
                    value={filters.car_make_id}
                    onChange={handleDirectFilterChange}
                    options={makeOpts}
                    placeholder="Any Make"
                  />
                </div>

                {/* 3 · Car Model */}
                <div className="inv-fg">
                  <label className="inv-label">Car Model</label>
                  <SearchableSelectFilter
                    name="car_model_id"
                    value={filters.car_model_id}
                    onChange={handleDirectFilterChange}
                    options={modelOpts}
                    placeholder={filters.car_make_id ? 'Any Model' : 'Pick a make first'}
                    disabled={!filters.car_make_id}
                  />
                </div>

                {/* 4 · Sub-Model */}
                <div className="inv-fg">
                  <label className="inv-label">Trim / Sub-Model</label>
                  <SearchableSelectFilter
                    name="car_sub_model_id"
                    value={filters.car_sub_model_id}
                    onChange={handleDirectFilterChange}
                    options={subModelOpts}
                    placeholder={
                      !filters.car_model_id       ? 'Pick a model first' :
                      subModelOpts.length === 0   ? 'No trims available' :
                      'All Trims'
                    }
                    disabled={!filters.car_model_id || subModelOpts.length === 0}
                  />
                </div>

                {/* 5 · Category */}
                <div className="inv-fg">
                  <label className="inv-label">Category</label>
                  <SearchableSelectFilter
                    name="category"
                    value={filters.category}
                    onChange={handleDirectFilterChange}
                    options={categoryOpts}
                    placeholder="All Categories"
                  />
                </div>

                {/* 6 · Subcategory — only when category selected */}
                {filters.category && subcategoryOpts.length > 0 && (
                  <div className="inv-fg">
                    <label className="inv-label">Subcategory</label>
                    <SearchableSelectFilter
                      name="subcategory"
                      value={filters.subcategory}
                      onChange={handleDirectFilterChange}
                      options={subcategoryOpts}
                      placeholder="All Subcategories"
                    />
                  </div>
                )}

              </div>

              <div className="inv-actions">
                <button type="submit" className="btn btn-outline-navy btn-sm">Apply</button>
              </div>
            </div>
          </form>

          {/* ── Errors ─────────────────────────────────────── */}
          {error       && <div className="alert alert-danger">{error}</div>}
          {actionError && <div className="alert alert-danger">{actionError}</div>}

          {/* ── Loading ────────────────────────────────────── */}
          {loading && <div className="inventory-loading">Loading inventory…</div>}

          {/* ── Table ──────────────────────────────────────── */}
          {!loading && parts.length > 0 && (
            <>
              <div className="inv-toolbar">
                <div className="inv-density-toggle">
                  <span className="inv-density-label">Size:</span>
                  {['compact', 'normal', 'comfortable'].map(d => (
                    <button
                      key={d}
                      className={`inv-density-btn${density === d ? ' active' : ''}`}
                      onClick={() => setDensity(d)}
                    >
                      {d.charAt(0).toUpperCase() + d.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="inventory-table-wrapper">
                <table className={`inventory-table inv-table-${density}`}>
                  <thead>
                    <tr>
                      <th>Make</th>
                      <th>Model</th>
                      <th>Sub-Model</th>
                      <th>Part #</th>
                      <th>Category</th>
                      <th>Sub-Cat</th>
                      <th>Yr Range</th>
                      <th>Part Name</th>
                      <th>Condition</th>
                      <th>Price</th>
                      <th>Qty</th>
                      <th>Delivery</th>
                      <th>Install</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parts.map(item => {
                      const busy = actionLoading === item.garage_part_id
                      return (
                        <tr key={item.garage_part_id} className={!item.is_active ? 'row-inactive' : ''}>
                          <td>{item.car_make      || '—'}</td>
                          <td>{item.car_model     || '—'}</td>
                          <td>{item.car_sub_model || '—'}</td>
                          <td>{item.part_number   || '—'}</td>
                          <td>{item.category      || '—'}</td>
                          <td>{item.subcategory   || '—'}</td>
                          <td>{yearRange(item.from_year, item.to_year)}</td>
                          <td className="td-name">{item.part_name || 'Deleted Part'}</td>
                          <td>
                            <span className={`status-badge ${item.condition === 'used' ? 'status-used' : 'status-new'}`}>
                              {item.condition === 'used' ? 'Used' : 'New'}
                            </span>
                          </td>
                          <td>QAR {item.price}</td>
                          <td>
                            <span className={item.quantity < 10 ? 'qty-low' : ''}>
                              {item.quantity}
                            </span>
                          </td>
                          <td><Yn value={item.delivery_available} /></td>
                          <td><Yn value={item.installation_available} /></td>
                          <td className="table-actions">
                            <button
                              className="btn btn-sm btn-outline-navy"
                              onClick={() => navigate(`/parts/edit/${item.garage_part_id}`)}
                              disabled={busy}
                            >Edit</button>
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
                {Object.values(filters).some(v => v !== '')
                  ? 'No parts match your current filters. Try resetting them.'
                  : 'Your inventory is empty. Start by adding your first part.'}
              </p>
              {!filters.search && !filters.category && (
                <NavLink to="/parts/add" className="btn btn-primary">Add First Part</NavLink>
              )}
            </div>
          )}

        </div>
      </section>
    </>
  )
}

function Yn({ value }) {
  return <span className={value ? 'badge-yes' : 'badge-no'}>{value ? 'Yes' : 'No'}</span>
}