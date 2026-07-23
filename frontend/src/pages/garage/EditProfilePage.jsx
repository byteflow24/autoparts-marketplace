import { useState, useEffect } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/**
 * EditProfilePage  (Garage only)
 *
 * 1. On mount → GET /garage/dashboard to pre-fill current values
 * 2. On submit → PUT /garage/profile/edit
 * 3. On success → redirect to /dashboard
 */
export function EditProfilePage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    garage_name:      '',
    location:         '',
    national_address: '',
    specialization:   '',
  })

  const [loadError, setLoadError] = useState('')
  const [errors,    setErrors]    = useState({})
  const [apiError,  setApiError]  = useState('')
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const [success,   setSuccess]   = useState(false)

  // ── Pre-fill form from dashboard data ──────────────────────
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await axios.get(`${API}/garage/dashboard`)
        const d   = res.data
        setFormData({
          garage_name:      d.garage_name      || '',
          location:         d.location         || '',
          national_address: d.national_address || '',
          specialization:   d.specialization   || '',
        })
      } catch (err) {
        setLoadError(err?.response?.data?.error || 'Failed to load garage profile.')
      } finally {
        setLoading(false)
      }
    }
    loadProfile()
  }, [])

  // ── Handlers ───────────────────────────────────────────────
  function handleChange(e) {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setErrors(prev  => ({ ...prev, [e.target.name]: '' }))
    setApiError('')
  }

  function validate() {
    const errs = {}
    if (!formData.garage_name.trim())
      errs.garage_name = 'Garage name is required.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSaving(true)
    setApiError('')
    try {
      await axios.put(`${API}/garage/profile/edit`, formData)
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

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-card">
            <div className="auth-header">
              <p>Loading profile…</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ── Load error ─────────────────────────────────────────────
  if (loadError) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-card">
            <div className="alert alert-danger">{loadError}</div>
            <div className="auth-footer-text">
              <NavLink to="/dashboard">Back to Dashboard</NavLink>
            </div>
          </div>
        </div>
      </section>
    )
  }

  // ─────────────────────────────────────────────────────────
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
                  <input
                    type="text"
                    name="garage_name"
                    className={`form-input ${errors.garage_name ? 'input-error' : ''}`}
                    placeholder="Enter garage name"
                    value={formData.garage_name}
                    onChange={handleChange}
                  />
                  {errors.garage_name && (
                    <small className="form-error">{errors.garage_name}</small>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    name="location"
                    className="form-input"
                    placeholder="Enter garage location"
                    value={formData.location}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">National Address</label>
                  <input
                    type="text"
                    name="national_address"
                    className="form-input"
                    placeholder="Enter national address"
                    value={formData.national_address}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group form-group-full">
                  <label className="form-label">Specialization</label>
                  <input
                    type="text"
                    name="specialization"
                    className="form-input"
                    placeholder="e.g. Engine, brakes, electrical parts"
                    value={formData.specialization}
                    onChange={handleChange}
                  />
                </div>

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
              <NavLink to="/dashboard">← Back to Dashboard</NavLink>
            </div>

          </div>
        </div>
      </section>
    </>
  )
}