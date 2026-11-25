import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

const API = '/api'

const STATUS_OPTIONS = ['New', 'Used']

/**
 * EditPartPage  (Garage only)
 *
 * 1. On mount → GET /parts/garage-part/<garage_part_id>
 * 2. On submit → PUT /parts/garage-part/<garage_part_id>/edit
 * 3. On success → navigate(-1)
 */
export function EditPartPage() {
  const { garage_part_id } = useParams()
  const navigate = useNavigate()

  const [partInfo, setPartInfo] = useState(null)
  const [formData, setFormData] = useState({
    price: '',
    quantity: '',
    from_year: '',
    to_year: '',
    status: '',
    delivery_available: false,
    installation_available: false,
  })

  const [loadError, setLoadError] = useState('')
  const [errors, setErrors]       = useState({})
  const [apiError, setApiError]   = useState('')
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [success, setSuccess]     = useState(false)

  // ── Status searchable select state ────────────────────────────────────────
  const [statusOpen,   setStatusOpen]   = useState(false)
  const [statusSearch, setStatusSearch] = useState('')
  const statusRef = useRef(null)

  // Close status dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setStatusOpen(false)
        setStatusSearch('')
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Load part on mount ─────────────────────────────────────────────────────
  useEffect(() => {
    async function loadPart() {
      try {
        const res = await axios.get(`${API}/parts/garage-part/${garage_part_id}`)
        const d = res.data
        setPartInfo(d)
        setFormData({
          price:                   d.price ?? '',
          quantity:                d.quantity ?? '',
          from_year:               d.from_year ?? '',
          to_year:                 d.to_year ?? '',
          status:                  d.condition ?? '',
          delivery_available:      Boolean(d.delivery_available),
          installation_available:  Boolean(d.installation_available),
        })
      } catch (err) {
        setLoadError(err?.response?.data?.error || 'Failed to load part.')
      } finally {
        setLoading(false)
      }
    }
    loadPart()
  }, [garage_part_id])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    setErrors(prev => ({ ...prev, [name]: '' }))
    setApiError('')
  }

  function selectStatus(val) {
    setFormData(prev => ({ ...prev, status: val }))
    setErrors(prev => ({ ...prev, status: '' }))
    setStatusOpen(false)
    setStatusSearch('')
  }

  function validate() {
    const errs = {}
    if (!formData.price || Number(formData.price) <= 0)
      errs.price = 'Price must be greater than 0.'
    if (formData.quantity === '' || Number(formData.quantity) < 0)
      errs.quantity = 'Quantity is required.'
    if (formData.from_year && formData.to_year &&
        Number(formData.from_year) > Number(formData.to_year))
      errs.to_year = 'To year must be ≥ from year.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    setApiError('')

    try {
      await axios.put(`${API}/parts/garage-part/${garage_part_id}/edit`, {
        price:                  Number(formData.price),
        quantity:               Number(formData.quantity),
        from_year:              formData.from_year !== '' ? Number(formData.from_year) : null,
        to_year:                formData.to_year   !== '' ? Number(formData.to_year)   : null,
        status:                 formData.status    || null,
        delivery_available:     formData.delivery_available,
        installation_available: formData.installation_available,
      })
      setSuccess(true)
      setTimeout(() => navigate(-1), 1500)
    } catch (err) {
      setApiError(err?.response?.data?.error || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-card auth-card-wide">
            <div className="auth-header"><p>Loading part…</p></div>
          </div>
        </div>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-card auth-card-wide">
            <div className="alert alert-danger">{loadError}</div>
            <div className="auth-footer-text">
              <button type="button" className="btn btn-link" onClick={() => navigate(-1)}>← Back</button>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ── Build car label (year + make + model + sub-model) ────────────────────
  const carLabel = [
    partInfo?.year,
    partInfo?.car_make,
    partInfo?.car_model,
    partInfo?.car_sub_model,
  ].filter(Boolean).join(' ')

  // ── Status dropdown filtered options ──────────────────────────────────────
  const filteredStatuses = STATUS_OPTIONS.filter(s =>
    s.toLowerCase().includes(statusSearch.toLowerCase())
  )

  return (
    <>
      <title>Edit Part | AutoParts Marketplace</title>

      <section className="auth-section">
        <div className="container">
          <div className="auth-card auth-card-wide">

            <div className="auth-header">
              <h1>Edit Part</h1>
              <p>Update inventory details for this part listing.</p>
            </div>

            {/* ── Part info card ───────────────────────────────────────── */}
            <div className="garage-profile-card">
              <h2>{carLabel}</h2>
              <div className="garage-meta">
                <p><strong>Part Number:</strong>  {partInfo.part_number || '—'}</p>
                <p><strong>Category:</strong>     {partInfo.category    || '—'}</p>
                <p><strong>Sub-Category:</strong> {partInfo.subcategory || '—'}</p>
                <p><strong>Part Name:</strong>    {partInfo.part_name   || '—'}</p>
              </div>
            </div>

            {apiError && <div className="alert alert-danger">{apiError}</div>}
            {success  && <div className="alert alert-success">Part updated! Redirecting…</div>}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>

              <h2 className="form-section-title">Inventory Details</h2>
              <div className="form-grid">

                <div className="form-group">
                  <label className="form-label">Price</label>
                  <input
                    type="number" step="0.01" name="price"
                    className={`form-input ${errors.price ? 'input-error' : ''}`}
                    value={formData.price}
                    onChange={handleChange}
                  />
                  {errors.price && <small className="form-error">{errors.price}</small>}
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number" name="quantity"
                    className={`form-input ${errors.quantity ? 'input-error' : ''}`}
                    value={formData.quantity}
                    onChange={handleChange}
                  />
                  {errors.quantity && <small className="form-error">{errors.quantity}</small>}
                </div>

                <div className="form-group">
                  <label className="form-label">From Year</label>
                  <input
                    type="number" name="from_year"
                    className="form-input"
                    placeholder="e.g. 2018"
                    value={formData.from_year}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">To Year</label>
                  <input
                    type="number" name="to_year"
                    className={`form-input ${errors.to_year ? 'input-error' : ''}`}
                    placeholder="e.g. 2022"
                    value={formData.to_year}
                    onChange={handleChange}
                  />
                  {errors.to_year && <small className="form-error">{errors.to_year}</small>}
                </div>

                {/* ── Status searchable select ──────────────────────────── */}
                <div className="form-group" ref={statusRef} style={{ position: 'relative' }}>
                  <label className="form-label">Condition</label>
                  <div
                    className={`filter-searchable-wrap ${statusOpen ? 'open' : ''}`}
                    style={{ position: 'relative' }}
                  >
                    <input
                      type="text"
                      className="filter-select form-input"
                      placeholder="Search status…"
                      value={statusOpen ? statusSearch : formData.status}
                      readOnly={!statusOpen}
                      onClick={() => { setStatusOpen(true); setStatusSearch('') }}
                      onChange={e => setStatusSearch(e.target.value)}
                      style={{ cursor: 'pointer' }}
                    />
                    {statusOpen && (
                      <div className="filter-searchable-dropdown">
                        {filteredStatuses.length ? (
                          filteredStatuses.map(s => (
                            <div
                              key={s}
                              className={`filter-searchable-option${formData.status === s ? ' selected' : ''}`}
                              onMouseDown={() => selectStatus(s)}
                            >
                              {s}
                            </div>
                          ))
                        ) : (
                          <div className="filter-searchable-empty">No results</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <h2 className="form-section-title">Service Options</h2>
              <div className="checkbox-grid">
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="delivery_available"
                    checked={formData.delivery_available}
                    onChange={handleChange}
                  />
                  <span>Delivery Available</span>
                </label>
                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="installation_available"
                    checked={formData.installation_available}
                    onChange={handleChange}
                  />
                  <span>Installation Available</span>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn btn-primary form-btn"
                  disabled={saving || success}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>

            </form>

            <div className="auth-footer-text">
              <button type="button" className="btn btn-link" onClick={() => navigate(-1)}>← Back</button>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}