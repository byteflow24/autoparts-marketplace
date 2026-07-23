import { useState, useEffect } from 'react'
import { useAuth } from '../../context/Authcontext'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * SearchPage
 *
 * 1. On mount → fetch /search/filters to populate dropdowns
 * 2. On car make change → filter models client-side
 * 3. On submit → GET /search/ with params
 * 4. Results shown below the form
 * 5. "Add to Cart" stores item in localStorage cart
 */

const INITIAL_FORM = {
  part_number: '',
  category: '',
  car_make_id: '',
  car_model_id: '',
  year: '',
  min_price: '',
  max_price: ''
}

export function SearchPage() {
  const { isAuthenticated } = useAuth()

  // ── Filter data from API ──────────────────────────────────
  const [makes, setMakes] = useState([])
  const [allModels, setAllModels] = useState([])
  const [models, setModels] = useState([])   // filtered by selected make
  const [years, setYears] = useState([])
  const [categories, setCategories] = useState([])

  // ── Form ──────────────────────────────────────────────────
  const [formData, setFormData] = useState(INITIAL_FORM)

  // ── Results ───────────────────────────────────────────────
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)  // did user already search?
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  // ── Cart item quantities/service per result ───────────────
  const [itemConfig, setItemConfig] = useState({})   // { [garage_part_id]: { quantity, service_option } }

  // ── Cart feedback ─────────────────────────────────────────
  const [addedId, setAddedId] = useState(null)

  // ── 1. Fetch filters on mount ─────────────────────────────
  useEffect(() => {
    async function loadFilters() {
      try {
        const res = await axios.get(`${API}/search/filters`)
        setMakes(res.data.car_makes || [])
        setAllModels(res.data.car_models || [])
        setModels(res.data.car_models || [])
        setYears(res.data.years || [])
        setCategories(res.data.categories || [])
      } catch {
        // filters failing shouldn't block the page
      }
    }
    loadFilters()
  }, [])

  // ── 2. Filter models when make changes ────────────────────
  function handleChange(e) {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setApiError('')

    if (name === 'car_make_id') {
      // reset model when make changes
      setFormData(prev => ({ ...prev, car_make_id: value, car_model_id: '' }))
      setModels(value
        ? allModels.filter(m => String(m.make_id) === String(value))
        : allModels
      )
    }
  }

  // ── 3. Search ─────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setApiError('')
    setResults([])
    setSearched(false)

    // Build params — only include non-empty values
    const params = {}
    Object.entries(formData).forEach(([k, v]) => {
      if (v !== '') params[k] = v
    })

    try {
      const res = await axios.get(`${API}/search/`, { params })
      setResults(res.data.results || [])
      setSearched(true)

      // Initialise per-item config with defaults
      const config = {}
      res.data.results.forEach(item => {
        const defaultService = item.delivery ? 'delivery'
          : item.installation ? 'installation'
            : item.pickup ? 'pickup'
              : 'none'
        config[item.garage_part_id] = { quantity: 1, service_option: defaultService }
      })
      setItemConfig(config)

    } catch (err) {
      setApiError(err?.response?.data?.error || 'Search failed. Please try again.')
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  // ── Reset ─────────────────────────────────────────────────
  function handleReset() {
    setFormData(INITIAL_FORM)
    setModels(allModels)
    setResults([])
    setSearched(false)
    setApiError('')
  }

  // ── Per-item config change ────────────────────────────────
  function handleItemConfig(garage_part_id, field, value) {
    setItemConfig(prev => ({
      ...prev,
      [garage_part_id]: { ...prev[garage_part_id], [field]: value }
    }))
  }

  // ── 4. Add to cart (localStorage) ────────────────────────
  function addToCart(item) {
    const cfg = itemConfig[item.garage_part_id] || { quantity: 1, service_option: 'none' }

    const cartItem = {
      garage_part_id: item.garage_part_id,
      garage_id: item.garage_id,
      garage_name: item.garage_name,
      part_name: item.part_name,
      part_number: item.part_number,
      price: item.price,
      quantity: Number(cfg.quantity),
      service_option: cfg.service_option
    }

    const existing = JSON.parse(localStorage.getItem('cart') || '[]')

    // If same garage_part_id already in cart, update quantity
    const idx = existing.findIndex(c => c.garage_part_id === cartItem.garage_part_id)
    if (idx >= 0) {
      existing[idx].quantity += cartItem.quantity
    } else {
      existing.push(cartItem)
    }

    localStorage.setItem('cart', JSON.stringify(existing))

    // Flash feedback
    setAddedId(item.garage_part_id)
    setTimeout(() => setAddedId(null), 2000)
  }

  // ── Year range label ──────────────────────────────────────
  function yearRange(from, to) {
    if (from && to) return `${from} – ${to}`
    if (from) return `From ${from}`
    if (to) return `Up to ${to}`
    return '—'
  }

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <title>Search Parts | AutoParts Marketplace</title>

      <section className="search-section">
        <div className="container">

          <div className="search-header">
            <h1>Search Auto Parts</h1>
            <p>
              Search instantly by part number, or browse parts by selecting
              your vehicle.
            </p>
          </div>

          {/* ==========================================================
    QUICK PART SEARCH
========================================================== */}

          <div className="search-card quick-search-card">

            <h2 className="quick-search-title">
              Search by Part Number
            </h2>

            <p className="quick-search-subtitle">
              Enter the OEM or manufacturer part number.
            </p>

            <div className="quick-search-row">

              <input
                type="text"
                name="part_number"
                className="form-input quick-search-input"
                placeholder="e.g. 04465-0K340"
                value={formData.part_number}
                onChange={handleChange}
              />

              <button
                type="submit"
                className="btn btn-primary quick-search-btn"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? "Searching..." : "Search"}
              </button>

            </div>

          </div>

          <div className="search-divider">
            <span>OR</span>
          </div>

          {/* ── Filter Form ─────────────────────────────── */}
          <div className="search-card">
            <form onSubmit={handleSubmit} className="search-form">
              <div className="search-form-grid">

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    name="category"
                    className="form-input"
                    value={formData.category}
                    onChange={handleChange}
                  >
                    <option value="">All categories</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Car Make</label>
                  <select
                    name="car_make_id"
                    className="form-input"
                    value={formData.car_make_id}
                    onChange={handleChange}
                  >
                    <option value="">Select make</option>
                    {makes.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Car Model</label>
                  <select
                    name="car_model_id"
                    className="form-input"
                    value={formData.car_model_id}
                    onChange={handleChange}
                    disabled={!formData.car_make_id}
                  >
                    <option value="">Select model</option>
                    {models.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select
                    name="year"
                    className="form-input"
                    value={formData.year}
                    onChange={handleChange}
                  >
                    <option value="">Any year</option>
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Min Price (QAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="min_price"
                    className="form-input"
                    placeholder="0.00"
                    value={formData.min_price}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Max Price (QAR)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="max_price"
                    className="form-input"
                    placeholder="500.00"
                    value={formData.max_price}
                    onChange={handleChange}
                  />
                </div>

              </div>{/* /search-form-grid */}

              {apiError && (
                <div className="alert alert-danger" style={{ marginTop: '16px' }}>
                  {apiError}
                </div>
              )}

              <div className="search-actions">
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? 'Searching…' : 'Search Parts'}
                </button>
                <button type="button" className="btn btn-outline-navy" onClick={handleReset}>
                  Reset
                </button>
              </div>

            </form>
          </div>{/* /search-card */}

          {/* ── Results ─────────────────────────────────── */}
          {searched && results.length === 0 && !apiError && (
            <div className="empty-state-card">
              <h2>No results found</h2>
              <p>Try adjusting the filters or searching with a different part number.</p>
            </div>
          )}

          {results.length > 0 && (
            <div className="results-list">
              <p className="results-count">{results.length} result{results.length !== 1 ? 's' : ''} found</p>

              {results.map(item => {
                const cfg = itemConfig[item.garage_part_id] || { quantity: 1, service_option: 'none' }
                const isAdded = addedId === item.garage_part_id

                return (
                  <div className="result-card" key={`${item.garage_part_id}`}>

                    {/* Top row: name + price */}
                    <div className="result-top">
                      <div>
                        <h2>{item.part_name}</h2>
                        <p className="result-subtitle">
                          Part Number: {item.part_number || '—'}
                        </p>
                      </div>
                      <div className="result-price">
                        QAR {item.price.toFixed(2)}
                      </div>
                    </div>

                    {/* Detail grid */}
                    <div className="result-grid">
                      <p><strong>Garage:</strong> {item.garage_name}</p>
                      <p><strong>In Stock:</strong> {item.quantity} units</p>
                      <p><strong>Year Range:</strong> {yearRange(item.from_year, item.to_year)}</p>
                      <p>
                        <strong>Delivery:</strong>{' '}
                        <span className={item.delivery ? 'badge-yes' : 'badge-no'}>
                          {item.delivery ? 'Yes' : 'No'}
                        </span>
                      </p>
                      <p>
                        <strong>Installation:</strong>{' '}
                        <span className={item.installation ? 'badge-yes' : 'badge-no'}>
                          {item.installation ? 'Yes' : 'No'}
                        </span>
                      </p>
                      <p>
                        <strong>Pickup:</strong>{' '}
                        <span className={item.pickup ? 'badge-yes' : 'badge-no'}>
                          {item.pickup ? 'Yes' : 'No'}
                        </span>
                      </p>
                    </div>

                    {/* Purchase box */}
                    <div className="purchase-box">

                      <div className="purchase-row">
                        <label className="form-label">Quantity</label>
                        <input
                          type="number"
                          className="form-input purchase-qty"
                          min="1"
                          max={item.quantity}
                          value={cfg.quantity}
                          onChange={e => handleItemConfig(item.garage_part_id, 'quantity', e.target.value)}
                        />
                      </div>

                      <div className="purchase-row">
                        <label className="form-label">Service Option</label>
                        <div className="service-options">
                          {item.delivery && (
                            <label className="service-label">
                              <input
                                type="radio"
                                name={`service_${item.garage_part_id}`}
                                value="delivery"
                                checked={cfg.service_option === 'delivery'}
                                onChange={() => handleItemConfig(item.garage_part_id, 'service_option', 'delivery')}
                              />
                              Delivery
                            </label>
                          )}
                          {item.installation && (
                            <label className="service-label">
                              <input
                                type="radio"
                                name={`service_${item.garage_part_id}`}
                                value="installation"
                                checked={cfg.service_option === 'installation'}
                                onChange={() => handleItemConfig(item.garage_part_id, 'service_option', 'installation')}
                              />
                              Installation
                            </label>
                          )}
                          {item.pickup && (
                            <label className="service-label">
                              <input
                                type="radio"
                                name={`service_${item.garage_part_id}`}
                                value="pickup"
                                checked={cfg.service_option === 'pickup'}
                                onChange={() => handleItemConfig(item.garage_part_id, 'service_option', 'pickup')}
                              />
                              Pickup
                            </label>
                          )}
                        </div>
                      </div>

                      <div className="result-actions">
                        {isAuthenticated ? (
                          <button
                            className={`btn ${isAdded ? 'btn-success' : 'btn-primary'}`}
                            onClick={() => addToCart(item)}
                            disabled={isAdded}
                          >
                            {isAdded ? '✓ Added to Cart' : 'Add to Cart'}
                          </button>
                        ) : (
                          <a href="/login" className="btn btn-primary">
                            Login to Order
                          </a>
                        )}
                      </div>

                    </div>{/* /purchase-box */}
                  </div>
                )
              })}
            </div>
          )}

        </div>{/* /container */}
      </section>
    </>
  )
}