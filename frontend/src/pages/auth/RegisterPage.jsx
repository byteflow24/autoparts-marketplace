import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'


export function RegisterPage() {
    const [role, setRole] = useState('customer');
    const navigate = useNavigate();

    function handleContinue(e) {
        e.preventDefault()
        navigate(role === 'customer' ? '/register/customer' : '/register/garage')
    }

    return (
        <>
            <title>Register</title>

            <section className="auth-section">
                <div className="container">
                    <div className="auth-card">
                        <div className="auth-header">
                            <h1>Create Your Account</h1>
                            <p>Select what type of account you want to create.</p>
                        </div>

                        <form onSubmit={handleContinue} className="auth-form">
                            <div className="form-group">
                                <label className="form-label">Register As</label>

                                <div className="radio-group">
                                    <label className={`radio-option ${role === 'customer' ? 'radio-selected' : ''}`}>
                                        <input
                                            type='radio'
                                            name='role'
                                            value='customer'
                                            checked={role === 'customer'}
                                            onChange={() => setRole('customer')}
                                        />
                                        <span>Customer</span>
                                        <small>Search and order auto parts</small>
                                    </label>

                                    <label className={`radio-option ${role === 'garage' ? 'radio-selected' : ''}`}>
                                        <input
                                            type='radio'
                                            name='role'
                                            value='garage'
                                            checked={role === 'garage'}
                                            onChange={() => setRole('garage')}
                                        />
                                        <span>Garage</span>
                                        <small>List and sell auto parts</small>
                                    </label>
                                </div>
                            </div>

                            <div className="form-actions">
                                <button type="submit" className="btn btn-primary form-btn">
                                    Continue
                                </button>
                            </div>
                        </form>

                        <div className="auth-footer-text">
                            <p>
                                Already have an account?{' '}
                                <NavLink to="/login">Login here</NavLink>
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}