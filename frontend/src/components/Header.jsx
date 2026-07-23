import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext'

/**
 * Header
 *
 * Reads user/role from AuthContext.
 * Shows the right links based on whether the user is logged in
 * and whether they are a customer or a garage.
 */

export function Header() {
    const {isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    async function handleLogout() {
        await logout()
        navigate('/login')
    }
    
    return (
        <>
            {/* Navbar */}
            <header className="site-header">
                <nav className="navbar container">
                    <NavLink to="/" className="logo">AutoParts</NavLink>

                    <ul className="nav-links">
                        <li><NavLink to="/">Home</NavLink></li>
                        <li><NavLink to="/search">Search Parts</NavLink></li>
                        
                        {isAuthenticated ? (
                            <>
                                {user.role === 'customer' && (
                                    <>
                                        <li><NavLink to="/cart">Cart</NavLink></li>
                                        <li><NavLink to="/orders">My Orders</NavLink></li>
                                    </>
                                )}
                                {user.role === 'garage' && (
                                    <>
                                        <li><NavLink to="/dashboard">Garage Dashboard</NavLink></li>
                                    </>
                                )}
                                <li>
                                    <button className="btn btn-secondary" onClick={handleLogout}>
                                        Logout
                                    </button>
                                </li>
                            </>
                        ) : (
                            <>
                                <li><NavLink to="/login" className="btn btn-secondary">Login</NavLink></li>
                                <li><NavLink to="/register" className="btn btn-primary">Register</NavLink></li>
                            </>
                        )}
                    </ul>
                </nav>
            </header>
        </>
    );
}

