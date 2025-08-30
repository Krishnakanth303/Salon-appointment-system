import React from 'react'
import { Link, useLocation } from 'react-router-dom'

const Navbar = () => {
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  return (
    <nav className="navbar">
      <div className="container">
        <h1>🎫 Smart Queue Management</h1>
        <ul className="nav-links">
          <li>
            <Link 
              to="/" 
              className={isActive('/') ? 'active' : ''}
            >
              🏠 Home
            </Link>
          </li>
          <li>
            <Link 
              to="/admin" 
              className={isActive('/admin') ? 'active' : ''}
            >
              ⚙️ Admin
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navbar