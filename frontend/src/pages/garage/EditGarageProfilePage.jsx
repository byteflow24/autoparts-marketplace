import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = '/api'

const QATAR_CITIES = [
  'Doha', 'Lusail', 'Al Wakra', 'Al Khor',
  'Al Shamal', 'Dukhan', 'Mesaieed', 'Al Shahania',
]

export function EditGarageProfilePage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    garage_name:      '',
    location:         '',
    national_address: '',
    specialization:   '',
  })

  // delivery_zones: { Doha: '25.00', Lusail: '', ... }
  const [zones, setZones] = useState(() =>
    Object.fromEntries(QATAR_CITIES.map(c => [c, '']))
  )

  const [loadError, setLoadError] = useState('')
  const [errors,    setErrors]    = useState({})
  const [apiError,  setApiError]  = useState('')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [success,   setSuccess]   = useState(false)

  function handleBack() {
    navigate(-1)
  }

  useEffect(() => {
    async function loadProfile() {
      try {
        // Try the new GET /garage/profile/edit first; fall back to dashboard
        let d
        try {
          const res = await axios.get(`${API}/garage/profile/edit`)
          d = res.data
        } catch {
          const res = await axios.get(`${API}/garage/dashboard`)
          d = res.data
        }
        setFormData({
          garage_name:      d.garage_name      || '',
          location:         d.location         || '',
          national_address: d.national_address || '',
          specialization:   d.specialization   || '',
        })
        // Pre-fill zone prices
        if (d.delivery_zones?.length) {
          const zoneMap = Object.fromEntries(QATAR_CITIES.map(c => [c, '']))
          d.delivery_zones.forEach(z => {
            if (z.city in zoneMap) zoneMap[z.city] = String(z.price)
          })
          setZones(zoneMap)
        }
      } catch (err) {
        setLoadError(err?.response?.data?.error || 'Failed to load garage profile.')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  function handleChange(e) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors(prev  => ({ ...prev, [e.target.name]: '' }))
    setApiError('')
  }

  function handleZoneChange(city, value) {
    setZones(prev => ({ ...prev, [city]: value }))
  }

  function validate() {
    const errs = {}
    if (!formData.garage_name.trim()) errs.garage_name = 'Garage name is required.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    setApiError('')
    try {
      // Build delivery_zones array — only cities with a price set
      const delivery_zones = QATAR_CITIES
        .filter(c => zones[c] !== '' && !isNaN(Number(zones[c])))
        .map(c => ({ city: c, price: Number(zones[c]) }))

      await axios.put(`${API}/garage/profile/edit`, {
        ...formData,
        delivery_zones,
      })
      setSuccess(true)
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (err) {
      if (err?.response?.data?.errors) {
        setErrors(err.response.data.errors)
      } else {
        setApiError(err?.response?.data?.error || 'Failed to save changes.')
      }
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-card"><div className="auth-header"><p>Loading profile…</p></div></div>
        </div>
      </section>
    )
  }

  if (loadError) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-card">
            <div className="alert alert-danger">{loadError}</div>
            <div className="auth-footer-text"><NavLink to="/dashboard">Back to Dashboard</NavLink></div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <>
      <title>Edit Garage Profile | AutoParts Marketplace</title>
      <section className="auth-section">
        <div className="container">
          <div className="auth-card auth-card-wide">

            <div className="auth-header">
              <h1>Edit Garage Profile</h1>
              <p>Update your garage information and business details.</p>
            </div>

            {apiError && <div className="alert alert-danger">{apiError}</div>}
            {success  && <div className="alert alert-success">Profile updated! Redirecting…</div>}

            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <div className="form-grid">

                <div className="form-group">
                  <label className="form-label">Garage Name</label>
                  <input type="text" name="garage_name"
                    className={`form-input ${errors.garage_name ? 'input-error' : ''}`}
                    placeholder="Enter garage name"
                    value={formData.garage_name} onChange={handleChange} />
                  {errors.garage_name && <small className="form-error">{errors.garage_name}</small>}
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input type="text" name="location" className="form-input"
                    placeholder="Enter garage location"
                    value={formData.location} onChange={handleChange} />
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">National Address</label>
                  <input type="text" name="national_address" className="form-input"
                    placeholder="Enter national address"
                    value={formData.national_address} onChange={handleChange} />
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Specialization</label>
                  <input type="text" name="specialization" className="form-input"
                    placeholder="e.g. Engine, brakes, electrical parts"
                    value={formData.specialization} onChange={handleChange} />
                </div>

              </div>

              {/* ── Delivery Zones ── */}
              <div style={{ marginTop: '28px' }}>
                <h3 style={{ marginBottom: '6px' }}>🚚 Delivery Pricing by City</h3>
                <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '0.9rem' }}>
                  Set your delivery fee for each city in Qatar. Leave a city blank if you don't deliver there.
                </p>
                <div className="form-grid">
                  {QATAR_CITIES.map(city => (
                    <div className="form-group" key={city}>
                      <label className="form-label">{city}</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>QAR</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="form-input"
                          placeholder="—"
                          value={zones[city]}
                          onChange={e => handleZoneChange(city, e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary form-btn" disabled={saving || success}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>

            <div className="auth-footer-text">
              <button type="button" className="btn btn-link" onClick={handleBack}>← Back</button>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}