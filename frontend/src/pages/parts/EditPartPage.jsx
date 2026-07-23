import { useState, useEffect } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * EditPartPage  (Garage only)
 *
 * 1. On mount → GET /parts/garage-part/<garage_part_id>
 * 2. On submit → PUT /parts/garage-part/<garage_part_id>/edit
 * 3. On success → redirect to /garage/inventory
 */
export function EditPartPage() {
  const { garage_part_id } = useParams()
  const navigate = useNavigate()

  const [partInfo, setPartInfo] = useState(null)
  const [formData, setFormData] = useState({
    price: '',
    cost_price: '',
    quantity: '',
    from_year: '',
    to_year: '',
    delivery_available: false,
    installation_available: false,
    pickup_available: false,
  })

  const [loadError, setLoadError] = useState('')
  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function loadPart() {
      try {
        const res = await axios.get(`${API}/parts/garage-part/${garage_part_id}`)
        const d = res.data
        setPartInfo(d)
        setFormData({
          price: d.price ?? '',
          cost_price: d.cost_price ?? '',
          quantity: d.quantity ?? '',
          from_year: d.from_year ?? '',
          to_year: d.to_year ?? '',
          delivery_available: Boolean(d.delivery_available),
          installation_available: Boolean(d.installation_available),
          pickup_available: Boolean(d.pickup_available),
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

  function validate() {
    const errs = {}

    if (!formData.price || Number(formData.price) <= 0)
      errs.price = 'Price must be greater than 0.'

    if (formData.quantity === '' || Number(formData.quantity) < 0)
      errs.quantity = 'Quantity is required.'

    if (formData.from_year && formData.to_year &&
        Number(formData.from_year) > Number(formData.to_year)) {
      errs.to_year = 'To year must be greater than or equal to from year.'
    }

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
        price: Number(formData.price),
        cost_price: formData.cost_price !== '' ? Number(formData.cost_price) : null,
        quantity: Number(formData.quantity),
        from_year: formData.from_year !== '' ? Number(formData.from_year) : null,
        to_year: formData.to_year !== '' ? Number(formData.to_year) : null,
        delivery_available: formData.delivery_available,
        installation_available: formData.installation_available,
        pickup_available: formData.pickup_available,
      })

      setSuccess(true)
      setTimeout(() => navigate('/garage/inventory'), 1500)
    } catch (err) {
      setApiError(err?.response?.data?.error || 'Failed to save changes.')
    } finally {
      setSaving(false)
    }
  }

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
              <NavLink to="/garage/inventory">← Back to Inventory</NavLink>
            </div>
          </div>
        </div>
      </section>
    )
  }

  const carLabel = partInfo?.car_make && partInfo?.car_model
    ? `${partInfo.car_make} - ${partInfo.car_model}`
    : '—'

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

            <div className="garage-profile-card">
              <h2>{partInfo.part_name}</h2>
              <div className="garage-meta">
                <p><strong>Part Number:</strong> {partInfo.part_number || '—'}</p>
                <p><strong>Brand:</strong> {partInfo.brand || '—'}</p>
                <p><strong>Category:</strong> {partInfo.category || '—'}</p>
                <p><strong>Car Model:</strong> {carLabel}</p>
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
                    type="number"
                    step="0.01"
                    name="price"
                    className={`form-input ${errors.price ? 'input-error' : ''}`}
                    value={formData.price}
                    onChange={handleChange}
                  />
                  {errors.price && <small className="form-error">{errors.price}</small>}
                </div>

                <div className="form-group">
                  <label className="form-label">Cost Price</label>
                  <input
                    type="number"
                    step="0.01"
                    name="cost_price"
                    className="form-input"
                    placeholder="Optional (for profit tracking)"
                    value={formData.cost_price}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Quantity</label>
                  <input
                    type="number"
                    name="quantity"
                    className={`form-input ${errors.quantity ? 'input-error' : ''}`}
                    value={formData.quantity}
                    onChange={handleChange}
                  />
                  {errors.quantity && <small className="form-error">{errors.quantity}</small>}
                </div>

                <div className="form-group">
                  <label className="form-label">From Year</label>
                  <input
                    type="number"
                    name="from_year"
                    className="form-input"
                    placeholder="Example: 2018"
                    value={formData.from_year}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">To Year</label>
                  <input
                    type="number"
                    name="to_year"
                    className={`form-input ${errors.to_year ? 'input-error' : ''}`}
                    placeholder="Example: 2022"
                    value={formData.to_year}
                    onChange={handleChange}
                  />
                  {errors.to_year && <small className="form-error">{errors.to_year}</small>}
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

                <label className="checkbox-item">
                  <input
                    type="checkbox"
                    name="pickup_available"
                    checked={formData.pickup_available}
                    onChange={handleChange}
                  />
                  <span>Pickup Available</span>
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
              <NavLink to="/garage/inventory">← Back to Inventory</NavLink>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}
