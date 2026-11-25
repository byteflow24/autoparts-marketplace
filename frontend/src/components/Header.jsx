/**
 * Header.jsx
 * frontend/src/components/Header.jsx
 *
 * Reads user/role from AuthContext.
 * Shows the right links based on whether the user is logged in
 * and whether they are a customer or a garage.
 * - Cart link shows a badge with the item count (customer only)
 * - "My Profile" is shown to both roles
 */

import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext'
import { useCartCount }  from '../hooks/useCartCount'

export function Header() {
    const { isAuthenticated, user, logout } = useAuth()
    const navigate   = useNavigate()
    const cartCount  = useCartCount()

    async function handleLogout() {
      await logout()
      navigate('/login')
    }

    return (
      <header className="site-header">
        <nav className="navbar container">

          <NavLink to="/" className="logo">
            AutoParts <span>Market</span>
          </NavLink>

          <ul className="nav-links">
            <li><NavLink to="/" end>Home</NavLink></li>
            <li><NavLink to="/search">Search Parts</NavLink></li>

            {isAuthenticated ? (
              <>
                {user.role === 'customer' && (
                  <>
                    {/* Cart with badge */}
                    <li>
                      <NavLink to="/cart" className="nav-cart-link">
                        Cart
                        {cartCount > 0 && (
                          <span className="cart-badge">{cartCount > 99 ? '99+' : cartCount}</span>
                        )}
                      </NavLink>
                    </li>
                    <li><NavLink to="/hub">My Hub</NavLink></li>
                  </>
                )}

                {user.role === 'garage' && (
                  <li><NavLink to="/dashboard">Dashboard</NavLink></li>
                )}

                {/* My Profile — shown to both roles */}
                <li><NavLink to="/profile">My Profile</NavLink></li>

                <li>
                  <button className="btn btn-secondary" onClick={handleLogout}>
                    Logout
                  </button>
                </li>
              </>
            ) : (
              <>
                <li><NavLink to="/login"    className="btn btn-secondary">Sign In</NavLink></li>
                <li><NavLink to="/register" className="btn btn-primary">Register</NavLink></li>
              </>
            )}
          </ul>

        </nav>
      </header>
    )
  }