import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/Authcontext'

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({ 'email': '', 'password': '' })
    const [errors, setErrors] = useState({});
    const [apiError, setApiError] = useState('');
    const [loading, setLoading] = useState(false);

    function handleChange(e) {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
        setErrors(prev => ({ ...prev, [e.target.name]: '' }))
        setApiError('')
    }

    function validate() {
        const errs = {}
        if (!formData.email.trim()) errs.email = 'Email is required.'
        if (!formData.password.trim()) errs.password = 'Password is required.'
        return errs
    }

    async function handleSubmit(e) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }

        setLoading(true)
        try {
            const user = await login(formData.email, formData.password)
            // Redirect based on role
            navigate(user.role === 'garage' ? '/dashboard' : '/')
        } catch (err) {
            const msg = err?.response?.data?.error || 'Something went wrong. Please try again.'
            setApiError(msg)
        } finally {
            setLoading(false)
        }
    }

    return (
        <section className="auth-section">
            <div className="container">
                <div className="auth-card">
                    <div className="auth-header">
                        <h1>Welcome Back</h1>
                        <p>Login to continue to your account.</p>
                    </div>

                    {apiError && <div className="alert alert-danger">{apiError}</div>}

                    <form onSubmit={handleSubmit} className="auth-form" noValidate>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className={`form-input ${errors.email ? 'input-error' : ''}`}
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                            {errors.email && <small className="form-error">{errors.email}</small>}
                        </div>

                        <div className="form-group">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                className={`form-input ${errors.password ? 'input-error' : ''}`}
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={handleChange}
                            />
                            {errors.password && <small className="form-error">{errors.password}</small>}
                        </div>

                        <div className="form-actions">
                            <button
                                type="submit"
                                className="btn btn-primary form-btn"
                                disabled={loading}
                            >
                                {loading ? 'Logging in…' : 'Login'}
                            </button>
                        </div>

                    </form>

                    <div className="auth-footer-text">
                        <p>
                            Don’t have an account?{' '}
                            <NavLink to="/register">Register here</NavLink>
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}

