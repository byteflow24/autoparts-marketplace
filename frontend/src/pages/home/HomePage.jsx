import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/Authcontext'

import imgBrakes       from '../../assets/images/brake_rotors.jpg'
import imgEngine       from '../../assets/images/engine_parts.jpg'
import imgElectrical   from '../../assets/images/electric.jpg'
import imgSuspension   from '../../assets/images/car_suspension.jpg'
import imgTransmission from '../../assets/images/car_transmission.jpg'
import imgCooling      from '../../assets/images/coolant_system.jpg'
import imgExhaust      from '../../assets/images/exhaust_system.jpg'
import imgBody         from '../../assets/images/car_body.png'
import imgHero         from '../../assets/images/hero_visual.png'


const FEATURED_CATEGORIES = [
  { name: 'Brakes',       label: 'Brakes & Rotors',  img: imgBrakes       },
  { name: 'Engine',       label: 'Engine Parts',      img: imgEngine       },
  { name: 'Electrical',   label: 'Electrical',        img: imgElectrical   },
  { name: 'Suspension',   label: 'Suspension',        img: imgSuspension   },
  { name: 'Transmission', label: 'Transmission',      img: imgTransmission },
  { name: 'Cooling',      label: 'Cooling System',    img: imgCooling      },
  { name: 'Exhaust',      label: 'Exhaust',           img: imgExhaust      },
  { name: 'Body',         label: 'Body Parts',        img: imgBody         },
]

export function HomePage() {
  const { isAuthenticated, user } = useAuth()
  const navigate = useNavigate()

  function handleCategoryClick(categoryName) {
    navigate(`/search?category=${encodeURIComponent(categoryName)}`)
  }

  return (
    <>
      <title>AutoParts Marketplace — Find Parts from Local Garages</title>

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="hero">
        <div className="container hero-content">

          <div className="hero-text">
            <h1>
              Find The Right<br />
              <em>Auto Parts</em><br />
              For Your Car
            </h1>
            <p>
              Search thousands of parts from verified local garages.
              Compare prices, choose delivery or installation, and order in minutes.
            </p>
            <div className="hero-buttons">
              {isAuthenticated ? (
                <NavLink
                  to={user.role === 'garage' ? '/dashboard' : '/search'}
                  className="btn btn-primary"
                >
                  {user.role === 'garage' ? 'Go to Dashboard' : 'Search Parts Now'}
                </NavLink>
              ) : (
                <>
                  <NavLink to="/search"   className="btn btn-primary">Search Parts</NavLink>
                  <NavLink to="/register" className="btn btn-secondary">Create Account</NavLink>
                </>
              )}
            </div>

            <div className="hero-badges">
              <span className="hero-badge">✅ Verified Garages</span>
              <span className="hero-badge">🚚 Delivery Available</span>
              <span className="hero-badge">🔧 Installation Options</span>
            </div>
          </div>

          {/* Right: hero visual */}
          <div className="hero-visual" aria-hidden="true">
            <img src={imgHero} alt="" className="hero-visual-img" loading="eager" />
          </div>

        </div>
      </section>

      {/* ── Featured Auto Parts ──────────────────────────── */}
      <section className="parts-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Featured Auto Parts</h2>
              <p className="section-subtitle">Popular categories available from verified garages.</p>
            </div>
            <NavLink to="/search" className="btn btn-outline-navy">View All Parts</NavLink>
          </div>

          <div className="parts-grid">
            {FEATURED_CATEGORIES.slice(0, 4).map(cat => (
              <button
                key={cat.name}
                className="part-card"
                onClick={() => handleCategoryClick(cat.name)}
              >
                <div className="part-card-img">
                  <img src={cat.img} alt={cat.label} />
                </div>
                <div className="part-card-body">
                  <h4>{cat.label}</h4>
                  <span className="btn btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                    View Details
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Shop by Category ─────────────────────────────── */}
      <section className="categories-section">
        <div className="container">
          <div className="section-header">
            <div>
              <h2 className="section-title">Shop by Category</h2>
              <p className="section-subtitle">Browse parts by type — from brakes to body panels.</p>
            </div>
            <NavLink to="/search" className="btn btn-outline-navy">Browse All Parts</NavLink>
          </div>

          <div className="category-grid">
            {FEATURED_CATEGORIES.map(cat => (
              <button
                key={cat.name}
                className="category-card"
                onClick={() => handleCategoryClick(cat.name)}
              >
                <div className="category-card-img-wrap">
                  <img src={cat.img} alt={cat.label} className="category-card-img" />
                  <div className="category-card-overlay" />
                </div>
                <div className="category-card-label">{cat.label}</div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ─────────────────────────────────── */}
      <section className="features-section">
        <div className="container">
          <h2 className="section-title">How It Works</h2>
          <p className="section-subtitle">Three simple steps to get the part you need.</p>

          <div className="features-grid">
            <div className="feature-card">
              <h3>Search Parts</h3>
              <p>Find parts by part number or filter by car make, model, and year from local garages.</p>
            </div>
            <div className="feature-card">
              <h3>Compare Garages</h3>
              <p>See prices, stock availability, and delivery or installation options side by side.</p>
            </div>
            <div className="feature-card">
              <h3>Order &amp; Receive</h3>
              <p>Place your order in seconds. Track its status from your account in real time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── For Customers & Garages ──────────────────────── */}
      <section className="roles-section">
        <div className="container">
          <h2 className="section-title">Built for Customers &amp; Garages</h2>
          <p className="section-subtitle">One platform — two powerful experiences.</p>

          <div className="roles-grid">
            <div className="role-card customers">
              <h3>For Customers</h3>
              <ul>
                <li>Search parts by make, model &amp; year</li>
                <li>Compare prices across garages</li>
                <li>Choose delivery, pickup, or installation</li>
                <li>Track your orders in real time</li>
              </ul>
            </div>

            <div className="role-card garages">
              <h3>For Garages</h3>
              <ul>
                <li>List your inventory in minutes</li>
                <li>Set your own prices &amp; service options</li>
                <li>Receive and confirm orders</li>
                <li>Track sales with a full dashboard</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA — guests only ────────────────────────────── */}
      {!isAuthenticated && (
        <section className="cta-section">
          <div className="container cta-box">
            <h2>Ready to Find Your Parts?</h2>
            <p>Join customers and garages already using AutoParts Marketplace.</p>
            <div className="hero-buttons" style={{ justifyContent: 'center' }}>
              <NavLink to="/register" className="btn btn-primary">Create Account</NavLink>
              <NavLink to="/login"    className="btn btn-secondary">Sign In</NavLink>
            </div>
          </div>
        </section>
      )}
    </>
  )
}