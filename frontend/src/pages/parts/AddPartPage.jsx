import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const INITIAL = {
  name: '',
  part_number: '',
  brand: '',
  category: '',
  car_make_id: '',
  car_model_id: '',
  from_year: '',
  to_year: '',
  price: '',
  cost_price: '',
  quantity: '',
  delivery_available: false,
  installation_available: false,
  pickup_available: false,
}

/**
 * AddPartPage  (Garage only)
 *
 * 1. On mount → GET /parts/car-makes and /parts/car-models
 * 2. On submit → POST /parts/create, then POST /parts/add-to-garage
 * 3. On success → redirect to /garage/inventory
 */
export function AddPartPage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState(INITIAL)
  const [makes, setMakes] = useState([])
  const [allModels, setAllModels] = useState([])
  const [models, setModels] = useState([])

  const [errors, setErrors] = useState({})
  const [apiError, setApiError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [makesRes, modelsRes] = await Promise.all([
          axios.get(`${API}/parts/car-makes`),
          axios.get(`${API}/parts/car-models`),
        ])
        setMakes(makesRes.data || [])
        setAllModels(modelsRes.data || [])
        setModels(modelsRes.data || [])
      } catch {
        setApiError('Failed to load car makes and models.')
      } finally {
        setLoading(false)
      }
    }
    loadDropdowns()
  }, [])

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    const nextValue = type === 'checkbox' ? checked : value

    if (name === 'car_make_id') {
      setModels(value
        ? allModels.filter(m => String(m.make_id) === String(value))
        : allModels
      )
      setFormData(prev => ({ ...prev, car_make_id: value, car_model_id: '' }))
    } else {
      setFormData(prev => ({ ...prev, [name]: nextValue }))
    }

    setErrors(prev => ({ ...prev, [name]: '' }))
    setApiError('')
  }

  function validate() {
    const errs = {}

    if (!formData.name.trim())
      errs.name = 'Part name is required.'

    if (!formData.car_model_id)
      errs.car_model_id = 'Car model is required.'

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
      const createRes = await axios.post(`${API}/parts/create`, {
        name: formData.name.trim(),
        part_number: formData.part_number.trim() || null,
        brand: formData.brand.trim() || null,
        category: formData.category.trim() || null,
      })

      await axios.post(`${API}/parts/add-to-garage`, {
        part_id: createRes.data.id,
        car_model_id: Number(formData.car_model_id),
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
      setApiError(err?.response?.data?.error || 'Failed to add part.')
    } finally {
      setSaving(false)
    }
  }

  const makeById = Object.fromEntries(makes.map(m => [m.id, m.name]))

  if (loading) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-card auth-card-wide">
            <div className="auth-header"><p>Loading form…</p></div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <title>Add Part | AutoParts Marketplace</title>

      <section className="auth-section">
        <div className="container">
          <div className="auth-card auth-card-wide">

            <div className="auth-header">
              <h1>Add Part to Inventory</h1>
              <p>Create a part and link it to your garage inventory.</p>
            </div>

            {apiError && <div className="alert alert-danger">{apiError}</div>}
            {success  && <div className="alert alert-success">Part added! Redirecting to inventory…</div>}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>

              <h2 className="form-section-title">Part Information</h2>
              <div className="form-grid">

                <div className="form-group">
                  <label className="form-label">Part Name</label>
                  <input
                    type="text"
                    name="name"
                    className={`form-input ${errors.name ? 'input-error' : ''}`}
                    placeholder="Example: Brake Pad"
                    value={formData.name}
                    onChange={handleChange}
                  />
                  {errors.name && <small className="form-error">{errors.name}</small>}
                </div>

                <div className="form-group">
                  <label className="form-label">Part Number</label>
                  <input
                    type="text"
                    name="part_number"
                    className="form-input"
                    placeholder="Optional part number"
                    value={formData.part_number}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Brand</label>
                  <input
                    type="text"
                    name="brand"
                    className="form-input"
                    placeholder="Example: Bosch"
                    value={formData.brand}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    name="category"
                    className="form-input"
                    placeholder="Example: Brakes"
                    value={formData.category}
                    onChange={handleChange}
                  />
                </div>

              </div>

              <h2 className="form-section-title">Compatibility</h2>
              <div className="form-grid">

                <div className="form-group">
                  <label className="form-label">Car Make</label>
                  <select
                    name="car_make_id"
                    className="form-input"
                    value={formData.car_make_id}
                    onChange={handleChange}
                  >
                    <option value="">Select make</option>
                    {makes.map(make => (
                      <option key={make.id} value={make.id}>{make.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Car Model</label>
                  <select
                    name="car_model_id"
                    className={`form-input ${errors.car_model_id ? 'input-error' : ''}`}
                    value={formData.car_model_id}
                    onChange={handleChange}
                  >
                    <option value="">Select model</option>
                    {models.map(model => (
                      <option key={model.id} value={model.id}>
                        {makeById[model.make_id]
                          ? `${makeById[model.make_id]} - ${model.name}`
                          : model.name}
                      </option>
                    ))}
                  </select>
                  {errors.car_model_id && (
                    <small className="form-error">{errors.car_model_id}</small>
                  )}
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

              <h2 className="form-section-title">Inventory Details</h2>
              <div className="form-grid">

                <div className="form-group">
                  <label className="form-label">Price</label>
                  <input
                    type="number"
                    step="0.01"
                    name="price"
                    className={`form-input ${errors.price ? 'input-error' : ''}`}
                    placeholder="Example: 150.00"
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
                    placeholder="Example: 5"
                    value={formData.quantity}
                    onChange={handleChange}
                  />
                  {errors.quantity && <small className="form-error">{errors.quantity}</small>}
                </div>

              </div>

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
                  {saving ? 'Adding…' : 'Add Part'}
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
