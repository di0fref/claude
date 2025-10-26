import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-blue-600 text-white shadow-lg">
      <div className="w-full px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-4 md:space-x-8">
            <Link to="/" className="text-lg md:text-xl font-bold whitespace-nowrap">
              Bale Tracker
            </Link>
            {user && (
              <div className="hidden md:flex space-x-4">
                <Link
                  to="/deliveries"
                  className="hover:bg-blue-700 px-3 py-2 rounded transition"
                >
                  Deliveries
                </Link>
                <Link
                  to="/bales"
                  className="hover:bg-blue-700 px-3 py-2 rounded transition"
                >
                  Bales
                </Link>
                {isAdmin() && (
                  <>
                    <Link
                      to="/users"
                      className="hover:bg-blue-700 px-3 py-2 rounded transition"
                    >
                      Users
                    </Link>
                    <Link
                      to="/settings"
                      className="hover:bg-blue-700 px-3 py-2 rounded transition"
                    >
                      Settings
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          {user && (
            <div className="flex items-center space-x-2">
              {/* Hamburger menu button for mobile */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded hover:bg-blue-700 transition"
                aria-label="Toggle menu"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {mobileMenuOpen ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h16"
                    />
                  )}
                </svg>
              </button>

              {/* Desktop user info and logout */}
              <span className="text-xs md:text-sm hidden md:inline">
                {user.username} <span className="text-blue-200">({user.role})</span>
              </span>
              <button
                onClick={handleLogout}
                className="hidden md:block bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition text-base"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
      {/* Mobile menu */}
      {user && mobileMenuOpen && (
        <div className="md:hidden border-t border-blue-500">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/deliveries"
              onClick={() => setMobileMenuOpen(false)}
              className="block hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              Deliveries
            </Link>
            <Link
              to="/bales"
              onClick={() => setMobileMenuOpen(false)}
              className="block hover:bg-blue-700 px-3 py-2 rounded transition"
            >
              Bales
            </Link>
            {isAdmin() && (
              <>
                <Link
                  to="/users"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block hover:bg-blue-700 px-3 py-2 rounded transition"
                >
                  Users
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block hover:bg-blue-700 px-3 py-2 rounded transition"
                >
                  Settings
                </Link>
              </>
            )}
            <div className="border-t border-blue-500 pt-2 mt-2">
              <div className="px-3 py-2 text-sm">
                {user.username} <span className="text-blue-200">({user.role})</span>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left hover:bg-blue-700 px-3 py-2 rounded transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
