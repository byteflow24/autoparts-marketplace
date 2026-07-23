import { NavLink } from 'react-router-dom'
import { useAuth } from '../../context/Authcontext'

export function HomePage() {
    const { isAuthenticated, user } = useAuth();

    return (
        <>
            <title>AutoPart Marketplace</title>

            {/* Hero Section */}
            <section className="hero">
                <div className="container hero-content">
                    <div className="hero-text">
                        <h1>Find Auto Parts from Trusted Garages</h1>
                        <p>
                            Search parts, compare garage offers, and order with delivery
                            or installation options.
                        </p>

                        <div className="hero-buttons">
                            {isAuthenticated ? (
                                <NavLink
                                    to={user.role === 'garage' ? '/dashboard' : '/search'}
                                    className="btn btn-primary"
                                >
                                    {user.role === 'garage' ? 'Go to Dashboard' : 'Search Parts'}
                                </NavLink>
                            ) : (
                                <>
                                    <NavLink to="/register" className="btn btn-primary">Get Started</NavLink>
                                    <NavLink to="/search" className="btn btn-secondary">Search Parts</NavLink>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </section>


            {/* How It Works */}
            <section className="features-section">
                <div className="container">
                    <h2 className="section-title">How It Works</h2>

                    <div className="features-grid">
                        <div className="feature-card">
                            <h3>Search Parts</h3>
                            <p>Find parts by number or filter by car make, model, and year.</p>
                        </div>

                        <div className="feature-card">
                            <h3>Compare Garages</h3>
                            <p>Check prices, stock availability, and service options from different garages.</p>
                        </div>

                        <div className="feature-card">
                            <h3>Order Easily</h3>
                            <p>Place orders for delivery or installation in a simple checkout flow.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* For Customers and Garages */}
            <section className="roles-section">
                <div className="container">
                    <h2 className="section-title">Built for Customers and Garages</h2>

                    <div className="roles-grid">
                        <div className="role-card">
                            <h3>For Customers</h3>
                            <ul>
                                <li>Search for compatible parts</li>
                                <li>Compare garage listings</li>
                                <li>Place orders quickly</li>
                            </ul>
                        </div>

                        <div className="role-card">
                            <h3>For Garages</h3>
                            <ul>
                                <li>Manage inventory</li>
                                <li>Set prices and quantity</li>
                                <li>Receive and process orders</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Call To Action (CTA) — only shown to guests */}
            {!isAuthenticated && (
                <section className="cta-section">
                    <div className="container cta-box">
                        <h2>Ready to start?</h2>
                        <p>Create an account and begin using the marketplace.</p>

                        <div className="hero-buttons">
                            <NavLink to="/register" className="btn btn-primary">Register</NavLink>
                            <NavLink to="/login" className="btn btn-secondary">Login</NavLink>
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}

