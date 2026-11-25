import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import axios from 'axios'

const API = '/api'


const INITIAL = {
    name: '', email: '', password: '', confirm_password: '',
    country_code: '', phone: ''
}

export function RegisterCustomerPage() {
    const navigate = useNavigate()

    const [formData, setFormData] = useState(INITIAL);
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);

    function handleChange(e) {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setErrors(prev => ({ ...prev, [e.target.name]: '' }))
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

        return errs
    }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = validate();

        if (Object.keys(errs).length) { setErrors(errs); return; }

        setLoading(true);
        try {
            await axios.post(`${API}/auth/register/customer`, formData)
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000)
        } catch (err) {
            // Field-level errors from the API (422)
            if (err?.response?.data?.errors) {
                setErrors(err.response.data.errors)
            } else {
                setApiError(err?.response?.data?.error || 'Registration failed. Please try again.')
            }
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <section className="auth-sectoin">
                <div className="container">
                    <div className="auth-card">
                        <div className="auth-header">
                            <h1>Account Created!</h1>
                            <p>Redirecting you to login…</p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }
    return (
        <section className="auth-section">
            <div className="container">
                <div className="auth-card auth-card-wide">
                    <div className="auth-header">
                        <h1>Register as Customer</h1>
                        <p>Create your customer account to search and order auto parts.</p>
                    </div>

                    {apiError && <div className="alert alert-danger">{apiError}</div>}

                    <form onSubmit={handleSubmit} className="auth-form" noValidate>
                        <div className="form-grid">

                            <Field label="Name" name="name" type="text"
                                placeholder="Enter your name"
                                value={formData.name} onChange={handleChange} error={errors.name} />

                            <Field label="Email" name="email" type="email"
                                placeholder="Enter your email"
                                value={formData.email} onChange={handleChange} error={errors.email} />

                            <Field label="Password" name="password" type="password"
                                placeholder="Create a password"
                                value={formData.password} onChange={handleChange} error={errors.password} />

                            <Field label="Confirm Password" name="confirm_password" type="password"
                                placeholder="Confirm your password"
                                value={formData.confirm_password} onChange={handleChange} error={errors.confirm_password} />

                            <Field label="Country Code" name="country_code" type="text"
                                placeholder="+974"
                                value={formData.country_code} onChange={handleChange} error={errors.country_code} />

                            <Field label="Phone" name="phone" type="tel"
                                placeholder="Enter your phone number"
                                value={formData.phone} onChange={handleChange} error={errors.phone} />

                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary form-btn" disabled={loading}>
                                {loading ? 'Creating account…' : 'Register as Customer'}
                            </button>
                        </div>
                    </form>

                    <div className="auth-footer-text">
                        <p>
                            Want a garage account instead?{' '}
                            <NavLink to="/register/garage">Register as Garage</NavLink>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

// Reusable field component local to this file
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