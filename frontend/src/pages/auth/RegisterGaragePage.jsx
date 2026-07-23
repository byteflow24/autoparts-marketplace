import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const INITIAL = {
  name: '', email: '', password: '', confirm_password: '',
  country_code: '', phone: '',
  garage_name: '', cr_number: '', national_address: '',
  specialization: '', location: ''
}

export function RegisterGaragePage() {
  const navigate = useNavigate()

  const [formData, setFormData] = useState(INITIAL)
  const [errors,   setErrors]   = useState({})
  const [apiError, setApiError] = useState('')
  const [success,  setSuccess]  = useState(false)
  const [loading,  setLoading]  = useState(false)

  function handleChange(e) {
    setFormData(prev => ({ ...prev,  [e.target.name]: e.target.value }))
    setErrors(prev   => ({ ...prev,  [e.target.name]: '' }))
    setApiError('')
  }

  function validate() {
    const errs = {}
    if (!formData.name.trim() || formData.name.trim().length < 3)
      errs.name = 'Name must be at least 3 characters.'
    if (!formData.email.trim())
      errs.email = 'Email is required.'
    if (!formData.password || formData.password.length < 6)
      errs.password = 'Password must be at least 6 characters.'
    if (formData.password !== formData.confirm_password)
      errs.confirm_password = 'Passwords do not match.'
    if (!formData.garage_name.trim())
      errs.garage_name = 'Garage name is required.'
    if (!formData.cr_number)
      errs.cr_number = 'CR number is required.'
    if (!formData.national_address.trim())
      errs.national_address = 'National address is required.'
    if (!formData.specialization.trim())
      errs.specialization = 'Specialization is required.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    try {
      await axios.post(`${API}/auth/register/garage`, {
        ...formData,
        cr_number: Number(formData.cr_number)
      })
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      if (err?.response?.data?.error) {
        setErrors(err.response.data.error)
      } else {
        setApiError(err?.response?.data?.error || 'Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <section className="auth-section">
        <div className="container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>Garage Account Created!</h1>
              <p>Redirecting you to login…</p>
            </div>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="auth-section">
      <div className="container">
        <div className="auth-card auth-card-wide">

          <div className="auth-header">
            <h1>Register as Garage</h1>
            <p>Create your garage account to list and sell auto parts.</p>
          </div>

          {apiError && <div className="alert alert-danger">{apiError}</div>}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>

            {/* ── Account Details ─────────────────────── */}
            <h3 className="form-section-title">Account Details</h3>
            <div className="form-grid">
              <Field label="Owner Name"     name="name"             type="text"     placeholder="Enter your name"          value={formData.name}             onChange={handleChange} error={errors.name} />
              <Field label="Email"          name="email"            type="email"    placeholder="Enter your email"         value={formData.email}            onChange={handleChange} error={errors.email} />
              <Field label="Password"       name="password"         type="password" placeholder="Create a password"        value={formData.password}         onChange={handleChange} error={errors.password} />
              <Field label="Confirm Password" name="confirm_password" type="password" placeholder="Confirm your password" value={formData.confirm_password}  onChange={handleChange} error={errors.confirm_password} />
              <Field label="Country Code"  name="country_code"     type="text"     placeholder="+966"                     value={formData.country_code}     onChange={handleChange} error={errors.country_code} />
              <Field label="Phone"         name="phone"            type="tel"      placeholder="Enter your phone number"  value={formData.phone}            onChange={handleChange} error={errors.phone} />
            </div>

            {/* ── Garage Details ──────────────────────── */}
            <h3 className="form-section-title">Garage Details</h3>
            <div className="form-grid">
              <Field label="Garage Name"      name="garage_name"      type="text" placeholder="e.g. Al Noor Auto Parts"   value={formData.garage_name}      onChange={handleChange} error={errors.garage_name} />
              <Field label="CR Number"        name="cr_number"        type="number" placeholder="Commercial registration" value={formData.cr_number}        onChange={handleChange} error={errors.cr_number} />
              <Field label="National Address" name="national_address" type="text" placeholder="e.g. Riyadh 12345"         value={formData.national_address} onChange={handleChange} error={errors.national_address} />
              <Field label="Specialization"   name="specialization"   type="text" placeholder="e.g. Toyota, European cars" value={formData.specialization} onChange={handleChange} error={errors.specialization} />
              <Field label="Location (optional)" name="location"      type="text" placeholder="City or district"          value={formData.location}         onChange={handleChange} error={errors.location} />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary form-btn" disabled={loading}>
                {loading ? 'Creating account…' : 'Register as Garage'}
              </button>
            </div>

          </form>

          <div className="auth-footer-text">
            <p>
              Want a customer account instead?{' '}
              <NavLink to="/register/customer">Register as Customer</NavLink>
            </p>
          </div>

        </div>
      </div>
    </section>
  )
}

function Field({ label, name, type, placeholder, value, onChange, error }) {
  return (
    <div className="form-group">
      <label htmlFor={name} className="form-label">{label}</label>
      <input
        type={type}
        id={name}
        name={name}
        className={`form-input ${error ? 'input-error' : ''}`}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
      {error && <small className="form-error">{error}</small>}
    </div>
  )
}